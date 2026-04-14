(function () {
  const page = (window.location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  if (page !== "profile_settings_pc") return;

  const cfg = window.inkroadSupabaseConfig || {};
  const base = (cfg.url || "").replace(/\/$/, "");
  const key = cfg.publishableKey || cfg.anonKey || "";
  const storageKeys = {
    session: "inkroad-supabase-auth",
    accessToken: "inkroad-supabase-access-token",
    profile: "inkroad-profile-settings"
  };

  const state = {
    client: null,
    session: null,
    profile: null,
    busy: false
  };

  const refs = {
    authShell: document.querySelector("[data-profile-auth]"),
    dashboard: document.querySelector("[data-profile-dashboard]"),
    form: document.querySelector("[data-profile-form]"),
    penName: document.querySelector("[data-profile-pen-name]"),
    bio: document.querySelector("[data-profile-bio]"),
    profileStatus: document.querySelector("[data-profile-status]"),
    profileSave: document.querySelector("[data-profile-save]"),
    nameDisplay: document.querySelector("[data-profile-name]"),
    emailDisplay: document.querySelector("[data-profile-email]"),
    joinedDisplay: document.querySelector("[data-profile-joined]"),
    // Notifications
    notifyComments: document.querySelector("[data-profile-notify-comments]"),
    notifyReplies: document.querySelector("[data-profile-notify-replies]"),
    notifyLikes: document.querySelector("[data-profile-notify-likes]"),
    notifySales: document.querySelector("[data-profile-notify-sales]"),
    notifyPurchases: document.querySelector("[data-profile-notify-purchases]"),
    notifyEmail: document.querySelector("[data-profile-notify-email]"),
    notificationSave: document.querySelector("[data-notification-save]"),
    notificationStatus: document.querySelector("[data-notification-status]"),
    // Account
    accountEmail: document.querySelector("[data-profile-account-email]"),
    accountStatus: document.querySelector("[data-profile-account-status]"),
    language: document.querySelector("[data-profile-language]"),
    authorMode: document.querySelector("[data-profile-author-mode]"),
    accountSave: document.querySelector("[data-account-save]"),
    accountStatus: document.querySelector("[data-account-status]"),
    // Danger
    deleteAccount: document.querySelector("[data-delete-account]")
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

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    } catch (_) {
      return dateStr;
    }
  }

  function setStatus(el, message, tone) {
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      el.removeAttribute("data-tone");
      return;
    }
    el.hidden = false;
    el.setAttribute("data-tone", tone || "info");
    el.textContent = message;
  }

  function redirectToAuth(mode) {
    const name = window.location.pathname.split("/").pop() || "profile_settings_pc.html";
    window.location.replace("auth_pc.html?next=" + encodeURIComponent(name) + (mode === "signup" ? "&mode=signup" : ""));
  }

  async function loadProfile() {
    if (!state.session || !state.session.user) return;

    const user = state.session.user;

    // Display basic info
    if (refs.nameDisplay) refs.nameDisplay.textContent = user.user_metadata?.pen_name || user.email?.split("@")[0] || "-";
    if (refs.emailDisplay) refs.emailDisplay.textContent = user.email || "-";
    if (refs.joinedDisplay) refs.joinedDisplay.textContent = formatDate(user.created_at);

    // Load profile from database
    try {
      const { data, error } = await state.client
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found, create one
        console.log("[Profile] No profile found, will create on save");
        return;
      }

      if (data) {
        state.profile = data;
        if (refs.penName) refs.penName.value = data.pen_name || "";
        if (refs.bio) refs.bio.value = data.bio || "";
        if (refs.language) refs.language.value = data.language || "ko";
        if (refs.authorMode) refs.authorMode.value = data.author_mode || "creator";
        // Notifications
        if (refs.notifyComments) refs.notifyComments.checked = data.notify_comments !== false;
        if (refs.notifyReplies) refs.notifyReplies.checked = data.notify_replies !== false;
        if (refs.notifyLikes) refs.notifyLikes.checked = data.notify_likes !== false;
        if (refs.notifySales) refs.notifySales.checked = data.notify_sales !== false;
        if (refs.notifyPurchases) refs.notifyPurchases.checked = data.notify_purchases !== false;
        if (refs.notifyEmail) refs.notifyEmail.checked = data.notify_email === true;
        // Account
        if (refs.accountEmail) refs.accountEmail.value = user.email || "";
        if (refs.accountStatus) {
          const statusMap = { active: "활성", inactive: "비활성", suspended: "정지", deleted: "삭제됨" };
          refs.accountStatus.value = statusMap[user.user_metadata?.status || "active"] || "활성";
        }
      }
    } catch (err) {
      console.error("[Profile] Load error:", err);
    }
  }

  async function saveProfile(event) {
    if (event) event.preventDefault();
    if (state.busy) return;
    if (!state.session || !state.session.user) return;

    state.busy = true;
    refs.profileSave.disabled = true;
    setStatus(refs.profileStatus, "저장 중...", "info");

    const penName = refs.penName ? refs.penName.value.trim() : "";
    if (!penName || penName.length < 2 || penName.length > 20) {
      setStatus(refs.profileStatus, "닉네임은 2~20자여야 합니다.", "error");
      state.busy = false;
      refs.profileSave.disabled = false;
      return;
    }

    const bio = refs.bio ? refs.bio.value.trim() : "";

    try {
      // Update user_metadata
      const { error: metaError } = await state.client.auth.updateUser({
        data: { pen_name: penName }
      });
      if (metaError) throw metaError;

      // Upsert profile
      const { error: profileError } = await state.client
        .from("user_profiles")
        .upsert({
          user_id: state.session.user.id,
          pen_name: penName,
          bio: bio,
          language: refs.language ? refs.language.value : "ko",
          author_mode: refs.authorMode ? refs.authorMode.value : "creator",
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (profileError) throw profileError;

      state.profile = { pen_name: penName, bio: bio };
      if (refs.nameDisplay) refs.nameDisplay.textContent = penName;
      setStatus(refs.profileStatus, "프로필이 저장되었습니다.", "success");
    } catch (err) {
      console.error("[Profile] Save error:", err);
      setStatus(refs.profileStatus, "저장 실패: " + (err.message || "알 수 없는 오류"), "error");
    } finally {
      state.busy = false;
      refs.profileSave.disabled = false;
    }
  }

  async function saveNotifications() {
    if (state.busy) return;
    if (!state.session || !state.session.user) return;

    state.busy = true;
    setStatus(refs.notificationStatus, "저장 중...", "info");

    const settings = {
      user_id: state.session.user.id,
      notify_comments: refs.notifyComments ? refs.notifyComments.checked : true,
      notify_replies: refs.notifyReplies ? refs.notifyReplies.checked : true,
      notify_likes: refs.notifyLikes ? refs.notifyLikes.checked : true,
      notify_sales: refs.notifySales ? refs.notifySales.checked : true,
      notify_purchases: refs.notifyPurchases ? refs.notifyPurchases.checked : true,
      notify_email: refs.notifyEmail ? refs.notifyEmail.checked : false,
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await state.client
        .from("user_profiles")
        .upsert(settings, { onConflict: "user_id" });

      if (error) throw error;

      setStatus(refs.notificationStatus, "알림 설정이 저장되었습니다.", "success");
    } catch (err) {
      console.error("[Notifications] Save error:", err);
      setStatus(refs.notificationStatus, "저장 실패: " + (err.message || "알 수 없는 오류"), "error");
    } finally {
      state.busy = false;
    }
  }

  async function saveAccount() {
    if (state.busy) return;
    if (!state.session || !state.session.user) return;

    state.busy = true;
    setStatus(refs.accountStatus, "저장 중...", "info");

    try {
      const { error } = await state.client
        .from("user_profiles")
        .upsert({
          user_id: state.session.user.id,
          language: refs.language ? refs.language.value : "ko",
          author_mode: refs.authorMode ? refs.authorMode.value : "creator",
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (error) throw error;

      setStatus(refs.accountStatus, "계정 설정이 저장되었습니다.", "success");
    } catch (err) {
      console.error("[Account] Save error:", err);
      setStatus(refs.accountStatus, "저장 실패: " + (err.message || "알 수 없는 오류"), "error");
    } finally {
      state.busy = false;
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("정말로 계정을 탈퇴하시겠습니까?\n\n모든 작품과 데이터가 영구적으로 삭제되며, 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    if (!confirm("다시 확인합니다. 정말로 탈퇴하시겠습니까?")) {
      return;
    }

    if (!state.session || !state.session.user) return;

    try {
      const { error } = await state.client
        .from("user_profiles")
        .delete()
        .eq("user_id", state.session.user.id);

      if (error) throw error;

      await state.client.auth.signOut();
      window.location.replace("homepage_pc.html");
    } catch (err) {
      console.error("[Account] Delete error:", err);
      alert("계정 탈퇴 중 오류가 발생했습니다: " + (err.message || "알 수 없는 오류"));
    }
  }

  function showDashboard(visible) {
    if (refs.dashboard) refs.dashboard.hidden = !visible;
  }

  function renderSignedIn(session) {
    state.session = session;
    showDashboard(true);
    loadProfile();
  }

  async function refreshSession() {
    if (!state.client) return;
    const { data } = await state.client.auth.getSession();
    if (data.session) {
      renderSignedIn(data.session);
    } else {
      showDashboard(false);
      redirectToAuth();
    }
  }

  function bindEvents() {
    if (refs.form) refs.form.addEventListener("submit", saveProfile);
    if (refs.notificationSave) refs.notificationSave.addEventListener("click", saveNotifications);
    if (refs.accountSave) refs.accountSave.addEventListener("click", saveAccount);
    if (refs.deleteAccount) refs.deleteAccount.addEventListener("click", handleDeleteAccount);
  }

  async function boot() {
    if (!base || !key || !window.supabase || !window.supabase.createClient) {
      if (refs.authShell) {
        refs.authShell.innerHTML = "<p>Supabase 설정이 필요합니다.</p>";
      }
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
      if (session) {
        renderSignedIn(session);
      } else {
        showDashboard(false);
        redirectToAuth();
      }
    });

    bindEvents();
    await refreshSession();
  }

  boot().catch(function (error) {
    console.error("[Profile Settings] Boot failed:", error);
  });
})();
