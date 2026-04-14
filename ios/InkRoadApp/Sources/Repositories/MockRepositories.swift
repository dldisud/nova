import Foundation

struct MockNovelRepository: NovelRepository {
    let catalog: MockCatalog

    func featuredNovel() -> NovelSummary? {
        catalog.novels.first?.summary
    }

    func homeSections() -> [HomeSection] {
        let summaries = catalog.novels.map(\.summary)
        let sale = summaries.filter { $0.salePercent > 0 }.sorted { $0.salePercent > $1.salePercent }
        let popular = summaries.sorted { $0.viewCount > $1.viewCount }
        let updated = summaries.sorted { $0.updatedLabel > $1.updatedLabel }

        return [
            HomeSection(title: "지금 할인 중", subtitle: "프로모션 톤을 유지한 보드 섹션", novels: Array(sale.prefix(4))),
            HomeSection(title: "인기 작품", subtitle: "반응이 좋은 작품을 빠르게 둘러보는 섹션", novels: Array(popular.prefix(4))),
            HomeSection(title: "최근 업데이트", subtitle: "이번 주에 새 회차가 올라온 작품", novels: Array(updated.prefix(4)))
        ]
    }

    func availableTags() -> [String] {
        Array(Set(catalog.novels.flatMap { $0.summary.tags })).sorted()
    }

    func search(query: String, tag: String?) -> [NovelSummary] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        return catalog.novels.map(\.summary).filter { novel in
            let matchesQuery = trimmed.isEmpty
                || novel.title.localizedCaseInsensitiveContains(trimmed)
                || novel.subtitle.localizedCaseInsensitiveContains(trimmed)
                || novel.authorName.localizedCaseInsensitiveContains(trimmed)

            let matchesTag = tag == nil || tag == "전체" || novel.tags.contains(tag ?? "")
            return matchesQuery && matchesTag
        }
    }

    func novelDetail(slug: String) -> NovelDetail? {
        catalog.novels.first { $0.summary.slug == slug }
    }

    func novelSummary(slug: String) -> NovelSummary? {
        novelDetail(slug: slug)?.summary
    }

    func episodeDetail(novelSlug: String, episodeID: UUID) -> EpisodeDetail? {
        novelDetail(slug: novelSlug)?.episodeBodies.first { $0.id == episodeID }
    }
}

struct MockLibraryRepository: LibraryRepository {
    let catalog: MockCatalog

    func shelf(_ shelf: LibraryShelf) -> [NovelSummary] {
        let summaries = catalog.novels.map(\.summary)
        switch shelf {
        case .reading:
            return Array(summaries.prefix(3))
        case .wishlist:
            return Array(summaries.dropFirst(2).prefix(3))
        case .purchased:
            return Array(summaries.suffix(3))
        }
    }
}

struct MockProfileRepository: ProfileRepository {
    func demoProfile() -> UserProfile {
        UserProfile(
            id: UUID(),
            email: "demo@inkroad.app",
            displayName: "쿠루미",
            bio: "InkRoad iOS 스타터를 테스트하는 데모 계정입니다.",
            isCreator: true
        )
    }
}
