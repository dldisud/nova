(function () {
  const page = (window.location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  if (page !== "auth") return;

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
    busy: false
  };

  const refs = {
    loginView: document.querySelector("[data-auth-login]"),
    signupView: document.querySelector("[data-auth-signup]"),
    loginForm: document.querySelector("[data-auth-form]"),
    signupForm: document.querySelector("[data-auth-signup-form]"),
    emailInput: document.querySelector("[data-auth-email]"),
    passwordInput: document.querySelector("[data-auth-password]"),
    errorNode: document.querySelector("[data-auth-error]"),
    errorSignupNode: document.querySelector("[data-auth-error-signup]"),
    signupEmailInput: document.querySelector("[data-signup-email]"),
    signupPasswordInput: document.querySelector("[data-signup-password]"),
    signupPasswordConfirmInput: document.querySelector("[data-signup-password-confirm]"),
    signupPenNameInput: document.querySelector("[data-signup-pen-name]"),
    toggleSignupLink: document.querySelector("[data-auth-toggle='signup']"),
    toggleLoginLink: document.querySelector("[data-auth-toggle='login']"),
    authGoogleBtn: document.querySelector("[data-auth-google]"),
    authKakaoBtn: document.querySelector("[data-auth-kakao]")
  };

  function showError(msg, isSignup) {
    const node = isSignup ? refs.errorSignupNode : refs.errorNode;
    if (!node) return;
    node.textContent = msg;
    node.hidden = false;
  }

  function clearError() {
    if (refs.errorNode) refs.errorNode.hidden = true;
    if (refs.errorSignupNode) refs.errorSignupNode.hidden = true;
  }

  function toggleView(mode) {
    clearError();
    if (mode === "signup") {
      refs.loginView.hidden = true;
      refs.signupView.hidden = false;
    } else {
      refs.loginView.hidden = false;
      refs.signupView.hidden = true;
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (state.busy) return;

    const email = refs.emailInput.value.trim();
    const password = refs.passwordInput.value;

    if (!email || !password) {
      showError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    state.busy = true;
    clearError();

    try {
      const { error } = await state.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Redirect handled by supabase-live.js onAuthStateChange
    } catch (err) {
      showError(err.message || "로그인에 실패했습니다.");
    } finally {
      state.busy = false;
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (state.busy) return;

    const email = refs.signupEmailInput.value.trim();
    const password = refs.signupPasswordInput.value;
    const confirm = refs.signupPasswordConfirmInput.value;
    const penName = refs.signupPenNameInput.value.trim();

    if (!email || !password || !confirm || !penName) {
      showError("모든 필드를 입력해주세요.", true);
      return;
    }

    if (password.length < 6) {
      showError("비밀번호는 6자 이상이어야 합니다.", true);
      return;
    }

    if (password !== confirm) {
      showError("비밀번호가 일치하지 않습니다.", true);
      return;
    }

    state.busy = true;
    clearError();

    try {
      const { error } = await state.client.auth.signUp({
        email,
        password,
        options: {
          data: { pen_name: penName }
        }
      });
      if (error) throw error;
      alert("회원가입이 완료되었습니다. 로그인해주세요.");
      toggleView("login");
      refs.emailInput.value = email;
      refs.passwordInput.value = "";
    } catch (err) {
      showError(err.message || "회원가입에 실패했습니다.", true);
    } finally {
      state.busy = false;
    }
  }

  async function handleSocialLogin(provider) {
    try {
      const { error } = await state.client.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin + "/homepage.html"
        }
      });
      if (error) throw error;
    } catch (err) {
      showError(err.message || "소셜 로그인에 실패했습니다.");
    }
  }

  async function boot() {
    if (!base || !key || !window.supabase) {
      alert("Supabase 설정이 필요합니다.");
      return;
    }

    state.client = window.supabase.createClient(base, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: storageKeys.session
      }
    });

    // Event Listeners
    if (refs.loginForm) refs.loginForm.addEventListener("submit", handleLogin);
    if (refs.signupForm) refs.signupForm.addEventListener("submit", handleSignup);
    if (refs.toggleSignupLink) refs.toggleSignupLink.addEventListener("click", () => toggleView("signup"));
    if (refs.toggleLoginLink) refs.toggleLoginLink.addEventListener("click", () => toggleView("login"));
    if (refs.authGoogleBtn) refs.authGoogleBtn.addEventListener("click", () => handleSocialLogin("google"));
    if (refs.authKakaoBtn) refs.authKakaoBtn.addEventListener("click", () => handleSocialLogin("kakao"));
  }

  boot().catch(console.error);
})();
