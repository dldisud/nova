import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import SearchScreen from "../../screens/SearchScreen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock("../repository", () => ({
  createReaderRepository: () => ({
    searchCatalog: jest.fn().mockResolvedValue([
      {
        id: "novel-1",
        title: "회귀 마도서",
        author: "시엘",
        coverUrl: "cover",
        heroImageUrl: "cover",
        tagline: "",
        synopsis: "설명",
        tags: ["판타지", "회귀"],
        views: 100,
        rating: 9.1,
        totalEpisodes: 20,
        freeEpisodes: 5,
        pricePerEpisode: 100,
        status: "연재중",
        source: "INKROAD",
        episodes: [],
      },
    ]),
  }),
}));

describe("SearchScreen", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("filters repository results with query text", async () => {
    render(<SearchScreen />);

    await waitFor(() => {
      expect(screen.getByText("회귀 마도서")).toBeTruthy();
    });

    fireEvent.changeText(
      screen.getByPlaceholderText("작품명, 저자, 태그 검색.."),
      "없는 검색어"
    );

    await waitFor(() => {
      expect(screen.queryByText("회귀 마도서")).toBeNull();
    });
  });
});
