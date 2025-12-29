"use client";

import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { setCollectionStatus } from "@/lib/actions/collection";
import Link from "next/link";

type Status = "have" | "want" | "had" | null;

interface HaveWantToggleProps {
  mediaId: number;
  initialStatus: Status;
  stats: { have: number; want: number };
}

export function HaveWantToggle({ mediaId, initialStatus, stats }: HaveWantToggleProps) {
  const { data: session } = useSession();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [localStats, setLocalStats] = useState(stats);

  if (!session) {
    return (
      <div className="border border-[#ebebeb] p-4">
        <div className="flex items-center justify-between text-sm text-[#666] mb-3">
          <span>{localStats.have} have</span>
          <span>{localStats.want} want</span>
        </div>
        <Link
          href="/auth/login"
          className="block w-full text-center bg-[#f6f6f6] text-[#3a3a3a] py-2 px-4 hover:bg-[#ebebeb] transition-colors text-sm"
        >
          Sign in to track
        </Link>
      </div>
    );
  }

  const handleStatusChange = (newStatus: Status) => {
    const oldStatus = status;

    // Optimistic update
    setStatus(newStatus);

    // Update local stats optimistically
    const newStats = { ...localStats };
    if (oldStatus === "have") newStats.have--;
    if (oldStatus === "want") newStats.want--;
    if (newStatus === "have") newStats.have++;
    if (newStatus === "want") newStats.want++;
    setLocalStats(newStats);

    startTransition(async () => {
      const result = await setCollectionStatus(mediaId, newStatus);
      if (!result.success) {
        // Revert on error
        setStatus(oldStatus);
        setLocalStats(stats);
      }
    });
  };

  return (
    <div className="border border-[#ebebeb] p-4">
      <div className="flex items-center justify-between text-sm text-[#666] mb-3">
        <span>{localStats.have} have</span>
        <span>{localStats.want} want</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleStatusChange(status === "have" ? null : "have")}
          disabled={isPending}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            status === "have"
              ? "bg-[#3a3a3a] text-white"
              : "bg-[#f6f6f6] text-[#3a3a3a] hover:bg-[#ebebeb]"
          } disabled:opacity-50`}
        >
          {status === "have" ? "✓ Have" : "Have"}
        </button>
        <button
          onClick={() => handleStatusChange(status === "want" ? null : "want")}
          disabled={isPending}
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
            status === "want"
              ? "bg-[#3a3a3a] text-white"
              : "bg-[#f6f6f6] text-[#3a3a3a] hover:bg-[#ebebeb]"
          } disabled:opacity-50`}
        >
          {status === "want" ? "✓ Want" : "Want"}
        </button>
      </div>
      {status && (
        <button
          onClick={() => handleStatusChange(null)}
          disabled={isPending}
          className="mt-2 w-full text-xs text-[#999] hover:text-[#666]"
        >
          Remove from collection
        </button>
      )}
    </div>
  );
}
