import { NativeModules, TurboModuleRegistry } from "react-native";

type StorageValue = string | null;

export type StorageAdapter = {
  getItem: (key: string) => Promise<StorageValue>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  getAllKeys: () => Promise<string[]>;
  multiGet: (keys: string[]) => Promise<Array<[string, StorageValue]>>;
};

type StorageModule = {
  default?: Partial<StorageAdapter> | null;
};

function isStorageAdapter(value: Partial<StorageAdapter> | null | undefined): value is StorageAdapter {
  return Boolean(
    value &&
      typeof value.getItem === "function" &&
      typeof value.setItem === "function" &&
      typeof value.removeItem === "function" &&
      typeof value.clear === "function" &&
      typeof value.getAllKeys === "function" &&
      typeof value.multiGet === "function"
  );
}

function createMemoryStorage(): StorageAdapter {
  const store = new Map<string, string>();

  return {
    getItem: async (key) => store.get(key) ?? null,
    setItem: async (key, value) => {
      store.set(key, value);
    },
    removeItem: async (key) => {
      store.delete(key);
    },
    clear: async () => {
      store.clear();
    },
    getAllKeys: async () => Array.from(store.keys()),
    multiGet: async (keys) => keys.map((key) => [key, store.get(key) ?? null]),
  };
}

const fallbackStorage = createMemoryStorage();
let hasWarnedAboutFallback = false;

function warnFallback(reason: string) {
  if (hasWarnedAboutFallback) return;
  hasWarnedAboutFallback = true;
  console.warn(`AsyncStorage unavailable, falling back to in-memory storage. ${reason}`);
}

function hasNativeAsyncStorageModule() {
  const moduleNames = [
    "PlatformLocalStorage",
    "RNC_AsyncSQLiteDBStorage",
    "RNCAsyncStorage",
    "AsyncSQLiteDBStorage",
    "AsyncLocalStorage",
  ];

  return moduleNames.some((name) => {
    const turboModule = typeof TurboModuleRegistry?.get === "function" ? TurboModuleRegistry.get(name) : null;
    if (turboModule) return true;
    return Boolean(NativeModules?.[name]);
  });
}

export function resolveAppStorage(
  loadModule: () => StorageModule = () => require("@react-native-async-storage/async-storage") as StorageModule,
  hasNativeModule: () => boolean = hasNativeAsyncStorageModule
): StorageAdapter {
  try {
    const module = loadModule();
    if (isStorageAdapter(module?.default)) {
      return module.default;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown storage initialization error";
    warnFallback(message);
    return fallbackStorage;
  }

  if (!hasNativeModule()) {
    warnFallback("native AsyncStorage module was not detected");
    return fallbackStorage;
  }

  return fallbackStorage;
}

export const appStorage = resolveAppStorage();
