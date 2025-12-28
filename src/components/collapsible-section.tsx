"use client";

import { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  title,
  count,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="border-t border-[#ebebeb]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-4 text-left hover:bg-[#fafafa] transition-colors -mx-4 px-4"
      >
        <h2 className="text-base font-semibold uppercase tracking-wide text-[#3a3a3a]">
          {title} <span className="text-sm font-normal text-[#999]">({count})</span>
        </h2>
        <span className="text-[#999] text-xl leading-none">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen && (
        <div className="pb-6">
          {children}
        </div>
      )}
    </section>
  );
}
