const mockCreateClient = jest.fn(() => ({
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

jest.mock("../appStorage", () => ({
  appStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getAllKeys: jest.fn(),
    multiGet: jest.fn(),
  },
}));

describe("supabase client configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    mockCreateClient.mockClear();
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("reads the Supabase URL and anon key from Expo public env vars", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "example-anon-key";

    jest.isolateModules(() => {
      require("../../../../lib/supabase");
    });

    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "example-anon-key",
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: true,
          persistSession: true,
        }),
      })
    );
  });

  it("throws a clear error when the Expo public env vars are missing", () => {
    expect(() => {
      jest.isolateModules(() => {
        require("../../../../lib/supabase");
      });
    }).toThrow("EXPO_PUBLIC_SUPABASE_URL");
  });
});
