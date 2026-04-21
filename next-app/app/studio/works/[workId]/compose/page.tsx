"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { createAuthorRepository } from "@/lib/creator/repository";
import type {
  AgeRating,
  AuthorRepository,
  EpisodeDraft,
  EpisodeType,
  EpisodeWorkflowStep,
} from "@/lib/types";

/* we wrap the main content in Suspense because useSearchParams() requires it */
export default function ComposePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--ink-gold)] border-t-transparent" />
        </div>
      }
    >
      <ComposeContent />
    </Suspense>
  );
}

const WORKFLOW_STEPS: { key: EpisodeWorkflowStep; label: string; icon: string }[] = [
  { key: "draft", label: "초안", icon: "📝" },
  { key: "review", label: "검토", icon: "🔍" },
  { key: "scheduled", label: "예약", icon: "📅" },
  { key: "published", label: "발행", icon: "🚀" },
];

const EPISODE_TYPES: { key: EpisodeType; label: string }[] = [
  { key: "episode", label: "일반 에피소드" },
  { key: "afterword", label: "작가의 말" },
  { key: "notice", label: "공지" },
  { key: "private", label: "비밀글" },
];

const AGE_OPTIONS: { key: AgeRating; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "15", label: "15+" },
  { key: "18", label: "18+" },
];

const SCHEDULE_PRESETS = [
  { label: "1시간 후", ms: 60 * 60 * 1000 },
  { label: "6시간 후", ms: 6 * 60 * 60 * 1000 },
  { label: "내일 오전 9시", ms: 0 /* computed dynamically */ },
  { label: "직접 선택", ms: -1 },
];

function ComposeContent() {
  const params = useParams<{ workId: string }>();
  const searchParams = useSearchParams();
  const workId = params.workId;
  const episodeId = searchParams.get("episodeId") ?? undefined;

  const [repo, setRepo] = useState<AuthorRepository | null>(null);
  const [draft, setDraft] = useState<EpisodeDraft>({
    novelId: workId,
    episodeId,
    title: "",
    accessType: "free",
    price: 0,
    body: "",
    workflowStep: "draft",
    episodeType: "episode",
    ageRating: "all",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [showSchedule, setShowSchedule] = useState(false);
  const [showPreflight, setShowPreflight] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("09:00");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load
  useEffect(() => {
    let active = true;
    createAuthorRepository().then((r) => {
      if (!active) return;
      setRepo(r);
      r.loadDraft(workId, episodeId).then((d) => {
        if (!active) return;
        setDraft(d);
        setLoading(false);
      });
    });
    return () => {
      active = false;
    };
  }, [workId, episodeId]);

  // Autosave (debounced)
  const autoSave = useCallback(
    (d: EpisodeDraft) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!repo) return;
        setSaving(true);
        await repo.saveDraft(d);
        setSaving(false);
        setLastSaved(
          new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
      }, 1500);
    },
    [repo],
  );

  function updateDraft(patch: Partial<EpisodeDraft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      autoSave(next);
      return next;
    });
  }

  async function handleManualSave() {
    if (!repo) return;
    setSaving(true);
    await repo.saveDraft(draft);
    setSaving(false);
    setLastSaved(
      new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }

  async function handlePublish() {
    if (!repo) return;
    setSaving(true);
    await repo.publishDraft(draft);
    setSaving(false);
    updateDraft({ workflowStep: "published", publicationState: "published" });
    setShowPreflight(false);
  }

  function handleSchedulePreset(ms: number) {
    if (ms === -1) return; // custom — user picks
    const target = Date.now() + ms;
    updateDraft({ scheduledAt: target, workflowStep: "scheduled" });
    setShowSchedule(false);
  }

  function handleCustomSchedule() {
    if (!customDate) return;
    const dt = new Date(`${customDate}T${customTime}`);
    if (isNaN(dt.getTime())) return;
    updateDraft({ scheduledAt: dt.getTime(), workflowStep: "scheduled" });
    setShowSchedule(false);
  }

  const charCount = draft.body.length;

  const preflightChecks = [
    { label: "제목 입력", pass: draft.title.trim().length > 0 },
    { label: "본문 100자 이상", pass: draft.body.length >= 100 },
    {
      label: "가격 설정 (유료)",
      pass: draft.accessType === "free" || draft.price > 0,
    },
    {
      label: "연령등급 선택",
      pass: !!draft.ageRating,
    },
  ];
  const allPassed = preflightChecks.every((c) => c.pass);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--ink-gold)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--ink-fg-3)]">
        <Link href={`/studio/works/${workId}`} className="hover:text-[var(--ink-fg-1)]">
          ← 회차 목록
        </Link>
        <span>/</span>
        <span className="text-[var(--ink-fg-1)]">
          {episodeId ? "회차 수정" : "새 회차"}
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] p-3">
        {/* Workflow steps */}
        <div className="flex items-center gap-1">
          {WORKFLOW_STEPS.map((step, i) => {
            const isActive = draft.workflowStep === step.key;
            const isPast =
              WORKFLOW_STEPS.findIndex((s) => s.key === draft.workflowStep) > i;
            return (
              <div key={step.key} className="flex items-center gap-1">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                    isActive
                      ? "bg-[var(--ink-gold)] text-[var(--ink-fg-on-gold)]"
                      : isPast
                        ? "bg-[var(--ink-free-bright)]/12 text-[var(--ink-free-bright)]"
                        : "bg-[var(--ink-surface-3)] text-[var(--ink-fg-3)]"
                  }`}
                >
                  {step.icon} {step.label}
                </span>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <span className="text-[10px] text-[var(--ink-fg-3)]">→</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Save status */}
          <span className="text-[10px] text-[var(--ink-fg-3)]">
            {saving ? "저장 중..." : lastSaved ? `${lastSaved} 저장됨` : ""}
          </span>
          {/* Mode toggle */}
          <div className="flex overflow-hidden rounded-lg border border-[var(--ink-border-white)]">
            <button
              onClick={() => setMode("write")}
              className={`px-3 py-1.5 text-xs font-bold ${
                mode === "write"
                  ? "bg-[var(--ink-gold)] text-[var(--ink-fg-on-gold)]"
                  : "bg-[var(--ink-surface-2)] text-[var(--ink-fg-3)]"
              }`}
            >
              ✏️ 쓰기
            </button>
            <button
              onClick={() => setMode("preview")}
              className={`px-3 py-1.5 text-xs font-bold ${
                mode === "preview"
                  ? "bg-[var(--ink-gold)] text-[var(--ink-fg-on-gold)]"
                  : "bg-[var(--ink-surface-2)] text-[var(--ink-fg-3)]"
              }`}
            >
              👁 미리보기
            </button>
          </div>
        </div>
      </div>

      {/* Editor area */}
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* Main editor */}
        <div className="space-y-4">
          {/* Title */}
          <input
            value={draft.title}
            onChange={(e) => updateDraft({ title: e.target.value })}
            placeholder="회차 제목을 입력하세요"
            className="w-full rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] px-5 py-4 text-lg font-black text-[var(--ink-fg-1)] placeholder-[var(--ink-fg-3)] outline-none focus:border-[var(--ink-gold)]"
          />

          {/* Body */}
          {mode === "write" ? (
            <div className="relative">
              <textarea
                value={draft.body}
                onChange={(e) => updateDraft({ body: e.target.value })}
                placeholder="본문을 작성하세요...&#10;&#10;연출 서식을 사용하려면 연출 도우미를 이용하세요."
                className="min-h-[500px] w-full resize-y rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] px-5 py-4 text-[15px] leading-8 text-[var(--ink-fg-soft)] placeholder-[var(--ink-fg-3)] outline-none focus:border-[var(--ink-gold)]"
              />
              <div className="absolute bottom-3 right-4 flex items-center gap-3 text-xs text-[var(--ink-fg-3)]">
                <span>{charCount.toLocaleString()}자</span>
              </div>
            </div>
          ) : (
            <div className="min-h-[500px] rounded-xl border border-[var(--ink-border-white)] bg-[#0e0e0e] px-6 py-5">
              <PreviewRenderer body={draft.body} title={draft.title} />
            </div>
          )}
        </div>

        {/* Sidebar controls */}
        <div className="space-y-4">
          {/* Episode type */}
          <SidebarCard title="회차 유형">
            <div className="grid grid-cols-2 gap-1.5">
              {EPISODE_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => updateDraft({ episodeType: t.key })}
                  className={`rounded-lg px-2 py-2 text-[11px] font-bold transition-all ${
                    draft.episodeType === t.key
                      ? "bg-[var(--ink-gold)] text-[var(--ink-fg-on-gold)]"
                      : "bg-[var(--ink-surface-2)] text-[var(--ink-fg-3)] hover:text-[var(--ink-fg-1)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </SidebarCard>

          {/* Access type */}
          <SidebarCard title="공개 설정">
            <div className="flex gap-2">
              <button
                onClick={() => updateDraft({ accessType: "free", price: 0 })}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                  draft.accessType === "free"
                    ? "bg-[var(--ink-free)]/20 text-[var(--ink-free-bright)]"
                    : "bg-[var(--ink-surface-2)] text-[var(--ink-fg-3)]"
                }`}
              >
                무료
              </button>
              <button
                onClick={() => updateDraft({ accessType: "paid", price: draft.price || 3 })}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                  draft.accessType === "paid"
                    ? "bg-[var(--ink-gold)]/20 text-[var(--ink-gold)]"
                    : "bg-[var(--ink-surface-2)] text-[var(--ink-fg-3)]"
                }`}
              >
                유료
              </button>
            </div>
            {draft.accessType === "paid" && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={draft.price}
                  onChange={(e) => updateDraft({ price: Number(e.target.value) })}
                  className="h-9 w-20 rounded-lg border border-[var(--ink-border-white)] bg-[var(--ink-surface-2)] px-2 text-center text-sm text-[var(--ink-fg-1)] outline-none"
                />
                <span className="text-xs text-[var(--ink-fg-3)]">골드</span>
              </div>
            )}
          </SidebarCard>

          {/* Age rating */}
          <SidebarCard title="연령등급">
            <div className="flex gap-1.5">
              {AGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => updateDraft({ ageRating: opt.key })}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                    draft.ageRating === opt.key
                      ? "bg-[var(--ink-gold)] text-[var(--ink-fg-on-gold)]"
                      : "bg-[var(--ink-surface-2)] text-[var(--ink-fg-3)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </SidebarCard>

          {/* Schedule */}
          {draft.scheduledAt && (
            <SidebarCard title="예약 발행">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--ink-gold)]">
                  {new Date(draft.scheduledAt).toLocaleString("ko-KR")}
                </span>
                <button
                  onClick={() =>
                    updateDraft({ scheduledAt: undefined, workflowStep: "draft" })
                  }
                  className="text-[10px] text-[var(--ink-fg-3)] hover:text-[var(--ink-danger)]"
                >
                  취소
                </button>
              </div>
            </SidebarCard>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => void handleManualSave()}
              className="w-full rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] py-3 text-sm font-bold text-[var(--ink-fg-2)] transition-all hover:bg-[var(--ink-surface-2)]"
            >
              💾 저장
            </button>
            <button
              onClick={() => setShowSchedule(true)}
              className="w-full rounded-xl border border-[var(--ink-gold)]/30 bg-[var(--ink-gold)]/10 py-3 text-sm font-bold text-[var(--ink-gold)] transition-all hover:bg-[var(--ink-gold)]/20"
            >
              📅 예약 발행
            </button>
            <button
              onClick={() => setShowPreflight(true)}
              className="w-full rounded-xl bg-[var(--ink-gold)] py-3 text-sm font-bold text-[var(--ink-fg-on-gold)] transition-all hover:bg-[var(--ink-gold-hover)]"
            >
              🚀 발행하기
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <Modal onClose={() => setShowSchedule(false)} title="예약 발행">
          <div className="space-y-3">
            {SCHEDULE_PRESETS.map((p) =>
              p.ms === -1 ? null : (
                <button
                  key={p.label}
                  onClick={() => handleSchedulePreset(p.ms || getNextMorningMs())}
                  className="w-full rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface-2)] py-3 text-sm font-semibold text-[var(--ink-fg-1)] hover:border-[var(--ink-gold)]/30"
                >
                  {p.label}
                </button>
              ),
            )}
            <hr className="border-[var(--ink-border-white)]" />
            <p className="text-xs font-semibold text-[var(--ink-fg-2)]">직접 선택</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--ink-border-white)] bg-[var(--ink-surface-2)] px-3 py-2 text-sm text-[var(--ink-fg-1)]"
              />
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-28 rounded-lg border border-[var(--ink-border-white)] bg-[var(--ink-surface-2)] px-3 py-2 text-sm text-[var(--ink-fg-1)]"
              />
            </div>
            <button
              onClick={handleCustomSchedule}
              disabled={!customDate}
              className="w-full rounded-xl bg-[var(--ink-gold)] py-3 text-sm font-bold text-[var(--ink-fg-on-gold)] disabled:opacity-40"
            >
              예약 설정
            </button>
          </div>
        </Modal>
      )}

      {/* Preflight Modal */}
      {showPreflight && (
        <Modal onClose={() => setShowPreflight(false)} title="발행 전 점검">
          <div className="space-y-3">
            {preflightChecks.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-3 rounded-xl bg-[var(--ink-surface-2)] px-4 py-3"
              >
                <span className={c.pass ? "text-[var(--ink-free-bright)]" : "text-[var(--ink-danger)]"}>
                  {c.pass ? "✅" : "❌"}
                </span>
                <span className="text-sm text-[var(--ink-fg-1)]">{c.label}</span>
              </div>
            ))}
            <button
              onClick={() => void handlePublish()}
              disabled={!allPassed || saving}
              className="w-full rounded-xl bg-[var(--ink-gold)] py-3 text-sm font-bold text-[var(--ink-fg-on-gold)] disabled:opacity-40"
            >
              {saving ? "발행 중..." : allPassed ? "🚀 발행 확인" : "조건을 충족해 주세요"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Shared components ── */

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] p-4">
      <h3 className="mb-3 text-xs font-bold text-[var(--ink-fg-2)]">{title}</h3>
      {children}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div
        className="w-full max-w-md rounded-t-3xl bg-[var(--ink-surface)] p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex justify-center sm:hidden">
          <div className="h-1 w-8 rounded-full bg-[var(--ink-border-white)]" />
        </div>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-black text-[var(--ink-fg-1)]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[var(--ink-fg-3)] hover:text-[var(--ink-fg-1)]"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Simple preview (uses novel-format-renderer) ── */

function PreviewRenderer({ body, title }: { body: string; title: string }) {
  // We import the web renderer dynamically to reduce bundle for write-only users
  const [Renderer, setRenderer] = useState<React.ComponentType<{
    body: string;
    episodeTitle?: string;
  }> | null>(null);

  useEffect(() => {
    import("@/components/novel-format-renderer").then((mod) => {
      setRenderer(() => mod.NovelFormatRenderer);
    });
  }, []);

  if (!Renderer) {
    return (
      <div className="whitespace-pre-wrap text-[15px] leading-8 text-[rgba(255,255,255,0.85)]">
        {body || "미리보기할 내용이 없습니다."}
      </div>
    );
  }

  return <Renderer body={body} episodeTitle={title} />;
}

function getNextMorningMs() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}
