import type { CoinPackage, Novel, UserProfile } from "../types";

const makeEpisode = (novelId: string, number: number, title: string, body: string) => ({
  id: `${novelId}-ep-${number}`,
  number,
  title,
  summary: `${title}의 핵심 장면을 담은 회차입니다.`,
  isFree: number <= 3,
  price: number <= 3 ? 0 : 120,
  body,
});

export const novels: Novel[] = [
  {
    id: "whan-book",
    title: "칠흑의 마법사와 검은 서약",
    author: "한서림",
    coverUrl: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80",
    heroImageUrl: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1400&q=80",
    tagline: "무료 진입과 세일 전환이 한 번에 이어지는 대표 작품입니다.",
    synopsis: "붕괴 직전의 제국에서 금서고를 지키던 마법사가 검은 서약을 되돌리며 세계의 비밀과 맞서는 다크 판타지입니다.",
    tags: ["판타지", "아카데미", "회귀"],
    views: 214000,
    rating: 9.4,
    totalEpisodes: 214,
    freeEpisodes: 30,
    pricePerEpisode: 300,
    salePercent: 50,
    salePrice: 150,
    status: "연재중",
    source: "INKROAD",
    episodes: [
      makeEpisode("whan-book", 1, "프롤로그", "# 프롤로그\n\n잿빛 비가 도시에 내리던 밤, 그는 금서고의 마지막 봉인을 열었다.\n\n**서약은 칼날처럼 남았고**, 도시는 그 대가를 기억하고 있었다."),
      makeEpisode("whan-book", 2, "검은 서약", "# 검은 서약\n\n계약의 문장은 사라졌지만, 손등에는 여전히 검은 흔적이 남아 있었다.\n\n그 흔적은 다음 희생자를 가리키는 지도였다."),
      makeEpisode("whan-book", 3, "금서고의 열쇠", "# 금서고의 열쇠\n\n그는 오래된 열쇠를 돌리며 확신했다.\n\n이번엔 세계가 자신을 먼저 배신하지 못하리라는 것을."),
    ],
  },
  {
    id: "abyssal-librarian",
    title: "심연의 사서와 금지된 장서관",
    author: "미카 사도",
    coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80",
    heroImageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1400&q=80",
    tagline: "잠든 장서관의 봉인 기록을 마주하는 미스터리 판타지.",
    synopsis: "심연 아래 잠든 장서관에서 금서를 정리하는 사서가 봉인된 기록을 해독하며 미스터리와 음모를 따라가는 작품입니다.",
    tags: ["미스터리", "판타지", "서재"],
    views: 98400,
    rating: 8.9,
    totalEpisodes: 96,
    freeEpisodes: 18,
    pricePerEpisode: 240,
    salePercent: 20,
    salePrice: 192,
    status: "연재중",
    source: "문피아",
    episodes: [
      makeEpisode("abyssal-librarian", 1, "봉인 목록", "# 봉인 목록\n\n심연 아래 내려간 첫날, 그녀는 금지 목록에서 자신의 이름을 발견했다."),
      makeEpisode("abyssal-librarian", 2, "유실된 목차", "# 유실된 목차\n\n목차가 사라진 책은 언제나 누군가의 기억을 먹고 자란다."),
      makeEpisode("abyssal-librarian", 3, "장서관의 수문장", "# 장서관의 수문장\n\n낡은 사다리 끝에서, 수문장은 그녀에게 돌아가라고 속삭였다."),
    ],
  },
  {
    id: "academy-outcast",
    title: "아카데미 최강 흑마도사는 낙제생으로 위장한다",
    author: "류경",
    coverUrl: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80",
    heroImageUrl: "https://images.unsplash.com/photo-1513001900722-370f803f498d?auto=format&fit=crop&w=1400&q=80",
    tagline: "숨겨진 최강자가 낙제생으로 돌아왔다.",
    synopsis: "학원에서 낙제생 취급을 받는 주인공이 사실은 제국 최강 흑마도사였다는 설정의 성장형 아카데미 판타지입니다.",
    tags: ["아카데미", "판타지", "성장"],
    views: 156000,
    rating: 9.2,
    totalEpisodes: 143,
    freeEpisodes: 24,
    pricePerEpisode: 280,
    salePercent: 35,
    salePrice: 182,
    status: "연재중",
    source: "카카오페이지",
    episodes: [
      makeEpisode("academy-outcast", 1, "입학식", "# 입학식\n\n낙제생 명단의 맨 끝에서, 그는 가장 먼저 마나의 흐름을 읽었다."),
      makeEpisode("academy-outcast", 2, "실기 평가", "# 실기 평가\n\n실패한 척 휘두른 마법 하나가, 심사관의 표정을 굳게 만들었다."),
      makeEpisode("academy-outcast", 3, "그림자 강의", "# 그림자 강의\n\n밤마다 비밀 강의실이 열리고, 그는 진짜 이름을 숨긴 채 학생들을 가르쳤다."),
    ],
  },
  {
    id: "midnight-rail",
    title: "심야 지하철 관리자는 귀신 민원을 처리한다",
    author: "이도현",
    coverUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=900&q=80",
    heroImageUrl: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1400&q=80",
    tagline: "퇴근 후가 더 바쁜 지하철 관리자의 도시 괴담 오피스물.",
    synopsis: "밤 12시 이후 접수되는 민원은 사람의 것이 아니다. 심야 노선의 관리자와 귀신들의 분쟁 조정극을 그립니다.",
    tags: ["현대판타지", "오컬트", "직장"],
    views: 74200,
    rating: 8.7,
    totalEpisodes: 81,
    freeEpisodes: 12,
    pricePerEpisode: 220,
    status: "연재중",
    source: "INKROAD",
    episodes: [
      makeEpisode("midnight-rail", 1, "0번 승강장", "# 0번 승강장\n\n지도에 없는 승강장에서 첫 민원이 들어왔다."),
      makeEpisode("midnight-rail", 2, "막차 이후", "# 막차 이후\n\n막차가 떠난 뒤에도, 플랫폼은 사람을 기다리고 있었다."),
      makeEpisode("midnight-rail", 3, "유실물 센터", "# 유실물 센터\n\n가장 위험한 물건은 주인을 잃은 마음이라는 걸 그는 너무 늦게 배웠다."),
    ],
  },
  {
    id: "northern-ledger",
    title: "북부 대공비는 숨겨둔 장부를 꺼내지 않는다",
    author: "시엘",
    coverUrl: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80",
    heroImageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?auto=format&fit=crop&w=1400&q=80",
    tagline: "정략결혼, 장부, 빚, 그리고 권력의 로맨스.",
    synopsis: "파산 직전의 북부를 살리기 위해 장부를 숨긴 대공비가 정치와 사랑을 동시에 관리해 나가는 로맨스 판타지입니다.",
    tags: ["로맨스", "정략결혼", "경영"],
    views: 121000,
    rating: 9.1,
    totalEpisodes: 128,
    freeEpisodes: 20,
    pricePerEpisode: 260,
    status: "완결",
    source: "INKROAD",
    episodes: [
      makeEpisode("northern-ledger", 1, "첫 장부", "# 첫 장부\n\n남편은 냉정했고, 영지는 파산 직전이었다. 장부만이 진실을 알고 있었다."),
      makeEpisode("northern-ledger", 2, "겨울 계약", "# 겨울 계약\n\n계약서엔 사랑이 없었지만, 계산은 분명했다."),
      makeEpisode("northern-ledger", 3, "대공비의 조건", "# 대공비의 조건\n\n그녀는 한 장의 장부로 북부 귀족들의 숨통을 쥐었다."),
    ],
  },
  {
    id: "galactic-librarians",
    title: "우주정거장의 사서 기사단",
    author: "윤해",
    coverUrl: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=900&q=80",
    heroImageUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1400&q=80",
    tagline: "은하 최후의 장서를 지키는 사서 기사들의 기록.",
    synopsis: "우주정거장 도서관을 지키는 기사단이 문명 말기의 기록 전쟁에 휘말리며 벌어지는 SF 판타지입니다.",
    tags: ["SF", "기사단", "우주"],
    views: 63300,
    rating: 8.8,
    totalEpisodes: 74,
    freeEpisodes: 15,
    pricePerEpisode: 250,
    status: "연재중",
    source: "문피아",
    episodes: [
      makeEpisode("galactic-librarians", 1, "폐기 예정 문서", "# 폐기 예정 문서\n\n폐기 예정 파일 속에서 인류의 마지막 지도가 발견됐다."),
      makeEpisode("galactic-librarians", 2, "기록 전쟁", "# 기록 전쟁\n\n전쟁은 함선이 아니라 문서 보관함에서 먼저 시작되었다."),
      makeEpisode("galactic-librarians", 3, "사서 기사단", "# 사서 기사단\n\n그들은 검보다 색인을 더 믿었다."),
    ],
  },
];

export const homeSections = {
  heroId: "whan-book",
  saleIds: ["whan-book", "academy-outcast", "abyssal-librarian"],
  popularIds: ["whan-book", "northern-ledger", "academy-outcast", "abyssal-librarian"],
  recentIds: ["midnight-rail", "galactic-librarians", "whan-book"],
};

export const libraryShelves = {
  reading: ["whan-book", "abyssal-librarian"],
  wishlist: ["northern-ledger", "academy-outcast"],
  purchased: ["whan-book", "midnight-rail", "galactic-librarians"],
};

export const mockProfile: UserProfile = {
  name: "림루",
  email: "rimuru2178@gmail.com",
  bio: "밤마다 웹소설을 읽고, 가끔은 직접 쓰기도 합니다.",
  isCreator: true,
  coins: 13250,
  notifications: {
    comments: true,
    likes: true,
    sales: true,
  },
};

export const coinPackages: CoinPackage[] = [
  { amount: 500, price: 5000 },
  { amount: 1000, price: 10000, bonus: 100 },
  { amount: 5000, price: 50000, bonus: 1000, featured: true },
  { amount: 10000, price: 100000, bonus: 2500 },
];

export const genreLabels = ["전체", "판타지", "로맨스", "회귀", "아카데미", "오컬트", "SF"];

export function getNovelById(id?: string | string[]) {
  const value = Array.isArray(id) ? id[0] : id;
  return novels.find((novel) => novel.id === value);
}

export function getEpisodeById(novelId: string, episodeId?: string) {
  if (!episodeId) return null;
  const novel = getNovelById(novelId);
  return novel?.episodes.find((episode) => episode.id === episodeId) ?? null;
}

export function getNovelList(ids: string[]) {
  return ids
    .map((id) => novels.find((novel) => novel.id === id))
    .filter((novel): novel is Novel => Boolean(novel));
}
