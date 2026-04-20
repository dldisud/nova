const mockStore = new Map<string, string>();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    setItem: async (key: string, value: string) => {
      mockStore.set(key, value);
    },
    getItem: async (key: string) => mockStore.get(key) ?? null,
    getAllKeys: async () => Array.from(mockStore.keys()),
    multiGet: async (keys: string[]) =>
      keys.map((key) => [key, mockStore.get(key) ?? null]),
    removeItem: async (key: string) => {
      mockStore.delete(key);
    },
    clear: async () => {
      mockStore.clear();
    },
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";

import { createMockAuthorRepository } from "../repository";
import * as remoteBackend from "../remoteBackend";
import { saveLocalDraft } from "../storage";
import type { EpisodeDraft } from "../../types";

const asyncStorage = AsyncStorage as {
  clear: () => Promise<void>;
};

function buildDraft(
  overrides: Partial<EpisodeDraft> &
    Pick<EpisodeDraft, "novelId" | "title" | "accessType" | "price" | "body">
): EpisodeDraft {
  return {
    novelId: overrides.novelId,
    episodeId: overrides.episodeId,
    title: overrides.title,
    accessType: overrides.accessType,
    price: overrides.price,
    body: overrides.body,
    workflowStep: overrides.workflowStep ?? "draft",
    episodeType: overrides.episodeType ?? "episode",
    publicationState: overrides.publicationState ?? "draft",
    updatedAt: overrides.updatedAt,
    scheduledAt: overrides.scheduledAt,
    publishedAt: overrides.publishedAt,
    ageRating: overrides.ageRating,
  };
}

describe("createMockAuthorRepository sync rules", () => {
  beforeEach(async () => {
    await asyncStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(remoteBackend, "getCurrentUserId").mockResolvedValue("user-1");
    jest.spyOn(remoteBackend, "listRemoteDrafts").mockResolvedValue([]);
    jest.spyOn(remoteBackend, "listRemoteHistory").mockResolvedValue([]);
    jest.spyOn(remoteBackend, "listRemotePenNames").mockResolvedValue([]);
    jest.spyOn(remoteBackend, "loadRemoteDraft").mockResolvedValue(null);
    jest.spyOn(remoteBackend, "loadRemotePrefs").mockResolvedValue(null);
    jest.spyOn(remoteBackend, "loadRemoteWorkMeta").mockResolvedValue(null);
    jest.spyOn(remoteBackend, "saveRemotePrefs").mockResolvedValue(null);
    jest.spyOn(remoteBackend, "saveRemoteWorkMeta").mockResolvedValue(null);
    jest.spyOn(remoteBackend, "upsertRemoteDraft").mockResolvedValue(null);
  });

  it("prefers the newer local backup over an older remote draft for the same episode", async () => {
    const repo = createMockAuthorRepository();

    jest.spyOn(remoteBackend, "loadRemoteDraft").mockResolvedValue(
      buildDraft({
        novelId: "whan-book",
        episodeId: "whan-book-ep-2",
        title: "remote-old",
        accessType: "paid",
        price: 120,
        body: "remote body",
        updatedAt: 1_000,
      })
    );

    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(2_000);
    try {
      await saveLocalDraft(
        buildDraft({
          novelId: "whan-book",
          episodeId: "whan-book-ep-2",
          title: "local-new",
          accessType: "paid",
          price: 120,
          body: "local body",
        })
      );
    } finally {
      nowSpy.mockRestore();
    }

    await expect(repo.loadDraft("whan-book", "whan-book-ep-2")).resolves.toEqual(
      expect.objectContaining({
        title: "local-new",
        body: "local body",
        updatedAt: 2_000,
      })
    );
  });

  it("uses the newest draft version when local and remote copies collide in episode summaries", async () => {
    const repo = createMockAuthorRepository();

    jest.spyOn(remoteBackend, "listRemoteDrafts").mockResolvedValue([
      buildDraft({
        novelId: "whan-book",
        episodeId: "whan-book-ep-4",
        title: "remote-summary",
        accessType: "paid",
        price: 300,
        body: "remote body",
        updatedAt: 1_000,
      }),
    ]);

    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(2_000);
    try {
      await saveLocalDraft(
        buildDraft({
          novelId: "whan-book",
          episodeId: "whan-book-ep-4",
          title: "local-summary",
          accessType: "paid",
          price: 300,
          body: "local body",
        })
      );
    } finally {
      nowSpy.mockRestore();
    }

    await expect(repo.listEpisodes("whan-book")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "whan-book-ep-4",
          title: "local-summary",
          updatedAt: new Date(2_000).toISOString(),
        }),
      ])
    );
  });
});
