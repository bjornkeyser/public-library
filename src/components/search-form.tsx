"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for skaters, spots, photographers..."
        className="flex-1 border border-[#ebebeb] bg-white px-4 py-3 text-[#3a3a3a] placeholder:text-[#999] focus:border-[#3a3a3a] focus:outline-none"
      />
      <button
        type="submit"
        className="border border-[#3a3a3a] bg-[#3a3a3a] px-6 py-3 font-medium text-white transition-colors hover:bg-white hover:text-[#3a3a3a]"
      >
        Search
      </button>
    </form>
  );
}
