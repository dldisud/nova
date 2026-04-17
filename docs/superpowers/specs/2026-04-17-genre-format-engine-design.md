# 장르 연출 서식 엔진 — 설계 문서

**날짜**: 2026-04-17  
**범위**: 웹 뷰어 (1차) — `novel_viewer_pc.html` + `assets/app.js` + `assets/styles.css`  
**원칙**: 기본 본문은 평범하게, 특수 연출은 이벤트성으로, 작가가 쉽게 쓸 수 있게

---

## 목표

웹소설 뷰어에서 장르 연출(상태창, 루비 텍스트, 시스템 메시지, 채팅창)을 지원하는 블록 파서를 추가한다. 작가가 간단한 브래킷 문법으로 입력하면 뷰어가 자동으로 스타일된 블록으로 변환한다.

---

## 아키텍처

### 파이프라인

```
DB body 텍스트 (Supabase episode_contents.body)
  → parseBlocks(body)
    → 인라인 패턴 먼저 치환 ([루비:...])
    → 단락 단위로 분리
    → 각 단락에서 블록 패턴 감지 ([상태창:...], [시스템:...], [채팅:...])
    → HTML 문자열 생성
  → article.innerHTML 삽입
```

### 변경 파일

- `assets/app.js` — `renderViewer()` 내 본문 렌더링 로직 교체
- `assets/styles.css` — 블록 스타일 클래스 추가

에디터(TOAST UI), DB 스키마, 기존 콘텐츠 변경 없음.

---

## 블록 스펙 (1차)

### 1. 루비 — 인라인

**문법**
```
[루비:천뢰섬|Heavenly Thunder Flash]
[루비:붕괴진|崩壞陣]
```

**출력 HTML**
```html
<ruby>천뢰섬<rt>Heavenly Thunder Flash</rt></ruby>
```

**스타일**
- `ruby`: 기본 본문 폰트/색상 유지
- `rt`: font-size 10px, color `rgba(240,230,211,0.45)`, letter-spacing 0.5px
- 인라인 요소 — 문장 중간 삽입 가능

**제약**
- 단락 내 여러 개 사용 가능
- 블록 타입과 같은 줄에 쓰면 안 됨 (블록 파서가 우선)

---

### 2. 상태창 — 블록

**문법**
```
[상태창:이름=이강호|레벨=47|직업=Shadow Blade|스킬=천뢰섬]
```

**출력 HTML**
```html
<div class="fmt-status">
  <div class="fmt-status-header">◤ STATUS WINDOW ◢</div>
  <div class="fmt-status-row"><span class="fmt-k">이름</span><span class="fmt-v">이강호</span></div>
  <div class="fmt-status-row"><span class="fmt-k">레벨</span><span class="fmt-v">47</span></div>
  ...
</div>
```

**스타일** (게임 UI 코너)
- border: `1px solid rgba(80,160,255,0.2)`, border-radius: 2px
- 모서리 장식: `::before` / `::after` pseudo-element, 파란 8px L자
- 헤더: 10px, letter-spacing 3px, `rgba(80,160,255,0.7)`, uppercase
- 키: 12px, `rgba(80,160,255,0.55)`
- 값: 13px, `#c8dcff`, font-weight 700
- 블록 전후 margin: 24px

---

### 3. 시스템 메시지 — 블록

**문법**
```
[시스템:퀘스트 완료 — 보상 1,200 골드]
[시스템:경고 — 마나 잔량 12% 이하]
```

**출력 HTML**
```html
<div class="fmt-system">
  <div class="fmt-system-header">◤ SYSTEM ◢</div>
  <div class="fmt-system-body">퀘스트 완료 — 보상 1,200 골드</div>
</div>
```

**스타일**
- 상태창과 같은 코너 스타일
- 헤더 고정: `◤ SYSTEM ◢`
- 본문: 14px, `rgba(200,220,255,0.8)`, line-height 22px

---

### 4. 채팅창 — 블록

**문법**
```
[채팅:유저1=와 저거 뭐임|유저2=실화냐|유저3=ㅋㅋㅋ]
```

**출력 HTML**
```html
<div class="fmt-chat">
  <div class="fmt-chat-row">
    <span class="fmt-chat-user">유저1</span>
    <span class="fmt-chat-msg">와 저거 뭐임</span>
  </div>
  ...
</div>
```

**스타일**
- 배경: `rgba(255,255,255,0.03)`, border: `1px solid rgba(255,255,255,0.07)`
- border-radius: 6px, padding: 12px 16px
- 유저명: 11px, `rgba(80,160,255,0.6)`, font-weight 600, min-width 60px
- 메시지: 13px, `rgba(240,230,211,0.7)`
- 행 간격: 6px

---

## 파서 구현 규칙

1. **인라인 먼저**: `[루비:...]` 는 단락 분리 전에 전체 텍스트에서 치환
2. **블록 감지**: 단락이 `[상태창:`, `[시스템:`, `[채팅:` 으로 시작하면 블록으로 처리
3. **나머지**: 기존처럼 `<p>` 태그로 감싸고 HTML 이스케이프 적용
4. **XSS 방어**: 모든 작가 입력값은 `esc()` 함수로 이스케이프 후 삽입

---

## 범위 밖 (2차 이후)

- 에디터 툴바 버튼 (자동 문법 삽입)
- 회상 블록, 기사문 블록, 경고문 블록
- 모바일 앱(RN) 렌더러
- 툴팁/접기 기능
- 애니메이션 효과

---

## 성공 기준

- 기존 콘텐츠(블록 문법 없는 일반 텍스트)가 깨지지 않음
- 4개 블록 타입이 올바르게 렌더링됨
- 모바일 웹(375px)에서 레이아웃 깨지지 않음
- 잘못된 문법 입력 시 그냥 텍스트로 노출 (에러 없음)
