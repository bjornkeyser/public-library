"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface KeyboardNavProps {
  prevUrl: string | null;
  nextUrl: string | null;
}

export function KeyboardNav({ prevUrl, nextUrl }: KeyboardNavProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && prevUrl) {
        router.push(prevUrl);
      } else if (e.key === "ArrowRight" && nextUrl) {
        router.push(nextUrl);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevUrl, nextUrl, router]);

  return null;
}
