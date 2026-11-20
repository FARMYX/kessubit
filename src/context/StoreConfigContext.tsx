import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_STORE_CONFIG, saveStoreConfig, subscribeStoreConfig } from '../lib/storeConfig';
import type { StoreConfig } from '../lib/types';

type Ctx = {
  config: StoreConfig;
  loading: boolean;
  save: (patch: Partial<StoreConfig>) => Promise<void>;
};

const StoreConfigCtx = createContext<Ctx>(null as any);
export const useStoreConfig = () => useContext(StoreConfigCtx);

export function StoreConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_STORE_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeStoreConfig(
      (next) => {
        setConfig(next);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const value = useMemo<Ctx>(
    () => ({ config, loading, save: saveStoreConfig }),
    [config, loading]
  );

  return <StoreConfigCtx.Provider value={value}>{children}</StoreConfigCtx.Provider>;
}
