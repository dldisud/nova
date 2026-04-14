import SwiftUI

struct EpisodeViewerScreen: View {
    let novelSlug: String
    let repository: any NovelRepository

    @State private var currentEpisodeID: UUID

    init(novelSlug: String, initialEpisodeID: UUID, repository: any NovelRepository) {
        self.novelSlug = novelSlug
        self.repository = repository
        _currentEpisodeID = State(initialValue: initialEpisodeID)
    }

    var body: some View {
        if let detail = repository.novelDetail(slug: novelSlug),
           let episode = repository.episodeDetail(novelSlug: novelSlug, episodeID: currentEpisodeID),
           let index = detail.episodeBodies.firstIndex(where: { $0.id == currentEpisodeID }) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text(episode.title)
                        .font(.title2.weight(.bold))
                        .foregroundStyle(InkRoadTheme.ink)

                    Text(episode.body)
                        .font(.body)
                        .foregroundStyle(InkRoadTheme.ink)
                        .lineSpacing(8)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.top, 28)
                .padding(.bottom, 120)
            }
            .background(Color.white.ignoresSafeArea())
            .navigationTitle("\(detail.summary.title) · \(episode.number)화")
            .navigationBarTitleDisplayMode(.inline)
            .safeAreaInset(edge: .bottom) {
                HStack(spacing: 12) {
                    Button("이전화") {
                        guard index > 0 else { return }
                        currentEpisodeID = detail.episodeBodies[index - 1].id
                    }
                    .disabled(index == 0)

                    Text("\(episode.number) / \(detail.episodeBodies.count)화")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(InkRoadTheme.muted)
                        .frame(maxWidth: .infinity)

                    Button("다음화") {
                        guard index < detail.episodeBodies.count - 1 else { return }
                        currentEpisodeID = detail.episodeBodies[index + 1].id
                    }
                    .disabled(index == detail.episodeBodies.count - 1)
                }
                .buttonStyle(InkRoadPrimaryButtonStyle())
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 12)
                .background(.ultraThinMaterial)
            }
        } else {
            EmptyStateCard(
                title: "회차를 불러오지 못했어요",
                message: "목업 데이터와 연결이 끊겼습니다.",
                buttonTitle: "닫기"
            ) {
            }
            .padding()
        }
    }
}
