(function () {
  const page = (window.location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  if (page !== "novel_upload_pc") return;

  const search = new URLSearchParams(window.location.search);
  const editParam = search.get("edit");

  const cfg = window.inkroadSupabaseConfig || {};
  const base = (cfg.url || "").replace(/\/$/, "");
  const key = cfg.publishableKey || cfg.anonKey || "";
  const storageKeys = {
    session: "inkroad-supabase-auth",
    accessToken: "inkroad-supabase-access-token"
  };
  const bucketName = "novel-covers";
  const state = {
    client: null,
    session: null,
    mode: "create",
    editingNovelId: null,
    existingCoverUrl: "",
    loadedNovel: null,
    loadedForUserId: null,
    editLoadRequestSeq: 0,
    submitRequestSeq: 0,
    busy: false,
    previewMode: false,
    previewRequestSeq: 0,
    coverFile: null,
    coverObjectUrl: "",
    tagMap: new Map()
  };

  if (editParam && editParam.trim()) {
    state.mode = "edit";
    state.editingNovelId = editParam.trim();
  }

  const refs = {
    authShell: document.querySelector("[data-upload-auth]"),
    form: document.querySelector("[data-upload-form]"),
    pageTitle: document.querySelector("[data-upload-page-title]"),
    pageSubtitle: document.querySelector("[data-upload-page-subtitle]"),
    title: document.querySelector("[data-upload-title]"),
    summary: document.querySelector("[data-upload-summary]"),
    ageRating: document.querySelector("[data-upload-age-rating]"),
    originCountry: document.querySelector("[data-upload-origin-country]"),
    isTranslation: document.querySelector("[data-upload-is-translation]"),
    firstEpisodeSection: document.querySelector("[data-upload-first-episode-section]"),
    episodeTitle: document.querySelector("[data-upload-episode-title]"),
    body: document.querySelector("[data-upload-body]"),
    preview: document.querySelector("[data-upload-preview]"),
    previewToggles: Array.from(document.querySelectorAll("[data-upload-preview-toggle]")),
    status: document.querySelector("[data-upload-status]"),
    coverInput: document.querySelector("[data-cover-input]"),
    coverDropzone: document.querySelector("[data-cover-dropzone]"),
    coverPreview: document.querySelector("[data-cover-preview]"),
    coverPlaceholder: document.querySelector("[data-cover-placeholder]"),
    coverHint: document.querySelector("[data-cover-hint]"),
    tagContainer: document.querySelector("[data-tag-container]"),
    customTagList: document.querySelector("[data-custom-tag-list]"),
    customTagInput: document.querySelector("[data-custom-tag-input]"),
    addTagButton: document.querySelector("[data-add-tag]"),
    formatButtons: Array.from(document.querySelectorAll("[data-format-action]")),
    submitButtons: Array.from(document.querySelectorAll("[data-upload-submit]"))
  };

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

  function normalizeTag(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function slugPart(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "cover";
  }

  function currentRelativePath() {
    const name = window.location.pathname.split("/").pop() || "novel_upload_pc.html";
    return name + window.location.search;
  }

  function authHref(mode) {
    return "auth_pc.html?next=" + encodeURIComponent(currentRelativePath()) + (mode === "signup" ? "&mode=signup" : "");
  }

  function redirectToAuth(mode) {
    window.location.replace(authHref(mode));
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

  function getModeText() {
    if (state.mode === "edit") {
      return {
        badge: "작품 수정 모드",
        title: "작품 수정",
        subtitle: "소개, 태그, 표지를 수정합니다. 회차 본문은 회차 편집에서 수정하세요.",
        submit: "수정 저장",
        submitting: "수정 중..."
      };
    }
    return {
      badge: "새 작품 발행",
      title: "작품 등록",
      subtitle: "제목, 태그, 첫 회차 본문을 작성합니다.",
      submit: t("upload.publish_button"),
      submitting: t("upload.publishing_button")
    };
  }

  function applyModeUI() {
    const modeText = getModeText();
    if (refs.pageTitle) refs.pageTitle.textContent = modeText.title;
    if (refs.pageSubtitle) refs.pageSubtitle.textContent = modeText.subtitle;
    if (refs.firstEpisodeSection) {
      refs.firstEpisodeSection.hidden = state.mode === "edit";
    }
    if (refs.episodeTitle) refs.episodeTitle.required = state.mode !== "edit";
    if (refs.body) refs.body.required = state.mode !== "edit";
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

  function setPreviewMode(enabled) {
    state.previewMode = Boolean(enabled);
    if (state.previewMode) renderPreview();
    if (!refs.body || !refs.preview) return;
    refs.body.hidden = state.previewMode;
    refs.preview.hidden = !state.previewMode;
    refs.previewToggles.forEach(function (button) {
      if (button.textContent.trim()) {
        button.textContent = state.previewMode ? t("upload.preview_edit") : t("upload.preview_toggle");
      }
      button.setAttribute("aria-pressed", String(state.previewMode));
    });
  }

  function decoratePreviewHtml(html) {
    return String(html || "").replace(/<hr\s*\/?>/gi, "<div class='scene-break' aria-hidden='true'>* * *</div>");
  }

  function fallbackPreviewHtml(source) {
    return String(source || "")
      .split(/\n{2,}/)
      .filter(Boolean)
      .map(function (block) {
        return "<p>" + esc(block).replace(/\n/g, "<br>") + "</p>";
      }).join("");
  }

  function renderPreview() {
    if (!refs.preview || !refs.body) return;
    const source = String(refs.body.value || "").trim();
    if (!source) {
      refs.preview.innerHTML = "<p>" + t("upload.preview_empty") + "</p>";
      return;
    }

    const commitPreviewHtml = function (html) {
      const normalized = String(html || "").trim();
      refs.preview.innerHTML = normalized ? decoratePreviewHtml(normalized) : fallbackPreviewHtml(source);
    };

    if (typeof marked !== "undefined" && typeof marked.parse === "function") {
      try {
        if (!renderPreview._configured && typeof marked.setOptions === "function") {
          marked.setOptions({ gfm: true, breaks: true, headerIds: false, mangle: false });
          renderPreview._configured = true;
        }

        const parsed = marked.parse(source);
        if (parsed && typeof parsed.then === "function") {
          const requestSeq = ++state.previewRequestSeq;
          refs.preview.innerHTML = "<p>미리보기를 불러오는 중...</p>";
          parsed.then(function (html) {
            if (requestSeq !== state.previewRequestSeq) return;
            commitPreviewHtml(html);
          }).catch(function () {
            if (requestSeq !== state.previewRequestSeq) return;
            refs.preview.innerHTML = fallbackPreviewHtml(source);
          });
          return;
        }

        commitPreviewHtml(parsed);
        return;
      } catch (_error) {
        refs.preview.innerHTML = fallbackPreviewHtml(source);
        return;
      }
    }

    refs.preview.innerHTML = fallbackPreviewHtml(source);
  }

  function setCoverPreview(file) {
    if (!refs.coverDropzone || !refs.coverPreview || !refs.coverPlaceholder || !refs.coverHint) return;
    if (state.coverObjectUrl) {
      URL.revokeObjectURL(state.coverObjectUrl);
      state.coverObjectUrl = "";
    }

    if (!file) {
      refs.coverDropzone.dataset.hasImage = "false";
      refs.coverPreview.hidden = true;
      refs.coverPreview.removeAttribute("src");
      refs.coverPlaceholder.hidden = false;
      refs.coverHint.textContent = t("upload.cover_hint");
      return;
    }

    state.coverObjectUrl = URL.createObjectURL(file);
    refs.coverDropzone.dataset.hasImage = "true";
    refs.coverPreview.hidden = false;
    refs.coverPreview.src = state.coverObjectUrl;
    refs.coverPlaceholder.hidden = true;
    refs.coverHint.textContent = file.name;
  }

  function addTagBubble(value, selected, isCustom) {
    const tag = normalizeTag(value);
    const keyName = tag.toLowerCase();
    if (!tag || !refs.tagContainer) return;

    const existing = state.tagMap.get(keyName);
    if (existing) {
      existing.classList.toggle("selected", selected !== false);
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag-bubble" + (selected !== false ? " selected" : "");
    button.dataset.tagValue = tag;
    if (isCustom) button.dataset.customTag = "true";
    button.textContent = tag;
    (refs.customTagList || refs.tagContainer).appendChild(button);
    state.tagMap.set(keyName, button);
  }

  function rebuildTagMap() {
    state.tagMap = new Map();
    if (!refs.tagContainer) return;
    Array.from(refs.tagContainer.querySelectorAll("[data-tag-value]")).forEach(function (button) {
      const tag = normalizeTag(button.dataset.tagValue || button.textContent);
      if (!tag) return;
      button.dataset.tagValue = tag;
      state.tagMap.set(tag.toLowerCase(), button);
    });
  }

  function getSelectedTags() {
    if (!refs.tagContainer) return [];
    return Array.from(refs.tagContainer.querySelectorAll("[data-tag-value].selected")).map(function (button) {
      return normalizeTag(button.dataset.tagValue || button.textContent);
    }).filter(Boolean);
  }

  function updateTextarea(nextValue, start, end) {
    if (!refs.body) return;
    refs.body.value = nextValue;
    refs.body.focus();
    refs.body.selectionStart = start;
    refs.body.selectionEnd = end;
    renderPreview();
    setSubmitState(false);
  }

  function wrapSelection(prefix, suffix, placeholder) {
    if (!refs.body) return;
    const textarea = refs.body;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end) || (placeholder || "텍스트");
    const wrapped = prefix + selected + suffix;
    textarea.setRangeText(wrapped, start, end, "end");
    textarea.focus();
    textarea.selectionStart = start + prefix.length;
    textarea.selectionEnd = start + prefix.length + selected.length;
    renderPreview();
    setSubmitState(false);
  }

  function prefixSelectedLines(prefix) {
    if (!refs.body) return;
    const textarea = refs.body;
    const value = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEndCandidate = value.indexOf("\n", end);
    const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;
    const block = value.slice(lineStart, lineEnd);
    const replaced = block.split("\n").map(function (line) {
      return line ? prefix + line : prefix.trimEnd();
    }).join("\n");
    updateTextarea(value.slice(0, lineStart) + replaced + value.slice(lineEnd), lineStart, lineStart + replaced.length);
  }

  function insertBreakMarker() {
    if (!refs.body) return;
    const textarea = refs.body;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const marker = "\n\n---\n\n";
    textarea.setRangeText(marker, start, end, "end");
    const nextCaret = start + marker.length;
    updateTextarea(textarea.value, nextCaret, nextCaret);
  }

  function insertCodeFence() {
    if (!refs.body) return;
    const textarea = refs.body;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end).trim();
    if (selected.indexOf("\n") !== -1) {
      const block = "```\n" + selected + "\n```";
      textarea.setRangeText(block, start, end, "end");
      const nextCaret = start + block.length;
      updateTextarea(textarea.value, nextCaret, nextCaret);
      return;
    }
    wrapSelection("`", "`", "코드");
  }

  function setSubmitState(forceBusy) {
    const hasSession = Boolean(state.session);
    const hasTitle = Boolean(refs.title && refs.title.value.trim());
    const hasEpisodeData = Boolean(
      refs.episodeTitle &&
      refs.body &&
      refs.episodeTitle.value.trim() &&
      refs.body.value.trim()
    );
    const valid = state.mode === "edit" ? hasTitle : Boolean(hasTitle && hasEpisodeData);
    const disabled = Boolean(forceBusy || state.busy || !hasSession || !valid);
    const modeText = getModeText();

    refs.submitButtons.forEach(function (button) {
      button.disabled = disabled;
      if (state.busy) {
        button.textContent = modeText.submitting;
      } else if (!hasSession) {
        button.textContent = t("upload.login_required_button");
      } else {
        button.textContent = modeText.submit;
      }
    });
  }

  function showForm(visible) {
    if (refs.form) refs.form.hidden = !visible;
  }

  function rememberAccessToken(session) {
    if (session && session.access_token) {
      localStorage.setItem(storageKeys.accessToken, session.access_token);
    } else {
      localStorage.removeItem(storageKeys.accessToken);
    }
  }

  function renderSignedIn(_session) {
    showForm(true);
  }


  function renderConfigMessage() {
    setStatus("assets/supabase-config.js에 프로젝트 URL과 공개 키가 들어가야 업로드가 동작합니다.", "error");
    showForm(false);
  }

  function handleCoverFile(file) {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (allowed.indexOf(file.type) === -1) {
      setStatus(t("upload.cover_format_error"), "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setStatus(t("upload.cover_size_error"), "error");
      return;
    }
    state.coverFile = file;
    setCoverPreview(file);
    setStatus(t("upload.cover_selected"), "info");
  }

  async function uploadCover(session) {
    if (!state.coverFile) return null;
    const file = state.coverFile;
    const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = session.user.id + "/" + Date.now() + "-" + slugPart(file.name.replace(/\.[^.]+$/, "")) + "." + extension;
    const result = await state.client.storage.from(bucketName).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream"
    });
    if (result.error) throw result.error;
    const urlResult = state.client.storage.from(bucketName).getPublicUrl(path);
    return urlResult.data && urlResult.data.publicUrl ? urlResult.data.publicUrl : null;
  }

  const initialSelectedTags = refs.tagContainer
    ? Array.from(refs.tagContainer.querySelectorAll("[data-tag-value].selected")).map(function (button) {
      return normalizeTag(button.dataset.tagValue || button.textContent);
    }).filter(Boolean)
    : [];

  function applySelectedTags(tags) {
    if (!refs.tagContainer) return;
    Array.from(refs.tagContainer.querySelectorAll("[data-tag-value]")).forEach(function (button) {
      button.classList.remove("selected");
      if (button.dataset.customTag === "true") {
        button.remove();
      }
    });

    (tags || []).forEach(function (tagName) {
      addTagBubble(tagName, true, true);
    });

    rebuildTagMap();
  }

  function clearLoadedEditState() {
    state.loadedNovel = null;
    state.loadedForUserId = null;
    state.existingCoverUrl = "";
    state.coverFile = null;

    if (refs.coverInput) refs.coverInput.value = "";
    if (refs.title) refs.title.value = "";
    if (refs.summary) refs.summary.value = "";
    if (refs.ageRating) refs.ageRating.value = "15";
    if (refs.originCountry) refs.originCountry.value = "KR";
    if (refs.isTranslation) refs.isTranslation.checked = false;
    if (refs.episodeTitle) refs.episodeTitle.value = "";
    if (refs.body) refs.body.value = "";

    applySelectedTags(initialSelectedTags);
    setCoverPreview(null);
    renderPreview();
  }

  function setCoverPreviewUrl(url) {
    if (!refs.coverDropzone || !refs.coverPreview || !refs.coverPlaceholder || !refs.coverHint) return;
    if (!url) {
      setCoverPreview(null);
      return;
    }

    if (state.coverObjectUrl) {
      URL.revokeObjectURL(state.coverObjectUrl);
      state.coverObjectUrl = "";
    }

    refs.coverDropzone.dataset.hasImage = "true";
    refs.coverPreview.hidden = false;
    refs.coverPreview.src = url;
    refs.coverPlaceholder.hidden = true;
    refs.coverHint.textContent = "기존 표지를 유지합니다";
  }

  async function loadNovelForEdit(session) {
    if (state.mode !== "edit") return;
    if (!session || !session.user) {
      clearLoadedEditState();
      showForm(false);
      throw new Error("로그인이 필요합니다.");
    }
    if (!state.editingNovelId) {
      clearLoadedEditState();
      showForm(false);
      throw new Error("수정할 작품 ID가 없습니다.");
    }
    if (
      state.loadedNovel &&
      state.loadedNovel.id === state.editingNovelId &&
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
    setStatus("작품 정보를 불러오는 중입니다...", "info");

    try {
      const preloadResult = await state.client.rpc("get_owned_novel_edit_payload_for_author", {
        p_novel_id: state.editingNovelId
      });

      if (!isActiveEditLoadRequest(requestToken)) return;
      if (preloadResult.error) throw preloadResult.error;

      const data = Array.isArray(preloadResult.data) ? preloadResult.data[0] : preloadResult.data;
      if (!data || !data.novel_id) {
        throw new Error("작품 정보를 찾을 수 없습니다.");
      }
      if (!isActiveEditLoadRequest(requestToken)) return;

      const loadedTags = Array.isArray(data.tags)
        ? data.tags.map(function (tagName) {
          return normalizeTag(tagName);
        }).filter(Boolean)
        : [];

      state.loadedNovel = {
        id: data.novel_id,
        slug: data.novel_slug || ""
      };
      state.loadedForUserId = session.user.id;
      state.existingCoverUrl = data.cover_url || "";
      state.coverFile = null;

      if (refs.title) refs.title.value = data.title || "";
      if (refs.summary) refs.summary.value = data.short_description || data.description || "";
      if (refs.ageRating) refs.ageRating.value = String(data.age_rating || 15);
      if (refs.originCountry) refs.originCountry.value = (data.origin_country || "KR").toUpperCase().slice(0, 2);
      if (refs.isTranslation) refs.isTranslation.checked = Boolean(data.is_translation);

      if (!isActiveEditLoadRequest(requestToken)) return;
      applySelectedTags(loadedTags);
      setCoverPreviewUrl(state.existingCoverUrl);
      showForm(true);
      setStatus("작품 정보를 불러왔습니다.", "info");
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
      setStatus(t("auth.login_required_msg"), "error");
      redirectToAuth();
      return;
    }
    state.session = session;
    rememberAccessToken(session);

    const title = refs.title ? refs.title.value.trim() : "";
    const shortDescription = refs.summary ? refs.summary.value.trim() : "";
    const episodeTitle = refs.episodeTitle ? refs.episodeTitle.value.trim() : "";
    const body = refs.body ? refs.body.value.trim() : "";
    const ageRating = refs.ageRating ? Number(refs.ageRating.value || 15) : 15;
    const originCountry = refs.originCountry && refs.originCountry.value.trim()
      ? refs.originCountry.value.trim().toUpperCase().slice(0, 2)
      : "KR";
    const isTranslation = refs.isTranslation ? Boolean(refs.isTranslation.checked) : false;
    const tags = getSelectedTags();

    if (!title) {
      setStatus(t("upload.title_required"), "error");
      refs.title.focus();
      return;
    }

    if (state.mode !== "edit") {
      if (!episodeTitle) {
        setStatus(t("upload.episode_title_required"), "error");
        refs.episodeTitle.focus();
        return;
      }
      if (!body) {
        setStatus(t("upload.body_required"), "error");
        refs.body.focus();
        return;
      }
    }

    if (state.mode === "edit" && !state.editingNovelId) {
      setStatus("수정할 작품 정보가 없습니다.", "error");
      return;
    }

    const requestToken = {
      seq: ++state.submitRequestSeq,
      userId: session.user.id
    };

    state.busy = true;
    setSubmitState(true);
    setStatus(
      state.mode === "edit" ? "작품 정보를 저장하고 있습니다..." : t("upload.publishing_message"),
      "info"
    );

    try {
      let novelSlug = "";

      if (state.mode === "edit") {
        const uploadedCoverUrl = await uploadCover(session);
        if (!isActiveSubmitRequest(requestToken)) return;
        const coverUrl = uploadedCoverUrl || state.existingCoverUrl || null;
        const rpcResult = await state.client.rpc("update_novel_for_author", {
          p_novel_id: state.editingNovelId,
          p_title: title,
          p_subtitle: null,
          p_short_description: shortDescription,
          p_description: shortDescription,
          p_cover_url: coverUrl,
          p_banner_url: null,
          p_status: null,
          p_age_rating: ageRating,
          p_is_translation: isTranslation,
          p_origin_country: originCountry,
          p_language_code: null,
          p_tags: tags
        });

        if (!isActiveSubmitRequest(requestToken)) return;
        if (rpcResult.error) throw rpcResult.error;
        const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
        if (!row || !row.novel_slug) {
          throw new Error(t("upload.publish_address_error"));
        }
        novelSlug = row.novel_slug;
        state.existingCoverUrl = coverUrl || "";
      } else {
        const coverUrl = await uploadCover(session);
        if (!isActiveSubmitRequest(requestToken)) return;
        const rpcResult = await state.client.rpc("create_novel_with_episode", {
          p_title: title,
          p_short_description: shortDescription || null,
          p_description: shortDescription || null,
          p_cover_url: coverUrl,
          p_episode_title: episodeTitle,
          p_episode_body: body,
          p_tags: tags,
          p_age_rating: ageRating,
          p_is_translation: isTranslation,
          p_origin_country: originCountry
        });

        if (!isActiveSubmitRequest(requestToken)) return;
        if (rpcResult.error) throw rpcResult.error;
        const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
        if (!row || !row.novel_slug) {
          throw new Error(t("upload.publish_address_error"));
        }
        novelSlug = row.novel_slug;
      }

      if (!isActiveSubmitRequest(requestToken)) return;
      setStatus(
        state.mode === "edit" ? "수정이 완료되었습니다. 상세 페이지로 이동합니다." : t("upload.publish_success"),
        "success"
      );
      refs.submitButtons.forEach(function (button) {
        button.textContent = t("upload.publish_moving");
      });
      window.setTimeout(function () {
        if (!isActiveSubmitRequest(requestToken)) return;
        window.location.href = "novel_detail_pc.html?slug=" + encodeURIComponent(novelSlug);
      }, 700);
    } catch (error) {
      if (!isActiveSubmitRequest(requestToken)) return;
      setStatus(
        error.message || (state.mode === "edit" ? "작품 수정 중 오류가 생겼습니다." : t("upload.publish_error")),
        "error"
      );
      state.busy = false;
      setSubmitState(false);
    }
  }

  function bindPageEvents() {
    if (refs.form) {
      refs.form.addEventListener("submit", handlePublish);
      refs.form.addEventListener("input", function () {
        setSubmitState(false);
      });
    }

    if (refs.coverDropzone && refs.coverInput) {
      refs.coverDropzone.addEventListener("click", function () {
        refs.coverInput.click();
      });
      refs.coverDropzone.addEventListener("dragover", function (event) {
        event.preventDefault();
      });
      refs.coverDropzone.addEventListener("drop", function (event) {
        event.preventDefault();
        const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
        handleCoverFile(file);
      });
      refs.coverInput.addEventListener("change", function () {
        const file = refs.coverInput.files && refs.coverInput.files[0] ? refs.coverInput.files[0] : null;
        handleCoverFile(file);
      });
    }

    rebuildTagMap();

    if (refs.tagContainer) {
      refs.tagContainer.addEventListener("click", function (event) {
        const button = event.target.closest("[data-tag-value]");
        if (!button) return;
        button.classList.toggle("selected");
      });
    }

    if (refs.addTagButton && refs.customTagInput) {
      const addTag = function () {
        const value = normalizeTag(refs.customTagInput.value);
        if (!value) return;
        addTagBubble(value, true, true);
        refs.customTagInput.value = "";
      };
      refs.addTagButton.addEventListener("click", addTag);
      refs.customTagInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          addTag();
        }
      });
    }

    refs.formatButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const action = button.dataset.formatAction;
        if (!refs.body) return;
        if (action === "heading") prefixSelectedLines("## ");
        if (action === "bold") wrapSelection("**", "**", "강조할 문장");
        if (action === "italic") wrapSelection("*", "*", "기울일 문장");
        if (action === "list") prefixSelectedLines("- ");
        if (action === "quote") prefixSelectedLines("> ");
        if (action === "code") insertCodeFence();
        if (action === "break") insertBreakMarker();
      });
    });

    refs.previewToggles.forEach(function (button) {
      button.dataset.previewBound = "true";
      button.addEventListener("click", function () {
        renderPreview();
        setPreviewMode(!state.previewMode);
      });
    });

    if (refs.body) {
      refs.body.addEventListener("input", function () {
        renderPreview();
      });
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

    if (state.session) {
      renderSignedIn(state.session);
      if (state.mode === "edit") {
        showForm(false);
        try {
          await loadNovelForEdit(state.session);
        } catch (error) {
          setStatus(error.message || "작품 정보를 불러오지 못했습니다.", "error");
        }
      } else {
        setStatus("", "");
      }
    } else {
      clearLoadedEditState();
      showForm(false);
      if (refs.authShell) refs.authShell.innerHTML = "";
      redirectToAuth();
      return;
    }

    setSubmitState(false);
  }

  async function boot() {
    if (!refs.form) return;
    applyModeUI();
    renderPreview();
    setPreviewMode(false);
    setCoverPreview(null);
    bindPageEvents();

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
      if (session) {
        renderSignedIn(session);
        if (state.mode === "edit") {
          showForm(false);
          loadNovelForEdit(session).catch(function (error) {
            clearLoadedEditState();
            showForm(false);
            setStatus(error.message || "작품 정보를 불러오지 못했습니다.", "error");
          });
        }
      } else {
        clearLoadedEditState();
        showForm(false);
        if (refs.authShell) refs.authShell.innerHTML = "";
        redirectToAuth();
        return;
      }
      setSubmitState(false);
    });

    await refreshSession();
  }

  boot().catch(function (error) {
    console.error("[InkRoad] upload studio boot failed:", error);
    setStatus(error.message || t("upload.boot_error"), "error");
    showForm(false);
    if (refs.authShell) refs.authShell.innerHTML = "";
    redirectToAuth();
  });
})();
