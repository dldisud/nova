import { resolveAppStorage } from "../appStorage";

describe("resolveAppStorage", () => {
  it("uses the native storage module when a compatible adapter is available", async () => {
    const nativeStorage = {
      getItem: jest.fn(async () => "value"),
      setItem: jest.fn(async () => undefined),
      removeItem: jest.fn(async () => undefined),
      clear: jest.fn(async () => undefined),
      getAllKeys: jest.fn(async () => ["alpha"]),
      multiGet: jest.fn(async (keys: string[]) => keys.map((key) => [key, `${key}-value`] as [string, string])),
    };

    const storage = resolveAppStorage(() => ({
      default: nativeStorage,
    }), () => true);

    await expect(storage.getItem("alpha")).resolves.toBe("value");
    await storage.setItem("alpha", "beta");

    expect(nativeStorage.getItem).toHaveBeenCalledWith("alpha");
    expect(nativeStorage.setItem).toHaveBeenCalledWith("alpha", "beta");
  });

  it("falls back to in-memory storage when loading the native module throws", async () => {
    const storage = resolveAppStorage(() => {
      throw new Error("AsyncStorage native module missing");
    }, () => true);

    await storage.setItem("draft", "hello");
    await expect(storage.getItem("draft")).resolves.toBe("hello");
    await expect(storage.getAllKeys()).resolves.toEqual(["draft"]);
    await expect(storage.multiGet(["draft", "missing"])).resolves.toEqual([
      ["draft", "hello"],
      ["missing", null],
    ]);

    await storage.removeItem("draft");
    await expect(storage.getItem("draft")).resolves.toBeNull();
  });

  it("falls back when no native module is detected and the loaded package is not a compatible adapter", async () => {
    const loadModule = jest.fn(() => ({
      default: null,
    }));

    const storage = resolveAppStorage(loadModule, () => false);

    await storage.setItem("draft", "hello");
    await expect(storage.getItem("draft")).resolves.toBe("hello");
    expect(loadModule).toHaveBeenCalledTimes(1);
  });
});
