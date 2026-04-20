export type LibraryShelf = "reading" | "wishlist" | "purchased";
export type EpisodeWorkflowStep = "draft" | "review" | "scheduled" | "published";
export type EpisodePublicationState = "draft" | "scheduled" | "published" | "updated";
export type EpisodeType = "episode" | "afterword" | "notice" | "private";
export type AgeRating = "all" | "15" | "18";
export type PublishStatus = "draft" | "scheduled" | "published";

export interface Episode {
  id: string;
  number: number;
  title: string;
  summary: string;
  isFree: boolean;
  price: number;
  body: string;
}

export interface EpisodeDraft {
  novelId: string;
  episodeId?: string;
  title: string;
  accessType: "free" | "paid";
  price: number;
  body: string;
  workflowStep?: EpisodeWorkflowStep;
  episodeType?: EpisodeType;
  ageRating?: AgeRating;
  scheduledAt?: number;
  updatedAt?: number;
  publishedAt?: number;
  publicationState?: EpisodePublicationState;
}

export interface AuthorWorkSummary {
  id: string;
  title: string;
  coverUrl: string;
  status: "연재중" | "완결";
  totalEpisodes: number;
  updatedAt: string;
  draftCount?: number;
  scheduledCount?: number;
  publishedCount?: number;
  totalViews?: number;
  monthlyRevenue?: number;
  nextScheduledAt?: string;
}

export interface AuthorEpisodeSummary {
  id: string;
  novelId: string;
  number: number;
  title: string;
  accessType: "free" | "paid";
  price: number;
  updatedAt: string;
  publishStatus: PublishStatus;
  publicationState: EpisodePublicationState;
  episodeType: EpisodeType;
  ageRating?: AgeRating;
  scheduledAt?: string;
  publishedAt?: string;
  hasLocalChanges?: boolean;
}

export interface AuthorInboxItem {
  id: string;
  type: "contract" | "promo" | "editor" | "system";
  label: string;
  body: string;
  unread: boolean;
}

export interface AuthorDashboardSummary {
  totalViews: number;
  weeklyViews: number;
  draftCount: number;
  cadence: string;
  nextDue: string;
  streak: number;
  overdueWarning: string | null;
  monthlyRevenue: number;
  settlementDate: string;
  totalRevenue: number;
  inbox: AuthorInboxItem[];
  penNames: string[];
  activePenName: string;
}

export interface AuthorWorkMeta {
  genre: string;
  keywords: string[];
  ageRating: AgeRating;
  updateDay: string;
  hiatus: boolean;
}

export interface AuthorReaction {
  id: string;
  episodeLabel: string;
  nickname: string;
  body: string;
  likes: number;
}

export interface AuthorEpisodeHistoryEntry {
  id: string;
  label: string;
  timestamp: string;
  state: EpisodePublicationState;
}

export interface Novel {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  heroImageUrl: string;
  tagline: string;
  synopsis: string;
  tags: string[];
  views: number;
  rating: number;
  totalEpisodes: number;
  freeEpisodes: number;
  pricePerEpisode: number;
  bundleListPrice?: number;
  salePercent?: number;
  salePrice?: number;
  status: "연재중" | "완결";
  source: "INKROAD" | "문피아" | "카카오페이지";
  episodes: Episode[];
}

export interface UserProfile {
  name: string;
  email: string;
  bio: string;
  isCreator: boolean;
  coins: number;
  notifications: {
    comments: boolean;
    likes: boolean;
    sales: boolean;
  };
}

export interface CoinPackage {
  amount: number;
  price: number;
  bonus?: number;
  featured?: boolean;
}
