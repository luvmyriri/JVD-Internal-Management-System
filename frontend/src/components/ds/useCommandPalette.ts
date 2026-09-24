import { useEffect, useState } from 'react';

/** Wire the global ⌘K / Ctrl+K shortcut. Returns [isOpen, open, close]. */
export function useCommandPalette(): [boolean, () => void, () => void] {
  const [isOpen, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return [isOpen, () => setOpen(true), () => setOpen(false)];
}
