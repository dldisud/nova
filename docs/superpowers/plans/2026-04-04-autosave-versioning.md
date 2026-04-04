# 에피소드 자동저장 + 버전 관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 에피소드 에디터에 자동 스냅샷 저장, 버전 히스토리/diff/복원, Toast UI WYSIWYG 에디터, 뷰어 마크다운 렌더링 + 복사 방지를 구현한다.

**Architecture:** episode_upload_pc.html의 에디터를 Toast UI Editor로 교체하고, episode-upload.js에 자동저장+스냅샷 CRUD+diff 로직을 추가한다. store-redesign.js의 뷰어 렌더러에서 marked.js로 마크다운→HTML 변환하고, 뷰어 HTML에 복사 방지를 적용한다.

**Tech Stack:** Toast UI Editor (CDN), marked.js (CDN), diff-match-patch (CDN), Supabase (PostgreSQL + REST + Auth)

---

## Task 1: Supabase DB Migration

**Files:** None (SQL executed via Supabase MCP tool)

Run the following SQL using `mcp__467e801e-62ae-4f4b-a08e-1b4761d85205__execute_sql`:

- [ ] **1-1.** Create `episode_snapshots` table and add `retention_tier` to `authors`

```sql
-- Create episode_snapshots table
CREATE TABLE IF NOT EXISTS episode_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  body text NOT NULL,
  label text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_episode_snapshots_episode ON episode_snapshots(episode_id, created_at DESC);
CREATE INDEX idx_episode_snapshots_author ON episode_snapshots(author_id, created_at DESC);

-- Add retention_tier to authors
ALTER TABLE authors ADD COLUMN IF NOT EXISTS retention_tier text DEFAULT 'free';
```

- [ ] **1-2.** Enable RLS and add policies

```sql
ALTER TABLE episode_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view own snapshots"
  ON episode_snapshots FOR SELECT
  USING (author_id IN (
    SELECT id FROM authors WHERE user_id = auth.uid()
  ));

CREATE POLICY "Authors can insert own snapshots"
  ON episode_snapshots FOR INSERT
  WITH CHECK (author_id IN (
    SELECT id FROM authors WHERE user_id = auth.uid()
  ));

CREATE POLICY "Authors can update own snapshot labels"
  ON episode_snapshots FOR UPDATE
  USING (author_id IN (
    SELECT id FROM authors WHERE user_id = auth.uid()
  ))
  WITH CHECK (author_id IN (
    SELECT id FROM authors WHERE user_id = auth.uid()
  ));
```

---

## Task 2: CSS Additions to styles.css

**Files:** `D:/nova/assets/styles.css`

- [ ] **2-1.** Append the following block at the very end of `assets/styles.css`:

```css
/* ===== Autosave + Versioning ===== */

.store-light {
  --diff-add: #e6ffec;
  --diff-del: #ffebe9;
}

/* Editor mode toggle */
.store-light .editor-mode-toggle {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.store-light .editor-mode-toggle button {
  padding: 7px 16px;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.store-light .editor-mode-toggle button[aria-pressed="true"] {
  background: var(--dark);
  color: var(--text);
}

.store-light .editor-mode-toggle button:hover:not([aria-pressed="true"]) {
  background: var(--surface);
}

/* Editor container (Toast UI wrapper) */
.store-light .editor-container {
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  min-height: 480px;
}

.store-light .editor-container .toastui-editor-defaultUI {
  border: 0;
}

/* Fallback textarea when in text mode */
.store-light .editor-textarea-fallback {
  width: 100%;
  min-height: 480px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  line-height: 1.95;
  resize: vertical;
}

.store-light .editor-textarea-fallback:focus {
  outline: none;
  border-color: var(--dark);
  box-shadow: 0 0 0 2px rgba(0,0,0,0.06);
}

/* Save status indicator */
.store-light .editor-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--text-muted);
  padding: 4px 0;
}

.store-light .editor-status[data-save-state="saved"] {
  color: #16a34a;
}

.store-light .editor-status[data-save-state="saving"] {
  color: var(--text-secondary);
}

.store-light .editor-status[data-save-state="offline"] {
  color: #d97706;
}

.store-light .editor-status[data-save-state="unsaved"] {
  color: var(--text-muted);
}

/* Snapshot panel (right sidebar) */
.store-light .snapshot-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  height: 100vh;
  background: var(--bg);
  border-left: 1px solid var(--border);
  box-shadow: -4px 0 24px rgba(0,0,0,0.08);
  z-index: 900;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.25s ease;
}

.store-light .snapshot-panel[data-open="true"] {
  transform: translateX(0);
}

.store-light .snapshot-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.store-light .snapshot-panel-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
}

.store-light .snapshot-panel-close {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px;
}

/* Snapshot list */
.store-light .snapshot-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.store-light .snapshot-list-empty {
  text-align: center;
  color: var(--text-muted);
  padding: 40px 16px;
  font-size: 0.88rem;
}

/* Snapshot item */
.store-light .snapshot-item {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 8px;
  background: var(--surface);
}

.store-light .snapshot-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.store-light .snapshot-item-time {
  font-size: 0.82rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Snapshot label badge */
.store-light .snapshot-label {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  background: var(--dark);
  color: var(--bg);
}

.store-light .snapshot-item-actions {
  display: flex;
  gap: 6px;
}

.store-light .snapshot-item-actions button {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  color: var(--text-secondary);
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.store-light .snapshot-item-actions button:hover {
  background: var(--dark);
  color: var(--bg);
  border-color: var(--dark);
}

/* Diff view */
.store-light .diff-view {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  font-size: 0.88rem;
  line-height: 1.7;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 12px;
}

.store-light .diff-add {
  background: var(--diff-add);
  text-decoration: none;
}

.store-light .diff-del {
  background: var(--diff-del);
  text-decoration: line-through;
}

/* Reader copy protection */
.store-light .reader-protected {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
```

---

## Task 3: episode_upload_pc.html Restructure

**Files:** `D:/nova/episode_upload_pc.html`

- [ ] **3-1.** Add Toast UI Editor CSS to `<head>` (insert right before the closing `</style>` tag's `</head>`).

Find this block:

```html
  <link rel="stylesheet" href="assets/styles.css">
  <link rel="stylesheet" href="assets/pc.css">
```

Replace with:

```html
  <link rel="stylesheet" href="assets/styles.css">
  <link rel="stylesheet" href="assets/pc.css">
  <link rel="stylesheet" href="https://uicdn.toast.com/editor/latest/toastui-editor.min.css">
```

- [ ] **3-2.** Replace the editor area inside `<section class="episode-main">`. Find this exact block (the toolbar, textarea label, and preview):

```html
          <div class="episode-status" data-episode-status hidden></div>

          <div class="episode-toolbar">
            <button type="button" data-episode-format="bold" title="굵게"><b>B</b></button>
            <button type="button" data-episode-format="italic" title="기울임"><i>I</i></button>
            <button type="button" data-episode-format="underline" title="밑줄"><u>U</u></button>
            <button type="button" data-episode-format="break" title="장면 전환">
              <span class="material-symbols-outlined">short_text</span>
            </button>
            <button type="button" data-episode-preview-toggle title="미리보기">
              <span class="material-symbols-outlined">preview</span>
            </button>
          </div>

          <label class="episode-label" style="gap: 12px;">
            <span>회차 본문</span>
            <textarea data-episode-body placeholder="여기에 다음 회차 본문을 입력하세요." required></textarea>
          </label>
          <article class="episode-preview" data-episode-preview hidden></article>
```

Replace with:

```html
          <div class="episode-status" data-episode-status hidden></div>

          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div class="editor-mode-toggle" data-editor-mode-toggle>
              <button type="button" data-mode="wysiwyg" aria-pressed="true">WYSIWYG</button>
              <button type="button" data-mode="text" aria-pressed="false">텍스트</button>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <span class="editor-status" data-editor-status></span>
              <button class="button ghost small" type="button" data-snapshot-toggle title="버전 히스토리">
                <span class="material-symbols-outlined">history</span> 히스토리
              </button>
            </div>
          </div>

          <div class="editor-container" data-editor-container></div>
          <textarea class="editor-textarea-fallback" data-episode-body placeholder="마크다운 문법으로 작성하세요. **굵게**, *기울임*, *** (장면 전환)" hidden></textarea>
```

- [ ] **3-3.** Add the snapshot panel markup right before the closing `</form>`. Find:

```html
        </section>
      </form>
```

Replace with:

```html
        </section>
      </form>

      <aside class="snapshot-panel" data-snapshot-panel>
        <div class="snapshot-panel-header">
          <h3>버전 히스토리</h3>
          <button class="snapshot-panel-close" type="button" data-snapshot-close>&times;</button>
        </div>
        <div class="diff-view" data-diff-view hidden></div>
        <div class="snapshot-list" data-snapshot-list>
          <p class="snapshot-list-empty">저장된 스냅샷이 없습니다.</p>
        </div>
      </aside>
```

- [ ] **3-4.** Add CDN scripts. Find:

```html
  <script src="assets/supabase-live.js"></script>
  <script src="assets/episode-upload.js"></script>
```

Replace with:

```html
  <script src="assets/supabase-live.js"></script>
  <script src="https://uicdn.toast.com/editor/latest/toastui-editor-all.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/diff-match-patch/1.0.5/diff_match_patch.min.js"></script>
  <script src="assets/episode-upload.js"></script>
```

---

## Task 4: episode-upload.js Full Rewrite

**Files:** `D:/nova/assets/episode-upload.js`

- [ ] **4-1.** Replace the entire contents of `assets/episode-upload.js` with the following:

```javascript
(function () {
  var page = window.location.pathname.split("/").pop() || "";
  if (page !== "episode_upload_pc.html") return;

  var cfg = window.inkroadSupabaseConfig || {};
  var base = (cfg.url || "").replace(/\/$/, "");
  var key = cfg.publishableKey || cfg.anonKey || "";
  var query = new URLSearchParams(window.location.search);
  var storageKeys = {
    session: "inkroad-supabase-auth",
    accessToken: "inkroad-supabase-access-token"
  };

  var state = {
    client: null,
    session: null,
    authorId: null,
    works: [],
    selectedSlug: query.get("slug") || "",
    busy: false,
    editor: null,
    editorMode: "wysiwyg",
    lastSavedBody: "",
    debounceTimer: null,
    intervalTimer: null,
    snapshots: []
  };

  var refs = {
    authShell: document.querySelector("[data-episode-auth]"),
    empty: document.querySelector("[data-episode-empty]"),
    form: document.querySelector("[data-episode-form]"),
    novelSelect: document.querySelector("[data-episode-novel]"),
    accessSelect: document.querySelector("[data-episode-access]"),
    priceWrap: document.querySelector("[data-episode-price-wrap]"),
    priceInput: document.querySelector("[data-episode-price]"),
    titleInput: document.querySelector("[data-episode-title]"),
    bodyInput: document.querySelector("[data-episode-body]"),
    editorContainer: document.querySelector("[data-editor-container]"),
    editorStatus: document.querySelector("[data-editor-status]"),
    modeToggle: document.querySelector("[data-editor-mode-toggle]"),
    snapshotToggle: document.querySelector("[data-snapshot-toggle]"),
    snapshotPanel: document.querySelector("[data-snapshot-panel]"),
    snapshotClose: document.querySelector("[data-snapshot-close]"),
    snapshotList: document.querySelector("[data-snapshot-list]"),
    diffView: document.querySelector("[data-diff-view]"),
    status: document.querySelector("[data-episode-status]"),
    submitButtons: Array.from(document.querySelectorAll("[data-episode-submit]")),
    selectedImage: document.querySelector("[data-selected-work-image]"),
    selectedTitle: document.querySelector("[data-selected-work-title]"),
    selectedSummary: document.querySelector("[data-selected-work-summary]"),
    selectedMeta: document.querySelector("[data-selected-work-meta]"),
    selectedTags: document.querySelector("[data-selected-work-tags]")
  };

  /* ── Helpers ── */

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCount(value) {
    return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
  }

  function summary(work) {
    return work.shortDescription || "작품 소개가 아직 짧게 정리되지 않았습니다.";
  }

  function cover(work) {
    return work.coverUrl || "https://placehold.co/320x440/111827/f3f4f6?text=" + encodeURIComponent(work.title || "InkRoad");
  }

  function statusLabel(st) {
    var labels = { serializing: "연재 중", completed: "완결", draft: "작성 중", hiatus: "휴재" };
    return labels[st] || "정리 중";
  }

  function viewerHref(slug, episodeNumber) {
    return "novel_viewer_pc.html?slug=" + encodeURIComponent(slug) + "&episode=" + encodeURIComponent(episodeNumber || 1);
  }

  function rememberAccessToken(session) {
    if (session && session.access_token) {
      localStorage.setItem(storageKeys.accessToken, session.access_token);
    } else {
      localStorage.removeItem(storageKeys.accessToken);
    }
  }

  function selectedWork() {
    return state.works.find(function (w) { return w.slug === state.selectedSlug; }) || state.works[0] || null;
  }

  function draftKey() {
    return "inkroad_draft_" + (state.selectedSlug || "untitled");
  }

  function formatTime(dateStr) {
    var d = new Date(dateStr);
    var h = d.getHours();
    var m = String(d.getMinutes()).padStart(2, "0");
    var ampm = h < 12 ? "오전" : "오후";
    var hour12 = h % 12 || 12;
    return ampm + " " + hour12 + ":" + m;
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr);
    var now = new Date();
    if (d.toDateString() === now.toDateString()) return formatTime(dateStr);
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + formatTime(dateStr);
  }

  /* ── Status / UI helpers ── */

  function setStatus(message, tone) {
    if (!refs.status) return;
    if (!message) {
      refs.status.hidden = true;
      refs.status.textContent = "";
      refs.status.removeAttribute("data-tone");
      return;
    }
    refs.status.hidden = false;
    refs.status.setAttribute("data-tone", tone || "info");
    refs.status.innerHTML = "<strong>" + esc(message) + "</strong>";
  }

  function setSaveStatus(text, saveState) {
    if (!refs.editorStatus) return;
    refs.editorStatus.setAttribute("data-save-state", saveState || "");
    refs.editorStatus.textContent = text;
  }

  function setSubmitState(forceBusy) {
    var body = getEditorContent();
    var valid = Boolean(
      state.session &&
      refs.novelSelect && refs.novelSelect.value &&
      refs.titleInput && refs.titleInput.value.trim() &&
      body.trim() &&
      (!refs.priceWrap || refs.priceWrap.hidden || Number(refs.priceInput.value || 0) >= 0)
    );
    var disabled = Boolean(forceBusy || state.busy || !valid);
    refs.submitButtons.forEach(function (btn) {
      btn.disabled = disabled;
      btn.textContent = state.busy ? "발행 중..." : "회차 발행";
    });
  }

  function showForm(visible) {
    if (refs.form) refs.form.hidden = !visible;
  }

  function showEmpty(message, ctaLabel, ctaHref) {
    if (!refs.empty) return;
    refs.empty.hidden = false;
    refs.empty.innerHTML =
      "<strong>" + esc(message) + "</strong>" +
      (ctaLabel ? "<div class='button-row' style='justify-content:center;'><a class='button primary' href='" + esc(ctaHref || "novel_upload_pc.html") + "'>" + esc(ctaLabel) + "</a></div>" : "");
  }

  function hideEmpty() {
    if (refs.empty) refs.empty.hidden = true;
  }

  /* ── Toast UI Editor ── */

  function initEditor() {
    if (!refs.editorContainer || typeof toastui === "undefined") return;

    var draft = localStorage.getItem(draftKey()) || "";

    state.editor = new toastui.Editor({
      el: refs.editorContainer,
      initialEditType: "wysiwyg",
      previewStyle: "vertical",
      height: "500px",
      initialValue: draft,
      language: "ko-KR",
      toolbarItems: [
        ["bold", "italic", "strike"],
        ["hr", "quote"],
        ["ul", "ol"]
      ],
      placeholder: "에피소드 내용을 작성하세요...",
      usageStatistics: false
    });

    state.editor.on("change", function () {
      onContentChange();
      setSubmitState(false);
    });

    if (draft) {
      setSaveStatus("임시 저장본 복원됨", "offline");
    }
  }

  function getEditorContent() {
    if (state.editorMode === "wysiwyg" && state.editor) {
      return state.editor.getMarkdown();
    }
    return refs.bodyInput ? refs.bodyInput.value : "";
  }

  function setEditorContent(markdown) {
    if (state.editor) {
      state.editor.setMarkdown(markdown, false);
    }
    if (refs.bodyInput) {
      refs.bodyInput.value = markdown;
    }
  }

  /* ── Mode Toggle ── */

  function switchEditorMode(mode) {
    var content = getEditorContent();
    state.editorMode = mode;

    if (mode === "wysiwyg") {
      if (refs.editorContainer) refs.editorContainer.hidden = false;
      if (refs.bodyInput) refs.bodyInput.hidden = true;
      if (state.editor) state.editor.setMarkdown(content, false);
    } else {
      if (refs.editorContainer) refs.editorContainer.hidden = true;
      if (refs.bodyInput) {
        refs.bodyInput.hidden = false;
        refs.bodyInput.value = content;
      }
    }

    if (refs.modeToggle) {
      var buttons = refs.modeToggle.querySelectorAll("button");
      buttons.forEach(function (btn) {
        btn.setAttribute("aria-pressed", btn.dataset.mode === mode ? "true" : "false");
      });
    }
  }

  /* ── Auto-save ── */

  function onContentChange() {
    clearTimeout(state.debounceTimer);
    var current = getEditorContent();
    if (current !== state.lastSavedBody) {
      setSaveStatus("변경사항 있음", "unsaved");
    }
    state.debounceTimer = setTimeout(saveDraft, 5000);
  }

  function startAutoSaveInterval() {
    state.intervalTimer = setInterval(function () {
      var current = getEditorContent();
      if (current !== state.lastSavedBody && current.trim()) {
        saveDraft();
      }
    }, 60000);
  }

  function stopAutoSave() {
    clearTimeout(state.debounceTimer);
    clearInterval(state.intervalTimer);
  }

  function saveDraft() {
    var body = getEditorContent();
    if (!body.trim() || body === state.lastSavedBody) return;

    localStorage.setItem(draftKey(), body);
    state.lastSavedBody = body;
    setSaveStatus("저장됨 " + formatTime(new Date().toISOString()), "saved");
  }

  /* ── Snapshots (Supabase, for existing episodes) ── */

  async function saveSnapshot(label) {
    var work = selectedWork();
    if (!work || !state.authorId || !state.client) return;

    var body = getEditorContent();
    if (!body.trim()) return;

    var episodeId = work.currentEpisodeId;
    if (!episodeId) {
      saveDraft();
      return;
    }

    setSaveStatus("저장 중...", "saving");
    try {
      var result = await state.client.from("episode_snapshots").insert({
        episode_id: episodeId,
        author_id: state.authorId,
        body: body,
        label: label || null
      });
      if (result.error) throw result.error;
      state.lastSavedBody = body;
      setSaveStatus("저장됨 " + formatTime(new Date().toISOString()), "saved");
      await loadSnapshots();
    } catch (e) {
      console.error("[InkRoad] snapshot save failed:", e);
      localStorage.setItem(draftKey(), body);
      setSaveStatus("오프라인 저장됨", "offline");
    }
  }

  async function loadSnapshots() {
    var work = selectedWork();
    if (!work || !work.currentEpisodeId || !state.client) {
      state.snapshots = [];
      renderSnapshotList();
      return;
    }
    try {
      var result = await state.client
        .from("episode_snapshots")
        .select("id,body,label,created_at")
        .eq("episode_id", work.currentEpisodeId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (result.error) throw result.error;
      state.snapshots = result.data || [];
    } catch (e) {
      console.error("[InkRoad] snapshot load failed:", e);
      state.snapshots = [];
    }
    renderSnapshotList();
  }

  function renderSnapshotList() {
    if (!refs.snapshotList) return;

    if (!state.snapshots.length) {
      refs.snapshotList.innerHTML = "<p class='snapshot-list-empty'>저장된 스냅샷이 없습니다.</p>";
      return;
    }

    refs.snapshotList.innerHTML = state.snapshots.map(function (snap) {
      var timeStr = formatDate(snap.created_at);
      var labelHtml = snap.label
        ? "<span class='snapshot-label'>" + esc(snap.label) + "</span>"
        : "";
      return "<div class='snapshot-item' data-snapshot-id='" + esc(snap.id) + "'>" +
        "<div class='snapshot-item-header'>" +
          "<span class='snapshot-item-time'>" + esc(timeStr) + "</span>" +
          labelHtml +
        "</div>" +
        "<div class='snapshot-item-actions'>" +
          "<button type='button' data-action='restore' data-id='" + esc(snap.id) + "'>복원</button>" +
          "<button type='button' data-action='diff' data-id='" + esc(snap.id) + "'>비교</button>" +
          "<button type='button' data-action='label' data-id='" + esc(snap.id) + "'>이름</button>" +
        "</div>" +
      "</div>";
    }).join("");

    refs.snapshotList.querySelectorAll("button[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.dataset.id;
        var action = btn.dataset.action;
        if (action === "restore") restoreSnapshot(id);
        if (action === "diff") showDiff(id);
        if (action === "label") labelSnapshot(id);
      });
    });
  }

  async function restoreSnapshot(id) {
    var snap = state.snapshots.find(function (s) { return s.id === id; });
    if (!snap) return;

    var confirmed = window.confirm("현재 내용을 이 버전으로 교체합니다. 계속할까요?");
    if (!confirmed) return;

    await saveSnapshot("복원 전 자동저장");
    setEditorContent(snap.body);
    state.lastSavedBody = snap.body;
    setSaveStatus("버전 복원됨", "saved");
  }

  async function labelSnapshot(id) {
    var snap = state.snapshots.find(function (s) { return s.id === id; });
    if (!snap || !state.client) return;

    var name = window.prompt("스냅샷 이름을 입력하세요:", snap.label || "");
    if (name === null) return;

    try {
      var result = await state.client
        .from("episode_snapshots")
        .update({ label: name.trim() || null })
        .eq("id", id);
      if (result.error) throw result.error;
      await loadSnapshots();
    } catch (e) {
      console.error("[InkRoad] label update failed:", e);
      window.alert("이름 저장에 실패했습니다.");
    }
  }

  function showDiff(snapshotId) {
    if (!refs.diffView || typeof diff_match_patch === "undefined") return;

    var snap = state.snapshots.find(function (s) { return s.id === snapshotId; });
    if (!snap) return;

    var dmp = new diff_match_patch();
    var current = getEditorContent();
    var diffs = dmp.diff_main(snap.body, current);
    dmp.diff_cleanupSemantic(diffs);

    var html = diffs.map(function (part) {
      var op = part[0];
      var text = esc(part[1]);
      if (op === 1) return "<ins class='diff-add'>" + text + "</ins>";
      if (op === -1) return "<del class='diff-del'>" + text + "</del>";
      return "<span>" + text + "</span>";
    }).join("");

    refs.diffView.innerHTML = html;
    refs.diffView.hidden = false;
  }

  /* ── Snapshot panel toggle ── */

  function openSnapshotPanel() {
    if (refs.snapshotPanel) refs.snapshotPanel.setAttribute("data-open", "true");
    loadSnapshots();
  }

  function closeSnapshotPanel() {
    if (refs.snapshotPanel) refs.snapshotPanel.setAttribute("data-open", "false");
    if (refs.diffView) refs.diffView.hidden = true;
  }

  /* ── Auth rendering ── */

  function renderConfigMessage() {
    if (!refs.authShell) return;
    refs.authShell.innerHTML =
      "<div class='auth-card' data-tone='warning'><div class='auth-head'><span class='eyebrow'>연결 필요</span><h2 class='auth-title'>Supabase 연결 값이 비어 있습니다</h2><p class='auth-text'><code>assets/supabase-config.js</code>에 프로젝트 URL과 공개 키를 먼저 넣어주세요.</p></div></div>";
    showForm(false);
    showEmpty("연결값이 준비되면 회차를 발행할 수 있습니다.");
  }

  function renderSignedIn(session) {
    var profileName = session.user.user_metadata && session.user.user_metadata.display_name;
    var displayName = profileName || session.user.email || "크리에이터";
    refs.authShell.innerHTML =
      "<div class='auth-card' data-tone='success'><div class='auth-status-row'><div class='auth-user'><span class='auth-badge'>로그인됨</span><strong>" + esc(displayName) + "</strong><span class='auth-note'>내가 올린 작품에만 새 회차를 추가할 수 있습니다.</span></div><div class='auth-actions'><a class='button ghost' href='creator_dashboard_pc.html'>내 작품 관리</a><button class='button secondary' type='button' data-episode-logout>로그아웃</button></div></div></div>";
    var logoutButton = q("[data-episode-logout]", refs.authShell);
    if (logoutButton) {
      logoutButton.addEventListener("click", async function () {
        await state.client.auth.signOut();
      });
    }
  }

  function renderAuthGate(message) {
    var note = message
      ? "<p class='auth-note'>" + esc(message) + "</p>"
      : "<p class='auth-note'>업로드 페이지에서 쓰던 계정으로 로그인하면 내가 올린 작품 목록이 자동으로 뜹니다.</p>";
    refs.authShell.innerHTML =
      "<div class='auth-card'><div class='auth-head'><span class='eyebrow'>크리에이터 로그인</span><h2 class='auth-title'>회차를 추가하려면 먼저 로그인해야 합니다</h2><p class='auth-text'>로그인한 계정이 올린 작품만 선택 목록에 나타납니다.</p></div><form class='auth-form' data-episode-auth-form><div class='auth-grid'><label class='auth-label'><span>이메일</span><input class='auth-input' type='email' name='email' placeholder='you@example.com' required></label><label class='auth-label'><span>비밀번호</span><input class='auth-input' type='password' name='password' minlength='8' placeholder='8자 이상' required></label></div><label class='auth-label'><span>닉네임</span><input class='auth-input' type='text' name='displayName' placeholder='처음 가입할 때만 사용됩니다'></label><div class='auth-actions'><button class='button primary' type='submit'>로그인</button><button class='button secondary' type='button' data-episode-signup>회원가입</button></div>" + note + "</form></div>";
    showForm(false);
    showEmpty("로그인하면 회차 발행 폼이 열립니다.");

    var form = q("[data-episode-auth-form]", refs.authShell);
    var signupButton = q("[data-episode-signup]", refs.authShell);

    if (form) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        var formData = new FormData(form);
        var email = String(formData.get("email") || "").trim();
        var password = String(formData.get("password") || "").trim();
        try {
          var result = await state.client.auth.signInWithPassword({ email: email, password: password });
          if (result.error) throw result.error;
        } catch (error) {
          renderAuthGate(error.message || "로그인에 실패했습니다.");
        }
      });
    }

    if (signupButton) {
      signupButton.addEventListener("click", async function () {
        if (!form) return;
        var formData = new FormData(form);
        var email = String(formData.get("email") || "").trim();
        var password = String(formData.get("password") || "").trim();
        var displayName = String(formData.get("displayName") || "").trim();
        try {
          var result = await state.client.auth.signUp({
            email: email,
            password: password,
            options: { data: { display_name: displayName || email.split("@")[0] } }
          });
          if (result.error) throw result.error;
          if (!result.data || !result.data.session) {
            renderAuthGate("가입 요청이 접수되었습니다. 메일 인증이 켜져 있다면 메일 확인 후 다시 로그인하세요.");
          }
        } catch (error) {
          renderAuthGate(error.message || "회원가입에 실패했습니다.");
        }
      });
    }
  }

  /* ── Data fetching ── */

  async function fetchWorks(userId) {
    var authorResult = await state.client
      .from("authors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (authorResult.error) throw authorResult.error;
    if (!authorResult.data) return [];

    state.authorId = authorResult.data.id;

    var novelsResult = await state.client
      .from("novels")
      .select("id,slug,title,short_description,status,cover_url,banner_url,free_episode_count,total_episode_count,view_count,reaction_score")
      .eq("author_id", authorResult.data.id)
      .order("updated_at", { ascending: false });
    if (novelsResult.error) throw novelsResult.error;
    var novels = novelsResult.data || [];
    if (!novels.length) return [];

    var novelIds = novels.map(function (n) { return n.id; });

    var tagsResult = await state.client
      .from("novel_tags")
      .select("novel_id,tags(name)")
      .in("novel_id", novelIds);
    if (tagsResult.error) throw tagsResult.error;

    var episodeResult = await state.client
      .from("episodes")
      .select("novel_id,episode_number,title,status")
      .in("novel_id", novelIds)
      .eq("status", "published")
      .order("episode_number", { ascending: false });
    if (episodeResult.error) throw episodeResult.error;

    var tagMap = new Map();
    (tagsResult.data || []).forEach(function (row) {
      var current = tagMap.get(row.novel_id) || [];
      var tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
      if (tag && tag.name) current.push(tag.name);
      tagMap.set(row.novel_id, current);
    });

    var episodeMap = new Map();
    (episodeResult.data || []).forEach(function (row) {
      if (!episodeMap.has(row.novel_id)) {
        episodeMap.set(row.novel_id, {
          episodeNumber: Number(row.episode_number || 0),
          title: row.title || "최근 회차"
        });
      }
    });

    return novels.map(function (novel) {
      return {
        id: novel.id,
        slug: novel.slug,
        title: novel.title,
        shortDescription: novel.short_description || "",
        status: novel.status || "draft",
        coverUrl: novel.cover_url || novel.banner_url || "",
        freeEpisodeCount: Number(novel.free_episode_count || 0),
        totalEpisodeCount: Number(novel.total_episode_count || 0),
        viewCount: Number(novel.view_count || 0),
        reactionScore: Number(novel.reaction_score || 0),
        latestEpisode: episodeMap.get(novel.id) || null,
        tags: tagMap.get(novel.id) || [],
        currentEpisodeId: null
      };
    });
  }

  /* ── Rendering ── */

  function renderSelectedWork() {
    var work = selectedWork();
    if (!work) return;
    if (refs.selectedImage) refs.selectedImage.src = cover(work);
    if (refs.selectedImage) refs.selectedImage.alt = work.title + " 표지";
    if (refs.selectedTitle) refs.selectedTitle.textContent = work.title;
    if (refs.selectedSummary) refs.selectedSummary.textContent = summary(work);
    if (refs.selectedMeta) {
      var nextEpisode = Number(work.totalEpisodeCount || 0) + 1;
      refs.selectedMeta.innerHTML = "<span class='episode-chip' data-tone='" + esc(work.status) + "'>" + statusLabel(work.status) + "</span><span class='episode-chip'>다음 " + formatCount(nextEpisode) + "화</span><span class='episode-chip'>조회 " + formatCount(work.viewCount) + "</span>";
    }
    if (refs.selectedTags) {
      refs.selectedTags.innerHTML = work.tags.length
        ? work.tags.slice(0, 4).map(function (tag) { return "<span class='episode-chip'>" + esc(tag) + "</span>"; }).join("")
        : "<span class='episode-chip'>태그 없음</span>";
    }

    var draft = localStorage.getItem(draftKey());
    if (draft && !getEditorContent().trim()) {
      setEditorContent(draft);
      setSaveStatus("임시 저장본 복원됨", "offline");
    }
  }

  function renderNovelOptions() {
    if (!refs.novelSelect) return;
    if (!state.works.length) {
      refs.novelSelect.innerHTML = "<option value=''>선택 가능한 작품이 없습니다</option>";
      return;
    }
    refs.novelSelect.innerHTML = state.works.map(function (work) {
      var nextEpisode = Number(work.totalEpisodeCount || 0) + 1;
      var selected = work.slug === state.selectedSlug ? " selected" : "";
      return "<option value='" + esc(work.slug) + "'" + selected + ">" + esc(work.title) + " · 다음 " + formatCount(nextEpisode) + "화</option>";
    }).join("");
    if (!state.selectedSlug || !state.works.some(function (w) { return w.slug === state.selectedSlug; })) {
      state.selectedSlug = state.works[0].slug;
      refs.novelSelect.value = state.selectedSlug;
    }
  }

  function togglePrice() {
    var isPaid = refs.accessSelect && refs.accessSelect.value === "paid";
    if (refs.priceWrap) refs.priceWrap.hidden = !isPaid;
    if (refs.priceInput && !isPaid) refs.priceInput.value = "100";
    setSubmitState(false);
  }

  /* ── Publish ── */

  async function handlePublish(event) {
    event.preventDefault();
    if (state.busy) return;
    var work = selectedWork();
    if (!work) {
      setStatus("먼저 작품을 선택해주세요.", "error");
      return;
    }

    var title = String(refs.titleInput.value || "").trim();
    var body = getEditorContent().trim();
    var accessType = refs.accessSelect ? refs.accessSelect.value : "free";
    var price = refs.priceInput ? Number(refs.priceInput.value || 0) : 0;

    if (!title) {
      setStatus("회차 제목을 입력해주세요.", "error");
      refs.titleInput.focus();
      return;
    }
    if (!body) {
      setStatus("회차 본문을 입력해주세요.", "error");
      return;
    }

    state.busy = true;
    setSubmitState(true);
    setStatus("회차를 저장하고 발행하고 있습니다...", "info");

    try {
      var rpcResult = await state.client.rpc("create_episode_for_author_novel", {
        p_novel_slug: work.slug,
        p_title: title,
        p_body: body,
        p_access_type: accessType,
        p_price: accessType === "paid" ? price : 0
      });
      if (rpcResult.error) throw rpcResult.error;
      var row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
      if (!row || !row.novel_slug) throw new Error("회차는 저장됐지만 이동할 주소를 찾지 못했습니다.");

      if (state.authorId && row.episode_id) {
        try {
          await state.client.from("episode_snapshots").insert({
            episode_id: row.episode_id,
            author_id: state.authorId,
            body: body,
            label: "발행됨"
          });
        } catch (ignore) { /* non-critical */ }
      }

      localStorage.removeItem(draftKey());
      stopAutoSave();

      setStatus("회차 발행이 완료되었습니다. 읽기 화면으로 이동합니다.", "success");
      refs.submitButtons.forEach(function (btn) { btn.textContent = "이동 중..."; });
      window.setTimeout(function () {
        window.location.href = viewerHref(row.novel_slug, row.episode_number || ((work.totalEpisodeCount || 0) + 1));
      }, 700);
    } catch (error) {
      setStatus(error.message || "회차 발행 중 오류가 생겼습니다.", "error");
      state.busy = false;
      setSubmitState(false);
    }
  }

  /* ── Events ── */

  function bindEvents() {
    if (refs.novelSelect) {
      refs.novelSelect.addEventListener("change", function () {
        state.selectedSlug = refs.novelSelect.value;
        renderSelectedWork();
        setSubmitState(false);
      });
    }
    if (refs.accessSelect) {
      refs.accessSelect.addEventListener("change", togglePrice);
    }
    if (refs.form) {
      refs.form.addEventListener("submit", handlePublish);
      refs.form.addEventListener("input", function () { setSubmitState(false); });
    }

    if (refs.modeToggle) {
      refs.modeToggle.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          switchEditorMode(btn.dataset.mode);
        });
      });
    }

    if (refs.bodyInput) {
      refs.bodyInput.addEventListener("input", function () {
        onContentChange();
        setSubmitState(false);
      });
    }

    if (refs.snapshotToggle) {
      refs.snapshotToggle.addEventListener("click", openSnapshotPanel);
    }
    if (refs.snapshotClose) {
      refs.snapshotClose.addEventListener("click", closeSnapshotPanel);
    }
  }

  /* ── Boot ── */

  async function refreshSession() {
    var sessionResult = await state.client.auth.getSession();
    state.session = sessionResult.data.session;
    rememberAccessToken(state.session);

    if (!state.session) {
      renderAuthGate();
      return;
    }

    renderSignedIn(state.session);
    state.works = await fetchWorks(state.session.user.id);
    if (!state.works.length) {
      showForm(false);
      showEmpty("먼저 작품을 하나 발행해야 회차를 추가할 수 있습니다.", "첫 작품 업로드", "novel_upload_pc.html");
      return;
    }

    hideEmpty();
    showForm(true);
    renderNovelOptions();
    renderSelectedWork();
    togglePrice();
    setStatus("", "");
    setSubmitState(false);

    initEditor();
    startAutoSaveInterval();
  }

  async function boot() {
    if (!refs.authShell || !refs.form) return;
    bindEvents();

    if (!base || !key || !window.supabase || !window.supabase.createClient) {
      renderConfigMessage();
      return;
    }

    state.client = window.supabase.createClient(base, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: storageKeys.session
      }
    });

    state.client.auth.onAuthStateChange(function (_event, session) {
      state.session = session;
      rememberAccessToken(session);
      if (!session) {
        stopAutoSave();
        renderAuthGate();
        return;
      }
      refreshSession().catch(function (error) {
        console.error("[InkRoad] episode upload refresh failed:", error);
      });
    });

    await refreshSession();
  }

  boot().catch(function (error) {
    console.error("[InkRoad] episode upload boot failed:", error);
    renderAuthGate(error.message || "연결 중 오류가 생겼습니다.");
  });
})();
```

---

## Task 5: Viewer Changes

**Files:** `D:/nova/assets/store-redesign.js`, `D:/nova/novel_viewer_pc.html`, `D:/nova/novel_viewer.html`

- [ ] **5-1.** Add marked.js CDN to `novel_viewer_pc.html`. Find:

```html
  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Replace with:

```html
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

- [ ] **5-2.** Add marked.js CDN to `novel_viewer.html`. Find:

```html
  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Replace with:

```html
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="assets/supabase-config.js"></script>
  <script src="assets/app.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

- [ ] **5-3.** In `store-redesign.js`, update `renderViewer` to use marked.js for body rendering. Find the existing body-rendering logic (around line 630):

```javascript
    var currentBody = body ? body.split(/\n{2,}/).filter(Boolean).map(function (paragraph) {
      return "<p>" + esc(paragraph).replace(/\n/g, "<br>") + "</p>";
    }).join("") : (selected.accessType === "paid"
      ? "<p>이 회차는 구매 후 열람할 수 있습니다.</p><p>" + esc(selected.teaser || "다음 회차 미리보기만 열려 있습니다.") + "</p>"
      : "<p>본문이 아직 준비되지 않았습니다.</p>");
```

Replace with:

```javascript
    var currentBody = body
      ? (typeof marked !== "undefined" ? marked.parse(body) : body.split(/\n{2,}/).filter(Boolean).map(function (paragraph) {
          return "<p>" + esc(paragraph).replace(/\n/g, "<br>") + "</p>";
        }).join(""))
      : (selected.accessType === "paid"
        ? "<p>이 회차는 구매 후 열람할 수 있습니다.</p><p>" + esc(selected.teaser || "다음 회차 미리보기만 열려 있습니다.") + "</p>"
        : "<p>본문이 아직 준비되지 않았습니다.</p>");
```

- [ ] **5-4.** Still in `renderViewer`, add copy protection after the content is rendered. Find (around line 645):

```javascript
    if (q("[data-reader-content]")) q("[data-reader-content]").innerHTML = currentBody;
```

Replace with:

```javascript
    if (q("[data-reader-content]")) {
      q("[data-reader-content]").innerHTML = currentBody;
      q("[data-reader-content]").classList.add("reader-protected");
      q("[data-reader-content]").addEventListener("contextmenu", function (e) { e.preventDefault(); });
      q("[data-reader-content]").addEventListener("dragstart", function (e) { e.preventDefault(); });
      q("[data-reader-content]").addEventListener("selectstart", function (e) { e.preventDefault(); });
    }
```

- [ ] **5-5.** In `store-redesign.js`, update `renderMobileViewer` body rendering. Find (around line 1242):

```javascript
    if (bodyNode) bodyNode.innerHTML = body || "<p style='text-align:center;color:var(--text-muted);padding:48px 0;'>본문을 불러올 수 없습니다.</p>";
```

Replace with:

```javascript
    var renderedBody = body
      ? (typeof marked !== "undefined" ? marked.parse(body) : body)
      : "<p style='text-align:center;color:var(--text-muted);padding:48px 0;'>본문을 불러올 수 없습니다.</p>";
    if (bodyNode) {
      bodyNode.innerHTML = renderedBody;
      bodyNode.classList.add("reader-protected");
      bodyNode.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      bodyNode.addEventListener("dragstart", function (e) { e.preventDefault(); });
      bodyNode.addEventListener("selectstart", function (e) { e.preventDefault(); });
    }
```

---

## Task 6: Verification

**Files:** None (manual testing)

- [ ] **6-1.** Open `episode_upload_pc.html` in browser. Verify:
  - Toast UI Editor loads in the editor area (WYSIWYG mode by default)
  - Mode toggle buttons appear above the editor
  - "히스토리" button appears next to mode toggle
  - Save status indicator is present

- [ ] **6-2.** Test mode toggle:
  - Click "텍스트" button — Toast UI container hides, textarea appears
  - Type some markdown in textarea
  - Click "WYSIWYG" button — content transfers to Toast UI editor
  - Verify content is preserved between switches

- [ ] **6-3.** Test auto-save:
  - Type content in the editor
  - Wait 5 seconds, check save status shows "저장됨" with timestamp
  - Check `localStorage` for key starting with `inkroad_draft_`

- [ ] **6-4.** Test snapshot panel:
  - Click "히스토리" button — panel slides in from right
  - Verify "저장된 스냅샷이 없습니다." message (for new episodes)
  - Click X to close panel

- [ ] **6-5.** Open `novel_viewer_pc.html` with a valid slug/episode:
  - Verify body text renders with markdown formatting (bold, italic, lists etc.)
  - Right-click on reader content — verify context menu is blocked
  - Try to select text — verify selection is blocked

- [ ] **6-6.** Open `novel_viewer.html` (mobile) with same slug/episode:
  - Same markdown rendering verification
  - Same copy protection verification

- [ ] **6-7.** Verify no console errors on any of the above pages
