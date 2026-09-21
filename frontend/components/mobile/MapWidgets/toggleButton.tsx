
import React from 'react';

interface ToggleButtonProps {
  activeView: 'map' | 'dataset';
  onToggle: (view: 'map' | 'dataset') => void;
}

export function MobileToggleButton({ activeView, onToggle }: ToggleButtonProps) {
  return (
    <div
      className="bg-white rounded-xl p-1 shadow-md border border-slate-100 flex"
      style={{ minWidth: 'calc(3px + 8rem)' }}
    >
      <button
        type="button"
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium shadow-sm ${activeView === 'map' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
        onClick={() => onToggle('map')}
      >
        Map View
      </button>
      <button
        type="button"
        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${activeView === 'dataset' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
        onClick={() => onToggle('dataset')}
      >
        Dataset
      </button>
    </div>
  );
}
