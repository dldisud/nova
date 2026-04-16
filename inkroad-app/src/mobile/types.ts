export type LibraryShelf = "reading" | "wishlist" | "purchased";

export interface Episode {
  id: string;
  number: number;
  title: string;
  summary: string;
  isFree: boolean;
  price: number;
  body: string;
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
