# INKROAD iOS App Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** 기존 웹사이트(INKROAD)의 코어 기능과 UI를 React Native(Expo) 기반의 iOS/Android 크로스플랫폼 앱으로 초기 구축합니다.

**Architecture:** Expo Router를 활용한 파일 기반 하단 탭 네비게이션(Tab Navigation)으로 뼈대를 잡고, Supabase JS 클라이언트를 통해 웹과 동일한 방식의 데이터 조회를 구현하여 홈 화면에 더미 데이터를 렌더링합니다.

**Tech Stack:** React Native, Expo, Expo Router, Supabase JS 클라이언트

---

### Task 1: Bootstrap Expo Project

**Files:**
- Create: `inkroad-app/app.json`
- Create: `inkroad-app/package.json`

**Step 1: Init Expo Project**

```bash
npx create-expo-app inkroad-app -t expo-template-blank-typescript
```

**Step 2: Verify Setup**
Run: `cd inkroad-app && npx expo export`
Expected: 빌드가 에러 없이 통과하며 `dist` 폴더가 생성됨.

**Step 3: Commit**

```bash
git add inkroad-app/
git commit -m "feat: init expo project for mobile app"
```

---

### Task 2: Setup Tab Navigation & Structure

**Files:**
- Create: `inkroad-app/app/_layout.tsx`
- Create: `inkroad-app/app/(tabs)/_layout.tsx`
- Create: `inkroad-app/app/(tabs)/index.tsx` (Home)
- Create: `inkroad-app/app/(tabs)/search.tsx`
- Create: `inkroad-app/app/(tabs)/library.tsx`
- Create: `inkroad-app/app/(tabs)/profile.tsx`

**Step 1: Install Navigation Dependencies**
```bash
cd inkroad-app && npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

**Step 2: Config App json for Router**
`inkroad-app/app.json` 파일에 main 포인트를 expo-router/entry로 지정.

**Step 3: Add basic tab components**
간단한 Text를 리턴하는 더미 컴포넌트들 생성

**Step 4: Commit**
```bash
git add inkroad-app/app* inkroad-app/package.json
git commit -m "feat: setup tab navigation via expo router"
```

---

### Task 3: Setup Supabase Client

**Files:**
- Create: `inkroad-app/lib/supabase.ts`

**Step 1: Install Dependencies**
```bash
cd inkroad-app && npm install @supabase/supabase-js @react-native-async-storage/async-storage
```

**Step 2: Write Supabase JS Client**
```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Step 3: Commit**
```bash
git add inkroad-app/lib/
git commit -m "feat: setup supabase client for mobile app"
```
