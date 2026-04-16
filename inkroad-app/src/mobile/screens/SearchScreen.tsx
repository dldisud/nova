import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NovelCard } from "../components/NovelCard";
import { genreLabels, novels } from "../data/mockInkroad";
import { inkroadTheme } from "../theme";

export default function SearchScreen() {
  const params = useLocalSearchParams<{ tag?: string }>();
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(params.tag || "전체");

  const filteredNovels = useMemo(() => {
    return novels.filter((novel) => {
      const matchesQuery = !query || [novel.title, novel.author, novel.tags.join(" ")].join(" ").toLowerCase().includes(query.toLowerCase());
      const matchesTag = selectedTag === "전체" || novel.tags.includes(selectedTag);
      return matchesQuery && matchesTag;
    });
  }, [query, selectedTag]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <AppHeader showProfile />
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* .mobile-search-input */}
        <View style={styles.searchInputWrap}>
          <MaterialIcons name="search" size={24} color={inkroadTheme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="작품명, 저자, 태그 검색.."
            placeholderTextColor={inkroadTheme.colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
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
          {["출처", "상태", "정렬"].map((label) => (
            <TouchableOpacity key={label} style={styles.filterBtn}>
              <Text style={styles.filterBtnText}>{label}</Text>
              <MaterialIcons name="arrow-drop-down" size={18} color={inkroadTheme.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* .mobile-store-panel.mobile-search-panel */}
        <View style={styles.storePanel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>작품 목록</Text>
            <Text style={styles.resultCount}>{filteredNovels.length}개</Text>
          </View>

          <View style={styles.searchResults}>
            {filteredNovels.map((novel) => (
              <NovelCard key={novel.id} novel={novel} variant="grid" />
            ))}
          </View>
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
    gap: 10, 
    backgroundColor: "rgba(255, 255, 255, 0.05)", 
    borderWidth: 1, 
    borderColor: "rgba(255, 255, 255, 0.08)", 
    borderRadius: inkroadTheme.radius.md, // 14px
    height: 50,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  searchInput: { 
    flex: 1, 
    fontSize: 15, 
    color: inkroadTheme.colors.text,
  },

  // .mobile-chip-scroll
  chipScrollWrap: {
    marginHorizontal: -inkroadTheme.spacing.md,
    marginBottom: 24,
  },
  chipScroll: { 
    paddingHorizontal: inkroadTheme.spacing.md,
    gap: 8, 
  },
  filterChip: { 
    height: 38,
    borderRadius: 19, 
    borderWidth: 1, 
    borderColor: "rgba(255, 255, 255, 0.08)", 
    backgroundColor: "rgba(255, 255, 255, 0.05)", 
    paddingHorizontal: 16, 
    justifyContent: "center",
  },
  filterChipActive: { 
    backgroundColor: inkroadTheme.colors.primary, 
    borderColor: inkroadTheme.colors.primary 
  },
  filterChipText: { 
    color: inkroadTheme.colors.textMuted, 
    fontSize: 14,
    fontWeight: "600" 
  },
  filterChipTextActive: { 
    color: "#0a0a0a" // dark bg text for primary active state
  },

  // .mobile-filter-row
  filterRow: { 
    flexDirection: "row", 
    gap: 8,
    marginBottom: 24,
  },
  filterBtn: { 
    flex: 1, 
    flexDirection: "row", 
    justifyContent: "center", 
    alignItems: "center", 
    gap: 4, 
    backgroundColor: "rgba(255, 255, 255, 0.03)", 
    borderWidth: 1, 
    borderColor: "rgba(255, 255, 255, 0.08)", 
    borderRadius: inkroadTheme.radius.sm, // 10px
    height: 42,
  },
  filterBtnText: { 
    fontSize: 13,
    fontWeight: "700", 
    color: inkroadTheme.colors.text 
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
  searchResults: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16, 
  },
});
