"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

interface BackButtonProps {
  fallbackHref: string;
  fallbackLabel: string;
}

export function BackButton({ fallbackHref, fallbackLabel }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        onClick={handleBack}
        className="text-[#999] hover:text-[#3a3a3a] cursor-pointer"
      >
        ← Back
      </button>
      <span className="text-[#ccc]">|</span>
      <Link href={fallbackHref} className="text-[#999] hover:text-[#3a3a3a]">
        {fallbackLabel}
      </Link>
    </div>
  );
}
