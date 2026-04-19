import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NovelFormatRenderer } from "../components/reader/NovelFormatRenderer";
import {
  createEpisodeEditorState,
  createMockAuthorRepository,
  getDraftStatusMessage,
  markDraftAsEdited,
} from "../creator/repository";
import type { AgeRating, EpisodeDraft, EpisodeType, EpisodeWorkflowStep } from "../types";
import { inkroadTheme } from "../theme";

const c = inkroadTheme.colors;
const r = inkroadTheme.radius;

type Mode = "write" | "preview";
const EPISODE_TYPES: { key: EpisodeType; label: string; icon: React.ComponentProps<typeof MaterialIcons>["name"] }[] = [
  { key: "episode", label: "일반 회차", icon: "article" },
  { key: "afterword", label: "작가의 말", icon: "chat-bubble-outline" },
  { key: "notice", label: "공지", icon: "campaign" },
  { key: "private", label: "비밀글", icon: "lock-outline" },
];

const AGE_RATINGS: { key: AgeRating; label: string }[] = [
  { key: "all", label: "전체이용가" },
  { key: "15", label: "15세 이상" },
  { key: "18", label: "18세 이상" },
];

// 9: 예약 발행 preset
const SCHEDULE_PRESETS = [
  { label: "내일 오전 9시", value: "tomorrow_9am" },
  { label: "모레 오전 9시", value: "day_after_9am" },
  { label: "다음주 수요일", value: "next_wed" },
  { label: "직접 입력", value: "custom" },
];

const WORKFLOW_STEPS: { key: EpisodeWorkflowStep; label: string }[] = [
  { key: "draft", label: "초안" },
  { key: "review", label: "검토" },
  { key: "scheduled", label: "예약" },
  { key: "published", label: "발행" },
];

const MIN_BODY_LENGTH = 500;

type EpisodeComposerScreenProps = {
  novelId: string;
  episodeId?: string;
};

export default function EpisodeComposerScreen({ novelId, episodeId }: EpisodeComposerScreenProps) {
  const router = useRouter();
  const repository = useMemo(() => createMockAuthorRepository(), []);
  const saveQueueRef = useRef(Promise.resolve<EpisodeDraft | null>(null));
  const bodyInputRef = useRef<TextInput>(null);

  const [mode, setMode] = useState<Mode>("write");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customDate, setCustomDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [draft, setDraft] = useState<EpisodeDraft>({
    novelId, episodeId,
    title: "", accessType: "free", price: 0,
    body: "", workflowStep: "draft", episodeType: "episode", updatedAt: 0, publicationState: "draft",
  });
  const [statusMessage, setStatusMessage] = useState("불러오는 중...");

  useEffect(() => {
    let active = true;
    repository.loadDraft(novelId, episodeId).then((loaded) => {
      if (!active) return;
      setDraft(loaded);
      if (loaded.scheduledAt) {
        setCustomDate(new Date(loaded.scheduledAt));
      }
      setStatusMessage(getDraftStatusMessage(loaded));
    });
    return () => { active = false; };
  }, [repository, novelId, episodeId]);

  const editorState = useMemo(() => createEpisodeEditorState(draft), [draft]);
  const charCount = draft.body.length;
  const workflowStep = draft.workflowStep ?? "draft";
  const episodeType = draft.episodeType ?? "episode";
  const ageRating = draft.ageRating ?? null;
  const scheduledLabel = draft.scheduledAt ? formatScheduleLabel(new Date(draft.scheduledAt)) : null;

  const persistDraft = (next: EpisodeDraft, saveMode: "save" | "publish") => {
    saveQueueRef.current = saveQueueRef.current
      .catch(() => null)
      .then(async () => {
        const saved = saveMode === "publish"
          ? await repository.publishDraft(next)
          : await repository.saveDraft(next);
        setDraft(saved);
        setStatusMessage(getDraftStatusMessage(saved));
        return saved;
      })
      .catch(() => {
        setStatusMessage(saveMode === "publish" ? "발행 실패" : "저장 실패");
        return null;
      });
    return saveQueueRef.current;
  };

  const updateDraft = (patch: Partial<EpisodeDraft>) => {
    const next = markDraftAsEdited({ ...draft, ...patch });
    setDraft(next);
    setStatusMessage("저장 중...");
    void persistDraft(next, "save");
  };

  // 16-20: 발행 전 사전 검증 modal 열기
  const handlePublishTap = () => {
    if (!editorState.canPublish) return;
    if (workflowStep !== "review") {
      const next = markDraftAsEdited({ ...draft, workflowStep: "review" });
      setDraft(next);
      void persistDraft(
        next,
        "save"
      );
    }
    setShowPublishModal(true);
  };

  const handleConfirmPublish = async () => {
    setShowPublishModal(false);
    setStatusMessage("발행 중...");
    await persistDraft(
      {
        ...draft,
        workflowStep: "published",
        publicationState: "published",
        scheduledAt: undefined,
      },
      "publish"
    );
  };

  const confirmCustomSchedule = (d: Date) => {
    updateDraft({
      scheduledAt: d.getTime(),
      workflowStep: "scheduled",
      publicationState: "scheduled",
    });
    setShowCustomPicker(false);
    setShowScheduleModal(false);
  };

  const handleSchedule = (preset: typeof SCHEDULE_PRESETS[number]) => {
    if (preset.value === "custom") {
      setShowCustomPicker(true);
      return;
    }
    const nextScheduledDate = resolveSchedulePreset(preset.value);
    setCustomDate(nextScheduledDate);
    updateDraft({
      scheduledAt: nextScheduledDate.getTime(),
      workflowStep: "scheduled",
      publicationState: "scheduled",
    });
    setShowScheduleModal(false);
  };

  const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.key === workflowStep);

  // 20: pre-flight 체크항목
  const preflight = [
    { label: "제목 입력됨", pass: draft.title.trim().length > 0, detail: draft.title || "—" },
    { label: `최소 분량 (${MIN_BODY_LENGTH}자)`, pass: charCount >= MIN_BODY_LENGTH, detail: `${charCount.toLocaleString()}자` },
    { label: "연령등급 선택", pass: ageRating !== null, detail: ageRating ? AGE_RATINGS.find(a => a.key === ageRating)?.label : "미선택" },
  ];
  const allPass = preflight.every((p) => p.pass);
  const episodeTypeObj = EPISODE_TYPES.find((t) => t.key === episodeType)!;

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={c.fg1} />
        </TouchableOpacity>
        <Text style={styles.statusText} numberOfLines={1}>{statusMessage}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.modeChip, mode === "preview" && styles.modeChipActive]}
            onPress={() => setMode(mode === "write" ? "preview" : "write")}
          >
            <MaterialIcons name={mode === "preview" ? "edit" : "visibility"} size={15} color={mode === "preview" ? c.fgOnGold : c.fg2} />
            <Text style={[styles.modeChipText, mode === "preview" && styles.modeChipTextActive]}>
              {mode === "preview" ? "편집" : "미리보기"}
            </Text>
          </TouchableOpacity>
          {/* 9: 예약 */}
          <TouchableOpacity
            style={[styles.scheduleBtn, scheduledLabel ? styles.scheduleBtnActive : null]}
            onPress={() => setShowScheduleModal(true)}
          >
            <MaterialIcons name="event" size={15} color={scheduledLabel ? "#6495ed" : c.fg2} />
            <Text style={[styles.scheduleBtnText, scheduledLabel && styles.scheduleBtnTextActive]}>
              {scheduledLabel ?? "예약"}
            </Text>
          </TouchableOpacity>
          {/* 16-20: 발행 → modal */}
          <TouchableOpacity
            style={[styles.publishBtn, !editorState.canPublish && styles.publishBtnDisabled]}
            onPress={handlePublishTap}
            disabled={!editorState.canPublish}
          >
            <Text style={[styles.publishBtnText, !editorState.canPublish && styles.publishBtnTextDisabled]}>발행</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 12, 13: Workflow bar */}
      <View style={styles.workflowBar}>
        {WORKFLOW_STEPS.map((step, i) => {
          const isDone = i < currentStepIndex;
          const isCurrent = i === currentStepIndex;
          return (
            <React.Fragment key={step.key}>
              <View style={styles.workflowStep}>
                {isDone
                  ? <View style={styles.workflowDotDone}><MaterialIcons name="check" size={9} color="#fff" /></View>
                  : <View style={[styles.workflowDot, isCurrent && styles.workflowDotCurrent]} />
                }
                <Text style={[styles.workflowLabel, isDone && styles.workflowLabelDone, isCurrent && styles.workflowLabelCurrent]}>
                  {step.label}
                </Text>
              </View>
              {i < WORKFLOW_STEPS.length - 1 && (
                <View style={[styles.workflowLine, isDone && styles.workflowLineDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.divider} />

      {/* Editor / Preview */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {mode === "write" ? (
          <>
            <ScrollView style={styles.flex} contentContainerStyle={styles.editorScroll} keyboardShouldPersistTaps="handled">
              {/* 24: 회차 타입 */}
              <TouchableOpacity style={styles.typeRow} onPress={() => setShowTypeModal(true)}>
                <MaterialIcons name={episodeTypeObj.icon} size={14} color={c.inkGoldSoft} />
                <Text style={styles.typeLabel}>{episodeTypeObj.label}</Text>
                <MaterialIcons name="expand-more" size={14} color={c.fg3} />
              </TouchableOpacity>

              <TextInput
                value={draft.title}
                onChangeText={(title) => updateDraft({ title })}
                placeholder="제목을 입력하세요"
                placeholderTextColor={c.fg3}
                style={styles.titleInput}
                returnKeyType="next"
                onSubmitEditing={() => bodyInputRef.current?.focus()}
                blurOnSubmit={false}
              />
              <View style={styles.editorDivider} />
              <TextInput
                ref={bodyInputRef}
                value={draft.body}
                onChangeText={(body) => updateDraft({ body })}
                placeholder="이야기를 시작하세요..."
                placeholderTextColor={c.fg3}
                multiline
                textAlignVertical="top"
                style={styles.bodyInput}
                scrollEnabled={false}
              />
            </ScrollView>

            {/* Bottom toolbar */}
            <View style={styles.bottomBar}>
              <View style={styles.accessToggle}>
                <Pressable
                  style={[styles.accessChip, draft.accessType === "free" && styles.accessChipFree]}
                  onPress={() => updateDraft({ accessType: "free", price: 0 })}
                >
                  <Text style={[styles.accessChipText, draft.accessType === "free" && styles.accessChipTextFree]}>무료</Text>
                </Pressable>
                <Pressable
                  style={[styles.accessChip, draft.accessType === "paid" && styles.accessChipPaid]}
                  onPress={() => updateDraft({ accessType: "paid", price: draft.price > 0 ? draft.price : 100 })}
                >
                  <Text style={[styles.accessChipText, draft.accessType === "paid" && styles.accessChipTextPaid]}>유료</Text>
                </Pressable>
                {draft.accessType === "paid" && (
                  <TextInput
                    value={String(draft.price)}
                    keyboardType="numeric"
                    onChangeText={(v) => updateDraft({ price: Number(v.replace(/[^0-9]/g, "")) || 0 })}
                    style={styles.priceInline}
                    placeholderTextColor={c.fg3}
                    placeholder="100"
                  />
                )}
              </View>
              <View style={styles.bottomRight}>
                <Text style={[styles.charCount, charCount < MIN_BODY_LENGTH && charCount > 0 && styles.charCountWarn]}>
                  {charCount.toLocaleString()}자
                </Text>
                <TouchableOpacity style={styles.formatBtn} onPress={() => router.push("/format-studio")}>
                  <MaterialIcons name="auto-fix-high" size={18} color={c.fg2} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <ScrollView style={styles.flex} contentContainerStyle={styles.previewScroll}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewEpTitle}>{draft.title || "제목 없음"}</Text>
            </View>
            <NovelFormatRenderer body={draft.body || "본문이 아직 없습니다."} episodeTitle={draft.title || "미리보기"} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* ═══ 16-20: Pre-publish modal ═══ */}
      <Modal visible={showPublishModal} transparent animationType="slide" onRequestClose={() => setShowPublishModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowPublishModal(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>발행 전 점검</Text>

            {/* 19, 20: Pre-flight checklist */}
            <View style={styles.checkList}>
              {preflight.map((item) => (
                <View key={item.label} style={styles.checkRow}>
                  <View style={[styles.checkIcon, item.pass ? styles.checkIconPass : styles.checkIconFail]}>
                    <MaterialIcons name={item.pass ? "check" : "close"} size={12} color="#fff" />
                  </View>
                  <Text style={styles.checkLabel}>{item.label}</Text>
                  <Text style={[styles.checkDetail, !item.pass && styles.checkDetailFail]}>{item.detail}</Text>
                </View>
              ))}
            </View>

            {/* 20: 연령등급 picker (if not set) */}
            {!ageRating && (
              <View style={styles.ageSection}>
                <Text style={styles.ageSectionTitle}>연령등급 선택 <Text style={styles.ageRequired}>필수</Text></Text>
                <View style={styles.ageRow}>
                  {AGE_RATINGS.map((ag) => (
                    <TouchableOpacity
                      key={ag.key}
                      style={[styles.ageChip, ageRating === ag.key && styles.ageChipActive]}
                      onPress={() => updateDraft({ ageRating: ag.key })}
                    >
                      <Text style={[styles.ageChipText, ageRating === ag.key && styles.ageChipTextActive]}>{ag.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* 16-18: 유료 거버넌스 경고 */}
            {draft.accessType === "paid" && (
              <View style={styles.govNotice}>
                <MaterialIcons name="gavel" size={16} color={c.inkGold} />
                <View style={styles.govNoticeBody}>
                  <Text style={styles.govNoticeTitle}>유료 발행 심사 안내</Text>
                  <Text style={styles.govNoticeText}>
                    유료 회차는 플랫폼 심사 후 공개됩니다. (평균 1~2일){"\n"}
                    작가 계약이 없으면 유료 설정이 거부될 수 있습니다.
                  </Text>
                </View>
              </View>
            )}

            {/* 24: 비밀글 경고 */}
            {episodeType === "private" && (
              <View style={styles.privateNotice}>
                <MaterialIcons name="lock" size={14} color={c.fg3} />
                <Text style={styles.privateNoticeText}>비밀글은 작가 본인만 볼 수 있습니다.</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPublishModal(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !allPass && styles.modalConfirmBtnDisabled]}
                onPress={allPass ? handleConfirmPublish : undefined}
              >
                <Text style={[styles.modalConfirmText, !allPass && styles.modalConfirmTextDisabled]}>
                  {allPass ? "발행 확인" : "점검 후 발행 가능"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 9: 예약 modal */}
      <Modal
        visible={showScheduleModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowScheduleModal(false); setShowCustomPicker(false); }}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => { setShowScheduleModal(false); setShowCustomPicker(false); }}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />

            {!showCustomPicker ? (
              <>
                <Text style={styles.modalTitle}>예약 발행 시간 선택</Text>
                <Text style={styles.modalSubtitle}>발행 예정 시간을 고르면 자동으로 공개됩니다.</Text>
                <View style={styles.presetList}>
                  {SCHEDULE_PRESETS.map((preset) => (
                    <TouchableOpacity key={preset.value} style={styles.presetItem} onPress={() => handleSchedule(preset)}>
                      <MaterialIcons name={preset.value === "custom" ? "edit-calendar" : "event-available"} size={18} color={c.inkGold} />
                      <Text style={styles.presetLabel}>{preset.label}</Text>
                      <MaterialIcons name="chevron-right" size={18} color={c.fg3} />
                    </TouchableOpacity>
                  ))}
                </View>
                {scheduledLabel && (
                  <TouchableOpacity style={styles.cancelScheduleBtn} onPress={() => {
                    updateDraft({ scheduledAt: undefined, workflowStep: "draft", publicationState: "draft" });
                    setStatusMessage("예약 취소됨"); setShowScheduleModal(false);
                  }}>
                    <Text style={styles.cancelScheduleText}>예약 취소</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity onPress={() => { setShowCustomPicker(false); }}>
                    <Text style={styles.pickerBack}>← 목록</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>날짜·시간 직접 입력</Text>
                </View>
                <Text style={styles.pickerDatePreview}>{formatSchedulePreview(customDate)}</Text>

                <CustomDateTimePicker value={customDate} onChange={setCustomDate} />

                <View style={styles.pickerActions}>
                  <TouchableOpacity style={styles.pickerCancelBtn} onPress={() => { setShowCustomPicker(false); }}>
                    <Text style={styles.pickerCancelText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pickerConfirmBtn} onPress={() => confirmCustomSchedule(customDate)}>
                    <Text style={styles.pickerConfirmText}>예약 확인</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>


      {/* 24: 회차 타입 modal */}
      <Modal visible={showTypeModal} transparent animationType="slide" onRequestClose={() => setShowTypeModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowTypeModal(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>발행 타입 선택</Text>
            <View style={styles.presetList}>
              {EPISODE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.presetItem, episodeType === type.key && styles.presetItemActive]}
                  onPress={() => { updateDraft({ episodeType: type.key }); setShowTypeModal(false); }}
                >
                  <MaterialIcons name={type.icon} size={18} color={episodeType === type.key ? c.inkGold : c.fg3} />
                  <Text style={[styles.presetLabel, episodeType === type.key && { color: c.inkGold }]}>{type.label}</Text>
                  {episodeType === type.key && <MaterialIcons name="check" size={18} color={c.inkGold} />}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <SafeAreaView edges={["bottom"]} />
    </SafeAreaView>
  );
}

const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => index);

function formatMeridiemHour(date: Date) {
  const hour = date.getHours();
  return `${hour < 12 ? "오전" : "오후"} ${hour % 12 || 12}`;
}

function formatScheduleLabel(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()} ${formatMeridiemHour(date)}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatSchedulePreview(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${formatMeridiemHour(date)}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function resolveSchedulePreset(value: string) {
  const next = new Date();
  next.setSeconds(0, 0);
  if (value === "tomorrow_9am") {
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
    return next;
  }
  if (value === "day_after_9am") {
    next.setDate(next.getDate() + 2);
    next.setHours(9, 0, 0, 0);
    return next;
  }
  const day = next.getDay();
  const distance = ((3 - day + 7) % 7) || 7;
  next.setDate(next.getDate() + distance);
  next.setHours(9, 0, 0, 0);
  return next;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function mergeTimePart(current: Date, selectedTime: Date) {
  const next = new Date(current);
  next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
  return next;
}

function CustomDateTimePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const today = startOfToday();

  const adjustDay = (delta: number) => {
    const next = new Date(value);
    next.setDate(next.getDate() + delta);
    if (next >= today) {
      onChange(next);
    }
  };

  const dayLabel = `${value.getMonth() + 1}월 ${value.getDate()}일 (${WEEK_DAYS[value.getDay()]})`;
  const isPrevDisabled = new Date(value.getTime() - 86400000) < today;
  const setHour = (hour: number) => onChange(mergeTimePart(value, new Date(2026, 0, 1, hour, value.getMinutes(), 0, 0)));
  const setMinute = (minute: number) => onChange(mergeTimePart(value, new Date(2026, 0, 1, value.getHours(), minute, 0, 0)));

  return (
    <View style={cpStyles.root}>
      <View style={cpStyles.summaryRow}>
        <View style={cpStyles.summaryChip}>
          <MaterialIcons name="calendar-today" size={14} color={c.inkGold} />
          <Text style={cpStyles.summaryText}>{dayLabel}</Text>
        </View>
        <View style={cpStyles.summaryChip}>
          <MaterialIcons name="schedule" size={14} color={c.inkGold} />
          <Text style={cpStyles.summaryText}>
            {`${formatMeridiemHour(value)}:${String(value.getMinutes()).padStart(2, "0")}`}
          </Text>
        </View>
      </View>

      <View style={cpStyles.section}>
        <Text style={cpStyles.sectionLabel}>날짜</Text>
        <View style={cpStyles.dayRow}>
          <TouchableOpacity
            testID="schedule-day-prev"
            style={[cpStyles.dayArrow, isPrevDisabled && cpStyles.dayArrowDisabled]}
            onPress={() => adjustDay(-1)}
            disabled={isPrevDisabled}
          >
            <MaterialIcons name="chevron-left" size={22} color={isPrevDisabled ? c.fg3 : c.fg1} />
          </TouchableOpacity>
          <Text style={cpStyles.dayLabel}>{dayLabel}</Text>
          <TouchableOpacity testID="schedule-day-next" style={cpStyles.dayArrow} onPress={() => adjustDay(1)}>
            <MaterialIcons name="chevron-right" size={22} color={c.fg1} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={cpStyles.section}>
        <Text style={cpStyles.sectionLabel}>시간</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cpStyles.timeRow}>
          {HOUR_OPTIONS.map((hour) => {
            const active = value.getHours() === hour;
            return (
              <TouchableOpacity
                key={hour}
                testID={`schedule-hour-${hour}`}
                style={[cpStyles.timeChip, active && cpStyles.timeChipActive]}
                onPress={() => setHour(hour)}
              >
                <Text style={[cpStyles.timeChipText, active && cpStyles.timeChipTextActive]}>
                  {`${hour < 12 ? "오전" : "오후"} ${hour % 12 || 12}시`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={cpStyles.section}>
        <Text style={cpStyles.sectionLabel}>분</Text>
        <ScrollView style={cpStyles.minuteScroll} contentContainerStyle={cpStyles.minuteGrid}>
          {MINUTE_OPTIONS.map((minute) => {
            const active = value.getMinutes() === minute;
            return (
              <TouchableOpacity
                key={minute}
                testID={`schedule-minute-${minute}`}
                style={[cpStyles.minuteChip, active && cpStyles.minuteChipActive]}
                onPress={() => setMinute(minute)}
              >
                <Text style={[cpStyles.minuteChipText, active && cpStyles.minuteChipTextActive]}>
                  {`${String(minute).padStart(2, "0")}분`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const cpStyles = StyleSheet.create({
  root: { gap: 14 },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.borderWhite },
  summaryText: { fontSize: 12, fontWeight: "700", color: c.fg1 },
  section: { gap: 10, padding: 12, borderRadius: 14, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.borderWhite },
  sectionLabel: { fontSize: 12, fontWeight: "800", color: c.fg2 },
  dayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  dayArrow: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.surface3, alignItems: "center", justifyContent: "center" },
  dayArrowDisabled: { opacity: 0.3 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800", color: c.fg1, letterSpacing: -0.3 },
  timeRow: { gap: 8, paddingRight: 4 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface3 },
  timeChipActive: { backgroundColor: c.inkGold, borderColor: c.inkGold },
  timeChipText: { fontSize: 12, fontWeight: "700", color: c.fg2 },
  timeChipTextActive: { color: c.fgOnGold },
  minuteScroll: { maxHeight: 216 },
  minuteGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  minuteChip: { width: "22%", minWidth: 64, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface3, alignItems: "center" },
  minuteChipActive: { backgroundColor: c.inkGold, borderColor: c.inkGold },
  minuteChipText: { fontSize: 12, fontWeight: "700", color: c.fg2 },
  minuteChipTextActive: { color: c.fgOnGold },
});

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },

  header: { flexDirection: "row", alignItems: "center", height: 52, paddingHorizontal: 12, gap: 8 },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  statusText: { flex: 1, fontSize: 12, color: c.fg3, textAlign: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },

  modeChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderRadius: r.pill, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface2 },
  modeChipActive: { backgroundColor: c.inkGold, borderColor: c.inkGold },
  modeChipText: { fontSize: 11, fontWeight: "700", color: c.fg2 },
  modeChipTextActive: { color: c.fgOnGold },

  scheduleBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderRadius: r.pill, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface2 },
  scheduleBtnActive: { backgroundColor: "rgba(100,149,237,0.14)", borderColor: "#6495ed" },
  scheduleBtnText: { fontSize: 11, fontWeight: "700", color: c.fg2 },
  scheduleBtnTextActive: { color: "#6495ed" },

  publishBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: r.pill, backgroundColor: c.inkGold },
  publishBtnDisabled: { backgroundColor: c.surface3 },
  publishBtnText: { fontSize: 13, fontWeight: "800", color: c.fgOnGold },
  publishBtnTextDisabled: { color: c.fg3 },

  workflowBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.surface },
  workflowStep: { flexDirection: "row", alignItems: "center", gap: 4 },
  workflowDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.fg3 },
  workflowDotCurrent: { backgroundColor: c.inkGold, width: 8, height: 8 },
  workflowDotDone: { width: 14, height: 14, borderRadius: 7, backgroundColor: c.free, alignItems: "center", justifyContent: "center" },
  workflowLabel: { fontSize: 11, fontWeight: "700", color: c.fg3 },
  workflowLabelDone: { color: c.freeBright },
  workflowLabelCurrent: { color: c.inkGold },
  workflowLine: { flex: 1, height: 1, backgroundColor: c.borderSoft, marginHorizontal: 6 },
  workflowLineDone: { backgroundColor: c.freeBright },

  divider: { height: 1, backgroundColor: c.borderWhite },

  // 24: Episode type row
  typeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: r.pill, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.borderWhite },
  typeLabel: { fontSize: 12, fontWeight: "700", color: c.inkGoldSoft },

  editorScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  titleInput: { fontSize: 22, fontWeight: "800", color: c.fg1, letterSpacing: -0.5, lineHeight: 30, paddingVertical: 4, paddingHorizontal: 0 },
  editorDivider: { height: 1, backgroundColor: c.borderSoft, marginVertical: 16 },
  bodyInput: { fontSize: 17, color: c.fgSoft, lineHeight: 30, paddingVertical: 0, paddingHorizontal: 0, minHeight: 480, letterSpacing: 0.1 },

  bottomBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.borderWhite, backgroundColor: c.background, gap: 10 },
  accessToggle: { flexDirection: "row", alignItems: "center", gap: 6 },
  accessChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: r.pill, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface2 },
  accessChipFree: { backgroundColor: "rgba(74,158,107,0.18)", borderColor: c.free },
  accessChipPaid: { backgroundColor: "rgba(212,168,67,0.16)", borderColor: c.inkGold },
  accessChipText: { fontSize: 12, fontWeight: "700", color: c.fg3 },
  accessChipTextFree: { color: c.freeBright },
  accessChipTextPaid: { color: c.inkGold },
  priceInline: { width: 56, height: 32, borderRadius: 8, paddingHorizontal: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.borderWhite, color: c.fg1, fontSize: 13, fontWeight: "700" },
  bottomRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  charCount: { fontSize: 12, color: c.fg3 },
  charCountWarn: { color: c.inkGold },
  formatBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.borderWhite, alignItems: "center", justifyContent: "center" },

  previewScroll: { paddingBottom: 60 },
  previewHeader: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: c.borderSoft, marginBottom: 8 },
  previewEpTitle: { fontSize: 22, fontWeight: "900", color: c.fg1, letterSpacing: -0.5, lineHeight: 30 },

  // Modal shared
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.borderWhite, alignSelf: "center" },
  modalTitle: { fontSize: 18, fontWeight: "900", color: c.fg1, letterSpacing: -0.4 },
  modalSubtitle: { fontSize: 13, lineHeight: 20, color: c.fg3, marginTop: -8 },

  // 19, 20: Checklist
  checkList: { gap: 10, paddingVertical: 4 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkIcon: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  checkIconPass: { backgroundColor: c.free },
  checkIconFail: { backgroundColor: "rgba(248,113,113,0.6)" },
  checkLabel: { flex: 1, fontSize: 14, color: c.fg1 },
  checkDetail: { fontSize: 12, color: c.fg3 },
  checkDetailFail: { color: c.danger },

  // 20: Age rating
  ageSection: { gap: 10, paddingTop: 4, borderTopWidth: 1, borderTopColor: c.borderSoft },
  ageSectionTitle: { fontSize: 13, fontWeight: "700", color: c.fg2 },
  ageRequired: { color: c.danger, fontWeight: "800" },
  ageRow: { flexDirection: "row", gap: 8 },
  ageChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface2, alignItems: "center" },
  ageChipActive: { backgroundColor: c.inkGold, borderColor: c.inkGold },
  ageChipText: { fontSize: 12, fontWeight: "700", color: c.fg3 },
  ageChipTextActive: { color: c.fgOnGold },

  // 16-18: Gov notice
  govNotice: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, backgroundColor: "rgba(212,168,67,0.08)", borderWidth: 1, borderColor: "rgba(212,168,67,0.22)" },
  govNoticeBody: { flex: 1, gap: 4 },
  govNoticeTitle: { fontSize: 13, fontWeight: "800", color: c.inkGold },
  govNoticeText: { fontSize: 12, lineHeight: 19, color: c.fg2 },

  // 24: Private notice
  privateNotice: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  privateNoticeText: { fontSize: 12, color: c.fg3 },

  // Modal actions
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancelBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.borderWhite, alignItems: "center", justifyContent: "center" },
  modalCancelText: { fontSize: 14, fontWeight: "700", color: c.fg2 },
  modalConfirmBtn: { flex: 2, height: 48, borderRadius: 12, backgroundColor: c.inkGold, alignItems: "center", justifyContent: "center" },
  modalConfirmBtnDisabled: { backgroundColor: c.surface3 },
  modalConfirmText: { fontSize: 14, fontWeight: "800", color: c.fgOnGold },
  modalConfirmTextDisabled: { color: c.fg3 },

  // Schedule presets
  presetList: { gap: 2 },
  presetItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.borderSoft },
  presetItemActive: { backgroundColor: "rgba(212,168,67,0.06)", borderRadius: 10, paddingHorizontal: 8 },
  presetLabel: { flex: 1, fontSize: 15, fontWeight: "700", color: c.fg1 },
  cancelScheduleBtn: { paddingVertical: 14, alignItems: "center", borderRadius: 12, backgroundColor: "rgba(248,113,113,0.1)", borderWidth: 1, borderColor: "rgba(248,113,113,0.2)" },
  cancelScheduleText: { fontSize: 14, fontWeight: "700", color: c.danger },

  // Date picker (직접 입력)
  pickerHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  pickerBack: { fontSize: 13, fontWeight: "700", color: c.inkGoldSoft },
  pickerDatePreview: { fontSize: 16, fontWeight: "800", color: c.inkGold, textAlign: "center", paddingVertical: 4 },
  pickerActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  pickerCancelBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.borderWhite, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" },
  pickerCancelText: { fontSize: 14, fontWeight: "700", color: c.fg2 },
  pickerConfirmBtn: { flex: 2, height: 44, borderRadius: 12, backgroundColor: c.inkGold, alignItems: "center", justifyContent: "center" },
  pickerConfirmText: { fontSize: 14, fontWeight: "800", color: c.fgOnGold },
});
