"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

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
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

export function MagazineStack({ magazines }: MagazineStackProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Map<number, MagazinePosition>>(new Map());
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [maxZIndex, setMaxZIndex] = useState(magazines.length);
  const [isDragged, setIsDragged] = useState(false);

  // Initialize positions on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = 500;
    const magWidth = 180;
    const magHeight = 240;

    const newPositions = new Map<number, MagazinePosition>();

    magazines.forEach((mag, index) => {
      // Use magazine ID as seed for consistent random positions
      const seed = mag.id;
      const randX = seededRandom(seed);
      const randY = seededRandom(seed + 1);
      const randRotation = seededRandom(seed + 2);

      // Distribute magazines across the container with some randomness
      const baseX = (index % 4) * (containerWidth / 4);
      const baseY = Math.floor(index / 4) * 150;

      newPositions.set(mag.id, {
        x: baseX + (randX - 0.5) * 100,
        y: baseY + (randY - 0.5) * 80 + 20,
        rotation: (randRotation - 0.5) * 30, // -15 to +15 degrees
        zIndex: index,
      });
    });

    setPositions(newPositions);
  }, [magazines]);

  const handleMouseDown = (e: React.MouseEvent, magId: number) => {
    e.preventDefault();
    const pos = positions.get(magId);
    if (!pos) return;

    setDragging(magId);
    setIsDragged(false);
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    });

    // Bring to front
    setMaxZIndex((prev) => prev + 1);
    setPositions((prev) => {
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

    setPositions((prev) => {
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

  return (
    <div
      ref={containerRef}
      className="relative h-[500px] overflow-hidden bg-[#e8e4df] rounded-lg"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseUp={() => setDragging(null)}
    >
      {magazines.map((mag) => {
        const pos = positions.get(mag.id);
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
              transition: dragging === mag.id ? "none" : "box-shadow 0.2s",
            }}
            onMouseDown={(e) => handleMouseDown(e, mag.id)}
            onMouseUp={() => handleMouseUp(mag.id)}
          >
            <div
              className="w-[180px] bg-white overflow-hidden"
              style={{
                boxShadow: dragging === mag.id
                  ? "0 20px 40px rgba(0,0,0,0.3), 0 10px 20px rgba(0,0,0,0.2)"
                  : "0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)",
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

      {/* Hint text */}
      <div className="absolute bottom-4 right-4 text-sm text-[#666] bg-white/80 px-3 py-1 rounded">
        Drag to explore · Click to open
      </div>
    </div>
  );
}
