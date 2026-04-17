# Mobile Creator Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expo 앱에 작가 전용 탭을 추가하고, 모바일에서 작품 관리, 회차 목록, 회차 작성, 연출 서식 미리보기까지 가능한 1차 작가 스튜디오를 만든다.

**Architecture:** 기존 `inkroad-app`의 Expo Router 탭 구조를 유지하면서 `author` 탭과 하위 stack route를 추가한다. 데이터는 기존 `mockInkroad.ts` 패턴을 확장한 `AuthorRepository` 인터페이스 + 목업 구현으로 시작하고, 회차 작성은 별도 `episode editor` 화면으로 분리해 입력/미리보기/임시저장을 담당하게 한다.

**Tech Stack:** Expo Router, React Native, TypeScript, AsyncStorage, Jest + jest-expo + React Native Testing Library

---

## File Structure

### Create

- `D:\nova\inkroad-app\jest.config.js`
- `D:\nova\inkroad-app\jest.setup.ts`
- `D:\nova\inkroad-app\src\mobile\creator\types.ts`
- `D:\nova\inkroad-app\src\mobile\creator\repository.ts`
- `D:\nova\inkroad-app\src\mobile\creator\storage.ts`
- `D:\nova\inkroad-app\src\mobile\creator\__tests__\author-repository.test.ts`
- `D:\nova\inkroad-app\src\mobile\creator\__tests__\episode-editor-state.test.ts`
- `D:\nova\inkroad-app\src\mobile\screens\AuthorHomeScreen.tsx`
- `D:\nova\inkroad-app\src\mobile\screens\AuthorWorkScreen.tsx`
- `D:\nova\inkroad-app\src\mobile\screens\EpisodeComposerScreen.tsx`
- `D:\nova\inkroad-app\app\(tabs)\author.tsx`
- `D:\nova\inkroad-app\app\author\work\[id].tsx`
- `D:\nova\inkroad-app\app\author\episode\[novelId].tsx`

### Modify

- `D:\nova\inkroad-app\package.json`
- `D:\nova\inkroad-app\src\mobile\types.ts`
- `D:\nova\inkroad-app\src\mobile\data\mockInkroad.ts`
- `D:\nova\inkroad-app\app\(tabs)\_layout.tsx`
- `D:\nova\inkroad-app\app\_layout.tsx`
- `D:\nova\inkroad-app\src\mobile\screens\ProfileScreen.tsx`
- `D:\nova\inkroad-app\src\mobile\README.md`
- `D:\nova\inkroad-app\src\mobile\screens\FormatStudioScreen.tsx`

### Test

- `D:\nova\inkroad-app\src\mobile\creator\__tests__\author-repository.test.ts`
- `D:\nova\inkroad-app\src\mobile\creator\__tests__\episode-editor-state.test.ts`

---

### Task 1: Add test harness and creator domain model

**Files:**
- Create: `D:\nova\inkroad-app\jest.config.js`
- Create: `D:\nova\inkroad-app\jest.setup.ts`
- Create: `D:\nova\inkroad-app\src\mobile\creator\types.ts`
- Create: `D:\nova\inkroad-app\src\mobile\creator\repository.ts`
- Create: `D:\nova\inkroad-app\src\mobile\creator\storage.ts`
- Create: `D:\nova\inkroad-app\src\mobile\creator\__tests__\author-repository.test.ts`
- Modify: `D:\nova\inkroad-app\package.json`
- Modify: `D:\nova\inkroad-app\src\mobile\types.ts`
- Modify: `D:\nova\inkroad-app\src\mobile\data\mockInkroad.ts`

- [ ] **Step 1: Add test scripts and dev dependencies**

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest --runInBand",
    "test:watch": "jest --watch"
  },
  "devDependencies": {
    "@testing-library/jest-native": "^5.4.3",
    "@testing-library/react-native": "^13.3.3",
    "@types/jest": "^30.0.0",
    "jest": "^30.0.5",
    "jest-expo": "~54.0.7",
    "react-test-renderer": "19.1.0",
    "typescript": "~5.9.2"
  }
}
```

- [ ] **Step 2: Create Jest config**

```js
// D:\\nova\\inkroad-app\\jest.config.js
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["/node_modules/"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-router|@expo/.*))",
  ],
};
```

- [ ] **Step 3: Create Jest setup**

```ts
// D:\\nova\\inkroad-app\\jest.setup.ts
import "@testing-library/jest-native/extend-expect";
```

- [ ] **Step 4: Extend the shared mobile types with creator-facing shapes**

```ts
// D:\\nova\\inkroad-app\\src\\mobile\\types.ts
export interface EpisodeDraft {
  novelId: string;
  episodeId?: string;
  title: string;
  accessType: "free" | "paid";
  price: number;
  body: string;
}

export interface AuthorWorkSummary {
  id: string;
  title: string;
  coverUrl: string;
  status: "연재중" | "완결";
  totalEpisodes: number;
  updatedAt: string;
}

export interface AuthorEpisodeSummary {
  id: string;
  novelId: string;
  number: number;
  title: string;
  accessType: "free" | "paid";
  price: number;
  updatedAt: string;
}
```

- [ ] **Step 5: Create creator-specific types**

```ts
// D:\\nova\\inkroad-app\\src\\mobile\\creator\\types.ts
import type { AuthorEpisodeSummary, AuthorWorkSummary, EpisodeDraft } from "../types";

export interface AuthorRepository {
  listWorks(): Promise<AuthorWorkSummary[]>;
  getWork(workId: string): Promise<AuthorWorkSummary | null>;
  listEpisodes(workId: string): Promise<AuthorEpisodeSummary[]>;
  loadDraft(workId: string, episodeId?: string): Promise<EpisodeDraft>;
  saveDraft(input: EpisodeDraft): Promise<EpisodeDraft>;
  publishDraft(input: EpisodeDraft): Promise<EpisodeDraft>;
}
```

- [ ] **Step 6: Write the failing repository test**

```ts
// D:\\nova\\inkroad-app\\src\\mobile\\creator\\__tests__\\author-repository.test.ts
import { createMockAuthorRepository } from "../repository";

describe("createMockAuthorRepository", () => {
  it("returns creator works and episode summaries for a selected work", async () => {
    const repo = createMockAuthorRepository();

    const works = await repo.listWorks();
    expect(works.length).toBeGreaterThan(0);
    expect(works[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: expect.any(String),
        totalEpisodes: expect.any(Number),
      })
    );

    const episodes = await repo.listEpisodes(works[0].id);
    expect(episodes.length).toBeGreaterThan(0);
    expect(episodes[0]).toEqual(
      expect.objectContaining({
        novelId: works[0].id,
        title: expect.any(String),
      })
    );
  });
});
```

- [ ] **Step 7: Run the repository test to verify it fails**

Run:

```bash
cd D:\nova\inkroad-app
npm test -- --runTestsByPath src/mobile/creator/__tests__/author-repository.test.ts
```

Expected: FAIL because `createMockAuthorRepository` does not exist yet.

- [ ] **Step 8: Implement minimal mock repository**

```ts
// D:\\nova\\inkroad-app\\src\\mobile\\creator\\repository.ts
import { novels } from "../data/mockInkroad";
import type { AuthorEpisodeSummary, AuthorWorkSummary, EpisodeDraft } from "../types";
import type { AuthorRepository } from "./types";

function nowStamp() {
  return "2026-04-18T12:00:00+09:00";
}

export function createMockAuthorRepository(): AuthorRepository {
  return {
    async listWorks() {
      return novels.map<AuthorWorkSummary>((novel) => ({
        id: novel.id,
        title: novel.title,
        coverUrl: novel.coverUrl,
        status: novel.status,
        totalEpisodes: novel.episodes.length,
        updatedAt: nowStamp(),
      }));
    },
    async getWork(workId) {
      const work = novels.find((novel) => novel.id === workId);
      return work
        ? {
            id: work.id,
            title: work.title,
            coverUrl: work.coverUrl,
            status: work.status,
            totalEpisodes: work.episodes.length,
            updatedAt: nowStamp(),
          }
        : null;
    },
    async listEpisodes(workId) {
      const work = novels.find((novel) => novel.id === workId);
      if (!work) return [];
      return work.episodes.map<AuthorEpisodeSummary>((episode) => ({
        id: episode.id,
        novelId: work.id,
        number: episode.number,
        title: episode.title,
        accessType: episode.isFree ? "free" : "paid",
        price: episode.price,
        updatedAt: nowStamp(),
      }));
    },
    async loadDraft(workId, episodeId) {
      const work = novels.find((novel) => novel.id === workId);
      const episode = work?.episodes.find((item) => item.id === episodeId);
      return {
        novelId: workId,
        episodeId,
        title: episode?.title ?? "",
        accessType: episode?.isFree === false ? "paid" : "free",
        price: episode?.price ?? 100,
        body: episode?.body ?? "",
      };
    },
    async saveDraft(input) {
      return input;
    },
    async publishDraft(input) {
      return input;
    },
  };
}
```

- [ ] **Step 9: Add AsyncStorage helpers for later draft persistence**

```ts
// D:\\nova\\inkroad-app\\src\\mobile\\creator\\storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { EpisodeDraft } from "../types";

const keyFor = (novelId: string, episodeId?: string) =>
  `inkroad:draft:${novelId}:${episodeId ?? "new"}`;

export async function saveLocalDraft(draft: EpisodeDraft) {
  await AsyncStorage.setItem(keyFor(draft.novelId, draft.episodeId), JSON.stringify(draft));
}

export async function loadLocalDraft(novelId: string, episodeId?: string) {
  const raw = await AsyncStorage.getItem(keyFor(novelId, episodeId));
  return raw ? (JSON.parse(raw) as EpisodeDraft) : null;
}
```

- [ ] **Step 10: Run the repository test to verify it passes**

Run:

```bash
cd D:\nova\inkroad-app
npm test -- --runTestsByPath src/mobile/creator/__tests__/author-repository.test.ts
```

Expected: PASS

- [ ] **Step 11: Commit**

```bash
cd D:\nova
git add inkroad-app/package.json inkroad-app/jest.config.js inkroad-app/jest.setup.ts inkroad-app/src/mobile/types.ts inkroad-app/src/mobile/creator inkroad-app/src/mobile/data/mockInkroad.ts
git commit -m "feat: add creator domain model and test harness"
```

---

### Task 2: Add the author tab and creator home screen

**Files:**
- Create: `D:\nova\inkroad-app\src\mobile\screens\AuthorHomeScreen.tsx`
- Create: `D:\nova\inkroad-app\app\(tabs)\author.tsx`
- Modify: `D:\nova\inkroad-app\app\(tabs)\_layout.tsx`
- Test: `D:\nova\inkroad-app\src\mobile\creator\__tests__\author-home-screen.test.tsx`

- [ ] **Step 1: Write the failing screen test**

```ts
// D:\\nova\\inkroad-app\\src\\mobile\\creator\\__tests__\\author-home-screen.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react-native";

import AuthorHomeScreen from "../../screens/AuthorHomeScreen";

describe("AuthorHomeScreen", () => {
  it("shows creator actions and work cards", async () => {
    render(<AuthorHomeScreen />);

    expect(await screen.findByText("작가 스튜디오")).toBeTruthy();
    expect(await screen.findByText("새 회차 쓰기")).toBeTruthy();
    expect(await screen.findByText("최근 작업 이어쓰기")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the screen test to verify it fails**

Run:

```bash
cd D:\nova\inkroad-app
npm test -- --runTestsByPath src/mobile/creator/__tests__/author-home-screen.test.tsx
```

Expected: FAIL because `AuthorHomeScreen` does not exist yet.

- [ ] **Step 3: Add the new author tab route**

```tsx
// D:\\nova\\inkroad-app\\app\\(tabs)\\author.tsx
import AuthorHomeScreen from "../../src/mobile/screens/AuthorHomeScreen";

export default function AuthorRoute() {
  return <AuthorHomeScreen />;
}
```

- [ ] **Step 4: Add the author tab to the tab layout**

```tsx
// D:\\nova\\inkroad-app\\app\\(tabs)\\_layout.tsx
<Tabs.Screen
  name="author"
  options={{
    title: "작가",
    tabBarIcon: ({ color }) => <MaterialIcons name="edit-square" size={24} color={color} />,
  }}
/>
```

- [ ] **Step 5: Implement the creator home screen**

```tsx
// D:\\nova\\inkroad-app\\src\\mobile\\screens\\AuthorHomeScreen.tsx
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { createMockAuthorRepository } from "../creator/repository";
import type { AuthorWorkSummary } from "../types";
import { inkroadTheme } from "../theme";

const repo = createMockAuthorRepository();

export default function AuthorHomeScreen() {
  const router = useRouter();
  const [works, setWorks] = useState<AuthorWorkSummary[]>([]);

  useEffect(() => {
    repo.listWorks().then(setWorks);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: inkroadTheme.colors.background }}>
      <SafeAreaView edges={["top"]} />
      <AppHeader title="작가 스튜디오" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ gap: 8, padding: 18, borderRadius: 24, backgroundColor: "rgba(212,168,67,0.10)" }}>
          <Text selectable style={{ color: inkroadTheme.colors.fg1, fontSize: 26, fontWeight: "900" }}>작가 스튜디오</Text>
          <Text selectable style={{ color: inkroadTheme.colors.fgSoft, lineHeight: 22 }}>
            작품을 고르고, 회차를 이어 쓰고, 바로 발행할 수 있는 모바일 작업 공간입니다.
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={() => router.push("/author/episode/whan-book")} style={{ flex: 1, padding: 16, borderRadius: 18, backgroundColor: inkroadTheme.colors.inkGold }}>
            <Text selectable style={{ color: inkroadTheme.colors.fgOnGold, fontWeight: "900" }}>새 회차 쓰기</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/author/work/whan-book")} style={{ flex: 1, padding: 16, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.06)" }}>
            <Text selectable style={{ color: inkroadTheme.colors.fg1, fontWeight: "800" }}>최근 작업 이어쓰기</Text>
          </Pressable>
        </View>
        {works.map((work) => (
          <Pressable key={work.id} onPress={() => router.push(`/author/work/${work.id}`)} style={{ padding: 16, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.04)", gap: 6 }}>
            <Text selectable style={{ color: inkroadTheme.colors.fg1, fontWeight: "800", fontSize: 18 }}>{work.title}</Text>
            <Text selectable style={{ color: inkroadTheme.colors.fg3 }}>{work.status} · {work.totalEpisodes}화</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 6: Run the screen test to verify it passes**

Run:

```bash
cd D:\nova\inkroad-app
npm test -- --runTestsByPath src/mobile/creator/__tests__/author-home-screen.test.tsx
```

Expected: PASS

- [ ] **Step 7: Manual validation**

Run:

```bash
cd D:\nova\inkroad-app
npx expo start
```

Expected:

- 하단 탭에 `작가`가 보인다
- 작가 홈 상단에 `새 회차 쓰기`, `최근 작업 이어쓰기` 버튼이 보인다
- 작품 카드가 최소 1개 이상 보인다

- [ ] **Step 8: Commit**

```bash
cd D:\nova
git add inkroad-app/app/(tabs)/_layout.tsx inkroad-app/app/(tabs)/author.tsx inkroad-app/src/mobile/screens/AuthorHomeScreen.tsx inkroad-app/src/mobile/creator/__tests__/author-home-screen.test.tsx
git commit -m "feat: add mobile author home tab"
```

---

### Task 3: Add work management detail and episode list

**Files:**
- Create: `D:\nova\inkroad-app\src\mobile\screens\AuthorWorkScreen.tsx`
- Create: `D:\nova\inkroad-app\app\author\work\[id].tsx`
- Modify: `D:\nova\inkroad-app\app\_layout.tsx`
- Modify: `D:\nova\inkroad-app\src\mobile\creator\repository.ts`

- [ ] **Step 1: Write the failing work screen test**

```ts
import React from "react";
import { render, screen } from "@testing-library/react-native";

import AuthorWorkScreen from "../../screens/AuthorWorkScreen";

describe("AuthorWorkScreen", () => {
  it("shows work summary and episode list", async () => {
    render(<AuthorWorkScreen workId="whan-book" />);

    expect(await screen.findByText("회차 관리")).toBeTruthy();
    expect(await screen.findByText("새 회차 작성")).toBeTruthy();
    expect(await screen.findByText("프롤로그")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd D:\nova\inkroad-app
npm test -- --runTestsByPath src/mobile/creator/__tests__/author-work-screen.test.tsx
```

Expected: FAIL because the screen and route do not exist yet.

- [ ] **Step 3: Add route registration to the root stack**

```tsx
// D:\\nova\\inkroad-app\\app\\_layout.tsx
<Stack.Screen name="author/work/[id]" options={{ headerShown: false }} />
<Stack.Screen name="author/episode/[novelId]" options={{ headerShown: false }} />
```

- [ ] **Step 4: Add the work route wrapper**

```tsx
// D:\\nova\\inkroad-app\\app\\author\\work\\[id].tsx
import { useLocalSearchParams } from "expo-router";
import AuthorWorkScreen from "../../../src/mobile/screens/AuthorWorkScreen";

export default function AuthorWorkRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AuthorWorkScreen workId={id} />;
}
```

- [ ] **Step 5: Implement the work management screen**

```tsx
// D:\\nova\\inkroad-app\\src\\mobile\\screens\\AuthorWorkScreen.tsx
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { createMockAuthorRepository } from "../creator/repository";
import type { AuthorEpisodeSummary, AuthorWorkSummary } from "../types";
import { inkroadTheme } from "../theme";

const repo = createMockAuthorRepository();

export default function AuthorWorkScreen({ workId }: { workId: string }) {
  const router = useRouter();
  const [work, setWork] = useState<AuthorWorkSummary | null>(null);
  const [episodes, setEpisodes] = useState<AuthorEpisodeSummary[]>([]);

  useEffect(() => {
    repo.getWork(workId).then(setWork);
    repo.listEpisodes(workId).then(setEpisodes);
  }, [workId]);

  return (
    <View style={{ flex: 1, backgroundColor: inkroadTheme.colors.background }}>
      <SafeAreaView edges={["top"]} />
      <AppHeader title={work?.title ?? "작품 관리"} showBack />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text selectable style={{ color: inkroadTheme.colors.fg2, fontWeight: "800" }}>회차 관리</Text>
        <Pressable onPress={() => router.push(`/author/episode/${workId}`)} style={{ padding: 16, borderRadius: 18, backgroundColor: inkroadTheme.colors.inkGold }}>
          <Text selectable style={{ color: inkroadTheme.colors.fgOnGold, fontWeight: "900" }}>새 회차 작성</Text>
        </Pressable>
        {episodes.map((episode) => (
          <Pressable key={episode.id} onPress={() => router.push(`/author/episode/${workId}?episodeId=${episode.id}`)} style={{ padding: 16, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.04)", gap: 6 }}>
            <Text selectable style={{ color: inkroadTheme.colors.fg1, fontWeight: "800" }}>{episode.number}화 · {episode.title}</Text>
            <Text selectable style={{ color: inkroadTheme.colors.fg3 }}>{episode.accessType === "free" ? "무료 공개" : `유료 ${episode.price}G`}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run:

```bash
cd D:\nova\inkroad-app
npm test -- --runTestsByPath src/mobile/creator/__tests__/author-work-screen.test.tsx
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd D:\nova
git add inkroad-app/app/_layout.tsx inkroad-app/app/author/work/[id].tsx inkroad-app/src/mobile/screens/AuthorWorkScreen.tsx
git commit -m "feat: add mobile work management screen"
```

---

### Task 4: Build the episode composer with preview and local draft save

**Files:**
- Create: `D:\nova\inkroad-app\src\mobile\screens\EpisodeComposerScreen.tsx`
- Create: `D:\nova\inkroad-app\app\author\episode\[novelId].tsx`
- Create: `D:\nova\inkroad-app\src\mobile\creator\__tests__\episode-editor-state.test.ts`
- Modify: `D:\nova\inkroad-app\src\mobile\creator\repository.ts`
- Modify: `D:\nova\inkroad-app\src\mobile\screens\FormatStudioScreen.tsx`

- [ ] **Step 1: Write the failing editor-state test**

```ts
import { createEpisodeEditorState } from "../repository";

describe("createEpisodeEditorState", () => {
  it("requires title and body before publish becomes available", () => {
    const state = createEpisodeEditorState({
      novelId: "whan-book",
      title: "",
      accessType: "free",
      price: 100,
      body: "",
    });

    expect(state.canPublish).toBe(false);

    const next = state.update({ title: "제 4화. 검은 파문", body: "본문" });
    expect(next.canPublish).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd D:\nova\inkroad-app
npm test -- --runTestsByPath src/mobile/creator/__tests__/episode-editor-state.test.ts
```

Expected: FAIL because the editor state helper does not exist yet.

- [ ] **Step 3: Add the episode state helper**

```ts
// D:\\nova\\inkroad-app\\src\\mobile\\creator\\repository.ts
import type { EpisodeDraft } from "../types";

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
```

- [ ] **Step 4: Add the episode route wrapper**

```tsx
// D:\\nova\\inkroad-app\\app\\author\\episode\\[novelId].tsx
import { useLocalSearchParams } from "expo-router";
import EpisodeComposerScreen from "../../../src/mobile/screens/EpisodeComposerScreen";

export default function EpisodeComposerRoute() {
  const { novelId, episodeId } = useLocalSearchParams<{ novelId: string; episodeId?: string }>();
  return <EpisodeComposerScreen novelId={novelId} episodeId={episodeId} />;
}
```

- [ ] **Step 5: Implement the episode composer screen**

```tsx
// D:\\nova\\inkroad-app\\src\\mobile\\screens\\EpisodeComposerScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NovelFormatRenderer } from "../components/reader/NovelFormatRenderer";
import { createMockAuthorRepository, createEpisodeEditorState } from "../creator/repository";
import { loadLocalDraft, saveLocalDraft } from "../creator/storage";
import type { EpisodeDraft } from "../types";
import { inkroadTheme } from "../theme";

const repo = createMockAuthorRepository();

export default function EpisodeComposerScreen({ novelId, episodeId }: { novelId: string; episodeId?: string }) {
  const [draft, setDraft] = useState<EpisodeDraft>({
    novelId,
    episodeId,
    title: "",
    accessType: "free",
    price: 100,
    body: "",
  });
  const [status, setStatus] = useState("초안을 불러오는 중입니다...");

  useEffect(() => {
    (async () => {
      const local = await loadLocalDraft(novelId, episodeId);
      if (local) {
        setDraft(local);
        setStatus("임시저장된 초안을 불러왔어요.");
        return;
      }
      const remote = await repo.loadDraft(novelId, episodeId);
      setDraft(remote);
      setStatus("본문을 작성해 주세요.");
    })();
  }, [novelId, episodeId]);

  const editorState = useMemo(() => createEpisodeEditorState(draft), [draft]);

  async function updateDraft(patch: Partial<EpisodeDraft>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    await saveLocalDraft(next);
    setStatus("방금 저장됐어요.");
  }

  async function publish() {
    const published = await repo.publishDraft(draft);
    await saveLocalDraft(published);
    setStatus("발행 준비가 완료됐어요.");
  }

  return (
    <View style={{ flex: 1, backgroundColor: inkroadTheme.colors.background }}>
      <SafeAreaView edges={["top"]} />
      <AppHeader title="회차 작성" showBack />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text selectable style={{ color: inkroadTheme.colors.fg2 }}>{status}</Text>
        <TextInput value={draft.title} onChangeText={(title) => void updateDraft({ title })} placeholder="회차 제목" />
        <TextInput
          value={draft.body}
          multiline
          onChangeText={(body) => void updateDraft({ body })}
          placeholder="본문을 입력하세요"
          style={{ minHeight: 220, textAlignVertical: "top" }}
        />
        <Pressable onPress={publish} disabled={!editorState.canPublish}>
          <Text selectable>{editorState.canPublish ? "발행하기" : "필수 항목을 먼저 입력해 주세요"}</Text>
        </Pressable>
        <NovelFormatRenderer body={draft.body || "# 미리보기\n\n아직 본문이 없습니다."} episodeTitle={draft.title || "미리보기"} />
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 6: Add a shortcut from the composer to the existing format helper**

```tsx
// inside EpisodeComposerScreen.tsx content
<Pressable onPress={() => router.push("/format-studio")} style={{ padding: 14, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)" }}>
  <Text selectable style={{ color: inkroadTheme.colors.fg1, fontWeight: "800" }}>연출 서식 도우미 열기</Text>
</Pressable>
```

- [ ] **Step 7: Run the editor-state test to verify it passes**

Run:

```bash
cd D:\nova\inkroad-app
npm test -- --runTestsByPath src/mobile/creator/__tests__/episode-editor-state.test.ts
```

Expected: PASS

- [ ] **Step 8: Manual validation**

Run:

```bash
cd D:\nova\inkroad-app
npx expo start
```

Expected:

- 작품 상세에서 `새 회차 작성` 진입이 된다
- 제목과 본문 입력이 된다
- 입력 직후 상태 문구가 `방금 저장됐어요.`로 바뀐다
- 미리보기에 작성한 내용이 보인다
- 제목/본문이 없으면 발행 버튼이 막힌다

- [ ] **Step 9: Commit**

```bash
cd D:\nova
git add inkroad-app/app/author/episode/[novelId].tsx inkroad-app/src/mobile/screens/EpisodeComposerScreen.tsx inkroad-app/src/mobile/creator/repository.ts inkroad-app/src/mobile/creator/storage.ts inkroad-app/src/mobile/creator/__tests__/episode-editor-state.test.ts
git commit -m "feat: add mobile episode composer"
```

---

### Task 5: Align docs and prep the mobile web handoff

**Files:**
- Modify: `D:\nova\inkroad-app\src\mobile\README.md`
- Modify: `D:\nova\docs\superpowers\specs\2026-04-18-mobile-creator-studio-design.md`

- [ ] **Step 1: Document the new app routes**

```md
## Creator routes

- /(tabs)/author
- /author/work/[id]
- /author/episode/[novelId]
- /format-studio
```

- [ ] **Step 2: Add the shared mobile-web handoff checklist**

```md
## Mobile web handoff

When `mob/` creator pages are built, keep these screens aligned:

1. author home
2. work detail with episode list
3. episode composer
4. format helper
```

- [ ] **Step 3: Run a final narrow validation**

Run:

```bash
cd D:\nova\inkroad-app
npm test -- --runTestsByPath src/mobile/creator/__tests__/author-repository.test.ts src/mobile/creator/__tests__/episode-editor-state.test.ts
```

Expected: PASS

- [ ] **Step 4: Run the app once for a smoke check**

Run:

```bash
cd D:\nova\inkroad-app
npx expo start
```

Expected:

- `작가` 탭 진입 가능
- 작품 선택 -> 회차 목록 -> 회차 작성 흐름이 이어짐
- 연출 도우미 진입 가능

- [ ] **Step 5: Commit**

```bash
cd D:\nova
git add inkroad-app/src/mobile/README.md docs/superpowers/specs/2026-04-18-mobile-creator-studio-design.md
git commit -m "docs: align mobile creator studio handoff"
```

---

## Self-Review

### Spec coverage

- 작가 탭 추가: Task 2
- 작품 관리 상세: Task 3
- 회차 작성: Task 4
- 연출 서식 도우미 연결: Task 4
- 모바일 웹 handoff 구조 고정: Task 5

### Placeholder scan

- `TBD`, `TODO`, “적절히 처리” 같은 표현 없음
- 테스트 경로, 명령어, 파일 경로를 모두 명시함

### Type consistency

- `AuthorRepository`, `AuthorWorkSummary`, `AuthorEpisodeSummary`, `EpisodeDraft` naming을 전 Tasks에서 동일하게 유지
- `author/work/[id]`, `author/episode/[novelId]`, `format-studio` route naming을 전 Tasks에서 동일하게 유지
