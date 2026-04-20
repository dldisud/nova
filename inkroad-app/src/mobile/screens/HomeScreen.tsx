import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NovelCard } from "../components/NovelCard";
import { SectionBoard } from "../components/SectionBoard";
import { createReaderRepository } from "../reader/repository";
import type { Novel } from "../types";
import { inkroadTheme } from "../theme";

const readerRepository = createReaderRepository();

export default function HomeScreen() {
  const router = useRouter();
  const [heroNovel, setHeroNovel] = useState<Novel | null>(null);
  const [saleNovels, setSaleNovels] = useState<Novel[]>([]);
  const [popularNovels, setPopularNovels] = useState<Novel[]>([]);
  const [recentNovels, setRecentNovels] = useState<Novel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    readerRepository
      .getHomeSections()
      .then((sections) => {
        if (cancelled) {
          return;
        }

        setHeroNovel(sections.hero);
        setSaleNovels(sections.sale);
        setPopularNovels(sections.popular);
        setRecentNovels(sections.recent);
        setErrorMessage(null);
        setIsLoading(false);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "작품을 불러오지 못했습니다."
        );
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const genreLabels = useMemo(() => {
    const tags = new Set<string>();
    [heroNovel, ...saleNovels, ...popularNovels, ...recentNovels]
      .filter((novel): novel is Novel => Boolean(novel))
      .forEach((novel) => {
        novel.tags.forEach((tag) => {
          if (tag) {
            tags.add(tag);
          }
        });
      });

    return ["전체", ...Array.from(tags)];
  }, [heroNovel, saleNovels, popularNovels, recentNovels]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppHeader showSearch showProfile />
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>작품을 불러오는 중입니다</Text>
          <Text style={styles.stateText}>공개 카탈로그를 준비하고 있어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!heroNovel) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppHeader showSearch showProfile />
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>작품을 불러오지 못했어요</Text>
          <Text style={styles.stateText}>
            {errorMessage ?? "아직 공개된 작품이 없습니다."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppHeader showSearch showProfile />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <TouchableOpacity activeOpacity={0.9} style={styles.hero} onPress={() => router.push(`/novel/${heroNovel.id}`)}>
          <Image source={{ uri: heroNovel.coverUrl }} style={styles.heroBackground} resizeMode="cover" />
          
          {/* Fake LinearGradient (20 vertical slices) to circumvent expo-linear-gradient error */}
          {Array.from({ length: 20 }).map((_, i) => {
            // Non-linear easing for better gradient blend matching the CSS (0.1 -> 0.02 -> 0.4 -> 0.85)
            let opacity = 0;
            const progress = i / 19;
            if (progress < 0.3) opacity = 0.1 - (0.08 * (progress / 0.3));
            else if (progress < 0.6) opacity = 0.02 + (0.38 * ((progress - 0.3) / 0.3));
            else opacity = 0.4 + (0.45 * ((progress - 0.6) / 0.4));
            
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  top: `${i * 5}%`,
                  height: '5.5%', // Slightly overlap to prevent 1px gaps
                  width: '100%',
                  backgroundColor: `rgba(0,0,0,${opacity})`,
                  zIndex: 1,
                }}
              />
            );
          })}

          <View style={styles.heroInner}>
            <View style={styles.heroBadges}>
              {heroNovel.salePercent && (
                <View style={[styles.badge, styles.badgeSale]}>
                  <Text style={styles.badgeText}>-{heroNovel.salePercent}%</Text>
                </View>
              )}
              {heroNovel.freeEpisodes && heroNovel.freeEpisodes > 0 && (
                <View style={[styles.badge, styles.badgeFree]}>
                  <Text style={styles.badgeText}>{heroNovel.freeEpisodes}화 무료</Text>
                </View>
              )}
              {heroNovel.tags[0] && (
                <View style={[styles.badge, styles.badgeGenre]}>
                  <Text style={styles.badgeTextLight}>{heroNovel.tags[0]}</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>{heroNovel.title}</Text>
            <Text style={styles.heroSubtitle} numberOfLines={2}>{heroNovel.tagline || heroNovel.synopsis || heroNovel.author}</Text>
            
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaItem}>
                <Text style={styles.heroMetaText}>{heroNovel.author}</Text>
              </View>
              <View style={styles.heroMetaItem}>
                <MaterialIcons name="menu-book" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.heroMetaText}>{heroNovel.totalEpisodes}화</Text>
              </View>
              <View style={styles.heroMetaItem}>
                <MaterialIcons name="star" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.heroMetaText}>{heroNovel.rating.toFixed(1)}</Text>
              </View>
            </View>
            
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.heroBtnPrimary} onPress={() => router.push(`/viewer/${heroNovel.id}`)}>
                <MaterialIcons name="play-arrow" size={20} color="#0a0a0a" />
                <Text style={styles.heroBtnPrimaryText}>첫 화 보기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBtnSecondary} onPress={() => router.push(`/novel/${heroNovel.id}`)}>
                <MaterialIcons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreRow}>
          {genreLabels.map((label) => (
            <TouchableOpacity
              key={label}
              style={styles.genreChip}
              onPress={() => router.push({ pathname: "/search", params: { tag: label === "전체" ? "" : label } })}
            >
              <MaterialIcons
                name={label === "로맨스" ? "favorite" : label === "판타지" ? "flash-on" : "auto-awesome"}
                size={15}
                color={inkroadTheme.colors.textSecondary}
              />
              <Text style={styles.genreLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SectionBoard title="지금 할인 중" subtitle="편당 할인가로 만나보세요" actionLabel="전체 보기" onActionPress={() => router.push("/search")}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
            {saleNovels.map((novel) => <NovelCard key={novel.id} novel={novel} variant="scroll" />)}
          </ScrollView>
        </SectionBoard>

        <SectionBoard title="인기 작품" subtitle="독자들이 가장 많이 읽은 작품" actionLabel="전체 보기" onActionPress={() => router.push("/search")}>
          <View style={styles.cardGrid}>
            {popularNovels.map((novel) => <NovelCard key={novel.id} novel={novel} variant="grid" />)}
          </View>
        </SectionBoard>

        <SectionBoard title="최근 업데이트" subtitle="새 회차가 올라온 작품">
          <View style={styles.updateList}>
            {recentNovels.map((novel) => (
              <NovelCard key={novel.id} novel={novel} variant="list" />
            ))}
          </View>
        </SectionBoard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: inkroadTheme.colors.background },
  scrollView: { flex: 1 },
  content: { paddingBottom: 100 }, // space for bottom tabs
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: inkroadTheme.colors.text,
    textAlign: "center",
  },
  stateText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: inkroadTheme.colors.textMuted,
    textAlign: "center",
  },
  
  hero: { position: "relative", minHeight: 420, backgroundColor: inkroadTheme.colors.heroBg, overflow: "hidden" },
  heroBackground: { ...StyleSheet.absoluteFillObject },
  heroGradient: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  heroInner: { position: "relative", zIndex: 2, flex: 1, justifyContent: "flex-end", paddingHorizontal: 20, paddingBottom: 24, paddingTop: 100 },
  
  heroBadges: { flexDirection: "row", gap: 6, marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, justifyContent: "center", alignItems: "center" },
  badgeSale: { backgroundColor: inkroadTheme.colors.accentSale },
  badgeGenre: { backgroundColor: "rgba(255,255,255,0.15)" },
  badgeFree: { backgroundColor: inkroadTheme.colors.accentFree },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#fff", letterSpacing: 0.1 },
  badgeTextLight: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.92)", letterSpacing: 0.1 },
  
  heroTitle: { fontSize: 28, fontWeight: "900", color: "#fff", lineHeight: 32, letterSpacing: -1.1 },
  heroSubtitle: { marginTop: 6, fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 21 },
  
  heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  heroMetaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  heroMetaText: { fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  
  heroActions: { flexDirection: "row", gap: 8, marginTop: 16 },
  heroBtnPrimary: { flex: 1, height: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: inkroadTheme.colors.primary, borderRadius: 12, gap: 6 },
  heroBtnPrimaryText: { color: "#0a0a0a", fontSize: 14, fontWeight: "800" },
  heroBtnSecondary: { minWidth: 46, height: 46, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  
  genreRow: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 8 },
  genreChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: inkroadTheme.colors.surface, borderWidth: 1, borderColor: inkroadTheme.colors.border },
  genreLabel: { fontSize: 13, fontWeight: "600", color: inkroadTheme.colors.textSecondary },
  
  scrollRow: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  cardGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12, paddingHorizontal: 20 },
  
  updateList: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: inkroadTheme.radius.md, borderColor: "rgba(255,255,255,0.08)", borderWidth: 1, marginHorizontal: 20, overflow: "hidden" },
});
