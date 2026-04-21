"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { NovelFormatRenderer } from "@/components/novel-format-renderer";

/* ── 연출 도우미 서식 정의 ── */

const FORMAT_ITEMS = [
  {
    key: "ruby",
    label: "루비",
    icon: "💎",
    desc: "한자/영어에 읽는 법을 표기",
    template: `{{ruby:한자|읽는법}}`,
    example: `{{ruby:天命|천명}}이 다가온다.`,
  },
  {
    key: "status",
    label: "상태창",
    icon: "📊",
    desc: "RPG 스타일 스탯 표시",
    template: `:::status 상태창\n레벨: 1\n힘: 10\n민첩: 99\n:::`,
    example: `:::status 플레이어 정보\n이름: 강현수\n레벨: 47\n직업: 무직\n:::`,
  },
  {
    key: "system",
    label: "시스템",
    icon: "🖥️",
    desc: "시스템 메시지/알림",
    template: `:::system SYSTEM\n알림 내용을 입력하세요.\n:::`,
    example: `:::system SYSTEM\n[조건 달성] 숨겨진 퀘스트가 해금되었습니다.\n보상: ???\n:::`,
  },
  {
    key: "warning",
    label: "경고문",
    icon: "⚠️",
    desc: "위험 경고 연출",
    template: `:::warning 긴급 경고\n경고 내용을 입력하세요.\n:::`,
    example: `:::warning ⚠️ 치명적 오류\n생존 확률이 0.3% 이하로 감소했습니다.\n즉시 후퇴를 권장합니다.\n:::`,
  },
  {
    key: "chat",
    label: "채팅",
    icon: "💬",
    desc: "실시간 댓글/채팅 창",
    template: `:::chat 실시간 반응\n닉네임1|이게 가능해?\n닉네임2|ㅋㅋㅋㅋ\n:::`,
    example: `:::chat 실시간 반응\n명탐정코코|이게 된다고?\n망겜러|ㄹㅇ 개사기\n초보탈출|나도 민첩에 올인해야하나...\n:::`,
  },
  {
    key: "flashback",
    label: "회상",
    icon: "💭",
    desc: "과거 회상 장면",
    template: `:::flashback 회상\n회상 내용을 작성하세요.\n:::`,
    example: `:::flashback 3년 전\n그때의 나는 아무것도 모르고 있었다. 던전이 일상이 될 줄은.\n:::`,
  },
  {
    key: "article",
    label: "기사문",
    icon: "📰",
    desc: "뉴스 기사/공문서",
    template: `:::article 속보\n기사 내용을 작성하세요.\n:::`,
    example: `:::article [속보] 한국일보\nS급 헌터 강현수, 단독으로 붕괴급 던전 클리어...\n정부 관계자 "전례 없는 일"\n:::`,
  },
  {
    key: "skill",
    label: "기술명",
    icon: "⚡",
    desc: "기술 발동 이펙트",
    template: `:::skill 기술이름|루비\n기술 설명\n:::`,
    example: `:::skill 절대회피|Absolute Evasion\n민첩에 의한 절대적 회피 — 모든 공격을 무효화한다.\n:::`,
  },
  {
    key: "bold",
    label: "강조",
    icon: "🅱️",
    desc: "텍스트 굵게 강조",
    template: `**강조할 텍스트**`,
    example: `그는 **반드시** 살아남을 것이다.`,
  },
];

export default function FormatStudioPage() {
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormat = useCallback(
    (template: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        setBody((prev) => prev + (prev ? "\n" : "") + template);
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = body.slice(0, start);
      const after = body.slice(end);
      const prefix = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
      const newBody = `${before}${prefix}${template}${after}`;
      setBody(newBody);
      // Move cursor to end of inserted template
      requestAnimationFrame(() => {
        const pos = start + prefix.length + template.length;
        textarea.selectionStart = textarea.selectionEnd = pos;
        textarea.focus();
      });
    },
    [body],
  );

  const handleCopyBody = useCallback(() => {
    navigator.clipboard.writeText(body);
  }, [body]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--ink-fg-1)]">
            연출 서식 도우미
          </h1>
          <p className="mt-1 text-sm text-[var(--ink-fg-3)]">
            웹소설 연출 서식을 쉽게 삽입하고 미리보기할 수 있습니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          {body.length > 0 && (
            <button
              onClick={handleCopyBody}
              className="rounded-lg border border-[var(--ink-border-white)] bg-[var(--ink-surface)] px-3 py-2 text-xs font-semibold text-[var(--ink-fg-2)] transition-all hover:bg-[var(--ink-surface-2)]"
            >
              📋 복사
            </button>
          )}
        </div>
      </div>

      {/* Format button grid */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        {FORMAT_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => insertFormat(item.template)}
            className="group flex flex-col items-center gap-1.5 rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] p-3 transition-all hover:border-[var(--ink-gold)]/30 hover:bg-[var(--ink-gold)]/5"
            title={item.desc}
          >
            <span className="text-xl transition-transform group-hover:scale-110">
              {item.icon}
            </span>
            <span className="text-[10px] font-bold text-[var(--ink-fg-3)] group-hover:text-[var(--ink-gold)]">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Editor & Preview */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--ink-fg-2)]">✏️ 편집</h2>
            <span className="text-[10px] text-[var(--ink-fg-3)]">
              {body.length.toLocaleString()}자
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`본문을 입력하고 위 버튼으로 연출을 삽입하세요.\n\n예시:\n그는 천천히 눈을 떴다.\n\n:::status 상태창\n레벨: 1\n민첩: 99\n:::`}
            className="min-h-[450px] w-full resize-y rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)] px-5 py-4 font-mono text-sm leading-7 text-[var(--ink-fg-soft)] placeholder-[var(--ink-fg-3)]/50 outline-none transition-colors focus:border-[var(--ink-gold)]"
          />
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-[var(--ink-fg-2)]">👁 독자 화면 미리보기</h2>
          <div className="min-h-[450px] overflow-y-auto rounded-xl border border-[var(--ink-border-white)] bg-[#0c0c0c] px-6 py-5">
            {body.trim() ? (
              <NovelFormatRenderer body={body} />
            ) : (
              <p className="py-20 text-center text-sm text-[var(--ink-fg-3)]/50">
                왼쪽에 본문을 입력하면 독자에게 보이는 화면이 표시됩니다.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Example gallery */}
      <div>
        <h2 className="mb-3 text-sm font-bold text-[var(--ink-fg-2)]">📖 연출 예시</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FORMAT_ITEMS.filter((item) => item.key !== "bold" && item.key !== "ruby").map(
            (item) => (
              <div
                key={item.key}
                className="overflow-hidden rounded-xl border border-[var(--ink-border-white)] bg-[var(--ink-surface)]"
              >
                <div className="flex items-center justify-between border-b border-[var(--ink-border-soft)] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-xs font-bold text-[var(--ink-fg-2)]">
                      {item.label}
                    </span>
                  </div>
                  <button
                    onClick={() => insertFormat(item.example)}
                    className="text-[10px] font-semibold text-[var(--ink-gold)] hover:underline"
                  >
                    삽입
                  </button>
                </div>
                <div className="bg-[#0c0c0c] px-4 py-3">
                  <NovelFormatRenderer body={item.example} />
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
