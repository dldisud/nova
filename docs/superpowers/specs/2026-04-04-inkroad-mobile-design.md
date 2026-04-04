# 잉크로드 모바일 5개 페이지 Clean Light Store 리디자인 — Design Spec

## 목표

모바일 5개 페이지(homepage, search, novel_detail, novel_viewer, my_library)를 PC와 동일한 Clean Light Store 디자인으로 교체하고 Supabase 연동을 완성한다.

## 디자인 결정 사항

| 항목 | 결정 |
|------|------|
| 네비게이션 | 하단 탭 바 4칸 (홈/탐색/서재/MY) |
| 홈 히어로 | 컴팩트 정보형 (커버 좌 + 텍스트 우) |
| 검색 필터 | 장르 칩 가로 스크롤 + 출처·상태·정렬 드롭다운 |
| 상세 | 세로 스택 (커버 → 정보 → 에피소드) |
| 뷰어 | 풀스크린, 탭 바 숨김, 최소 크롬 |
| 서재 | PC와 동일 3탭 |

## 아키텍처

### 변경 파일

| 파일 | 역할 | 변경 |
|------|------|------|
| `assets/styles.css` | CSS 변수 + 공용 컴포넌트 | 하단에 모바일 `.store-light` 블록 추가 |
| `homepage.html` | 모바일 홈 | HTML 전체 교체 |
| `search.html` | 모바일 탐색 | HTML 전체 교체 |
| `novel_detail.html` | 모바일 상세 | HTML 전체 교체 |
| `novel_viewer.html` | 모바일 뷰어 | HTML 전체 교체 |
| `my_library.html` | 모바일 서재 | HTML 전체 교체 |
| `assets/store-redesign.js` | Supabase 연동 | supported 배열 확장 + 모바일 렌더러 5개 + hydrate 라우팅 |

### 건드리지 않는 파일

- PC 8개 페이지 (이미 완료)
- `assets/pc.css` — 모바일 페이지에서 로드하지 않음
- `assets/app.js` — data-attribute 기반, 변경 불필요
- `assets/supabase-config.js`, `assets/supabase-live.js` — 변경 없음

### CSS 구조

- `body class="mobile-app store-light"` — 기존 `.store-light` 토큰 그대로 재활용
- `pc.css` 안 씀 — `styles.css`만 로드
- 모바일 전용 레이아웃은 `styles.css` 하단에 추가

### JS 구조

- `store-redesign.js`의 `supported` 배열에 모바일 5개 추가
- 모바일 전용 렌더러 5개: `renderMobileHome`, `renderMobileSearch`, `renderMobileDetail`, `renderMobileViewer`, `renderMobileLibrary`
- PC 렌더러와 분리 — 페이지명으로 라우팅 (`homepage.html` vs `homepage_pc.html`)

## 공통 컴포넌트

### 하단 탭 바

```html
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
```

CSS:
- `position: fixed; bottom: 0; left: 0; right: 0`
- `height: 56px` + safe-area 대응 (`padding-bottom: env(safe-area-inset-bottom)`)
- 4칸 균등 `grid-template-columns: repeat(4, 1fr)`
- active 상태: `color: var(--dark); font-weight: 600`
- 비활성: `color: var(--text-muted)`
- `background: var(--surface); border-top: 1px solid var(--border)`
- 뷰어 페이지에서는 숨김

### 상단 헤더

```html
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
```

CSS:
- `position: sticky; top: 0; z-index: 100`
- `height: 52px; padding: 0 16px`
- `background: var(--surface); border-bottom: 1px solid var(--border)`
- flexbox: `justify-content: space-between; align-items: center`

### 콘텐츠 영역 패딩

- 하단 탭 바 영역 확보: `padding-bottom: 72px` (56px 탭바 + 16px 여유)
- 좌우 패딩: `16px`

## 페이지별 상세

### 1. homepage.html

**구조:**
1. 상단 헤더
2. 히어로 (컴팩트 정보형)
   - `display: flex; gap: 14px; padding: 20px 16px`
   - 커버: `width: 72px; aspect-ratio: 0.72; border-radius: 6px`
   - 우측: 태그 뱃지 → 제목 (16px, 800) → 메타 (작가·화수·평점) → 가격
   - 하단: [무료로 읽기] + [♥ 찜] 버튼 행
3. 세일 배너 (풀폭, PC와 동일 데이터)
4. "지금 할인 중" 섹션
   - 섹션 헤더: 제목 + "전체 보기 →"
   - 가로 스크롤: `overflow-x: auto; scroll-snap-type: x mandatory`
   - 카드: `width: 120px; flex-shrink: 0`
   - 카드 내부: 커버 (120px, aspect-ratio 0.72) → 제목 → 가격
5. "인기 작품" 섹션 — 동일 가로 스크롤
6. "최근 업데이트" 섹션
   - 세로 리스트: 커버 56px + 제목/작가/가격
7. 푸터
8. 하단 탭 바

### 2. search.html

**구조:**
1. 상단 헤더
2. 검색 인풋 (풀폭, `padding: 0 16px`)
3. 장르 칩 가로 스크롤
   - `.filter-chip` 재활용 (PC와 동일 클래스)
   - `overflow-x: auto; -webkit-overflow-scrolling: touch`
   - 칩들: 전체/판타지/로맨스/회귀/아카데미/하렘/피폐
4. 세부 필터 행 (출처 ▾ / 상태 ▾ / 정렬 ▾)
   - 각각 드롭다운 버튼, 탭하면 옵션 리스트 토글
5. 결과 카운트 ("N개 작품")
6. 결과 리스트
   - 커버 56px + 제목 + 작가·장르 + 가격 (세일가 강조)
   - 각 행 탭하면 `novel_detail.html?slug=...`으로 이동
7. 하단 탭 바

### 3. novel_detail.html

**구조:**
1. 상단: ← 뒤로 + 작품명 (최대 1줄 말줄임)
   - `position: sticky; top: 0`
   - 뒤로가기: `history.back()` 또는 `homepage.html`
2. 커버 이미지 중앙 (`width: 160px; margin: 0 auto`)
3. 제목 (20px, 800, 중앙 정렬) + 작가
4. 태그 뱃지 행 (가로 스크롤)
5. 스탯 바 (가로 3칸: 평점 · 조회수 · 찜수)
   - `display: grid; grid-template-columns: repeat(3, 1fr); text-align: center`
6. 소개글 (3줄 클램프 + "더보기" 토글)
7. CTA 행: [무료로 읽기] + [♥ 찜]
   - `position: sticky; bottom: 72px` (탭바 위)
8. 에피소드 리스트
   - 각 행: 번호 + 제목 + 무료/유료 뱃지 + 가격
   - 무료: `free-badge`, 유료: 가격 표시
9. 하단 탭 바

### 4. novel_viewer.html

**구조:**
1. 탭 바 숨김 (`.mobile-tab-bar { display: none }`)
2. 리더 헤더 (탭하면 show/hide 토글)
   - ← 뒤로 + "작품명 · N화" + 목록 아이콘
   - `position: fixed; top: 0`
3. 본문 텍스트
   - `padding: 16px; line-height: 1.9; font-size: 16px`
   - `max-width: 100%` (모바일이니까 풀폭)
4. 리더 푸터 (탭하면 show/hide 토글)
   - 이전화 ← | 에피소드 번호 | → 다음화
   - `position: fixed; bottom: 0`
5. 스크롤 진행률 바
   - `position: fixed; top: 0; height: 2px`
   - JS로 스크롤 퍼센트 계산

### 5. my_library.html

**구조:**
1. 상단 헤더
2. "내 서재" 타이틀 + 찜 개수 뱃지
3. 3탭 칩 (읽는 중 / 찜한 작품 / 구매한 작품)
   - `.filter-chip` + `data-tab-target`
4. 각 탭 콘텐츠:
   - 읽는 중: 비로그인 → "로그인이 필요합니다" + CTA / 로그인 → empty state
   - 찜한 작품: localStorage 북마크 기반, 커버 56px + 제목 + 메타 + 할인뱃지
   - 구매한 작품: 비로그인 → "로그인이 필요합니다" + CTA
5. 하단 탭 바

## CSS 추가 내용 (styles.css 하단)

### 추가할 클래스

- `.store-light .mobile-tab-bar` — 하단 탭 바
- `.store-light .tab-item` — 탭 아이템
- `.store-light .mobile-header` — 상단 헤더
- `.store-light .mobile-header-actions` — 헤더 우측 액션
- `.store-light .mobile-header-icon` — 헤더 아이콘 버튼
- `.store-light .mobile-hero` — 홈 히어로 영역
- `.store-light .mobile-hero-cover` — 히어로 커버
- `.store-light .mobile-hero-info` — 히어로 텍스트 영역
- `.store-light .mobile-section` — 섹션 래퍼
- `.store-light .mobile-section-head` — 섹션 헤더 (제목 + 전체보기)
- `.store-light .mobile-scroll-row` — 가로 스크롤 컨테이너
- `.store-light .mobile-scroll-card` — 가로 스크롤 카드 (120px)
- `.store-light .mobile-list-row` — 세로 리스트 행 (커버 + 텍스트)
- `.store-light .mobile-search-input` — 검색 인풋
- `.store-light .mobile-filter-row` — 필터 드롭다운 행
- `.store-light .mobile-detail-header` — 상세 헤더 (뒤로 + 제목)
- `.store-light .mobile-detail-cover` — 상세 커버 (중앙)
- `.store-light .mobile-detail-stats` — 스탯 바 3칸
- `.store-light .mobile-detail-synopsis` — 소개글 (클램프)
- `.store-light .mobile-detail-cta` — CTA 행 (sticky)
- `.store-light .mobile-episode-row` — 에피소드 행
- `.store-light .mobile-reader-chrome` — 뷰어 상단/하단 크롬
- `.store-light .mobile-reader-body` — 뷰어 본문

### 금지 색상

- 보라, 네온, 그라디언트 사용하지 않음
- 기존 `.store-light` 토큰만 사용 (`--bg`, `--surface`, `--dark`, `--text`, `--accent-sale`, `--accent-free` 등)

## 디자인 토큰 (기존 재활용)

PC와 동일한 `.store-light` 커스텀 프로퍼티:
- `--bg: #f7f5f2` / `--surface: #ffffff` / `--dark: #1a1a1a`
- `--text: #1a1a1a` / `--text-secondary: #444` / `--text-muted: #999`
- `--border: #e8e5e0` / `--surface-muted: #f0eeeb`
- `--accent-sale: #e85d3a` / `--accent-free: #2d8f4e`
- `--radius-sm: 6px` / `--radius-md: 8px` / `--radius-lg: 12px`
- `--shadow-soft: 0 1px 4px rgba(0,0,0,0.06)`
- `--font: 'Pretendard', 'Inter', sans-serif`

## supabase-live.js 충돌 방지

PC와 동일하게 `.store-light .auth-shell { display: none !important }` 적용됨 (이미 styles.css에 추가됨). 모바일에서도 동작한다.

## EPISODE_PRICE

`store-redesign.js` 기존 상수 `EPISODE_PRICE = 300` 그대로 사용.
