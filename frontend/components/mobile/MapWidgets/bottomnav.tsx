"use client";

import React, { useRef, useEffect } from "react";
import Image from "next/image";
import { useMobileStore } from "@/store/useMobileStore";
import { useMobileOptimization } from "@/hooks/useMobileOptimization"; 

const svgPaths = {
  p196a5800:
    "M19 19.1132L25 25M23.1538 11.8679C23.1538 17.8701 18.1945 22.7358 12.0769 22.7358C5.95931 22.7358 1 17.8701 1 11.8679C1 5.86574 5.95931 1 12.0769 1C18.1945 1 23.1538 5.86574 23.1538 11.8679Z",
  pda10400:
    "M9.48629 21.2642H21.0429C24.741 21.2642 25.2033 13.8679 21.0429 12.9434H3.93912C1.16548 12.9434 0.241025 5.08491 3.93912 4.62265H15.958",
};

function Frame1({ setShowSearchBar }: { setShowSearchBar: (show: boolean) => void }) {
  return (
    <div
      className="absolute h-[38px] left-[-2px] top-[15px] w-[75px] cursor-pointer"
      onClick={() => setShowSearchBar(true)}
    >
      <div className="absolute left-[26px] size-[24px] top-px" data-name="Vector">
        <div className="absolute inset-[-4.17%_-2.92%_-2.97%_-4.17%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 25.7003 25.7138"
          >
            <path d={svgPaths.p196a5800} id="Vector" stroke="var(--stroke-0, black)" strokeWidth="2" />
          </svg>
        </div>
      </div>
      <p
        className="absolute font-['Roboto:Regular',sans-serif] font-normal leading-[normal] left-[25px] text-[10px] text-black top-[29px]"
        style={{ fontVariationSettings: "'wdth' 100" }}
      >
        Search
      </p>
    </div>
  );
}

function Frame2({ setShowStats }: { setShowStats: (show: boolean) => void }) {
  return (
    <div
      className="absolute h-[38px] left-[81px] top-[15px] w-[75px] cursor-pointer"
      onClick={() => setShowStats(true)}
    >
      <div className="absolute left-[22px] size-[32px] top-[-2px]" data-name="Chart_light">
        <div className="absolute flex inset-[41.67%_66.67%_33.33%_33.33%] items-center justify-center">
          <div className="flex-none h-px rotate-90 w-[11px]">
            <div className="relative size-full">
              <div className="absolute inset-[-1px_-12.5%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10 2">
                  <path d="M1 1H9" id="Vector 8" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-[33.33%] flex items-center justify-center left-1/2 right-1/2 top-1/2">
          <div className="flex-none h-px rotate-90 w-[7.333px]">
            <div className="relative size-full">
              <div className="absolute inset-[-1px_-18.75%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 7.33333 2">
                  <path d="M1 1H6.33333" id="Vector 9" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute flex inset-[33.33%_33.33%_33.33%_66.67%] items-center justify-center">
          <div className="flex-none h-px rotate-90 w-[14.667px]">
            <div className="relative size-full">
              <div className="absolute inset-[-1px_-9.37%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.6667 2">
                  <path d="M1 1H11.6667" id="Vector 10" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute inset-[16.67%_12.5%] rounded-[2px]">
          <div aria-hidden="true" className="absolute border-[1.5px] border-black border-solid inset-[-0.75px] pointer-events-none rounded-[2.75px]" />
        </div>
      </div>
      <p
        className="absolute font-['Roboto:Regular',sans-serif] font-normal leading-[normal] left-[26.5px] text-[10px] text-black top-[29px]"
        style={{ fontVariationSettings: "'wdth' 100" }}
      >
        Stats
      </p>
    </div>
  );
}

function Frame3({ setShowResult }: { setShowResult: (show: boolean) => void }) {
  return (
    <div
      className="absolute h-[38px] left-[245px] top-[15px] w-[75px] cursor-pointer"
      onClick={() => setShowResult(true)}
    >
      <p
        className="absolute font-['Roboto:Regular',sans-serif] font-normal leading-[normal] left-[21.5px] text-[10px] text-black top-[28px]"
        style={{ fontVariationSettings: "'wdth' 100" }}
      >
        Results
      </p>
      <div className="absolute left-[22px] size-[32px] top-[-5px]" data-name="Waterfall">
        <div className="absolute inset-[87.5%_12.5%_12.5%_12.5%]">
          <div className="absolute inset-[-1.25px_-5.21%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 26.5 2.5">
              <path d="M25.25 1.25H1.25" id="Rectangle 25" stroke="var(--stroke-0, #33363F)" strokeLinecap="round" strokeWidth="2.5" />
            </svg>
          </div>
        </div>
        <div className="absolute inset-[58.33%_83.33%_33.33%_16.67%]">
          <div className="absolute inset-[-46.87%_-1.25px_-46.88%_-1.25px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2.5 5.16667">
              <path d="M1.25 3.91667V1.25" id="Vector 307" stroke="var(--stroke-0, #33363F)" strokeLinecap="round" strokeWidth="2.5" />
            </svg>
          </div>
        </div>
        <div className="absolute bottom-1/2 left-1/2 right-1/2 top-[37.5%]">
          <div className="absolute inset-[-31.25%_-1.25px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2.5 6.5">
              <path d="M1.25 5.25V1.25" id="Vector 308" stroke="var(--stroke-0, #33363F)" strokeLinecap="round" strokeWidth="2.5" />
            </svg>
          </div>
        </div>
        <div className="absolute inset-[41.67%_66.67%_33.33%_33.33%]">
          <div className="absolute inset-[-15.63%_-1.25px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2.5 10.5">
              <path d="M1.25 9.25V1.25" id="Vector 309" stroke="var(--stroke-0, #33363F)" strokeLinecap="round" strokeWidth="2.5" />
            </svg>
          </div>
        </div>
        <div className="absolute inset-[45.83%_33.33%_45.83%_66.67%]">
          <div className="absolute inset-[-46.87%_-1.25px_-46.88%_-1.25px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2.5 5.16667">
              <path d="M1.25 3.91667V1.25" id="Vector 307" stroke="var(--stroke-0, #33363F)" strokeLinecap="round" strokeWidth="2.5" />
            </svg>
          </div>
        </div>
        <div className="absolute inset-[20.83%_16.67%_37.5%_83.33%]">
          <div className="absolute inset-[-9.37%_-1.25px]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 2.5 15.8333">
              <path d="M1.25 14.5833V1.25" id="Vector 311" stroke="var(--stroke-0, #33363F)" strokeLinecap="round" strokeWidth="2.5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function CenterButton({
  onOptimize,
  isPending,
  isOptimized,
}: {
  onOptimize: () => void;
  isPending: boolean;
  isOptimized: boolean;
}) {
  let innerCircleFill = "var(--fill-0, #D4D4D4)";
  if (isOptimized) innerCircleFill = "#22c55e";
  else if (isPending) innerCircleFill = "#eab308";

  return (
    <div
      className="absolute left-[168px] size-[65px] top-[2px] rounded-full cursor-pointer z-50 transition-transform active:scale-95 flex items-center justify-center"
      onClick={onOptimize}
    >
      <div className="absolute inset-[-4.62%_-7.69%_-7.69%_-4.62%] pointer-events-none">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 73 73">
          <g id="Group 176">
            <g filter="url(#filter0_d_3_1625)" id="Ellipse 173">
              <circle cx="35.5" cy="35.5" fill="var(--fill-0, white)" r="32.5" />
            </g>
            <g filter="url(#filter1_i_3_1625)" id="Ellipse 174">
              <circle
                cx="35.5"
                cy="35.5"
                fill={innerCircleFill}
                r="27.5"
                style={{ transition: "fill 0.3s ease" }}
              />
            </g>
          </g>
        </svg>
      </div>
      <div className="relative w-6 h-6 z-10 pointer-events-none">
        <Image src="/optimized.svg" alt="Optimization Logo" fill className="object-contain" />
      </div>
    </div>
  );
}

function MoreDots() {
  return (
      <div className="absolute left-[32px] overflow-clip rounded-[12px] size-[24px] top-[2px] cursor-pointer">
          <svg
            className="block size-full"
            fill="none"
            viewBox="0 0 21.9931 20.8553"
          >
            <g>
              <path
                d="M19.3465 7.35066L18.9803 7.14693C18.9234 7.1153 18.8954 7.09942 18.8679 7.08297C18.5949 6.91939 18.3647 6.69337 18.1967 6.42296C18.1798 6.39575 18.1639 6.36722 18.1313 6.31083C18.0988 6.25451 18.0823 6.22597 18.0672 6.19772C17.9165 5.9164 17.835 5.60289 17.8301 5.2838C17.8296 5.25172 17.8297 5.21894 17.8308 5.15378L17.838 4.72852C17.8494 4.04799 17.8552 3.70667 17.7595 3.40035C17.6746 3.12827 17.5325 2.87766 17.3427 2.66499C17.1282 2.42458 16.8313 2.25308 16.2368 1.9105L15.7429 1.62594C15.1501 1.28431 14.8536 1.11344 14.5388 1.0483C14.2604 0.990672 13.973 0.993343 13.6956 1.05563C13.3825 1.12592 13.0897 1.30125 12.5044 1.65169L12.5011 1.65328L12.1472 1.86514C12.0913 1.89864 12.063 1.91553 12.0349 1.93112C11.7567 2.08584 11.446 2.17139 11.1278 2.1816C11.0957 2.18263 11.0631 2.18263 10.9978 2.18263C10.933 2.18263 10.899 2.18263 10.867 2.1816C10.548 2.17134 10.2367 2.08533 9.95803 1.92997C9.92995 1.91431 9.90216 1.89729 9.8461 1.86364L9.49002 1.64986C8.90075 1.2961 8.60567 1.11895 8.2908 1.0483C8.01223 0.9858 7.7239 0.98407 7.44443 1.04244C7.12888 1.10835 6.83229 1.28049 6.23911 1.62477L6.23647 1.62594L5.74881 1.90897L5.74341 1.91227C5.15557 2.25345 4.86093 2.42445 4.64822 2.66387C4.45946 2.87633 4.31837 3.12655 4.23392 3.39791C4.13847 3.70465 4.14355 4.0467 4.15506 4.73043L4.1622 5.15509C4.16328 5.2194 4.16516 5.25135 4.16469 5.28298C4.15996 5.60272 4.07738 5.91687 3.92627 6.19869C3.91132 6.22656 3.89522 6.25444 3.86306 6.31011C3.83088 6.36582 3.8153 6.39352 3.79861 6.42041C3.62989 6.69226 3.39866 6.9196 3.12386 7.08346C3.09667 7.09967 3.06803 7.11525 3.01174 7.14645L2.65017 7.34681C2.04861 7.68018 1.74789 7.84701 1.52908 8.08443C1.33551 8.29446 1.18928 8.54358 1.10001 8.8149C0.999113 9.1216 0.999197 9.46552 1.00076 10.1533L1.00204 10.7154C1.00359 11.3986 1.00572 11.7399 1.10684 12.0446C1.19631 12.3141 1.34147 12.5617 1.53396 12.7705C1.75154 13.0064 2.04926 13.1722 2.64627 13.5044L3.00461 13.7037C3.06559 13.7376 3.09628 13.7544 3.12569 13.7721C3.398 13.9361 3.62742 14.1628 3.7947 14.4331C3.81278 14.4623 3.83013 14.4926 3.86482 14.5532C3.89908 14.613 3.91661 14.643 3.93246 14.673C4.07913 14.9507 4.15766 15.2592 4.16302 15.5732C4.16359 15.6071 4.1631 15.6414 4.16194 15.7104L4.15506 16.1179C4.14347 16.804 4.13843 17.1474 4.23445 17.455C4.31939 17.7271 4.46137 17.9777 4.65115 18.1904C4.86568 18.4308 5.16307 18.6022 5.7576 18.9448L6.2513 19.2293C6.84415 19.5709 7.14047 19.7416 7.45521 19.8067C7.73366 19.8644 8.02117 19.8621 8.29861 19.7998C8.61219 19.7294 8.906 19.5535 9.49295 19.2021L9.84677 18.9902C9.90275 18.9567 9.93109 18.9399 9.95914 18.9243C10.2374 18.7696 10.5478 18.6836 10.866 18.6734C10.8981 18.6723 10.9307 18.6723 10.9959 18.6723C11.0613 18.6723 11.0939 18.6723 11.126 18.6734C11.445 18.6836 11.7572 18.7699 12.0359 18.9253C12.0604 18.9389 12.085 18.9537 12.1282 18.9796L12.5043 19.2054C13.0937 19.5592 13.3881 19.7359 13.703 19.8065C13.9816 19.869 14.2701 19.8716 14.5496 19.8132C14.865 19.7473 15.1622 19.5748 15.7551 19.2307L16.2501 18.9434C16.8383 18.6021 17.1333 18.4309 17.346 18.1914C17.5348 17.9789 17.6761 17.7288 17.7605 17.4574C17.8553 17.1529 17.8496 16.8135 17.8382 16.1396L17.8308 15.7002C17.8298 15.6358 17.8296 15.6039 17.8301 15.5722C17.8348 15.2525 17.9161 14.9381 18.0672 14.6563C18.0821 14.6285 18.0983 14.6004 18.1304 14.5449C18.1625 14.4892 18.1792 14.4614 18.1959 14.4345C18.3646 14.1627 18.5961 13.9351 18.8709 13.7713C18.8977 13.7553 18.9254 13.74 18.9803 13.7095L18.9822 13.7086L19.3438 13.5083C19.9453 13.1749 20.2466 13.0079 20.4654 12.7705C20.659 12.5604 20.8051 12.3117 20.8943 12.0403C20.9946 11.7354 20.9938 11.3935 20.9923 10.7138L20.991 10.1396C20.9894 9.45644 20.9886 9.11513 20.8875 8.81051C20.798 8.54101 20.652 8.29334 20.4595 8.08458C20.2422 7.84884 19.944 7.68299 19.3482 7.35151L19.3465 7.35066Z"
                stroke="black"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M6.99685 10.4277C6.99685 12.6368 8.78771 14.4277 10.9969 14.4277C13.206 14.4277 14.9969 12.6368 14.9969 10.4277C14.9969 8.21856 13.206 6.4277 10.9969 6.4277C8.78771 6.4277 6.99685 8.21856 6.99685 10.4277Z"
                stroke="black"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </g>
          </svg>
        </div>
  );
}

function Frame4({ setShowMore }: { setShowMore: (show: boolean) => void }) {
  return (
    <div
      className="absolute h-[38px] left-[327px] top-[15px] w-[75px]"
    >
      <p
        className="absolute font-['Roboto:Regular',sans-serif] font-normal leading-[normal] left-[24px] text-[10px] text-black top-[28px]"
        style={{ fontVariationSettings: "'wdth' 100" }}
      >
        Settings
      </p>
      <div
        onClick={() => {
          if (typeof setShowMore === "function") {
            setShowMore(true);
          }
        }}
      >
        <MoreDots />
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <div className="absolute h-[25.425px] left-[189px] top-[22px] w-[24.501px]">
      <div className="absolute inset-[0_-1.18%_0_-2.87%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25.4921 25.4245">
          <g id="Group 150">
            <circle cx="20.3495" cy="4.85377" r="3.35377" stroke="var(--stroke-0, black)" strokeWidth="3" />
            <circle cx="5.55708" cy="20.5708" r="3.35377" stroke="var(--stroke-0, black)" strokeWidth="3" />
            <path d={svgPaths.pda10400} stroke="var(--stroke-0, black)" strokeWidth="3" />
          </g>
        </svg>
      </div>
    </div>
  );
}

export default function MobileBottomNav({
  setShowSearchBar,
  setShowResult,
  setShowStats,
  setShowMore,
}: {
  setShowSearchBar: (show: boolean) => void;
  setShowResult: (show: boolean) => void;
  setShowStats: (show: boolean) => void;
  setShowMore: (show: boolean) => void;
}) {
  const parsedData = useMobileStore((state) => state.parsedData);
  const uploadedFile = useMobileStore((state) => state.uploadedFile);
  
  const { runOptimization, status, isStarting } = useMobileOptimization();

  const isProcessing = isStarting || status === "processing";
  const isOptimized = status === "completed";

  // 🚨 THE ZOMBIE MODAL FIX: Track if we've auto-opened it already
  const hasAutoOpened = useRef(false);

  useEffect(() => {
    // Reset the tracker when a new job starts
    if (status === "processing" || isStarting) {
      hasAutoOpened.current = false;
    }
    
    // Only automatically open it if it's completed AND we haven't popped it open yet for this job
    if (status === "completed" && !hasAutoOpened.current) {
      setShowResult(true);
      hasAutoOpened.current = true; // Mark as opened!
    }
  }, [status, isStarting, setShowResult]);

  return (
    <div className="fixed bg-white border-[rgba(255,255,255,0.1)] border-solid border-t h-[90px] sm:h-[102px] md:h-[108px] md:landscape:h-[96px] left-0 right-0 bottom-0 rounded-tl-[20px] rounded-tr-[20px] shadow-[0px_-4px_13px_0px_rgba(0,0,0,0.25)] w-full z-50">
      {/* Responsive container for items */}
      <div className="relative w-full h-full flex items-center px-2 sm:px-4 md:px-6 md:landscape:px-8">
        {/* Left section - Search & Stats */}
        <div className="flex flex-1 min-w-0 items-center justify-evenly">
          <div className="flex flex-1 max-w-[110px] flex-col items-center justify-center cursor-pointer" onClick={() => setShowSearchBar(true)}>
            <div className="w-6 h-6 md:w-7 md:h-7 mb-1">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 25.7003 25.7138">
                <path d={svgPaths.p196a5800} stroke="black" strokeWidth="2" />
              </svg>
            </div>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-black font-normal">Search</p>
          </div>
          
          <div className="flex flex-1 max-w-[110px] flex-col items-center justify-center cursor-pointer" onClick={() => setShowStats(true)}>
            <div className="w-7 h-7 md:w-8 md:h-8 mb-1 flex items-center justify-center">
              <svg className="w-6 h-6 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="8" width="4" height="13" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                <rect x="10" y="3" width="4" height="18" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                <rect x="17" y="13" width="4" height="8" stroke="black" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-black font-normal">Stats</p>
          </div>
        </div>

        {/* Center button - Optimize */}
        <div className="flex-none mx-1 sm:mx-2 md:mx-3">
          <div
            className="w-[60px] h-[60px] sm:w-[65px] sm:h-[65px] md:w-[72px] md:h-[72px] md:landscape:w-[66px] md:landscape:h-[66px] rounded-full cursor-pointer transition-transform active:scale-95 flex items-center justify-center relative"
            onClick={() => {
              if (parsedData && uploadedFile) {
                runOptimization();
              } else {
                console.warn("Missing data or file in Zustand store.");
                alert("Please upload your Excel dataset first.");
              }
            }}
          >
            <svg className="absolute inset-0 w-full h-full" fill="none" viewBox="0 0 73 73">
              <g>
                <circle cx="36.5" cy="36.5" fill="white" r="32.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"/>
                <circle
                  cx="36.5"
                  cy="36.5"
                  fill={isOptimized ? "#22c55e" : isProcessing ? "#eab308" : "#D4D4D4"}
                  r="27.5"
                  style={{ transition: "fill 0.3s ease" }}
                />
              </g>
            </svg>
            <div className="relative w-6 h-6 md:w-7 md:h-7 z-10">
              <Image src="/optimized.svg" alt="Optimization" fill className="object-contain" />
            </div>
          </div>
        </div>

        {/* Right section - Results & Settings */}
        <div className="flex flex-1 min-w-0 items-center justify-evenly">
          <div className="flex flex-1 max-w-[110px] flex-col items-center justify-center cursor-pointer" onClick={() => setShowResult(true)}>
            <div className="w-7 h-7 md:w-8 md:h-8 mb-1 flex items-center justify-center">
              <svg className="w-6 h-6 md:w-7 md:h-7" viewBox="0 0 24 24" fill="none">
                <path d="M2 20h20M4 17v-4M8 17V9M12 17V5M16 17v-8M20 17v-6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-black font-normal">Results</p>
          </div>
          
          <div className="flex flex-1 max-w-[110px] flex-col items-center justify-center cursor-pointer" onClick={() => setShowMore(true)}>
            <div className="w-6 h-6 md:w-7 md:h-7 mb-1">
              <svg className="block size-full" fill="none" viewBox="0 0 22 21">
                <path
                  d="M19.3465 7.35066L18.9803 7.14693C18.9234 7.1153 18.8954 7.09942 18.8679 7.08297C18.5949 6.91939 18.3647 6.69337 18.1967 6.42296C18.1798 6.39575 18.1639 6.36722 18.1313 6.31083C18.0988 6.25451 18.0823 6.22597 18.0672 6.19772C17.9165 5.9164 17.835 5.60289 17.8301 5.2838C17.8296 5.25172 17.8297 5.21894 17.8308 5.15378L17.838 4.72852C17.8494 4.04799 17.8552 3.70667 17.7595 3.40035C17.6746 3.12827 17.5325 2.87766 17.3427 2.66499C17.1282 2.42458 16.8313 2.25308 16.2368 1.9105L15.7429 1.62594C15.1501 1.28431 14.8536 1.11344 14.5388 1.0483C14.2604 0.990672 13.973 0.993343 13.6956 1.05563C13.3825 1.12592 13.0897 1.30125 12.5044 1.65169L12.5011 1.65328L12.1472 1.86514C12.0913 1.89864 12.063 1.91553 12.0349 1.93112C11.7567 2.08584 11.446 2.17139 11.1278 2.1816C11.0957 2.18263 11.0631 2.18263 10.9978 2.18263C10.933 2.18263 10.899 2.18263 10.867 2.1816C10.548 2.17134 10.2367 2.08533 9.95803 1.92997C9.92995 1.91431 9.90216 1.89729 9.8461 1.86364L9.49002 1.64986C8.90075 1.2961 8.60567 1.11895 8.2908 1.0483C8.01223 0.9858 7.7239 0.98407 7.44443 1.04244C7.12888 1.10835 6.83229 1.28049 6.23911 1.62477L6.23647 1.62594L5.74881 1.90897L5.74341 1.91227C5.15557 2.25345 4.86093 2.42445 4.64822 2.66387C4.45946 2.87633 4.31837 3.12655 4.23392 3.39791C4.13847 3.70465 4.14355 4.0467 4.15506 4.73043L4.1622 5.15509C4.16328 5.2194 4.16516 5.25135 4.16469 5.28298C4.15996 5.60272 4.07738 5.91687 3.92627 6.19869C3.91132 6.22656 3.89522 6.25444 3.86306 6.31011C3.83088 6.36582 3.8153 6.39352 3.79861 6.42041C3.62989 6.69226 3.39866 6.9196 3.12386 7.08346C3.09667 7.09967 3.06803 7.11525 3.01174 7.14645L2.65017 7.34681C2.04861 7.68018 1.74789 7.84701 1.52908 8.08443C1.33551 8.29446 1.18928 8.54358 1.10001 8.8149C0.999113 9.1216 0.999197 9.46552 1.00076 10.1533L1.00204 10.7154C1.00359 11.3986 1.00572 11.7399 1.10684 12.0446C1.19631 12.3141 1.34147 12.5617 1.53396 12.7705C1.75154 13.0064 2.04926 13.1722 2.64627 13.5044L3.00461 13.7037C3.06559 13.7376 3.09628 13.7544 3.12569 13.7721C3.398 13.9361 3.62742 14.1628 3.7947 14.4331C3.81278 14.4623 3.83013 14.4926 3.86482 14.5532C3.89908 14.613 3.91661 14.643 3.93246 14.673C4.07913 14.9507 4.15766 15.2592 4.16302 15.5732C4.16359 15.6071 4.1631 15.6414 4.16194 15.7104L4.15506 16.1179C4.14347 16.804 4.13843 17.1474 4.23445 17.455C4.31939 17.7271 4.46137 17.9777 4.65115 18.1904C4.86568 18.4308 5.16307 18.6022 5.7576 18.9448L6.2513 19.2293C6.84415 19.5709 7.14047 19.7416 7.45521 19.8067C7.73366 19.8644 8.02117 19.8621 8.29861 19.7998C8.61219 19.7294 8.906 19.5535 9.49295 19.2021L9.84677 18.9902C9.90275 18.9567 9.93109 18.9399 9.95914 18.9243C10.2374 18.7696 10.5478 18.6836 10.866 18.6734C10.8981 18.6723 10.9307 18.6723 10.9959 18.6723C11.0613 18.6723 11.0939 18.6723 11.126 18.6734C11.445 18.6836 11.7572 18.7699 12.0359 18.9253C12.0604 18.9389 12.085 18.9537 12.1282 18.9796L12.5043 19.2054C13.0937 19.5592 13.3881 19.7359 13.703 19.8065C13.9816 19.869 14.2701 19.8716 14.5496 19.8132C14.865 19.7473 15.1622 19.5748 15.7551 19.2307L16.2501 18.9434C16.8383 18.6021 17.1333 18.4309 17.346 18.1914C17.5348 17.9789 17.6761 17.7288 17.7605 17.4574C17.8553 17.1529 17.8496 16.8135 17.8382 16.1396L17.8308 15.7002C17.8298 15.6358 17.8296 15.6039 17.8301 15.5722C17.8348 15.2525 17.9161 14.9381 18.0672 14.6563C18.0821 14.6285 18.0983 14.6004 18.1304 14.5449C18.1625 14.4892 18.1792 14.4614 18.1959 14.4345C18.3646 14.1627 18.5961 13.9351 18.8709 13.7713C18.8977 13.7553 18.9254 13.74 18.9803 13.7095L18.9822 13.7086L19.3438 13.5083C19.9453 13.1749 20.2466 13.0079 20.4654 12.7705C20.659 12.5604 20.8051 12.3117 20.8943 12.0403C20.9946 11.7354 20.9938 11.3935 20.9923 10.7138L20.991 10.1396C20.9894 9.45644 20.9886 9.11513 20.8875 8.81051C20.798 8.54101 20.652 8.29334 20.4595 8.08458C20.2422 7.84884 19.944 7.68299 19.3482 7.35151L19.3465 7.35066Z"
                  stroke="black"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <path
                  d="M6.99685 10.4277C6.99685 12.6368 8.78771 14.4277 10.9969 14.4277C13.206 14.4277 14.9969 12.6368 14.9969 10.4277C14.9969 8.21856 13.206 6.4277 10.9969 6.4277C8.78771 6.4277 6.99685 8.21856 6.99685 10.4277Z"
                  stroke="black"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-black font-normal">Settings</p>
          </div>
        </div>
      </div>
    </div>
  );
}