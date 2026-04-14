import Foundation

struct NovelSummary: Identifiable, Hashable {
    let id: UUID
    let slug: String
    let title: String
    let subtitle: String
    let authorName: String
    let tagline: String
    let tags: [String]
    let coverStyle: String
    let salePercent: Int
    let freeEpisodeCount: Int
    let totalEpisodeCount: Int
    let rating: Double
    let viewCount: Int
    let updatedLabel: String
}

struct EpisodeSummary: Identifiable, Hashable {
    let id: UUID
    let number: Int
    let title: String
    let teaser: String
    let isFree: Bool
}

struct EpisodeDetail: Identifiable, Hashable {
    let id: UUID
    let number: Int
    let title: String
    let body: String
    let isFree: Bool
}

struct NovelDetail: Identifiable, Hashable {
    let summary: NovelSummary
    let headline: String
    let longDescription: String
    let episodes: [EpisodeSummary]
    let episodeBodies: [EpisodeDetail]

    var id: UUID { summary.id }
}

struct UserProfile: Identifiable, Hashable {
    let id: UUID
    let email: String
    let displayName: String
    let bio: String
    let isCreator: Bool
}

struct HomeSection: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let subtitle: String
    let novels: [NovelSummary]
}

enum LibraryShelf: String, CaseIterable, Identifiable {
    case reading
    case wishlist
    case purchased

    var id: String { rawValue }

    var title: String {
        switch self {
        case .reading: return "읽는 중"
        case .wishlist: return "찜"
        case .purchased: return "구매"
        }
    }
}
