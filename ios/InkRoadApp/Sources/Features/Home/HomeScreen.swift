import SwiftUI

struct HomeScreen: View {
    let repository: any NovelRepository
    let openDetail: (String) -> Void
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                if let featured = repository.featuredNovel() {
                    hero(for: featured)
                }

                ForEach(repository.homeSections()) { section in
                    BoardSection(title: section.title, subtitle: section.subtitle) {
                        LazyVGrid(columns: columns, spacing: 16) {
                            ForEach(section.novels) { novel in
                                NovelGridCard(novel: novel) {
                                    openDetail(novel.slug)
                                }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 24)
        }
        .background(InkRoadTheme.appBackground.ignoresSafeArea())
        .navigationTitle("InkRoad")
        .navigationBarTitleDisplayMode(.large)
    }

    private var columns: [GridItem] {
        [GridItem(.adaptive(minimum: horizontalSizeClass == .regular ? 220 : 160), spacing: 16)]
    }

    private func hero(for novel: NovelSummary) -> some View {
        ZStack(alignment: .bottomLeading) {
            RoundedRectangle(cornerRadius: 34, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.09, green: 0.10, blue: 0.12),
                            Color(red: 0.16, green: 0.24, blue: 0.31)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .top, spacing: 16) {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("이번 주 대표 프로모션")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white.opacity(0.76))
                        if novel.salePercent > 0 {
                            Text("-\(novel.salePercent)% 세일")
                                .font(.subheadline.weight(.bold))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(InkRoadTheme.sale)
                                .foregroundStyle(.white)
                                .clipShape(Capsule())
                        }
                        Text(novel.title)
                            .font(.system(size: 30, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(3)
                        Text(novel.tagline)
                            .font(.body)
                            .foregroundStyle(.white.opacity(0.82))
                            .lineLimit(2)
                        Text("\(novel.authorName) · 총 \(novel.totalEpisodeCount)화 · 평점 \(String(format: "%.1f", novel.rating))")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.7))
                    }

                    CoverArtworkView(novel: novel)
                        .frame(width: horizontalSizeClass == .regular ? 210 : 128)
                }

                Button("바로 읽기") {
                    openDetail(novel.slug)
                }
                .buttonStyle(InkRoadPrimaryButtonStyle())
            }
            .padding(22)
        }
        .frame(minHeight: horizontalSizeClass == .regular ? 320 : 270)
    }
}
