# INKROAD Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the INKROAD webnovel platform to a premium, dark-themed experience inspired by Spotify (PC) and Pinterest (Mobile).

**Architecture:** We will update CSS styles in `assets/styles.css` and `assets/pc.css` to introduce the dark theme and masonry/Spotify grid structures. Then, we will sequentially update the PC HTML files followed by the Mobile HTML files to match the new layouts.

**Tech Stack:** HTML5, CSS3 (Vanilla), Pretendard Font.

---

### Task 1: Core CSS Framework Updates (Theme & Grid)

**Files:**
- Modify: `assets/styles.css`
- Modify: `assets/pc.css`

- [ ] **Step 1: Remove `.store-light` overrides from `assets/pc.css`**
Remove all styles prefixed with `.store-light` in `assets/pc.css` to enforce the dark theme natively. Alternatively, rename `.store-light` to `.store-dark` and update colors to deep blacks (`#000000`, `#121212`, `#181818`), gold (`#FFC55F`), and red (`#E50914`).
*Since the default CSS variables in `assets/styles.css` are already dark, deleting the `store-light` block in `assets/pc.css` or overriding it is the easiest path.*

- [ ] **Step 2: Add Pinterest Masonry Grid to `assets/styles.css`**

Append the following mobile Pinterest masonry grid styles to `assets/styles.css` (inside mobile queries or globally):

```css
/* --- Mobile Pinterest Masonry Grid --- */
.masonry-grid {
  column-count: 2;
  column-gap: 12px;
  padding: 0 16px;
}

.masonry-item {
  break-inside: avoid;
  margin-bottom: 12px;
  background: #121212;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.masonry-item.tall .masonry-cover { aspect-ratio: 0.6; }
.masonry-item.short .masonry-cover { aspect-ratio: 0.8; }
.masonry-item.medium .masonry-cover { aspect-ratio: 0.7; }

.masonry-cover {
  width: 100%;
  object-fit: cover;
  display: block;
}

.masonry-info {
  padding: 10px;
}

.masonry-title {
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 4px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: #fff;
}

.masonry-author {
  font-size: 12px;
  color: #b3b3b3;
}

.red-badge-masonry {
  position: absolute;
  top: 8px;
  left: 8px;
  background: #E50914;
  color: #fff;
  font-size: 10px;
  padding: 4px 6px;
  border-radius: 4px;
  font-weight: 800;
  z-index: 2;
}

.category-pills {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 16px 16px;
  margin-bottom: 8px;
  scrollbar-width: none;
}

.category-pills::-webkit-scrollbar {
  display: none;
}

.pill {
  padding: 8px 16px;
  background: #242424;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  color: #fff;
  border: none;
  cursor: pointer;
}

.pill.active {
  background: #FFC55F;
  color: #000;
}
```

- [ ] **Step 3: Add Spotify PC Styles to `assets/pc.css`**

Append the following PC styles to `assets/pc.css`:

```css
/* --- PC Spotify Styles --- */
.spotify-shell {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 72px);
  background: #000000;
  color: #fff;
}

.top-nav-header {
  height: 72px;
  background: #121212;
  display: flex;
  align-items: center;
  padding: 0 32px;
  gap: 40px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.spotify-logo {
  font-size: 22px;
  font-weight: 800;
  color: #FFC55F;
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.top-nav-menu {
  display: flex;
  gap: 24px;
}

.spotify-nav-item {
  color: #b3b3b3;
  font-size: 15px;
  font-weight: 700;
  text-decoration: none;
  transition: color 0.2s;
}

.spotify-nav-item:hover, .spotify-nav-item.active {
  color: #fff;
}

.top-search {
  background: #242424;
  border-radius: 24px;
  padding: 10px 20px;
  color: #fff;
  font-size: 14px;
  border: 1px solid transparent;
  width: 300px;
}

.top-search:focus {
  border-color: #FFC55F;
  outline: none;
}

.login-btn {
  background: #fff;
  color: #000;
  padding: 8px 24px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
}

.top-nav-main {
  flex: 1;
  background: linear-gradient(180deg, #2a1a15 0%, #121212 30%, #121212 100%);
  padding: 32px;
}

.spotify-section {
  margin-bottom: 40px;
  max-width: 1440px;
  margin-left: auto;
  margin-right: auto;
}

.spotify-section-title {
  font-size: 26px;
  font-weight: 800;
  margin-bottom: 24px;
  letter-spacing: -0.04em;
  color: #fff;
}

.spotify-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
}

.spotify-card {
  background: #181818;
  padding: 16px;
  border-radius: 8px;
  transition: background 0.3s;
  text-decoration: none;
  display: flex;
  flex-direction: column;
}

.spotify-card:hover {
  background: #282828;
}

.spotify-card-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 0.72;
  margin-bottom: 16px;
}

.spotify-card-cover {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  background: #333;
  object-fit: cover;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}

.red-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: #E50914;
  color: #fff;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 800;
  z-index: 2;
}

.spotify-card-title {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 6px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.spotify-card-sub {
  font-size: 14px;
  color: #b3b3b3;
  line-height: 1.4;
}
```

- [ ] **Step 4: Commit CSS changes**
```bash
git add assets/styles.css assets/pc.css
git commit -m "style: add pinterest masonry and spotify pc dark theme styles"
```

### Task 2: PC Pages Update - Homepage

**Files:**
- Modify: `homepage_pc.html`

- [ ] **Step 1: Replace `.store-light` body class with `.store-dark` and update the layout to Spotify style**
In `homepage_pc.html`, modify the `<body>`, `<header>`, and `<main>` tags. Replace the existing structure with the Spotify Option B layout defined in the spec.

```html
<body class="pc-desktop store-dark">
  <div class="spotify-shell top-nav-shell">
    <header class="top-nav-header">
      <a class="spotify-logo" href="homepage_pc.html">
        <i class="bx bx-book-open"></i> INKROAD
      </a>
      <nav class="top-nav-menu">
        <a class="spotify-nav-item active" href="homepage_pc.html" data-i18n="nav.store">홈</a>
        <a class="spotify-nav-item" href="search_pc.html" data-i18n="nav.search">탐색</a>
        <a class="spotify-nav-item" href="my_library_pc.html" data-i18n="nav.my_library">내 서재</a>
      </nav>
      <div style="flex:1;"></div>
      <form action="search_pc.html" style="position:relative;">
        <input type="text" class="top-search" name="q" placeholder="작품, 작가 검색...">
      </form>
      <div data-lang-picker></div>
      <a class="login-btn" href="my_library_pc.html" data-i18n="nav.login">로그인</a>
    </header>

    <main class="top-nav-main">
      <section class="spotify-section">
        <h2 class="spotify-section-title">이번 주 세일 추천</h2>
        <div class="spotify-grid">
          <a href="novel_viewer_pc.html" class="spotify-card">
            <div class="spotify-card-img-wrap">
              <div class="red-badge">-45% 세일</div>
              <img class="spotify-card-cover" src="https://placehold.co/200x280/1a1a1a/E50914?text=Sale+1" alt="Cover">
            </div>
            <div class="spotify-card-title">대표 작품 제목</div>
            <div class="spotify-card-sub">다크 판타지 · 인기작</div>
          </a>
          <!-- Add 3-4 more placeholder cards -->
        </div>
      </section>
      
      <!-- Footer -->
      <footer class="store-footer" style="max-width:1440px; margin: 40px auto 0; border-top: 1px solid #282828; padding-top: 24px; color: #b3b3b3; display: flex; justify-content: space-between;">
        <span>© <span data-year></span> INKROAD</span>
        <div style="display:flex; gap:16px;">
          <a href="#" style="color:#b3b3b3; text-decoration:none;">이용약관</a>
          <a href="#" style="color:#b3b3b3; text-decoration:none;">개인정보</a>
        </div>
      </footer>
    </main>
  </div>
```
*(Ensure script tags at the bottom remain intact)*

- [ ] **Step 2: Commit Homepage PC changes**
```bash
git add homepage_pc.html
git commit -m "feat: apply spotify dark layout to homepage_pc"
```

### Task 3: PC Pages Update - Search & Library

**Files:**
- Modify: `search_pc.html`
- Modify: `my_library_pc.html`

- [ ] **Step 1: Update `search_pc.html` to Spotify Layout**
Replicate the top navigation header and `.spotify-shell` wrapper from Task 2 into `search_pc.html`. Convert search results to `.spotify-grid` cards.
Change body class to `store-dark`. Update the `active` class on `.spotify-nav-item` to highlight "탐색".

- [ ] **Step 2: Update `my_library_pc.html` to Spotify Layout**
Replicate the top navigation header and `.spotify-shell` wrapper from Task 2 into `my_library_pc.html`. Convert library results to `.spotify-grid` cards.
Change body class to `store-dark`. Update the `active` class on `.spotify-nav-item` to highlight "내 서재".

- [ ] **Step 3: Commit Search & Library PC changes**
```bash
git add search_pc.html my_library_pc.html
git commit -m "feat: apply spotify dark layout to search and library pc pages"
```

### Task 4: Mobile Pages Update - Homepage

**Files:**
- Modify: `homepage.html`

- [ ] **Step 1: Replace structure with Pinterest Masonry layout**
In `homepage.html`, replace the existing `<header>` and `<main>` with the Pinterest-style blurred topbar, category pills, masonry grid, and bottom navigation.

```html
<body class="store-dark" style="background:#000; color:#fff;">
  <!-- Topbar -->
  <header style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); position:fixed; top:0; left:0; right:0; z-index:100;">
    <a href="homepage.html" style="font-size:18px; font-weight:800; color:#FFC55F; display:flex; align-items:center; gap:6px; text-decoration:none;">
      <i class="bx bx-book-open"></i> INKROAD
    </a>
    <a href="search.html" style="width:36px; height:36px; border-radius:50%; background:#242424; display:flex; align-items:center; justify-content:center; color:#fff; text-decoration:none;">
      <i class="bx bx-search"></i>
    </a>
  </header>

  <main style="padding: 72px 0 90px; background: #000; min-height: 100vh;">
    <!-- Category Filter -->
    <div class="category-pills">
      <button class="pill active">추천</button>
      <button class="pill">판타지</button>
      <button class="pill">로맨스</button>
      <button class="pill">무협</button>
      <button class="pill">세일 중</button>
    </div>
    
    <!-- Masonry Grid -->
    <div class="masonry-grid">
      <a href="novel_viewer.html" class="masonry-item tall" style="text-decoration:none; display:block;">
        <div class="red-badge-masonry">-45%</div>
        <img class="masonry-cover" src="https://placehold.co/300x500/1a1a1a/E50914?text=Novel+1" alt="Cover">
        <div class="masonry-info">
          <div class="masonry-title">전지적 독자 시점</div>
          <div class="masonry-author">싱숑</div>
        </div>
      </a>
      <a href="novel_viewer.html" class="masonry-item short" style="text-decoration:none; display:block;">
        <img class="masonry-cover" src="https://placehold.co/300x375/1a1a1a/FFC55F?text=Novel+2" alt="Cover">
        <div class="masonry-info">
          <div class="masonry-title">재벌집 막내아들</div>
          <div class="masonry-author">산경</div>
        </div>
      </a>
      <!-- Add more items with varying classes (tall, short, medium) -->
    </div>
  </main>

  <!-- Bottom Navigation -->
  <nav style="display:flex; justify-content:space-around; align-items:center; padding:12px 20px 24px; background:rgba(18,18,18,0.9); backdrop-filter:blur(10px); position:fixed; bottom:0; left:0; right:0; border-top:1px solid #282828; z-index:100;">
    <a href="homepage.html" style="display:flex; flex-direction:column; align-items:center; gap:4px; color:#FFC55F; font-size:10px; font-weight:700; text-decoration:none;">
      <i class="bx bxs-home" style="font-size:24px;"></i>
      <span>홈</span>
    </a>
    <a href="search.html" style="display:flex; flex-direction:column; align-items:center; gap:4px; color:#888; font-size:10px; font-weight:700; text-decoration:none;">
      <i class="bx bx-search" style="font-size:24px;"></i>
      <span>탐색</span>
    </a>
    <a href="my_library.html" style="display:flex; flex-direction:column; align-items:center; gap:4px; color:#888; font-size:10px; font-weight:700; text-decoration:none;">
      <i class="bx bx-book" style="font-size:24px;"></i>
      <span>내 서재</span>
    </a>
  </nav>
```

- [ ] **Step 2: Commit Homepage Mobile changes**
```bash
git add homepage.html
git commit -m "feat: apply pinterest masonry dark layout to mobile homepage"
```

### Task 5: Mobile Pages Update - Search & Library

**Files:**
- Modify: `search.html`
- Modify: `my_library.html`

- [ ] **Step 1: Update `search.html` to Pinterest Layout**
Apply the blurred topbar and bottom app navigation to `search.html`. Change body class to `store-dark` with `#000` background. Update active state in bottom nav for "탐색". Use the `.masonry-grid` for search results.

- [ ] **Step 2: Update `my_library.html` to Pinterest Layout**
Apply the blurred topbar and bottom app navigation to `my_library.html`. Change body class to `store-dark` with `#000` background. Update active state in bottom nav for "내 서재". Use the `.masonry-grid` for library items.

- [ ] **Step 3: Commit Search & Library Mobile changes**
```bash
git add search.html my_library.html
git commit -m "feat: apply pinterest masonry dark layout to mobile search and library"
```