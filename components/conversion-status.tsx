'use client';

import { useConversionStore } from '@/providers/conversion-store-provider';
import { Progress } from '@/components/ui/progress';
import { CloverIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { useEffect } from 'react';

export function ConversionStatus() {
  const { 
    conversionStates, 
    globalProgress, 
    activeConversions,
    updateGlobalProgress 
  } = useConversionStore((state) => state);

  const files = Object.values(conversionStates);
  const totalFiles = files.length;
  const completedFiles = files.filter(f => f.convertedUrl).length;
  const failedFiles = files.filter(f => f.conversionFailed).length;
  const convertingFiles = files.filter(f => f.isConverting).length;

  // Update global progress when states change
  useEffect(() => {
    updateGlobalProgress();
  }, [conversionStates, updateGlobalProgress]);

  if (totalFiles === 0) return null;

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getAverageTimeRemaining = () => {
    const convertingWithTime = files.filter(f => f.isConverting && f.estimatedTimeRemaining);
    if (convertingWithTime.length === 0) return null;
    
    const avgTime = convertingWithTime.reduce((sum, f) => sum + (f.estimatedTimeRemaining || 0), 0) / convertingWithTime.length;
    return avgTime;
  };

  const avgTimeRemaining = getAverageTimeRemaining();

  return (
    <div className="mb-6 rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">
          Conversion Progress
        </h3>
        <div className="flex items-center gap-4 text-sm">
          {activeConversions > 0 && (
            <div className="flex items-center gap-1 text-yellow-600">
              <CloverIcon className="h-4 w-4 animate-spin" />
              <span>{activeConversions} converting</span>
            </div>
          )}
          {completedFiles > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircleIcon className="h-4 w-4" />
              <span>{completedFiles} completed</span>
            </div>
          )}
          {failedFiles > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <XCircleIcon className="h-4 w-4" />
              <span>{failedFiles} failed</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Overall Progress ({completedFiles}/{totalFiles} files)
          </span>
          <span className="font-medium">
            {Math.round(globalProgress)}%
          </span>
        </div>
        
        <Progress 
          value={globalProgress} 
          className="h-3"
        />
        
        {avgTimeRemaining && (
          <div className="text-center text-xs text-muted-foreground">
            Estimated time remaining: {formatTime(avgTimeRemaining)}
          </div>
        )}
      </div>

      {/* Individual file progress for active conversions */}
      {convertingFiles > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Active Conversions:</h4>
          {files
            .filter(f => f.isConverting)
            .map((fileState) => (
              <div key={fileState.file.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[200px]">
                    {fileState.file.name} → {fileState.selectedFormat.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{Math.round(fileState.progress)}%</span>
                    {fileState.estimatedTimeRemaining && (
                      <span className="text-muted-foreground">
                        {formatTime(fileState.estimatedTimeRemaining)}
                      </span>
                    )}
                  </div>
                </div>
                <Progress 
                  value={fileState.progress} 
                  className="h-1.5"
                />
              </div>
            ))}
        </div>
      )}
    </div>
  );
} 