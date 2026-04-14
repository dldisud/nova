import XCTest
@testable import InkRoad

final class MockRepositoriesTests: XCTestCase {
    func testFeaturedNovelHasDetailAndEpisodes() {
        let repository = MockNovelRepository(catalog: .inkRoad)

        let featured = repository.featuredNovel()

        XCTAssertNotNil(featured)
        XCTAssertEqual(featured?.slug, "black-oath")
        XCTAssertEqual(repository.novelDetail(slug: featured?.slug ?? "")?.episodes.count, 3)
    }

    func testSearchCanFilterByTag() {
        let repository = MockNovelRepository(catalog: .inkRoad)

        let results = repository.search(query: "", tag: "아카데미")

        XCTAssertFalse(results.isEmpty)
        XCTAssertTrue(results.allSatisfy { $0.tags.contains("아카데미") })
    }
}
