(function () {
  const storageKeys = {
    bookmarks: "inkroad-bookmarks",
    reader: "inkroad-reader-settings"
  };

  const getBookmarkButtons = () => document.querySelectorAll("[data-bookmark-id]");
  const yearTargets = document.querySelectorAll("[data-year]");
  const revealNodes = document.querySelectorAll("[data-reveal]");
  const navLinks = document.querySelectorAll("[data-nav-link]");
  const searchInput = document.querySelector("[data-search-input]");
  const searchCards = document.querySelectorAll("[data-search-card]");
  const filterChips = document.querySelectorAll("[data-filter-chip]");
  const activeFilterBox = document.querySelector("[data-active-filters]");
  const tabButtons = document.querySelectorAll("[data-tab-target]");
  const tabPanels = document.querySelectorAll("[data-tab-panel]");
  const readerRoot = document.documentElement;
  const readerSurface = document.querySelector("[data-reader-root]");
  const fontButtons = document.querySelectorAll("[data-font-step]");
  const themeButtons = document.querySelectorAll("[data-theme]");

  const syncViewportInsets = () => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    if (!root || !viewport) return;

    const layoutHeight = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
    const measuredInset = Math.max(0, Math.round(layoutHeight - viewport.height - viewport.offsetTop));
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent || "") || (/Mac/.test(navigator.platform || "") && navigator.maxTouchPoints > 1);
    const browserBottomInset = isIOS ? Math.max(68, measuredInset) : measuredInset;
    root.style.setProperty("--browser-bottom-inset", `${browserBottomInset}px`);
  };

  if (window.visualViewport) {
    syncViewportInsets();
    window.visualViewport.addEventListener("resize", syncViewportInsets);
    window.visualViewport.addEventListener("scroll", syncViewportInsets);
    window.addEventListener("orientationchange", syncViewportInsets);
    window.addEventListener("pageshow", syncViewportInsets);
  }

  const getBookmarks = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKeys.bookmarks) || "[]");
    } catch (error) {
      return [];
    }
  };

  const setBookmarks = (value) => {
    localStorage.setItem(storageKeys.bookmarks, JSON.stringify(value));
  };

  const syncBookmarks = () => {
    const bookmarks = new Set(getBookmarks());
    getBookmarkButtons().forEach((button) => {
      const id = button.dataset.bookmarkId;
      const isSaved = bookmarks.has(id);
      button.setAttribute("aria-pressed", String(isSaved));

      const labelNode = button.querySelector("[data-bookmark-label]");
      if (labelNode) {
        labelNode.textContent = isSaved ? t("viewer.bookmark_done") : t("viewer.bookmark_add");
      }
    });
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-bookmark-id]");
    if (!button) return;

    const bookmarks = new Set(getBookmarks());
    const id = button.dataset.bookmarkId;
    if (!id) return;

    if (bookmarks.has(id)) {
      bookmarks.delete(id);
    } else {
      bookmarks.add(id);
    }

    setBookmarks(Array.from(bookmarks));
    syncBookmarks();
  });

  yearTargets.forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  if (revealNodes.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );

    revealNodes.forEach((node) => observer.observe(node));
  }

  if (navLinks.length) {
    const currentPath = (window.location.pathname.split("/").pop() || "homepage").replace(/\.html$/, "");
    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if ((href || "").replace(/\.html$/, "") === currentPath) {
        link.classList.add("current");
      }
    });
  }

  const renderActiveFilters = () => {
    if (!activeFilterBox) return;

    const active = Array.from(filterChips)
      .map((chip) => ({
        label: chip.dataset.label || chip.textContent.trim(),
        state: chip.dataset.state || "off"
      }))
      .filter((chip) => chip.state !== "off");

    activeFilterBox.innerHTML = "";

    if (!active.length) {
      const empty = document.createElement("span");
      empty.className = "muted-badge";
      empty.textContent = t("store.filter_instruction");
      activeFilterBox.appendChild(empty);
      return;
    }

    active.forEach((chip) => {
      const tag = document.createElement("span");
      tag.className = chip.state === "include" ? "status-pill active" : "sale-badge";
      tag.textContent = chip.state === "include" ? t("store.filter_include_prefix") + chip.label : t("store.filter_exclude_prefix") + chip.label;
      activeFilterBox.appendChild(tag);
    });
  };

  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const current = chip.dataset.state || "off";
      const next = current === "off" ? "include" : current === "include" ? "exclude" : "off";
      chip.dataset.state = next;
      chip.classList.toggle("is-active", next === "include");
      chip.classList.toggle("is-excluded", next === "exclude");
      chip.textContent = chip.dataset.label || chip.textContent.trim();

      if (next === "include") {
        chip.textContent = chip.dataset.label + t("store.filter_chip_include");
      } else if (next === "exclude") {
        chip.textContent = chip.dataset.label + t("store.filter_chip_exclude");
      }

      renderActiveFilters();
    });
  });

  if (searchInput && searchCards.length) {
    const filterSearchResults = () => {
      const keyword = searchInput.value.trim().toLowerCase();

      searchCards.forEach((card) => {
        const haystack = [
          card.dataset.title,
          card.dataset.author,
          card.dataset.tags,
          card.textContent
        ]
          .join(" ")
          .toLowerCase();

        card.hidden = keyword ? !haystack.includes(keyword) : false;
      });
    };

    searchInput.addEventListener("input", filterSearchResults);
    filterSearchResults();
  }

  const activateTab = (name) => {
    tabButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tabTarget === name);
    });

    tabPanels.forEach((panel) => {
      panel.classList.toggle("is-hidden", panel.dataset.tabPanel !== name);
    });
  };

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tabTarget));
  });

  if (tabButtons.length && tabPanels.length) {
    activateTab(tabButtons[0].dataset.tabTarget);
  }

  const getReaderSettings = () => {
    try {
      return JSON.parse(
        localStorage.getItem(storageKeys.reader) ||
          JSON.stringify({ fontSize: 1.16, theme: "dark" })
      );
    } catch (error) {
      return { fontSize: 1.16, theme: "dark" };
    }
  };

  const applyReaderSettings = (settings) => {
    if (!readerSurface) return;

    readerSurface.style.setProperty("--reader-font-size", `${settings.fontSize}rem`);
    readerRoot.classList.remove("reader-theme-dark", "reader-theme-paper", "reader-theme-sepia");
    readerRoot.classList.add(`reader-theme-${settings.theme}`);

    themeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.theme === settings.theme);
    });
  };

  if (readerSurface) {
    const settings = getReaderSettings();
    applyReaderSettings(settings);

    fontButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const current = getReaderSettings();
        const next = Math.max(0.98, Math.min(1.42, current.fontSize + Number(button.dataset.fontStep)));
        const updated = { ...current, fontSize: Number(next.toFixed(2)) };
        localStorage.setItem(storageKeys.reader, JSON.stringify(updated));
        applyReaderSettings(updated);
      });
    });

    themeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const current = getReaderSettings();
        const updated = { ...current, theme: button.dataset.theme };
        localStorage.setItem(storageKeys.reader, JSON.stringify(updated));
        applyReaderSettings(updated);
      });
    });
  }

  syncBookmarks();
  renderActiveFilters();
})();

(function () {
  const cfg = window.inkroadSupabaseConfig || {};
  const base = (cfg.url || "").replace(/\/$/, "");
  const key = cfg.publishableKey || cfg.anonKey || "";
  if (!base || !key) return;

  const page = (window.location.pathname.split("/").pop() || "homepage").replace(/\.html$/, "");
  const query = new URLSearchParams(window.location.search);
  const isPc = page.includes("_pc");
  const redesignedPcPages = new Set([
    "homepage_pc",
    "search_pc",
    "novel_detail_pc",
    "novel_viewer_pc"
  ]);
  if (isPc && document.body.classList.contains("store-light") && redesignedPcPages.has(page)) return;
  const links = {
    search: isPc ? "search_pc.html" : "search.html",
    detail: isPc ? "novel_detail_pc.html" : "novel_detail.html",
    viewer: isPc ? "novel_viewer_pc.html" : "novel_viewer.html",
    library: isPc ? "my_library_pc.html" : "my_library.html"
  };
  const store = {
    bookmarks: "inkroad-bookmarks",
    history: "inkroad-reading-history",
    accessToken: "inkroad-supabase-access-token"
  };

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function money(value) {
    return Number(value || 0).toLocaleString(window.inkroadI18n.locale) + t("common.won");
  }

  function count(value) {
    return Number(value || 0).toLocaleString(window.inkroadI18n.locale);
  }

  function inFilter(values) {
    return "in.(" + values.map(function (value) { return '"' + String(value) + '"'; }).join(",") + ")";
  }

  function detailHref(slug) {
    return links.detail + "?slug=" + encodeURIComponent(slug);
  }

  function viewerHref(slug, episode) {
    return links.viewer + "?slug=" + encodeURIComponent(slug) + "&episode=" + encodeURIComponent(episode || 1);
  }

  function searchHref(tag) {
    return tag ? links.search + "?tag=" + encodeURIComponent(tag) : links.search;
  }

  function bg(node, variableName, url) {
    if (!node || !url) return;
    node.style.setProperty(variableName, "url('" + String(url).replace(/'/g, "%27") + "')");
  }

  function placeholder(title) {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 880'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop stop-color='#0b1524'/><stop offset='1' stop-color='#111827'/></linearGradient></defs><rect width='640' height='880' fill='url(#g)'/><circle cx='500' cy='160' r='140' fill='#f59e0b' fill-opacity='0.18'/><text x='56' y='730' fill='#f8fafc' font-size='58' font-weight='800' font-family='Arial, sans-serif'>" + esc(String(title || "InkRoad").slice(0, 24)) + "</text><text x='56' y='792' fill='#f8fafc' fill-opacity='0.65' font-size='26' font-family='Arial, sans-serif'>InkRoad</text></svg>";
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function syncBookmarks() {
    let bookmarks = [];
    try {
      bookmarks = JSON.parse(localStorage.getItem(store.bookmarks) || "[]");
    } catch (error) {
      bookmarks = [];
    }
    const saved = new Set(bookmarks);
    qa("[data-bookmark-id]").forEach(function (button) {
      const active = saved.has(button.dataset.bookmarkId);
      button.setAttribute("aria-pressed", String(active));
      const label = q("[data-bookmark-label]", button);
      if (label) label.textContent = active ? t("viewer.bookmark_done") : t("viewer.bookmark_add");
    });
  }

  function liveSearch() {
    const input = q("[data-search-input]");
    const keyword = input ? input.value.trim().toLowerCase() : "";
    const include = qa("[data-filter-chip]").filter(function (chip) { return chip.dataset.state === "include"; }).map(function (chip) { return (chip.dataset.label || "").toLowerCase(); });
    const exclude = qa("[data-filter-chip]").filter(function (chip) { return chip.dataset.state === "exclude"; }).map(function (chip) { return (chip.dataset.label || "").toLowerCase(); });

    qa("[data-search-card]").forEach(function (card) {
      const text = [card.dataset.title, card.dataset.author, card.dataset.tags, card.textContent].join(" ").toLowerCase();
      const pass = (!keyword || text.indexOf(keyword) !== -1) && include.every(function (label) { return text.indexOf(label) !== -1; }) && exclude.every(function (label) { return text.indexOf(label) === -1; });
      card.hidden = !pass;
    });
  }

  qa("[data-filter-chip]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      setTimeout(liveSearch, 0);
    });
  });
  const searchInput = q("[data-search-input]");
  if (searchInput) searchInput.addEventListener("input", liveSearch);

  function accessToken() {
    return cfg.accessToken || localStorage.getItem(store.accessToken) || "";
  }

  async function rest(resource, params) {
    const url = new URL(base + "/rest/v1/" + resource);
    Object.keys(params || {}).forEach(function (keyName) {
      const value = params[keyName];
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(keyName, value);
      }
    });

    const authValue = accessToken() || key;
    const response = await fetch(url.toString(), {
      headers: {
        apikey: key,
        Authorization: "Bearer " + authValue,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Supabase request failed: " + response.status + " " + response.statusText);
    }

    return response.json();
  }

  let cachedCatalog = null;

  async function catalog() {
    if (cachedCatalog) return cachedCatalog;

    const novels = await rest("novels", {
      select: "id,slug,title,subtitle,short_description,description,cover_url,banner_url,status,is_translation,free_episode_count,total_episode_count,reaction_score,view_count,bookmark_count,comment_count,bundle_list_price,bundle_sale_price,authors(pen_name)",
      status: "not.eq.draft",
      order: "reaction_score.desc,view_count.desc"
    });

    const tags = novels.length
      ? await rest("novel_tags", {
          select: "novel_id,tags(name)",
          novel_id: inFilter(novels.map(function (novel) { return novel.id; }))
        })
      : [];

    const events = await rest("events", {
      select: "id,title,subtitle,status",
      status: "eq.active",
      order: "starts_at.desc"
    });
    const eventItems = events.length
      ? await rest("event_items", {
          select: "event_id,novel_id,discount_percent,sale_price,sort_order",
          event_id: inFilter(events.map(function (event) { return event.id; })),
          order: "sort_order.asc"
        })
      : [];

    const tagMap = new Map();
    tags.forEach(function (row) {
      const current = tagMap.get(row.novel_id) || [];
      if (row.tags && row.tags.name) current.push(row.tags.name);
      tagMap.set(row.novel_id, current);
    });

    const novelMap = new Map();
    const slugMap = new Map();
    const mappedNovels = novels.map(function (novel) {
      const mapped = {
        id: novel.id,
        slug: novel.slug,
        title: novel.title,
        subtitle: novel.subtitle || "",
        shortDescription: novel.short_description || "",
        description: novel.description || "",
        coverUrl: novel.cover_url || "",
        bannerUrl: novel.banner_url || "",
        status: novel.status,
        isTranslation: Boolean(novel.is_translation),
        freeEpisodeCount: Number(novel.free_episode_count || 0),
        totalEpisodeCount: Number(novel.total_episode_count || 0),
        reactionScore: Number(novel.reaction_score || 0),
        viewCount: Number(novel.view_count || 0),
        bookmarkCount: Number(novel.bookmark_count || 0),
        commentCount: Number(novel.comment_count || 0),
        bundleListPrice: novel.bundle_list_price !== null ? Number(novel.bundle_list_price) : null,
        bundleSalePrice: novel.bundle_sale_price !== null ? Number(novel.bundle_sale_price) : null,
        authorName: novel.authors && novel.authors.pen_name ? novel.authors.pen_name : t("common.unknown_author"),
        tags: tagMap.get(novel.id) || []
      };
      novelMap.set(mapped.id, mapped);
      slugMap.set(mapped.slug, mapped);
      return mapped;
    });

    const eventMap = new Map(events.map(function (event) { return [event.id, event]; }));
    const mappedItems = eventItems.map(function (item) {
      return {
        event: eventMap.get(item.event_id),
        novel: novelMap.get(item.novel_id),
        discountPercent: Number(item.discount_percent || 0),
        salePrice: item.sale_price !== null ? Number(item.sale_price) : null
      };
    }).filter(function (item) {
      return item.event && item.novel;
    });

    cachedCatalog = { novels: mappedNovels, novelsBySlug: slugMap, eventItems: mappedItems };
    return cachedCatalog;
  }

  async function episodes(novelId) {
    const rows = await rest("episodes", {
      select: "id,episode_number,title,teaser,access_type,price",
      novel_id: "eq." + novelId,
      status: "eq.published",
      order: "episode_number.asc"
    });
    return rows.map(function (row) {
      return {
        id: row.id,
        episodeNumber: Number(row.episode_number || 0),
        title: row.title,
        teaser: row.teaser || "",
        accessType: row.access_type || "free",
        price: row.price ? Number(row.price) : 0
      };
    });
  }

  async function episodeBody(episodeId) {
    const rows = await rest("episode_contents", {
      select: "body",
      episode_id: "eq." + episodeId
    });
    return rows[0] && rows[0].body ? rows[0].body : "";
  }

  function summary(novel) {
    return novel.shortDescription || novel.description || t("common.no_description");
  }

  function cover(novel) {
    return novel.coverUrl || placeholder(novel.title);
  }

  function banner(novel) {
    return novel.bannerUrl || novel.coverUrl || placeholder(novel.title);
  }

  function salePercent(novel) {
    if (!novel.bundleListPrice || !novel.bundleSalePrice || novel.bundleSalePrice >= novel.bundleListPrice) return 0;
    return Math.round(((novel.bundleListPrice - novel.bundleSalePrice) / novel.bundleListPrice) * 100);
  }

  function renderHome(data) {
    const featured = data.novelsBySlug.get(query.get("slug") || "black-mage-oath") || data.novels[0];
    if (!featured) return;
    const offers = data.eventItems.filter(function (item) { return item.novel.slug !== featured.slug; }).slice(0, isPc ? 4 : 3);
    const topBookmark = q(".topbar [data-bookmark-id]");
    if (topBookmark) topBookmark.dataset.bookmarkId = featured.slug;

    if (isPc) {
      const storyImage = q(".story-image");
      if (storyImage) {
        storyImage.href = detailHref(featured.slug);
        bg(storyImage, "--story-image", banner(featured));
      }
      const ctas = qa(".landing-actions a");
      if (ctas[0]) ctas[0].href = searchHref(featured.tags[0] || "");
      if (ctas[1]) ctas[1].href = detailHref(featured.slug);
      const sideTitle = q(".landing-side-title");
      if (sideTitle) sideTitle.textContent = featured.title;
      const sideCopy = q(".landing-side-copy");
      if (sideCopy) sideCopy.textContent = "첫 " + featured.freeEpisodeCount + "화 무료 공개. " + summary(featured);
      const sideCta = q(".landing-side-cta");
      if (sideCta) sideCta.href = viewerHref(featured.slug, 1);
      const storyTitle = q(".story-image-copy h3");
      if (storyTitle) storyTitle.textContent = featured.title;
      const storyCopy = q(".story-image-copy p");
      if (storyCopy) storyCopy.textContent = summary(featured);
      const storyMeta = q(".story-image-meta");
      if (storyMeta) {
        storyMeta.innerHTML = "<span>무료 공개 " + featured.freeEpisodeCount + "화</span><span>반응 " + featured.reactionScore.toFixed(1) + "</span><span>" + esc(featured.tags[0] || (featured.isTranslation ? t("store.translated_work") : t("store.korean_work"))) + "</span>";
      }
      const board = q(".offer-board");
      if (board && offers.length) {
        board.innerHTML = offers.map(function (item) {
          const percent = item.discountPercent || salePercent(item.novel);
          return "<article class='offer-row'><div class='offer-main'><strong>" + esc(item.novel.title) + "</strong><span>" + esc(item.event.subtitle || summary(item.novel)) + "</span></div><div class='offer-tags'>" + (item.novel.tags || []).slice(0, 3).map(function (tag, index) { return "<span class='chip" + (index < 2 ? " active" : "") + "'>" + esc(tag) + "</span>"; }).join("") + "</div><div class='offer-price'>" + percent + "% 할인</div><a class='button small ghost offer-cta' href='" + detailHref(item.novel.slug) + "'>상세 보기</a></article>";
        }).join("");
      }
    } else {
      const ctas = qa(".mobile-poster .hero-cta a");
      if (ctas[0]) ctas[0].href = viewerHref(featured.slug, 1);
      if (ctas[1]) ctas[1].href = searchHref(featured.tags[0] || "");
      const focusMedia = q(".mobile-focus-media");
      if (focusMedia) {
        focusMedia.href = detailHref(featured.slug);
        bg(focusMedia, "--focus-image", banner(featured));
      }
      const focusTitle = q(".mobile-focus-title");
      if (focusTitle) focusTitle.textContent = featured.title;
      const focusCopy = q(".mobile-focus-copy .book-desc");
      if (focusCopy) focusCopy.textContent = summary(featured);
      const focusMeta = q(".mobile-focus-meta");
      if (focusMeta) {
        focusMeta.innerHTML = "<span>무료 공개 " + featured.freeEpisodeCount + "화</span><span>반응 " + featured.reactionScore.toFixed(1) + "</span><span>" + esc(featured.tags[0] || (featured.isTranslation ? t("store.translated_work") : t("store.korean_work"))) + "</span>";
      }
      const focusButtons = qa(".mobile-focus-copy .button-row a");
      if (focusButtons[0]) focusButtons[0].href = detailHref(featured.slug);
      if (focusButtons[1]) focusButtons[1].href = searchHref(featured.tags[0] || "");
      const offerList = q(".mobile-offer-list");
      if (offerList && offers.length) {
        offerList.innerHTML = offers.map(function (item) {
          const percent = item.discountPercent || salePercent(item.novel);
          const price = item.salePrice || item.novel.bundleSalePrice || item.novel.bundleListPrice || 0;
          return "<article class='mobile-offer-row'><div class='detail-line'><span class='sale-badge'>" + esc(item.event.title) + " " + percent + "%</span><span class='muted-badge'>" + esc(item.novel.tags[0] || "추천작") + "</span></div><h3 class='mobile-offer-title'>" + esc(item.novel.title) + "</h3><p class='mobile-offer-copy'>" + esc(item.event.subtitle || summary(item.novel)) + "</p><div class='price-line'><span class='price'>" + money(price) + "</span>" + (item.novel.bundleListPrice ? "<span class='price old'>" + money(item.novel.bundleListPrice) + "</span>" : "") + "</div></article>";
        }).join("");
      }
    }
  }

  function renderSearch(data) {
    const novels = data.novels.slice().sort(function (a, b) { return b.reactionScore - a.reactionScore || b.viewCount - a.viewCount; });
    const focus = data.novelsBySlug.get(query.get("slug") || "ruined-duke-heir") || novels[0];
    if (!focus) return;
    if (isPc) {
      const stats = qa(".workspace-stat strong");
      if (stats[0]) stats[0].textContent = count(data.novels.length) + "작";
      if (stats[1]) stats[1].textContent = count(data.eventItems.length) + "개";
      const summaryNode = q(".summary-count");
      if (summaryNode) summaryNode.innerHTML = "현재 <strong style='color: var(--accent);'>" + count(data.novels.length) + "개</strong> 작품 중 지금 읽기 좋은 후보를 좁히는 중입니다.";
      const focusNode = q(".browse-focus");
      if (focusNode) {
        focusNode.href = detailHref(focus.slug);
        bg(focusNode, "--browse-image", banner(focus));
      }
      const focusTitle = q(".browse-focus-title");
      if (focusTitle) focusTitle.textContent = focus.title;
      const focusText = q(".browse-focus-text");
      if (focusText) focusText.textContent = summary(focus);
      const results = q(".browse-results");
      if (results) {
        results.innerHTML = novels.map(function (novel) {
          return "<article class='browse-result' data-search-card data-title='" + esc(novel.title) + "' data-author='" + esc(novel.authorName) + "' data-tags='" + esc(novel.tags.join(" ")) + "'><a class='browse-result-media' href='" + detailHref(novel.slug) + "'><img src='" + cover(novel) + "' alt='" + esc(novel.title) + " 표지'></a><div class='browse-result-main'><div class='detail-line'><span class='free-badge'>" + (novel.freeEpisodeCount > 0 ? "첫 " + novel.freeEpisodeCount + "화 무료" : novel.status === "completed" ? "완결" : "연재중") + "</span>" + (salePercent(novel) ? "<span class='sale-badge'>완결 번들 " + salePercent(novel) + "%</span>" : "") + "<span class='muted-badge'>" + (novel.isTranslation ? t("store.translated_work") : t("store.korean_work")) + "</span></div><h2>" + esc(novel.title) + "</h2><p>" + esc(summary(novel)) + "</p><div class='detail-line'>" + (novel.tags || []).slice(0, 3).map(function (tag, index) { return "<span class='chip" + (index < 2 ? " active" : "") + "'>" + esc(tag) + "</span>"; }).join("") + "</div></div><div class='browse-result-side'><span class='meta-text'>반응 " + novel.reactionScore.toFixed(1) + "</span><a class='button small primary' href='" + detailHref(novel.slug) + "'>상세 보기</a></div></article>";
        }).join("");
      }
    } else {
      const focusMedia = q(".mobile-focus-media");
      if (focusMedia) {
        focusMedia.href = detailHref(focus.slug);
        bg(focusMedia, "--focus-image", banner(focus));
      }
      const focusTitle = q(".mobile-focus-title");
      if (focusTitle) focusTitle.textContent = focus.title;
      const focusText = q(".mobile-focus-copy .book-desc");
      if (focusText) focusText.textContent = summary(focus);
      const focusButton = q(".mobile-focus-copy .button.ghost");
      if (focusButton) focusButton.href = searchHref(focus.tags[0] || "");
      const results = q(".mobile-result-list");
      if (results) {
        results.innerHTML = novels.map(function (novel) {
          return "<article class='mobile-row' data-search-card data-title='" + esc(novel.title) + "' data-author='" + esc(novel.authorName) + "' data-tags='" + esc(novel.tags.join(" ")) + "'><a class='mobile-row-media' href='" + detailHref(novel.slug) + "'><img src='" + cover(novel) + "' alt='" + esc(novel.title) + " 표지'></a><div class='mobile-row-body'><div class='detail-line'><span class='free-badge'>" + (novel.freeEpisodeCount > 0 ? "첫 " + novel.freeEpisodeCount + "화 무료" : novel.status === "completed" ? "완결" : "연재중") + "</span>" + (salePercent(novel) ? "<span class='sale-badge'>완결 번들 " + salePercent(novel) + "%</span>" : "") + "<span class='muted-badge'>" + (novel.isTranslation ? t("store.translated_work") : t("store.korean_work")) + "</span></div><h3 class='mobile-row-title'>" + esc(novel.title) + "</h3><p class='mobile-row-copy'>" + esc(summary(novel)) + "</p><div class='mobile-row-meta'><span>" + esc(novel.tags[0] || novel.authorName) + "</span><span>" + (novel.status === "completed" ? "완결 " + novel.totalEpisodeCount + "화" : "연재 " + novel.totalEpisodeCount + "화") + "</span><span>반응 " + novel.reactionScore.toFixed(1) + "</span></div></div></article>";
        }).join("");
      }
    }

    const tag = query.get("tag");
    if (tag) {
      qa("[data-filter-chip]").forEach(function (chip) {
        if ((chip.dataset.label || "").toLowerCase() === tag.toLowerCase()) {
          chip.dataset.state = "include";
          chip.classList.add("is-active");
          chip.textContent = chip.dataset.label + t("store.filter_chip_include");
        }
      });
    }
    liveSearch();
  }

  function renderDetail(data, novel, list) {
    const free = list.filter(function (episode) { return episode.accessType === "free"; });
    const paid = list.filter(function (episode) { return episode.accessType === "paid"; });
    const firstFree = free[0] || list[0];
    const firstPaid = paid[0] || null;
    const last = list[list.length - 1] || null;
    const topBookmark = q(".topbar [data-bookmark-id]");
    if (topBookmark) topBookmark.dataset.bookmarkId = novel.slug;
    document.title = (isPc ? "잉크로드 PC | " : "잉크로드 | ") + novel.title;

    if (isPc) {
      const coverImage = q(".detail-cover-art img");
      if (coverImage) { coverImage.src = cover(novel); coverImage.alt = novel.title + " 표지"; }
      if (q(".detail-title-display")) q(".detail-title-display").textContent = novel.title;
      if (q(".lede")) q(".lede").textContent = summary(novel);
      if (q(".meta-line")) q(".meta-line").innerHTML = "<span class='meta-text'>작가 " + esc(novel.authorName) + "</span><span class='meta-text'>조회 " + count(novel.viewCount) + "</span><span class='meta-text'>댓글 " + count(novel.commentCount) + "개</span>";
      const introButtons = qa(".detail-intro .button-row a");
      if (introButtons[0]) introButtons[0].href = viewerHref(novel.slug, firstFree ? firstFree.episodeNumber : 1);
      const facts = qa(".detail-facts .fact-value");
      if (facts[0]) facts[0].textContent = "1~" + novel.freeEpisodeCount + "화";
      if (facts[1]) facts[1].textContent = firstPaid ? firstPaid.episodeNumber + "화부터" : "무료 전체 공개";
      if (facts[2]) facts[2].textContent = salePercent(novel) ? salePercent(novel) + "% 할인" : "소장 가능";
      const chapterList = q(".chapter-list-refined");
      if (chapterList) {
        chapterList.innerHTML = list.slice(0, 3).map(function (episode) { return "<a class='chapter-row' href='" + viewerHref(novel.slug, episode.episodeNumber) + "'><span class='chapter-number'>" + String(episode.episodeNumber).padStart(2, "0") + "</span><span class='chapter-title'>" + esc(episode.title) + "</span><span class='chapter-state'><span class='free-badge'>무료</span></span></a>"; }).join("") + (firstPaid ? "<div class='chapter-row'><span class='chapter-number'>" + String(firstPaid.episodeNumber).padStart(2, "0") + "</span><span class='chapter-title'>" + esc(firstPaid.title) + "</span><span class='chapter-state'><span class='material-symbols-outlined'>lock</span> 회차 구매</span></div>" : "") + (last ? "<div class='chapter-row'><span class='chapter-number'>" + String(last.episodeNumber).padStart(2, "0") + "</span><span class='chapter-title'>" + esc(last.title) + "</span><span class='chapter-state'><span class='sale-badge'>번들 포함</span></span></div>" : "");
      }
      const priceLine = q(".buy-rail .price-line");
      if (priceLine) priceLine.innerHTML = "<span class='price'>" + money(novel.bundleSalePrice || novel.bundleListPrice || 0) + "</span>" + (novel.bundleListPrice ? "<span class='price old'>" + money(novel.bundleListPrice) + "</span>" : "");
      if (q(".nav-cta")) q(".nav-cta").href = viewerHref(novel.slug, firstFree ? firstFree.episodeNumber : 1);
    } else {
      const hero = q(".mobile-detail-hero");
      if (hero) bg(hero, "--mobile-detail-image", banner(novel));
      if (q(".mobile-detail-title-display")) q(".mobile-detail-title-display").textContent = novel.title;
      if (q(".mobile-detail-text")) q(".mobile-detail-text").textContent = "1~" + novel.freeEpisodeCount + "화 무료 공개 후 " + (novel.freeEpisodeCount + 1) + "화부터 회차 구매, 완결 번들 소장으로 이어지는 작품입니다.";
      if (q(".mobile-detail-copy .button.primary")) q(".mobile-detail-copy .button.primary").href = viewerHref(novel.slug, firstFree ? firstFree.episodeNumber : 1);
      const facts = qa(".mobile-fact-value");
      if (facts[0]) facts[0].textContent = "1~" + novel.freeEpisodeCount + "화";
      if (facts[1]) facts[1].textContent = firstPaid ? firstPaid.episodeNumber + "화부터" : "무료 전체 공개";
      if (facts[2]) facts[2].textContent = salePercent(novel) ? salePercent(novel) + "% 할인" : "소장 가능";
      if (facts[3]) facts[3].textContent = novel.reactionScore.toFixed(1);
      const intro = qa(".mobile-list .mobile-step-copy");
      if (intro[0]) intro[0].textContent = summary(novel);
      if (intro[1]) intro[1].textContent = "초반 " + novel.freeEpisodeCount + "화는 무료, 이후는 회차 구매, 완결 시에는 번들 구매로 이어지는 구조입니다.";
      const chapterList = q(".mobile-chapter-list");
      if (chapterList) {
        chapterList.innerHTML = list.slice(0, 3).map(function (episode) { return "<a class='mobile-chapter-row' href='" + viewerHref(novel.slug, episode.episodeNumber) + "'><span class='chapter-number'>" + String(episode.episodeNumber).padStart(2, "0") + "</span><div class='mobile-chapter-copy'><span class='chapter-title'>" + esc(episode.title) + "</span><span class='free-badge'>무료</span></div></a>"; }).join("") + (firstPaid ? "<div class='mobile-chapter-row'><span class='chapter-number'>" + String(firstPaid.episodeNumber).padStart(2, "0") + "</span><div class='mobile-chapter-copy'><span class='chapter-title'>" + esc(firstPaid.title) + "</span><span class='muted-badge'>회차 구매</span></div></div>" : "") + (last ? "<div class='mobile-chapter-row'><span class='chapter-number'>" + String(last.episodeNumber).padStart(2, "0") + "</span><div class='mobile-chapter-copy'><span class='chapter-title'>" + esc(last.title) + "</span><span class='sale-badge'>번들 포함</span></div></div>" : "");
      }
      const offerTitle = q(".mobile-offer-row .mobile-offer-title");
      if (offerTitle) offerTitle.textContent = money(novel.bundleSalePrice || novel.bundleListPrice || 0);
      if (q(".nav-cta")) q(".nav-cta").href = viewerHref(novel.slug, firstFree ? firstFree.episodeNumber : 1);
    }
  }

  function renderViewer(novel, list, selected, body) {
    if (!selected) return;
    document.title = (isPc ? "잉크로드 PC | " : "잉크로드 | ") + novel.title + " " + selected.episodeNumber + "화";
    const progress = Math.max(0, Math.min(100, Math.round((selected.episodeNumber / Math.max(novel.totalEpisodeCount || 1, 1)) * 100)));
    if (q(".reader-progress-fill")) q(".reader-progress-fill").style.width = progress + "%";

    try {
      let history = JSON.parse(localStorage.getItem(store.history) || "[]");
      if (!Array.isArray(history)) history = [];
      history = history.filter(function (entry) { return entry.slug !== novel.slug; });
      history.unshift({ slug: novel.slug, title: novel.title, episodeNumber: selected.episodeNumber, updatedAt: new Date().toISOString() });
      localStorage.setItem(store.history, JSON.stringify(history.slice(0, 8)));
    } catch (error) {}

    const articleHtml = body ? parseBlocks(body) : "<p>이 회차는 구매 후 열람할 수 있습니다.</p><p>" + esc(selected.teaser || "") + "</p><p><a href='" + detailHref(novel.slug) + "'>작품 상세로 돌아가 구매 정보를 확인하세요.</a></p>";

    if (isPc) {
      if (q(".topbar .brand-name")) q(".topbar .brand-name").textContent = novel.title;
      if (q(".topbar .brand-sub")) q(".topbar .brand-sub").textContent = selected.episodeNumber + "화 · 데스크톱 리더";
      if (q(".pc-reader-header h1")) q(".pc-reader-header h1").textContent = selected.title;
      if (q(".reader-stage .reader-content")) q(".reader-stage .reader-content").innerHTML = articleHtml;
      qa(".reader-link-list .reader-link").forEach(function (link, index) {
        const episode = list[index];
        if (!episode) return;
        link.href = viewerHref(novel.slug, episode.episodeNumber);
        link.classList.toggle("current", episode.episodeNumber === selected.episodeNumber);
        const titleNode = q("strong", link);
        if (titleNode) titleNode.textContent = String(episode.episodeNumber).padStart(2, "0") + ". " + episode.title;
      });
    } else {
      if (q(".topbar .brand-name")) q(".topbar .brand-name").textContent = novel.title;
      if (q(".topbar .brand-sub")) q(".topbar .brand-sub").textContent = selected.episodeNumber + "화 · 읽기 모드";
      if (q(".mobile-reader-top h1")) q(".mobile-reader-top h1").textContent = selected.episodeNumber + "화. " + selected.title;
      if (q(".mobile-reader-top .muted")) q(".mobile-reader-top .muted").textContent = (selected.accessType === "free" ? "무료 공개 구간" : "구매 필요 구간") + " · " + selected.episodeNumber + " / " + novel.totalEpisodeCount;
      if (q(".reader-header h2")) q(".reader-header h2").textContent = selected.title;
      if (q(".reader-content")) q(".reader-content").innerHTML = articleHtml;
    }
  }

  async function hydrate() {
    if (page.indexOf("my_library") === 0) return;
    const data = await catalog();
    if (!data.novels.length) return;

    if (page.indexOf("homepage") === 0) {
      renderHome(data);
      syncBookmarks();
      return;
    }
    if (page.indexOf("search") === 0) {
      renderSearch(data);
      syncBookmarks();
      return;
    }

    const slug = query.get("slug") || "abyss-librarian-forbidden-archive";
    const novel = data.novelsBySlug.get(slug) || data.novels[0];
    if (!novel) return;
    const list = await episodes(novel.id);

    if (page.indexOf("novel_detail") === 0) {
      renderDetail(data, novel, list);
      syncBookmarks();
      return;
    }

    if (page.indexOf("novel_viewer") === 0) {
      const episodeNumber = Number(query.get("episode") || 1);
      const selected = list.find(function (episode) { return episode.episodeNumber === episodeNumber; }) || list[0];
      const body = selected ? await episodeBody(selected.id).catch(function () { return ""; }) : "";
      renderViewer(novel, list, selected, body);
      syncBookmarks();
    }
  }

  hydrate().catch(function (error) {
    console.error("[InkRoad] Supabase hydration failed:", error);
  });
})();
