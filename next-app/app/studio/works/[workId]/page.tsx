"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createAuthorRepository } from "@/lib/creator/repository";
import type {
  AuthorEpisodeHistoryEntry,
  AuthorEpisodeSummary,
  AuthorReaction,
  AuthorRepository,
  AuthorWorkMeta,
  AuthorWorkSummary,
  AgeRating,
  PublishStatus,
} from "@/lib/types";

const STATUS_TABS: { key: "all" | PublishStatus; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "draft", label: "초안" },
  { key: "scheduled", label: "예약" },
  { key: "published", label: "발행" },
];

const AGE_RATING_OPTIONS: { key: AgeRating; label: string }[] = [
  { key: "all", label: "전체이용가" },
  { key: "15", label: "15세 이상" },
  { key: "18", label: "18세 이상" },
];

type SortOrder = "newest" | "oldest";

export default function WorkDetailPage() {
  const params = useParams<{ workId: string }>();
  const workId = params.workId;

  const [repo, setRepo] = useState<AuthorRepository | null>(null);
  const [work, setWork] = useState<AuthorWorkSummary | null>(null);
  const [episodes, setEpisodes] = useState<AuthorEpisodeSummary[]>([]);
  const [workMeta, setWorkMeta] = useState<AuthorWorkMeta | null>(null);
  const [reactions, setReactions] = useState<AuthorReaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"all" | PublishStatus>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [metaForm, setMetaForm] = useState<AuthorWorkMeta | null>(null);
  const [historyModal, setHistoryModal] = useState<{
    episode: AuthorEpisodeSummary;
    entries: AuthorEpisodeHistoryEntry[];
  } | null>(null);

  useEffect(() => {
    let active = true;
    createAuthorRepository().then((r) => {
      if (!active) return;
      setRepo(r);
      Promise.all([
        r.getWork(workId),
        r.getWorkMeta(workId),
        r.listEpisodes(workId),
        r.listReaderReactions(workId),
      ]).then(([w, m, e, rx]) => {
        if (!active) return;
        setWork(w);
        setWorkMeta(m);
        setMetaForm(m);
        setEpisodes(e);
        setReactions(rx);
        setLoading(false);
      });
    });
    return () => {
      active = false;
    };
  }, [workId]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--ink-gold)] border-t-transparent" />
      </div>
    );
  }

  if (!work) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <span className="text-3xl">❌</span>
        <p className="text-lg font-bold text-[var(--ink-fg-1)]">작품을 찾지 못했어요</p>
        <Link href="/studio/works" className="text-sm text-[var(--ink-gold)] hover:underline">
          ← 작품 목록으로
        </Link>
      </div>
    );
  }

  const sorted = [...episodes].sort((a, b) =>
    sortOrder === "newest" ? b.number - a.number : a.number - b.number,
  );

  const filtered = sorted.filter((ep) => {
    const matchesTab = activeTab === "all" || ep.publishStatus === activeTab;
    const matchesSearch =
      searchQuery.trim() === "" || ep.title.includes(searchQuery.trim());
    return matchesTab && matchesSearch;
  });

  const counts = {
    all: episodes.length,
    draft: episodes.filter((e) => e.publishStatus === "draft").length,
    scheduled: episodes.filter((e) => e.publishStatus === "scheduled").length,
    published: episodes.filter((e) => e.publishStatus === "published").length,
  };

  async function handleHistory(episode: AuthorEpisodeSummary) {
    if (!repo) return;
    const entries = await repo.listEpisodeHistory(
      work!.id,
      episode.id.startsWith(`${work!.id}-draft-new`) ? undefined : episode.id,
    );
    setHistoryModal({ episode, entries });
  }

  async function handleSaveMeta() {
    if (!metaForm || !repo) return;
    const next = await repo.saveWorkMeta(work!.id, metaForm);
    if (next) {
      setWorkMeta(next);
      setMetaForm(next);
    }
    setShowMetaModal(false);
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--ink-fg-3)]">
        <Link href="/studio/works" className="hover:text-[var(--ink-fg-1)]">
          작품 관리
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--ink-fg-1)]">{work.title}</span>
      </div>

      {/* Work Meta Card */}
      <div className="overflow-hidden rounded-2xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--ink-border-soft)] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚙️</span>
            <span className="text-sm font-bold text-[var(--ink-fg-2)]">작품 정보</span>
          </div>
          <button
            onClick={() => setShowMetaModal(true)}
            className="text-xs font-semibold text-[var(--ink-gold-soft)] hover:text-[var(--ink-gold)]"
          >
            편집
          </button>
        </div>
        {workMeta && (
          <div className="space-y-2 px-5 py-4">
            <MetaRow label="장르" value={workMeta.genre || "–"} />
            <MetaRow label="업데이트" value={workMeta.updateDay || "–"} />
            <MetaRow
              label="연령등급"
              value={
                AGE_RATING_OPTIONS.find((o) => o.key === workMeta.ageRating)?.label ??
                workMeta.ageRating
              }
            />
            <div className="flex items-start gap-3">
              <span className="w-14 flex-shrink-0 text-xs font-semibold text-[var(--ink-fg-3)]">
                키워드
              </span>
              <div className="flex flex-wrap gap-1.5">
                {workMeta.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full bg-[var(--ink-surface-3)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--ink-fg-2)]"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
            {workMeta.hiatus && (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-xs">⏸️</span>
                <span className="text-xs font-bold text-[var(--ink-danger)]">휴재 중</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Work Header */}
      <div className="flex gap-4 rounded-2xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] p-5">
        <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--ink-hero)]">
          {work.coverUrl && work.coverUrl !== "/placeholder.png" ? (
            <img src={work.coverUrl} alt={work.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl text-[var(--ink-fg-3)]">
              📖
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center gap-2">
          <span
            className={`self-start rounded-full px-2 py-0.5 text-[10px] font-bold ${
              work.status === "연재중"
                ? "bg-[var(--ink-free-bright)]/12 text-[var(--ink-free-bright)]"
                : "bg-[var(--ink-surface-3)] text-[var(--ink-fg-3)]"
            }`}
          >
            {work.status}
          </span>
          <h2 className="text-lg font-black text-[var(--ink-fg-1)]">{work.title}</h2>
          <div className="flex items-center gap-2 text-xs text-[var(--ink-fg-3)]">
            <span>
              <strong className="text-[var(--ink-fg-2)]">{work.totalEpisodes}</strong>화
            </span>
            <span>·</span>
            <span>
              <strong className="text-[var(--ink-fg-2)]">{counts.draft}</strong>개 초안
            </span>
            <span>·</span>
            <span>
              <strong className="text-[var(--ink-fg-2)]">{counts.scheduled}</strong>개 예약
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] p-4">
        <PipelineStep label="초안" count={counts.draft} active={counts.draft > 0} />
        <span className="text-[var(--ink-fg-3)]">→</span>
        <PipelineStep
          label="예약"
          count={counts.scheduled}
          active={counts.scheduled > 0}
          accent
        />
        <span className="text-[var(--ink-fg-3)]">→</span>
        <PipelineStep
          label="발행"
          count={counts.published}
          active={counts.published > 0}
          done
        />
      </div>

      {/* New Episode CTA */}
      <Link
        href={`/studio/works/${work.id}/compose`}
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--ink-gold)] font-bold text-[var(--ink-fg-on-gold)] transition-all hover:bg-[var(--ink-gold-hover)]"
      >
        <span>✏️</span> 새 회차 작성
      </Link>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] px-4 py-2.5">
        <span className="text-sm text-[var(--ink-fg-3)]">🔍</span>
        <input
          type="text"
          placeholder="회차 제목 검색"
          className="flex-1 bg-transparent text-sm text-[var(--ink-fg-1)] placeholder-[var(--ink-fg-3)] outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-[var(--ink-fg-3)] hover:text-[var(--ink-fg-1)]"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs + Sort */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? "border-[var(--ink-gold)] bg-[var(--ink-gold)] text-[var(--ink-fg-on-gold)]"
                  : "border-[var(--ink-border-white)] bg-[var(--ink-surface-2)] text-[var(--ink-fg-3)] hover:text-[var(--ink-fg-1)]"
              }`}
            >
              {tab.label}
              <span
                className={`min-w-[18px] rounded-full px-1 py-0.5 text-center text-[10px] font-bold ${
                  activeTab === tab.key
                    ? "bg-black/20 text-[var(--ink-fg-on-gold)]"
                    : "bg-[var(--ink-surface-3)] text-[var(--ink-fg-3)]"
                }`}
              >
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
          className="flex items-center gap-1 rounded-full border border-[var(--ink-border-white)] bg-[var(--ink-surface-2)] px-3 py-1.5 text-[11px] font-semibold text-[var(--ink-fg-2)]"
        >
          {sortOrder === "newest" ? "↓" : "↑"}
          {sortOrder === "newest" ? "최신순" : "오래된순"}
        </button>
      </div>

      {/* Episode list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--ink-fg-3)]">
            해당 회차가 없습니다.
          </div>
        ) : (
          filtered.map((ep) => (
            <EpisodeRow
              key={ep.id}
              episode={ep}
              workId={work.id}
              onHistory={() => void handleHistory(ep)}
            />
          ))
        )}
      </div>

      {/* Reader Reactions */}
      {reactions.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--ink-border-soft)] px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">💬</span>
              <span className="text-sm font-bold text-[var(--ink-fg-2)]">최근 독자 반응</span>
            </div>
          </div>
          {reactions.map((rx, i) => (
            <div
              key={rx.id}
              className={`flex items-center gap-3 px-5 py-3 ${
                i < reactions.length - 1 ? "border-b border-[var(--ink-border-soft)]" : ""
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[var(--ink-gold)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink-gold-soft)]">
                    {rx.episodeLabel}
                  </span>
                  <span className="text-xs font-semibold text-[var(--ink-fg-2)]">
                    {rx.nickname}
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-[var(--ink-fg-3)]">
                    ♡ {rx.likes}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--ink-fg-1)]">{rx.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Meta edit modal */}
      {showMetaModal && metaForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
          <div className="w-full max-w-lg rounded-t-3xl bg-[var(--ink-surface)] p-6 sm:rounded-2xl">
            <div className="mb-1 flex justify-center sm:hidden">
              <div className="h-1 w-8 rounded-full bg-[var(--ink-border-white)]" />
            </div>
            <h3 className="mb-5 text-lg font-black text-[var(--ink-fg-1)]">작품 정보 편집</h3>
            <div className="space-y-4">
              <Field label="장르">
                <input
                  value={metaForm.genre}
                  onChange={(e) => setMetaForm({ ...metaForm, genre: e.target.value })}
                  className="h-11 w-full rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface-2)] px-3 text-sm text-[var(--ink-fg-1)] outline-none focus:border-[var(--ink-gold)]"
                  placeholder="장르"
                />
              </Field>
              <Field label="업데이트">
                <input
                  value={metaForm.updateDay}
                  onChange={(e) =>
                    setMetaForm({ ...metaForm, updateDay: e.target.value })
                  }
                  className="h-11 w-full rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface-2)] px-3 text-sm text-[var(--ink-fg-1)] outline-none focus:border-[var(--ink-gold)]"
                  placeholder="예: 매주 수요일"
                />
              </Field>
              <Field label="연령등급">
                <div className="flex gap-2">
                  {AGE_RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() =>
                        setMetaForm({ ...metaForm, ageRating: opt.key })
                      }
                      className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                        metaForm.ageRating === opt.key
                          ? "border-[var(--ink-gold)] bg-[var(--ink-gold)] text-[var(--ink-fg-on-gold)]"
                          : "border-[var(--ink-border-white)] bg-[var(--ink-surface-2)] text-[var(--ink-fg-3)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="키워드">
                <input
                  value={metaForm.keywords.join(", ")}
                  onChange={(e) =>
                    setMetaForm({
                      ...metaForm,
                      keywords: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((s) => (s.startsWith("#") ? s : `#${s}`)),
                    })
                  }
                  className="h-11 w-full rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface-2)] px-3 text-sm text-[var(--ink-fg-1)] outline-none focus:border-[var(--ink-gold)]"
                  placeholder="#태그1, #태그2"
                />
              </Field>
              <button
                onClick={() =>
                  setMetaForm({ ...metaForm, hiatus: !metaForm.hiatus })
                }
                className="flex w-full items-center gap-2 rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface-2)] px-4 py-3 text-sm font-semibold text-[var(--ink-fg-1)]"
              >
                <span>{metaForm.hiatus ? "⏸️" : "▶️"}</span>
                {metaForm.hiatus ? "휴재 중" : "연재 중"}
              </button>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowMetaModal(false)}
                className="flex-1 rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface-2)] py-3 text-sm font-semibold text-[var(--ink-fg-2)]"
              >
                취소
              </button>
              <button
                onClick={() => void handleSaveMeta()}
                className="flex-1 rounded-xl bg-[var(--ink-gold)] py-3 text-sm font-bold text-[var(--ink-fg-on-gold)]"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-2xl bg-[var(--ink-surface)] p-6">
            <h3 className="mb-1 text-lg font-black text-[var(--ink-fg-1)]">변경 이력</h3>
            <p className="mb-4 text-sm text-[var(--ink-fg-3)]">
              {historyModal.episode.title}
            </p>
            {historyModal.entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--ink-fg-3)]">
                이력이 없습니다.
              </p>
            ) : (
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {historyModal.entries.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-xl bg-[var(--ink-surface-2)] px-4 py-2.5"
                  >
                    <span className="text-sm text-[var(--ink-fg-1)]">{e.label}</span>
                    <div className="flex items-center gap-2 text-xs text-[var(--ink-fg-3)]">
                      <span>{formatHistoryTs(e.timestamp)}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          e.state === "published"
                            ? "bg-[var(--ink-free-bright)]/12 text-[var(--ink-free-bright)]"
                            : e.state === "scheduled"
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-[var(--ink-gold)]/15 text-[var(--ink-gold)]"
                        }`}
                      >
                        {getStateLabel(e.state)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setHistoryModal(null)}
              className="mt-4 w-full rounded-xl border border-[var(--ink-border-white)] py-2.5 text-sm font-semibold text-[var(--ink-fg-2)]"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 flex-shrink-0 text-xs font-semibold text-[var(--ink-fg-3)]">
        {label}
      </span>
      <span className="text-sm font-medium text-[var(--ink-fg-1)]">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[var(--ink-fg-2)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function PipelineStep({
  label,
  count,
  active,
  accent,
  done,
}: {
  label: string;
  count: number;
  active: boolean;
  accent?: boolean;
  done?: boolean;
}) {
  const bg = done
    ? "bg-[var(--ink-free-bright)]/12"
    : accent
      ? "bg-[var(--ink-gold)]/14"
      : active
        ? "bg-[var(--ink-surface-3)]"
        : "bg-[var(--ink-surface-2)]";
  const textClass = done
    ? "text-[var(--ink-free-bright)]"
    : accent
      ? "text-[var(--ink-gold)]"
      : active
        ? "text-[var(--ink-fg-1)]"
        : "text-[var(--ink-fg-3)]";

  return (
    <div className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-3 ${bg}`}>
      <span className={`text-xl font-black ${textClass}`}>{count}</span>
      <span className={`text-[10px] font-bold ${textClass}`}>{label}</span>
    </div>
  );
}

function EpisodeRow({
  episode,
  workId,
  onHistory,
}: {
  episode: AuthorEpisodeSummary;
  workId: string;
  onHistory: () => void;
}) {
  const href = episode.id.startsWith(`${workId}-draft-new`)
    ? `/studio/works/${workId}/compose`
    : `/studio/works/${workId}/compose?episodeId=${episode.id}`;

  const badgeClass =
    episode.publishStatus === "draft"
      ? "bg-[var(--ink-gold)]/14 text-[var(--ink-gold)]"
      : episode.publishStatus === "scheduled"
        ? "bg-blue-500/15 text-blue-400"
        : "bg-[var(--ink-free-bright)]/12 text-[var(--ink-free-bright)]";
  const badgeLabel =
    episode.publishStatus === "draft"
      ? "초안"
      : episode.publishStatus === "scheduled"
        ? "예약"
        : "발행";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] px-4 py-3 transition-all hover:border-[var(--ink-gold)]/20">
      <span className="w-7 text-center text-xs font-bold text-[var(--ink-fg-3)]">
        {String(episode.number).padStart(2, "0")}
      </span>
      <Link href={href} className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-[var(--ink-fg-1)]">{episode.title}</span>
        <span className="text-[11px] text-[var(--ink-fg-3)]">
          {episode.publishStatus === "scheduled" && episode.scheduledAt
            ? `예약: ${episode.scheduledAt}`
            : `수정 ${formatShortDate(episode.updatedAt)}`}
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}>
          {badgeLabel}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
            episode.accessType === "paid"
              ? "bg-[var(--ink-gold)]/12 text-[var(--ink-gold-soft)]"
              : "bg-[var(--ink-free)]/15 text-[var(--ink-free)]"
          }`}
        >
          {episode.accessType === "free" ? "무료" : `${episode.price}G`}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onHistory();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ink-surface-2)] text-xs text-[var(--ink-fg-3)] hover:text-[var(--ink-fg-1)]"
          title="변경 이력"
        >
          🕐
        </button>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function getStateLabel(state: string) {
  if (state === "scheduled") return "예약";
  if (state === "published") return "발행";
  if (state === "updated") return "수정";
  return "초안";
}

function formatHistoryTs(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "방금";
  return `${d.getMonth() + 1}.${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatShortDate(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "방금";
  return `${d.getMonth() + 1}.${d.getDate()}`;
}
