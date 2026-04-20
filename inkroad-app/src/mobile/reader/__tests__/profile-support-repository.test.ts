import { createAccountRepository } from "../accountRepository";

jest.mock("../../../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

describe("profile support repository", () => {
  beforeEach(() => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");
    supabase.from.mockReset();
    supabase.storage.from.mockReset();
    supabase.functions.invoke.mockReset();
  });

  it("uploads an avatar and updates profiles.avatar_url", async () => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");

    const updateQuery = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "user-1",
          display_name: "림루",
          role: "reader",
          marketing_opt_in: true,
          avatar_url: "https://cdn.example.com/avatar.jpg",
        },
        error: null,
      }),
    };

    supabase.from.mockImplementation((table: string) => {
      if (table === "profiles") return updateQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    supabase.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: "user-1/avatar.jpg" }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: "https://cdn.example.com/avatar.jpg" },
      }),
    });

    const repository = createAccountRepository();
    const result = await repository.uploadProfileAvatar("user-1", {
      uri: "file:///avatar.jpg",
      mimeType: "image/jpeg",
      base64: "ZmFrZQ==",
    });

    expect(result.avatarUrl).toBe("https://cdn.example.com/avatar.jpg");
    expect(updateQuery.update).toHaveBeenCalledWith({
      avatar_url: "https://cdn.example.com/avatar.jpg",
    });
  });

  it("stores a support ticket and invokes the notification function", async () => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");

    const insertQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "ticket-1",
          user_id: "user-1",
          email: "rimuru@example.com",
          category: "bug",
          subject: "앱이 멈춰요",
          message: "재현 경로",
          status: "open",
        },
        error: null,
      }),
    };

    supabase.from.mockImplementation((table: string) => {
      if (table === "support_tickets") return insertQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    supabase.functions.invoke.mockResolvedValue({
      data: { ok: true },
      error: null,
    });

    const repository = createAccountRepository();
    const result = await repository.submitSupportTicket("user-1", {
      email: "rimuru@example.com",
      category: "bug",
      subject: "앱이 멈춰요",
      message: "재현 경로",
    });

    expect(result.ticketId).toBe("ticket-1");
    expect(result.notificationStatus).toBe("sent");
    expect(supabase.functions.invoke).toHaveBeenCalledWith("notify-support-ticket", {
      body: expect.objectContaining({
        ticketId: "ticket-1",
        userId: "user-1",
        subject: "앱이 멈춰요",
      }),
    });
  });

  it("keeps the ticket saved when the notification call fails", async () => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");

    const insertQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "ticket-2",
          user_id: "user-1",
          email: "rimuru@example.com",
          category: "other",
          subject: "일반 문의",
          message: "본문",
          status: "open",
        },
        error: null,
      }),
    };

    supabase.from.mockImplementation((table: string) => {
      if (table === "support_tickets") return insertQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    supabase.functions.invoke.mockResolvedValue({
      data: null,
      error: new Error("mail down"),
    });

    const repository = createAccountRepository();
    const result = await repository.submitSupportTicket("user-1", {
      email: "rimuru@example.com",
      category: "other",
      subject: "일반 문의",
      message: "본문",
    });

    expect(result.ticketId).toBe("ticket-2");
    expect(result.notificationStatus).toBe("deferred");
  });
});
