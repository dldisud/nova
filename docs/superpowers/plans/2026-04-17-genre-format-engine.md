# 장르 연출 서식 엔진 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 웹 뷰어에서 `[상태창:...]`, `[시스템:...]`, `[채팅:...]`, `[루비:...|...]` 4개 브래킷 문법을 인식해 스타일된 HTML 블록으로 렌더링하는 파서를 추가한다.

**Architecture:** `assets/format-blocks.js`(신규)에 순수 함수 `parseBlocks(body)`를 작성한다. `novel_viewer_pc.html`에 스크립트를 로드하고, `assets/app.js:720`의 기존 단락 렌더링 1줄을 `parseBlocks(body)` 호출로 교체한다. 스타일은 `assets/styles.css` 끝에 추가한다.

**Tech Stack:** Vanilla JS (ES5+), Node.js (테스트 실행), CSS

---

## 파일 구조

| 파일 | 역할 |
|------|------|
| `assets/format-blocks.js` (신규) | `parseBlocks()` 순수 함수 + 4개 블록 렌더러 |
| `assets/styles.css` (수정) | `.fmt-status`, `.fmt-system`, `.fmt-chat`, `ruby rt` 스타일 |
| `novel_viewer_pc.html` (수정) | `format-blocks.js` 스크립트 태그 추가 (74번째 줄 뒤) |
| `assets/app.js` (수정) | `renderViewer()` 720번째 줄 단락 렌더링 교체 |
| `tests/format-blocks.test.js` (신규) | Node.js 단위 테스트 |

---

### Task 1: CSS 스타일 추가

**Files:**
- Modify: `assets/styles.css` (파일 끝에 추가)

- [ ] **Step 1: styles.css 끝에 아래 CSS 블록 추가**

```css
/* === Genre Format Engine === */
ruby rt {
  font-size: 10px;
  color: rgba(240, 230, 211, 0.45);
  letter-spacing: 0.5px;
}

.fmt-status,
.fmt-system {
  background: rgba(10, 15, 20, 0.9);
  border: 1px solid rgba(80, 160, 255, 0.2);
  border-radius: 2px;
  padding: 16px 20px;
  position: relative;
  margin: 24px 0;
}

.fmt-status::before,
.fmt-status::after,
.fmt-system::before,
.fmt-system::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: rgba(80, 160, 255, 0.7);
  border-style: solid;
}

.fmt-status::before,
.fmt-system::before {
  top: -1px;
  left: -1px;
  border-width: 2px 0 0 2px;
}

.fmt-status::after,
.fmt-system::after {
  bottom: -1px;
  right: -1px;
  border-width: 0 2px 2px 0;
}

.fmt-status-header,
.fmt-system-header {
  font-size: 10px;
  letter-spacing: 3px;
  color: rgba(80, 160, 255, 0.7);
  text-transform: uppercase;
  margin-bottom: 10px;
  font-weight: 700;
}

.fmt-status-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
}

.fmt-k {
  font-size: 12px;
  color: rgba(80, 160, 255, 0.55);
}

.fmt-v {
  font-size: 13px;
  color: #c8dcff;
  font-weight: 700;
}

.fmt-system-body {
  font-size: 14px;
  color: rgba(200, 220, 255, 0.8);
  line-height: 22px;
}

.fmt-chat {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 6px;
  padding: 12px 16px;
  margin: 24px 0;
}

.fmt-chat-row {
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 3px 0;
}

.fmt-chat-user {
  font-size: 11px;
  color: rgba(80, 160, 255, 0.6);
  font-weight: 600;
  min-width: 60px;
  flex-shrink: 0;
}

.fmt-chat-msg {
  font-size: 13px;
  color: rgba(240, 230, 211, 0.7);
}
```

- [ ] **Step 2: 커밋**

```bash
git add assets/styles.css
git commit -m "style: Add genre format block CSS"
```

---

### Task 2: `format-blocks.js` 작성 + 전체 테스트

**Files:**
- Create: `assets/format-blocks.js`
- Create: `tests/format-blocks.test.js`

- [ ] **Step 1: 테스트 파일 먼저 작성**

`tests/format-blocks.test.js`:

```javascript
// Run: node tests/format-blocks.test.js
var assert = require('assert');

global.window = global;
require('../assets/format-blocks.js');
var parseBlocks = global.parseBlocks;

var passed = 0; var failed = 0;
function test(name, fn) {
  try { fn(); console.log('  PASS ' + name); passed++; }
  catch (e) { console.log('  FAIL ' + name + ': ' + e.message); failed++; }
}

// 루비
test('루비: 인라인 변환', function () {
  var r = parseBlocks('그는 [루비:천뢰섬|Heavenly Thunder Flash]을 시전했다.');
  assert(r.includes('<ruby>천뢰섬<rt>Heavenly Thunder Flash</rt></ruby>'), 'ruby 태그 없음');
});
test('루비: 여러 개 인라인', function () {
  var r = parseBlocks('[루비:A|B] 그리고 [루비:C|D]');
  assert(r.includes('<ruby>A<rt>B</rt></ruby>'), '첫 ruby 없음');
  assert(r.includes('<ruby>C<rt>D</rt></ruby>'), '두 번째 ruby 없음');
});

// 상태창
test('상태창: fmt-status 블록', function () {
  var r = parseBlocks('[상태창:이름=이강호|레벨=47]');
  assert(r.includes('class="fmt-status"'), 'fmt-status 없음');
  assert(r.includes('◤ STATUS WINDOW ◢'), '헤더 없음');
  assert(r.includes('이강호'), '값 없음');
  assert(r.includes('레벨'), '키 없음');
});

// 시스템
test('시스템: fmt-system 블록', function () {
  var r = parseBlocks('[시스템:퀘스트 완료 — 보상 1,200 골드]');
  assert(r.includes('class="fmt-system"'), 'fmt-system 없음');
  assert(r.includes('◤ SYSTEM ◢'), '헤더 없음');
  assert(r.includes('퀘스트 완료'), '본문 없음');
});

// 채팅
test('채팅: fmt-chat 블록', function () {
  var r = parseBlocks('[채팅:유저1=와 저거 뭐임|유저2=실화냐]');
  assert(r.includes('class="fmt-chat"'), 'fmt-chat 없음');
  assert(r.includes('유저1'), '유저명 없음');
  assert(r.includes('와 저거 뭐임'), '메시지 없음');
});

// 일반 텍스트
test('일반 텍스트: p 태그', function () {
  var r = parseBlocks('안녕하세요\n\n반갑습니다');
  assert(r.includes('<p>안녕하세요</p>'), '첫 p 없음');
  assert(r.includes('<p>반갑습니다</p>'), '두 번째 p 없음');
});

// 빈 입력
test('빈 입력: 빈 문자열', function () {
  assert.strictEqual(parseBlocks(''), '');
  assert.strictEqual(parseBlocks(null), '');
});

// XSS
test('XSS: 스크립트 이스케이프', function () {
  var r = parseBlocks('[루비:<script>alert(1)</script>|xss]');
  assert(!r.includes('<script>'), 'XSS 이스케이프 실패');
});

// 잘못된 문법 → 텍스트로 노출
test('잘못된 문법: 에러 없이 p 태그', function () {
  var r = parseBlocks('[상태창:닫는 괄호 없음');
  assert(r.includes('<p>'), 'p 태그 없음');
});

console.log('\n결과: ' + passed + ' 통과 / ' + failed + ' 실패');
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

```bash
node tests/format-blocks.test.js
```

Expected: `Cannot find module '../assets/format-blocks.js'` 오류

- [ ] **Step 3: `assets/format-blocks.js` 작성**

```javascript
(function (global) {
  function esc(v) {
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parseParams(str) {
    return str.split('|').map(function (pair) {
      var eq = pair.indexOf('=');
      if (eq === -1) return { key: '', value: pair.trim() };
      return { key: pair.slice(0, eq).trim(), value: pair.slice(eq + 1).trim() };
    });
  }

  function renderStatusBlock(para) {
    var content = para.slice('[상태창:'.length, -1);
    var rows = parseParams(content).map(function (p) {
      return '<div class="fmt-status-row"><span class="fmt-k">' + esc(p.key) +
        '</span><span class="fmt-v">' + esc(p.value) + '</span></div>';
    }).join('');
    return '<div class="fmt-status"><div class="fmt-status-header">◤ STATUS WINDOW ◢</div>' + rows + '</div>';
  }

  function renderSystemBlock(para) {
    var content = para.slice('[시스템:'.length, -1);
    return '<div class="fmt-system"><div class="fmt-system-header">◤ SYSTEM ◢</div>' +
      '<div class="fmt-system-body">' + esc(content) + '</div></div>';
  }

  function renderChatBlock(para) {
    var content = para.slice('[채팅:'.length, -1);
    var rows = parseParams(content).map(function (p) {
      return '<div class="fmt-chat-row"><span class="fmt-chat-user">' + esc(p.key) +
        '</span><span class="fmt-chat-msg">' + esc(p.value) + '</span></div>';
    }).join('');
    return '<div class="fmt-chat">' + rows + '</div>';
  }

  function parseBlocks(body) {
    if (!body) return '';

    var text = body.replace(/\[루비:([^\|]+)\|([^\]]+)\]/g, function (_, main, ruby) {
      return '<ruby>' + esc(main.trim()) + '<rt>' + esc(ruby.trim()) + '</rt></ruby>';
    });

    return text.split(/\n{2,}/).filter(Boolean).map(function (para) {
      var trimmed = para.trim();
      if (trimmed.startsWith('[상태창:') && trimmed.endsWith(']')) return renderStatusBlock(trimmed);
      if (trimmed.startsWith('[시스템:') && trimmed.endsWith(']')) return renderSystemBlock(trimmed);
      if (trimmed.startsWith('[채팅:') && trimmed.endsWith(']')) return renderChatBlock(trimmed);
      return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  global.parseBlocks = parseBlocks;
  if (typeof module !== 'undefined') module.exports = { parseBlocks: parseBlocks };
}(typeof window !== 'undefined' ? window : global));
```

- [ ] **Step 4: 테스트 실행 (전체 통과 확인)**

```bash
node tests/format-blocks.test.js
```

Expected:
```
  PASS 루비: 인라인 변환
  PASS 루비: 여러 개 인라인
  PASS 상태창: fmt-status 블록
  PASS 시스템: fmt-system 블록
  PASS 채팅: fmt-chat 블록
  PASS 일반 텍스트: p 태그
  PASS 빈 입력: 빈 문자열
  PASS XSS: 스크립트 이스케이프
  PASS 잘못된 문법: 에러 없이 p 태그

결과: 9 통과 / 0 실패
```

- [ ] **Step 5: 커밋**

```bash
git add assets/format-blocks.js tests/format-blocks.test.js
git commit -m "feat: Add parseBlocks() with all 4 block parsers"
```

---

### Task 3: 뷰어에 파서 연결

**Files:**
- Modify: `novel_viewer_pc.html:74`
- Modify: `assets/app.js:720`

- [ ] **Step 1: novel_viewer_pc.html 74번째 줄 뒤에 스크립트 태그 추가**

74번째 줄 (`<script src="https://cdn.jsdelivr.net/.../marked.min.js"></script>`) 뒤에 삽입:

```html
  <script src="assets/format-blocks.js"></script>
```

결과 (74~76번째 줄):
```html
  <script src="https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js"></script>
  <script src="assets/format-blocks.js"></script>
  <script src="assets/i18n.js"></script>
```

- [ ] **Step 2: app.js 720번째 줄 교체**

기존 (720번째 줄):
```javascript
    const articleHtml = body ? body.split(/\n{2,}/).filter(Boolean).map(function (paragraph) { return "<p>" + esc(paragraph).replace(/\n/g, "<br>") + "</p>"; }).join("") : "<p>이 회차는 구매 후 열람할 수 있습니다.</p><p>" + esc(selected.teaser || "") + "</p><p><a href='" + detailHref(novel.slug) + "'>작품 상세로 돌아가 구매 정보를 확인하세요.</a></p>";
```

교체 후:
```javascript
    const articleHtml = body ? parseBlocks(body) : "<p>이 회차는 구매 후 열람할 수 있습니다.</p><p>" + esc(selected.teaser || "") + "</p><p><a href='" + detailHref(novel.slug) + "'>작품 상세로 돌아가 구매 정보를 확인하세요.</a></p>";
```

- [ ] **Step 3: 브라우저 수동 검증**

Supabase에서 테스트 에피소드 body를 아래 내용으로 수정 후 뷰어에서 확인:

```
그 순간, 눈앞에 빛의 창이 열렸다.

[상태창:이름=이강호|레벨=47|직업=Shadow Blade|스킬=천뢰섬]

창이 닫히고, 그는 앞으로 걸음을 내딛었다.

[시스템:퀘스트 완료 — 보상 1,200 골드]

그는 [루비:천뢰섬|Heavenly Thunder Flash]을 시전했다.

[채팅:독자1=실화냐|독자2=ㄷㄷ|독자3=ㅋㅋㅋ]
```

확인 항목:
- 일반 본문이 기존과 동일하게 `<p>` 단락으로 보임
- 상태창이 파란 코너 박스로 렌더링됨
- 시스템 메시지가 `◤ SYSTEM ◢` 헤더와 함께 보임
- 루비가 기술명 위에 작은 글씨로 보임
- 채팅창이 유저명/메시지 열로 보임
- 모바일 375px에서 레이아웃 깨지지 않음

- [ ] **Step 4: 커밋**

```bash
git add novel_viewer_pc.html assets/app.js
git commit -m "feat: Wire parseBlocks() into web viewer"
```

---

## 셀프 리뷰

**스펙 커버리지:**
- [x] 루비 인라인 — Task 2
- [x] 상태창 블록 (게임 UI 코너 스타일) — Task 1 CSS + Task 2 JS
- [x] 시스템 메시지 블록 — Task 1 CSS + Task 2 JS
- [x] 채팅창 블록 — Task 1 CSS + Task 2 JS
- [x] 기존 콘텐츠 호환성 — Task 2 (일반 텍스트 + 잘못된 문법 테스트)
- [x] XSS 방어 — Task 2 (테스트 + `esc()`)
- [x] 뷰어 연결 — Task 3

**타입 일관성:**
- `parseBlocks(body: string): string` — Task 2 정의, Task 3에서 사용 ✓
- CSS 클래스명 `.fmt-status`, `.fmt-system`, `.fmt-chat` — Task 1 CSS ↔ Task 2 JS 일치 ✓
- `renderStatusBlock`, `renderSystemBlock`, `renderChatBlock` — Task 2 내부 전용 ✓
