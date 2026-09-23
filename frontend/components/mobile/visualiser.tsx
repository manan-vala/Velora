"use client";

import React, { useRef, useState } from "react";
import dynamic from "next/dynamic";
import MobileHeader from "./MapWidgets/header";
import { MobileToggleButton } from "./MapWidgets/toggleButton";
import MobileFilterAndZoom from "./MapWidgets/zoom";
import MobileBottomNav from "./MapWidgets/bottomnav"; 
import Stats from "./MapWidgets/stats";
import MobileLegend from "./MapWidgets/legend";
import { parseExcel } from "@/lib/excel-parser";
import { useMobileStore } from "@/store/useMobileStore";
import UserCard from "./MapWidgets/user";
import SearchBar from "./MapWidgets/searchBar";
import ResultDashboard from "./MapWidgets/result";
import MobileHelpFeedback from "./helpFeedback";

// MapLibre needs the browser, so the map only loads client-side
const MobileMap = dynamic(() => import("./MobileMap"), { ssr: false });

function Group10({ onFileSelect }: { onFileSelect: () => void }) {
  return (
    <div
      className="bg-gray-200 border border-gray-300 rounded-xl h-12 w-full cursor-pointer hover:bg-gray-300 transition-colors flex items-center justify-center"
      onClick={onFileSelect}
    >
      <p className="text-gray-600 font-medium">Open internal storage</p>
    </div>
  );
}

function Group9({ onFileSelect }: { onFileSelect: () => void }) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <p className="text-xl font-bold text-center text-black">
        Upload Route Data
      </p>

      <Group10 onFileSelect={onFileSelect} />
    </div>
  );
}

function Group11({
  fileName,
  onDelete,
}: {
  fileName: string;
  onDelete: () => void;
}) {
  return (
    <div className="bg-gray-100 border border-black rounded-lg h-8 w-full flex items-center justify-between px-3">
      <p className="text-gray-500 text-sm truncate flex-1">{fileName}</p>
      <button onClick={onDelete} className="text-gray-700 hover:text-black">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M6 2V1C6 0.447715 6.44772 0 7 0H9C9.55228 0 10 0.447715 10 1V2H14C14.5523 2 15 2.44772 15 3V4C15 4.55228 14.5523 5 14 5H2C1.44772 5 1 4.55228 1 4V3C1 2.44772 1.44772 2 2 2H6ZM3 6V14C3 14.5523 3.44772 15 4 15H12C12.5523 15 13 14.5523 13 14V6H3ZM5 8V13M8 8V13M11 8V13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

function Frame6() {
  return (
    <div className="flex flex-col items-center justify-center">
      <p className="font-bold text-white text-xl text-center">Upload</p>
    </div>
  );
}

function Group13({
  onUpload,
  disabled,
}: {
  onUpload: () => void;
  disabled: boolean;
}) {
  return (
    <div
      className={`rounded-xl h-11 w-full cursor-pointer flex items-center justify-center ${disabled ? "bg-gray-400" : "bg-black"}`}
      onClick={!disabled ? onUpload : undefined}
    >
      <Frame6 />
    </div>
  );
}

function Frame7({
  fileName,
  hasFile,
  onFileSelect,
  onFileDelete,
  onUpload,
  uploadDisabled,
}: {
  fileName: string;
  hasFile: boolean;
  onFileSelect: () => void;
  onFileDelete: () => void;
  onUpload: () => void;
  uploadDisabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-5 w-full max-w-xs">
      <Group9 onFileSelect={onFileSelect} />
      {hasFile && <Group11 fileName={fileName} onDelete={onFileDelete} />}
      <Group13 onUpload={onUpload} disabled={uploadDisabled} />
    </div>
  );
}

export default function MobileVisualiser() {
  const More = React.useMemo(
    () => React.lazy(() => import("./MapWidgets/more")),
    [],
  );
  
  const MobileDatasetPage = React.useMemo(
    () => React.lazy(() => import("./datasetPage")),
    [],
  );
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadCard, setShowUploadCard] = useState(true);
  const [activeView, setActiveView] = useState<"map" | "dataset">("map");

  const setParsedData = useMobileStore((state) => state.setParsedData);
  const setUploadedFile = useMobileStore((state) => state.setUploadedFile);
  const optimizationResult = useMobileStore((state) => state.optimizationResult); 

  const [showUserCard, setShowUserCard] = useState(false);
  const [showSearchBar, setShowSearchBarRaw] = useState(false);
  const [showResult, setShowResultRaw] = useState(false);
  const [showStats, setShowStatsRaw] = useState(false);
  const [showMore, setShowMoreRaw] = useState(false);
  const [showHelpFeedback, setShowHelpFeedback] = useState(false);

  const setShowSearchBar = (show: boolean) => {
    setShowSearchBarRaw(show);
    if (show) {
      setShowResultRaw(false);
      setShowStatsRaw(false);
      setShowMoreRaw(false);
    }
  };
  const setShowResult = (show: boolean) => {
    setShowResultRaw(show);
    if (show) {
      setShowSearchBarRaw(false);
      setShowStatsRaw(false);
      setShowMoreRaw(false);
    }
  };
  const setShowStats = (show: boolean) => {
    setShowStatsRaw(show);
    if (show) {
      setShowSearchBarRaw(false);
      setShowResultRaw(false);
      setShowMoreRaw(false);
    }
  };
  const setShowMore = (show: boolean) => {
    setShowMoreRaw(show);
    if (show) {
      setShowSearchBarRaw(false);
      setShowResultRaw(false);
      setShowStatsRaw(false);
    }
  };

  const openHelpFeedback = () => {
    setShowUserCard(false);
    setShowSearchBarRaw(false);
    setShowResultRaw(false);
    setShowStatsRaw(false);
    setShowMoreRaw(false);
    setShowHelpFeedback(true);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file); 
    }
  };
  
  const handleFileDelete = () => {
    setSelectedFile(null);
    setUploadedFile(null); 
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const parsed = await parseExcel(selectedFile);
      setParsedData(parsed);
      setUploadedFile(selectedFile); 
      setShowUploadCard(false);
    } catch (error) {
      console.error("Error parsing file:", error);
    }
  };
  
  return (
    <div className="w-full h-screen relative bg-gray-100 font-sans">
      {/* Main container - full screen */}
      <div className="absolute inset-0">
        {/* Map View */}
        {activeView === "map" && (
          <>
            <div className="absolute inset-0 z-0">
              <MobileMap />
            </div>
            {/* Zoom, Search, Result overlays */}
            {!showUserCard && (
              <div className="absolute left-2 sm:left-3 top-24 sm:top-25 z-20 mt-2 sm:mt-4">
                <MobileToggleButton
                  activeView={activeView}
                  onToggle={setActiveView}
                />
              </div>
            )}
            {showUploadCard && (
              <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/30 px-4">
                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 w-full max-w-75">
                  <Frame7
                    fileName={selectedFile?.name || "No file selected"}
                    hasFile={!!selectedFile}
                    onFileSelect={handleFileSelect}
                    onFileDelete={handleFileDelete}
                    onUpload={handleUpload}
                    uploadDisabled={!selectedFile}
                  />
                </div>
              </div>
            )}
            <MobileHeader onAvatarClick={() => setShowUserCard(true)} />
            {showUserCard && (
              <div className="absolute right-2 sm:right-6 top-24 sm:top-28 z-50">
                <UserCard
                  setShowUserCard={setShowUserCard}
                  onHelpFeedbackClick={openHelpFeedback}
                />
              </div>
            )}
            {/* Zoom Button - fixed just above the legend */}
            {!showSearchBar && !showResult && !showStats && !showMore && (
              <div className="fixed left-0 right-0 bottom-38 sm:bottom-40 md:bottom-44 md:landscape:bottom-36 z-20 w-full px-2 sm:px-4 md:px-6 md:landscape:px-8 pointer-events-none">
                <div className="flex justify-end pointer-events-auto">
                  <MobileFilterAndZoom />
                </div>
              </div>
            )}
            {/* Search Bar Overlay - appears above bottomnav */}
            {showSearchBar && (
              <div className="fixed left-0 right-0 bottom-0 z-30 w-full pointer-events-auto">
                <SearchBar setShowSearchBar={setShowSearchBar} />
              </div>
            )}
            {/* 🚨 UPDATED WRAPPER: Covers entire screen, sits above everything 🚨 */}
            {/* 🚨 CHANGED: No more wrapping <div>! Just the component directly. */}
            {showResult && optimizationResult && (
               <ResultDashboard
                 setShowResult={setShowResult}
                 resultData={optimizationResult} 
               />
            )}
            {showStats && (
              <div className="fixed left-0 right-0 bottom-15 z-30 w-full pointer-events-auto">
                <Stats
                  setShowStats={setShowStats}
                  selectedVehicle={
                    (() => {
                      interface VehicleData {
                        vehicle_id: string;
                        capacity: number;
                        total_cost: number;
                        total_time_minutes: number;
                        total_steps: number;
                        avg_speed_kmph?: number;
                        route_sequence: Array<{ location: string; arrival_time: string }>;
                      }
                      const vehicles = (
                        optimizationResult?.data?.vehicles ||
                        (optimizationResult as { vehicles?: VehicleData[] } | null)?.vehicles ||
                        []
                      ) as VehicleData[];
                      return vehicles.find(
                        (v) => v.vehicle_id === useMobileStore.getState().activeVehicleId,
                      ) || vehicles[0] || {
                        vehicle_id: "N/A",
                        capacity: 0,
                        total_cost: 0,
                        total_time_minutes: 0,
                        total_steps: 0,
                        avg_speed_kmph: 0,
                        route_sequence: [],
                      };
                    })()
                  }
                  allVehicles={(
                    optimizationResult?.data?.vehicles ||
                    (optimizationResult as { vehicles?: Array<{
                      vehicle_id: string;
                      capacity: number;
                      total_cost: number;
                      total_time_minutes: number;
                      total_steps: number;
                      avg_speed_kmph?: number;
                      route_sequence: Array<{ location: string; arrival_time: string }>;
                    }> }).vehicles ||
                    []
                  ) as Array<{
                    vehicle_id: string;
                    capacity: number;
                    total_cost: number;
                    total_time_minutes: number;
                    total_steps: number;
                    avg_speed_kmph?: number;
                    route_sequence: Array<{ location: string; arrival_time: string }>;
                  }>}
                />
              </div>
            )}
            {/* Legend - fixed above bottom nav */}
            {!showSearchBar && !showResult && !showStats && !showMore && <MobileLegend />}
          </>
        )}
        {/* Dataset View */}
        {activeView === "dataset" && (
          <>
            <MobileHeader onAvatarClick={() => setShowUserCard(true)} />
            <MobileDatasetPage />
            {!showUserCard && (
              <div className="absolute left-2 sm:left-3 top-24 sm:top-25 z-20 mt-2 sm:mt-4">
                <MobileToggleButton
                  activeView={activeView}
                  onToggle={setActiveView}
                />
              </div>
            )}
            {showUserCard && (
              <div className="absolute left-0 right-0 top-24 sm:top-28 z-50 flex justify-center px-2">
                <div className="relative w-full max-w-full">
                  <button
                    className="absolute -top-3 right-2 sm:right-4 bg-white rounded-full shadow p-1 text-xl z-10 border border-gray-200"
                    onClick={() => setShowUserCard(false)}
                    aria-label="Close user card"
                  >
                    ×
                  </button>
                  <UserCard
                    setShowUserCard={setShowUserCard}
                    onHelpFeedbackClick={openHelpFeedback}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {showHelpFeedback && (
        <MobileHelpFeedback onClose={() => setShowHelpFeedback(false)} />
      )}

      {/* Bottom Navigation - fixed at bottom */}
      {!showHelpFeedback && (
        <div className="fixed left-0 right-0 bottom-0 z-20 w-full pointer-events-auto">
          <MobileBottomNav
            setShowSearchBar={setShowSearchBar}
            setShowResult={setShowResult}
            setShowStats={setShowStats}
            setShowMore={setShowMore}
          />
          {showMore && (
            <React.Suspense fallback={null}>
              <More setShowMore={setShowMore} />
            </React.Suspense>
          )}
        </div>
      )}
    </div>
  );
}