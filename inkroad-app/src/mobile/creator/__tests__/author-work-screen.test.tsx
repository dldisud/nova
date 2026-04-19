import React from "react";
import { render, screen } from "@testing-library/react-native";

import AuthorWorkScreen from "../../screens/AuthorWorkScreen";
import { createMockAuthorRepository } from "../repository";

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

describe("AuthorWorkScreen", () => {
  it("shows work summary and episode list", async () => {
    render(
      <AuthorWorkScreen
        workId="whan-book"
        repository={createMockAuthorRepository()}
      />
    );

    expect(await screen.findByText("회차 관리")).toBeTruthy();
    expect(await screen.findByText("새 회차 작성")).toBeTruthy();
    expect(await screen.findByText("작품 정보")).toBeTruthy();
    expect(await screen.findByText("프롤로그")).toBeTruthy();
  });
});
