export interface NovelData {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  views?: number;
}

export interface GenreChipData {
  id: string;
  label: string;
}

export const heroCarouselData: NovelData[] = [
  { id: '1', title: 'The Shadow King', author: 'Author A', coverUrl: 'https://via.placeholder.com/400x200' },
  { id: '2', title: 'Light Eternal', author: 'Author B', coverUrl: 'https://via.placeholder.com/400x200' },
  { id: '3', title: 'Midnight Whispers', author: 'Author C', coverUrl: 'https://via.placeholder.com/400x200' },
];

export const genreChipsData: GenreChipData[] = [
  { id: 'all', label: '전체' },
  { id: 'romance', label: '로맨스' },
  { id: 'fantasy', label: '판타지' },
  { id: 'scifi', label: 'SF' },
];

export const novelGridData: NovelData[] = [
  { id: '10', title: '검의 숙명', author: 'Author D', views: 1200, coverUrl: 'https://via.placeholder.com/150x220' },
  { id: '11', title: '마법 학원의 무법자', author: 'Author E', views: 3400, coverUrl: 'https://via.placeholder.com/150x220' },
  { id: '12', title: '드래곤의 눈물', author: 'Author F', views: 800, coverUrl: 'https://via.placeholder.com/150x220' },
  { id: '13', title: '은하수를 건너', author: 'Author G', views: 4200, coverUrl: 'https://via.placeholder.com/150x220' },
];
