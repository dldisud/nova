import type {
  AuthorDashboardSummary,
  AuthorEpisodeHistoryEntry,
  AuthorEpisodeSummary,
  AuthorReaction,
  AuthorWorkMeta,
  AuthorWorkSummary,
  EpisodeDraft,
} from "../types";

export interface AuthorRepository {
  listWorks(): Promise<AuthorWorkSummary[]>;
  getDashboardSummary(): Promise<AuthorDashboardSummary>;
  listPenNames(): Promise<string[]>;
  getActivePenName(): Promise<string>;
  setActivePenName(name: string): Promise<string>;
  getWork(workId: string): Promise<AuthorWorkSummary | null>;
  getWorkMeta(workId: string): Promise<AuthorWorkMeta | null>;
  saveWorkMeta(workId: string, patch: Partial<AuthorWorkMeta>): Promise<AuthorWorkMeta | null>;
  listEpisodes(workId: string): Promise<AuthorEpisodeSummary[]>;
  listReaderReactions(workId: string): Promise<AuthorReaction[]>;
  listEpisodeHistory(workId: string, episodeId?: string): Promise<AuthorEpisodeHistoryEntry[]>;
  loadDraft(workId: string, episodeId?: string): Promise<EpisodeDraft>;
  getMostRecentDraft(): Promise<EpisodeDraft | null>;
  saveDraft(input: EpisodeDraft): Promise<EpisodeDraft>;
  publishDraft(input: EpisodeDraft): Promise<EpisodeDraft>;
}
