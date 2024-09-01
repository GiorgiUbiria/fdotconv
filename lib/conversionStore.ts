import { immer } from "zustand/middleware/immer";
import { createStore } from "zustand/vanilla";
import { persist, createJSONStorage } from "zustand/middleware";

type ConversionState = {
  file: File;
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

export type ConversionStore = {
  conversionStates: ConversionStates;
  setConverting: (fileName: string) => void;
  setConverted: (fileName: string, url: string | null) => void;
  setFormat: (fileName: string, format: string) => void;
  deleteFile: (fileName: string) => void;
  setConversionFailed: (fileName: string) => void;
  incrementRetryCount: (fileName: string) => void;
  initializeFile: (
    file: File,
    selectedFormat: string
  ) => void;
  resetConversionState: (fileName: string) => void;
  reset: () => void;
};

export const createConversionStore = (initState = {}) => {
  return createStore(
    persist(
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
        initializeFile: (file: File, selectedFormat: string) =>
          set((state) => {
            if (!state.conversionStates[file.name]) {
              state.conversionStates[file.name] = {
                file,
                isConverting: false,
                selectedFormat,
                convertedUrl: null,
                conversionFailed: false,
                retryCount: 0,
                fileType: file.type,
              };
            }
          }),
        reset: () => set({ conversionStates: {} }),
      })),
      {
        name: 'conversion-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          conversionStates: Object.fromEntries(
            Object.entries(state.conversionStates).map(([key, value]) => [
              key,
              {
                ...value,
                file: value.file ? {
                  name: value.file.name,
                  type: value.file.type,
                  size: value.file.size,
                } : null,
              },
            ])
          ),
        }),
      }
    )
  );
};
