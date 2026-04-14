struct AppEnvironment {
    let novelRepository: any NovelRepository
    let libraryRepository: any LibraryRepository
    let profileRepository: any ProfileRepository

    static let mock: AppEnvironment = {
        let catalog = MockCatalog.inkRoad
        return AppEnvironment(
            novelRepository: MockNovelRepository(catalog: catalog),
            libraryRepository: MockLibraryRepository(catalog: catalog),
            profileRepository: MockProfileRepository()
        )
    }()
}
