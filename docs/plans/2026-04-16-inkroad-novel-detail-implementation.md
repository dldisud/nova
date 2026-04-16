# Novel Detail Page Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement the dynamic novel detail page and link it from the home screen components to allow full native transition.

**Architecture:** Use `expo-router`'s dynamic routing (`app/novel/[id].tsx`). We fetch extended dummy data based on the route ID, then compose the layout natively with a transparent header and absolute positioned elements.

**Tech Stack:** React Native, Expo Router, TypeScript, vanilla StyleSheet

---

### Task 1: Extend Dummy Data for Detail Page

**Files:**
- Modify: `inkroad-app/data/dummyHome.ts`

**Step 1: Write extended data structures**
Update `NovelData` to include `synopsis?: string` and `genre?: string`.
Add a helper function `export const getNovelById = (id: string) => { return allNovels.find(n => n.id === id); }`

**Step 2: Check**
Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**
```bash
git add inkroad-app/data/dummyHome.ts
git commit -m "feat: extend dummy data for detail page routing"
```

---

### Task 2: Connect Home Screen Links

**Files:**
- Modify: `inkroad-app/components/HeroCarousel.tsx`
- Modify: `inkroad-app/components/NovelGrid.tsx`

**Step 1: Add Links**
Import `Link` from `expo-router`.
Wrap the return of `renderItem` and the grid mapping in `<Link href={\`/novel/\${item.id}\`} asChild><TouchableOpacity>...</TouchableOpacity></Link>`.

**Step 2: Check**
Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**
```bash
git add inkroad-app/components/HeroCarousel.tsx inkroad-app/components/NovelGrid.tsx
git commit -m "feat: add expo-router Links to home page novels"
```

---

### Task 3: Implement Detail Page Skeleton & Header

**Files:**
- Create: `inkroad-app/app/novel/[id].tsx`

**Step 1: Write Component Skeleton**
```tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { getNovelById } from '../../data/dummyHome';

export default function NovelDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const novel = getNovelById(id);

  if (!novel) return <Text>Not Found</Text>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '', headerTransparent: true, headerTintColor: '#fff' }} />
      <ScrollView>
        <Image source={{ uri: novel.coverUrl }} style={styles.backdropBlur} blurRadius={10} />
      </ScrollView>
    </View>
  );
}
// Add basic styles...
```

**Step 2: Check**
Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**
```bash
git add inkroad-app/app/novel/\[id\].tsx
git commit -m "feat: create novel detail dynamic route"
```

---

### Task 4: Complete Synopsis and Hero Details

**Files:**
- Modify: `inkroad-app/app/novel/[id].tsx`

**Step 1: Assemble internal UI**
Add a sharp foreground cover image over the backdrop.
Add title, author, and `novel.synopsis` inside a dark rounded container overlapping the backdrop.

**Step 2: Check Build**
Run: `npx expo export`
Expected: Exit code 0

**Step 3: Commit**
```bash
git add inkroad-app/app/novel/\[id\].tsx
git commit -m "feat: assemble novel info and synopsis UI"
```

---

### Task 5: Add Fixed Bottom Action Bar

**Files:**
- Modify: `inkroad-app/app/novel/[id].tsx`

**Step 1: Add absolute button**
Add a sticky view at the bottom of the screen (`position: 'absolute', bottom: 0, width: '100%'`) containing a visually distinct "첫화 보기" (Read First Chapter) button.

**Step 2: Check Build**
Run: `npx expo export`
Expected: Exit code 0

**Step 3: Commit**
```bash
git add inkroad-app/app/novel/\[id\].tsx
git commit -m "feat: add bottom floating action bar to detail page"
```
