import { useMobileStore } from "@/store/useMobileStore";
import * as React from "react";

type MoreProps = {
  setShowMore: (show: boolean) => void;
  onOpenChange?: (open: boolean) => void;
};

const More: React.FC<MoreProps> = ({ setShowMore, onOpenChange }) => {
    const mapTheme = useMobileStore((state) => state.mapTheme);
    const setMapTheme = useMobileStore((state) => state.setMapTheme);
  React.useEffect(() => {
    if (onOpenChange) onOpenChange(true);
    return () => {
      if (onOpenChange) onOpenChange(false);
    };
  }, [onOpenChange]);

  return (
    <div className="fixed left-0 right-0 bottom-[95px] sm:bottom-[110px] md:bottom-[116px] md:landscape:bottom-[104px] z-[60] flex items-center justify-center rounded-[18px] px-2">
      <div
        className="relative w-full max-w-[402px] max-h-[70vh] h-auto bg-white rounded-[18px] shadow-2xl border border-white p-6 sm:p-8 overflow-y-auto transition-all duration-300 flex flex-col items-center"
        style={{
          boxShadow:
            "0 8px 32px 0 rgba(60,60,90,0.25), 0 1.5px 6px 0 rgba(0,0,0,0.10)",
        }}
      >
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f5f5] hover:bg-[#e0e0e0] border border-[#d6d6d6] text-black text-xl font-bold z-10"
          onClick={() => setShowMore(false)}
          aria-label="Close"
        >
          ×
        </button>

        {/* Map Mode Switcher (Mobile) */}
        <div className="w-full flex flex-col items-center gap-4 mt-12 mb-6">
          <span className="text-[15px] font-semibold text-[#696969] mb-2">Map Mode</span>
          <div className="flex gap-6 justify-center">
            <button
              className={`px-4 py-2 rounded-lg border font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 ${mapTheme === "light" ? "border-blue-500 bg-gray-100 text-blue-700" : "border-gray-300 bg-gray-100 text-gray-700"}`}
              onClick={() => setMapTheme("light")}
            >
              Light
            </button>
            <button
              className={`px-4 py-2 rounded-lg border font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 ${mapTheme === "dark" ? "border-blue-500 bg-gray-800 text-blue-100" : "border-gray-300 bg-gray-800 text-white"}`}
              onClick={() => setMapTheme("dark")}
            >
              Dark
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default More;