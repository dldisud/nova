import Observation
import SwiftUI

enum AppTab: String, CaseIterable, Hashable {
    case home
    case search
    case library
    case profile

    var title: String {
        switch self {
        case .home: return "홈"
        case .search: return "탐색"
        case .library: return "서재"
        case .profile: return "MY"
        }
    }

    var systemImage: String {
        switch self {
        case .home: return "house.fill"
        case .search: return "magnifyingglass"
        case .library: return "books.vertical.fill"
        case .profile: return "person.crop.circle"
        }
    }
}

enum AppRoute: Hashable {
    case detail(slug: String)
    case viewer(novelSlug: String, episodeID: UUID)
}

@Observable
final class AppRouter {
    var selectedTab: AppTab = .home
    var homePath: [AppRoute] = []
    var searchPath: [AppRoute] = []
    var libraryPath: [AppRoute] = []
    var profilePath: [AppRoute] = []

    func openDetail(slug: String, from tab: AppTab) {
        selectedTab = tab
        append(.detail(slug: slug), to: tab)
    }

    func openViewer(novelSlug: String, episodeID: UUID, from tab: AppTab) {
        selectedTab = tab
        append(.viewer(novelSlug: novelSlug, episodeID: episodeID), to: tab)
    }

    private func append(_ route: AppRoute, to tab: AppTab) {
        switch tab {
        case .home:
            homePath.append(route)
        case .search:
            searchPath.append(route)
        case .library:
            libraryPath.append(route)
        case .profile:
            profilePath.append(route)
        }
    }
}
