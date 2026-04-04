# 잉크로드 모바일 5개 페이지 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 5개 페이지(homepage, search, novel_detail, novel_viewer, my_library)를 Clean Light Store 디자인으로 교체하고 Supabase 연동을 완성한다.

**Architecture:** `styles.css` 하단에 모바일 전용 `.store-light` 컴포넌트를 추가한다. 5개 HTML을 전면 교체하고 `store-redesign.js`에 모바일 렌더러 5개를 추가한다. 하단 탭 바 + 상단 헤더가 공통 셸이다.

**Tech Stack:** HTML/CSS/Vanilla JS, Supabase REST API + Auth, Pretendard + Inter (CDN), Material Symbols Outlined

**Design Spec:** `docs/superpowers/specs/2026-04-04-inkroad-mobile-design.md`

---

## File Structure

### 수정 대상

| 파일 | 역할 | 변경 내용 |
|------|------|-----------|
| `assets/styles.css` | CSS 변수 + 공용 컴포넌트 | 하단에 모바일 `.store-light` 블록 추가 (~200줄) |
| `homepage.html` | 모바일 홈 | HTML 전체 교체 |
| `search.html` | 모바일 탐색 | HTML 전체 교체 |
| `novel_detail.html` | 모바일 상세 | HTML 전체 교체 |
| `novel_viewer.html` | 모바일 뷰어 | HTML 전체 교체 |
| `my_library.html` | 모바일 서재 | HTML 전체 교체 |
| `assets/store-redesign.js` | Supabase 연동 | supported 배열 확장 + 렌더러 5개 + hydrate 라우팅 |

### 건드리지 않는 파일

- PC 8개 HTML — 이미 완료
- `assets/pc.css` — 모바일에서 로드하지 않음
- `assets/app.js`, `assets/supabase-config.js`, `assets/supabase-live.js` — 변경 없음

---

## Task 1: CSS 추가 — 모바일 컴포넌트 스타일

**Files:**
- Modify: `assets/styles.css` (파일 하단에 추가)

- [ ] **Step 1: `styles.css` 하단에 모바일 `.store-light` CSS 추가**

`assets/styles.css` 파일 **맨 하단** (`.store-light .library-list` 블록 뒤)에 아래 블록을 추가한다:

```css
/* ========================================
   Clean Light Store — Mobile components
   Tab bar, header, hero, scroll, list, detail, reader
   ======================================== */

/* --- Mobile tab bar --- */
.store-light .mobile-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  padding-bottom: env(safe-area-inset-bottom, 0);
  background: var(--surface);
  border-top: 1px solid var(--border);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  z-index: 200;
}

.store-light .tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 10px;
  transition: color 150ms;
}

.store-light .tab-item .material-symbols-outlined {
  font-size: 22px;
}

.store-light .tab-item.active {
  color: var(--dark);
  font-weight: 600;
}

.store-light .tab-label {
  font-size: 10px;
  line-height: 1;
}

/* --- Mobile header --- */
.store-light .mobile-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 52px;
  padding: 0 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.store-light .mobile-header .brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.store-light .mobile-header .brand-mark {
  width: 28px;
  height: 28px;
  background: var(--dark);
  color: #fff;
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-size: 16px;
}

.store-light .mobile-header .brand-name {
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.03em;
}

.store-light .mobile-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.store-light .mobile-header-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  transition: background 150ms;
}

.store-light .mobile-header-icon:hover {
  background: var(--surface-muted);
}

/* --- Mobile content shell --- */
.store-light .mobile-content {
  padding-bottom: 72px;
  background: var(--bg);
  min-height: 100vh;
}

/* --- Mobile hero --- */
.store-light .mobile-hero {
  display: flex;
  gap: 14px;
  padding: 20px 16px;
  background: var(--surface);
  margin-bottom: 8px;
}

.store-light .mobile-hero-cover img {
  width: 72px;
  aspect-ratio: 0.72;
  object-fit: cover;
  border-radius: var(--radius-sm);
  display: block;
}

.store-light .mobile-hero-info {
  flex: 1;
  display: grid;
  gap: 4px;
  align-content: start;
}

.store-light .mobile-hero-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  line-height: 1.3;
  letter-spacing: -0.03em;
}

.store-light .mobile-hero-meta {
  font-size: 11px;
  color: var(--text-muted);
}

.store-light .mobile-hero-price {
  font-size: 11px;
  color: var(--text-muted);
}

.store-light .mobile-hero-cta {
  display: flex;
  gap: 8px;
  padding: 0 16px 16px;
  background: var(--surface);
}

/* --- Mobile sections --- */
.store-light .mobile-section {
  padding: 20px 0 8px;
}

.store-light .mobile-section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px 12px;
}

.store-light .mobile-section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.03em;
}

.store-light .mobile-section-link {
  font-size: 12px;
  color: var(--text-muted);
  text-decoration: none;
}

/* --- Mobile scroll row --- */
.store-light .mobile-scroll-row {
  display: flex;
  gap: 12px;
  padding: 0 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.store-light .mobile-scroll-row::-webkit-scrollbar {
  display: none;
}

.store-light .mobile-scroll-card {
  width: 120px;
  flex-shrink: 0;
  scroll-snap-align: start;
}

.store-light .mobile-scroll-card img {
  width: 120px;
  aspect-ratio: 0.72;
  object-fit: cover;
  border-radius: var(--radius-sm);
  display: block;
  margin-bottom: 8px;
}

.store-light .mobile-scroll-card-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 4px;
}

.store-light .mobile-scroll-card-price {
  font-size: 11px;
  color: var(--text-muted);
}

/* --- Mobile list row --- */
.store-light .mobile-list-row {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  align-items: flex-start;
  text-decoration: none;
  transition: background 150ms;
}

.store-light .mobile-list-row:hover {
  background: var(--surface-muted);
}

.store-light .mobile-list-row img {
  width: 56px;
  aspect-ratio: 0.72;
  object-fit: cover;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.store-light .mobile-list-row-copy {
  flex: 1;
  display: grid;
  gap: 3px;
}

.store-light .mobile-list-row-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
}

.store-light .mobile-list-row-meta {
  font-size: 11px;
  color: var(--text-muted);
}

/* --- Mobile search input --- */
.store-light .mobile-search-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 16px;
  padding: 10px 14px;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.store-light .mobile-search-input .material-symbols-outlined {
  font-size: 20px;
  color: var(--text-muted);
}

.store-light .mobile-search-input input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  font-family: var(--font);
  color: var(--text);
  outline: none;
}

.store-light .mobile-search-input input::placeholder {
  color: var(--text-muted);
}

/* --- Mobile filter row --- */
.store-light .mobile-chip-scroll {
  display: flex;
  gap: 6px;
  padding: 0 16px 10px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.store-light .mobile-chip-scroll::-webkit-scrollbar {
  display: none;
}

.store-light .mobile-filter-row {
  display: flex;
  gap: 6px;
  padding: 0 16px 12px;
}

.store-light .mobile-filter-btn {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--surface);
  font-family: var(--font);
  cursor: pointer;
  white-space: nowrap;
}

/* --- Mobile detail header --- */
.store-light .mobile-detail-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 48px;
  padding: 0 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.store-light .mobile-detail-header .back-btn {
  color: var(--text);
  text-decoration: none;
  display: grid;
  place-items: center;
}

.store-light .mobile-detail-header-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

/* --- Mobile detail cover --- */
.store-light .mobile-detail-cover {
  text-align: center;
  padding: 24px 16px 16px;
  background: var(--surface);
}

.store-light .mobile-detail-cover img {
  width: 160px;
  aspect-ratio: 0.72;
  object-fit: cover;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

/* --- Mobile detail info --- */
.store-light .mobile-detail-info {
  text-align: center;
  padding: 0 16px 16px;
  background: var(--surface);
}

.store-light .mobile-detail-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.03em;
}

.store-light .mobile-detail-author {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.store-light .mobile-detail-tags {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

/* --- Mobile detail stats --- */
.store-light .mobile-detail-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  text-align: center;
  padding: 14px 16px;
  background: var(--surface);
  border-top: 1px solid var(--surface-muted);
  border-bottom: 1px solid var(--surface-muted);
  margin-bottom: 8px;
}

.store-light .mobile-detail-stat-value {
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
}

.store-light .mobile-detail-stat-label {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* --- Mobile detail synopsis --- */
.store-light .mobile-detail-synopsis {
  padding: 16px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.store-light .mobile-detail-synopsis.clamped {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.store-light .mobile-detail-more {
  display: block;
  padding: 0 16px 12px;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  background: none;
  border: none;
  font-family: var(--font);
}

/* --- Mobile detail CTA --- */
.store-light .mobile-detail-cta {
  position: sticky;
  bottom: 72px;
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: var(--surface);
  border-top: 1px solid var(--border);
  z-index: 50;
}

/* --- Mobile episode row --- */
.store-light .mobile-episode-list {
  padding: 8px 0;
}

.store-light .mobile-episode-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  text-decoration: none;
  transition: background 150ms;
}

.store-light .mobile-episode-row:hover {
  background: var(--surface-muted);
}

.store-light .mobile-episode-num {
  width: 32px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-align: center;
  flex-shrink: 0;
}

.store-light .mobile-episode-title {
  flex: 1;
  font-size: 13px;
  color: var(--text);
}

.store-light .mobile-episode-badge {
  font-size: 11px;
  flex-shrink: 0;
}

/* --- Mobile reader chrome --- */
.store-light .mobile-reader-chrome {
  position: fixed;
  left: 0;
  right: 0;
  background: var(--surface);
  z-index: 300;
  transition: transform 200ms, opacity 200ms;
}

.store-light .mobile-reader-chrome.hidden {
  opacity: 0;
  pointer-events: none;
}

.store-light .mobile-reader-top {
  top: 0;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.store-light .mobile-reader-top.hidden {
  transform: translateY(-100%);
}

.store-light .mobile-reader-top .back-btn {
  color: var(--text);
  text-decoration: none;
}

.store-light .mobile-reader-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.store-light .mobile-reader-bottom {
  bottom: 0;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0));
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.store-light .mobile-reader-bottom.hidden {
  transform: translateY(100%);
}

.store-light .mobile-reader-body {
  padding: 16px;
  line-height: 1.9;
  font-size: 16px;
  color: var(--text);
  min-height: 100vh;
}

.store-light .mobile-reader-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  background: var(--dark);
  z-index: 400;
  transition: width 100ms;
}

/* --- Mobile sale banner --- */
.store-light .mobile-sale-banner {
  margin: 0 16px 8px;
  padding: 14px 16px;
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  display: flex;
  align-items: center;
  gap: 12px;
}

.store-light .mobile-sale-banner-copy {
  flex: 1;
}

.store-light .mobile-sale-banner-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.store-light .mobile-sale-banner-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* --- Mobile footer --- */
.store-light .mobile-footer {
  padding: 24px 16px;
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
}

.store-light .mobile-footer a {
  color: var(--text-muted);
  text-decoration: none;
  margin: 0 8px;
}

/* --- Viewer: hide tab bar --- */
.store-light.mobile-viewer .mobile-tab-bar {
  display: none;
}

.store-light.mobile-viewer .mobile-content {
  padding-bottom: 0;
}
```

---

## Task 2: homepage.html 교체

**Files:**
- Modify: `homepage.html` (전체 교체)

- [ ] **Step 1: `homepage.html`을 새 구조로 교체**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>INKROAD | 글로벌 웹소설 스토어</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/pretendard.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0" rel="stylesheet">
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body class="mobile-app store-light">
  <header class="mobile-header">
    <a class="brand" href="homepage.html">
      <span class="brand-mark material-symbols-outlined">auto_stories</span>
      <strong class="brand-name">INKROAD</strong>
    </a>
    <div class="mobile-header-actions">
      <a href="search.html" class="mobile-header-icon"><span class="material-symbols-outlined">search</span></a>
      <a href="auth_pc.html" class="mobile-header-icon" data-auth-link><span class="material-symbols-outlined">person</span></a>
    </div>
  </header>

  <main class="mobile-content">
    <div class="mobile-hero" data-mobile-hero></div>
    <div class="mobile-hero-cta" data-mobile-hero-cta></div>

    <div class="mobile-sale-banner" data-mobile-sale-banner style="display:none;"></div>

    <section class="mobile-section" data-mobile-section-sale style="display:none;">
      <div class="mobile-section-head">
        <h2 class="mobile-section-title">지금 할인 중</h2>
        <a class="mobile-section-link" href="search.html">전체 보기 →</a>
      </div>
      <div class="mobile-scroll-row" data-mobile-sale-list></div>
    </section>

    <section class="mobile-section">
      <div class="mobile-section-head">
        <h2 class="mobile-section-title">인기 작품</h2>
        <a class="mobile-section-link" href="search.html">전체 보기 →</a>
      </div>
      <div class="mobile-scroll-row" data-mobile-popular-list></div>
    </section>

    <section class="mobile-section">
      <div class="mobile-section-head">
        <h2 class="mobile-section-title">최근 업데이트</h2>
      </div>
      <div data-mobile-recent-list></div>
    </section>

    <footer class="mobile-footer">
      <span>© <span data-year></span> INKROAD</span>
      <div style="margin-top:6px;">
        <a href="#">이용약관</a>
        <a href="#">개인정보</a>
        <a href="#">고객센터</a>
      </div>
    </footer>
  </main>

  <nav class="mobile-tab-bar">
    <a class="tab-item active" href="homepage.html">
      <span class="material-symbols-outlined">home</span>
      <span class="tab-label">홈</span>
    </a>
    <a class="tab-item" href="search.html">
      <span class="material-symbols-outlined">search</span>
      <span class="tab-label">탐색</span>
    </a>
    <a class="tab-item" href="my_library.html">
      <span class="material-symbols-outlined">auto_stories</span>
      <span class="tab-label">서재</span>
    </a>
    <a class="tab-item" href="auth_pc.html">
      <span class="material-symbols-outlined">person</span>
      <span class="tab-label">MY</span>
    </a>
  </nav>

  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="assets/supabase-live.js"></script>
  <script src="assets/store-redesign.js"></script>
</body>
</html>
```

---

## Task 3: search.html 교체

**Files:**
- Modify: `search.html` (전체 교체)

- [ ] **Step 1: `search.html`을 새 구조로 교체**

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
</head>
<body class="mobile-app store-light">
  <header class="mobile-header">
    <a class="brand" href="homepage.html">
      <span class="brand-mark material-symbols-outlined">auto_stories</span>
      <strong class="brand-name">INKROAD</strong>
    </a>
    <div class="mobile-header-actions">
      <a href="auth_pc.html" class="mobile-header-icon" data-auth-link><span class="material-symbols-outlined">person</span></a>
    </div>
  </header>

  <main class="mobile-content">
    <form class="mobile-search-input" action="search.html">
      <span class="material-symbols-outlined">search</span>
      <input type="search" name="q" placeholder="작품명, 작가, 태그로 검색...">
    </form>

    <div class="mobile-chip-scroll" data-mobile-genre-chips>
      <button class="filter-chip" type="button" data-genre="" data-state="include">전체</button>
      <button class="filter-chip" type="button" data-genre="판타지">판타지</button>
      <button class="filter-chip" type="button" data-genre="로맨스">로맨스</button>
      <button class="filter-chip" type="button" data-genre="회귀">회귀</button>
      <button class="filter-chip" type="button" data-genre="아카데미">아카데미</button>
      <button class="filter-chip" type="button" data-genre="하렘">하렘</button>
      <button class="filter-chip" type="button" data-genre="피폐">피폐</button>
    </div>

    <div class="mobile-filter-row">
      <button class="mobile-filter-btn" type="button" data-filter="origin">출처 ▾</button>
      <button class="mobile-filter-btn" type="button" data-filter="status">상태 ▾</button>
      <button class="mobile-filter-btn" type="button" data-filter="sort">정렬 ▾</button>
    </div>

    <div style="padding:0 16px 8px;font-size:12px;color:var(--text-muted);" data-mobile-result-count></div>

    <div data-mobile-search-results></div>
  </main>

  <nav class="mobile-tab-bar">
    <a class="tab-item" href="homepage.html">
      <span class="material-symbols-outlined">home</span>
      <span class="tab-label">홈</span>
    </a>
    <a class="tab-item active" href="search.html">
      <span class="material-symbols-outlined">search</span>
      <span class="tab-label">탐색</span>
    </a>
    <a class="tab-item" href="my_library.html">
      <span class="material-symbols-outlined">auto_stories</span>
      <span class="tab-label">서재</span>
    </a>
    <a class="tab-item" href="auth_pc.html">
      <span class="material-symbols-outlined">person</span>
      <span class="tab-label">MY</span>
    </a>
  </nav>

  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="assets/supabase-live.js"></script>
  <script src="assets/store-redesign.js"></script>
</body>
</html>
```

---

## Task 4: novel_detail.html 교체

**Files:**
- Modify: `novel_detail.html` (전체 교체)

- [ ] **Step 1: `novel_detail.html`을 새 구조로 교체**

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
</head>
<body class="mobile-app store-light">
  <header class="mobile-detail-header">
    <a class="back-btn" href="homepage.html" data-back-btn><span class="material-symbols-outlined">arrow_back</span></a>
    <span class="mobile-detail-header-title" data-detail-header-title>작품 상세</span>
  </header>

  <main class="mobile-content">
    <div class="mobile-detail-cover" data-detail-cover></div>
    <div class="mobile-detail-info" data-detail-info></div>
    <div class="mobile-detail-stats" data-detail-stats></div>
    <div class="mobile-detail-synopsis clamped" data-detail-synopsis></div>
    <button class="mobile-detail-more" data-detail-more type="button">더보기</button>
    <div class="mobile-detail-cta" data-detail-cta></div>
    <div class="mobile-episode-list" data-detail-episodes></div>
  </main>

  <nav class="mobile-tab-bar">
    <a class="tab-item" href="homepage.html">
      <span class="material-symbols-outlined">home</span>
      <span class="tab-label">홈</span>
    </a>
    <a class="tab-item" href="search.html">
      <span class="material-symbols-outlined">search</span>
      <span class="tab-label">탐색</span>
    </a>
    <a class="tab-item" href="my_library.html">
      <span class="material-symbols-outlined">auto_stories</span>
      <span class="tab-label">서재</span>
    </a>
    <a class="tab-item" href="auth_pc.html">
      <span class="material-symbols-outlined">person</span>
      <span class="tab-label">MY</span>
    </a>
  </nav>

  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="assets/supabase-live.js"></script>
  <script src="assets/store-redesign.js"></script>
</body>
</html>
```

---

## Task 5: novel_viewer.html 교체

**Files:**
- Modify: `novel_viewer.html` (전체 교체)

- [ ] **Step 1: `novel_viewer.html`을 새 구조로 교체**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>INKROAD | 뷰어</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/pretendard.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0" rel="stylesheet">
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body class="mobile-app store-light mobile-viewer">
  <div class="mobile-reader-progress" data-reader-progress></div>

  <div class="mobile-reader-chrome mobile-reader-top" data-reader-top>
    <a class="back-btn" href="homepage.html" data-back-btn><span class="material-symbols-outlined">arrow_back</span></a>
    <span class="mobile-reader-title" data-reader-title>읽는 중</span>
    <a class="mobile-header-icon" data-reader-list-btn><span class="material-symbols-outlined">list</span></a>
  </div>

  <main class="mobile-content">
    <article class="mobile-reader-body" data-reader-body></article>
  </main>

  <div class="mobile-reader-chrome mobile-reader-bottom" data-reader-bottom>
    <a class="button small ghost" data-reader-prev>← 이전화</a>
    <span style="font-size:12px;color:var(--text-muted);" data-reader-episode-num></span>
    <a class="button small ghost" data-reader-next>다음화 →</a>
  </div>

  <nav class="mobile-tab-bar">
    <a class="tab-item" href="homepage.html">
      <span class="material-symbols-outlined">home</span>
      <span class="tab-label">홈</span>
    </a>
    <a class="tab-item" href="search.html">
      <span class="material-symbols-outlined">search</span>
      <span class="tab-label">탐색</span>
    </a>
    <a class="tab-item" href="my_library.html">
      <span class="material-symbols-outlined">auto_stories</span>
      <span class="tab-label">서재</span>
    </a>
    <a class="tab-item" href="auth_pc.html">
      <span class="material-symbols-outlined">person</span>
      <span class="tab-label">MY</span>
    </a>
  </nav>

  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="assets/supabase-live.js"></script>
  <script src="assets/store-redesign.js"></script>
</body>
</html>
```

---

## Task 6: my_library.html 교체

**Files:**
- Modify: `my_library.html` (전체 교체)

- [ ] **Step 1: `my_library.html`을 새 구조로 교체**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>INKROAD | 내 서재</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/pretendard.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0" rel="stylesheet">
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body class="mobile-app store-light">
  <header class="mobile-header">
    <a class="brand" href="homepage.html">
      <span class="brand-mark material-symbols-outlined">auto_stories</span>
      <strong class="brand-name">INKROAD</strong>
    </a>
    <div class="mobile-header-actions">
      <a href="search.html" class="mobile-header-icon"><span class="material-symbols-outlined">search</span></a>
      <a href="auth_pc.html" class="mobile-header-icon" data-auth-link><span class="material-symbols-outlined">person</span></a>
    </div>
  </header>

  <main class="mobile-content" style="padding:16px 0 72px;">
    <div style="padding:0 16px 12px;display:flex;justify-content:space-between;align-items:center;">
      <h1 class="mobile-section-title">내 서재</h1>
      <div data-library-stats style="font-size:12px;color:var(--text-muted);"></div>
    </div>

    <div class="mobile-chip-scroll" style="padding-bottom:16px;">
      <button class="filter-chip" type="button" data-tab-target="reading" data-state="include">읽는 중</button>
      <button class="filter-chip" type="button" data-tab-target="wishlist">찜한 작품</button>
      <button class="filter-chip" type="button" data-tab-target="purchased">구매한 작품</button>
    </div>

    <div data-tab-panel="reading">
      <div data-library-reading></div>
    </div>
    <div data-tab-panel="wishlist" style="display:none;">
      <div data-library-wishlist></div>
    </div>
    <div data-tab-panel="purchased" style="display:none;">
      <div data-library-purchased></div>
    </div>
  </main>

  <nav class="mobile-tab-bar">
    <a class="tab-item" href="homepage.html">
      <span class="material-symbols-outlined">home</span>
      <span class="tab-label">홈</span>
    </a>
    <a class="tab-item" href="search.html">
      <span class="material-symbols-outlined">search</span>
      <span class="tab-label">탐색</span>
    </a>
    <a class="tab-item active" href="my_library.html">
      <span class="material-symbols-outlined">auto_stories</span>
      <span class="tab-label">서재</span>
    </a>
    <a class="tab-item" href="auth_pc.html">
      <span class="material-symbols-outlined">person</span>
      <span class="tab-label">MY</span>
    </a>
  </nav>

  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="assets/supabase-live.js"></script>
  <script src="assets/store-redesign.js"></script>
</body>
</html>
```

---

## Task 7: store-redesign.js — 모바일 렌더러 5개 추가

**Files:**
- Modify: `assets/store-redesign.js`

- [ ] **Step 1: `supported` 배열에 모바일 5개 추가**

기존:
```javascript
const supported = ["homepage_pc.html", "search_pc.html", "novel_detail_pc.html", "novel_viewer_pc.html", "my_library_pc.html", "auth_pc.html", "creator_dashboard_pc.html", "author_dashboard_pc.html"];
```

변경:
```javascript
const supported = ["homepage_pc.html", "search_pc.html", "novel_detail_pc.html", "novel_viewer_pc.html", "my_library_pc.html", "auth_pc.html", "creator_dashboard_pc.html", "author_dashboard_pc.html", "homepage.html", "search.html", "novel_detail.html", "novel_viewer.html", "my_library.html"];
```

- [ ] **Step 2: `renderAuthorDashboard` 함수 닫힘 뒤, `hydrate` 함수 앞에 5개 모바일 렌더러 추가**

`renderAuthorDashboard` 끝 (`});` + `}`) 바로 뒤, `async function hydrate()` 바로 앞에 아래 코드를 삽입한다:

```javascript

  function mobileDetailHref(slug) { return "novel_detail.html?slug=" + encodeURIComponent(slug); }
  function mobileViewerHref(slug, ep) { return "novel_viewer.html?slug=" + encodeURIComponent(slug) + "&episode=" + ep; }

  function buildMobileScrollCard(novel) {
    var sale = salePercent(novel);
    var priceHtml = sale
      ? "<span style='text-decoration:line-through;'>" + formatWon(EPISODE_PRICE) + "</span> <span style='color:var(--accent-sale);font-weight:600;'>" + formatWon(discountedEpisodePrice(novel)) + "</span>"
      : formatWon(EPISODE_PRICE);
    return "<a class='mobile-scroll-card' href='" + mobileDetailHref(novel.slug) + "'>" +
      "<img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'>" +
      "<div class='mobile-scroll-card-title'>" + esc(novel.title) + "</div>" +
      "<div class='mobile-scroll-card-price'>편당 " + priceHtml + "</div>" +
      "</a>";
  }

  function buildMobileListRow(novel) {
    var sale = salePercent(novel);
    var priceHtml = sale
      ? "<span style='text-decoration:line-through;'>" + formatWon(EPISODE_PRICE) + "</span> <span style='color:var(--accent-sale);font-weight:600;'>" + formatWon(discountedEpisodePrice(novel)) + "</span>"
      : formatWon(EPISODE_PRICE);
    return "<a class='mobile-list-row' href='" + mobileDetailHref(novel.slug) + "'>" +
      "<img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'>" +
      "<div class='mobile-list-row-copy'>" +
      "<div class='mobile-list-row-title'>" + esc(novel.title) + "</div>" +
      "<div class='mobile-list-row-meta'>" + esc(novel.authorName) + " · " + esc((novel.genres || [])[0] || "") + "</div>" +
      "<div class='mobile-list-row-meta'>편당 " + priceHtml + "</div>" +
      "</div>" +
      "</a>";
  }

  function renderMobileHome(data) {
    var novels = data.novels;
    var featured = novels[0];
    if (!featured) return;

    var heroNode = q("[data-mobile-hero]");
    var ctaNode = q("[data-mobile-hero-cta]");
    if (heroNode) {
      var sale = salePercent(featured);
      var tags = [];
      if (sale) tags.push("<span class='sale-badge'>-" + sale + "% 세일</span>");
      if (featured.isTranslation) tags.push("<span class='muted-badge'>한국 → 영어</span>");
      if ((featured.genres || [])[0]) tags.push("<span class='muted-badge'>" + esc(featured.genres[0]) + "</span>");
      var priceHtml = sale
        ? "편당 <span style='text-decoration:line-through;'>" + formatWon(EPISODE_PRICE) + "</span> <span style='color:var(--accent-sale);font-weight:700;'>" + formatWon(discountedEpisodePrice(featured)) + "</span>"
        : "편당 " + formatWon(EPISODE_PRICE);
      heroNode.innerHTML =
        "<a class='mobile-hero-cover' href='" + mobileDetailHref(featured.slug) + "'><img src='" + esc(cover(featured)) + "' alt='" + esc(featured.title) + "'></a>" +
        "<div class='mobile-hero-info'>" +
        "<div>" + tags.join(" ") + "</div>" +
        "<h2 class='mobile-hero-title'>" + esc(featured.title) + "</h2>" +
        "<p class='mobile-hero-meta'>" + esc(featured.authorName) + " · 총 " + featured.totalEpisodeCount + "화 · 평점 " + featured.reactionScore.toFixed(1) + "</p>" +
        "<p class='mobile-hero-price'>" + priceHtml + " · 무료 " + featured.freeEpisodeCount + "화</p>" +
        "</div>";
    }
    if (ctaNode) {
      ctaNode.innerHTML =
        "<a class='button primary' style='flex:1;text-align:center;' href='" + mobileViewerHref(featured.slug, 1) + "'>무료로 읽기</a>" +
        "<button class='button secondary' data-bookmark='" + esc(featured.slug) + "'>♥ 찜</button>";
    }

    var saleBanner = q("[data-mobile-sale-banner]");
    var saleNovels = novels.filter(function (n) { return salePercent(n) > 0; });
    if (saleBanner && saleNovels.length) {
      var topSale = saleNovels[0];
      saleBanner.style.display = "";
      saleBanner.innerHTML =
        "<span class='sale-badge'>진행 중인 세일</span>" +
        "<div class='mobile-sale-banner-copy'>" +
        "<div class='mobile-sale-banner-title'>" + esc((topSale.genres || [])[0] || "할인") + " 집중전</div>" +
        "<div class='mobile-sale-banner-sub'>참여 작품 " + saleNovels.length + "개 · 최대 " + Math.max.apply(null, saleNovels.map(salePercent)) + "% 할인</div>" +
        "</div>" +
        "<a class='button small primary' href='search.html'>보기</a>";
    }

    var saleSection = q("[data-mobile-section-sale]");
    var saleList = q("[data-mobile-sale-list]");
    if (saleList && saleNovels.length) {
      saleSection.style.display = "";
      saleList.innerHTML = saleNovels.map(buildMobileScrollCard).join("");
    }

    var popularList = q("[data-mobile-popular-list]");
    if (popularList) {
      var sorted = novels.slice().sort(function (a, b) { return b.viewCount - a.viewCount; });
      popularList.innerHTML = sorted.slice(0, 10).map(buildMobileScrollCard).join("");
    }

    var recentList = q("[data-mobile-recent-list]");
    if (recentList) {
      var byDate = novels.slice().sort(function (a, b) { return (b.updatedAt || "").localeCompare(a.updatedAt || ""); });
      recentList.innerHTML = byDate.slice(0, 8).map(buildMobileListRow).join("");
    }

    refreshBookmarkButtons();
  }

  function renderMobileSearch(data) {
    var novels = data.novels;
    var resultsNode = q("[data-mobile-search-results]");
    var countNode = q("[data-mobile-result-count]");
    var searchInput = q(".mobile-search-input input");
    var genreChips = qa("[data-genre]");
    var filterBtns = qa("[data-filter]");

    var filters = { q: query.get("q") || "", genre: "", origin: "", status: "" };

    if (searchInput && filters.q) searchInput.value = filters.q;

    function applyFilters() {
      var filtered = novels.filter(function (n) {
        if (filters.q) {
          var term = filters.q.toLowerCase();
          if (n.title.toLowerCase().indexOf(term) === -1 && n.authorName.toLowerCase().indexOf(term) === -1 && (n.genres || []).join(",").toLowerCase().indexOf(term) === -1) return false;
        }
        if (filters.genre && (n.genres || []).indexOf(filters.genre) === -1) return false;
        if (filters.origin && ((filters.origin === "한국" && n.isTranslation) || (filters.origin !== "한국" && !n.isTranslation))) return false;
        if (filters.status && n.status !== filters.status) return false;
        return true;
      });
      if (countNode) countNode.textContent = filtered.length + "개 작품";
      if (resultsNode) resultsNode.innerHTML = filtered.length ? filtered.map(buildMobileListRow).join("") : "<div class='library-empty'><h3>검색 결과가 없습니다</h3><p>다른 검색어나 필터를 시도해보세요.</p></div>";
    }

    genreChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        genreChips.forEach(function (c) { c.dataset.state = ""; });
        chip.dataset.state = "include";
        filters.genre = chip.dataset.genre;
        applyFilters();
      });
    });

    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var type = btn.dataset.filter;
        var options = type === "origin" ? ["", "한국", "영미"] : type === "status" ? ["", "ongoing", "completed"] : ["viewCount", "reactionScore", "updatedAt"];
        var labels = type === "origin" ? ["출처 ▾", "한국", "영미"] : type === "status" ? ["상태 ▾", "연재중", "완결"] : ["정렬 ▾", "평점순", "최신순"];
        var current = type === "origin" ? filters.origin : type === "status" ? filters.status : "";
        var idx = options.indexOf(current);
        var next = (idx + 1) % options.length;
        if (type === "origin") filters.origin = options[next];
        else if (type === "status") filters.status = options[next];
        btn.textContent = labels[next];
        applyFilters();
      });
    });

    applyFilters();
    refreshBookmarkButtons();
  }

  function renderMobileDetail(data, novel, list) {
    var titleNode = q("[data-detail-header-title]");
    var coverNode = q("[data-detail-cover]");
    var infoNode = q("[data-detail-info]");
    var statsNode = q("[data-detail-stats]");
    var synopsisNode = q("[data-detail-synopsis]");
    var moreBtn = q("[data-detail-more]");
    var ctaNode = q("[data-detail-cta]");
    var episodesNode = q("[data-detail-episodes]");

    if (titleNode) titleNode.textContent = novel.title;

    if (coverNode) {
      coverNode.innerHTML = "<img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'>";
    }

    if (infoNode) {
      var tags = (novel.genres || []).map(function (g) { return "<span class='muted-badge'>" + esc(g) + "</span>"; }).join(" ");
      var sale = salePercent(novel);
      if (sale) tags = "<span class='sale-badge'>-" + sale + "% 세일</span> " + tags;
      if (novel.isTranslation) tags += " <span class='muted-badge'>번역</span>";
      infoNode.innerHTML =
        "<h1 class='mobile-detail-title'>" + esc(novel.title) + "</h1>" +
        "<p class='mobile-detail-author'>" + esc(novel.authorName) + "</p>" +
        "<div class='mobile-detail-tags'>" + tags + "</div>";
    }

    if (statsNode) {
      statsNode.innerHTML =
        "<div><div class='mobile-detail-stat-value'>★ " + novel.reactionScore.toFixed(1) + "</div><div class='mobile-detail-stat-label'>평점</div></div>" +
        "<div><div class='mobile-detail-stat-value'>" + formatCount(novel.viewCount) + "</div><div class='mobile-detail-stat-label'>조회수</div></div>" +
        "<div><div class='mobile-detail-stat-value'>" + formatCount(novel.totalEpisodeCount) + "</div><div class='mobile-detail-stat-label'>총 회차</div></div>";
    }

    if (synopsisNode) {
      synopsisNode.textContent = novel.description || novel.shortDescription || "소개글이 없습니다.";
    }

    if (moreBtn) {
      moreBtn.addEventListener("click", function () {
        if (synopsisNode) synopsisNode.classList.toggle("clamped");
        moreBtn.textContent = synopsisNode.classList.contains("clamped") ? "더보기" : "접기";
      });
    }

    if (ctaNode) {
      var freeEp = list.find(function (ep) { return ep.episodeNumber === 1; }) || list[0];
      ctaNode.innerHTML =
        "<a class='button primary' style='flex:1;text-align:center;' href='" + mobileViewerHref(novel.slug, freeEp ? freeEp.episodeNumber : 1) + "'>무료로 읽기</a>" +
        "<button class='button secondary' data-bookmark='" + esc(novel.slug) + "'>♥ 찜</button>";
    }

    if (episodesNode) {
      episodesNode.innerHTML = list.map(function (ep) {
        var isFree = ep.episodeNumber <= novel.freeEpisodeCount;
        var badge = isFree ? "<span class='free-badge'>무료</span>" : "<span class='mobile-episode-badge'>" + formatWon(discountedEpisodePrice(novel)) + "</span>";
        return "<a class='mobile-episode-row' href='" + mobileViewerHref(novel.slug, ep.episodeNumber) + "'>" +
          "<span class='mobile-episode-num'>" + ep.episodeNumber + "</span>" +
          "<span class='mobile-episode-title'>" + esc(ep.title) + "</span>" +
          badge +
          "</a>";
      }).join("");
    }

    var backBtn = q("[data-back-btn]");
    if (backBtn) {
      backBtn.addEventListener("click", function (e) {
        if (window.history.length > 1) { e.preventDefault(); window.history.back(); }
      });
    }

    refreshBookmarkButtons();
  }

  function renderMobileViewer(novel, list, selected, body) {
    var titleNode = q("[data-reader-title]");
    var bodyNode = q("[data-reader-body]");
    var epNumNode = q("[data-reader-episode-num]");
    var prevBtn = q("[data-reader-prev]");
    var nextBtn = q("[data-reader-next]");
    var progressBar = q("[data-reader-progress]");
    var topChrome = q("[data-reader-top]");
    var bottomChrome = q("[data-reader-bottom]");

    if (titleNode) titleNode.textContent = esc(novel.title) + " · " + (selected ? selected.episodeNumber : 1) + "화";
    if (bodyNode) bodyNode.innerHTML = body || "<p style='text-align:center;color:var(--text-muted);padding:48px 0;'>본문을 불러올 수 없습니다.</p>";
    if (epNumNode) epNumNode.textContent = (selected ? selected.episodeNumber : 1) + " / " + list.length + "화";

    var currentIdx = selected ? list.findIndex(function (ep) { return ep.id === selected.id; }) : 0;

    if (prevBtn) {
      if (currentIdx > 0) {
        prevBtn.href = mobileViewerHref(novel.slug, list[currentIdx - 1].episodeNumber);
        prevBtn.style.visibility = "";
      } else {
        prevBtn.style.visibility = "hidden";
      }
    }

    if (nextBtn) {
      if (currentIdx < list.length - 1) {
        nextBtn.href = mobileViewerHref(novel.slug, list[currentIdx + 1].episodeNumber);
        nextBtn.style.visibility = "";
      } else {
        nextBtn.style.visibility = "hidden";
      }
    }

    var chromeVisible = true;
    if (bodyNode) {
      bodyNode.addEventListener("click", function () {
        chromeVisible = !chromeVisible;
        if (topChrome) topChrome.classList.toggle("hidden", !chromeVisible);
        if (bottomChrome) bottomChrome.classList.toggle("hidden", !chromeVisible);
      });
    }

    window.addEventListener("scroll", function () {
      if (!progressBar) return;
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      progressBar.style.width = pct + "%";
    });

    var backBtn = q("[data-back-btn]");
    if (backBtn) {
      backBtn.addEventListener("click", function (e) {
        if (window.history.length > 1) { e.preventDefault(); window.history.back(); }
      });
    }

    var listBtn = q("[data-reader-list-btn]");
    if (listBtn) {
      listBtn.href = mobileDetailHref(novel.slug);
    }
  }

  function renderMobileLibrary(data) {
    var statsNode = q("[data-library-stats]");
    var readingList = q("[data-library-reading]");
    var wishlistList = q("[data-library-wishlist]");
    var purchasedList = q("[data-library-purchased]");

    var bookmarks = [];
    try { bookmarks = JSON.parse(localStorage.getItem(store.bookmarks) || "[]"); } catch (_e) { bookmarks = []; }
    var bookmarkedNovels = data.novels.filter(function (n) { return bookmarks.indexOf(n.slug) !== -1; });

    var token = accessToken();
    var isLoggedIn = Boolean(token && token !== cfg.anonKey && token !== (cfg.publishableKey || ""));

    if (statsNode) {
      statsNode.textContent = "찜 " + formatCount(bookmarkedNovels.length) + "개";
    }

    var loginPrompt = "<div class='library-empty'><h3>로그인이 필요합니다</h3><p>로그인 후 확인할 수 있습니다.</p><a class='button primary' href='auth_pc.html'>로그인</a></div>";

    if (readingList) {
      readingList.innerHTML = isLoggedIn
        ? "<div class='library-empty'><h3>아직 읽은 작품이 없습니다</h3><p>스토어에서 작품을 골라 읽어보세요.</p><a class='button primary' href='search.html'>작품 탐색하기</a></div>"
        : loginPrompt;
    }

    if (wishlistList) {
      if (bookmarkedNovels.length) {
        wishlistList.innerHTML = bookmarkedNovels.map(function (novel) {
          var sale = salePercent(novel);
          var badge = sale ? "<span class='sale-badge'>-" + sale + "%</span>" : "";
          return "<a class='mobile-list-row' href='" + mobileDetailHref(novel.slug) + "'>" +
            "<img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'>" +
            "<div class='mobile-list-row-copy'>" +
            "<div class='mobile-list-row-title'>" + esc(novel.title) + " " + badge + "</div>" +
            "<div class='mobile-list-row-meta'>" + esc(novel.authorName) + "</div>" +
            "</div>" +
            "</a>";
        }).join("");
      } else {
        wishlistList.innerHTML = "<div class='library-empty'><h3>찜한 작품이 없습니다</h3><p>작품 상세에서 ♥ 버튼을 눌러 찜해보세요.</p><a class='button primary' href='search.html'>탐색하기</a></div>";
      }
    }

    if (purchasedList) {
      purchasedList.innerHTML = isLoggedIn
        ? "<div class='library-empty'><h3>구매한 작품이 없습니다</h3><p>유료 회차를 구매하면 여기에 표시됩니다.</p><a class='button primary' href='search.html'>탐색하기</a></div>"
        : loginPrompt;
    }

    var tabBtns = qa("[data-tab-target]");
    var tabPanels = qa("[data-tab-panel]");
    tabBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        tabBtns.forEach(function (b) { b.dataset.state = ""; });
        btn.dataset.state = "include";
        tabPanels.forEach(function (p) { p.style.display = "none"; });
        var target = q("[data-tab-panel='" + btn.dataset.tabTarget + "']");
        if (target) target.style.display = "";
      });
    });

    refreshBookmarkButtons();
  }
```

- [ ] **Step 3: `hydrate()` 함수에 모바일 5개 페이지 라우팅 추가**

`hydrate()` 함수 내부의 `if (page === "author_dashboard_pc.html")` 블록 뒤, `const slug = query.get("slug")` 앞에 모바일 라우팅을 추가한다.

기존:
```javascript
    if (page === "author_dashboard_pc.html") {
      renderAuthorDashboard(data);
      return;
    }

    const slug = query.get("slug") || "abyss-librarian-forbidden-archive";
```

변경:
```javascript
    if (page === "author_dashboard_pc.html") {
      renderAuthorDashboard(data);
      return;
    }

    if (page === "homepage.html") {
      renderMobileHome(data);
      return;
    }

    if (page === "search.html") {
      renderMobileSearch(data);
      return;
    }

    if (page === "my_library.html") {
      renderMobileLibrary(data);
      return;
    }

    const slug = query.get("slug") || "abyss-librarian-forbidden-archive";
```

그리고 기존 PC detail/viewer 라우팅 뒤에 모바일 detail/viewer를 추가한다.

기존 (`renderViewer` 뒤, `hydrate` 닫힘 전):
```javascript
    if (page === "novel_viewer_pc.html") {
      const episodeNumber = Number(query.get("episode") || 1);
      const selected = list.find(function (episode) { return episode.episodeNumber === episodeNumber; }) || list[0];
      const body = selected ? await episodeBody(selected.id).catch(function () { return ""; }) : "";
      renderViewer(novel, list, selected, body);
    }
```

변경:
```javascript
    if (page === "novel_viewer_pc.html") {
      const episodeNumber = Number(query.get("episode") || 1);
      const selected = list.find(function (episode) { return episode.episodeNumber === episodeNumber; }) || list[0];
      const body = selected ? await episodeBody(selected.id).catch(function () { return ""; }) : "";
      renderViewer(novel, list, selected, body);
      return;
    }

    if (page === "novel_detail.html") {
      renderMobileDetail(data, novel, list);
      return;
    }

    if (page === "novel_viewer.html") {
      const episodeNumber = Number(query.get("episode") || 1);
      const selected = list.find(function (episode) { return episode.episodeNumber === episodeNumber; }) || list[0];
      const body = selected ? await episodeBody(selected.id).catch(function () { return ""; }) : "";
      renderMobileViewer(novel, list, selected, body);
    }
```

---

## Task 8: 최종 검증

- [ ] **Step 1: 5개 모바일 페이지 렌더링 확인**

브라우저에서 각 페이지를 열어 확인:
- `homepage.html` — 히어로, 가로 스크롤, 리스트, 하단 탭 바 확인
- `search.html` — 검색 인풋, 칩 필터, 결과 리스트 확인
- `novel_detail.html` — 커버, 정보, 에피소드 리스트, CTA 확인
- `novel_viewer.html` — 본문 텍스트, 크롬 토글, 진행률 바 확인
- `my_library.html` — 탭 전환, 찜 목록 확인

- [ ] **Step 2: PC 페이지 무결성 확인**

`homepage_pc.html`, `search_pc.html` 등 PC 페이지가 기존 디자인 유지하는지 확인.

- [ ] **Step 3: 금지 색상 확인**

새로 추가한 CSS에 보라/네온 색상 없는지 확인.
