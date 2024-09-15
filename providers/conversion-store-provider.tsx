'use client';

import { createContext, useContext, useRef } from 'react';
import {
  createConversionStore,
  type ConversionStore,
} from '@/lib/conversionStore';
import { StoreApi, useStore } from 'zustand';

const ConversionStoreContext = createContext<StoreApi<ConversionStore> | null>(
  null
);

export const ConversionStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const storeRef = useRef<StoreApi<ConversionStore>>();

  if (!storeRef.current) {
    storeRef.current = createConversionStore();
  }

  return (
    <ConversionStoreContext.Provider value={storeRef.current}>
      {children}
    </ConversionStoreContext.Provider>
  );
};

export const useConversionStore = <T,>(
  selector: (store: ConversionStore) => T
): T => {
  const store = useContext(ConversionStoreContext);
  if (!store) throw new Error('Missing ConversionStoreProvider in the tree');

  return useStore(store, selector);
};
