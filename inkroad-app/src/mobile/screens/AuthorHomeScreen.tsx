import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { createMockAuthorRepository } from "../creator/repository";
import type { AuthorRepository } from "../creator/types";
import { mockProfile } from "../data/mockInkroad";
import { useAuthSession } from "../hooks/useAuthSession";
import { createAccountRepository } from "../reader/accountRepository";
import type { AuthorDashboardSummary, AuthorWorkSummary } from "../types";
import { inkroadTheme } from "../theme";

const accountRepository = createAccountRepository();

const c = inkroadTheme.colors;
const r = inkroadTheme.radius;

type AuthorHomeScreenProps = {
  repository?: AuthorRepository;
  onCreateEpisode?: () => void;
  onResumeDraft?: () => void;
  onSelectWork?: (work: AuthorWorkSummary) => void;
};

export default function AuthorHomeScreen({
  repository,
  onCreateEpisode,
  onResumeDraft,
  onSelectWork,
}: AuthorHomeScreenProps) {
  const router = useRouter();
  const { session, isLoadingSession } = useAuthSession();
  const authorRepository = useMemo(
    () => repository ?? createMockAuthorRepository(),
    [repository]
  );
  const [works, setWorks] = useState<AuthorWorkSummary[]>([]);
  const [dashboard, setDashboard] = useState<AuthorDashboardSummary | null>(null);
  const [isCreatorChecked, setIsCreatorChecked] = useState(false);
  const [isCreatorReal, setIsCreatorReal] = useState(false);

  useEffect(() => {
    let active = true;
    if (!session?.user) {
      setIsCreatorReal(false);
      setIsCreatorChecked(true);
      return;
    }
    accountRepository
      .getProfileData(session.user.id, {
        email: session.user.email,
        user_metadata: session.user.user_metadata as Record<string, unknown> | undefined,
      })
      .then((data) => {
        if (!active) return;
        setIsCreatorReal(data.profile.isCreator);
        setIsCreatorChecked(true);
      })
      .catch(() => {
        if (!active) return;
        setIsCreatorReal(false);
        setIsCreatorChecked(true);
      });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    let active = true;
    Promise.all([
      authorRepository.listWorks(),
      authorRepository.getDashboardSummary(),
    ]).then(([items, nextDashboard]) => {
      if (!active) return;
      setWorks(items);
      setDashboard(nextDashboard);
    }).catch(() => {
      // 데이터 로드 실패 시 빈 상태 유지
    });
    return () => { active = false; };
  }, [authorRepository]);

  const handleCreateEpisode = () => {
    if (onCreateEpisode) { onCreateEpisode(); return; }
    const fallbackWorkId = works[0]?.id;
    if (fallbackWorkId) router.push(`/author/episode/${fallbackWorkId}`);
  };

  const handleResumeDraft = async () => {
    if (onResumeDraft) { onResumeDraft(); return; }
    const recentDraft = await authorRepository.getMostRecentDraft();
    if (recentDraft?.novelId) {
      const route = recentDraft.episodeId
        ? `/author/episode/${recentDraft.novelId}?episodeId=${recentDraft.episodeId}`
        : `/author/episode/${recentDraft.novelId}`;
      router.push(route);
      return;
    }
    const fallbackWorkId = works[0]?.id;
    if (fallbackWorkId) router.push(`/author/episode/${fallbackWorkId}`);
  };

  const handleSelectWork = (work: AuthorWorkSummary) => {
    if (onSelectWork) { onSelectWork(work); return; }
    router.push(`/author/work/${work.id}`);
  };

  const isCreator = Boolean(repository) || isCreatorReal;

  if ((isLoadingSession || !isCreatorChecked) && !repository) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppHeader title="작가 스튜디오" showProfile />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!repository && !isCreator) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <AppHeader title="작가 스튜디오" showProfile />
        <View style={styles.center}>
          <MaterialIcons name="edit-note" size={48} color={c.fg3} />
          <Text style={styles.emptyTitle}>작가 계정이 필요해요</Text>
          <Text style={styles.emptyBody}>작품 관리와 회차 작성은 작가 전용 공간입니다.</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push(session?.user ? "/profile" : "/auth")}
          >
            <Text style={styles.emptyBtnText}>
              {session?.user ? "MY에서 계정 확인" : "로그인하기"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeWorks = works.filter((w) => w.status === "연재중").length;
  const displayName = (session?.user?.user_metadata?.display_name as string) || mockProfile.name;
  const activePenName = dashboard?.activePenName ?? mockProfile.name;
  const inboxItems = dashboard?.inbox ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppHeader title="작가 스튜디오" showProfile />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

        {/* Greeting + date */}
        <View style={styles.greetRow}>
          <View>
            <Text style={styles.greetName}>{displayName}</Text>
            <Text style={styles.greetDate}>{formatToday()}</Text>
          </View>
          <View style={styles.greetBadge}>
            <Text style={styles.greetBadgeText}>CREATOR</Text>
          </View>
        </View>

        {/* 25: 필명 스위처 */}
        <TouchableOpacity
          style={styles.penNameRow}
          onPress={() => {
            Alert.alert(
              "필명 전환",
              (dashboard?.penNames ?? [activePenName]).map((n) => `${n === activePenName ? "✓ " : "  "}${n}`).join("\n"),
              [
                { text: "취소", style: "cancel" },
                ...(dashboard?.penNames ?? [])
                  .filter((name) => name !== activePenName)
                  .map((name) => ({
                  text: name,
                  onPress: async () => {
                    const nextName = await authorRepository.setActivePenName(name);
                    setDashboard((current) =>
                      current
                        ? {
                            ...current,
                            activePenName: nextName,
                          }
                        : current
                    );
                  },
                })),
              ]
            );
          }}
        >
          <MaterialIcons name="person-outline" size={13} color={c.fg3} />
          <Text style={styles.penNameLabel}>필명</Text>
          <Text style={styles.penNameValue}>{activePenName}</Text>
          <MaterialIcons name="expand-more" size={14} color={c.fg3} />
        </TouchableOpacity>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatChip label="총 조회" value={formatCompactNumber(dashboard?.totalViews ?? 0)} icon="visibility" />
          <StatChip label="이번 주" value={`+${formatCompactNumber(dashboard?.weeklyViews ?? 0)}`} icon="trending-up" accent />
          <StatChip label="연재 중" value={`${activeWorks}편`} icon="auto-stories" />
          <StatChip label="미완성 초안" value={`${dashboard?.draftCount ?? 0}화`} icon="edit-note" warn />
        </View>

        {/* Quick actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryAction} onPress={handleCreateEpisode}>
            <MaterialIcons name="edit" size={18} color={c.fgOnGold} />
            <Text style={styles.primaryActionText}>새 회차 쓰기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction} onPress={handleResumeDraft}>
            <MaterialIcons name="history" size={18} color={c.fg1} />
            <Text style={styles.secondaryActionText}>이어쓰기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newWorkAction}
            onPress={() => Alert.alert("새 작품 등록", "작품 제목, 장르, 소개문을 입력하여 새 작품을 등록합니다.")}
          >
            <MaterialIcons name="add" size={20} color={c.fg2} />
          </TouchableOpacity>
        </View>

        {/* ── 15: 연재 주기 & 경고 카드 ── */}
        <View style={styles.scheduleCard}>
          <View style={styles.scheduleHead}>
            <View style={styles.scheduleHeadLeft}>
              <MaterialIcons name="event-repeat" size={16} color={c.inkGold} />
              <Text style={styles.scheduleTitle}>연재 현황</Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert("연재 설정", "연재 주기 설정 화면")}>
              <Text style={styles.scheduleSettingText}>설정</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scheduleStats}>
            <ScheduleStat icon="calendar-today" label="연재 주기" value={dashboard?.cadence ?? "설정 필요"} />
            <View style={styles.scheduleStatDivider} />
            <ScheduleStat icon="schedule" label="다음 발행" value={dashboard?.nextDue ?? "예정 없음"} highlight />
            <View style={styles.scheduleStatDivider} />
            <ScheduleStat icon="local-fire-department" label="연속 연재" value={`${dashboard?.streak ?? 0}주`} />
          </View>

          {/* Overdue warning */}
          {dashboard?.overdueWarning ? (
            <View style={styles.warningRow}>
              <MaterialIcons name="warning-amber" size={14} color={c.inkGold} />
              <Text style={styles.warningText}>{dashboard.overdueWarning}</Text>
            </View>
          ) : null}
        </View>

        {/* 21, 22: 수익 현황 카드 */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueHead}>
            <View style={styles.revenueHeadLeft}>
              <MaterialIcons name="account-balance-wallet" size={16} color={c.inkGold} />
              <Text style={styles.revenueTitle}>수익 현황</Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert("정산 내역", "정산 내역 화면")}>
              <Text style={styles.revenueLinkText}>정산 내역 →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.revenueStats}>
            <View style={styles.revenueStat}>
              <Text style={styles.revenueStatLabel}>이번달 수익</Text>
              <Text style={[styles.revenueStatValue, styles.revenueStatValueAccent]}>
                {formatCurrency(dashboard?.monthlyRevenue ?? 0)}원
              </Text>
            </View>
            <View style={styles.revenueStatDivider} />
            <View style={styles.revenueStat}>
              <Text style={styles.revenueStatLabel}>정산 예정일</Text>
              <Text style={styles.revenueStatValue}>{dashboard?.settlementDate ?? "미정"}</Text>
            </View>
            <View style={styles.revenueStatDivider} />
            <View style={styles.revenueStat}>
              <Text style={styles.revenueStatLabel}>누적 수익</Text>
              <Text style={styles.revenueStatValue}>{formatCurrency(dashboard?.totalRevenue ?? 0)}원</Text>
            </View>
          </View>
        </View>

        {/* 26: 플랫폼 인박스 */}
        <View style={styles.inboxCard}>
          <View style={styles.inboxHead}>
            <View style={styles.inboxHeadLeft}>
              <MaterialIcons name="inbox" size={16} color={c.fg2} />
              <Text style={styles.inboxTitle}>플랫폼 알림</Text>
              <View style={styles.inboxUnreadBadge}>
                <Text style={styles.inboxUnreadText}>{inboxItems.filter(m => m.unread).length}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => Alert.alert("전체 알림", "알림 전체 보기")}>
              <Text style={styles.inboxAllText}>전체 보기</Text>
            </TouchableOpacity>
          </View>
          {inboxItems.map((msg, i) => (
            <TouchableOpacity
              key={msg.id}
              style={[styles.inboxItem, i === inboxItems.length - 1 && styles.inboxItemLast]}
              onPress={() => Alert.alert(msg.label, msg.body)}
            >
              <View style={[styles.inboxDot, msg.unread ? styles.inboxDotUnread : styles.inboxDotRead]} />
              <View style={styles.inboxItemBody}>
                <Text style={styles.inboxItemLabel}>{msg.label}</Text>
                <Text style={styles.inboxItemText} numberOfLines={1}>{msg.body}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color={c.fg3} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Works list */}
        <View style={styles.worksSection}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>내 작품</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{works.length}</Text>
            </View>
          </View>

          {works.map((work) => (
            <TouchableOpacity
              key={work.id}
              activeOpacity={0.86}
              style={styles.workCard}
              onPress={() => handleSelectWork(work)}
            >
              <View style={styles.coverFrame}>
                <Image source={{ uri: work.coverUrl }} style={styles.coverImage} />
              </View>
              <View style={styles.workInfo}>
                <Text style={styles.workTitle} numberOfLines={2}>{work.title}</Text>
                <View style={styles.workMetaRow}>
                  <View style={[styles.statusPill, work.status === "연재중" && styles.statusPillActive]}>
                    <Text style={[styles.statusPillText, work.status === "연재중" && styles.statusPillTextActive]}>
                      {work.status}
                    </Text>
                  </View>
                  <Text style={styles.workEpCount}>{work.totalEpisodes}화</Text>
                  <Text style={styles.workDate}>수정 {formatShortDate(work.updatedAt)}</Text>
                </View>
                <View style={styles.workAction}>
                  <Text style={styles.workActionText}>회차 관리</Text>
                  <MaterialIcons name="chevron-right" size={16} color={c.fg3} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function StatChip({ label, value, icon, accent, warn }: {
  label: string; value: string;
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  accent?: boolean; warn?: boolean;
}) {
  const valueColor = accent ? c.freeBright : warn ? c.inkGold : c.fg1;
  return (
    <View style={styles.statChip}>
      <MaterialIcons name={icon} size={16} color={c.fg3} />
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ScheduleStat({ icon, label, value, highlight }: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string; value: string; highlight?: boolean;
}) {
  return (
    <View style={styles.scheduleStat}>
      <MaterialIcons name={icon} size={14} color={highlight ? c.inkGold : c.fg3} />
      <Text style={[styles.scheduleStatValue, highlight && { color: c.inkGold }]}>{value}</Text>
      <Text style={styles.scheduleStatLabel}>{label}</Text>
    </View>
  );
}

function formatToday() {
  const now = new Date();
  return `${now.getMonth() + 1}월 ${now.getDate()}일`;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금";
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function formatCompactNumber(value: number) {
  if (value >= 1000) {
    const compact = value / 1000;
    return `${Number.isInteger(compact) ? compact.toFixed(0) : compact.toFixed(1)}k`;
  }
  return value.toString();
}

function formatCurrency(value: number) {
  return value.toLocaleString("ko-KR");
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 16 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 14 },
  emptyTitle: { fontSize: 22, fontWeight: "800", color: c.fg1, textAlign: "center" },
  emptyBody: { fontSize: 14, lineHeight: 22, color: c.fg3, textAlign: "center" },
  emptyBtn: { height: 48, paddingHorizontal: 28, borderRadius: 12, backgroundColor: c.inkGold, alignItems: "center", justifyContent: "center" },
  emptyBtnText: { fontSize: 14, fontWeight: "700", color: c.fgOnGold },

  greetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 4 },
  greetName: { fontSize: 22, fontWeight: "900", color: c.fg1, letterSpacing: -0.5 },
  greetDate: { marginTop: 3, fontSize: 12, color: c.fg3 },
  greetBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: r.pill, backgroundColor: "rgba(212,168,67,0.14)", borderWidth: 1, borderColor: "rgba(212,168,67,0.3)" },
  greetBadgeText: { fontSize: 10, fontWeight: "800", color: c.inkGold, letterSpacing: 1.2 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statChip: { flex: 1, minWidth: "44%", paddingHorizontal: 14, paddingVertical: 14, borderRadius: r.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderWhite, gap: 4 },
  statValue: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5, marginTop: 2 },
  statLabel: { fontSize: 11, fontWeight: "600", color: c.fg3 },

  actionRow: { flexDirection: "row", gap: 10 },
  primaryAction: { flex: 2, height: 50, borderRadius: 14, backgroundColor: c.inkGold, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  primaryActionText: { fontSize: 15, fontWeight: "800", color: c.fgOnGold },
  secondaryAction: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  secondaryActionText: { fontSize: 14, fontWeight: "700", color: c.fg1 },
  newWorkAction: { width: 50, height: 50, borderRadius: 14, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" },

  // ── 15: Schedule card
  scheduleCard: {
    padding: 16,
    borderRadius: r.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.2)",
    gap: 14,
  },
  scheduleHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scheduleHeadLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  scheduleTitle: { fontSize: 14, fontWeight: "800", color: c.fg1 },
  scheduleSettingText: { fontSize: 12, fontWeight: "700", color: c.inkGoldSoft },
  scheduleStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  scheduleStat: { flex: 1, alignItems: "center", gap: 4 },
  scheduleStatDivider: { width: 1, height: 32, backgroundColor: c.borderWhite },
  scheduleStatValue: { fontSize: 14, fontWeight: "800", color: c.fg1 },
  scheduleStatLabel: { fontSize: 10, color: c.fg3 },
  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: c.borderSoft,
  },
  warningText: { flex: 1, fontSize: 12, lineHeight: 18, color: c.inkGoldSoft },

  worksSection: { gap: 10 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: c.fg1, letterSpacing: -0.4 },
  countBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.surface3, alignItems: "center", justifyContent: "center" },
  countBadgeText: { fontSize: 12, fontWeight: "800", color: c.fg2 },

  workCard: { flexDirection: "row", gap: 14, padding: 14, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderWhite },
  coverFrame: { width: 68, height: 98, borderRadius: 12, overflow: "hidden", backgroundColor: c.bgHero },
  coverImage: { width: "100%", height: "100%", resizeMode: "cover" },
  workInfo: { flex: 1, justifyContent: "space-between" },
  workTitle: { fontSize: 16, fontWeight: "800", lineHeight: 22, color: c.fg1, letterSpacing: -0.4 },
  workMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: r.pill, backgroundColor: c.surface3 },
  statusPillActive: { backgroundColor: "rgba(74,222,128,0.12)" },
  statusPillText: { fontSize: 10, fontWeight: "700", color: c.fg3 },
  statusPillTextActive: { color: c.freeBright },
  workEpCount: { fontSize: 12, fontWeight: "700", color: c.fg3 },
  workDate: { fontSize: 11, color: c.fg3 },
  workAction: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  workActionText: { fontSize: 12, fontWeight: "700", color: c.inkGoldSoft },

  // 25: pen name switcher
  penNameRow: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: r.pill, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface2 },
  penNameLabel: { fontSize: 11, color: c.fg3 },
  penNameValue: { fontSize: 12, fontWeight: "700", color: c.fg2 },

  // 21, 22: revenue card
  revenueCard: { padding: 16, borderRadius: r.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderWhite, gap: 12 },
  revenueHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  revenueHeadLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  revenueTitle: { fontSize: 14, fontWeight: "800", color: c.fg1 },
  revenueLinkText: { fontSize: 12, fontWeight: "700", color: c.inkGoldSoft },
  revenueStats: { flexDirection: "row", alignItems: "center" },
  revenueStat: { flex: 1, alignItems: "center", gap: 3 },
  revenueStatDivider: { width: 1, height: 28, backgroundColor: c.borderWhite },
  revenueStatLabel: { fontSize: 10, color: c.fg3 },
  revenueStatValue: { fontSize: 16, fontWeight: "900", color: c.fg1 },
  revenueStatValueAccent: { color: c.inkGold },

  // 26: inbox card
  inboxCard: { borderRadius: r.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderWhite, overflow: "hidden" },
  inboxHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.borderSoft },
  inboxHeadLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  inboxTitle: { fontSize: 14, fontWeight: "800", color: c.fg1 },
  inboxUnreadBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.inkGold, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  inboxUnreadText: { fontSize: 10, fontWeight: "800", color: c.fgOnGold },
  inboxAllText: { fontSize: 12, fontWeight: "700", color: c.fg3 },
  inboxItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.borderSoft },
  inboxItemLast: { borderBottomWidth: 0 },
  inboxDot: { width: 7, height: 7, borderRadius: 4 },
  inboxDotUnread: { backgroundColor: c.inkGold },
  inboxDotRead: { backgroundColor: "transparent" },
  inboxItemBody: { flex: 1, gap: 2 },
  inboxItemLabel: { fontSize: 11, fontWeight: "800", color: c.fg3, textTransform: "uppercase", letterSpacing: 0.8 },
  inboxItemText: { fontSize: 13, fontWeight: "600", color: c.fg1 },
});
