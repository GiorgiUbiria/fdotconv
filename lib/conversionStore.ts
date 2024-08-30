import { create } from 'zustand';

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
  initializeFile: (fileName: string, fileType: string, selectedFormat: string) => void;
  reset: () => void;
};

export const useConversionStore = create<ConversionStore>((set) => ({
  conversionStates: {},
  setConverting: (fileName) =>
    set((state) => ({
      conversionStates: {
        ...state.conversionStates,
        [fileName]: {
          ...state.conversionStates[fileName],
          isConverting: true,
          conversionFailed: false,
        },
      },
    })),
  setConverted: (fileName, url) =>
    set((state) => ({
      conversionStates: {
        ...state.conversionStates,
        [fileName]: {
          ...state.conversionStates[fileName],
          isConverting: false,
          convertedUrl: url,
          conversionFailed: url === null,
          retryCount: 0,
        },
      },
    })),
  setFormat: (fileName, format) =>
    set((state) => ({
      conversionStates: {
        ...state.conversionStates,
        [fileName]: {
          ...state.conversionStates[fileName],
          selectedFormat: format,
          convertedUrl: null,
        },
      },
    })),
  deleteFile: (fileName) =>
    set((state) => {
      const newState = { ...state.conversionStates };
      delete newState[fileName];
      return { conversionStates: newState };
    }),
  setConversionFailed: (fileName) =>
    set((state) => ({
      conversionStates: {
        ...state.conversionStates,
        [fileName]: {
          ...state.conversionStates[fileName],
          isConverting: false,
          conversionFailed: true,
        },
      },
    })),
  incrementRetryCount: (fileName) =>
    set((state) => ({
      conversionStates: {
        ...state.conversionStates,
        [fileName]: {
          ...state.conversionStates[fileName],
          retryCount: (state.conversionStates[fileName]?.retryCount || 0) + 1,
        },
      },
    })),
  initializeFile: (fileName, fileType, selectedFormat) =>
    set((state) => ({
      conversionStates: {
        ...state.conversionStates,
        [fileName]: {
          isConverting: false,
          selectedFormat,
          convertedUrl: null,
          conversionFailed: false,
          retryCount: 0,
          fileType,
        },
      },
    })),
  reset: () => set({ conversionStates: {} }),
}));