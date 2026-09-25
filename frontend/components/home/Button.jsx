'use client';

import React from 'react';

/**
 * Reusable Button component with primary and secondary variants
 * Primary: Black background with white text
 * Secondary: White background with black text
 */
export default function Button({
  variant = 'primary',
  children,
  onClick,
  className = '',
  ...props
}) {
  const baseClasses = "inline-flex items-center justify-center h-10 px-5 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-200 w-full sm:w-auto";
  const variantClasses = variant === 'primary'
    ? "bg-black text-white hover:bg-[#1a1a1a] active:bg-[#0d0d0d]"
    : "bg-white text-[#0a0a0a] hover:bg-black hover:text-white active:bg-[#1a1a1a]";

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
