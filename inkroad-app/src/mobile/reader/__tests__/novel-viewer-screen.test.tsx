import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

import NovelViewerScreen from "../../screens/NovelViewerScreen";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "novel-1", episode: "2" }),
  useRouter: () => ({ replace: mockReplace, back: jest.fn() }),
}));

jest.mock("../repository", () => ({
  createReaderRepository: () => ({
    getEpisodeView: jest.fn().mockResolvedValue({
      novel: {
        id: "novel-1",
        title: "실데이터 뷰어",
        author: "작가",
        coverUrl: "cover",
        heroImageUrl: "cover",
        tagline: "",
        synopsis: "",
        tags: [],
        views: 100,
        rating: 9,
        totalEpisodes: 3,
        freeEpisodes: 1,
        pricePerEpisode: 100,
        status: "연재중",
        source: "INKROAD",
        episodes: [],
      },
      episode: {
        id: "ep-2",
        number: 2,
        title: "2화",
        summary: "",
        isFree: false,
        price: 120,
        body: "실제 본문",
      },
      previousEpisode: {
        id: "ep-1",
        number: 1,
        title: "1화",
        summary: "",
        isFree: true,
        price: 0,
        body: "이전",
      },
      nextEpisode: null,
    }),
  }),
}));

describe("NovelViewerScreen", () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it("renders the repository-backed body and progress label", async () => {
    render(<NovelViewerScreen />);

    await waitFor(() => {
      expect(screen.getByText("실제 본문")).toBeTruthy();
      expect(screen.getByText("2 / 3")).toBeTruthy();
    });
  });
});
