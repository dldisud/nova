import SwiftUI

@main
struct InkRoadApp: App {
    @State private var session = AppSession()
    @State private var router = AppRouter()

    private let environment = AppEnvironment.mock

    var body: some Scene {
        WindowGroup {
            RootTabView(
                environment: environment,
                session: session,
                router: router
            )
        }
    }
}
