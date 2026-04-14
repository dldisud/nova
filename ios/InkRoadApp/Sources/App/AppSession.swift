import Observation

@Observable
final class AppSession {
    var currentUser: UserProfile?
    var isCreatorModeEnabled = false

    var isSignedIn: Bool {
        currentUser != nil
    }

    var displayName: String {
        currentUser?.displayName ?? "게스트"
    }

    func signIn(as profile: UserProfile) {
        currentUser = profile
        isCreatorModeEnabled = profile.isCreator
    }

    func signOut() {
        currentUser = nil
        isCreatorModeEnabled = false
    }
}
