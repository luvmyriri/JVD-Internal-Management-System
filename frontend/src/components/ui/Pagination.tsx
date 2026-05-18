import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
  total: number;
  perPage: number;
}

export default function Pagination({ currentPage, lastPage, onPageChange, total, perPage }: PaginationProps) {
  if (lastPage <= 1) return null;

  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  // Generate page numbers to show
  const getPages = () => {
    const pages: (number | string)[] = [];
    if (lastPage <= 7) {
      for (let i = 1; i <= lastPage; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(lastPage - 1, currentPage + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < lastPage - 2) pages.push('...');
      if (!pages.includes(lastPage)) pages.push(lastPage);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-t border-gray-50 dark:border-slate-800/50">
      <div className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest">
        Showing <span className="text-gray-900 dark:text-white">{start}</span>–<span className="text-gray-900 dark:text-white">{end}</span> of <span className="text-gray-900 dark:text-white">{total}</span> Records
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <LuChevronLeft size={16} />
        </button>
        
        <div className="flex items-center gap-1 bg-gray-50/50 dark:bg-slate-800/30 p-1 rounded-2xl border border-gray-100 dark:border-slate-800/50">
          {getPages().map((page, i) => (
            page === '...' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-300 dark:text-slate-600">
                <span className="text-[10px] font-black">•••</span>
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                  currentPage === page
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-slate-700'
                    : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
                }`}
              >
                {page}
              </button>
            )
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === lastPage}
          className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 dark:border-slate-800 text-gray-400 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          <LuChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
