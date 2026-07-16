import { type ReactNode, useEffect, useRef, useState } from 'react';

export interface IconMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
}

interface IconMenuButtonProps {
  icon: ReactNode;
  ariaLabel: string;
  items: IconMenuItem[];
  selectedKey?: string;
  className?: string;
}

export default function IconMenuButton({
  icon,
  ariaLabel,
  items,
  selectedKey,
  className,
}: IconMenuButtonProps) {
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
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {icon}
      </button>
      {open && (
        <ul className="icon-menu-list" role="menu">
          {items.map((item) => (
            <li
              key={item.key}
              role="menuitem"
              className={item.key === selectedKey ? 'selected' : ''}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
            >
              {item.icon && <span className="icon-menu-item-icon">{item.icon}</span>}
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
