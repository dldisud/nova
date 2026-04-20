import { createReaderRepository } from "../repository";

jest.mock("../../../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("createReaderRepository", () => {
  it("returns catalog sections ordered for home", async () => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");
    const novelsQuery = {
      select: jest.fn().mockReturnThis(),
      neq: jest.fn().mockResolvedValue({
        data: [
          {
            id: "novel-1",
            slug: "n1",
            title: "가장 인기작",
            short_description: "짧은 소개",
            description: "긴 소개",
            cover_url: "cover-1",
            banner_url: "banner-1",
            status: "published",
            is_translation: false,
            free_episode_count: 3,
            total_episode_count: 30,
            reaction_score: 9.7,
            view_count: 99999,
            bundle_list_price: 1000,
            bundle_sale_price: 700,
            authors: { pen_name: "작가1" },
            novel_tags: [{ tags: { name: "판타지" } }],
            episodes: [
              {
                id: "ep-1",
                episode_number: 1,
                title: "1화",
                teaser: "첫 회차",
                access_type: "free",
                price: 0,
                published_at: "2026-04-20T00:00:00Z",
                status: "published",
                episode_contents: { body: "본문" },
              },
            ],
          },
        ],
        error: null,
      }),
    };

    supabase.from.mockReturnValue(novelsQuery);

    const repo = createReaderRepository();
    const sections = await repo.getHomeSections();

    expect(sections.hero?.title).toBe("가장 인기작");
    expect(sections.popular[0]?.title).toBe("가장 인기작");
    expect(sections.sale[0]?.salePercent).toBe(30);
  });

  it("returns a detail payload with public episodes only", async () => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");
    const novelsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "novel-1",
          slug: "n1",
          title: "작품",
          short_description: null,
          description: "설명",
          cover_url: "cover",
          banner_url: null,
          status: "published",
          is_translation: false,
          free_episode_count: 1,
          total_episode_count: 3,
          reaction_score: 8.9,
          view_count: 10,
          bundle_list_price: null,
          bundle_sale_price: null,
          authors: { pen_name: "작가" },
          novel_tags: [],
          episodes: [
            {
              id: "ep-1",
              episode_number: 1,
              title: "1화",
              teaser: "공개",
              access_type: "free",
              price: 0,
              published_at: "2026-04-20T00:00:00Z",
              status: "published",
              episode_contents: { body: "본문1" },
            },
            {
              id: "ep-2",
              episode_number: 2,
              title: "2화",
              teaser: "초안",
              access_type: "paid",
              price: 100,
              published_at: null,
              status: "draft",
              episode_contents: { body: "본문2" },
            },
          ],
        },
        error: null,
      }),
    };

    supabase.from.mockReturnValue(novelsQuery);

    const repo = createReaderRepository();
    const detail = await repo.getNovelDetail("novel-1");

    expect(detail?.novel.id).toBe("novel-1");
    expect(detail?.episodes).toHaveLength(1);
    expect(detail?.episodes[0].number).toBe(1);
  });
});
