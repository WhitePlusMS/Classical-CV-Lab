'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const portalReady = typeof window !== 'undefined';
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const tooltipId = useId();
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    top: 0,
    left: 0,
    width: 224,
  });

  const updateTooltipPosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const safePadding = 12;
    const preferredWidth = Math.min(320, Math.max(224, viewportWidth - safePadding * 2));
    const tooltipHeight = tooltip?.offsetHeight ?? 84;
    const left = Math.min(
      Math.max(safePadding, rect.left),
      Math.max(safePadding, viewportWidth - preferredWidth - safePadding)
    );
    const placeAbove = rect.bottom + 10 + tooltipHeight > viewportHeight - safePadding && rect.top - tooltipHeight - 10 >= safePadding;
    const top = placeAbove ? rect.top - tooltipHeight - 10 : rect.bottom + 10;

    setTooltipStyle({
      top,
      left,
      width: preferredWidth,
    });
  }, []);

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

    updateTooltipPosition();

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition, true);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition, true);
    };
  }, [open, updateTooltipPosition]);

  return (
    <span
      ref={rootRef}
      className={classNames('inline-flex align-baseline', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={event => {
        if (tooltipRef.current?.contains(event.relatedTarget as Node | null)) {
          return;
        }
        setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="inline rounded-sm border-b-2 border-dotted border-amber-700 bg-amber-50/55 px-0.5 text-amber-950 decoration-2 outline-none transition hover:border-amber-800 hover:bg-amber-100/80 focus-visible:border-amber-800 focus-visible:bg-amber-100/80"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={event => {
          if (tooltipRef.current?.contains(event.relatedTarget as Node | null)) {
            return;
          }
          setOpen(false);
        }}
        onClick={() => setOpen(value => !value)}
      >
        {term}
      </button>
      {open && portalReady
        ? createPortal(
            <span
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              className="fixed z-[300] rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950 shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
              style={tooltipStyle}
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={event => {
                if (triggerRef.current?.contains(event.relatedTarget as Node | null)) {
                  return;
                }
                setOpen(false);
              }}
            >
              {explanation}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}
