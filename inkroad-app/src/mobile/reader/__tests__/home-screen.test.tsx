import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

import HomeScreen from "../../screens/HomeScreen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

jest.mock("../repository", () => ({
  createReaderRepository: () => ({
    getHomeSections: jest.fn().mockResolvedValue({
      hero: {
        id: "novel-1",
        title: "실데이터 히어로",
        author: "작가",
        coverUrl: "cover",
        heroImageUrl: "cover",
        tagline: "",
        synopsis: "소개",
        tags: ["판타지"],
        views: 100,
        rating: 9.0,
        totalEpisodes: 12,
        freeEpisodes: 3,
        pricePerEpisode: 100,
        salePercent: 20,
        salePrice: 800,
        status: "연재중",
        source: "INKROAD",
        episodes: [],
      },
      sale: [],
      popular: [],
      recent: [],
    }),
  }),
}));

describe("HomeScreen", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders repository-backed hero title", async () => {
    render(<HomeScreen />);

    await waitFor(() => {
      expect(screen.getByText("실데이터 히어로")).toBeTruthy();
    });
  });
});
