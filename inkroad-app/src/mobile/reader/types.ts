export interface RemoteNovelRow {
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
}

export interface RemoteEpisodeRow {
  id: string;
  episode_number: number;
  title: string;
  teaser: string | null;
  access_type: "free" | "paid";
  price: number | null;
  body: string;
  published_at?: string | null;
}

export interface RemoteNovelAggregate {
  novel: RemoteNovelRow;
  authorName: string;
  tags: string[];
  representativeEpisodePrice: number;
  episodes: RemoteEpisodeRow[];
}

export interface ReaderAccountProfile {
  id: string;
  displayName: string;
  email: string;
  role: string;
  isCreator: boolean;
  marketingOptIn: boolean;
  avatarUrl?: string | null;
}

export interface ReaderProfileSettingsInput {
  displayName: string;
  marketingOptIn: boolean;
  email: string;
}

export interface ReaderLibraryShelfItem {
  id: string;
  novel: import("../types").Novel;
  readProgress?: number;
  lastEpisodeNumber?: number;
  amountPaid?: number;
  purchasedAt?: string;
}

export interface ReaderProfileAvatarUploadInput {
  uri: string;
  mimeType: string;
  base64: string;
}

export interface ReaderProfileAvatarUploadResult {
  avatarUrl: string;
}

export interface ReaderSupportTicketInput {
  email: string;
  category: "account" | "payment" | "content" | "bug" | "other";
  subject: string;
  message: string;
}

export interface ReaderSupportTicketResult {
  ticketId: string;
  notificationStatus: "sent" | "deferred";
}
