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
