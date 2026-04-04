(function () {
  const page = window.location.pathname.split("/").pop() || "";
  if (page !== "creator_dashboard_pc.html") return;

  const cfg = window.inkroadSupabaseConfig || {};
  const base = (cfg.url || "").replace(/\/$/, "");
  const key = cfg.publishableKey || cfg.anonKey || "";
  const storageKeys = {
    session: "inkroad-supabase-auth",
    accessToken: "inkroad-supabase-access-token"
  };

  const state = {
    client: null,
    session: null,
    works: [],
    author: null,
    filter: "all"
  };

  const refs = {
    authShell: document.querySelector("[data-creator-auth]"),
    dashboard: document.querySelector("[data-creator-dashboard]"),
    featured: document.querySelector("[data-creator-featured]"),
    list: document.querySelector("[data-creator-list]"),
    empty: document.querySelector("[data-creator-empty]"),
    headTotal: document.querySelector("[data-creator-head-stat='total']"),
    headSerializing: document.querySelector("[data-creator-head-stat='serializing']"),
    filters: Array.from(document.querySelectorAll("[data-creator-filter]")),
    metrics: {
      works: document.querySelector("[data-creator-metric='works']"),
      episodes: document.querySelector("[data-creator-metric='episodes']"),
      completed: document.querySelector("[data-creator-metric='completed']"),
      views: document.querySelector("[data-creator-metric='views']")
    }
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
    return new Intl.NumberFormat(window.inkroadI18n.locale).format(Number(value || 0));
  }

  function formatDate(value) {
    if (!value) return t("common.no_date");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("common.no_date");
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function summary(work) {
    return work.shortDescription || t("common.no_description_short");
  }

  function cover(work) {
    if (work.coverUrl) return work.coverUrl;
    return "https://placehold.co/320x440/111827/f3f4f6?text=" + encodeURIComponent(work.title || "InkRoad");
  }

  function statusLabel(status) {
    const labels = {
      serializing: t("status.serializing"),
      completed: t("status.completed"),
      draft: t("status.draft"),
      hiatus: t("status.hiatus")
    };
    return labels[status] || t("status.unknown");
  }

  function detailHref(slug) {
    return "novel_detail_pc.html?slug=" + encodeURIComponent(slug);
  }

  function viewerHref(slug, episodeNumber) {
    return "novel_viewer_pc.html?slug=" + encodeURIComponent(slug) + "&episode=" + encodeURIComponent(episodeNumber || 1);
  }

  function episodeUploadHref(slug) {
    return "episode_upload_pc.html?slug=" + encodeURIComponent(slug);
  }

  function rememberAccessToken(session) {
    if (session && session.access_token) {
      localStorage.setItem(storageKeys.accessToken, session.access_token);
    } else {
      localStorage.removeItem(storageKeys.accessToken);
    }
  }

  function showDashboard(visible) {
    if (refs.dashboard) refs.dashboard.hidden = !visible;
  }

  function renderConfigMessage() {
    if (!refs.authShell) return;
    refs.authShell.innerHTML =
      "<div class='auth-card' data-tone='warning'>" +
      "<div class='auth-head'>" +
      "<span class='eyebrow'>" + t("auth.config_title") + "</span>" +
      "<h2 class='auth-title'>" + t("auth.config_message") + "</h2>" +
      "<p class='auth-text'><code>assets/supabase-config.js</code>에 프로젝트 URL과 공개 키를 먼저 넣어주세요.</p>" +
      "</div>" +
      "</div>";
    showDashboard(false);
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
      "<span class='auth-note'>이 계정으로 발행한 작품만 여기에서 불러옵니다.</span>" +
      "</div>" +
      "<div class='auth-actions'>" +
      "<a class='button ghost' href='novel_upload_pc.html'>" + t("dashboard.new_work") + "</a>" +
      "<button class='button secondary' type='button' data-creator-logout>" + t("auth.logout") + "</button>" +
      "</div>" +
      "</div>" +
      "</div>";
    const logoutButton = q("[data-creator-logout]", refs.authShell);
    if (logoutButton) {
      logoutButton.addEventListener("click", async function () {
        await state.client.auth.signOut();
      });
    }
    showDashboard(true);
  }

  function renderAuthGate(message) {
    if (!refs.authShell) return;
    const note = message
      ? "<p class='auth-note'>" + esc(message) + "</p>"
      : "<p class='auth-note'>업로드 페이지에서 쓰던 계정으로 그대로 로그인하면 내가 올린 작품이 바로 보입니다.</p>";
    refs.authShell.innerHTML =
      "<div class='auth-card'>" +
      "<div class='auth-head'>" +
      "<span class='eyebrow'>" + t("dashboard.auth_gate_title") + "</span>" +
      "<h2 class='auth-title'>" + t("dashboard.auth_gate_subtitle") + "</h2>" +
      "<p class='auth-text'>로그인된 계정의 작가 정보와 작품 목록을 연결해서 보여줍니다.</p>" +
      "</div>" +
      "<form class='auth-form' data-creator-auth-form>" +
      "<div class='auth-grid'>" +
      "<label class='auth-label'><span>이메일</span><input class='auth-input' type='email' name='email' placeholder='you@example.com' required></label>" +
      "<label class='auth-label'><span>비밀번호</span><input class='auth-input' type='password' name='password' minlength='8' placeholder='8자 이상' required></label>" +
      "</div>" +
      "<label class='auth-label'><span>닉네임</span><input class='auth-input' type='text' name='displayName' placeholder='처음 가입할 때만 사용됩니다'></label>" +
      "<div class='auth-actions'>" +
      "<button class='button primary' type='submit'>로그인</button>" +
      "<button class='button secondary' type='button' data-creator-signup>회원가입</button>" +
      "</div>" +
      note +
      "</form>" +
      "</div>";

    showDashboard(false);

    const form = q("[data-creator-auth-form]", refs.authShell);
    const signupButton = q("[data-creator-signup]", refs.authShell);

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
          renderAuthGate(error.message || t("auth.signup_failed"));
        }
      });
    }
  }

  async function fetchCreatorWorks(userId) {
    const authorResult = await state.client
      .from("authors")
      .select("id,pen_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (authorResult.error) throw authorResult.error;
    const author = authorResult.data || null;
    if (!author) {
      return {
        author: null,
        works: []
      };
    }

    const novelsResult = await state.client
      .from("novels")
      .select("id,slug,title,short_description,status,cover_url,banner_url,free_episode_count,total_episode_count,reaction_score,view_count,updated_at,published_from")
      .eq("author_id", author.id)
      .order("updated_at", { ascending: false });

    if (novelsResult.error) throw novelsResult.error;
    const novels = novelsResult.data || [];
    if (!novels.length) {
      return {
        author: author,
        works: []
      };
    }

    const novelIds = novels.map(function (novel) { return novel.id; });

    const tagsResult = await state.client
      .from("novel_tags")
      .select("novel_id,tags(name)")
      .in("novel_id", novelIds);

    if (tagsResult.error) throw tagsResult.error;

    const episodesResult = await state.client
      .from("episodes")
      .select("novel_id,episode_number,title,published_at,status")
      .in("novel_id", novelIds)
      .eq("status", "published")
      .order("episode_number", { ascending: false });

    if (episodesResult.error) throw episodesResult.error;

    const tagMap = new Map();
    (tagsResult.data || []).forEach(function (row) {
      const current = tagMap.get(row.novel_id) || [];
      const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;
      if (tag && tag.name) current.push(tag.name);
      tagMap.set(row.novel_id, current);
    });

    const episodeMap = new Map();
    (episodesResult.data || []).forEach(function (row) {
      if (!episodeMap.has(row.novel_id)) {
        episodeMap.set(row.novel_id, {
          episodeNumber: Number(row.episode_number || 1),
          title: row.title || t("editor.latest_episode"),
          publishedAt: row.published_at || null
        });
      }
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
        reactionScore: Number(novel.reaction_score || 0),
        viewCount: Number(novel.view_count || 0),
        updatedAt: novel.updated_at || novel.published_from || null,
        latestEpisode: episodeMap.get(novel.id) || null,
        tags: tagMap.get(novel.id) || []
      };
    });

    return {
      author: author,
      works: works
    };
  }

  function renderFeatured(work) {
    if (!refs.featured) return;
    if (!work) {
      refs.featured.innerHTML =
        "<div class='creator-featured-thumb'><img src='https://placehold.co/320x440/111827/f3f4f6?text=InkRoad' alt='" + t("common.default_cover_alt") + "'></div>" +
        "<div class='creator-featured-copy'>" +
        "<span class='eyebrow'>" + t("dashboard.featured_title") + "</span>" +
        "<h2>" + t("dashboard.featured_empty") + "</h2>" +
        "<p>새 작품을 업로드하면 여기서 최근 작품과 마지막 회차를 바로 확인할 수 있습니다.</p>" +
        "<div class='button-row'><a class='button primary' href='novel_upload_pc.html'>" + t("dashboard.first_work_cta") + "</a></div>" +
        "</div>";
      return;
    }

    const latest = work.latestEpisode
      ? "최근 발행: " + work.latestEpisode.episodeNumber + "화 · " + esc(work.latestEpisode.title)
      : t("dashboard.no_latest");
    const tags = work.tags.length
      ? work.tags.slice(0, 4).map(function (tag) { return "<span class='creator-chip'>" + esc(tag) + "</span>"; }).join("")
      : "<span class='creator-chip'>" + t("common.no_tags") + "</span>";

    refs.featured.innerHTML =
      "<a class='creator-featured-thumb' href='" + detailHref(work.slug) + "'><img src='" + esc(cover(work)) + "' alt='" + esc(work.title) + " 표지'></a>" +
      "<div class='creator-featured-copy'>" +
      "<span class='eyebrow'>" + t("dashboard.featured_title") + "</span>" +
      "<h2>" + esc(work.title) + "</h2>" +
      "<p>" + esc(summary(work)) + "</p>" +
      "<div class='creator-meta-row'><span class='creator-chip' data-tone='" + esc(work.status) + "'>" + statusLabel(work.status) + "</span><span class='creator-chip'>총 " + formatCount(work.totalEpisodeCount) + "화</span><span class='creator-chip'>조회 " + formatCount(work.viewCount) + "</span></div>" +
      "<p class='creator-help'>" + latest + "</p>" +
      "<div class='creator-tag-row'>" + tags + "</div>" +
      "<div class='button-row'><a class='button primary' href='" + detailHref(work.slug) + "'>" + t("dashboard.detail_link") + "</a><a class='button secondary' href='" + episodeUploadHref(work.slug) + "'>" + t("dashboard.new_episode_link") + "</a><a class='button ghost' href='" + viewerHref(work.slug, work.latestEpisode ? work.latestEpisode.episodeNumber : 1) + "'>" + t("dashboard.read_check_link") + "</a></div>" +
      "</div>";
  }

  function renderMetrics(works) {
    const totalWorks = works.length;
    const totalEpisodes = works.reduce(function (sum, work) { return sum + Number(work.totalEpisodeCount || 0); }, 0);
    const completed = works.filter(function (work) { return work.status === "completed"; }).length;
    const serializing = works.filter(function (work) { return work.status === "serializing"; }).length;
    const totalViews = works.reduce(function (sum, work) { return sum + Number(work.viewCount || 0); }, 0);

    if (refs.headTotal) refs.headTotal.textContent = formatCount(totalWorks) + "개";
    if (refs.headSerializing) refs.headSerializing.textContent = formatCount(serializing) + "개";
    if (refs.metrics.works) refs.metrics.works.textContent = formatCount(totalWorks);
    if (refs.metrics.episodes) refs.metrics.episodes.textContent = formatCount(totalEpisodes);
    if (refs.metrics.completed) refs.metrics.completed.textContent = formatCount(completed);
    if (refs.metrics.views) refs.metrics.views.textContent = formatCount(totalViews);
  }

  function filteredWorks() {
    if (state.filter === "all") return state.works;
    return state.works.filter(function (work) { return work.status === state.filter; });
  }

  function renderList() {
    if (!refs.list || !refs.empty) return;
    const works = filteredWorks();

    refs.filters.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.creatorFilter === state.filter);
    });

    if (!state.works.length) {
      refs.list.innerHTML = "";
      refs.empty.hidden = false;
      refs.empty.innerHTML =
        "<strong>" + t("dashboard.no_works") + "</strong>" +
        "<p>먼저 업로드 페이지에서 작품 제목과 첫 회차를 입력해 한 작품을 만들어보세요.</p>" +
        "<div class='button-row' style='justify-content:center;'><a class='button primary' href='novel_upload_pc.html'>첫 작품 만들기</a></div>";
      return;
    }

    if (!works.length) {
      refs.list.innerHTML = "";
      refs.empty.hidden = false;
      refs.empty.innerHTML =
        "<strong>" + t("dashboard.filtered_empty") + "</strong>" +
        "<p>" + t("dashboard.filtered_empty_hint") + "</p>";
      return;
    }

    refs.empty.hidden = true;
    refs.list.innerHTML = works.map(function (work) {
      const tags = work.tags.length
        ? work.tags.slice(0, 3).map(function (tag) { return "<span class='creator-chip'>" + esc(tag) + "</span>"; }).join("")
        : "<span class='creator-chip'>" + t("common.no_tags") + "</span>";
      const latestLabel = work.latestEpisode
        ? work.latestEpisode.episodeNumber + "화 · " + esc(work.latestEpisode.title)
        : t("dashboard.no_episode_info");
      return "<article class='creator-work-card'>" +
        "<a class='creator-work-thumb' href='" + detailHref(work.slug) + "'><img src='" + esc(cover(work)) + "' alt='" + esc(work.title) + " 표지'></a>" +
        "<div class='creator-work-copy'>" +
        "<div class='creator-meta-row'><span class='creator-chip' data-tone='" + esc(work.status) + "'>" + statusLabel(work.status) + "</span><span class='meta-text'>" + t("dashboard.last_modified") + esc(formatDate(work.updatedAt)) + "</span></div>" +
        "<h3>" + esc(work.title) + "</h3>" +
        "<p>" + esc(summary(work)) + "</p>" +
        "<div class='creator-tag-row'>" + tags + "</div>" +
        "<div class='creator-stat-row'><span class='meta-text'>무료 " + formatCount(work.freeEpisodeCount) + "화</span><span class='meta-text'>전체 " + formatCount(work.totalEpisodeCount) + "화</span><span class='meta-text'>조회 " + formatCount(work.viewCount) + "</span><span class='meta-text'>반응 " + work.reactionScore.toFixed(1) + "</span></div>" +
        "</div>" +
        "<div class='creator-work-side'>" +
        "<span class='meta-text'>" + t("editor.latest_episode") + "</span>" +
        "<strong>" + latestLabel + "</strong>" +
        "<div class='button-row creator-action-row'><a class='button small ghost' href='" + detailHref(work.slug) + "'>" + t("dashboard.detail_link") + "</a><a class='button small secondary' href='" + episodeUploadHref(work.slug) + "'>" + t("dashboard.new_episode_link") + "</a><a class='button small primary' href='" + viewerHref(work.slug, work.latestEpisode ? work.latestEpisode.episodeNumber : 1) + "'>" + t("dashboard.read_check_link") + "</a></div>" +
        "</div>" +
        "</article>";
    }).join("");
  }

  async function renderDashboard(session) {
    const creatorData = await fetchCreatorWorks(session.user.id);
    state.author = creatorData.author;
    state.works = creatorData.works;
    renderSignedIn(session);
    renderMetrics(state.works);
    renderFeatured(state.works[0] || null);
    renderList();
  }

  function bindFilters() {
    refs.filters.forEach(function (button) {
      button.addEventListener("click", function () {
        state.filter = button.dataset.creatorFilter || "all";
        renderList();
      });
    });
  }

  async function refreshSession() {
    const sessionResult = await state.client.auth.getSession();
    state.session = sessionResult.data.session;
    rememberAccessToken(state.session);

    if (!state.session) {
      renderAuthGate();
      return;
    }

    await renderDashboard(state.session);
  }

  async function boot() {
    if (!refs.authShell || !refs.dashboard) return;
    bindFilters();

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
      renderDashboard(session).catch(function (error) {
        console.error("[InkRoad] creator dashboard refresh failed:", error);
      });
    });

    await refreshSession();
  }

  boot().catch(function (error) {
    console.error("[InkRoad] creator dashboard boot failed:", error);
    renderAuthGate(error.message || t("auth.boot_error"));
  });
})();

