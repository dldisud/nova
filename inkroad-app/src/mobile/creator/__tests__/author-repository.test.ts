const mockStore = new Map<string, string>();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    setItem: async (key: string, value: string) => {
      mockStore.set(key, value);
    },
    getItem: async (key: string) => mockStore.get(key) ?? null,
    getAllKeys: async () => Array.from(mockStore.keys()),
    multiGet: async (keys: string[]) => keys.map((key) => [key, mockStore.get(key) ?? null]),
    removeItem: async (key: string) => {
      mockStore.delete(key);
    },
    clear: async () => {
      mockStore.clear();
    },
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";

import { novels } from "../../data/mockInkroad";
import { createMockAuthorRepository } from "../repository";
import { loadLocalDraft, saveLocalDraft } from "../storage";

const asyncStorage = AsyncStorage as {
  setItem: (key: string, value: string) => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
  getAllKeys: () => Promise<string[]>;
  multiGet: (keys: string[]) => Promise<Array<[string, string | null]>>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
};

const keyFor = (novelId: string, episodeId?: string) =>
  `inkroad:draft:${novelId}:${episodeId ?? "new"}`;

describe("createMockAuthorRepository", () => {
  beforeEach(async () => {
    await asyncStorage.clear();
  });

  it("uses the novel totalEpisodes value and returns a matching work", async () => {
    const repo = createMockAuthorRepository();
    const novel = novels.find((item) => item.id === "whan-book");
    const freeBoundary = novel?.freeEpisodes ?? 0;

    const works = await repo.listWorks();
    const work = works.find((item) => item.id === "whan-book");

    expect(work).toEqual(
      expect.objectContaining({
        id: novel?.id,
        title: novel?.title,
        totalEpisodes: novel?.totalEpisodes,
      })
    );

    await expect(repo.getWork("whan-book")).resolves.toEqual(
      expect.objectContaining({
        id: novel?.id,
        title: novel?.title,
        totalEpisodes: novel?.totalEpisodes,
      })
    );

    const episodes = await repo.listEpisodes("whan-book");
    expect(episodes).toHaveLength(novel?.totalEpisodes ?? 0);
    expect(episodes.slice(0, 3).map((episode) => episode.title)).toEqual([
      "프롤로그",
      "검은 서약",
      "금서고의 열쇠",
    ]);
    expect(episodes[freeBoundary - 1]).toEqual(
      expect.objectContaining({
        number: freeBoundary,
        accessType: "free",
        price: 0,
      })
    );
    expect(episodes[freeBoundary]).toEqual(
      expect.objectContaining({
        number: freeBoundary + 1,
        accessType: "paid",
        price: novel?.pricePerEpisode,
      })
    );

    await expect(repo.loadDraft("whan-book", `whan-book-ep-${freeBoundary + 1}`)).resolves.toEqual(
      expect.objectContaining({
        title: `${freeBoundary + 1}화`,
        accessType: "paid",
        price: novel?.pricePerEpisode,
        publicationState: "draft",
      })
    );
  });

  it("returns a saved local draft before falling back to mock episode data", async () => {
    const repo = createMockAuthorRepository();
    const draft = {
      novelId: "whan-book",
      episodeId: "whan-book-ep-2",
      title: "임시 저장 제목",
      accessType: "paid" as const,
      price: 321,
      body: "로컬에 저장된 본문",
    };

    await saveLocalDraft(draft);

    await expect(repo.loadDraft("whan-book", "whan-book-ep-2")).resolves.toEqual(
      expect.objectContaining(draft)
    );
  });

  it("persists drafts when saving and publishing", async () => {
    const repo = createMockAuthorRepository();
    const draft = {
      novelId: "whan-book",
      episodeId: "whan-book-ep-3",
      title: "저장 제목",
      accessType: "free" as const,
      price: 0,
      body: "저장 본문",
      workflowStep: "scheduled" as const,
      episodeType: "notice" as const,
      ageRating: "15" as const,
      scheduledAt: new Date("2026-04-20T10:37:00+09:00").getTime(),
      publicationState: "scheduled" as const,
    };

    await repo.saveDraft(draft);
    await expect(loadLocalDraft("whan-book", "whan-book-ep-3")).resolves.toEqual(
      expect.objectContaining({
        ...draft,
        publicationState: "scheduled",
      })
    );

    const published = { ...draft, title: "발행 제목" };
    await repo.publishDraft(published);
    await expect(loadLocalDraft("whan-book", "whan-book-ep-3")).resolves.toEqual(
      expect.objectContaining({
        ...published,
        publicationState: "published",
        workflowStep: "published",
        scheduledAt: undefined,
      })
    );

    await repo.saveDraft({ ...published, body: "발행 후 수정" });
    await expect(loadLocalDraft("whan-book", "whan-book-ep-3")).resolves.toEqual(
      expect.objectContaining({
        body: "발행 후 수정",
        publicationState: "updated",
      })
    );
  });

  it("returns the most recently updated draft across works and episodes", async () => {
    const repo = createMockAuthorRepository();
    const nowSpy = jest.spyOn(Date, "now");

    try {
      nowSpy.mockReturnValueOnce(1_000);
      await repo.saveDraft({
        novelId: "whan-book",
        episodeId: "whan-book-ep-3",
        title: "먼저 저장",
        accessType: "free",
        price: 0,
        body: "첫 번째 초안",
      });

      nowSpy.mockReturnValueOnce(2_000);
      await repo.saveDraft({
        novelId: "midnight-rail",
        episodeId: "midnight-rail-ep-2",
        title: "나중 저장",
        accessType: "paid",
        price: 150,
        body: "두 번째 초안",
      });

      await expect(repo.getMostRecentDraft()).resolves.toEqual(
        expect.objectContaining({
          novelId: "midnight-rail",
          episodeId: "midnight-rail-ep-2",
          title: "나중 저장",
        })
      );
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("handles invalid IDs and malformed stored data safely", async () => {
    const repo = createMockAuthorRepository();

    await expect(repo.getWork("missing-id")).resolves.toBeNull();
    await expect(repo.listEpisodes("missing-id")).resolves.toEqual([]);
    await expect(repo.loadDraft("missing-id", "missing-episode")).resolves.toEqual(
      expect.objectContaining({
        novelId: "missing-id",
        episodeId: "missing-episode",
        title: "",
        accessType: "free",
        price: 100,
        body: "",
        publicationState: "draft",
      })
    );

    await asyncStorage.setItem(keyFor("whan-book", "whan-book-ep-2"), "{not json");
    await expect(loadLocalDraft("whan-book", "whan-book-ep-2")).resolves.toBeNull();
  });

  it("surfaces saved schedule status inside episode summaries", async () => {
    const repo = createMockAuthorRepository();

    await repo.saveDraft({
      novelId: "whan-book",
      episodeId: "whan-book-ep-4",
      title: "예약 회차",
      accessType: "paid",
      price: 300,
      body: "예약 본문",
      workflowStep: "scheduled",
      episodeType: "episode",
      ageRating: "all",
      scheduledAt: new Date("2026-04-20T10:37:00+09:00").getTime(),
      publicationState: "scheduled",
    });

    await expect(repo.listEpisodes("whan-book")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "whan-book-ep-4",
          title: "예약 회차",
          publishStatus: "scheduled",
          scheduledAt: "4/20 오전 10:37",
          ageRating: "all",
        }),
      ])
    );
  });
});
