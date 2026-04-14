(function () {
  const page = (window.location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  if (page !== "profile_settings") return;

  const cfg = window.inkroadSupabaseConfig || {};
  const base = (cfg.url || "").replace(/\/$/, "");
  const key = cfg.publishableKey || cfg.anonKey || "";

  const state = {
    client: null,
    session: null
  };

  const refs = {
    shell: document.querySelector("[data-profile-shell]"),
    penNameInput: document.querySelector("[data-profile-pen-name]"),
    bioInput: document.querySelector("[data-profile-bio]"),
    saveBtn: document.querySelector("[data-profile-save]"),
    status: document.querySelector("[data-profile-status]"),
    notifyComments: document.querySelector("[data-profile-notify-comments]"),
    notifyLikes: document.querySelector("[data-profile-notify-likes]"),
    notifySales: document.querySelector("[data-profile-notify-sales]"),
    notifSaveBtn: document.querySelector("[data-notification-save]"),
    notifStatus: document.querySelector("[data-notification-status]"),
    logoutBtn: document.querySelector("[data-profile-logout]"),
    deleteBtn: document.querySelector("[data-profile-delete]")
  };

  function setStatus(el, msg, tone) {
    if (!el) return;
    el.textContent = msg;
    el.hidden = !msg;
    if (tone) el.style.color = tone === "error" ? "#f87171" : "#4ade80";
  }

  async function loadProfile() {
    if (!state.session || !state.session.user) return;
    const user = state.session.user;

    if (refs.penNameInput) refs.penNameInput.value = user.user_metadata?.pen_name || user.email?.split("@")[0] || "";
    if (refs.bioInput) refs.bioInput.value = user.user_metadata?.bio || "";

    try {
      const { data, error } = await state.client
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        if (refs.notifyComments) refs.notifyComments.checked = data.notify_comments !== false;
        if (refs.notifyLikes) refs.notifyLikes.checked = data.notify_likes !== false;
        if (refs.notifySales) refs.notifySales.checked = data.notify_sales !== false;
      }
    } catch (err) {
      console.warn("[Profile] Failed to load profile data:", err);
    }
  }

  async function handleSaveProfile() {
    if (!state.session || !state.session.user) return;
    if (refs.saveBtn) refs.saveBtn.disabled = true;
    setStatus(refs.status, "저장 중...", "#d4bc8a");

    try {
      const { error: metaError } = await state.client.auth.updateUser({
        data: { pen_name: refs.penNameInput.value.trim(), bio: refs.bioInput.value.trim() }
      });
      if (metaError) throw metaError;

      const { error } = await state.client
        .from("user_profiles")
        .upsert({
          user_id: state.session.user.id,
          pen_name: refs.penNameInput.value.trim(),
          bio: refs.bioInput.value.trim(),
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (error) throw error;
      setStatus(refs.status, "저장되었습니다.", "#4ade80");
    } catch (err) {
      setStatus(refs.status, "실패: " + (err.message || "알 수 없는 오류"), "#f87171");
    } finally {
      if (refs.saveBtn) refs.saveBtn.disabled = false;
    }
  }

  async function handleSaveNotifications() {
    if (!state.session || !state.session.user) return;
    if (refs.notifSaveBtn) refs.notifSaveBtn.disabled = true;
    setStatus(refs.notifStatus, "저장 중...", "#d4bc8a");

    try {
      const { error } = await state.client
        .from("user_profiles")
        .upsert({
          user_id: state.session.user.id,
          notify_comments: refs.notifyComments ? refs.notifyComments.checked : true,
          notify_likes: refs.notifyLikes ? refs.notifyLikes.checked : true,
          notify_sales: refs.notifySales ? refs.notifySales.checked : true,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (error) throw error;
      setStatus(refs.notifStatus, "저장되었습니다.", "#4ade80");
    } catch (err) {
      setStatus(refs.notifStatus, "실패: " + (err.message || "알 수 없는 오류"), "#f87171");
    } finally {
      if (refs.notifSaveBtn) refs.notifSaveBtn.disabled = false;
    }
  }

  async function handleLogout() {
    if (state.client) await state.client.auth.signOut();
    window.location.replace("auth.html");
  }

  async function handleDeleteAccount() {
    if (!confirm("정말로 계정을 탈퇴하시겠습니까?\n모든 데이터가 삭제됩니다.")) return;
    if (state.client) await state.client.auth.signOut();
    window.location.replace("auth.html");
  }

  async function boot() {
    if (!base || !key || !window.supabase) return;

    state.client = window.supabase.createClient(base, key, {
      auth: { persistSession: true, storageKey: "inkroad-supabase-auth" }
    });

    const { data } = await state.client.auth.getSession();
    if (data.session) {
      state.session = data.session;
      loadProfile();
    } else {
      window.location.replace("auth.html?next=profile_settings.html");
    }

    if (refs.saveBtn) refs.saveBtn.addEventListener("click", handleSaveProfile);
    if (refs.notifSaveBtn) refs.notifSaveBtn.addEventListener("click", handleSaveNotifications);
    if (refs.logoutBtn) refs.logoutBtn.addEventListener("click", handleLogout);
    if (refs.deleteBtn) refs.deleteBtn.addEventListener("click", handleDeleteAccount);
  }

  boot().catch(console.error);
})();
