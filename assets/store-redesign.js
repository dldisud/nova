(function () {
  const page = window.location.pathname.split("/").pop() || "homepage_pc.html";
  const supported = ["homepage_pc.html", "search_pc.html", "novel_detail_pc.html", "novel_viewer_pc.html", "my_library_pc.html", "auth_pc.html", "creator_dashboard_pc.html", "author_dashboard_pc.html"];
  if (supported.indexOf(page) === -1) return;

  const cfg = window.inkroadSupabaseConfig || {};
  const base = (cfg.url || "").replace(/\/$/, "");
  const key = cfg.publishableKey || cfg.anonKey || "";
  if (!base || !key) return;

  const query = new URLSearchParams(window.location.search);
  const store = {
    bookmarks: "inkroad-bookmarks",
    accessToken: "inkroad-supabase-access-token"
  };
  const EPISODE_PRICE = 300;
  let cachedCatalog = null;

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

  function unwrapRelation(value) {
    if (Array.isArray(value)) return value[0] || null;
    return value || null;
  }

  function formatCount(value) {
    return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
  }

  function formatWon(value) {
    return new Intl.NumberFormat("ko-KR").format(Number(value || 0)) + "원";
  }

  function placeholder(title) {
    return "https://placehold.co/320x440/ddd/222?text=" + encodeURIComponent(title || "InkRoad");
  }

  function cover(novel) {
    return novel.coverUrl || placeholder(novel.title);
  }

  function banner(novel) {
    return novel.bannerUrl || novel.coverUrl || placeholder(novel.title);
  }

  function summary(novel) {
    return novel.shortDescription || novel.description || "작품 소개가 아직 준비되지 않았습니다.";
  }

  function salePercent(novel) {
    if (!novel.bundleListPrice || !novel.bundleSalePrice || novel.bundleSalePrice >= novel.bundleListPrice) return 0;
    return Math.round(((novel.bundleListPrice - novel.bundleSalePrice) / novel.bundleListPrice) * 100);
  }

  function discountedEpisodePrice(novel, percentOverride) {
    const percent = Number(percentOverride || salePercent(novel) || 0);
    if (!percent) return EPISODE_PRICE;
    return Math.max(100, Math.round((EPISODE_PRICE * (100 - percent)) / 100));
  }

  function hasSale(novel, percentOverride) {
    return discountedEpisodePrice(novel, percentOverride) < EPISODE_PRICE;
  }

  function priceMarkup(novel, percentOverride) {
    const sale = discountedEpisodePrice(novel, percentOverride);
    if (sale < EPISODE_PRICE) {
      return "<span class='price-old'>편당 " + formatWon(EPISODE_PRICE) + "</span><span class='price-sale'>편당 " + formatWon(sale) + "</span>";
    }
    return "<span class='price-current'>편당 " + formatWon(EPISODE_PRICE) + "</span>";
  }

  function originLabel(code, isTranslation) {
    const map = {
      KR: "한국",
      JP: "일본",
      CN: "중국",
      US: "영미",
      GB: "영미"
    };
    if (map[String(code || "").toUpperCase()]) return map[String(code || "").toUpperCase()];
    return isTranslation ? "번역작" : "한국";
  }

  function translationDirection(novel) {
    const origin = originLabel(novel.originCountry, novel.isTranslation);
    return novel.isTranslation ? origin + " → 한국" : "한국 → 영어";
  }

  function countdownLabel(value) {
    if (!value) return "진행 중";
    const diff = new Date(value).getTime() - Date.now();
    if (!Number.isFinite(diff) || diff <= 0) return "마감 임박";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    if (days > 0) return days + "일 " + hours + "시간 남음";
    return hours + "시간 " + mins + "분 남음";
  }

  function detailHref(slug) {
    return "novel_detail_pc.html?slug=" + encodeURIComponent(slug);
  }

  function viewerHref(slug, episodeNumber) {
    return "novel_viewer_pc.html?slug=" + encodeURIComponent(slug) + "&episode=" + encodeURIComponent(episodeNumber || 1);
  }

  function accessToken() {
    return cfg.accessToken || localStorage.getItem(store.accessToken) || "";
  }

  async function rest(resource, params) {
    const url = new URL(base + "/rest/v1/" + resource);
    Object.keys(params || {}).forEach(function (keyName) {
      const value = params[keyName];
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(keyName, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        apikey: key,
        Authorization: "Bearer " + (accessToken() || key),
        Accept: "application/json"
      }
    });

    if (!response.ok) throw new Error("Supabase request failed: " + response.status);
    return response.json();
  }

  function inFilter(values) {
    return "in.(" + values.map(function (value) { return '\"' + String(value) + '\"'; }).join(",") + ")";
  }

  async function catalog() {
    if (cachedCatalog) return cachedCatalog;

    const novels = await rest("novels", {
      select: "id,slug,title,subtitle,short_description,description,cover_url,banner_url,status,is_translation,origin_country,free_episode_count,total_episode_count,reaction_score,view_count,comment_count,bundle_list_price,bundle_sale_price,updated_at,authors(pen_name)",
      status: "not.eq.draft",
      order: "reaction_score.desc,view_count.desc"
    });

    const novelIds = novels.map(function (novel) { return novel.id; });
    const tags = novelIds.length ? await rest("novel_tags", {
      select: "novel_id,tags(name)",
      novel_id: inFilter(novelIds)
    }) : [];

    const events = await rest("events", {
      select: "id,title,subtitle,status,starts_at,ends_at",
      status: "eq.active",
      order: "starts_at.desc"
    });

    const eventItems = events.length ? await rest("event_items", {
      select: "event_id,novel_id,discount_percent,sale_price,sort_order",
      event_id: inFilter(events.map(function (event) { return event.id; })),
      order: "sort_order.asc"
    }) : [];

    const tagMap = new Map();
    tags.forEach(function (row) {
      const current = tagMap.get(row.novel_id) || [];
      const tag = unwrapRelation(row.tags);
      if (tag && tag.name) current.push(tag.name);
      tagMap.set(row.novel_id, current);
    });

    const novelsBySlug = new Map();
    const novelMap = new Map();
    const mappedNovels = novels.map(function (novel) {
      const author = unwrapRelation(novel.authors);
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
        originCountry: novel.origin_country || "KR",
        freeEpisodeCount: Number(novel.free_episode_count || 0),
        totalEpisodeCount: Number(novel.total_episode_count || 0),
        reactionScore: Number(novel.reaction_score || 0),
        viewCount: Number(novel.view_count || 0),
        commentCount: Number(novel.comment_count || 0),
        bundleListPrice: novel.bundle_list_price !== null ? Number(novel.bundle_list_price) : null,
        bundleSalePrice: novel.bundle_sale_price !== null ? Number(novel.bundle_sale_price) : null,
        updatedAt: novel.updated_at || "",
        authorName: author && author.pen_name ? author.pen_name : "작가 미상",
        tags: tagMap.get(novel.id) || []
      };
      novelMap.set(mapped.id, mapped);
      novelsBySlug.set(mapped.slug, mapped);
      return mapped;
    });

    const eventMap = new Map(events.map(function (event) {
      return [event.id, {
        id: event.id,
        title: event.title,
        subtitle: event.subtitle || "",
        endsAt: event.ends_at || null
      }];
    }));

    const mappedItems = eventItems.map(function (item) {
      return {
        event: eventMap.get(item.event_id),
        novel: novelMap.get(item.novel_id),
        discountPercent: Number(item.discount_percent || 0),
        salePrice: item.sale_price !== null ? Number(item.sale_price) : null,
        sortOrder: Number(item.sort_order || 0)
      };
    }).filter(function (item) {
      return item.event && item.novel;
    });

    cachedCatalog = {
      novels: mappedNovels,
      novelsBySlug: novelsBySlug,
      eventItems: mappedItems
    };
    return cachedCatalog;
  }

  async function episodes(novelId) {
    const rows = await rest("episodes", {
      select: "id,episode_number,title,teaser,access_type,price,published_at,status",
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
        price: row.price !== null ? Number(row.price) : EPISODE_PRICE,
        publishedAt: row.published_at || null
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

  function refreshBookmarkButtons() {
    let bookmarks = [];
    try {
      bookmarks = JSON.parse(localStorage.getItem(store.bookmarks) || "[]");
    } catch (_error) {
      bookmarks = [];
    }
    const saved = new Set(bookmarks);
    qa("[data-bookmark-id]").forEach(function (button) {
      const active = saved.has(button.dataset.bookmarkId);
      button.setAttribute("aria-pressed", String(active));
      const label = q("[data-bookmark-label]", button);
      if (label) label.textContent = active ? "찜됨" : (label.dataset.defaultLabel || label.textContent || "찜하기");
    });
  }

  function buildNovelCard(novel, mode, percentOverride) {
    const sale = Number(percentOverride || salePercent(novel) || 0);
    const primaryBadge = mode === "free"
      ? "<span class='free-badge'>" + formatCount(novel.freeEpisodeCount) + "화 무료</span>"
      : sale
        ? "<span class='sale-badge'>-" + sale + "%</span>"
        : "<span class='muted-badge'>편당 고정가</span>";
    const secondaryBadge = novel.isTranslation
      ? "<span class='muted-badge'>" + esc(originLabel(novel.originCountry, true)) + "</span>"
      : "<span class='muted-badge'>한국</span>";
    const meta = (novel.tags[0] || originLabel(novel.originCountry, novel.isTranslation)) + " · " + (novel.tags[1] || (novel.status === "completed" ? "완결" : "연재중"));
    const bottom = mode === "free"
      ? "<span class='price-current'>평점 " + novel.reactionScore.toFixed(1) + "</span>"
      : priceMarkup(novel, sale);
    return "<article class='novel-card'>" +
      "<a class='novel-card-media' href='" + detailHref(novel.slug) + "'>" +
      "<img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + " 표지'>" +
      "<div class='novel-card-badges'>" + primaryBadge + secondaryBadge + "</div>" +
      "</a>" +
      "<div class='novel-card-copy'>" +
      "<h3 class='novel-card-title'>" + esc(novel.title) + "</h3>" +
      "<p class='novel-card-meta'>" + esc(meta) + "</p>" +
      "<div class='novel-card-price'>" + bottom + "</div>" +
      "</div>" +
      "</article>";
  }

  function renderHome(data) {
    const featured = data.novelsBySlug.get(query.get("slug") || "black-mage-oath") || data.novels[0];
    if (!featured) return;

    const heroBand = q(".hero-band");
    if (heroBand) {
      const heroImage = banner(featured).replace(/'/g, "%27");
      heroBand.style.backgroundImage = "linear-gradient(90deg, rgba(26, 26, 26, 0.96) 0%, rgba(26, 26, 26, 0.82) 52%, rgba(26, 26, 26, 0.96) 100%), url('" + heroImage + "')";
    }

    const eventLead = data.eventItems[0] || null;
    const saleItems = data.eventItems
      .filter(function (item, index, list) {
        return item.novel && list.findIndex(function (entry) { return entry.novel.id === item.novel.id; }) === index;
      })
      .slice(0, 4);
    const freeNovels = data.novels.filter(function (novel) { return novel.freeEpisodeCount > 0; }).slice(0, 4);
    const genreDefs = [
      { label: "판타지", match: function (novel) { return novel.tags.join(" ").indexOf("판타지") !== -1 || novel.tags.join(" ").indexOf("아카데미") !== -1; } },
      { label: "로맨스", match: function (novel) { return novel.tags.join(" ").indexOf("로맨스") !== -1; } },
      { label: "회귀", match: function (novel) { return novel.tags.join(" ").indexOf("회귀") !== -1; } },
      { label: "아카데미", match: function (novel) { return novel.tags.join(" ").indexOf("아카데미") !== -1; } },
      { label: "번역작", match: function (novel) { return novel.isTranslation; } },
      { label: "피폐", match: function (novel) { return novel.tags.join(" ").indexOf("피폐") !== -1; } },
      { label: "가문물", match: function (novel) { return novel.tags.join(" ").indexOf("가문") !== -1; } },
      { label: "다크 판타지", match: function (novel) { return novel.tags.join(" ").indexOf("다크") !== -1 || novel.tags.join(" ").indexOf("피폐") !== -1; } }
    ];

    const heroSale = salePercent(featured);
    const heroBadges = {
      sale: q(".hero-sale-badge"),
      direction: q(".hero-direction-badge"),
      genre: q(".hero-genre-badge")
    };
    if (heroBadges.sale) heroBadges.sale.textContent = heroSale ? "-" + heroSale + "% 세일" : "신규 추천";
    if (heroBadges.direction) heroBadges.direction.textContent = translationDirection(featured);
    if (heroBadges.genre) heroBadges.genre.textContent = featured.tags[0] || (featured.isTranslation ? "번역작" : "한국작");
    if (q(".hero-title-main")) q(".hero-title-main").textContent = featured.title;
    if (q(".hero-title-sub")) q(".hero-title-sub").textContent = featured.subtitle || "번역명 없이도 표지가 먼저 읽히는 작품";
    if (q(".hero-description")) q(".hero-description").textContent = summary(featured);
    if (q(".hero-cover")) {
      q(".hero-cover").src = cover(featured);
      q(".hero-cover").alt = featured.title + " 표지";
    }
    if (q(".hero-meta")) {
      q(".hero-meta").innerHTML = "<span>총 " + formatCount(featured.totalEpisodeCount) + "화</span><span>평점 " + featured.reactionScore.toFixed(1) + "</span><span>" + (featured.freeEpisodeCount ? formatCount(featured.freeEpisodeCount) + "화 무료" : "무료 구간 없음") + "</span>" + (heroSale ? "<span>편당 " + formatWon(discountedEpisodePrice(featured)) + "</span>" : "<span>편당 " + formatWon(EPISODE_PRICE) + "</span>");
    }
    const heroRead = q("[data-hero-read]");
    if (heroRead) heroRead.href = viewerHref(featured.slug, 1);
    const heroWish = q("[data-hero-bookmark]");
    if (heroWish) heroWish.dataset.bookmarkId = featured.slug;

    const bannerNode = q("[data-home-sale-banner]");
    if (bannerNode) {
      if (eventLead) {
        bannerNode.innerHTML = "<div class='sale-banner-copy'><span class='sale-badge'>진행 중인 세일</span><h2 class='sale-banner-title'>" + esc(eventLead.event.title) + "</h2><div class='sale-banner-meta'><span>참여 작품 " + formatCount(saleItems.length) + "개</span><span>최대 " + formatCount(eventLead.discountPercent || salePercent(eventLead.novel)) + "% 할인</span><span>" + esc(countdownLabel(eventLead.event.endsAt)) + "</span></div></div><a class='button secondary' href='search_pc.html'>전체 보기</a>";
      } else {
        bannerNode.innerHTML = "<div class='sale-banner-copy'><span class='muted-badge'>이벤트 준비 중</span><h2 class='sale-banner-title'>다음 세일이 곧 열립니다</h2><div class='sale-banner-meta'><span>편당 고정 단가 300원</span><span>무료 구간 작품은 계속 열람 가능</span></div></div><a class='button secondary' href='search_pc.html'>스토어 보기</a>";
      }
    }

    const saleGrid = q(".sale-grid");
    if (saleGrid) {
      saleGrid.innerHTML = saleItems.length
        ? saleItems.map(function (item) { return buildNovelCard(item.novel, "sale", item.discountPercent); }).join("")
        : data.novels.slice(0, 4).map(function (novel) { return buildNovelCard(novel, "sale"); }).join("");
    }

    const freeGrid = q(".free-grid");
    if (freeGrid) {
      freeGrid.innerHTML = freeNovels.map(function (novel) { return buildNovelCard(novel, "free"); }).join("");
    }

    const genreGrid = q(".genre-grid");
    if (genreGrid) {
      genreGrid.innerHTML = genreDefs.slice(0, 8).map(function (genre) {
        const count = data.novels.filter(genre.match).length;
        return "<a class='genre-card' href='search_pc.html?tag=" + encodeURIComponent(genre.label) + "'><strong>" + esc(genre.label) + "</strong><span>" + formatCount(count) + "개 작품</span></a>";
      }).join("");
    }

    refreshBookmarkButtons();
  }

  function renderFilterSummary() {
    const box = q("[data-active-filters]");
    if (!box) return;
    const active = qa("[data-filter-chip]").filter(function (chip) {
      return chip.dataset.state && chip.dataset.state !== "off";
    });
    if (!active.length) {
      box.innerHTML = "<span class='muted-badge'>필터를 눌러 결과를 좁혀보세요</span>";
      return;
    }
    box.innerHTML = active.map(function (chip) {
      const state = chip.dataset.state === "exclude" ? "제외" : "포함";
      const tone = chip.dataset.state === "exclude" ? "muted-badge" : "chip active";
      const label = (chip.dataset.label || chip.textContent || "").replace(/\s*·\s*(포함|제외)\s*$/, "").trim();
      return "<span class='" + tone + "'>" + state + ": " + esc(label) + "</span>";
    }).join("");
  }

  function renderSearch(data) {
    const results = q("[data-browse-results]");
    if (!results) return;

    const summaryNode = q("[data-browse-count]");
    const input = q("[data-search-input]");
    const sortButtons = qa("[data-sort]");
    const chips = qa("[data-filter-chip]");

    if (input && query.get("q")) input.value = query.get("q");
    if (query.get("tag")) {
      chips.forEach(function (chip) {
        if ((chip.dataset.label || "").toLowerCase() === query.get("tag").toLowerCase()) {
          chip.dataset.state = "include";
          chip.classList.add("is-active");
          chip.classList.remove("is-excluded");
          chip.textContent = chip.dataset.label + " · 포함";
        }
      });
    }

    function searchableText(novel) {
      return [
        novel.title,
        novel.subtitle,
        novel.authorName,
        summary(novel),
        novel.tags.join(" "),
        originLabel(novel.originCountry, novel.isTranslation),
        translationDirection(novel),
        novel.status === "completed" ? "완결" : "연재중",
        novel.freeEpisodeCount > 0 ? "무료" : "유료",
        salePercent(novel) ? "세일 할인" : "정가"
      ].join(" ").toLowerCase();
    }

    function sortNovels(novels) {
      var activeBtn = sortButtons.find(function (b) { return b.classList.contains("active"); });
      var mode = activeBtn ? activeBtn.dataset.sort : "popular";
      return novels.slice().sort(function (left, right) {
        if (mode === "recent") {
          return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime() || right.viewCount - left.viewCount;
        }
        if (mode === "rating") {
          return right.reactionScore - left.reactionScore || right.commentCount - left.commentCount;
        }
        if (mode === "discount") {
          return salePercent(right) - salePercent(left) || right.reactionScore - left.reactionScore;
        }
        return right.viewCount - left.viewCount || right.reactionScore - left.reactionScore;
      });
    }

    function cardMarkup(novel) {
      var sale = salePercent(novel);
      var badges = [];
      if (novel.freeEpisodeCount > 0) badges.push("<span class='free-badge'>" + formatCount(novel.freeEpisodeCount) + "화 무료</span>");
      if (sale) badges.push("<span class='sale-badge'>-" + sale + "%</span>");
      badges.push("<span class='muted-badge'>" + esc(originLabel(novel.originCountry, novel.isTranslation)) + "</span>");
      if (novel.status === "completed") badges.push("<span class='muted-badge'>완결</span>");
      return "<article class='novel-row' data-search-card data-title='" + esc(novel.title) + "' data-author='" + esc(novel.authorName) + "' data-tags='" + esc(novel.tags.join(" ")) + "'>" +
        "<a class='novel-row-thumb' href='" + detailHref(novel.slug) + "'><img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + " 표지'></a>" +
        "<div class='novel-row-copy'>" +
        "<h2 class='novel-row-title'>" + esc(novel.title) + "</h2>" +
        "<p class='novel-row-meta'>" + esc(novel.authorName) + " · " + esc(novel.tags.slice(0, 2).join(", ")) + "</p>" +
        "<p class='novel-row-desc'>" + esc(summary(novel)) + "</p>" +
        "<div class='novel-row-tags'>" + badges.join("") + "</div>" +
        "</div>" +
        "<div class='novel-row-side'>" +
        "<div>" + priceMarkup(novel) + "</div>" +
        "<a class='button small primary' href='" + detailHref(novel.slug) + "'>상세 보기</a>" +
        "</div>" +
        "</article>";
    }

    function applySearch() {
      const keyword = input ? input.value.trim().toLowerCase() : "";
      const include = chips.filter(function (chip) { return chip.dataset.state === "include"; }).map(function (chip) { return (chip.dataset.label || "").toLowerCase(); });
      const exclude = chips.filter(function (chip) { return chip.dataset.state === "exclude"; }).map(function (chip) { return (chip.dataset.label || "").toLowerCase(); });
      const visible = sortNovels(data.novels.filter(function (novel) {
        const text = searchableText(novel);
        return (!keyword || text.indexOf(keyword) !== -1) && include.every(function (label) { return text.indexOf(label) !== -1; }) && exclude.every(function (label) { return text.indexOf(label) === -1; });
      }));

      if (summaryNode) summaryNode.textContent = formatCount(visible.length) + "개 작품";
      results.innerHTML = visible.length
        ? visible.map(cardMarkup).join("")
        : "<div class='browse-empty'><strong>조건에 맞는 작품이 없습니다</strong><p>검색어를 줄이거나 필터를 하나씩 해제해보세요.</p></div>";
      renderFilterSummary();
    }

    if (input) input.addEventListener("input", applySearch);
    sortButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        sortButtons.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        applySearch();
      });
    });
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        window.setTimeout(applySearch, 0);
      });
    });

    applySearch();
  }

  function similarNovels(data, novel) {
    return data.novels
      .filter(function (item) { return item.slug !== novel.slug; })
      .map(function (item) {
        const overlap = item.tags.filter(function (tag) { return novel.tags.indexOf(tag) !== -1; }).length;
        return { novel: item, score: overlap + (item.isTranslation === novel.isTranslation ? 1 : 0) + (salePercent(item) ? 1 : 0) };
      })
      .sort(function (a, b) { return b.score - a.score || b.novel.reactionScore - a.novel.reactionScore; })
      .slice(0, 4)
      .map(function (entry) { return entry.novel; });
  }

  function renderDetail(data, novel, list) {
    var free = list.filter(function (episode) { return episode.accessType === "free"; });
    var paid = list.filter(function (episode) { return episode.accessType === "paid"; });
    var readButton = q("[data-detail-read]");
    var bookmarkButtons = qa("[data-bookmark-id]");
    var similar = similarNovels(data, novel);
    var sale = salePercent(novel);
    var saleEvent = data.eventItems.find(function (item) { return item.novel.id === novel.id; });

    document.title = "INKROAD | " + novel.title;

    var coverImg = q(".detail-cover img");
    if (coverImg) {
      coverImg.src = cover(novel);
      coverImg.alt = novel.title + " 표지";
    }

    var badgesNode = q("[data-detail-badges]");
    if (badgesNode) {
      var badges = [];
      if (sale) badges.push("<span class='sale-badge'>-" + sale + "% 세일</span>");
      if (novel.isTranslation) badges.push("<span class='muted-badge'>" + esc(translationDirection(novel)) + "</span>");
      if (novel.freeEpisodeCount > 0) badges.push("<span class='free-badge'>" + formatCount(novel.freeEpisodeCount) + "화 무료</span>");
      if (!sale && !novel.freeEpisodeCount) badges.push("<span class='new-badge'>NEW</span>");
      badgesNode.innerHTML = badges.join("");
    }

    if (q("[data-detail-title]")) q("[data-detail-title]").textContent = novel.title;
    if (q("[data-detail-subtitle]")) q("[data-detail-subtitle]").textContent = (novel.subtitle ? novel.subtitle + " · " : "") + translationDirection(novel);

    var metaNode = q("[data-detail-meta]");
    if (metaNode) {
      metaNode.innerHTML = "<div class='detail-meta-item'><span class='detail-meta-label'>작가</span><span class='detail-meta-value'>" + esc(novel.authorName) + "</span></div><div class='detail-meta-item'><span class='detail-meta-label'>상태</span><span class='detail-meta-value'>" + (novel.status === "completed" ? "완결" : "연재중") + " · " + formatCount(novel.totalEpisodeCount) + "화</span></div><div class='detail-meta-item'><span class='detail-meta-label'>평점</span><span class='detail-meta-value'>★ " + novel.reactionScore.toFixed(1) + "</span></div><div class='detail-meta-item'><span class='detail-meta-label'>출처</span><span class='detail-meta-value'>" + esc(translationDirection(novel)) + "</span></div>";
    }

    var tagsNode = q("[data-detail-tags]");
    if (tagsNode) {
      tagsNode.innerHTML = novel.tags.slice(0, 6).map(function (tag) {
        return "<span class='muted-badge'>" + esc(tag) + "</span>";
      }).join("");
    }

    if (q("[data-detail-synopsis]")) q("[data-detail-synopsis]").textContent = summary(novel);
    if (readButton) readButton.href = viewerHref(novel.slug, 1);
    bookmarkButtons.forEach(function (button) { button.dataset.bookmarkId = novel.slug; });

    var priceBox = q("[data-price-box]");
    if (priceBox) {
      priceBox.innerHTML = "<div><p class='price-box-label'>편당 가격</p><div class='price-box-values'>" + priceMarkup(novel) + "</div><p class='price-box-note'>유료 " + formatCount(paid.length) + "화 · " + esc(sale ? countdownLabel(saleEvent && saleEvent.event ? saleEvent.event.endsAt : null) : "상시 판매") + "</p></div><a class='button sale' href='" + viewerHref(novel.slug, paid[0] ? paid[0].episodeNumber : 1) + "'>구매하기</a>";
    }

    var episodeListNode = q("[data-episode-list]");
    function renderEpisodeList(filter) {
      if (!episodeListNode) return;
      var saleEpisodePrice = discountedEpisodePrice(novel);
      var rows = [];
      if (filter !== "paid" && free.length) {
        rows.push("<div class='episode-row episode-collapsed'><div class='episode-row-left'><span class='episode-num'>무료</span><a class='episode-title' href='" + viewerHref(novel.slug, free[0].episodeNumber) + "'>" + free[0].episodeNumber + "화 ~ " + free[free.length - 1].episodeNumber + "화</a></div><span class='free-badge'>무료</span></div>");
      }
      if (filter !== "free" && paid.length) {
        paid.forEach(function (episode) {
          rows.push("<div class='episode-row'><div class='episode-row-left'><span class='episode-num'>" + String(episode.episodeNumber).padStart(2, "0") + "</span><a class='episode-title' href='" + viewerHref(novel.slug, episode.episodeNumber) + "'>" + esc(episode.title) + "</a></div>" + (saleEpisodePrice < EPISODE_PRICE ? "<span class='price-old'>" + formatWon(EPISODE_PRICE) + "</span><span class='price-sale'>" + formatWon(saleEpisodePrice) + "</span>" : "<span class='price-current'>" + formatWon(EPISODE_PRICE) + "</span>") + "</div>");
        });
      }
      episodeListNode.innerHTML = rows.join("") || "<div class='episode-row'><span class='episode-num'>-</span><span class='episode-title'>표시할 회차가 없습니다</span></div>";
    }

    qa("[data-tab-target]").forEach(function (button) {
      button.addEventListener("click", function () {
        qa("[data-tab-target]").forEach(function (node) { node.dataset.state = ""; });
        button.dataset.state = "include";
        renderEpisodeList(button.dataset.tabTarget || "all");
      });
    });
    renderEpisodeList("all");

    var similarGrid = q("[data-similar-grid]");
    if (similarGrid) {
      similarGrid.innerHTML = similar.map(function (item) { return buildNovelCard(item, salePercent(item) ? "sale" : "free"); }).join("");
    }

    refreshBookmarkButtons();
  }

  function renderViewer(novel, list, selected, body) {
    if (!selected) return;
    var currentIndex = list.findIndex(function (episode) { return episode.id === selected.id; });
    var prev = currentIndex > 0 ? list[currentIndex - 1] : null;
    var next = currentIndex >= 0 && currentIndex < list.length - 1 ? list[currentIndex + 1] : null;
    var sale = salePercent(novel);
    var currentBody = body ? body.split(/\n{2,}/).filter(Boolean).map(function (paragraph) {
      return "<p>" + esc(paragraph).replace(/\n/g, "<br>") + "</p>";
    }).join("") : (selected.accessType === "paid"
      ? "<p>이 회차는 구매 후 열람할 수 있습니다.</p><p>" + esc(selected.teaser || "다음 회차 미리보기만 열려 있습니다.") + "</p>"
      : "<p>본문이 아직 준비되지 않았습니다.</p>");

    document.title = "INKROAD | " + novel.title + " " + selected.episodeNumber + "화";
    var progress = Math.max(0, Math.min(100, Math.round((selected.episodeNumber / Math.max(novel.totalEpisodeCount || 1, 1)) * 100)));
    if (q(".reader-progress-fill")) q(".reader-progress-fill").style.width = progress + "%";
    if (q("[data-reader-back]")) q("[data-reader-back]").href = detailHref(novel.slug);
    if (q("[data-reader-nav-title]")) q("[data-reader-nav-title]").textContent = novel.title;
    if (q("[data-reader-nav-episode]")) q("[data-reader-nav-episode]").textContent = selected.episodeNumber + "화";
    if (q("[data-chapter-volume]")) q("[data-chapter-volume]").textContent = translationDirection(novel);
    if (q("[data-chapter-title]")) q("[data-chapter-title]").textContent = selected.title;
    if (q("[data-chapter-access]")) q("[data-chapter-access]").textContent = selected.accessType === "free" ? "무료 공개 회차" : "유료 회차";
    if (q("[data-reader-content]")) q("[data-reader-content]").innerHTML = currentBody;

    var bookmark = q("[data-bookmark-id='reader-bookmark']");
    if (bookmark) bookmark.dataset.bookmarkId = novel.slug;

    var paywall = q("[data-paywall]");
    var paywallTitle = q("[data-paywall-title]");
    var paywallPrices = q("[data-paywall-prices]");
    var paywallBuy = q("[data-paywall-buy]");
    var paywallDetail = q("[data-paywall-detail]");
    var paywallNote = q("[data-paywall-note]");
    if (paywall) {
      if (selected.accessType === "paid" && !body) {
        paywall.style.display = "";
        if (paywallTitle) paywallTitle.textContent = selected.title;
        if (paywallPrices) paywallPrices.innerHTML = priceMarkup(novel);
        if (paywallDetail) paywallDetail.href = detailHref(novel.slug);
        if (paywallNote) paywallNote.textContent = sale ? countdownLabel(null) + " 할인 중" : "상시 판매 가격";
      } else if (next && next.accessType === "paid") {
        paywall.style.display = "";
        if (paywallTitle) paywallTitle.textContent = next.title;
        if (paywallPrices) paywallPrices.innerHTML = priceMarkup(novel);
        if (paywallDetail) paywallDetail.href = detailHref(novel.slug);
        if (paywallNote) paywallNote.textContent = "다음 화부터 유료입니다. 할인 중일 때 구매하면 저렴합니다.";
      } else {
        paywall.style.display = "none";
      }
    }

    var prevNav = q("[data-chapter-prev]");
    var nextNav = q("[data-chapter-next]");
    var positionNode = q("[data-chapter-position]");
    var tocBtn = q("[data-chapter-toc]");

    if (prevNav) {
      prevNav.innerHTML = prev
        ? "<a href='" + viewerHref(novel.slug, prev.episodeNumber) + "'>← 이전화</a>"
        : "<span style='color:var(--text-muted);'>처음 화</span>";
    }
    if (nextNav) {
      nextNav.innerHTML = next
        ? "<a href='" + viewerHref(novel.slug, next.episodeNumber) + "'>" + (next.accessType === "free" ? "다음화 →" : "다음화 (유료) →") + "</a>"
        : "<span style='color:var(--text-muted);'>마지막 화</span>";
    }
    if (positionNode) positionNode.textContent = selected.episodeNumber + " / " + formatCount(novel.totalEpisodeCount);
    if (tocBtn) {
      tocBtn.addEventListener("click", function () { window.location.href = detailHref(novel.slug); });
    }

    window.addEventListener("scroll", function () {
      var fill = q(".reader-progress-fill");
      if (!fill) return;
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      fill.style.width = pct + "%";
    });

    refreshBookmarkButtons();
  }

  function renderLibrary(data) {
    var statsNode = q("[data-library-stats]");
    var readingList = q("[data-library-reading]");
    var wishlistList = q("[data-library-wishlist]");
    var purchasedList = q("[data-library-purchased]");

    var bookmarks = [];
    try { bookmarks = JSON.parse(localStorage.getItem(store.bookmarks) || "[]"); } catch (_e) { bookmarks = []; }
    var bookmarkedNovels = data.novels.filter(function (n) { return bookmarks.indexOf(n.slug) !== -1; });

    var token = accessToken();
    var isLoggedIn = Boolean(token && token !== cfg.anonKey && token !== (cfg.publishableKey || ""));

    if (statsNode) {
      statsNode.innerHTML =
        "<span class='muted-badge'>찜 " + formatCount(bookmarkedNovels.length) + "개</span>" +
        (isLoggedIn ? "<span class='muted-badge'>읽는 중 —</span><span class='muted-badge'>구매 —</span>" : "");
    }

    var loginPrompt = "<div class='library-empty'><h3>로그인이 필요합니다</h3><p>읽기 진행 상황과 구매 내역은 로그인 후 확인할 수 있습니다.</p><a class='button primary' href='auth_pc.html'>로그인</a></div>";

    if (readingList) {
      readingList.innerHTML = isLoggedIn
        ? "<div class='library-empty'><h3>아직 읽은 작품이 없습니다</h3><p>스토어에서 작품을 골라 읽기를 시작해보세요.</p><a class='button primary' href='search_pc.html'>작품 탐색하기</a></div>"
        : loginPrompt;
    }

    if (wishlistList) {
      if (bookmarkedNovels.length) {
        wishlistList.innerHTML = bookmarkedNovels.map(function (novel) {
          var sale = salePercent(novel);
          var badge = sale ? "<span class='sale-badge'>-" + sale + "% 할인</span>" : "<span class='muted-badge'>이벤트 대기</span>";
          return "<article class='library-row'>" +
            "<a class='library-row-thumb' href='" + detailHref(novel.slug) + "'><img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'></a>" +
            "<div class='library-row-copy'>" +
            "<h3 class='library-row-title'>" + esc(novel.title) + "</h3>" +
            "<p class='library-row-meta'>" + esc(novel.authorName) + " · " + badge + "</p>" +
            "</div>" +
            "<div class='library-row-side'>" +
            "<a class='button small primary' href='" + detailHref(novel.slug) + "'>상세 보기</a>" +
            "</div>" +
            "</article>";
        }).join("");
      } else {
        wishlistList.innerHTML = "<div class='library-empty'><h3>찜한 작품이 없습니다</h3><p>작품 상세에서 ♥ 버튼을 눌러 찜해보세요.</p><a class='button primary' href='search_pc.html'>작품 탐색하기</a></div>";
      }
    }

    if (purchasedList) {
      purchasedList.innerHTML = isLoggedIn
        ? "<div class='library-empty'><h3>구매한 작품이 없습니다</h3><p>유료 회차를 구매하면 여기에 표시됩니다.</p><a class='button primary' href='search_pc.html'>작품 탐색하기</a></div>"
        : loginPrompt;
    }

    var tabBtns = qa("[data-tab-target]");
    var tabPanels = qa("[data-tab-panel]");
    tabBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        tabBtns.forEach(function (b) { b.dataset.state = ""; });
        btn.dataset.state = "include";
        tabPanels.forEach(function (p) { p.style.display = "none"; });
        var target = q("[data-tab-panel='" + btn.dataset.tabTarget + "']");
        if (target) target.style.display = "";
      });
    });

    refreshBookmarkButtons();
  }

  function renderAuth() {
    var loginForm = q("[data-auth-login]");
    var signupForm = q("[data-auth-signup]");
    var errorLogin = q("[data-auth-error]");
    var errorSignup = q("[data-auth-error-signup]");

    function showError(node, msg) {
      if (!node) return;
      node.textContent = msg;
      node.classList.add("visible");
    }
    function hideError(node) {
      if (!node) return;
      node.classList.remove("visible");
    }

    qa("[data-auth-toggle]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        var mode = link.dataset.authToggle;
        if (mode === "signup") {
          if (loginForm) loginForm.style.display = "none";
          if (signupForm) signupForm.style.display = "";
        } else {
          if (signupForm) signupForm.style.display = "none";
          if (loginForm) loginForm.style.display = "";
        }
        hideError(errorLogin);
        hideError(errorSignup);
      });
    });

    var supabaseClient = null;
    if (window.supabase && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(
        (cfg.url || "").replace(/\/$/, ""),
        cfg.anonKey || cfg.publishableKey || ""
      );
    }

    var submitLogin = q("[data-auth-submit]");
    if (submitLogin) {
      submitLogin.addEventListener("click", async function () {
        hideError(errorLogin);
        var email = (q("[data-auth-email]") || {}).value || "";
        var password = (q("[data-auth-password]") || {}).value || "";
        if (!email || !password) { showError(errorLogin, "이메일과 비밀번호를 입력해주세요."); return; }
        if (!supabaseClient) { showError(errorLogin, "서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요."); return; }
        try {
          var result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
          if (result.error) { showError(errorLogin, result.error.message); return; }
          if (result.data && result.data.session) {
            localStorage.setItem(store.accessToken, result.data.session.access_token);
          }
          window.location.href = "homepage_pc.html";
        } catch (err) {
          showError(errorLogin, "로그인 중 오류가 발생했습니다.");
        }
      });
    }

    var submitSignup = q("[data-signup-submit]");
    if (submitSignup) {
      submitSignup.addEventListener("click", async function () {
        hideError(errorSignup);
        var email = (q("[data-signup-email]") || {}).value || "";
        var password = (q("[data-signup-password]") || {}).value || "";
        var confirm = (q("[data-signup-password-confirm]") || {}).value || "";
        var penName = (q("[data-signup-pen-name]") || {}).value || "";
        if (!email || !password || !penName) { showError(errorSignup, "모든 필드를 입력해주세요."); return; }
        if (password !== confirm) { showError(errorSignup, "비밀번호가 일치하지 않습니다."); return; }
        if (password.length < 6) { showError(errorSignup, "비밀번호는 6자 이상이어야 합니다."); return; }
        if (!supabaseClient) { showError(errorSignup, "서비스 연결에 실패했습니다."); return; }
        try {
          var result = await supabaseClient.auth.signUp({ email: email, password: password, options: { data: { pen_name: penName } } });
          if (result.error) { showError(errorSignup, result.error.message); return; }
          if (result.data && result.data.session) {
            localStorage.setItem(store.accessToken, result.data.session.access_token);
            window.location.href = "homepage_pc.html";
          } else {
            showError(errorSignup, "가입 확인 이메일을 보냈습니다. 이메일을 확인해주세요.");
            errorSignup.style.color = "var(--accent-free)";
            errorSignup.style.background = "#f0faf4";
          }
        } catch (err) {
          showError(errorSignup, "가입 중 오류가 발생했습니다.");
        }
      });
    }

    qa("[data-auth-google]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!supabaseClient) return;
        await supabaseClient.auth.signInWithOAuth({ provider: "google" });
      });
    });

    qa("[data-auth-kakao]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!supabaseClient) return;
        await supabaseClient.auth.signInWithOAuth({ provider: "kakao" });
      });
    });
  }

  function renderCreatorDashboard(data) {
    var statsNode = q("[data-creator-stats]");
    var listNode = q("[data-creator-list]");
    var emptyNode = q("[data-creator-empty]");

    var token = accessToken();
    var isLoggedIn = Boolean(token && token !== cfg.anonKey && token !== (cfg.publishableKey || ""));

    if (!isLoggedIn) {
      if (q(".creator-main")) {
        q(".creator-main").innerHTML = "<div class='creator-empty'><h3>로그인이 필요합니다</h3><p>작품 관리는 로그인 후 이용할 수 있습니다.</p><a class='button primary' href='auth_pc.html'>로그인</a></div>";
      }
      return;
    }

    var novels = data.novels;
    var totalEpisodes = novels.reduce(function (sum, n) { return sum + n.totalEpisodeCount; }, 0);
    var totalViews = novels.reduce(function (sum, n) { return sum + n.viewCount; }, 0);

    if (statsNode) {
      statsNode.innerHTML =
        "<div class='summary-card'><span class='material-symbols-outlined summary-card-icon'>auto_stories</span><div class='summary-card-value'>" + formatCount(novels.length) + "</div><div class='summary-card-label'>등록 작품</div></div>" +
        "<div class='summary-card'><span class='material-symbols-outlined summary-card-icon'>list</span><div class='summary-card-value'>" + formatCount(totalEpisodes) + "</div><div class='summary-card-label'>총 회차</div></div>" +
        "<div class='summary-card'><span class='material-symbols-outlined summary-card-icon'>visibility</span><div class='summary-card-value'>" + formatCount(totalViews) + "</div><div class='summary-card-label'>총 조회수</div></div>";
    }

    if (!novels.length) {
      if (listNode) listNode.style.display = "none";
      if (emptyNode) emptyNode.style.display = "";
      return;
    }

    if (emptyNode) emptyNode.style.display = "none";
    if (listNode) {
      listNode.innerHTML = novels.map(function (novel) {
        var statusBadge = novel.status === "completed"
          ? "<span class='free-badge'>완결</span>"
          : novel.status === "draft"
            ? "<span class='muted-badge' style='opacity:0.6;'>비공개</span>"
            : "<span class='muted-badge'>연재중</span>";
        return "<article class='creator-work-row'>" +
          "<div class='creator-work-row-thumb'><img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'></div>" +
          "<div class='creator-work-row-copy'>" +
          "<h3 class='creator-work-row-title'>" + esc(novel.title) + " " + statusBadge + "</h3>" +
          "<p class='creator-work-row-meta'>" + formatCount(novel.totalEpisodeCount) + "화 · 조회 " + formatCount(novel.viewCount) + " · " + esc(novel.updatedAt ? novel.updatedAt.slice(0, 10) : "—") + "</p>" +
          "</div>" +
          "<div class='creator-work-row-actions'>" +
          "<a class='button small ghost' href='episode_upload_pc.html?novel_id=" + novel.id + "'>회차 추가</a>" +
          "<a class='button small secondary' href='novel_upload_pc.html?edit=" + novel.id + "'>수정</a>" +
          "</div>" +
          "</article>";
      }).join("");
    }
  }

  function renderAuthorDashboard(data) {
    var kpiNode = q("[data-kpi-cards]");
    var tableBody = q("[data-stats-table]");
    var activityNode = q("[data-recent-activity]");

    var token = accessToken();
    var isLoggedIn = Boolean(token && token !== cfg.anonKey && token !== (cfg.publishableKey || ""));

    if (!isLoggedIn) {
      if (q(".creator-main")) {
        q(".creator-main").innerHTML = "<div class='creator-empty'><h3>로그인이 필요합니다</h3><p>통계는 로그인 후 확인할 수 있습니다.</p><a class='button primary' href='auth_pc.html'>로그인</a></div>";
      }
      return;
    }

    var novels = data.novels;
    var totalViews = novels.reduce(function (sum, n) { return sum + n.viewCount; }, 0);
    var totalComments = novels.reduce(function (sum, n) { return sum + n.commentCount; }, 0);
    var totalPaidEpisodes = novels.reduce(function (sum, n) { return sum + Math.max(0, n.totalEpisodeCount - n.freeEpisodeCount); }, 0);
    var estimatedRevenue = totalPaidEpisodes * EPISODE_PRICE;
    var bookmarks = [];
    try { bookmarks = JSON.parse(localStorage.getItem(store.bookmarks) || "[]"); } catch (_e) { bookmarks = []; }

    if (kpiNode) {
      kpiNode.innerHTML =
        "<div class='kpi-card'><span class='material-symbols-outlined kpi-card-icon'>visibility</span><div class='kpi-card-value'>" + formatCount(totalViews) + "</div><div class='kpi-card-label'>총 조회수</div></div>" +
        "<div class='kpi-card'><span class='material-symbols-outlined kpi-card-icon'>favorite</span><div class='kpi-card-value'>" + formatCount(bookmarks.length) + "</div><div class='kpi-card-label'>총 찜 수</div></div>" +
        "<div class='kpi-card'><span class='material-symbols-outlined kpi-card-icon'>chat_bubble</span><div class='kpi-card-value'>" + formatCount(totalComments) + "</div><div class='kpi-card-label'>총 댓글 수</div></div>" +
        "<div class='kpi-card'><span class='material-symbols-outlined kpi-card-icon'>payments</span><div class='kpi-card-value'>" + formatWon(estimatedRevenue) + "</div><div class='kpi-card-label'>추정 수익</div></div>";
    }

    if (tableBody) {
      if (novels.length) {
        tableBody.innerHTML = novels.map(function (novel) {
          return "<tr onclick=\"window.location.href='" + detailHref(novel.slug) + "'\">" +
            "<td>" + esc(novel.title) + "</td>" +
            "<td class='num'>" + formatCount(novel.viewCount) + "</td>" +
            "<td class='num'>" + formatCount(novel.reactionScore) + "</td>" +
            "<td class='num'>" + formatCount(novel.commentCount) + "</td>" +
            "<td class='num'>★ " + novel.reactionScore.toFixed(1) + "</td>" +
            "<td>" + esc(novel.updatedAt ? novel.updatedAt.slice(0, 10) : "—") + "</td>" +
            "</tr>";
        }).join("");
      } else {
        tableBody.innerHTML = "<tr><td colspan='6' style='text-align:center;color:var(--text-muted);padding:32px;'>등록된 작품이 없습니다</td></tr>";
      }
    }

    if (activityNode) {
      var activities = novels.slice(0, 5).map(function (novel) {
        return "<div class='activity-item'><span class='material-symbols-outlined'>chat_bubble</span><span>" + esc(novel.title) + "에 새로운 반응이 있습니다</span><span class='activity-time'>최근</span></div>";
      });
      activityNode.innerHTML = activities.length
        ? activities.join("")
        : "<div class='activity-item'><span class='material-symbols-outlined'>info</span><span>최근 활동이 없습니다</span></div>";
    }

    var periodBtns = qa("[data-period]");
    periodBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        periodBtns.forEach(function (b) { b.dataset.state = ""; });
        btn.dataset.state = "include";
      });
    });
  }

  async function hydrate() {
    if (page === "auth_pc.html") {
      renderAuth();
      return;
    }

    const data = await catalog();
    if (!data.novels.length) return;

    if (page === "homepage_pc.html") {
      renderHome(data);
      return;
    }

    if (page === "search_pc.html") {
      renderSearch(data);
      return;
    }

    if (page === "my_library_pc.html") {
      renderLibrary(data);
      return;
    }

    if (page === "creator_dashboard_pc.html") {
      renderCreatorDashboard(data);
      return;
    }

    if (page === "author_dashboard_pc.html") {
      renderAuthorDashboard(data);
      return;
    }

    const slug = query.get("slug") || "abyss-librarian-forbidden-archive";
    const novel = data.novelsBySlug.get(slug) || data.novels[0];
    if (!novel) return;
    const list = await episodes(novel.id);

    if (page === "novel_detail_pc.html") {
      renderDetail(data, novel, list);
      return;
    }

    if (page === "novel_viewer_pc.html") {
      const episodeNumber = Number(query.get("episode") || 1);
      const selected = list.find(function (episode) { return episode.episodeNumber === episodeNumber; }) || list[0];
      const body = selected ? await episodeBody(selected.id).catch(function () { return ""; }) : "";
      renderViewer(novel, list, selected, body);
    }
  }

  hydrate().catch(function (error) {
    console.error("[InkRoad] redesign hydration failed:", error);
  });
})();
