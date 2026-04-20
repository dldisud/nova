import {
  calculateSalePercent,
  mapRemoteEpisodeToMobileEpisode,
  mapRemoteNovelToMobileNovel,
} from "../mappers";

describe("reader mappers", () => {
  it("maps a remote novel row into the mobile Novel shape", () => {
    const novel = mapRemoteNovelToMobileNovel({
      novel: {
        id: "novel-1",
        slug: "novel-one",
        title: "검은 별의 기록",
        short_description: "짧은 소개",
        description: "긴 소개",
        cover_url: "https://example.com/cover.jpg",
        banner_url: "https://example.com/banner.jpg",
        status: "published",
        is_translation: false,
        free_episode_count: 3,
        total_episode_count: 10,
        reaction_score: 9.3,
        view_count: 1200,
        bundle_list_price: 3000,
        bundle_sale_price: 2100,
      },
      authorName: "시엘",
      tags: ["판타지", "회귀"],
      representativeEpisodePrice: 100,
      episodes: [],
    });

    expect(novel).toEqual(
      expect.objectContaining({
        id: "novel-1",
        title: "검은 별의 기록",
        author: "시엘",
        coverUrl: "https://example.com/cover.jpg",
        heroImageUrl: "https://example.com/banner.jpg",
        tags: ["판타지", "회귀"],
        totalEpisodes: 10,
        freeEpisodes: 3,
        pricePerEpisode: 100,
        salePercent: 30,
        salePrice: 2100,
        status: "연재중",
        source: "INKROAD",
      })
    );
  });

  it("maps a remote episode row into the mobile Episode shape", () => {
    const episode = mapRemoteEpisodeToMobileEpisode({
      id: "episode-1",
      episode_number: 4,
      title: "4화",
      teaser: "다음 장면 미리보기",
      access_type: "paid",
      price: 120,
      body: "본문",
    });

    expect(episode).toEqual({
      id: "episode-1",
      number: 4,
      title: "4화",
      summary: "다음 장면 미리보기",
      isFree: false,
      price: 120,
      body: "본문",
    });
  });

  it("calculates sale percent only when both list and sale prices are valid", () => {
    expect(calculateSalePercent(3000, 2100)).toBe(30);
    expect(calculateSalePercent(0, 2100)).toBeUndefined();
    expect(calculateSalePercent(null, null)).toBeUndefined();
  });
});
