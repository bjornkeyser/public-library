"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Magazine {
  id: number;
  title: string;
  volume: number | null;
  issue: number | null;
  year: number;
  month: number | null;
  coverImage: string | null;
}

interface MagazineStackProps {
  magazines: Magazine[];
}

interface MagazinePosition {
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
}

// Seeded random for consistent positions per magazine ID
function seededRandom(seed: number, offset: number = 0) {
  const x = Math.sin((seed + offset) * 9999 + offset * 1234) * 10000;
  return x - Math.floor(x);
}

// Mobile carousel component
function MobileCarousel({ magazines }: MagazineStackProps) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-4 scrollbar-hide">
      <div className="flex gap-3" style={{ width: "max-content" }}>
        {magazines.map((mag) => (
          <Link
            key={mag.id}
            href={`/magazines/${mag.id}`}
            className="flex-shrink-0 w-32 group"
          >
            <div className="bg-white shadow-md overflow-hidden transition-transform group-active:scale-95">
              {mag.coverImage ? (
                <img
                  src={mag.coverImage}
                  alt={`${mag.title} cover`}
                  className="w-full aspect-[3/4] object-cover"
                />
              ) : (
                <div className="w-full aspect-[3/4] bg-[#f6f6f6] flex items-center justify-center">
                  <span className="text-2xl">📰</span>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-[#666] truncate">{mag.title}</p>
            <p className="text-xs text-[#999]">
              {mag.month && new Date(2000, mag.month - 1).toLocaleString("default", { month: "short" })}{" "}
              {mag.year}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function MagazineStack({ magazines }: MagazineStackProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [stackedPositions, setStackedPositions] = useState<Map<number, MagazinePosition>>(new Map());
  const [spreadPositions, setSpreadPositions] = useState<Map<number, MagazinePosition>>(new Map());
  const [currentPositions, setCurrentPositions] = useState<Map<number, MagazinePosition>>(new Map());
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [maxZIndex, setMaxZIndex] = useState(magazines.length);
  const [isDragged, setIsDragged] = useState(false);
  const [fanProgress, setFanProgress] = useState(0); // 0 = stacked, 1 = fully fanned

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initialize positions on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = 600;
    const magWidth = 280;
    const magHeight = 373;

    const stackedMap = new Map<number, MagazinePosition>();
    const spreadMap = new Map<number, MagazinePosition>();

    // Center point of the container
    const centerX = (containerWidth - magWidth) / 2;
    const centerY = (containerHeight - magHeight) / 2;

    magazines.forEach((mag, index) => {
      // Use magazine ID as seed for consistent random positions
      const seed = mag.id * 7;
      const randX = seededRandom(seed, 0);
      const randY = seededRandom(seed, 100);
      const randRotation = seededRandom(seed, 200);

      // Stacked position: all magazines centered with slight offset for depth effect
      const stackOffset = index * 2;
      stackedMap.set(mag.id, {
        x: centerX + stackOffset,
        y: centerY - stackOffset,
        rotation: (seededRandom(seed, 300) - 0.5) * 6, // Slight rotation when stacked
        zIndex: index,
      });

      // Spread position: fanned out
      const spreadX = 350;
      const spreadY = 220;
      const rotation = (randRotation * 2 - 1) * 25;

      spreadMap.set(mag.id, {
        x: centerX + (randX - 0.5) * spreadX * 2,
        y: centerY + (randY - 0.5) * spreadY * 2,
        rotation,
        zIndex: index,
      });
    });

    setStackedPositions(stackedMap);
    setSpreadPositions(spreadMap);
    setCurrentPositions(stackedMap); // Start stacked
  }, [magazines]);

  // Handle scroll-based fanning
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate how much of the container is visible and how far we've scrolled into it
      const containerTop = rect.top;
      const containerHeight = rect.height;

      // Start fanning when container top reaches 80% of viewport, fully fanned when at 20%
      const startThreshold = viewportHeight * 0.8;
      const endThreshold = viewportHeight * 0.2;

      let progress = 0;
      if (containerTop <= startThreshold) {
        progress = Math.min(1, (startThreshold - containerTop) / (startThreshold - endThreshold));
      }

      setFanProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Interpolate between stacked and spread positions based on fanProgress
  useEffect(() => {
    if (dragging !== null) return; // Don't update while dragging

    const newPositions = new Map<number, MagazinePosition>();

    magazines.forEach((mag) => {
      const stacked = stackedPositions.get(mag.id);
      const spread = spreadPositions.get(mag.id);

      if (!stacked || !spread) return;

      // Ease function for smoother animation
      const eased = fanProgress * fanProgress * (3 - 2 * fanProgress); // smoothstep

      newPositions.set(mag.id, {
        x: stacked.x + (spread.x - stacked.x) * eased,
        y: stacked.y + (spread.y - stacked.y) * eased,
        rotation: stacked.rotation + (spread.rotation - stacked.rotation) * eased,
        zIndex: stacked.zIndex,
      });
    });

    setCurrentPositions(newPositions);
  }, [fanProgress, stackedPositions, spreadPositions, magazines, dragging]);

  const handleMouseDown = (e: React.MouseEvent, magId: number) => {
    e.preventDefault();
    const pos = currentPositions.get(magId);
    if (!pos) return;

    setDragging(magId);
    setIsDragged(false);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    });

    // Bring to front
    setMaxZIndex((prev) => prev + 1);
    setCurrentPositions((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(magId);
      if (current) {
        newMap.set(magId, { ...current, zIndex: maxZIndex + 1 });
      }
      return newMap;
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging === null) return;

    setIsDragged(true);
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setCurrentPositions((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(dragging);
      if (current) {
        newMap.set(dragging, {
          ...current,
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
      return newMap;
    });
  };

  const handleMouseUp = (magId: number) => {
    if (dragging === magId && !isDragged) {
      // It was a click, not a drag
      router.push(`/magazines/${magId}`);
    }
    setDragging(null);
  };

  const handleMouseLeave = () => {
    setDragging(null);
  };

  if (magazines.length === 0) return null;

  // Show simple carousel on mobile
  if (isMobile) {
    return <MobileCarousel magazines={magazines} />;
  }

  // Desktop: fancy draggable stack
  return (
    <div
      ref={containerRef}
      className="relative h-[600px] overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseUp={() => setDragging(null)}
    >
      {magazines.map((mag) => {
        const pos = currentPositions.get(mag.id);
        if (!pos || !mag.coverImage) return null;

        return (
          <div
            key={mag.id}
            className="absolute cursor-grab active:cursor-grabbing select-none"
            style={{
              left: pos.x,
              top: pos.y,
              transform: `rotate(${pos.rotation}deg)`,
              zIndex: pos.zIndex,
              transition: dragging === mag.id ? "none" : "left 0.15s ease-out, top 0.15s ease-out, transform 0.15s ease-out, box-shadow 0.2s",
            }}
            onMouseDown={(e) => handleMouseDown(e, mag.id)}
            onMouseUp={() => handleMouseUp(mag.id)}
          >
            <div
              className="w-[280px] bg-white overflow-hidden"
              style={{
                boxShadow: dragging === mag.id
                  ? "0 25px 50px rgba(0,0,0,0.35), 0 15px 25px rgba(0,0,0,0.25)"
                  : "4px 4px 20px rgba(0,0,0,0.25), 2px 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <img
                src={mag.coverImage}
                alt={`${mag.title} cover`}
                className="w-full aspect-[3/4] object-cover pointer-events-none"
                draggable={false}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
