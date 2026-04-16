# INKROAD iOS Expo App - Home Screen UI Design

## Overview
This document outlines the design and architectural approach for porting the INKROAD mobile web HTML/CSS homepage to a React Native Expo application. The goal is to retain the original brand aesthetics, spatial dimensions, and premium feel while offering 100% native performance.

## Approach
**1:1 Native Custom UI Translation:**
Instead of using external component libraries (like UI Kitten or Paper) which would dilute the INKROAD brand style, we will manually translate the `homepage.html` structure and `mobile-home.css` styles into native React Native `View`, `Text`, and `StyleSheet` objects.

## Component Architecture
Inside `app/(tabs)/index.tsx`, the layout will be structured as follows:

1. **Root Screen Container (`ScrollView`)**:
   - Provides a smooth native vertical scroll experience.
   - Contains a Safe Area consideration for iOS notches dynamically.

2. **Top Header**:
   - "INKROAD" app logo.
   - Notification/Search quick icons (translated from web header).

3. **Hero Carousel (Featured Novels)**:
   - A horizontal `ScrollView` or `FlatList` with `pagingEnabled={true}`.
   - Snaps to each featured book precisely, replacing the CSS carousel.
   - Native Image components with `resizeMode="cover"` and soft `borderRadius`.

4. **Genre / Filter Chips list**:
   - A horizontal scroll container for quick tag selection (e.g. Romance, Fantasy).
   - Styled to match the web's rounded aesthetic.

5. **Novel Grid / Recommended Lists**:
   - Using CSS flex (`flexWrap: 'wrap'`) or structured columns for the web's novel cards look.
   - Displays novel covers, titles, and author tags matching `pinterest.css` and `store-light.css` parameters.

## Styling Workflow
- Transform CSS classes directly into `StyleSheet.create({ ... })`.
- Translate responsive units (e.g. `rem`, percentages) and colors (e.g., `#0e0d12`) explicitly.
- Mimic Glassmorphism (blurs) using `expo-blur` if applicable, or fallback to semi-transparent modern dark colors.

## Data Flow
- Initial implementation will use a separated **Dummy Data Layer**.
- `data/dummyHomeData.ts` will provide JSON arrays mirroring the anticipated Supabase schema properties.
- **Future-proofing**: When API integration starts, the UI components will seamlessly accept live database props without a structural rewrite.
