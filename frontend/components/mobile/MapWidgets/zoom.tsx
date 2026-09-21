"use client";

import React from "react";
import Image from "next/image";

import { useMobileStore } from "@/store/useMobileStore";

import { calculateMapCenter } from "@/lib/map-utils";

/* ---------------- MOBILE CONTROL BAR ---------------- */

// Compass/Zoom button
function ZoomButton() {
  const mapInstance = useMobileStore((s) => s.mapInstance);
  const setZoom = useMobileStore((s) => s.setZoom);
  const parsedData = useMobileStore((s) => s.parsedData);

  const handleZoom = () => {
    if (!mapInstance || !parsedData) return;
    const result = calculateMapCenter(
      parsedData?.employees || [],
      parsedData?.vehicles || [],
    );
    if (result) {
      const { lat, lng, zoom } = result;
      mapInstance.panTo({ lat, lng });
      mapInstance.setZoom(zoom);
      setZoom(zoom);
    }
  };

  return (
    <Image
      src="/compass.svg"
      alt="Center on office"
      onClick={handleZoom}
      className="rounded-full w-13 h-13 md:w-14 md:h-14 md:landscape:w-13 md:landscape:h-13 object-cover cursor-pointer"
      title="Center on office"
      width={52}
      height={52}
    />
  );
}

export default function MobileFilterAndZoom() {
  return (
    <>
      <ZoomButton />
    </>
  );
}
