"use client";

import dynamic from "next/dynamic";
import { Upload } from "lucide-react";
import { parseExcel } from "@/lib/excel-parser";
import { useAppStore } from "@/store/useAppStore";
import React from "react";

// Dynamically import Map to avoid SSR issues
const MapInterface = dynamic(() => import("@/components/map/MapInterface"), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full bg-slate-50 flex items-center justify-center text-slate-400 font-medium">
      Initializing Map Systems...
    </div>
  ),
});

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

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
      {parsedData && (
        <div
          className="absolute top-6 right-10 z-10 bg-white rounded-xl p-1 shadow-md border border-slate-100 flex"
          style={{ minWidth: "calc(8rem + 3px)" }}
        >
          <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium shadow-sm">
            Map View
          </button>
          <button
            className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
            onClick={() => router.push("/dataset")}
          >
            Dataset
          </button>
        </div>
      )}

      {/* 1. THE LIVE MAP BACKGROUND (Always Visible) */}
      {/* We pass empty arrays if no data, so it renders a clean empty map */}
      <div className="absolute inset-0 z-0">
        <MapInterface />
      </div>

      {/* 2. THE UPLOAD OVERLAY (Only visible if NO data) */}
      {!parsedData && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[2px] transition-all duration-500">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-10 text-center animate-in zoom-in-95 fade-in duration-300 border border-white/50">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
              Upload Route Data
            </h1>
            <p className="text-slate-500 mb-8">
              Import your .xlsx file to visualize the fleet
            </p>
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`
                relative group cursor-pointer
                border-2 border-dashed rounded-2xl p-12 transition-all duration-200
                flex flex-col items-center justify-center
                ${
                  isDragging
                    ? "border-blue-500 bg-blue-50 ring-4 ring-blue-100"
                    : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                }
              `}
            >
              <div className="bg-slate-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-200">
                <Upload
                  className={`w-8 h-8 ${isDragging ? "text-blue-600" : "text-slate-600"}`}
                />
              </div>

              <div className="space-y-1 pointer-events-none">
                <p className="text-sm font-semibold text-slate-700">
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

            {/* Optional: Add a "Demo Data" button if you want */}
            {/* <div className="mt-6 pt-6 border-t border-slate-100">
               <button className="text-xs text-slate-400 font-medium hover:text-slate-600">Use Demo Data</button>
            </div> */}
          </div>
        </div>
      )}
    </main>
  );
}
