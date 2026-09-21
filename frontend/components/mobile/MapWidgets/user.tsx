import React from "react";

type UserCardProps = {
  setShowUserCard: (show: boolean) => void;
  onHelpFeedbackClick?: () => void;
};
export default function UserCard(props: UserCardProps) {
  return (
    <div className="relative w-[200px] sm:w-[220px] md:w-[240px] bg-white rounded-[12px] shadow-[0px_1px_4px_2px_rgba(0,0,0,0.18)] p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="rounded-[14px] w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-gradient-to-br from-blue-400 to-blue-600" />
            <div className="absolute right-0 bottom-0">
              <svg
                className="w-2 h-2 sm:w-2.5 sm:h-2.5"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 12 12"
              >
                <circle
                  cx="6"
                  cy="6"
                  fill="#5CA4F8"
                  r="5"
                  stroke="black"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
          <div className="flex flex-col">
            <p className="font-medium text-xs sm:text-sm md:text-base text-black leading-tight">
              User_1234
            </p>
            <p className="font-normal text-[9px] sm:text-[10px] md:text-[11px] text-[#333] opacity-50 leading-tight mt-0.5">
              @user-fb8pr4rj12
            </p>
          </div>
        </div>
        <button
          className="rounded-[12px] w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center cursor-pointer hover:bg-gray-100"
          onClick={() => props.setShowUserCard(false)}
          aria-label="Close user card"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 17.75 17.75"
          >
            <path
              d="M6.625 16.75H1V11.125M11.125 1H16.75V6.625"
              stroke="black"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:gap-2.5 mb-3 sm:mb-4">
        <button
          className="flex items-center gap-2.5 sm:gap-3 bg-white border border-[#d6d6d6] rounded-[12px] px-2.5 sm:px-3 py-2 sm:py-2.5 hover:bg-gray-50 transition-colors w-full"
          onClick={props.onHelpFeedbackClick}
          type="button"
        >
          <div className="w-4 h-4 sm:w-[18px] sm:h-[18px] md:w-5 md:h-5 flex items-center justify-center text-blue-900">
            <svg
              className="w-full h-full"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M7.15 7.07c.17-.53.48-1 .9-1.35.42-.36.93-.6 1.48-.68.55-.08 1.11 0 1.6.22.49.22.9.56 1.19.98.29.41.44.9.42 1.4-.02.5-.2.99-.52 1.38-.32.39-.77.66-1.28.78-.51.12-.92.49-.92 1v.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
              <path
                d="M10 15h.01"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <span className="font-medium text-[9px] sm:text-[10px] md:text-[11px] text-[#696969]">
            Help & Feedback
          </span>
        </button>

        <button className="flex items-center gap-2.5 sm:gap-3 bg-white border border-[#d6d6d6] rounded-[12px] px-2.5 sm:px-3 py-2 sm:py-2.5 hover:bg-gray-50 transition-colors w-full">
          <div className="w-4 h-4 sm:w-[18px] sm:h-[18px] md:w-5 md:h-5 flex items-center justify-center">
            <svg
              className="w-full h-full"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <span className="font-medium text-[9px] sm:text-[10px] md:text-[11px] text-[#696969]">
            Sign Out
          </span>
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-3 border-t border-gray-200">
        <button className="font-medium text-[10px] sm:text-[11px] md:text-xs text-[#303030] hover:underline">
          Privacy Policy
        </button>
        <button className="font-medium text-[10px] sm:text-[11px] md:text-xs text-[#303030] hover:underline">
          Terms of Service
        </button>
      </div>
    </div>
  );
}
