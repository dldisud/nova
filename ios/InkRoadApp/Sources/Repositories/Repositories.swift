import Foundation

protocol NovelRepository {
    func featuredNovel() -> NovelSummary?
    func homeSections() -> [HomeSection]
    func availableTags() -> [String]
    func search(query: String, tag: String?) -> [NovelSummary]
    func novelDetail(slug: String) -> NovelDetail?
    func novelSummary(slug: String) -> NovelSummary?
    func episodeDetail(novelSlug: String, episodeID: UUID) -> EpisodeDetail?
}

protocol LibraryRepository {
    func shelf(_ shelf: LibraryShelf) -> [NovelSummary]
}

protocol ProfileRepository {
    func demoProfile() -> UserProfile
}
