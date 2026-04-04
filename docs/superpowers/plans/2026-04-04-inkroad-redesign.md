# 잉크로드 Clean Light Store 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 잉크로드 PC 독자 핵심 동선 4개 페이지(홈, 탐색, 상세, 뷰어)를 다크 글래스모피즘에서 Clean Light Store 디자인으로 전면 교체한다.

**Architecture:** 기존 `styles.css`의 CSS 변수를 라이트 테마용으로 교체하고, `pc.css`를 새 레이아웃 전용으로 재작성한다. `homepage_pc.html`은 이미 새 HTML 구조로 변경됨 — 나머지 3개 페이지(search, detail, viewer)의 HTML을 새 구조로 교체한다. `assets/store-redesign.js`(Supabase 연동 + 동적 렌더링)가 이미 존재하며, 각 페이지 렌더러를 확장한다. 기존 `app.js`의 기능(북마크, 필터, 탭, 리더 설정, 스크롤 reveal)은 data-attribute 기반이므로 새 HTML에서 동일 attribute를 유지하면 자동으로 동작한다.

**Tech Stack:** HTML/CSS/Vanilla JS, Supabase REST API, Pretendard + Inter 폰트 (CDN)

**Design Spec:** `docs/superpowers/specs/2026-04-04-inkroad-redesign-design.md`

---

## File Structure

### 수정 대상

| 파일 | 역할 | 변경 내용 |
|------|------|-----------|
| `assets/styles.css` | CSS 변수 + 리셋 + 공용 컴포넌트 | `:root` 변수를 라이트 테마로 교체. `.store-light` 스코프 아래 새 컴포넌트(버튼, 뱃지, 카드, 네비) 추가. 기존 다크 스타일은 `.store-light` 외부에 잔존 — 비대상 페이지가 깨지지 않도록 |
| `assets/pc.css` | PC 전용 레이아웃 | `.store-light` 스코프 아래 새 그리드/여백/섹션 스타일 추가 |
| `homepage_pc.html` | 홈페이지 | 이미 새 구조로 교체됨. 추가 수정 불필요 (JS가 동적으로 채움) |
| `search_pc.html` | 탐색 페이지 | HTML 전체 교체 — 새 네비/검색바/필터+결과 구조 |
| `novel_detail_pc.html` | 작품 상세 | HTML 전체 교체 — 새 표지+정보/가격박스/회차목록/추천 구조 |
| `novel_viewer_pc.html` | 뷰어 | HTML 전체 교체 — 미니멀 네비/본문/회차이동/페이월 구조 |
| `assets/store-redesign.js` | Supabase 연동 + 동적 렌더링 | search/detail/viewer 페이지용 렌더러 함수 보강 |

### 건드리지 않는 파일

- `assets/app.js` — 기존 기능 유지 (data-attribute 기반이므로 새 HTML에 attribute만 유지하면 됨)
- `assets/supabase-config.js`, `assets/supabase-live.js` — 변경 없음
- `auth_pc.html`, `payment_pc.html`, `creator_dashboard_pc.html`, `novel_upload_pc.html`, `episode_upload_pc.html`, `author_dashboard_pc.html` — 비대상
- 모바일 페이지 (`homepage.html`, `novel_detail.html` 등) — 비대상

---

## Task 1: CSS 디자인 토큰 + 공용 컴포넌트

**Files:**
- Modify: `assets/styles.css` (파일 하단에 `.store-light` 블록 추가)
- Modify: `assets/pc.css` (파일 하단에 `.store-light` 레이아웃 추가)

이 태스크는 `.store-light` 클래스 스코프 아래 모든 새 스타일을 추가한다. 기존 다크 테마 CSS는 건드리지 않는다 — 비대상 페이지(auth, payment, creator 등)가 깨지지 않게 하기 위함이다. 새 4개 페이지의 `<body>`에는 `class="pc-desktop store-light"`가 적용되어 새 스타일만 먹는다.

- [ ] **Step 1: `styles.css` 하단에 Clean Light Store 토큰 + 컴포넌트 추가**

`assets/styles.css` 파일 **맨 하단**에 아래 블록을 추가한다. 기존 내용은 건드리지 않는다:

```css
/* ========================================
   Clean Light Store — design tokens + components
   Scoped under .store-light so legacy dark pages are unaffected.
   ======================================== */

.store-light {
  --bg: #f7f5f2;
  --surface: #ffffff;
  --surface-muted: #f0eeeb;
  --text: #1a1a1a;
  --text-secondary: #444444;
  --text-muted: #999999;
  --border: #eeeeee;
  --accent-sale: #e85d3a;
  --accent-free: #2d8a4e;
  --dark: #1a1a1a;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --shadow-card: 0 1px 4px rgba(0, 0, 0, 0.05);
  --shadow-soft: 0 1px 3px rgba(0, 0, 0, 0.04);
  --max-width: 960px;
  --font: "Pretendard", "Inter", -apple-system, "Segoe UI", sans-serif;
}

.store-light,
.store-light * {
  box-sizing: border-box;
}

body.store-light {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  overflow-x: hidden;
}

/* Remove dark theme pseudo-elements in store-light context */
body.store-light::before {
  display: none;
}

/* --- Topbar --- */
.store-light .topbar {
  position: sticky;
  top: 0;
  z-index: 90;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 0;
  backdrop-filter: none;
  box-shadow: none;
}

.store-light .topbar-inner {
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 32px;
}

.store-light .brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.store-light .brand-mark {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--dark);
  color: var(--surface);
  font-size: 20px;
  box-shadow: none;
}

.store-light .brand-name {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text);
}

.store-light .brand-sub {
  font-size: 0.68rem;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: none;
}

.store-light .nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.store-light .nav-link {
  padding: 8px 14px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  transition: color 150ms, background 150ms;
}

.store-light .nav-link:hover,
.store-light .nav-link.current {
  color: var(--text);
  background: var(--surface-muted);
}

.store-light .nav-link-sale {
  color: var(--accent-sale);
  font-weight: 600;
}

.store-light .store-top-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-muted);
  border-radius: var(--radius-md);
  padding: 8px 14px;
  flex: 1;
  max-width: 280px;
}

.store-light .store-top-search input {
  border: 0;
  background: transparent;
  outline: none;
  font-size: 0.85rem;
  color: var(--text);
  width: 100%;
}

.store-light .store-top-search input::placeholder {
  color: var(--text-muted);
}

.store-light .store-top-search .material-symbols-outlined {
  font-size: 18px;
  color: var(--text-muted);
}

.store-light .store-lang {
  font-size: 0.85rem;
  color: var(--text-muted);
  cursor: pointer;
  background: none;
  border: none;
  padding: 6px 8px;
}

.store-light .button-login {
  font-size: 0.85rem;
}

/* --- Buttons --- */
.store-light .button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 20px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.9rem;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform 120ms, background 120ms, border-color 120ms;
}

.store-light .button:hover {
  transform: translateY(-1px);
}

.store-light .button.primary {
  background: var(--dark);
  color: var(--surface);
  box-shadow: none;
  filter: none;
}

.store-light .button.primary:hover {
  background: #333;
  box-shadow: none;
  filter: none;
}

.store-light .button.sale {
  background: var(--accent-sale);
  color: var(--surface);
}

.store-light .button.secondary {
  background: var(--surface);
  border-color: var(--border);
  color: var(--text);
}

.store-light .button.ghost {
  background: var(--surface-muted);
  color: var(--text-secondary);
}

.store-light .button.small {
  min-height: 36px;
  padding: 0 14px;
  font-size: 0.82rem;
}

/* --- Badges --- */
.store-light .sale-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  background: var(--accent-sale);
  color: var(--surface);
  font-size: 0.78rem;
  font-weight: 700;
}

.store-light .free-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  background: var(--accent-free);
  color: var(--surface);
  font-size: 0.78rem;
  font-weight: 600;
}

.store-light .muted-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
  color: var(--text-muted);
  font-size: 0.78rem;
}

.store-light .new-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-sm);
  background: var(--dark);
  color: var(--surface);
  font-size: 0.78rem;
  font-weight: 600;
}

/* --- Prices --- */
.store-light .price-old {
  color: var(--text-muted);
  font-size: 0.82rem;
  text-decoration: line-through;
}

.store-light .price-sale {
  color: var(--accent-sale);
  font-size: 0.88rem;
  font-weight: 700;
}

.store-light .price-current {
  color: var(--text);
  font-size: 0.88rem;
  font-weight: 600;
}

/* --- Novel Card (grid) --- */
.store-light .novel-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  transition: transform 200ms, box-shadow 200ms;
}

.store-light .novel-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.store-light .novel-card-media {
  display: block;
  position: relative;
  overflow: hidden;
}

.store-light .novel-card-media img {
  width: 100%;
  aspect-ratio: 0.72;
  object-fit: cover;
  display: block;
}

.store-light .novel-card-badges {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.store-light .novel-card-copy {
  padding: 14px;
  display: grid;
  gap: 4px;
}

.store-light .novel-card-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.store-light .novel-card-meta {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.store-light .novel-card-price {
  display: flex;
  gap: 6px;
  align-items: baseline;
  margin-top: 4px;
}

/* --- Novel Card (list — search results) --- */
.store-light .novel-row {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  display: grid;
  grid-template-columns: 100px 1fr auto;
  gap: 18px;
  padding: 16px;
  align-items: center;
  transition: transform 200ms;
}

.store-light .novel-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.store-light .novel-row-thumb {
  overflow: hidden;
  border-radius: var(--radius-md);
  position: relative;
}

.store-light .novel-row-thumb img {
  width: 100%;
  aspect-ratio: 0.72;
  object-fit: cover;
  display: block;
}

.store-light .novel-row-copy {
  display: grid;
  gap: 4px;
}

.store-light .novel-row-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

.store-light .novel-row-meta {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.store-light .novel-row-desc {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 420px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.store-light .novel-row-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.store-light .novel-row-side {
  text-align: right;
  display: grid;
  gap: 8px;
  justify-items: end;
}

/* --- Misc --- */
.store-light .link-inline {
  font-size: 0.85rem;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.store-light .link-inline .material-symbols-outlined {
  font-size: 16px;
}

.store-light .eyebrow {
  color: var(--text-muted);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.store-light .eyebrow::before {
  display: none;
}

/* --- Filter chip --- */
.store-light .filter-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: 0.82rem;
  cursor: pointer;
  border: none;
  transition: background 150ms, color 150ms;
}

.store-light .filter-chip[data-state="include"] {
  background: var(--dark);
  color: var(--surface);
}

.store-light .filter-chip[data-state="exclude"] {
  background: var(--accent-sale);
  color: var(--surface);
}

/* --- Progress bar --- */
.store-light .reader-progress {
  height: 3px;
  background: var(--border);
  position: sticky;
  top: 56px;
  z-index: 89;
}

.store-light .reader-progress-fill {
  height: 100%;
  background: var(--dark);
  border-radius: 0 2px 2px 0;
  width: 0;
  transition: width 100ms;
}
```

- [ ] **Step 2: `pc.css` 하단에 Clean Light Store 레이아웃 추가**

`assets/pc.css` 파일 **맨 하단**에 아래 블록을 추가한다:

```css
/* ========================================
   Clean Light Store — PC layouts
   Scoped under .store-light
   ======================================== */

.store-light .store-shell {
  width: min(100%, 960px);
  margin: 0 auto;
  padding: 0 32px;
}

.store-light .store-home {
  padding: 0 0 64px;
}

/* --- Hero band --- */
.store-light .hero-band {
  background: var(--dark);
  background-size: cover;
  background-position: center;
  padding: 48px 32px;
}

.store-light .hero-grid {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 32px;
  align-items: center;
}

.store-light .hero-copy {
  display: grid;
  gap: 12px;
}

.store-light .hero-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.store-light .hero-brand {
  display: none;
}

.store-light .hero-title {
  margin: 0;
  font-size: clamp(1.6rem, 3vw, 2rem);
  font-weight: 800;
  color: var(--surface);
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.store-light .hero-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: #888;
}

.store-light .hero-description {
  margin: 0;
  font-size: 0.9rem;
  color: #888;
  line-height: 1.7;
  max-width: 520px;
}

.store-light .hero-meta {
  display: flex;
  gap: 14px;
  font-size: 0.78rem;
  color: #888;
}

.store-light .hero-actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

.store-light .hero-cover-wrap {
  display: flex;
  justify-content: center;
}

.store-light .hero-cover {
  width: 100%;
  max-width: 180px;
  border-radius: var(--radius-md);
  aspect-ratio: 0.72;
  object-fit: cover;
}

/* --- Sale banner --- */
.store-light .sale-banner {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 18px 24px;
  margin: 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--shadow-soft);
  border: 1px solid var(--border);
}

.store-light .sale-banner-copy {
  display: flex;
  align-items: center;
  gap: 14px;
}

.store-light .sale-banner-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}

.store-light .sale-banner-meta {
  display: flex;
  gap: 12px;
  font-size: 0.82rem;
  color: var(--text-muted);
}

/* --- Store sections --- */
.store-light .store-section {
  margin-top: 36px;
}

.store-light .store-section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.store-light .store-section-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
}

.store-light .section-copy {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* --- Novel grid (4-col) --- */
.store-light .novel-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

/* --- Genre grid --- */
.store-light .genre-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.store-light .genre-card {
  background: var(--dark);
  border-radius: var(--radius-lg);
  padding: 24px 18px;
  text-align: center;
  transition: transform 150ms;
  cursor: pointer;
  display: block;
}

.store-light .genre-card:hover {
  transform: translateY(-2px);
}

.store-light .genre-card-label {
  color: var(--surface);
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.store-light .genre-card-count {
  color: #666;
  font-size: 0.78rem;
  margin: 4px 0 0;
}

/* --- Footer --- */
.store-light .store-footer {
  border-top: 1px solid var(--border);
  padding: 24px 0;
  margin-top: 48px;
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.store-light .store-footer .bottom-meta {
  display: flex;
  gap: 16px;
}

.store-light .store-footer a {
  color: var(--text-muted);
}

/* --- Search page --- */
.store-light .search-bar-band {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 20px 32px;
}

.store-light .search-bar {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface-muted);
  border-radius: var(--radius-lg);
  padding: 14px 20px;
  font-size: 1rem;
}

.store-light .search-bar input {
  border: 0;
  background: transparent;
  outline: none;
  font-size: 0.95rem;
  color: var(--text);
  width: 100%;
}

.store-light .search-bar input::placeholder {
  color: var(--text-muted);
}

.store-light .browse-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 28px;
  align-items: start;
}

.store-light .browse-rail {
  position: sticky;
  top: 80px;
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-soft);
}

.store-light .rail-section {
  margin-bottom: 20px;
}

.store-light .rail-section:last-child {
  margin-bottom: 0;
}

.store-light .rail-title {
  margin: 0 0 10px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text);
}

.store-light .browse-filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.store-light .sort-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.store-light .sort-option {
  font-size: 0.85rem;
  color: var(--text-muted);
  cursor: pointer;
  background: none;
  border: none;
  text-align: left;
  padding: 4px 0;
}

.store-light .sort-option.active {
  color: var(--text);
  font-weight: 600;
}

.store-light .browse-results {
  display: grid;
  gap: 14px;
}

.store-light .browse-count {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0 0 14px;
}

/* --- Detail page --- */
.store-light .detail-top {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 32px;
  margin-bottom: 32px;
}

.store-light .detail-cover {
  display: grid;
  gap: 14px;
}

.store-light .detail-cover img {
  width: 100%;
  border-radius: var(--radius-md);
  aspect-ratio: 0.72;
  object-fit: cover;
}

.store-light .detail-cover-actions {
  display: flex;
  gap: 8px;
}

.store-light .detail-cover-actions .button {
  flex: 1;
}

.store-light .detail-cover-actions .button-heart {
  flex: none;
  width: 44px;
  justify-content: center;
  padding: 0;
}

.store-light .detail-info {
  display: grid;
  gap: 14px;
  align-content: start;
}

.store-light .detail-badges {
  display: flex;
  gap: 8px;
}

.store-light .detail-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.store-light .detail-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.store-light .detail-meta-grid {
  display: flex;
  gap: 20px;
}

.store-light .detail-meta-item {
  display: grid;
  gap: 2px;
}

.store-light .detail-meta-label {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.store-light .detail-meta-value {
  font-size: 0.9rem;
  font-weight: 600;
}

.store-light .detail-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.store-light .detail-synopsis {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.8;
}

/* --- Pricing box --- */
.store-light .price-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.store-light .price-box-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0;
}

.store-light .price-box-values {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin-top: 4px;
}

.store-light .price-box-note {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin: 4px 0 0;
}

/* --- Episode list --- */
.store-light .episode-section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.store-light .episode-tabs {
  display: flex;
  gap: 8px;
}

.store-light .episode-list {
  background: var(--surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border);
}

.store-light .episode-row {
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--surface-muted);
}

.store-light .episode-row:last-child {
  border-bottom: none;
}

.store-light .episode-row-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.store-light .episode-num {
  min-width: 36px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.store-light .episode-title {
  font-size: 0.9rem;
  color: var(--text);
}

.store-light .episode-collapsed {
  background: var(--bg);
  color: var(--text-muted);
  font-size: 0.85rem;
}

/* --- Reader page --- */
.store-light .reader-nav {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 12px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 90;
}

.store-light .reader-nav-left {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 0.9rem;
}

.store-light .reader-nav-back {
  color: var(--text-muted);
}

.store-light .reader-nav-title {
  font-weight: 600;
  color: var(--text);
}

.store-light .reader-nav-episode {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.store-light .reader-nav-right {
  display: flex;
  gap: 12px;
  align-items: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.store-light .reader-body {
  max-width: 680px;
  margin: 0 auto;
  padding: 48px 32px 80px;
}

.store-light .reader-chapter-header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border);
}

.store-light .reader-chapter-header p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.store-light .reader-chapter-header h1 {
  margin: 8px 0;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--text);
}

.store-light .reader-content {
  color: #333;
  font-size: 1rem;
  line-height: 2.0;
}

.store-light .reader-content p {
  margin: 0 0 24px;
  text-indent: 1em;
}

/* --- Chapter navigation --- */
.store-light .chapter-nav {
  border-top: 1px solid var(--border);
  background: var(--surface);
  padding: 18px 32px;
  position: sticky;
  bottom: 0;
  z-index: 80;
}

.store-light .chapter-nav-inner {
  max-width: 680px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: center;
}

.store-light .chapter-nav-prev {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.store-light .chapter-nav-center {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.store-light .chapter-nav-next {
  text-align: right;
  font-size: 0.85rem;
}

.store-light .chapter-nav-next a {
  font-weight: 600;
  color: var(--text);
}

/* --- Paywall --- */
.store-light .paywall {
  max-width: 480px;
  margin: 40px auto;
  background: var(--surface);
  border-radius: 14px;
  padding: 36px 28px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid var(--border);
  text-align: center;
}

.store-light .paywall-title {
  font-size: 1.35rem;
  font-weight: 800;
  margin: 6px 0;
}

.store-light .paywall-prices {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
}

.store-light .paywall-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}
```

- [ ] **Step 3: 브라우저에서 홈페이지 확인**

Run: 브라우저에서 `homepage_pc.html` 열기
Expected: 밝은 웜 화이트 배경, 다크 히어로, 흰색 네비. 기존 다크 테마 흔적 없음.

- [ ] **Step 4: 비대상 페이지 깨짐 확인**

Run: 브라우저에서 `auth_pc.html`, `creator_dashboard_pc.html` 열기
Expected: 기존 다크 디자인 유지 (이 페이지들은 `store-light` 클래스 없음)

- [ ] **Step 5: Commit**

```bash
git add assets/styles.css assets/pc.css
git commit -m "feat: add Clean Light Store design tokens and components

Scoped under .store-light so legacy dark pages are unaffected."
```

---

## Task 2: 탐색 페이지 HTML 교체

**Files:**
- Modify: `search_pc.html` (전체 교체)

- [ ] **Step 1: `search_pc.html`을 새 구조로 교체**

아래 내용으로 `search_pc.html` 전체를 교체한다. 기존 `app.js`가 사용하는 data-attribute(`data-nav-link`, `data-filter-chip`, `data-search-card`, `data-search-input`, `data-active-filters`, `data-year`)를 모두 유지한다:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>INKROAD | 탐색</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/pretendard.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0" rel="stylesheet">
  <link rel="stylesheet" href="assets/styles.css">
  <link rel="stylesheet" href="assets/pc.css">
</head>
<body class="pc-desktop store-light">
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="homepage_pc.html">
        <span class="brand-mark material-symbols-outlined">auto_stories</span>
        <span class="brand-copy">
          <strong class="brand-name">INKROAD</strong>
          <span class="brand-sub">글로벌 웹소설 스토어</span>
        </span>
      </a>
      <nav class="nav">
        <a class="nav-link" data-nav-link href="homepage_pc.html">스토어</a>
        <a class="nav-link" data-nav-link href="search_pc.html">탐색</a>
        <a class="nav-link" data-nav-link href="my_library_pc.html">내 서재</a>
        <a class="nav-link nav-link-sale" href="homepage_pc.html#sale-section">세일</a>
      </nav>
      <form class="store-top-search" action="search_pc.html">
        <span class="material-symbols-outlined">search</span>
        <input type="search" name="q" placeholder="작품명, 작가, 태그 검색">
      </form>
      <button class="store-lang" type="button">KR ▾</button>
      <a class="button ghost button-login" href="my_library_pc.html">로그인</a>
    </div>
  </header>

  <main class="pc-page store-home">
    <section class="search-bar-band">
      <div class="search-bar">
        <span class="material-symbols-outlined">search</span>
        <input type="search" data-search-input placeholder="작품명, 작가, 태그로 검색...">
      </div>
    </section>

    <div class="store-shell" style="padding-top:24px;">
      <section class="browse-layout">
        <aside class="browse-rail" data-reveal>
          <div class="rail-section">
            <h2 class="rail-title">장르</h2>
            <div class="browse-filter-group">
              <button class="filter-chip" type="button" data-filter-chip data-label="판타지">판타지</button>
              <button class="filter-chip" type="button" data-filter-chip data-label="로맨스">로맨스</button>
              <button class="filter-chip" type="button" data-filter-chip data-label="회귀">회귀</button>
              <button class="filter-chip" type="button" data-filter-chip data-label="아카데미">아카데미</button>
              <button class="filter-chip" type="button" data-filter-chip data-label="하렘">하렘</button>
              <button class="filter-chip" type="button" data-filter-chip data-label="피폐">피폐</button>
            </div>
          </div>
          <div class="rail-section">
            <h2 class="rail-title">출처</h2>
            <div class="browse-filter-group">
              <button class="filter-chip" type="button" data-filter-chip data-label="한국">한국</button>
              <button class="filter-chip" type="button" data-filter-chip data-label="일본">일본</button>
              <button class="filter-chip" type="button" data-filter-chip data-label="중국">중국</button>
              <button class="filter-chip" type="button" data-filter-chip data-label="영미">영미</button>
            </div>
          </div>
          <div class="rail-section">
            <h2 class="rail-title">상태</h2>
            <div class="browse-filter-group">
              <button class="filter-chip" type="button" data-filter-chip data-label="연재중">연재중</button>
              <button class="filter-chip" type="button" data-filter-chip data-label="완결">완결</button>
              <button class="filter-chip" type="button" data-filter-chip data-label="무료 구간 있음">무료 구간 있음</button>
              <button class="filter-chip" type="button" data-filter-chip data-label="할인 중">할인 중</button>
            </div>
          </div>
          <div class="rail-section">
            <h2 class="rail-title">정렬</h2>
            <div class="sort-group" data-sort-group>
              <button class="sort-option active" type="button" data-sort="popular">인기순</button>
              <button class="sort-option" type="button" data-sort="recent">최신순</button>
              <button class="sort-option" type="button" data-sort="rating">평점순</button>
              <button class="sort-option" type="button" data-sort="discount">할인율순</button>
            </div>
          </div>
        </aside>

        <div class="browse-main">
          <p class="browse-count" data-browse-count></p>
          <div class="browse-results" data-browse-results></div>
        </div>
      </section>

      <footer class="store-footer">
        <span>© <span data-year></span> INKROAD</span>
        <div class="bottom-meta">
          <a href="#">이용약관</a>
          <a href="#">개인정보</a>
          <a href="#">고객센터</a>
        </div>
      </footer>
    </div>
  </main>

  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="assets/supabase-live.js"></script>
  <script src="assets/store-redesign.js"></script>
</body>
</html>
```

- [ ] **Step 2: 브라우저에서 탐색 페이지 확인**

Run: 브라우저에서 `search_pc.html` 열기
Expected: 라이트 테마 네비 + 검색 바 + 좌측 필터 사이드바 + 우측 리스트형 결과 카드. 필터 칩 클릭 시 include/exclude 토글 동작.

- [ ] **Step 3: Commit**

```bash
git add search_pc.html
git commit -m "feat: replace search page with Clean Light Store layout"
```

---

## Task 3: 작품 상세 페이지 HTML 교체

**Files:**
- Modify: `novel_detail_pc.html` (전체 교체)

- [ ] **Step 1: `novel_detail_pc.html`을 새 구조로 교체**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>INKROAD | 작품 상세</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/pretendard.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0" rel="stylesheet">
  <link rel="stylesheet" href="assets/styles.css">
  <link rel="stylesheet" href="assets/pc.css">
</head>
<body class="pc-desktop store-light">
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="homepage_pc.html">
        <span class="brand-mark material-symbols-outlined">auto_stories</span>
        <span class="brand-copy">
          <strong class="brand-name">INKROAD</strong>
          <span class="brand-sub">글로벌 웹소설 스토어</span>
        </span>
      </a>
      <nav class="nav">
        <a class="nav-link" data-nav-link href="homepage_pc.html">스토어</a>
        <a class="nav-link" data-nav-link href="search_pc.html">탐색</a>
        <a class="nav-link" data-nav-link href="my_library_pc.html">내 서재</a>
        <a class="nav-link nav-link-sale" href="homepage_pc.html#sale-section">세일</a>
      </nav>
      <form class="store-top-search" action="search_pc.html">
        <span class="material-symbols-outlined">search</span>
        <input type="search" name="q" placeholder="작품명, 작가, 태그 검색">
      </form>
      <button class="store-lang" type="button">KR ▾</button>
      <a class="button ghost button-login" href="my_library_pc.html">로그인</a>
    </div>
  </header>

  <main class="pc-page store-home">
    <div class="store-shell" style="padding-top:32px;">
      <!-- Cover + Info -->
      <section class="detail-top" data-detail-top>
        <div class="detail-cover" data-detail-cover>
          <img src="https://placehold.co/400x556/eee/999?text=Cover" alt="표지">
          <div class="detail-cover-actions">
            <a class="button primary" data-detail-read href="novel_viewer_pc.html">1화 읽기</a>
            <button class="button secondary button-heart" type="button" data-bookmark-id="detail-main" aria-label="찜하기">
              <span class="material-symbols-outlined">favorite</span>
            </button>
          </div>
        </div>
        <div class="detail-info" data-detail-info>
          <div class="detail-badges" data-detail-badges></div>
          <h1 class="detail-title" data-detail-title>작품 제목</h1>
          <p class="detail-subtitle" data-detail-subtitle></p>
          <div class="detail-meta-grid" data-detail-meta></div>
          <div class="detail-tags" data-detail-tags></div>
          <p class="detail-synopsis" data-detail-synopsis></p>
          <div class="price-box" data-price-box></div>
        </div>
      </section>

      <!-- Episode list -->
      <section class="store-section" data-episode-section>
        <div class="episode-section-head">
          <h2 class="store-section-title">회차 목록</h2>
          <div class="episode-tabs" data-tab-group>
            <button class="filter-chip" data-tab-target="all" data-state="include" type="button">전체</button>
            <button class="filter-chip" data-tab-target="free" type="button">무료</button>
            <button class="filter-chip" data-tab-target="paid" type="button">유료</button>
          </div>
        </div>
        <div class="episode-list" data-episode-list></div>
      </section>

      <!-- Similar novels -->
      <section class="store-section" data-similar-section>
        <div class="store-section-head">
          <h2 class="store-section-title">비슷한 작품</h2>
        </div>
        <div class="novel-grid" data-similar-grid></div>
      </section>

      <footer class="store-footer">
        <span>© <span data-year></span> INKROAD</span>
        <div class="bottom-meta">
          <a href="#">이용약관</a>
          <a href="#">개인정보</a>
          <a href="#">고객센터</a>
        </div>
      </footer>
    </div>
  </main>

  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="assets/supabase-live.js"></script>
  <script src="assets/store-redesign.js"></script>
</body>
</html>
```

- [ ] **Step 2: 브라우저에서 상세 페이지 확인**

Run: `novel_detail_pc.html?slug=black-mage-oath` 열기
Expected: 라이트 테마. 좌측 표지(200px) + 우측 정보. 가격 박스에 편당 고정 단가 + 할인가. 회차 목록에 무료/유료 구분.

- [ ] **Step 3: Commit**

```bash
git add novel_detail_pc.html
git commit -m "feat: replace novel detail page with Clean Light Store layout"
```

---

## Task 4: 뷰어 페이지 HTML 교체

**Files:**
- Modify: `novel_viewer_pc.html` (전체 교체)

- [ ] **Step 1: `novel_viewer_pc.html`을 새 구조로 교체**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>INKROAD | 읽기</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/pretendard.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0" rel="stylesheet">
  <link rel="stylesheet" href="assets/styles.css">
  <link rel="stylesheet" href="assets/pc.css">
</head>
<body class="pc-desktop store-light" data-reader-root>
  <header class="reader-nav">
    <div class="reader-nav-left">
      <a class="reader-nav-back" data-reader-back href="novel_detail_pc.html">← 작품으로</a>
      <span style="color:var(--border);">|</span>
      <span class="reader-nav-title" data-reader-nav-title>작품명</span>
      <span class="reader-nav-episode" data-reader-nav-episode>1화</span>
    </div>
    <div class="reader-nav-right">
      <button type="button" data-bookmark-id="reader-bookmark" aria-label="찜하기">
        <span class="material-symbols-outlined">favorite</span>
      </button>
      <button type="button" aria-label="설정">
        <span class="material-symbols-outlined">settings</span>
      </button>
    </div>
  </header>

  <div class="reader-progress" aria-hidden="true">
    <div class="reader-progress-fill"></div>
  </div>

  <main>
    <div class="reader-body">
      <header class="reader-chapter-header" data-chapter-header>
        <p data-chapter-volume></p>
        <h1 data-chapter-title>회차 제목</h1>
        <p data-chapter-access></p>
      </header>
      <article class="reader-content" data-reader-content>
        <p>본문이 로딩 중입니다...</p>
      </article>
    </div>

    <!-- Paywall (hidden by default, shown by JS when reaching paid chapter) -->
    <section class="paywall" data-paywall style="display:none;">
      <p style="color:var(--text-muted);font-size:0.82rem;margin:0;">무료 구간이 끝났습니다</p>
      <h2 class="paywall-title" data-paywall-title></h2>
      <p style="color:var(--text-secondary);font-size:0.9rem;margin:6px 0 0;">다음 화를 읽으려면 결제가 필요합니다.</p>
      <div class="paywall-prices" data-paywall-prices></div>
      <div class="paywall-actions">
        <a class="button primary" data-paywall-buy href="#">이 화 구매하기</a>
        <a class="button secondary" data-paywall-detail href="novel_detail_pc.html">작품 상세로</a>
      </div>
      <p data-paywall-note style="color:var(--text-muted);font-size:0.72rem;margin:16px 0 0;"></p>
    </section>
  </main>

  <footer class="chapter-nav" data-chapter-nav>
    <div class="chapter-nav-inner">
      <div class="chapter-nav-prev" data-chapter-prev></div>
      <div class="chapter-nav-center">
        <button class="button ghost small" type="button" data-chapter-toc>목차</button>
        <span data-chapter-position>1 / 245</span>
      </div>
      <div class="chapter-nav-next" data-chapter-next></div>
    </div>
  </footer>

  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="assets/supabase-live.js"></script>
  <script src="assets/store-redesign.js"></script>
</body>
</html>
```

- [ ] **Step 2: 브라우저에서 뷰어 확인**

Run: `novel_viewer_pc.html?slug=black-mage-oath&episode=1` 열기
Expected: 미니멀 네비 + 진행률 바 + 680px 본문 + 하단 회차 이동 바. 배경 #f7f5f2 웜 화이트.

- [ ] **Step 3: Commit**

```bash
git add novel_viewer_pc.html
git commit -m "feat: replace novel viewer page with Clean Light Store layout"
```

---

## Task 5: `store-redesign.js` 렌더러 보강

**Files:**
- Modify: `assets/store-redesign.js` (search/detail/viewer 렌더러 확인 및 누락 연결 보강)

이 파일에는 이미 `renderHome`, `renderSearch`, `renderDetail`, `renderViewer` 함수가 있다. 각 렌더러가 새 HTML의 data-attribute 셀렉터와 정확히 매칭되는지 확인하고, 누락된 연결을 추가한다.

- [ ] **Step 1: JS가 새 HTML과 연결되는지 검증**

`store-redesign.js`의 각 렌더러가 사용하는 셀렉터 목록과 새 HTML의 data-attribute를 대조한다:

| JS 셀렉터 | 어디에 있어야 하는가 | 새 HTML에 존재? |
|---|---|---|
| `[data-browse-results]` | search_pc.html 결과 영역 | ✅ |
| `[data-browse-count]` | search_pc.html 결과 수 | ✅ |
| `[data-detail-title]` | novel_detail_pc.html 제목 | ✅ |
| `[data-detail-badges]` | novel_detail_pc.html 뱃지 | ✅ |
| `[data-detail-meta]` | novel_detail_pc.html 메타 | ✅ |
| `[data-detail-tags]` | novel_detail_pc.html 태그 | ✅ |
| `[data-detail-synopsis]` | novel_detail_pc.html 시놉시스 | ✅ |
| `[data-price-box]` | novel_detail_pc.html 가격 박스 | ✅ |
| `[data-episode-list]` | novel_detail_pc.html 회차 목록 | ✅ |
| `[data-similar-grid]` | novel_detail_pc.html 추천 | ✅ |
| `[data-reader-content]` | novel_viewer_pc.html 본문 | ✅ |
| `[data-chapter-title]` | novel_viewer_pc.html 회차 제목 | ✅ |
| `[data-paywall]` | novel_viewer_pc.html 페이월 | ✅ |
| `[data-chapter-nav]` | novel_viewer_pc.html 회차 이동 | ✅ |

누락된 셀렉터가 있으면 HTML에 추가하거나 JS를 수정한다.

- [ ] **Step 2: 읽기 진행률 바 스크롤 연동 확인**

`store-redesign.js`에 `renderViewer`가 스크롤 이벤트로 `.reader-progress-fill`의 width를 업데이트하는지 확인한다. 없으면 추가:

```javascript
// Inside renderViewer, after content is loaded:
window.addEventListener("scroll", function () {
  var fill = q(".reader-progress-fill");
  if (!fill) return;
  var scrollTop = window.scrollY || document.documentElement.scrollTop;
  var docHeight = document.documentElement.scrollHeight - window.innerHeight;
  var percent = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
  fill.style.width = percent + "%";
});
```

- [ ] **Step 3: 네 페이지 전부 확인**

Run: 홈 → 탐색 → 상세 → 뷰어 순서로 네비게이션 테스트
Expected: 모든 페이지 라이트 테마, 네비 일관, 데이터 로딩, 필터/북마크 동작

- [ ] **Step 4: Commit**

```bash
git add assets/store-redesign.js
git commit -m "fix: align store-redesign.js selectors with new HTML structure"
```

---

## Task 6: 최종 검증 + 클린업

**Files:**
- Review: 모든 4개 HTML + 2개 CSS + 1개 JS

- [ ] **Step 1: 비대상 페이지 무결성 확인**

Run: `auth_pc.html`, `payment_pc.html`, `creator_dashboard_pc.html`, `my_library_pc.html` 열기
Expected: 기존 다크 디자인 유지, 깨지는 요소 없음

- [ ] **Step 2: 금지 색상 검증**

Run: CSS 파일에서 보라/핑크/네온 계열 색상 검색
```bash
grep -iE "#[89a-f][0-9a-f]?[0-9a-f]?[89a-f]|purple|violet|magenta|#[56][0-9a-f]{2}[ef][0-9a-f]{2}" assets/styles.css assets/pc.css
```
Expected: `.store-light` 블록 내에 보라/네온 색상 없음

- [ ] **Step 3: 편당 고정 단가 일관성 확인**

Run: `store-redesign.js`에서 `EPISODE_PRICE` 변수가 단일 값(300)인지 확인. 하드코딩된 다른 가격 없는지 검색.
```bash
grep -n "EPISODE_PRICE\|편당\|300원\|200원\|250원" assets/store-redesign.js
```
Expected: `EPISODE_PRICE = 300` 하나만 존재. 다른 하드코딩된 가격 없음.

- [ ] **Step 4: Commit — 최종**

```bash
git add -A
git commit -m "chore: final verification pass for Clean Light Store redesign"
```
