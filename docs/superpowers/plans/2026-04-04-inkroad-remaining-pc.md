# 잉크로드 PC 나머지 4개 페이지 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 내 서재, 로그인, 작품 관리, 통계 대시보드 4개 PC 페이지를 Clean Light Store 디자인으로 교체하고 Supabase 연동까지 완성한다.

**Architecture:** 기존 `.store-light` CSS 토큰 위에 새 컴포넌트(사이드바, 진행률 바, KPI, 테이블, auth 스플릿)를 추가한다. 4개 HTML 페이지를 전면 교체하고, `store-redesign.js`에 4개 렌더러(`renderLibrary`, `renderAuth`, `renderCreatorDashboard`, `renderAuthorDashboard`)를 추가한다.

**Tech Stack:** HTML/CSS/Vanilla JS, Supabase REST API + Auth, Pretendard + Inter 폰트 (CDN)

**Design Spec:** `docs/superpowers/specs/2026-04-04-inkroad-remaining-pc-design.md`

---

## File Structure

### 수정 대상

| 파일 | 역할 | 변경 내용 |
|------|------|-----------|
| `assets/styles.css` | CSS 변수 + 공용 컴포넌트 | `.store-light` 블록 하단에 auth, progress-bar, library-row 스타일 추가 |
| `assets/pc.css` | PC 전용 레이아웃 | `.store-light` 블록 하단에 creator-layout, sidebar, kpi, stats-table, summary-grid 스타일 추가 |
| `my_library_pc.html` | 내 서재 | HTML 전체 교체 |
| `auth_pc.html` | 로그인/가입 | HTML 전체 교체 |
| `creator_dashboard_pc.html` | 작품 관리 | HTML 전체 교체 |
| `author_dashboard_pc.html` | 통계 대시보드 | HTML 전체 교체 |
| `assets/store-redesign.js` | Supabase 연동 + 동적 렌더링 | supported 배열 확장 + 4개 렌더러 함수 + hydrate 라우팅 추가 |

### 건드리지 않는 파일

- `homepage_pc.html`, `search_pc.html`, `novel_detail_pc.html`, `novel_viewer_pc.html` — 이미 완료
- `payment_pc.html`, `novel_upload_pc.html`, `episode_upload_pc.html` — 이미 완료
- `assets/app.js` — data-attribute 기반이므로 변경 불필요
- `assets/supabase-config.js`, `assets/supabase-live.js` — 변경 없음
- 모바일 페이지 — 비대상

---

## Task 1: CSS 추가 — 새 컴포넌트 스타일

**Files:**
- Modify: `assets/styles.css` (파일 하단에 추가)
- Modify: `assets/pc.css` (파일 하단에 추가)

- [ ] **Step 1: `styles.css` 하단에 새 컴포넌트 CSS 추가**

`assets/styles.css` 파일 **맨 하단**에 아래 블록을 추가한다. 기존 내용은 건드리지 않는다:

```css
/* ========================================
   Clean Light Store — Phase 2 components
   Auth, Library, Creator, Dashboard
   ======================================== */

/* --- Auth split --- */
.store-light .auth-split {
  display: grid;
  grid-template-columns: 1fr 480px;
  min-height: 100vh;
}

.store-light .auth-visual {
  background: #1a1a1a;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 48px;
  overflow: hidden;
}

.store-light .auth-visual-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0.15;
  pointer-events: none;
}

.store-light .auth-visual-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 14px;
  max-width: 420px;
}

.store-light .auth-visual-copy h2 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.3;
  letter-spacing: -0.03em;
}

.store-light .auth-visual-copy p {
  margin: 0;
  color: #888;
  font-size: 0.9rem;
  line-height: 1.7;
}

.store-light .auth-form-panel {
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.store-light .auth-form {
  width: 100%;
  max-width: 380px;
  display: grid;
  gap: 16px;
}

.store-light .auth-form-header {
  display: grid;
  gap: 8px;
  margin-bottom: 8px;
}

.store-light .auth-form-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.03em;
}

.store-light .auth-form-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.store-light .auth-form-sub a {
  color: var(--text);
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.store-light .auth-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--surface-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-family: var(--font);
  color: var(--text);
  outline: none;
  transition: border-color 150ms;
}

.store-light .auth-input:focus {
  border-color: var(--dark);
}

.store-light .auth-input::placeholder {
  color: var(--text-muted);
}

.store-light .auth-divider {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.78rem;
  position: relative;
  margin: 4px 0;
}

.store-light .auth-divider::before,
.store-light .auth-divider::after {
  content: "";
  position: absolute;
  top: 50%;
  width: calc(50% - 20px);
  height: 1px;
  background: var(--border);
}

.store-light .auth-divider::before { left: 0; }
.store-light .auth-divider::after { right: 0; }

.store-light .auth-error {
  padding: 10px 14px;
  background: #fef2f0;
  border-radius: var(--radius-sm);
  color: var(--accent-sale);
  font-size: 0.82rem;
  display: none;
}

.store-light .auth-error.visible {
  display: block;
}

.store-light .button.kakao {
  background: #FEE500;
  color: #191919;
  border-color: #FEE500;
}

.store-light .button.kakao:hover {
  background: #FADA0A;
}

.store-light .button.full {
  width: 100%;
}

/* --- Progress bar --- */
.store-light .progress-track {
  height: 4px;
  background: var(--surface-muted);
  border-radius: 2px;
  overflow: hidden;
}

.store-light .progress-fill {
  height: 100%;
  background: var(--dark);
  border-radius: 2px;
  transition: width 300ms;
}

/* --- Library row --- */
.store-light .library-row {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 16px;
  padding: 16px;
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  align-items: center;
  transition: transform 200ms;
}

.store-light .library-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.store-light .library-row-thumb img {
  width: 80px;
  aspect-ratio: 0.72;
  object-fit: cover;
  border-radius: var(--radius-sm);
  display: block;
}

.store-light .library-row-copy {
  display: grid;
  gap: 6px;
}

.store-light .library-row-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.store-light .library-row-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.store-light .library-row-side {
  display: grid;
  gap: 8px;
  justify-items: end;
  text-align: right;
}

/* --- Library empty state --- */
.store-light .library-empty {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted);
}

.store-light .library-empty h3 {
  margin: 0 0 8px;
  font-size: 1rem;
  color: var(--text-secondary);
}

.store-light .library-empty p {
  margin: 0 0 16px;
  font-size: 0.85rem;
}

/* --- Library tabs --- */
.store-light .library-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.store-light .library-list {
  display: grid;
  gap: 12px;
}
```

- [ ] **Step 2: `pc.css` 하단에 새 레이아웃 CSS 추가**

`assets/pc.css` 파일 **맨 하단**에 아래 블록을 추가한다:

```css
/* ========================================
   Clean Light Store — Phase 2 layouts
   Creator sidebar, KPI, stats table
   ======================================== */

/* --- Creator layout --- */
.store-light .creator-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
}

.store-light .creator-sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 24px 0;
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.store-light .creator-sidebar-brand {
  padding: 0 20px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
}

.store-light .creator-sidebar-nav {
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.store-light .creator-nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-muted);
  transition: color 150ms, background 150ms;
}

.store-light .creator-nav-link .material-symbols-outlined {
  font-size: 20px;
}

.store-light .creator-nav-link:hover {
  color: var(--text);
  background: var(--surface-muted);
}

.store-light .creator-nav-link.active {
  color: var(--text);
  background: var(--surface-muted);
  border-left: 3px solid var(--dark);
  font-weight: 600;
}

.store-light .creator-sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}

.store-light .creator-sidebar-footer a {
  font-size: 0.82rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.store-light .creator-main {
  padding: 32px;
  background: var(--bg);
}

.store-light .creator-main-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.store-light .creator-main-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

/* --- Summary cards (creator) --- */
.store-light .summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.store-light .summary-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-soft);
  display: grid;
  gap: 6px;
}

.store-light .summary-card-icon {
  color: var(--text-muted);
  font-size: 20px;
}

.store-light .summary-card-value {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--text);
}

.store-light .summary-card-label {
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* --- Creator work list --- */
.store-light .creator-work-list {
  display: grid;
  gap: 12px;
}

.store-light .creator-work-row {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 16px;
  padding: 16px;
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  align-items: center;
}

.store-light .creator-work-row-thumb img {
  width: 80px;
  aspect-ratio: 0.72;
  object-fit: cover;
  border-radius: var(--radius-sm);
  display: block;
}

.store-light .creator-work-row-copy {
  display: grid;
  gap: 4px;
}

.store-light .creator-work-row-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
}

.store-light .creator-work-row-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.store-light .creator-work-row-actions {
  display: flex;
  gap: 8px;
}

/* --- KPI grid (author dashboard) --- */
.store-light .kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.store-light .kpi-card {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-soft);
  display: grid;
  gap: 6px;
}

.store-light .kpi-card-icon {
  color: var(--text-muted);
  font-size: 20px;
}

.store-light .kpi-card-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text);
}

.store-light .kpi-card-label {
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* --- Stats table --- */
.store-light .stats-table-wrap {
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
  margin-bottom: 24px;
}

.store-light .stats-table {
  width: 100%;
  border-collapse: collapse;
}

.store-light .stats-table th {
  text-align: left;
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-weight: 600;
}

.store-light .stats-table th.num {
  text-align: right;
}

.store-light .stats-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--surface-muted);
  font-size: 0.85rem;
  color: var(--text);
}

.store-light .stats-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.store-light .stats-table tr:last-child td {
  border-bottom: none;
}

.store-light .stats-table tbody tr:hover {
  background: var(--surface-muted);
  cursor: pointer;
}

/* --- Recent activity --- */
.store-light .activity-list {
  display: grid;
  gap: 8px;
}

.store-light .activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-soft);
  font-size: 0.85rem;
}

.store-light .activity-item .material-symbols-outlined {
  font-size: 18px;
  color: var(--text-muted);
}

.store-light .activity-time {
  margin-left: auto;
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
}

/* --- Period filter --- */
.store-light .period-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

/* --- Creator empty state --- */
.store-light .creator-empty {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted);
}

.store-light .creator-empty h3 {
  margin: 0 0 8px;
  font-size: 1rem;
  color: var(--text-secondary);
}

.store-light .creator-empty p {
  margin: 0 0 16px;
  font-size: 0.85rem;
}
```

---

## Task 2: 내 서재 HTML 교체

**Files:**
- Modify: `my_library_pc.html` (전체 교체)

- [ ] **Step 1: `my_library_pc.html`을 새 구조로 교체**

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
      <a class="button ghost button-login" data-auth-link href="auth_pc.html">로그인</a>
    </div>
  </header>

  <main class="pc-page store-home">
    <div class="store-shell" style="padding-top:32px;">
      <div class="store-section-head" style="margin-bottom:24px;">
        <div>
          <h1 class="store-section-title">내 서재</h1>
        </div>
        <div class="library-stats" data-library-stats></div>
      </div>

      <div class="library-tabs">
        <button class="filter-chip" type="button" data-tab-target="reading" data-state="include">읽는 중</button>
        <button class="filter-chip" type="button" data-tab-target="wishlist">찜한 작품</button>
        <button class="filter-chip" type="button" data-tab-target="purchased">구매한 작품</button>
      </div>

      <div data-tab-panel="reading">
        <div class="library-list" data-library-reading></div>
      </div>
      <div data-tab-panel="wishlist" style="display:none;">
        <div class="library-list" data-library-wishlist></div>
      </div>
      <div data-tab-panel="purchased" style="display:none;">
        <div class="library-list" data-library-purchased></div>
      </div>

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

---

## Task 3: 로그인 페이지 HTML 교체

**Files:**
- Modify: `auth_pc.html` (전체 교체)

- [ ] **Step 1: `auth_pc.html`을 새 구조로 교체**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>INKROAD | 로그인</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/pretendard.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0" rel="stylesheet">
  <link rel="stylesheet" href="assets/styles.css">
  <link rel="stylesheet" href="assets/pc.css">
</head>
<body class="pc-desktop store-light">
  <div class="auth-split">
    <div class="auth-visual">
      <div class="auth-visual-bg" style="background-image:url('https://placehold.co/1200x800/1a1a1a/333?text=INKROAD');"></div>
      <div class="auth-visual-copy">
        <div class="brand" style="margin-bottom:8px;">
          <span class="brand-mark material-symbols-outlined" style="background:#fff;color:#1a1a1a;">auto_stories</span>
          <strong class="brand-name" style="color:#fff;">INKROAD</strong>
        </div>
        <h2>글을 넘어,<br>세계를 잇는 서재</h2>
        <p>전 세계 웹소설을 번역하고 스팀처럼 할인하는 글로벌 스토어. 당신의 다음 몰입은 여기서 시작됩니다.</p>
      </div>
    </div>

    <div class="auth-form-panel">
      <!-- Login form -->
      <div class="auth-form" data-auth-login>
        <div class="auth-form-header">
          <h1 class="auth-form-title">로그인</h1>
          <p class="auth-form-sub">계정이 없으신가요? <a data-auth-toggle="signup">회원가입</a></p>
        </div>
        <div class="auth-error" data-auth-error></div>
        <input class="auth-input" type="email" name="email" placeholder="이메일" data-auth-email required>
        <input class="auth-input" type="password" name="password" placeholder="비밀번호" data-auth-password required>
        <button class="button primary full" type="button" data-auth-submit>로그인</button>
        <div class="auth-divider">또는</div>
        <button class="button secondary full" type="button" data-auth-google>Google로 계속</button>
        <button class="button kakao full" type="button" data-auth-kakao>카카오로 계속</button>
      </div>

      <!-- Signup form (hidden by default) -->
      <div class="auth-form" data-auth-signup style="display:none;">
        <div class="auth-form-header">
          <h1 class="auth-form-title">회원가입</h1>
          <p class="auth-form-sub">이미 계정이 있으신가요? <a data-auth-toggle="login">로그인</a></p>
        </div>
        <div class="auth-error" data-auth-error-signup></div>
        <input class="auth-input" type="email" name="email" placeholder="이메일" data-signup-email required>
        <input class="auth-input" type="password" name="password" placeholder="비밀번호" data-signup-password required>
        <input class="auth-input" type="password" name="password_confirm" placeholder="비밀번호 확인" data-signup-password-confirm required>
        <input class="auth-input" type="text" name="pen_name" placeholder="닉네임 (필명)" data-signup-pen-name required>
        <button class="button primary full" type="button" data-signup-submit>가입하기</button>
        <div class="auth-divider">또는</div>
        <button class="button secondary full" type="button" data-auth-google>Google로 계속</button>
        <button class="button kakao full" type="button" data-auth-kakao>카카오로 계속</button>
      </div>
    </div>
  </div>

  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="assets/supabase-live.js"></script>
  <script src="assets/store-redesign.js"></script>
</body>
</html>
```

---

## Task 4: 작품 관리 HTML 교체

**Files:**
- Modify: `creator_dashboard_pc.html` (전체 교체)

- [ ] **Step 1: `creator_dashboard_pc.html`을 새 구조로 교체**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>INKROAD | 작품 관리</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/pretendard.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0" rel="stylesheet">
  <link rel="stylesheet" href="assets/styles.css">
  <link rel="stylesheet" href="assets/pc.css">
</head>
<body class="pc-desktop store-light">
  <div class="creator-layout">
    <aside class="creator-sidebar">
      <div class="creator-sidebar-brand">
        <span class="brand-mark material-symbols-outlined">auto_stories</span>
        <span class="brand-copy">
          <strong class="brand-name">INKROAD</strong>
          <span class="brand-sub">크리에이터</span>
        </span>
      </div>
      <nav class="creator-sidebar-nav">
        <a class="creator-nav-link active" href="creator_dashboard_pc.html">
          <span class="material-symbols-outlined">auto_stories</span> 작품 관리
        </a>
        <a class="creator-nav-link" href="author_dashboard_pc.html">
          <span class="material-symbols-outlined">bar_chart</span> 통계
        </a>
        <a class="creator-nav-link" href="novel_upload_pc.html">
          <span class="material-symbols-outlined">add_circle</span> 작품 등록
        </a>
        <a class="creator-nav-link" href="episode_upload_pc.html">
          <span class="material-symbols-outlined">upload</span> 회차 업로드
        </a>
      </nav>
      <div class="creator-sidebar-footer">
        <a href="homepage_pc.html">← 스토어로 돌아가기</a>
      </div>
    </aside>

    <main class="creator-main">
      <div class="creator-main-head">
        <h1 class="creator-main-title">내 작품</h1>
        <a class="button primary" href="novel_upload_pc.html">
          <span class="material-symbols-outlined">add</span> 새 작품 등록
        </a>
      </div>

      <div class="summary-grid" data-creator-stats></div>

      <div class="creator-work-list" data-creator-list></div>

      <div class="creator-empty" data-creator-empty style="display:none;">
        <span class="material-symbols-outlined" style="font-size:48px;color:var(--border);">auto_stories</span>
        <h3>아직 등록된 작품이 없습니다</h3>
        <p>첫 작품을 등록하고 독자들을 만나보세요.</p>
        <a class="button primary" href="novel_upload_pc.html">첫 작품 등록하기</a>
      </div>
    </main>
  </div>

  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="assets/supabase-live.js"></script>
  <script src="assets/store-redesign.js"></script>
</body>
</html>
```

---

## Task 5: 통계 대시보드 HTML 교체

**Files:**
- Modify: `author_dashboard_pc.html` (전체 교체)

- [ ] **Step 1: `author_dashboard_pc.html`을 새 구조로 교체**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>INKROAD | 통계</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/pretendard.css">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0" rel="stylesheet">
  <link rel="stylesheet" href="assets/styles.css">
  <link rel="stylesheet" href="assets/pc.css">
</head>
<body class="pc-desktop store-light">
  <div class="creator-layout">
    <aside class="creator-sidebar">
      <div class="creator-sidebar-brand">
        <span class="brand-mark material-symbols-outlined">auto_stories</span>
        <span class="brand-copy">
          <strong class="brand-name">INKROAD</strong>
          <span class="brand-sub">크리에이터</span>
        </span>
      </div>
      <nav class="creator-sidebar-nav">
        <a class="creator-nav-link" href="creator_dashboard_pc.html">
          <span class="material-symbols-outlined">auto_stories</span> 작품 관리
        </a>
        <a class="creator-nav-link active" href="author_dashboard_pc.html">
          <span class="material-symbols-outlined">bar_chart</span> 통계
        </a>
        <a class="creator-nav-link" href="novel_upload_pc.html">
          <span class="material-symbols-outlined">add_circle</span> 작품 등록
        </a>
        <a class="creator-nav-link" href="episode_upload_pc.html">
          <span class="material-symbols-outlined">upload</span> 회차 업로드
        </a>
      </nav>
      <div class="creator-sidebar-footer">
        <a href="homepage_pc.html">← 스토어로 돌아가기</a>
      </div>
    </aside>

    <main class="creator-main">
      <div class="creator-main-head">
        <h1 class="creator-main-title">통계</h1>
      </div>

      <div class="kpi-grid" data-kpi-cards></div>

      <div class="period-filter" data-period-filter>
        <button class="filter-chip" type="button" data-period="7d">7일</button>
        <button class="filter-chip" type="button" data-period="30d">30일</button>
        <button class="filter-chip" type="button" data-period="all" data-state="include">전체</button>
      </div>

      <section style="margin-bottom:32px;">
        <h2 class="store-section-title" style="margin-bottom:16px;">작품별 성과</h2>
        <div class="stats-table-wrap">
          <table class="stats-table">
            <thead>
              <tr>
                <th>작품명</th>
                <th class="num">조회수</th>
                <th class="num">찜</th>
                <th class="num">댓글</th>
                <th class="num">평점</th>
                <th>최근 업데이트</th>
              </tr>
            </thead>
            <tbody data-stats-table></tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 class="store-section-title" style="margin-bottom:16px;">최근 활동</h2>
        <div class="activity-list" data-recent-activity></div>
      </section>
    </main>
  </div>

  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="assets/supabase-live.js"></script>
  <script src="assets/store-redesign.js"></script>
</body>
</html>
```

---

## Task 6: store-redesign.js — 4개 렌더러 추가

**Files:**
- Modify: `assets/store-redesign.js`

이 태스크는 3개 step으로 나뉜다: (1) supported 배열 확장, (2) 4개 렌더러 함수 추가, (3) hydrate 라우팅 추가.

- [ ] **Step 1: `supported` 배열 확장**

파일 3행의 `supported` 배열에 4개 페이지를 추가한다:

기존:
```javascript
const supported = ["homepage_pc.html", "search_pc.html", "novel_detail_pc.html", "novel_viewer_pc.html"];
```

변경:
```javascript
const supported = ["homepage_pc.html", "search_pc.html", "novel_detail_pc.html", "novel_viewer_pc.html", "my_library_pc.html", "auth_pc.html", "creator_dashboard_pc.html", "author_dashboard_pc.html"];
```

- [ ] **Step 2: `renderViewer` 함수 닫힘(`}`) 뒤, `hydrate` 함수 앞에 4개 렌더러 추가**

`refreshBookmarkButtons();\n  }` (renderViewer 끝) 바로 뒤, `async function hydrate()` 바로 앞에 아래 코드를 삽입한다:

```javascript

  function renderLibrary(data) {
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
      statsNode.innerHTML =
        "<span class='muted-badge'>찜 " + formatCount(bookmarkedNovels.length) + "개</span>" +
        (isLoggedIn ? "<span class='muted-badge'>읽는 중 —</span><span class='muted-badge'>구매 —</span>" : "");
    }

    var loginPrompt = "<div class='library-empty'><h3>로그인이 필요합니다</h3><p>읽기 진행 상황과 구매 내역은 로그인 후 확인할 수 있습니다.</p><a class='button primary' href='auth_pc.html'>로그인</a></div>";

    if (readingList) {
      readingList.innerHTML = isLoggedIn
        ? "<div class='library-empty'><h3>아직 읽은 작품이 없습니다</h3><p>스토어에서 작품을 골라 읽기를 시작해보세요.</p><a class='button primary' href='search_pc.html'>작품 탐색하기</a></div>"
        : loginPrompt;
    }

    if (wishlistList) {
      if (bookmarkedNovels.length) {
        wishlistList.innerHTML = bookmarkedNovels.map(function (novel) {
          var sale = salePercent(novel);
          var badge = sale ? "<span class='sale-badge'>-" + sale + "% 할인</span>" : "<span class='muted-badge'>이벤트 대기</span>";
          return "<article class='library-row'>" +
            "<a class='library-row-thumb' href='" + detailHref(novel.slug) + "'><img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'></a>" +
            "<div class='library-row-copy'>" +
            "<h3 class='library-row-title'>" + esc(novel.title) + "</h3>" +
            "<p class='library-row-meta'>" + esc(novel.authorName) + " · " + badge + "</p>" +
            "</div>" +
            "<div class='library-row-side'>" +
            "<a class='button small primary' href='" + detailHref(novel.slug) + "'>상세 보기</a>" +
            "</div>" +
            "</article>";
        }).join("");
      } else {
        wishlistList.innerHTML = "<div class='library-empty'><h3>찜한 작품이 없습니다</h3><p>작품 상세에서 ♥ 버튼을 눌러 찜해보세요.</p><a class='button primary' href='search_pc.html'>작품 탐색하기</a></div>";
      }
    }

    if (purchasedList) {
      purchasedList.innerHTML = isLoggedIn
        ? "<div class='library-empty'><h3>구매한 작품이 없습니다</h3><p>유료 회차를 구매하면 여기에 표시됩니다.</p><a class='button primary' href='search_pc.html'>작품 탐색하기</a></div>"
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

  function renderAuth() {
    var loginForm = q("[data-auth-login]");
    var signupForm = q("[data-auth-signup]");
    var errorLogin = q("[data-auth-error]");
    var errorSignup = q("[data-auth-error-signup]");

    function showError(node, msg) {
      if (!node) return;
      node.textContent = msg;
      node.classList.add("visible");
    }
    function hideError(node) {
      if (!node) return;
      node.classList.remove("visible");
    }

    qa("[data-auth-toggle]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        var mode = link.dataset.authToggle;
        if (mode === "signup") {
          if (loginForm) loginForm.style.display = "none";
          if (signupForm) signupForm.style.display = "";
        } else {
          if (signupForm) signupForm.style.display = "none";
          if (loginForm) loginForm.style.display = "";
        }
        hideError(errorLogin);
        hideError(errorSignup);
      });
    });

    var supabaseClient = null;
    if (window.supabase && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(
        (cfg.url || "").replace(/\/$/, ""),
        cfg.anonKey || cfg.publishableKey || ""
      );
    }

    var submitLogin = q("[data-auth-submit]");
    if (submitLogin) {
      submitLogin.addEventListener("click", async function () {
        hideError(errorLogin);
        var email = (q("[data-auth-email]") || {}).value || "";
        var password = (q("[data-auth-password]") || {}).value || "";
        if (!email || !password) { showError(errorLogin, "이메일과 비밀번호를 입력해주세요."); return; }
        if (!supabaseClient) { showError(errorLogin, "서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요."); return; }
        try {
          var result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
          if (result.error) { showError(errorLogin, result.error.message); return; }
          if (result.data && result.data.session) {
            localStorage.setItem(store.accessToken, result.data.session.access_token);
          }
          window.location.href = "homepage_pc.html";
        } catch (err) {
          showError(errorLogin, "로그인 중 오류가 발생했습니다.");
        }
      });
    }

    var submitSignup = q("[data-signup-submit]");
    if (submitSignup) {
      submitSignup.addEventListener("click", async function () {
        hideError(errorSignup);
        var email = (q("[data-signup-email]") || {}).value || "";
        var password = (q("[data-signup-password]") || {}).value || "";
        var confirm = (q("[data-signup-password-confirm]") || {}).value || "";
        var penName = (q("[data-signup-pen-name]") || {}).value || "";
        if (!email || !password || !penName) { showError(errorSignup, "모든 필드를 입력해주세요."); return; }
        if (password !== confirm) { showError(errorSignup, "비밀번호가 일치하지 않습니다."); return; }
        if (password.length < 6) { showError(errorSignup, "비밀번호는 6자 이상이어야 합니다."); return; }
        if (!supabaseClient) { showError(errorSignup, "서비스 연결에 실패했습니다."); return; }
        try {
          var result = await supabaseClient.auth.signUp({ email: email, password: password, options: { data: { pen_name: penName } } });
          if (result.error) { showError(errorSignup, result.error.message); return; }
          if (result.data && result.data.session) {
            localStorage.setItem(store.accessToken, result.data.session.access_token);
            window.location.href = "homepage_pc.html";
          } else {
            showError(errorSignup, "가입 확인 이메일을 보냈습니다. 이메일을 확인해주세요.");
            errorSignup.style.color = "var(--accent-free)";
            errorSignup.style.background = "#f0faf4";
          }
        } catch (err) {
          showError(errorSignup, "가입 중 오류가 발생했습니다.");
        }
      });
    }

    qa("[data-auth-google]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!supabaseClient) return;
        await supabaseClient.auth.signInWithOAuth({ provider: "google" });
      });
    });

    qa("[data-auth-kakao]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!supabaseClient) return;
        await supabaseClient.auth.signInWithOAuth({ provider: "kakao" });
      });
    });
  }

  function renderCreatorDashboard(data) {
    var statsNode = q("[data-creator-stats]");
    var listNode = q("[data-creator-list]");
    var emptyNode = q("[data-creator-empty]");

    var token = accessToken();
    var isLoggedIn = Boolean(token && token !== cfg.anonKey && token !== (cfg.publishableKey || ""));

    if (!isLoggedIn) {
      if (q(".creator-main")) {
        q(".creator-main").innerHTML = "<div class='creator-empty'><h3>로그인이 필요합니다</h3><p>작품 관리는 로그인 후 이용할 수 있습니다.</p><a class='button primary' href='auth_pc.html'>로그인</a></div>";
      }
      return;
    }

    var novels = data.novels;
    var totalEpisodes = novels.reduce(function (sum, n) { return sum + n.totalEpisodeCount; }, 0);
    var totalViews = novels.reduce(function (sum, n) { return sum + n.viewCount; }, 0);

    if (statsNode) {
      statsNode.innerHTML =
        "<div class='summary-card'><span class='material-symbols-outlined summary-card-icon'>auto_stories</span><div class='summary-card-value'>" + formatCount(novels.length) + "</div><div class='summary-card-label'>등록 작품</div></div>" +
        "<div class='summary-card'><span class='material-symbols-outlined summary-card-icon'>list</span><div class='summary-card-value'>" + formatCount(totalEpisodes) + "</div><div class='summary-card-label'>총 회차</div></div>" +
        "<div class='summary-card'><span class='material-symbols-outlined summary-card-icon'>visibility</span><div class='summary-card-value'>" + formatCount(totalViews) + "</div><div class='summary-card-label'>총 조회수</div></div>";
    }

    if (!novels.length) {
      if (listNode) listNode.style.display = "none";
      if (emptyNode) emptyNode.style.display = "";
      return;
    }

    if (emptyNode) emptyNode.style.display = "none";
    if (listNode) {
      listNode.innerHTML = novels.map(function (novel) {
        var statusBadge = novel.status === "completed"
          ? "<span class='free-badge'>완결</span>"
          : novel.status === "draft"
            ? "<span class='muted-badge' style='opacity:0.6;'>비공개</span>"
            : "<span class='muted-badge'>연재중</span>";
        return "<article class='creator-work-row'>" +
          "<div class='creator-work-row-thumb'><img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'></div>" +
          "<div class='creator-work-row-copy'>" +
          "<h3 class='creator-work-row-title'>" + esc(novel.title) + " " + statusBadge + "</h3>" +
          "<p class='creator-work-row-meta'>" + formatCount(novel.totalEpisodeCount) + "화 · 조회 " + formatCount(novel.viewCount) + " · " + esc(novel.updatedAt ? novel.updatedAt.slice(0, 10) : "—") + "</p>" +
          "</div>" +
          "<div class='creator-work-row-actions'>" +
          "<a class='button small ghost' href='episode_upload_pc.html?novel_id=" + novel.id + "'>회차 추가</a>" +
          "<a class='button small secondary' href='novel_upload_pc.html?edit=" + novel.id + "'>수정</a>" +
          "</div>" +
          "</article>";
      }).join("");
    }
  }

  function renderAuthorDashboard(data) {
    var kpiNode = q("[data-kpi-cards]");
    var tableBody = q("[data-stats-table]");
    var activityNode = q("[data-recent-activity]");

    var token = accessToken();
    var isLoggedIn = Boolean(token && token !== cfg.anonKey && token !== (cfg.publishableKey || ""));

    if (!isLoggedIn) {
      if (q(".creator-main")) {
        q(".creator-main").innerHTML = "<div class='creator-empty'><h3>로그인이 필요합니다</h3><p>통계는 로그인 후 확인할 수 있습니다.</p><a class='button primary' href='auth_pc.html'>로그인</a></div>";
      }
      return;
    }

    var novels = data.novels;
    var totalViews = novels.reduce(function (sum, n) { return sum + n.viewCount; }, 0);
    var totalComments = novels.reduce(function (sum, n) { return sum + n.commentCount; }, 0);
    var totalPaidEpisodes = novels.reduce(function (sum, n) { return sum + Math.max(0, n.totalEpisodeCount - n.freeEpisodeCount); }, 0);
    var estimatedRevenue = totalPaidEpisodes * EPISODE_PRICE;
    var bookmarks = [];
    try { bookmarks = JSON.parse(localStorage.getItem(store.bookmarks) || "[]"); } catch (_e) { bookmarks = []; }

    if (kpiNode) {
      kpiNode.innerHTML =
        "<div class='kpi-card'><span class='material-symbols-outlined kpi-card-icon'>visibility</span><div class='kpi-card-value'>" + formatCount(totalViews) + "</div><div class='kpi-card-label'>총 조회수</div></div>" +
        "<div class='kpi-card'><span class='material-symbols-outlined kpi-card-icon'>favorite</span><div class='kpi-card-value'>" + formatCount(bookmarks.length) + "</div><div class='kpi-card-label'>총 찜 수</div></div>" +
        "<div class='kpi-card'><span class='material-symbols-outlined kpi-card-icon'>chat_bubble</span><div class='kpi-card-value'>" + formatCount(totalComments) + "</div><div class='kpi-card-label'>총 댓글 수</div></div>" +
        "<div class='kpi-card'><span class='material-symbols-outlined kpi-card-icon'>payments</span><div class='kpi-card-value'>" + formatWon(estimatedRevenue) + "</div><div class='kpi-card-label'>추정 수익</div></div>";
    }

    if (tableBody) {
      if (novels.length) {
        tableBody.innerHTML = novels.map(function (novel) {
          return "<tr onclick=\"window.location.href='" + detailHref(novel.slug) + "'\">" +
            "<td>" + esc(novel.title) + "</td>" +
            "<td class='num'>" + formatCount(novel.viewCount) + "</td>" +
            "<td class='num'>" + formatCount(novel.reactionScore) + "</td>" +
            "<td class='num'>" + formatCount(novel.commentCount) + "</td>" +
            "<td class='num'>★ " + novel.reactionScore.toFixed(1) + "</td>" +
            "<td>" + esc(novel.updatedAt ? novel.updatedAt.slice(0, 10) : "—") + "</td>" +
            "</tr>";
        }).join("");
      } else {
        tableBody.innerHTML = "<tr><td colspan='6' style='text-align:center;color:var(--text-muted);padding:32px;'>등록된 작품이 없습니다</td></tr>";
      }
    }

    if (activityNode) {
      var activities = novels.slice(0, 5).map(function (novel) {
        return "<div class='activity-item'><span class='material-symbols-outlined'>chat_bubble</span><span>" + esc(novel.title) + "에 새로운 반응이 있습니다</span><span class='activity-time'>최근</span></div>";
      });
      activityNode.innerHTML = activities.length
        ? activities.join("")
        : "<div class='activity-item'><span class='material-symbols-outlined'>info</span><span>최근 활동이 없습니다</span></div>";
    }

    var periodBtns = qa("[data-period]");
    periodBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        periodBtns.forEach(function (b) { b.dataset.state = ""; });
        btn.dataset.state = "include";
      });
    });
  }
```

- [ ] **Step 3: `hydrate()` 함수에 4개 페이지 라우팅 추가**

`hydrate()` 함수 내부에서, `if (page === "search_pc.html")` 블록 뒤에 4개 페이지 라우팅을 추가한다.

기존:
```javascript
    if (page === "search_pc.html") {
      renderSearch(data);
      return;
    }

    const slug = query.get("slug") || "abyss-librarian-forbidden-archive";
```

변경:
```javascript
    if (page === "search_pc.html") {
      renderSearch(data);
      return;
    }

    if (page === "my_library_pc.html") {
      renderLibrary(data);
      return;
    }

    if (page === "auth_pc.html") {
      renderAuth();
      return;
    }

    if (page === "creator_dashboard_pc.html") {
      renderCreatorDashboard(data);
      return;
    }

    if (page === "author_dashboard_pc.html") {
      renderAuthorDashboard(data);
      return;
    }

    const slug = query.get("slug") || "abyss-librarian-forbidden-archive";
```

---

## Task 7: 최종 검증

**Files:**
- Review: 4개 HTML + 2개 CSS + 1개 JS

- [ ] **Step 1: 4개 페이지 렌더링 확인**

Run: 브라우저에서 각 페이지 열기
- `my_library_pc.html` — 내 서재 탭 전환, 찜 목록 표시 확인
- `auth_pc.html` — 스플릿 레이아웃, 로그인/가입 토글 확인
- `creator_dashboard_pc.html` — 사이드바 + 작품 목록 확인
- `author_dashboard_pc.html` — 사이드바 + KPI + 테이블 확인

- [ ] **Step 2: 비대상 페이지 무결성 확인**

Run: `homepage_pc.html`, `search_pc.html`, `novel_detail_pc.html`, `novel_viewer_pc.html` 열기
Expected: 기존 디자인 유지, 깨지는 요소 없음

- [ ] **Step 3: 금지 색상 검증**

Run: 새로 추가한 CSS에 보라/네온 색상 없는지 확인
Expected: `.store-light` Phase 2 블록에 보라/네온 색상 없음

- [ ] **Step 4: EPISODE_PRICE 일관성**

Run: `store-redesign.js`에서 하드코딩된 다른 가격 없는지 확인
Expected: `EPISODE_PRICE = 300` 하나만 존재
