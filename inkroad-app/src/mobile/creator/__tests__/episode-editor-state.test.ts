import { createEpisodeEditorState, getDraftStatusMessage, markDraftAsEdited } from "../repository";

describe("createEpisodeEditorState", () => {
  it("requires title and body before publish becomes available", () => {
    const state = createEpisodeEditorState({
      novelId: "whan-book",
      title: "",
      accessType: "free",
      price: 100,
      body: "",
    });

    expect(state.canPublish).toBe(false);

    const next = state.update({ title: "제4화. 검은 파문", body: "본문" });
    expect(next.canPublish).toBe(true);
  });

  it("shows a truthful label for published and updated drafts", () => {
    expect(
      getDraftStatusMessage({
        novelId: "whan-book",
        title: "",
        accessType: "free",
        price: 0,
        body: "",
        updatedAt: 0,
        publicationState: "draft",
      })
    ).toBe("본문을 입력해 주세요.");

    const publishedDraft = {
      novelId: "whan-book",
      episodeId: "whan-book-ep-3",
      title: "발행된 회차",
      accessType: "free" as const,
      price: 0,
      body: "본문",
      publicationState: "published" as const,
    };

    expect(getDraftStatusMessage(publishedDraft)).toBe("발행됨");
    expect(getDraftStatusMessage(markDraftAsEdited(publishedDraft))).toBe("발행 후 수정 중");
  });

  it("shows the scheduled time when a draft is reserved", () => {
    expect(
      getDraftStatusMessage({
        novelId: "whan-book",
        title: "예약 회차",
        accessType: "free",
        price: 0,
        body: "본문",
        updatedAt: Date.now(),
        scheduledAt: new Date("2026-04-20T10:37:00+09:00").getTime(),
        publicationState: "scheduled",
      })
    ).toBe("예약됨 · 4/20 오전 10:37");
  });
});
