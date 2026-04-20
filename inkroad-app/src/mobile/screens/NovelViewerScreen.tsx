import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NovelFormatRenderer } from "../components/reader/NovelFormatRenderer";
import { createReaderRepository } from "../reader/repository";
import { inkroadTheme } from "../theme";
import type { Episode, Novel } from "../types";

const readerRepository = createReaderRepository();

export default function NovelViewerScreen() {
  const { id, episode } = useLocalSearchParams<{ id: string; episode?: string }>();
  const router = useRouter();
  const episodeNumber = Number(episode ?? 1);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [novel, setNovel] = useState<Novel | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [previousEpisode, setPreviousEpisode] = useState<Episode | null>(null);
  const [nextEpisode, setNextEpisode] = useState<Episode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    readerRepository
      .getEpisodeView(id, episodeNumber)
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setNovel(payload?.novel ?? null);
        setCurrentEpisode(payload?.episode ?? null);
        setPreviousEpisode(payload?.previousEpisode ?? null);
        setNextEpisode(payload?.nextEpisode ?? null);
        setErrorMessage(null);
        setIsLoading(false);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setNovel(null);
        setCurrentEpisode(null);
        setPreviousEpisode(null);
        setNextEpisode(null);
        setErrorMessage(
          error instanceof Error ? error.message : "회차를 불러오지 못했습니다."
        );
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, episodeNumber]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topChrome}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={24} color={inkroadTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.chromeTitle}>읽는 중</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>회차를 불러오는 중입니다</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!novel || !currentEpisode) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topChrome}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={24} color={inkroadTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.chromeTitle}>읽는 중</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>회차를 찾지 못했어요</Text>
          {errorMessage ? <Text style={styles.emptyText}>{errorMessage}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {chromeVisible && (
        <View style={styles.topChrome}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={24} color={inkroadTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.chromeTitle} numberOfLines={1}>
            {novel.title}
          </Text>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="format-list-bulleted" size={24} color={inkroadTheme.colors.text} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setChromeVisible(!chromeVisible)}
        >
          <View style={styles.titleBlock}>
            <Text style={styles.episodeTitle}>{currentEpisode.title}</Text>
            <Text style={styles.episodeMeta}>
              {currentEpisode.number}화 · {currentEpisode.isFree ? "무료 회차" : `${currentEpisode.price}원`}
            </Text>
          </View>
          <NovelFormatRenderer
            body={currentEpisode.body}
            episodeTitle={currentEpisode.title}
            fontSize={18}
            lineHeight={32}
            textColor="rgba(255,255,255,0.85)"
          />
        </TouchableOpacity>
      </ScrollView>

      {chromeVisible && (
        <View style={styles.bottomChrome}>
          <TouchableOpacity
            style={[styles.ghostButton, !previousEpisode && styles.ghostButtonDisabled]}
            disabled={!previousEpisode}
            onPress={() =>
              previousEpisode &&
              router.replace({
                pathname: "/viewer/[id]",
                params: { id: novel.id, episode: String(previousEpisode.number) },
              })
            }
          >
            <MaterialIcons name="chevron-left" size={20} color={previousEpisode ? inkroadTheme.colors.text : inkroadTheme.colors.textSoft} />
            <Text style={[styles.ghostButtonText, !previousEpisode && styles.ghostButtonTextDisabled]}>이전화</Text>
          </TouchableOpacity>

          <Text style={styles.progressLabel}>
            {currentEpisode.number} / {novel.totalEpisodes}
          </Text>

          <TouchableOpacity
            style={[styles.ghostButton, !nextEpisode && styles.ghostButtonDisabled]}
            disabled={!nextEpisode}
            onPress={() =>
              nextEpisode &&
              router.replace({
                pathname: "/viewer/[id]",
                params: { id: novel.id, episode: String(nextEpisode.number) },
              })
            }
          >
            <Text style={[styles.ghostButtonText, !nextEpisode && styles.ghostButtonTextDisabled]}>다음화</Text>
            <MaterialIcons name="chevron-right" size={20} color={nextEpisode ? inkroadTheme.colors.text : inkroadTheme.colors.textSoft} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: inkroadTheme.colors.background }, // Match dark theme globally
  
  // Chrome (Header)
  topChrome: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
    paddingHorizontal: 10,
    backgroundColor: "rgba(10, 10, 10, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  chromeTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: inkroadTheme.colors.text,
  },

  // Main Reader Content
  content: { 
    padding: 24, 
    paddingBottom: 200, 
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  emptyTitle: { 
    color: inkroadTheme.colors.text, 
    fontWeight: "800", 
    fontSize: 22 
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: inkroadTheme.colors.textMuted,
    textAlign: "center",
  },
  titleBlock: { 
    marginBottom: 40, 
    alignItems: "center" 
  },
  episodeTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "900",
    color: inkroadTheme.colors.text,
    letterSpacing: -0.6,
    textAlign: "center",
    marginBottom: 8,
  },
  episodeMeta: { 
    color: inkroadTheme.colors.textMuted, 
    fontSize: 13, 
    fontWeight: "600" 
  },
  // Chrome (Footer)
  bottomChrome: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(20, 20, 20, 0.98)", // slightly distinct from bg
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32, // account for safe area
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ghostButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: inkroadTheme.radius.sm,
    backgroundColor: "transparent",
  },
  ghostButtonDisabled: {
    opacity: 0.5,
  },
  ghostButtonText: {
    color: inkroadTheme.colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  ghostButtonTextDisabled: {
    color: inkroadTheme.colors.textSoft,
  },
  progressLabel: {
    color: inkroadTheme.colors.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },
});
