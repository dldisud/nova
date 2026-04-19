import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { inkroadTheme } from "../../theme";

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

export function NovelFormatRenderer({ body, episodeTitle, fontSize, lineHeight, textColor }: NovelFormatRendererProps) {
  const blocks = parseReaderBlocks(body);
  const normalizedTitle = normalize(episodeTitle ?? "");

  const visibleBlocks =
    normalizedTitle && blocks[0]?.type === "heading" && normalize(blocks[0].text) === normalizedTitle
      ? blocks.slice(1)
      : blocks;

  const bodyOverride = (fontSize !== undefined || lineHeight !== undefined || textColor !== undefined)
    ? { fontSize, lineHeight, color: textColor } as const
    : undefined;

  return (
    <View style={styles.readerFlow}>
      {visibleBlocks.map((block, index) => {
        const key = `${block.type}-${index}`;

        switch (block.type) {
          case "heading":
            return <InlineLine key={key} text={block.text} variant="heading" />;
          case "paragraph":
            return <InlineLine key={key} text={block.text} variant="paragraph" bodyOverride={bodyOverride} />;
          case "status":
            return (
              <EffectCard key={key} variant="status" title={block.title}>
                {block.lines.map((line, lineIndex) => (
                  <InlineLine key={`${key}-${lineIndex}`} text={line} variant="status" />
                ))}
              </EffectCard>
            );
          case "system":
            return (
              <EffectCard key={key} variant="system" title={block.title}>
                {block.lines.map((line, lineIndex) => (
                  <InlineLine key={`${key}-${lineIndex}`} text={line} variant="system" />
                ))}
              </EffectCard>
            );
          case "warning":
            return (
              <EffectCard key={key} variant="warning" title={block.title}>
                {block.lines.map((line, lineIndex) => (
                  <InlineLine key={`${key}-${lineIndex}`} text={line} variant="warning" />
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
                {block.lines.map((line, lineIndex) => (
                  <InlineLine key={`${key}-${lineIndex}`} text={line} variant="article" />
                ))}
              </EffectCard>
            );
          case "chat":
            return (
              <EffectCard key={key} variant="chat" title={block.title}>
                {block.items.map((item, itemIndex) => (
                  <View key={`${key}-${itemIndex}`} style={styles.chatRow}>
                    <Text style={styles.chatAuthor}>{item.author}</Text>
                    <InlineLine text={item.message} variant="chat" compact />
                  </View>
                ))}
              </EffectCard>
            );
          case "skill":
            return (
              <EffectCard key={key} variant="skill" title="" noHeader>
                <View style={styles.skillHeader}>
                  {block.ruby ? <Text style={styles.skillRuby}>{block.ruby}</Text> : null}
                  <Text style={styles.skillTitle}>{block.title}</Text>
                </View>
                {block.lines.map((line, lineIndex) => (
                  <InlineLine key={`${key}-${lineIndex}`} text={line} variant="skill" center compact />
                ))}
              </EffectCard>
            );
          default:
            return null;
        }
      })}
    </View>
  );
}

function EffectCard({
  variant,
  title,
  children,
  noHeader = false,
}: {
  variant: "status" | "system" | "warning" | "flashback" | "article" | "chat" | "skill";
  title: string;
  children: React.ReactNode;
  noHeader?: boolean;
}) {
  return (
    <View style={[styles.effectCard, cardStyles[variant]]}>
      {!noHeader ? <Text style={[styles.effectTitle, titleStyles[variant]]}>{title}</Text> : null}
      {children}
    </View>
  );
}

function InlineLine({
  text,
  variant,
  compact = false,
  center = false,
  bodyOverride,
}: {
  text: string;
  variant: "heading" | "paragraph" | "status" | "system" | "warning" | "flashback" | "article" | "chat" | "skill";
  compact?: boolean;
  center?: boolean;
  bodyOverride?: { fontSize?: number; lineHeight?: number; color?: string };
}) {
  const tokens = parseInlineTokens(text);
  const override = variant === "paragraph" && bodyOverride ? bodyOverride : undefined;

  return (
    <View style={[styles.inlineFlow, center && styles.inlineCenter, compact && styles.inlineCompact]}>
      {tokens.map((token, index) => {
        if (token.type === "ruby") {
          return (
            <View key={`${token.type}-${index}`} style={styles.rubyWrap}>
              <Text style={[styles.rubyText, rubyTextStyles[variant]]}>{token.ruby}</Text>
              <Text style={[styles.rubyBase, textStyles[variant], override]}>{token.base}</Text>
            </View>
          );
        }

        return (
          <Text
            key={`${token.type}-${index}`}
            style={[textStyles[variant], override, token.type === "bold" && styles.boldText]}
          >
            {token.value}
          </Text>
        );
      })}
    </View>
  );
}

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

      if (index < lines.length && lines[index].trim() === ":::") {
        index += 1;
      }

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
  const filtered = content.map((line) => line.trim()).filter(Boolean);

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
      const [title, ruby] = meta.split("|").map((value) => value.trim());
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
  const pattern = /(\{\{ruby:([^|}]+)\|([^}]+)\}\}|\*\*([^*]+)\*\*)/g;
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

const styles = StyleSheet.create({
  readerFlow: {
    gap: 18,
  },
  inlineFlow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  inlineCenter: {
    justifyContent: "center",
  },
  inlineCompact: {
    marginTop: 4,
  },
  boldText: {
    fontWeight: "800",
  },
  rubyWrap: {
    alignItems: "center",
    marginHorizontal: 2,
    marginBottom: 1,
  },
  rubyText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
    marginBottom: 1,
  },
  rubyBase: {
    fontWeight: "800",
  },
  effectCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 8,
  },
  effectTitle: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  chatRow: {
    gap: 2,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  chatAuthor: {
    color: "#8ed8ff",
    fontSize: 12,
    fontWeight: "800",
  },
  skillHeader: {
    alignItems: "center",
    marginBottom: 10,
  },
  skillRuby: {
    color: "#ffd76e",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  skillTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1.4,
    textAlign: "center",
  },
});

const baseBodyText = {
  color: "rgba(255,255,255,0.88)",
  fontSize: 18,
  lineHeight: 32,
  letterSpacing: -0.2,
} as const;

const textStyles = StyleSheet.create({
  heading: {
    color: "#ffffff",
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "900",
    marginBottom: 4,
  },
  paragraph: baseBodyText,
  status: {
    color: "#d9f7ff",
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "monospace",
  },
  system: {
    color: "#e9fbff",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "700",
  },
  warning: {
    color: "#ffe5df",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "700",
  },
  flashback: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 17,
    lineHeight: 30,
    fontStyle: "italic",
  },
  article: {
    color: "#f5efe8",
    fontSize: 15,
    lineHeight: 24,
  },
  chat: {
    color: "#f7fbff",
    fontSize: 14,
    lineHeight: 22,
  },
  skill: {
    color: "#fff4cc",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },
});

const rubyTextStyles = StyleSheet.create({
  heading: { color: "#d6d6d6" },
  paragraph: { color: "#d6d6d6" },
  status: { color: "#7ee7ff" },
  system: { color: "#9defff" },
  warning: { color: "#ff9c8a" },
  flashback: { color: "#d1c7bd" },
  article: { color: "#d8c7b8" },
  chat: { color: "#bce9ff" },
  skill: { color: "#ffe18a" },
});

const cardStyles = StyleSheet.create({
  status: {
    backgroundColor: "rgba(33, 78, 97, 0.24)",
    borderWidth: 1,
    borderColor: "rgba(116, 234, 255, 0.46)",
    shadowColor: "#49d9ff",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  system: {
    backgroundColor: "rgba(29, 42, 59, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(141, 222, 255, 0.22)",
  },
  warning: {
    backgroundColor: "rgba(120, 28, 19, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255, 118, 90, 0.44)",
  },
  flashback: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderLeftWidth: 3,
    borderLeftColor: "rgba(255,255,255,0.18)",
  },
  article: {
    backgroundColor: "rgba(66, 53, 43, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(233, 196, 153, 0.18)",
  },
  chat: {
    backgroundColor: "rgba(32, 36, 44, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(115, 133, 163, 0.2)",
  },
  skill: {
    backgroundColor: "rgba(72, 54, 16, 0.44)",
    borderWidth: 1,
    borderColor: "rgba(255, 212, 103, 0.28)",
    paddingVertical: 18,
  },
});

const titleStyles = StyleSheet.create({
  status: { color: "#93efff" },
  system: { color: "#c7f5ff" },
  warning: { color: "#ff9f8b" },
  flashback: { color: "#d8cec3" },
  article: { color: "#f2d7b0" },
  chat: { color: "#c1d4ff" },
  skill: { color: inkroadTheme.colors.gold },
});
