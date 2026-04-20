import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

import NovelDetailScreen from "../../screens/NovelDetailScreen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "novel-1" }),
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 16, left: 0 }),
}));

jest.mock("../repository", () => ({
  createReaderRepository: () => ({
    getNovelDetail: jest.fn().mockResolvedValue({
      novel: {
        id: "novel-1",
        title: "실데이터 상세",
        author: "작가",
        coverUrl: "cover",
        heroImageUrl: "cover",
        tagline: "",
        synopsis: "실제 설명",
        tags: ["판타지"],
        views: 100,
        rating: 9.1,
        totalEpisodes: 2,
        freeEpisodes: 1,
        pricePerEpisode: 100,
        status: "연재중",
        source: "INKROAD",
        episodes: [],
      },
      episodes: [
        {
          id: "ep-1",
          number: 1,
          title: "프롤로그",
          summary: "첫 회차",
          isFree: true,
          price: 0,
          body: "본문",
        },
      ],
    }),
  }),
}));

describe("NovelDetailScreen", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders repository-backed synopsis and episode list", async () => {
    render(<NovelDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("실제 설명")).toBeTruthy();
      expect(screen.getByText("1화 · 프롤로그")).toBeTruthy();
    });
  });
});
