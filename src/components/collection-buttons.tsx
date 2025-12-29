"use client";

import { useState, useTransition } from "react";
import { setCollectionStatus } from "@/lib/actions/collection";
import { useSession } from "next-auth/react";
import Link from "next/link";

type CollectionButtonsProps = {
  mediaId: number;
  initialStatus: "have" | "want" | null;
};

export function CollectionButtons({ mediaId, initialStatus }: CollectionButtonsProps) {
  const { data: session, status: sessionStatus } = useSession();
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(initialStatus);

  const handleClick = (newStatus: "have" | "want") => {
    if (sessionStatus !== "authenticated") return;

    startTransition(async () => {
      // Toggle off if clicking same status
      const targetStatus = currentStatus === newStatus ? null : newStatus;
      const result = await setCollectionStatus(mediaId, targetStatus);
      if (result.success) {
        setCurrentStatus(targetStatus);
      }
    });
  };

  if (sessionStatus === "loading") {
    return (
      <div className="flex gap-2">
        <div className="h-9 w-32 bg-[#f6f6f6] animate-pulse" />
        <div className="h-9 w-32 bg-[#f6f6f6] animate-pulse" />
      </div>
    );
  }

  if (sessionStatus !== "authenticated") {
    return (
      <div className="flex gap-2">
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#ebebeb] text-sm hover:border-[#3a3a3a] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Add to Collection
        </Link>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#ebebeb] text-sm hover:border-[#3a3a3a] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Add to Wantlist
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleClick("have")}
        disabled={isPending}
        className={`inline-flex items-center gap-2 px-4 py-2 border text-sm transition-colors disabled:opacity-50 ${
          currentStatus === "have"
            ? "border-green-600 bg-green-50 text-green-700"
            : "border-[#ebebeb] hover:border-[#3a3a3a]"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        {currentStatus === "have" ? "In Collection" : "Add to Collection"}
      </button>
      <button
        onClick={() => handleClick("want")}
        disabled={isPending}
        className={`inline-flex items-center gap-2 px-4 py-2 border text-sm transition-colors disabled:opacity-50 ${
          currentStatus === "want"
            ? "border-blue-600 bg-blue-50 text-blue-700"
            : "border-[#ebebeb] hover:border-[#3a3a3a]"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        {currentStatus === "want" ? "On Wantlist" : "Add to Wantlist"}
      </button>
    </div>
  );
}
