import { getNovelById, mockProfile, novels } from "../data/mockInkroad";
import type {
  AuthorDashboardSummary,
  AuthorEpisodeHistoryEntry,
  AuthorEpisodeSummary,
  AuthorInboxItem,
  AuthorReaction,
  AuthorWorkMeta,
  AuthorWorkSummary,
  EpisodeDraft,
  EpisodePublicationState,
  PublishStatus,
} from "../types";
import {
  formatHistoryEntries,
  listLocalDrafts,
  loadAuthorPrefs,
  loadEpisodeHistory,
  loadLocalDraft,
  loadStoredWorkMeta,
  publishLocalDraft,
  saveAuthorPrefs,
  saveLocalDraft,
  saveStoredWorkMeta,
  type DraftPublicationState,
  type StoredEpisodeDraft,
} from "./storage";
import * as remoteBackend from "./remoteBackend";
import type { AuthorRepository } from "./types";

function nowStamp() {
  return new Date().toISOString();
}

const DEFAULT_PEN_NAMES = [mockProfile.name, `${mockProfile.name} 스튜디오`, "잉크로드"];
const UPDATE_DAY_BY_WORK: Record<string, string> = {
  "whan-book": "매주 수요일",
  "abyssal-librarian": "매주 화요일",
  "academy-outcast": "매주 금요일",
  "midnight-rail": "매주 목요일",
  "northern-ledger": "완결",
  "galactic-librarians": "매주 일요일",
};

type EpisodeModel = {
  id: string;
  novelId: string;
  number: number;
  title: string;
  accessType: "free" | "paid";
  price: number;
  body: string;
};

type DraftWithPublicationState = EpisodeDraft & {
  updatedAt?: number;
  publishedAt?: number;
  publicationState?: DraftPublicationState;
};

function compareStoredDrafts(a: StoredEpisodeDraft, b: StoredEpisodeDraft) {
  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt - b.updatedAt;
  }

  const aKey = `${a.novelId}:${a.episodeId ?? "new"}`;
  const bKey = `${b.novelId}:${b.episodeId ?? "new"}`;
  return aKey.localeCompare(bKey);
}

function getDraftStorageKey(novelId: string, episodeId?: string) {
  return `${novelId}:${episodeId ?? "new"}`;
}

function getPublicationPriority(state?: DraftPublicationState) {
  switch (state) {
    case "published":
      return 3;
    case "updated":
      return 2;
    case "scheduled":
      return 1;
    default:
      return 0;
  }
}

function pickPreferredDraft(
  current: StoredEpisodeDraft | null | undefined,
  candidate: StoredEpisodeDraft | null | undefined
) {
  if (!current) return candidate ?? null;
  if (!candidate) return current;

  const currentUpdatedAt = current.updatedAt ?? 0;
  const candidateUpdatedAt = candidate.updatedAt ?? 0;
  if (currentUpdatedAt !== candidateUpdatedAt) {
    return candidateUpdatedAt > currentUpdatedAt ? candidate : current;
  }

  const currentPriority = getPublicationPriority(current.publicationState);
  const candidatePriority = getPublicationPriority(candidate.publicationState);
  if (currentPriority !== candidatePriority) {
    return candidatePriority > currentPriority ? candidate : current;
  }

  const currentPublishedAt = current.publishedAt ?? 0;
  const candidatePublishedAt = candidate.publishedAt ?? 0;
  if (currentPublishedAt !== candidatePublishedAt) {
    return candidatePublishedAt > currentPublishedAt ? candidate : current;
  }

  return compareStoredDrafts(current, candidate) <= 0 ? candidate : current;
}

function dedupeDrafts(drafts: StoredEpisodeDraft[]) {
  const byKey = new Map<string, StoredEpisodeDraft>();
  for (const draft of drafts) {
    const key = getDraftStorageKey(draft.novelId, draft.episodeId);
    byKey.set(key, pickPreferredDraft(byKey.get(key), draft) ?? draft);
  }
  return [...byKey.values()];
}

function dedupePenNames(names: Array<string | null | undefined>) {
  return [...new Set(names.filter((value): value is string => Boolean(value && value.trim())).map((value) => value.trim()))];
}

export function markDraftAsEdited(draft: DraftWithPublicationState): DraftWithPublicationState {
  const publicationState =
    draft.publicationState === "published" || draft.publicationState === "updated"
      ? "updated"
      : draft.publicationState === "scheduled"
      ? "scheduled"
      : draft.publicationState ?? "draft";

  return {
    ...draft,
    publicationState,
    workflowStep:
      publicationState === "scheduled"
        ? "scheduled"
        : publicationState === "published"
        ? "published"
        : draft.workflowStep ?? "draft",
  };
}

export function getDraftStatusMessage(draft: DraftWithPublicationState) {
  if (draft.publicationState === "scheduled" && draft.scheduledAt) {
    return `예약됨 · ${formatScheduledLabel(draft.scheduledAt)}`;
  }

  if (draft.publicationState === "published") {
    return "발행됨";
  }

  if (draft.publicationState === "updated") {
    return "발행 후 수정 중";
  }

  if (!draft.updatedAt) {
    return "본문을 입력해 주세요.";
  }

  return "초안 저장됨";
}

function buildEpisodeModel(work: (typeof novels)[number], number: number): EpisodeModel {
  const seededEpisode = work.episodes[number - 1];
  if (seededEpisode) {
    return {
      id: seededEpisode.id,
      novelId: work.id,
      number: seededEpisode.number,
      title: seededEpisode.title,
      accessType: seededEpisode.isFree ? "free" : "paid",
      price: seededEpisode.price,
      body: seededEpisode.body,
    };
  }

  const isFree = number <= work.freeEpisodes;

  return {
    id: `${work.id}-ep-${number}`,
    novelId: work.id,
    number,
    title: `${number}화`,
    accessType: isFree ? "free" : "paid",
    price: isFree ? 0 : work.pricePerEpisode,
    body: "",
  };
}
function resolveEpisodeNumber(work: (typeof novels)[number], episodeId?: string) {
  if (!episodeId) return null;

  const seededEpisode = work.episodes.find((episode) => episode.id === episodeId);
  if (seededEpisode) return seededEpisode.number;

  const prefix = `${work.id}-ep-`;
  if (!episodeId.startsWith(prefix)) return null;

  const number = Number(episodeId.slice(prefix.length));
  if (!Number.isInteger(number)) return null;
  if (number < 1 || number > work.totalEpisodes + 1) return null;

  return number;
}

function toPublishStatus(publicationState: EpisodePublicationState): PublishStatus {
  if (publicationState === "scheduled") return "scheduled";
  if (publicationState === "draft") return "draft";
  return "published";
}

function toIsoStamp(value?: number) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function formatScheduledLabel(value: number) {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours() < 12 ? "오전" : "오후"} ${date.getHours() % 12 || 12}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatRelativeDue(value?: number) {
  if (!value) return "예정 없음";
  const now = Date.now();
  const diffDays = Math.max(0, Math.round((value - now) / 86_400_000));
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "내일";
  return `${diffDays}일 후`;
}

function formatSettlementDate() {
  const now = new Date();
  const settlement = new Date(now.getFullYear(), now.getMonth(), 25);
  if (now.getDate() > 25) {
    settlement.setMonth(settlement.getMonth() + 1);
  }
  return `${settlement.getMonth() + 1}월 ${settlement.getDate()}일`;
}

function inferDefaultWorkMeta(work: (typeof novels)[number]): AuthorWorkMeta {
  return {
    genre: work.tags.slice(0, 2).join(" · "),
    keywords: work.tags.map((tag) => `#${tag}`),
    ageRating: "all",
    updateDay: UPDATE_DAY_BY_WORK[work.id] ?? "매주 수요일",
    hiatus: false,
  };
}

async function getMergedWorkMeta(workId: string) {
  const work = getNovelById(workId);
  if (!work) return null;

  const defaultMeta = inferDefaultWorkMeta(work);
  const userId = await remoteBackend.getCurrentUserId();
  if (userId) {
    const remoteMeta = await remoteBackend.loadRemoteWorkMeta(userId, workId);
    if (remoteMeta) {
      return {
        ...defaultMeta,
        ...remoteMeta,
        keywords: remoteMeta.keywords.length ? remoteMeta.keywords : defaultMeta.keywords,
      } satisfies AuthorWorkMeta;
    }
  }

  const localMeta = await loadStoredWorkMeta(workId);
  if (localMeta) {
    return {
      ...defaultMeta,
      ...localMeta,
      keywords: localMeta.keywords.length ? localMeta.keywords : defaultMeta.keywords,
    } satisfies AuthorWorkMeta;
  }

  return defaultMeta;
}

function buildEpisodeSummaries(workId: string, drafts: StoredEpisodeDraft[]): AuthorEpisodeSummary[] {
  const work = getNovelById(workId);
  if (!work) return [];

  const workDrafts = drafts.filter((draft) => draft.novelId === workId);
  const draftByEpisodeId = new Map(
    workDrafts.filter((draft) => Boolean(draft.episodeId)).map((draft) => [draft.episodeId as string, draft])
  );

  const summaries = Array.from({ length: work.totalEpisodes }, (_, index) => {
    const seeded = buildEpisodeModel(work, index + 1);
    const localDraft = draftByEpisodeId.get(seeded.id);
    const publicationState = localDraft?.publicationState ?? "published";

    return {
      id: seeded.id,
      novelId: seeded.novelId,
      number: seeded.number,
      title: localDraft?.title || seeded.title,
      accessType: localDraft?.accessType ?? seeded.accessType,
      price: localDraft?.price ?? seeded.price,
      updatedAt: localDraft?.updatedAt ? new Date(localDraft.updatedAt).toISOString() : nowStamp(),
      publishStatus: toPublishStatus(publicationState),
      publicationState,
      episodeType: localDraft?.episodeType ?? "episode",
      ageRating: localDraft?.ageRating,
      scheduledAt: localDraft?.scheduledAt ? formatScheduledLabel(localDraft.scheduledAt) : undefined,
      publishedAt: toIsoStamp(localDraft?.publishedAt),
      hasLocalChanges: Boolean(localDraft),
    } satisfies AuthorEpisodeSummary;
  });

  const newDraft = workDrafts.find((draft) => !draft.episodeId);
  if (newDraft) {
    summaries.unshift({
      id: `${workId}-draft-new`,
      novelId: workId,
      number: work.totalEpisodes + 1,
      title: newDraft.title || `${work.totalEpisodes + 1}화`,
      accessType: newDraft.accessType,
      price: newDraft.price,
      updatedAt: new Date(newDraft.updatedAt ?? Date.now()).toISOString(),
      publishStatus: toPublishStatus(newDraft.publicationState ?? "draft"),
      publicationState: newDraft.publicationState ?? "draft",
      episodeType: newDraft.episodeType ?? "episode",
      ageRating: newDraft.ageRating,
      scheduledAt: newDraft.scheduledAt ? formatScheduledLabel(newDraft.scheduledAt) : undefined,
      publishedAt: toIsoStamp(newDraft.publishedAt),
      hasLocalChanges: true,
    });
  }

  return summaries.sort((a, b) => a.number - b.number);
}

function summarizeCounts(episodes: AuthorEpisodeSummary[]) {
  return episodes.reduce(
    (acc, episode) => {
      if (episode.publishStatus === "draft") acc.draft += 1;
      if (episode.publishStatus === "scheduled") acc.scheduled += 1;
      if (episode.publishStatus === "published") acc.published += 1;
      return acc;
    },
    { draft: 0, scheduled: 0, published: 0 }
  );
}
function createInboxItems({
  draftCount,
  scheduledCount,
  updatedCount,
  monthlyRevenue,
}: {
  draftCount: number;
  scheduledCount: number;
  updatedCount: number;
  monthlyRevenue: number;
}): AuthorInboxItem[] {
  const items: AuthorInboxItem[] = [];

  if (scheduledCount > 0) {
    items.push({
      id: "scheduled",
      type: "system",
      label: "예약 점검",
      body: `${scheduledCount}개 회차가 예약 발행을 기다리고 있습니다.`,
      unread: true,
    });
  }

  if (draftCount > 0) {
    items.push({
      id: "draft",
      type: "editor",
      label: "미완성 초안",
      body: `아직 발행 전인 초안 ${draftCount}개가 남아 있습니다.`,
      unread: true,
    });
  }

  if (updatedCount > 0) {
    items.push({
      id: "updated",
      type: "editor",
      label: "재검토 필요",
      body: `발행 후 수정 중인 회차 ${updatedCount}개를 다시 확인해 주세요.`,
      unread: false,
    });
  }

  items.push({
    id: "revenue",
    type: "promo",
    label: "수익 요약",
    body:
      monthlyRevenue > 0
        ? `이번 달 예상 정산액은 ${monthlyRevenue.toLocaleString()}원입니다.`
        : "이번 달 정산을 만들기 위한 첫 유료 발행을 준비해 보세요.",
    unread: false,
  });

  return items.slice(0, 4);
}

function buildReactions(workId: string): AuthorReaction[] {
  const work = getNovelById(workId);
  if (!work) return [];
  return work.episodes.slice(0, 3).map((episode, index) => ({
    id: `${workId}-reaction-${episode.id}`,
    episodeLabel: `${episode.number}화`,
    nickname: ["달빛독자", "소설덕후", "새벽독서"][index] ?? `독자${index + 1}`,
    body:
      index === 0
        ? `${episode.title} 전개가 살아 있어서 다음 화가 기다려져요.`
        : index === 1
        ? `설정 설명이 자연스럽고 캐릭터 감정선이 좋아요.`
        : `최근 회차 분위기가 특히 좋아서 선호작으로 묶어뒀어요.`,
    likes: 8 + index * 5,
  }));
}

function buildFallbackHistory(workId: string, episodeId?: string, label?: string): AuthorEpisodeHistoryEntry[] {
  const safeLabel = label || "회차";
  const base = new Date("2026-04-18T10:22:00+09:00").getTime();
  return [
    { id: `${workId}:${episodeId ?? "new"}:1`, label: `${safeLabel} 저장`, timestamp: new Date(base).toISOString(), state: "draft" },
  ];
}

export function createAuthorRepository(): AuthorRepository {
  async function listAllWorks() {
    const userId = await remoteBackend.getCurrentUserId();
    const localWorks = novels; // Fallback to mocks if no user

    if (!userId) {
      return localWorks.map((n) => ({
        id: n.id,
        title: n.title,
        coverUrl: n.coverUrl,
        author: n.author,
        status: n.status,
      }));
    }

    const remoteWorks = await remoteBackend.listRemoteWorks(userId);
    if (!remoteWorks || remoteWorks.length === 0) {
      return localWorks.map((n) => ({
        id: n.id,
        title: n.title,
        coverUrl: n.coverUrl,
        author: n.author,
        status: n.status,
      }));
    }

    return remoteWorks.map((n) => ({
      id: n.id,
      title: n.title,
      coverUrl: n.cover_url || "",
      author: n.author || "",
      status: n.status === "serializing" ? "연재중" : "완결",
    }));
  }

  async function listStoredDrafts() {
    const localDrafts = (await listLocalDrafts()).map((entry) => entry.draft);
    const userId = await remoteBackend.getCurrentUserId();
    if (!userId) return localDrafts;

    const remoteDrafts = await remoteBackend.listRemoteDrafts(userId);
    if (!remoteDrafts) return localDrafts;

    return dedupeDrafts([...localDrafts, ...remoteDrafts]);
  }

  async function listPenNamesWithRemote() {
    const userId = await remoteBackend.getCurrentUserId();
    const remotePenNames = userId ? await remoteBackend.listRemotePenNames(userId) : [];
    return dedupePenNames([...DEFAULT_PEN_NAMES, ...remotePenNames]);
  }

  return {
    async listWorks() {
      const allWorks = await listAllWorks();
      const storedDrafts = await listStoredDrafts();
      
      const works = await Promise.all(
        allWorks.map(async (work) => {
          const episodes = buildEpisodeSummaries(work.id, storedDrafts);
          const counts = summarizeCounts(episodes);
          const latestUpdatedAt = episodes
            .map((episode) => new Date(episode.updatedAt).getTime())
            .sort((a, b) => b - a)[0];
          const nextScheduledAt = episodes
            .filter((episode) => episode.publicationState === "scheduled" && episode.scheduledAt)
            .map((episode) => episode.scheduledAt as string)
            .sort()[0];

          return {
            id: work.id,
            title: work.title,
            coverUrl: work.coverUrl,
            status: work.status as any,
            totalEpisodes: episodes.length,
            updatedAt: latestUpdatedAt ? new Date(latestUpdatedAt).toISOString() : nowStamp(),
            draftCount: counts.draft,
            scheduledCount: counts.scheduled,
            publishedCount: counts.published,
            totalViews: 0, // Should be fetched from analytics/novels table
            monthlyRevenue: 0,
            nextScheduledAt,
          } satisfies AuthorWorkSummary;
        })
      );

      return works;
    },
    async getDashboardSummary() {
      const works = await this.listWorks();
      const drafts = await listStoredDrafts();
      const draftCount = drafts.filter((draft) => draft.publicationState === "draft" || draft.publicationState === "updated").length;
      const scheduledDrafts = drafts.filter((draft) => draft.publicationState === "scheduled");
      const updatedCount = drafts.filter((draft) => draft.publicationState === "updated").length;
      const totalViews = works.reduce((sum, work) => sum + (work.totalViews ?? 0), 0);
      const weeklyViews = Math.max(100, Math.round(totalViews * 0.008));
      const monthlyRevenue = works.reduce((sum, work) => sum + (work.monthlyRevenue ?? 0), 0);
      const totalRevenue = works.reduce((sum, work) => sum + Math.round((work.totalViews ?? 0) * 0.28), 0);
      const nextScheduled = scheduledDrafts
        .map((draft) => draft.scheduledAt)
        .filter((value): value is number => typeof value === "number")
        .sort((a, b) => a - b)[0];
      const publishedCount = drafts.filter((draft) => draft.publicationState === "published").length;
      const cadenceSource = await Promise.all(works.slice(0, 3).map((work) => this.getWorkMeta(work.id)));
      const cadence = cadenceSource.find(Boolean)?.updateDay ?? "매주 수요일";
      const penNames = await listPenNamesWithRemote();
      const userId = await remoteBackend.getCurrentUserId();
      const remotePrefs = userId ? await remoteBackend.loadRemotePrefs(userId) : null;
      const prefs = await loadAuthorPrefs();
      const activePenName =
        (remotePrefs?.active_pen_name && penNames.includes(remotePrefs.active_pen_name)
          ? remotePrefs.active_pen_name
          : undefined) ??
        (prefs.activePenName && penNames.includes(prefs.activePenName) ? prefs.activePenName : undefined) ??
        penNames[0] ??
        DEFAULT_PEN_NAMES[0];

      return {
        totalViews,
        weeklyViews,
        draftCount,
        cadence,
        nextDue: formatRelativeDue(nextScheduled),
        streak: Math.min(8, Math.max(1, publishedCount || scheduledDrafts.length || 1)),
        overdueWarning:
          draftCount > 0
            ? `미완성 초안 ${draftCount}화가 남아 있습니다. 다음 발행 전에 검토해 주세요.`
            : nextScheduled
            ? `다음 예약 발행은 ${formatRelativeDue(nextScheduled)} 예정입니다.`
            : null,
        monthlyRevenue,
        settlementDate: formatSettlementDate(),
        totalRevenue,
        inbox: createInboxItems({
          draftCount,
          scheduledCount: scheduledDrafts.length,
          updatedCount,
          monthlyRevenue,
        }),
        penNames,
        activePenName,
      } satisfies AuthorDashboardSummary;
    },
    async listPenNames() {
      return listPenNamesWithRemote();
    },
    async getActivePenName() {
      const penNames = await listPenNamesWithRemote();
      const userId = await remoteBackend.getCurrentUserId();
      const remotePrefs = userId ? await remoteBackend.loadRemotePrefs(userId) : null;
      if (remotePrefs?.active_pen_name && penNames.includes(remotePrefs.active_pen_name)) {
        return remotePrefs.active_pen_name;
      }

      const prefs = await loadAuthorPrefs();
      if (prefs.activePenName && penNames.includes(prefs.activePenName)) {
        return prefs.activePenName;
      }

      return penNames[0] ?? DEFAULT_PEN_NAMES[0];
    },
    async setActivePenName(name: string) {
      const penNames = await listPenNamesWithRemote();
      const next = penNames.includes(name) ? name : penNames[0] ?? DEFAULT_PEN_NAMES[0];
      const userId = await remoteBackend.getCurrentUserId();
      if (userId) {
        await remoteBackend.saveRemotePrefs(userId, next);
      }
      await saveAuthorPrefs({ activePenName: next });
      return next;
    },
    async getWork(workId) {
      const work = (await this.listWorks()).find((item) => item.id === workId);
      return work ?? null;
    },
    async getWorkMeta(workId) {
      return getMergedWorkMeta(workId);
    },
    async saveWorkMeta(workId, patch) {
      const current = await getMergedWorkMeta(workId);
      if (!current) return null;

      const nextMeta = {
        ...current,
        ...patch,
        keywords: patch.keywords ?? current.keywords,
      } satisfies AuthorWorkMeta;

      const userId = await remoteBackend.getCurrentUserId();
      const remoteSaved = userId ? await remoteBackend.saveRemoteWorkMeta(userId, workId, nextMeta) : null;
      await saveStoredWorkMeta(workId, nextMeta);
      return remoteSaved ?? nextMeta;
    },
    async listEpisodes(workId) {
      const drafts = await listStoredDrafts();
      return buildEpisodeSummaries(workId, drafts);
    },
    async listReaderReactions(workId) {
      return buildReactions(workId);
    },
    async listEpisodeHistory(workId, episodeId) {
      const localEntries = formatHistoryEntries(await loadEpisodeHistory(workId, episodeId));
      const userId = await remoteBackend.getCurrentUserId();
      const remoteEntries = userId ? await remoteBackend.listRemoteHistory(userId, workId, episodeId) : null;
      const mergedEntries = [...localEntries, ...(remoteEntries ?? [])];

      if (mergedEntries.length) {
        const deduped = new Map<string, AuthorEpisodeHistoryEntry>();
        for (const entry of mergedEntries) {
          deduped.set(entry.id, entry);
        }
        return [...deduped.values()].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }

      const work = getNovelById(workId);
      const episodeNumber = work ? resolveEpisodeNumber(work, episodeId) : null;
      const fallbackLabel = episodeNumber ? `${episodeNumber}화` : "새 회차";
      return buildFallbackHistory(workId, episodeId, fallbackLabel);
    },
    async loadDraft(workId, episodeId) {
      const localDraft = await loadLocalDraft(workId, episodeId);
      const userId = await remoteBackend.getCurrentUserId();
      const remoteDraft = userId ? await remoteBackend.loadRemoteDraft(userId, workId, episodeId) : null;
      const preferredDraft = pickPreferredDraft(localDraft, remoteDraft);
      if (preferredDraft) {
        return preferredDraft;
      }

      const work = getNovelById(workId);
      if (!work) {
        return {
          novelId: workId,
          episodeId,
          title: "",
          accessType: "free",
          price: 0,
          body: "",
          workflowStep: "draft",
          publicationState: "draft",
        };
      }

      const episodeNumber = resolveEpisodeNumber(work, episodeId);
      const defaultMeta = await getMergedWorkMeta(workId);

      if (episodeNumber) {
        const episode = buildEpisodeModel(work, episodeNumber);
        return {
          novelId: work.id,
          episodeId: episode.id,
          title: episode.title,
          accessType: episode.accessType,
          price: episode.price,
          body: episode.body,
          workflowStep: "draft",
          episodeType: "episode",
          ageRating: defaultMeta?.ageRating,
          updatedAt: 0,
          publicationState: "draft",
        };
      }

      return {
        novelId: workId,
        episodeId,
        title: "",
        accessType: "free",
        price: 0,
        body: "",
        workflowStep: "draft",
        episodeType: "episode",
        ageRating: defaultMeta?.ageRating,
        updatedAt: 0,
        publicationState: "draft",
      };
    },
    async saveDraft(input: EpisodeDraft) {
      const userId = await remoteBackend.getCurrentUserId();
      const remoteSaved = userId ? await remoteBackend.upsertRemoteDraft(userId, input, "save") : null;
      const saved = remoteSaved ?? (await saveLocalDraft(input));
      if (remoteSaved) {
        await saveLocalDraft(remoteSaved);
      }
      return saved;
    },
    async publishDraft(input: EpisodeDraft) {
      const userId = await remoteBackend.getCurrentUserId();
      const remotePublished = userId ? await remoteBackend.upsertRemoteDraft(userId, input, "publish") : null;
      const published = remotePublished ?? (await publishLocalDraft(input));
      if (remotePublished) {
        await publishLocalDraft(remotePublished);
      }
      return published;
    },
    async getMostRecentDraft() {
      const drafts = await listStoredDrafts();
      if (!drafts.length) return null;

      const latest = [...drafts].sort(compareStoredDrafts).at(-1);
      return latest ?? null;
    },
  };
}
export function createEpisodeEditorState(draft: EpisodeDraft) {
  const canPublish =
    draft.title.trim().length > 0 &&
    draft.body.trim().length >= 500 &&
    draft.ageRating !== null &&
    draft.ageRating !== undefined &&
    (draft.accessType === "free" || draft.price > 0);

  return {
    draft,
    canPublish,
    update(patch: Partial<EpisodeDraft>) {
      return createEpisodeEditorState({ ...draft, ...patch });
    },
  };
}

export function createMockAuthorRepository() {
  return createAuthorRepository();
}
