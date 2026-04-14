(function () {
  const page = (window.location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  if (page !== "payment") return;

  const cfg = window.inkroadSupabaseConfig || {};
  const base = (cfg.url || "").replace(/\/$/, "");
  const key = cfg.publishableKey || cfg.anonKey || "";

  const state = {
    client: null,
    session: null,
    busy: false
  };

  const refs = {
    shell: document.querySelector("[data-payment-shell]"),
    balance: document.querySelector("[data-payment-balance]"),
    buyBtns: document.querySelectorAll("[data-payment-buy]")
  };

  function formatCoins(n) {
    return Number(n || 0).toLocaleString("ko-KR") + " G";
  }

  async function loadBalance() {
    if (!state.session || !state.session.user) return;
    try {
      const { data } = await state.client
        .from("user_coins")
        .select("balance")
        .eq("user_id", state.session.user.id)
        .single();
      if (data && refs.balance) {
        refs.balance.textContent = formatCoins(data.balance);
      }
    } catch (err) {
      console.warn("[Payment] Failed to load balance:", err);
    }
  }

  async function handlePurchase(tier, amount) {
    if (state.busy) return;
    if (!state.session || !state.session.user) {
      alert("로그인이 필요합니다.");
      window.location.replace("auth.html?next=payment.html");
      return;
    }

    state.busy = true;
    if (!confirm(tier + " G 코인을 ₩" + Number(amount).toLocaleString() + "에 충전하시겠습니까?")) {
      state.busy = false;
      return;
    }

    try {
      const { error: insertError } = await state.client
        .from("coin_purchases")
        .insert({
          user_id: state.session.user.id,
          tier: parseInt(tier),
          amount: parseInt(amount),
          status: "completed",
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      const { error: updateError } = await state.client.rpc("add_user_coins", {
        p_user_id: state.session.user.id,
        p_amount: parseInt(tier)
      });

      if (updateError) throw updateError;

      alert("충전이 완료되었습니다! (" + formatCoins(tier) + ")");
      await loadBalance();
    } catch (err) {
      alert("결제 실패: " + (err.message || "알 수 없는 오류"));
    } finally {
      state.busy = false;
    }
  }

  async function boot() {
    if (!base || !key || !window.supabase) return;

    state.client = window.supabase.createClient(base, key, {
      auth: { persistSession: true, storageKey: "inkroad-supabase-auth" }
    });

    const { data } = await state.client.auth.getSession();
    if (data.session) {
      state.session = data.session;
      loadBalance();
    } else {
      window.location.replace("auth.html?next=payment.html");
    }

    refs.buyBtns.forEach(function(btn) {
      btn.addEventListener("click", function() {
        const tier = this.closest("[data-tier]").dataset.tier;
        const amount = this.closest("[data-tier]").dataset.amount;
        if (tier && amount) handlePurchase(tier, amount);
      });
    });
  }

  boot().catch(console.error);
})();
