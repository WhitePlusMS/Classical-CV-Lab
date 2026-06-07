import React from 'react';

type TeachingTone = 'red' | 'amber' | 'emerald' | 'sky' | 'slate' | 'blue';
type FlowColumnAlign = 'start' | 'center' | 'end';

function classNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const flowNodeToneClass: Record<TeachingTone, string> = {
  red: 'border-red-200 bg-white',
  amber: 'border-amber-200 bg-white',
  emerald: 'border-emerald-200 bg-emerald-50/70',
  sky: 'border-sky-200 bg-white',
  slate: 'border-slate-200 bg-white',
  blue: 'border-blue-200 bg-white',
};

const columnAlignClass: Record<FlowColumnAlign, string> = {
  start: 'xl:justify-self-start',
  center: 'xl:justify-self-center',
  end: 'xl:justify-self-end',
};

interface TeachingFlowProps {
  children: React.ReactNode;
  className?: string;
}

export function ProcessRail({ children, className }: TeachingFlowProps) {
  return <div className={classNames('conv-process-rail', className)}>{children}</div>;
}

export function FlowColumns({ children, className }: TeachingFlowProps) {
  return (
    <div
      className={classNames(
        'grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] xl:items-start',
        className
      )}
    >
      {children}
    </div>
  );
}

interface FlowColumnProps extends TeachingFlowProps {
  align?: FlowColumnAlign;
}

export function FlowColumn({ children, align = 'center', className }: FlowColumnProps) {
  return (
    <div
      className={classNames(
        'flex flex-col items-center gap-3',
        columnAlignClass[align],
        className
      )}
    >
      {children}
    </div>
  );
}

interface FlowNodeProps extends TeachingFlowProps {
  tone?: TeachingTone;
}

export function FlowNode({ children, tone = 'slate', className }: FlowNodeProps) {
  return (
    <div className={classNames('conv-flow-node', flowNodeToneClass[tone], className)}>
      {children}
    </div>
  );
}
