import { immer } from 'zustand/middleware/immer';
import { createStore } from 'zustand/vanilla';

type ConversionState = {
  file: File;
  isConverting: boolean;
  selectedFormat: string;
  selectedQuality: 'fast' | 'low' | 'medium' | 'high';
  convertedUrl: string | null;
  conversionFailed: boolean;
  retryCount: number;
  fileType: string;
  progress: number;
  estimatedTimeRemaining?: number;
  startTime?: number;
};

type ConversionStates = {
  [key: string]: ConversionState;
};

export type ConversionStore = {
  conversionStates: ConversionStates;
  globalProgress: number;
  activeConversions: number;
  setConverting: (fileName: string) => void;
  setConverted: (fileName: string, url: string | null) => void;
  setFormat: (fileName: string, format: string) => void;
  setQuality: (
    fileName: string,
    quality: 'fast' | 'low' | 'medium' | 'high'
  ) => void;
  setProgress: (fileName: string, progress: number) => void;
  deleteFile: (fileName: string) => void;
  setConversionFailed: (fileName: string) => void;
  incrementRetryCount: (fileName: string) => void;
  initializeFile: (file: File, selectedFormat: string) => void;
  resetConversionState: (fileName: string) => void;
  updateGlobalProgress: () => void;
  reset: () => void;
};

export const createConversionStore = (initState = {}) => {
  return createStore(
    immer<ConversionStore>((set, get) => ({
      conversionStates: {},
      globalProgress: 0,
      activeConversions: 0,
      setConverting: (fileName) =>
        set((state) => {
          if (state.conversionStates[fileName]) {
            const wasConverting = state.conversionStates[fileName].isConverting;
            state.conversionStates[fileName].isConverting = true;
            state.conversionStates[fileName].conversionFailed = false;
            state.conversionStates[fileName].progress = 0;
            state.conversionStates[fileName].startTime = Date.now();

            if (!wasConverting) {
              state.activeConversions += 1;
            }
          }
        }),
      resetConversionState: (fileName) =>
        set((state) => {
          if (state.conversionStates[fileName]) {
            const wasConverting = state.conversionStates[fileName].isConverting;
            state.conversionStates[fileName].isConverting = false;
            state.conversionStates[fileName].convertedUrl = null;
            state.conversionStates[fileName].conversionFailed = false;
            state.conversionStates[fileName].retryCount = 0;
            state.conversionStates[fileName].progress = 0;
            state.conversionStates[fileName].estimatedTimeRemaining = undefined;
            state.conversionStates[fileName].startTime = undefined;

            if (wasConverting) {
              state.activeConversions = Math.max(
                0,
                state.activeConversions - 1
              );
            }
          }
        }),
      setConverted: (fileName, url) =>
        set((state) => {
          if (state.conversionStates[fileName]) {
            const wasConverting = state.conversionStates[fileName].isConverting;
            state.conversionStates[fileName].isConverting = false;
            state.conversionStates[fileName].convertedUrl = url;
            state.conversionStates[fileName].conversionFailed = url === null;
            state.conversionStates[fileName].retryCount = 0;
            state.conversionStates[fileName].progress = url ? 100 : 0;
            state.conversionStates[fileName].estimatedTimeRemaining = undefined;

            if (wasConverting) {
              state.activeConversions = Math.max(
                0,
                state.activeConversions - 1
              );
            }
          }
        }),
      setFormat: (fileName, format) =>
        set((state) => {
          if (state.conversionStates[fileName]) {
            state.conversionStates[fileName].selectedFormat = format;
            state.conversionStates[fileName].convertedUrl = null;
            state.conversionStates[fileName].progress = 0;
          }
        }),
      setQuality: (fileName, quality) =>
        set((state) => {
          if (state.conversionStates[fileName]) {
            state.conversionStates[fileName].selectedQuality = quality;
            state.conversionStates[fileName].convertedUrl = null;
            state.conversionStates[fileName].progress = 0;
          }
        }),
      setProgress: (fileName, progress) =>
        set((state) => {
          if (state.conversionStates[fileName]) {
            state.conversionStates[fileName].progress = Math.min(
              100,
              Math.max(0, progress)
            );

            // Calculate estimated time remaining
            const fileState = state.conversionStates[fileName];
            if (fileState.startTime && progress > 0) {
              const elapsed = Date.now() - fileState.startTime;
              const estimatedTotal = (elapsed / progress) * 100;
              const remaining = Math.max(0, estimatedTotal - elapsed);
              fileState.estimatedTimeRemaining = remaining;
            }
          }
        }),
      deleteFile: (fileName) =>
        set((state) => {
          const wasConverting = state.conversionStates[fileName]?.isConverting;
          if (wasConverting) {
            state.activeConversions = Math.max(0, state.activeConversions - 1);
          }
          delete state.conversionStates[fileName];
        }),
      setConversionFailed: (fileName: string) =>
        set((state) => {
          if (state.conversionStates[fileName]) {
            const wasConverting = state.conversionStates[fileName].isConverting;
            state.conversionStates[fileName].isConverting = false;
            state.conversionStates[fileName].conversionFailed = true;
            state.conversionStates[fileName].progress = 0;
            state.conversionStates[fileName].estimatedTimeRemaining = undefined;

            if (wasConverting) {
              state.activeConversions = Math.max(
                0,
                state.activeConversions - 1
              );
            }
          }
        }),
      incrementRetryCount: (fileName) =>
        set((state) => {
          if (state.conversionStates[fileName]) {
            state.conversionStates[fileName].retryCount += 1;
          }
        }),
      initializeFile: (file: File, selectedFormat: string) =>
        set((state) => {
          if (!state.conversionStates[file.name]) {
            state.conversionStates[file.name] = {
              file,
              isConverting: false,
              selectedFormat,
              selectedQuality: 'medium',
              convertedUrl: null,
              conversionFailed: false,
              retryCount: 0,
              fileType: file.type,
              progress: 0,
            };
          }
        }),
      updateGlobalProgress: () =>
        set((state) => {
          const states = Object.values(state.conversionStates);
          if (states.length === 0) {
            state.globalProgress = 0;
            return;
          }

          const totalProgress = states.reduce((sum, fileState) => {
            if (fileState.convertedUrl) return sum + 100;
            if (fileState.conversionFailed) return sum + 0;
            return sum + fileState.progress;
          }, 0);

          state.globalProgress = totalProgress / states.length;
        }),
      reset: () =>
        set({
          conversionStates: {},
          globalProgress: 0,
          activeConversions: 0,
        }),
    }))
  );
};
