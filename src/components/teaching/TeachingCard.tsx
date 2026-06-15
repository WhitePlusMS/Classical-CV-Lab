import React from 'react';

type TeachingCardTone = 'default' | 'amber';

interface TeachingCardProps {
  children: React.ReactNode;
  className?: string;
  tone?: TeachingCardTone;
}

function classNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const toneClass: Record<TeachingCardTone, string> = {
  default: 'border-slate-200 bg-white',
  amber: 'border-amber-200 bg-amber-50/55',
};

export function TeachingCard({
  children,
  className,
  tone = 'default',
}: TeachingCardProps) {
  return (
    <div
      className={classNames(
        'relative rounded-2xl border p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-shadow hover:z-10 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)] focus-within:z-10 focus-within:shadow-[0_16px_34px_rgba(15,23,42,0.08)]',
        toneClass[tone],
        className
      )}
    >
      {children}
    </div>
  );
}
