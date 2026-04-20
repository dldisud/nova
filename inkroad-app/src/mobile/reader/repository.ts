import { supabase } from "../../../lib/supabase";
import type { Episode, Novel } from "../types";
import { mapRemoteNovelToMobileNovel } from "./mappers";
import type { RemoteNovelAggregate } from "./types";

type HomeSections = {
  hero: Novel | null;
  sale: Novel[];
  popular: Novel[];
  recent: Novel[];
};

type NovelDetailPayload = {
  novel: Novel;
  episodes: Episode[];
};

type EpisodeViewPayload = {
  novel: Novel;
  episode: Episode;
  previousEpisode: Episode | null;
  nextEpisode: Episode | null;
};

type RawNovelRow = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string;
  cover_url: string | null;
  banner_url: string | null;
  status: string;
  is_translation: boolean;
  free_episode_count: number;
  total_episode_count: number;
  reaction_score: number;
  view_count: number;
  bundle_list_price: number | null;
  bundle_sale_price: number | null;
  authors?: { pen_name?: string | null } | null;
  novel_tags?: Array<{ tags?: { name?: string | null } | null }> | null;
  episodes?: Array<{
    id: string;
    episode_number: number;
    title: string;
    teaser: string | null;
    access_type: "free" | "paid";
    price: number | null;
    status: string;
    published_at: string | null;
    episode_contents?: { body?: string | null } | Array<{ body?: string | null }> | null;
  }> | null;
};

const PUBLIC_NOVEL_SELECT = `
  id, slug, title, short_description, description, cover_url, banner_url,
  status, is_translation, free_episode_count, total_episode_count,
  reaction_score, view_count, bundle_list_price, bundle_sale_price,
  authors:author_id ( pen_name ),
  novel_tags ( tags:tag_id ( name ) ),
  episodes (
    id, episode_number, title, teaser, access_type, price, status, published_at,
    episode_contents ( body )
  )
`;

function toAggregate(row: RawNovelRow): RemoteNovelAggregate {
  const publicEpisodes = (row.episodes ?? [])
    .filter((episode) => episode.status === "published")
    .map((episode) => ({
      id: episode.id,
      episode_number: episode.episode_number,
      title: episode.title,
      teaser: episode.teaser,
      access_type: episode.access_type,
      price: episode.price,
      body: (Array.isArray(episode.episode_contents) ? episode.episode_contents[0] : episode.episode_contents)?.body ?? "",
      published_at: episode.published_at,
    }))
    .sort((left, right) => left.episode_number - right.episode_number);

  const representativeEpisodePrice =
    publicEpisodes.find(
      (episode) => episode.access_type === "paid" && Number(episode.price ?? 0) > 0
    )?.price ?? 0;

  return {
    novel: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      short_description: row.short_description,
      description: row.description,
      cover_url: row.cover_url,
      banner_url: row.banner_url,
      status: row.status,
      is_translation: row.is_translation,
      free_episode_count: row.free_episode_count,
      total_episode_count: row.total_episode_count,
      reaction_score: row.reaction_score,
      view_count: row.view_count,
      bundle_list_price: row.bundle_list_price,
      bundle_sale_price: row.bundle_sale_price,
    },
    authorName: row.authors?.pen_name?.trim() || "INKROAD",
    tags: (row.novel_tags ?? [])
      .map((entry) => entry.tags?.name?.trim())
      .filter((value): value is string => Boolean(value)),
    representativeEpisodePrice: Number(representativeEpisodePrice ?? 0),
    episodes: publicEpisodes,
  };
}

async function fetchPublicNovelRows() {
  const result = await supabase
    .from("novels")
    .select(PUBLIC_NOVEL_SELECT)
    .neq("status", "draft");

  if (result.error) {
    throw result.error;
  }

  return (result.data ?? []).map((row) => toAggregate(row as RawNovelRow));
}

function sortByPopularity(left: Novel, right: Novel) {
  return right.views - left.views || right.rating - left.rating;
}

function getLatestPublishedAt(input: RemoteNovelAggregate) {
  return input.episodes.reduce((latest, episode) => {
    const timestamp = episode.published_at ? Date.parse(episode.published_at) : 0;
    return Math.max(latest, Number.isNaN(timestamp) ? 0 : timestamp);
  }, 0);
}

function sortAggregateByRecentUpdate(
  left: RemoteNovelAggregate,
  right: RemoteNovelAggregate
) {
  const leftPublishedAt = getLatestPublishedAt(left);
  const rightPublishedAt = getLatestPublishedAt(right);
  return rightPublishedAt - leftPublishedAt;
}

export function createReaderRepository() {
  return {
    async getHomeSections(): Promise<HomeSections> {
      const aggregates = await fetchPublicNovelRows();
      const novels = aggregates.map(mapRemoteNovelToMobileNovel);
      const popular = [...novels].sort(sortByPopularity).slice(0, 6);
      const sale = novels.filter((novel) => typeof novel.salePercent === "number").slice(0, 6);
      const recent = [...aggregates]
        .sort(sortAggregateByRecentUpdate)
        .map(mapRemoteNovelToMobileNovel)
        .slice(0, 6);

      return {
        hero: popular[0] ?? novels[0] ?? null,
        sale,
        popular,
        recent,
      };
    },

    async searchCatalog(): Promise<Novel[]> {
      return (await fetchPublicNovelRows()).map(mapRemoteNovelToMobileNovel);
    },

    async getNovelDetail(novelId: string): Promise<NovelDetailPayload | null> {
      const result = await supabase
        .from("novels")
        .select(PUBLIC_NOVEL_SELECT)
        .eq("id", novelId)
        .maybeSingle();

      if (result.error) {
        throw result.error;
      }

      if (!result.data) {
        return null;
      }

      const novel = mapRemoteNovelToMobileNovel(toAggregate(result.data as RawNovelRow));
      return {
        novel,
        episodes: novel.episodes,
      };
    },

    async getEpisodeView(
      novelId: string,
      episodeNumber: number
    ): Promise<EpisodeViewPayload | null> {
      const detail = await this.getNovelDetail(novelId);
      if (!detail) {
        return null;
      }

      const currentEpisode =
        detail.episodes.find((episode) => episode.number === episodeNumber) ??
        detail.episodes[0] ??
        null;

      if (!currentEpisode) {
        return null;
      }

      const currentIndex = detail.episodes.findIndex(
        (episode) => episode.number === currentEpisode.number
      );

      return {
        novel: detail.novel,
        episode: currentEpisode,
        previousEpisode: currentIndex > 0 ? detail.episodes[currentIndex - 1] : null,
        nextEpisode:
          currentIndex >= 0 && currentIndex < detail.episodes.length - 1
            ? detail.episodes[currentIndex + 1]
            : null,
      };
    },
  };
}
