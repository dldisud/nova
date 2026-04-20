import type {
  AgeRating,
  AuthorEpisodeHistoryEntry,
  AuthorWorkMeta,
  EpisodeDraft,
  EpisodeType,
} from "../types";
import type { DraftPublicationState, StoredEpisodeDraft } from "./storage";

const REMOTE_NEW_SLOT_KEY = "__new__";

type RemoteCreatorPrefsRow = {
  user_id: string;
  active_pen_name: string | null;
};

type RemoteCreatorWorkMetaRow = {
  user_id: string;
  work_id: string;
  genre: string;
  keywords: string[] | null;
  age_rating: AgeRating;
  update_day: string;
  hiatus: boolean;
};

type RemoteCreatorDraftRow = {
  user_id: string;
  work_id: string;
  episode_id: string | null;
  slot_key: string;
  title: string;
  access_type: "free" | "paid";
  price: number | string | null;
  body: string;
  workflow_step: "draft" | "review" | "scheduled" | "published";
  episode_type: EpisodeType;
  age_rating: AgeRating | null;
  scheduled_at: string | null;
  publication_state: DraftPublicationState;
  published_at: string | null;
  updated_at: string | null;
};

type RemoteCreatorHistoryRow = {
  id: string;
  work_id: string;
  episode_id: string | null;
  label: string;
  state: DraftPublicationState;
  created_at: string | null;
};

function getSupabaseClient() {
  return require("../../../lib/supabase").supabase as typeof import("../../../lib/supabase").supabase;
}

function parseTimestamp(value?: string | number | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (!value) return undefined;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getDraftSlotKey(episodeId?: string) {
  return episodeId ?? REMOTE_NEW_SLOT_KEY;
}

function normalizeRemoteDraftRow(row: RemoteCreatorDraftRow): StoredEpisodeDraft {
  const updatedAt = parseTimestamp(row.updated_at) ?? Date.now();
  const publishedAt = parseTimestamp(row.published_at);
  const scheduledAt = parseTimestamp(row.scheduled_at);
  const publicationState = row.publication_state ?? (publishedAt ? "published" : "draft");

  return {
    novelId: row.work_id,
    episodeId: row.episode_id ?? undefined,
    title: row.title ?? "",
    accessType: row.access_type ?? "free",
    price: Number(row.price ?? 0),
    body: row.body ?? "",
    workflowStep:
      row.workflow_step ??
      (publicationState === "scheduled"
        ? "scheduled"
        : publicationState === "published"
        ? "published"
        : "draft"),
    episodeType: row.episode_type ?? "episode",
    ageRating: row.age_rating ?? undefined,
    scheduledAt,
    updatedAt,
    publishedAt,
    publicationState,
  };
}

function normalizeRemoteWorkMeta(row: RemoteCreatorWorkMetaRow): AuthorWorkMeta {
  return {
    genre: row.genre ?? "",
    keywords: row.keywords ?? [],
    ageRating: row.age_rating ?? "all",
    updateDay: row.update_day ?? "",
    hiatus: Boolean(row.hiatus),
  };
}

function normalizeRemoteHistoryEntries(rows: RemoteCreatorHistoryRow[]): AuthorEpisodeHistoryEntry[] {
  return rows
    .map((row) => ({
      id: row.id,
      label: row.label,
      timestamp: row.created_at ?? new Date().toISOString(),
      state: row.state,
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getCurrentUserId() {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user.id ?? null;
  } catch {
    return null;
  }
}

export async function listRemotePenNames(userId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("authors").select("pen_name").eq("user_id", userId);
    if (error || !data) return [];
    return data.flatMap((row: { pen_name?: string | null }) => (typeof row.pen_name === "string" ? [row.pen_name] : []));
  } catch {
    return [];
  }
}

export async function loadRemotePrefs(userId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("creator_author_preferences")
      .select("user_id, active_pen_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as RemoteCreatorPrefsRow;
  } catch {
    return null;
  }
}

export async function saveRemotePrefs(userId: string, activePenName: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("creator_author_preferences")
      .upsert({ user_id: userId, active_pen_name: activePenName }, { onConflict: "user_id" })
      .select("user_id, active_pen_name")
      .single();

    if (error || !data) return null;
    return data as RemoteCreatorPrefsRow;
  } catch {
    return null;
  }
}

export async function loadRemoteWorkMeta(userId: string, workId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("creator_work_meta")
      .select("user_id, work_id, genre, keywords, age_rating, update_day, hiatus")
      .eq("user_id", userId)
      .eq("work_id", workId)
      .maybeSingle();

    if (error || !data) return null;
    return normalizeRemoteWorkMeta(data as RemoteCreatorWorkMetaRow);
  } catch {
    return null;
  }
}

export async function saveRemoteWorkMeta(userId: string, workId: string, meta: AuthorWorkMeta) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("creator_work_meta")
      .upsert(
        {
          user_id: userId,
          work_id: workId,
          genre: meta.genre,
          keywords: meta.keywords,
          age_rating: meta.ageRating,
          update_day: meta.updateDay,
          hiatus: meta.hiatus,
        },
        { onConflict: "user_id,work_id" }
      )
      .select("user_id, work_id, genre, keywords, age_rating, update_day, hiatus")
      .single();

    if (error || !data) return null;
    return normalizeRemoteWorkMeta(data as RemoteCreatorWorkMetaRow);
  } catch {
    return null;
  }
}

export async function listRemoteDrafts(userId: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("creator_episode_drafts")
      .select(
        "user_id, work_id, episode_id, slot_key, title, access_type, price, body, workflow_step, episode_type, age_rating, scheduled_at, publication_state, published_at, updated_at"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error || !data) return null;
    return (data as RemoteCreatorDraftRow[]).map((row) => normalizeRemoteDraftRow(row));
  } catch {
    return null;
  }
}

export async function loadRemoteDraft(userId: string, workId: string, episodeId?: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("creator_episode_drafts")
      .select(
        "user_id, work_id, episode_id, slot_key, title, access_type, price, body, workflow_step, episode_type, age_rating, scheduled_at, publication_state, published_at, updated_at"
      )
      .eq("user_id", userId)
      .eq("work_id", workId)
      .eq("slot_key", getDraftSlotKey(episodeId))
      .maybeSingle();

    if (error || !data) return null;
    return normalizeRemoteDraftRow(data as RemoteCreatorDraftRow);
  } catch {
    return null;
  }
}

async function insertRemoteHistory(userId: string, draft: EpisodeDraft, state: DraftPublicationState) {
  try {
    const supabase = getSupabaseClient();
    await supabase.from("creator_episode_history").insert({
      user_id: userId,
      work_id: draft.novelId,
      episode_id: draft.episodeId ?? null,
      label: draft.title.trim() || "제목 없음",
      state,
    });
  } catch {
    // Ignore history write failures and keep the main draft flow intact.
  }
}

export async function upsertRemoteDraft(userId: string, draft: EpisodeDraft, mode: "save" | "publish") {
  const existing = await loadRemoteDraft(userId, draft.novelId, draft.episodeId);
  const nowIso = new Date().toISOString();
  const inferredState: DraftPublicationState =
    mode === "publish"
      ? "published"
      : draft.publicationState === "scheduled" || draft.workflowStep === "scheduled"
      ? "scheduled"
      : draft.publicationState === "published" || draft.publicationState === "updated"
      ? "updated"
      : existing?.publicationState === "published" || existing?.publicationState === "updated"
      ? "updated"
      : existing?.publicationState === "scheduled"
      ? "scheduled"
      : "draft";

  const workflowStep =
    mode === "publish"
      ? "published"
      : draft.workflowStep ??
        (inferredState === "scheduled"
          ? "scheduled"
          : inferredState === "published"
          ? "published"
          : "draft");

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("creator_episode_drafts")
      .upsert(
        {
          user_id: userId,
          work_id: draft.novelId,
          episode_id: draft.episodeId ?? null,
          slot_key: getDraftSlotKey(draft.episodeId),
          title: draft.title,
          access_type: draft.accessType,
          price: draft.accessType === "free" ? 0 : draft.price,
          body: draft.body,
          workflow_step: workflowStep,
          episode_type: draft.episodeType ?? existing?.episodeType ?? "episode",
          age_rating: draft.ageRating ?? existing?.ageRating ?? null,
          scheduled_at:
            mode === "publish"
              ? null
              : draft.scheduledAt
              ? new Date(draft.scheduledAt).toISOString()
              : null,
          publication_state: inferredState,
          published_at:
            mode === "publish"
              ? nowIso
              : existing?.publishedAt
              ? new Date(existing.publishedAt).toISOString()
              : null,
        },
        { onConflict: "user_id,work_id,slot_key" }
      )
      .select(
        "user_id, work_id, episode_id, slot_key, title, access_type, price, body, workflow_step, episode_type, age_rating, scheduled_at, publication_state, published_at, updated_at"
      )
      .single();

    if (error || !data) return null;
    await insertRemoteHistory(userId, draft, inferredState);
    return normalizeRemoteDraftRow(data as RemoteCreatorDraftRow);
  } catch {
    return null;
  }
}

export async function listRemoteHistory(userId: string, workId: string, episodeId?: string) {
  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from("creator_episode_history")
      .select("id, work_id, episode_id, label, state, created_at")
      .eq("user_id", userId)
      .eq("work_id", workId)
      .order("created_at", { ascending: false });

    query = episodeId ? query.eq("episode_id", episodeId) : query.is("episode_id", null);

    const { data, error } = await query;
    if (error || !data) return null;
    return normalizeRemoteHistoryEntries(data as RemoteCreatorHistoryRow[]);
  } catch {
    return null;
  }
}
