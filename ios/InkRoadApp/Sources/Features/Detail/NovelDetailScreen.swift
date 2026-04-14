import SwiftUI

struct NovelDetailScreen: View {
    let slug: String
    let repository: any NovelRepository
    let openViewer: (String, UUID) -> Void

    var body: some View {
        if let detail = repository.novelDetail(slug: slug) {
            ScrollView {
                VStack(spacing: 18) {
                    header(detail: detail)

                    BoardSection(title: "작품 소개", subtitle: detail.summary.subtitle) {
                        Text(detail.longDescription)
                            .font(.body)
                            .foregroundStyle(InkRoadTheme.ink)
                            .lineSpacing(4)
                    }

                    BoardSection(title: "회차", subtitle: "첫 버전은 3개 회차로 흐름을 확인합니다") {
                        VStack(spacing: 12) {
                            ForEach(detail.episodes) { episode in
                                Button {
                                    openViewer(detail.summary.slug, episode.id)
                                } label: {
                                    HStack(alignment: .top, spacing: 12) {
                                        VStack(alignment: .leading, spacing: 6) {
                                            Text("\(episode.number)화 · \(episode.title)")
                                                .font(.headline)
                                                .foregroundStyle(InkRoadTheme.ink)
                                            Text(episode.teaser)
                                                .font(.subheadline)
                                                .foregroundStyle(InkRoadTheme.muted)
                                                .lineLimit(2)
                                        }
                                        Spacer()
                                        Text(episode.isFree ? "무료" : "유료")
                                            .font(.caption.weight(.bold))
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 6)
                                            .background(episode.isFree ? Color(.systemGray6) : InkRoadTheme.sale.opacity(0.12))
                                            .foregroundStyle(episode.isFree ? InkRoadTheme.ink : InkRoadTheme.sale)
                                            .clipShape(Capsule())
                                    }
                                    .padding(14)
                                    .background(Color(.systemGray6))
                                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 24)
            }
            .background(InkRoadTheme.appBackground.ignoresSafeArea())
            .navigationTitle(detail.summary.title)
            .navigationBarTitleDisplayMode(.inline)
        } else {
            EmptyStateCard(
                title: "작품을 찾지 못했어요",
                message: "목업 데이터에 없는 작품입니다.",
                buttonTitle: "뒤로 가기"
            ) {
            }
            .padding()
            .background(InkRoadTheme.appBackground.ignoresSafeArea())
        }
    }

    private func header(detail: NovelDetail) -> some View {
        BoardSection(title: detail.summary.title, subtitle: detail.headline) {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top, spacing: 16) {
                    CoverArtworkView(novel: detail.summary)
                        .frame(width: 126)

                    VStack(alignment: .leading, spacing: 10) {
                        Text(detail.summary.authorName)
                            .font(.headline)
                            .foregroundStyle(InkRoadTheme.ink)
                        Text("평점 \(String(format: "%.1f", detail.summary.rating)) · 조회 \(detail.summary.viewCount.formatted())")
                            .font(.subheadline)
                            .foregroundStyle(InkRoadTheme.muted)
                        Text("총 \(detail.summary.totalEpisodeCount)화 · \(detail.summary.freeEpisodeCount)화 무료")
                            .font(.subheadline)
                            .foregroundStyle(InkRoadTheme.muted)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(detail.summary.tags, id: \.self) { tag in
                                    TagChip(title: tag, isSelected: false)
                                }
                            }
                        }
                    }
                }

                Button("첫 화 읽기") {
                    if let first = detail.episodes.first {
                        openViewer(detail.summary.slug, first.id)
                    }
                }
                .buttonStyle(InkRoadPrimaryButtonStyle())
            }
        }
    }
}
