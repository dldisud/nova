import SwiftUI

enum InkRoadTheme {
    static let appBackground = Color(red: 0.95, green: 0.94, blue: 0.91)
    static let boardBackground = Color.white
    static let ink = Color(red: 0.08, green: 0.09, blue: 0.11)
    static let muted = Color(red: 0.41, green: 0.42, blue: 0.45)
    static let accent = Color(red: 0.15, green: 0.24, blue: 0.43)
    static let accentSoft = Color(red: 0.31, green: 0.39, blue: 0.57)
    static let sale = Color(red: 0.83, green: 0.35, blue: 0.20)
    static let boardShadow = Color.black.opacity(0.08)
}

struct CoverArtworkView: View {
    let novel: NovelSummary

    var body: some View {
        RoundedRectangle(cornerRadius: 22, style: .continuous)
            .fill(coverGradient)
            .overlay(alignment: .topLeading) {
                VStack(alignment: .leading, spacing: 6) {
                    Image(systemName: coverSymbol)
                        .font(.system(size: 22, weight: .bold))
                    Spacer()
                    Text(novel.title)
                        .font(.system(size: 20, weight: .black, design: .serif))
                        .foregroundStyle(.white)
                        .lineLimit(3)
                        .minimumScaleFactor(0.7)
                }
                .padding(18)
                .foregroundStyle(.white.opacity(0.92))
            }
            .shadow(color: .black.opacity(0.18), radius: 18, y: 10)
            .aspectRatio(0.75, contentMode: .fit)
    }

    private var coverGradient: LinearGradient {
        switch novel.coverStyle {
        case "amber":
            return LinearGradient(colors: [Color(red: 0.28, green: 0.18, blue: 0.10), Color(red: 0.64, green: 0.47, blue: 0.18)], startPoint: .topLeading, endPoint: .bottomTrailing)
        case "violet":
            return LinearGradient(colors: [Color(red: 0.16, green: 0.11, blue: 0.34), Color(red: 0.48, green: 0.26, blue: 0.69)], startPoint: .topLeading, endPoint: .bottomTrailing)
        case "royal":
            return LinearGradient(colors: [Color(red: 0.17, green: 0.18, blue: 0.30), Color(red: 0.48, green: 0.29, blue: 0.18)], startPoint: .topLeading, endPoint: .bottomTrailing)
        case "cosmic":
            return LinearGradient(colors: [Color(red: 0.07, green: 0.10, blue: 0.19), Color(red: 0.17, green: 0.45, blue: 0.57)], startPoint: .topLeading, endPoint: .bottomTrailing)
        case "metro":
            return LinearGradient(colors: [Color(red: 0.13, green: 0.16, blue: 0.18), Color(red: 0.24, green: 0.39, blue: 0.36)], startPoint: .topLeading, endPoint: .bottomTrailing)
        default:
            return LinearGradient(colors: [Color(red: 0.08, green: 0.13, blue: 0.20), Color(red: 0.18, green: 0.33, blue: 0.42)], startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }

    private var coverSymbol: String {
        switch novel.coverStyle {
        case "amber": return "books.vertical.fill"
        case "violet": return "sparkles"
        case "royal": return "fork.knife"
        case "cosmic": return "globe.americas.fill"
        case "metro": return "tram.fill"
        default: return "book.closed.fill"
        }
    }
}

struct InkRoadPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(configuration.isPressed ? InkRoadTheme.accentSoft : InkRoadTheme.ink)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.99 : 1)
    }
}

struct BoardSection<Content: View>: View {
    let title: String
    let subtitle: String
    let content: Content

    init(title: String, subtitle: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.subtitle = subtitle
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(InkRoadTheme.ink)
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(InkRoadTheme.muted)
            }

            content
        }
        .padding(18)
        .background(InkRoadTheme.boardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .shadow(color: InkRoadTheme.boardShadow, radius: 18, y: 8)
    }
}

struct NovelGridCard: View {
    let novel: NovelSummary
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                ZStack(alignment: .topLeading) {
                    CoverArtworkView(novel: novel)
                    VStack(alignment: .leading, spacing: 6) {
                        if novel.salePercent > 0 {
                            Text("-\(novel.salePercent)%")
                                .font(.caption.weight(.bold))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(InkRoadTheme.sale)
                                .foregroundStyle(.white)
                                .clipShape(Capsule())
                        }
                        Text("\(novel.freeEpisodeCount)화 무료")
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(.ultraThinMaterial)
                            .foregroundStyle(InkRoadTheme.ink)
                            .clipShape(Capsule())
                    }
                    .padding(12)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text(novel.title)
                        .font(.headline)
                        .foregroundStyle(InkRoadTheme.ink)
                        .lineLimit(2)
                    Text(novel.authorName)
                        .font(.subheadline)
                        .foregroundStyle(InkRoadTheme.muted)
                    Text("평점 \(String(format: "%.1f", novel.rating)) · 총 \(novel.totalEpisodeCount)화")
                        .font(.caption)
                        .foregroundStyle(InkRoadTheme.muted)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

struct TagChip: View {
    let title: String
    let isSelected: Bool

    var body: some View {
        Text(title)
            .font(.subheadline.weight(.semibold))
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(isSelected ? InkRoadTheme.ink : InkRoadTheme.boardBackground)
            .foregroundStyle(isSelected ? Color.white : InkRoadTheme.ink)
            .clipShape(Capsule())
    }
}

struct EmptyStateCard: View {
    let title: String
    let message: String
    let buttonTitle: String
    let action: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Text(title)
                .font(.title3.weight(.bold))
                .foregroundStyle(InkRoadTheme.ink)
            Text(message)
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundStyle(InkRoadTheme.muted)
            Button(buttonTitle, action: action)
                .buttonStyle(InkRoadPrimaryButtonStyle())
        }
        .padding(24)
        .background(InkRoadTheme.boardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .shadow(color: InkRoadTheme.boardShadow, radius: 18, y: 8)
    }
}
