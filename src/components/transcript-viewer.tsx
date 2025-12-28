"use client";

import { useState } from "react";

interface TranscriptViewerProps {
  transcripts: { pageNumber: number; text: string | null }[];
}

export function TranscriptViewer({ transcripts }: TranscriptViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasContent = transcripts.some((t) => t.text && t.text.trim().length > 0);
  const isSpread = transcripts.length === 2;

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-[#666] hover:text-[#3a3a3a] transition-colors"
      >
        <span>{isOpen ? "▼" : "▶"}</span>
        <span>Transcript</span>
        {!hasContent && <span className="text-[#999]">(not available)</span>}
      </button>

      {isOpen && (
        <div className={`mt-3 ${isSpread ? "grid grid-cols-2 gap-4" : ""}`}>
          {transcripts.map((t) => (
            <div key={t.pageNumber} className="flex flex-col">
              <div className="mb-2 text-xs font-medium text-[#999] uppercase tracking-wide">
                Page {t.pageNumber}
              </div>
              <div className="flex-1 max-h-80 overflow-y-auto rounded bg-[#f6f6f6] p-4 text-sm leading-relaxed text-[#3a3a3a] whitespace-pre-wrap">
                {t.text?.trim() || <span className="text-[#999] italic">No text extracted</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
