"use client";

import { useTransition } from "react";
import { verifyAllAppearances, updateMagazineStatus } from "@/lib/actions/review";

interface BulkActionsProps {
  magazineId: number;
  currentStatus: string;
  unverifiedCount: number;
}

export function BulkActions({ magazineId, currentStatus, unverifiedCount }: BulkActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleVerifyAll = () => {
    if (confirm(`Verify all ${unverifiedCount} unverified entities?`)) {
      startTransition(async () => {
        await verifyAllAppearances(magazineId);
      });
    }
  };

  const handlePublish = () => {
    if (confirm("Mark this magazine as published? This indicates review is complete.")) {
      startTransition(async () => {
        await updateMagazineStatus(magazineId, "published");
      });
    }
  };

  const handleUnpublish = () => {
    startTransition(async () => {
      await updateMagazineStatus(magazineId, "review");
    });
  };

  return (
    <div className="flex gap-2">
      {unverifiedCount > 0 && (
        <button
          onClick={handleVerifyAll}
          disabled={isPending}
          className="border border-green-600 bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isPending ? "..." : `Verify All (${unverifiedCount})`}
        </button>
      )}

      {currentStatus !== "published" ? (
        <button
          onClick={handlePublish}
          disabled={isPending || unverifiedCount > 0}
          className="border border-[#3a3a3a] bg-[#3a3a3a] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={unverifiedCount > 0 ? "Verify all entities before publishing" : "Publish magazine"}
        >
          {isPending ? "..." : "Publish"}
        </button>
      ) : (
        <button
          onClick={handleUnpublish}
          disabled={isPending}
          className="border border-amber-500 px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-500 hover:text-white transition-colors disabled:opacity-50"
        >
          {isPending ? "..." : "Unpublish"}
        </button>
      )}
    </div>
  );
}
