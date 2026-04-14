(function () {
  const page = (window.location.pathname.split("/").pop() || "homepage_pc").replace(/\.html$/, "");
  const supported = ["homepage_pc", "search_pc", "novel_detail_pc", "novel_viewer_pc", "my_library_pc", "auth_pc", "creator_dashboard_pc", "author_dashboard_pc", "homepage", "search", "novel_detail", "novel_viewer", "my_library"];
  if (supported.indexOf(page) === -1) return;

  const cfg = window.inkroadSupabaseConfig || {};
  const base = (cfg.url || "").replace(/\/$/, "");
  const key = cfg.publishableKey || cfg.anonKey || "";
  if (!base || !key) return;

  const query = new URLSearchParams(window.location.search);
  const store = {
    bookmarks: "inkroad-bookmarks",
    accessToken: "inkroad-supabase-access-token"
  };
  const EPISODE_PRICE = 300;
  let cachedCatalog = null;

  window.addEventListener("inkroad-locale-change", function () {
    hydrate().catch(function (err) { console.error("[i18n] re-render failed:", err); });
  });

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderMarkdownForViewer(source) {
    var body = String(source || "").trim();
    if (!body) return "";

    if (typeof marked !== "undefined") {
      if (!renderMarkdownForViewer.configured && typeof marked.setOptions === "function") {
        marked.setOptions({
          gfm: true,
          breaks: true,
          headerIds: false,
          mangle: false
        });
        renderMarkdownForViewer.configured = true;
      }
      return marked.parse(body).replace(/<hr\s*\/?>/gi, "<div class='scene-break' aria-hidden='true'>* * *</div>");
    }

    return body.split(/\n{2,}/).filter(Boolean).map(function (paragraph) {
      return "<p>" + esc(paragraph).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }

  function attachReaderProtection(node) {
    if (!node || node.dataset.readerProtected === "true") return;
    node.classList.add("reader-protected");
    node.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    node.addEventListener("dragstart", function (e) { e.preventDefault(); });
    node.addEventListener("selectstart", function (e) { e.preventDefault(); });
    node.dataset.readerProtected = "true";
  }

  function unwrapRelation(value) {
    if (Array.isArray(value)) return value[0] || null;
    return value || null;
  }

  function formatCount(value) {
    return new Intl.NumberFormat(window.inkroadI18n.locale).format(Number(value || 0));
  }

  function formatWon(value) {
    return new Intl.NumberFormat(window.inkroadI18n.locale).format(Number(value || 0)) + t("common.won");
  }

  function placeholder(title) {
    return "https://placehold.co/320x440/ddd/222?text=" + encodeURIComponent(title || "InkRoad");
  }

  const supplementalCatalog = {
    novels: [
      {
        id: "sample-academy-necromancer",
        slug: "academy-necromancer-undercover",
        title: "아카데미 최강 흑마도사는 낙제생으로 위장한다",
        subtitle: "수석 흑마도사의 잠입 생존기",
        shortDescription: "아카데미와 다크 판타지를 동시에 눌러볼 수 있는 대표 샘플작",
        description: "정체를 숨긴 흑마도사가 낙제생 신분으로 아카데미에 잠입해, 몰락 직전의 학년을 다시 세우는 학원 판타지입니다.",
        coverUrl: "",
        bannerUrl: "",
        status: "serializing",
        isTranslation: false,
        originCountry: "KR",
        freeEpisodeCount: 18,
        totalEpisodeCount: 143,
        reactionScore: 9.2,
        viewCount: 165400,
        commentCount: 2810,
        bundleListPrice: 16800,
        bundleSalePrice: 12600,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        authorName: "한서림",
        tags: ["아카데미", "다크 판타지", "성장", "남성향"]
      },
      {
        id: "sample-villainess-ledger",
        slug: "villainess-survives-by-contract",
        title: "악역 영애는 후원 계약으로 살아남는다",
        subtitle: "몰락을 아는 영애의 계약 생존",
        shortDescription: "로맨스 판타지와 정치 서사를 찾을 때 보이는 여성향 대표 샘플",
        description: "몰락이 예정된 영애가 후원 계약과 장부 조작으로 파멸 루트를 비틀어 나가는 로맨스 판타지입니다.",
        coverUrl: "",
        bannerUrl: "",
        status: "serializing",
        isTranslation: false,
        originCountry: "KR",
        freeEpisodeCount: 22,
        totalEpisodeCount: 119,
        reactionScore: 9.0,
        viewCount: 132700,
        commentCount: 2250,
        bundleListPrice: 15400,
        bundleSalePrice: null,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        authorName: "이설원",
        tags: ["로맨스 판타지", "정치", "가문물", "여성향"]
      },
      {
        id: "sample-subway-manager",
        slug: "haunted-subway-manager",
        title: "심야 지하철 관리자는 귀신 민원을 처리한다",
        subtitle: "도시 괴담을 민원 문서처럼 처리하는 현대 판타지",
        shortDescription: "현대 판타지와 미스터리, 하드보일드 감성을 넣어주는 샘플",
        description: "막차 이후의 역에서만 접수되는 기묘한 민원을 해결하는 관리자의 밤을 다루는 현대 판타지입니다.",
        coverUrl: "",
        bannerUrl: "",
        status: "serializing",
        isTranslation: false,
        originCountry: "KR",
        freeEpisodeCount: 12,
        totalEpisodeCount: 87,
        reactionScore: 8.8,
        viewCount: 74600,
        commentCount: 1540,
        bundleListPrice: 13200,
        bundleSalePrice: 9900,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
        authorName: "유리안",
        tags: ["현대 판타지", "미스터리", "하드보일드", "한국"]
      },
      {
        id: "sample-star-librarian",
        slug: "starship-librarian-knights",
        title: "우주정거장의 사서 기사단",
        subtitle: "기록과 전투가 함께 가는 SF 모험",
        shortDescription: "SF 장르 영역을 채워주는 이미지 좋은 샘플작",
        description: "붕괴 직전의 우주정거장에서 금지 기록을 지키는 사서 기사단이 외부 침입과 내부 반란을 동시에 막아내는 SF입니다.",
        coverUrl: "",
        bannerUrl: "",
        status: "completed",
        isTranslation: true,
        originCountry: "US",
        freeEpisodeCount: 10,
        totalEpisodeCount: 74,
        reactionScore: 8.7,
        viewCount: 69500,
        commentCount: 1180,
        bundleListPrice: 14800,
        bundleSalePrice: 10400,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
        authorName: "미카 사도",
        tags: ["SF", "사서", "번역작", "군상극"]
      },
      {
        id: "sample-murim-records",
        slug: "murim-healer-grows-by-records",
        title: "무림 의원은 기록으로 강해진다",
        subtitle: "의술과 장부가 만난 성장 무협",
        shortDescription: "무협 카테고리를 비워두지 않게 해주는 샘플 작품",
        description: "환자를 살릴수록 기록이 무공으로 바뀌는 기이한 장부를 손에 넣은 의원의 성장 무협입니다.",
        coverUrl: "",
        bannerUrl: "",
        status: "serializing",
        isTranslation: false,
        originCountry: "KR",
        freeEpisodeCount: 16,
        totalEpisodeCount: 102,
        reactionScore: 8.9,
        viewCount: 88400,
        commentCount: 1710,
        bundleListPrice: 13800,
        bundleSalePrice: null,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 42).toISOString(),
        authorName: "유리안",
        tags: ["무협", "성장", "남성향", "장기 연재"]
      },
      {
        id: "sample-frozen-ledger",
        slug: "northern-duchess-hidden-ledger",
        title: "북부 대공비는 숨겨둔 장부를 꺼내지 않는다",
        subtitle: "장부와 외교로 버티는 북부 생존기",
        shortDescription: "검색과 홈에서 여성향·정치 쪽 밀도를 채워주는 작품",
        description: "얼어붙은 북부에서 전쟁 대신 장부와 외교문서를 무기로 살아남는 대공비의 정치 서사입니다.",
        coverUrl: "",
        bannerUrl: "",
        status: "serializing",
        isTranslation: false,
        originCountry: "KR",
        freeEpisodeCount: 14,
        totalEpisodeCount: 91,
        reactionScore: 8.8,
        viewCount: 81100,
        commentCount: 1490,
        bundleListPrice: 14200,
        bundleSalePrice: 11300,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(),
        authorName: "이설원",
        tags: ["로맨스 판타지", "정치", "여성향", "가문물"]
      },
      {
        id: "sample-court-mage",
        slug: "late-night-court-mage",
        title: "서초동 마도 법무관은 오늘도 야근한다",
        subtitle: "법정과 마법이 얽히는 어반 판타지",
        shortDescription: "현대 배경과 사건 해결형 읽을거리를 늘려주는 샘플",
        description: "법정 제출용 마법 증거를 감정하는 법무관이 도심 괴이 사건을 해결하는 현대 판타지입니다.",
        coverUrl: "",
        bannerUrl: "",
        status: "serializing",
        isTranslation: false,
        originCountry: "KR",
        freeEpisodeCount: 11,
        totalEpisodeCount: 69,
        reactionScore: 8.6,
        viewCount: 57200,
        commentCount: 960,
        bundleListPrice: 12600,
        bundleSalePrice: null,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
        authorName: "한서림",
        tags: ["현대 판타지", "미스터리", "하드보일드", "한국"]
      },
      {
        id: "sample-cooking-emperor",
        slug: "reincarnated-emperor-chef",
        title: "환생한 황제는 요리로 제국을 구한다",
        subtitle: "미식과 정치가 만나는 이세계 궁정극",
        shortDescription: "가벼운 톤의 환생 판타지 축을 채우는 샘플작",
        description: "독살당한 황제가 요리사의 몸으로 환생해 식탁과 외교로 제국을 되살리는 환생 판타지입니다.",
        coverUrl: "",
        bannerUrl: "",
        status: "completed",
        isTranslation: false,
        originCountry: "KR",
        freeEpisodeCount: 8,
        totalEpisodeCount: 58,
        reactionScore: 8.5,
        viewCount: 64100,
        commentCount: 1110,
        bundleListPrice: 11800,
        bundleSalePrice: 8400,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 54).toISOString(),
        authorName: "이설원",
        tags: ["판타지", "환생", "정치", "남성향"]
      }
    ],
    eventItems: [
      { slug: "academy-necromancer-undercover", title: "학원 판타지 집중전", subtitle: "아카데미 인기작만 모은 한정 할인", discountPercent: 20, sortOrder: 10, endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString() },
      { slug: "haunted-subway-manager", title: "도시 괴담 주간전", subtitle: "미스터리·현대 판타지 할인", discountPercent: 25, sortOrder: 11, endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString() },
      { slug: "starship-librarian-knights", title: "번역작 특집전", subtitle: "해외 인기작을 한 번에", discountPercent: 30, sortOrder: 12, endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString() },
      { slug: "reincarnated-emperor-chef", title: "완결 번들 세일", subtitle: "완결작 정주행 특가", discountPercent: 28, sortOrder: 13, endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString() }
    ]
  };

  const supplementalEpisodes = {
    "academy-necromancer-undercover": [
      { id: "sample-academy-necromancer-1", episodeNumber: 1, title: "낙제생 등록", teaser: "최강 흑마도사가 가장 낮은 반에 이름을 올립니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 70).toISOString(), body: "입학식 날, 그는 수석도 아닌 낙제생 명단에서 자신의 이름을 확인했다.\n\n**정체를 숨기는 순간**, 아카데미의 질서는 더 이상 예전과 같지 않았다." },
      { id: "sample-academy-necromancer-2", episodeNumber: 2, title: "검은 실기 시험", teaser: "첫 수업에서 모두가 그의 손을 주목합니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 69).toISOString(), body: "실기장은 조용했다.\n\n그가 손끝을 세우자, 부서진 표적들이 역으로 다시 일어났다." },
      { id: "sample-academy-necromancer-19", episodeNumber: 19, title: "금지 강의실", teaser: "무료 구간 이후 첫 유료 회차입니다.", accessType: "paid", price: 300, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(), body: "금지 강의실 문이 닫히자, 학생들은 그제야 자신의 교관이 누구인지 눈치챘다." }
    ],
    "villainess-survives-by-contract": [
      { id: "sample-villainess-ledger-1", episodeNumber: 1, title: "계약서 첫 줄", teaser: "파멸을 막기 위한 첫 줄이 써집니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 62).toISOString(), body: "파혼 통보보다 먼저, 그녀는 계약서 첫 줄에 자신의 이름을 적었다." },
      { id: "sample-villainess-ledger-2", episodeNumber: 2, title: "후원자의 조건", teaser: "후원 계약이 의외의 방향으로 흘러갑니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 61).toISOString(), body: "후원자는 돈 대신 정보를 원했다.\n\n그리고 그녀는 그 정보가 미래를 바꿀 수 있다는 걸 알고 있었다." },
      { id: "sample-villainess-ledger-23", episodeNumber: 23, title: "황실 회계 감사", teaser: "귀족 사회 전체가 흔들리는 회차입니다.", accessType: "paid", price: 300, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(), body: "감사장 한 장이 연회장을 침묵시켰다." }
    ],
    "haunted-subway-manager": [
      { id: "sample-subway-manager-1", episodeNumber: 1, title: "막차 이후 접수창구", teaser: "사람이 아닌 민원이 들어오기 시작합니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 34).toISOString(), body: "자정이 넘자, 민원 창구 버튼이 세 번 울렸다.\n\n첫 번째 신청인은 승객이 아니었다." },
      { id: "sample-subway-manager-2", episodeNumber: 2, title: "9호선 승강장의 그림자", teaser: "지워진 CCTV 시간대를 추적합니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 33).toISOString(), body: "지워진 시간대는 없다.\n\n다만, 누군가 보지 못하게 숨겼을 뿐이다." },
      { id: "sample-subway-manager-13", episodeNumber: 13, title: "종착역 안내 방송", teaser: "첫 유료 회차에서 진실이 드러납니다.", accessType: "paid", price: 300, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(), body: "안내 방송 끝자락에서, 사람이 내면 안 되는 이름이 불렸다." }
    ],
    "starship-librarian-knights": [
      { id: "sample-star-librarian-1", episodeNumber: 1, title: "분실된 항해 기록", teaser: "정거장의 첫 비밀이 열립니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 80).toISOString(), body: "항해 기록이 사라진 날, 사서 기사단의 검도 함께 사라졌다." },
      { id: "sample-star-librarian-2", episodeNumber: 2, title: "은하 서고 봉쇄령", teaser: "기록 보관구역이 봉쇄됩니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 79).toISOString(), body: "봉쇄령은 늘 늦는다.\n\n이미 누군가는 서고 안으로 들어가 있었다." },
      { id: "sample-star-librarian-11", episodeNumber: 11, title: "진공 속의 서가", teaser: "번역작 분위기를 느끼기 좋은 유료 회차입니다.", accessType: "paid", price: 300, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(), body: "문이 열리자, 책장 대신 별빛이 넘실거렸다." }
    ],
    "murim-healer-grows-by-records": [
      { id: "sample-murim-records-1", episodeNumber: 1, title: "죽지 않는 처방전", teaser: "의원은 첫 환자와 함께 기이한 장부를 만납니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 55).toISOString(), body: "환자가 살아남는 순간, 장부 첫 장에 붉은 문장이 떠올랐다." },
      { id: "sample-murim-records-2", episodeNumber: 2, title: "경혈과 장부", teaser: "의술이 무공으로 변하기 시작합니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 54).toISOString(), body: "그는 침을 놓았고, 장부는 그 동작을 무공으로 기록했다." },
      { id: "sample-murim-records-17", episodeNumber: 17, title: "독문의 장", teaser: "무림 의원의 첫 큰 시험입니다.", accessType: "paid", price: 300, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 19).toISOString(), body: "해독법이 아니라, 독 자체를 기록으로 거꾸로 푸는 밤이었다." }
    ],
    "northern-duchess-hidden-ledger": [
      { id: "sample-frozen-ledger-1", episodeNumber: 1, title: "얼어붙은 감사장", teaser: "북부로 보내진 감사장이 모든 시작입니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 47).toISOString(), body: "그 겨울, 대공비가 가장 먼저 봉인한 것은 편지가 아니라 장부였다." },
      { id: "sample-frozen-ledger-2", episodeNumber: 2, title: "서고의 장부 열쇠", teaser: "누가 장부를 숨겼는지 드러납니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 46).toISOString(), body: "서고 열쇠는 항상 보이는 곳에 있었다.\n\n아무도 장부가 그 열쇠라고 생각하지 않았을 뿐." },
      { id: "sample-frozen-ledger-15", episodeNumber: 15, title: "북부 사절단 연회", teaser: "정치전이 본격적으로 시작됩니다.", accessType: "paid", price: 300, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), body: "축배가 올라갈수록, 거짓말도 더 정교해졌다." }
    ],
    "late-night-court-mage": [
      { id: "sample-court-mage-1", episodeNumber: 1, title: "증거물 제14호", teaser: "법정 마법 감정이 첫 사건을 부릅니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 26).toISOString(), body: "증거물 제14호는 분명 반지였지만, 감정 결과는 기억이었다." },
      { id: "sample-court-mage-2", episodeNumber: 2, title: "야근 감정실", teaser: "야근 중에만 나타나는 사건입니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(), body: "퇴근 후에만 열리는 감정실은 늘 진실을 너무 늦게 보여줬다." },
      { id: "sample-court-mage-12", episodeNumber: 12, title: "주문서의 피고인", teaser: "첫 유료 회차에서 판이 커집니다.", accessType: "paid", price: 300, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), body: "피고인은 사람 하나가 아니었다. 주문서에 찍힌 도장이 모두 피고인이었다." }
    ],
    "reincarnated-emperor-chef": [
      { id: "sample-cooking-emperor-1", episodeNumber: 1, title: "황제의 마지막 식탁", teaser: "독살 이후, 그는 요리사의 몸에서 눈을 뜹니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 92).toISOString(), body: "죽기 직전까지도 그는 맛을 기억했다.\n\n다시 눈을 뜬 곳은 궁정 주방이었다." },
      { id: "sample-cooking-emperor-2", episodeNumber: 2, title: "국물 한 숟갈의 외교", teaser: "식탁이 외교장이 됩니다.", accessType: "free", price: 0, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 91).toISOString(), body: "협상은 늘 칼끝에서 끝났지만, 이번엔 국물 한 숟갈이 먼저 말을 걸었다." },
      { id: "sample-cooking-emperor-9", episodeNumber: 9, title: "독이 아닌 향신료", teaser: "완결작 체험용 유료 회차입니다.", accessType: "paid", price: 300, publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(), body: "독살을 막아낸 건 검사가 아니라, 혀끝에 남은 아주 작은 향이었다." }
    ]
  };

  function mergeSupplementalNovels(mappedNovels) {
    var existing = new Set(mappedNovels.map(function (novel) { return novel.slug; }));
    var merged = mappedNovels.slice();
    supplementalCatalog.novels.forEach(function (novel) {
      if (!existing.has(novel.slug)) merged.push(Object.assign({}, novel));
    });
    return merged.sort(function (left, right) {
      return right.reactionScore - left.reactionScore || right.viewCount - left.viewCount;
    });
  }

  function buildSupplementalEventItems(novelsBySlug) {
    return supplementalCatalog.eventItems.map(function (item) {
      var novel = novelsBySlug.get(item.slug);
      if (!novel) return null;
      return {
        event: {
          id: "sample-event-" + item.slug,
          title: item.title,
          subtitle: item.subtitle,
          endsAt: item.endsAt
        },
        novel: novel,
        discountPercent: item.discountPercent,
        salePrice: null,
        sortOrder: item.sortOrder
      };
    }).filter(Boolean);
  }

  function cover(novel) {
    return novel.coverUrl || placeholder(novel.title);
  }

  function banner(novel) {
    return novel.bannerUrl || novel.coverUrl || placeholder(novel.title);
  }

  function summary(novel) {
    return novel.shortDescription || novel.description || t("common.no_description");
  }

  function salePercent(novel) {
    if (!novel.bundleListPrice || !novel.bundleSalePrice || novel.bundleSalePrice >= novel.bundleListPrice) return 0;
    return Math.round(((novel.bundleListPrice - novel.bundleSalePrice) / novel.bundleListPrice) * 100);
  }

  function discountedEpisodePrice(novel, percentOverride) {
    const percent = Number(percentOverride || salePercent(novel) || 0);
    if (!percent) return EPISODE_PRICE;
    return Math.max(100, Math.round((EPISODE_PRICE * (100 - percent)) / 100));
  }

  function hasSale(novel, percentOverride) {
    return discountedEpisodePrice(novel, percentOverride) < EPISODE_PRICE;
  }

  function priceMarkup(novel, percentOverride) {
    const sale = discountedEpisodePrice(novel, percentOverride);
    if (sale < EPISODE_PRICE) {
      return "<span class='price-old'>편당 " + formatWon(EPISODE_PRICE) + "</span><span class='price-sale'>편당 " + formatWon(sale) + "</span>";
    }
    return "<span class='price-current'>편당 " + formatWon(EPISODE_PRICE) + "</span>";
  }

  function originLabel(code, isTranslation) {
    const map = {
      KR: t("origin.korea"),
      JP: t("origin.japan"),
      CN: t("origin.china"),
      US: t("origin.western"),
      GB: t("origin.western")
    };
    if (map[String(code || "").toUpperCase()]) return map[String(code || "").toUpperCase()];
    return isTranslation ? t("genre.translated") : t("origin.korea");
  }

  function translationDirection(novel) {
    const origin = originLabel(novel.originCountry, novel.isTranslation);
    return novel.isTranslation ? origin + " → " + t("origin.korea") : t("origin.korea") + " → 영어";
  }

  function countdownLabel(value) {
    if (!value) return t("countdown.ongoing");
    const diff = new Date(value).getTime() - Date.now();
    if (!Number.isFinite(diff) || diff <= 0) return t("countdown.urgent");
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    if (days > 0) return days + "일 " + hours + "시간 남음";
    return hours + "시간 " + mins + "분 남음";
  }

  function detailHref(slug) {
    var isMobile = document.body.classList.contains("mobile-app");
    return (isMobile ? "novel_detail.html" : "novel_detail_pc.html") + "?slug=" + encodeURIComponent(slug);
  }

  function viewerHref(slug, episodeNumber) {
    var isMobile = document.body.classList.contains("mobile-app");
    return (isMobile ? "novel_viewer.html" : "novel_viewer_pc.html") + "?slug=" + encodeURIComponent(slug) + "&episode=" + encodeURIComponent(episodeNumber || 1);
  }

  function safeInternalPath(value, fallback) {
    var next = String(value || "").trim();
    if (!next) return fallback || "homepage_pc.html";
    if (/^(?:[a-z]+:)?\/\//i.test(next) || next.toLowerCase().indexOf("javascript:") === 0) {
      return fallback || "homepage_pc.html";
    }
    return next.replace(/^\/+/ , "");
  }

  function authHref(nextPath) {
    var next = safeInternalPath(nextPath, "homepage_pc.html");
    return "auth_pc.html?next=" + encodeURIComponent(next);
  }

  function purchaseButtonAttrs(episodeId, redirectHref) {
    if (!episodeId) return "";
    return " data-purchase-button='true' data-purchase-episode-id='" + esc(episodeId) + "' data-purchase-redirect='" + esc(safeInternalPath(redirectHref, "homepage_pc.html")) + "'";
  }

  function accessToken() {
    return cfg.accessToken || localStorage.getItem(store.accessToken) || "";
  }

  async function rest(resource, params) {
    const url = new URL(base + "/rest/v1/" + resource);
    Object.keys(params || {}).forEach(function (keyName) {
      const value = params[keyName];
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(keyName, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        apikey: key,
        Authorization: "Bearer " + (accessToken() || key),
        Accept: "application/json"
      }
    });

    if (!response.ok) throw new Error("Supabase request failed: " + response.status);
    return response.json();
  }

  function inFilter(values) {
    return "in.(" + values.map(function (value) { return '\"' + String(value) + '\"'; }).join(",") + ")";
  }

  async function catalog() {
    if (cachedCatalog) return cachedCatalog;

    const novels = await rest("novels", {
      select: "id,slug,title,subtitle,short_description,description,cover_url,banner_url,status,is_translation,origin_country,free_episode_count,total_episode_count,reaction_score,view_count,comment_count,bundle_list_price,bundle_sale_price,updated_at,authors(pen_name)",
      status: "not.in.(draft,archived)",
      order: "reaction_score.desc,view_count.desc"
    });

    const novelIds = novels.map(function (novel) { return novel.id; });
    const tags = novelIds.length ? await rest("novel_tags", {
      select: "novel_id,tags(name)",
      novel_id: inFilter(novelIds)
    }) : [];

    const events = await rest("events", {
      select: "id,slug,title,subtitle,description,hero_image_url,event_type,status,starts_at,ends_at",
      status: "eq.active",
      order: "starts_at.desc"
    });

    const eventItems = events.length ? await rest("event_items", {
      select: "event_id,novel_id,discount_percent,sale_price,sort_order",
      event_id: inFilter(events.map(function (event) { return event.id; })),
      order: "sort_order.asc"
    }) : [];

    const tagMap = new Map();
    tags.forEach(function (row) {
      const current = tagMap.get(row.novel_id) || [];
      const tag = unwrapRelation(row.tags);
      if (tag && tag.name) current.push(tag.name);
      tagMap.set(row.novel_id, current);
    });

    const novelsBySlug = new Map();
    const novelMap = new Map();
    const mappedNovels = novels.map(function (novel) {
      const author = unwrapRelation(novel.authors);
      const mapped = {
        id: novel.id,
        slug: novel.slug,
        title: novel.title,
        subtitle: novel.subtitle || "",
        shortDescription: novel.short_description || "",
        description: novel.description || "",
        coverUrl: novel.cover_url || "",
        bannerUrl: novel.banner_url || "",
        status: novel.status,
        isTranslation: Boolean(novel.is_translation),
        originCountry: novel.origin_country || "KR",
        freeEpisodeCount: Number(novel.free_episode_count || 0),
        totalEpisodeCount: Number(novel.total_episode_count || 0),
        reactionScore: Number(novel.reaction_score || 0),
        viewCount: Number(novel.view_count || 0),
        commentCount: Number(novel.comment_count || 0),
        bundleListPrice: novel.bundle_list_price !== null ? Number(novel.bundle_list_price) : null,
        bundleSalePrice: novel.bundle_sale_price !== null ? Number(novel.bundle_sale_price) : null,
        updatedAt: novel.updated_at || "",
        authorName: author && author.pen_name ? author.pen_name : t("common.unknown_author"),
        tags: tagMap.get(novel.id) || []
      };
      novelMap.set(mapped.id, mapped);
      novelsBySlug.set(mapped.slug, mapped);
      return mapped;
    });

    const combinedNovels = mergeSupplementalNovels(mappedNovels);
    combinedNovels.forEach(function (novel) {
      novelMap.set(novel.id, novel);
      novelsBySlug.set(novel.slug, novel);
    });

    const eventMap = new Map(events.map(function (event) {
      return [event.id, {
        id: event.id,
        slug: event.slug,
        title: event.title,
        subtitle: event.subtitle || "",
        description: event.description || "",
        heroImageUrl: event.hero_image_url || "",
        type: event.event_type || "bundle_sale",
        endsAt: event.ends_at || null
      }];
    }));

    const mappedItems = eventItems.map(function (item) {
      return {
        event: eventMap.get(item.event_id),
        novel: novelMap.get(item.novel_id),
        discountPercent: Number(item.discount_percent || 0),
        salePrice: item.sale_price !== null ? Number(item.sale_price) : null,
        sortOrder: Number(item.sort_order || 0)
      };
    }).filter(function (item) {
      return item.event && item.novel;
    }).concat(buildSupplementalEventItems(novelsBySlug));

    cachedCatalog = {
      novels: combinedNovels,
      novelsBySlug: novelsBySlug,
      eventItems: mappedItems
    };
    return cachedCatalog;
  }

  async function episodes(novelId) {
    const rows = await rest("episodes", {
      select: "id,episode_number,title,teaser,access_type,price,published_at,status",
      novel_id: "eq." + novelId,
      status: "eq.published",
      order: "episode_number.asc"
    });
    const mapped = rows.map(function (row) {
      return {
        id: row.id,
        episodeNumber: Number(row.episode_number || 0),
        title: row.title,
        teaser: row.teaser || "",
        accessType: row.access_type || "free",
        price: row.price !== null ? Number(row.price) : EPISODE_PRICE,
        publishedAt: row.published_at || null
      };
    });
    if (mapped.length) return mapped;

    const data = await catalog();
    const novel = data.novels.find(function (entry) { return entry.id === novelId; });
    if (!novel) return [];
    return (supplementalEpisodes[novel.slug] || []).map(function (episode) {
      return {
        id: episode.id,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        teaser: episode.teaser || "",
        accessType: episode.accessType || "free",
        price: episode.price !== null ? Number(episode.price || 0) : EPISODE_PRICE,
        publishedAt: episode.publishedAt || null
      };
    });
  }

  function quotedList(values) {
    return "(" + (values || []).map(function (value) { return '"' + String(value) + '"'; }).join(",") + ")";
  }

  async function ownershipForNovel(novelId, list) {
    var token = accessToken();
    var isLoggedIn = Boolean(token && token !== key);
    var ownedEpisodeIds = new Set();
    if (!isLoggedIn || !novelId) {
      return { ownsBundle: false, ownedEpisodeIds: ownedEpisodeIds };
    }

    var episodeIds = (list || []).map(function (episode) { return episode.id; }).filter(Boolean);
    var filters = ["novel_id.eq." + novelId];
    if (episodeIds.length) {
      filters.push("episode_id.in." + quotedList(episodeIds));
    }

    var rows = await rest("purchases", {
      select: "purchase_type,novel_id,episode_id",
      or: "(" + filters.join(",") + ")"
    }).catch(function () {
      return [];
    });

    var ownsBundle = rows.some(function (row) {
      return row.purchase_type === "bundle" && row.novel_id === novelId;
    });

    rows.forEach(function (row) {
      if (row.purchase_type === "episode" && row.episode_id) {
        ownedEpisodeIds.add(row.episode_id);
      }
    });

    return {
      ownsBundle: ownsBundle,
      ownedEpisodeIds: ownedEpisodeIds
    };
  }

  function isOwnedEpisode(ownership, episodeId) {
    return Boolean(ownership && (ownership.ownsBundle || (ownership.ownedEpisodeIds && ownership.ownedEpisodeIds.has(episodeId))));
  }

  async function episodeBody(episodeId) {
    const rows = await rest("episode_contents", {
      select: "body",
      episode_id: "eq." + episodeId
    });
    if (rows[0] && rows[0].body) return rows[0].body;
    for (var slug in supplementalEpisodes) {
      if (!Object.prototype.hasOwnProperty.call(supplementalEpisodes, slug)) continue;
      var match = supplementalEpisodes[slug].find(function (episode) { return episode.id === episodeId; });
      if (match) return match.body || "";
    }
    return "";
  }

  function refreshBookmarkButtons() {
    let bookmarks = [];
    try {
      bookmarks = JSON.parse(localStorage.getItem(store.bookmarks) || "[]");
    } catch (_error) {
      bookmarks = [];
    }
    const saved = new Set(bookmarks);
    qa("[data-bookmark-id]").forEach(function (button) {
      const active = saved.has(button.dataset.bookmarkId);
      button.setAttribute("aria-pressed", String(active));
      const label = q("[data-bookmark-label]", button);
      if (label) label.textContent = active ? t("viewer.bookmark_done") : (label.dataset.defaultLabel || label.textContent || t("viewer.bookmark_add"));
    });
  }

  function buildNovelCard(novel, mode, percentOverride) {
    const sale = Number(percentOverride || salePercent(novel) || 0);
    const freeCount = novel.freeEpisodeCount || 0;
    const epCount = novel.totalEpisodeCount || 0;
    const statusLabel = novel.status === "completed" ? t("status.completed") : t("status.serializing");
    const genre = esc(novel.tags[0] || originLabel(novel.originCountry, novel.isTranslation));

    const epLabel = freeCount > 0
      ? formatCount(freeCount) + "화 무료"
      : epCount > 0 ? "총 " + formatCount(epCount) + "화" : "";
    const epBadge = epLabel ? "<span class='novel-ep-badge'>" + epLabel + "</span>" : "";
    const saleMark = sale ? "<span class='novel-sale-mark'>-" + sale + "%</span>" : "";

    const rating = novel.reactionScore ? "<span class='novel-rating'>★ " + novel.reactionScore.toFixed(1) + "</span>" : "";
    let priceText = "";
    if (mode !== "free") {
      priceText = sale
        ? "<span class='novel-price-sale'>편당 " + formatWon(discountedEpisodePrice(novel)) + "</span>"
        : "<span class='novel-price'>편당 " + formatWon(EPISODE_PRICE) + "</span>";
    }

    return "<article class='novel-card'>" +
      "<a class='novel-card-media' href='" + detailHref(novel.slug) + "'>" +
      "<img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + " 표지'>" +
      "<div class='novel-card-overlay'>" +
        "<span class='novel-card-overlay-left'>" + epBadge + "</span>" +
        "<span class='novel-card-overlay-right'>" + saleMark + "</span>" +
      "</div>" +
      "</a>" +
      "<div class='novel-card-copy'>" +
      "<h3 class='novel-card-title'>" + esc(novel.title) + "</h3>" +
      "<p class='novel-card-author'>" + esc(novel.authorName) + "</p>" +
      "<p class='novel-card-meta'>" + genre + " · " + statusLabel + "</p>" +
      "<div class='novel-card-bottom'>" + rating + priceText + "</div>" +
      "</div>" +
      "</article>";
  }

  function renderHome(data) {
    const heroEventLead = data.eventItems.find(function (item) {
      return item.event && item.event.type === "featured_drop";
    }) || null;
    const featured = heroEventLead ? heroEventLead.novel : (data.novelsBySlug.get(query.get("slug") || "black-mage-oath") || data.novels[0]);
    if (!featured) return;

    const heroBand = q(".hero-band");
    if (heroBand) {
      const heroImage = (heroEventLead && heroEventLead.event.heroImageUrl ? heroEventLead.event.heroImageUrl : banner(featured)).replace(/'/g, "%27");
      heroBand.style.backgroundImage = "linear-gradient(90deg, rgba(26, 26, 26, 0.96) 0%, rgba(26, 26, 26, 0.82) 52%, rgba(26, 26, 26, 0.96) 100%), url('" + heroImage + "')";
    }

    const saleEventItems = data.eventItems.filter(function (item) {
      return item.event && item.event.type !== "featured_drop";
    });
    const eventLead = saleEventItems[0] || null;
    const saleItems = saleEventItems
      .filter(function (item, index, list) {
        return item.novel && list.findIndex(function (entry) { return entry.novel.id === item.novel.id; }) === index;
      })
      .slice(0, 4);
    const freeNovels = data.novels.filter(function (novel) { return novel.freeEpisodeCount > 0; }).slice(0, 4);
    const genreDefs = [
      { label: t("genre.fantasy"), icon: "bolt", match: function (novel) { return novel.tags.join(" ").indexOf("판타지") !== -1 || novel.tags.join(" ").indexOf("아카데미") !== -1; } },
      { label: t("genre.romance"), icon: "favorite", match: function (novel) { return novel.tags.join(" ").indexOf("로맨스") !== -1; } },
      { label: t("genre.regression"), icon: "history", match: function (novel) { return novel.tags.join(" ").indexOf("회귀") !== -1; } },
      { label: t("genre.academy"), icon: "school", match: function (novel) { return novel.tags.join(" ").indexOf("아카데미") !== -1; } },
      { label: t("genre.translated"), icon: "translate", match: function (novel) { return novel.isTranslation; } },
      { label: t("genre.dark"), icon: "skull", match: function (novel) { return novel.tags.join(" ").indexOf("피폐") !== -1; } },
      { label: t("genre.family"), icon: "castle", match: function (novel) { return novel.tags.join(" ").indexOf("가문") !== -1; } },
      { label: t("genre.dark_fantasy"), icon: "nights_stay", match: function (novel) { return novel.tags.join(" ").indexOf("다크") !== -1 || novel.tags.join(" ").indexOf("피폐") !== -1; } }
    ];

    const heroSale = salePercent(featured);
    const heroBadges = {
      sale: q(".hero-sale-badge"),
      direction: q(".hero-direction-badge"),
      genre: q(".hero-genre-badge")
    };
    if (heroBadges.sale) heroBadges.sale.textContent = heroSale ? "-" + heroSale + "% 세일" : t("common.new_recommend");
    if (heroBadges.direction) heroBadges.direction.textContent = translationDirection(featured);
    if (heroBadges.genre) heroBadges.genre.textContent = featured.tags[0] || (featured.isTranslation ? t("store.translated_work") : t("store.korean_work"));
    if (q(".hero-title-main")) q(".hero-title-main").textContent = heroEventLead ? (heroEventLead.event.title || featured.title) : featured.title;
    if (q(".hero-title-sub")) q(".hero-title-sub").textContent = heroEventLead ? (heroEventLead.event.subtitle || featured.subtitle || t("store.hero_subtitle")) : (featured.subtitle || t("store.hero_subtitle"));
    if (q(".hero-description")) q(".hero-description").textContent = heroEventLead ? (heroEventLead.event.description || summary(featured)) : summary(featured);
    if (q(".hero-cover")) {
      q(".hero-cover").src = cover(featured);
      q(".hero-cover").alt = featured.title + " 표지";
    }
    if (q(".hero-meta")) {
      q(".hero-meta").innerHTML =
        "<span><span class='material-symbols-outlined' style='font-size:14px;vertical-align:-2px;margin-right:2px;'>menu_book</span>총 " + formatCount(featured.totalEpisodeCount) + "화</span>" +
        "<span><span class='material-symbols-outlined' style='font-size:14px;vertical-align:-2px;margin-right:2px;'>star</span>평점 " + featured.reactionScore.toFixed(1) + "</span>" +
        "<span><span class='material-symbols-outlined' style='font-size:14px;vertical-align:-2px;margin-right:2px;'>lock_open</span>" + (featured.freeEpisodeCount ? formatCount(featured.freeEpisodeCount) + "화 무료" : "무료 구간 없음") + "</span>" +
        "<span><span class='material-symbols-outlined' style='font-size:14px;vertical-align:-2px;margin-right:2px;'>payments</span>편당 " + formatWon(heroSale ? discountedEpisodePrice(featured) : EPISODE_PRICE) + "</span>";
    }
    const heroRead = q("[data-hero-read]");
    if (heroRead) heroRead.href = viewerHref(featured.slug, 1);
    const heroWish = q("[data-hero-bookmark]");
    if (heroWish) heroWish.dataset.bookmarkId = featured.slug;

    const bannerNode = q("[data-home-sale-banner]");
    if (bannerNode) {
      if (eventLead) {
        bannerNode.innerHTML = "<div class='sale-banner-copy'><span class='sale-badge'>진행 중인 세일</span><h2 class='sale-banner-title'>" + esc(eventLead.event.title) + "</h2><div class='sale-banner-meta'><span>참여 작품 " + formatCount(saleItems.length) + "개</span><span>최대 " + formatCount(eventLead.discountPercent || salePercent(eventLead.novel)) + "% 할인</span><span>" + esc(countdownLabel(eventLead.event.endsAt)) + "</span></div></div><a class='button secondary' href='search_pc.html'>전체 보기</a>";
      } else {
        bannerNode.innerHTML = "<div class='sale-banner-copy'><span class='muted-badge'>" + t("store.sale_banner_title") + "</span><h2 class='sale-banner-title'>" + t("store.sale_banner_subtitle") + "</h2><div class='sale-banner-meta'><span>" + t("store.sale_banner_price") + "</span><span>" + t("store.sale_banner_free") + "</span></div></div><a class='button secondary' href='search_pc.html'>스토어 보기</a>";
      }
    }

    const saleGrid = q(".sale-grid");
    if (saleGrid) {
      saleGrid.innerHTML = saleItems.length
        ? saleItems.map(function (item) { return buildNovelCard(item.novel, "sale", item.discountPercent); }).join("")
        : data.novels.slice(0, 4).map(function (novel) { return buildNovelCard(novel, "sale"); }).join("");
    }

    const freeGrid = q(".free-grid");
    if (freeGrid) {
      freeGrid.innerHTML = freeNovels.map(function (novel) { return buildNovelCard(novel, "free"); }).join("");
    }

    const genreGrid = q(".genre-grid");
    if (genreGrid) {
      genreGrid.innerHTML = genreDefs.slice(0, 8).map(function (genre) {
        return "<a class='genre-pill' href='search_pc.html?tag=" + encodeURIComponent(genre.label) + "'>" +
          "<span class='material-symbols-outlined' style='font-size:16px;'>" + (genre.icon || "tag") + "</span>" +
          esc(genre.label) + "</a>";
      }).join("");
    }

    refreshBookmarkButtons();
  }

  function renderFilterSummary() {
    const box = q("[data-active-filters]");
    if (!box) return;
    const active = qa("[data-filter-chip]").filter(function (chip) {
      return chip.dataset.state && chip.dataset.state !== "off";
    });
    if (!active.length) {
      box.innerHTML = "<span class='muted-badge'>" + t("store.filter_empty") + "</span>";
      return;
    }
    box.innerHTML = active.map(function (chip) {
      const state = chip.dataset.state === "exclude" ? t("store.filter_exclude") : "포함";
      const tone = chip.dataset.state === "exclude" ? "muted-badge" : "chip active";
      const label = (chip.dataset.label || chip.textContent || "").replace(/\s*·\s*(포함|제외)\s*$/, "").trim();
      return "<span class='" + tone + "'>" + state + ": " + esc(label) + "</span>";
    }).join("");
  }

  function renderSearch(data) {
    const results = q("[data-browse-results]");
    if (!results) return;

    const summaryNode = q("[data-browse-count]");
    const input = q("[data-search-input]");
    const sortButtons = qa("[data-sort]");
    const chips = qa("[data-filter-chip]");

    if (input && query.get("q")) input.value = query.get("q");
    if (query.get("tag")) {
      chips.forEach(function (chip) {
        if ((chip.dataset.label || "").toLowerCase() === query.get("tag").toLowerCase()) {
          chip.dataset.state = "include";
          chip.classList.add("is-active");
          chip.classList.remove("is-excluded");
          chip.textContent = chip.dataset.label + t("store.filter_chip_include");
        }
      });
    }

    function searchableText(novel) {
      return [
        novel.title,
        novel.subtitle,
        novel.authorName,
        summary(novel),
        novel.tags.join(" "),
        originLabel(novel.originCountry, novel.isTranslation),
        translationDirection(novel),
        novel.status === "completed" ? t("status.completed") : t("status.serializing"),
        novel.freeEpisodeCount > 0 ? "무료" : "유료",
        salePercent(novel) ? "세일 할인" : "정가"
      ].join(" ").toLowerCase();
    }

    function sortNovels(novels) {
      var activeBtn = sortButtons.find(function (b) { return b.classList.contains("active"); });
      var mode = activeBtn ? activeBtn.dataset.sort : "popular";
      return novels.slice().sort(function (left, right) {
        if (mode === "recent") {
          return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime() || right.viewCount - left.viewCount;
        }
        if (mode === "rating") {
          return right.reactionScore - left.reactionScore || right.commentCount - left.commentCount;
        }
        if (mode === "discount") {
          return salePercent(right) - salePercent(left) || right.reactionScore - left.reactionScore;
        }
        return right.viewCount - left.viewCount || right.reactionScore - left.reactionScore;
      });
    }

    function cardMarkup(novel) {
      return buildNovelCard(novel, salePercent(novel) ? "sale" : "free");
    }

    function applySearch() {
      const keyword = input ? input.value.trim().toLowerCase() : "";
      const include = chips.filter(function (chip) { return chip.dataset.state === "include"; }).map(function (chip) { return (chip.dataset.label || "").toLowerCase(); });
      const exclude = chips.filter(function (chip) { return chip.dataset.state === "exclude"; }).map(function (chip) { return (chip.dataset.label || "").toLowerCase(); });
      const visible = sortNovels(data.novels.filter(function (novel) {
        const text = searchableText(novel);
        return (!keyword || text.indexOf(keyword) !== -1) && include.every(function (label) { return text.indexOf(label) !== -1; }) && exclude.every(function (label) { return text.indexOf(label) === -1; });
      }));

      if (summaryNode) summaryNode.textContent = formatCount(visible.length) + "개 작품";
      results.innerHTML = visible.length
        ? visible.map(cardMarkup).join("")
        : "<div class='browse-empty'><strong>" + t("store.no_results") + "</strong><p>" + t("store.no_results_hint") + "</p></div>";
      renderFilterSummary();
    }

    if (input) input.addEventListener("input", applySearch);
    sortButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        sortButtons.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        applySearch();
      });
    });
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        window.setTimeout(applySearch, 0);
      });
    });

    applySearch();
  }

  function similarNovels(data, novel) {
    return data.novels
      .filter(function (item) { return item.slug !== novel.slug; })
      .map(function (item) {
        const overlap = item.tags.filter(function (tag) { return novel.tags.indexOf(tag) !== -1; }).length;
        return { novel: item, score: overlap + (item.isTranslation === novel.isTranslation ? 1 : 0) + (salePercent(item) ? 1 : 0) };
      })
      .sort(function (a, b) { return b.score - a.score || b.novel.reactionScore - a.novel.reactionScore; })
      .slice(0, 4)
      .map(function (entry) { return entry.novel; });
  }

  function renderDetail(data, novel, list, ownership) {
    var free = list.filter(function (episode) { return episode.accessType === "free"; });
    var paid = list.filter(function (episode) { return episode.accessType === "paid"; });
    var readButton = q("[data-detail-read]");
    var bookmarkButtons = qa("[data-bookmark-id]");
    var similar = similarNovels(data, novel);
    var sale = salePercent(novel);
    var saleEvent = data.eventItems.find(function (item) { return item.novel.id === novel.id; });

    document.title = "INKROAD | " + novel.title;

    var coverImg = q(".detail-cover img");
    if (coverImg) {
      coverImg.src = cover(novel);
      coverImg.alt = novel.title + " 표지";
    }

    var badgesNode = q("[data-detail-badges]");
    if (badgesNode) {
      var badges = [];
      if (sale) badges.push("<span class='sale-badge'>-" + sale + "% 세일</span>");
      if (novel.isTranslation) badges.push("<span class='muted-badge'>" + esc(translationDirection(novel)) + "</span>");
      if (novel.freeEpisodeCount > 0) badges.push("<span class='free-badge'>" + formatCount(novel.freeEpisodeCount) + "화 무료</span>");
      if (!sale && !novel.freeEpisodeCount) badges.push("<span class='new-badge'>NEW</span>");
      badgesNode.innerHTML = badges.join("");
    }

    if (q("[data-detail-title]")) q("[data-detail-title]").textContent = novel.title;
    if (q("[data-detail-subtitle]")) q("[data-detail-subtitle]").textContent = (novel.subtitle ? novel.subtitle + " · " : "") + translationDirection(novel);

    var metaNode = q("[data-detail-meta]");
    if (metaNode) {
      metaNode.innerHTML = "<div class='detail-meta-item'><span class='detail-meta-label'>작가</span><span class='detail-meta-value'>" + esc(novel.authorName) + "</span></div><div class='detail-meta-item'><span class='detail-meta-label'>상태</span><span class='detail-meta-value'>" + (novel.status === "completed" ? t("status.completed") : t("status.serializing")) + " · " + formatCount(novel.totalEpisodeCount) + "화</span></div><div class='detail-meta-item'><span class='detail-meta-label'>평점</span><span class='detail-meta-value'>★ " + novel.reactionScore.toFixed(1) + "</span></div><div class='detail-meta-item'><span class='detail-meta-label'>출처</span><span class='detail-meta-value'>" + esc(translationDirection(novel)) + "</span></div>";
    }

    var tagsNode = q("[data-detail-tags]");
    if (tagsNode) {
      tagsNode.innerHTML = novel.tags.slice(0, 6).map(function (tag) {
        return "<span class='muted-badge'>" + esc(tag) + "</span>";
      }).join("");
    }

    if (q("[data-detail-synopsis]")) q("[data-detail-synopsis]").textContent = summary(novel);
    if (readButton) readButton.href = viewerHref(novel.slug, 1);
    bookmarkButtons.forEach(function (button) { button.dataset.bookmarkId = novel.slug; });

    var priceBox = q("[data-price-box]");
    if (priceBox) {
      var firstOwnedPaidEpisode = paid.find(function (episode) { return isOwnedEpisode(ownership, episode.id); }) || null;
      var firstLockedPaidEpisode = paid.find(function (episode) { return !isOwnedEpisode(ownership, episode.id); }) || null;
      var ctaEpisode = firstLockedPaidEpisode || firstOwnedPaidEpisode || null;
      var ctaHref = ctaEpisode ? viewerHref(novel.slug, ctaEpisode.episodeNumber) : viewerHref(novel.slug, 1);
      var ctaMarkup = firstLockedPaidEpisode
        ? "<a class='button sale' href='" + ctaHref + "'" + purchaseButtonAttrs(firstLockedPaidEpisode.id, ctaHref) + ">구매하기</a>"
        : firstOwnedPaidEpisode
          ? "<a class='button sale' href='" + ctaHref + "'>보유한 회차 열기</a>"
          : "<a class='button sale' href='" + ctaHref + "'>무료로 읽기</a>";
      priceBox.innerHTML = "<div><p class='price-box-label'>" + t("viewer.per_price") + "</p><div class='price-box-values'>" + priceMarkup(novel) + "</div><p class='price-box-note'>유료 " + formatCount(paid.length) + "화 · " + esc(sale ? countdownLabel(saleEvent && saleEvent.event ? saleEvent.event.endsAt : null) : t("viewer.regular_sale")) + "</p></div>" + ctaMarkup;
    }

    var episodeListNode = q("[data-episode-list]");
    function renderEpisodeList(filter) {
      if (!episodeListNode) return;
      var saleEpisodePrice = discountedEpisodePrice(novel);
      var rows = [];
      if (filter !== "paid" && free.length) {
        rows.push("<div class='episode-row episode-collapsed'><div class='episode-row-left'><span class='episode-num'>무료</span><a class='episode-title' href='" + viewerHref(novel.slug, free[0].episodeNumber) + "'>" + free[0].episodeNumber + "화 ~ " + free[free.length - 1].episodeNumber + "화</a></div><span class='free-badge'>무료</span></div>");
      }
      if (filter !== "free" && paid.length) {
        paid.forEach(function (episode) {
          var owned = isOwnedEpisode(ownership, episode.id);
          var sideMarkup = owned
            ? "<span class='muted-badge'>보유함</span>"
            : (saleEpisodePrice < EPISODE_PRICE ? "<span class='price-old'>" + formatWon(EPISODE_PRICE) + "</span><span class='price-sale'>" + formatWon(saleEpisodePrice) + "</span>" : "<span class='price-current'>" + formatWon(EPISODE_PRICE) + "</span>");
          rows.push("<div class='episode-row" + (owned ? " is-owned" : "") + "'><div class='episode-row-left'><span class='episode-num'>" + String(episode.episodeNumber).padStart(2, "0") + "</span><a class='episode-title' href='" + viewerHref(novel.slug, episode.episodeNumber) + "'>" + esc(episode.title) + "</a></div>" + sideMarkup + "</div>");
        });
      }
      episodeListNode.innerHTML = rows.join("") || "<div class='episode-row'><span class='episode-num'>-</span><span class='episode-title'>" + t("viewer.no_episodes") + "</span></div>";
    }

    qa("[data-tab-target]").forEach(function (button) {
      button.addEventListener("click", function () {
        qa("[data-tab-target]").forEach(function (node) { node.dataset.state = ""; });
        button.dataset.state = "include";
        renderEpisodeList(button.dataset.tabTarget || "all");
      });
    });
    renderEpisodeList("all");

    var similarGrid = q("[data-similar-grid]");
    if (similarGrid) {
      similarGrid.innerHTML = similar.map(function (item) { return buildNovelCard(item, salePercent(item) ? "sale" : "free"); }).join("");
    }

    refreshBookmarkButtons();
  }

  function renderViewer(novel, list, selected, body, ownership) {
    if (!selected) return;
    var currentIndex = list.findIndex(function (episode) { return episode.id === selected.id; });
    var prev = currentIndex > 0 ? list[currentIndex - 1] : null;
    var next = currentIndex >= 0 && currentIndex < list.length - 1 ? list[currentIndex + 1] : null;
    var sale = salePercent(novel);
    var selectedOwned = isOwnedEpisode(ownership, selected.id);
    var nextOwned = next ? isOwnedEpisode(ownership, next.id) : false;
    var currentBody = body
      ? renderMarkdownForViewer(body)
      : (selected.accessType === "paid"
        ? (selectedOwned
          ? "<p>이미 구매한 회차입니다.</p><p>본문을 다시 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.</p>"
          : "<p>이 회차는 구매 후 열람할 수 있습니다.</p><p>" + esc(selected.teaser || t("viewer.teaser_fallback")) + "</p>")
        : "<p>" + t("viewer.body_unavailable") + "</p>");

    document.title = "INKROAD | " + novel.title + " " + selected.episodeNumber + "화";
    var progress = Math.max(0, Math.min(100, Math.round((selected.episodeNumber / Math.max(novel.totalEpisodeCount || 1, 1)) * 100)));
    if (q(".reader-progress-fill")) q(".reader-progress-fill").style.width = progress + "%";
    if (q("[data-reader-back]")) q("[data-reader-back]").href = detailHref(novel.slug);
    if (q("[data-reader-nav-title]")) q("[data-reader-nav-title]").textContent = novel.title;
    if (q("[data-reader-nav-episode]")) q("[data-reader-nav-episode]").textContent = selected.episodeNumber + "화";
    if (q("[data-chapter-volume]")) q("[data-chapter-volume]").textContent = translationDirection(novel);
    if (q("[data-chapter-title]")) q("[data-chapter-title]").textContent = selected.title;
    if (q("[data-chapter-access]")) q("[data-chapter-access]").textContent = selected.accessType === "free" ? t("viewer.free_episode") : (selectedOwned ? "보유한 유료 회차" : t("viewer.paid_episode"));
    if (q("[data-reader-content]")) {
      q("[data-reader-content]").innerHTML = currentBody;
      attachReaderProtection(q("[data-reader-content]"));
    }

    var bookmark = q("[data-bookmark-id='reader-bookmark']");
    if (bookmark) bookmark.dataset.bookmarkId = novel.slug;

    var paywall = q("[data-paywall]");
    var paywallTitle = q("[data-paywall-title]");
    var paywallPrices = q("[data-paywall-prices]");
    var paywallBuy = q("[data-paywall-buy]");
    var paywallDetail = q("[data-paywall-detail]");
    var paywallNote = q("[data-paywall-note]");
    if (paywall) {
      var purchaseTarget = null;
      if (selected.accessType === "paid" && !body && !selectedOwned) {
        paywall.style.display = "";
        purchaseTarget = selected;
        if (paywallTitle) paywallTitle.textContent = selected.title;
        if (paywallPrices) paywallPrices.innerHTML = priceMarkup(novel);
        if (paywallDetail) paywallDetail.href = detailHref(novel.slug);
        if (paywallNote) paywallNote.textContent = sale ? countdownLabel(null) + " 할인 중" : "상시 판매 가격";
      } else if (next && next.accessType === "paid" && !nextOwned) {
        paywall.style.display = "";
        purchaseTarget = next;
        if (paywallTitle) paywallTitle.textContent = next.title;
        if (paywallPrices) paywallPrices.innerHTML = priceMarkup(novel);
        if (paywallDetail) paywallDetail.href = detailHref(novel.slug);
        if (paywallNote) paywallNote.textContent = t("viewer.paywall_note");
      } else {
        paywall.style.display = "none";
      }

      if (paywallBuy) {
        if (purchaseTarget) {
          var paywallHref = viewerHref(novel.slug, purchaseTarget.episodeNumber);
          paywallBuy.href = paywallHref;
          paywallBuy.setAttribute("data-purchase-button", "true");
          paywallBuy.dataset.purchaseEpisodeId = purchaseTarget.id;
          paywallBuy.dataset.purchaseRedirect = safeInternalPath(paywallHref, paywallHref);
          paywallBuy.textContent = purchaseTarget.id === selected.id ? "이 화 구매하기" : "다음 화 구매하기";
        } else {
          paywallBuy.removeAttribute("data-purchase-button");
          delete paywallBuy.dataset.purchaseEpisodeId;
          delete paywallBuy.dataset.purchaseRedirect;
          paywallBuy.href = detailHref(novel.slug);
          paywallBuy.textContent = "작품 상세";
        }
      }
    }

    var prevNav = q("[data-chapter-prev]");
    var nextNav = q("[data-chapter-next]");
    var positionNode = q("[data-chapter-position]");
    var tocBtn = q("[data-chapter-toc]");

    if (prevNav) {
      prevNav.innerHTML = prev
        ? "<a href='" + viewerHref(novel.slug, prev.episodeNumber) + "'>" + t("viewer.prev") + "</a>"
        : "<span style='color:var(--text-muted);'>" + t("viewer.first_episode") + "</span>";
    }
    if (nextNav) {
      nextNav.innerHTML = next
        ? "<a href='" + viewerHref(novel.slug, next.episodeNumber) + "'>" + ((next.accessType === "free" || nextOwned) ? t("viewer.next") : t("viewer.next_paid")) + "</a>"
        : "<span style='color:var(--text-muted);'>" + t("viewer.last_episode") + "</span>";
    }
    if (positionNode) positionNode.textContent = selected.episodeNumber + " / " + formatCount(novel.totalEpisodeCount);
    if (tocBtn) {
      tocBtn.addEventListener("click", function () { window.location.href = detailHref(novel.slug); });
    }

    window.addEventListener("scroll", function () {
      var fill = q(".reader-progress-fill");
      if (!fill) return;
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      fill.style.width = pct + "%";
    });

    refreshBookmarkButtons();
  }

  function renderLibrary(data) {
    var statsNode = q("[data-library-stats]");
    var readingList = q("[data-library-reading]");
    var wishlistList = q("[data-library-wishlist]");
    var purchasedList = q("[data-library-purchased]");

    var bookmarks = [];
    try { bookmarks = JSON.parse(localStorage.getItem(store.bookmarks) || "[]"); } catch (_e) { bookmarks = []; }
    var bookmarkedNovels = data.novels.filter(function (n) { return bookmarks.indexOf(n.slug) !== -1; });

    var token = accessToken();
    var isLoggedIn = Boolean(token && token !== cfg.anonKey && token !== (cfg.publishableKey || ""));

    if (statsNode) {
      statsNode.innerHTML =
        "<span class='muted-badge'>찜 " + formatCount(bookmarkedNovels.length) + "개</span>" +
        (isLoggedIn ? "<span class='muted-badge'>읽는 중 —</span><span class='muted-badge'>구매 —</span>" : "");
    }

    var loginPrompt = "<div class='library-empty'><h3>" + t("library.login_required") + "</h3><p>" + t("library.login_subtitle") + "</p><a class='button primary' href='auth_pc.html'>로그인</a></div>";

    if (readingList) {
      readingList.innerHTML = isLoggedIn
        ? "<div class='library-empty'><h3>" + t("library.no_reading") + "</h3><p>" + t("library.no_reading_hint") + "</p><a class='button primary' href='search_pc.html'>작품 탐색하기</a></div>"
        : loginPrompt;
    }

    if (wishlistList) {
      if (bookmarkedNovels.length) {
        wishlistList.innerHTML = bookmarkedNovels.map(function (novel) {
          var sale = salePercent(novel);
          var badge = sale ? "<span class='sale-badge'>-" + sale + "% 할인</span>" : "<span class='muted-badge'>이벤트 대기</span>";
          return "<article class='library-row'>" +
            "<a class='library-row-thumb' href='" + detailHref(novel.slug) + "'><img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'></a>" +
            "<div class='library-row-copy'>" +
            "<h3 class='library-row-title'>" + esc(novel.title) + "</h3>" +
            "<p class='library-row-meta'>" + esc(novel.authorName) + " · " + badge + "</p>" +
            "</div>" +
            "<div class='library-row-side'>" +
            "<a class='button small primary' href='" + detailHref(novel.slug) + "'>상세 보기</a>" +
            "</div>" +
            "</article>";
        }).join("");
      } else {
        wishlistList.innerHTML = "<div class='library-empty'><h3>" + t("library.no_bookmarks") + "</h3><p>" + t("library.no_bookmarks_hint") + "</p><a class='button primary' href='search_pc.html'>작품 탐색하기</a></div>";
      }
    }

    if (purchasedList) {
      purchasedList.innerHTML = isLoggedIn
        ? "<div class='library-empty'><h3>" + t("library.no_purchases") + "</h3><p>" + t("library.no_purchases_hint") + "</p><a class='button primary' href='search_pc.html'>작품 탐색하기</a></div>"
        : loginPrompt;
    }

    var tabBtns = qa("[data-tab-target]");
    var tabPanels = qa("[data-tab-panel]");
    tabBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        tabBtns.forEach(function (b) { b.dataset.state = ""; });
        btn.dataset.state = "include";
        tabPanels.forEach(function (p) { p.style.display = "none"; });
        var target = q("[data-tab-panel='" + btn.dataset.tabTarget + "']");
        if (target) target.style.display = "";
      });
    });

    refreshBookmarkButtons();
  }

  function renderAuth() {
    function postAuthDestination() {
      return safeInternalPath(query.get("next"), "homepage_pc.html");
    }

    var loginForm = q("[data-auth-login]");
    var signupForm = q("[data-auth-signup]");
    var errorLogin = q("[data-auth-error]");
    var errorSignup = q("[data-auth-error-signup]");

    function showError(node, msg) {
      if (!node) return;
      node.textContent = msg;
      node.classList.add("visible");
    }
    function hideError(node) {
      if (!node) return;
      node.classList.remove("visible");
    }

    function switchAuthMode(mode) {
      if (mode === "signup") {
        if (loginForm) loginForm.style.display = "none";
        if (signupForm) signupForm.style.display = "";
      } else {
        if (signupForm) signupForm.style.display = "none";
        if (loginForm) loginForm.style.display = "";
      }
      hideError(errorLogin);
      hideError(errorSignup);
    }

    qa("[data-auth-toggle]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        switchAuthMode(link.dataset.authToggle);
      });
    });

    var requestedMode = query.get("mode");
    if (requestedMode === "signup") {
      switchAuthMode("signup");
    } else {
      switchAuthMode("login");
    }

    var supabaseClient = null;
    if (window.supabase && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(
        (cfg.url || "").replace(/\/$/, ""),
        cfg.publishableKey || cfg.anonKey || "",
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            storageKey: "inkroad-supabase-auth"
          }
        }
      );
    }

    var submitLogin = q("[data-auth-submit]");
    if (submitLogin) {
      submitLogin.addEventListener("click", async function () {
        hideError(errorLogin);
        var email = (q("[data-auth-email]") || {}).value || "";
        var password = (q("[data-auth-password]") || {}).value || "";
        if (!email || !password) { showError(errorLogin, "이메일과 비밀번호를 입력해주세요."); return; }
        if (!supabaseClient) { showError(errorLogin, "서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요."); return; }
        try {
          var result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
          if (result.error) { showError(errorLogin, result.error.message); return; }
          if (result.data && result.data.session) {
            localStorage.setItem(store.accessToken, result.data.session.access_token);
          }
          window.location.href = postAuthDestination();
        } catch (err) {
          showError(errorLogin, "로그인 중 오류가 발생했습니다.");
        }
      });
    }

    var submitSignup = q("[data-signup-submit]");
    if (submitSignup) {
      submitSignup.addEventListener("click", async function () {
        hideError(errorSignup);
        var email = (q("[data-signup-email]") || {}).value || "";
        var password = (q("[data-signup-password]") || {}).value || "";
        var confirm = (q("[data-signup-password-confirm]") || {}).value || "";
        var penName = (q("[data-signup-pen-name]") || {}).value || "";
        if (!email || !password || !penName) { showError(errorSignup, "모든 필드를 입력해주세요."); return; }
        if (password !== confirm) { showError(errorSignup, "비밀번호가 일치하지 않습니다."); return; }
        if (password.length < 6) { showError(errorSignup, "비밀번호는 6자 이상이어야 합니다."); return; }
        if (!supabaseClient) { showError(errorSignup, "서비스 연결에 실패했습니다."); return; }
        try {
          var result = await supabaseClient.auth.signUp({ email: email, password: password, options: { data: { pen_name: penName, display_name: penName } } });
          if (result.error) { showError(errorSignup, result.error.message); return; }
          if (result.data && result.data.session) {
            localStorage.setItem(store.accessToken, result.data.session.access_token);
            window.location.href = postAuthDestination();
          } else {
            showError(errorSignup, "가입 확인 이메일을 보냈습니다. 이메일을 확인해주세요.");
            errorSignup.style.color = "var(--accent-free)";
            errorSignup.style.background = "#f0faf4";
          }
        } catch (err) {
          showError(errorSignup, "가입 중 오류가 발생했습니다.");
        }
      });
    }

    qa("[data-auth-google]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!supabaseClient) return;
        await supabaseClient.auth.signInWithOAuth({ provider: "google" });
      });
    });

    qa("[data-auth-kakao]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (!supabaseClient) return;
        await supabaseClient.auth.signInWithOAuth({ provider: "kakao" });
      });
    });
  }

  function renderCreatorDashboard(data) {
    var statsNode = q("[data-creator-stats]");
    var listNode = q("[data-creator-list]");
    var emptyNode = q("[data-creator-empty]");

    var token = accessToken();
    var isLoggedIn = Boolean(token && token !== cfg.anonKey && token !== (cfg.publishableKey || ""));

    if (!isLoggedIn) {
      if (q(".creator-main")) {
        q(".creator-main").innerHTML = "<div class='creator-empty'><h3>" + t("library.login_required") + "</h3><p>작품 관리는 로그인 후 이용할 수 있습니다.</p><a class='button primary' href='auth_pc.html'>로그인</a></div>";
      }
      return;
    }

    var novels = data.novels;
    var totalEpisodes = novels.reduce(function (sum, n) { return sum + n.totalEpisodeCount; }, 0);
    var totalViews = novels.reduce(function (sum, n) { return sum + n.viewCount; }, 0);

    if (statsNode) {
      statsNode.innerHTML =
        "<div class='summary-card'><span class='material-symbols-outlined summary-card-icon'>auto_stories</span><div class='summary-card-value'>" + formatCount(novels.length) + "</div><div class='summary-card-label'>" + t("dashboard.registered_works") + "</div></div>" +
        "<div class='summary-card'><span class='material-symbols-outlined summary-card-icon'>list</span><div class='summary-card-value'>" + formatCount(totalEpisodes) + "</div><div class='summary-card-label'>" + t("dashboard.total_episodes") + "</div></div>" +
        "<div class='summary-card'><span class='material-symbols-outlined summary-card-icon'>visibility</span><div class='summary-card-value'>" + formatCount(totalViews) + "</div><div class='summary-card-label'>" + t("dashboard.total_views") + "</div></div>";
    }

    if (!novels.length) {
      if (listNode) listNode.style.display = "none";
      if (emptyNode) emptyNode.style.display = "";
      return;
    }

    if (emptyNode) emptyNode.style.display = "none";
    if (listNode) {
      listNode.innerHTML = novels.map(function (novel) {
        var statusBadge = novel.status === "completed"
          ? "<span class='free-badge'>" + t("status.completed") + "</span>"
          : novel.status === "draft"
            ? "<span class='muted-badge' style='opacity:0.6;'>비공개</span>"
            : "<span class='muted-badge'>" + t("status.serializing") + "</span>";
        return "<article class='creator-work-row'>" +
          "<div class='creator-work-row-thumb'><img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'></div>" +
          "<div class='creator-work-row-copy'>" +
          "<h3 class='creator-work-row-title'>" + esc(novel.title) + " " + statusBadge + "</h3>" +
          "<p class='creator-work-row-meta'>" + formatCount(novel.totalEpisodeCount) + "화 · 조회 " + formatCount(novel.viewCount) + " · " + esc(novel.updatedAt ? novel.updatedAt.slice(0, 10) : "—") + "</p>" +
          "</div>" +
          "<div class='creator-work-row-actions'>" +
          "<a class='button small ghost' href='episode_upload_pc.html?novel_id=" + novel.id + "'>회차 추가</a>" +
          "<a class='button small secondary' href='novel_upload_pc.html?edit=" + novel.id + "'>수정</a>" +
          "</div>" +
          "</article>";
      }).join("");
    }
  }

  function renderAuthorDashboard(data) {
    var kpiNode = q("[data-kpi-cards]");
    var tableBody = q("[data-stats-table]");
    var activityNode = q("[data-recent-activity]");
    var topNovelsNode = q("[data-top-novels]");

    var token = accessToken();
    var isLoggedIn = Boolean(token && token !== cfg.anonKey && token !== (cfg.publishableKey || ""));

    if (!isLoggedIn) {
      if (q(".creator-main")) {
        q(".creator-main").innerHTML = "<div class='creator-empty'><h3>" + t("library.login_required") + "</h3><p>통계는 로그인 후 확인할 수 있습니다.</p><a class='button primary' href='auth_pc.html'>로그인</a></div>";
      }
      return;
    }

    var novels = data.novels;
    var totalViews = novels.reduce(function (sum, n) { return sum + n.viewCount; }, 0);
    var totalComments = novels.reduce(function (sum, n) { return sum + n.commentCount; }, 0);
    var totalBookmarks = novels.reduce(function (sum, n) { return sum + n.reactionScore; }, 0);
    var novelsWithRetention = novels.filter(function(n) { return n.retentionRate != null; });
    var avgRetention = novelsWithRetention.length > 0
      ? novelsWithRetention.reduce(function(sum, n) { return sum + n.retentionRate; }, 0) / novelsWithRetention.length
      : 0;

    // Store novel data globally for modal access
    window.__authorDashboardNovels = novels;

    // KPI Cards - New Dashboard Format
    if (kpiNode) {
      var kpiValues = q("[data-kpi-value]");
      if (kpiValues.length >= 4) {
        kpiValues[0].textContent = formatCount(totalViews);
        kpiValues[1].textContent = formatCount(totalBookmarks);
        kpiValues[2].textContent = formatCount(totalComments);
        kpiValues[3].textContent = (avgRetention > 0 ? avgRetention.toFixed(1) + "%" : "—");
      }
    }

    // Stats Table
    if (tableBody) {
      if (novels.length) {
        tableBody.innerHTML = novels.map(function (novel, idx) {
          var retention = novel.retentionRate != null ? novel.retentionRate : null;
          var firstReaders = novel.firstChapterReaders || 0;
          var lastReaders = novel.lastChapterReaders || 0;
          var retentionDisplay = retention != null
            ? "<td class='num retention-clickable' data-retention-idx='" + idx + "'><span class='retention-rate" + (retention < 30 ? " low" : retention < 60 ? " medium" : "") + "'>" + retention + "%</span></td>"
            : "<td class='num'>—</td>";
          return "<tr>" +
            "<td>" + esc(novel.title) + "</td>" +
            "<td class='num'>" + formatCount(novel.viewCount) + "</td>" +
            "<td class='num'>" + formatCount(novel.reactionScore) + "</td>" +
            "<td class='num'>" + formatCount(novel.commentCount) + "</td>" +
            "<td class='num'>★ " + novel.reactionScore.toFixed(1) + "</td>" +
            retentionDisplay +
            "</tr>";
        }).join("");
      } else {
        tableBody.innerHTML = "<tr><td colspan='6' class='empty-cell'>등록된 작품이 없습니다</td></tr>";
      }
    }

    // Top Novels TOP 5
    if (topNovelsNode) {
      var sortedNovels = novels.slice().sort(function(a, b) { return b.viewCount - a.viewCount; }).slice(0, 5);
      if (sortedNovels.length) {
        topNovelsNode.innerHTML = sortedNovels.map(function(novel, idx) {
          var rankClass = idx < 3 ? " rank-" + (idx + 1) : "";
          return "<div class='top-novel-item'>" +
            "<div class='top-novel-rank" + rankClass + "'>" + (idx + 1) + "</div>" +
            "<div class='top-novel-info'>" +
            "<div class='top-novel-title'>" + esc(novel.title) + "</div>" +
            "<div class='top-novel-meta'>" + esc(novel.authorName) + "</div>" +
            "</div>" +
            "<div class='top-novel-stat'>" +
            "<div class='top-novel-views'>" + formatCount(novel.viewCount) + "</div>" +
            "</div>" +
            "</div>";
        }).join("");
      } else {
        topNovelsNode.innerHTML = "<p class='empty-state'>아직 작품이 없습니다.</p>";
      }
    }

    // Activity Feed
    if (activityNode) {
      var activities = [];
      novels.slice(0, 5).forEach(function(novel) {
        if (novel.commentCount > 0) {
          activities.push("<div class='activity-item'>" +
            "<span class='material-symbols-outlined'>chat_bubble</span>" +
            "<div>" +
            "<div class='activity-text'>" + esc(novel.title) + "에 " + formatCount(novel.commentCount) + "개의 댓글</div>" +
            "<div class='activity-time'>최근 업데이트</div>" +
            "</div>" +
            "</div>");
        }
      });
      if (activities.length) {
        activityNode.innerHTML = activities.join("");
      } else {
        activityNode.innerHTML = "<p class='empty-state'>최근 활동이 없습니다.</p>";
      }
    }

    // Period Filter Buttons
    var periodBtns = qa("[data-period]");
    periodBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        periodBtns.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
      });
    });

    // Retention Modal Handlers
    initRetentionModal(tableBody);
  }

  function initRetentionModal(tableBody) {
    if (!tableBody) return;

    var modal = q("[data-retention-modal]");
    var closeBtn = q("[data-retention-close]");
    var overlay = q("[data-retention-overlay]");

    if (!modal) {
      console.warn("[Retention] Modal element not found");
      return;
    }

    function openRetentionModal(novel) {
      if (!modal) return;
      var retention = novel.retentionRate || 0;
      var firstReaders = novel.firstChapterReaders || 0;
      var lastReaders = novel.lastChapterReaders || 0;
      var episodes = novel.totalEpisodeCount || 0;
      var churn = firstReaders - lastReaders;

      // Set title
      var titleEl = q("[data-retention-title]");
      if (titleEl) titleEl.textContent = novel.title;

      // Set values
      var rateEl = q("[data-retention-rate]");
      if (rateEl) rateEl.textContent = retention.toFixed(1) + "%";

      var firstValueEl = q("[data-funnel-first-value]");
      if (firstValueEl) firstValueEl.textContent = formatCount(firstReaders);

      var lastValueEl = q("[data-funnel-last-value]");
      if (lastValueEl) lastValueEl.textContent = formatCount(lastReaders);

      var churnEl = q("[data-retention-churn]");
      if (churnEl) churnEl.textContent = formatCount(churn);

      var episodesEl = q("[data-retention-episodes]");
      if (episodesEl) episodesEl.textContent = episodes + "화";

      // Reset funnel bars for animation
      var firstBar = q("[data-funnel-first]");
      var lastBar = q("[data-funnel-last]");
      if (firstBar) firstBar.style.width = "0%";
      if (lastBar) lastBar.style.width = "0%";

      // Animate funnel bars
      setTimeout(function() {
        if (firstBar) firstBar.style.width = "100%";
        if (lastBar) lastBar.style.width = retention + "%";
      }, 100);

      // Bar chart - reset
      var barFirst = q("[data-bar-first]");
      var barLast = q("[data-bar-last]");
      var barFirstValue = q("[data-bar-first-value]");
      var barLastValue = q("[data-bar-last-value]");

      if (barFirst) barFirst.style.width = "0%";
      if (barLast) barLast.style.width = "0%";

      setTimeout(function() {
        if (barFirst) {
          barFirst.style.width = "100%";
          barFirst.setAttribute("data-bar-fill", "first");
        }
        if (barLast) {
          barLast.style.width = retention + "%";
          barLast.setAttribute("data-bar-fill", "last");
        }
        if (barFirstValue) barFirstValue.textContent = "100%";
        if (barLastValue) barLastValue.textContent = retention.toFixed(1) + "%";
      }, 100);

      modal.hidden = false;
    }

    function openOverviewModal() {
      var novels = window.__authorDashboardNovels || [];
      var novelsWithRetention = novels.filter(function(n) { return n.retentionRate != null; });
      if (!novelsWithRetention.length) {
        alert("연독률 데이터가 있는 작품이 없습니다.");
        return;
      }
      // Show the first novel with retention data as overview
      openRetentionModal(novelsWithRetention[0]);
    }

    function closeRetentionModal() {
      if (!modal) return;
      modal.hidden = true;
    }

    // KPI Card click handler (average retention)
    var kpiRetentionCard = q("[data-kpi-clickable='retention']");
    if (kpiRetentionCard) {
      kpiRetentionCard.addEventListener("click", function() {
        openOverviewModal();
      });
    }

    // Table cell click handler (individual novel)
    document.addEventListener("click", function(e) {
      // Check if clicked on retention cell
      var cell = e.target.closest(".retention-clickable");
      if (cell) {
        var idx = parseInt(cell.getAttribute("data-retention-idx"));
        if (!isNaN(idx)) {
          var novels = window.__authorDashboardNovels || [];
          if (novels[idx] && novels[idx].retentionRate != null) {
            openRetentionModal(novels[idx]);
            return;
          }
        }
      }

      // Check if clicked on retention-rate span inside table
      var rateSpan = e.target.closest(".retention-rate");
      if (rateSpan) {
        var parentCell = rateSpan.closest(".retention-clickable");
        if (parentCell) {
          var idx = parseInt(parentCell.getAttribute("data-retention-idx"));
          if (!isNaN(idx)) {
            var novels = window.__authorDashboardNovels || [];
            if (novels[idx] && novels[idx].retentionRate != null) {
              openRetentionModal(novels[idx]);
              return;
            }
          }
        }
      }
    });

    // Close handlers
    if (closeBtn) {
      closeBtn.addEventListener("click", closeRetentionModal);
    }
    if (overlay) {
      overlay.addEventListener("click", closeRetentionModal);
    }

    // Escape key
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape" && !modal.hidden) {
        closeRetentionModal();
      }
    });
  }

  /* ==========================================
     Mobile renderers
     ========================================== */

  function mobileDetailHref(slug) { return "novel_detail.html?slug=" + encodeURIComponent(slug); }
  function mobileViewerHref(slug, ep) { return "novel_viewer.html?slug=" + encodeURIComponent(slug) + "&episode=" + ep; }

  /** 슬러그 해시 기반으로 카드마다 다른 aspect-ratio 반환 — Pinterest 스타거 효과 */
  function slugAspect(slug) {
    var hash = 0;
    var s = (slug || "") + "salt_v2";
    for (var i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    // 0.58 ~ 0.85 범위 (숫자가 작을수록 세로로 긺)
    var ratios = [0.60, 0.65, 0.68, 0.72, 0.75, 0.78, 0.82, 0.63, 0.70, 0.85];
    // Math.sin을 이용해 난수화 (동일 작품은 항상 동일 비율 유지)
    var index = Math.floor(Math.abs(Math.sin(hash) * 1000)) % ratios.length;
    return ratios[index];
  }

  function buildPinCard(novel, percentOverride) {
    var sale = Number(percentOverride || salePercent(novel) || 0);
    var freeCount = novel.freeEpisodeCount || 0;
    var genre = esc((novel.tags || [])[0] || "");

    var saleMark = sale ? "<span class='pin-card-sale'>-" + sale + "%</span>" : "";
    var freeMark = freeCount > 0 && !sale ? "<span class='pin-card-free'>" + formatCount(freeCount) + "화 무료</span>" : "";

    var ratingLine = novel.reactionScore ? "<span class='pin-card-overlay-rating'>★ " + novel.reactionScore.toFixed(1) + "</span>" : "";
    var genreLine = genre ? "<span class='pin-card-overlay-genre'>" + genre + "</span>" : "";
    var freeLine = freeCount > 0 ? "<span class='pin-card-overlay-free'>" + formatCount(freeCount) + "화 무료</span>" : "";
    var priceLine = sale
      ? "<span class='pin-card-overlay-price'><span class='old'>편당 " + formatWon(EPISODE_PRICE) + "</span>편당 " + formatWon(discountedEpisodePrice(novel)) + "</span>"
      : "<span class='pin-card-overlay-price'>편당 " + formatWon(EPISODE_PRICE) + "</span>";

    return "<article class='pin-card'>" +
      "<a class='pin-card-media' href='" + mobileDetailHref(novel.slug) + "'>" +
      "<img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "' style='aspect-ratio:" + slugAspect(novel.slug) + ";width:100%;display:block;object-fit:cover;'>" +
      saleMark + freeMark +
      "<div class='pin-card-overlay'>" +
        ratingLine + genreLine + freeLine + priceLine +
      "</div>" +
      "</a>" +
      "<div class='pin-card-copy'>" +
      "<h3 class='pin-card-title'>" + esc(novel.title) + "</h3>" +
      "<p class='pin-card-author'>" + esc(novel.authorName) + "</p>" +
      "</div>" +
      "</article>";
  }

  function renderMobileHome(data) {
    var novels = data.novels;
    var heroEventLead = data.eventItems.find(function (item) {
      return item.event && item.event.type === "featured_drop";
    }) || null;
    var featured = heroEventLead ? heroEventLead.novel : novels[0];
    if (!featured) return;

    /* ── Hero ── */
    var heroNode = q("[data-mh-hero]");
    if (heroNode) {
      var sale = salePercent(featured);
      var heroImg = (heroEventLead && heroEventLead.event.heroImageUrl) || featured.bannerUrl || cover(featured);
      var badges = [];
      if (sale) badges.push("<span class='badge badge-sale'>-" + sale + "%</span>");
      if (featured.freeEpisodeCount > 0) badges.push("<span class='badge badge-free'>" + formatCount(featured.freeEpisodeCount) + "화 무료</span>");
      if ((featured.tags || [])[0]) badges.push("<span class='badge badge-genre'>" + esc(featured.tags[0]) + "</span>");

      heroNode.innerHTML =
        "<div class='mh-hero-bg' style=\"background-image:url('" + esc(heroImg) + "')\"></div>" +
        "<div class='mh-hero-gradient'></div>" +
        "<div class='mh-hero-inner'>" +
          "<div class='mh-hero-badges'>" + badges.join("") + "</div>" +
          "<h1 class='mh-hero-title'>" + esc(heroEventLead ? (heroEventLead.event.title || featured.title) : featured.title) + "</h1>" +
          "<p class='mh-hero-subtitle'>" + esc(heroEventLead ? (heroEventLead.event.description || summary(featured)) : summary(featured)) + "</p>" +
          "<div class='mh-hero-meta'>" +
            "<span>" + esc(featured.authorName) + "</span>" +
            "<span><span class='material-symbols-outlined'>menu_book</span>" + formatCount(featured.totalEpisodeCount) + "화</span>" +
            "<span><span class='material-symbols-outlined'>star</span>" + featured.reactionScore.toFixed(1) + "</span>" +
          "</div>" +
          "<div class='mh-hero-actions'>" +
            "<a class='mh-hero-btn-primary' href='" + mobileViewerHref(featured.slug, 1) + "'>" +
              "<span class='material-symbols-outlined' style='font-size:18px'>play_arrow</span>" + t("store.read_free") +
            "</a>" +
            "<button class='mh-hero-btn-secondary' type='button' data-bookmark-id='" + esc(featured.slug) + "'>" +
              "<span class='material-symbols-outlined' style='font-size:20px'>favorite</span>" +
            "</button>" +
          "</div>" +
        "</div>";
    }

    /* ── Banner ── */
    var bannerNode = q("[data-mh-banner]");
    var saleNovels = novels.filter(function (n) { return salePercent(n) > 0; });
    if (bannerNode) {
      if (saleNovels.length) {
        var topSale = saleNovels[0];
        bannerNode.style.display = "";
        bannerNode.innerHTML =
          "<span class='mh-banner-badge sale'>-" + salePercent(topSale) + "% 할인</span>" +
          "<h3>" + formatCount(saleNovels.length) + "개 작품 할인 중</h3>" +
          "<p>편당 최저 " + formatWon(discountedEpisodePrice(topSale)) + "부터</p>";
      } else {
        bannerNode.style.display = "";
        bannerNode.innerHTML =
          "<span class='mh-banner-badge muted'>" + t("store.sale_banner_title") + "</span>" +
          "<h3>" + t("store.sale_banner_subtitle") + "</h3>" +
          "<p>" + t("store.sale_banner_price") + "</p>";
      }
    }

    /* ── Sale section (horizontal scroll) ── */
    var saleSection = q("[data-mh-section-sale]");
    var saleList = q("[data-mh-sale-list]");
    if (saleList && saleNovels.length) {
      saleSection.style.display = "";
      saleList.innerHTML = saleNovels.slice(0, 8).map(function (novel) {
        var percent = salePercent(novel);
        return "<a class='mh-scroll-card' href='" + mobileDetailHref(novel.slug) + "'>" +
          "<div class='mh-scroll-card-cover'>" +
            "<img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'>" +
            (percent ? "<span class='mh-scroll-card-badge'>-" + percent + "%</span>" : "") +
          "</div>" +
          "<p class='mh-scroll-card-title'>" + esc(novel.title) + "</p>" +
          "<p class='mh-scroll-card-meta'>" + esc(novel.authorName) + "</p>" +
          "<p class='mh-scroll-card-price'>" +
            "<span class='old'>" + formatWon(EPISODE_PRICE) + "</span>" +
            "<span class='sale'>" + formatWon(discountedEpisodePrice(novel)) + "</span>" +
          "</p>" +
        "</a>";
      }).join("");
    } else if (saleSection) {
      saleSection.style.display = "none";
    }

    /* ── Popular section (2-column grid) ── */
    var popularList = q("[data-mh-popular-list]");
    if (popularList) {
      var sorted = novels.slice().sort(function (a, b) { return b.viewCount - a.viewCount; });
      popularList.innerHTML = sorted.slice(0, 6).map(function (novel, idx) {
        var sale = salePercent(novel);
        var freeCount = novel.freeEpisodeCount || 0;
        return "<a class='mh-card' href='" + mobileDetailHref(novel.slug) + "'>" +
          "<div class='mh-card-cover'>" +
            "<img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'>" +
            "<span class='mh-card-rank'>" + (idx + 1) + "</span>" +
            (sale ? "<span class='mh-card-sale-mark'>-" + sale + "%</span>" : "") +
            (freeCount > 0 && !sale ? "<span class='mh-card-free-mark'>" + formatCount(freeCount) + "화 무료</span>" : "") +
          "</div>" +
          "<div class='mh-card-info'>" +
            "<h3 class='mh-card-title'>" + esc(novel.title) + "</h3>" +
            "<p class='mh-card-author'>" + esc(novel.authorName) + "</p>" +
            "<div class='mh-card-bottom'>" +
              (novel.reactionScore ? "<span class='mh-card-rating'>★ " + novel.reactionScore.toFixed(1) + "</span>" : "<span></span>") +
              (sale
                ? "<span class='mh-card-price'><span class='sale'>" + formatWon(discountedEpisodePrice(novel)) + "</span></span>"
                : "<span class='mh-card-price'>" + formatWon(EPISODE_PRICE) + "</span>") +
            "</div>" +
          "</div>" +
        "</a>";
      }).join("");
    }

    /* ── Recent updates (list) ── */
    var recentList = q("[data-mh-recent-list]");
    if (recentList) {
      var byDate = novels.slice().sort(function (a, b) { return (b.updatedAt || "").localeCompare(a.updatedAt || ""); });
      recentList.innerHTML = byDate.slice(0, 6).map(function (novel) {
        var sale = salePercent(novel);
        var epLabel = novel.totalEpisodeCount ? formatCount(novel.totalEpisodeCount) + "화" : "";
        var statusLabel = novel.status === "completed" ? t("status.completed") : t("status.serializing");
        var badgeClass = sale ? "sale" : "new";
        var badgeText = sale ? "-" + sale + "%" : statusLabel;
        return "<a class='mh-update-row' href='" + mobileDetailHref(novel.slug) + "'>" +
          "<div class='mh-update-cover'><img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'></div>" +
          "<div class='mh-update-copy'>" +
            "<h4 class='mh-update-title'>" + esc(novel.title) + "</h4>" +
            "<p class='mh-update-meta'>" + esc(novel.authorName) + " · " + esc((novel.tags || [])[0] || "") + "</p>" +
          "</div>" +
          "<div class='mh-update-side'>" +
            "<span class='mh-update-badge " + badgeClass + "'>" + badgeText + "</span>" +
            (epLabel ? "<span class='mh-update-ep'>" + epLabel + "</span>" : "") +
          "</div>" +
        "</a>";
      }).join("");
    }

    /* ── Topbar scroll ── */
    var mhHeader = q(".mh-header");
    if (mhHeader) {
      var ticking = false;
      window.addEventListener("scroll", function () {
        if (!ticking) {
          window.requestAnimationFrame(function () {
            mhHeader.classList.toggle("scrolled", window.scrollY > 20);
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }

    refreshBookmarkButtons();
  }

  function renderMobileSearch(data) {
    var novels = data.novels;
    var resultsNode = q("[data-mobile-search-results]");
    var countNode = q("[data-mobile-result-count]");
    var searchInput = q(".mobile-search-input input");
    var genreChips = qa("[data-genre]");
    var filterBtns = qa("[data-filter]");

    var filters = { q: query.get("q") || "", genre: "", origin: "", status: "" };

    if (searchInput && filters.q) searchInput.value = filters.q;

    function applyFilters() {
      var filtered = novels.filter(function (n) {
        if (filters.q) {
          var term = filters.q.toLowerCase();
          if (n.title.toLowerCase().indexOf(term) === -1 && n.authorName.toLowerCase().indexOf(term) === -1 && (n.tags || []).join(",").toLowerCase().indexOf(term) === -1) return false;
        }
        if (filters.genre && (n.tags || []).indexOf(filters.genre) === -1) return false;
        if (filters.origin && ((filters.origin === "한국" && n.isTranslation) || (filters.origin !== "한국" && !n.isTranslation))) return false;
        if (filters.status && n.status !== filters.status) return false;
        return true;
      });
      if (countNode) countNode.textContent = filtered.length + "개 작품";
      if (resultsNode) {
        resultsNode.classList.add("pin-masonry");
        resultsNode.innerHTML = filtered.length
          ? filtered.map(buildPinCard).join("")
          : "<div class='library-empty'><h3>검색 결과가 없습니다</h3><p>다른 검색어나 필터를 시도해보세요.</p></div>";
      }
    }

    genreChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        genreChips.forEach(function (c) { c.dataset.state = ""; });
        chip.dataset.state = "include";
        filters.genre = chip.dataset.genre;
        applyFilters();
      });
    });

    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var type = btn.dataset.filter;
        var options = type === "origin" ? ["", "한국", "영미"] : type === "status" ? ["", "ongoing", "completed"] : ["viewCount", "reactionScore", "updatedAt"];
        var labels = type === "origin" ? [t("store.origin_filter"), t("store.korean_work"), t("store.translated_work")] : type === "status" ? [t("store.status_filter"), t("status.serializing"), t("status.completed")] : [t("store.sort_filter"), t("store.sort_rating"), t("store.sort_latest")];
        var current = type === "origin" ? filters.origin : type === "status" ? filters.status : "";
        var idx = options.indexOf(current);
        var next = (idx + 1) % options.length;
        if (type === "origin") filters.origin = options[next];
        else if (type === "status") filters.status = options[next];
        btn.textContent = labels[next];
        applyFilters();
      });
    });

    applyFilters();
    refreshBookmarkButtons();
  }

  function renderMobileDetail(data, novel, list) {
    var titleNode = q("[data-detail-header-title]");
    var coverNode = q("[data-detail-cover]");
    var infoNode = q("[data-detail-info]");
    var statsNode = q("[data-detail-stats]");
    var synopsisNode = q("[data-detail-synopsis]");
    var moreBtn = q("[data-detail-more]");
    var ctaNode = q("[data-detail-cta]");
    var episodesNode = q("[data-detail-episodes]");

    if (titleNode) titleNode.textContent = novel.title;

    if (coverNode) {
      coverNode.style.setProperty("--mobile-detail-image", "url('" + esc(banner(novel)) + "')");
      coverNode.innerHTML = "<img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'>";
    }

    if (infoNode) {
      infoNode.style.setProperty("--mobile-detail-image", "url('" + esc(banner(novel)) + "')");
      var infoTags = (novel.tags || []).slice(0, 5).map(function (tag) { return "<span class='muted-badge'>" + esc(tag) + "</span>"; }).join(" ");
      var sale = salePercent(novel);
      var metaStatus = novel.status === "completed" ? t("status.completed") : t("status.serializing");
      var subtitle = novel.subtitle ? esc(novel.subtitle) + " · " + esc(translationDirection(novel)) : esc(translationDirection(novel));
      var tagMarkup = [];
      if (sale) tagMarkup.push("<span class='sale-badge'>-" + sale + "% 세일</span>");
      if (novel.isTranslation) tagMarkup.push("<span class='muted-badge'>번역</span>");
      if (novel.freeEpisodeCount > 0) tagMarkup.push("<span class='free-badge'>" + formatCount(novel.freeEpisodeCount) + "화 무료</span>");
      if (infoTags) tagMarkup.push(infoTags);
      infoNode.innerHTML =
        "<p class='mobile-detail-kicker'>대표 작품 정보</p>" +
        "<h1 class='mobile-detail-title'>" + esc(novel.title) + "</h1>" +
        "<p class='mobile-detail-subtitle'>" + subtitle + "</p>" +
        "<div class='mobile-detail-tags'>" + tagMarkup.join(" ") + "</div>" +
        "<div class='mobile-detail-meta-grid'>" +
          "<div class='mobile-detail-meta-item'><span class='mobile-detail-meta-label'>작가</span><span class='mobile-detail-meta-value'>" + esc(novel.authorName) + "</span></div>" +
          "<div class='mobile-detail-meta-item'><span class='mobile-detail-meta-label'>상태</span><span class='mobile-detail-meta-value'>" + metaStatus + " · " + formatCount(novel.totalEpisodeCount) + "화</span></div>" +
          "<div class='mobile-detail-meta-item'><span class='mobile-detail-meta-label'>평점</span><span class='mobile-detail-meta-value'>★ " + novel.reactionScore.toFixed(1) + "</span></div>" +
          "<div class='mobile-detail-meta-item'><span class='mobile-detail-meta-label'>출처</span><span class='mobile-detail-meta-value'>" + esc(translationDirection(novel)) + "</span></div>" +
        "</div>" +
        "<div class='mobile-detail-price-row'>" +
          "<div class='mobile-detail-price-values'>" + priceMarkup(novel) + "</div>" +
          "<p class='mobile-detail-price-note'>총 " + formatCount(novel.totalEpisodeCount) + "화 · " + esc(novel.authorName) + "</p>" +
        "</div>";
    }

    if (statsNode) {
      statsNode.innerHTML =
        "<div><div class='mobile-detail-stat-value'>★ " + novel.reactionScore.toFixed(1) + "</div><div class='mobile-detail-stat-label'>평점</div></div>" +
        "<div><div class='mobile-detail-stat-value'>" + formatCount(novel.viewCount) + "</div><div class='mobile-detail-stat-label'>조회수</div></div>" +
        "<div><div class='mobile-detail-stat-value'>" + formatCount(novel.totalEpisodeCount) + "</div><div class='mobile-detail-stat-label'>총 회차</div></div>";
    }

    if (synopsisNode) {
      synopsisNode.textContent = novel.description || novel.shortDescription || t("store.synopsis_empty");
    }

    if (moreBtn) {
      moreBtn.addEventListener("click", function () {
        if (synopsisNode) synopsisNode.classList.toggle("clamped");
        moreBtn.textContent = synopsisNode.classList.contains("clamped") ? t("store.synopsis_more") : t("store.synopsis_less");
      });
    }

    if (ctaNode) {
      var freeEp = list.find(function (ep) { return ep.episodeNumber === 1; }) || list[0];
      ctaNode.innerHTML =
        "<a class='button primary' style='flex:1;text-align:center;' href='" + mobileViewerHref(novel.slug, freeEp ? freeEp.episodeNumber : 1) + "'>" + t("store.read_free") + "</a>" +
        "<button class='button secondary' data-bookmark-id='" + esc(novel.slug) + "'><span data-bookmark-label data-default-label='찜하기'>찜하기</span></button>";
    }

    if (episodesNode) {
      episodesNode.innerHTML = list.map(function (ep) {
        var isFree = ep.episodeNumber <= novel.freeEpisodeCount;
        var badge = isFree ? "<span class='free-badge'>무료</span>" : "<span class='mobile-episode-badge'>" + formatWon(discountedEpisodePrice(novel)) + "</span>";
        return "<a class='mobile-episode-row' href='" + mobileViewerHref(novel.slug, ep.episodeNumber) + "'>" +
          "<span class='mobile-episode-num'>" + ep.episodeNumber + "</span>" +
          "<span class='mobile-episode-title'>" + esc(ep.title) + "</span>" +
          badge +
          "</a>";
      }).join("");
    }

    var backBtn = q("[data-back-btn]");
    if (backBtn) {
      backBtn.addEventListener("click", function (e) {
        if (window.history.length > 1) { e.preventDefault(); window.history.back(); }
      });
    }

    refreshBookmarkButtons();
  }

  function renderMobileViewer(novel, list, selected, body) {
    var titleNode = q("[data-reader-title]");
    var bodyNode = q("[data-reader-body]");
    var epNumNode = q("[data-reader-episode-num]");
    var prevBtn = q("[data-reader-prev]");
    var nextBtn = q("[data-reader-next]");
    var progressBar = q("[data-reader-progress]");
    var topChrome = q("[data-reader-top]");
    var bottomChrome = q("[data-reader-bottom]");

    if (titleNode) titleNode.textContent = esc(novel.title) + " · " + (selected ? selected.episodeNumber : 1) + "화";
    var renderedBody = body
      ? renderMarkdownForViewer(body)
      : "<p style='text-align:center;color:var(--text-muted);padding:48px 0;'>본문을 불러올 수 없습니다.</p>";
    if (bodyNode) {
      bodyNode.innerHTML = renderedBody;
      attachReaderProtection(bodyNode);
    }
    if (epNumNode) epNumNode.textContent = (selected ? selected.episodeNumber : 1) + " / " + list.length + "화";

    var currentIdx = selected ? list.findIndex(function (ep) { return ep.id === selected.id; }) : 0;

    if (prevBtn) {
      if (currentIdx > 0) {
        prevBtn.href = mobileViewerHref(novel.slug, list[currentIdx - 1].episodeNumber);
        prevBtn.style.visibility = "";
      } else {
        prevBtn.style.visibility = "hidden";
      }
    }

    if (nextBtn) {
      if (currentIdx < list.length - 1) {
        nextBtn.href = mobileViewerHref(novel.slug, list[currentIdx + 1].episodeNumber);
        nextBtn.style.visibility = "";
      } else {
        nextBtn.style.visibility = "hidden";
      }
    }

    var chromeVisible = true;
    if (bodyNode) {
      bodyNode.addEventListener("click", function () {
        chromeVisible = !chromeVisible;
        if (topChrome) topChrome.classList.toggle("hidden", !chromeVisible);
        if (bottomChrome) bottomChrome.classList.toggle("hidden", !chromeVisible);
      });
    }

    window.addEventListener("scroll", function () {
      if (!progressBar) return;
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      progressBar.style.width = pct + "%";
    });

    var backBtn = q("[data-back-btn]");
    if (backBtn) {
      backBtn.addEventListener("click", function (e) {
        if (window.history.length > 1) { e.preventDefault(); window.history.back(); }
      });
    }

    var listBtn = q("[data-reader-list-btn]");
    if (listBtn) {
      listBtn.href = mobileDetailHref(novel.slug);
    }
  }

  function renderMobileLibrary(data) {
    var statsNode = q("[data-library-stats]");
    var readingList = q("[data-library-reading]");
    var wishlistList = q("[data-library-wishlist]");
    var purchasedList = q("[data-library-purchased]");

    var bookmarks = [];
    try { bookmarks = JSON.parse(localStorage.getItem(store.bookmarks) || "[]"); } catch (_e) { bookmarks = []; }
    var bookmarkedNovels = data.novels.filter(function (n) { return bookmarks.indexOf(n.slug) !== -1; });

    var token = accessToken();
    var isLoggedIn = Boolean(token && token !== cfg.anonKey && token !== (cfg.publishableKey || ""));

    if (statsNode) {
      statsNode.textContent = "찜 " + formatCount(bookmarkedNovels.length) + "개";
    }

    var loginPrompt = "<div class='library-empty'><h3>" + t("library.login_required") + "</h3><p>로그인 후 확인할 수 있습니다.</p><a class='button primary' href='auth_pc.html'>로그인</a></div>";

    if (readingList) {
      readingList.innerHTML = isLoggedIn
        ? "<div class='library-empty'><h3>" + t("library.no_reading") + "</h3><p>스토어에서 작품을 골라 읽어보세요.</p><a class='button primary' href='search.html'>작품 탐색하기</a></div>"
        : loginPrompt;
    }

    if (wishlistList) {
      if (bookmarkedNovels.length) {
        wishlistList.innerHTML = bookmarkedNovels.map(function (novel) {
          var sale = salePercent(novel);
          var badge = sale ? "<span class='sale-badge'>-" + sale + "%</span>" : "";
          return "<a class='mobile-list-row' href='" + mobileDetailHref(novel.slug) + "'>" +
            "<img src='" + esc(cover(novel)) + "' alt='" + esc(novel.title) + "'>" +
            "<div class='mobile-list-row-copy'>" +
            "<div class='mobile-list-row-title'>" + esc(novel.title) + " " + badge + "</div>" +
            "<div class='mobile-list-row-meta'>" + esc(novel.authorName) + "</div>" +
            "</div>" +
            "</a>";
        }).join("");
      } else {
        wishlistList.innerHTML = "<div class='library-empty'><h3>" + t("library.no_bookmarks") + "</h3><p>" + t("library.no_bookmarks_hint") + "</p><a class='button primary' href='search.html'>탐색하기</a></div>";
      }
    }

    if (purchasedList) {
      purchasedList.innerHTML = isLoggedIn
        ? "<div class='library-empty'><h3>" + t("library.no_purchases") + "</h3><p>" + t("library.no_purchases_hint") + "</p><a class='button primary' href='search.html'>탐색하기</a></div>"
        : loginPrompt;
    }

    var tabBtns = qa("[data-tab-target]");
    var tabPanels = qa("[data-tab-panel]");
    tabBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        tabBtns.forEach(function (b) { b.dataset.state = ""; });
        btn.dataset.state = "include";
        tabPanels.forEach(function (p) { p.style.display = "none"; });
        var target = q("[data-tab-panel='" + btn.dataset.tabTarget + "']");
        if (target) target.style.display = "";
      });
    });

    refreshBookmarkButtons();
  }

  /* ============================================
     Detail Polish — Skeleton loading
     ============================================ */
  function showSkeletons() {
    // PC novel grids
    qa(".novel-grid").forEach(function (grid) {
      if (grid.children.length > 0) return;
      var count = 4;
      var html = "";
      for (var i = 0; i < count; i++) {
        html += "<div class='skeleton-card'><div class='skeleton-img'></div><div class='skeleton-line'></div><div class='skeleton-line short'></div></div>";
      }
      grid.innerHTML = html;
    });
    // Mobile home — new mh-* skeleton cards
    qa("[data-mh-popular-list]").forEach(function (node) {
      if (node.children.length > 0) return;
      var html = "";
      for (var i = 0; i < 4; i++) {
        html += "<div class='mh-skel mh-skel-card'><div class='mh-skel-img'></div><div class='mh-skel-line'></div><div class='mh-skel-line short'></div></div>";
      }
      node.innerHTML = html;
    });
    qa("[data-mh-recent-list]").forEach(function (node) {
      if (node.children.length > 0) return;
      var html = "";
      for (var i = 0; i < 3; i++) {
        html += "<div class='mh-skel mh-skel-row'><div class='mh-skel-thumb'></div><div class='mh-skel-body'><div class='mh-skel-line'></div><div class='mh-skel-line short'></div></div></div>";
      }
      node.innerHTML = html;
    });
    // PC hero skeleton
    var heroBand = q(".hero-band");
    if (heroBand && !heroBand.dataset.loaded) {
      var heroShell = q(".store-shell", heroBand) || q(".hero-grid", heroBand);
      if (heroShell && !q(".skeleton-hero", heroBand)) {
        // keep existing structure, just add a loading class
        heroBand.classList.add("skeleton");
      }
    }
  }

  function removeSkeletons() {
    qa(".skeleton-card, .skeleton-pin, .skeleton-hero").forEach(function (el) { el.remove(); });
    qa(".skeleton").forEach(function (el) { el.classList.remove("skeleton"); });
  }

  /* ============================================
     Detail Polish — Topbar scroll detection
     ============================================ */
  (function initTopbarScroll() {
    var topbar = q(".topbar") || q(".mobile-header");
    if (!topbar) return;
    var lastY = 0;
    var ticking = false;
    window.addEventListener("scroll", function () {
      lastY = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(function () {
          if (lastY > 20) {
            topbar.classList.add("scrolled");
          } else {
            topbar.classList.remove("scrolled");
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  })();

  /* ============================================
     Detail Polish — Footer upgrade
     ============================================ */
  function upgradeFooters() {
    // PC footer
    qa(".store-footer").forEach(function (footer) {
      var yearEl = q("[data-year]", footer);
      var year = yearEl ? yearEl.textContent : new Date().getFullYear();
      footer.innerHTML =
        "<div class='footer-brand'>" +
          "<span class='brand-mark material-symbols-outlined'>auto_stories</span>" +
          "<strong>INKROAD</strong>" +
        "</div>" +
        "<div class='footer-links'>" +
          "<a href='#'>" + t("footer.terms") + "</a>" +
          "<a href='#'>" + t("footer.privacy") + "</a>" +
          "<a href='#'>" + t("footer.help") + "</a>" +
          "<a href='#'>" + t("footer.creator") + "</a>" +
        "</div>" +
        "<div class='footer-copy'>" +
          "<span>&copy; " + year + " INKROAD. " + t("footer.rights") + "</span>" +
        "</div>";
    });
    // Mobile footer
    qa(".mobile-footer").forEach(function (footer) {
      var yearEl = q("[data-year]", footer);
      var year = yearEl ? yearEl.textContent : new Date().getFullYear();
      footer.innerHTML =
        "<div class='footer-brand-row'>" +
          "<span class='brand-mark material-symbols-outlined'>auto_stories</span>" +
          "<strong>INKROAD</strong>" +
        "</div>" +
        "<div class='footer-links'>" +
          "<a href='#'>" + t("footer.terms") + "</a>" +
          "<a href='#'>" + t("footer.privacy") + "</a>" +
          "<a href='#'>" + t("footer.help") + "</a>" +
        "</div>" +
        "<div class='footer-tagline'>&copy; " + year + " INKROAD &mdash; " + t("footer.tagline") + "</div>";
    });
  }

  showSkeletons();

  async function hydrate() {
    upgradeFooters();

    if (page === "auth_pc") {
      renderAuth();
      return;
    }

    const data = await catalog();
    removeSkeletons();
    if (!data.novels.length) return;

    if (page === "homepage_pc") {
      renderHome(data);
      return;
    }

    if (page === "search_pc") {
      renderSearch(data);
      return;
    }

    if (page === "my_library_pc") {
      renderLibrary(data);
      return;
    }

    if (page === "creator_dashboard_pc") {
      renderCreatorDashboard(data);
      return;
    }

    if (page === "author_dashboard_pc") {
      // Enrich novels with retention data
      try {
        var token = accessToken();
        var isLoggedIn = Boolean(token && token !== cfg.anonKey && token !== (cfg.publishableKey || ""));
        if (isLoggedIn && window.supabase) {
          var client = window.supabase.createClient(base, key, {
            auth: { persistSession: true, storageKey: "inkroad-supabase-auth" }
          });
          var sessionResult = await client.auth.getSession();
          var session = sessionResult.data.session;
          if (session) {
            var statsResult = await client.rpc("get_novel_stats_with_retention", { p_user_id: session.user.id });
            if (statsResult.data) {
              var retentionMap = {};
              statsResult.data.forEach(function(stat) {
                retentionMap[stat.novel_id] = stat;
              });
              data.novels.forEach(function(novel) {
                if (retentionMap[novel.id]) {
                  var stat = retentionMap[novel.id];
                  novel.retentionRate = stat.retention_rate || 0;
                  novel.firstChapterReaders = stat.first_chapter_readers || 0;
                  novel.lastChapterReaders = stat.last_chapter_readers || 0;
                }
              });
            }
          }
        }
      } catch(e) {
        console.warn("[Stats] Failed to load retention data:", e);
      }
      renderAuthorDashboard(data);
      return;
    }

    if (page === "homepage") {
      renderMobileHome(data);
      return;
    }

    if (page === "search") {
      renderMobileSearch(data);
      return;
    }

    if (page === "my_library") {
      renderMobileLibrary(data);
      return;
    }

    const slug = query.get("slug") || "abyss-librarian-forbidden-archive";
    const novel = data.novelsBySlug.get(slug) || data.novels[0];
    if (!novel) return;
    const list = await episodes(novel.id);
    const ownership = (page === "novel_detail_pc" || page === "novel_viewer_pc") ? await ownershipForNovel(novel.id, list) : null;

    if (page === "novel_detail_pc") {
      renderDetail(data, novel, list, ownership);
      return;
    }

    if (page === "novel_viewer_pc") {
      const episodeNumber = Number(query.get("episode") || 1);
      const selected = list.find(function (episode) { return episode.episodeNumber === episodeNumber; }) || list[0];
      const body = selected ? await episodeBody(selected.id).catch(function () { return ""; }) : "";
      renderViewer(novel, list, selected, body, ownership);
      return;
    }

    if (page === "novel_detail") {
      renderMobileDetail(data, novel, list);
      return;
    }

    if (page === "novel_viewer") {
      const episodeNumber = Number(query.get("episode") || 1);
      const selected = list.find(function (episode) { return episode.episodeNumber === episodeNumber; }) || list[0];
      const body = selected ? await episodeBody(selected.id).catch(function () { return ""; }) : "";
      renderMobileViewer(novel, list, selected, body);
    }
  }

  hydrate().catch(function (error) {
    console.error("[InkRoad] redesign hydration failed:", error);
  });
})();
