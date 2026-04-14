(function () {
  const cfg = window.inkroadSupabaseConfig || {};
  const projectRef = cfg.projectRef || "qtouztmyuemwxxtmaqjm";
  const base = (cfg.url || (projectRef ? "https://" + projectRef + ".supabase.co" : "")).replace(/\/$/, "");
  const key = cfg.publishableKey || cfg.anonKey || "";
  const page = (window.location.pathname.split("/").pop() || "homepage").replace(/\.html$/, "");
  const query = new URLSearchParams(window.location.search);
  const isPc = page.includes("_pc");
  const isAuthPage = page === "auth_pc";
  const isLibraryPage = page.indexOf("my_library") === 0;
  const isViewerPage = page.indexOf("novel_viewer") === 0;
  const links = {
    home: isPc ? "homepage_pc.html" : "homepage.html",
    search: isPc ? "search_pc.html" : "search.html",
    detail: isPc ? "novel_detail_pc.html" : "novel_detail.html",
    viewer: isPc ? "novel_viewer_pc.html" : "novel_viewer.html",
    library: isPc ? "my_library_pc.html" : "my_library.html"
  };
  const storage = {
    localBookmarks: "inkroad-bookmarks",
    localHistory: "inkroad-reading-history",
    migration: "inkroad-supabase-migrated",
    session: "inkroad-supabase-auth",
    accessToken: "inkroad-supabase-access-token"
  };

  let client = null;
  let bookmarkListenerBound = false;
  let purchaseListenerBound = false;
  let libraryRefreshTimer = null;
  let profileCache = null;
  const cache = {
    novels: null,
    novelsBySlug: new Map()
  };

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  const topbarCreatorLinks = isPc ? q("[data-topbar-creator-links]") : null;
  const topbarAdminLink = isPc ? q("[data-admin-link]") : null;
  const topbarAuthLink = isPc ? q("[data-topbar-auth]") : null;
  const userMenu = isPc ? q("[data-user-menu]") : null;
  const userDropdown = isPc ? q("[data-user-dropdown]") : null;
  const menuAdmin = isPc ? q("[data-menu-admin]") : null;
  const menuLogout = isPc ? q("[data-menu-logout]") : null;

  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMoney(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  }

  function formatCount(value) {
    return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
  }

  function summary(novel) {
    return novel.short_description || novel.description || "작품 설명이 아직 준비되지 않았습니다.";
  }

  function salePercent(novel) {
    const list = Number(novel.bundle_list_price || 0);
    const sale = Number(novel.bundle_sale_price || 0);
    if (!list || !sale || sale >= list) return 0;
    return Math.round(((list - sale) / list) * 100);
  }

  function cover(novel) {
    return novel.cover_url || novel.banner_url || "https://placehold.co/320x440/111827/f3f4f6?text=InkRoad";
  }

  function detailHref(slug) {
    return links.detail + "?slug=" + encodeURIComponent(slug);
  }

  function viewerHref(slug, episodeNumber) {
    return links.viewer + "?slug=" + encodeURIComponent(slug) + "&episode=" + encodeURIComponent(episodeNumber || 1);
  }

  function unwrapRelation(value) {
    if (Array.isArray(value)) return value[0] || null;
    return value || null;
  }

  function getLocalArray(keyName) {
    try {
      const value = JSON.parse(localStorage.getItem(keyName) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function setLocalArray(keyName, value) {
    localStorage.setItem(keyName, JSON.stringify(value));
  }

  async function fetchOwnProfile(userId) {
    if (!client || !userId) return null;
    if (profileCache && profileCache.id === userId) return profileCache;
    const result = await client.from("profiles").select("id, display_name, role").eq("id", userId).maybeSingle();
    profileCache = result.data || null;
    return profileCache;
  }

  function renderPcTopbarGuest() {
    if (!isPc) return;
    if (topbarCreatorLinks) topbarCreatorLinks.hidden = true;
    if (topbarAdminLink) topbarAdminLink.hidden = true;
    if (userDropdown) userDropdown.hidden = true;
    if (topbarAuthLink) {
      topbarAuthLink.textContent = "로그인";
      topbarAuthLink.setAttribute("data-i18n", "nav.login");
      topbarAuthLink.classList.remove("topbar-user-logged-in");
      topbarAuthLink.addEventListener("click", function guestClick() {
        topbarAuthLink.removeEventListener("click", guestClick);
        window.location.href = "auth_pc.html?next=" + encodeURIComponent(window.location.pathname.split("/").pop() || links.home);
      }, { once: true });
    }
  }

  function setupUserDropdown(session) {
    if (!userMenu || !userDropdown || !topbarAuthLink) return;

    topbarAuthLink.addEventListener("click", function (e) {
      e.stopPropagation();
      var isOpen = !userDropdown.hidden;
      userDropdown.hidden = isOpen;
      topbarAuthLink.classList.toggle("is-open", !isOpen);
    });

    document.addEventListener("click", function (e) {
      if (!userMenu.contains(e.target)) {
        userDropdown.hidden = true;
        topbarAuthLink.classList.remove("is-open");
      }
    });

    if (menuLogout) {
      menuLogout.addEventListener("click", async function () {
        if (client) await client.auth.signOut();
        window.location.reload();
      });
    }
  }

  async function renderPcTopbar(session) {
    if (!isPc) return;
    if (!session) {
      renderPcTopbarGuest();
      return;
    }
    const profile = await fetchOwnProfile(session.user.id);
    const meta = session.user.user_metadata || {};
    const nickname = (profile && profile.display_name) || meta.display_name || meta.pen_name || meta.full_name || meta.name || session.user.email || "내 서재";
    const isAdmin = profile && profile.role === "admin";
    if (topbarCreatorLinks) topbarCreatorLinks.hidden = true;
    if (topbarAdminLink) topbarAdminLink.hidden = true;
    if (menuAdmin) menuAdmin.hidden = !isAdmin;
    if (topbarAuthLink) {
      topbarAuthLink.textContent = nickname;
      topbarAuthLink.removeAttribute("data-i18n");
      topbarAuthLink.classList.add("topbar-user-logged-in");
    }
    setupUserDropdown(session);
  }

  /* --- Mobile user bottom sheet --- */
  function setupMobileUserSheet() {
    var sheet = q("[data-mobile-user-sheet]");
    if (!sheet) return;
    var btns = qa("[data-mobile-user-btn]");
    var closers = qa("[data-mobile-sheet-close]");

    function open() { sheet.hidden = false; requestAnimationFrame(function () { sheet.classList.add("is-open"); }); }
    function close() { sheet.classList.remove("is-open"); setTimeout(function () { sheet.hidden = true; }, 250); }

    btns.forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); open(); }); });
    closers.forEach(function (c) { c.addEventListener("click", close); });

    var logoutBtn = q("[data-mobile-menu-logout]");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function () {
        if (client) await client.auth.signOut();
        window.location.reload();
      });
    }
  }

  function renderMobileTopbar(session) {
    if (isPc) return;
    var sheet = q("[data-mobile-user-sheet]");
    if (!sheet) { setupMobileUserSheet(); return; }
    var nameEl = q("[data-mobile-user-name]");
    var adminItem = q("[data-mobile-menu-admin]");
    var logoutItem = q("[data-mobile-menu-logout]");
    var btns = qa("[data-mobile-user-btn]");

    if (!session) {
      if (nameEl) nameEl.textContent = "로그인";
      if (logoutItem) logoutItem.hidden = true;
      if (adminItem) adminItem.hidden = true;
      // 비로그인: 시트 대신 로그인 페이지로 이동
      btns.forEach(function (b) {
        b.onclick = function (e) { e.preventDefault(); window.location.href = "auth.html"; };
      });
      return;
    }

    fetchOwnProfile(session.user.id).then(function (profile) {
      var meta = session.user.user_metadata || {};
      var nickname = (profile && profile.display_name) || meta.display_name || meta.pen_name || meta.full_name || meta.name || session.user.email || "독자";
      var isAdmin = profile && profile.role === "admin";
      if (nameEl) nameEl.textContent = nickname;
      if (adminItem) adminItem.hidden = !isAdmin;
      if (logoutItem) logoutItem.hidden = false;

      // 모바일 시트 메뉴 업데이트
      var sheet = q("[data-mobile-user-sheet]");
      if (sheet) {
        var profileLink = sheet.querySelector("[data-mobile-menu-profile]");
        if (profileLink) profileLink.setAttribute("href", "profile_settings.html");
        var paymentLink = sheet.querySelector("[data-mobile-menu-payment]");
        if (paymentLink) paymentLink.setAttribute("href", "payment.html");
      }
    });

    setupMobileUserSheet();
  }

  function resolveBookmarkSlug(button) {
    const explicit = button.dataset.bookmarkId || "";
    const pageSlug = query.get("slug");
    if (pageSlug) return pageSlug;
    const fallbacks = {
      "hero-feature": "black-mage-oath",
      "pc-home-hero": "black-mage-oath",
      "silent-archive": "abyss-librarian-forbidden-archive",
      "silent-archive-wide": "abyss-librarian-forbidden-archive",
      "silent-archive-sale": "abyss-librarian-forbidden-archive",
      "reader-silent-archive": "abyss-librarian-forbidden-archive",
      "pc-reader-bookmark": "abyss-librarian-forbidden-archive",
      "pc-detail-main": "abyss-librarian-forbidden-archive",
      "pc-detail-secondary": "abyss-librarian-forbidden-archive",
      "pc-detail-sale-alert": "abyss-librarian-forbidden-archive"
    };
    return explicit in fallbacks ? fallbacks[explicit] : explicit;
  }

  function setBookmarkButtonsToCurrentSlug() {
    const slug = query.get("slug");
    if (!slug) return;
    if (page.indexOf("novel_detail") === 0 || page.indexOf("novel_viewer") === 0) {
      qa("[data-bookmark-id]").forEach(function (button) {
        button.dataset.bookmarkId = slug;
      });
    }
  }

  function applyLocalBookmarks() {
    const bookmarks = new Set(getLocalArray(storage.localBookmarks));
    qa("[data-bookmark-id]").forEach(function (button) {
      const slug = resolveBookmarkSlug(button);
      const active = bookmarks.has(slug);
      button.setAttribute("aria-pressed", String(active));
      const label = q("[data-bookmark-label]", button);
      if (label) label.textContent = active ? "찜됨" : "찜하기";
    });
  }

  function saveLocalBookmark(slug, active) {
    if (!slug) return;
    const bookmarks = new Set(getLocalArray(storage.localBookmarks));
    if (active) {
      bookmarks.add(slug);
    } else {
      bookmarks.delete(slug);
    }
    setLocalArray(storage.localBookmarks, Array.from(bookmarks));
    applyLocalBookmarks();
  }

  function ensureAuthSlot() {
    let slot = q("[data-auth-slot]");
    if (slot) return slot;
    slot = document.createElement("section");
    slot.className = "auth-shell";
    slot.setAttribute("data-auth-slot", "");
    const anchor = q(isPc ? ".workspace-head" : ".page-head");
    if (anchor && anchor.parentNode) {
      anchor.insertAdjacentElement("afterend", slot);
    } else {
      const shell = q(isPc ? ".pc-shell" : ".shell.wide") || document.body;
      shell.prepend(slot);
    }
    return slot;
  }

  function setLibraryVisibility(visible) {
    if (isPc) {
      const layout = q(".library-layout-refined");
      if (layout) layout.hidden = !visible;
    } else {
      qa(".mobile-section").forEach(function (section) {
        section.hidden = !visible;
      });
    }

    qa("[data-tab-panel]").forEach(function (panel) {
      panel.hidden = !visible;
    });
    qa(".library-tabs, .mobile-chip-scroll").forEach(function (node) {
      node.hidden = !visible;
    });
  }

  function renderAuthCard(html) {
    if (!isLibraryPage) return;
    const slot = ensureAuthSlot();
    slot.innerHTML = html;
    slot.hidden = false;
  }

  function renderConfigMessage() {
    if (!isLibraryPage) return;
    renderAuthCard("<div class='auth-card' data-tone='warning'><div class='auth-head'><span class='eyebrow'>연결 필요</span><h2 class='auth-title'>Supabase 공개 키가 아직 비어 있습니다</h2><p class='auth-text'>프로젝트 주소는 이미 연결해뒀고, 이제 <code>assets/supabase-config.js</code>에 publishable key만 넣으면 로그인과 내 서재가 바로 동작합니다.</p></div></div>");
  }

  function renderAuthGate(message) {
    if (!isLibraryPage) return;
    setLibraryVisibility(false);
    const note = message ? "<p class='auth-note'>" + esc(message) + "</p>" : "<p class='auth-note'>처음이면 회원가입을 누르고, 이미 계정이 있으면 로그인하면 됩니다.</p>";
    renderAuthCard("<div class='auth-card'><div class='auth-head'><span class='eyebrow'>로그인</span><h2 class='auth-title'>내 서재를 불러오려면 먼저 로그인하세요</h2><p class='auth-text'>찜한 작품, 이어 읽기, 구매한 번들을 사용자 계정 기준으로 불러옵니다.</p></div><form class='auth-form' data-auth-form><div class='auth-grid'><label class='auth-label'><span>이메일</span><input class='auth-input' type='email' name='email' placeholder='you@example.com' required></label><label class='auth-label'><span>비밀번호</span><input class='auth-input' type='password' name='password' placeholder='8자 이상' minlength='8' required></label></div><label class='auth-label'><span>닉네임</span><input class='auth-input' type='text' name='displayName' placeholder='처음 가입할 때만 사용됩니다'></label><div class='auth-actions'><button class='button primary' type='submit'>로그인</button><button class='button secondary' type='button' data-auth-signup>회원가입</button></div>" + note + "</form></div>");

    const form = q("[data-auth-form]");
    const signupButton = q("[data-auth-signup]");
    if (form) {
      form.addEventListener("submit", async function (event) {
        event.preventDefault();
        const formData = new FormData(form);
        const email = String(formData.get("email") || "").trim();
        const password = String(formData.get("password") || "").trim();
        try {
          await signIn(email, password);
        } catch (error) {
          renderAuthGate(error.message || "로그인에 실패했습니다.");
        }
      });
    }
    if (signupButton) {
      signupButton.addEventListener("click", async function () {
        const formData = new FormData(form);
        const email = String(formData.get("email") || "").trim();
        const password = String(formData.get("password") || "").trim();
        const displayName = String(formData.get("displayName") || "").trim();
        try {
          const result = await signUp(email, password, displayName);
          if (result && result.session) return;
          renderAuthGate("가입 요청이 들어갔습니다. 메일 인증이 켜져 있다면 메일을 확인한 뒤 다시 로그인하세요.");
        } catch (error) {
          renderAuthGate(error.message || "회원가입에 실패했습니다.");
        }
      });
    }
  }

  function renderSignedInCard(session, displayName) {
    if (!isLibraryPage) return;
    setLibraryVisibility(true);
    renderAuthCard("<div class='auth-card' data-tone='success'><div class='auth-status-row'><div class='auth-user'><span class='auth-badge'>로그인됨</span><strong>" + esc(displayName || session.user.email || "독자") + "</strong><span class='auth-note'>" + esc(session.user.email || "") + "</span></div><div class='auth-actions'><button class='button secondary' type='button' data-auth-logout>로그아웃</button></div></div></div>");
    const logout = q("[data-auth-logout]");
    if (logout) {
      logout.addEventListener("click", async function () {
        await client.auth.signOut();
      });
    }
  }

  async function signIn(email, password) {
    if (!email || !password) throw new Error("이메일과 비밀번호를 먼저 입력해주세요.");
    const result = await client.auth.signInWithPassword({ email: email, password: password });
    if (result.error) throw result.error;
    return result.data;
  }

  async function signUp(email, password, displayName) {
    if (!email || !password) throw new Error("이메일과 비밀번호를 먼저 입력해주세요.");
    const name = displayName || email.split("@")[0];
    const result = await client.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          display_name: name,
          pen_name: name
        }
      }
    });
    if (result.error) throw result.error;
    return result.data;
  }

  function syncSessionAccessToken(session) {
    if (session && session.access_token) {
      localStorage.setItem(storage.accessToken, session.access_token);
    } else {
      localStorage.removeItem(storage.accessToken);
    }
  }

  function currentRelativePath() {
    return page + (window.location.search || "");
  }

  function safeRedirectPath(value, fallback) {
    const next = String(value || "").trim();
    if (!next) return fallback || links.home;
    if (/^(?:[a-z]+:)?\/\//i.test(next) || next.toLowerCase().indexOf("javascript:") === 0) {
      return fallback || links.home;
    }
    return next.replace(/^\/+/, "");
  }

  function authRedirectHref(nextPath) {
    return "auth_pc.html?next=" + encodeURIComponent(safeRedirectPath(nextPath, links.home));
  }

  async function fetchNovels() {
    if (cache.novels) return cache.novels;
    const result = await client
      .from("novels")
      .select("id,slug,title,short_description,description,cover_url,banner_url,status,is_translation,free_episode_count,total_episode_count,reaction_score,view_count,bundle_list_price,bundle_sale_price")
      .neq("status", "draft");
    if (result.error) throw result.error;
    cache.novels = result.data || [];
    cache.novelsBySlug = new Map(cache.novels.map(function (novel) { return [novel.slug, novel]; }));
    return cache.novels;
  }

  async function fetchNovelBySlug(slug) {
    if (!slug) return null;
    await fetchNovels();
    return cache.novelsBySlug.get(slug) || null;
  }

  async function fetchLibraryItem(userId, novelId) {
    const result = await client
      .from("library_items")
      .select("id,state,is_bookmarked,last_read_episode_id")
      .eq("user_id", userId)
      .eq("novel_id", novelId)
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data || null;
  }

  async function mergeRemoteBookmarksIntoLocal(userId) {
    const result = await client
      .from("library_items")
      .select("is_bookmarked, novel:novels(slug)")
      .eq("user_id", userId)
      .eq("is_bookmarked", true);
    if (result.error) throw result.error;
    const bookmarks = new Set(getLocalArray(storage.localBookmarks));
    (result.data || []).forEach(function (item) {
      const novel = unwrapRelation(item.novel);
      if (novel && novel.slug) bookmarks.add(novel.slug);
    });
    setLocalArray(storage.localBookmarks, Array.from(bookmarks));
    applyLocalBookmarks();
  }

  async function migrateLocalStateToSupabase(session) {
    const userId = session.user.id;
    const markerKey = storage.migration + ":" + userId;
    if (localStorage.getItem(markerKey) === "1") return;

    const bookmarkSlugs = getLocalArray(storage.localBookmarks).filter(Boolean);
    const historyItems = getLocalArray(storage.localHistory).filter(function (entry) {
      return entry && entry.slug && entry.episodeNumber;
    });

    await fetchNovels();
    const validBookmarkSlugs = bookmarkSlugs.filter(function (slug) { return cache.novelsBySlug.has(slug); });
    const validHistory = historyItems.filter(function (entry) { return cache.novelsBySlug.has(entry.slug); });

    for (const slug of validBookmarkSlugs) {
      const novel = cache.novelsBySlug.get(slug);
      const current = await fetchLibraryItem(userId, novel.id);
      if (current) {
        const updateResult = await client.from("library_items").update({ is_bookmarked: true }).eq("id", current.id);
        if (updateResult.error) throw updateResult.error;
      } else {
        const insertResult = await client.from("library_items").insert({
          user_id: userId,
          novel_id: novel.id,
          state: "wishlist",
          is_bookmarked: true,
          notifications_enabled: true
        });
        if (insertResult.error) throw insertResult.error;
      }
    }

    const novelIds = Array.from(new Set(validHistory.map(function (entry) { return cache.novelsBySlug.get(entry.slug).id; })));
    const episodeMap = new Map();
    if (novelIds.length) {
      const episodeResult = await client
        .from("episodes")
        .select("id,novel_id,episode_number,title")
        .in("novel_id", novelIds);
      if (episodeResult.error) throw episodeResult.error;
      (episodeResult.data || []).forEach(function (episode) {
        episodeMap.set(episode.novel_id + ":" + episode.episode_number, episode);
      });
    }

    for (const entry of validHistory) {
      const novel = cache.novelsBySlug.get(entry.slug);
      const episode = episodeMap.get(novel.id + ":" + entry.episodeNumber);
      const lastReadAt = entry.updatedAt || new Date().toISOString();
      const payload = {
        user_id: userId,
        novel_id: novel.id,
        state: "reading",
        last_read_at: lastReadAt
      };
      if (episode) payload.last_read_episode_id = episode.id;
      const libraryWrite = await client.from("library_items").upsert(payload, { onConflict: "user_id,novel_id" });
      if (libraryWrite.error) throw libraryWrite.error;
      if (episode) {
        const progressWrite = await client.from("reading_progress").upsert({
          user_id: userId,
          novel_id: novel.id,
          episode_id: episode.id,
          progress_percent: 10,
          last_position: 0
        }, { onConflict: "user_id,episode_id" });
        if (progressWrite.error) throw progressWrite.error;
      }
    }

    localStorage.setItem(markerKey, "1");
  }

  async function syncBookmarkToSupabase(button) {
    const sessionResult = await client.auth.getSession();
    const session = sessionResult.data.session;
    if (!session) return;
    const slug = resolveBookmarkSlug(button);
    const novel = await fetchNovelBySlug(slug);
    if (!novel) return;
    const isPressed = button.getAttribute("aria-pressed") === "true";
    const current = await fetchLibraryItem(session.user.id, novel.id);

    if (isPressed) {
      if (current) {
        const nextState = current.state && current.state !== "archived" ? current.state : "wishlist";
        const result = await client
          .from("library_items")
          .update({ is_bookmarked: true, notifications_enabled: true, state: nextState })
          .eq("id", current.id);
        if (result.error) throw result.error;
      } else {
        const result = await client.from("library_items").insert({
          user_id: session.user.id,
          novel_id: novel.id,
          state: "wishlist",
          is_bookmarked: true,
          notifications_enabled: true
        });
        if (result.error) throw result.error;
      }
    } else if (current) {
      if (current.state === "wishlist" && !current.last_read_episode_id) {
        const result = await client.from("library_items").delete().eq("id", current.id);
        if (result.error) throw result.error;
      } else {
        const patch = { is_bookmarked: false };
        if (current.state === "wishlist") patch.state = "archived";
        const result = await client.from("library_items").update(patch).eq("id", current.id);
        if (result.error) throw result.error;
      }
    }

    saveLocalBookmark(slug, isPressed);
    scheduleLibraryRefresh();
  }

  function bindBookmarkSync() {
    if (bookmarkListenerBound) return;
    bookmarkListenerBound = true;
    document.addEventListener("click", function (event) {
      const button = event.target.closest("[data-bookmark-id]");
      if (!button) return;
      window.setTimeout(function () {
        syncBookmarkToSupabase(button).catch(function (error) {
          console.error("[InkRoad] bookmark sync failed:", error);
        });
      }, 0);
    }, true);
  }

  function setPurchaseBusy(button, busy) {
    if (!button) return;
    button.dataset.loading = busy ? "true" : "false";
    if (button.tagName === "BUTTON") button.disabled = busy;
    button.style.pointerEvents = busy ? "none" : "";
    button.style.opacity = busy ? "0.65" : "";
  }

  async function purchaseEpisodeFromButton(button) {
    if (!button || !client) return;
    const episodeId = button.dataset.purchaseEpisodeId || "";
    const redirectPath = safeRedirectPath(button.dataset.purchaseRedirect || button.getAttribute("href"), currentRelativePath());
    if (!episodeId) {
      window.location.href = redirectPath;
      return;
    }

    const sessionResult = await client.auth.getSession();
    const session = sessionResult.data.session;
    syncSessionAccessToken(session);

    if (!session) {
      window.location.href = authRedirectHref(redirectPath);
      return;
    }

    setPurchaseBusy(button, true);
    try {
      const rpcResult = await client.rpc("purchase_episode", { p_episode_id: episodeId });
      if (rpcResult.error) throw rpcResult.error;
      scheduleLibraryRefresh();
      window.location.href = safeRedirectPath(redirectPath, currentRelativePath());
    } finally {
      setPurchaseBusy(button, false);
    }
  }

  function bindPurchaseFlow() {
    if (purchaseListenerBound) return;
    purchaseListenerBound = true;
    document.addEventListener("click", function (event) {
      const button = event.target.closest("[data-purchase-button]");
      if (!button) return;
      event.preventDefault();
      window.setTimeout(function () {
        purchaseEpisodeFromButton(button).catch(function (error) {
          console.error("[InkRoad] purchase failed:", error);
          window.alert(error.message || "구매 처리 중 오류가 발생했습니다.");
        });
      }, 0);
    }, true);
  }

  async function syncViewerProgress() {
    if (!isViewerPage) return;
    const sessionResult = await client.auth.getSession();
    const session = sessionResult.data.session;
    if (!session) return;
    const slug = query.get("slug") || "abyss-librarian-forbidden-archive";
    const episodeNumber = Number(query.get("episode") || 1);
    const novel = await fetchNovelBySlug(slug);
    if (!novel) return;
    const episodeResult = await client
      .from("episodes")
      .select("id,episode_number,title")
      .eq("novel_id", novel.id)
      .eq("episode_number", episodeNumber)
      .maybeSingle();
    if (episodeResult.error) throw episodeResult.error;
    const episode = episodeResult.data;
    const lastReadAt = new Date().toISOString();
    const libraryPayload = {
      user_id: session.user.id,
      novel_id: novel.id,
      state: "reading",
      last_read_at: lastReadAt
    };
    if (episode) libraryPayload.last_read_episode_id = episode.id;
    const libraryWrite = await client.from("library_items").upsert(libraryPayload, { onConflict: "user_id,novel_id" });
    if (libraryWrite.error) throw libraryWrite.error;
    if (episode) {
      const progressWrite = await client.from("reading_progress").upsert({
        user_id: session.user.id,
        novel_id: novel.id,
        episode_id: episode.id,
        progress_percent: 10,
        last_position: 0
      }, { onConflict: "user_id,episode_id" });
      if (progressWrite.error) throw progressWrite.error;
    }
  }

  async function fetchLibraryData(userId) {
    const novelFields = "id,slug,title,short_description,description,cover_url,banner_url,status,is_translation,free_episode_count,total_episode_count,reaction_score,view_count,bundle_list_price,bundle_sale_price";
    const profilePromise = client.from("profiles").select("display_name").eq("id", userId).maybeSingle();
    const libraryPromise = client
      .from("library_items")
      .select("id,state,is_bookmarked,notifications_enabled,last_read_at,updated_at,last_read_episode_id,novel:novels(" + novelFields + "),episode:episodes(id,episode_number,title)")
      .eq("user_id", userId);
    const purchasePromise = client
      .from("purchases")
      .select("id,purchase_type,amount_paid,purchased_at,novel:novels(" + novelFields + "),episode:episodes(id,episode_number,title,novel_id,novel:novels(" + novelFields + "))")
      .eq("user_id", userId)
      .order("purchased_at", { ascending: false });

    const results = await Promise.all([profilePromise, libraryPromise, purchasePromise]);
    const profileResult = results[0];
    const libraryResult = results[1];
    const purchaseResult = results[2];

    if (profileResult.error) throw profileResult.error;
    if (libraryResult.error) throw libraryResult.error;
    if (purchaseResult.error) throw purchaseResult.error;

    const libraryItems = (libraryResult.data || []).map(function (item) {
      return {
        id: item.id,
        state: item.state,
        is_bookmarked: item.is_bookmarked,
        notifications_enabled: item.notifications_enabled,
        last_read_at: item.last_read_at,
        updated_at: item.updated_at,
        last_read_episode_id: item.last_read_episode_id,
        novel: unwrapRelation(item.novel),
        episode: unwrapRelation(item.episode)
      };
    }).filter(function (item) { return item.novel; });

    const purchases = (purchaseResult.data || []).map(function (item) {
      const directNovel = unwrapRelation(item.novel);
      const episode = unwrapRelation(item.episode);
      const episodeNovel = episode ? unwrapRelation(episode.novel) : null;
      return {
        id: item.id,
        purchase_type: item.purchase_type,
        amount_paid: item.amount_paid,
        purchased_at: item.purchased_at,
        novel: directNovel || episodeNovel,
        episode: episode ? {
          id: episode.id,
          episode_number: episode.episode_number,
          title: episode.title
        } : null
      };
    }).filter(function (item) { return item.novel; });

    return {
      profile: profileResult.data || null,
      libraryItems: libraryItems,
      purchases: purchases,
      purchasedNovels: aggregatePurchasedNovels(purchases)
    };
  }

  function sortByRecent(items) {
    return items.slice().sort(function (a, b) {
      const aTime = new Date(a.last_read_at || a.updated_at || a.purchased_at || 0).getTime();
      const bTime = new Date(b.last_read_at || b.updated_at || b.purchased_at || 0).getTime();
      return bTime - aTime;
    });
  }

  function readingProgress(item) {
    const episodeNumber = item.episode && item.episode.episode_number ? item.episode.episode_number : 0;
    const total = Number(item.novel.total_episode_count || 0);
    if (!episodeNumber || !total) return 0;
    return Math.max(1, Math.min(100, Math.round((episodeNumber / total) * 100)));
  }

  function aggregatePurchasedNovels(purchases) {
    const byNovel = new Map();
    purchases.forEach(function (item) {
      if (!item.novel || !item.novel.id) return;
      const key = item.novel.id;
      const current = byNovel.get(key) || {
        novel: item.novel,
        purchase_type: item.purchase_type,
        amount_paid: 0,
        purchased_at: item.purchased_at,
        episode_count: 0,
        latest_episode: null,
        bundle_owned: false
      };
      current.amount_paid += Number(item.amount_paid || 0);
      current.bundle_owned = current.bundle_owned || item.purchase_type === "bundle";
      if (item.purchase_type === "episode") {
        current.episode_count += 1;
      }
      if (item.episode && (!current.latest_episode || Number(item.episode.episode_number || 0) >= Number(current.latest_episode.episode_number || 0))) {
        current.latest_episode = item.episode;
      }
      if (new Date(item.purchased_at || 0).getTime() >= new Date(current.purchased_at || 0).getTime()) {
        current.purchased_at = item.purchased_at;
      }
      current.purchase_type = current.bundle_owned ? "bundle" : "episode";
      byNovel.set(key, current);
    });
    return Array.from(byNovel.values()).sort(function (a, b) {
      return new Date(b.purchased_at || 0).getTime() - new Date(a.purchased_at || 0).getTime();
    });
  }

  function simpleLibraryEmpty(title, copy, href, label) {
    return "<div class='library-empty'><h3>" + esc(title) + "</h3><p>" + esc(copy) + "</p>" + (href ? "<a class='button primary' href='" + href + "'>" + esc(label || "이동") + "</a>" : "") + "</div>";
  }

  function renderSimpleLibraryLists(data, displayName, mobile) {
    const reading = sortByRecent(data.libraryItems.filter(function (item) {
      return item.state === "reading" || item.last_read_at;
    }));
    const saved = sortByRecent(data.libraryItems.filter(function (item) {
      return item.is_bookmarked;
    }));
    const owned = sortByRecent(data.purchasedNovels || data.purchases || []);
    const statsNode = q("[data-library-stats]");
    const readingNode = q("[data-library-reading]");
    const wishlistNode = q("[data-library-wishlist]");
    const purchasedNode = q("[data-library-purchased]");

    if (!readingNode || !wishlistNode || !purchasedNode) return false;

    const titleNode = q(mobile ? ".mobile-section-title" : ".store-section-title");
    if (titleNode) titleNode.textContent = displayName + "님의 서재";
    if (statsNode) {
      statsNode.textContent = "읽는 중 " + formatCount(reading.length) + " · 찜 " + formatCount(saved.length) + " · 구매 " + formatCount(owned.length);
    }

    readingNode.innerHTML = reading.length ? reading.map(function (item) {
      const episodeNumber = item.episode && item.episode.episode_number ? item.episode.episode_number : 1;
      const totalEp = Number(item.novel.total_episode_count || 0);
      const progress = readingProgress(item);
      const remainEp = Math.max(0, totalEp - episodeNumber);
      const estMinutes = remainEp * 12;
      const estLabel = estMinutes >= 60 ? Math.round(estMinutes / 60) + "시간 남음" : estMinutes + "분 남음";
      const href = viewerHref(item.novel.slug, episodeNumber);
      const progressBar = "<div class='reading-progress-bar'><div class='reading-progress-fill' style='width:" + progress + "%'></div></div>";
      return mobile
        ? "<a class='mobile-list-row library-reading-row' href='" + href + "'><img src='" + esc(cover(item.novel)) + "' alt='" + esc(item.novel.title) + " 표지'><div class='mobile-list-row-copy'><div class='mobile-list-row-title'>" + esc(item.novel.title) + "</div><div class='reading-stats'><span class='reading-stat-highlight'>" + progress + "%</span><span class='reading-stat-sep'>·</span><span>" + episodeNumber + "/" + (totalEp || "?") + "화</span><span class='reading-stat-sep'>·</span><span>" + estLabel + "</span></div>" + progressBar + "<div class='reading-last-pos'>최근: " + episodeNumber + "화</div></div></a>"
        : "<article class='library-row library-reading-row'><a class='library-row-thumb' href='" + href + "'><img src='" + esc(cover(item.novel)) + "' alt='" + esc(item.novel.title) + " 표지'></a><div class='library-row-copy'><h3 class='library-row-title'>" + esc(item.novel.title) + "</h3><div class='reading-stats'><span class='reading-stat-highlight'>" + progress + "%</span><span class='reading-stat-sep'>·</span><span>" + episodeNumber + "/" + (totalEp || "?") + "화</span><span class='reading-stat-sep'>·</span><span>" + estLabel + "</span></div>" + progressBar + "<p class='reading-last-pos'>최근 읽은 위치: " + episodeNumber + "화</p></div><div class='library-row-side'><a class='button small primary' href='" + href + "'>이어 읽기</a></div></article>";
    }).join("") : simpleLibraryEmpty("아직 읽는 작품이 없습니다", "스토어에서 작품을 열면 여기에 자동으로 이어집니다.", links.search, "작품 탐색하기");

    wishlistNode.innerHTML = saved.length ? saved.map(function (item) {
      const href = detailHref(item.novel.slug);
      const percent = salePercent(item.novel);
      return mobile
        ? "<a class='mobile-list-row' href='" + href + "'><img src='" + esc(cover(item.novel)) + "' alt='" + esc(item.novel.title) + " 표지'><div class='mobile-list-row-copy'><div class='mobile-list-row-title'>" + esc(item.novel.title) + "</div><div class='mobile-list-row-meta'>" + (percent ? percent + "% 할인 중" : "찜한 작품") + "</div></div></a>"
        : "<article class='library-row'><a class='library-row-thumb' href='" + href + "'><img src='" + esc(cover(item.novel)) + "' alt='" + esc(item.novel.title) + " 표지'></a><div class='library-row-copy'><h3 class='library-row-title'>" + esc(item.novel.title) + "</h3><p class='library-row-meta'>" + (percent ? percent + "% 할인 중" : "알림 대기 중") + "</p></div><div class='library-row-side'><a class='button small ghost' href='" + href + "'>상세 보기</a></div></article>";
    }).join("") : simpleLibraryEmpty("아직 찜한 작품이 없습니다", "작품 상세에서 찜하기를 누르면 이 탭에 바로 들어옵니다.", links.search, "작품 탐색하기");

    purchasedNode.innerHTML = owned.length ? owned.map(function (item) {
      const href = item.latest_episode ? viewerHref(item.novel.slug, item.latest_episode.episode_number) : detailHref(item.novel.slug);
      const meta = item.bundle_owned
        ? "번들 보유 · 누적 " + formatMoney(item.amount_paid)
        : "구매한 회차 " + formatCount(item.episode_count) + "화 · 누적 " + formatMoney(item.amount_paid);
      const action = item.latest_episode ? (item.latest_episode.episode_number + "화 열기") : "작품 상세";
      return mobile
        ? "<a class='mobile-list-row' href='" + href + "'><img src='" + esc(cover(item.novel)) + "' alt='" + esc(item.novel.title) + " 표지'><div class='mobile-list-row-copy'><div class='mobile-list-row-title'>" + esc(item.novel.title) + "</div><div class='mobile-list-row-meta'>" + esc(meta) + "</div></div></a>"
        : "<article class='library-row'><a class='library-row-thumb' href='" + href + "'><img src='" + esc(cover(item.novel)) + "' alt='" + esc(item.novel.title) + " 표지'></a><div class='library-row-copy'><h3 class='library-row-title'>" + esc(item.novel.title) + "</h3><p class='library-row-meta'>" + esc(meta) + "</p></div><div class='library-row-side'><a class='button small primary' href='" + href + "'>" + esc(action) + "</a></div></article>";
    }).join("") : simpleLibraryEmpty("아직 구매한 작품이 없습니다", "유료 회차를 구매하면 여기서 다시 바로 열 수 있습니다.", links.search, "작품 탐색하기");

    return true;
  }

  function renderMobileLibrary(data, session, displayName) {
    const reading = sortByRecent(data.libraryItems.filter(function (item) {
      return item.state === "reading" || item.last_read_at;
    }));
    const saved = sortByRecent(data.libraryItems.filter(function (item) {
      return item.is_bookmarked;
    }));
    if (renderSimpleLibraryLists(data, displayName, true)) {
      return;
    }

    const owned = sortByRecent(data.purchasedNovels || data.purchases);
    const focus = reading[0] || saved[0] || owned[0] || null;
    const readingCount = data.libraryItems.filter(function (item) { return item.state === "reading"; }).length;
    const savedCount = saved.length;
    const ownedCount = owned.length;
    const alertCount = saved.filter(function (item) { return salePercent(item.novel) > 0; }).length;

    if (q(".page-title")) q(".page-title").textContent = displayName + "님의 서재";
    if (q(".page-subtitle")) q(".page-subtitle").textContent = "Supabase 계정 기준으로 이어 읽기, 찜한 작품, 구매한 번들을 불러옵니다.";

    const focusNode = q(".mobile-focus");
    if (focusNode) {
      if (focus) {
        const focusProgress = focus.episode ? readingProgress(focus) : 0;
        const episodeNumber = focus.episode && focus.episode.episode_number ? focus.episode.episode_number : 1;
        focusNode.innerHTML = "<a class='mobile-row-media' href='" + viewerHref(focus.novel.slug, episodeNumber) + "'><img src='" + cover(focus.novel) + "' alt='" + esc(focus.novel.title) + " 표지'></a><div class='mobile-focus-copy'><span class='free-badge'>" + (focus.episode ? "계속 읽는 중" : focus.purchase_type ? "구매한 작품" : "찜한 작품") + "</span><h2 class='mobile-focus-title'>" + esc(focus.novel.title) + "</h2><p class='book-desc'>" + esc(summary(focus.novel)) + "</p><div class='detail-line'><span class='meta-text'>" + (focus.episode ? "진행률 " + focusProgress + "%" : focus.purchase_type ? "구매가 " + formatMoney(focus.amount_paid || focus.novel.bundle_sale_price || focus.novel.bundle_list_price || 0) : salePercent(focus.novel) ? salePercent(focus.novel) + "% 할인 중" : "알림 대기 중") + "</span><span class='meta-text'>" + (focus.episode ? episodeNumber + "화 / " + (focus.novel.total_episode_count || "-") + "화" : focus.purchase_type ? "재열람 가능" : "찜 목록에서 관리 중") + "</span></div>" + (focus.episode ? "<div class='progress-bar' style='--progress: " + focusProgress + "%;'><div class='progress-fill'></div></div>" : "") + "<div class='button-row'><a class='button primary' href='" + (focus.episode ? viewerHref(focus.novel.slug, episodeNumber) : detailHref(focus.novel.slug)) + "'>" + (focus.episode ? "이어 읽기" : "작품 상세") + "</a><a class='button ghost' href='" + detailHref(focus.novel.slug) + "'>상세 보기</a></div></div>";
      } else {
        focusNode.innerHTML = "<div class='mobile-focus-copy'><span class='muted-badge'>아직 기록이 없습니다</span><h2 class='mobile-focus-title'>첫 작품을 찜하거나 읽기 시작해보세요</h2><p class='book-desc'>상세 화면에서 찜하기를 누르거나, 뷰어를 열면 이 서재가 바로 채워집니다.</p><div class='button-row'><a class='button primary' href='" + links.search + "'>작품 탐색</a><a class='button ghost' href='" + links.home + "'>홈으로 가기</a></div></div>";
      }
    }

    const metricValues = qa(".mobile-metric-value");
    if (metricValues[0]) metricValues[0].textContent = formatCount(readingCount) + "개";
    if (metricValues[1]) metricValues[1].textContent = formatCount(savedCount) + "개";
    if (metricValues[2]) metricValues[2].textContent = formatCount(ownedCount) + "개";
    if (metricValues[3]) metricValues[3].textContent = formatCount(alertCount) + "개";

    const recentList = q("[data-tab-panel='recent'] .mobile-collection-list");
    if (recentList) {
      recentList.innerHTML = reading.length ? reading.map(function (item) {
        const progress = readingProgress(item);
        const episodeNumber = item.episode && item.episode.episode_number ? item.episode.episode_number : 1;
        return "<article class='mobile-row'><a class='mobile-row-media' href='" + viewerHref(item.novel.slug, episodeNumber) + "'><img src='" + cover(item.novel) + "' alt='" + esc(item.novel.title) + " 표지'></a><div class='mobile-row-body'><div class='detail-line'><span class='free-badge'>" + episodeNumber + "화 진행 중</span></div><h3 class='mobile-row-title'>" + esc(item.novel.title) + "</h3><div class='progress-bar' style='--progress: " + progress + "%;'><div class='progress-fill'></div></div><div class='mobile-row-meta'><span>" + episodeNumber + "화 / " + formatCount(item.novel.total_episode_count || 0) + "화</span><span>진행률 " + progress + "%</span></div></div></article>";
      }).join("") : "<div class='empty-library'><strong>아직 이어 읽는 작품이 없습니다</strong><p>뷰어를 열면 최근 읽은 작품이 자동으로 여기에 들어옵니다.</p></div>";
    }

    const savedList = q("[data-tab-panel='saved'] .mobile-collection-list");
    if (savedList) {
      savedList.innerHTML = saved.length ? saved.map(function (item) {
        const percent = salePercent(item.novel);
        return "<article class='mobile-row'><a class='mobile-row-media' href='" + detailHref(item.novel.slug) + "'><img src='" + cover(item.novel) + "' alt='" + esc(item.novel.title) + " 표지'></a><div class='mobile-row-body'><div class='detail-line'>" + (percent ? "<span class='sale-badge'>" + percent + "% 할인 중</span>" : "<span class='muted-badge'>찜한 작품</span>") + "</div><h3 class='mobile-row-title'>" + esc(item.novel.title) + "</h3><p class='mobile-row-copy'>" + esc(summary(item.novel)) + "</p></div></article>";
      }).join("") : "<div class='empty-library'><strong>아직 찜한 작품이 없습니다</strong><p>작품 상세 화면에서 찜하기를 누르면 이 탭에 바로 표시됩니다.</p></div>";
    }

    const ownedList = q("[data-tab-panel='owned'] .mobile-collection-list");
    if (ownedList) {
      ownedList.innerHTML = owned.length ? owned.map(function (item) {
        return "<article class='mobile-row'><a class='mobile-row-media' href='" + detailHref(item.novel.slug) + "'><img src='" + cover(item.novel) + "' alt='" + esc(item.novel.title) + " 표지'></a><div class='mobile-row-body'><div class='detail-line'><span class='muted-badge'>소장 중</span></div><h3 class='mobile-row-title'>" + esc(item.novel.title) + "</h3><p class='mobile-row-copy'>구매가 " + formatMoney(item.amount_paid || item.novel.bundle_sale_price || item.novel.bundle_list_price || 0) + " · 언제든 다시 열람할 수 있습니다.</p></div></article>";
      }).join("") : "<div class='empty-library'><strong>아직 구매한 번들이 없습니다</strong><p>번들 구매 데이터가 들어오면 이 탭에서 바로 관리할 수 있습니다.</p></div>";
    }

    const cta = q(".nav-cta");
    if (cta && focus && focus.episode) cta.href = viewerHref(focus.novel.slug, focus.episode.episode_number || 1);
  }

  function renderPcLibrary(data, session, displayName) {
    const reading = sortByRecent(data.libraryItems.filter(function (item) {
      return item.state === "reading" || item.last_read_at;
    }));
    const saved = sortByRecent(data.libraryItems.filter(function (item) {
      return item.is_bookmarked;
    }));
    if (renderSimpleLibraryLists(data, displayName, false)) {
      return;
    }

    const owned = sortByRecent(data.purchasedNovels || data.purchases);
    const focus = reading[0] || saved[0] || owned[0] || null;
    const readingCount = data.libraryItems.filter(function (item) { return item.state === "reading"; }).length;
    const savedCount = saved.length;
    const ownedCount = owned.length;
    const alertCount = saved.filter(function (item) { return salePercent(item.novel) > 0; }).length;

    if (q(".workspace-title")) q(".workspace-title").textContent = displayName + "님의 서재";
    if (q(".workspace-subtitle")) q(".workspace-subtitle").textContent = "Supabase 계정 기준으로 읽는 작품, 할인 알림, 구매한 번들을 같은 화면에서 관리합니다.";
    const stats = qa(".workspace-stat strong");
    if (stats[0]) stats[0].textContent = formatCount(readingCount) + "개";
    if (stats[1]) stats[1].textContent = formatCount(alertCount) + "개";

    const focusNode = q(".library-focus");
    if (focusNode) {
      if (focus) {
        const progress = focus.episode ? readingProgress(focus) : 0;
        const episodeNumber = focus.episode && focus.episode.episode_number ? focus.episode.episode_number : 1;
        focusNode.innerHTML = "<a class='collection-thumb' href='" + (focus.episode ? viewerHref(focus.novel.slug, episodeNumber) : detailHref(focus.novel.slug)) + "'><img src='" + cover(focus.novel) + "' alt='" + esc(focus.novel.title) + " 표지'></a><div class='library-focus-copy'><span class='free-badge'>" + (focus.episode ? "계속 읽는 중" : focus.purchase_type ? "구매한 작품" : "찜한 작품") + "</span><h2 class='library-focus-title'>" + esc(focus.novel.title) + "</h2><p class='book-desc'>" + esc(summary(focus.novel)) + "</p><div class='detail-line'><span class='meta-text'>" + (focus.episode ? episodeNumber + "화 / " + formatCount(focus.novel.total_episode_count || 0) + "화" : focus.purchase_type ? "구매가 " + formatMoney(focus.amount_paid || focus.novel.bundle_sale_price || focus.novel.bundle_list_price || 0) : salePercent(focus.novel) ? salePercent(focus.novel) + "% 할인 중" : "알림 대기 중") + "</span><span class='meta-text'>" + (focus.episode ? "진행률 " + progress + "%" : focus.purchase_type ? "재열람 가능" : "찜 목록에서 관리 중") + "</span></div>" + (focus.episode ? "<div class='progress-bar' style='--progress: " + progress + "%;'><div class='progress-fill'></div></div>" : "") + "<div class='button-row'><a class='button primary' href='" + (focus.episode ? viewerHref(focus.novel.slug, episodeNumber) : detailHref(focus.novel.slug)) + "'>" + (focus.episode ? "이어 읽기" : "작품 상세") + "</a><a class='button secondary' href='" + detailHref(focus.novel.slug) + "'>상세 보기</a></div></div>";
      } else {
        focusNode.innerHTML = "<div class='library-focus-copy'><span class='muted-badge'>아직 기록이 없습니다</span><h2 class='library-focus-title'>첫 작품을 추가하면 여기서 바로 이어집니다</h2><p class='book-desc'>상세 화면에서 찜하기를 누르거나, 뷰어를 열면 Supabase 서재가 자동으로 채워집니다.</p><div class='button-row'><a class='button primary' href='" + links.search + "'>작품 탐색</a><a class='button secondary' href='" + links.home + "'>홈으로 가기</a></div></div>";
      }
    }

    const facts = qa(".inline-metrics .fact-value");
    if (facts[0]) facts[0].textContent = formatCount(readingCount) + "개";
    if (facts[1]) facts[1].textContent = formatCount(savedCount) + "개";
    if (facts[2]) facts[2].textContent = formatCount(ownedCount) + "개";
    if (facts[3]) facts[3].textContent = formatCount(alertCount) + "개";

    const recentList = q("[data-tab-panel='pc-recent'] .collection-list");
    if (recentList) {
      recentList.innerHTML = reading.length ? reading.map(function (item) {
        const progress = readingProgress(item);
        const episodeNumber = item.episode && item.episode.episode_number ? item.episode.episode_number : 1;
        return "<article class='collection-row'><a class='collection-thumb' href='" + viewerHref(item.novel.slug, episodeNumber) + "'><img src='" + cover(item.novel) + "' alt='" + esc(item.novel.title) + " 표지'></a><div class='collection-copy'><span class='free-badge'>" + episodeNumber + "화 진행 중</span><h3>" + esc(item.novel.title) + "</h3><p>" + esc(summary(item.novel)) + "</p><div class='progress-bar' style='--progress: " + progress + "%;'><div class='progress-fill'></div></div></div><div class='collection-side'><span class='meta-text'>" + progress + "%</span><a class='button small ghost' href='" + viewerHref(item.novel.slug, episodeNumber) + "'>이어 읽기</a></div></article>";
      }).join("") : "<div class='empty-library'><strong>최근 읽은 작품이 없습니다</strong><p>뷰어를 열면 가장 최근 기록이 이곳에 표시됩니다.</p></div>";
    }

    const savedList = q("[data-tab-panel='pc-saved'] .collection-list");
    if (savedList) {
      savedList.innerHTML = saved.length ? saved.map(function (item) {
        const percent = salePercent(item.novel);
        return "<article class='collection-row'><a class='collection-thumb' href='" + detailHref(item.novel.slug) + "'><img src='" + cover(item.novel) + "' alt='" + esc(item.novel.title) + " 표지'></a><div class='collection-copy'>" + (percent ? "<span class='sale-badge'>" + percent + "% 할인 중</span>" : "<span class='muted-badge'>찜한 작품</span>") + "<h3>" + esc(item.novel.title) + "</h3><p>" + esc(summary(item.novel)) + "</p></div><div class='collection-side'><span class='meta-text'>" + (percent ? percent + "% 할인" : "알림 대기") + "</span><a class='button small ghost' href='" + detailHref(item.novel.slug) + "'>상세 보기</a></div></article>";
      }).join("") : "<div class='empty-library'><strong>찜한 작품이 없습니다</strong><p>작품 상세에서 찜하기를 누르면 이 탭에 바로 들어옵니다.</p></div>";
    }

    const ownedList = q("[data-tab-panel='pc-owned'] .collection-list");
    if (ownedList) {
      ownedList.innerHTML = owned.length ? owned.map(function (item) {
        return "<article class='collection-row'><a class='collection-thumb' href='" + detailHref(item.novel.slug) + "'><img src='" + cover(item.novel) + "' alt='" + esc(item.novel.title) + " 표지'></a><div class='collection-copy'><span class='muted-badge'>소장 중</span><h3>" + esc(item.novel.title) + "</h3><p>구매가 " + formatMoney(item.amount_paid || item.novel.bundle_sale_price || item.novel.bundle_list_price || 0) + " · 언제든 다시 읽을 수 있습니다.</p></div><div class='collection-side'><span class='meta-text'>재열람 가능</span><a class='button small ghost' href='" + detailHref(item.novel.slug) + "'>상세 보기</a></div></article>";
      }).join("") : "<div class='empty-library'><strong>구매한 번들이 없습니다</strong><p>실제 구매 데이터가 들어오면 이 탭에서 소장 작품을 바로 확인할 수 있습니다.</p></div>";
    }

    const railSections = qa(".browse-rail .rail-section");
    if (railSections[0]) railSections[0].innerHTML = "<h2 class='rail-title'>오늘의 활동</h2><strong>읽는 작품 " + formatCount(readingCount) + "개</strong><span class='meta-text'>최근 읽은 작품과 찜한 작품 수를 Supabase에서 실시간으로 불러왔습니다.</span>";
    if (railSections[1]) railSections[1].innerHTML = "<h2 class='rail-title'>할인 알림</h2><strong>할인 중인 찜 작품 " + formatCount(alertCount) + "개</strong><span class='meta-text'>찜 목록 안에서 현재 세일 중인 작품 수입니다.</span>";
    if (railSections[2]) railSections[2].innerHTML = "<h2 class='rail-title'>추천 이동</h2><span class='meta-text'>새 작품을 더 담고 싶다면 탐색 화면으로 바로 이어가세요.</span><a class='button small ghost' href='" + links.search + "'>탐색으로 가기</a>";

    const cta = q(".nav-cta");
    if (cta && focus && focus.episode) cta.href = viewerHref(focus.novel.slug, focus.episode.episode_number || 1);
  }
  async function renderLibrary(session) {
    await migrateLocalStateToSupabase(session);
    await mergeRemoteBookmarksIntoLocal(session.user.id);
    const data = await fetchLibraryData(session.user.id);
    const meta = session.user.user_metadata || {};
    const displayName = (data.profile && data.profile.display_name) || meta.display_name || meta.pen_name || meta.full_name || meta.name || session.user.email || "독자";
    renderSignedInCard(session, displayName);
    if (isPc) {
      renderPcLibrary(data, session, displayName);
    } else {
      renderMobileLibrary(data, session, displayName);
    }
  }

  function scheduleLibraryRefresh() {
    if (!isLibraryPage) return;
    window.clearTimeout(libraryRefreshTimer);
    libraryRefreshTimer = window.setTimeout(async function () {
      const result = await client.auth.getSession();
      if (result.data.session) {
        renderLibrary(result.data.session).catch(function (error) {
          console.error("[InkRoad] library refresh failed:", error);
        });
      }
    }, 180);
  }

  async function boot() {
    setBookmarkButtonsToCurrentSlug();
    applyLocalBookmarks();

    if (!base || !window.supabase) {
      if (isLibraryPage) renderConfigMessage();
      return;
    }

    if (!key) {
      if (isLibraryPage) renderConfigMessage();
      return;
    }

    client = window.supabase.createClient(base, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: storage.session
      }
    });

    bindBookmarkSync();
    bindPurchaseFlow();

    client.auth.onAuthStateChange(function (_event, session) {
      syncSessionAccessToken(session);
      if (!session) {
        profileCache = null;
        renderPcTopbarGuest();
        renderMobileTopbar(null);
        if (isLibraryPage) renderAuthGate();
        return;
      }
      if (isAuthPage) {
        window.location.replace(safeRedirectPath(query.get("next"), links.library));
        return;
      }
      renderPcTopbar(session).catch(function (error) {
        console.error("[InkRoad] topbar sync failed:", error);
      });
      renderMobileTopbar(session);
      mergeRemoteBookmarksIntoLocal(session.user.id)
        .then(function () {
          if (isLibraryPage) return renderLibrary(session);
        })
        .catch(function (error) {
          console.error("[InkRoad] auth state sync failed:", error);
        });
    });

    const sessionResult = await client.auth.getSession();
    const session = sessionResult.data.session;
    syncSessionAccessToken(session);
    if (session) {
      await renderPcTopbar(session);
      renderMobileTopbar(session);
    } else {
      renderPcTopbarGuest();
      renderMobileTopbar(null);
    }

    if (isAuthPage) {
      if (session) {
        window.location.replace(safeRedirectPath(query.get("next"), links.library));
      }
      return;
    }

    if (isLibraryPage) {
      if (session) {
        await renderLibrary(session);
      } else {
        renderAuthGate();
      }
    } else if (session) {
      await mergeRemoteBookmarksIntoLocal(session.user.id);
    }

    if (session && isViewerPage) {
      await syncViewerProgress();
    }
  }

  boot().catch(function (error) {
    console.error("[InkRoad] auth/live sync failed:", error);
    if (isLibraryPage && key) {
      renderAuthGate(error.message || "연결 중 오류가 생겼습니다.");
    }
  });
})();
