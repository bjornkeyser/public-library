"use client";

import { useState, useTransition, useEffect } from "react";
import { updatePageText } from "@/lib/actions/admin";

interface Page {
  pageNumber: number;
  imagePath: string | null;
  textContent: string | null;
}

interface OcrEditorProps {
  magazineId: number;
  pages: Page[];
  initialIndex?: number;
}

export function OcrEditor({ magazineId, pages, initialIndex = 0 }: OcrEditorProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [texts, setTexts] = useState<string[]>(() =>
    pages.map((p) => p.textContent || "")
  );
  const [savedTexts, setSavedTexts] = useState<string[]>(() =>
    pages.map((p) => p.textContent || "")
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const page = pages[currentIndex];
  const currentText = texts[currentIndex];
  const hasChanges = currentText !== savedTexts[currentIndex];
  const totalChanges = texts.filter((t, i) => t !== savedTexts[i]).length;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(pages.length - 1, i + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pages.length]);

  const handleSavePage = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updatePageText(magazineId, page.pageNumber, currentText);
      if (result.success) {
        const newSaved = [...savedTexts];
        newSaved[currentIndex] = currentText;
        setSavedTexts(newSaved);
        setMessage({ type: "success", text: `Page ${page.pageNumber} saved` });
      } else {
        setMessage({ type: "error", text: result.error || "Save failed" });
      }
    });
  };

  const handleSaveAll = () => {
    setMessage(null);
    startTransition(async () => {
      let saved = 0;
      let failed = 0;

      for (let i = 0; i < pages.length; i++) {
        if (texts[i] !== savedTexts[i]) {
          const result = await updatePageText(magazineId, pages[i].pageNumber, texts[i]);
          if (result.success) {
            saved++;
          } else {
            failed++;
          }
        }
      }

      if (failed === 0) {
        setSavedTexts([...texts]);
        setMessage({ type: "success", text: `Saved ${saved} page(s)` });
      } else {
        setMessage({ type: "error", text: `Saved ${saved}, failed ${failed}` });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between border border-[#ebebeb] bg-[#f6f6f6] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="border border-[#ebebeb] bg-white px-3 py-1.5 text-sm disabled:opacity-50 hover:border-[#3a3a3a] transition-colors"
          >
            ← Prev
          </button>

          <select
            value={currentIndex}
            onChange={(e) => setCurrentIndex(parseInt(e.target.value, 10))}
            className="border border-[#ebebeb] bg-white px-3 py-1.5 text-sm"
          >
            {pages.map((p, i) => (
              <option key={p.pageNumber} value={i}>
                Page {p.pageNumber}
                {texts[i] !== savedTexts[i] ? " *" : ""}
              </option>
            ))}
          </select>

          <button
            onClick={() => setCurrentIndex((i) => Math.min(pages.length - 1, i + 1))}
            disabled={currentIndex === pages.length - 1}
            className="border border-[#ebebeb] bg-white px-3 py-1.5 text-sm disabled:opacity-50 hover:border-[#3a3a3a] transition-colors"
          >
            Next →
          </button>

          <span className="text-sm text-[#999]">
            {currentIndex + 1} of {pages.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {totalChanges > 0 && (
            <span className="text-sm text-amber-600">
              {totalChanges} unsaved change{totalChanges !== 1 && "s"}
            </span>
          )}

          <button
            onClick={handleSavePage}
            disabled={isPending || !hasChanges}
            className="border border-[#3a3a3a] px-4 py-1.5 text-sm font-medium hover:bg-[#3a3a3a] hover:text-white transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Page"}
          </button>

          {totalChanges > 1 && (
            <button
              onClick={handleSaveAll}
              disabled={isPending}
              className="border border-green-600 bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Save All ({totalChanges})
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`px-4 py-2 text-sm ${
            message.type === "success"
              ? "border border-green-400 bg-green-50 text-green-700"
              : "border border-red-400 bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Split View */}
      <div className="grid grid-cols-2 gap-6" style={{ height: "calc(100vh - 280px)" }}>
        {/* Page Image */}
        <div className="overflow-auto border border-[#ebebeb] bg-[#f6f6f6]">
          {page.imagePath ? (
            <img
              src={page.imagePath}
              alt={`Page ${page.pageNumber}`}
              className="w-full"
              draggable={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#999]">
              No image available
            </div>
          )}
        </div>

        {/* Text Editor */}
        <div className="flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">
              OCR Text - Page {page.pageNumber}
              {hasChanges && <span className="ml-2 text-amber-600">*</span>}
            </span>
            <span className="text-xs text-[#999]">
              {currentText.length} characters
            </span>
          </div>

          <textarea
            value={currentText}
            onChange={(e) => {
              const newTexts = [...texts];
              newTexts[currentIndex] = e.target.value;
              setTexts(newTexts);
            }}
            className="flex-1 w-full p-4 border border-[#ebebeb] font-mono text-sm resize-none focus:outline-none focus:border-[#3a3a3a]"
            placeholder="OCR text will appear here..."
          />
        </div>
      </div>

      {/* Quick Page Thumbnails */}
      <div className="border border-[#ebebeb] p-4">
        <div className="text-xs text-[#999] uppercase tracking-wide mb-3">Quick Navigation</div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {pages.map((p, i) => (
            <button
              key={p.pageNumber}
              onClick={() => setCurrentIndex(i)}
              className={`flex-shrink-0 w-12 ${
                i === currentIndex
                  ? "ring-2 ring-[#3a3a3a]"
                  : texts[i] !== savedTexts[i]
                  ? "ring-2 ring-amber-400"
                  : ""
              }`}
            >
              <div className="aspect-[3/4] bg-[#f6f6f6] border border-[#ebebeb] overflow-hidden">
                {p.imagePath ? (
                  <img
                    src={p.imagePath}
                    alt={`Page ${p.pageNumber}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#999] text-xs">
                    {p.pageNumber}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
