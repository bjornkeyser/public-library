"use client";

import { useState } from "react";

interface CollapsibleListProps {
  children: React.ReactNode[];
  initialCount?: number;
  totalCount: number;
  label: string;
}

export function CollapsibleList({
  children,
  initialCount = 8,
  totalCount,
  label
}: CollapsibleListProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleItems = expanded ? children : children.slice(0, initialCount);
  const hiddenCount = totalCount - initialCount;
  const shouldShowToggle = totalCount > initialCount;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {visibleItems}
      </div>
      {shouldShowToggle && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm text-[#666] hover:text-[#3a3a3a] underline underline-offset-2"
        >
          {expanded ? `Show less` : `Show all ${totalCount} ${label}`}
        </button>
      )}
    </div>
  );
}
