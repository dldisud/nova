import SwiftUI

struct LibraryScreen: View {
    let libraryRepository: any LibraryRepository
    let session: AppSession
    let openDetail: (String) -> Void

    @State private var selectedShelf: LibraryShelf = .reading
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    private var novels: [NovelSummary] {
        libraryRepository.shelf(selectedShelf)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                BoardSection(title: "내 서재", subtitle: "읽는 중, 찜, 구매 목록을 한곳에서 관리") {
                    Picker("서재 필터", selection: $selectedShelf) {
                        ForEach(LibraryShelf.allCases) { shelf in
                            Text(shelf.title).tag(shelf)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                if session.isSignedIn {
                    BoardSection(title: selectedShelf.title, subtitle: "데모 기준 샘플 보드") {
                        LazyVGrid(columns: columns, spacing: 16) {
                            ForEach(novels) { novel in
                                NovelGridCard(novel: novel) {
                                    openDetail(novel.slug)
                                }
                            }
                        }
                    }
                } else {
                    EmptyStateCard(
                        title: "로그인 후 서재를 사용할 수 있어요",
                        message: "이번 스타터 앱에서는 MY 탭에서 데모 로그인을 켜면 서재 셸을 바로 확인할 수 있어요.",
                        buttonTitle: "나중에 로그인 흐름 연결"
                    ) {
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 24)
        }
        .background(InkRoadTheme.appBackground.ignoresSafeArea())
        .navigationTitle("내 서재")
        .navigationBarTitleDisplayMode(.large)
    }

    private var columns: [GridItem] {
        [GridItem(.adaptive(minimum: horizontalSizeClass == .regular ? 220 : 160), spacing: 16)]
    }
}
