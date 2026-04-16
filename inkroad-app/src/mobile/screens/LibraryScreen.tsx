import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { EmptyState } from "../components/EmptyState";
import { NovelCard } from "../components/NovelCard";
import { getNovelList, libraryShelves } from "../data/mockInkroad";
import { inkroadTheme } from "../theme";
import type { LibraryShelf } from "../types";

const shelfLabels: Record<LibraryShelf, string> = {
  reading: "읽는 중",
  wishlist: "찜한 작품",
  purchased: "구매한 작품",
};

export default function LibraryScreen() {
  const [selectedShelf, setSelectedShelf] = useState<LibraryShelf>("reading");

  const selectedNovels = useMemo(() => getNovelList(libraryShelves[selectedShelf]), [selectedShelf]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* showSearch icon matches mobile-header-actions in my_library.html */}
      <AppHeader showSearch showProfile />
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>내 서재</Text>
          <Text style={styles.statsText}>총 {selectedNovels.length}작품</Text>
        </View>

        {/* .mobile-chip-scroll */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.chipScroll}
          style={styles.chipScrollWrap}
        >
          {(Object.keys(shelfLabels) as LibraryShelf[]).map((shelf) => {
            const active = shelf === selectedShelf;
            return (
              <TouchableOpacity 
                key={shelf} 
                style={[styles.filterChip, active && styles.filterChipActive]} 
                onPress={() => setSelectedShelf(shelf)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{shelfLabels[shelf]}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* .mobile-store-panel.mobile-library-panel */}
        <View style={styles.storePanel}>
          {selectedNovels.length ? (
            <View style={selectedShelf === "reading" ? styles.listGroup : styles.grid}>
              {selectedNovels.map((novel) => {
                // Generate a deterministic pseudo-random mockup progress per novel
                const mockProgress = Math.floor(((novel.title.length * 17) + (novel.rating * 10)) % 100) || 5;
                
                return (
                  <NovelCard 
                    key={novel.id} 
                    novel={novel} 
                    variant={selectedShelf === "reading" ? "list" : "grid"}
                    readProgress={selectedShelf === "reading" ? mockProgress : undefined}
                  />
                );
              })}
            </View>
          ) : (
            <EmptyState
              title="아직 담긴 작품이 없어요"
              description="작품을 찜하거나 구매하면 여기에 차곡차곡 쌓입니다."
            />
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: inkroadTheme.colors.background },
  content: { 
    paddingTop: 16,
    paddingBottom: 72 
  },
  
  titleRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: inkroadTheme.colors.text,
    letterSpacing: -0.5,
  },
  statsText: {
    fontSize: 12,
    color: inkroadTheme.colors.textMuted,
  },

  // .mobile-chip-scroll
  chipScrollWrap: {
    paddingBottom: 16,
  },
  chipScroll: { 
    paddingHorizontal: 16,
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
    color: "#0a0a0a" 
  },

  storePanel: {
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16, 
  },
  listGroup: {
    flexDirection: "column",
    gap: 0,
  },
});
