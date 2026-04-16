export interface NovelData {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  views?: number;
  synopsis?: string;
  genre?: string;
}

export interface GenreChipData {
  id: string;
  label: string;
}

export const heroCarouselData: NovelData[] = [
  { id: '1', title: 'The Shadow King', author: 'Author A', coverUrl: 'https://via.placeholder.com/400x200', genre: '판타지', synopsis: '그림자 왕의 전설' },
  { id: '2', title: 'Light Eternal', author: 'Author B', coverUrl: 'https://via.placeholder.com/400x200', genre: '로맨스', synopsis: '영원한 빛과 사랑' },
  { id: '3', title: 'Midnight Whispers', author: 'Author C', coverUrl: 'https://via.placeholder.com/400x200', genre: '스릴러', synopsis: '한밤중의 속삭임' },
];

export const genreChipsData: GenreChipData[] = [
  { id: 'all', label: '전체' },
  { id: 'romance', label: '로맨스' },
  { id: 'fantasy', label: '판타지' },
  { id: 'scifi', label: 'SF' },
];

export const novelGridData: NovelData[] = [
  { id: '10', title: '검의 숙명', author: 'Author D', views: 1200, coverUrl: 'https://via.placeholder.com/150x220', genre: '판타지', synopsis: '검의 운명을 타고난 영웅의 장대한 서사시가 시작된다.' },
  { id: '11', title: '마법 학원의 무법자', author: 'Author E', views: 3400, coverUrl: 'https://via.placeholder.com/150x220', genre: '판타지', synopsis: '최고 마법 학원에 들어간 시골 소년의 좌충우돌 성장기.' },
  { id: '12', title: '드래곤의 눈물', author: 'Author F', views: 800, coverUrl: 'https://via.placeholder.com/150x220', genre: '판타지', synopsis: '천년의 잠에서 깨어난 드래곤의 슬픈 사연...' },
  { id: '13', title: '은하수를 건너', author: 'Author G', views: 4200, coverUrl: 'https://via.placeholder.com/150x220', genre: 'SF', synopsis: '별을 향해 떠나는 인간들의 마지막 여정.' },
];

export const getNovelById = (id: string): NovelData | undefined => {
  const allNovels = [...heroCarouselData, ...novelGridData];
  return allNovels.find(novel => novel.id === id);
};
