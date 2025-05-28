'use client';

import { qualityOptions } from '@/lib/utils';
import { InfoIcon } from 'lucide-react';
import { useState } from 'react';

interface QualitySelectorProps {
  value: 'fast' | 'low' | 'medium' | 'high';
  onChange: (quality: 'fast' | 'low' | 'medium' | 'high') => void;
  disabled?: boolean;
}

export function QualitySelector({ value, onChange, disabled = false }: QualitySelectorProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  return (
    <div className="relative">
      <select
        className="w-full cursor-pointer appearance-none rounded border border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10 px-2 py-1 pr-8 text-sm transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
        value={value}
        onChange={(e) => onChange(e.target.value as 'fast' | 'low' | 'medium' | 'high')}
        disabled={disabled}
      >
        {qualityOptions.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-background"
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Info icon with tooltip */}
      <div 
        className="absolute inset-y-0 right-6 flex items-center"
        onMouseEnter={() => setShowTooltip(value)}
        onMouseLeave={() => setShowTooltip(null)}
      >
        <InfoIcon className="h-3 w-3 text-muted-foreground hover:text-primary cursor-help" />
      </div>
      
      {/* Dropdown arrow */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-primary">
        <svg
          className="h-3 w-3 fill-current"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 p-2 text-xs bg-popover border border-border rounded-md shadow-lg">
          <div className="font-medium text-popover-foreground">
            {qualityOptions.find(opt => opt.value === showTooltip)?.label}
          </div>
          <div className="text-muted-foreground mt-1">
            {qualityOptions.find(opt => opt.value === showTooltip)?.description}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border"></div>
        </div>
      )}
    </div>
  );
} 