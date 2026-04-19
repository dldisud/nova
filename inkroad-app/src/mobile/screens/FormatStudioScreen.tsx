import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "../components/AppHeader";
import { NovelFormatRenderer } from "../components/reader/NovelFormatRenderer";
import { inkroadTheme } from "../theme";

const c = inkroadTheme.colors;
const r = inkroadTheme.radius;

const INITIAL_DRAFT = `# 프롤로그

잿빛 비가 도시를 적시던 밤, 그는 마지막 봉인을 바라봤다.

그의 시야 한쪽에 천뢰섬이라는 이름이 번쩍였다.
`;

const INSERT_TEMPLATES = [
  {
    label: "루비",
    icon: "text-fields",
    snippet: "{{ruby:천뢰섬|Heavenly Thunder Flash}}",
    tip: "기술명, 별호, 고유명사 위 작은 글씨",
  },
  {
    label: "상태창",
    icon: "dashboard-customize",
    snippet: `:::status 상태창
이름 : 아르카디우스
등급 : 금서고 관리자(임시)
마력 : 3,420
:::`,
    tip: "홀로그램 느낌 상태창",
  },
  {
    label: "시스템",
    icon: "memory",
    snippet: `:::system SYSTEM MESSAGE
봉인 해제 조건이 충족되었습니다.
관리자 권한 일부가 활성화됩니다.
:::`,
    tip: "퀘스트, 알림, 레벨업 같은 메시지",
  },
  {
    label: "경고문",
    icon: "warning-amber",
    snippet: `:::warning 긴급 경고
서약 잔흔이 기준치 이상으로 상승했습니다.
지금 시전을 강행하면 생명력이 손실될 수 있습니다.
:::`,
    tip: "재난, 긴급 방송, 위험 알림",
  },
  {
    label: "채팅창",
    icon: "forum",
    snippet: `:::chat 실시간 반응
독자1|방금 그거 뭐였어?
독자2|기술명 뜨는 연출 미쳤다.
독자3|다음 화 바로 간다.
:::`,
    tip: "스트리밍물, 커뮤니티 반응",
  },
  {
    label: "회상",
    icon: "history",
    snippet: `:::flashback 기억의 파편
소년이던 시절, 그는 같은 문장을 피로 세 번이나 덧썼다.
그때마다 스승은 마지막 행을 읽지 말라고 경고했다.
:::`,
    tip: "기억, 꿈, 과거 장면",
  },
  {
    label: "기사문",
    icon: "article",
    snippet: `:::article 속보
수도 외곽에서 미확인 게이트가 발생했다.
협회는 시민 대피를 요청하며 대응팀을 긴급 투입했다.
:::`,
    tip: "뉴스, 공지문, 기사 삽입",
  },
  {
    label: "기술명",
    icon: "auto-awesome",
    snippet: `:::skill 붕괴진|崩壞陣
바닥을 훑고 지나간 검은 빛이 원형의 마법진으로 번져 나갔다.
시전자의 마력 흐름을 강제로 폭주시켜 상대의 주문을 끊는다.
:::`,
    tip: "기술 발동 장면 강조",
  },
] as const;

export default function FormatStudioScreen() {
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const previewBody = useMemo(() => draft.trim() || INITIAL_DRAFT, [draft]);

  function appendSnippet(snippet: string, label: string) {
    const nextValue = draft.trim().length
      ? `${draft.replace(/\s*$/, "")}\n\n${snippet}\n`
      : `${snippet}\n`;

    setDraft(nextValue);
    setSelectedLabel(label);
  }

  function replaceWithStarter() {
    setDraft(INITIAL_DRAFT);
    setSelectedLabel("기본 본문");
  }

  return (
    <View style={styles.shell}>
      <SafeAreaView edges={["top"]} />
      <AppHeader title="연출 서식 도우미" showBack />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>작가는 버튼만 누르면 됩니다</Text>
          <Text style={styles.heroText}>
            문법을 외우지 않아도 돼요. 본문을 적고, 필요한 연출 버튼을 누른 뒤,
            아래 미리보기에서 바로 확인하면 됩니다.
          </Text>
          <View style={styles.stepList}>
            <Text style={styles.stepItem}>1. 본문을 평소처럼 적기</Text>
            <Text style={styles.stepItem}>2. 필요한 연출 버튼 누르기</Text>
            <Text style={styles.stepItem}>3. 아래 미리보기로 바로 확인하기</Text>
          </View>
        </View>

        <View style={styles.editorCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>본문 입력</Text>
            <Pressable style={styles.ghostButton} onPress={replaceWithStarter}>
              <MaterialIcons name="refresh" size={16} color={c.fg2} />
              <Text style={styles.ghostButtonText}>기본 예시로 되돌리기</Text>
            </Pressable>
          </View>
          <TextInput
            multiline
            value={draft}
            onChangeText={setDraft}
            placeholder="여기에 회차 본문을 적어보세요."
            placeholderTextColor={c.fg3}
            style={styles.editorInput}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.editorCard}>
          <Text style={styles.sectionTitle}>연출 넣기</Text>
          <Text style={styles.sectionCaption}>
            가장 많이 쓸 만한 것만 먼저 모아뒀어요. 누르면 아래 입력창 끝에 바로 들어갑니다.
          </Text>
          <View style={styles.toolGrid}>
            {INSERT_TEMPLATES.map((item) => {
              const active = selectedLabel === item.label;
              return (
                <Pressable
                  key={item.label}
                  style={[styles.toolButton, active && styles.toolButtonActive]}
                  onPress={() => appendSnippet(item.snippet, item.label)}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={20}
                    color={active ? c.fgOnGold : c.inkGold}
                  />
                  <Text style={[styles.toolLabel, active && styles.toolLabelActive]}>{item.label}</Text>
                  <Text style={styles.toolTip}>{item.tip}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>미리보기</Text>
            <Text style={styles.previewHint}>실제 독자 화면 느낌으로 보여줍니다</Text>
          </View>
          <View style={styles.previewSurface}>
            <NovelFormatRenderer body={previewBody} episodeTitle="프롤로그" />
          </View>
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
  content: {
    padding: 20,
    paddingBottom: 56,
    gap: 18,
  },
  heroCard: {
    borderRadius: r.xl,
    padding: 18,
    backgroundColor: "rgba(212,168,67,0.10)",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.20)",
    gap: 10,
  },
  heroTitle: {
    color: c.fg1,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  heroText: {
    color: c.fgSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  stepList: {
    gap: 6,
    marginTop: 4,
  },
  stepItem: {
    color: c.fg2,
    fontSize: 13,
    fontWeight: "700",
  },
  editorCard: {
    borderRadius: r.lg,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: c.borderWhite,
    gap: 12,
  },
  previewCard: {
    borderRadius: r.xl,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: c.borderWhite,
    gap: 12,
  },
  previewSurface: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 22,
    backgroundColor: "#0c0c0f",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    color: c.fg1,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sectionCaption: {
    color: c.fg3,
    fontSize: 13,
    lineHeight: 20,
  },
  previewHint: {
    color: c.fg3,
    fontSize: 12,
    fontWeight: "700",
  },
  ghostButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  ghostButtonText: {
    color: c.fg2,
    fontSize: 12,
    fontWeight: "700",
  },
  editorInput: {
    minHeight: 220,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(0,0,0,0.28)",
    color: c.fg1,
    borderWidth: 1,
    borderColor: c.borderWhite,
    fontSize: 15,
    lineHeight: 24,
  },
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  toolButton: {
    width: "48%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: c.borderWhite,
    gap: 6,
  },
  toolButtonActive: {
    backgroundColor: c.inkGold,
    borderColor: c.inkGold,
  },
  toolLabel: {
    color: c.fg1,
    fontSize: 15,
    fontWeight: "800",
  },
  toolLabelActive: {
    color: c.fgOnGold,
  },
  toolTip: {
    color: c.fg3,
    fontSize: 12,
    lineHeight: 18,
  },
});
