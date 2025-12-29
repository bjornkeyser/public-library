"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { setCollectionStatus } from "@/lib/actions/collection";
import { submitRating, deleteRating } from "@/lib/actions/ratings";

type MediaActionsProps = {
  mediaId: number;
  initialCollectionStatus: "have" | "want" | null;
  initialUserRating?: { rating: number; review: string | null } | null;
};

export function MediaActions({
  mediaId,
  initialCollectionStatus,
  initialUserRating,
}: MediaActionsProps) {
  const { data: session, status: authStatus } = useSession();
  const [isPending, startTransition] = useTransition();
  const [collectionStatus, setStatus] = useState(initialCollectionStatus);
  const [userRating, setUserRating] = useState(initialUserRating?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleCollectionClick = (newStatus: "have" | "want") => {
    if (authStatus !== "authenticated") return;
    const finalStatus = collectionStatus === newStatus ? null : newStatus;
    setStatus(finalStatus);
    startTransition(async () => {
      await setCollectionStatus(mediaId, finalStatus);
    });
  };

  const handleRatingClick = (rating: number) => {
    if (authStatus !== "authenticated") return;
    if (userRating === rating) {
      // Remove rating
      setUserRating(0);
      startTransition(async () => {
        await deleteRating(mediaId);
      });
    } else {
      setUserRating(rating);
      startTransition(async () => {
        await submitRating(mediaId, rating);
      });
    }
  };

  if (authStatus === "loading") {
    return (
      <div className="flex gap-3 py-3">
        <div className="h-8 w-20 bg-[#f6f6f6] animate-pulse rounded" />
        <div className="h-8 w-20 bg-[#f6f6f6] animate-pulse rounded" />
      </div>
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <div className="py-3 text-sm text-[#666]">
        <Link href="/auth/login" className="underline hover:text-[#3a3a3a]">
          Sign in
        </Link>{" "}
        to track & rate
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 py-3">
      {/* Collection buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handleCollectionClick("have")}
          disabled={isPending}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            collectionStatus === "have"
              ? "bg-[#3a3a3a] text-white"
              : "bg-[#f6f6f6] text-[#666] hover:bg-[#ebebeb]"
          }`}
        >
          Have
        </button>
        <button
          onClick={() => handleCollectionClick("want")}
          disabled={isPending}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            collectionStatus === "want"
              ? "bg-[#3a3a3a] text-white"
              : "bg-[#f6f6f6] text-[#666] hover:bg-[#ebebeb]"
          }`}
        >
          Want
        </button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-[#ebebeb]" />

      {/* Star rating */}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRatingClick(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            disabled={isPending}
            className={`text-xl transition-colors ${
              star <= (hoveredRating || userRating)
                ? "text-amber-400"
                : "text-[#ddd] hover:text-amber-200"
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

// Compact stats display for header
export function MediaStatsInline({
  haveCount,
  wantCount,
  averageRating,
  totalRatings,
}: {
  haveCount: number;
  wantCount: number;
  averageRating: number;
  totalRatings: number;
}) {
  return (
    <div className="flex items-center gap-4 text-sm">
      {(haveCount > 0 || wantCount > 0) && (
        <div className="flex items-center gap-3 text-[#666]">
          <span>{haveCount} have</span>
          <span>{wantCount} want</span>
        </div>
      )}
      {totalRatings > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-amber-400">★</span>
          <span className="font-medium">{averageRating.toFixed(1)}</span>
          <span className="text-[#999]">({totalRatings})</span>
        </div>
      )}
    </div>
  );
}
