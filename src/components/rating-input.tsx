"use client";

import { useState, useTransition } from "react";
import { submitRating } from "@/lib/actions/ratings";
import { useSession } from "next-auth/react";
import Link from "next/link";

type RatingInputProps = {
  mediaId: number;
  initialRating?: number;
};

export function RatingInput({ mediaId, initialRating }: RatingInputProps) {
  const { data: session, status: sessionStatus } = useSession();
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState(initialRating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [saved, setSaved] = useState(false);

  const handleClick = (newRating: number) => {
    if (sessionStatus !== "authenticated") return;

    setRating(newRating);
    setSaved(false);

    startTransition(async () => {
      const result = await submitRating(mediaId, newRating);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  };

  if (sessionStatus === "loading") {
    return <div className="h-5 w-24 bg-[#f6f6f6] animate-pulse" />;
  }

  if (sessionStatus !== "authenticated") {
    return (
      <Link href="/auth/login" className="text-xs text-[#999] hover:text-[#666]">
        Sign in to rate
      </Link>
    );
  }

  const displayRating = hoveredRating || rating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            disabled={isPending}
            className={`text-lg transition-colors ${
              isPending ? "cursor-wait" : "cursor-pointer"
            } ${
              star <= displayRating
                ? "text-amber-400"
                : "text-[#ddd] hover:text-amber-200"
            }`}
          >
            {star <= displayRating ? "★" : "☆"}
          </button>
        ))}
      </div>
      {isPending && (
        <span className="text-xs text-[#999]">Saving...</span>
      )}
      {saved && !isPending && (
        <span className="text-xs text-green-600">Saved!</span>
      )}
      {!isPending && !saved && rating > 0 && (
        <span className="text-xs text-[#999]">Your rating</span>
      )}
    </div>
  );
}
