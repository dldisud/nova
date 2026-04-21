import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { Novel } from "../types";
import { inkroadTheme } from "../theme";
import { formatCoinPrice, formatBundlePrice, formatDiscountedPerEp } from "../utils/format";

interface NovelCardProps {
  novel: Novel;
  variant?: "scroll" | "grid" | "list";
  readProgress?: number; // 0-100 percentage
}

export function NovelCard({ novel, variant = "grid", readProgress }: NovelCardProps) {
  const router = useRouter();

  const hasSale = typeof novel.salePercent === "number" && novel.salePercent > 0;
  const perEpLabel = formatCoinPrice(novel.pricePerEpisode);

  if (variant === "scroll") {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.scrollCard}
        onPress={() => router.push(`/novel/${novel.id}`)}
      >
        <View style={styles.scrollCoverWrap}>
          <Image source={{ uri: novel.coverUrl }} style={styles.coverImage} />
          {hasSale && (
            <View style={styles.scrollBadge}>
              <Text style={styles.scrollBadgeText}>-{novel.salePercent}%</Text>
            </View>
          )}
          {readProgress !== undefined && (
            <View style={styles.progressWrap}>
              <View style={[styles.progressFill, { width: `${readProgress}%` }]} />
            </View>
          )}
        </View>
        <Text style={styles.scrollTitle} numberOfLines={2}>{novel.title}</Text>
        <Text style={styles.scrollMeta} numberOfLines={1}>{novel.author}</Text>
        <View style={styles.priceRow}>
          {hasSale ? (
            <>
              <Text style={styles.priceOld}>{perEpLabel}</Text>
              <Text style={styles.priceSale}>
                {formatDiscountedPerEp(novel.pricePerEpisode, novel.salePercent!)}/편
              </Text>
            </>
          ) : (
            <Text style={styles.priceNormal}>{perEpLabel}/편</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === "list") {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.listCard}
        onPress={() => router.push(`/novel/${novel.id}`)}
      >
        <View style={styles.listCoverWrap}>
          <Image source={{ uri: novel.coverUrl }} style={styles.coverImage} />
        </View>
        <View style={styles.listInfo}>
          <Text style={styles.listTitle} numberOfLines={1}>{novel.title}</Text>
          <Text style={styles.listAuthor} numberOfLines={1}>{novel.author} · {novel.tags[0]}</Text>
          {readProgress !== undefined && (
             <View style={styles.listProgressRow}>
               <View style={styles.listProgressTrack}>
                 <View style={[styles.listProgressFill, { width: `${readProgress}%` }]} />
               </View>
               <Text style={styles.listProgressText}>{readProgress}%</Text>
             </View>
          )}
        </View>
        <View style={styles.listRight}>
          {hasSale ? (
            <Text style={[styles.listBadgeText, { color: inkroadTheme.colors.inkGold }]}>-{novel.salePercent}%</Text>
          ) : (
            <Text style={[styles.listBadgeText, { color: inkroadTheme.colors.textMuted }]}>업데이트</Text>
          )}
          <Text style={styles.listEpCount}>{novel.episodes?.length || novel.totalEpisodes || 0}화</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Grid variant (mh-card)
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.gridCard}
      onPress={() => router.push(`/novel/${novel.id}`)}
    >
      <View style={styles.gridCoverWrap}>
        <Image source={{ uri: novel.coverUrl }} style={styles.coverImage} />
        {hasSale && (
          <View style={styles.gridBadgeSale}>
            <Text style={styles.gridBadgeSaleText}>-{novel.salePercent}%</Text>
          </View>
        )}
        {readProgress !== undefined && (
          <View style={styles.progressWrap}>
            <View style={[styles.progressFill, { width: `${readProgress}%` }]} />
          </View>
        )}
      </View>
      <View style={styles.gridInfo}>
        <Text style={styles.gridTitle} numberOfLines={2}>{novel.title}</Text>
        <Text style={styles.gridAuthor} numberOfLines={1}>
          {novel.author} · ★ {novel.rating.toFixed(1)}
        </Text>
        
        {readProgress !== undefined ? (
          <View style={styles.gridProgressRow}>
            <Text style={styles.gridProgressText}>읽는 중 <Text style={{color: inkroadTheme.colors.primary}}>{readProgress}%</Text></Text>
          </View>
        ) : (
          <View style={[styles.priceRow, { marginTop: 6 }]}>
            {hasSale ? (
              <>
                <Text style={styles.priceOld}>{perEpLabel}</Text>
                <Text style={styles.priceSale}>
                  {formatDiscountedPerEp(novel.pricePerEpisode, novel.salePercent!)}/편
                </Text>
              </>
            ) : (
              <Text style={styles.priceNormal}>{perEpLabel}/편</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Shared
  coverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 4,
  },
  priceOld: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    textDecorationLine: "line-through",
  },
  priceSale: {
    fontSize: 12,
    color: inkroadTheme.colors.inkGold,
    fontWeight: "700",
  },
  priceNormal: {
    fontSize: 12,
    color: inkroadTheme.colors.inkGoldSoft,
    fontWeight: "600",
  },
  progressWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: inkroadTheme.colors.primary,
  },

  // Scroll variant (.mh-scroll-card)
  scrollCard: {
    width: 130,
  },
  scrollCoverWrap: {
    width: 130,
    aspectRatio: 0.72,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: inkroadTheme.colors.surface,
  },
  scrollBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: "rgba(212,168,67,0.18)",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.55)",
  },
  scrollBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: inkroadTheme.colors.inkGold,
  },
  scrollTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: inkroadTheme.colors.text,
    lineHeight: 20,
  },
  scrollMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.65)",
  },

  // Grid variant (.mh-card)
  gridCard: {
    width: "48%", // For 2 columns
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: inkroadTheme.radius.md,
    overflow: "hidden",
  },
  gridCoverWrap: {
    width: "100%",
    aspectRatio: 0.72,
    backgroundColor: "#1a1a1a",
  },
  gridBadgeSale: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: "rgba(212,168,67,0.18)",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.55)",
  },
  gridBadgeSaleText: {
    fontSize: 10,
    fontWeight: "800",
    color: inkroadTheme.colors.inkGold,
  },
  gridInfo: {
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: inkroadTheme.colors.text,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  gridAuthor: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.65)",
  },
  gridProgressRow: {
    marginTop: 8,
  },
  gridProgressText: {
    fontSize: 12,
    fontWeight: "600",
    color: inkroadTheme.colors.textMuted,
  },

  // List variant (.mh-update-row)
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: inkroadTheme.colors.border,
  },
  listCoverWrap: {
    width: 52,
    aspectRatio: 0.72,
    borderRadius: inkroadTheme.radius.sm,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  listInfo: {
    flex: 1,
    gap: 2,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: inkroadTheme.colors.text,
  },
  listAuthor: {
    fontSize: 11,
    color: inkroadTheme.colors.textMuted,
  },
  listProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  listProgressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  listProgressFill: {
    height: "100%",
    backgroundColor: inkroadTheme.colors.primary,
  },
  listProgressText: {
    fontSize: 11,
    fontWeight: "700",
    color: inkroadTheme.colors.primary,
  },
  listRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  listBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  listEpCount: {
    color: inkroadTheme.colors.textMuted,
    fontSize: 11,
  },
});
