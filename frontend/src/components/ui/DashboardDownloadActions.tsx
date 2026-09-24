import { useEffect, useRef, useState } from 'react';
import { LuDownload, LuFileSpreadsheet, LuFileText } from 'react-icons/lu';

interface DashboardDownloadActionsProps {
  title: string;
  data: any[];
  variant?: 'dark' | 'light';
  onExportPDF: (title: string, data: any[]) => Promise<void>;
  onExportExcel: (title: string, data: any[]) => Promise<void>;
}

export default function DashboardDownloadActions({
  title, data, variant = 'dark', onExportPDF, onExportExcel,
}: DashboardDownloadActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [isOpen]);

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      <button
        type="button"
        aria-label={`Export ${title}`}
        aria-expanded={isOpen}
        onClick={(event) => { event.stopPropagation(); setIsOpen((open) => !open); }}
        className={`p-1.5 rounded-xl transition-all opacity-50 group-hover:opacity-100 ${variant === 'light'
          ? 'bg-white/20 hover:bg-white/30 text-white'
          : 'hover:bg-slate-50 dark:hover:bg-gray-800 text-muted hover:text-blue-600 dark:hover:text-blue-400'}`}
      >
        <LuDownload className="w-3.5 h-3.5" />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 pt-2 z-[100]">
          <div className="w-32 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-border py-2">
            <button
              type="button"
              onClick={async (event) => { event.stopPropagation(); await onExportPDF(title, data); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-[10px] font-bold text-muted hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-2 transition-colors"
            >
              <LuFileText className="w-3.5 h-3.5" /> Export PDF
            </button>
            <button
              type="button"
              onClick={async (event) => { event.stopPropagation(); await onExportExcel(title, data); setIsOpen(false); }}
              className="w-full px-4 py-2 text-left text-[10px] font-bold text-muted hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-2 transition-colors"
            >
              <LuFileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
