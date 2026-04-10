# INKROAD Redesign: Spotify PC & Pinterest Mobile (Dark Theme)

## Overview
This document outlines the redesign specifications for the INKROAD webnovel platform. The goal is to transition the platform from its current "clean light store" style to a premium, dark-themed experience inspired by Spotify for desktop and Pinterest for mobile. The color palette focuses on Black backgrounds, Gold (#FFC55F) accents/logos, and Red (#E50914) for sale badges.

## Color Palette & Theme
- **Backgrounds:** Deep blacks (`#000000`, `#121212`, `#181818`) with subtle gradients.
- **Text:** White (`#ffffff`) for primary text, Light Gray (`#b3b3b3`) for secondary/muted text.
- **Accents (Gold):** `#FFC55F` used for logos, active states, icons, and primary buttons.
- **Badges (Red):** `#E50914` used specifically for sale and discount tags to provide high contrast.
- **Typography:** `Pretendard` as the primary font family for clean readability, maintaining high-contrast font weights.

## PC Layout (Spotify Inspired)
**Target Pages:** `homepage_pc.html`, `search_pc.html`, `my_library_pc.html`
- **Layout Structure (Option B Selected):**
  - **Top Navigation Bar:** A sticky top bar containing the logo (Gold), primary navigation links (Home, Explore, Library), search bar (pill-shaped with dark background), and user actions (Login/Join).
  - **Main Content Area:** A dark gradient background (`linear-gradient(180deg, #2a1a15 0%, #121212 30%, #121212 100%)`) providing depth.
- **Card Design:**
  - Standardized aspect ratio (`0.72`) for novel covers to ensure consistent height regardless of sale status.
  - Hover effects on cards (background lightening) to provide interactive feedback.
  - **Badges:** Sale badges (Red) are positioned *inside* the image container at the top-left corner (`position: absolute`) so they do not disrupt the grid alignment.
- **Global Changes:** The `store-light` class will be replaced with `store-dark` (or removed, applying dark styles natively via the `.pc-desktop` scope) in `pc.css` and HTML files.

## Mobile Layout (Pinterest Inspired)
**Target Pages:** `homepage.html`, `search.html`, `my_library.html`
- **Layout Structure:**
  - **Top Bar:** Blurred, semi-transparent black header containing the logo and a search/action icon.
  - **Bottom Navigation:** A fixed, floating bottom nav bar (App-style) with Home, Explore, Library, and Profile icons.
  - **Main Content Area:** Dark background (`#000000`).
- **Masonry Grid (Pinterest Style):**
  - Covers are displayed in a two-column staggered grid (masonry layout) using CSS columns (`column-count: 2`).
  - Different novels will have different aspect ratios (tall, medium, short) to simulate the Pinterest visual flow, breaking the rigid grid.
  - Titles are clamped to 2 lines.
- **Category Filter:** Horizontal scrolling pill buttons below the header for quick genre/status filtering.

## Implementation Details
1. **CSS Updates (`assets/styles.css`, `assets/pc.css`):**
   - Introduce `.store-dark` (or adjust default dark mode) color variables: `--bg: #000`, `--surface: #121212`, `--text: #fff`, `--accent: #FFC55F`.
   - Add `.masonry-grid` and related classes to `styles.css` for mobile.
   - Update `.pc-desktop` header, topbar, and card grids in `pc.css` to match the Spotify top-nav design.
   - Standardize `novel-card` or `.book-card` styling to handle the absolute positioning of the sale badge.
2. **HTML Updates:**
   - Update `homepage_pc.html`, `search_pc.html`, `my_library_pc.html` structure to match the new topbar and grid.
   - Update `homepage.html`, `search.html`, `my_library.html` structure to implement the masonry grid and bottom app-bar.
   - Change `store-light` class on `<body>` to `store-dark`.

## Next Steps
1. User reviews this spec.
2. Proceed to implementation plan via the `writing-plans` skill.