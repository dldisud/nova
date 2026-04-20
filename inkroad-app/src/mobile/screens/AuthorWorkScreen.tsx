import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { createMockAuthorRepository } from "../creator/repository";
import type { AuthorRepository } from "../creator/types";
import type { AgeRating, AuthorEpisodeHistoryEntry, AuthorEpisodeSummary, AuthorReaction, AuthorWorkMeta, AuthorWorkSummary, PublishStatus } from "../types";
import { inkroadTheme } from "../theme";

const c = inkroadTheme.colors;
const r = inkroadTheme.radius;

type AuthorWorkScreenProps = {
  workId: string;
  repository?: AuthorRepository;
};

type StatusTab = "all" | PublishStatus;
type SortOrder = "newest" | "oldest";

// 11, 13: 탭 정의
const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "draft", label: "초안" },
  { key: "scheduled", label: "예약" },
  { key: "published", label: "발행" },
];
const AGE_RATING_OPTIONS: { key: AgeRating; label: string }[] = [
  { key: "all", label: "전체이용가" },
  { key: "15", label: "15세 이상" },
  { key: "18", label: "18세 이상" },
];

export default function AuthorWorkScreen({ workId, repository }: AuthorWorkScreenProps) {
  const router = useRouter();
  const authorRepository = useMemo(
    () => repository ?? createMockAuthorRepository(),
    [repository]
  );
  const [work, setWork] = useState<AuthorWorkSummary | null>(null);
  const [episodes, setEpisodes] = useState<AuthorEpisodeSummary[]>([]);
  const [workMeta, setWorkMeta] = useState<AuthorWorkMeta | null>(null);
  const [reactions, setReactions] = useState<AuthorReaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [metaForm, setMetaForm] = useState<AuthorWorkMeta | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    Promise.all([
      authorRepository.getWork(workId),
      authorRepository.getWorkMeta(workId),
      authorRepository.listEpisodes(workId),
      authorRepository.listReaderReactions(workId),
    ]).then(([nextWork, nextMeta, nextEpisodes, nextReactions]) => {
      if (!active) return;
      setWork(nextWork);
      setWorkMeta(nextMeta);
      setMetaForm(nextMeta);
      setEpisodes(nextEpisodes);
      setReactions(nextReactions);
      setIsLoading(false);
    }).catch(() => {
      if (!active) return;
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [authorRepository, workId]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top"]} />
        <AppHeader title="회차 관리" showBack />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>불러오는 중...</Text>
        </View>
      </View>
    );
  }

  if (!work) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top"]} />
        <AppHeader title="회차 관리" showBack />
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>작품을 찾지 못했어요</Text>
          <Text style={styles.emptyBody}>목록에서 다시 선택해 주세요.</Text>
        </View>
      </View>
    );
  }

  const sorted = [...episodes].sort((a, b) =>
    sortOrder === "newest" ? b.number - a.number : a.number - b.number
  );

  const filtered = sorted.filter((ep) => {
    const matchesTab = activeTab === "all" || ep.publishStatus === activeTab;
    const matchesSearch = searchQuery.trim() === "" || ep.title.includes(searchQuery.trim());
    return matchesTab && matchesSearch;
  });

  const counts = {
    all: episodes.length,
    draft: episodes.filter((e) => e.publishStatus === "draft").length,
    scheduled: episodes.filter((e) => e.publishStatus === "scheduled").length,
    published: episodes.filter((e) => e.publishStatus === "published").length,
  };

  const handleHistory = async (episode: AuthorEpisodeSummary) => {
    const history = await authorRepository.listEpisodeHistory(work.id, episode.id.startsWith(`${work.id}-draft-new`) ? undefined : episode.id);
    const lines = history
      .map((entry) => `• ${entry.label} — ${formatHistoryTimestamp(entry.timestamp)} (${getStateLabel(entry.state)})`)
      .join("\n");
    Alert.alert("변경 이력", `${episode.title}\n\n${lines}`);
  };

  const handleSaveMeta = async () => {
    if (!metaForm) return;
    const nextMeta = await authorRepository.saveWorkMeta(work.id, metaForm);
    setWorkMeta(nextMeta);
    setMetaForm(nextMeta);
    setShowMetaModal(false);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} />
      <AppHeader title={work.title} showBack />

      <ScrollView contentContainerStyle={styles.content}>

        {/* 27: 작품 운영 메타데이터 */}
        <WorkMetaCard workTitle={work.title} meta={workMeta} onEdit={() => setShowMetaModal(true)} />

        {/* Work header */}
        <View style={styles.workHeader}>
          <View style={styles.workCoverFrame}>
            <Image source={{ uri: work.coverUrl }} style={styles.workCoverImage} />
          </View>
          <View style={styles.workMeta}>
            <View style={[styles.statusPill, work.status === "연재중" && styles.statusPillActive]}>
              <Text style={[styles.statusPillText, work.status === "연재중" && styles.statusPillTextActive]}>
                {work.status}
              </Text>
            </View>
            <Text style={styles.workTitle} numberOfLines={2}>{work.title}</Text>
            <View style={styles.workStatsRow}>
              <Text style={styles.workStatText}><Text style={styles.workStatBold}>{work.totalEpisodes}</Text>화</Text>
              <Text style={styles.workStatDot}>·</Text>
              <Text style={styles.workStatText}><Text style={styles.workStatBold}>{counts.draft}</Text>개 초안</Text>
              <Text style={styles.workStatDot}>·</Text>
              <Text style={styles.workStatText}><Text style={styles.workStatBold}>{counts.scheduled}</Text>개 예약</Text>
            </View>
          </View>
        </View>

        {/* 12, 13: 발행 파이프라인 */}
        <View style={styles.pipeline}>
          <PipelineStep label="초안" count={counts.draft} active={counts.draft > 0} />
          <PipelineArrow />
          <PipelineStep label="예약" count={counts.scheduled} active={counts.scheduled > 0} accent />
          <PipelineArrow />
          <PipelineStep label="발행" count={counts.published} active={counts.published > 0} done />
        </View>

        {/* New episode CTA */}
        <TouchableOpacity
          style={styles.newEpisodeBtn}
          onPress={() => router.push(`/author/episode/${work.id}`)}
        >
          <MaterialIcons name="add" size={20} color={c.fgOnGold} />
          <Text style={styles.newEpisodeBtnText}>새 회차 작성</Text>
        </TouchableOpacity>

        {/* 11: 회차 검색 */}
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={16} color={c.fg3} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="회차 제목 검색"
            placeholderTextColor={c.fg3}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={15} color={c.fg3} />
            </TouchableOpacity>
          )}
        </View>

        {/* 11: Status tabs + sort */}
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {STATUS_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                    {counts[tab.key]}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
          >
            <MaterialIcons
              name={sortOrder === "newest" ? "arrow-downward" : "arrow-upward"}
              size={15}
              color={c.fg2}
            />
            <Text style={styles.sortBtnText}>{sortOrder === "newest" ? "최신순" : "오래된순"}</Text>
          </TouchableOpacity>
        </View>

        {/* Episode list */}
        <View style={styles.episodeList}>
          {filtered.length === 0 ? (
            <View style={styles.emptyTab}>
              <Text style={styles.emptyTabText}>해당 회차가 없습니다.</Text>
            </View>
          ) : (
            filtered.map((episode) => (
              <EpisodeRow
                key={episode.id}
                episode={episode}
                onPress={() =>
                  router.push(
                    episode.id.startsWith(`${work.id}-draft-new`)
                      ? `/author/episode/${work.id}`
                      : `/author/episode/${work.id}?episodeId=${episode.id}`
                  )
                }
                onHistory={() => void handleHistory(episode)}
              />
            ))
          )}
        </View>

        {/* 23: 최근 독자 반응 */}
        <ReaderReactionsCard reactions={reactions} />

      </ScrollView>

      <Modal visible={showMetaModal} transparent animationType="slide" onRequestClose={() => setShowMetaModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowMetaModal(false)}>
          <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>작품 정보 편집</Text>
            {metaForm ? (
              <View style={styles.metaEditor}>
                <Text style={styles.metaInputLabel}>장르</Text>
                <TextInput
                  value={metaForm.genre}
                  onChangeText={(genre) => setMetaForm((current) => (current ? { ...current, genre } : current))}
                  style={styles.metaInput}
                  placeholder="장르"
                  placeholderTextColor={c.fg3}
                />

                <Text style={styles.metaInputLabel}>업데이트</Text>
                <TextInput
                  value={metaForm.updateDay}
                  onChangeText={(updateDay) => setMetaForm((current) => (current ? { ...current, updateDay } : current))}
                  style={styles.metaInput}
                  placeholder="예: 매주 수요일"
                  placeholderTextColor={c.fg3}
                />

                <Text style={styles.metaInputLabel}>연령등급</Text>
                <View style={styles.ageChipRow}>
                  {AGE_RATING_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.ageChip, metaForm.ageRating === option.key && styles.ageChipActive]}
                      onPress={() => setMetaForm((current) => (current ? { ...current, ageRating: option.key } : current))}
                    >
                      <Text style={[styles.ageChipText, metaForm.ageRating === option.key && styles.ageChipTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.metaInputLabel}>키워드</Text>
                <TextInput
                  value={metaForm.keywords.join(", ")}
                  onChangeText={(keywords) =>
                    setMetaForm((current) =>
                      current
                        ? {
                            ...current,
                            keywords: keywords
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean)
                              .map((item) => (item.startsWith("#") ? item : `#${item}`)),
                          }
                        : current
                    )
                  }
                  style={styles.metaInput}
                  placeholder="#태그1, #태그2"
                  placeholderTextColor={c.fg3}
                />

                <TouchableOpacity
                  style={styles.hiatusToggle}
                  onPress={() => setMetaForm((current) => (current ? { ...current, hiatus: !current.hiatus } : current))}
                >
                  <MaterialIcons name={metaForm.hiatus ? "pause-circle-filled" : "play-circle-outline"} size={16} color={metaForm.hiatus ? c.danger : c.fg3} />
                  <Text style={styles.hiatusToggleText}>{metaForm.hiatus ? "휴재 중" : "연재 중"}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowMetaModal(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={() => void handleSaveMeta()}>
                <Text style={styles.modalConfirmText}>저장</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function WorkMetaCard({ workTitle, meta, onEdit }: { workTitle: string; meta: AuthorWorkMeta | null; onEdit: () => void }) {
  return (
    <View style={styles.metaCard}>
      <View style={styles.metaHead}>
        <View style={styles.metaHeadLeft}>
          <MaterialIcons name="tune" size={15} color={c.fg3} />
          <Text style={styles.metaTitle}>작품 정보</Text>
        </View>
        <TouchableOpacity onPress={onEdit}>
          <Text style={styles.metaEditText}>편집</Text>
        </TouchableOpacity>
      </View>
      {meta ? (
        <View style={styles.metaRows}>
          <MetaRow label="장르" value={meta.genre} />
          <MetaRow label="업데이트" value={meta.updateDay} />
          <MetaRow label="연령등급" value={AGE_RATING_OPTIONS.find((option) => option.key === meta.ageRating)?.label ?? meta.ageRating} />
          <View style={styles.metaKwRow}>
            <Text style={styles.metaLabel}>키워드</Text>
            <View style={styles.metaKwChips}>
              {meta.keywords.map((kw) => (
                <View key={kw} style={styles.metaKwChip}>
                  <Text style={styles.metaKwChipText}>{kw}</Text>
                </View>
              ))}
            </View>
          </View>
          {meta.hiatus && (
            <View style={styles.metaHiatusRow}>
              <MaterialIcons name="pause-circle-outline" size={13} color={c.danger} />
              <Text style={styles.metaHiatusText}>휴재 중</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.metaKwRow}>
          <Text style={styles.metaValue}>{`"${workTitle}" 작품 정보를 불러오는 중입니다.`}</Text>
        </View>
      )}
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function ReaderReactionsCard({ reactions }: { reactions: AuthorReaction[] }) {
  return (
    <View style={styles.reactCard}>
      <View style={styles.reactHead}>
        <View style={styles.reactHeadLeft}>
          <MaterialIcons name="chat-bubble-outline" size={15} color={c.fg3} />
          <Text style={styles.reactTitle}>최근 독자 반응</Text>
        </View>
        <TouchableOpacity onPress={() => Alert.alert("댓글 관리", "댓글 전체 관리 화면")}>
          <Text style={styles.reactAllText}>전체 보기</Text>
        </TouchableOpacity>
      </View>
      {reactions.map((item, i) => (
        <View key={item.id} style={[styles.reactItem, i === reactions.length - 1 && styles.reactItemLast]}>
          <View style={styles.reactItemBody}>
            <View style={styles.reactItemMeta}>
              <Text style={styles.reactEpTag}>{item.episodeLabel}</Text>
              <Text style={styles.reactNickname}>{item.nickname}</Text>
              <View style={styles.reactLikes}>
                <MaterialIcons name="favorite-border" size={11} color={c.fg3} />
                <Text style={styles.reactLikeCount}>{item.likes}</Text>
              </View>
            </View>
            <Text style={styles.reactBody} numberOfLines={2}>{item.body}</Text>
          </View>
          <TouchableOpacity
            style={styles.reactReplyBtn}
            onPress={() => Alert.alert("답글", `"${item.nickname}"에게 답글 달기`)}
          >
            <Text style={styles.reactReplyText}>답글</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

// 12, 13: 파이프라인 컴포넌트
function PipelineStep({ label, count, active, accent, done }: {
  label: string; count: number; active: boolean; accent?: boolean; done?: boolean;
}) {
  const bg = done
    ? "rgba(74,222,128,0.12)"
    : accent
    ? "rgba(212,168,67,0.14)"
    : active
    ? c.surface3
    : c.surface2;
  const textColor = done ? c.freeBright : accent ? c.inkGold : active ? c.fg1 : c.fg3;

  return (
    <View style={[styles.pipelineStep, { backgroundColor: bg }]}>
      <Text style={[styles.pipelineCount, { color: textColor }]}>{count}</Text>
      <Text style={[styles.pipelineLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function PipelineArrow() {
  return <MaterialIcons name="arrow-forward" size={14} color={c.fg3} />;
}

// 14: 이력 버튼 포함 에피소드 행
function EpisodeRow({ episode, onPress, onHistory }: {
  episode: AuthorEpisodeSummary;
  onPress: () => void;
  onHistory: () => void;
}) {
  const badgeStyle = episode.publishStatus === "draft"
    ? styles.badgeDraft
    : episode.publishStatus === "scheduled"
    ? styles.badgeScheduled
    : styles.badgePublished;
  const badgeTextStyle = episode.publishStatus === "draft"
    ? styles.badgeDraftText
    : episode.publishStatus === "scheduled"
    ? styles.badgeScheduledText
    : styles.badgePublishedText;
  const badgeLabel = episode.publishStatus === "draft"
    ? "초안"
    : episode.publishStatus === "scheduled"
    ? "예약"
    : "발행";

  return (
    <Pressable style={styles.episodeCard} onPress={onPress}>
      <View style={styles.epNumberCol}>
        <Text style={styles.epNumber}>{String(episode.number).padStart(2, "0")}</Text>
      </View>
      <View style={styles.epBody}>
        <Text style={styles.epTitle} numberOfLines={1}>{episode.title}</Text>
        <Text style={styles.epMeta}>
          {episode.publishStatus === "scheduled" && episode.scheduledAt
            ? `예약: ${episode.scheduledAt}`
            : `수정 ${formatShortDate(episode.updatedAt)}`}
        </Text>
      </View>
      <View style={styles.epRight}>
        <View style={[styles.publishBadge, badgeStyle]}>
          <Text style={[styles.publishBadgeText, badgeTextStyle]}>{badgeLabel}</Text>
        </View>
        <View style={[styles.accessBadge, episode.accessType === "paid" && styles.accessBadgePaid]}>
          <Text style={[styles.accessBadgeText, episode.accessType === "paid" && styles.accessBadgeTextPaid]}>
            {episode.accessType === "free" ? "무료" : `${episode.price}G`}
          </Text>
        </View>
        {/* 14: history */}
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={(e) => { e.stopPropagation?.(); onHistory(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="history" size={16} color={c.fg3} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

function getStateLabel(state: AuthorEpisodeHistoryEntry["state"]) {
  if (state === "scheduled") return "예약";
  if (state === "published") return "발행";
  if (state === "updated") return "발행 후 수정";
  return "초안";
}

function formatHistoryTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금";
  return `${date.getMonth() + 1}.${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금";
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: c.fg1, textAlign: "center" },
  emptyBody: { fontSize: 14, lineHeight: 22, color: c.fg3, textAlign: "center" },

  workHeader: { flexDirection: "row", gap: 14, padding: 16, borderRadius: r.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderWhite },
  workCoverFrame: { width: 64, height: 92, borderRadius: 10, overflow: "hidden", backgroundColor: c.bgHero },
  workCoverImage: { width: "100%", height: "100%", resizeMode: "cover" },
  workMeta: { flex: 1, justifyContent: "center", gap: 6 },
  workTitle: { fontSize: 17, fontWeight: "800", color: c.fg1, letterSpacing: -0.4, lineHeight: 23 },
  workStatsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  workStatText: { fontSize: 12, color: c.fg3 },
  workStatBold: { fontWeight: "800", color: c.fg2 },
  workStatDot: { fontSize: 11, color: c.fg3 },
  statusPill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: r.pill, backgroundColor: c.surface3 },
  statusPillActive: { backgroundColor: "rgba(74,222,128,0.12)" },
  statusPillText: { fontSize: 10, fontWeight: "700", color: c.fg3 },
  statusPillTextActive: { color: c.freeBright },

  // 12, 13: Pipeline
  pipeline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: r.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderWhite,
  },
  pipelineStep: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 3,
  },
  pipelineCount: { fontSize: 18, fontWeight: "900" },
  pipelineLabel: { fontSize: 10, fontWeight: "700" },

  newEpisodeBtn: { height: 50, borderRadius: 14, backgroundColor: c.inkGold, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  newEpisodeBtnText: { fontSize: 15, fontWeight: "800", color: c.fgOnGold },

  // 11: search
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingHorizontal: 12, borderRadius: r.md, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface },
  searchIcon: { flexShrink: 0 },
  searchInput: { flex: 1, fontSize: 14, color: c.fg1 },

  // 11: Tab bar + sort
  tabBar: { flexDirection: "row", alignItems: "center", gap: 8 },
  tabScroll: { gap: 6, paddingRight: 4 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: r.pill,
    borderWidth: 1,
    borderColor: c.borderWhite,
    backgroundColor: c.surface2,
  },
  tabActive: { backgroundColor: c.inkGold, borderColor: c.inkGold },
  tabText: { fontSize: 13, fontWeight: "700", color: c.fg3 },
  tabTextActive: { color: c.fgOnGold },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.surface3, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabBadgeActive: { backgroundColor: "rgba(0,0,0,0.2)" },
  tabBadgeText: { fontSize: 10, fontWeight: "800", color: c.fg3 },
  tabBadgeTextActive: { color: c.fgOnGold },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 10, paddingVertical: 8, borderRadius: r.pill, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.borderWhite },
  sortBtnText: { fontSize: 11, fontWeight: "700", color: c.fg2 },

  // Episode list
  episodeList: { gap: 8 },
  emptyTab: { paddingVertical: 32, alignItems: "center" },
  emptyTabText: { fontSize: 14, color: c.fg3 },

  episodeCard: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderWhite },
  epNumberCol: { width: 26, alignItems: "center" },
  epNumber: { fontSize: 13, fontWeight: "800", color: c.fg3 },
  epBody: { flex: 1, gap: 3 },
  epTitle: { fontSize: 14, fontWeight: "700", color: c.fg1 },
  epMeta: { fontSize: 11, color: c.fg3 },
  epRight: { gap: 4, alignItems: "flex-end" },

  publishBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: r.xs },
  badgeDraft: { backgroundColor: "rgba(212,168,67,0.14)" },
  badgeScheduled: { backgroundColor: "rgba(100,149,237,0.18)" },
  badgePublished: { backgroundColor: "rgba(74,222,128,0.12)" },
  publishBadgeText: { fontSize: 10, fontWeight: "800" },
  badgeDraftText: { color: c.inkGold },
  badgeScheduledText: { color: "#6495ed" },
  badgePublishedText: { color: c.freeBright },

  accessBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: r.xs, backgroundColor: "rgba(74,158,107,0.18)" },
  accessBadgePaid: { backgroundColor: "rgba(212,168,67,0.12)" },
  accessBadgeText: { fontSize: 10, fontWeight: "700", color: c.free },
  accessBadgeTextPaid: { color: c.inkGoldSoft },

  // 14: history button
  historyBtn: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: c.surface2 },

  // 27: work meta card
  metaCard: { borderRadius: r.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderWhite, overflow: "hidden" },
  metaHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.borderSoft },
  metaHeadLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaTitle: { fontSize: 13, fontWeight: "800", color: c.fg2 },
  metaEditText: { fontSize: 12, fontWeight: "700", color: c.inkGoldSoft },
  metaRows: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaLabel: { fontSize: 11, fontWeight: "700", color: c.fg3, width: 56 },
  metaValue: { fontSize: 13, fontWeight: "600", color: c.fg1 },
  metaKwRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  metaKwChips: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 5 },
  metaKwChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: r.pill, backgroundColor: c.surface3 },
  metaKwChipText: { fontSize: 11, fontWeight: "700", color: c.fg2 },
  metaHiatusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  metaHiatusText: { fontSize: 12, fontWeight: "700", color: c.danger },
  metaEditor: { gap: 12 },
  metaInputLabel: { fontSize: 12, fontWeight: "700", color: c.fg2 },
  metaInput: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface2, paddingHorizontal: 12, color: c.fg1, fontSize: 14 },
  ageChipRow: { flexDirection: "row", gap: 8 },
  ageChip: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" },
  ageChipActive: { backgroundColor: c.inkGold, borderColor: c.inkGold },
  ageChipText: { fontSize: 12, fontWeight: "700", color: c.fg3 },
  ageChipTextActive: { color: c.fgOnGold },
  hiatusToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface2 },
  hiatusToggleText: { fontSize: 13, fontWeight: "700", color: c.fg1 },

  // 23: reader reactions card
  reactCard: { borderRadius: r.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderWhite, overflow: "hidden" },
  reactHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.borderSoft },
  reactHeadLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  reactTitle: { fontSize: 13, fontWeight: "800", color: c.fg2 },
  reactAllText: { fontSize: 12, fontWeight: "700", color: c.fg3 },
  reactItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.borderSoft },
  reactItemLast: { borderBottomWidth: 0 },
  reactItemBody: { flex: 1, gap: 4 },
  reactItemMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  reactEpTag: { fontSize: 10, fontWeight: "800", color: c.inkGoldSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: r.xs, backgroundColor: "rgba(212,168,67,0.1)" },
  reactNickname: { fontSize: 12, fontWeight: "700", color: c.fg2 },
  reactLikes: { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: "auto" },
  reactLikeCount: { fontSize: 11, color: c.fg3 },
  reactBody: { fontSize: 13, color: c.fg1, lineHeight: 19 },
  reactReplyBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: r.sm, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface2 },
  reactReplyText: { fontSize: 11, fontWeight: "700", color: c.fg2 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.borderWhite, alignSelf: "center" },
  modalTitle: { fontSize: 18, fontWeight: "900", color: c.fg1, letterSpacing: -0.4 },
  modalActions: { flexDirection: "row", gap: 10, paddingTop: 4 },
  modalCancelBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: c.borderWhite, alignItems: "center", justifyContent: "center", backgroundColor: c.surface2 },
  modalCancelText: { fontSize: 14, fontWeight: "700", color: c.fg2 },
  modalConfirmBtn: { flex: 1, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.inkGold },
  modalConfirmText: { fontSize: 14, fontWeight: "800", color: c.fgOnGold },
});
