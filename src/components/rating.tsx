"use client";

import { useState, useTransition } from "react";
import { submitRating, deleteRating } from "@/lib/actions/ratings";
import { useSession } from "next-auth/react";
import Link from "next/link";

type RatingProps = {
  mediaId: number;
  initialUserRating?: {
    rating: number;
    review: string | null;
  } | null;
  stats: {
    totalRatings: number;
    averageRating: number;
  };
};

function StarButton({
  filled,
  hovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  disabled,
}: {
  filled: boolean;
  hovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled}
      className={`text-2xl transition-colors ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      } ${
        filled || hovered
          ? "text-amber-400"
          : "text-[#ebebeb] hover:text-amber-200"
      }`}
    >
      {filled || hovered ? "★" : "☆"}
    </button>
  );
}

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const sizeClass = size === "lg" ? "text-lg" : "text-sm";

  return (
    <span className={`text-amber-400 ${sizeClass}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>
          {star <= fullStars ? "★" : star === fullStars + 1 && hasHalf ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

export function RatingSection({ mediaId, initialUserRating, stats }: RatingProps) {
  const { data: session, status } = useSession();
  const [isPending, startTransition] = useTransition();
  const [selectedRating, setSelectedRating] = useState(initialUserRating?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState(initialUserRating?.review || "");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleStarClick = (rating: number) => {
    if (status !== "authenticated") return;
    setSelectedRating(rating);
    setShowReviewForm(true);
  };

  const handleSubmit = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await submitRating(mediaId, selectedRating, review);
      if (result.success) {
        setMessage({ type: "success", text: "Rating saved!" });
        setShowReviewForm(false);
      } else {
        setMessage({ type: "error", text: result.error || "Failed to save rating" });
      }
    });
  };

  const handleDelete = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteRating(mediaId);
      if (result.success) {
        setSelectedRating(0);
        setReview("");
        setMessage({ type: "success", text: "Rating removed" });
        setShowReviewForm(false);
      } else {
        setMessage({ type: "error", text: result.error || "Failed to remove rating" });
      }
    });
  };

  return (
    <div className="border border-[#ebebeb] p-4 space-y-4">
      {/* Aggregate Rating Display */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-[#999] mb-1">Rating</h3>
          {stats.totalRatings > 0 ? (
            <div className="flex items-center gap-2">
              <StarDisplay rating={stats.averageRating} size="lg" />
              <span className="font-semibold">{stats.averageRating.toFixed(1)}</span>
              <span className="text-sm text-[#666]">
                ({stats.totalRatings} {stats.totalRatings === 1 ? "rating" : "ratings"})
              </span>
            </div>
          ) : (
            <p className="text-sm text-[#666]">No ratings yet</p>
          )}
        </div>
      </div>

      {/* User Rating Input */}
      <div className="border-t border-[#ebebeb] pt-4">
        {status === "loading" ? (
          <div className="h-8 bg-[#f6f6f6] animate-pulse" />
        ) : status !== "authenticated" ? (
          <p className="text-sm text-[#666]">
            <Link href="/auth/login" className="underline hover:text-[#3a3a3a]">
              Sign in
            </Link>{" "}
            to rate this
          </p>
        ) : (
          <div>
            <p className="text-sm text-[#666] mb-2">
              {initialUserRating ? "Your rating:" : "Rate this:"}
            </p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarButton
                  key={star}
                  filled={star <= selectedRating}
                  hovered={star <= hoveredRating && hoveredRating > selectedRating}
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  disabled={isPending}
                />
              ))}
              {selectedRating > 0 && (
                <span className="ml-2 text-sm text-[#666]">{selectedRating}/5</span>
              )}
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <div className="mt-4 space-y-3">
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Add a review (optional)..."
                  rows={3}
                  className="w-full border border-[#ebebeb] px-3 py-2 text-sm focus:outline-none focus:border-[#3a3a3a] resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={isPending || selectedRating === 0}
                    className="px-4 py-1.5 text-sm bg-[#3a3a3a] text-white hover:bg-[#555] transition-colors disabled:opacity-50"
                  >
                    {isPending ? "Saving..." : "Save Rating"}
                  </button>
                  {initialUserRating && (
                    <button
                      onClick={handleDelete}
                      disabled={isPending}
                      className="px-4 py-1.5 text-sm border border-[#ebebeb] hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowReviewForm(false);
                      setSelectedRating(initialUserRating?.rating || 0);
                      setReview(initialUserRating?.review || "");
                    }}
                    disabled={isPending}
                    className="px-4 py-1.5 text-sm text-[#666] hover:text-[#3a3a3a] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {message && (
              <p
                className={`mt-2 text-sm ${
                  message.type === "success" ? "text-green-700" : "text-red-700"
                }`}
              >
                {message.text}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact display for listings
export function RatingDisplay({
  averageRating,
  totalRatings,
}: {
  averageRating: number;
  totalRatings: number;
}) {
  if (totalRatings === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#666]">
      <span className="text-amber-400">★</span>
      <span>{averageRating.toFixed(1)}</span>
      <span>({totalRatings})</span>
    </span>
  );
}
