# INKROAD Pinterest-Style Redesign Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Transform the INKROAD web novel store from a standard 4-column grid layout to a Pinterest-style masonry feed with hover info overlays, slim promo banner, and rounded aesthetics across all pages.

**Architecture:** CSS-first approach — add a new `assets/pinterest.css` file for all Pinterest-specific styles. Modify HTML templates to use new class names and structures. Update `store-redesign.js` to generate Pinterest-compatible card markup. Keep existing color palette (`#f7f5f2`, `#1a1a1a`, `#e85d3a`).

**Tech Stack:** Vanilla CSS (CSS columns for masonry), vanilla JS, existing Supabase integration

---

### Task 1: Create Pinterest CSS Foundation (`assets/pinterest.css`)

**Files:**
- Create: `assets/pinterest.css`

Create all Pinterest-specific styles:

- **Masonry Grid** (`.pin-masonry`): CSS `columns: 5` with `column-gap: 16px`, `break-inside: avoid`
- **Pin Card** (`.pin-card`): `border-radius: 16px`, hover `translateY(-4px)` + enhanced shadow
- **Card Image** (`.pin-card-media`): Full-width, block display, relative position for overlay
- **Sale Mark** (`.pin-card-sale`): Absolute top-right, always visible, pill-shaped
- **Hover Info Overlay** (`.pin-card-overlay`): Gradient bottom overlay, `transform: translateY(100%) → 0` on hover, 300ms ease. Shows: rating (gold), genre, free ep count (mint), price
- **Card Copy** (`.pin-card-copy`): Below image, always visible. Title (2-line clamp) + Author
- **Slim Promo Banner** (`.pin-promo-banner`): Flex row, 56px height, left=event info, right=CTA
- **Search Bar** (`.pin-search-bar`): Full-width, `border-radius: 24px`
- **Filter Bar** (`.pin-filter-bar`): Horizontal flex-wrap chips, `border-radius: 20px`
- **Detail Card** (`.pin-detail-card`): Max-width centered, `border-radius: 24px`, 2-column grid (cover+info)
- **Board Section** (`.pin-board-section`): Labeled masonry group
- **Genre Pills** (`.pin-genre-pill`): `border-radius: 24px`, hover → dark fill
- **Stagger Animation** (`@keyframes pinFadeUp`): 60ms incremental delay per card
- **Responsive**: 1440→4col, 1080→3col, 768→2col, 480→2col tight

---

### Task 2: Link Pinterest CSS and Update HTML Pages

**Files:**
- Modify: `homepage_pc.html`
- Modify: `search_pc.html`
- Modify: `novel_detail_pc.html`
- Modify: `my_library_pc.html`

**Step 1:** Add `<link rel="stylesheet" href="assets/pinterest.css">` after the `pc.css` link in all 4 files.

**Step 2: Homepage (`homepage_pc.html`)**

- Replace `<section class="hero-band">` → Slim promo banner:
  ```html
  <section class="pin-promo-banner" data-home-sale-banner>
    <div class="pin-promo-left">
      <span class="sale-badge">진행 중인 세일</span>
      <h2 class="pin-promo-title">이번 주 장르전</h2>
      <div class="pin-promo-meta"><span>최대 45% 할인</span><span>2일 남음</span></div>
    </div>
    <a class="button primary" href="search_pc.html">전체 보기</a>
  </section>
  ```
- Genre grid → `<div class="pin-genre-bar">` with `pin-genre-pill` links
- Novel grids → `<div class="pin-masonry free-grid">` and `<div class="pin-masonry sale-grid">`
- Sale banner in middle stays as thin horizontal bar

**Step 3: Search (`search_pc.html`)**

- Remove sidebar layout `browse-layout > browse-rail + browse-main`
- Replace with: `pin-search-bar + pin-filter-bar + pin-count + pin-masonry`

**Step 4: Detail (`novel_detail_pc.html`)**

- Wrap `detail-top` in `pin-detail-card`
- Similar novels → `pin-masonry`

**Step 5: Library (`my_library_pc.html`)**

- Each tab panel's `library-list` → `pin-masonry`
- Add `pin-board-section` wrapper with `pin-board-title`

---

### Task 3: Update JavaScript Card Builder (`store-redesign.js`)

**Files:**
- Modify: `assets/store-redesign.js`

**Step 1: Replace `buildNovelCard` (line ~390-428)**

New card markup:
```html
<article class="pin-card">
  <a class="pin-card-media" href="detail_href" style="variable-height-style">
    <img src="cover_url" alt="title 표지">
    <!-- sale mark if applicable -->
    <span class="pin-card-sale">-N%</span>
    <!-- hover overlay -->
    <div class="pin-card-overlay">
      <span class="pin-card-overlay-rating">★ 4.2</span>
      <span class="pin-card-overlay-genre">다크 판타지</span>
      <span class="pin-card-overlay-free">3화 무료</span>
      <span class="pin-card-overlay-price">편당 300원</span>
    </div>
  </a>
  <div class="pin-card-copy">
    <h3 class="pin-card-title">Title</h3>
    <p class="pin-card-author">Author</p>
  </div>
</article>
```

**Step 2: Add `pinAspectStyle()` helper**

Deterministic height variation based on slug hash for true masonry effect.

**Step 3: Update `renderHome`**

- Populate slim promo banner instead of hero band
- Genre pills instead of genre grid
- All novel grids → pin-masonry with pin-cards

**Step 4: Update `renderSearch`**

- Output pin-cards into `browse-results` which now has `pin-masonry` class
- Search and filter logic unchanged (same data-attributes)

**Step 5: Update render targets for detail and library**

- `[data-similar-grid]` → outputs pin-cards
- Library list containers → output pin-cards

---

### Task 4: Visual Verification

**Step 1:** Open all 4 pages in browser and verify:
- Homepage: slim banner → genre pills → masonry feed
- Search: full-width search → filter chips → masonry results
- Detail: centered card → similar Works masonry
- Library: board sections → masonry per tab

**Step 2:** Test hover overlays: info slides up smoothly

**Step 3:** Test responsive: resize to 1440/1080/768/480px

**Step 4:** Commit all changes

---

## Verification Plan

### Browser Tests
- Open each page in browser at 1440px width
- Verify masonry layout renders with staggered card heights
- Hover over pin cards and confirm overlay slides up with info
- Resize to 1080, 768, 480px and verify column count changes
- Click through card links to ensure navigation works

### Manual Verification
- All existing Supabase data rendering (novels, events, episodes) must work unchanged
- Bookmark buttons, filter chips, sort buttons must remain functional
- i18n locale switching must still work
