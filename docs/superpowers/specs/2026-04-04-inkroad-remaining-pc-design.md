# 잉크로드 PC 나머지 4개 페이지 리디자인 — Design Spec

> Clean Light Store 디자인 시스템(`.store-light`)을 내 서재, 로그인, 작품 관리, 통계 대시보드에 적용한다. HTML + CSS + Supabase JS 연동 풀스택.

## 선행 조건

- Clean Light Store 디자인 토큰은 이미 `assets/styles.css`, `assets/pc.css`에 `.store-light` 스코프로 존재
- `assets/store-redesign.js`에 Supabase REST 헬퍼(`rest()`, `catalog()`, `episodes()` 등)가 존재
- `assets/supabase-config.js`, `assets/supabase-live.js` 존재
- 기존 `assets/app.js`의 data-attribute 기능(북마크, 탭, 필터 칩, reveal) 유지

## 디자인 시스템 참조

| 토큰 | 값 |
|------|-----|
| `--bg` | `#f7f5f2` |
| `--surface` | `#ffffff` |
| `--surface-muted` | `#f0eeeb` |
| `--text` | `#1a1a1a` |
| `--text-secondary` | `#444444` |
| `--text-muted` | `#999999` |
| `--border` | `#eeeeee` |
| `--accent-sale` | `#e85d3a` |
| `--accent-free` | `#2d8a4e` |
| `--dark` | `#1a1a1a` |
| `--radius-sm/md/lg` | `6px / 10px / 12px` |
| `--font` | Pretendard, Inter, system |

## 네비게이션 구조

### 독자용 페이지 — 기존 탑바

`my_library_pc.html`, `auth_pc.html`에 적용. 기존 4개 페이지와 동일한 sticky 탑바:

```
INKROAD | 스토어 | 탐색 | 내 서재 | 세일 | [검색] | KR ▾ | 로그인
```

### 작가용 페이지 — 좌측 사이드바

`creator_dashboard_pc.html`, `author_dashboard_pc.html`에 적용. 탑바 없이 사이드바가 네비 역할:

- 사이드바 너비: 220px, sticky, `var(--surface)` 배경
- 상단: INKROAD 로고 + "크리에이터" 서브텍스트
- 링크 4개:
  - 작품 관리 (`creator_dashboard_pc.html`)
  - 통계 (`author_dashboard_pc.html`)
  - 작품 등록 (`novel_upload_pc.html`)
  - 회차 업로드 (`episode_upload_pc.html`)
- 하단: "← 스토어로 돌아가기" (`homepage_pc.html`)
- Active 상태: `var(--dark)` 텍스트 + `var(--surface-muted)` 배경 + 좌측 3px 보더

---

## 페이지 1: 내 서재 (`my_library_pc.html`)

### 레이아웃

독자 탑바 + `store-shell` (max-width 960px 센터). `<body class="pc-desktop store-light">`.

### 구조

1. **헤더 영역**
   - "내 서재" 타이틀 (`store-section-title`)
   - 통계 뱃지 3개 (읽는 중 N개, 찜 N개, 구매 N개) — `muted-badge` 스타일

2. **탭 전환** — `filter-chip` 스타일, `data-tab-target` 활용
   - `읽는 중` (기본 active)
   - `찜한 작품`
   - `구매한 작품`

3. **읽는 중 탭** (`data-tab-panel="reading"`)
   - 리스트형 카드 (`novel-row` 변형)
   - 각 항목: 표지 썸네일(80px) + 제목 + 진행률 텍스트 + 진행률 바 + "이어 읽기" 버튼
   - 진행률 바: `var(--dark)` fill, `var(--surface-muted)` track, 높이 4px, radius 2px

4. **찜한 작품 탭** (`data-tab-panel="wishlist"`)
   - 리스트형 카드
   - 각 항목: 표지 + 제목 + 할인 알림 뱃지 (세일 중이면 `sale-badge`, 아니면 `muted-badge`) + "상세 보기" 버튼

5. **구매한 작품 탭** (`data-tab-panel="purchased"`)
   - 리스트형 카드
   - 각 항목: 표지 + 제목 + 구매 회차 수 + "이어 읽기" 버튼

6. **푸터** — 기존 `store-footer`

### Data Attributes

| 셀렉터 | 용도 |
|--------|------|
| `[data-library-stats]` | 통계 뱃지 컨테이너 |
| `[data-tab-target="reading"]` | 읽는 중 탭 버튼 |
| `[data-tab-target="wishlist"]` | 찜한 작품 탭 버튼 |
| `[data-tab-target="purchased"]` | 구매한 작품 탭 버튼 |
| `[data-tab-panel="reading"]` | 읽는 중 패널 |
| `[data-tab-panel="wishlist"]` | 찜한 작품 패널 |
| `[data-tab-panel="purchased"]` | 구매한 작품 패널 |
| `[data-year]` | 푸터 연도 |

### JS 연동

- 비로그인: localStorage의 `inkroad-bookmarks` 기반으로 찜 목록만 표시. 읽는 중/구매 탭은 "로그인이 필요합니다" 메시지 + 로그인 버튼.
- 로그인: Supabase에서 해당 유저의 bookmarks, reading_progress, purchases 테이블 조회.
- `store-redesign.js`에 `renderLibrary(data)` 함수 추가.

---

## 페이지 2: 로그인/가입 (`auth_pc.html`)

### 레이아웃

전체 화면 스플릿. `<body class="pc-desktop store-light">`. 네비 없음 (로그인 전이므로).

```
┌─────────────────────┬──────────────┐
│                     │              │
│   다크 비주얼 패널    │  라이트 폼    │
│   (flex: 1)         │  (480px)     │
│                     │              │
└─────────────────────┴──────────────┘
```

### 좌측 비주얼 패널

- 배경: `#1a1a1a` + 소설 표지 이미지 오버레이 (opacity 0.15)
- 하단 배치:
  - INKROAD 로고 마크 (36×36 흰색)
  - 메인 카피: "글을 넘어, 세계를 잇는 서재" — `1.6rem`, `font-weight: 800`, 흰색
  - 서브 카피: "전 세계 웹소설을 번역하고 스팀처럼 할인하는 글로벌 스토어" — `0.9rem`, `#888`

### 우측 폼 패널

- 배경: `var(--surface)` 흰색
- 너비: 480px 고정, 내부 max-width 380px
- 수직 중앙 정렬

**로그인 모드 (기본):**
1. INKROAD 로고 + "로그인" 타이틀 (`1.5rem`, `font-weight: 800`)
2. "계정이 없으신가요? **회원가입**" 링크
3. 이메일 입력 필드 — `var(--surface-muted)` 배경, `var(--radius-md)` 라운드
4. 비밀번호 입력 필드
5. "로그인" 버튼 — `.button.primary` (full-width)
6. 구분선 "또는"
7. "Google로 계속" 버튼 — `.button.secondary` (full-width)
8. "카카오로 계속" 버튼 — `.button.secondary` (full-width, 카카오 옐로우 배경 `#FEE500`)

**회원가입 모드 (JS 토글):**
1. "회원가입" 타이틀
2. "이미 계정이 있으신가요? **로그인**" 링크
3. 이메일 입력
4. 비밀번호 입력
5. 비밀번호 확인 입력
6. 닉네임(필명) 입력
7. "가입하기" 버튼 — `.button.primary` (full-width)
8. 소셜 로그인 동일

**에러 표시:** 폼 상단에 인라인 메시지. 빨간 텍스트 (`var(--accent-sale)`), `var(--surface-muted)` 배경 박스.

### JS 연동

- `store-redesign.js`에 `renderAuth()` 함수 추가
- Supabase Auth API:
  - `signInWithPassword({ email, password })` — 로그인
  - `signUp({ email, password, options: { data: { pen_name } } })` — 가입
  - `signInWithOAuth({ provider: 'google' })` — Google
  - `signInWithOAuth({ provider: 'kakao' })` — 카카오
- 로그인 성공 → accessToken을 localStorage에 저장 → `homepage_pc.html`로 리다이렉트
- 에러 → 폼 아래 인라인 메시지 표시

---

## 페이지 3: 작품 관리 (`creator_dashboard_pc.html`)

### 레이아웃

작가 사이드바(220px) + 메인 영역. `<body class="pc-desktop store-light">`. 탑바 없음.

```
┌──────────┬──────────────────────────┐
│          │                          │
│ 사이드바  │  메인 영역                │
│ 220px    │  padding: 32px           │
│ sticky   │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

### 메인 영역 구조

1. **헤더** — "내 작품" 타이틀 + "새 작품 등록" 버튼 (`.button.primary`, → `novel_upload_pc.html`)

2. **요약 카드 3개** — 가로 나열 (`grid-template-columns: repeat(3, 1fr)`)
   - 등록 작품 수 — 아이콘 `auto_stories`
   - 총 회차 수 — 아이콘 `list`
   - 총 조회수 — 아이콘 `visibility`
   - 각 카드: `var(--surface)` 배경, `var(--shadow-soft)`, 숫자 큰 글씨 + 라벨 작은 글씨

3. **작품 목록** — 리스트형 카드
   - 각 카드 (`novel-row` 변형):
     - 표지 썸네일 (80px)
     - 제목 + 상태 뱃지: 연재중(`muted-badge`), 완결(`free-badge`), 비공개(`muted-badge` 흐리게)
     - 회차 수 + 최근 업데이트일
     - 우측: "회차 추가" 버튼 (→ `episode_upload_pc.html?novel_id=X`) + "수정" 버튼 (→ `novel_upload_pc.html?edit=X`)

4. **빈 상태** — 작품이 없을 때: "아직 등록된 작품이 없습니다" + "첫 작품 등록하기" 버튼

### Data Attributes

| 셀렉터 | 용도 |
|--------|------|
| `[data-creator-stats]` | 요약 카드 컨테이너 |
| `[data-creator-list]` | 작품 목록 컨테이너 |
| `[data-creator-empty]` | 빈 상태 영역 |

### JS 연동

- `store-redesign.js`에 `renderCreatorDashboard()` 함수 추가
- Supabase: 로그인 유저의 author_id로 `novels` 테이블 조회 (status, episode count, view_count)
- 비로그인 시 전체 영역을 "로그인이 필요합니다" 메시지로 대체

---

## 페이지 4: 통계 대시보드 (`author_dashboard_pc.html`)

### 레이아웃

동일한 작가 사이드바 + 메인. 사이드바에서 "통계"가 active.

### 메인 영역 구조

1. **KPI 카드 4개** — 가로 나열 (`grid-template-columns: repeat(4, 1fr)`)
   - 총 조회수 — 아이콘 `visibility`
   - 총 찜 수 — 아이콘 `favorite`
   - 총 댓글 수 — 아이콘 `chat_bubble`
   - 총 수익(추정) — 아이콘 `payments`
   - 각 카드: `var(--surface)` 배경, 숫자(1.5rem bold) + 라벨(0.78rem muted) + 아이콘(좌상단)

2. **기간 필터** — `filter-chip` 스타일
   - `7일` | `30일` | `전체` (기본: 전체)
   - 현재는 기간 필터가 UI만 존재, 실제 필터링은 추후 구현

3. **작품별 성과 테이블**
   - 헤더: 작품명 | 조회수 | 찜 | 댓글 | 평점 | 최근 업데이트
   - 각 행: `var(--surface)` 배경, hover시 `var(--surface-muted)`, 클릭 시 `novel_detail_pc.html?slug=X`로 이동
   - 테이블 스타일: `var(--border)` 구분선, `0.85rem` 폰트, 숫자 우측 정렬
   - 빈 상태: "등록된 작품이 없습니다"

4. **최근 활동** — 간략 리스트 5개
   - 각 항목: 아이콘 + "OOO 작품에 새 댓글이 달렸습니다" 형태 + 시간
   - `var(--surface)` 카드, `var(--shadow-soft)`

### Data Attributes

| 셀렉터 | 용도 |
|--------|------|
| `[data-kpi-cards]` | KPI 컨테이너 |
| `[data-period-filter]` | 기간 필터 그룹 |
| `[data-stats-table]` | 성과 테이블 body |
| `[data-recent-activity]` | 최근 활동 리스트 |

### JS 연동

- `store-redesign.js`에 `renderAuthorDashboard()` 함수 추가
- Supabase: 로그인 유저의 novels → `view_count`, `reaction_score`, `comment_count` 집계
- 수익 추정: 유료 에피소드 수 × `EPISODE_PRICE` (300원)
- 비로그인 시 "로그인이 필요합니다" 메시지

---

## CSS 추가 사항

기존 `.store-light` 블록에 추가할 새 스타일:

### 작가 사이드바

```css
.store-light .creator-layout { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
.store-light .creator-sidebar { background: var(--surface); border-right: 1px solid var(--border); padding: 24px 0; position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; }
.store-light .creator-sidebar-brand { padding: 0 20px 20px; border-bottom: 1px solid var(--border); }
.store-light .creator-sidebar-nav { padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
.store-light .creator-nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: var(--radius-md); font-size: 0.88rem; font-weight: 500; color: var(--text-muted); }
.store-light .creator-nav-link:hover { color: var(--text); background: var(--surface-muted); }
.store-light .creator-nav-link.active { color: var(--text); background: var(--surface-muted); border-left: 3px solid var(--dark); font-weight: 600; }
.store-light .creator-sidebar-footer { padding: 16px 20px; border-top: 1px solid var(--border); }
.store-light .creator-main { padding: 32px; }
```

### 진행률 바

```css
.store-light .progress-track { height: 4px; background: var(--surface-muted); border-radius: 2px; overflow: hidden; }
.store-light .progress-fill { height: 100%; background: var(--dark); border-radius: 2px; }
```

### 내 서재 탭 리스트

```css
.store-light .library-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
.store-light .library-row { display: grid; grid-template-columns: 80px 1fr auto; gap: 16px; padding: 16px; background: var(--surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-soft); align-items: center; }
.store-light .library-row-thumb img { width: 80px; aspect-ratio: 0.72; object-fit: cover; border-radius: var(--radius-sm); }
```

### 로그인 스플릿

```css
.store-light .auth-split { display: grid; grid-template-columns: 1fr 480px; min-height: 100vh; }
.store-light .auth-visual { background: #1a1a1a; position: relative; display: flex; flex-direction: column; justify-content: flex-end; padding: 48px; }
.store-light .auth-form-panel { background: var(--surface); display: flex; align-items: center; justify-content: center; padding: 48px; }
.store-light .auth-form { width: 100%; max-width: 380px; display: grid; gap: 16px; }
.store-light .auth-input { width: 100%; padding: 12px 16px; background: var(--surface-muted); border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 0.9rem; color: var(--text); outline: none; }
.store-light .auth-input:focus { border-color: var(--dark); }
.store-light .auth-error { padding: 10px 14px; background: #fef2f0; border-radius: var(--radius-sm); color: var(--accent-sale); font-size: 0.82rem; display: none; }
```

### KPI / 테이블

```css
.store-light .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.store-light .kpi-card { background: var(--surface); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-soft); }
.store-light .kpi-card-value { font-size: 1.5rem; font-weight: 800; color: var(--text); }
.store-light .kpi-card-label { font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; }
.store-light .stats-table { width: 100%; border-collapse: collapse; }
.store-light .stats-table th { text-align: left; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 14px; border-bottom: 1px solid var(--border); }
.store-light .stats-table td { padding: 14px; border-bottom: 1px solid var(--surface-muted); font-size: 0.85rem; }
.store-light .stats-table tr:hover { background: var(--surface-muted); cursor: pointer; }
```

### 요약 카드 (작품 관리용)

```css
.store-light .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
.store-light .summary-card { background: var(--surface); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-soft); display: grid; gap: 6px; }
.store-light .summary-card-value { font-size: 1.35rem; font-weight: 800; }
.store-light .summary-card-label { font-size: 0.78rem; color: var(--text-muted); }
```

---

## JS 수정 사항

`assets/store-redesign.js`에 추가:

1. `supported` 배열에 `my_library_pc.html`, `auth_pc.html`, `creator_dashboard_pc.html`, `author_dashboard_pc.html` 추가
2. `renderLibrary(data)` — 내 서재 렌더링
3. `renderAuth()` — 로그인/가입 폼 이벤트 바인딩 + Supabase Auth 호출
4. `renderCreatorDashboard()` — 작품 목록 렌더링
5. `renderAuthorDashboard()` — KPI + 테이블 렌더링
6. `hydrate()` 함수에 4개 페이지 라우팅 추가

---

## 수정 대상 파일

| 파일 | 변경 |
|------|------|
| `assets/styles.css` | `.store-light` 블록에 auth, progress, library 스타일 추가 |
| `assets/pc.css` | `.store-light` 블록에 creator-layout, kpi, table 스타일 추가 |
| `my_library_pc.html` | 전체 교체 |
| `auth_pc.html` | 전체 교체 |
| `creator_dashboard_pc.html` | 전체 교체 |
| `author_dashboard_pc.html` | 전체 교체 |
| `assets/store-redesign.js` | 4개 렌더러 함수 + hydrate 라우팅 추가 |

## 건드리지 않는 파일

- `homepage_pc.html`, `search_pc.html`, `novel_detail_pc.html`, `novel_viewer_pc.html` — 이미 완료
- `payment_pc.html`, `novel_upload_pc.html`, `episode_upload_pc.html` — 이미 완료
- `assets/app.js` — data-attribute 기반이므로 변경 불필요
- 모바일 페이지 — 비대상
