/* ── Novel Format Renderer (web version, ported from mobile) ── */
/* Converts custom :::block::: markup into styled React components */

"use client";

import React from "react";

/* ── Types ── */

type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "ruby"; base: string; ruby: string };

type ReaderBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "status"; title: string; lines: string[] }
  | { type: "system"; title: string; lines: string[] }
  | { type: "warning"; title: string; lines: string[] }
  | { type: "flashback"; title: string; text: string }
  | { type: "article"; title: string; lines: string[] }
  | { type: "chat"; title: string; items: { author: string; message: string }[] }
  | { type: "skill"; title: string; ruby?: string; lines: string[] };

interface NovelFormatRendererProps {
  body: string;
  episodeTitle?: string;
  fontSize?: number;
  lineHeight?: number;
  textColor?: string;
}

/* ── Main Component ── */

export function NovelFormatRenderer({
  body,
  episodeTitle,
  fontSize,
  lineHeight,
  textColor,
}: NovelFormatRendererProps) {
  const blocks = parseReaderBlocks(body);
  const normalizedTitle = normalize(episodeTitle ?? "");

  const visibleBlocks =
    normalizedTitle &&
    blocks[0]?.type === "heading" &&
    normalize(blocks[0].text) === normalizedTitle
      ? blocks.slice(1)
      : blocks;

  const bodyOverride =
    fontSize !== undefined || lineHeight !== undefined || textColor !== undefined
      ? { fontSize, lineHeight: lineHeight ? `${lineHeight}px` : undefined, color: textColor }
      : undefined;

  return (
    <div className="flex flex-col gap-[18px]">
      {visibleBlocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case "heading":
            return <InlineLine key={key} text={block.text} variant="heading" />;
          case "paragraph":
            return (
              <InlineLine
                key={key}
                text={block.text}
                variant="paragraph"
                bodyOverride={bodyOverride}
              />
            );
          case "status":
            return (
              <EffectCard key={key} variant="status" title={block.title}>
                {block.lines.map((line, li) => (
                  <InlineLine key={`${key}-${li}`} text={line} variant="status" />
                ))}
              </EffectCard>
            );
          case "system":
            return (
              <EffectCard key={key} variant="system" title={block.title}>
                {block.lines.map((line, li) => (
                  <InlineLine key={`${key}-${li}`} text={line} variant="system" />
                ))}
              </EffectCard>
            );
          case "warning":
            return (
              <EffectCard key={key} variant="warning" title={block.title}>
                {block.lines.map((line, li) => (
                  <InlineLine key={`${key}-${li}`} text={line} variant="warning" />
                ))}
              </EffectCard>
            );
          case "flashback":
            return (
              <EffectCard key={key} variant="flashback" title={block.title}>
                <InlineLine text={block.text} variant="flashback" />
              </EffectCard>
            );
          case "article":
            return (
              <EffectCard key={key} variant="article" title={block.title}>
                {block.lines.map((line, li) => (
                  <InlineLine key={`${key}-${li}`} text={line} variant="article" />
                ))}
              </EffectCard>
            );
          case "chat":
            return (
              <EffectCard key={key} variant="chat" title={block.title}>
                {block.items.map((item, ii) => (
                  <div
                    key={`${key}-${ii}`}
                    className="border-t border-white/[0.06] py-1.5 first:border-t-0"
                  >
                    <span className="text-xs font-extrabold text-[#8ed8ff]">
                      {item.author}
                    </span>
                    <InlineLine text={item.message} variant="chat" compact />
                  </div>
                ))}
              </EffectCard>
            );
          case "skill":
            return (
              <EffectCard key={key} variant="skill" title="" noHeader>
                <div className="mb-2.5 text-center">
                  {block.ruby && (
                    <p className="text-[11px] font-bold text-[#ffd76e]">{block.ruby}</p>
                  )}
                  <p className="text-2xl font-black tracking-wider text-white">
                    {block.title}
                  </p>
                </div>
                {block.lines.map((line, li) => (
                  <InlineLine key={`${key}-${li}`} text={line} variant="skill" center compact />
                ))}
              </EffectCard>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

/* ── Effect Card ── */

const cardClasses: Record<string, string> = {
  status:
    "bg-[rgba(33,78,97,0.24)] border border-[rgba(116,234,255,0.46)] shadow-[0_0_14px_rgba(73,217,255,0.18)]",
  system: "bg-[rgba(29,42,59,0.82)] border border-[rgba(141,222,255,0.22)]",
  warning: "bg-[rgba(120,28,19,0.55)] border border-[rgba(255,118,90,0.44)]",
  flashback: "bg-white/[0.04] border-l-[3px] border-l-white/[0.18]",
  article: "bg-[rgba(66,53,43,0.45)] border border-[rgba(233,196,153,0.18)]",
  chat: "bg-[rgba(32,36,44,0.86)] border border-[rgba(115,133,163,0.2)]",
  skill: "bg-[rgba(72,54,16,0.44)] border border-[rgba(255,212,103,0.28)] py-[18px]",
};

const titleClasses: Record<string, string> = {
  status: "text-[#93efff]",
  system: "text-[#c7f5ff]",
  warning: "text-[#ff9f8b]",
  flashback: "text-[#d8cec3]",
  article: "text-[#f2d7b0]",
  chat: "text-[#c1d4ff]",
  skill: "text-[#d4a843]",
};

function EffectCard({
  variant,
  title,
  children,
  noHeader,
}: {
  variant: string;
  title: string;
  children: React.ReactNode;
  noHeader?: boolean;
}) {
  return (
    <div className={`rounded-[18px] px-4 py-3.5 my-2 ${cardClasses[variant] ?? ""}`}>
      {!noHeader && (
        <p
          className={`mb-2.5 text-xs font-black uppercase tracking-[1.2px] ${titleClasses[variant] ?? ""}`}
        >
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

/* ── Inline Line with Ruby and Bold ── */

const textClasses: Record<string, string> = {
  heading: "text-white text-[22px] leading-[30px] font-black",
  paragraph: "text-white/[0.88] text-[18px] leading-8 tracking-[-0.2px]",
  status: "text-[#d9f7ff] text-[15px] leading-6 font-mono",
  system: "text-[#e9fbff] text-[15px] leading-6 font-bold",
  warning: "text-[#ffe5df] text-[15px] leading-6 font-bold",
  flashback: "text-white/[0.72] text-[17px] leading-[30px] italic",
  article: "text-[#f5efe8] text-[15px] leading-6",
  chat: "text-[#f7fbff] text-[14px] leading-[22px]",
  skill: "text-[#fff4cc] text-[15px] leading-6 text-center",
};

const rubyClasses: Record<string, string> = {
  heading: "text-[#d6d6d6]",
  paragraph: "text-[#d6d6d6]",
  status: "text-[#7ee7ff]",
  system: "text-[#9defff]",
  warning: "text-[#ff9c8a]",
  flashback: "text-[#d1c7bd]",
  article: "text-[#d8c7b8]",
  chat: "text-[#bce9ff]",
  skill: "text-[#ffe18a]",
};

function InlineLine({
  text,
  variant,
  compact,
  center,
  bodyOverride,
}: {
  text: string;
  variant: string;
  compact?: boolean;
  center?: boolean;
  bodyOverride?: { fontSize?: number; lineHeight?: string; color?: string };
}) {
  const tokens = parseInlineTokens(text);
  const override = variant === "paragraph" && bodyOverride ? bodyOverride : undefined;

  return (
    <span
      className={`inline ${center ? "text-center block" : ""} ${compact ? "mt-1" : ""}`}
      style={override}
    >
      {tokens.map((token, i) => {
        if (token.type === "ruby") {
          return (
            <ruby key={i} className={`${textClasses[variant] ?? ""} font-extrabold`}>
              {token.base}
              <rp>(</rp>
              <rt className={`text-[10px] font-bold ${rubyClasses[variant] ?? ""}`}>
                {token.ruby}
              </rt>
              <rp>)</rp>
            </ruby>
          );
        }
        return (
          <span
            key={i}
            className={`${textClasses[variant] ?? ""} ${token.type === "bold" ? "font-extrabold" : ""}`}
          >
            {token.value}
          </span>
        );
      })}
    </span>
  );
}

/* ── Parser ── */

function parseReaderBlocks(raw: string): ReaderBlock[] {
  const lines = raw.replace(/\r/g, "").split("\n");
  const blocks: ReaderBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const blockMatch = line.match(/^:::(\w+)(?:\s+(.*))?$/);
    if (blockMatch) {
      const kind = blockMatch[1].toLowerCase();
      const meta = (blockMatch[2] ?? "").trim();
      index += 1;
      const content: string[] = [];
      while (index < lines.length && lines[index].trim() !== ":::") {
        content.push(lines[index]);
        index += 1;
      }
      if (index < lines.length && lines[index].trim() === ":::") index += 1;
      blocks.push(buildEffectBlock(kind, meta, content));
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push({ type: "heading", text: line.slice(2).trim() });
      index += 1;
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const current = lines[index].trim();
      if (!current || current.startsWith(":::") || current.startsWith("# ")) break;
      paragraph.push(current);
      index += 1;
    }
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    }
  }

  return blocks;
}

function buildEffectBlock(kind: string, meta: string, content: string[]): ReaderBlock {
  const filtered = content.map((l) => l.trim()).filter(Boolean);
  switch (kind) {
    case "status":
      return { type: "status", title: meta || "상태창", lines: filtered };
    case "system":
      return { type: "system", title: meta || "SYSTEM", lines: filtered };
    case "warning":
      return { type: "warning", title: meta || "긴급 경고", lines: filtered };
    case "flashback":
      return { type: "flashback", title: meta || "회상", text: filtered.join(" ") };
    case "article":
      return { type: "article", title: meta || "기사문", lines: filtered };
    case "chat":
      return {
        type: "chat",
        title: meta || "실시간 반응",
        items: filtered.map((line) => {
          const [author, ...rest] = line.split("|");
          if (!rest.length) return { author: "채팅", message: author.trim() };
          return { author: author.trim(), message: rest.join("|").trim() };
        }),
      };
    case "skill": {
      const [title, ruby] = meta.split("|").map((v) => v.trim());
      return {
        type: "skill",
        title: title || "기술 발동",
        ruby: ruby || undefined,
        lines: filtered,
      };
    }
    default:
      return { type: "paragraph", text: filtered.join(" ") };
  }
}

function parseInlineTokens(text: string): InlineToken[] {
  const pattern = /({{ruby:([^|}]+)\|([^}]+)}}|\*\*([^*]+)\*\*)/g;
  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    if (match[2] && match[3]) {
      tokens.push({ type: "ruby", base: match[2], ruby: match[3] });
    } else if (match[4]) {
      tokens.push({ type: "bold", value: match[4] });
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens.length ? tokens : [{ type: "text", value: text }];
}

function normalize(value: string) {
  return value.replace(/\s+/g, "").trim();
}
