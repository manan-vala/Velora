"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";

import dynamic from "next/dynamic";
import { Upload } from "lucide-react";
import { parseExcel } from "@/lib/excel-parser";
import { useAppStore } from "@/store/useAppStore";
import TopToggle from "@/components/map/MapWidgets/TopToggle";
import React from "react";

// Dynamically import Map to avoid SSR issues
const MapInterface = dynamic(() => import("@/components/map/MapInterface"), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full bg-slate-50 flex items-center justify-center text-sm text-slate-400">
      Loading map…
    </div>
  ),
});

function VisualiserScreen() {
  // Connect to store
  const parsedData = useAppStore((state) => state.parsedData);
  const setParsedData = useAppStore((state) => state.setParsedData);
  const setUploadedFile = useAppStore((state) => state.setUploadedFile);

  // Local state for drag-and-drop UI only
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFileUpload = async (file: File) => {
    try {
      const parsed = await parseExcel(file);
      setUploadedFile(file);
      setParsedData(parsed);
    } catch (error) {
      console.error("Error parsing file:", error);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-white">
      {/* Toggle between Map View and Dataset (only show if data is loaded) */}
      {parsedData && <TopToggle active="map" />}

      {/* 1. THE LIVE MAP BACKGROUND (Always Visible) */}
      {/* We pass empty arrays if no data, so it renders a clean empty map */}
      <div className="absolute inset-0 z-0">
        <MapInterface />
      </div>

      {/* 2. THE UPLOAD OVERLAY (Only visible if NO data) */}
      {!parsedData && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/10 p-4 backdrop-blur-[2px] transition-all duration-500">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/70 bg-white p-6 text-center shadow-2xl shadow-slate-900/10 animate-in zoom-in-95 fade-in duration-300">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              Upload Route Data
            </h1>
            <p className="mt-1 mb-5 text-sm text-slate-500">
              Import your .xlsx file to visualize the fleet
            </p>
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`
                relative group cursor-pointer
                border border-dashed rounded-xl px-6 py-8 transition-all duration-200
                flex flex-col items-center justify-center
                ${
                  isDragging
                    ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100"
                    : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                }
              `}
            >
              <div className="mb-3 rounded-full bg-slate-100 p-3 transition-transform duration-200 group-hover:scale-110">
                <Upload
                  className={`w-5 h-5 ${isDragging ? "text-blue-600" : "text-slate-600"}`}
                />
              </div>

              <div className="space-y-0.5 pointer-events-none">
                <p className="text-sm font-medium text-slate-700">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-slate-400">
                  Supports Excel (.xlsx, .xls)
                </p>
              </div>

              {/* Invisible File Input */}
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={onFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function VisualiserPage() {
  return (
    <RequireAuth>
      <VisualiserScreen />
    </RequireAuth>
  );
}
