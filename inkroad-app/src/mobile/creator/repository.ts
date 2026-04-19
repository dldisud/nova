import { getNovelById, mockProfile, novels } from "../data/mockInkroad";
import type {
  AgeRating,
  AuthorDashboardSummary,
  AuthorEpisodeHistoryEntry,
  AuthorEpisodeSummary,
  AuthorInboxItem,
  AuthorReaction,
  AuthorWorkMeta,
  AuthorWorkSummary,
  EpisodeDraft,
  EpisodePublicationState,
  EpisodeType,
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
import type { AuthorRepository } from "./types";

function nowStamp() {
  return "2026-04-18T12:00:00+09:00";
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

  if (!draft.updatedAt) {
    return "본문을 입력해 주세요.";
  }

  if (draft.publicationState === "published") {
    return "발행됨";
  }

  if (draft.publicationState === "updated") {
    return "발행 후 수정 중";
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
  const now = new Date("2026-04-18T12:00:00+09:00").getTime();
  const diffDays = Math.max(0, Math.round((value - now) / 86_400_000));
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "내일";
  return `${diffDays}일 후`;
}

function formatSettlementDate() {
  const base = new Date("2026-04-25T09:00:00+09:00");
  return `${base.getMonth() + 1}월 ${base.getDate()}일`;
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
  return (await loadStoredWorkMeta(workId)) ?? inferDefaultWorkMeta(work);
}

async function buildEpisodeSummaries(workId: string): Promise<AuthorEpisodeSummary[]> {
  const work = getNovelById(workId);
  if (!work) return [];

  const localDraftEntries = await listLocalDrafts();
  const workDrafts = localDraftEntries
    .map((entry) => entry.draft)
    .filter((draft) => draft.novelId === workId);
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
    body: monthlyRevenue > 0 ? `이번 달 예상 정산액은 ${monthlyRevenue.toLocaleString()}원입니다.` : "이번 달 정산을 만들기 위한 첫 유료 발행을 준비해 보세요.",
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

export function createMockAuthorRepository(): AuthorRepository {
  return {
    async listWorks() {
      const works = await Promise.all(
        novels.map(async (novel) => {
          const episodes = await buildEpisodeSummaries(novel.id);
          const counts = summarizeCounts(episodes);
          const latestUpdatedAt = episodes
            .map((episode) => new Date(episode.updatedAt).getTime())
            .sort((a, b) => b - a)[0];
          const nextScheduledAt = episodes
            .filter((episode) => episode.publicationState === "scheduled" && episode.scheduledAt)
            .map((episode) => episode.scheduledAt as string)
            .sort()[0];

          return {
            id: novel.id,
            title: novel.title,
            coverUrl: novel.coverUrl,
            status: novel.status,
            totalEpisodes: novel.totalEpisodes,
            updatedAt: latestUpdatedAt ? new Date(latestUpdatedAt).toISOString() : nowStamp(),
            draftCount: counts.draft,
            scheduledCount: counts.scheduled,
            publishedCount: counts.published,
            totalViews: novel.views,
            monthlyRevenue: counts.published * novel.pricePerEpisode * 12,
            nextScheduledAt,
          } satisfies AuthorWorkSummary;
        })
      );

      return works;
    },
    async getDashboardSummary() {
      const works = await this.listWorks();
      const drafts = await listLocalDrafts();
      const draftCount = drafts.filter((entry) => entry.draft.publicationState === "draft" || entry.draft.publicationState === "updated").length;
      const scheduledDrafts = drafts.filter((entry) => entry.draft.publicationState === "scheduled");
      const updatedCount = drafts.filter((entry) => entry.draft.publicationState === "updated").length;
      const totalViews = works.reduce((sum, work) => sum + (work.totalViews ?? 0), 0);
      const weeklyViews = Math.max(100, Math.round(totalViews * 0.008));
      const monthlyRevenue = works.reduce((sum, work) => sum + (work.monthlyRevenue ?? 0), 0);
      const totalRevenue = works.reduce((sum, work) => sum + Math.round((work.totalViews ?? 0) * 0.28), 0);
      const nextScheduled = scheduledDrafts
        .map((entry) => entry.draft.scheduledAt)
        .filter((value): value is number => typeof value === "number")
        .sort((a, b) => a - b)[0];
      const publishedCount = drafts.filter((entry) => entry.draft.publicationState === "published").length;
      const cadenceSource = await Promise.all(works.slice(0, 3).map((work) => this.getWorkMeta(work.id)));
      const cadence = cadenceSource.find(Boolean)?.updateDay ?? "매주 수요일";
      const prefs = await loadAuthorPrefs();
      const activePenName = prefs.activePenName ?? DEFAULT_PEN_NAMES[0];

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
        penNames: DEFAULT_PEN_NAMES,
        activePenName,
      } satisfies AuthorDashboardSummary;
    },
    async listPenNames() {
      return DEFAULT_PEN_NAMES;
    },
    async getActivePenName() {
      const prefs = await loadAuthorPrefs();
      return prefs.activePenName ?? DEFAULT_PEN_NAMES[0];
    },
    async setActivePenName(name: string) {
      const next = DEFAULT_PEN_NAMES.includes(name) ? name : DEFAULT_PEN_NAMES[0];
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
      return saveStoredWorkMeta(workId, {
        ...current,
        ...patch,
        keywords: patch.keywords ?? current.keywords,
      });
    },
    async listEpisodes(workId) {
      return buildEpisodeSummaries(workId);
    },
    async listReaderReactions(workId) {
      return buildReactions(workId);
    },
    async listEpisodeHistory(workId, episodeId) {
      const stored = await loadEpisodeHistory(workId, episodeId);
      if (stored.length) {
        return formatHistoryEntries(stored);
      }
      const work = getNovelById(workId);
      const episodeNumber = work ? resolveEpisodeNumber(work, episodeId) : null;
      const fallbackLabel = episodeNumber ? `${episodeNumber}화` : "새 회차";
      return buildFallbackHistory(workId, episodeId, fallbackLabel);
    },
    async loadDraft(workId, episodeId) {
      const localDraft = await loadLocalDraft(workId, episodeId);
      if (localDraft) {
        return localDraft;
      }

      const work = getNovelById(workId);
      if (!work) {
        return {
          novelId: workId,
          episodeId,
          title: "",
          accessType: "free",
          price: 100,
          body: "",
          workflowStep: "draft",
          episodeType: "episode",
          updatedAt: 0,
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
        price: 100,
        body: "",
        workflowStep: "draft",
        episodeType: "episode",
        ageRating: defaultMeta?.ageRating,
        updatedAt: 0,
        publicationState: "draft",
      };
    },
    async saveDraft(input: EpisodeDraft) {
      return saveLocalDraft(input);
    },
    async publishDraft(input: EpisodeDraft) {
      return publishLocalDraft(input);
    },
    async getMostRecentDraft() {
      const drafts = await listLocalDrafts();
      if (!drafts.length) return null;

      const latest = drafts
        .map((entry) => entry.draft)
        .sort(compareStoredDrafts)
        .at(-1);

      return latest ?? null;
    },
  };
}

export function createEpisodeEditorState(draft: EpisodeDraft) {
  const canPublish =
    draft.title.trim().length > 0 &&
    draft.body.trim().length > 0 &&
    (draft.accessType === "free" || draft.price > 0);

  return {
    draft,
    canPublish,
    update(patch: Partial<EpisodeDraft>) {
      return createEpisodeEditorState({ ...draft, ...patch });
    },
  };
}
