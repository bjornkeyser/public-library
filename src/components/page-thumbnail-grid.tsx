"use client";

import Link from "next/link";

interface Page {
  id: number;
  pageNumber: number;
  imagePath: string | null;
}

interface PageThumbnailGridProps {
  pages: Page[];
  magazineId: number;
}

export function PageThumbnailGrid({ pages, magazineId }: PageThumbnailGridProps) {
  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
      {sortedPages.map((page) => (
        <Link
          key={page.id}
          href={`/magazines/${magazineId}/page/${page.pageNumber}`}
          className="group relative aspect-[3/4] bg-[#f6f6f6] border border-[#ebebeb] hover:border-[#3a3a3a] transition-colors overflow-hidden"
        >
          {page.imagePath ? (
            <img
              src={page.imagePath}
              alt={`Page ${page.pageNumber}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#999] text-xs">
              {page.pageNumber}
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {page.pageNumber}
          </span>
        </Link>
      ))}
    </div>
  );
}
