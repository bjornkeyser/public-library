"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FlipCoverProps {
  coverImage: string | null;
  title: string;
  magazineId: number;
  firstPageImage?: string | null;
}

export function FlipCover({ coverImage, title, magazineId, firstPageImage }: FlipCoverProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    router.push(`/magazines/${magazineId}/page/1`);
  };

  return (
    <div
      className="relative cursor-pointer group"
      style={{ perspective: "1000px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Back page (first page preview) */}
      <div
        className="absolute inset-0 rounded border border-[#ebebeb] bg-[#f6f6f6] overflow-hidden"
        style={{
          transform: "translateX(8px)",
          boxShadow: "2px 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {firstPageImage ? (
          <img
            src={firstPageImage}
            alt="First page"
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="w-full h-full bg-[#f0f0f0]" />
        )}
      </div>

      {/* Front cover with flip effect */}
      <div
        className="relative aspect-[3/4] rounded border border-[#ebebeb] bg-[#f6f6f6] overflow-hidden transition-transform duration-300 ease-out"
        style={{
          transformOrigin: "left center",
          transform: isHovered ? "rotateY(-25deg)" : "rotateY(0deg)",
          boxShadow: isHovered
            ? "8px 8px 20px rgba(0,0,0,0.2), 2px 2px 8px rgba(0,0,0,0.1)"
            : "4px 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        {coverImage ? (
          <img
            src={coverImage}
            alt={`${title} cover`}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl">📰</span>
          </div>
        )}

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 bg-black/0 flex items-center justify-center transition-all duration-200 ${
            isHovered ? "bg-black/20" : ""
          }`}
        >
          <span
            className={`text-white font-medium text-sm bg-black/60 px-4 py-2 rounded transition-opacity duration-200 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            Open Magazine
          </span>
        </div>
      </div>
    </div>
  );
}
