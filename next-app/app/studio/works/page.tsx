"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createAuthorRepository } from "@/lib/creator/repository";
import type { AuthorRepository, AuthorWorkSummary } from "@/lib/types";

export default function WorksPage() {
  const [works, setWorks] = useState<AuthorWorkSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    createAuthorRepository().then((r) => {
      r.listWorks().then((w) => {
        if (!active) return;
        setWorks(w);
        setLoading(false);
      });
    });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--ink-gold)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-[var(--ink-fg-1)]">
          작품 관리
        </h1>
      </div>

      {works.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--ink-border)] bg-[var(--ink-surface)] py-20">
          <span className="text-4xl">📖</span>
          <p className="text-[var(--ink-fg-3)]">아직 등록된 작품이 없습니다</p>
          <p className="text-sm text-[var(--ink-fg-3)]">Supabase에 작품을 등록한 후 이곳에서 관리할 수 있습니다.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((work) => (
            <Link
              key={work.id}
              href={`/studio/works/${work.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] transition-all hover:border-[var(--ink-gold)]/30 hover:shadow-lg hover:shadow-[var(--ink-gold)]/5"
            >
              {/* Cover */}
              <div className="relative h-40 w-full overflow-hidden bg-[var(--ink-hero)]">
                {work.coverUrl && work.coverUrl !== "/placeholder.png" ? (
                  <img
                    src={work.coverUrl}
                    alt={work.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl text-[var(--ink-fg-3)]">
                    📖
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold backdrop-blur-md ${
                      work.status === "연재중"
                        ? "bg-[var(--ink-free-bright)]/20 text-[var(--ink-free-bright)]"
                        : "bg-black/40 text-[var(--ink-fg-3)]"
                    }`}
                  >
                    {work.status}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="text-sm font-bold text-[var(--ink-fg-1)] group-hover:text-[var(--ink-gold)]">
                  {work.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-fg-3)]">
                  <span>{work.totalEpisodes}화</span>
                  {work.totalViews != null && work.totalViews > 0 && (
                    <span>조회 {work.totalViews.toLocaleString()}</span>
                  )}
                  {work.draftCount != null && work.draftCount > 0 && (
                    <span className="text-[var(--ink-gold)]">초안 {work.draftCount}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
