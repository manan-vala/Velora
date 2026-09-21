import React from "react";
import Image from "next/image";

/**
 * MapVisual Component
 * Displays the route optimization map visualization on the right side of hero section
 * Shows optimized paths with black & white design
 */
export default function MapVisual() {
  return (
    <div className="absolute right-0 top-0 h-full flex items-end justify-end">
      <Image
        src="/map-visuals.png"
        alt="Route optimization map showing optimized paths"
        className="block w-auto max-w-none h-auto rounded-tl-[50px] shadow-lg max-h-full object-contain"
        width={600}
        height={600}
        priority
      />
    </div>
  );
}
