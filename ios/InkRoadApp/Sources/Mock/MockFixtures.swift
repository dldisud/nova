import Foundation

struct MockCatalog {
    let novels: [NovelDetail]

    static let inkRoad: MockCatalog = {
        MockCatalog(
            novels: [
                makeNovel(
                    slug: "black-oath",
                    title: "칠흑의 마법사와 검은 서약",
                    subtitle: "봉인된 서약을 깨우는 아카데미 판타지",
                    author: "한서림",
                    tagline: "무료 진입과 세일 전환이 한 번에 이어지는 대표작",
                    tags: ["판타지", "아카데미", "성장"],
                    coverStyle: "night",
                    salePercent: 50,
                    freeCount: 30,
                    totalCount: 214,
                    rating: 9.4,
                    views: 128_000,
                    updated: "오늘",
                    headline: "봉인된 서약을 깨운 낙제생이 아카데미 판을 뒤집는다.",
                    description: "금서고를 지키던 낙제생이 어느 날 검은 서약서와 접속하며, 잊힌 마법 체계를 다시 깨운다. 아카데미 경쟁, 성장 서사, 관계 축적을 모두 보여주는 InkRoad 대표 톤의 판타지 작품이다."
                ),
                makeNovel(
                    slug: "abyssal-librarian",
                    title: "심연의 사서와 금지된 장서관",
                    subtitle: "봉인된 기록을 관리하는 미스터리 판타지",
                    author: "미카 사도",
                    tagline: "분위기와 설정 밀도가 강한 장서관 미스터리",
                    tags: ["미스터리", "판타지", "사서"],
                    coverStyle: "amber",
                    salePercent: 20,
                    freeCount: 12,
                    totalCount: 96,
                    rating: 8.9,
                    views: 98_400,
                    updated: "어제",
                    headline: "심연 아래 잠든 장서관에서, 읽어선 안 될 책이 깨어난다.",
                    description: "봉인된 장서관의 신입 사서가 기록과 의식, 금서의 균형을 지키며 비밀을 파헤친다. 차분한 몰입감과 강한 설정 설명력이 장점인 작품이다."
                ),
                makeNovel(
                    slug: "academy-necromancer-undercover",
                    title: "아카데미 최강 흑마도사는 낙제생으로 위장한다",
                    subtitle: "정체를 숨긴 최강자의 역전극",
                    author: "류하늘",
                    tagline: "학원 판타지 집중전 대표 작품",
                    tags: ["판타지", "아카데미", "흑마법"],
                    coverStyle: "violet",
                    salePercent: 35,
                    freeCount: 18,
                    totalCount: 137,
                    rating: 9.1,
                    views: 112_300,
                    updated: "2일 전",
                    headline: "최강의 흑마도사가 낙제생 신분으로 다시 입학한다.",
                    description: "모든 힘을 숨긴 채 최하위 학생으로 다시 들어간 주인공이, 학원 안팎의 음모를 뒤집는 서사다. 시원한 보상감과 빠른 사건 전개가 중심이다."
                ),
                makeNovel(
                    slug: "reincarnated-emperor-chef",
                    title: "환생한 황제는 요리로 제국을 구한다",
                    subtitle: "정치와 식탁이 함께 움직이는 회귀 판타지",
                    author: "연서은",
                    tagline: "완결 번들 세일과 잘 어울리는 정주행형 작품",
                    tags: ["회귀", "궁중", "요리"],
                    coverStyle: "royal",
                    salePercent: 28,
                    freeCount: 15,
                    totalCount: 124,
                    rating: 9.0,
                    views: 87_000,
                    updated: "3일 전",
                    headline: "몰락한 제국을 다시 세우는 방법은 한 접시의 요리부터였다.",
                    description: "황제가 과거로 돌아와 음식과 외교, 정보망을 이용해 제국의 붕괴를 막아낸다. 부드럽게 읽히는 전개와 확실한 사건 회수가 장점이다."
                ),
                makeNovel(
                    slug: "starship-librarian-knights",
                    title: "우주정거장의 사서 기사단",
                    subtitle: "번역작 감성의 SF 판타지 어드벤처",
                    author: "A. Lorien",
                    tagline: "번역작 특집전에 맞는 우주 서가 모험담",
                    tags: ["SF", "번역", "모험"],
                    coverStyle: "cosmic",
                    salePercent: 30,
                    freeCount: 8,
                    totalCount: 82,
                    rating: 8.8,
                    views: 54_200,
                    updated: "4일 전",
                    headline: "무너지는 정거장 도서관에서 기사단이 마지막 기록을 지킨다.",
                    description: "우주정거장의 서고를 지키는 기사단이 잃어버린 기록과 침략 세력 사이에서 흔들리는 이야기를 그린다."
                ),
                makeNovel(
                    slug: "haunted-subway-manager",
                    title: "심야 지하철 관리자는 귀신 민원을 처리한다",
                    subtitle: "도시 괴담과 생활 밀착형 코미디의 결합",
                    author: "문하진",
                    tagline: "현대 괴담 톤으로 가볍게 몰입되는 작품",
                    tags: ["현대판타지", "괴담", "코미디"],
                    coverStyle: "metro",
                    salePercent: 25,
                    freeCount: 22,
                    totalCount: 101,
                    rating: 8.7,
                    views: 76_400,
                    updated: "오늘",
                    headline: "막차 이후의 지하철엔 사람보다 더 많은 민원이 쌓인다.",
                    description: "심야 지하철 관리자 주인공이 역사 곳곳의 귀신 민원을 처리하며, 도시 괴담의 룰을 파헤치는 생활형 판타지다."
                )
            ]
        )
    }()

    private static func makeNovel(
        slug: String,
        title: String,
        subtitle: String,
        author: String,
        tagline: String,
        tags: [String],
        coverStyle: String,
        salePercent: Int,
        freeCount: Int,
        totalCount: Int,
        rating: Double,
        views: Int,
        updated: String,
        headline: String,
        description: String
    ) -> NovelDetail {
        let episodeBodies: [EpisodeDetail] = [
            EpisodeDetail(
                id: UUID(),
                number: 1,
                title: "프롤로그",
                body: """
                어둠이 가장 짙을 때, 금서고의 봉인이 먼저 흔들렸다.

                주인공은 남들이 버린 기록 속에서 이상한 문장을 발견한다. 그 문장은 단순한 주문이 아니었다. 누군가의 서약이었고, 동시에 세계를 다시 여는 열쇠였다.

                첫 문장은 조용히 시작하지만, 곧 더 큰 사건으로 이어진다.
                """,
                isFree: true
            ),
            EpisodeDetail(
                id: UUID(),
                number: 2,
                title: "첫 번째 징후",
                body: """
                봉인은 풀리기 전에 늘 작은 징후를 남긴다.

                복도 끝의 조명이 한 번 꺼지고, 읽지 않은 책이 저절로 펼쳐지며, 잊힌 이름이 다시 불린다. 주인공은 그 징후가 자신만 보인다는 사실을 눈치챈다.

                그리고 누군가는 이미 이 변화를 알고 있었다.
                """,
                isFree: true
            ),
            EpisodeDetail(
                id: UUID(),
                number: 3,
                title: "봉인의 가격",
                body: """
                힘에는 언제나 가격이 따라붙는다.

                주인공이 처음으로 힘을 사용한 순간, 주변 사람들은 아무 일도 없었다는 듯 지나간다. 하지만 기록은 지워지지 않았고, 대가 또한 사라지지 않았다.

                다음 선택은 더 이상 되돌릴 수 없는 쪽으로 기울기 시작한다.
                """,
                isFree: false
            )
        ]

        let episodes = episodeBodies.map {
            EpisodeSummary(
                id: $0.id,
                number: $0.number,
                title: $0.title,
                teaser: String($0.body.split(separator: "\n").first ?? ""),
                isFree: $0.isFree
            )
        }

        let summary = NovelSummary(
            id: UUID(),
            slug: slug,
            title: title,
            subtitle: subtitle,
            authorName: author,
            tagline: tagline,
            tags: tags,
            coverStyle: coverStyle,
            salePercent: salePercent,
            freeEpisodeCount: freeCount,
            totalEpisodeCount: totalCount,
            rating: rating,
            viewCount: views,
            updatedLabel: updated
        )

        return NovelDetail(
            summary: summary,
            headline: headline,
            longDescription: description,
            episodes: episodes,
            episodeBodies: episodeBodies
        )
    }
}
