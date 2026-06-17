'use client';

import React, { useState, useCallback } from 'react';

interface CodeViewerProps {
  languages: { name: string; code: string }[];
  highlightedLines?: number[];
  currentLine?: number;
}

export default function CodeViewer({
  languages,
  highlightedLines = [],
  currentLine = -1,
}: CodeViewerProps) {
  const [activeLang, setActiveLang] = useState(languages[0]?.name || 'TS');
  const [copied, setCopied] = useState(false);

  const currentCode = languages.find(l => l.name === activeLang)?.code || '';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [currentCode]);

  const lines = currentCode.split('\n');

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {languages.map(lang => (
            <button
              key={lang.name}
              onClick={() => setActiveLang(lang.name)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                activeLang === lang.name
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-emerald-600">已复制</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              <span>复制</span>
            </>
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 rounded-xl">
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-800">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-2 text-xs text-slate-500 font-mono">{activeLang.toLowerCase()}</span>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <pre className="text-sm font-mono p-4">
            <code className="text-slate-300">
              {lines.map((line, index) => {
                const isHighlighted =
                  highlightedLines.includes(index + 1) || index + 1 === currentLine;
                return (
                  <div
                    key={index}
                    className={`flex ${isHighlighted ? 'bg-yellow-500/10 -mx-4 px-4' : ''}`}
                  >
                    <span className="select-none w-10 text-right mr-4 text-slate-600 text-xs leading-6">
                      {index + 1}
                    </span>
                    <span className="flex-1 leading-6">{line || ' '}</span>
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
