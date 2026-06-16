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

  const calcPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 192; // w-48 = 12rem = 192px
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

  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    calcPosition();
    setIsOpen((v) => !v);
  };

  // Close on outside click or scroll
  useEffect(() => {
    if (!isOpen) return;
    const close = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnScroll = () => setIsOpen(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, [isOpen]);

  const menu = isOpen
    ? ReactDOM.createPortal(
        <div
          style={menuStyle}
          className="rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-gray-800 py-2 animate-in fade-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
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
      )
    : null;

  return (
    <div
      className={cn('relative inline-block text-left', className)}
      ref={triggerRef}
    >
      <div onClick={open}>
        {trigger || (
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-all active:scale-95 shadow-sm bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        )}
      </div>
      {menu}
    </div>
  );
}
