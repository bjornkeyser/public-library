"use client";

import { useState, useTransition } from "react";
import { submitMedia } from "@/lib/actions/contribute";
import { useRouter } from "next/navigation";

const MEDIA_TYPES = [
  { value: "magazine", label: "Magazine" },
  { value: "vhs", label: "VHS" },
  { value: "dvd", label: "DVD" },
  { value: "bluray", label: "Blu-ray" },
  { value: "digital", label: "Digital" },
];

const MONTHS = [
  { value: "", label: "Select month (optional)" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function ContributeForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mediaType, setMediaType] = useState("magazine");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await submitMedia(formData);
      if (result.success) {
        setSuccess(true);
        // Reset form
        const form = document.getElementById("contribute-form") as HTMLFormElement;
        form?.reset();
        setPreviewUrl(null);
        router.refresh();
      } else {
        setError(result.error || "Something went wrong");
      }
    });
  };

  const isVideo = ["vhs", "dvd", "bluray", "digital"].includes(mediaType);

  return (
    <form id="contribute-form" action={handleSubmit} className="space-y-6">
      <div className="border border-[#ebebeb] p-6">
        <h2 className="text-lg font-semibold mb-4">Add New Entry</h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
            Submission received! It will be reviewed by our moderators.
          </div>
        )}

        {/* Media Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#666] mb-1">
            Type *
          </label>
          <div className="flex flex-wrap gap-2">
            {MEDIA_TYPES.map((type) => (
              <label
                key={type.value}
                className={`cursor-pointer border px-4 py-2 text-sm transition-colors ${
                  mediaType === type.value
                    ? "border-[#3a3a3a] bg-[#3a3a3a] text-white"
                    : "border-[#ebebeb] hover:border-[#3a3a3a]"
                }`}
              >
                <input
                  type="radio"
                  name="mediaType"
                  value={type.value}
                  checked={mediaType === type.value}
                  onChange={(e) => setMediaType(e.target.value)}
                  className="sr-only"
                />
                {type.label}
              </label>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-[#666] mb-1">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            placeholder={isVideo ? "e.g., 411VM, The End, Sorry" : "e.g., Thrasher, Transworld"}
            className="w-full border border-[#ebebeb] px-4 py-2 focus:outline-none focus:border-[#3a3a3a]"
          />
        </div>

        {/* Year and Month */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-[#666] mb-1">
              Year *
            </label>
            <input
              type="number"
              id="year"
              name="year"
              required
              min="1950"
              max={new Date().getFullYear() + 1}
              placeholder="1985"
              className="w-full border border-[#ebebeb] px-4 py-2 focus:outline-none focus:border-[#3a3a3a]"
            />
          </div>
          <div>
            <label htmlFor="month" className="block text-sm font-medium text-[#666] mb-1">
              Month
            </label>
            <select
              id="month"
              name="month"
              className="w-full border border-[#ebebeb] px-4 py-2 focus:outline-none focus:border-[#3a3a3a] bg-white"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Issue/Volume for magazines */}
        {!isVideo && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="issue" className="block text-sm font-medium text-[#666] mb-1">
                Issue #
              </label>
              <input
                type="number"
                id="issue"
                name="issue"
                min="1"
                placeholder="42"
                className="w-full border border-[#ebebeb] px-4 py-2 focus:outline-none focus:border-[#3a3a3a]"
              />
            </div>
            <div>
              <label htmlFor="volume" className="block text-sm font-medium text-[#666] mb-1">
                Volume
              </label>
              <input
                type="number"
                id="volume"
                name="volume"
                min="1"
                placeholder="1"
                className="w-full border border-[#ebebeb] px-4 py-2 focus:outline-none focus:border-[#3a3a3a]"
              />
            </div>
          </div>
        )}

        {/* Runtime for videos */}
        {isVideo && (
          <div className="mb-4">
            <label htmlFor="runtimeMinutes" className="block text-sm font-medium text-[#666] mb-1">
              Runtime (minutes)
            </label>
            <input
              type="number"
              id="runtimeMinutes"
              name="runtimeMinutes"
              min="1"
              placeholder="45"
              className="w-full border border-[#ebebeb] px-4 py-2 focus:outline-none focus:border-[#3a3a3a]"
            />
          </div>
        )}

        {/* Barcode */}
        <div className="mb-4">
          <label htmlFor="barcode" className="block text-sm font-medium text-[#666] mb-1">
            Barcode (UPC/EAN)
          </label>
          <input
            type="text"
            id="barcode"
            name="barcode"
            placeholder="Optional"
            className="w-full border border-[#ebebeb] px-4 py-2 focus:outline-none focus:border-[#3a3a3a]"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-[#666] mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Optional notes about this release..."
            className="w-full border border-[#ebebeb] px-4 py-2 focus:outline-none focus:border-[#3a3a3a] resize-none"
          />
        </div>

        {/* Cover Image */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#666] mb-1">
            Cover Image
          </label>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <input
                type="file"
                name="coverImage"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full text-sm text-[#666] file:mr-4 file:py-2 file:px-4 file:border file:border-[#ebebeb] file:text-sm file:font-medium file:bg-white file:text-[#3a3a3a] hover:file:bg-[#f6f6f6] file:cursor-pointer"
              />
              <p className="mt-1 text-xs text-[#999]">
                JPG, PNG or WebP. Max 5MB.
              </p>
            </div>
            {previewUrl && (
              <div className="w-20 h-28 bg-[#f6f6f6] border border-[#ebebeb] overflow-hidden flex-shrink-0">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#3a3a3a] text-white py-3 px-4 hover:bg-[#555] transition-colors disabled:opacity-50 font-medium"
        >
          {isPending ? "Submitting..." : "Submit for Review"}
        </button>
      </div>
    </form>
  );
}
