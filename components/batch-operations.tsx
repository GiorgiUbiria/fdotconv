'use client';

import { useConversionStore } from '@/providers/conversion-store-provider';
import { qualityOptions } from '@/lib/utils';
import { QualitySelector } from './quality-selector';
import { 
  RefreshCwIcon, 
  DownloadIcon, 
  TrashIcon, 
  SettingsIcon,
  PlayIcon,
  PauseIcon 
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface BatchOperationsProps {
  files: File[];
  onConvertAll: () => void;
  onDownloadAll: () => void;
  onDeleteAll: () => void;
  isConvertingAll: boolean;
}

export function BatchOperations({ 
  files, 
  onConvertAll, 
  onDownloadAll, 
  onDeleteAll, 
  isConvertingAll 
}: BatchOperationsProps) {
  const { conversionStates, setQuality } = useConversionStore((state) => state);
  const [showBatchSettings, setShowBatchSettings] = useState(false);
  const [globalQuality, setGlobalQuality] = useState<'fast' | 'low' | 'medium' | 'high'>('medium');

  const allConversionsComplete = files.length > 0 && 
    files.every((file) => conversionStates[file.name]?.convertedUrl);
  
  const someConversionsFailed = files.length > 0 && 
    files.some((file) => conversionStates[file.name]?.conversionFailed);

  const activeConversions = files.filter(file => 
    conversionStates[file.name]?.isConverting
  ).length;

  const handleApplyGlobalQuality = () => {
    files.forEach(file => {
      if (!conversionStates[file.name]?.isConverting) {
        setQuality(file.name, globalQuality);
      }
    });
    toast.success(`Applied ${globalQuality} quality to all files`);
    setShowBatchSettings(false);
  };

  if (files.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      {/* Batch Settings Panel */}
      {showBatchSettings && (
        <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 p-4">
          <h3 className="mb-3 text-lg font-semibold text-primary">Batch Settings</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Apply Quality to All Files
              </label>
              <QualitySelector
                value={globalQuality}
                onChange={setGlobalQuality}
                disabled={false}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApplyGlobalQuality}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
              >
                Apply to All
              </button>
              <button
                onClick={() => setShowBatchSettings(false)}
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Operations Buttons */}
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-3">
          <button
            className="flex items-center rounded-lg bg-secondary px-4 py-2 font-bold text-secondary-foreground transition-colors duration-300 hover:bg-secondary/80"
            onClick={onConvertAll}
            disabled={isConvertingAll}
          >
            {isConvertingAll ? (
              <>
                <PauseIcon className="mr-2 h-5 w-5" />
                Converting... ({activeConversions})
              </>
            ) : (
              <>
                <PlayIcon className="mr-2 h-5 w-5" />
                Convert All ({files.length})
              </>
            )}
          </button>

          <button
            className="flex items-center rounded-lg bg-muted px-4 py-2 font-bold text-muted-foreground transition-colors duration-300 hover:bg-muted/80"
            onClick={() => setShowBatchSettings(!showBatchSettings)}
          >
            <SettingsIcon className="mr-2 h-5 w-5" />
            Batch Settings
          </button>
        </div>

        <div className="flex gap-3">
          {allConversionsComplete && (
            <button
              className="flex items-center rounded-lg bg-green-500 px-4 py-2 font-bold text-white transition-colors duration-300 hover:bg-green-600"
              onClick={onDownloadAll}
            >
              <DownloadIcon className="mr-2 h-5 w-5" />
              Download All
            </button>
          )}

          {someConversionsFailed && !isConvertingAll && (
            <button
              className="flex items-center rounded-lg bg-yellow-500 px-4 py-2 font-bold text-white transition-colors duration-300 hover:bg-yellow-600"
              onClick={onConvertAll}
            >
              <RefreshCwIcon className="mr-2 h-5 w-5" />
              Retry Failed
            </button>
          )}

          <button
            className="flex items-center rounded-lg bg-destructive px-4 py-2 font-bold text-white transition-colors duration-300 hover:bg-destructive/80"
            onClick={onDeleteAll}
          >
            <TrashIcon className="mr-2 h-5 w-5" />
            Delete All
          </button>
        </div>
      </div>
    </div>
  );
} 