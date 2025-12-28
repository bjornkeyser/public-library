"use client";

import { useRef, useCallback, useEffect, forwardRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HTMLFlipBook from "react-pageflip";

interface Page {
  pageNumber: number;
  imagePath: string | null;
}

interface PageFlipperProps {
  pages: Page[];
  magazineId: number;
  currentPage: number;
  highlightedPages: number[];
}

// Page component must use forwardRef for react-pageflip
const PageComponent = forwardRef<HTMLDivElement, { page: Page; isHighlighted: boolean }>(
  ({ page, isHighlighted }, ref) => {
    return (
      <div ref={ref} className="page-content bg-white">
        {page.imagePath ? (
          <img
            src={page.imagePath}
            alt={`Page ${page.pageNumber}`}
            className={`w-full h-full object-contain ${isHighlighted ? "ring-4 ring-[#e0b200]" : ""}`}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-[#f6f6f6] flex items-center justify-center">
            <span className="text-[#999]">Page {page.pageNumber}</span>
          </div>
        )}
      </div>
    );
  }
);
PageComponent.displayName = "PageComponent";

export function PageFlipper({ pages, magazineId, currentPage, highlightedPages }: PageFlipperProps) {
  const bookRef = useRef<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Build query string for navigation
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    const highlight = searchParams.get("highlight");
    const entity = searchParams.get("entity");
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (highlight) params.set("highlight", highlight);
    if (entity) params.set("entity", entity);
    if (entityType) params.set("entityType", entityType);
    if (entityId) params.set("entityId", entityId);

    return params.toString() ? `?${params.toString()}` : "";
  }, [searchParams]);

  // Handle page flip event - update URL
  const onFlip = useCallback((e: any) => {
    const newPageIndex = e.data;
    const newPageNumber = pages[newPageIndex]?.pageNumber;
    if (newPageNumber && newPageNumber !== currentPage) {
      const queryString = buildQueryString();
      router.push(`/magazines/${magazineId}/page/${newPageNumber}${queryString}`, { scroll: false });
    }
  }, [pages, currentPage, magazineId, router, buildQueryString]);

  // Flip to correct page on mount/change
  useEffect(() => {
    if (bookRef.current) {
      const pageIndex = pages.findIndex(p => p.pageNumber === currentPage);
      if (pageIndex >= 0) {
        const currentBookPage = bookRef.current.pageFlip()?.getCurrentPageIndex();
        if (currentBookPage !== pageIndex) {
          bookRef.current.pageFlip()?.turnToPage(pageIndex);
        }
      }
    }
  }, [currentPage, pages]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!bookRef.current) return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        bookRef.current.pageFlip()?.flipNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        bookRef.current.pageFlip()?.flipPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Find initial page index
  const initialPage = pages.findIndex(p => p.pageNumber === currentPage);

  return (
    <div className="flex flex-col items-center">
      {/* @ts-ignore - react-pageflip types are incomplete */}
      <HTMLFlipBook
        ref={bookRef}
        width={400}
        height={550}
        size="stretch"
        minWidth={300}
        maxWidth={800}
        minHeight={400}
        maxHeight={1000}
        showCover={true}
        usePortrait={true}
        startPage={initialPage >= 0 ? initialPage : 0}
        drawShadow={true}
        flippingTime={600}
        useMouseEvents={true}
        swipeDistance={30}
        showPageCorners={true}
        disableFlipByClick={false}
        onFlip={onFlip}
        className="shadow-2xl"
        style={{}}
        maxShadowOpacity={0.5}
        mobileScrollSupport={true}
      >
        {pages.map((page) => (
          <PageComponent
            key={page.pageNumber}
            page={page}
            isHighlighted={highlightedPages.includes(page.pageNumber)}
          />
        ))}
      </HTMLFlipBook>

      {/* Page indicator */}
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
          className="border border-[#3a3a3a] px-4 py-2 text-sm font-medium transition-colors hover:bg-[#3a3a3a] hover:text-white disabled:opacity-50"
          disabled={currentPage <= 1}
        >
          ← Prev
        </button>
        <span className="text-sm text-[#666]">
          Page {currentPage} of {pages.length}
        </span>
        <button
          onClick={() => bookRef.current?.pageFlip()?.flipNext()}
          className="border border-[#3a3a3a] px-4 py-2 text-sm font-medium transition-colors hover:bg-[#3a3a3a] hover:text-white disabled:opacity-50"
          disabled={currentPage >= pages.length}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
