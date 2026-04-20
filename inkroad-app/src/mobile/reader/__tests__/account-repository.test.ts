import { createAccountRepository } from "../accountRepository";

jest.mock("../../../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("createAccountRepository", () => {
  it("builds authenticated library shelves from library items and purchases", async () => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");

    const profilesQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: "user-1", display_name: "림루", role: "reader" },
        error: null,
      }),
    };

    const authorsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [{ id: "author-1" }],
        error: null,
      }),
    };

    const libraryQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [
          {
            id: "library-1",
            state: "reading",
            is_bookmarked: true,
            notifications_enabled: true,
            last_read_at: "2026-04-20T01:00:00Z",
            updated_at: "2026-04-20T01:00:00Z",
            last_read_episode_id: "ep-2",
            novel: {
              id: "novel-1",
              slug: "novel-1",
              title: "회귀 마도서",
              short_description: "짧은 소개",
              description: "긴 소개",
              cover_url: "cover",
              banner_url: "banner",
              status: "published",
              is_translation: false,
              free_episode_count: 3,
              total_episode_count: 10,
              reaction_score: 9.2,
              view_count: 100,
              bundle_list_price: 1200,
              bundle_sale_price: 900,
              authors: { pen_name: "시엘" },
              novel_tags: [{ tags: { name: "판타지" } }],
            },
            episode: {
              id: "ep-2",
              episode_number: 2,
              title: "2화",
            },
          },
        ],
        error: null,
      }),
    };

    const purchasesQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [
          {
            id: "purchase-1",
            purchase_type: "bundle",
            amount_paid: 5000,
            purchased_at: "2026-04-20T02:00:00Z",
            novel: {
              id: "novel-2",
              slug: "novel-2",
              title: "북부 장부",
              short_description: "짧은 소개",
              description: "긴 소개",
              cover_url: "cover-2",
              banner_url: "banner-2",
              status: "published",
              is_translation: false,
              free_episode_count: 5,
              total_episode_count: 20,
              reaction_score: 8.8,
              view_count: 400,
              bundle_list_price: 6000,
              bundle_sale_price: 5000,
              authors: { pen_name: "작가2" },
              novel_tags: [{ tags: { name: "로맨스" } }],
            },
            episode: null,
          },
        ],
        error: null,
      }),
    };

    supabase.from.mockImplementation((table: string) => {
      if (table === "profiles") return profilesQuery;
      if (table === "authors") return authorsQuery;
      if (table === "library_items") return libraryQuery;
      if (table === "purchases") return purchasesQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const repository = createAccountRepository();
    const result = await repository.getLibraryData("user-1", {
      email: "rimuru@example.com",
      user_metadata: { display_name: "림루" },
    });

    expect(result.profile).toEqual(
      expect.objectContaining({
        id: "user-1",
        displayName: "림루",
        email: "rimuru@example.com",
        isCreator: true,
      })
    );
    expect(result.shelves.reading[0]?.novel.title).toBe("회귀 마도서");
    expect(result.shelves.reading[0]?.readProgress).toBe(20);
    expect(result.shelves.wishlist[0]?.novel.title).toBe("회귀 마도서");
    expect(result.shelves.purchased[0]?.novel.title).toBe("북부 장부");
  });

  it("prefers profile display_name and falls back to session metadata when needed", async () => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");

    const profilesQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    const authorsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const libraryQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const purchasesQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    supabase.from.mockImplementation((table: string) => {
      if (table === "profiles") return profilesQuery;
      if (table === "authors") return authorsQuery;
      if (table === "library_items") return libraryQuery;
      if (table === "purchases") return purchasesQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const repository = createAccountRepository();
    const result = await repository.getProfileData("user-2", {
      email: "fallback@example.com",
      user_metadata: { display_name: "메타 닉네임" },
    });

    expect(result.profile.displayName).toBe("메타 닉네임");
    expect(result.profile.isCreator).toBe(false);
    expect(result.stats).toEqual({
      readingCount: 0,
      wishlistCount: 0,
      purchasedCount: 0,
    });
  });

  it("returns marketing opt-in from the profile row", async () => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");

    const profilesQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "user-1",
          display_name: "림루",
          role: "reader",
          marketing_opt_in: true,
        },
        error: null,
      }),
    };

    const authorsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const libraryQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const purchasesQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    supabase.from.mockImplementation((table: string) => {
      if (table === "profiles") return profilesQuery;
      if (table === "authors") return authorsQuery;
      if (table === "library_items") return libraryQuery;
      if (table === "purchases") return purchasesQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const repository = createAccountRepository();
    const result = await repository.getProfileData("user-1", {
      email: "rimuru@example.com",
      user_metadata: { display_name: "림루" },
    });

    expect(result.profile.marketingOptIn).toBe(true);
  });

  it("updates display name and marketing opt-in through profiles", async () => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");

    const updateQuery = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "user-1",
          display_name: "새 닉네임",
          role: "reader",
          marketing_opt_in: false,
        },
        error: null,
      }),
    };

    supabase.from.mockImplementation((table: string) => {
      if (table === "profiles") return updateQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const repository = createAccountRepository();
    const profile = await repository.updateProfileSettings("user-1", {
      displayName: " 새 닉네임 ",
      marketingOptIn: false,
      email: "rimuru@example.com",
    });

    expect(updateQuery.update).toHaveBeenCalledWith({
      display_name: "새 닉네임",
      marketing_opt_in: false,
    });
    expect(profile.displayName).toBe("새 닉네임");
    expect(profile.marketingOptIn).toBe(false);
  });
});
