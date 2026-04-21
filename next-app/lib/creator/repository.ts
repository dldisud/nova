/* ── Author Repository (web version, ported from mobile) ── */

import * as remote from "./remote-backend";
import type {
  AuthorDashboardSummary,
  AuthorEpisodeHistoryEntry,
  AuthorEpisodeSummary,
  AuthorReaction,
  AuthorRepository,
  AuthorWorkMeta,
  AuthorWorkSummary,
  EpisodeDraft,
  EpisodePublicationState,
  PublishStatus,
  StoredEpisodeDraft,
} from "@/lib/types";

/* ── localStorage helpers (replaces AsyncStorage) ── */

const LS_PREFIX = "inkroad:creator:";

function lsGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // quota exceeded – ignore
  }
}

function nowStamp() {
  return new Date().toISOString();
}

/* ── Factory ── */

export async function createAuthorRepository(): Promise<AuthorRepository> {
  const userId = await remote.getCurrentUserId();

  async function listWorks(): Promise<AuthorWorkSummary[]> {
    if (!userId) return [];
    const remoteWorks = await remote.listRemoteWorks(userId);
    return remoteWorks.map(
      (w: Record<string, unknown>): AuthorWorkSummary => ({
        id: String(w.id ?? ""),
        title: String(w.title ?? ""),
        coverUrl: String(w.cover_url ?? w.coverUrl ?? "/placeholder.png"),
        status: w.status === "완결" ? "완결" : "연재중",
        totalEpisodes: Number(w.total_episodes ?? w.totalEpisodes ?? 0),
        updatedAt: String(w.updated_at ?? w.updatedAt ?? nowStamp()),
        totalViews: Number(w.views ?? w.totalViews ?? 0),
      }),
    );
  }

  async function getDashboardSummary(): Promise<AuthorDashboardSummary> {
    const works = await listWorks();
    const penNames = await listPenNames();
    const activePenName = await getActivePenName();

    let stats: Record<string, unknown> | null = null;
    if (userId) {
      stats = await remote.listRemoteDashboardStats(userId);
    }

    const allDrafts = userId ? (await remote.listRemoteDrafts(userId)) ?? [] : [];
    const draftCount = allDrafts.filter(
      (d) => !d.publicationState || d.publicationState === "draft",
    ).length;

    return {
      totalViews: Number(stats?.total_views ?? 0),
      weeklyViews: Number(stats?.weekly_views ?? 0),
      draftCount,
      cadence: String(stats?.cadence ?? "분석중"),
      nextDue: String(stats?.next_due ?? "미정"),
      streak: Number(stats?.streak ?? 0),
      overdueWarning: stats?.overdue_warning
        ? String(stats.overdue_warning)
        : null,
      monthlyRevenue: Number(stats?.monthly_revenue ?? 0),
      settlementDate: String(stats?.settlement_date ?? "매월 25일"),
      totalRevenue: Number(stats?.total_revenue ?? 0),
      inbox: [],
      penNames,
      activePenName,
    };
  }

  async function listPenNames(): Promise<string[]> {
    if (!userId) return ["작가"];
    const names = await remote.listRemotePenNames(userId);
    return names.length ? names : ["작가"];
  }

  async function getActivePenName(): Promise<string> {
    if (!userId) return "작가";
    const prefs = await remote.loadRemotePrefs(userId);
    return prefs?.active_pen_name ?? (await listPenNames())[0] ?? "작가";
  }

  async function setActivePenName(name: string): Promise<string> {
    if (!userId) return name;
    await remote.saveRemotePrefs(userId, name);
    return name;
  }

  async function getWork(workId: string): Promise<AuthorWorkSummary | null> {
    const works = await listWorks();
    return works.find((w) => w.id === workId) ?? null;
  }

  async function getWorkMeta(workId: string): Promise<AuthorWorkMeta | null> {
    // Try remote first, fallback to local
    if (userId) {
      const remoteMeta = await remote.loadRemoteWorkMeta(userId, workId);
      if (remoteMeta) return remoteMeta;
    }
    return (
      lsGet<AuthorWorkMeta>(`workMeta:${workId}`) ?? {
        genre: "",
        keywords: [],
        ageRating: "all" as const,
        updateDay: "",
        hiatus: false,
      }
    );
  }

  async function saveWorkMeta(
    workId: string,
    patch: Partial<AuthorWorkMeta>,
  ): Promise<AuthorWorkMeta | null> {
    const current = (await getWorkMeta(workId)) ?? {
      genre: "",
      keywords: [],
      ageRating: "all" as const,
      updateDay: "",
      hiatus: false,
    };
    const merged: AuthorWorkMeta = { ...current, ...patch };
    lsSet(`workMeta:${workId}`, merged);

    if (userId) {
      const remoteSaved = await remote.saveRemoteWorkMeta(userId, workId, merged);
      if (remoteSaved) return remoteSaved;
    }
    return merged;
  }

  async function listEpisodes(workId: string): Promise<AuthorEpisodeSummary[]> {
    if (!userId) return [];
    const allDrafts = (await remote.listRemoteDrafts(userId)) ?? [];
    const workDrafts = allDrafts.filter((d) => d.novelId === workId);
    return workDrafts.map(
      (d, i): AuthorEpisodeSummary => ({
        id: d.episodeId ?? `${workId}-draft-new`,
        novelId: workId,
        number: i + 1,
        title: d.title || `에피소드 ${i + 1}`,
        accessType: d.accessType,
        price: d.price,
        updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : nowStamp(),
        publishStatus: toPublishStatus(d.publicationState),
        publicationState: d.publicationState ?? "draft",
        episodeType: d.episodeType ?? "episode",
        ageRating: d.ageRating,
        scheduledAt: d.scheduledAt
          ? new Date(d.scheduledAt).toISOString()
          : undefined,
        publishedAt: d.publishedAt
          ? new Date(d.publishedAt).toISOString()
          : undefined,
        hasLocalChanges: false,
      }),
    );
  }

  async function listReaderReactions(
    _workId: string,
  ): Promise<AuthorReaction[]> {
    // TODO: Implement when reactions table is ready
    return [];
  }

  async function listEpisodeHistory(
    workId: string,
    episodeId?: string,
  ): Promise<AuthorEpisodeHistoryEntry[]> {
    if (!userId) return [];
    return (await remote.listRemoteHistory(userId, workId, episodeId)) ?? [];
  }

  async function loadDraft(
    workId: string,
    episodeId?: string,
  ): Promise<EpisodeDraft> {
    // Try remote
    if (userId) {
      const remoteDraft = await remote.loadRemoteDraft(userId, workId, episodeId);
      if (remoteDraft) return remoteDraft;
    }

    // Try local
    const localKey = `draft:${workId}:${episodeId ?? "new"}`;
    const localDraft = lsGet<StoredEpisodeDraft>(localKey);
    if (localDraft) return localDraft;

    // New empty draft
    return {
      novelId: workId,
      episodeId,
      title: "",
      accessType: "free",
      price: 0,
      body: "",
      workflowStep: "draft",
      episodeType: "episode",
    };
  }

  async function getMostRecentDraft(): Promise<EpisodeDraft | null> {
    if (!userId) return null;
    const allDrafts = (await remote.listRemoteDrafts(userId)) ?? [];
    return allDrafts.length ? allDrafts[0] : null;
  }

  async function saveDraft(input: EpisodeDraft): Promise<EpisodeDraft> {
    const localKey = `draft:${input.novelId}:${input.episodeId ?? "new"}`;
    const now = Date.now();
    const stored: StoredEpisodeDraft = { ...input, updatedAt: now };
    lsSet(localKey, stored);

    if (userId) {
      const remoteSaved = await remote.upsertRemoteDraft(userId, input, "save");
      if (remoteSaved) return remoteSaved;
    }
    return stored;
  }

  async function publishDraft(input: EpisodeDraft): Promise<EpisodeDraft> {
    if (userId) {
      const result = await remote.upsertRemoteDraft(userId, input, "publish");
      if (result) return result;
    }
    return { ...input, publicationState: "published", publishedAt: Date.now() };
  }

  return {
    listWorks,
    getDashboardSummary,
    listPenNames,
    getActivePenName,
    setActivePenName,
    getWork,
    getWorkMeta,
    saveWorkMeta,
    listEpisodes,
    listReaderReactions,
    listEpisodeHistory,
    loadDraft,
    getMostRecentDraft,
    saveDraft,
    publishDraft,
  };
}

/* ── Helpers ── */

function toPublishStatus(state?: EpisodePublicationState): PublishStatus {
  if (state === "published" || state === "updated") return "published";
  if (state === "scheduled") return "scheduled";
  return "draft";
}
