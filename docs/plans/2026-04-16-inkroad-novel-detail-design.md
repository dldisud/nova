# INKROAD iOS Expo App - Novel Detail Page Design

## Overview
This document outlines the architectural approach for the Novel Detail Page (`app/novel/[id].tsx`), translating the existing mobile web `novel_detail.html` into a fully Native experience in React Native on Expo Router.

## Approach
**UI Translation + Native Navigation (Dummy Data)**
We prioritize native visual fidelity and fluid transitions. Clicking a novel on the Home screen pushes the Detail screen. The Detail screen parses the ID, fetches dummy data, and renders natively mimicking the original HTML layout.

## Component Architecture
1. **Dynamic Router**:
   - `app/novel/[id].tsx` handles the route.
2. **Layout Structure (`ScrollView`)**:
   - **Back Button Header**: Absolute positioned or transparent header interacting with Expo Router's `<Stack>`.
   - **Backdrop Cover**: `Image` with CSS absolute positioning and `expo-blur` (optional, or dark overlay) to create the glassmorphism backdrop.
   - **Hero Info**: Smaller sharp Cover Image, Title, Author, Star rating.
   - **Synopsis**: A text block with native truncating (`numberOfLines`) and an expand button.
   - **Floating Action Bar**: At the bottom of the screen (`position: 'absolute', bottom: 0`), providing the "Read First Chapter" or "Resume" button as seen in web.

## Navigation and Data Flow
- `Link` components in `HeroCarousel` and `NovelGrid` send `pathname: '/novel/[id]'`.
- `useLocalSearchParams()` captures `id` inside the detail page.
- `dummyHome.ts` is expanded to provide synopsis and simple chapter counts.
- **Future-proofing**: Later, when Supabase is connected, the fetch logic replaces the dummy lookup function, while UI remains 100% same.
