import React from 'react';

function classNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

const MATH_FONT_STACK =
  '"Cambria Math", "STIX Two Math", "STIXGeneral", "Latin Modern Math", "Times New Roman", serif';

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
  return (
    <span
      className={classNames('[&_math]:align-middle', className)}
      style={{ fontFamily: MATH_FONT_STACK }}
      dangerouslySetInnerHTML={{ __html: normalizeMathML(mathML) }}
    />
  );
}

export function InlineMath({ mathML, className }: MathTextProps) {
  return (
    <MathText
      mathML={mathML}
      className={classNames('align-middle [&_math]:inline-block [&_math]:align-middle', className)}
    />
  );
}

interface FormulaCardProps {
  mathML: string;
  label?: string;
  note?: React.ReactNode;
  className?: string;
  formulaClassName?: string;
  mathClassName?: string;
  tone?: 'embedded';
}

export function FormulaCard({
  mathML,
  label,
  note,
  className,
  formulaClassName,
  mathClassName,
  tone = 'embedded',
}: FormulaCardProps) {
  return (
    <div className={className} data-tone={tone}>
      {label && (
        <div className="mb-2 text-xs font-semibold text-slate-500">
          {label}
        </div>
      )}
      <div
        className={classNames(
          'kernel-formula-block overflow-x-auto rounded-xl border border-slate-200 bg-[#f8f7f3] px-4 py-4 text-slate-800',
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
