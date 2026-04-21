import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { EmptyState } from "../components/EmptyState";
import { NovelCard } from "../components/NovelCard";
import { useAuthSession } from "../hooks/useAuthSession";
import { createAccountRepository } from "../reader/accountRepository";
import { inkroadTheme } from "../theme";
import type { LibraryShelf } from "../types";

const accountRepository = createAccountRepository();

const shelfLabels: Record<LibraryShelf, string> = {
  reading: "읽는 중",
  wishlist: "찜한 작품",
  purchased: "구매한 작품",
};

export default function LibraryScreen() {
  const router = useRouter();
  const { session, isLoadingSession } = useAuthSession();
  const [selectedShelf, setSelectedShelf] = useState<LibraryShelf>("reading");
  const [libraryData, setLibraryData] = useState<{
    shelves: Record<
      LibraryShelf,
      Array<{
        id: string;
        novel: Parameters<typeof NovelCard>[0]["novel"];
        readProgress?: number;
      }>
    >;
  } | null>(null);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!session?.user) {
      setLibraryData(null);
      setErrorMessage(null);
      setIsLoadingLibrary(false);
      return;
    }

    setIsLoadingLibrary(true);
    accountRepository
      .getLibraryData(session.user.id, {
        email: session.user.email,
        user_metadata: session.user.user_metadata as Record<string, unknown> | undefined,
      })
      .then((data) => {
        if (cancelled) {
          return;
        }

        setLibraryData(data);
        setErrorMessage(null);
        setIsLoadingLibrary(false);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setLibraryData(null);
        setErrorMessage(
          error instanceof Error ? error.message : "서재를 불러오지 못했습니다."
        );
        setIsLoadingLibrary(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const selectedNovels = useMemo(
    () => libraryData?.shelves[selectedShelf] ?? [],
    [libraryData, selectedShelf]
  );

  if (isLoadingSession) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <AppHeader showSearch showProfile />
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>서재를 준비하는 중입니다</Text>
          <Text style={styles.stateText}>계정 정보를 확인하고 있어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session?.user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <AppHeader showSearch showProfile />
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>로그인이 필요해요</Text>
          <Text style={styles.stateText}>
            읽는 작품, 찜한 작품, 구매한 작품은 계정에 연결된 서재에서 불러옵니다.
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push("/auth")}>
            <Text style={styles.loginButtonText}>로그인하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          {isLoadingLibrary ? (
            <Text style={styles.statusText}>서재를 불러오는 중입니다.</Text>
          ) : errorMessage ? (
            <Text style={styles.statusText}>{errorMessage}</Text>
          ) : selectedNovels.length ? (
            <View style={selectedShelf === "reading" ? styles.listGroup : styles.grid}>
              {selectedNovels.map((item) => {
                return (
                  <NovelCard 
                    key={item.id} 
                    novel={item.novel} 
                    variant={selectedShelf === "reading" ? "list" : "grid"}
                    readProgress={selectedShelf === "reading" ? item.readProgress : undefined}
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
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: inkroadTheme.colors.text,
    textAlign: "center",
  },
  stateText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: inkroadTheme.colors.textMuted,
    textAlign: "center",
  },
  loginButton: {
    marginTop: 18,
    minWidth: 140,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: inkroadTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0a0a0a",
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
    backgroundColor: "rgba(212,168,67,0.16)",
    borderColor: "rgba(212,168,67,0.5)",
  },
  filterChipText: {
    color: inkroadTheme.colors.textMuted,
    fontSize: 14,
    fontWeight: "600"
  },
  filterChipTextActive: {
    color: inkroadTheme.colors.inkGold,
    fontWeight: "700",
  },

  storePanel: {
    paddingHorizontal: 16,
  },
  statusText: {
    fontSize: 14,
    lineHeight: 22,
    color: inkroadTheme.colors.textMuted,
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
