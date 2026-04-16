# INKROAD iOS App - Auth Modal Design & Implementation

## 1. Design & Architecture (C. BottomSheet Modal)

**Concept:**
Instead of navigating to a completely separate screen that interrupts the reading flow, we will utilize Expo Router's native `presentation: 'modal'` (specifically `formSheet` on iOS). This seamlessly slides up a native Bottom Sheet over the current screen.
Inside this sheet, we will perfectly translate the UI from `auth.html` (Email, Password, Social Buttons, Toggle between Login/Signup).

**Core Library Details:**
- **Navigation**: `expo-router` modal configuration.
- **State**: React `useState` to toggle between "Login View" and "Signup View" within the same modal.
- **Backend API**: `supabase.auth.signInWithPassword` and `supabase.auth.signUp`.
- **UI Components**: `TextInput`, `TouchableOpacity`, `StyleSheet` matching `mobile-auth.css`.

---

## 2. Implementation Execution Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

### Task 1: Setup Modal Routing in Expo
**Files:** `inkroad-app/app/_layout.tsx`
- We currently have `(tabs)` as our main stack.
- We will add another root route `auth.tsx` with `presentation: "modal"`.
- This tells iOS to render it as a sliding card over the tab navigator.

### Task 2: Build the Core UI Skeleton & Animations
**Files:** `inkroad-app/app/auth.tsx`
- Build the visual structure from `auth.html`.
- Create the beautiful dark mode form inputs (`TextInput`), the large primary Login button, and the gray social buttons.
- Implement the "View Toggle" state so clicking "회원가입 (Sign Up)" swaps the form fields to include Nickname and Password Confirmation.

### Task 3: Hook up Supabase Auth API
**Files:** `inkroad-app/app/auth.tsx`
- Import the configured `supabase` client.
- Attach `signInWithPassword()` to the Login button.
- Attach `signUp()` (saving the Pen Name into `user_metadata`) to the Signup button.
- Catch errors (e.g. "Wrong password") and display them natively.

### Task 4: Connect Modals to Home Header & My Library
**Files:** `inkroad-app/components/HomeHeader.tsx`, `inkroad-app/app/(tabs)/search.tsx` (using as dummy library tab)
- Add user session listening `supabase.auth.onAuthStateChange`.
- If a user clicks a "Login" button on the Header or My Library tab, trigger `router.push('/auth')`.
- If logged in, show their Pen Name and a "Logout" button instead.
