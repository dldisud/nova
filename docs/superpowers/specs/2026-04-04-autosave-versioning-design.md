# 에피소드 자동저장 + 버전 관리 — Design Spec

## 목표

작가가 에피소드를 작성할 때 자동 스냅샷 저장 + 버전 히스토리 비교/복원 기능을 제공한다. 에디터를 Toast UI Editor WYSIWYG로 교체하고, 독자 뷰어에 마크다운 렌더링 + 복사 방지를 적용한다.

## 대상 사용자

작가만. 로그인 상태에서만 에디터 접근 가능.

## 디자인 결정 사항

| 항목 | 결정 |
|------|------|
| 에디터 | Toast UI Editor (CDN) WYSIWYG 기본 + 일반 textarea 토글 |
| 자동저장 타이밍 | debounce 5초 (타이핑 멈추면) + 최소 60초 보장 (변경 시) |
| 버전 관리 | 스냅샷 히스토리 + diff 비교 + 특정 버전 복원 |
| 스냅샷 저장 | Supabase (서버) + 실패 시 localStorage 폴백 (초안 1개) |
| 보존기간 | 무료 1주 / 유료 1달 (결제 연동은 나중, DB 필드만 준비) |
| 독자 뷰어 | 마크다운 → HTML 렌더링 결과만 표시 |
| 복사 방지 | user-select: none + 우클릭 차단 + 드래그 방지 |
| Diff 라이브러리 | diff-match-patch (CDN, ~15KB) |

## DB 변경

### 새 테이블: `episode_snapshots`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid, PK | auto-generated |
| `episode_id` | uuid, FK → episodes.id | 대상 에피소드 |
| `author_id` | uuid, FK → authors.id | 작성자 |
| `body` | text | 마크다운 원문 전체 |
| `label` | text, nullable | 작가가 붙인 이름 (없으면 null) |
| `created_at` | timestamptz, default now() | 스냅샷 생성 시각 |

RLS 정책: 작가 본인의 스냅샷만 SELECT/INSERT 가능.

### 기존 테이블 변경

`authors` 테이블에 `retention_tier` 컬럼 추가:
- 타입: `text`, default `'free'`
- 값: `'free'` (1주 보존) | `'pro'` (1달 보존)
- 결제 연동 전까지는 모두 `'free'`

### 만료 스냅샷 정리

Supabase cron (pg_cron) 또는 Edge Function으로 매일 1회 실행:
- `free` 작가: `created_at < now() - interval '7 days'` 삭제
- `pro` 작가: `created_at < now() - interval '30 days'` 삭제
- `label`이 있는 스냅샷은 삭제하지 않음 (이름 붙인 버전은 보존)

## 아키텍처

### 변경/생성 파일

| 파일 | 역할 | 변경 |
|------|------|------|
| `episode_upload_pc.html` | 에디터 페이지 | Toast UI Editor CDN 추가, UI 구조 교체 |
| `assets/episode-upload.js` | 에디터 로직 | 전면 교체: Toast UI 초기화, 모드 토글, 자동저장, 스냅샷 CRUD, diff 비교 |
| `assets/store-redesign.js` | 뷰어 렌더러 | renderViewer/renderMobileViewer에서 마크다운→HTML 변환 추가 |
| `assets/styles.css` | 스타일 | 스냅샷 패널, diff 하이라이트, 복사 방지 클래스 추가 |
| `novel_viewer_pc.html` | PC 뷰어 | 복사 방지 클래스/속성 추가 |
| `novel_viewer.html` | 모바일 뷰어 | 복사 방지 클래스/속성 추가 |
| Supabase migration | DB | episode_snapshots 테이블 + retention_tier 컬럼 |

### 건드리지 않는 파일

- 다른 PC/모바일 HTML 페이지들
- `assets/supabase-config.js`, `assets/supabase-live.js` — 변경 없음
- `assets/pc.css` — 변경 없음

## 에디터 상세

### Toast UI Editor 설정

CDN:
- `@toast-ui/editor` CSS + JS
- 한국어 locale

초기화 옵션:
- `el`: 에디터 컨테이너 div
- `initialEditType`: `'wysiwyg'`
- `previewStyle`: `'vertical'` (마크다운 모드 전환 시)
- `height`: `'500px'`
- `language`: `'ko-KR'`
- `toolbarItems`: 볼드, 이탤릭, 밑줄, 취소선, 구분선, 인용, 리스트 (소설 작성에 필요한 것만)
- `placeholder`: `'에피소드 내용을 작성하세요...'`

### 모드 토글

에디터 상단에 토글 버튼:
- **WYSIWYG 모드** (기본): Toast UI Editor
- **일반 텍스트 모드**: 순수 textarea (마크다운 문법 직접 입력)

전환 시 내용 동기화:
- WYSIWYG → textarea: `editor.getMarkdown()` 값을 textarea에 설정
- textarea → WYSIWYG: textarea 값을 `editor.setMarkdown()`으로 설정

### 자동저장 로직

```
let lastSavedBody = "";
let debounceTimer = null;
let intervalTimer = null;

function onContentChange() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(saveSnapshot, 5000);  // 5초 debounce
}

// 60초 interval (변경 있을 때만)
intervalTimer = setInterval(() => {
  const current = getEditorContent();
  if (current !== lastSavedBody) saveSnapshot();
}, 60000);

async function saveSnapshot() {
  const body = getEditorContent();
  if (body === lastSavedBody) return;  // 변경 없으면 skip

  try {
    await supabaseInsert("episode_snapshots", { episode_id, author_id, body });
    lastSavedBody = body;
    showSaveIndicator("저장됨");
  } catch (e) {
    localStorage.setItem("inkroad_draft_" + episode_id, body);
    showSaveIndicator("오프라인 저장됨");
  }
}
```

### 저장 상태 인디케이터

에디터 상단 우측에 작은 텍스트:
- "저장됨" (체크 아이콘 + 시간) — 마지막 저장 성공
- "저장 중..." — 저장 진행
- "오프라인 저장됨" (경고 아이콘) — localStorage 폴백
- "변경사항 있음" — 아직 저장 안 된 변경

## 스냅샷 패널

에디터 우측 사이드바 (토글 가능):

### 목록
- 최신순 타임스탬프 리스트
- label 있으면 이름 표시, 없으면 "오후 3:24" 형식
- 각 항목에 "복원" / "비교" / "이름 붙이기" 버튼

### Diff 비교
- diff-match-patch (CDN) 사용
- 현재 에디터 내용 vs 선택한 스냅샷
- 추가: 초록 배경 / 삭제: 빨강 배경
- 모달 또는 사이드바 내 인라인 표시

### 복원
- 선택한 스냅샷의 body를 에디터에 로드
- 복원 전 확인 다이얼로그: "현재 내용을 이 버전으로 교체합니다. 계속할까요?"
- 복원 시 현재 내용도 자동 스냅샷 생성 (실수로 복원해도 되돌릴 수 있게)

### 이름 붙이기
- label 필드에 텍스트 저장
- label 있는 스냅샷은 만료 정리에서 제외 (영구 보존)

## 독자 뷰어 변경

### 마크다운 렌더링

현재 `episode_contents.body`에 저장된 텍스트를 렌더링할 때:
- 기존: 인라인 마크업 (`**bold**` 등) 간이 변환
- 변경: Toast UI Editor의 Viewer 컴포넌트 또는 marked.js (CDN, ~8KB)로 정식 마크다운→HTML 변환

PC 뷰어(`renderViewer`)와 모바일 뷰어(`renderMobileViewer`) 모두 적용.

### 복사 방지

뷰어 본문 영역에 적용:

CSS:
```css
.store-light .reader-protected {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
```

JS:
```javascript
// 우클릭 차단
el.addEventListener("contextmenu", e => e.preventDefault());
// 드래그 차단
el.addEventListener("dragstart", e => e.preventDefault());
// 텍스트 선택 차단
el.addEventListener("selectstart", e => e.preventDefault());
```

PC(`novel_viewer_pc.html`)와 모바일(`novel_viewer.html`) 모두 적용.

## 에피소드 발행 흐름 변경

현재:
```
작성 → "발행" 클릭 → RPC create_episode_for_author_novel → 완료
```

변경:
```
작성 → 자동 스냅샷 저장 (반복)
     → "발행" 클릭 → episode_contents.body 업데이트 (마크다운 원문)
                    → 최종 스냅샷 생성 (label: "발행됨")
                    → 완료
```

기존 RPC를 수정하거나, REST API로 직접 episode_contents.body를 UPDATE.

## 디자인 토큰

기존 `.store-light` 토큰 그대로 재활용. 추가 색상:
- diff 추가: `--diff-add: #e6ffec` (연초록)
- diff 삭제: `--diff-del: #ffebe9` (연빨강)
- 저장 인디케이터: `--accent-free` (초록, 저장 성공) / `--accent-sale` (주황, 경고)
