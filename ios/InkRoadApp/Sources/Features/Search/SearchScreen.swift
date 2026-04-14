import SwiftUI

struct SearchScreen: View {
    let repository: any NovelRepository
    let openDetail: (String) -> Void

    @State private var query = ""
    @State private var selectedTag = "전체"
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    private var tags: [String] {
        ["전체"] + repository.availableTags()
    }

    private var results: [NovelSummary] {
        repository.search(query: query, tag: selectedTag)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                BoardSection(title: "탐색", subtitle: "작품명, 작가명, 태그로 빠르게 찾기") {
                    VStack(alignment: .leading, spacing: 14) {
                        HStack(spacing: 12) {
                            Image(systemName: "magnifyingglass")
                                .foregroundStyle(InkRoadTheme.muted)
                            TextField("작품명 또는 작가명 검색", text: $query)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }
                        .padding(14)
                        .background(Color(.systemGray6))
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                ForEach(tags, id: \.self) { tag in
                                    Button {
                                        selectedTag = tag
                                    } label: {
                                        TagChip(title: tag, isSelected: selectedTag == tag)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }

                BoardSection(title: "검색 결과", subtitle: "\(results.count)개의 작품") {
                    if results.isEmpty {
                        EmptyStateCard(
                            title: "검색 결과가 없어요",
                            message: "다른 키워드나 태그를 시도해보면 더 많은 작품을 찾을 수 있어요.",
                            buttonTitle: "조건 초기화"
                        ) {
                            query = ""
                            selectedTag = "전체"
                        }
                    } else {
                        LazyVGrid(columns: columns, spacing: 16) {
                            ForEach(results) { novel in
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
        .navigationTitle("탐색")
        .navigationBarTitleDisplayMode(.large)
    }

    private var columns: [GridItem] {
        [GridItem(.adaptive(minimum: horizontalSizeClass == .regular ? 220 : 160), spacing: 16)]
    }
}
