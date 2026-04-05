(function () {
  const page = window.location.pathname.split("/").pop() || "";
  if (page !== "episode_upload_pc.html") return;

  const cfg = window.inkroadSupabaseConfig || {};
  const base = (cfg.url || "").replace(/\/$/, "");
  const key = cfg.publishableKey || cfg.anonKey || "";
  const query = new URLSearchParams(window.location.search);
  const editParam = query.get("edit");
  const storageKeys = {
    session: "inkroad-supabase-auth",
    accessToken: "inkroad-supabase-access-token"
  };

  const state = {
    client: null,
    session: null,
    authorId: null,
    mode: "create",
    editingEpisodeId: null,
    loadedEpisode: null,
    lockedNovelSlug: "",
    loadedForUserId: null,
    editLoadRequestSeq: 0,
    submitRequestSeq: 0,
    works: [],
    selectedSlug: query.get("slug") || "",
    episodeFilter: "all",
    busy: false,
    editor: null,
    editorMode: "wysiwyg",
    lastSavedBody: "",
    debounceTimer: null,
    intervalTimer: null,
    snapshots: []
  };

  if (editParam && editParam.trim()) {
    state.mode = "edit";
    state.editingEpisodeId = editParam.trim();
  }

  const refs = {
    authShell: document.querySelector("[data-episode-auth]"),
    empty: document.querySelector("[data-episode-empty]"),
    form: document.querySelector("[data-episode-form]"),
    modeBadge: document.querySelector("[data-episode-mode-badge]"),
    pageTitle: document.querySelector("[data-episode-page-title]"),
    pageSubtitle: document.querySelector("[data-episode-page-subtitle]"),
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
    selectedTags: document.querySelector("[data-selected-work-tags]"),
    episodeIndexCount: document.querySelector("[data-episode-index-count]"),
    episodeIndexList: document.querySelector("[data-episode-index-list]"),
    episodeIndexEmpty: document.querySelector("[data-episode-index-empty]"),
    episodeFilterButtons: Array.from(document.querySelectorAll("[data-episode-filter]")),
    episodeSummaryPublished: document.querySelector("[data-episode-summary-published]"),
    episodeSummaryHidden: document.querySelector("[data-episode-summary-hidden]"),
    episodeSummaryTrashed: document.querySelector("[data-episode-summary-trashed]"),
    episodeBulkActions: document.querySelector("[data-episode-bulk-actions]"),
    episodeRestoreAll: document.querySelector("[data-episode-restore-all]"),
    episodePurge: document.querySelector("[data-episode-purge]"),
    editMeta: document.querySelector("[data-episode-edit-meta]"),
    editNumber: document.querySelector("[data-episode-edit-number]"),
    editUpdated: document.querySelector("[data-episode-edit-updated]")
  };

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getModeText() {
    if (state.mode === "edit") {
      return {
        badge: "회차 수정 모드",
        title: "기존 회차 내용을 수정합니다",
        subtitle: "회차 제목, 본문, 공개 방식, 가격을 수정해 저장합니다. 작품 선택은 변경할 수 없습니다.",
        submit: "수정 저장",
        submitting: "수정 저장 중..."
      };
    }
    return {
      badge: "새 회차 발행",
      title: "기존 작품에 다음 회차를 이어서 발행합니다",
      subtitle: "작품을 고르면 다음 회차 번호가 자동으로 이어지고, 무료 공개인지 회차 구매인지까지 함께 저장됩니다.",
      submit: t("editor.publish"),
      submitting: t("editor.publishing")
    };
  }

  function applyModeUI() {
    const modeText = getModeText();
    if (refs.modeBadge) refs.modeBadge.textContent = modeText.badge;
    if (refs.pageTitle) refs.pageTitle.textContent = modeText.title;
    if (refs.pageSubtitle) refs.pageSubtitle.textContent = modeText.subtitle;
    renderEditMeta();
  }

  function formatCount(value) {
    return new Intl.NumberFormat(window.inkroadI18n.locale).format(Number(value || 0));
  }

  function summary(work) {
    return work.shortDescription || t("common.no_description_short");
  }

  function cover(work) {
    return work.coverUrl || "https://placehold.co/320x440/111827/f3f4f6?text=" + encodeURIComponent(work.title || "InkRoad");
  }

  function statusLabel(st) {
    const labels = {
      serializing: t("status.serializing"),
      completed: t("status.completed"),
      draft: t("status.draft"),
      hiatus: t("status.hiatus"),
      archived: "보관됨"
    };
    return labels[st] || t("status.unknown");
  }

  function episodeStatusLabel(st) {
    const labels = {
      published: "공개중",
      hidden: "숨김",
      draft: "초안",
      trashed: "휴지통"
    };
    return labels[st] || "상태 미확인";
  }

  function episodeAccessLabel(accessType, price) {
    if (accessType === "paid") {
      return "유료 " + formatCount(price || 0) + "원";
    }
    return "무료";
  }

  function getEpisodeStats(work) {
    const stats = {
      total: 0,
      visibleTotal: 0,
      freeVisible: 0,
      published: 0,
      hidden: 0,
      draft: 0,
      trashed: 0
    };
    if (!work || !Array.isArray(work.episodes)) return stats;
    work.episodes.forEach(function (row) {
      const status = row.status || "draft";
      if (Object.prototype.hasOwnProperty.call(stats, status)) {
        stats[status] += 1;
      } else {
        stats.draft += 1;
      }
      stats.total += 1;
      if (status !== "trashed") {
        stats.visibleTotal += 1;
        if ((row.accessType || "free") === "free") {
          stats.freeVisible += 1;
        }
      }
    });
    return stats;
  }

  function syncWorkEpisodeState(work) {
    const episodes = Array.isArray(work.episodes) ? work.episodes.slice().sort(function (left, right) {
      return Number(right.episodeNumber || 0) - Number(left.episodeNumber || 0);
    }) : [];
    work.episodes = episodes;
    work.episodeStats = getEpisodeStats({ episodes: episodes });
    work.totalEpisodeCount = work.episodeStats.visibleTotal;
    work.freeEpisodeCount = work.episodeStats.freeVisible;
    work.latestEpisode = episodes.find(function (row) { return row.status !== "trashed"; }) || episodes[0] || null;
    work.hiddenEpisodes = episodes.filter(function (row) { return row.status === "hidden"; });
    work.trashedEpisodes = episodes.filter(function (row) { return row.status === "trashed"; });
    return work;
  }

  function getFilteredEpisodes(work) {
    if (!work || !Array.isArray(work.episodes)) return [];
    if (state.episodeFilter === "all") return work.episodes;
    return work.episodes.filter(function (row) { return row.status === state.episodeFilter; });
  }

  function episodeFilterLabel(filterKey) {
    const labels = {
      all: "전체",
      published: "공개중",
      hidden: "숨김",
      trashed: "휴지통"
    };
    return labels[filterKey] || "전체";
  }

  function renderEpisodeSummary(work) {
    const stats = work && work.episodeStats ? work.episodeStats : getEpisodeStats(work);
    if (refs.episodeSummaryPublished) refs.episodeSummaryPublished.textContent = "공개중 " + formatCount(stats.published) + "화";
    if (refs.episodeSummaryHidden) refs.episodeSummaryHidden.textContent = "숨김 " + formatCount(stats.hidden) + "화";
    if (refs.episodeSummaryTrashed) refs.episodeSummaryTrashed.textContent = "휴지통 " + formatCount(stats.trashed) + "화";
  }

  function renderEpisodeBulkActions(work) {
    if (!refs.episodeBulkActions) return;
    const stats = work && work.episodeStats ? work.episodeStats : getEpisodeStats(work);
    refs.episodeBulkActions.hidden = !work || stats.trashed < 1;
  }

  function applyEpisodeFilter(nextFilter) {
    state.episodeFilter = nextFilter || "all";
    if (refs.episodeFilterButtons && refs.episodeFilterButtons.length) {
      refs.episodeFilterButtons.forEach(function (btn) {
        const matches = btn.getAttribute("data-episode-filter") === state.episodeFilter;
        btn.dataset.active = matches ? "true" : "false";
        btn.setAttribute("aria-pressed", matches ? "true" : "false");
      });
    }
    renderEpisodeIndex();
  }

  function renderEpisodeIndex() {
    if (!refs.episodeIndexList || !refs.episodeIndexCount || !refs.episodeIndexEmpty) return;
    const work = selectedWork();
    renderEpisodeSummary(work);
    renderEpisodeBulkActions(work);
    if (!work) {
      refs.episodeIndexCount.textContent = "0화";
      refs.episodeIndexList.innerHTML = "";
      refs.episodeIndexEmpty.hidden = false;
      refs.episodeIndexEmpty.textContent = "선택한 작품의 회차가 여기에 표시됩니다.";
      return;
    }

    const visibleEpisodes = getFilteredEpisodes(work);
    refs.episodeIndexCount.textContent = episodeFilterLabel(state.episodeFilter) + " " + formatCount(visibleEpisodes.length) + "화";

    if (!work.episodes || !work.episodes.length) {
      refs.episodeIndexList.innerHTML = "";
      refs.episodeIndexEmpty.hidden = false;
      refs.episodeIndexEmpty.textContent = "아직 작성된 회차가 없습니다. 첫 회차를 발행하면 여기에서 바로 관리할 수 있습니다.";
      return;
    }

    if (!visibleEpisodes.length) {
      refs.episodeIndexList.innerHTML = "";
      refs.episodeIndexEmpty.hidden = false;
      refs.episodeIndexEmpty.textContent = episodeFilterLabel(state.episodeFilter) + " 상태의 회차가 아직 없습니다.";
      return;
    }

    refs.episodeIndexEmpty.hidden = true;
    refs.episodeIndexList.innerHTML = visibleEpisodes.map(function (row) {
      const rowStatus = row.status || "draft";
      const rowClass = rowStatus === "hidden"
        ? "episode-index-item is-hidden"
        : rowStatus === "trashed"
          ? "episode-index-item is-trashed"
          : "episode-index-item";
      const editHref = "episode_upload_pc.html?edit=" + encodeURIComponent(row.id);
      const editAction = "<a class='button ghost small' href='" + editHref + "'>수정</a>";
      const hideAction = rowStatus === "published" && work.status !== "archived"
        ? "<button class='button ghost small' type='button' data-episode-hide='" + esc(row.id) + "'>숨김</button>"
        : "";
      const unhideAction = row.status === "hidden" && work.status !== "archived"
        ? "<button class='button secondary small' type='button' data-episode-unhide='" + esc(row.id) + "'>다시 공개</button>"
        : "";
      const trashAction = rowStatus !== "trashed"
        ? "<button class='button ghost small' type='button' data-episode-trash='" + esc(row.id) + "'>휴지통</button>"
        : "";
      const restoreAction = row.status === "trashed"
        ? "<button class='button secondary small' type='button' data-episode-restore='" + esc(row.id) + "'>복원</button>"
        : "";
      const note = row.status === "hidden" && work.status === "archived"
        ? "<p class='episode-index-note'>작품 보관을 해제하면 다시 공개할 수 있습니다.</p>"
        : row.status === "trashed"
          ? "<p class='episode-index-note'>복원하면 숨김 상태로 돌아가며, 다시 공개는 그다음에 선택할 수 있습니다.</p>"
          : "";
      return "<article class='" + rowClass + "'>" +
        "<div class='episode-index-top'>" +
          "<strong class='episode-index-title'>" + esc(row.episodeNumber + "화 · " + row.title) + "</strong>" +
          "<div class='episode-index-meta'>" +
            "<span class='episode-chip'>" + esc(episodeStatusLabel(rowStatus)) + "</span>" +
            "<span class='episode-chip'>" + esc(episodeAccessLabel(row.accessType, row.price)) + "</span>" +
          "</div>" +
        "</div>" +
        "<div class='episode-index-actions'>" +
          editAction + hideAction + unhideAction + trashAction + restoreAction +
        "</div>" +
        note +
      "</article>";
    }).join("");
  }

  function updateEpisodeInState(episodeId, nextStatus, publishedAt) {
    state.works.forEach(function (work) {
      const target = (work.episodes || []).find(function (row) { return row.id === episodeId; });
      if (!target) return;
      target.status = nextStatus;
      if (publishedAt) target.publishedAt = publishedAt;
      syncWorkEpisodeState(work);
    });
  }

  async function hideEpisodeFromIndex(episodeId) {
    if (!episodeId) return;
    const confirmed = window.confirm("이 회차를 숨길까요? 독자에게 바로 보이지 않게 됩니다.");
    if (!confirmed) return;
    const result = await state.client.rpc("hide_episode_for_author", { p_episode_id: episodeId });
    if (result.error) throw result.error;
    updateEpisodeInState(episodeId, "hidden", null);
    renderSelectedWork();
    setStatus("회차를 숨겼습니다.", "success");
  }

  async function unhideEpisodeFromIndex(episodeId) {
    if (!episodeId) return;
    const confirmed = window.confirm("이 회차를 다시 공개할까요? 독자가 바로 볼 수 있게 됩니다.");
    if (!confirmed) return;
    const result = await state.client.rpc("unhide_episode_for_author", { p_episode_id: episodeId });
    if (result.error) throw result.error;
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    updateEpisodeInState(episodeId, "published", row && (row.published_at || row.publishedAt || null));
    renderSelectedWork();
    setStatus("회차를 다시 공개했습니다.", "success");
  }

  async function trashEpisodeFromIndex(episodeId) {
    if (!episodeId) return;
    const confirmed = window.confirm("이 회차를 휴지통으로 보낼까요? 바로 삭제되지는 않지만 독자에게 보이지 않게 됩니다.");
    if (!confirmed) return;
    const result = await state.client.rpc("trash_episode_for_author", { p_episode_id: episodeId });
    if (result.error) throw result.error;
    updateEpisodeInState(episodeId, "trashed", null);
    renderSelectedWork();
    setStatus("회차를 휴지통으로 보냈습니다.", "success");
  }

  async function restoreEpisodeFromTrash(episodeId) {
    if (!episodeId) return;
    const confirmed = window.confirm("이 회차를 복원할까요? 복원되면 우선 숨김 상태로 돌아갑니다.");
    if (!confirmed) return;
    const result = await state.client.rpc("restore_trashed_episode_for_author", { p_episode_id: episodeId });
    if (result.error) throw result.error;
    updateEpisodeInState(episodeId, "hidden", null);
    renderSelectedWork();
    setStatus("회차를 복원했습니다.", "success");
  }

  async function restoreAllTrashedEpisodes() {
    const work = selectedWork();
    if (!work || !work.episodeStats || work.episodeStats.trashed < 1) return;
    const confirmed = window.confirm("휴지통 회차를 모두 복원할까요? 복원된 회차는 숨김 상태로 돌아갑니다.");
    if (!confirmed) return;
    const result = await state.client.rpc("restore_all_trashed_episodes_for_author", { p_novel_slug: work.slug });
    if (result.error) throw result.error;
    work.episodes.forEach(function (row) {
      if (row.status === "trashed") row.status = "hidden";
    });
    syncWorkEpisodeState(work);
    renderSelectedWork();
    setStatus("휴지통 회차를 모두 복원했습니다.", "success");
  }

  async function purgeTrashedEpisodes() {
    const work = selectedWork();
    if (!work || !work.episodeStats || work.episodeStats.trashed < 1) return;
    const confirmed = window.confirm("휴지통을 비울까요? 휴지통 안의 회차는 완전히 삭제되며 되돌릴 수 없습니다.");
    if (!confirmed) return;
    const result = await state.client.rpc("purge_trashed_episodes_for_author", { p_novel_slug: work.slug });
    if (result.error) throw result.error;
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    work.episodes = (work.episodes || []).filter(function (episode) { return episode.status !== "trashed"; });
    if (row && typeof row.total_episode_count !== "undefined") work.totalEpisodeCount = Number(row.total_episode_count || 0);
    if (row && typeof row.free_episode_count !== "undefined") work.freeEpisodeCount = Number(row.free_episode_count || 0);
    syncWorkEpisodeState(work);
    renderSelectedWork();
    setStatus("휴지통을 비웠습니다.", "success");
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
    if (state.mode === "edit" && state.editingEpisodeId) {
      return "inkroad_edit_draft_" + state.editingEpisodeId;
    }
    return "inkroad_draft_" + (state.selectedSlug || "untitled");
  }

  function formatTime(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat(window.inkroadI18n.locale, { hour: "numeric", minute: "2-digit" }).format(d);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return formatTime(dateStr);
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + formatTime(dateStr);
  }

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

  function renderEditMeta() {
    if (!refs.editMeta) return;
    if (state.mode !== "edit" || !state.loadedEpisode) {
      refs.editMeta.hidden = true;
      if (refs.editNumber) refs.editNumber.textContent = "-";
      if (refs.editUpdated) refs.editUpdated.textContent = "-";
      return;
    }
    refs.editMeta.hidden = false;
    if (refs.editNumber) refs.editNumber.textContent = String(state.loadedEpisode.episodeNumber || "-");
    if (refs.editUpdated) refs.editUpdated.textContent = formatDate(state.loadedEpisode.updatedAt);
  }

  function setSubmitState(forceBusy) {
    const body = getEditorContent();
    const hasNovel = Boolean(refs.novelSelect && refs.novelSelect.value);
    const hasTitle = Boolean(refs.titleInput && refs.titleInput.value.trim());
    const hasBody = Boolean(body.trim());
    const hasPrice = (!refs.priceWrap || refs.priceWrap.hidden || Number(refs.priceInput.value || 0) >= 0);
    const valid = Boolean(state.session && hasNovel && hasTitle && hasBody && hasPrice);
    const disabled = Boolean(forceBusy || state.busy || !valid);
    const modeText = getModeText();

    refs.submitButtons.forEach(function (btn) {
      btn.disabled = disabled;
      if (state.busy) {
        btn.textContent = modeText.submitting;
      } else if (!state.session) {
        btn.textContent = t("auth.login_required");
      } else {
        btn.textContent = modeText.submit;
      }
    });
  }

  function applyNovelLock() {
    if (!refs.novelSelect) return;
    refs.novelSelect.disabled = state.mode === "edit";
    refs.novelSelect.classList.toggle("episode-select-locked", state.mode === "edit");
    if (state.mode === "edit" && state.lockedNovelSlug) {
      refs.novelSelect.value = state.lockedNovelSlug;
    }
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

  function initEditor() {
    if (state.editor || !refs.editorContainer || typeof toastui === "undefined") return;

    const draft = state.mode === "edit" ? "" : (localStorage.getItem(draftKey()) || "");

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
      placeholder: t("editor.placeholder"),
      usageStatistics: false
    });

    state.editor.on("change", function () {
      onContentChange();
      setSubmitState(false);
    });

    if (draft) {
      setSaveStatus(t("editor.draft_restored"), "offline");
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
      state.editor.setMarkdown(markdown || "", false);
    }
    if (refs.bodyInput) {
      refs.bodyInput.value = markdown || "";
    }
  }

  function switchEditorMode(mode) {
    const content = getEditorContent();
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
      const buttons = refs.modeToggle.querySelectorAll("button");
      buttons.forEach(function (btn) {
        btn.setAttribute("aria-pressed", btn.dataset.mode === mode ? "true" : "false");
      });
    }
  }

  function onContentChange() {
    clearTimeout(state.debounceTimer);
    const current = getEditorContent();
    if (current !== state.lastSavedBody) {
      setSaveStatus(t("editor.unsaved"), "unsaved");
    }
    state.debounceTimer = setTimeout(saveDraft, 5000);
  }

  function startAutoSaveInterval() {
    if (state.intervalTimer) return;
    state.intervalTimer = setInterval(function () {
      const current = getEditorContent();
      if (current !== state.lastSavedBody && current.trim()) {
        saveDraft();
      }
    }, 60000);
  }

  function stopAutoSave() {
    clearTimeout(state.debounceTimer);
    clearInterval(state.intervalTimer);
    state.intervalTimer = null;
  }

  function saveDraft() {
    const body = getEditorContent();
    if (!body.trim() || body === state.lastSavedBody) return;

    localStorage.setItem(draftKey(), body);
    state.lastSavedBody = body;
    setSaveStatus(t("editor.saved_at", { time: formatTime(new Date().toISOString()) }), "saved");
  }

  async function saveSnapshot(label) {
    const work = selectedWork();
    if (!work || !state.authorId || !state.client) return;

    const body = getEditorContent();
    if (!body.trim()) return;

    const episodeId = work.currentEpisodeId;
    if (!episodeId) {
      saveDraft();
      return;
    }

    setSaveStatus(t("editor.saving"), "saving");
    try {
      const result = await state.client.from("episode_snapshots").insert({
        episode_id: episodeId,
        author_id: state.authorId,
        body: body,
        label: label || null
      });
      if (result.error) throw result.error;
      state.lastSavedBody = body;
      setSaveStatus(t("editor.saved_at", { time: formatTime(new Date().toISOString()) }), "saved");
      await loadSnapshots();
    } catch (e) {
      console.error("[InkRoad] snapshot save failed:", e);
      localStorage.setItem(draftKey(), body);
      setSaveStatus(t("editor.offline_saved"), "offline");
    }
  }

  async function loadSnapshots() {
    const work = selectedWork();
    if (!work || !work.currentEpisodeId || !state.client) {
      state.snapshots = [];
      renderSnapshotList();
      return;
    }
    try {
      const result = await state.client
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
      refs.snapshotList.innerHTML = "<p class='snapshot-list-empty'>" + esc(t("editor.no_snapshots")) + "</p>";
      return;
    }

    refs.snapshotList.innerHTML = state.snapshots.map(function (snap) {
      const timeStr = formatDate(snap.created_at);
      const labelHtml = snap.label ? "<span class='snapshot-label'>" + esc(snap.label) + "</span>" : "";
      return "<div class='snapshot-item' data-snapshot-id='" + esc(snap.id) + "'>" +
        "<div class='snapshot-item-header'>" +
          "<span class='snapshot-item-time'>" + esc(timeStr) + "</span>" +
          labelHtml +
        "</div>" +
        "<div class='snapshot-item-actions'>" +
          "<button type='button' data-action='restore' data-id='" + esc(snap.id) + "'>" + esc(t("editor.snapshot_restore")) + "</button>" +
          "<button type='button' data-action='diff' data-id='" + esc(snap.id) + "'>" + esc(t("editor.snapshot_diff")) + "</button>" +
          "<button type='button' data-action='label' data-id='" + esc(snap.id) + "'>" + esc(t("editor.snapshot_name")) + "</button>" +
        "</div>" +
      "</div>";
    }).join("");

    refs.snapshotList.querySelectorAll("button[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === "restore") restoreSnapshot(id);
        if (action === "diff") showDiff(id);
        if (action === "label") labelSnapshot(id);
      });
    });
  }

  async function restoreSnapshot(id) {
    const snap = state.snapshots.find(function (s) { return s.id === id; });
    if (!snap) return;

    const confirmed = window.confirm(t("editor.restore_confirm"));
    if (!confirmed) return;

    await saveSnapshot(t("editor.restore_auto_label"));
    setEditorContent(snap.body);
    state.lastSavedBody = snap.body;
    setSaveStatus(t("editor.restored"), "saved");
    setSubmitState(false);
  }

  async function labelSnapshot(id) {
    const snap = state.snapshots.find(function (s) { return s.id === id; });
    if (!snap || !state.client) return;

    const name = window.prompt(t("editor.snapshot_label_prompt"), snap.label || "");
    if (name === null) return;

    try {
      const result = await state.client
        .from("episode_snapshots")
        .update({ label: name.trim() || null })
        .eq("id", id);
      if (result.error) throw result.error;
      await loadSnapshots();
    } catch (e) {
      console.error("[InkRoad] label update failed:", e);
      window.alert(t("editor.snapshot_label_failed"));
    }
  }

  function showDiff(snapshotId) {
    if (!refs.diffView || typeof diff_match_patch === "undefined") return;

    const snap = state.snapshots.find(function (s) { return s.id === snapshotId; });
    if (!snap) return;

    const dmp = new diff_match_patch();
    const current = getEditorContent();
    const diffs = dmp.diff_main(snap.body, current);
    dmp.diff_cleanupSemantic(diffs);

    const html = diffs.map(function (part) {
      const op = part[0];
      const text = esc(part[1]);
      if (op === 1) return "<ins class='diff-add'>" + text + "</ins>";
      if (op === -1) return "<del class='diff-del'>" + text + "</del>";
      return "<span>" + text + "</span>";
    }).join("");

    refs.diffView.innerHTML = html;
    refs.diffView.hidden = false;
  }

  function openSnapshotPanel() {
    if (refs.snapshotPanel) refs.snapshotPanel.setAttribute("data-open", "true");
    loadSnapshots();
  }

  function closeSnapshotPanel() {
    if (refs.snapshotPanel) refs.snapshotPanel.setAttribute("data-open", "false");
    if (refs.diffView) refs.diffView.hidden = true;
  }

  function renderConfigMessage() {
    if (!refs.authShell) return;
    refs.authShell.innerHTML =
      "<div class='auth-card' data-tone='warning'><div class='auth-head'><span class='eyebrow'>" + esc(t("auth.config_title")) + "</span><h2 class='auth-title'>" + esc(t("auth.config_message")) + "</h2><p class='auth-text'><code>assets/supabase-config.js</code>에 프로젝트 URL과 공개 키를 먼저 넣어주세요.</p></div></div>";
    showForm(false);
    showEmpty("연결값이 준비되면 회차를 발행할 수 있습니다.");
  }

  function renderSignedIn(session) {
    const profileName = session.user.user_metadata && session.user.user_metadata.display_name;
    const displayName = profileName || session.user.email || t("auth.creator");
    refs.authShell.innerHTML =
      "<div class='auth-card' data-tone='success'><div class='auth-status-row'><div class='auth-user'><span class='auth-badge'>" + esc(t("auth.logged_in")) + "</span><strong>" + esc(displayName) + "</strong><span class='auth-note'>내가 올린 작품에만 새 회차를 추가할 수 있습니다.</span></div><div class='auth-actions'><a class='button ghost' href='creator_dashboard_pc.html'>" + esc(t("auth.manage_works")) + "</a><button class='button secondary' type='button' data-episode-logout>" + esc(t("auth.logout")) + "</button></div></div></div>";
    const logoutButton = q("[data-episode-logout]", refs.authShell);
    if (logoutButton) {
      logoutButton.addEventListener("click", async function () {
        await state.client.auth.signOut();
      });
    }
  }

  function renderAuthGate(message) {
    const note = message
      ? "<p class='auth-note'>" + esc(message) + "</p>"
      : "<p class='auth-note'>업로드 페이지에서 쓰던 계정으로 로그인하면 내가 올린 작품 목록이 자동으로 뜹니다.</p>";
    refs.authShell.innerHTML =
      "<div class='auth-card'><div class='auth-head'><span class='eyebrow'>" + esc(t("editor.auth_gate_title")) + "</span><h2 class='auth-title'>" + esc(t("editor.auth_gate_subtitle")) + "</h2><p class='auth-text'>로그인한 계정이 올린 작품만 선택 목록에 나타납니다.</p></div><form class='auth-form' data-episode-auth-form><div class='auth-grid'><label class='auth-label'><span>이메일</span><input class='auth-input' type='email' name='email' placeholder='you@example.com' required></label><label class='auth-label'><span>비밀번호</span><input class='auth-input' type='password' name='password' minlength='8' placeholder='8자 이상' required></label></div><label class='auth-label'><span>닉네임</span><input class='auth-input' type='text' name='displayName' placeholder='처음 가입할 때만 사용됩니다'></label><div class='auth-actions'><button class='button primary' type='submit'>로그인</button><button class='button secondary' type='button' data-episode-signup>회원가입</button></div>" + note + "</form></div>";
    showForm(false);
    showEmpty("로그인하면 회차 발행 폼이 열립니다.");

    const form = q("[data-episode-auth-form]", refs.authShell);
    const signupButton = q("[data-episode-signup]", refs.authShell);

    if (form) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const formData = new FormData(form);
        const email = String(formData.get("email") || "").trim();
        const password = String(formData.get("password") || "").trim();
        try {
          const result = await state.client.auth.signInWithPassword({ email: email, password: password });
          if (result.error) throw result.error;
        } catch (error) {
          renderAuthGate(error.message || t("auth.login_failed"));
        }
      });
    }

    if (signupButton) {
      signupButton.addEventListener("click", async function () {
        if (!form) return;
        const formData = new FormData(form);
        const email = String(formData.get("email") || "").trim();
        const password = String(formData.get("password") || "").trim();
        const displayName = String(formData.get("displayName") || "").trim();
        try {
          const result = await state.client.auth.signUp({
            email: email,
            password: password,
            options: { data: { display_name: displayName || email.split("@")[0] } }
          });
          if (result.error) throw result.error;
          if (!result.data || !result.data.session) {
            renderAuthGate("가입 요청이 접수되었습니다. 메일 인증이 켜져 있다면 메일 확인 후 다시 로그인하세요.");
          }
        } catch (error) {
          renderAuthGate(error.message || t("auth.signup_failed"));
        }
      });
    }
  }

  async function fetchWorks(userId) {
    const authorResult = await state.client
      .from("authors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (authorResult.error) throw authorResult.error;
    if (!authorResult.data) return [];

    state.authorId = authorResult.data.id;

    const novelsResult = await state.client
      .from("novels")
      .select("id,slug,title,short_description,status,cover_url,banner_url,free_episode_count,total_episode_count,view_count,reaction_score")
      .eq("author_id", authorResult.data.id)
      .order("updated_at", { ascending: false });
    if (novelsResult.error) throw novelsResult.error;
    const novels = novelsResult.data || [];
    if (!novels.length) return [];

    const novelIds = novels.map(function (n) { return n.id; });

    const tagsResult = await state.client
      .from("novel_tags")
      .select("novel_id,tags(name)")
      .in("novel_id", novelIds);
    if (tagsResult.error) throw tagsResult.error;

    const episodeIndexResult = await state.client.rpc("list_owned_episodes_for_author");
    if (episodeIndexResult.error) throw episodeIndexResult.error;
    const episodeRows = Array.isArray(episodeIndexResult.data) ? episodeIndexResult.data : [];

    const tagMap = new Map();
    (tagsResult.data || []).forEach(function (row) {
      const current = tagMap.get(row.novel_id) || [];
      const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
      if (tag && tag.name) current.push(tag.name);
      tagMap.set(row.novel_id, current);
    });

    const works = novels.map(function (novel) {
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
        latestEpisode: null,
        hiddenEpisodes: [],
        episodes: [],
        tags: tagMap.get(novel.id) || [],
        currentEpisodeId: null
      };
    });

    const workMap = new Map(works.map(function (work) { return [work.id, work]; }));
    episodeRows.forEach(function (row) {
      const work = workMap.get(row.novel_id || row.novelId);
      if (!work) return;
      work.episodes.push({
        id: row.episode_id || row.episodeId,
        episodeNumber: Number(row.episode_number || row.episodeNumber || 0),
        title: row.title || t("editor.latest_episode"),
        status: row.status || "draft",
        accessType: row.access_type || row.accessType || "free",
        price: Number(row.price || 0),
        updatedAt: row.updated_at || row.updatedAt || null,
        publishedAt: row.published_at || row.publishedAt || null
      });
    });

    works.forEach(syncWorkEpisodeState);
    return works;
  }

  function renderSelectedWork() {
    const work = selectedWork();
    if (!work) return;

    if (refs.selectedImage) refs.selectedImage.src = cover(work);
    if (refs.selectedImage) refs.selectedImage.alt = work.title + " 표지";
    if (refs.selectedTitle) refs.selectedTitle.textContent = work.title;
    if (refs.selectedSummary) refs.selectedSummary.textContent = summary(work);

    if (refs.selectedMeta) {
      const nextEpisode = Number(work.totalEpisodeCount || 0) + 1;
      refs.selectedMeta.innerHTML =
        "<span class='episode-chip' data-tone='" + esc(work.status) + "'>" + statusLabel(work.status) + "</span>" +
        "<span class='episode-chip'>" + (state.mode === "edit" ? "선택 회차 수정" : "다음 " + formatCount(nextEpisode) + "화") + "</span>" +
        "<span class='episode-chip'>전체 관리 " + formatCount((work.episodes || []).length) + "화</span>" +
        "<span class='episode-chip'>조회 " + formatCount(work.viewCount) + "</span>";
    }

    if (refs.selectedTags) {
      refs.selectedTags.innerHTML = work.tags.length
        ? work.tags.slice(0, 4).map(function (tag) { return "<span class='episode-chip'>" + esc(tag) + "</span>"; }).join("")
        : "<span class='episode-chip'>" + esc(t("common.no_tags")) + "</span>";
    }

    renderEpisodeIndex();

    if (state.mode !== "edit") {
      const draft = localStorage.getItem(draftKey());
      if (draft && !getEditorContent().trim()) {
        setEditorContent(draft);
        setSaveStatus(t("editor.draft_restored"), "offline");
      }
    }
  }

  function renderNovelOptions() {
    if (!refs.novelSelect) return;

    if (!state.works.length) {
      refs.novelSelect.innerHTML = "<option value=''>" + esc(t("editor.no_works_option")) + "</option>";
      return;
    }

    refs.novelSelect.innerHTML = state.works.map(function (work) {
      const nextEpisode = Number(work.totalEpisodeCount || 0) + 1;
      const selected = work.slug === state.selectedSlug ? " selected" : "";
      return "<option value='" + esc(work.slug) + "'" + selected + ">" + esc(work.title) + " · 다음 " + formatCount(nextEpisode) + "화</option>";
    }).join("");

    if (!state.selectedSlug || !state.works.some(function (w) { return w.slug === state.selectedSlug; })) {
      state.selectedSlug = state.works[0].slug;
      refs.novelSelect.value = state.selectedSlug;
    }

    applyNovelLock();
  }

  function togglePrice() {
    const isPaid = refs.accessSelect && refs.accessSelect.value === "paid";
    if (refs.priceWrap) refs.priceWrap.hidden = !isPaid;
    if (refs.priceInput && !isPaid) refs.priceInput.value = "100";
    setSubmitState(false);
  }

  function clearLoadedEditState() {
    state.loadedEpisode = null;
    state.loadedForUserId = null;
    state.lockedNovelSlug = "";

    state.works.forEach(function (work) {
      work.currentEpisodeId = null;
    });

    if (refs.titleInput) refs.titleInput.value = "";
    if (refs.accessSelect) refs.accessSelect.value = "free";
    if (refs.priceInput) refs.priceInput.value = "100";
    setEditorContent("");
    state.lastSavedBody = "";
    renderEditMeta();
    applyNovelLock();
    togglePrice();
  }

  function cancelPendingEditLoadRequests() {
    state.editLoadRequestSeq += 1;
  }

  function isActiveEditLoadRequest(requestToken) {
    return Boolean(
      requestToken &&
      state.session &&
      state.session.user &&
      state.editLoadRequestSeq === requestToken.seq &&
      state.session.user.id === requestToken.userId
    );
  }

  function shouldCancelSubmitForAuthChange(previousSession, nextSession) {
    const previousUserId = previousSession && previousSession.user ? previousSession.user.id : null;
    const nextUserId = nextSession && nextSession.user ? nextSession.user.id : null;
    return previousUserId !== nextUserId;
  }

  function cancelPendingSubmitRequests() {
    state.submitRequestSeq += 1;
    if (!state.busy) return;
    state.busy = false;
    setSubmitState(false);
  }

  function isActiveSubmitRequest(requestToken) {
    return Boolean(
      requestToken &&
      state.session &&
      state.session.user &&
      state.submitRequestSeq === requestToken.seq &&
      state.session.user.id === requestToken.userId
    );
  }

  async function loadEpisodeForEdit(session) {
    if (state.mode !== "edit") return;

    if (!session || !session.user) {
      clearLoadedEditState();
      showForm(false);
      throw new Error("로그인이 필요합니다.");
    }

    if (!state.editingEpisodeId) {
      clearLoadedEditState();
      showForm(false);
      throw new Error("수정할 회차 ID가 없습니다.");
    }

    if (
      state.loadedEpisode &&
      state.loadedEpisode.id === state.editingEpisodeId &&
      state.loadedForUserId === session.user.id
    ) {
      showForm(true);
      return;
    }

    const requestToken = {
      seq: ++state.editLoadRequestSeq,
      userId: session.user.id
    };

    showForm(false);
    clearLoadedEditState();
    setStatus("회차 정보를 불러오는 중입니다...", "info");

    try {
      const preloadResult = await state.client.rpc("get_owned_episode_edit_payload_for_author", {
        p_episode_id: state.editingEpisodeId
      });

      if (!isActiveEditLoadRequest(requestToken)) return;
      if (preloadResult.error) throw preloadResult.error;

      const data = Array.isArray(preloadResult.data) ? preloadResult.data[0] : preloadResult.data;
      if (!data || !data.episode_id || !data.novel_slug) {
        throw new Error("회차 정보를 찾을 수 없습니다.");
      }

      if (!isActiveEditLoadRequest(requestToken)) return;

      state.loadedEpisode = {
        id: data.episode_id,
        novelSlug: data.novel_slug,
        episodeNumber: Number(data.episode_number || 0),
        updatedAt: data.updated_at || null
      };
      state.loadedForUserId = session.user.id;
      state.lockedNovelSlug = data.novel_slug;
      state.selectedSlug = data.novel_slug;

      const targetWork = state.works.find(function (work) { return work.slug === data.novel_slug; });
      if (!targetWork) {
        throw new Error("수정할 회차의 작품 정보를 찾을 수 없습니다.");
      }
      state.works.forEach(function (work) {
        work.currentEpisodeId = work.slug === data.novel_slug ? data.episode_id : null;
      });

      if (refs.novelSelect) refs.novelSelect.value = state.lockedNovelSlug;
      applyNovelLock();
      if (refs.titleInput) refs.titleInput.value = data.title || "";
      if (refs.accessSelect) refs.accessSelect.value = data.access_type || "free";
      if (refs.priceInput) refs.priceInput.value = String(Number(data.price || 0));

      const body = data.body || "";
      setEditorContent(body);
      state.lastSavedBody = body;

      renderSelectedWork();
      renderEditMeta();
      togglePrice();
      setSaveStatus("회차 원문을 불러왔습니다.", "saved");
      setStatus("회차 정보를 불러왔습니다.", "info");
      showForm(true);
      setSubmitState(false);
    } catch (error) {
      if (!isActiveEditLoadRequest(requestToken)) return;
      clearLoadedEditState();
      showForm(false);
      throw error;
    }
  }

  async function handlePublish(event) {
    event.preventDefault();
    if (state.busy) return;

    const sessionResult = await state.client.auth.getSession();
    const session = sessionResult.data.session;
    if (!session) {
      renderAuthGate(t("auth.login_required_msg"));
      setStatus(t("auth.login_required_msg"), "error");
      return;
    }

    state.session = session;
    rememberAccessToken(session);

    const work = selectedWork();
    if (!work) {
      setStatus(t("editor.work_required"), "error");
      return;
    }

    if (state.mode === "edit") {
      if (!state.editingEpisodeId || !state.loadedEpisode) {
        setStatus("수정할 회차 정보를 다시 불러와 주세요.", "error");
        return;
      }
      if (state.loadedForUserId !== session.user.id) {
        setStatus("세션이 바뀌어 수정 권한이 만료되었습니다. 다시 로그인해 주세요.", "error");
        return;
      }
      if (state.lockedNovelSlug && refs.novelSelect && refs.novelSelect.value !== state.lockedNovelSlug) {
        setStatus("작품 선택이 변경되어 저장을 중단했습니다. 다시 시도해 주세요.", "error");
        return;
      }
    }

    const title = String(refs.titleInput.value || "").trim();
    const body = getEditorContent().trim();
    const accessType = refs.accessSelect ? refs.accessSelect.value : "free";
    const price = refs.priceInput ? Number(refs.priceInput.value || 0) : 0;

    if (!title) {
      setStatus(t("editor.title_required"), "error");
      refs.titleInput.focus();
      return;
    }

    if (!body) {
      setStatus(t("editor.body_required"), "error");
      return;
    }

    const requestToken = {
      seq: ++state.submitRequestSeq,
      userId: session.user.id
    };

    state.busy = true;
    setSubmitState(true);
    setStatus(state.mode === "edit" ? "회차 수정을 저장하고 있습니다..." : t("editor.publishing_message"), "info");

    try {
      let rpcResult;

      if (state.mode === "edit") {
        rpcResult = await state.client.rpc("update_episode_for_author", {
          p_episode_id: state.editingEpisodeId,
          p_title: title,
          p_body: body,
          p_access_type: accessType,
          p_price: accessType === "paid" ? price : 0
        });
      } else {
        rpcResult = await state.client.rpc("create_episode_for_author_novel", {
          p_novel_slug: work.slug,
          p_title: title,
          p_body: body,
          p_access_type: accessType,
          p_price: accessType === "paid" ? price : 0
        });
      }

      if (!isActiveSubmitRequest(requestToken)) return;
      if (rpcResult.error) throw rpcResult.error;

      const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
      if (!row || !row.novel_slug) {
        throw new Error("회차는 저장됐지만 이동할 주소를 찾지 못했습니다.");
      }

      if (state.authorId && (row.episode_id || state.editingEpisodeId)) {
        try {
          await state.client.from("episode_snapshots").insert({
            episode_id: row.episode_id || state.editingEpisodeId,
            author_id: state.authorId,
            body: body,
            label: state.mode === "edit" ? "수정 저장" : t("editor.published_label")
          });
        } catch (ignore) {
          // non-critical
        }
      }

      if (!isActiveSubmitRequest(requestToken)) return;

      localStorage.removeItem(draftKey());
      stopAutoSave();

      setStatus(
        state.mode === "edit"
          ? "회차 수정이 완료되었습니다. 읽기 화면으로 이동합니다."
          : t("editor.publish_success"),
        "success"
      );
      refs.submitButtons.forEach(function (btn) {
        btn.textContent = t("editor.moving");
      });
      window.setTimeout(function () {
        if (!isActiveSubmitRequest(requestToken)) return;
        window.location.href = viewerHref(row.novel_slug, row.episode_number || (state.loadedEpisode ? state.loadedEpisode.episodeNumber : (work.totalEpisodeCount || 0) + 1));
      }, 700);
    } catch (error) {
      if (!isActiveSubmitRequest(requestToken)) return;
      setStatus(error.message || (state.mode === "edit" ? "회차 수정 중 오류가 생겼습니다." : t("editor.publish_error")), "error");
      state.busy = false;
      setSubmitState(false);
    }
  }

  function bindEvents() {
    if (refs.novelSelect) {
      refs.novelSelect.addEventListener("change", function () {
        if (state.mode === "edit" && state.lockedNovelSlug) {
          refs.novelSelect.value = state.lockedNovelSlug;
          return;
        }
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

    if (refs.episodeFilterButtons && refs.episodeFilterButtons.length) {
      refs.episodeFilterButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          applyEpisodeFilter(btn.getAttribute("data-episode-filter") || "all");
        });
      });
    }

    if (refs.episodeRestoreAll) {
      refs.episodeRestoreAll.addEventListener("click", function () {
        restoreAllTrashedEpisodes().catch(function (error) {
          setStatus(error.message || "휴지통 전체 복원 중 오류가 생겼습니다.", "error");
        });
      });
    }

    if (refs.episodePurge) {
      refs.episodePurge.addEventListener("click", function () {
        purgeTrashedEpisodes().catch(function (error) {
          setStatus(error.message || "휴지통 비우기 중 오류가 생겼습니다.", "error");
        });
      });
    }

    if (refs.episodeIndexList) {
      refs.episodeIndexList.addEventListener("click", function (event) {
        const hideTrigger = event.target.closest("[data-episode-hide]");
        if (hideTrigger) {
          hideEpisodeFromIndex(hideTrigger.getAttribute("data-episode-hide") || "").catch(function (error) {
            setStatus(error.message || "회차 숨김 중 오류가 생겼습니다.", "error");
          });
          return;
        }

        const unhideTrigger = event.target.closest("[data-episode-unhide]");
        if (unhideTrigger) {
          unhideEpisodeFromIndex(unhideTrigger.getAttribute("data-episode-unhide") || "").catch(function (error) {
            setStatus(error.message || "회차 다시 공개 중 오류가 생겼습니다.", "error");
          });
          return;
        }

        const trashTrigger = event.target.closest("[data-episode-trash]");
        if (trashTrigger) {
          trashEpisodeFromIndex(trashTrigger.getAttribute("data-episode-trash") || "").catch(function (error) {
            setStatus(error.message || "회차를 휴지통으로 보내는 중 오류가 생겼습니다.", "error");
          });
          return;
        }

        const restoreTrigger = event.target.closest("[data-episode-restore]");
        if (restoreTrigger) {
          restoreEpisodeFromTrash(restoreTrigger.getAttribute("data-episode-restore") || "").catch(function (error) {
            setStatus(error.message || "회차 복원 중 오류가 생겼습니다.", "error");
          });
        }
      });
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

  async function refreshSession() {
    const sessionResult = await state.client.auth.getSession();
    const previousSession = state.session;
    const nextSession = sessionResult.data.session;
    cancelPendingEditLoadRequests();
    if (shouldCancelSubmitForAuthChange(previousSession, nextSession)) {
      cancelPendingSubmitRequests();
    }

    state.session = nextSession;
    rememberAccessToken(state.session);

    if (!state.session) {
      stopAutoSave();
      clearLoadedEditState();
      renderAuthGate();
      setSubmitState(false);
      return;
    }

    renderSignedIn(state.session);
    state.works = await fetchWorks(state.session.user.id);

    if (!state.works.length) {
      showForm(false);
      if (state.mode === "edit") {
        showEmpty("수정 가능한 작품 정보를 찾지 못했습니다.", "내 작품 보기", "creator_dashboard_pc.html");
      } else {
        showEmpty(t("editor.no_works_message"), t("editor.first_work_upload"), "novel_upload_pc.html");
      }
      setSubmitState(false);
      return;
    }

    hideEmpty();
    showForm(true);
    renderNovelOptions();
    renderSelectedWork();
    togglePrice();
    setStatus("", "");

    initEditor();
    startAutoSaveInterval();

    if (state.mode === "edit") {
      showForm(false);
      try {
        await loadEpisodeForEdit(state.session);
      } catch (error) {
        clearLoadedEditState();
        showForm(false);
        setStatus(error.message || "회차 정보를 불러오지 못했습니다.", "error");
      }
    }

    setSubmitState(false);
  }

  async function boot() {
    if (!refs.authShell || !refs.form) return;

    applyModeUI();
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
      const previousSession = state.session;
      cancelPendingEditLoadRequests();
      if (shouldCancelSubmitForAuthChange(previousSession, session)) {
        cancelPendingSubmitRequests();
      }

      state.session = session;
      rememberAccessToken(session);

      if (!session) {
        stopAutoSave();
        clearLoadedEditState();
        renderAuthGate();
        setSubmitState(false);
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
    renderAuthGate(error.message || t("auth.config_message"));
  });
})();
