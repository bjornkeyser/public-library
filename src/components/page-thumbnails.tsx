"use client";

import { useState } from "react";
import Link from "next/link";

type Page = {
  id: number;
  pageNumber: number;
  imagePath: string | null;
};

type PageThumbnailsProps = {
  pages: Page[];
  magazineId: number;
  initialVisible?: number;
};

export function PageThumbnails({
  pages,
  magazineId,
  initialVisible = 8,
}: PageThumbnailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const visiblePages = isExpanded ? sortedPages : sortedPages.slice(0, initialVisible);
  const hasMore = sortedPages.length > initialVisible;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-[#999]">
          Pages ({pages.length})
        </span>
        <Link
          href={`/magazines/${magazineId}/review`}
          className="text-xs text-[#666] hover:text-[#3a3a3a] underline underline-offset-2"
        >
          Review Extractions
        </Link>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {visiblePages.map((page) => (
          <Link
            key={page.id}
            href={`/magazines/${magazineId}/page/${page.pageNumber}`}
            className="aspect-[3/4] bg-[#f6f6f6] border border-[#ebebeb] hover:border-[#3a3a3a] transition-colors overflow-hidden"
            title={`Page ${page.pageNumber}`}
          >
            {page.imagePath ? (
              <img
                src={page.imagePath}
                alt={`Page ${page.pageNumber}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[8px] text-[#999]">
                {page.pageNumber}
              </div>
            )}
          </Link>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs text-[#666] hover:text-[#3a3a3a] underline underline-offset-2"
        >
          {isExpanded ? "Show less" : `Show all ${pages.length} pages`}
        </button>
      )}
    </div>
  );
}
