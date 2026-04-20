import type { Episode, Novel } from "../types";
import type { RemoteEpisodeRow, RemoteNovelAggregate } from "./types";

export function calculateSalePercent(
  listPrice: number | null | undefined,
  salePrice: number | null | undefined
) {
  if (!listPrice || !salePrice || listPrice <= 0 || salePrice >= listPrice) {
    return undefined;
  }

  return Math.round(((listPrice - salePrice) / listPrice) * 100);
}

export function mapRemoteEpisodeToMobileEpisode(row: RemoteEpisodeRow): Episode {
  return {
    id: row.id,
    number: row.episode_number,
    title: row.title,
    summary: row.teaser ?? "",
    isFree: row.access_type === "free",
    price: row.price ?? 0,
    body: row.body,
  };
}

export function mapRemoteNovelToMobileNovel(input: RemoteNovelAggregate): Novel {
  const salePercent = calculateSalePercent(
    input.novel.bundle_list_price,
    input.novel.bundle_sale_price
  );

  return {
    id: input.novel.id,
    title: input.novel.title,
    author: input.authorName,
    coverUrl: input.novel.cover_url ?? "",
    heroImageUrl: input.novel.banner_url ?? input.novel.cover_url ?? "",
    tagline: input.novel.short_description ?? "",
    synopsis: input.novel.description,
    tags: input.tags,
    views: input.novel.view_count,
    rating: input.novel.reaction_score,
    totalEpisodes: input.novel.total_episode_count,
    freeEpisodes: input.novel.free_episode_count,
    pricePerEpisode: input.representativeEpisodePrice,
    salePercent,
    salePrice: input.novel.bundle_sale_price ?? undefined,
    status: input.novel.status === "completed" ? "완결" : "연재중",
    source: "INKROAD",
    episodes: input.episodes.map(mapRemoteEpisodeToMobileEpisode),
  };
}
