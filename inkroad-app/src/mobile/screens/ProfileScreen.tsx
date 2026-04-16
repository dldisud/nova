import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { mockProfile } from "../data/mockInkroad";
import { useAuthSession } from "../hooks/useAuthSession";
import { inkroadTheme } from "../theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { session, isLoadingSession } = useAuthSession();
  const [notifications, setNotifications] = useState(mockProfile.notifications);
  const [penName, setPenName] = useState("");
  const [bio, setBio] = useState("");

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
        <AppHeader title="내 정보" />
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
        <AppHeader title="내 정보" />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>로그인이 필요해요</Text>
          <Text style={styles.helperText}>
            MY 화면에서는 프로필 설정, 알림 설정, 계정 관리를 할 수 있습니다.
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push("/auth")}>
            <Text style={styles.btnPrimaryText}>로그인하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <SafeAreaView edges={["top"]} />
      <AppHeader title="내 정보" />
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={32} color={inkroadTheme.colors.accent} />
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.nameText} numberOfLines={1}>
              {profile.name}
            </Text>
            <Text style={styles.emailText} numberOfLines={1}>
              {profile.email}
            </Text>
          </View>
        </View>

        {/* Profile Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>프로필 설정</Text>
          <View style={styles.formGroup}>
            <View style={styles.field}>
              <Text style={styles.label}>닉네임</Text>
              <TextInput
                style={styles.input}
                value={penName}
                onChangeText={setPenName}
                placeholder="닉네임 입력"
                placeholderTextColor="#4a4a4a"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>소개</Text>
              <TextInput
                style={styles.input}
                value={bio}
                onChangeText={setBio}
                placeholder="소개 문구 (선택)"
                placeholderTextColor="#4a4a4a"
              />
            </View>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => Alert.alert("알림", "저장했습니다.")}>
              <Text style={styles.btnPrimaryText}>저장하기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림 설정</Text>
          <View style={styles.togglesGroup}>
            {[
              { key: "comments", label: "댓글 알림" },
              { key: "likes", label: "좋아요 알림" },
              { key: "sales", label: "세일 알림" },
            ].map((item) => (
              <View key={item.key} style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{item.label}</Text>
                <Switch
                  value={notifications[item.key as keyof typeof notifications]}
                  onValueChange={(value) =>
                    setNotifications((current) => ({ ...current, [item.key]: value }))
                  }
                  trackColor={{ false: "#333", true: inkroadTheme.colors.accent }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => Alert.alert("알림", "알림 설정을 저장했습니다.")}>
            <Text style={styles.btnPrimaryText}>알림 저장</Text>
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 관리</Text>
          <View style={styles.actionsGroup}>
            <TouchableOpacity 
              style={[styles.btnBase, styles.btnGhost]} 
              onPress={() => Alert.alert("알림", "로그아웃 기능")}
            >
              <Text style={styles.btnGhostText}>로그아웃</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.btnBase, styles.btnDanger]} 
              onPress={() => Alert.alert("위험", "정말 탈퇴하시겠습니까?", [
                { text: "취소", style: "cancel" },
                { text: "탈퇴", style: "destructive" }
              ])}
            >
              <Text style={styles.btnDangerText}>계정 탈퇴</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
    color: '#f0e6d3',
  },
  helperText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#7a6f5f',
    textAlign: "center",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  /* Header Card */
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(191, 169, 122, 0.15)',
    borderRadius: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(212, 168, 67, 0.15)',
    alignItems: "center",
    justifyContent: "center",
  },
  infoBox: {
    flex: 1,
    gap: 4,
  },
  nameText: {
    margin: 0,
    fontSize: 18,
    fontWeight: "700",
    color: '#f0e6d3',
  },
  emailText: {
    margin: 0,
    fontSize: 12,
    color: '#7a6f5f',
  },
  /* Sections */
  section: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(191, 169, 122, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 14,
    fontWeight: "700",
    color: '#d4a843',
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  /* Form */
  formGroup: {
    gap: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: '#7a6f5f',
    marginLeft: 4,
  },
  input: {
    width: "100%",
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(191, 169, 122, 0.15)',
    borderRadius: 10,
    color: '#f0e6d3',
    fontSize: 15,
  },
  /* Toggles */
  togglesGroup: {
    gap: 16,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
  },
  toggleLabel: {
    fontSize: 15,
    color: '#f0e6d3',
  },
  /* Actions */
  actionsGroup: {
    gap: 10,
  },
  /* Button Base */
  btnBase: {
    height: 50,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPrimary: {
    height: 50,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: '#d4a843',
    marginTop: 6,
  },
  btnPrimaryText: {
    color: '#0a0a0a',
    fontSize: 15,
    fontWeight: "700",
  },
  btnGhost: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(191, 169, 122, 0.15)',
  },
  btnGhostText: {
    color: '#f0e6d3',
    fontSize: 15,
    fontWeight: "700",
  },
  btnDanger: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  btnDangerText: {
    color: '#f87171',
    fontSize: 15,
    fontWeight: "700",
  },
});
