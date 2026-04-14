(function () {
  const page = (window.location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  if (page !== "payment_pc") return;

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
    authShell: document.querySelector("[data-payment-auth]"),
    dashboard: document.querySelector("[data-payment-dashboard]"),
    balance: document.querySelector("[data-payment-balance]"),
    buyButtons: document.querySelectorAll("[data-payment-buy]")
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

  function formatCoins(amount) {
    return amount.toLocaleString("ko-KR") + " G";
  }

  function setStatus(tier, message, tone) {
    const el = document.querySelector("[data-payment-status='" + tier + "']");
    if (!el) return;
    el.hidden = !message;
    el.className = "payment-status " + (tone || "");
    el.textContent = message || "";
  }

  function clearAllStatus() {
    document.querySelectorAll("[data-payment-status]").forEach(function (el) {
      el.textContent = "";
      el.className = "payment-status";
    });
  }

  function redirectToAuth(mode) {
    window.location.replace("auth_pc.html?next=payment_pc.html" + (mode === "signup" ? "&mode=signup" : ""));
  }

  async function loadUserBalance() {
    if (!state.session || !state.session.user) return;

    try {
      const { data, error } = await state.client
        .from("user_coins")
        .select("balance")
        .eq("user_id", state.session.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("[Payment] Failed to load balance:", error);
        return;
      }

      if (data && refs.balance) {
        refs.balance.textContent = "현재 코인: " + formatCoins(data.balance || 0);
      }
    } catch (err) {
      console.error("[Payment] Load balance error:", err);
    }
  }

  async function handlePurchase(tier, amount) {
    if (state.busy) return;
    if (!state.session || !state.session.user) {
      alert("결제를 하려면 로그인이 필요합니다.");
      redirectToAuth();
      return;
    }

    state.busy = true;
    clearAllStatus();
    setStatus(tier, "결제 처리 중...", "info");

    // Disable the button temporarily
    const btn = document.querySelector("[data-payment-buy][data-tier='" + tier + "']");
    if (btn) btn.disabled = true;

    try {
      // Create a coin purchase record in the database
      const { data, error } = await state.client
        .from("coin_purchases")
        .insert({
          user_id: state.session.user.id,
          tier: parseInt(tier),
          amount: parseInt(amount),
          status: "pending",
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // In a real implementation, this would redirect to PG (payment gateway)
      // For now, we'll simulate a successful purchase
      setStatus(tier, "결제가 완료되었습니다! " + formatCoins(parseInt(tier)) + " 코인이 충전됩니다.", "success");

      // Update user's coin balance
      const { error: updateError } = await state.client.rpc("add_user_coins", {
        p_user_id: state.session.user.id,
        p_amount: parseInt(tier)
      });

      if (updateError) {
        console.error("[Payment] Failed to update coins:", updateError);
        setStatus(tier, "코인 충전 중 오류가 발생했습니다. 관리자에게 문의하세요.", "error");
      } else {
        // Reload balance
        await loadUserBalance();
      }

      // Update purchase status
      await state.client
        .from("coin_purchases")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", data.id);

    } catch (err) {
      console.error("[Payment] Purchase error:", err);
      setStatus(tier, "결제 실패: " + (err.message || "알 수 없는 오류"), "error");
    } finally {
      state.busy = false;
      if (btn) btn.disabled = false;
    }
  }

  function showDashboard(visible) {
    if (refs.dashboard) refs.dashboard.hidden = !visible;
  }

  function renderSignedIn(session) {
    state.session = session;
    showDashboard(true);
    loadUserBalance();
  }

  function bindEvents() {
    refs.buyButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const tier = this.dataset.tier;
        const amount = this.dataset.amount;
        if (tier && amount) {
          handlePurchase(tier, amount);
        }
      });
    });
  }

  async function refreshSession() {
    if (!state.client) return;
    const { data } = await state.client.auth.getSession();
    if (data.session) {
      renderSignedIn(data.session);
    } else {
      showDashboard(false);
      if (refs.authShell) {
        refs.authShell.innerHTML =
          "<div class='creator-empty'>" +
          "<h3>로그인이 필요합니다</h3>" +
          "<p>코인을 충전하려면 먼저 로그인하세요.</p>" +
          "<a class='button primary' href='auth_pc.html?next=payment_pc.html'>로그인</a>" +
          "</div>";
      }
    }
  }

  async function boot() {
    if (!refs.dashboard) return;

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
        if (refs.authShell) {
          refs.authShell.innerHTML =
            "<div class='creator-empty'>" +
            "<h3>로그인이 필요합니다</h3>" +
            "<p>코인을 충전하려면 먼저 로그인하세요.</p>" +
            "<a class='button primary' href='auth_pc.html?next=payment_pc.html'>로그인</a>" +
            "</div>";
        }
      }
    });

    bindEvents();
    await refreshSession();
  }

  boot().catch(function (error) {
    console.error("[Payment] Boot failed:", error);
  });
})();
