import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { mockProfile } from "../data/mockInkroad";
import { useAuthSession } from "../hooks/useAuthSession";
import { inkroadTheme } from "../theme";

const c = inkroadTheme.colors;
const r = inkroadTheme.radius;

type MenuItem = { label: string; route: string | null; creatorOnly?: boolean };

const MENU_ITEMS: MenuItem[] = [
  { label: "내 결제내역", route: "/payment" },
  { label: "연출 서식 도우미", route: "/format-studio", creatorOnly: true },
  { label: "알림 설정", route: null },
  { label: "언어 · Language", route: null },
  { label: "고객센터", route: null },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { session, isLoadingSession } = useAuthSession();

  const profile = useMemo(() => {
    if (!session?.user) return null;
    return {
      ...mockProfile,
      email: session.user.email ?? mockProfile.email,
      name:
        typeof session.user.user_metadata?.display_name === "string"
          ? session.user.user_metadata.display_name
          : mockProfile.name,
    };
  }, [session]);

  if (isLoadingSession) {
    return (
      <View style={styles.shell}>
        <SafeAreaView edges={["top"]} />
        <AppHeader title="MY" showBack />
        <View style={styles.center}>
          <Text style={styles.helperText}>계정 정보를 불러오는 중입니다...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.shell}>
        <SafeAreaView edges={["top"]} />
        <AppHeader title="MY" showBack />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>로그인이 필요해요</Text>
          <Text style={styles.helperText}>
            MY 화면에서는 프로필, 잔여 코인, 계정 관리를 확인할 수 있습니다.
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push("/auth")}>
            <Text style={styles.btnPrimaryText}>로그인하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const initial = profile.name?.charAt(0) ?? "?";
  const visibleMenuItems = MENU_ITEMS.filter((item) => !item.creatorOnly || profile.isCreator);

  return (
    <View style={styles.shell}>
      <SafeAreaView edges={["top"]} />
      <AppHeader title="MY" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>

        {/* Profile card */}
        <TouchableOpacity activeOpacity={0.8} style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.nameText} numberOfLines={1}>{profile.name}</Text>
            <Text style={styles.emailText} numberOfLines={1}>{profile.email}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={c.fg3} />
        </TouchableOpacity>

        {/* Coin balance */}
        <View style={styles.coinCard}>
          <Text style={styles.coinKicker}>잔여 코인</Text>
          <View style={styles.coinRow}>
            <Text style={styles.coinAmount}>{mockProfile.coins?.toLocaleString() ?? "5,000"} G</Text>
            <TouchableOpacity style={styles.chargeBtn} onPress={() => Alert.alert("충전", "코인 충전 기능")}>
              <Text style={styles.chargeBtnText}>충전하기</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.coinNote}>• 충전된 코인은 5년간 유효합니다.</Text>
        </View>

        {/* Menu list */}
        <View style={styles.menuList}>
          {visibleMenuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i === visibleMenuItems.length - 1 && styles.menuItemLast]}
              onPress={() => item.route ? router.push(item.route as any) : Alert.alert(item.label)}
            >
              <Text style={styles.menuLabel}>{item.label}</Text>
              <MaterialIcons name="chevron-right" size={20} color={c.fg3} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={() => Alert.alert("로그아웃", "로그아웃하시겠습니까?", [
              { text: "취소", style: "cancel" },
              { text: "로그아웃", style: "destructive" },
            ])}
          >
            <Text style={[styles.menuLabel, styles.menuLabelDanger]}>로그아웃</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: c.background,
  },
  center: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: c.fg1,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 22,
    color: c.fg3,
    textAlign: "center",
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 16,
  },

  // Profile card
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: c.borderWhite,
    borderRadius: r.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.inkGold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "900",
    color: c.fgOnGold,
  },
  profileInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontWeight: "800",
    color: c.fg1,
  },
  emailText: {
    marginTop: 2,
    fontSize: 12,
    color: c.fg3,
  },

  // Coin card
  coinCard: {
    padding: 18,
    backgroundColor: "rgba(212,168,67,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.25)",
    borderRadius: r.lg,
  },
  coinKicker: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.72)",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  coinRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  coinAmount: {
    fontSize: 28,
    fontWeight: "900",
    color: c.inkGold,
    letterSpacing: -0.8,
  },
  chargeBtn: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: c.inkGold,
    justifyContent: "center",
    alignItems: "center",
  },
  chargeBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: c.fgOnGold,
  },
  coinNote: {
    marginTop: 10,
    fontSize: 11,
    color: c.fg3,
  },

  // Menu list
  menuList: {
    borderRadius: r.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: c.borderWhite,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: c.borderSoft,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: c.fg1,
  },
  menuLabelDanger: {
    color: c.danger,
  },

  // Buttons
  btnPrimary: {
    height: 50,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: c.inkGold,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    color: c.fgOnGold,
    fontSize: 15,
    fontWeight: "700",
  },
});
