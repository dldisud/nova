(function () {
  const page = window.location.pathname.split("/").pop() || "";
  if (page !== "episode_upload_pc.html") return;

  const cfg = window.inkroadSupabaseConfig || {};
  const base = (cfg.url || "").replace(/\/$/, "");
  const key = cfg.publishableKey || cfg.anonKey || "";
  const query = new URLSearchParams(window.location.search);
  const storageKeys = {
    session: "inkroad-supabase-auth",
    accessToken: "inkroad-supabase-access-token"
  };

  const state = {
    client: null,
    session: null,
    works: [],
    selectedSlug: query.get("slug") || "",
    previewMode: false,
    busy: false
  };

  const refs = {
    authShell: document.querySelector("[data-episode-auth]"),
    empty: document.querySelector("[data-episode-empty]"),
    form: document.querySelector("[data-episode-form]"),
    novelSelect: document.querySelector("[data-episode-novel]"),
    accessSelect: document.querySelector("[data-episode-access]"),
    priceWrap: document.querySelector("[data-episode-price-wrap]"),
    priceInput: document.querySelector("[data-episode-price]"),
    titleInput: document.querySelector("[data-episode-title]"),
    bodyInput: document.querySelector("[data-episode-body]"),
    preview: document.querySelector("[data-episode-preview]"),
    previewToggle: document.querySelector("[data-episode-preview-toggle]"),
    formatButtons: Array.from(document.querySelectorAll("[data-episode-format]")),
    status: document.querySelector("[data-episode-status]"),
    submitButtons: Array.from(document.querySelectorAll("[data-episode-submit]")),
    selectedImage: document.querySelector("[data-selected-work-image]"),
    selectedTitle: document.querySelector("[data-selected-work-title]"),
    selectedSummary: document.querySelector("[data-selected-work-summary]"),
    selectedMeta: document.querySelector("[data-selected-work-meta]"),
    selectedTags: document.querySelector("[data-selected-work-tags]")
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

  function formatCount(value) {
    return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
  }

  function summary(work) {
    return work.shortDescription || "작품 소개가 아직 짧게 정리되지 않았습니다.";
  }

  function cover(work) {
    return work.coverUrl || "https://placehold.co/320x440/111827/f3f4f6?text=" + encodeURIComponent(work.title || "InkRoad");
  }

  function statusLabel(status) {
    const labels = {
      serializing: "연재 중",
      completed: "완결",
      draft: "작성 중",
      hiatus: "휴재"
    };
    return labels[status] || "정리 중";
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
    return state.works.find(function (work) { return work.slug === state.selectedSlug; }) || state.works[0] || null;
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

  function setPreviewMode(enabled) {
    state.previewMode = Boolean(enabled);
    if (!refs.bodyInput || !refs.preview) return;
    refs.bodyInput.hidden = state.previewMode;
    refs.preview.hidden = !state.previewMode;
    if (refs.previewToggle) {
      refs.previewToggle.setAttribute("aria-pressed", String(state.previewMode));
    }
  }

  function renderPreview() {
    if (!refs.preview || !refs.bodyInput) return;
    const source = String(refs.bodyInput.value || "").trim();
    if (!source) {
      refs.preview.innerHTML = "<p>본문을 입력하면 읽기 화면처럼 미리볼 수 있습니다.</p>";
      return;
    }

    const blocks = source.split(/\n{2,}/).map(function (block) {
      return block.trim();
    }).filter(Boolean);

    refs.preview.innerHTML = blocks.map(function (block) {
      if (block === "***") return "<p class='scene-break'>***</p>";
      return "<p>" + inlineMarkup(block) + "</p>";
    }).join("");
  }

  function setSubmitState(forceBusy) {
    const valid = Boolean(
      state.session &&
      refs.novelSelect && refs.novelSelect.value &&
      refs.titleInput && refs.titleInput.value.trim() &&
      refs.bodyInput && refs.bodyInput.value.trim() &&
      (!refs.priceWrap || refs.priceWrap.hidden || Number(refs.priceInput.value || 0) >= 0)
    );
    const disabled = Boolean(forceBusy || state.busy || !valid);
    refs.submitButtons.forEach(function (button) {
      button.disabled = disabled;
      button.textContent = state.busy ? "발행 중..." : "회차 발행";
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

  function renderConfigMessage() {
    if (!refs.authShell) return;
    refs.authShell.innerHTML =
      "<div class='auth-card' data-tone='warning'><div class='auth-head'><span class='eyebrow'>연결 필요</span><h2 class='auth-title'>Supabase 연결 값이 비어 있습니다</h2><p class='auth-text'><code>assets/supabase-config.js</code>에 프로젝트 URL과 공개 키를 먼저 넣어주세요.</p></div></div>";
    showForm(false);
    showEmpty("연결값이 준비되면 회차를 발행할 수 있습니다.");
  }

  function renderSignedIn(session) {
    const profileName = session.user.user_metadata && session.user.user_metadata.display_name;
    const displayName = profileName || session.user.email || "크리에이터";
    refs.authShell.innerHTML =
      "<div class='auth-card' data-tone='success'><div class='auth-status-row'><div class='auth-user'><span class='auth-badge'>로그인됨</span><strong>" + esc(displayName) + "</strong><span class='auth-note'>내가 올린 작품에만 새 회차를 추가할 수 있습니다.</span></div><div class='auth-actions'><a class='button ghost' href='creator_dashboard_pc.html'>내 작품 관리</a><button class='button secondary' type='button' data-episode-logout>로그아웃</button></div></div></div>";
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
      "<div class='auth-card'><div class='auth-head'><span class='eyebrow'>크리에이터 로그인</span><h2 class='auth-title'>회차를 추가하려면 먼저 로그인해야 합니다</h2><p class='auth-text'>로그인한 계정이 올린 작품만 선택 목록에 나타납니다.</p></div><form class='auth-form' data-episode-auth-form><div class='auth-grid'><label class='auth-label'><span>이메일</span><input class='auth-input' type='email' name='email' placeholder='you@example.com' required></label><label class='auth-label'><span>비밀번호</span><input class='auth-input' type='password' name='password' minlength='8' placeholder='8자 이상' required></label></div><label class='auth-label'><span>닉네임</span><input class='auth-input' type='text' name='displayName' placeholder='처음 가입할 때만 사용됩니다'></label><div class='auth-actions'><button class='button primary' type='submit'>로그인</button><button class='button secondary' type='button' data-episode-signup>회원가입</button></div>" + note + "</form></div>";
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
          renderAuthGate(error.message || "로그인에 실패했습니다.");
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
          if (!result.data || !result.data.session) {
            renderAuthGate("가입 요청이 접수되었습니다. 메일 인증이 켜져 있다면 메일 확인 후 다시 로그인하세요.");
          }
        } catch (error) {
          renderAuthGate(error.message || "회원가입에 실패했습니다.");
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

    const novelsResult = await state.client
      .from("novels")
      .select("id,slug,title,short_description,status,cover_url,banner_url,free_episode_count,total_episode_count,view_count,reaction_score")
      .eq("author_id", authorResult.data.id)
      .order("updated_at", { ascending: false });
    if (novelsResult.error) throw novelsResult.error;
    const novels = novelsResult.data || [];
    if (!novels.length) return [];

    const novelIds = novels.map(function (novel) { return novel.id; });

    const tagsResult = await state.client
      .from("novel_tags")
      .select("novel_id,tags(name)")
      .in("novel_id", novelIds);
    if (tagsResult.error) throw tagsResult.error;

    const episodeResult = await state.client
      .from("episodes")
      .select("novel_id,episode_number,title,status")
      .in("novel_id", novelIds)
      .eq("status", "published")
      .order("episode_number", { ascending: false });
    if (episodeResult.error) throw episodeResult.error;

    const tagMap = new Map();
    (tagsResult.data || []).forEach(function (row) {
      const current = tagMap.get(row.novel_id) || [];
      const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
      if (tag && tag.name) current.push(tag.name);
      tagMap.set(row.novel_id, current);
    });

    const episodeMap = new Map();
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
        tags: tagMap.get(novel.id) || []
      };
    });
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
      refs.selectedMeta.innerHTML = "<span class='episode-chip' data-tone='" + esc(work.status) + "'>" + statusLabel(work.status) + "</span><span class='episode-chip'>다음 " + formatCount(nextEpisode) + "화</span><span class='episode-chip'>조회 " + formatCount(work.viewCount) + "</span>";
    }
    if (refs.selectedTags) {
      refs.selectedTags.innerHTML = work.tags.length
        ? work.tags.slice(0, 4).map(function (tag) { return "<span class='episode-chip'>" + esc(tag) + "</span>"; }).join("")
        : "<span class='episode-chip'>태그 없음</span>";
    }
  }

  function renderNovelOptions() {
    if (!refs.novelSelect) return;
    if (!state.works.length) {
      refs.novelSelect.innerHTML = "<option value=''>선택 가능한 작품이 없습니다</option>";
      return;
    }
    refs.novelSelect.innerHTML = state.works.map(function (work) {
      const nextEpisode = Number(work.totalEpisodeCount || 0) + 1;
      const selected = work.slug === state.selectedSlug ? " selected" : "";
      return "<option value='" + esc(work.slug) + "'" + selected + ">" + esc(work.title) + " · 다음 " + formatCount(nextEpisode) + "화</option>";
    }).join("");
    if (!state.selectedSlug || !state.works.some(function (work) { return work.slug === state.selectedSlug; })) {
      state.selectedSlug = state.works[0].slug;
      refs.novelSelect.value = state.selectedSlug;
    }
  }

  function togglePrice() {
    const isPaid = refs.accessSelect && refs.accessSelect.value === "paid";
    if (refs.priceWrap) refs.priceWrap.hidden = !isPaid;
    if (refs.priceInput && !isPaid) refs.priceInput.value = "100";
    setSubmitState(false);
  }

  function wrapSelection(prefix, suffix) {
    if (!refs.bodyInput) return;
    const textarea = refs.bodyInput;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);
    textarea.setRangeText(prefix + selected + suffix, start, end, "end");
    textarea.focus();
    renderPreview();
    setSubmitState(false);
  }

  async function handlePublish(event) {
    event.preventDefault();
    if (state.busy) return;
    const work = selectedWork();
    if (!work) {
      setStatus("먼저 작품을 선택해주세요.", "error");
      return;
    }

    const title = String(refs.titleInput.value || "").trim();
    const body = String(refs.bodyInput.value || "").trim();
    const accessType = refs.accessSelect ? refs.accessSelect.value : "free";
    const price = refs.priceInput ? Number(refs.priceInput.value || 0) : 0;

    if (!title) {
      setStatus("회차 제목을 입력해주세요.", "error");
      refs.titleInput.focus();
      return;
    }
    if (!body) {
      setStatus("회차 본문을 입력해주세요.", "error");
      refs.bodyInput.focus();
      return;
    }

    state.busy = true;
    setSubmitState(true);
    setStatus("회차를 저장하고 발행하고 있습니다...", "info");

    try {
      const rpcResult = await state.client.rpc("create_episode_for_author_novel", {
        p_novel_slug: work.slug,
        p_title: title,
        p_body: body,
        p_access_type: accessType,
        p_price: accessType === "paid" ? price : 0
      });
      if (rpcResult.error) throw rpcResult.error;
      const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
      if (!row || !row.novel_slug) throw new Error("회차는 저장됐지만 이동할 주소를 찾지 못했습니다.");
      setStatus("회차 발행이 완료되었습니다. 읽기 화면으로 이동합니다.", "success");
      refs.submitButtons.forEach(function (button) {
        button.textContent = "이동 중...";
      });
      window.setTimeout(function () {
        window.location.href = viewerHref(row.novel_slug, row.episode_number || ((work.totalEpisodeCount || 0) + 1));
      }, 700);
    } catch (error) {
      setStatus(error.message || "회차 발행 중 오류가 생겼습니다.", "error");
      state.busy = false;
      setSubmitState(false);
    }
  }

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
      refs.form.addEventListener("input", function () {
        setSubmitState(false);
      });
    }
    refs.formatButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const action = button.dataset.episodeFormat;
        if (action === "bold") wrapSelection("**", "**");
        if (action === "italic") wrapSelection("*", "*");
        if (action === "underline") wrapSelection("__", "__");
        if (action === "break") wrapSelection("\n\n***\n\n", "");
      });
    });
    if (refs.previewToggle) {
      refs.previewToggle.addEventListener("click", function () {
        renderPreview();
        setPreviewMode(!state.previewMode);
      });
    }
    if (refs.bodyInput) {
      refs.bodyInput.addEventListener("input", renderPreview);
    }
  }

  async function refreshSession() {
    const sessionResult = await state.client.auth.getSession();
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
  }

  async function boot() {
    if (!refs.authShell || !refs.form) return;
    renderPreview();
    setPreviewMode(false);
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
