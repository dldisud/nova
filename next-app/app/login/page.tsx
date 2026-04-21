"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.push("/studio");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--ink-bg)] px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-[var(--ink-gold)]">
            INKROAD
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-fg-3)]">
            작가를 위한 창작 플랫폼
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--ink-fg-2)]">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="h-12 w-full rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] px-4 text-sm text-[var(--ink-fg-1)] placeholder-[var(--ink-fg-3)] outline-none transition-colors focus:border-[var(--ink-gold)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--ink-fg-2)]">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="h-12 w-full rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] px-4 text-sm text-[var(--ink-fg-1)] placeholder-[var(--ink-fg-3)] outline-none transition-colors focus:border-[var(--ink-gold)]"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-[var(--ink-danger)]/10 px-4 py-3 text-sm text-[var(--ink-danger)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-[var(--ink-gold)] text-sm font-bold text-[var(--ink-fg-on-gold)] transition-all hover:bg-[var(--ink-gold-hover)] disabled:opacity-50"
          >
            {loading
              ? "처리 중..."
              : mode === "login"
                ? "로그인"
                : "회원가입"}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="text-center">
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-sm text-[var(--ink-fg-3)] hover:text-[var(--ink-gold)]"
          >
            {mode === "login"
              ? "계정이 없으신가요? 회원가입"
              : "이미 계정이 있으신가요? 로그인"}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--ink-border-white)]" />
          <span className="text-[10px] text-[var(--ink-fg-3)]">또는</span>
          <div className="h-px flex-1 bg-[var(--ink-border-white)]" />
        </div>

        {/* Demo access */}
        <button
          onClick={() => router.push("/studio")}
          className="h-10 w-full rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] text-xs font-semibold text-[var(--ink-fg-3)] transition-all hover:bg-[var(--ink-surface-2)] hover:text-[var(--ink-fg-1)]"
        >
          🔓 로그인 없이 둘러보기
        </button>
      </div>
    </div>
  );
}
