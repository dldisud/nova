import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { createMockAuthorRepository } from "../repository";
import AuthorHomeScreen from "../../screens/AuthorHomeScreen";

const mockStore = new Map<string, string>();
const mockPush = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    setItem: async (key: string, value: string) => {
      mockStore.set(key, value);
    },
    getItem: async (key: string) => mockStore.get(key) ?? null,
    getAllKeys: async () => Array.from(mockStore.keys()),
    multiGet: async (keys: string[]) => keys.map((key) => [key, mockStore.get(key) ?? null]),
    clear: async () => {
      mockStore.clear();
    },
  },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

jest.mock("../../hooks/useAuthSession", () => ({
  useAuthSession: () => ({
    session: {
      user: {
        id: "user-1",
        email: "rimuru2178@gmail.com",
      },
    },
    isLoadingSession: false,
  }),
}));

jest.mock("../../reader/accountRepository", () => ({
  createAccountRepository: () => ({
    getProfileData: jest.fn().mockResolvedValue({
      profile: {
        isCreator: true,
      },
    }),
  }),
}));

describe("AuthorHomeScreen", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockStore.clear();
  });

  it("renders the studio header, primary actions, and work cards from the author repository", async () => {
    const onCreateEpisode = jest.fn();
    const onResumeDraft = jest.fn();

    render(
      <AuthorHomeScreen
        repository={createMockAuthorRepository()}
        onCreateEpisode={onCreateEpisode}
        onResumeDraft={onResumeDraft}
      />
    );

    expect(await screen.findByText("작가 스튜디오")).toBeTruthy();
    expect(screen.getByText("새 회차 쓰기")).toBeTruthy();
    expect(screen.getByText("이어쓰기")).toBeTruthy();

    expect(await screen.findByText("칠흑의 마법사와 검은 서약")).toBeTruthy();
    expect(screen.getByText("심연의 사서와 금지된 장서관")).toBeTruthy();

    fireEvent.press(screen.getByText("새 회차 쓰기"));
    fireEvent.press(screen.getByText("이어쓰기"));

    expect(onCreateEpisode).toHaveBeenCalledTimes(1);
    expect(onResumeDraft).toHaveBeenCalledTimes(1);
  });

  it("routes recent work to the latest saved draft when no override is provided", async () => {
    const repo = createMockAuthorRepository();
    const nowSpy = jest.spyOn(Date, "now");

    try {
      nowSpy.mockReturnValueOnce(1_000);
      await repo.saveDraft({
        novelId: "whan-book",
        episodeId: "whan-book-ep-2",
        title: "먼저 저장된 초안",
        accessType: "free",
        price: 0,
        body: "첫 번째",
      });

      nowSpy.mockReturnValueOnce(2_000);
      await repo.saveDraft({
        novelId: "midnight-rail",
        episodeId: "midnight-rail-ep-4",
        title: "가장 최근 초안",
        accessType: "paid",
        price: 150,
        body: "두 번째",
      });

      render(<AuthorHomeScreen repository={repo} />);

      fireEvent.press(await screen.findByText("이어쓰기"));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          "/author/episode/midnight-rail?episodeId=midnight-rail-ep-4"
        );
      });
    } finally {
      nowSpy.mockRestore();
    }
  });
});

