import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NovelCard } from "../components/NovelCard";
import { createReaderRepository } from "../reader/repository";
import { inkroadTheme } from "../theme";
import type { Novel } from "../types";

const readerRepository = createReaderRepository();

export default function SearchScreen() {
  const params = useLocalSearchParams<{ tag?: string }>();
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(params.tag || "전체");

  useEffect(() => {
    setSelectedTag(params.tag || "전체");
  }, [params.tag]);
  const [catalog, setCatalog] = useState<Novel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    readerRepository
      .searchCatalog()
      .then((items) => {
        if (cancelled) {
          return;
        }

        setCatalog(items);
        setErrorMessage(null);
        setIsLoading(false);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "검색 목록을 불러오지 못했습니다."
        );
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const genreLabels = useMemo(() => {
    const dynamicTags = Array.from(
      new Set(catalog.flatMap((novel) => novel.tags).filter(Boolean))
    );
    return ["전체", ...dynamicTags];
  }, [catalog]);

  const filteredNovels = useMemo(() => {
    return catalog.filter((novel) => {
      const matchesQuery =
        !query ||
        [novel.title, novel.author, novel.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesTag = selectedTag === "전체" || novel.tags.includes(selectedTag);
      return matchesQuery && matchesTag;
    });
  }, [catalog, query, selectedTag]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <AppHeader showProfile />
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* .mobile-search-input */}
        <View style={styles.searchInputWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="어떤 이야기를 찾고 계세요?"
            placeholderTextColor={inkroadTheme.colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* .mobile-chip-scroll */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.chipScroll}
          style={styles.chipScrollWrap}
        >
          {genreLabels.map((label) => {
            const active = selectedTag === label;
            return (
              <TouchableOpacity 
                key={label} 
                style={[styles.filterChip, active && styles.filterChipActive]} 
                onPress={() => setSelectedTag(label)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* .mobile-filter-row */}
        <View style={styles.filterRow}>
          <Text style={styles.filterBtnText}>
            {selectedTag === "전체" ? "전체 장르" : selectedTag}
            {query ? `  ·  "${query}"` : ""}
          </Text>
          <Text style={styles.resultCount}>
            {filteredNovels.length}편
          </Text>
        </View>

        {/* .mobile-store-panel.mobile-search-panel */}
        <View style={styles.storePanel}>
          {isLoading ? (
            <Text style={styles.statusText}>작품을 불러오는 중입니다.</Text>
          ) : errorMessage ? (
            <Text style={styles.statusText}>{errorMessage}</Text>
          ) : filteredNovels.length > 0 ? (
            <View style={styles.searchResults}>
              {filteredNovels.map((novel) => (
                <NovelCard key={novel.id} novel={novel} variant="grid" />
              ))}
            </View>
          ) : (
            <Text style={styles.statusText}>검색 조건에 맞는 작품이 없습니다.</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: inkroadTheme.colors.background },
  content: { 
    padding: inkroadTheme.spacing.md, // 20px
    paddingTop: 10,
    paddingBottom: 40 
  },
  
  // .mobile-search-input
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(191,169,122,0.15)",
    borderRadius: inkroadTheme.radius.md,
    height: 50,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: inkroadTheme.colors.text,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    fontSize: 14,
    color: inkroadTheme.colors.textMuted,
  },

  // .mobile-chip-scroll
  chipScrollWrap: {
    marginHorizontal: -inkroadTheme.spacing.md,
    marginBottom: 16,
  },
  chipScroll: {
    paddingHorizontal: inkroadTheme.spacing.md,
    gap: 8,
  },
  filterChip: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(191,169,122,0.18)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: "rgba(212,168,67,0.16)",
    borderColor: "rgba(212,168,67,0.5)",
  },
  filterChipText: {
    color: inkroadTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600"
  },
  filterChipTextActive: {
    color: inkroadTheme.colors.inkGold,
    fontWeight: "700",
  },

  // .mobile-filter-row
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: inkroadTheme.colors.textSecondary,
  },

  // .mobile-store-panel
  storePanel: {
    flex: 1,
  },
  panelHead: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: inkroadTheme.colors.text,
    letterSpacing: -0.5,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: "600",
    color: inkroadTheme.colors.primary,
    marginBottom: 3, // align visually with title baseline
  },
  statusText: {
    fontSize: 14,
    lineHeight: 22,
    color: inkroadTheme.colors.textMuted,
  },
  searchResults: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16, 
  },
});
