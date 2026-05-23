import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuSearch } from 'react-icons/lu';
import { useEntityPreview } from '../../context/EntityPreviewContext';

export default function FloatingCrossChecker() {
  const { showSearchPreview } = useEntityPreview();
  const [selectedText, setSelectedText] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setIsVisible(false);
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 2 || text.length > 50) {
        setIsVisible(false);
        return;
      }

      // Removed table-only restriction to allow it to work across the entire system

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Position the floating badge centered just above the selection
      setPosition({
        top: rect.top + window.scrollY - 46,
        left: rect.left + window.scrollX + rect.width / 2,
      });
      setSelectedText(text);
      setIsVisible(true);
    };

    // Listen on mouse/touch interactions
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('keyup', handleSelectionChange);
    document.addEventListener('touchend', handleSelectionChange);

    // Hide on scroll or click elsewhere
    const hideOnScroll = () => setIsVisible(false);
    window.addEventListener('scroll', hideOnScroll, { passive: true });

    return () => {
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('keyup', handleSelectionChange);
      document.removeEventListener('touchend', handleSelectionChange);
      window.removeEventListener('scroll', hideOnScroll);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear selection so the floating badge closes
    window.getSelection()?.removeAllRanges();
    setIsVisible(false);
    
    showSearchPreview(selectedText);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          ref={buttonRef}
          initial={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
          animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, scale: 0.8, y: 10, x: '-50%' }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          style={{
            position: 'absolute',
            top: position.top,
            left: position.left,
            zIndex: 9999,
          }}
          onMouseDown={e => {
            // Prevent selection from collapsing on mouse down
            e.preventDefault();
          }}
          onClick={handleClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/95 dark:bg-gray-800/95 text-white text-xs font-black rounded-full shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] border border-white/10 hover:border-blue-500 hover:bg-blue-600 transition-all select-none group"
        >
          <LuSearch className="w-3.5 h-3.5 text-blue-400 group-hover:text-white transition-colors" />
          <span>Cross Check</span>
          <span className="max-w-[80px] truncate opacity-60">"{selectedText}"</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
