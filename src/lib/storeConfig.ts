import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { STORE } from './theme';
import type { StoreConfig } from './types';

export const DEFAULT_STORE_CONFIG: StoreConfig = STORE;

export const STORE_CONFIG_REF = () => doc(db, 'storeConfig', 'settings');

export function subscribeStoreConfig(
  onData: (config: StoreConfig) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    STORE_CONFIG_REF(),
    (snap) => {
      const data = snap.exists() ? (snap.data() as Partial<StoreConfig>) : {};
      onData({ ...DEFAULT_STORE_CONFIG, ...data });
    },
    (error) => onError?.(error)
  );
}

export async function saveStoreConfig(patch: Partial<StoreConfig>) {
  await setDoc(STORE_CONFIG_REF(), patch, { merge: true });
}
