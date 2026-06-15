import React from 'react';

function classNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function buildInlineMathML(body: string): string {
  return `<math xmlns="http://www.w3.org/1998/Math/MathML">${body}</math>`;
}

function normalizeMathML(mathML: string): string {
  return mathML.replace(
    /<mfenced\s+open="\["\s+close="\]">([\s\S]*?)<\/mfenced>/g,
    '<mrow><mo fence="true" stretchy="true">[</mo>$1<mo fence="true" stretchy="true">]</mo></mrow>'
  );
}

interface MathTextProps {
  mathML: string;
  className?: string;
}

export function MathText({ mathML, className }: MathTextProps) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: normalizeMathML(mathML) }} />;
}

interface FormulaCardProps {
  mathML: string;
  label?: string;
  note?: React.ReactNode;
  className?: string;
  formulaClassName?: string;
  mathClassName?: string;
  tone?: 'default' | 'embedded';
}

export function FormulaCard({
  mathML,
  label,
  note,
  className,
  formulaClassName,
  mathClassName,
  tone = 'default',
}: FormulaCardProps) {
  return (
    <div className={className}>
      {label && (
        <div className="mb-2 text-xs font-semibold text-slate-500">
          {label}
        </div>
      )}
      <div
        className={classNames(
          tone === 'embedded'
            ? 'kernel-formula-block overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800'
            : 'kernel-formula-block overflow-x-auto rounded-2xl border border-slate-200 bg-[#f8f7f3] px-5 py-5 text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.05)]',
          formulaClassName
        )}
      >
        <div className="text-center leading-relaxed">
          <MathText
            mathML={mathML}
            className={classNames(
              '[&_math]:mx-auto [&_math]:inline-block',
              mathClassName
            )}
          />
        </div>
      </div>
      {note && <div className="mt-2 text-xs leading-6 text-slate-600">{note}</div>}
    </div>
  );
}
