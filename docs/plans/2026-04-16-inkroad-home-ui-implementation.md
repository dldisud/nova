# INKROAD iOS Expo App Home UI Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Create the native Home Tab structure (Header, Carousel, Chips, Novel Grid) by porting the existing HTML/CSS to React Native components using hardcoded dummy data.

**Architecture:** We will build React Native functional components for each UI section and assemble them in the Home Tab (`app/(tabs)/index.tsx`). We use a `ScrollView` for the layout and extract style values from `mobile-home.css`.

**Tech Stack:** React Native, Expo Router, TypeScript, vanilla StyleSheet

---

### Task 1: Setup Dummy Data Layer

**Files:**
- Create: `inkroad-app/data/dummyHome.ts`

**Step 1: Write dummy data module**

```typescript
export const heroCarouselData = [
  { id: '1', title: 'The Shadow King', author: 'Author A', coverUrl: 'https://via.placeholder.com/400x200' },
  { id: '2', title: 'Light Eternal', author: 'Author B', coverUrl: 'https://via.placeholder.com/400x200' },
];

export const genreChipsData = [
  { id: 'all', label: 'All' },
  { id: 'romance', label: 'Romance' },
  { id: 'fantasy', label: 'Fantasy' },
];

export const novelGridData = [
  { id: '10', title: 'Sword of Fate', author: 'Author C', views: 1200, coverUrl: 'https://via.placeholder.com/150x200' },
  { id: '11', title: 'Magic Academy', author: 'Author D', views: 3400, coverUrl: 'https://via.placeholder.com/150x200' },
];
```

**Step 2: Syntax and Check**
Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**
```bash
git add inkroad-app/data/dummyHome.ts
git commit -m "feat: add robust dummy data for home screen"
```

---

### Task 2: Create Header Component

**Files:**
- Create: `inkroad-app/components/HomeHeader.tsx`

**Step 1: Write Component**
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>INKROAD</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 48, // Safe area approx
    backgroundColor: '#0e0d12',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
```

**Step 2: Check**
Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**
```bash
git add inkroad-app/components/HomeHeader.tsx
git commit -m "feat: add HomeHeader component"
```

---

### Task 3: Create Hero Carousel Component

**Files:**
- Create: `inkroad-app/components/HeroCarousel.tsx`

**Step 1: Write Component**
Create a horizontal FlatList that renders items from `heroCarouselData`. Give it `pagingEnabled={true}`, `showsHorizontalScrollIndicator={false}`.

**Step 2: Check**
Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**
```bash
git add inkroad-app/components/HeroCarousel.tsx
git commit -m "feat: add HeroCarousel component"
```

---

### Task 4: Create Genre Chips & Novel Grid Components

**Files:**
- Create: `inkroad-app/components/GenreChips.tsx`
- Create: `inkroad-app/components/NovelGrid.tsx`

**Step 1: Write GenreChips**
Horizontal `ScrollView` with rounded pill views.

**Step 2: Write NovelGrid**
A view mapping `novelGridData` into `flexWrap: 'wrap'` cards or a multicolumn layout.

**Step 3: Check**
Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**
```bash
git add inkroad-app/components/GenreChips.tsx inkroad-app/components/NovelGrid.tsx
git commit -m "feat: add genre filter chips and novel grid"
```

---

### Task 5: Assemble Home Screen

**Files:**
- Modify: `inkroad-app/app/(tabs)/index.tsx`

**Step 1: Assemble and Mount**
Replace dummy text in `index.tsx` with a `ScrollView` containing `HomeHeader`, `HeroCarousel`, `GenreChips`, and `NovelGrid`.

**Step 2: Check Build**
Run: `npx expo export` (to verify full bundle without errors)
Expected: Export completes successfully with Exit code: 0

**Step 3: Commit**
```bash
git add inkroad-app/app/\(tabs\)/index.tsx
git commit -m "feat: assemble complete home screen layout"
```
