import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../../lib/supabase";
import { AppHeader } from "../components/AppHeader";
import { useAuthSession } from "../hooks/useAuthSession";
import { createAccountRepository } from "../reader/accountRepository";
import { inkroadTheme } from "../theme";

const c = inkroadTheme.colors;
const r = inkroadTheme.radius;
const accountRepository = createAccountRepository();

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
  const [profileData, setProfileData] = useState<{
    profile: {
      displayName: string;
      email: string;
      isCreator: boolean;
      marketingOptIn: boolean;
      avatarUrl?: string | null;
    };
    stats: {
      readingCount: number;
      wishlistCount: number;
      purchasedCount: number;
    };
  } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [supportVisible, setSupportVisible] = useState(false);
  const [supportCategory, setSupportCategory] = useState<
    "account" | "payment" | "content" | "bug" | "other"
  >("other");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportStatus, setSupportStatus] = useState<string | null>(null);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!session?.user) {
      setProfileData(null);
      setErrorMessage(null);
      setIsLoadingProfile(false);
      return;
    }

    setIsLoadingProfile(true);
    accountRepository
      .getProfileData(session.user.id, {
        email: session.user.email,
        user_metadata: session.user.user_metadata as Record<string, unknown> | undefined,
      })
      .then((data) => {
        if (cancelled) {
          return;
        }

        setProfileData(data);
        setErrorMessage(null);
        setIsLoadingProfile(false);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setProfileData(null);
        setErrorMessage(
          error instanceof Error ? error.message : "프로필을 불러오지 못했습니다."
        );
        setIsLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!profileData) {
      return;
    }

    setDisplayNameInput(profileData.profile.displayName);
    setMarketingOptIn(profileData.profile.marketingOptIn);
    setAvatarUrl(profileData.profile.avatarUrl ?? null);
  }, [profileData]);

  const profile = useMemo(() => {
    if (!profileData) {
      return null;
    }

    return {
      name: profileData.profile.displayName,
      email: profileData.profile.email,
      isCreator: profileData.profile.isCreator,
    };
  }, [profileData]);

  const handleSaveProfile = async () => {
    if (!session?.user || isSavingProfile) {
      return;
    }

    setIsSavingProfile(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const updatedProfile = await accountRepository.updateProfileSettings(session.user.id, {
        displayName: displayNameInput,
        marketingOptIn,
        email: session.user.email ?? "",
      });

      setProfileData((current) =>
        current
          ? {
              ...current,
              profile: {
                ...current.profile,
                displayName: updatedProfile.displayName,
                marketingOptIn: updatedProfile.marketingOptIn,
              },
            }
          : current
      );
      setDisplayNameInput(updatedProfile.displayName);
      setMarketingOptIn(updatedProfile.marketingOptIn);
      setSaveMessage("프로필 설정이 저장되었습니다.");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "프로필 설정을 저장하지 못했습니다."
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const result = await supabase.auth.signOut();
      if (result.error) {
        throw result.error;
      }
      router.push("/auth");
    } catch (_error) {
      setSaveError("로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handlePickAvatar = async () => {
    if (!session?.user || isUploadingAvatar) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]?.base64) {
      return;
    }

    setIsUploadingAvatar(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const uploaded = await accountRepository.uploadProfileAvatar(session.user.id, {
        uri: result.assets[0].uri,
        mimeType: result.assets[0].mimeType ?? "image/jpeg",
        base64: result.assets[0].base64,
      });

      setAvatarUrl(uploaded.avatarUrl);
      setProfileData((current) =>
        current
          ? {
              ...current,
              profile: {
                ...current.profile,
                avatarUrl: uploaded.avatarUrl,
              },
            }
          : current
      );
      setSaveMessage("아바타가 변경되었습니다.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "아바타를 변경하지 못했습니다.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmitSupport = async () => {
    if (!session?.user || isSubmittingSupport) {
      return;
    }

    setIsSubmittingSupport(true);
    setSupportStatus(null);

    try {
      const result = await accountRepository.submitSupportTicket(session.user.id, {
        email: session.user.email ?? "",
        category: supportCategory,
        subject: supportSubject,
        message: supportMessage,
      });

      setSupportStatus(
        result.notificationStatus === "sent"
          ? "문의가 접수되었고 관리자에게 전달되었습니다."
          : "문의는 접수되었지만 관리자 알림이 지연될 수 있습니다."
      );
      setSupportSubject("");
      setSupportMessage("");
    } catch (error) {
      setSupportStatus(
        error instanceof Error ? error.message : "문의 접수에 실패했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  if (isLoadingSession || isLoadingProfile) {
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
            MY 화면에서는 프로필, 활동 요약, 계정 관리를 확인할 수 있습니다.
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
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.nameText} numberOfLines={1}>{profile.name}</Text>
            <Text style={styles.emailText} numberOfLines={1}>{profile.email}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={c.fg3} />
        </TouchableOpacity>

        {/* Coin balance */}
        <View style={styles.coinCard}>
          <Text style={styles.coinKicker}>내 활동</Text>
          <View style={styles.activityRow}>
            <View style={styles.activityMetric}>
              <Text style={styles.activityValue}>읽는 중 {profileData?.stats.readingCount ?? 0}</Text>
            </View>
            <View style={styles.activityMetric}>
              <Text style={styles.activityValue}>찜 {profileData?.stats.wishlistCount ?? 0}</Text>
            </View>
            <View style={styles.activityMetric}>
              <Text style={styles.activityValue}>구매 {profileData?.stats.purchasedCount ?? 0}</Text>
            </View>
          </View>
          <View style={styles.coinRow}>
            <Text style={styles.coinNote}>
              {errorMessage ?? "서재 활동은 계정에 연결된 Supabase 데이터 기준으로 집계됩니다."}
            </Text>
            <TouchableOpacity style={styles.chargeBtn} onPress={() => router.push("/library")}>
              <Text style={styles.chargeBtnText}>서재 보기</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>프로필 설정</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>닉네임</Text>
            <TextInput
              value={displayNameInput}
              onChangeText={setDisplayNameInput}
              placeholder="닉네임을 입력해 주세요"
              placeholderTextColor={c.fg3}
              style={styles.textInput}
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.fieldLabel}>마케팅 알림 수신</Text>
              <Text style={styles.helperInline}>이벤트와 프로모션 소식을 받아봅니다.</Text>
            </View>
            <Switch value={marketingOptIn} onValueChange={setMarketingOptIn} />
          </View>

          {(saveMessage || saveError) && (
            <Text style={saveError ? styles.errorText : styles.successText}>
              {saveError ?? saveMessage}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.btnPrimary, isSavingProfile && styles.btnDisabled]}
            onPress={handleSaveProfile}
            disabled={isSavingProfile}
          >
            <Text style={styles.btnPrimaryText}>
              {isSavingProfile ? "저장 중..." : "저장하기"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryAction, isUploadingAvatar && styles.btnDisabled]}
            onPress={handlePickAvatar}
            disabled={isUploadingAvatar}
          >
            <Text style={styles.secondaryActionText}>
              {isUploadingAvatar ? "업로드 중..." : "아바타 변경"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Menu list */}
        <View style={styles.menuList}>
          {visibleMenuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i === visibleMenuItems.length - 1 && styles.menuItemLast]}
              onPress={() => {
                if (item.label === "고객센터") {
                  setSupportVisible(true);
                  return;
                }
                item.route ? router.push(item.route as any) : Alert.alert(item.label);
              }}
            >
              <Text style={styles.menuLabel}>{item.label}</Text>
              <MaterialIcons name="chevron-right" size={20} color={c.fg3} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast, isSigningOut && styles.menuItemDisabled]}
            onPress={handleLogout}
            disabled={isSigningOut}
          >
            <Text style={[styles.menuLabel, styles.menuLabelDanger]}>
              {isSigningOut ? "로그아웃 중..." : "로그아웃"}
            </Text>
          </TouchableOpacity>
        </View>

        <Modal visible={supportVisible} animationType="slide" transparent>
          <View style={styles.modalScrim}>
            <View style={styles.modalCard}>
              <Text style={styles.settingsTitle}>고객센터</Text>

              <View style={styles.categoryRow}>
                {(["other", "bug", "account", "payment", "content"] as const).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      supportCategory === category && styles.categoryChipActive,
                    ]}
                    onPress={() => setSupportCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        supportCategory === category && styles.categoryChipTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                placeholder="문의 제목"
                placeholderTextColor={c.fg3}
                value={supportSubject}
                onChangeText={setSupportSubject}
                style={styles.textInput}
              />
              <TextInput
                placeholder="문의 내용을 입력해 주세요"
                placeholderTextColor={c.fg3}
                value={supportMessage}
                onChangeText={setSupportMessage}
                style={[styles.textInput, styles.textArea]}
                multiline
              />

              {supportStatus ? <Text style={styles.helperInline}>{supportStatus}</Text> : null}

              <TouchableOpacity
                style={[styles.btnPrimary, isSubmittingSupport && styles.btnDisabled]}
                onPress={handleSubmitSupport}
                disabled={isSubmittingSupport}
              >
                <Text style={styles.btnPrimaryText}>
                  {isSubmittingSupport ? "보내는 중..." : "문의 보내기"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryAction} onPress={() => setSupportVisible(false)}>
                <Text style={styles.secondaryActionText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    gap: 12,
  },
  activityRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  activityMetric: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  activityValue: {
    fontSize: 13,
    fontWeight: "800",
    color: c.fg1,
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
    fontSize: 11,
    flex: 1,
    lineHeight: 18,
    color: c.fg3,
  },
  settingsCard: {
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: c.borderWhite,
    borderRadius: r.lg,
    gap: 14,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: c.fg1,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: c.fg1,
  },
  textInput: {
    borderWidth: 1,
    borderColor: c.borderWhite,
    borderRadius: r.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: c.fg1,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  helperInline: {
    fontSize: 12,
    lineHeight: 18,
    color: c.fg3,
  },
  successText: {
    fontSize: 13,
    color: "#7CFCB7",
  },
  errorText: {
    fontSize: 13,
    color: "#FF9A9A",
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
  menuItemDisabled: {
    opacity: 0.55,
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
  secondaryAction: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.borderWhite,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnPrimaryText: {
    color: c.fgOnGold,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryActionText: {
    color: c.fg1,
    fontSize: 14,
    fontWeight: "700",
  },
  modalScrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
    padding: 20,
  },
  modalCard: {
    borderRadius: r.lg,
    borderWidth: 1,
    borderColor: c.borderWhite,
    backgroundColor: c.background,
    padding: 20,
    gap: 14,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.borderWhite,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  categoryChipActive: {
    backgroundColor: c.inkGold,
    borderColor: c.inkGold,
  },
  categoryChipText: {
    color: c.fg1,
    fontSize: 12,
    fontWeight: "700",
  },
  categoryChipTextActive: {
    color: c.fgOnGold,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
});
