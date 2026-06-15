'use client';

import React, { useEffect, useId, useRef, useState } from 'react';

interface TeachingTermProps {
  term: React.ReactNode;
  explanation: string;
  className?: string;
}

function classNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function TeachingTerm({ term, explanation, className }: TeachingTermProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className={classNames('relative inline-flex align-baseline', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline rounded-sm border-b-2 border-dotted border-amber-700 bg-amber-50/55 px-0.5 text-amber-950 decoration-2 outline-none transition hover:border-amber-800 hover:bg-amber-100/80 focus-visible:border-amber-800 focus-visible:bg-amber-100/80"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(value => !value)}
      >
        {term}
      </button>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-[calc(100%+0.45rem)] z-20 w-56 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950 shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
        >
          {explanation}
        </span>
      ) : null}
    </span>
  );
}
