# Mobile Reader Live Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expo 모바일 앱의 `홈 / 검색 / 작품 상세 / 뷰어`를 `mockInkroad`에서 떼고 Supabase 공개 작품/공개 회차 데이터로 동작하게 만든다.

**Architecture:** `inkroad-app/src/mobile/reader/` 아래에 공개 카탈로그 전용 repository와 mapper를 추가하고, 화면은 이 repository가 반환하는 모바일 view model만 사용한다. 기존 `NovelCard`와 화면 레이아웃은 유지하고, 라우트 구조도 그대로 유지하되 `novels.id`와 `episode_number`를 사용해 작품/회차를 찾는다.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase JS, Jest, React Native Testing Library

---

## File Structure

### Create

- `/home/ciel/nova/inkroad-app/src/mobile/reader/types.ts`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/mappers.ts`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/repository.ts`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/mappers.test.ts`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/repository.test.ts`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/home-screen.test.tsx`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/search-screen.test.tsx`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/novel-detail-screen.test.tsx`
- `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/novel-viewer-screen.test.tsx`

### Modify

- `/home/ciel/nova/inkroad-app/src/mobile/types.ts`
- `/home/ciel/nova/inkroad-app/src/mobile/screens/HomeScreen.tsx`
- `/home/ciel/nova/inkroad-app/src/mobile/screens/SearchScreen.tsx`
- `/home/ciel/nova/inkroad-app/src/mobile/screens/NovelDetailScreen.tsx`
- `/home/ciel/nova/inkroad-app/src/mobile/screens/NovelViewerScreen.tsx`

---

### Task 1: Add reader domain types and mapper tests

**Files:**
- Create: `/home/ciel/nova/inkroad-app/src/mobile/reader/types.ts`
- Create: `/home/ciel/nova/inkroad-app/src/mobile/reader/mappers.ts`
- Create: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/mappers.test.ts`
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/types.ts`

- [ ] **Step 1: Write the failing mapper test**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/mappers.test.ts
import {
  calculateSalePercent,
  mapRemoteEpisodeToMobileEpisode,
  mapRemoteNovelToMobileNovel,
} from "../mappers";

describe("reader mappers", () => {
  it("maps a remote novel row into the mobile Novel shape", () => {
    const novel = mapRemoteNovelToMobileNovel({
      novel: {
        id: "novel-1",
        slug: "novel-one",
        title: "검은 별의 기록",
        short_description: "짧은 소개",
        description: "긴 소개",
        cover_url: "https://example.com/cover.jpg",
        banner_url: "https://example.com/banner.jpg",
        status: "published",
        is_translation: false,
        free_episode_count: 3,
        total_episode_count: 10,
        reaction_score: 9.3,
        view_count: 1200,
        bundle_list_price: 3000,
        bundle_sale_price: 2100,
      },
      authorName: "시엘",
      tags: ["판타지", "회귀"],
      representativeEpisodePrice: 100,
      episodes: [],
    });

    expect(novel).toEqual(
      expect.objectContaining({
        id: "novel-1",
        title: "검은 별의 기록",
        author: "시엘",
        coverUrl: "https://example.com/cover.jpg",
        heroImageUrl: "https://example.com/banner.jpg",
        tags: ["판타지", "회귀"],
        totalEpisodes: 10,
        freeEpisodes: 3,
        pricePerEpisode: 100,
        salePercent: 30,
        salePrice: 2100,
        status: "연재중",
        source: "INKROAD",
      })
    );
  });

  it("maps a remote episode row into the mobile Episode shape", () => {
    const episode = mapRemoteEpisodeToMobileEpisode({
      id: "episode-1",
      episode_number: 4,
      title: "4화",
      teaser: "다음 장면 미리보기",
      access_type: "paid",
      price: 120,
      body: "본문",
    });

    expect(episode).toEqual({
      id: "episode-1",
      number: 4,
      title: "4화",
      summary: "다음 장면 미리보기",
      isFree: false,
      price: 120,
      body: "본문",
    });
  });

  it("calculates sale percent only when both list and sale prices are valid", () => {
    expect(calculateSalePercent(3000, 2100)).toBe(30);
    expect(calculateSalePercent(0, 2100)).toBeUndefined();
    expect(calculateSalePercent(null, null)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the mapper test to verify it fails**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- src/mobile/reader/__tests__/mappers.test.ts --runInBand
```

Expected: FAIL because `mappers.ts` and reader types do not exist yet.

- [ ] **Step 3: Define remote reader types**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/types.ts
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
```

- [ ] **Step 4: Implement the mobile mapper helpers**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/mappers.ts
import type { Episode, Novel } from "../types";
import type { RemoteEpisodeRow, RemoteNovelAggregate } from "./types";

export function calculateSalePercent(
  listPrice: number | null | undefined,
  salePrice: number | null | undefined
) {
  if (!listPrice || !salePrice || listPrice <= 0 || salePrice >= listPrice) {
    return undefined;
  }

  return Math.round(((listPrice - salePrice) / listPrice) * 100);
}

export function mapRemoteEpisodeToMobileEpisode(row: RemoteEpisodeRow): Episode {
  return {
    id: row.id,
    number: row.episode_number,
    title: row.title,
    summary: row.teaser ?? "",
    isFree: row.access_type === "free",
    price: row.price ?? 0,
    body: row.body,
  };
}

export function mapRemoteNovelToMobileNovel(input: RemoteNovelAggregate): Novel {
  const salePercent = calculateSalePercent(
    input.novel.bundle_list_price,
    input.novel.bundle_sale_price
  );

  return {
    id: input.novel.id,
    title: input.novel.title,
    author: input.authorName,
    coverUrl: input.novel.cover_url ?? "",
    heroImageUrl: input.novel.banner_url ?? input.novel.cover_url ?? "",
    tagline: input.novel.short_description ?? "",
    synopsis: input.novel.description,
    tags: input.tags,
    views: input.novel.view_count,
    rating: input.novel.reaction_score,
    totalEpisodes: input.novel.total_episode_count,
    freeEpisodes: input.novel.free_episode_count,
    pricePerEpisode: input.representativeEpisodePrice,
    salePercent,
    salePrice: input.novel.bundle_sale_price ?? undefined,
    status: input.novel.status === "completed" ? "완결" : "연재중",
    source: "INKROAD",
    episodes: input.episodes.map(mapRemoteEpisodeToMobileEpisode),
  };
}
```

- [ ] **Step 5: Keep the shared mobile types compatible**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/types.ts
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
```

- [ ] **Step 6: Run the mapper test to verify it passes**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- src/mobile/reader/__tests__/mappers.test.ts --runInBand
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd /home/ciel/nova
git add inkroad-app/src/mobile/types.ts \
  inkroad-app/src/mobile/reader/types.ts \
  inkroad-app/src/mobile/reader/mappers.ts \
  inkroad-app/src/mobile/reader/__tests__/mappers.test.ts
git commit -m "feat: add reader catalog mappers"
```

---

### Task 2: Build the reader repository with failing repository tests first

**Files:**
- Create: `/home/ciel/nova/inkroad-app/src/mobile/reader/repository.ts`
- Create: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/repository.test.ts`

- [ ] **Step 1: Write the failing repository test**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/repository.test.ts
import { createReaderRepository } from "../repository";

jest.mock("../../../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("createReaderRepository", () => {
  it("returns catalog sections ordered for home", async () => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");
    const novelsQuery = {
      select: jest.fn().mockReturnThis(),
      neq: jest.fn().mockResolvedValue({
        data: [
          {
            id: "novel-1",
            slug: "n1",
            title: "가장 인기작",
            short_description: "짧은 소개",
            description: "긴 소개",
            cover_url: "cover-1",
            banner_url: "banner-1",
            status: "published",
            is_translation: false,
            free_episode_count: 3,
            total_episode_count: 30,
            reaction_score: 9.7,
            view_count: 99999,
            bundle_list_price: 1000,
            bundle_sale_price: 700,
            authors: { pen_name: "작가1" },
            novel_tags: [{ tags: { name: "판타지" } }],
            episodes: [
              {
                id: "ep-1",
                episode_number: 1,
                title: "1화",
                teaser: "첫 회차",
                access_type: "free",
                price: 0,
                published_at: "2026-04-20T00:00:00Z",
                episode_contents: { body: "본문" },
              },
            ],
          },
        ],
        error: null,
      }),
    };

    supabase.from.mockReturnValue(novelsQuery);

    const repo = createReaderRepository();
    const sections = await repo.getHomeSections();

    expect(sections.hero?.title).toBe("가장 인기작");
    expect(sections.popular[0]?.title).toBe("가장 인기작");
    expect(sections.sale[0]?.salePercent).toBe(30);
  });

  it("returns a detail payload with public episodes only", async () => {
    const { supabase } = jest.requireMock("../../../../lib/supabase");
    const novelsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "novel-1",
          slug: "n1",
          title: "작품",
          short_description: null,
          description: "설명",
          cover_url: "cover",
          banner_url: null,
          status: "published",
          is_translation: false,
          free_episode_count: 1,
          total_episode_count: 3,
          reaction_score: 8.9,
          view_count: 10,
          bundle_list_price: null,
          bundle_sale_price: null,
          authors: { pen_name: "작가" },
          novel_tags: [],
          episodes: [
            {
              id: "ep-1",
              episode_number: 1,
              title: "1화",
              teaser: "공개",
              access_type: "free",
              price: 0,
              published_at: "2026-04-20T00:00:00Z",
              status: "published",
              episode_contents: { body: "본문1" },
            },
            {
              id: "ep-2",
              episode_number: 2,
              title: "2화",
              teaser: "초안",
              access_type: "paid",
              price: 100,
              published_at: null,
              status: "draft",
              episode_contents: { body: "본문2" },
            },
          ],
        },
        error: null,
      }),
    };

    supabase.from.mockReturnValue(novelsQuery);

    const repo = createReaderRepository();
    const detail = await repo.getNovelDetail("novel-1");

    expect(detail?.novel.id).toBe("novel-1");
    expect(detail?.episodes).toHaveLength(1);
    expect(detail?.episodes[0].number).toBe(1);
  });
});
```

- [ ] **Step 2: Run the repository test to verify it fails**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- src/mobile/reader/__tests__/repository.test.ts --runInBand
```

Expected: FAIL because `createReaderRepository` does not exist yet.

- [ ] **Step 3: Implement the repository interface**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/repository.ts
import { supabase } from "../../../lib/supabase";
import type { Episode, Novel } from "../types";
import { mapRemoteNovelToMobileNovel } from "./mappers";

type HomeSections = {
  hero: Novel | null;
  sale: Novel[];
  popular: Novel[];
  recent: Novel[];
};

type NovelDetailPayload = {
  novel: Novel;
  episodes: Episode[];
};

function toAggregate(row: any) {
  const publicEpisodes = (row.episodes ?? [])
    .filter((episode: any) => episode.status === "published")
    .map((episode: any) => ({
      id: episode.id,
      episode_number: episode.episode_number,
      title: episode.title,
      teaser: episode.teaser,
      access_type: episode.access_type,
      price: episode.price,
      body: episode.episode_contents?.body ?? "",
      published_at: episode.published_at,
    }))
    .sort((left: any, right: any) => left.episode_number - right.episode_number);

  const prices = publicEpisodes
    .filter((episode: any) => episode.access_type === "paid" && (episode.price ?? 0) > 0)
    .map((episode: any) => Number(episode.price));

  return {
    novel: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      short_description: row.short_description,
      description: row.description,
      cover_url: row.cover_url,
      banner_url: row.banner_url,
      status: row.status,
      is_translation: row.is_translation,
      free_episode_count: row.free_episode_count,
      total_episode_count: row.total_episode_count,
      reaction_score: row.reaction_score,
      view_count: row.view_count,
      bundle_list_price: row.bundle_list_price,
      bundle_sale_price: row.bundle_sale_price,
    },
    authorName: row.authors?.pen_name ?? "INKROAD",
    tags: (row.novel_tags ?? [])
      .map((entry: any) => entry.tags?.name)
      .filter(Boolean),
    representativeEpisodePrice: prices[0] ?? 0,
    episodes: publicEpisodes,
  };
}

async function fetchPublicNovelRows() {
  const result = await supabase
    .from("novels")
    .select(`
      id, slug, title, short_description, description, cover_url, banner_url,
      status, is_translation, free_episode_count, total_episode_count,
      reaction_score, view_count, bundle_list_price, bundle_sale_price,
      authors:author_id ( pen_name ),
      novel_tags ( tags:tag_id ( name ) ),
      episodes (
        id, episode_number, title, teaser, access_type, price, status, published_at,
        episode_contents ( body )
      )
    `)
    .neq("status", "draft");

  if (result.error) throw result.error;
  return (result.data ?? []).map(toAggregate);
}

export function createReaderRepository() {
  return {
    async getHomeSections(): Promise<HomeSections> {
      const novels = (await fetchPublicNovelRows()).map(mapRemoteNovelToMobileNovel);
      const hero = novels[0] ?? null;
      const sale = novels.filter((novel) => typeof novel.salePercent === "number").slice(0, 6);
      const popular = [...novels]
        .sort((left, right) => right.views - left.views || right.rating - left.rating)
        .slice(0, 6);
      const recent = [...novels]
        .sort(
          (left, right) =>
            (right.episodes[right.episodes.length - 1]?.number ?? 0) -
            (left.episodes[left.episodes.length - 1]?.number ?? 0)
        )
        .slice(0, 6);

      return { hero, sale, popular, recent };
    },

    async searchCatalog() {
      return (await fetchPublicNovelRows()).map(mapRemoteNovelToMobileNovel);
    },

    async getNovelDetail(novelId: string): Promise<NovelDetailPayload | null> {
      const result = await supabase
        .from("novels")
        .select(`
          id, slug, title, short_description, description, cover_url, banner_url,
          status, is_translation, free_episode_count, total_episode_count,
          reaction_score, view_count, bundle_list_price, bundle_sale_price,
          authors:author_id ( pen_name ),
          novel_tags ( tags:tag_id ( name ) ),
          episodes (
            id, episode_number, title, teaser, access_type, price, status, published_at,
            episode_contents ( body )
          )
        `)
        .eq("id", novelId)
        .maybeSingle();

      if (result.error) throw result.error;
      if (!result.data) return null;

      const aggregate = toAggregate(result.data);
      const novel = mapRemoteNovelToMobileNovel(aggregate);
      return { novel, episodes: novel.episodes };
    },

    async getEpisodeView(novelId: string, episodeNumber: number) {
      const detail = await this.getNovelDetail(novelId);
      if (!detail) return null;

      const currentEpisode =
        detail.episodes.find((episode) => episode.number === episodeNumber) ??
        detail.episodes[0] ??
        null;

      if (!currentEpisode) return null;

      const currentIndex = detail.episodes.findIndex(
        (episode) => episode.number === currentEpisode.number
      );

      return {
        novel: detail.novel,
        episode: currentEpisode,
        previousEpisode: currentIndex > 0 ? detail.episodes[currentIndex - 1] : null,
        nextEpisode:
          currentIndex >= 0 && currentIndex < detail.episodes.length - 1
            ? detail.episodes[currentIndex + 1]
            : null,
      };
    },
  };
}
```

- [ ] **Step 4: Run the repository test to verify it passes**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- src/mobile/reader/__tests__/repository.test.ts --runInBand
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/ciel/nova
git add inkroad-app/src/mobile/reader/repository.ts \
  inkroad-app/src/mobile/reader/__tests__/repository.test.ts
git commit -m "feat: add reader repository"
```

---

### Task 3: Convert Home and Search screens to the reader repository

**Files:**
- Create: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/home-screen.test.tsx`
- Create: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/search-screen.test.tsx`
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/screens/HomeScreen.tsx`
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/screens/SearchScreen.tsx`

- [ ] **Step 1: Write the failing Home screen test**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/home-screen.test.tsx
import { render, screen, waitFor } from "@testing-library/react-native";
import HomeScreen from "../../screens/HomeScreen";

jest.mock("../repository", () => ({
  createReaderRepository: () => ({
    getHomeSections: jest.fn().mockResolvedValue({
      hero: {
        id: "novel-1",
        title: "실데이터 히어로",
        author: "작가",
        coverUrl: "cover",
        heroImageUrl: "cover",
        tagline: "",
        synopsis: "소개",
        tags: ["판타지"],
        views: 100,
        rating: 9.0,
        totalEpisodes: 12,
        freeEpisodes: 3,
        pricePerEpisode: 100,
        salePercent: 20,
        salePrice: 800,
        status: "연재중",
        source: "INKROAD",
        episodes: [],
      },
      sale: [],
      popular: [],
      recent: [],
    }),
  }),
}));

describe("HomeScreen", () => {
  it("renders repository-backed hero title", async () => {
    render(<HomeScreen />);
    await waitFor(() => {
      expect(screen.getByText("실데이터 히어로")).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Write the failing Search screen test**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/search-screen.test.tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import SearchScreen from "../../screens/SearchScreen";

jest.mock("../repository", () => ({
  createReaderRepository: () => ({
    searchCatalog: jest.fn().mockResolvedValue([
      {
        id: "novel-1",
        title: "회귀 마도서",
        author: "시엘",
        coverUrl: "cover",
        heroImageUrl: "cover",
        tagline: "",
        synopsis: "설명",
        tags: ["판타지", "회귀"],
        views: 100,
        rating: 9.1,
        totalEpisodes: 20,
        freeEpisodes: 5,
        pricePerEpisode: 100,
        status: "연재중",
        source: "INKROAD",
        episodes: [],
      },
    ]),
  }),
}));

describe("SearchScreen", () => {
  it("filters repository results with query text", async () => {
    render(<SearchScreen />);
    await waitFor(() => {
      expect(screen.getByText("회귀 마도서")).toBeTruthy();
    });

    fireEvent.changeText(
      screen.getByPlaceholderText("작품명, 저자, 태그 검색.."),
      "없는 검색어"
    );

    await waitFor(() => {
      expect(screen.queryByText("회귀 마도서")).toBeNull();
    });
  });
});
```

- [ ] **Step 3: Run the screen tests to verify they fail**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- \
  src/mobile/reader/__tests__/home-screen.test.tsx \
  src/mobile/reader/__tests__/search-screen.test.tsx \
  --runInBand
```

Expected: FAIL because the screens still read `mockInkroad`.

- [ ] **Step 4: Refactor HomeScreen to load repository data**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/screens/HomeScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import { createReaderRepository } from "../reader/repository";

const readerRepository = createReaderRepository();

export default function HomeScreen() {
  const router = useRouter();
  const [state, setState] = useState({
    hero: null,
    sale: [],
    popular: [],
    recent: [],
    loading: true,
    error: null as string | null,
  });

  useEffect(() => {
    let cancelled = false;
    readerRepository
      .getHomeSections()
      .then((sections) => {
        if (!cancelled) {
          setState({ ...sections, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error instanceof Error ? error.message : "작품을 불러오지 못했습니다.",
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppHeader showSearch showProfile />
        <View style={styles.center}>
          <Text style={styles.statusText}>작품을 불러오는 중입니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state.error || !state.hero) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppHeader showSearch showProfile />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>작품을 불러오지 못했어요</Text>
          <Text style={styles.statusText}>{state.error ?? "공개된 작품이 없습니다."}</Text>
        </View>
      </SafeAreaView>
    );
  }
```

- [ ] **Step 5: Refactor SearchScreen to load repository data and filter in memory**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/screens/SearchScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import { createReaderRepository } from "../reader/repository";

const readerRepository = createReaderRepository();

export default function SearchScreen() {
  const params = useLocalSearchParams<{ tag?: string }>();
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(params.tag || "전체");
  const [catalog, setCatalog] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    readerRepository
      .searchCatalog()
      .then((items) => {
        if (!cancelled) {
          setCatalog(items);
          setLoading(false);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "검색 목록을 불러오지 못했습니다.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const genreLabels = useMemo(() => {
    const tags = Array.from(new Set(catalog.flatMap((novel) => novel.tags))).sort();
    return ["전체", ...tags];
  }, [catalog]);

  const filteredNovels = useMemo(() => {
    return catalog.filter((novel) => {
      const haystack = [novel.title, novel.author, novel.tags.join(" ")]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      const matchesTag = selectedTag === "전체" || novel.tags.includes(selectedTag);
      return matchesQuery && matchesTag;
    });
  }, [catalog, query, selectedTag]);
```

- [ ] **Step 6: Run the screen tests to verify they pass**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- \
  src/mobile/reader/__tests__/home-screen.test.tsx \
  src/mobile/reader/__tests__/search-screen.test.tsx \
  --runInBand
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd /home/ciel/nova
git add inkroad-app/src/mobile/screens/HomeScreen.tsx \
  inkroad-app/src/mobile/screens/SearchScreen.tsx \
  inkroad-app/src/mobile/reader/__tests__/home-screen.test.tsx \
  inkroad-app/src/mobile/reader/__tests__/search-screen.test.tsx
git commit -m "feat: connect home and search to reader catalog"
```

---

### Task 4: Convert Detail and Viewer screens to the reader repository

**Files:**
- Create: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/novel-detail-screen.test.tsx`
- Create: `/home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/novel-viewer-screen.test.tsx`
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/screens/NovelDetailScreen.tsx`
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/screens/NovelViewerScreen.tsx`

- [ ] **Step 1: Write the failing detail screen test**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/novel-detail-screen.test.tsx
import { render, screen, waitFor } from "@testing-library/react-native";
import NovelDetailScreen from "../../screens/NovelDetailScreen";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "novel-1" }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock("../repository", () => ({
  createReaderRepository: () => ({
    getNovelDetail: jest.fn().mockResolvedValue({
      novel: {
        id: "novel-1",
        title: "실데이터 상세",
        author: "작가",
        coverUrl: "cover",
        heroImageUrl: "cover",
        tagline: "",
        synopsis: "실제 설명",
        tags: ["판타지"],
        views: 100,
        rating: 9.1,
        totalEpisodes: 2,
        freeEpisodes: 1,
        pricePerEpisode: 100,
        status: "연재중",
        source: "INKROAD",
        episodes: [],
      },
      episodes: [
        {
          id: "ep-1",
          number: 1,
          title: "프롤로그",
          summary: "첫 회차",
          isFree: true,
          price: 0,
          body: "본문",
        },
      ],
    }),
  }),
}));

describe("NovelDetailScreen", () => {
  it("renders repository-backed synopsis and episode list", async () => {
    render(<NovelDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText("실제 설명")).toBeTruthy();
      expect(screen.getByText("1화 · 프롤로그")).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Write the failing viewer screen test**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/reader/__tests__/novel-viewer-screen.test.tsx
import { render, screen, waitFor } from "@testing-library/react-native";
import NovelViewerScreen from "../../screens/NovelViewerScreen";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "novel-1", episode: "2" }),
  useRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
}));

jest.mock("../repository", () => ({
  createReaderRepository: () => ({
    getEpisodeView: jest.fn().mockResolvedValue({
      novel: {
        id: "novel-1",
        title: "실데이터 뷰어",
        author: "작가",
        coverUrl: "cover",
        heroImageUrl: "cover",
        tagline: "",
        synopsis: "",
        tags: [],
        views: 100,
        rating: 9,
        totalEpisodes: 3,
        freeEpisodes: 1,
        pricePerEpisode: 100,
        status: "연재중",
        source: "INKROAD",
        episodes: [],
      },
      episode: {
        id: "ep-2",
        number: 2,
        title: "2화",
        summary: "",
        isFree: false,
        price: 120,
        body: "실제 본문",
      },
      previousEpisode: {
        id: "ep-1",
        number: 1,
        title: "1화",
        summary: "",
        isFree: true,
        price: 0,
        body: "이전",
      },
      nextEpisode: null,
    }),
  }),
}));

describe("NovelViewerScreen", () => {
  it("renders the repository-backed body and progress label", async () => {
    render(<NovelViewerScreen />);
    await waitFor(() => {
      expect(screen.getByText("실제 본문")).toBeTruthy();
      expect(screen.getByText("2 / 3")).toBeTruthy();
    });
  });
});
```

- [ ] **Step 3: Run the detail and viewer tests to verify they fail**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- \
  src/mobile/reader/__tests__/novel-detail-screen.test.tsx \
  src/mobile/reader/__tests__/novel-viewer-screen.test.tsx \
  --runInBand
```

Expected: FAIL because both screens still read `mockInkroad`.

- [ ] **Step 4: Refactor NovelDetailScreen to load the repository payload**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/screens/NovelDetailScreen.tsx
import React, { useEffect, useState } from "react";
import { createReaderRepository } from "../reader/repository";

const readerRepository = createReaderRepository();

export default function NovelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [payload, setPayload] = useState<Awaited<
    ReturnType<ReturnType<typeof createReaderRepository>["getNovelDetail"]>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    readerRepository
      .getNovelDetail(id)
      .then((result) => {
        if (!cancelled) {
          setPayload(result);
          setLoading(false);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "상세 정보를 불러오지 못했습니다.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);
```

- [ ] **Step 5: Refactor NovelViewerScreen to load an episode view payload**

```ts
// /home/ciel/nova/inkroad-app/src/mobile/screens/NovelViewerScreen.tsx
import React, { useEffect, useState } from "react";
import { createReaderRepository } from "../reader/repository";

const readerRepository = createReaderRepository();

export default function NovelViewerScreen() {
  const { id, episode } = useLocalSearchParams<{ id: string; episode?: string }>();
  const router = useRouter();
  const episodeNumber = Number(episode ?? 1);
  const [payload, setPayload] = useState<Awaited<
    ReturnType<ReturnType<typeof createReaderRepository>["getEpisodeView"]>
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    readerRepository
      .getEpisodeView(id, episodeNumber)
      .then((result) => {
        if (!cancelled) {
          setPayload(result);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, episodeNumber]);
```

- [ ] **Step 6: Run the detail and viewer tests to verify they pass**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- \
  src/mobile/reader/__tests__/novel-detail-screen.test.tsx \
  src/mobile/reader/__tests__/novel-viewer-screen.test.tsx \
  --runInBand
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd /home/ciel/nova
git add inkroad-app/src/mobile/screens/NovelDetailScreen.tsx \
  inkroad-app/src/mobile/screens/NovelViewerScreen.tsx \
  inkroad-app/src/mobile/reader/__tests__/novel-detail-screen.test.tsx \
  inkroad-app/src/mobile/reader/__tests__/novel-viewer-screen.test.tsx
git commit -m "feat: connect detail and viewer to reader catalog"
```

---

### Task 5: Run the full reader verification pass

**Files:**
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/screens/HomeScreen.tsx`
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/screens/SearchScreen.tsx`
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/screens/NovelDetailScreen.tsx`
- Modify: `/home/ciel/nova/inkroad-app/src/mobile/screens/NovelViewerScreen.tsx`

- [ ] **Step 1: Run the full reader test set**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- \
  src/mobile/reader/__tests__/mappers.test.ts \
  src/mobile/reader/__tests__/repository.test.ts \
  src/mobile/reader/__tests__/home-screen.test.tsx \
  src/mobile/reader/__tests__/search-screen.test.tsx \
  src/mobile/reader/__tests__/novel-detail-screen.test.tsx \
  src/mobile/reader/__tests__/novel-viewer-screen.test.tsx \
  --runInBand
```

Expected: PASS

- [ ] **Step 2: Run the existing mobile regression tests that can be affected**

Run:

```bash
cd /home/ciel/nova/inkroad-app
TMPDIR=/tmp npm test -- \
  src/mobile/creator/__tests__/author-repository.test.ts \
  src/mobile/creator/__tests__/author-home-screen.test.tsx \
  src/mobile/creator/__tests__/author-work-screen.test.tsx \
  src/mobile/creator/__tests__/episode-composer-screen.test.tsx \
  src/mobile/utils/__tests__/supabase-client.test.ts \
  --runInBand
```

Expected: PASS

- [ ] **Step 3: Review mock decoupling and screen imports**

Run:

```bash
cd /home/ciel/nova/inkroad-app
rg -n "mockInkroad|getNovelById|getNovelList|novels" src/mobile/screens/HomeScreen.tsx src/mobile/screens/SearchScreen.tsx src/mobile/screens/NovelDetailScreen.tsx src/mobile/screens/NovelViewerScreen.tsx
```

Expected: no hits

- [ ] **Step 4: Commit**

```bash
cd /home/ciel/nova
git add inkroad-app/src/mobile/screens/HomeScreen.tsx \
  inkroad-app/src/mobile/screens/SearchScreen.tsx \
  inkroad-app/src/mobile/screens/NovelDetailScreen.tsx \
  inkroad-app/src/mobile/screens/NovelViewerScreen.tsx \
  inkroad-app/src/mobile/reader
git commit -m "test: verify reader catalog live data flow"
```
