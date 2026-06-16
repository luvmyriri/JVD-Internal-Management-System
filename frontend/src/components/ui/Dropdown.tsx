import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../../utils';

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface DropdownProps {
  items: DropdownItem[];
  trigger?: React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

export default function Dropdown({
  items,
  trigger,
  className,
  align = 'right',
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const calcPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 192; // w-48
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const showAbove = spaceBelow < 160 && spaceAbove > spaceBelow;

    setMenuStyle({
      position: 'fixed',
      zIndex: 9999,
      width: menuWidth,
      ...(showAbove
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      ...(align === 'right'
        ? { right: window.innerWidth - rect.right }
        : { left: rect.left }),
    });
  }, [align]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    calcPosition();
    setIsOpen((v) => !v);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      // Keep open if clicking inside trigger or the portal menu itself
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleScroll = () => setIsOpen(false);

    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  return (
    <div
      className={cn('relative inline-block text-left', className)}
      ref={triggerRef}
    >
      <div onClick={toggle}>
        {trigger || (
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-all active:scale-95 shadow-sm bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        )}
      </div>

      {isOpen &&
        ReactDOM.createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-gray-800 py-2 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all',
                  item.variant === 'danger'
                    ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
