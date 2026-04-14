(function () {
  var page = (window.location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  if (page !== "admin_dashboard_pc") return;

  var cfg = window.inkroadSupabaseConfig || {};
  var base = (cfg.url || "").replace(/\/$/, "");
  var key = cfg.publishableKey || cfg.anonKey || "";
  var storageKey = "inkroad-supabase-auth";
  var ADMIN_BOOTSTRAP_EMAILS = ["rimuru2178@gmail.com"];

  var state = {
    client: null,
    session: null,
    profile: null,
    works: [],
    filter: "all",
    search: "",
    saleTargetId: "",
    bannerTargetId: "",
    bannerConfig: null
  };

  var refs = {
    authShell: document.querySelector("[data-admin-auth]"),
    dashboard: document.querySelector("[data-admin-dashboard]"),
    list: document.querySelector("[data-admin-list]"),
    empty: document.querySelector("[data-admin-empty]"),
    search: document.querySelector("[data-admin-search]"),
    filters: Array.from(document.querySelectorAll("[data-admin-filter]")),
    bannerSummary: document.querySelector("[data-admin-banner-summary]"),
    headTotal: document.querySelector("[data-admin-head-stat='total']"),
    headSale: document.querySelector("[data-admin-head-stat='sale']"),
    headBanner: document.querySelector("[data-admin-head-stat='banner']"),
    metrics: {
      works: document.querySelector("[data-admin-metric='works']"),
      sales: document.querySelector("[data-admin-metric='sales']"),
      expiring: document.querySelector("[data-admin-metric='expiring']"),
      banner: document.querySelector("[data-admin-metric='banner']")
    },
    salePanel: document.querySelector("[data-admin-sale-panel]"),
    saleTitle: document.querySelector("[data-admin-sale-title]"),
    saleWorkTitle: document.querySelector("[data-admin-sale-work-title]"),
    saleDiscount: document.querySelector("[data-admin-sale-discount]"),
    saleStart: document.querySelector("[data-admin-sale-start]"),
    saleEnd: document.querySelector("[data-admin-sale-end]"),
    salePreview: document.querySelector("[data-admin-sale-preview]"),
    saleStatus: document.querySelector("[data-admin-sale-status]"),
    saleClose: document.querySelector("[data-admin-sale-close]"),
    saleClear: document.querySelector("[data-admin-sale-clear]"),
    saleForm: document.querySelector("[data-admin-sale-form]"),
    bannerPanel: document.querySelector("[data-admin-banner-panel]"),
    bannerWorkTitle: document.querySelector("[data-admin-banner-work-title]"),
    bannerTitle: document.querySelector("[data-admin-banner-title]"),
    bannerSubtitle: document.querySelector("[data-admin-banner-subtitle]"),
    bannerDescription: document.querySelector("[data-admin-banner-description]"),
    bannerImage: document.querySelector("[data-admin-banner-image]"),
    bannerStart: document.querySelector("[data-admin-banner-start]"),
    bannerEnd: document.querySelector("[data-admin-banner-end]"),
    bannerStatus: document.querySelector("[data-admin-banner-status]"),
    bannerClose: document.querySelector("[data-admin-banner-close]"),
    bannerClear: document.querySelector("[data-admin-banner-clear]"),
    bannerForm: document.querySelector("[data-admin-banner-form]")
  };

  function t(key, fallback) {
    if (window.inkroadI18n && typeof window.inkroadI18n.t === "function") {
      var translated = window.inkroadI18n.t(key);
      if (translated && translated !== key) return translated;
    }
    return fallback || key;
  }

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

  function formatMoney(value) {
    return formatCount(Math.round(Number(value || 0)));
  }

  function formatDate(value) {
    if (!value) return "미정";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "미정";
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function toLocalDateTimeValue(value) {
    if (!value) return "";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    var pad = function (num) { return String(num).padStart(2, "0"); };
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
  }

  function defaultRange() {
    var start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    var end = new Date(start.getTime());
    end.setDate(end.getDate() + 7);
    return {
      start: toLocalDateTimeValue(start.toISOString()),
      end: toLocalDateTimeValue(end.toISOString())
    };
  }

  function cover(work) {
    if (work && work.coverUrl) return work.coverUrl;
    if (work && work.bannerUrl) return work.bannerUrl;
    return "https://placehold.co/320x440/111827/f3f4f6?text=" + encodeURIComponent((work && work.title) || "InkRoad");
  }

  function summary(work) {
    return (work && work.shortDescription) || "작품 소개가 아직 입력되지 않았습니다.";
  }

  function salePercent(work) {
    var list = Number(work && work.bundleListPrice || 0);
    var sale = Number(work && work.bundleSalePrice || 0);
    if (!list || !sale || sale >= list) return 0;
    return Math.round(((list - sale) / list) * 100);
  }

  function getWorkById(id) {
    return state.works.find(function (work) { return work.id === id; }) || null;
  }

  function statusLabel(status) {
    var labels = {
      serializing: "연재중",
      completed: "완결",
      draft: "초안",
      paused: "휴재",
      archived: "보관됨"
    };
    return labels[status] || "상태 미정";
  }

  function renderConfigMessage() {
    refs.authShell.innerHTML =
      "<div class='auth-card' data-tone='warning'>" +
      "<div class='auth-head'>" +
      "<span class='eyebrow'>연결 필요</span>" +
      "<h2 class='auth-title'>Supabase 설정을 먼저 넣어주세요</h2>" +
      "<p class='auth-text'><code>assets/supabase-config.js</code>에 프로젝트 URL과 공개 키를 넣으면 관리자 페이지가 바로 열립니다.</p>" +
      "</div>" +
      "</div>";
    refs.dashboard.hidden = true;
  }

  function renderAuthGate(message) {
    refs.authShell.innerHTML =
      "<div class='auth-card'>" +
      "<div class='auth-head'>" +
      "<span class='eyebrow'>관리자 로그인</span>" +
      "<h2 class='auth-title'>스토어 운영 도구에 접속합니다</h2>" +
      "<p class='auth-text'>세일 퍼센트, 기간, 홈 대표 배너를 여기서 한 번에 조정할 수 있습니다.</p>" +
      "</div>" +
      "<form class='auth-form' data-admin-auth-form>" +
      "<div class='auth-grid'>" +
      "<label class='auth-label'><span>이메일</span><input class='auth-input' type='email' name='email' value='rimuru2178@gmail.com' required></label>" +
      "<label class='auth-label'><span>비밀번호</span><input class='auth-input' type='password' name='password' minlength='8' required></label>" +
      "</div>" +
      "<div class='auth-actions'><button class='button primary' type='submit'>로그인</button></div>" +
      "<p class='auth-note'>" + esc(message || "관리자 권한이 있는 계정으로 로그인해 주세요.") + "</p>" +
      "</form>" +
      "</div>";
    refs.dashboard.hidden = true;

    var form = q("[data-admin-auth-form]", refs.authShell);
    if (!form) return;
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

  function renderSignedIn(session) {
    var displayName = (state.profile && state.profile.display_name) || (session.user.user_metadata && session.user.user_metadata.display_name) || session.user.email || "관리자";
    refs.authShell.innerHTML =
      "<div class='auth-card' data-tone='success'>" +
      "<div class='auth-status-row'>" +
      "<div class='auth-user'>" +
      "<span class='auth-badge'>관리자</span>" +
      "<strong>" + esc(displayName) + "</strong>" +
      "<span class='auth-note'>전체 작품 세일과 홈 상단 배너를 여기서 조정합니다.</span>" +
      "</div>" +
      "<div class='auth-actions'>" +
      "<button class='button secondary' type='button' data-admin-logout>로그아웃</button>" +
      "</div>" +
      "</div>" +
      "</div>";
    refs.dashboard.hidden = false;

    var logoutButton = q("[data-admin-logout]", refs.authShell);
    if (logoutButton) {
      logoutButton.addEventListener("click", async function () {
        await state.client.auth.signOut();
      });
    }
  }

  function setStatus(node, message, tone) {
    if (!node) return;
    if (!message) {
      node.hidden = true;
      node.textContent = "";
      node.removeAttribute("data-tone");
      return;
    }
    node.hidden = false;
    node.dataset.tone = tone || "info";
    node.textContent = message;
  }

  function setSalePreview() {
    var work = getWorkById(state.saleTargetId);
    if (!work || !refs.salePreview || !refs.saleDiscount) return;
    var basePrice = Number(work.bundleListPrice || 0);
    var percent = Number(refs.saleDiscount.value || 0);
    var sale = Math.round((basePrice * (100 - percent)) / 100);
    refs.salePreview.textContent = "묶음 정가 " + formatMoney(basePrice) + "원 -> " + formatMoney(sale) + "원";
  }

  function activeBannerWork() {
    return state.bannerConfig && state.bannerConfig.novelId ? getWorkById(state.bannerConfig.novelId) : null;
  }

  function renderBannerSummary() {
    if (!refs.bannerSummary) return;
    var work = activeBannerWork();
    if (!state.bannerConfig || !work) {
      refs.bannerSummary.innerHTML =
        "<div class='creator-featured-thumb'><img src='https://placehold.co/640x360/111827/f3f4f6?text=Hero+Banner' alt='기본 배너'></div>" +
        "<div class='creator-featured-copy'>" +
        "<span class='eyebrow'>홈 대표 배너</span>" +
        "<h2>아직 설정된 대표 프로모션이 없습니다</h2>" +
        "<p>작품 카드에서 <strong>배너 편집</strong>을 눌러 홈 상단 대표 작품과 문구를 바로 지정할 수 있습니다.</p>" +
        "</div>";
        return;
    }

    refs.bannerSummary.innerHTML =
      "<div class='creator-featured-thumb'><img src='" + esc(state.bannerConfig.heroImageUrl || work.bannerUrl || cover(work)) + "' alt='" + esc(work.title) + " 배너'></div>" +
      "<div class='creator-featured-copy'>" +
      "<span class='eyebrow'>홈 대표 배너</span>" +
      "<h2>" + esc(state.bannerConfig.title || work.title) + "</h2>" +
      "<p>" + esc(state.bannerConfig.description || summary(work)) + "</p>" +
      "<div class='creator-meta-row'>" +
      "<span class='creator-chip' data-tone='sale'>" + esc(state.bannerConfig.statusLabel) + "</span>" +
      "<span class='creator-chip'>" + esc(work.title) + "</span>" +
      "<span class='creator-chip'>노출 종료 " + esc(formatDate(state.bannerConfig.endsAt)) + "</span>" +
      "</div>" +
      "<div class='button-row creator-action-row'>" +
      "<button class='button secondary' type='button' data-open-current-banner>배너 수정</button>" +
      "<a class='button ghost' href='homepage_pc.html'>홈에서 보기</a>" +
      "</div>" +
      "</div>";
  }

  function filteredWorks() {
    var search = state.search.trim().toLowerCase();
    return state.works.filter(function (work) {
      if (state.filter === "sale" && !salePercent(work)) return false;
      if (state.filter === "translated" && !work.isTranslation) return false;
      if (state.filter !== "all" && state.filter !== "sale" && state.filter !== "translated" && work.status !== state.filter) return false;
      if (!search) return true;
      return [
        work.title,
        work.authorName,
        summary(work),
        (work.tags || []).join(" ")
      ].join(" ").toLowerCase().indexOf(search) !== -1;
    });
  }

  function renderMetrics() {
    var works = state.works;
    var saleWorks = works.filter(function (work) { return salePercent(work) > 0; });
    var soon = saleWorks.filter(function (work) {
      if (!work.saleEndsAt) return false;
      return new Date(work.saleEndsAt).getTime() - Date.now() <= 1000 * 60 * 60 * 24 * 3;
    });
    var bannerLabel = state.bannerConfig ? "설정됨" : "미설정";

    if (refs.headTotal) refs.headTotal.textContent = formatCount(works.length) + "개";
    if (refs.headSale) refs.headSale.textContent = formatCount(saleWorks.length) + "개";
    if (refs.headBanner) refs.headBanner.textContent = bannerLabel;
    if (refs.metrics.works) refs.metrics.works.textContent = formatCount(works.length);
    if (refs.metrics.sales) refs.metrics.sales.textContent = formatCount(saleWorks.length);
    if (refs.metrics.expiring) refs.metrics.expiring.textContent = formatCount(soon.length);
    if (refs.metrics.banner) refs.metrics.banner.textContent = bannerLabel;
  }

  function renderList() {
    var works = filteredWorks();
    refs.filters.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.adminFilter === state.filter);
    });

    if (!works.length) {
      refs.list.innerHTML = "";
      refs.empty.hidden = false;
      return;
    }

    refs.empty.hidden = true;
    refs.list.innerHTML = works.map(function (work) {
      var sale = salePercent(work);
      var tags = (work.tags || []).length
        ? work.tags.slice(0, 4).map(function (tag) { return "<span class='creator-chip'>" + esc(tag) + "</span>"; }).join("")
        : "<span class='creator-chip'>태그 없음</span>";
      var bannerBadge = state.bannerConfig && state.bannerConfig.novelId === work.id
        ? "<span class='creator-chip' data-tone='sale'>홈 배너 노출중</span>"
        : "";
      var saleInfo = sale
        ? "<span class='creator-chip' data-tone='sale'>-" + formatCount(sale) + "% 세일</span><span class='meta-text'>" + esc(formatDate(work.saleEndsAt)) + " 종료</span>"
        : "<span class='meta-text'>세일 없음</span>";

      return "<article class='creator-work-card admin-work-card'>" +
        "<a class='creator-work-thumb' href='novel_detail_pc.html?slug=" + encodeURIComponent(work.slug) + "'><img src='" + esc(cover(work)) + "' alt='" + esc(work.title) + " 표지'></a>" +
        "<div class='creator-work-copy'>" +
          "<div class='creator-meta-row'>" +
            "<span class='creator-chip' data-tone='" + esc(work.status) + "'>" + esc(statusLabel(work.status)) + "</span>" +
            "<span class='creator-chip'>" + esc(work.authorName) + "</span>" +
            bannerBadge +
          "</div>" +
          "<h3>" + esc(work.title) + "</h3>" +
          "<p>" + esc(summary(work)) + "</p>" +
          "<div class='creator-tag-row'>" + tags + "</div>" +
          "<div class='creator-stat-row'>" +
            "<span class='meta-text'>총 " + formatCount(work.totalEpisodeCount) + "화</span>" +
            "<span class='meta-text'>무료 " + formatCount(work.freeEpisodeCount) + "화</span>" +
            "<span class='meta-text'>조회 " + formatCount(work.viewCount) + "</span>" +
            "<span class='meta-text'>평점 " + Number(work.reactionScore || 0).toFixed(1) + "</span>" +
            saleInfo +
          "</div>" +
        "</div>" +
        "<div class='creator-work-side admin-work-side'>" +
          "<span class='meta-text'>최근 수정 " + esc(formatDate(work.updatedAt)) + "</span>" +
          "<strong>" + (work.bundleListPrice ? "묶음 정가 " + formatMoney(work.bundleListPrice) + "원" : "정가 미입력") + "</strong>" +
          "<div class='button-row creator-action-row'>" +
            "<button class='button small secondary' type='button' data-admin-sale-open='" + esc(work.id) + "'>세일 편집</button>" +
            "<button class='button small ghost' type='button' data-admin-banner-open='" + esc(work.id) + "'>배너 편집</button>" +
            "<a class='button small ghost' href='novel_upload_pc.html?edit=" + encodeURIComponent(work.id) + "'>작품 수정</a>" +
            "<a class='button small primary' href='novel_detail_pc.html?slug=" + encodeURIComponent(work.slug) + "'>상세 보기</a>" +
          "</div>" +
        "</div>" +
      "</article>";
    }).join("");
  }

  function normalizeWorks(rawWorks) {
    return (rawWorks || []).map(function (work) {
      return {
        id: work.id,
        slug: work.slug,
        title: work.title,
        subtitle: work.subtitle || "",
        shortDescription: work.short_description || "",
        status: work.status || "draft",
        coverUrl: work.cover_url || "",
        bannerUrl: work.banner_url || "",
        totalEpisodeCount: Number(work.total_episode_count || 0),
        freeEpisodeCount: Number(work.free_episode_count || 0),
        reactionScore: Number(work.reaction_score || 0),
        viewCount: Number(work.view_count || 0),
        bundleListPrice: work.bundle_list_price !== null ? Number(work.bundle_list_price) : 0,
        bundleSalePrice: work.bundle_sale_price !== null ? Number(work.bundle_sale_price) : null,
        saleStartsAt: work.sale_starts_at || null,
        saleEndsAt: work.sale_ends_at || null,
        updatedAt: work.updated_at || null,
        isTranslation: Boolean(work.is_translation),
        authorName: work.author_name || "작가 미정",
        tags: Array.isArray(work.tags) ? work.tags : []
      };
    });
  }

  function normalizeBanner(raw) {
    if (!raw) return null;
    var labels = {
      scheduled: "예약됨",
      active: "노출중",
      ended: "종료됨"
    };
    return {
      eventId: raw.event_id || "",
      novelId: raw.novel_id || "",
      title: raw.title || "",
      subtitle: raw.subtitle || "",
      description: raw.description || "",
      heroImageUrl: raw.hero_image_url || "",
      startsAt: raw.starts_at || null,
      endsAt: raw.ends_at || null,
      status: raw.status || "scheduled",
      statusLabel: labels[raw.status] || "상태 미정"
    };
  }

  async function fetchAdminData() {
    var novelsResult = await state.client.rpc("list_novels_for_admin");
    if (novelsResult.error) throw novelsResult.error;

    var bannerResult = await state.client.rpc("get_home_hero_banner_for_admin");
    if (bannerResult.error && bannerResult.error.message.indexOf("관리자 권한") === -1) {
      throw bannerResult.error;
    }

    state.works = normalizeWorks(novelsResult.data || []);
    state.bannerConfig = normalizeBanner(bannerResult.data || null);
  }

  function openSalePanel(novelId) {
    var work = getWorkById(novelId);
    if (!work || !refs.salePanel) return;
    state.saleTargetId = novelId;
    refs.salePanel.hidden = false;
    refs.saleTitle.textContent = salePercent(work) ? "할인 수정" : "할인 등록";
    refs.saleWorkTitle.value = work.title;
    refs.saleDiscount.value = String(salePercent(work) || 10);
    refs.saleStart.value = toLocalDateTimeValue(work.saleStartsAt) || defaultRange().start;
    refs.saleEnd.value = toLocalDateTimeValue(work.saleEndsAt) || defaultRange().end;
    refs.saleClear.hidden = !salePercent(work);
    setSalePreview();
    setStatus(refs.saleStatus, "", "");
    refs.salePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function closeSalePanel() {
    state.saleTargetId = "";
    if (refs.salePanel) refs.salePanel.hidden = true;
    setStatus(refs.saleStatus, "", "");
  }

  async function saveSale(event) {
    event.preventDefault();
    var work = getWorkById(state.saleTargetId);
    if (!work) return;
    var startsAt = new Date(refs.saleStart.value);
    var endsAt = new Date(refs.saleEnd.value);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      setStatus(refs.saleStatus, "할인 기간을 다시 확인해 주세요.", "error");
      return;
    }

    setStatus(refs.saleStatus, "세일 저장 중입니다...", "info");
    var result = await state.client.rpc("upsert_novel_sale_for_admin", {
      p_novel_id: state.saleTargetId,
      p_discount_percent: Number(refs.saleDiscount.value),
      p_sale_starts_at: startsAt.toISOString(),
      p_sale_ends_at: endsAt.toISOString()
    });
    if (result.error) {
      setStatus(refs.saleStatus, result.error.message || "세일 저장에 실패했습니다.", "error");
      return;
    }
    await renderDashboard();
    openSalePanel(state.saleTargetId);
    setStatus(refs.saleStatus, "세일 일정이 저장되었습니다.", "success");
  }

  async function clearSale() {
    if (!state.saleTargetId) return;
    if (!window.confirm("이 작품 세일을 해제할까요?")) return;
    setStatus(refs.saleStatus, "세일 해제 중입니다...", "info");
    var result = await state.client.rpc("clear_novel_sale_for_admin", {
      p_novel_id: state.saleTargetId
    });
    if (result.error) {
      setStatus(refs.saleStatus, result.error.message || "세일 해제에 실패했습니다.", "error");
      return;
    }
    await renderDashboard();
    closeSalePanel();
  }

  function openBannerPanel(novelId) {
    var work = getWorkById(novelId);
    if (!work || !refs.bannerPanel) return;
    state.bannerTargetId = novelId;
    refs.bannerPanel.hidden = false;
    refs.bannerWorkTitle.value = work.title;
    refs.bannerTitle.value = (state.bannerConfig && state.bannerConfig.novelId === work.id ? state.bannerConfig.title : "") || work.title;
    refs.bannerSubtitle.value = (state.bannerConfig && state.bannerConfig.novelId === work.id ? state.bannerConfig.subtitle : "") || work.subtitle || work.authorName;
    refs.bannerDescription.value = (state.bannerConfig && state.bannerConfig.novelId === work.id ? state.bannerConfig.description : "") || summary(work);
    refs.bannerImage.value = (state.bannerConfig && state.bannerConfig.novelId === work.id ? state.bannerConfig.heroImageUrl : "") || work.bannerUrl || "";
    refs.bannerStart.value = (state.bannerConfig && state.bannerConfig.novelId === work.id ? toLocalDateTimeValue(state.bannerConfig.startsAt) : "") || defaultRange().start;
    refs.bannerEnd.value = (state.bannerConfig && state.bannerConfig.novelId === work.id ? toLocalDateTimeValue(state.bannerConfig.endsAt) : "") || defaultRange().end;
    refs.bannerClear.hidden = !state.bannerConfig;
    setStatus(refs.bannerStatus, "", "");
    refs.bannerPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function closeBannerPanel() {
    state.bannerTargetId = "";
    if (refs.bannerPanel) refs.bannerPanel.hidden = true;
    setStatus(refs.bannerStatus, "", "");
  }

  async function saveBanner(event) {
    event.preventDefault();
    var work = getWorkById(state.bannerTargetId);
    if (!work) return;
    var startsAt = new Date(refs.bannerStart.value);
    var endsAt = new Date(refs.bannerEnd.value);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      setStatus(refs.bannerStatus, "배너 노출 기간을 다시 확인해 주세요.", "error");
      return;
    }

    setStatus(refs.bannerStatus, "배너 저장 중입니다...", "info");
    var result = await state.client.rpc("upsert_home_hero_banner_for_admin", {
      p_novel_id: state.bannerTargetId,
      p_title: refs.bannerTitle.value.trim(),
      p_subtitle: refs.bannerSubtitle.value.trim(),
      p_description: refs.bannerDescription.value.trim(),
      p_hero_image_url: refs.bannerImage.value.trim(),
      p_starts_at: startsAt.toISOString(),
      p_ends_at: endsAt.toISOString()
    });
    if (result.error) {
      setStatus(refs.bannerStatus, result.error.message || "배너 저장에 실패했습니다.", "error");
      return;
    }
    await renderDashboard();
    openBannerPanel(state.bannerTargetId);
    setStatus(refs.bannerStatus, "홈 대표 배너가 저장되었습니다.", "success");
  }

  async function clearBanner() {
    if (!state.bannerConfig) return;
    if (!window.confirm("현재 홈 대표 배너를 해제할까요?")) return;
    setStatus(refs.bannerStatus, "배너 해제 중입니다...", "info");
    var result = await state.client.rpc("clear_home_hero_banner_for_admin");
    if (result.error) {
      setStatus(refs.bannerStatus, result.error.message || "배너 해제에 실패했습니다.", "error");
      return;
    }
    await renderDashboard();
    closeBannerPanel();
  }

  async function renderDashboard() {
    await fetchAdminData();
    renderMetrics();
    renderBannerSummary();
    renderList();
  }

  function bindEvents() {
    if (refs.search) {
      refs.search.addEventListener("input", function () {
        state.search = refs.search.value || "";
        renderList();
      });
    }

    refs.filters.forEach(function (button) {
      button.addEventListener("click", function () {
        state.filter = button.dataset.adminFilter || "all";
        renderList();
      });
    });

    document.addEventListener("click", function (event) {
      var saleTrigger = event.target.closest("[data-admin-sale-open]");
      if (saleTrigger) {
        openSalePanel(saleTrigger.getAttribute("data-admin-sale-open") || "");
        return;
      }
      var bannerTrigger = event.target.closest("[data-admin-banner-open]");
      if (bannerTrigger) {
        openBannerPanel(bannerTrigger.getAttribute("data-admin-banner-open") || "");
        return;
      }
      var currentBanner = event.target.closest("[data-open-current-banner]");
      if (currentBanner && state.bannerConfig && state.bannerConfig.novelId) {
        openBannerPanel(state.bannerConfig.novelId);
      }
    });

    if (refs.saleDiscount) refs.saleDiscount.addEventListener("change", setSalePreview);
    if (refs.saleForm) refs.saleForm.addEventListener("submit", function (event) {
      saveSale(event).catch(function (error) {
        setStatus(refs.saleStatus, error.message || "세일 저장에 실패했습니다.", "error");
      });
    });
    if (refs.saleClose) refs.saleClose.addEventListener("click", closeSalePanel);
    if (refs.saleClear) refs.saleClear.addEventListener("click", function () {
      clearSale().catch(function (error) {
        setStatus(refs.saleStatus, error.message || "세일 해제에 실패했습니다.", "error");
      });
    });

    if (refs.bannerForm) refs.bannerForm.addEventListener("submit", function (event) {
      saveBanner(event).catch(function (error) {
        setStatus(refs.bannerStatus, error.message || "배너 저장에 실패했습니다.", "error");
      });
    });
    if (refs.bannerClose) refs.bannerClose.addEventListener("click", closeBannerPanel);
    if (refs.bannerClear) refs.bannerClear.addEventListener("click", function () {
      clearBanner().catch(function (error) {
        setStatus(refs.bannerStatus, error.message || "배너 해제에 실패했습니다.", "error");
      });
    });
  }

  async function loadProfile(session) {
    var result = await state.client
      .from("profiles")
      .select("id,display_name,role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (result.error) throw result.error;
    state.profile = result.data || null;
    if (!state.profile || state.profile.role !== "admin") {
      throw new Error("관리자 권한이 필요합니다.");
    }
  }

  async function maybeBootstrapAdmin(session) {
    var email = String((session && session.user && session.user.email) || "").trim().toLowerCase();
    if (!email || ADMIN_BOOTSTRAP_EMAILS.indexOf(email) === -1) return;

    var result = await state.client.rpc("bootstrap_admin_access");
    if (result.error && result.error.message.indexOf("관리자 승격 대상") === -1) {
      throw result.error;
    }
  }

  async function refreshSession() {
    var sessionResult = await state.client.auth.getSession();
    state.session = sessionResult.data.session;

    if (!state.session) {
      renderAuthGate();
      return;
    }

    try {
      await maybeBootstrapAdmin(state.session);
      await loadProfile(state.session);
      renderSignedIn(state.session);
      await renderDashboard();
    } catch (error) {
      renderAuthGate(error.message || "관리자 계정만 접근할 수 있습니다.");
    }
  }

  async function boot() {
    if (!refs.authShell || !refs.dashboard) return;
    bindEvents();

    if (!base || !key || !window.supabase || !window.supabase.createClient) {
      renderConfigMessage();
      return;
    }

    state.client = window.supabase.createClient(base, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: storageKey
      }
    });

    await refreshSession();
    state.client.auth.onAuthStateChange(function (_event, session) {
      state.session = session;
      refreshSession().catch(function (error) {
        renderAuthGate(error.message || "세션을 다시 불러오지 못했습니다.");
      });
    });
  }

  boot().catch(function (error) {
    renderAuthGate(error.message || "관리자 화면을 불러오지 못했습니다.");
  });
})();
