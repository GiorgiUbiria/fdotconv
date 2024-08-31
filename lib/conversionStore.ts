import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type ConversionState = {
  isConverting: boolean;
  selectedFormat: string;
  convertedUrl: string | null;
  conversionFailed: boolean;
  retryCount: number;
  fileType: string;
};

type ConversionStates = {
  [key: string]: ConversionState;
};

type ConversionStore = {
  conversionStates: ConversionStates;
  setConverting: (fileName: string) => void;
  setConverted: (fileName: string, url: string | null) => void;
  setFormat: (fileName: string, format: string) => void;
  deleteFile: (fileName: string) => void;
  setConversionFailed: (fileName: string) => void;
  incrementRetryCount: (fileName: string) => void;
  initializeFile: (
    fileName: string,
    fileType: string,
    selectedFormat: string
  ) => void;
  resetConversionState: (fileName: string) => void;
  reset: () => void;
};

export const useConversionStore = create(
  immer<ConversionStore>((set) => ({
    conversionStates: {},
    setConverting: (fileName) =>
      set((state) => {
        if (state.conversionStates[fileName]) {
          state.conversionStates[fileName].isConverting = true;
          state.conversionStates[fileName].conversionFailed = false;
        }
      }),
    resetConversionState: (fileName) =>
      set((state) => {
        if (state.conversionStates[fileName]) {
          state.conversionStates[fileName].isConverting = false;
          state.conversionStates[fileName].convertedUrl = null;
          state.conversionStates[fileName].conversionFailed = false;
          state.conversionStates[fileName].retryCount = 0;
        }
      }),
    setConverted: (fileName, url) =>
      set((state) => {
        if (state.conversionStates[fileName]) {
          state.conversionStates[fileName].isConverting = false;
          state.conversionStates[fileName].convertedUrl = url;
          state.conversionStates[fileName].conversionFailed = url === null;
          state.conversionStates[fileName].retryCount = 0;
        }
      }),
    setFormat: (fileName, format) =>
      set((state) => {
        if (state.conversionStates[fileName]) {
          state.conversionStates[fileName].selectedFormat = format;
          state.conversionStates[fileName].convertedUrl = null;
        }
      }),
    deleteFile: (fileName) =>
      set((state) => {
        delete state.conversionStates[fileName];
      }),
    setConversionFailed: (fileName: string) =>
      set((state) => {
        if (state.conversionStates[fileName]) {
          state.conversionStates[fileName].isConverting = false;
          state.conversionStates[fileName].conversionFailed = true;
        }
      }),
    incrementRetryCount: (fileName) =>
      set((state) => {
        if (state.conversionStates[fileName]) {
          state.conversionStates[fileName].retryCount += 1;
        }
      }),
    initializeFile: (fileName, fileType, selectedFormat) =>
      set((state) => {
        if (!state.conversionStates[fileName]) {
          state.conversionStates[fileName] = {
            isConverting: false,
            selectedFormat,
            convertedUrl: null,
            conversionFailed: false,
            retryCount: 0,
            fileType,
          };
        }
      }),
    reset: () => set({ conversionStates: {} }),
  }))
);
