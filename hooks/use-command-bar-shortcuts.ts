import { useState, useEffect, useCallback } from 'react';

export function useCommandBarShortcuts(onApplySearch?: (value: string) => void) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((prevOpen) => !prevOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, value: string) => {
    if (e.key === 'Enter' && onApplySearch) {
      onApplySearch(value);
    }
  }, [onApplySearch]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    open,
    setOpen,
    handleKeyDown,
    handleClose
  };
}