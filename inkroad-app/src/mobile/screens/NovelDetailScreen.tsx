import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { createReaderRepository } from "../reader/repository";
import { formatCoinPrice, formatDiscountedPerEp, formatNumber } from "../utils/format";
import { inkroadTheme } from "../theme";
import type { Episode, Novel } from "../types";

const readerRepository = createReaderRepository();

export default function NovelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    readerRepository
      .getNovelDetail(id)
      .then((detail) => {
        if (cancelled) {
          return;
        }

        setNovel(detail?.novel ?? null);
        setEpisodes(detail?.episodes ?? []);
        setErrorMessage(null);
        setIsLoading(false);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "상세 정보를 불러오지 못했습니다."
        );
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="작품 상세" showBack />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>작품을 불러오는 중입니다</Text>
          <Text style={styles.emptyText}>공개된 상세 정보를 준비하고 있어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!novel) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="작품 상세" showBack />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>작품을 찾지 못했어요</Text>
          <Text style={styles.emptyText}>
            {errorMessage ?? "공개 카탈로그에서 작품 상세를 찾지 못했습니다."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Derived values for layout matching
  const showSale = novel.salePercent && novel.salePercent > 0;
  const statusMarkup = `${novel.status} · ${episodes.length || novel.totalEpisodes || 0}화`;
  const isTranslation = novel.tags.includes("번역");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <AppHeader title="작품 상세" showBack showSearch />
      
      <View style={styles.mainContainer}>
        <ScrollView contentContainerStyle={styles.content}>
          
          {/* Card containing both cover and info */}
          <View style={styles.heroCard}>
            {/* We fake the background blur of the hero card by projecting the image 
                absolutely inside the card and overlaying very dark tinted views */}
            <View style={styles.heroBgWrap}>
              <Image source={{ uri: novel.coverUrl }} style={styles.heroBgImage} blurRadius={30} />
              <View style={styles.heroBgDimTop} />
              <View style={styles.heroBgDimBottom} />
            </View>

            {/* mobile-detail-cover */}
            <View style={styles.detailCover}>
              <Image source={{ uri: novel.coverUrl }} style={styles.coverImg} />
            </View>

            {/* mobile-detail-info */}
            <View style={styles.detailInfo}>
              <Text style={styles.title}>{novel.title}</Text>
              <Text style={styles.subtitle}>{novel.author}</Text>

              <View style={styles.tagsRow}>
                {showSale && <Text style={styles.saleBadge}>-{novel.salePercent}% 할인</Text>}
                {isTranslation && <Text style={styles.mutedBadge}>한국 → 영어</Text>}
                {novel.tags && novel.tags.slice(0, 3).map(tag => (
                  <Text key={tag} style={styles.mutedBadge}>{tag}</Text>
                ))}
              </View>

              <View style={styles.metaInlineRow}>
                <Text style={styles.metaInlineValue}>{statusMarkup}</Text>
                <Text style={styles.metaInlineSep}>·</Text>
                <Text style={styles.metaInlineValue}>★ {novel.rating.toFixed(1)}</Text>
              </View>

              <View style={styles.priceRow}>
                <View style={styles.priceValues}>
                  {showSale ? (
                    <>
                      <Text style={styles.priceOld}>{formatCoinPrice(novel.pricePerEpisode)}</Text>
                      <Text style={styles.priceSale}>
                        {formatDiscountedPerEp(novel.pricePerEpisode, novel.salePercent!)}/편
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.priceCurrent}>{formatCoinPrice(novel.pricePerEpisode)}/편</Text>
                  )}
                </View>
                <Text style={styles.priceNote}>
                  총 {novel.totalEpisodes}화 · {novel.author}
                  {novel.bundleListPrice && novel.salePrice ? ` · 전권 대여 ${formatNumber(novel.salePrice)}G` : ""}
                </Text>
              </View>
            </View>
          </View>

          {/* mobile-detail-stats */}
          <View style={styles.statsNode}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>★ {novel.rating.toFixed(1)}</Text>
              <Text style={styles.statLab}>평점</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{Math.floor(novel.views / 1000)}k</Text>
              <Text style={styles.statLab}>조회수</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{novel.totalEpisodes}</Text>
              <Text style={styles.statLab}>총 연재회차</Text>
            </View>
          </View>

          {/* mobile-detail-synopsis */}
          <View style={styles.synopsisNode}>
            <Text 
              style={[styles.synopsisText, !synopsisExpanded && styles.synopsisClamped]}
              numberOfLines={synopsisExpanded ? undefined : 3}
            >
              {novel.synopsis || "등록된 소개글이 없습니다."}
            </Text>
            <TouchableOpacity 
              style={styles.moreBtn} 
              onPress={() => setSynopsisExpanded(!synopsisExpanded)}
            >
              <Text style={styles.moreBtnText}>{synopsisExpanded ? "접기" : "더보기"}</Text>
            </TouchableOpacity>
          </View>

          {/* Episode List spacing */}
          <View style={styles.episodeSection}>
            <View style={styles.episodeHeader}>
              <Text style={styles.epHeaderTitle}>회차 목록</Text>
              <Text style={styles.epHeaderCount}>총 {episodes.length}화</Text>
            </View>
            <View style={styles.epList}>
              {episodes.map((ep) => (
                <TouchableOpacity
                  key={ep.id}
                  style={styles.epItem}
                  onPress={() =>
                    router.push({
                      pathname: "/viewer/[id]",
                      params: { id: novel.id, episode: String(ep.number) },
                    })
                  }
                >
                  <View style={styles.epMain}>
                    <Text style={styles.epTitle}>
                      {ep.number}화 · {ep.title}
                    </Text>
                    <Text style={styles.epSummary} numberOfLines={1}>
                      {ep.summary}
                    </Text>
                  </View>
                  <View style={styles.epRight}>
                    <Text style={styles.epPrice}>{ep.isFree ? "무료" : `${ep.price}원`}</Text>
                    <Text style={styles.epDate}>최근</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </ScrollView>

        {/* Sticky CTA Node at bottom padding */}
        <View style={[styles.stickyCta, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
          <TouchableOpacity style={styles.ctaSecondaryBtn}>
            <MaterialIcons name="favorite-border" size={24} color="#f0e6d3" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.ctaPrimaryBtn}
            onPress={() =>
              router.push({
                pathname: "/viewer/[id]",
                params: { id: novel.id, episode: "1" },
              })
            }
          >
            <Text style={styles.ctaPrimaryText}>첫 화 무료로 읽기</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: inkroadTheme.colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyTitle: { fontSize: 24, fontWeight: "800", color: inkroadTheme.colors.text },
  emptyText: { marginTop: 8, textAlign: "center", color: inkroadTheme.colors.textMuted, lineHeight: 22 },
  
  mainContainer: {
    flex: 1,
    position: "relative",
  },
  content: {
    paddingBottom: 100, // accommodate sticky CTA
  },
  
  // Hero Card encapsulating cover and info
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  heroBgWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  heroBgImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroBgDimTop: {
    position: "absolute",
    top: 0, left: 0, right: 0, height: "50%",
    backgroundColor: "rgba(8, 11, 19, 0.6)",
  },
  heroBgDimBottom: {
    position: "absolute",
    bottom: 0, left: 0, right: 0, height: "80%",
    backgroundColor: "rgba(11, 14, 24, 0.95)",
  },

  // Cover part
  detailCover: {
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 18,
    alignItems: "center",
  },
  coverImg: {
    width: 156,
    aspectRatio: 0.72,
    borderRadius: 18,
  },

  // Info part
  detailInfo: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: "center",
  },
  kicker: {
    margin: 0,
    marginBottom: 12,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: 1.4, // 0.14em appx
  },
  title: {
    margin: 0,
    marginBottom: 6,
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1.4, // -0.05em appx
    textAlign: "center",
  },
  subtitle: {
    margin: 0,
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  mutedBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },
  saleBadge: {
    backgroundColor: "rgba(212,168,67,0.18)",
    color: inkroadTheme.colors.inkGold,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.45)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
  
  // Meta Inline Row
  metaInlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
    width: "100%",
  },
  metaInlineValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
  },
  metaInlineSep: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.35)",
  },

  // Meta Grid
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
    width: "100%",
  },
  metaItem: {
    flex: 1,
    minWidth: "45%", // Allows 2 items per row with gap
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 11,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.54)",
    marginBottom: 6,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 18,
  },

  // Price Row
  priceRow: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.09)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
  },
  priceValues: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 8,
  },
  priceOld: {
    color: "rgba(255, 255, 255, 0.44)",
    textDecorationLine: "line-through",
    fontSize: 14,
  },
  priceSale: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },
  priceCurrent: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },
  priceNote: {
    marginTop: 8,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
  },

  // Stats
  statsNode: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: inkroadTheme.colors.surface,
    borderWidth: 1,
    borderColor: inkroadTheme.colors.border,
    borderRadius: 16,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statVal: {
    fontSize: 24,
    fontWeight: "800",
    color: inkroadTheme.colors.text,
  },
  statLab: {
    fontSize: 12,
    color: inkroadTheme.colors.textMuted,
    marginTop: 2,
  },

  // Synopsis
  synopsisNode: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingTop: 10,
  },
  synopsisText: {
    fontSize: 13,
    lineHeight: 22,
    color: inkroadTheme.colors.textSecondary,
  },
  synopsisClamped: {
    // Relying on numberOfLines prop
  },
  moreBtn: {
    alignItems: "flex-end",
    paddingVertical: 12,
  },
  moreBtnText: {
    fontSize: 12,
    color: inkroadTheme.colors.textMuted,
    fontWeight: "600",
  },

  // CTA Sticky
  stickyCta: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 8,
  },
  ctaSecondaryBtn: {
    width: 60,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  ctaPrimaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: inkroadTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  ctaPrimaryText: {
    color: "#0a0a0a",
    fontSize: 16,
    fontWeight: "800",
  },

  // Episodes
  episodeSection: {
    marginTop: 20,
    backgroundColor: inkroadTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  episodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  epHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: inkroadTheme.colors.text,
  },
  epHeaderCount: {
    fontSize: 14,
    color: inkroadTheme.colors.textSecondary,
  },
  epList: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  epItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  epMain: { flex: 1, paddingRight: 16 },
  epTitle: {
    color: inkroadTheme.colors.text,
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 4,
  },
  epSummary: {
    color: inkroadTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  epRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  epPrice: {
    color: inkroadTheme.colors.accentFree,
    fontWeight: "800",
    fontSize: 13,
  },
  epDate: {
    color: inkroadTheme.colors.textSecondary,
    fontSize: 12,
  },
});

