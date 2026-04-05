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
    filter: "all",
    salePanelOpen: false,
    saleTargetNovelId: "",
    activeSaleByNovelId: new Map(),
    saleBusy: false
  };

  const refs = {
    authShell: document.querySelector("[data-creator-auth]"),
    dashboard: document.querySelector("[data-creator-dashboard]"),
    featured: document.querySelector("[data-creator-featured]"),
    list: document.querySelector("[data-creator-list]"),
    empty: document.querySelector("[data-creator-empty]"),
    headTotal: document.querySelector("[data-creator-head-stat='total']"),
    headSerializing: document.querySelector("[data-creator-head-stat='serializing']"),
    headArchived: document.querySelector("[data-creator-head-stat='archived']"),
    filters: Array.from(document.querySelectorAll("[data-creator-filter]")),
    metrics: {
      works: document.querySelector("[data-creator-metric='works']"),
      episodes: document.querySelector("[data-creator-metric='episodes']"),
      completed: document.querySelector("[data-creator-metric='completed']"),
      views: document.querySelector("[data-creator-metric='views']")
    },
    salePanel: document.querySelector("[data-sale-panel]"),
    saleTitle: document.querySelector("[data-sale-title]"),
    saleWorkTitle: document.querySelector("[data-sale-work-title]"),
    saleDiscount: document.querySelector("[data-sale-discount]"),
    saleStart: document.querySelector("[data-sale-start]"),
    saleEnd: document.querySelector("[data-sale-end]"),
    salePreview: document.querySelector("[data-sale-preview]"),
    saleStatus: document.querySelector("[data-sale-status]"),
    saleClose: document.querySelector("[data-sale-close]"),
    saleClear: document.querySelector("[data-sale-clear]"),
    saleForm: document.querySelector("[data-sale-form]")
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

  function formatCount(value) {
    return new Intl.NumberFormat(window.inkroadI18n.locale).format(Number(value || 0));
  }

  function formatMoney(value) {
    return formatCount(Math.round(Number(value || 0)));
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
      hiatus: t("status.hiatus"),
      archived: "보관됨"
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

  function novelEditHref(work) {
    return "novel_upload_pc.html?edit=" + encodeURIComponent(work.id);
  }

  function episodeEditHref(work) {
    if (!work.latestEpisode || !work.latestEpisode.id) return "";
    return "episode_upload_pc.html?edit=" + encodeURIComponent(work.latestEpisode.id);
  }

  async function archiveNovel(novelId) {
    if (!novelId) return;
    const work = getWorkById(novelId);
    if (!work) return;
    const confirmed = window.confirm("이 작품을 보관 처리할까요? 스토어 노출과 공개 회차가 함께 내려갑니다.");
    if (!confirmed) return;

    const result = await state.client.rpc("archive_novel_for_author", {
      p_novel_id: novelId
    });
    if (result.error) throw result.error;

    if (state.saleTargetNovelId === novelId) closeSalePanel();
    await renderDashboard(state.session);
  }

  async function unarchiveNovel(novelId) {
    if (!novelId) return;
    const work = getWorkById(novelId);
    if (!work) return;
    const confirmed = window.confirm("이 작품 보관을 해제할까요? 작품 상태만 먼저 되돌리고, 숨긴 회차는 따로 다시 공개할 수 있습니다.");
    if (!confirmed) return;

    const result = await state.client.rpc("unarchive_novel_for_author", {
      p_novel_id: novelId
    });
    if (result.error) throw result.error;

    await renderDashboard(state.session);
  }

  async function hideEpisode(episodeId) {
    if (!episodeId) return;
    const confirmed = window.confirm("최근 공개 회차를 숨길까요? 독자에게는 더 이상 보이지 않습니다.");
    if (!confirmed) return;

    const result = await state.client.rpc("hide_episode_for_author", {
      p_episode_id: episodeId
    });
    if (result.error) throw result.error;

    await renderDashboard(state.session);
  }

  async function unhideEpisode(episodeId) {
    if (!episodeId) return;
    const confirmed = window.confirm("숨긴 최근 회차를 다시 공개할까요? 독자가 바로 볼 수 있게 됩니다.");
    if (!confirmed) return;

    const result = await state.client.rpc("unhide_episode_for_author", {
      p_episode_id: episodeId
    });
    if (result.error) throw result.error;

    await renderDashboard(state.session);
  }

  function latestEpisodeSummary(work) {
    if (!work.latestEpisode) return "아직 발행된 회차가 없습니다.";
    const prefix = work.latestEpisode.status === "hidden" ? "최근 비공개: " : "최근 발행: ";
    return prefix + work.latestEpisode.episodeNumber + "화 · " + work.latestEpisode.title;
  }

  function latestEpisodeLabel(work) {
    if (!work.latestEpisode) return t("dashboard.no_episode_info");
    const prefix = work.latestEpisode.status === "hidden" ? "비공개 " : "";
    return prefix + work.latestEpisode.episodeNumber + "화 · " + work.latestEpisode.title;
  }

  function latestEpisodeHeading(work) {
    return work.latestEpisode && work.latestEpisode.status === "hidden" ? "최근 비공개" : "최근 공개";
  }

  function renderHiddenEpisodeList(work, sizeClass) {
    if (!work.hiddenEpisodes || !work.hiddenEpisodes.length) return "";
    const itemClass = sizeClass === "small" ? "creator-hidden-item small" : "creator-hidden-item";
    const items = work.hiddenEpisodes.slice(0, 3).map(function (episode) {
      const label = esc(episode.episodeNumber + "화 · " + episode.title);
      if (work.status === "archived") {
        return "<span class='" + itemClass + "'>" + label + "</span>";
      }
      return "<button class='" + itemClass + "' type='button' data-unhide-episode='" + esc(episode.id) + "'>" + label + " 다시 공개</button>";
    }).join("");
    const note = work.hiddenEpisodes.length > 3
      ? "<span class='meta-text'>외 " + formatCount(work.hiddenEpisodes.length - 3) + "개</span>"
      : (work.status === "archived" ? "<span class='meta-text'>보관 해제 후 다시 공개할 수 있습니다.</span>" : "");
    return "<div class='creator-hidden-episodes'><span class='meta-text'>숨김 회차 " + formatCount(work.hiddenEpisodes.length) + "개</span><div class='creator-hidden-list'>" + items + "</div>" + note + "</div>";
  }

  function latestEpisodeAction(work, sizeClass) {
    if (!work.latestEpisode || !work.latestEpisode.id || work.status === "archived") return "";
    const className = sizeClass ? "button " + sizeClass + " ghost" : "button ghost";
    if (work.latestEpisode.status === "hidden") {
      return "<button class='" + className + "' type='button' data-unhide-episode='" + esc(work.latestEpisode.id) + "'>최근 회차 다시 공개</button>";
    }
    return "<button class='" + className + "' type='button' data-hide-episode='" + esc(work.latestEpisode.id) + "'>최근 회차 숨김</button>";
  }

  function archiveAction(work, sizeClass) {
    const className = sizeClass ? "button " + sizeClass + " ghost" : "button ghost";
    if (work.status === "archived") {
      return "<button class='" + className + "' type='button' data-unarchive-open='" + esc(work.id) + "'>보관 해제</button>";
    }
    return "<button class='" + className + "' type='button' data-archive-open='" + esc(work.id) + "'>작품 보관</button>";
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

  function getWorkById(novelId) {
    return state.works.find(function (work) { return work.id === novelId; }) || null;
  }

  function getSaleMeta(work) {
    if (!work || !work.bundleListPrice || !work.bundleSalePrice) return null;
    const discountPercent = Math.round(((Number(work.bundleListPrice) - Number(work.bundleSalePrice)) / Number(work.bundleListPrice)) * 100);
    if (!(discountPercent > 0)) return null;
    return {
      discountPercent: discountPercent,
      salePrice: Number(work.bundleSalePrice),
      startsAt: work.saleStartsAt,
      endsAt: work.saleEndsAt
    };
  }

  function discountPreview(percent, work) {
    const currentWork = work || getWorkById(state.saleTargetNovelId);
    if (!currentWork || !currentWork.bundleListPrice) {
      return "정가 정보가 없어서 할인 미리보기를 계산할 수 없습니다.";
    }
    const basePrice = Number(currentWork.bundleListPrice || 0);
    const nextDiscount = Math.max(0, Number(percent || 0));
    const sale = Math.round((basePrice * (100 - nextDiscount)) / 100);
    return "묶음 정가 " + formatMoney(basePrice) + "원 -> " + formatMoney(sale) + "원";
  }

  function toLocalDateTimeValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = function (num) { return String(num).padStart(2, "0"); };
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return year + "-" + month + "-" + day + "T" + hours + ":" + minutes;
  }

  function defaultSaleRange() {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const end = new Date(now.getTime());
    end.setDate(end.getDate() + 7);
    return {
      start: toLocalDateTimeValue(now.toISOString()),
      end: toLocalDateTimeValue(end.toISOString())
    };
  }

  function setSaleStatus(message, tone) {
    if (!refs.saleStatus) return;
    if (!message) {
      refs.saleStatus.hidden = true;
      refs.saleStatus.textContent = "";
      refs.saleStatus.removeAttribute("data-tone");
      return;
    }
    refs.saleStatus.hidden = false;
    refs.saleStatus.dataset.tone = tone || "info";
    refs.saleStatus.textContent = message;
  }

  function setSaleBusy(isBusy) {
    state.saleBusy = isBusy;
    const submitButton = refs.saleForm ? q("button[type='submit']", refs.saleForm) : null;
    if (submitButton) submitButton.disabled = isBusy;
    if (refs.saleDiscount) refs.saleDiscount.disabled = isBusy;
    if (refs.saleStart) refs.saleStart.disabled = isBusy;
    if (refs.saleEnd) refs.saleEnd.disabled = isBusy;
    if (refs.saleClear) refs.saleClear.disabled = isBusy;
  }

  function syncSalePreview() {
    if (!refs.salePreview) return;
    refs.salePreview.textContent = discountPreview(refs.saleDiscount ? refs.saleDiscount.value : 0);
  }

  function closeSalePanel() {
    state.salePanelOpen = false;
    state.saleTargetNovelId = "";
    if (refs.salePanel) refs.salePanel.hidden = true;
    setSaleBusy(false);
    setSaleStatus("", "");
  }

  function openSalePanel(novelId) {
    const work = getWorkById(novelId);
    if (!work || !refs.salePanel) return;

    state.salePanelOpen = true;
    state.saleTargetNovelId = work.id;
    refs.salePanel.hidden = false;
    const saleMeta = getSaleMeta(work);
    if (refs.saleTitle) refs.saleTitle.textContent = saleMeta ? "할인 수정" : "할인 등록";
    if (refs.saleWorkTitle) refs.saleWorkTitle.value = work.title;
    if (refs.saleClear) {
      refs.saleClear.textContent = "할인 해제";
      refs.saleClear.hidden = !saleMeta;
    }

    const range = saleMeta ? {
      start: toLocalDateTimeValue(saleMeta.startsAt),
      end: toLocalDateTimeValue(saleMeta.endsAt)
    } : defaultSaleRange();

    if (refs.saleDiscount) refs.saleDiscount.value = String(saleMeta ? saleMeta.discountPercent : 10);
    if (refs.saleStart) refs.saleStart.value = range.start;
    if (refs.saleEnd) refs.saleEnd.value = range.end;
    syncSalePreview();
    setSaleStatus("", "");
    refs.salePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function clearSale() {
    if (state.saleBusy || !state.saleTargetNovelId) return;
    const work = getWorkById(state.saleTargetNovelId);
    if (!work) {
      setSaleStatus("작품 정보를 다시 불러와 주세요.", "error");
      return;
    }

    const confirmed = window.confirm("현재 할인 일정을 해제할까요?");
    if (!confirmed) return;

    setSaleBusy(true);
    setSaleStatus("할인 해제 중입니다...", "info");

    try {
      const result = await state.client.rpc("clear_novel_sale_for_author", {
        p_novel_id: state.saleTargetNovelId
      });
      if (result.error) throw result.error;

      await renderDashboard(state.session);
      closeSalePanel();
    } catch (error) {
      setSaleStatus(error.message || "할인 해제 중 오류가 생겼습니다.", "error");
    } finally {
      setSaleBusy(false);
    }
  }

  async function saveSale(event) {
    event.preventDefault();
    if (state.saleBusy || !state.saleTargetNovelId) return;

    const work = getWorkById(state.saleTargetNovelId);
    if (!work) {
      setSaleStatus("작품 정보를 다시 불러와 주세요.", "error");
      return;
    }

    if (!refs.saleStart || !refs.saleEnd || !refs.saleDiscount) return;
    if (!refs.saleStart.value || !refs.saleEnd.value) {
      setSaleStatus("할인 시작일과 종료일을 모두 입력해 주세요.", "error");
      return;
    }

    const startsAt = new Date(refs.saleStart.value);
    const endsAt = new Date(refs.saleEnd.value);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      setSaleStatus("할인 종료일은 시작일보다 뒤여야 합니다.", "error");
      return;
    }

    setSaleBusy(true);
    setSaleStatus("할인 일정을 저장하는 중입니다...", "info");

    try {
      const result = await state.client.rpc("upsert_novel_sale_for_author", {
        p_novel_id: state.saleTargetNovelId,
        p_discount_percent: Number(refs.saleDiscount.value),
        p_sale_starts_at: startsAt.toISOString(),
        p_sale_ends_at: endsAt.toISOString()
      });
      if (result.error) throw result.error;

      await renderDashboard(state.session);
      openSalePanel(state.saleTargetNovelId);
      setSaleStatus("할인 일정이 저장되었습니다.", "success");
      window.setTimeout(function () {
        if (!state.salePanelOpen) return;
        closeSalePanel();
      }, 900);
    } catch (error) {
      setSaleStatus(error.message || "할인 저장 중 오류가 생겼습니다.", "error");
    } finally {
      setSaleBusy(false);
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
      .select("id,slug,title,short_description,status,cover_url,banner_url,free_episode_count,total_episode_count,reaction_score,view_count,updated_at,published_from,bundle_list_price,bundle_sale_price,sale_starts_at,sale_ends_at")
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
      .select("id,novel_id,episode_number,title,published_at,status")
      .in("novel_id", novelIds)
      .in("status", ["published", "hidden"])
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
    const hiddenEpisodeMap = new Map();
    (episodesResult.data || []).forEach(function (row) {
      if (!episodeMap.has(row.novel_id)) {
        episodeMap.set(row.novel_id, {
          id: row.id,
          episodeNumber: Number(row.episode_number || 1),
          title: row.title || t("editor.latest_episode"),
          status: row.status || "draft",
          publishedAt: row.published_at || null
        });
      }
      if (row.status === "hidden") {
        const current = hiddenEpisodeMap.get(row.novel_id) || [];
        current.push({
          id: row.id,
          episodeNumber: Number(row.episode_number || 1),
          title: row.title || t("editor.latest_episode"),
          status: row.status || "hidden",
          publishedAt: row.published_at || null
        });
        hiddenEpisodeMap.set(row.novel_id, current);
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
        hiddenEpisodes: hiddenEpisodeMap.get(novel.id) || [],
        tags: tagMap.get(novel.id) || [],
        bundleListPrice: novel.bundle_list_price !== null ? Number(novel.bundle_list_price) : 0,
        bundleSalePrice: novel.bundle_sale_price !== null ? Number(novel.bundle_sale_price) : null,
        saleStartsAt: novel.sale_starts_at || null,
        saleEndsAt: novel.sale_ends_at || null
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
        "<div class='creator-featured-thumb'><img src='https://placehold.co/320x440/111827/f3f4f6?text=InkRoad' alt='기본 표지'></div>" +
        "<div class='creator-featured-copy'>" +
        "<span class='eyebrow'>대표 작품</span>" +
        "<h2>아직 등록된 작품이 없습니다</h2>" +
        "<p>새 작품을 올리면 여기서 바로 수정, 할인 등록, 최근 회차 점검까지 이어서 할 수 있습니다.</p>" +
        "<div class='button-row'><a class='button primary' href='novel_upload_pc.html'>첫 작품 등록</a></div>" +
        "</div>";
      return;
    }

    const latest = esc(latestEpisodeSummary(work));
    const tags = work.tags.length
      ? work.tags.slice(0, 4).map(function (tag) { return "<span class='creator-chip'>" + esc(tag) + "</span>"; }).join("")
      : "<span class='creator-chip'>" + t("common.no_tags") + "</span>";
    const saleMeta = getSaleMeta(work);
    const saleBadge = saleMeta
      ? "<span class='creator-chip' data-tone='sale'>할인 " + formatCount(saleMeta.discountPercent) + "%</span>"
      : "";
    const latestEdit = episodeEditHref(work)
      ? "<a class='button ghost' href='" + episodeEditHref(work) + "'>최근 회차 수정</a>"
      : "";
    const hiddenEpisodeList = renderHiddenEpisodeList(work, "default");
    const latestManageAction = latestEpisodeAction(work, "");
    const archiveToggleAction = archiveAction(work, "");
    const saleAction = work.status !== "archived"
      ? "<button class='button secondary' type='button' data-sale-open='" + esc(work.id) + "'>할인 등록</button>"
      : "";
    const newEpisodeAction = work.status !== "archived"
      ? "<a class='button secondary' href='" + episodeUploadHref(work.slug) + "'>새 회차</a>"
      : "";

    refs.featured.innerHTML =
      "<a class='creator-featured-thumb' href='" + detailHref(work.slug) + "'><img src='" + esc(cover(work)) + "' alt='" + esc(work.title) + " 표지'></a>" +
      "<div class='creator-featured-copy'>" +
      "<span class='eyebrow'>대표 작품</span>" +
      "<h2>" + esc(work.title) + "</h2>" +
      "<p>" + esc(summary(work)) + "</p>" +
      "<div class='creator-meta-row'><span class='creator-chip' data-tone='" + esc(work.status) + "'>" + statusLabel(work.status) + "</span><span class='creator-chip'>총 " + formatCount(work.totalEpisodeCount) + "화</span><span class='creator-chip'>조회 " + formatCount(work.viewCount) + "</span>" + saleBadge + "</div>" +
      "<p class='creator-help'>" + latest + "</p>" +
      hiddenEpisodeList +
      "<div class='creator-tag-row'>" + tags + "</div>" +
      "<div class='button-row creator-action-row'>" +
      "<a class='button ghost' href='" + novelEditHref(work) + "'>작품 수정</a>" +
      latestEdit +
      latestManageAction +
      archiveToggleAction +
      saleAction +
      newEpisodeAction +
      "<a class='button primary' href='" + detailHref(work.slug) + "'>상세 보기</a>" +
      "</div>" +
      "</div>";
  }

  function renderMetrics(works) {
    const totalWorks = works.length;
    const totalEpisodes = works.reduce(function (sum, work) { return sum + Number(work.totalEpisodeCount || 0); }, 0);
    const completed = works.filter(function (work) { return work.status === "completed"; }).length;
    const serializing = works.filter(function (work) { return work.status === "serializing"; }).length;
    const archived = works.filter(function (work) { return work.status === "archived"; }).length;
    const totalViews = works.reduce(function (sum, work) { return sum + Number(work.viewCount || 0); }, 0);

    if (refs.headTotal) refs.headTotal.textContent = formatCount(totalWorks) + "개";
    if (refs.headSerializing) refs.headSerializing.textContent = formatCount(serializing) + "개";
    if (refs.headArchived) refs.headArchived.textContent = formatCount(archived) + "개";
    if (refs.metrics.works) refs.metrics.works.textContent = formatCount(totalWorks);
    if (refs.metrics.episodes) refs.metrics.episodes.textContent = formatCount(totalEpisodes);
    if (refs.metrics.completed) refs.metrics.completed.textContent = formatCount(completed);
    if (refs.metrics.views) refs.metrics.views.textContent = formatCount(totalViews);
  }

  function filteredWorks() {
    if (state.filter === "all") return state.works;
    return state.works.filter(function (work) { return work.status === state.filter; });
  }

  function currentVisibleWorks() {
    return filteredWorks();
  }

  function renderActiveView() {
    const works = currentVisibleWorks();
    renderFeatured(works[0] || state.works[0] || null);
    renderList();
  }

  function renderList() {
    if (!refs.list || !refs.empty) return;
    const works = currentVisibleWorks();

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
      const latestLabel = esc(latestEpisodeLabel(work));
      const saleMeta = getSaleMeta(work);
      const saleInfo = saleMeta
        ? "<span class='meta-text'>할인 " + formatCount(saleMeta.discountPercent) + "% · " + formatDate(saleMeta.endsAt) + " 종료</span>"
        : "<span class='meta-text'>할인 일정 없음</span>";
      const latestEdit = episodeEditHref(work)
        ? "<a class='button small ghost' href='" + episodeEditHref(work) + "'>최근 회차 수정</a>"
        : "";
      const hiddenEpisodeList = renderHiddenEpisodeList(work, "small");
      const latestManageAction = latestEpisodeAction(work, "small");
      const archiveToggleAction = archiveAction(work, "small");
      const saleAction = work.status !== "archived"
        ? "<button class='button small secondary' type='button' data-sale-open='" + esc(work.id) + "'>할인 등록</button>"
        : "";
      const newEpisodeAction = work.status !== "archived"
        ? "<a class='button small secondary' href='" + episodeUploadHref(work.slug) + "'>새 회차</a>"
        : "";
      return "<article class='creator-work-card'>" +
        "<a class='creator-work-thumb' href='" + detailHref(work.slug) + "'><img src='" + esc(cover(work)) + "' alt='" + esc(work.title) + " 표지'></a>" +
        "<div class='creator-work-copy'>" +
        "<div class='creator-meta-row'><span class='creator-chip' data-tone='" + esc(work.status) + "'>" + statusLabel(work.status) + "</span><span class='meta-text'>최근 수정 " + esc(formatDate(work.updatedAt)) + "</span>" + saleInfo + "</div>" +
        "<h3>" + esc(work.title) + "</h3>" +
        "<p>" + esc(summary(work)) + "</p>" +
        "<div class='creator-tag-row'>" + tags + "</div>" +
        "<div class='creator-stat-row'><span class='meta-text'>무료 " + formatCount(work.freeEpisodeCount) + "화</span><span class='meta-text'>전체 " + formatCount(work.totalEpisodeCount) + "화</span><span class='meta-text'>조회 " + formatCount(work.viewCount) + "</span><span class='meta-text'>반응 " + work.reactionScore.toFixed(1) + "</span></div>" +
        "</div>" +
        "<div class='creator-work-side'>" +
        "<span class='meta-text'>" + latestEpisodeHeading(work) + "</span>" +
        "<strong>" + latestLabel + "</strong>" +
        hiddenEpisodeList +
        "<div class='button-row creator-action-row'>" +
        "<a class='button small ghost' href='" + novelEditHref(work) + "'>작품 수정</a>" +
        latestEdit +
        latestManageAction +
        archiveToggleAction +
        saleAction +
        newEpisodeAction +
        "<a class='button small primary' href='" + detailHref(work.slug) + "'>상세 보기</a>" +
        "</div>" +
        "</div>" +
        "</article>";
    }).join("");
  }

  async function renderDashboard(session) {
    const creatorData = await fetchCreatorWorks(session.user.id);
    state.author = creatorData.author;
    state.works = creatorData.works;
    state.activeSaleByNovelId = new Map();
    state.works.forEach(function (work) {
      const saleMeta = getSaleMeta(work);
      if (saleMeta) state.activeSaleByNovelId.set(work.id, saleMeta);
    });
    renderSignedIn(session);
    renderMetrics(state.works);
    renderActiveView();
  }

  function bindFilters() {
    refs.filters.forEach(function (button) {
      button.addEventListener("click", function () {
        state.filter = button.dataset.creatorFilter || "all";
        renderActiveView();
      });
    });
  }

  function bindSalePanel() {
    if (refs.dashboard) {
      refs.dashboard.addEventListener("click", function (event) {
        const saleTrigger = event.target.closest("[data-sale-open]");
        if (saleTrigger) {
          openSalePanel(saleTrigger.getAttribute("data-sale-open") || "");
          return;
        }

        const archiveTrigger = event.target.closest("[data-archive-open]");
        if (archiveTrigger) {
          archiveNovel(archiveTrigger.getAttribute("data-archive-open") || "").catch(function (error) {
            window.alert(error.message || "작품 보관 중 오류가 생겼습니다.");
          });
          return;
        }

        const unarchiveTrigger = event.target.closest("[data-unarchive-open]");
        if (unarchiveTrigger) {
          unarchiveNovel(unarchiveTrigger.getAttribute("data-unarchive-open") || "").catch(function (error) {
            window.alert(error.message || "작품 보관 해제 중 오류가 생겼습니다.");
          });
          return;
        }

        const hideTrigger = event.target.closest("[data-hide-episode]");
        if (hideTrigger) {
          hideEpisode(hideTrigger.getAttribute("data-hide-episode") || "").catch(function (error) {
            window.alert(error.message || "회차 숨김 중 오류가 생겼습니다.");
          });
          return;
        }

        const unhideTrigger = event.target.closest("[data-unhide-episode]");
        if (unhideTrigger) {
          unhideEpisode(unhideTrigger.getAttribute("data-unhide-episode") || "").catch(function (error) {
            window.alert(error.message || "회차 다시 공개 중 오류가 생겼습니다.");
          });
        }
      });
    }

    if (refs.saleClose) {
      refs.saleClose.addEventListener("click", function () {
        closeSalePanel();
      });
    }

    if (refs.saleClear) {
      refs.saleClear.addEventListener("click", function () {
        clearSale().catch(function (error) {
          setSaleStatus(error.message || "할인 해제 중 오류가 생겼습니다.", "error");
          setSaleBusy(false);
        });
      });
    }

    if (refs.saleDiscount) {
      refs.saleDiscount.addEventListener("change", syncSalePreview);
    }

    if (refs.saleForm) {
      refs.saleForm.addEventListener("submit", saveSale);
    }
  }

  async function refreshSession() {
    const sessionResult = await state.client.auth.getSession();
    state.session = sessionResult.data.session;
    rememberAccessToken(state.session);

    if (!state.session) {
      closeSalePanel();
      renderAuthGate();
      return;
    }

    await renderDashboard(state.session);
  }

  async function boot() {
    if (!refs.authShell || !refs.dashboard) return;
    bindFilters();
    bindSalePanel();

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
        closeSalePanel();
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
