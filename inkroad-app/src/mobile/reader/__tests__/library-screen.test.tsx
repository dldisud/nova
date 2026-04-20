import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

import LibraryScreen from "../../screens/LibraryScreen";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

jest.mock("../../hooks/useAuthSession", () => ({
  useAuthSession: jest.fn(),
}));

jest.mock("../accountRepository", () => ({
  createAccountRepository: () => ({
    getLibraryData: jest.fn().mockResolvedValue({
      profile: {
        id: "user-1",
        displayName: "림루",
        email: "rimuru@example.com",
        role: "reader",
        isCreator: false,
      },
      shelves: {
        reading: [
          {
            id: "library-1",
            novel: {
              id: "novel-1",
              title: "회귀 마도서",
              author: "시엘",
              coverUrl: "cover",
              heroImageUrl: "cover",
              tagline: "",
              synopsis: "설명",
              tags: ["판타지"],
              views: 100,
              rating: 9.1,
              totalEpisodes: 20,
              freeEpisodes: 5,
              pricePerEpisode: 100,
              status: "연재중",
              source: "INKROAD",
              episodes: [],
            },
            readProgress: 20,
            lastEpisodeNumber: 4,
          },
        ],
        wishlist: [],
        purchased: [],
      },
    }),
  }),
}));

describe("LibraryScreen", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders authenticated shelf data from the account repository", async () => {
    const { useAuthSession } = jest.requireMock("../../hooks/useAuthSession");
    useAuthSession.mockReturnValue({
      session: {
        user: {
          id: "user-1",
          email: "rimuru@example.com",
          user_metadata: { display_name: "림루" },
        },
      },
      isLoadingSession: false,
    });

    render(<LibraryScreen />);

    await waitFor(() => {
      expect(screen.getByText("회귀 마도서")).toBeTruthy();
      expect(screen.getByText("총 1작품")).toBeTruthy();
    });
  });

  it("shows a login prompt when the user is signed out", async () => {
    const { useAuthSession } = jest.requireMock("../../hooks/useAuthSession");
    useAuthSession.mockReturnValue({
      session: null,
      isLoadingSession: false,
    });

    render(<LibraryScreen />);

    expect(await screen.findByText("로그인이 필요해요")).toBeTruthy();
    expect(screen.getByText("로그인하기")).toBeTruthy();
  });
});
