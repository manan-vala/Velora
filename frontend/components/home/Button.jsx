'use client';

import React from 'react';

/**
 * Reusable Button component with primary and secondary variants
 * Primary: Black background with white text
 * Secondary: White background with black border and text
 */
export default function Button({
  variant = 'primary',
  children,
  onClick,
  className = '',
  ...props
}) {
  const baseClasses = "font-sans px-4 sm:px-6 py-2 sm:py-3 rounded-[10px] text-sm sm:text-base font-normal leading-6 border-none cursor-pointer transition-all duration-300 ease-in-out text-center w-full sm:w-auto";
  const variantClasses = variant === 'primary'
    ? "bg-black text-white hover:bg-[#1a1a1a] active:bg-[#0d0d0d]"
    : "bg-white text-[#0a0a0a] border-2 border-black hover:bg-black hover:text-white active:bg-[#1a1a1a]";

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
