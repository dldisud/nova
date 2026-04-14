import Observation
import SwiftUI

struct RootTabView: View {
    let environment: AppEnvironment
    let session: AppSession
    let router: AppRouter

    var body: some View {
        @Bindable var router = router

        TabView(selection: $router.selectedTab) {
            NavigationStack(path: $router.homePath) {
                HomeScreen(
                    repository: environment.novelRepository,
                    openDetail: { router.openDetail(slug: $0, from: .home) }
                )
                .navigationDestination(for: AppRoute.self) { route in
                    destination(for: route, sourceTab: .home)
                }
            }
            .tabItem { Label(AppTab.home.title, systemImage: AppTab.home.systemImage) }
            .tag(AppTab.home)

            NavigationStack(path: $router.searchPath) {
                SearchScreen(
                    repository: environment.novelRepository,
                    openDetail: { router.openDetail(slug: $0, from: .search) }
                )
                .navigationDestination(for: AppRoute.self) { route in
                    destination(for: route, sourceTab: .search)
                }
            }
            .tabItem { Label(AppTab.search.title, systemImage: AppTab.search.systemImage) }
            .tag(AppTab.search)

            NavigationStack(path: $router.libraryPath) {
                LibraryScreen(
                    libraryRepository: environment.libraryRepository,
                    session: session,
                    openDetail: { router.openDetail(slug: $0, from: .library) }
                )
                .navigationDestination(for: AppRoute.self) { route in
                    destination(for: route, sourceTab: .library)
                }
            }
            .tabItem { Label(AppTab.library.title, systemImage: AppTab.library.systemImage) }
            .tag(AppTab.library)

            NavigationStack(path: $router.profilePath) {
                ProfileScreen(
                    profileRepository: environment.profileRepository,
                    session: session
                )
                .navigationDestination(for: AppRoute.self) { route in
                    destination(for: route, sourceTab: .profile)
                }
            }
            .tabItem { Label(AppTab.profile.title, systemImage: AppTab.profile.systemImage) }
            .tag(AppTab.profile)
        }
        .tint(InkRoadTheme.accent)
    }

    @ViewBuilder
    private func destination(for route: AppRoute, sourceTab: AppTab) -> some View {
        switch route {
        case let .detail(slug):
            NovelDetailScreen(
                slug: slug,
                repository: environment.novelRepository,
                openViewer: { novelSlug, episodeID in
                    router.openViewer(novelSlug: novelSlug, episodeID: episodeID, from: sourceTab)
                }
            )
        case let .viewer(novelSlug, episodeID):
            EpisodeViewerScreen(
                novelSlug: novelSlug,
                initialEpisodeID: episodeID,
                repository: environment.novelRepository
            )
        }
    }
}
