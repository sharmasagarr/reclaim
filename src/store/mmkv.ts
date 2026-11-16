import { createMMKV } from 'react-native-mmkv';

export interface StorageInterface {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string | boolean | number) => void;
  getBoolean: (key: string) => boolean | undefined;
  getNumber: (key: string) => number | undefined;
  delete: (key: string) => void;
  clearAll: () => void;
}

let storageInstance: StorageInterface;

try {
  const mmkv = createMMKV({
    id: 'reclaim-storage',
  });
  storageInstance = {
    getString: (key: string) => mmkv.getString(key),
    set: (key: string, value: string | boolean | number) => mmkv.set(key, value),
    getBoolean: (key: string) => mmkv.getBoolean(key),
    getNumber: (key: string) => mmkv.getNumber(key),
    delete: (key: string) => {
      if (typeof mmkv.remove === 'function') {
        mmkv.remove(key);
      } else if (typeof (mmkv as any).delete === 'function') {
        (mmkv as any).delete(key);
      }
    },
    clearAll: () => mmkv.clearAll(),
  };
} catch {
  // In-memory fallback (e.g. during Jest testing or initialization)
  const memoryMap = new Map<string, string | boolean | number>();
  storageInstance = {
    getString: (key: string) => memoryMap.get(key) as string | undefined,
    set: (key: string, value: string | boolean | number) => {
      memoryMap.set(key, value);
    },
    getBoolean: (key: string) => memoryMap.get(key) as boolean | undefined,
    getNumber: (key: string) => memoryMap.get(key) as number | undefined,
    delete: (key: string) => {
      memoryMap.delete(key);
    },
    clearAll: () => {
      memoryMap.clear();
    },
  };
}

export const storage = storageInstance;
