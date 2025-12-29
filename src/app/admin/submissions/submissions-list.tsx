"use client";

import { useState, useTransition } from "react";
import { approveSubmission, rejectSubmission } from "@/lib/actions/contribute";
import { useRouter } from "next/navigation";

type Submission = {
  id: number;
  mediaType: string;
  title: string;
  year: number;
  month: number | null;
  issue: number | null;
  volume: number | null;
  coverImage: string | null;
  description: string | null;
  barcode: string | null;
  runtimeMinutes: number | null;
  createdAt: Date | null;
  submitter: {
    id: string;
    username: string | null;
    displayName: string | null;
  } | null;
};

export function SubmissionsList({ submissions }: { submissions: Submission[] }) {
  return (
    <div className="space-y-4">
      {submissions.map((submission) => (
        <SubmissionCard key={submission.id} submission={submission} />
      ))}
    </div>
  );
}

function SubmissionCard({ submission }: { submission: Submission }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "approved" | "rejected">("idle");

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveSubmission(submission.id);
      if (result.success) {
        setStatus("approved");
        router.refresh();
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectSubmission(submission.id);
      if (result.success) {
        setStatus("rejected");
        router.refresh();
      }
    });
  };

  if (status !== "idle") {
    return (
      <div className={`border p-4 ${
        status === "approved" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
      }`}>
        <span className={status === "approved" ? "text-green-700" : "text-red-700"}>
          {status === "approved" ? "Approved" : "Rejected"}: {submission.title}
        </span>
      </div>
    );
  }

  return (
    <div className="border border-[#ebebeb] p-4">
      <div className="flex gap-4">
        {/* Cover Image */}
        <div className="w-24 h-32 bg-[#f6f6f6] border border-[#ebebeb] flex-shrink-0 overflow-hidden">
          {submission.coverImage ? (
            <img
              src={submission.coverImage}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#999] text-xs">
              No cover
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">
                {submission.title}
                {submission.issue && ` #${submission.issue}`}
              </h3>
              <p className="text-sm text-[#666]">
                {submission.mediaType} · {submission.year}
                {submission.month && ` · ${new Date(2000, submission.month - 1).toLocaleString("default", { month: "short" })}`}
              </p>
            </div>
            <span className="text-xs bg-[#f6f6f6] px-2 py-1 rounded">
              {submission.mediaType}
            </span>
          </div>

          {submission.description && (
            <p className="mt-2 text-sm text-[#666] line-clamp-2">
              {submission.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#999]">
            {submission.volume && <span>Volume {submission.volume}</span>}
            {submission.runtimeMinutes && <span>{submission.runtimeMinutes} min</span>}
            {submission.barcode && <span>UPC: {submission.barcode}</span>}
          </div>

          <div className="mt-3 pt-3 border-t border-[#ebebeb] flex items-center justify-between">
            <span className="text-xs text-[#999]">
              Submitted by {submission.submitter?.displayName || submission.submitter?.username || "Unknown"}
              {submission.createdAt && ` · ${new Date(submission.createdAt).toLocaleDateString()}`}
            </span>

            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={isPending}
                className="px-4 py-1.5 text-sm border border-[#ebebeb] hover:border-red-300 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                disabled={isPending}
                className="px-4 py-1.5 text-sm bg-[#3a3a3a] text-white hover:bg-[#555] transition-colors disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
