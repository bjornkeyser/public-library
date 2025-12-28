"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { verifyAppearance, rejectAppearance, updateEntityName } from "@/lib/actions/review";

type EntityType = "skater" | "spot" | "photographer" | "brand" | "trick" | "event" | "location";

interface Appearance {
  id: number;
  magazineId: number;
  entityType: string;
  entityId: number;
  pageNumbers: number[] | null;
  context: string | null;
  verified: boolean | null;
  entity?: {
    id: number;
    name: string;
    [key: string]: any;
  };
}

interface ReviewSectionProps {
  title: string;
  entityType: EntityType;
  appearances: Appearance[];
  magazineId: number;
}

export function ReviewSection({ title, entityType, appearances, magazineId }: ReviewSectionProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isPending, startTransition] = useTransition();

  if (appearances.length === 0) return null;

  const unverifiedCount = appearances.filter((a) => !a.verified).length;

  const handleVerify = (appearanceId: number) => {
    startTransition(async () => {
      await verifyAppearance(appearanceId, magazineId);
    });
  };

  const handleReject = (appearanceId: number) => {
    if (confirm("Remove this entity from this magazine?")) {
      startTransition(async () => {
        await rejectAppearance(appearanceId, magazineId);
      });
    }
  };

  const handleEdit = (appearance: Appearance) => {
    setEditingId(appearance.id);
    setEditValue(appearance.entity?.name || "");
  };

  const handleSaveEdit = (appearance: Appearance) => {
    if (editValue.trim() && editValue !== appearance.entity?.name) {
      startTransition(async () => {
        await updateEntityName(entityType, appearance.entityId, editValue.trim(), magazineId);
        setEditingId(null);
      });
    } else {
      setEditingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, appearance: Appearance) => {
    if (e.key === "Enter") {
      handleSaveEdit(appearance);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  return (
    <section className="border border-[#ebebeb]">
      <div className="flex items-center justify-between border-b border-[#ebebeb] bg-[#f6f6f6] px-4 py-3">
        <h2 className="font-semibold uppercase tracking-wide">
          {title}
          <span className="ml-2 text-sm font-normal text-[#666]">
            ({appearances.length} total, {unverifiedCount} unverified)
          </span>
        </h2>
      </div>

      <div className="divide-y divide-[#ebebeb]">
        {appearances.filter((a) => a.entity).map((appearance) => (
          <div
            key={appearance.id}
            className={`flex items-center gap-4 px-4 py-3 ${
              appearance.verified ? "bg-green-50" : ""
            } ${isPending ? "opacity-50" : ""}`}
          >
            {/* Entity name */}
            <div className="flex-1">
              {editingId === appearance.id ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, appearance)}
                  onBlur={() => handleSaveEdit(appearance)}
                  className="w-full border border-[#3a3a3a] px-2 py-1 text-sm focus:outline-none"
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-2">
                  {entityType === "skater" ? (
                    <Link
                      href={`/skaters/${appearance.entityId}`}
                      className="font-medium hover:underline"
                    >
                      {appearance.entity!.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{appearance.entity!.name}</span>
                  )}
                  {appearance.verified && (
                    <span className="text-green-600 text-xs">verified</span>
                  )}
                </div>
              )}
            </div>

            {/* Page numbers */}
            <div className="flex items-center gap-1 text-xs text-[#666]">
              <span>p.</span>
              {(appearance.pageNumbers || []).map((p, i) => (
                <span key={p}>
                  <Link
                    href={`/magazines/${magazineId}/page/${p}`}
                    className="hover:underline"
                  >
                    {p}
                  </Link>
                  {i < (appearance.pageNumbers?.length || 0) - 1 && ","}
                </span>
              ))}
            </div>

            {/* Context */}
            {appearance.context && (
              <span className="text-xs text-[#999] bg-[#f6f6f6] px-2 py-0.5 rounded">
                {appearance.context}
              </span>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1">
              {!appearance.verified && (
                <button
                  onClick={() => handleVerify(appearance.id)}
                  disabled={isPending}
                  className="border border-green-600 px-2 py-1 text-xs text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                  title="Verify"
                >
                  Verify
                </button>
              )}
              <button
                onClick={() => handleEdit(appearance)}
                disabled={isPending || editingId === appearance.id}
                className="border border-[#999] px-2 py-1 text-xs text-[#666] hover:border-[#3a3a3a] hover:text-[#3a3a3a] transition-colors"
                title="Edit name"
              >
                Edit
              </button>
              <button
                onClick={() => handleReject(appearance.id)}
                disabled={isPending}
                className="border border-red-400 px-2 py-1 text-xs text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                title="Remove"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
