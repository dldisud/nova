import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import ProfileScreen from "../../screens/ProfileScreen";

const mockPush = jest.fn();
const mockSignOut = jest.fn();
const mockUpdateProfileSettings = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
const mockUploadProfileAvatar = jest.fn();
const mockSubmitSupportTicket = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

jest.mock("../../hooks/useAuthSession", () => ({
  useAuthSession: jest.fn(),
}));

jest.mock(
  "expo-image-picker",
  () => ({
    requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
    MediaTypeOptions: { Images: "Images" },
  }),
  { virtual: true }
);

jest.mock("../../../../lib/supabase", () => ({
  supabase: {
    auth: {
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));

jest.mock("../accountRepository", () => ({
  createAccountRepository: () => ({
    getProfileData: jest.fn().mockResolvedValue({
      profile: {
        id: "user-1",
        displayName: "림루",
        email: "rimuru@example.com",
        role: "reader",
        isCreator: true,
        marketingOptIn: true,
        avatarUrl: null,
      },
      stats: {
        readingCount: 2,
        wishlistCount: 3,
        purchasedCount: 1,
      },
    }),
    updateProfileSettings: (...args: unknown[]) => mockUpdateProfileSettings(...args),
    uploadProfileAvatar: (...args: unknown[]) => mockUploadProfileAvatar(...args),
    submitSupportTicket: (...args: unknown[]) => mockSubmitSupportTicket(...args),
  }),
}));

describe("ProfileScreen", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockSignOut.mockReset();
    mockUpdateProfileSettings.mockReset();
    mockLaunchImageLibraryAsync.mockReset();
    mockUploadProfileAvatar.mockReset();
    mockSubmitSupportTicket.mockReset();
    mockSignOut.mockResolvedValue({
      error: null,
      data: { session: null, user: null },
    });
  });

  it("renders repository-backed profile and activity stats", async () => {
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

    render(<ProfileScreen />);

    expect(await screen.findByText("rimuru@example.com")).toBeTruthy();
    expect(await screen.findByText("읽는 중 2")).toBeTruthy();
    expect(await screen.findByText("찜 3")).toBeTruthy();
    expect(await screen.findByText("구매 1")).toBeTruthy();
  });

  it("logs out through supabase auth instead of a placeholder alert", async () => {
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

    render(<ProfileScreen />);

    fireEvent.press(await screen.findByText("로그아웃"));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it("prefills the profile settings form from repository data", async () => {
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

    render(<ProfileScreen />);

    expect(await screen.findByDisplayValue("림루")).toBeTruthy();
    expect(screen.getByText("마케팅 알림 수신")).toBeTruthy();
  });

  it("saves updated profile settings and refreshes the visible name", async () => {
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

    mockUpdateProfileSettings.mockResolvedValueOnce({
      id: "user-1",
      displayName: "새 닉네임",
      email: "rimuru@example.com",
      role: "reader",
      isCreator: true,
      marketingOptIn: false,
    });

    render(<ProfileScreen />);

    fireEvent.changeText(await screen.findByDisplayValue("림루"), "새 닉네임");
    fireEvent.press(screen.getByText("저장하기"));

    await waitFor(() => {
      expect(mockUpdateProfileSettings).toHaveBeenCalledWith("user-1", {
        displayName: "새 닉네임",
        marketingOptIn: true,
        email: "rimuru@example.com",
      });
      expect(screen.getByText("새 닉네임")).toBeTruthy();
      expect(screen.getByText("프로필 설정이 저장되었습니다.")).toBeTruthy();
    });
  });

  it("shows an error when logout fails", async () => {
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

    mockSignOut.mockResolvedValueOnce({
      error: new Error("network down"),
      data: { session: null, user: null },
    });

    render(<ProfileScreen />);
    fireEvent.press(await screen.findByText("로그아웃"));

    await waitFor(() => {
      expect(screen.getByText("로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.")).toBeTruthy();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("uploads a selected avatar and updates the profile card", async () => {
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

    mockLaunchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: "file:///avatar.jpg",
          mimeType: "image/jpeg",
          base64: "ZmFrZQ==",
        },
      ],
    });
    mockUploadProfileAvatar.mockResolvedValueOnce({
      avatarUrl: "https://cdn.example.com/avatar.jpg",
    });

    render(<ProfileScreen />);
    fireEvent.press(await screen.findByText("아바타 변경"));

    await waitFor(() => {
      expect(mockUploadProfileAvatar).toHaveBeenCalledWith("user-1", {
        uri: "file:///avatar.jpg",
        mimeType: "image/jpeg",
        base64: "ZmFrZQ==",
      });
      expect(screen.getByText("아바타가 변경되었습니다.")).toBeTruthy();
    });
  });

  it("opens the in-app support form and submits a ticket", async () => {
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

    mockSubmitSupportTicket.mockResolvedValueOnce({
      ticketId: "ticket-1",
      notificationStatus: "sent",
    });

    render(<ProfileScreen />);
    fireEvent.press(await screen.findByText("고객센터"));
    fireEvent.changeText(await screen.findByPlaceholderText("문의 제목"), "앱이 멈춰요");
    fireEvent.changeText(screen.getByPlaceholderText("문의 내용을 입력해 주세요"), "재현 경로");
    fireEvent.press(screen.getByText("문의 보내기"));

    await waitFor(() => {
      expect(mockSubmitSupportTicket).toHaveBeenCalledWith("user-1", {
        email: "rimuru@example.com",
        category: "other",
        subject: "앱이 멈춰요",
        message: "재현 경로",
      });
      expect(screen.getByText("문의가 접수되었고 관리자에게 전달되었습니다.")).toBeTruthy();
    });
  });

  it("shows a deferred message when the ticket is saved but notification fails", async () => {
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

    mockSubmitSupportTicket.mockResolvedValueOnce({
      ticketId: "ticket-2",
      notificationStatus: "deferred",
    });

    render(<ProfileScreen />);
    fireEvent.press(await screen.findByText("고객센터"));
    fireEvent.changeText(await screen.findByPlaceholderText("문의 제목"), "일반 문의");
    fireEvent.changeText(screen.getByPlaceholderText("문의 내용을 입력해 주세요"), "본문");
    fireEvent.press(screen.getByText("문의 보내기"));

    await waitFor(() => {
      expect(
        screen.getByText("문의는 접수되었지만 관리자 알림이 지연될 수 있습니다.")
      ).toBeTruthy();
    });
  });
});
