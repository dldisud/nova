import SwiftUI

struct ProfileScreen: View {
    let profileRepository: any ProfileRepository
    let session: AppSession

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                if session.isSignedIn, let user = session.currentUser {
                    signedInView(user: user)
                } else {
                    signedOutView
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 24)
        }
        .background(InkRoadTheme.appBackground.ignoresSafeArea())
        .navigationTitle("MY")
        .navigationBarTitleDisplayMode(.large)
    }

    private var signedOutView: some View {
        EmptyStateCard(
            title: "로그인이 아직 없어요",
            message: "첫 버전은 데모 계정으로 흐름을 확인하는 스타터 앱입니다. 버튼을 누르면 즉시 MY 상태가 바뀝니다.",
            buttonTitle: "데모 로그인"
        ) {
            session.signIn(as: profileRepository.demoProfile())
        }
    }

    private func signedInView(user: UserProfile) -> some View {
        VStack(spacing: 18) {
            BoardSection(title: user.displayName, subtitle: user.email) {
                VStack(alignment: .leading, spacing: 12) {
                    Text(user.bio)
                        .font(.body)
                        .foregroundStyle(InkRoadTheme.muted)

                    Toggle("크리에이터 모드", isOn: Binding(
                        get: { session.isCreatorModeEnabled },
                        set: { session.isCreatorModeEnabled = $0 }
                    ))
                    .tint(InkRoadTheme.accent)
                }
            }

            BoardSection(title: "계정 상태", subtitle: "스타터 앱에서 바로 확인할 수 있는 셸") {
                VStack(alignment: .leading, spacing: 10) {
                    Label("로그인 상태 활성화", systemImage: "checkmark.circle.fill")
                    Label(user.isCreator ? "작가 계정 가정" : "일반 독자 계정", systemImage: "person.crop.rectangle")
                    Label(session.isCreatorModeEnabled ? "크리에이터 모드 ON" : "크리에이터 모드 OFF", systemImage: "slider.horizontal.3")
                }
                .font(.subheadline)
                .foregroundStyle(InkRoadTheme.ink)
            }

            Button("로그아웃") {
                session.signOut()
            }
            .buttonStyle(InkRoadPrimaryButtonStyle())
        }
    }
}
