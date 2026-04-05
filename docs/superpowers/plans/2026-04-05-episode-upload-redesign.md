# Episode Upload PC Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `episode_upload_pc.html` to match the "Clean Light Store" aesthetic and the standard creator layout.

**Architecture:** We will replace the current HTML structure of `episode_upload_pc.html` with a 3-column-like `creator-layout` (Sidebar + Main [Editor + Right Panel]). We'll add some targeted CSS to `pc.css` for the right panel's tab system, and a small inline JS snippet for tab switching. No data attributes or existing logic in `episode-upload.js` will be broken.

**Tech Stack:** HTML, CSS (Vanilla), Vanilla JS.

---

## Task 1: CSS Updates for Tab System

**Files:**
- Modify: `assets/pc.css`

- [ ] **Step 1: Append new styles for `creator-panel-tabs` to `pc.css`**

Add the following CSS at the bottom of `assets/pc.css` (inside the `/* --- Creator layout --- */` section or at the very end):

```css

/* --- Creator Episode Upload Specifics --- */
.store-light .creator-episode-workspace {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

.store-light .creator-episode-editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0; /* prevent blowout */
}

.store-light .creator-episode-panel-area {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 24px;
}

.store-light .creator-panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
}

.store-light .creator-panel-tab {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  font-size: 0.9rem;
}

.store-light .creator-panel-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.store-light .creator-panel-content {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
}

.store-light .episode-work-thumb {
  width: 80px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background: var(--surface-muted);
}

.store-light .episode-work-thumb img {
  width: 100%;
  height: auto;
  display: block;
}

.store-light .episode-work-info {
  flex: 1;
  min-width: 0;
}

.store-light .episode-work-info h3 {
  margin: 0 0 8px;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}

.store-light .episode-work-info p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
}

@media (max-width: 1120px) {
  .store-light .creator-episode-workspace {
    flex-direction: column;
  }
  .store-light .creator-episode-panel-area {
    width: 100%;
    position: static;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add assets/pc.css
git commit -m "style: add layout css for episode upload redesign"
```

## Task 2: Replace HTML Structure of `episode_upload_pc.html`

**Files:**
- Modify: `episode_upload_pc.html`

- [ ] **Step 1: Replace the entire content of `episode_upload_pc.html`**

Write the following fully redesigned HTML. It preserves all `data-*` attributes for `episode-upload.js`.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>INKROAD | 회차 추가</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0" rel="stylesheet">
  <link rel="stylesheet" href="assets/styles.css">
  <link rel="stylesheet" href="assets/pc.css">
  <link rel="stylesheet" href="https://uicdn.toast.com/editor/latest/toastui-editor.min.css">
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
        <a class="creator-nav-link" href="author_dashboard_pc.html">
          <span class="material-symbols-outlined">bar_chart</span> 통계
        </a>
        <a class="creator-nav-link" href="novel_upload_pc.html">
          <span class="material-symbols-outlined">add_circle</span> 작품 등록
        </a>
        <a class="creator-nav-link active" href="episode_upload_pc.html">
          <span class="material-symbols-outlined">upload</span> 회차 발행
        </a>
      </nav>
      <div class="creator-sidebar-footer">
        <div data-lang-picker></div>
        <a href="homepage_pc.html">← 스토어로 돌아가기</a>
      </div>
    </aside>

    <main class="creator-main">
      <div class="creator-main-head">
        <h1 class="creator-main-title">회차 발행</h1>
        <button class="button primary" type="submit" form="episode-form" data-episode-submit disabled>발행하기</button>
      </div>

      <header class="workspace-head" data-reveal>
        <div class="workspace-head-copy">
          <span class="eyebrow">크리에이터 스튜디오</span>
          <span class="workspace-mode-badge" data-episode-mode-badge>새 회차 발행</span>
          <h1 class="workspace-title" data-episode-page-title>기존 작품에 다음 회차를 이어서 발행합니다</h1>
          <p class="workspace-subtitle" data-episode-page-subtitle>작품을 고르면 다음 회차 번호가 자동으로 이어지고, 무료 공개인지 회차 구매인지까지 함께 저장됩니다.</p>
        </div>
        <div class="workspace-meta">
          <div class="workspace-stat">
            <span class="stat-label">이번 작업</span>
            <strong>다음 화 발행</strong>
          </div>
          <div class="workspace-stat">
            <span class="stat-label">발행 결과</span>
            <strong>상세·뷰어 반영</strong>
          </div>
        </div>
      </header>

      <section class="auth-shell" data-episode-auth></section>

      <section class="episode-empty" data-episode-empty hidden></section>

      <form id="episode-form" data-episode-form hidden>
        <div class="creator-episode-workspace">
          <!-- 에디터 영역 (70%) -->
          <div class="creator-episode-editor-area">
            <div class="upload-meta-grid">
              <label class="upload-field">
                <span>작품 선택</span>
                <select data-episode-novel required></select>
              </label>
              <label class="upload-field">
                <span>공개 방식</span>
                <select data-episode-access>
                  <option value="free">무료 공개</option>
                  <option value="paid">회차 구매</option>
                </select>
              </label>
            </div>

            <div class="upload-meta-grid">
              <label class="upload-field">
                <span>다음 회차 제목</span>
                <input type="text" data-episode-title placeholder="예: 제 2화. 금서가 움직이는 밤" required>
              </label>
              <label class="upload-field" data-episode-price-wrap hidden>
                <span>회차 가격</span>
                <input type="number" min="0" step="10" value="100" data-episode-price placeholder="100">
              </label>
            </div>

            <div class="episode-edit-meta" data-episode-edit-meta hidden>
              <div class="episode-edit-meta-title">수정 대상 회차 정보</div>
              <div class="episode-edit-meta-row">
                <span>회차 번호</span>
                <strong data-episode-edit-number>-</strong>
              </div>
            </div>

            <!-- Toast UI Editor -->
            <div class="episode-main">
              <div class="editor-shell">
                <div class="editor-toolbar-custom">
                  <div class="editor-toolbar-left">
                    <button class="button small ghost" type="button" data-mode-toggle="wysiwyg" data-active="true">위지윅</button>
                    <button class="button small ghost" type="button" data-mode-toggle="markdown" data-active="false">마크다운</button>
                  </div>
                  <div class="editor-toolbar-right">
                    <span class="editor-save-status" data-save-status>변경사항 없음</span>
                    <button class="button small ghost" type="button" data-snapshot-toggle>버전 역사</button>
                  </div>
                </div>
                <div class="editor-wrap" data-editor-wrap></div>
                <input type="hidden" data-episode-content required>
              </div>

              <aside class="snapshot-panel" data-snapshot-panel hidden>
                <div class="snapshot-panel-head">
                  <span class="eyebrow">버전 역사</span>
                  <button class="snapshot-panel-close" type="button" data-snapshot-close>&times;</button>
                </div>
                <div class="diff-view" data-diff-view hidden></div>
                <div class="snapshot-list" data-snapshot-list>
                  <p class="snapshot-list-empty" data-i18n="editor.no_snapshots">저장된 스냅샷이 없습니다.</p>
                </div>
              </aside>
            </div>
          </div>

          <!-- 우측 설정 패널 (30%) -->
          <div class="creator-episode-panel-area">
            <div class="creator-panel-tabs">
              <div class="creator-panel-tab active" data-tab-target="info">설정 및 정보</div>
              <div class="creator-panel-tab" data-tab-target="list">회차 목록</div>
            </div>

            <!-- 탭 콘텐츠: 설정 및 정보 -->
            <div class="creator-panel-content" id="tab-content-info">
              <div class="episode-work-card" data-selected-work>
                <div style="display: flex; gap: 16px;">
                  <div class="episode-work-thumb">
                    <img src="https://placehold.co/320x440/111827/f3f4f6?text=InkRoad" alt="선택한 작품 표지" data-selected-work-image>
                  </div>
                  <div class="episode-work-info">
                    <span class="eyebrow" data-i18n="editor.selected_work">선택한 작품</span>
                    <h3 data-selected-work-title data-i18n="editor.select_prompt">작품을 골라주세요</h3>
                    <p data-selected-work-summary>작품 목록 기준으로 채워집니다.</p>
                  </div>
                </div>
                <div class="episode-meta-row" data-selected-work-meta>
                  <span class="episode-chip">작품 선택 대기</span>
                </div>
                <div class="episode-tag-row" data-selected-work-tags>
                  <span class="episode-chip">태그 없음</span>
                </div>
              </div>

              <div class="episode-work-copy" style="background: #f8f9fa; padding: 16px; border-radius: 6px;">
                <span class="eyebrow" data-i18n="editor.guide_title">발행 안내</span>
                <p class="episode-helper" style="font-size: 0.85rem; color: #6b7280; line-height: 1.5; margin: 8px 0 0;">
                  무료 회차면 가격은 자동으로 0원이 되고, 유료 회차면 입력한 가격이 함께 저장됩니다.<br><br>
                  발행이 끝나면 방금 쓴 회차의 읽기 화면으로 바로 이동합니다.
                </p>
              </div>
            </div>

            <!-- 탭 콘텐츠: 회차 목록 -->
            <div class="creator-panel-content" id="tab-content-list" style="display: none;">
              <section class="episode-index-shell" style="border: none; background: transparent; box-shadow: none; padding: 0;">
                <div class="episode-index-head">
                  <span class="eyebrow">전체 회차 관리</span>
                  <strong class="episode-index-count" data-episode-index-count>0화</strong>
                </div>
                <div class="episode-index-filters" data-episode-filter-bar style="flex-wrap: wrap; gap: 4px;">
                  <button class="button ghost small" type="button" data-episode-filter="all" data-active="true" aria-pressed="true">전체</button>
                  <button class="button ghost small" type="button" data-episode-filter="published" data-active="false" aria-pressed="false">공개중</button>
                  <button class="button ghost small" type="button" data-episode-filter="hidden" data-active="false" aria-pressed="false">숨김</button>
                  <button class="button ghost small" type="button" data-episode-filter="trashed" data-active="false" aria-pressed="false">휴지통</button>
                </div>
                <div class="episode-index-summary" data-episode-summary-row style="flex-wrap: wrap;">
                  <span class="episode-chip" data-episode-summary-published>공개중 0화</span>
                  <span class="episode-chip" data-episode-summary-hidden>숨김 0화</span>
                  <span class="episode-chip" data-episode-summary-trashed>휴지통 0화</span>
                </div>
                <div class="episode-index-bulk-actions" data-episode-bulk-actions hidden>
                  <button class="button secondary small" type="button" data-episode-restore-all>전체 복원</button>
                  <button class="button ghost small" type="button" data-episode-purge>비우기</button>
                </div>
                <div class="episode-index-list" data-episode-index-list></div>
                <p class="episode-index-empty" data-episode-index-empty hidden>선택한 작품의 회차가 표시됩니다.</p>
              </section>
            </div>
          </div>
        </div>
      </form>
    </main>
  </div>

  <script>
    // Tab switching logic for the right panel
    document.addEventListener("DOMContentLoaded", function() {
      var tabs = document.querySelectorAll(".creator-panel-tab");
      var infoContent = document.getElementById("tab-content-info");
      var listContent = document.getElementById("tab-content-list");

      tabs.forEach(function(tab) {
        tab.addEventListener("click", function() {
          tabs.forEach(function(t) { t.classList.remove("active"); });
          this.classList.add("active");
          
          if (this.dataset.tabTarget === "info") {
            infoContent.style.display = "flex";
            listContent.style.display = "none";
          } else {
            infoContent.style.display = "none";
            listContent.style.display = "flex";
          }
        });
      });
    });
  </script>
  
  <script src="assets/i18n.js"></script>
  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="assets/supabase-live.js"></script>
  <script src="https://uicdn.toast.com/editor/latest/toastui-editor-all.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/diff-match-patch@1.0.5/index.js"></script>
  <script src="assets/episode-upload.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify in browser**

Run: Open `episode_upload_pc.html` in browser and log in.
Expected:
1. It shows the `creator-layout` with sidebar.
2. The tab switching works (Info <-> List).
3. The Toast UI editor loads.
4. Selecting a novel populates both the Info tab (thumbnail, title) and the List tab (previous episodes).

- [ ] **Step 3: Commit**

```bash
git add episode_upload_pc.html
git commit -m "feat: redesign episode upload layout to clean light store style"
```
