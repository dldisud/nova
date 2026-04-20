import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";

import EpisodeComposerScreen from "../../screens/EpisodeComposerScreen";

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
    clear: async () => {
      mockStore.clear();
    },
  },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

describe("EpisodeComposerScreen", () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it("supports custom schedule selection with minute precision", async () => {
    render(<EpisodeComposerScreen novelId="whan-book" />);

    fireEvent.press(screen.getAllByText("예약")[0]);
    fireEvent.press(await screen.findByText("직접 입력"));

    fireEvent.press(screen.getByTestId("schedule-day-next"));
    fireEvent.press(screen.getByTestId("schedule-hour-10"));
    fireEvent.press(screen.getByTestId("schedule-minute-37"));

    expect(screen.getByText("2026년 4월 22일 오전 10:37")).toBeTruthy();

    fireEvent.press(screen.getByText("예약 확인"));

    expect(screen.getByText("4/22 오전 10:37")).toBeTruthy();
  });
});

