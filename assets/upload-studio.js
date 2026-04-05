(function () {
  const page = window.location.pathname.split("/").pop() || "";
  if (page !== "novel_upload_pc.html") return;

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
    modeBadge: document.querySelector("[data-upload-mode-badge]"),
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

  function inlineMarkup(text) {
    let html = esc(text);
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__([^_]+)__/g, "<u>$1</u>");
    html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
    return html.replace(/\n/g, "<br>");
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
        title: "기존 작품 정보를 수정합니다",
        subtitle: "작품 소개, 태그, 표지 정보를 수정해 저장합니다. 첫 회차 내용은 회차 편집 화면에서 수정하세요.",
        submit: "수정 저장",
        submitting: "수정 중..."
      };
    }
    return {
      badge: "새 작품 발행",
      title: "작품 소개와 첫 회차를 바로 발행합니다",
      subtitle: "작품 정보, 표지, 태그, 첫 화 본문을 한 번에 저장하고 곧바로 상세 페이지로 넘깁니다.",
      submit: t("upload.publish_button"),
      submitting: t("upload.publishing_button")
    };
  }

  function applyModeUI() {
    const modeText = getModeText();
    if (refs.modeBadge) refs.modeBadge.textContent = modeText.badge;
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

  function renderPreview() {
    if (!refs.preview || !refs.body) return;
    const source = String(refs.body.value || "").trim();
    if (!source) {
      refs.preview.innerHTML = "<p>" + t("upload.preview_empty") + "</p>";
      return;
    }

    const blocks = source.split(/\n{2,}/).map(function (block) {
      return block.trim();
    }).filter(Boolean);

    refs.preview.innerHTML = blocks.map(function (block) {
      if (block === "***") {
        return "<p class='scene-break'>***</p>";
      }
      return "<p>" + inlineMarkup(block) + "</p>";
    }).join("");
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
    refs.tagContainer.appendChild(button);
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

  function wrapSelection(prefix, suffix) {
    if (!refs.body) return;
    const textarea = refs.body;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);
    const wrapped = prefix + selected + suffix;
    textarea.setRangeText(wrapped, start, end, "end");
    textarea.focus();
    textarea.selectionStart = start + prefix.length;
    textarea.selectionEnd = end + prefix.length;
    renderPreview();
    setSubmitState(false);
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

  function renderSignedIn(session) {
    if (!refs.authShell) return;
    const profileName = session.user.user_metadata && session.user.user_metadata.display_name;
    const displayName = profileName || session.user.email || t("auth.creator");
    refs.authShell.innerHTML =
      "<div class='auth-card' data-tone='success'>" +
      "<div class='auth-status-row'>" +
      "<div class='auth-user'>" +
      "<span class='auth-badge'>" + t("auth.logged_in") + "</span>" +
      "<strong>" + esc(displayName) + "</strong>" +
      "<span class='auth-note'>" + t("upload.auth_note") + "</span>" +
      "</div>" +
      "<div class='auth-actions'><a class='button ghost' href='creator_dashboard_pc.html'>" + t("auth.manage_works") + "</a><button class='button secondary' type='button' data-upload-logout>" + t("auth.logout") + "</button></div>" +
      "</div>" +
      "</div>";
    showForm(true);
    const logoutButton = q("[data-upload-logout]", refs.authShell);
    if (logoutButton) {
      logoutButton.addEventListener("click", async function () {
        try {
          await state.client.auth.signOut();
        } catch (error) {
          setStatus(error.message || t("auth.logout_error"), "error");
        }
      });
    }
  }

  function renderAuthGate(message) {
    if (!refs.authShell) return;
    const note = message
      ? "<p class='auth-note'>" + esc(message) + "</p>"
      : "<p class='auth-note'>처음이면 회원가입, 이미 계정이 있으면 로그인하세요. 로그인 후 바로 발행할 수 있습니다.</p>";
    refs.authShell.innerHTML =
      "<div class='auth-card'>" +
      "<div class='auth-head'>" +
      "<span class='eyebrow'>" + t("upload.auth_gate_title") + "</span>" +
      "<h2 class='auth-title'>" + t("upload.auth_gate_subtitle") + "</h2>" +
      "<p class='auth-text'>지금 만든 작품은 로그인한 계정의 작가명으로 저장됩니다.</p>" +
      "</div>" +
      "<form class='auth-form' data-upload-auth-form>" +
      "<div class='auth-grid'>" +
      "<label class='auth-label'><span>이메일</span><input class='auth-input' type='email' name='email' placeholder='you@example.com' required></label>" +
      "<label class='auth-label'><span>비밀번호</span><input class='auth-input' type='password' name='password' minlength='8' placeholder='8자 이상' required></label>" +
      "</div>" +
      "<label class='auth-label'><span>닉네임</span><input class='auth-input' type='text' name='displayName' placeholder='처음 가입할 때만 사용됩니다'></label>" +
      "<div class='auth-actions'>" +
      "<button class='button primary' type='submit'>로그인</button>" +
      "<button class='button secondary' type='button' data-upload-signup>회원가입</button>" +
      "</div>" +
      note +
      "</form>" +
      "</div>";

    showForm(false);
    const form = q("[data-upload-auth-form]", refs.authShell);
    const signupButton = q("[data-upload-signup]", refs.authShell);

    if (form) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const formData = new FormData(form);
        const email = String(formData.get("email") || "").trim();
        const password = String(formData.get("password") || "").trim();
        try {
          const result = await state.client.auth.signInWithPassword({ email: email, password: password });
          if (result.error) throw result.error;
          setStatus(t("auth.login_success"), "success");
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
            options: {
              data: {
                display_name: displayName || email.split("@")[0]
              }
            }
          });
          if (result.error) throw result.error;
          if (result.data && result.data.session) {
            setStatus(t("auth.signup_success"), "success");
            return;
          }
          renderAuthGate("가입 요청이 접수되었습니다. 메일 인증이 켜져 있다면 메일 확인 후 다시 로그인하세요.");
        } catch (error) {
          renderAuthGate(error.message || t("auth.signup_failed"));
        }
      });
    }
  }

  function renderConfigMessage() {
    if (!refs.authShell) return;
    refs.authShell.innerHTML =
      "<div class='auth-card' data-tone='warning'>" +
      "<div class='auth-head'>" +
      "<span class='eyebrow'>" + t("auth.config_title") + "</span>" +
      "<h2 class='auth-title'>" + t("auth.config_message") + "</h2>" +
      "<p class='auth-text'><code>assets/supabase-config.js</code>에 프로젝트 URL과 공개 키가 들어가야 업로드가 동작합니다.</p>" +
      "</div>" +
      "</div>";
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
      renderAuthGate(t("upload.publish_auth_required"));
      setStatus(t("auth.login_required_msg"), "error");
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
        if (action === "bold") wrapSelection("**", "**");
        if (action === "italic") wrapSelection("*", "*");
        if (action === "underline") wrapSelection("__", "__");
        if (action === "break") wrapSelection("\n\n***\n\n", "");
      });
    });

    refs.previewToggles.forEach(function (button) {
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
      renderAuthGate();
    }

    setSubmitState(false);
  }

  async function boot() {
    if (!refs.form || !refs.authShell) return;
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
        renderAuthGate();
      }
      setSubmitState(false);
    });

    await refreshSession();
  }

  boot().catch(function (error) {
    console.error("[InkRoad] upload studio boot failed:", error);
    setStatus(error.message || t("upload.boot_error"), "error");
    renderAuthGate(t("auth.auth_boot_error"));
  });
})();
