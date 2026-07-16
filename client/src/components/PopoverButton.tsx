import { type ReactNode, useEffect, useRef, useState } from 'react';

interface PopoverButtonProps {
  icon: ReactNode;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}

export default function PopoverButton({ icon, ariaLabel, children, className }: PopoverButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className={`icon-menu ${className ?? ''}`} ref={containerRef}>
      <button
        type="button"
        className="icon-menu-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {icon}
      </button>
      {open && <div className="popover-panel">{children}</div>}
    </div>
  );
}
