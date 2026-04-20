import { supabase } from "../../../lib/supabase";
import type { LibraryShelf, Novel } from "../types";
import { calculateSalePercent } from "./mappers";
import type {
  ReaderAccountProfile,
  ReaderLibraryShelfItem,
  ReaderProfileAvatarUploadInput,
  ReaderProfileAvatarUploadResult,
  ReaderProfileSettingsInput,
  ReaderSupportTicketInput,
  ReaderSupportTicketResult,
} from "./types";

type SessionProfileSeed = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type LibraryDataResult = {
  profile: ReaderAccountProfile;
  shelves: Record<LibraryShelf, ReaderLibraryShelfItem[]>;
};

type ProfileDataResult = {
  profile: ReaderAccountProfile;
  stats: {
    readingCount: number;
    wishlistCount: number;
    purchasedCount: number;
  };
};

type RawNovelRecord = {
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
  authors?: { pen_name?: string | null } | Array<{ pen_name?: string | null }> | null;
  novel_tags?: Array<{ tags?: { name?: string | null } | Array<{ name?: string | null }> | null }> | null;
};

type RawLibraryRecord = {
  id: string;
  state: LibraryShelf;
  is_bookmarked: boolean;
  notifications_enabled: boolean;
  last_read_at: string | null;
  updated_at: string | null;
  last_read_episode_id: string | null;
  novel: RawNovelRecord | RawNovelRecord[] | null;
  episode?: { id: string; episode_number: number; title: string } | Array<{ id: string; episode_number: number; title: string }> | null;
};

type RawPurchaseRecord = {
  id: string;
  purchase_type: string;
  amount_paid: number | null;
  purchased_at: string | null;
  novel: RawNovelRecord | RawNovelRecord[] | null;
  episode?:
    | {
        id: string;
        episode_number: number;
        title: string;
        novel?: RawNovelRecord | RawNovelRecord[] | null;
      }
    | Array<{
        id: string;
        episode_number: number;
        title: string;
        novel?: RawNovelRecord | RawNovelRecord[] | null;
      }>
    | null;
};

const LIBRARY_NOVEL_FIELDS = `
  id,slug,title,short_description,description,cover_url,banner_url,status,is_translation,
  free_episode_count,total_episode_count,reaction_score,view_count,bundle_list_price,bundle_sale_price,
  authors:author_id ( pen_name ),
  novel_tags ( tags:tag_id ( name ) )
`;

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function toDisplayName(seed: SessionProfileSeed, profile: { display_name?: string | null } | null) {
  const meta = seed.user_metadata ?? {};
  const values = [
    profile?.display_name,
    typeof meta.display_name === "string" ? meta.display_name : null,
    typeof meta.pen_name === "string" ? meta.pen_name : null,
    typeof meta.full_name === "string" ? meta.full_name : null,
    typeof meta.name === "string" ? meta.name : null,
    seed.email,
    "독자",
  ];

  return values.find((value): value is string => Boolean(value && String(value).trim())) ?? "독자";
}

function mapNovelRecord(record: RawNovelRecord): Novel {
  const author = unwrapRelation(record.authors)?.pen_name?.trim() || "INKROAD";
  const tags = (record.novel_tags ?? [])
    .map((entry) => unwrapRelation(entry.tags)?.name?.trim())
    .filter((value): value is string => Boolean(value));

  return {
    id: record.id,
    title: record.title,
    author,
    coverUrl: record.cover_url ?? "",
    heroImageUrl: record.banner_url ?? record.cover_url ?? "",
    tagline: record.short_description ?? "",
    synopsis: record.description,
    tags,
    views: Number(record.view_count ?? 0),
    rating: Number(record.reaction_score ?? 0),
    totalEpisodes: Number(record.total_episode_count ?? 0),
    freeEpisodes: Number(record.free_episode_count ?? 0),
    pricePerEpisode: Number(record.bundle_list_price ?? 0),
    salePercent: calculateSalePercent(record.bundle_list_price, record.bundle_sale_price),
    salePrice: record.bundle_sale_price ?? undefined,
    status: record.status === "completed" ? "완결" : "연재중",
    source: "INKROAD",
    episodes: [],
  };
}

function calculateReadingProgress(item: {
  episode: { episode_number: number } | null;
  novel: Novel;
}) {
  const episodeNumber = Number(item.episode?.episode_number ?? 0);
  const totalEpisodes = Number(item.novel.totalEpisodes ?? 0);
  if (!episodeNumber || !totalEpisodes) {
    return 0;
  }

  return Math.max(1, Math.min(100, Math.round((episodeNumber / totalEpisodes) * 100)));
}

function sortByRecent<T extends { last_read_at?: string | null; updated_at?: string | null; purchased_at?: string | null }>(
  items: T[]
) {
  return items.slice().sort((left, right) => {
    const leftTime = new Date(left.last_read_at || left.updated_at || left.purchased_at || 0).getTime();
    const rightTime = new Date(right.last_read_at || right.updated_at || right.purchased_at || 0).getTime();
    return rightTime - leftTime;
  });
}

function aggregatePurchasedNovels(purchases: RawPurchaseRecord[]) {
  const byNovel = new Map<
    string,
    {
      id: string;
      novel: Novel;
      amountPaid: number;
      purchasedAt: string | null;
      latestEpisodeNumber?: number;
      purchaseType: string;
      bundleOwned: boolean;
    }
  >();

  purchases.forEach((purchase) => {
    const directNovel = unwrapRelation(purchase.novel);
    const episode = unwrapRelation(purchase.episode);
    const episodeNovel = episode ? unwrapRelation(episode.novel) : null;
    const sourceNovel = directNovel || episodeNovel;

    if (!sourceNovel?.id) {
      return;
    }

    const key = sourceNovel.id;
    const current = byNovel.get(key) ?? {
      id: purchase.id,
      novel: mapNovelRecord(sourceNovel),
      amountPaid: 0,
      purchasedAt: purchase.purchased_at,
      latestEpisodeNumber: undefined,
      purchaseType: purchase.purchase_type,
      bundleOwned: false,
    };

    current.amountPaid += Number(purchase.amount_paid ?? 0);
    current.bundleOwned = current.bundleOwned || purchase.purchase_type === "bundle";

    if (
      episode?.episode_number &&
      (!current.latestEpisodeNumber || episode.episode_number >= current.latestEpisodeNumber)
    ) {
      current.latestEpisodeNumber = episode.episode_number;
    }

    if (
      new Date(purchase.purchased_at || 0).getTime() >=
      new Date(current.purchasedAt || 0).getTime()
    ) {
      current.purchasedAt = purchase.purchased_at;
    }

    current.purchaseType = current.bundleOwned ? "bundle" : "episode";
    byNovel.set(key, current);
  });

  return Array.from(byNovel.values()).sort((left, right) => {
    return new Date(right.purchasedAt || 0).getTime() - new Date(left.purchasedAt || 0).getTime();
  });
}

async function fetchProfileRecord(userId: string) {
  const result = await supabase
    .from("profiles")
    .select("id, display_name, role, marketing_opt_in, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

async function fetchCreatorLink(userId: string) {
  const result = await supabase.from("authors").select("id").eq("user_id", userId);
  if (result.error) {
    throw result.error;
  }
  return (result.data ?? []).length > 0;
}

function buildProfile(
  userId: string,
  seed: SessionProfileSeed,
  profile: {
    display_name?: string | null;
    role?: string | null;
    marketing_opt_in?: boolean | null;
    avatar_url?: string | null;
  } | null,
  isCreator: boolean
): ReaderAccountProfile {
  return {
    id: userId,
    displayName: toDisplayName(seed, profile),
    email: seed.email ?? "",
    role: profile?.role ?? "reader",
    isCreator,
    marketingOptIn: Boolean(profile?.marketing_opt_in),
    avatarUrl: profile?.avatar_url ?? null,
  };
}

export function createAccountRepository() {
  return {
    async getLibraryData(userId: string, seed: SessionProfileSeed): Promise<LibraryDataResult> {
      const [profile, isCreator, libraryResult, purchasesResult] = await Promise.all([
        fetchProfileRecord(userId),
        fetchCreatorLink(userId),
        supabase
          .from("library_items")
          .select(
            `id,state,is_bookmarked,notifications_enabled,last_read_at,updated_at,last_read_episode_id,novel:novels(${LIBRARY_NOVEL_FIELDS}),episode:episodes(id,episode_number,title)`
          )
          .eq("user_id", userId),
        supabase
          .from("purchases")
          .select(
            `id,purchase_type,amount_paid,purchased_at,novel:novels(${LIBRARY_NOVEL_FIELDS}),episode:episodes(id,episode_number,title,novel_id,novel:novels(${LIBRARY_NOVEL_FIELDS}))`
          )
          .eq("user_id", userId)
          .order("purchased_at", { ascending: false }),
      ]);

      if (libraryResult.error) {
        throw libraryResult.error;
      }
      if (purchasesResult.error) {
        throw purchasesResult.error;
      }

      const libraryItems = sortByRecent(
        (libraryResult.data ?? [])
          .map((item) => item as RawLibraryRecord)
          .map((item) => {
            const novelRecord = unwrapRelation(item.novel);
            const episodeRecord = unwrapRelation(item.episode);
            if (!novelRecord) {
              return null;
            }

            const novel = mapNovelRecord(novelRecord);
            return {
              id: item.id,
              state: item.state,
              isBookmarked: item.is_bookmarked,
              novel,
              episode: episodeRecord,
              readProgress: calculateReadingProgress({ novel, episode: episodeRecord }),
              last_read_at: item.last_read_at,
              updated_at: item.updated_at,
            };
          })
          .filter(
            (
              item
            ): item is {
              id: string;
              state: LibraryShelf;
              isBookmarked: boolean;
              novel: Novel;
              episode: { id: string; episode_number: number; title: string } | null;
              readProgress: number;
              last_read_at: string | null;
              updated_at: string | null;
            } => Boolean(item)
          )
      );

      const purchases = (purchasesResult.data ?? []).map((item) => item as RawPurchaseRecord);
      const purchasedNovels = aggregatePurchasedNovels(purchases).map<ReaderLibraryShelfItem>((item) => ({
        id: item.id,
        novel: item.novel,
        amountPaid: item.amountPaid,
        purchasedAt: item.purchasedAt ?? undefined,
        lastEpisodeNumber: item.latestEpisodeNumber,
      }));

      return {
        profile: buildProfile(userId, seed, profile, isCreator),
        shelves: {
          reading: libraryItems
            .filter((item) => item.state === "reading")
            .map((item) => ({
              id: item.id,
              novel: item.novel,
              readProgress: item.readProgress,
              lastEpisodeNumber: item.episode?.episode_number,
            })),
          wishlist: libraryItems
            .filter((item) => item.isBookmarked)
            .map((item) => ({
              id: item.id,
              novel: item.novel,
            })),
          purchased: purchasedNovels,
        },
      };
    },

    async getProfileData(userId: string, seed: SessionProfileSeed): Promise<ProfileDataResult> {
      const libraryData = await this.getLibraryData(userId, seed);
      return {
        profile: libraryData.profile,
        stats: {
          readingCount: libraryData.shelves.reading.length,
          wishlistCount: libraryData.shelves.wishlist.length,
          purchasedCount: libraryData.shelves.purchased.length,
        },
      };
    },

    async updateProfileSettings(
      userId: string,
      input: ReaderProfileSettingsInput
    ): Promise<ReaderAccountProfile> {
      const displayName = input.displayName.trim();

      if (!displayName) {
        throw new Error("닉네임을 입력해 주세요.");
      }

      if (displayName.length > 20) {
        throw new Error("닉네임은 20자 이하로 입력해 주세요.");
      }

      const result = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          marketing_opt_in: input.marketingOptIn,
        })
        .eq("id", userId)
        .select("id, display_name, role, marketing_opt_in")
        .maybeSingle();

      if (result.error) {
        throw result.error;
      }

      return buildProfile(
        userId,
        { email: input.email, user_metadata: { display_name: displayName } },
        result.data,
        false
      );
    },

    async uploadProfileAvatar(
      userId: string,
      input: ReaderProfileAvatarUploadInput
    ): Promise<ReaderProfileAvatarUploadResult> {
      const fileName = `${userId}/avatar-${Date.now()}.jpg`;
      const dataUri = `data:${input.mimeType};base64,${input.base64}`;
      const avatarBlob = await fetch(dataUri).then((response) => response.blob());
      const storage = supabase.storage.from("profile-avatars");
      const uploadResult = await storage.upload(fileName, avatarBlob, {
        contentType: input.mimeType,
        upsert: true,
      });

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const { data: publicData } = storage.getPublicUrl(uploadResult.data.path);
      const avatarUrl = publicData.publicUrl;

      const profileResult = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId)
        .select("id, display_name, role, marketing_opt_in, avatar_url")
        .maybeSingle();

      if (profileResult.error) {
        throw profileResult.error;
      }

      return { avatarUrl };
    },

    async submitSupportTicket(
      userId: string,
      input: ReaderSupportTicketInput
    ): Promise<ReaderSupportTicketResult> {
      const subject = input.subject.trim();
      const message = input.message.trim();

      if (!subject || !message) {
        throw new Error("문의 제목과 내용을 입력해 주세요.");
      }

      const ticketResult = await supabase
        .from("support_tickets")
        .insert({
          user_id: userId,
          email: input.email,
          category: input.category,
          subject,
          message,
        })
        .select("id")
        .maybeSingle();

      if (ticketResult.error || !ticketResult.data?.id) {
        throw ticketResult.error ?? new Error("문의 접수에 실패했습니다.");
      }

      const notifyResult = await supabase.functions.invoke("notify-support-ticket", {
        body: {
          ticketId: ticketResult.data.id,
          userId,
          email: input.email,
          category: input.category,
          subject,
          message,
        },
      });

      return {
        ticketId: ticketResult.data.id,
        notificationStatus: notifyResult.error ? "deferred" : "sent",
      };
    },
  };
}
