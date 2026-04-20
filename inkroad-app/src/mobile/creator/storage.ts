import type {
  AuthorEpisodeHistoryEntry,
  AuthorWorkMeta,
  EpisodeDraft,
  EpisodePublicationState,
} from "../types";
import { appStorage } from "../utils/appStorage";

const STORAGE_PREFIX = "inkroad:draft:";
const HISTORY_PREFIX = "inkroad:history:";
const WORK_META_PREFIX = "inkroad:workmeta:";
const AUTHOR_PREFS_KEY = "inkroad:author:prefs";
const keyFor = (novelId: string, episodeId?: string) =>
  `${STORAGE_PREFIX}${novelId}:${episodeId ?? "new"}`;
const historyKeyFor = (novelId: string, episodeId?: string) =>
  `${HISTORY_PREFIX}${novelId}:${episodeId ?? "new"}`;
const workMetaKeyFor = (workId: string) => `${WORK_META_PREFIX}${workId}`;

export type DraftPublicationState = EpisodePublicationState;

export type StoredEpisodeDraft = EpisodeDraft & {
  updatedAt: number;
  publishedAt?: number;
  publicationState: DraftPublicationState;
};

type StoredHistoryEntry = {
  id: string;
  label: string;
  timestamp: number;
  state: DraftPublicationState;
};

type StoredAuthorPrefs = {
  activePenName?: string;
};

export type StoredEpisodeDraftEntry = {
  key: string;
  draft: StoredEpisodeDraft;
};

function isEpisodeDraft(value: unknown): value is EpisodeDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<StoredEpisodeDraft> & { accessType?: unknown };
  const hasValidAccessType = draft.accessType === "free" || draft.accessType === "paid";

  return (
    typeof draft.novelId === "string" &&
    (draft.episodeId === undefined || typeof draft.episodeId === "string") &&
    typeof draft.title === "string" &&
    hasValidAccessType &&
    typeof draft.price === "number" &&
    Number.isFinite(draft.price) &&
    typeof draft.body === "string" &&
    (draft.workflowStep === undefined ||
      draft.workflowStep === "draft" ||
      draft.workflowStep === "review" ||
      draft.workflowStep === "scheduled" ||
      draft.workflowStep === "published") &&
    (draft.episodeType === undefined ||
      draft.episodeType === "episode" ||
      draft.episodeType === "afterword" ||
      draft.episodeType === "notice" ||
      draft.episodeType === "private") &&
    (draft.ageRating === undefined ||
      draft.ageRating === "all" ||
      draft.ageRating === "15" ||
      draft.ageRating === "18") &&
    (draft.scheduledAt === undefined ||
      (typeof draft.scheduledAt === "number" && Number.isFinite(draft.scheduledAt))) &&
    (draft.updatedAt === undefined || (typeof draft.updatedAt === "number" && Number.isFinite(draft.updatedAt))) &&
    (draft.publishedAt === undefined ||
      (typeof draft.publishedAt === "number" && Number.isFinite(draft.publishedAt))) &&
    (draft.publicationState === undefined ||
      draft.publicationState === "draft" ||
      draft.publicationState === "scheduled" ||
      draft.publicationState === "published" ||
      draft.publicationState === "updated")
  );
}

function normalizeStoredDraft(value: unknown): StoredEpisodeDraft | null {
  if (!isEpisodeDraft(value)) return null;

  const draft = value as Partial<StoredEpisodeDraft>;
  const publishedAt = typeof draft.publishedAt === "number" && Number.isFinite(draft.publishedAt)
    ? draft.publishedAt
    : undefined;
  const publicationState: DraftPublicationState =
    draft.publicationState === "published" ||
    draft.publicationState === "scheduled" ||
    draft.publicationState === "updated" ||
    draft.publicationState === "draft"
      ? draft.publicationState
      : publishedAt !== undefined
        ? "published"
        : "draft";
  const scheduledAt = typeof draft.scheduledAt === "number" && Number.isFinite(draft.scheduledAt)
    ? draft.scheduledAt
    : undefined;

  return {
    novelId: draft.novelId,
    episodeId: draft.episodeId,
    title: draft.title,
    accessType: draft.accessType,
    price: draft.price,
    body: draft.body,
    workflowStep:
      draft.workflowStep ??
      (publicationState === "scheduled"
        ? "scheduled"
        : publicationState === "published"
        ? "published"
        : "draft"),
    episodeType: draft.episodeType ?? "episode",
    ageRating: draft.ageRating,
    scheduledAt,
    updatedAt: typeof draft.updatedAt === "number" && Number.isFinite(draft.updatedAt) ? draft.updatedAt : 0,
    publishedAt,
    publicationState,
  };
}

async function readStoredDraftRecord(novelId: string, episodeId?: string) {
  try {
    const raw = await appStorage.getItem(keyFor(novelId, episodeId));
    if (!raw) return null;

    return normalizeStoredDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function listLocalDrafts(): Promise<StoredEpisodeDraftEntry[]> {
  try {
    const keys = (await appStorage.getAllKeys()).filter((key) => key.startsWith(STORAGE_PREFIX));
    if (!keys.length) return [];

    const entries = await appStorage.multiGet(keys);
    return entries.flatMap(([key, raw]) => {
      if (!raw) return [];

      try {
        const draft = normalizeStoredDraft(JSON.parse(raw));
        return draft ? [{ key, draft }] : [];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

export async function saveLocalDraft(draft: EpisodeDraft) {
  const existing = await readStoredDraftRecord(draft.novelId, draft.episodeId);
  const requestedState = (draft as Partial<StoredEpisodeDraft>).publicationState;
  const publicationState: DraftPublicationState =
    existing?.publicationState === "published" || existing?.publicationState === "updated"
      ? "updated"
      : requestedState === "published" || requestedState === "updated" || requestedState === "scheduled"
      ? requestedState
      : existing?.publicationState === "scheduled"
      ? "scheduled"
      : existing?.publicationState ?? "draft";

  const storedDraft: StoredEpisodeDraft = {
    ...draft,
    workflowStep:
      publicationState === "scheduled"
        ? "scheduled"
        : publicationState === "published"
        ? "published"
        : publicationState === "updated"
        ? "draft"
        : draft.workflowStep ?? "draft",
    episodeType: draft.episodeType ?? existing?.episodeType ?? "episode",
    ageRating: draft.ageRating ?? existing?.ageRating,
    scheduledAt: publicationState === "scheduled" ? draft.scheduledAt ?? existing?.scheduledAt : undefined,
    updatedAt: Date.now(),
    publishedAt: existing?.publishedAt,
    publicationState,
  };

  await appStorage.setItem(keyFor(draft.novelId, draft.episodeId), JSON.stringify(storedDraft));
  await appendEpisodeHistory(storedDraft, storedDraft.title || "제목 없음");
  return storedDraft;
}

export async function publishLocalDraft(draft: EpisodeDraft) {
  const now = Date.now();
  const storedDraft: StoredEpisodeDraft = {
    ...draft,
    workflowStep: "published",
    episodeType: draft.episodeType ?? "episode",
    ageRating: draft.ageRating,
    scheduledAt: undefined,
    updatedAt: now,
    publishedAt: now,
    publicationState: "published",
  };

  await appStorage.setItem(keyFor(draft.novelId, draft.episodeId), JSON.stringify(storedDraft));
  await appendEpisodeHistory(storedDraft, storedDraft.title || "제목 없음");
  return storedDraft;
}

export async function loadLocalDraft(novelId: string, episodeId?: string) {
  try {
    return await readStoredDraftRecord(novelId, episodeId);
  } catch {
    return null;
  }
}

async function appendEpisodeHistory(draft: StoredEpisodeDraft, label: string) {
  const existing = await loadEpisodeHistory(draft.novelId, draft.episodeId);
  const nextEntry: StoredHistoryEntry = {
    id: `${draft.novelId}:${draft.episodeId ?? "new"}:${draft.updatedAt}`,
    label,
    timestamp: draft.updatedAt,
    state: draft.publicationState,
  };
  const nextHistory = [...existing, nextEntry].slice(-20);
  await appStorage.setItem(historyKeyFor(draft.novelId, draft.episodeId), JSON.stringify(nextHistory));
}

function normalizeHistoryEntries(value: unknown): StoredHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Partial<StoredHistoryEntry>;
    const hasState =
      item.state === "draft" ||
      item.state === "scheduled" ||
      item.state === "published" ||
      item.state === "updated";
    if (
      typeof item.id !== "string" ||
      typeof item.label !== "string" ||
      typeof item.timestamp !== "number" ||
      !Number.isFinite(item.timestamp) ||
      !hasState
    ) {
      return [];
    }
    return [{ id: item.id, label: item.label, timestamp: item.timestamp, state: item.state }];
  });
}

export async function loadEpisodeHistory(novelId: string, episodeId?: string): Promise<StoredHistoryEntry[]> {
  try {
    const raw = await appStorage.getItem(historyKeyFor(novelId, episodeId));
    if (!raw) return [];
    return normalizeHistoryEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function formatHistoryEntries(entries: StoredHistoryEntry[]): AuthorEpisodeHistoryEntry[] {
  return [...entries]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      timestamp: new Date(entry.timestamp).toISOString(),
      state: entry.state,
    }));
}

function normalizeWorkMeta(value: unknown): AuthorWorkMeta | null {
  if (!value || typeof value !== "object") return null;
  const meta = value as Partial<AuthorWorkMeta>;
  if (
    typeof meta.genre !== "string" ||
    !Array.isArray(meta.keywords) ||
    !meta.keywords.every((item) => typeof item === "string") ||
    (meta.ageRating !== "all" && meta.ageRating !== "15" && meta.ageRating !== "18") ||
    typeof meta.updateDay !== "string" ||
    typeof meta.hiatus !== "boolean"
  ) {
    return null;
  }
  return {
    genre: meta.genre,
    keywords: meta.keywords,
    ageRating: meta.ageRating,
    updateDay: meta.updateDay,
    hiatus: meta.hiatus,
  };
}

export async function loadStoredWorkMeta(workId: string) {
  try {
    const raw = await appStorage.getItem(workMetaKeyFor(workId));
    if (!raw) return null;
    return normalizeWorkMeta(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveStoredWorkMeta(workId: string, meta: AuthorWorkMeta) {
  await appStorage.setItem(workMetaKeyFor(workId), JSON.stringify(meta));
  return meta;
}

export async function loadAuthorPrefs(): Promise<StoredAuthorPrefs> {
  try {
    const raw = await appStorage.getItem(AUTHOR_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredAuthorPrefs;
    if (!parsed || typeof parsed !== "object") return {};
    return {
      activePenName: typeof parsed.activePenName === "string" ? parsed.activePenName : undefined,
    };
  } catch {
    return {};
  }
}

export async function saveAuthorPrefs(next: StoredAuthorPrefs) {
  await appStorage.setItem(AUTHOR_PREFS_KEY, JSON.stringify(next));
  return next;
}
