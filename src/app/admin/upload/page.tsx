"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { uploadPdf, runOcrProcessing } from "@/lib/actions/admin";

export default function UploadPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const file = formData.get("pdf") as File;

    if (!file || file.size === 0) {
      setError("Please select a PDF file");
      return;
    }

    startTransition(async () => {
      try {
        setStatus("Uploading PDF...");
        const uploadResult = await uploadPdf(formData);

        if (!uploadResult.success) {
          setError(uploadResult.error || "Upload failed");
          setStatus("");
          return;
        }

        const magazineId = uploadResult.magazineId!;

        // Auto-run OCR
        setStatus("Running OCR extraction (this may take a few minutes)...");
        const ocrResult = await runOcrProcessing(magazineId);

        if (!ocrResult.success) {
          setError(`OCR failed: ${ocrResult.error}`);
          // Still redirect to let user retry
        } else {
          setStatus(`OCR complete! Extracted ${ocrResult.totalPages} pages.`);
        }

        // Redirect to magazine control panel
        router.push(`/admin/magazines/${magazineId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setStatus("");
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-[#666] hover:text-[#3a3a3a]"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight mb-6">
        Upload Magazine PDF
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PDF File */}
        <div className="border border-[#ebebeb] p-6">
          <label className="block text-sm font-medium mb-2">
            PDF File <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            name="pdf"
            accept=".pdf"
            required
            disabled={isPending}
            className="w-full border border-[#ebebeb] px-4 py-3 text-sm file:mr-4 file:border-0 file:bg-[#f6f6f6] file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-[#ebebeb] disabled:opacity-50"
          />
          <p className="mt-2 text-xs text-[#999]">
            Select a PDF file to upload. OCR will run automatically after upload.
          </p>
        </div>

        {/* Magazine Metadata */}
        <div className="border border-[#ebebeb] p-6 space-y-4">
          <h2 className="font-semibold uppercase tracking-wide text-sm text-[#999] mb-4">
            Magazine Details
          </h2>

          <div>
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              required
              disabled={isPending}
              placeholder="e.g., Thrasher"
              className="w-full border border-[#ebebeb] px-4 py-3 text-sm placeholder:text-[#999] focus:border-[#3a3a3a] focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Year <span className="text-red-500">*</span>
              </label>
              <select
                name="year"
                required
                disabled={isPending}
                defaultValue=""
                className="w-full border border-[#ebebeb] px-4 py-3 text-sm focus:border-[#3a3a3a] focus:outline-none disabled:opacity-50"
              >
                <option value="" disabled>
                  Select year
                </option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <select
                name="month"
                disabled={isPending}
                defaultValue=""
                className="w-full border border-[#ebebeb] px-4 py-3 text-sm focus:border-[#3a3a3a] focus:outline-none disabled:opacity-50"
              >
                <option value="">Select month (optional)</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Volume</label>
              <input
                type="number"
                name="volume"
                min="1"
                disabled={isPending}
                placeholder="e.g., 1"
                className="w-full border border-[#ebebeb] px-4 py-3 text-sm placeholder:text-[#999] focus:border-[#3a3a3a] focus:outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Issue</label>
              <input
                type="number"
                name="issue"
                min="1"
                disabled={isPending}
                placeholder="e.g., 1"
                className="w-full border border-[#ebebeb] px-4 py-3 text-sm placeholder:text-[#999] focus:border-[#3a3a3a] focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="border border-red-400 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Status Message */}
        {status && (
          <div className="border border-blue-400 bg-blue-50 p-4 text-sm text-blue-600">
            {status}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full border border-[#3a3a3a] bg-[#3a3a3a] px-6 py-4 text-sm font-medium text-white hover:bg-white hover:text-[#3a3a3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Processing..." : "Upload & Process"}
        </button>
      </form>
    </div>
  );
}
