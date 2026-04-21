"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createAuthorRepository } from "@/lib/creator/repository";
import type { AuthorDashboardSummary, AuthorRepository, AuthorWorkSummary } from "@/lib/types";

export default function StudioDashboard() {
  const [repo, setRepo] = useState<AuthorRepository | null>(null);
  const [dashboard, setDashboard] = useState<AuthorDashboardSummary | null>(null);
  const [works, setWorks] = useState<AuthorWorkSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    createAuthorRepository().then((r) => {
      if (!active) return;
      setRepo(r);
      Promise.all([r.getDashboardSummary(), r.listWorks()]).then(([d, w]) => {
        if (!active) return;
        setDashboard(d);
        setWorks(w);
        setLoading(false);
      });
    });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--ink-gold)] border-t-transparent" />
          <p className="text-sm text-[var(--ink-fg-3)]">스튜디오 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--ink-fg-1)]">
            작가 대시보드
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-fg-3)]">
            {dashboard?.activePenName ?? "작가"} 님, 환영합니다
          </p>
        </div>
        {dashboard && dashboard.penNames.length > 1 && (
          <div className="hidden items-center gap-2 sm:flex">
            {dashboard.penNames.map((name) => (
              <button
                key={name}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  name === dashboard.activePenName
                    ? "bg-[var(--ink-gold)] text-[var(--ink-fg-on-gold)]"
                    : "bg-[var(--ink-surface-2)] text-[var(--ink-fg-3)] hover:text-[var(--ink-fg-1)]"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      {dashboard && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="총 조회수"
            value={dashboard.totalViews.toLocaleString()}
            icon="👁"
          />
          <StatCard
            label="이번 주"
            value={dashboard.weeklyViews.toLocaleString()}
            icon="📈"
            accent
          />
          <StatCard
            label="미완성 초안"
            value={String(dashboard.draftCount)}
            icon="📝"
            warning={dashboard.draftCount > 5}
          />
          <StatCard
            label="연속 연재"
            value={`${dashboard.streak}일`}
            icon="🔥"
            accent={dashboard.streak >= 7}
          />
        </div>
      )}

      {/* Revenue & Schedule row */}
      {dashboard && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Revenue card */}
          <div className="rounded-2xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--ink-fg-2)]">
                <span>💰</span> 수익 현황
              </h2>
              <span className="text-xs text-[var(--ink-fg-3)]">
                정산일: {dashboard.settlementDate}
              </span>
            </div>
            <div className="flex items-end gap-6">
              <div>
                <p className="text-xs text-[var(--ink-fg-3)]">이번 달</p>
                <p className="text-2xl font-black text-[var(--ink-gold)]">
                  ₩{dashboard.monthlyRevenue.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--ink-fg-3)]">누적 수익</p>
                <p className="text-lg font-bold text-[var(--ink-fg-1)]">
                  ₩{dashboard.totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Schedule card */}
          <div className="rounded-2xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--ink-fg-2)]">
                <span>📅</span> 연재 스케줄
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-xl bg-[var(--ink-surface-2)] px-4 py-3">
                <span className="text-sm text-[var(--ink-fg-2)]">연재 주기</span>
                <span className="text-sm font-bold text-[var(--ink-fg-1)]">
                  {dashboard.cadence}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-[var(--ink-surface-2)] px-4 py-3">
                <span className="text-sm text-[var(--ink-fg-2)]">다음 마감</span>
                <span className="text-sm font-bold text-[var(--ink-gold)]">
                  {dashboard.nextDue}
                </span>
              </div>
              {dashboard.overdueWarning && (
                <div className="flex items-center gap-2 rounded-xl bg-[var(--ink-danger)]/10 px-4 py-3">
                  <span>⚠️</span>
                  <span className="text-sm font-bold text-[var(--ink-danger)]">
                    {dashboard.overdueWarning}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* My Works */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--ink-fg-1)]">내 작품</h2>
          <Link
            href="/studio/works"
            className="text-xs font-semibold text-[var(--ink-gold)] hover:underline"
          >
            전체 보기 →
          </Link>
        </div>
        {works.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--ink-border)] bg-[var(--ink-surface)] py-16">
            <span className="text-3xl">📖</span>
            <p className="text-sm text-[var(--ink-fg-3)]">아직 등록된 작품이 없습니다</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({
  label,
  value,
  icon,
  accent,
  warning,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        warning
          ? "border-[var(--ink-danger)]/30 bg-[var(--ink-danger)]/5"
          : "border-[var(--ink-border-white)] bg-[var(--ink-surface)]"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-medium text-[var(--ink-fg-3)]">{label}</span>
      </div>
      <p
        className={`text-xl font-black ${
          accent
            ? "text-[var(--ink-gold)]"
            : warning
              ? "text-[var(--ink-danger)]"
              : "text-[var(--ink-fg-1)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function WorkCard({ work }: { work: AuthorWorkSummary }) {
  return (
    <Link
      href={`/studio/works/${work.id}`}
      className="group flex gap-4 rounded-2xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] p-4 transition-all hover:border-[var(--ink-gold)]/30 hover:bg-[var(--ink-surface-2)]"
    >
      <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-[var(--ink-hero)]">
        {work.coverUrl && work.coverUrl !== "/placeholder.png" ? (
          <img
            src={work.coverUrl}
            alt={work.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg text-[var(--ink-fg-3)]">
            📖
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              work.status === "연재중"
                ? "bg-[var(--ink-free-bright)]/12 text-[var(--ink-free-bright)]"
                : "bg-[var(--ink-surface-3)] text-[var(--ink-fg-3)]"
            }`}
          >
            {work.status}
          </span>
        </div>
        <h3 className="text-sm font-bold text-[var(--ink-fg-1)] group-hover:text-[var(--ink-gold)]">
          {work.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-[var(--ink-fg-3)]">
          <span>{work.totalEpisodes}화</span>
          {work.totalViews != null && work.totalViews > 0 && (
            <>
              <span>·</span>
              <span>조회 {work.totalViews.toLocaleString()}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
