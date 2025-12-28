"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  runOcrProcessing,
  runAiExtraction,
  setMagazineStatus,
  deleteMagazine,
} from "@/lib/actions/admin";

interface MagazineActionsProps {
  magazineId: number;
  status: string;
  hasPages: boolean;
  hasEntities: boolean;
  allVerified: boolean;
}

export function MagazineActions({
  magazineId,
  status,
  hasPages,
  hasEntities,
  allVerified,
}: MagazineActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentAction, setCurrentAction] = useState<string>("");

  const handleRunOcr = () => {
    if (!confirm("This will re-run OCR and replace existing page text. Continue?")) return;

    setCurrentAction("ocr");
    setMessage(null);
    startTransition(async () => {
      const result = await runOcrProcessing(magazineId);
      if (result.success) {
        setMessage({ type: "success", text: `OCR complete! Extracted ${result.totalPages} pages.` });
      } else {
        setMessage({ type: "error", text: result.error || "OCR failed" });
      }
      setCurrentAction("");
    });
  };

  const handleRunAi = (useVision: boolean) => {
    const mode = useVision ? "Vision+OCR" : "OCR-only";
    if (!confirm(`Run ${mode} AI extraction? This will replace existing entities.`)) return;

    setCurrentAction(useVision ? "ai-vision" : "ai");
    setMessage(null);
    startTransition(async () => {
      const result = await runAiExtraction(magazineId, { useVision });
      if (result.success) {
        const counts = result.counts;
        const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
        setMessage({ type: "success", text: `Extracted ${total} entities (${counts.skaters} skaters, ${counts.spots} spots, ${counts.photographers} photographers, ${counts.brands} brands, ${counts.tricks} tricks, ${counts.events} events)` });
      } else {
        setMessage({ type: "error", text: result.error || "AI extraction failed" });
      }
      setCurrentAction("");
    });
  };

  const handlePublish = () => {
    if (!confirm("Publish this magazine? It will become visible on the site.")) return;

    setCurrentAction("publish");
    startTransition(async () => {
      await setMagazineStatus(magazineId, "published");
      setMessage({ type: "success", text: "Magazine published!" });
      setCurrentAction("");
    });
  };

  const handleUnpublish = () => {
    setCurrentAction("unpublish");
    startTransition(async () => {
      await setMagazineStatus(magazineId, "review");
      setMessage({ type: "success", text: "Magazine unpublished." });
      setCurrentAction("");
    });
  };

  const handleDelete = () => {
    if (!confirm("Delete this magazine? This cannot be undone.")) return;
    if (!confirm("Are you sure? All pages and extracted entities will be deleted.")) return;

    setCurrentAction("delete");
    startTransition(async () => {
      await deleteMagazine(magazineId);
      router.push("/admin");
    });
  };

  return (
    <div className="space-y-4">
      {/* Message Display */}
      {message && (
        <div
          className={`p-3 text-sm ${
            message.type === "success"
              ? "border border-green-400 bg-green-50 text-green-700"
              : "border border-red-400 bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Processing Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleRunOcr}
          disabled={isPending}
          className="border border-[#3a3a3a] px-4 py-2 text-sm font-medium hover:bg-[#3a3a3a] hover:text-white transition-colors disabled:opacity-50"
        >
          {currentAction === "ocr" ? "Running OCR..." : hasPages ? "Re-run OCR" : "Run OCR"}
        </button>

        {hasPages && (
          <Link
            href={`/admin/magazines/${magazineId}/ocr`}
            className="border border-[#ebebeb] px-4 py-2 text-sm font-medium hover:border-[#3a3a3a] transition-colors"
          >
            Edit OCR Text
          </Link>
        )}

        <button
          onClick={() => handleRunAi(false)}
          disabled={isPending || !hasPages}
          className="border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50"
        >
          {currentAction === "ai" ? "Extracting..." : "Run AI (OCR)"}
        </button>

        <button
          onClick={() => handleRunAi(true)}
          disabled={isPending || !hasPages}
          className="border border-purple-600 px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-600 hover:text-white transition-colors disabled:opacity-50"
        >
          {currentAction === "ai-vision" ? "Extracting..." : "Run AI (Vision)"}
        </button>
      </div>

      {/* Review & Publish Actions */}
      <div className="flex flex-wrap gap-3 pt-3 border-t border-[#ebebeb]">
        {hasEntities && (
          <Link
            href={`/magazines/${magazineId}/review`}
            className="border border-amber-600 px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-600 hover:text-white transition-colors"
          >
            Review Entities
          </Link>
        )}

        {status !== "published" && allVerified && (
          <button
            onClick={handlePublish}
            disabled={isPending}
            className="border border-green-600 bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {currentAction === "publish" ? "Publishing..." : "Publish"}
          </button>
        )}

        {status === "published" && (
          <button
            onClick={handleUnpublish}
            disabled={isPending}
            className="border border-amber-600 px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-600 hover:text-white transition-colors disabled:opacity-50"
          >
            {currentAction === "unpublish" ? "..." : "Unpublish"}
          </button>
        )}
      </div>

      {/* Danger Zone */}
      <div className="pt-3 border-t border-[#ebebeb]">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="border border-red-400 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
        >
          {currentAction === "delete" ? "Deleting..." : "Delete Magazine"}
        </button>
      </div>
    </div>
  );
}
