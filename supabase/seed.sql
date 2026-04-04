insert into public.authors (pen_name, bio, country_code, is_translator)
values
  ('한서림', '다크 판타지와 장기 연재를 주로 쓰는 작가입니다.', 'KR', false),
  ('이설원', '가문물과 회귀 서사를 주로 쓰는 작가입니다.', 'KR', false),
  ('미카 사도', '도서관과 금서, 기록물을 다루는 판타지를 쓰는 작가입니다.', 'JP', true),
  ('유리안', '멸망 후 생존과 복구 서사를 쓰는 작가입니다.', 'KR', false)
on conflict (pen_name) do update
set bio = excluded.bio,
    country_code = excluded.country_code,
    is_translator = excluded.is_translator;

insert into public.tags (slug, name, category)
values
  ('dark-fantasy', '다크 판타지', 'genre'),
  ('regression', '회귀', 'theme'),
  ('family-saga', '가문물', 'theme'),
  ('academy', '아카데미', 'genre'),
  ('translation', '번역작', 'origin'),
  ('librarian', '사서', 'theme'),
  ('bundle-sale', '완결 번들', 'event'),
  ('long-run', '장기 연재', 'format')
on conflict (slug) do update
set name = excluded.name,
    category = excluded.category;

insert into public.novels (
  author_id,
  slug,
  title,
  subtitle,
  short_description,
  description,
  cover_url,
  banner_url,
  status,
  age_rating,
  is_translation,
  origin_country,
  free_episode_count,
  total_episode_count,
  reaction_score,
  view_count,
  bookmark_count,
  comment_count,
  bundle_list_price,
  bundle_sale_price,
  sale_starts_at,
  sale_ends_at,
  published_from
)
values
  (
    (select id from public.authors where pen_name = '한서림'),
    'black-mage-oath',
    '칠흑의 마법사와 검은 서약',
    '성벽 위 추적극으로 시작하는 다크 판타지',
    '무료 공개 구간에서 가장 빠르게 붙는 대표 유입작',
    '성벽 위에서 시작되는 추적극과 피로 맺어진 서약을 중심으로 흘러가는 다크 판타지 연재작입니다.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCDz-aPYCX7Yr4pHZZa3ERwLwO7Uxxk5cIWmfJ5HcT4lDvUdEL-wBNZPB0t-7S3atMnE9v0EUXglzcb-W3jOcr7Ic7psmR95rtv5v9Y1asir_0q6kqT_FGiuUaM4yvJJ394j9HlSrwuNMNwMHsE2v2j-cOehyQ7aGQhxY6w2a7mlm0xn6vlReD6W-N8ss9C23JPsZPO_svtvKd5aSiE53SIRhKpnwiWVpL1Yf-P_6vCTaHMp7kr0AWDHQ9vwwkCmBI3U-H4VVSooDo',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuChC-SH69mpXg1mbFsnN52yETf5wxclWaa4ZjDUUO22tVqkJ6v_VTR5PJzbaHD8HbQL2pvvv47F6A1j_Irjk4k-6M_n7SGvAkWr9nZctvh6vCU75ZWXSJvD8z8w5rHpGneDXZ4dVrr_FfzgiLwMMTxygXaHil4jQloz9lpE8CQxl9cOn5o8_x-oxgW6W8-CFzPsx8_SzviEZR7tkdbJH3h2tqAJnBzrp38VyiFhN2iyAIVEYd8peSEOxnclrl3ssPSbRwqNaWRffKE',
    'serializing',
    15,
    false,
    'KR',
    30,
    214,
    9.4,
    182400,
    13820,
    4560,
    19800,
    9900,
    timezone('utc', now()) - interval '2 day',
    timezone('utc', now()) + interval '5 day',
    timezone('utc', now()) - interval '90 day'
  ),
  (
    (select id from public.authors where pen_name = '이설원'),
    'ruined-duke-heir',
    '망한 공작가의 어린 가주가 되었다',
    '가문 재건과 회귀가 만나는 성장 서사',
    '탐색 화면에서 비교하기 좋은 회귀·가문물 대표작',
    '몰락한 공작가의 후계자가 어린 몸으로 돌아와 가문을 다시 세우는 회귀 판타지입니다.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuA8zBqhbWc6kU1j1MSWb99T2x8dgIDqYed0MS3tJzv6jehXbpXKwWatT9ZbbF9LUE1cvrE2mY7f23RNVF7i5l-WKWzc7Cf2u_IpkuL5xkCyYC6LYIaDudWvJam5AYvJVyXR9IIZA2AepSDQBuN-pniWOXRHc4IPSLirS5PSaNEubDCLhd4jfV9JJdfO-US0xxXshks9zJX6-rhsZsyAWJE_dew8W8KY-UySvZp8X46sPHUuxkt_kUgok0pfjotf8YTmpNMvV1RDQIA',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAQcMe2iqEX1E6n8vKFs-rrh5SaVOf_BiYCv95doiH5NIDJNLPmw0v7hkiNuBOkJF5EUzKvR-xWgQG1-yHvh14JElmcAhrIdkjdqiCVvt69Z7g87JL7lij0MYVWcNkXGLHX1ccCJUTE8uPGJ51VhxxI-KKsxWkNzuvB53hoKCi6OUl4WBxpuzgTc-fll-mOiOSPJF2j3QNoADQpttdmS7hmCEp-3ryV9Eefrng060GWx5OA6K6b2VEsB3n4GOgGQqSMTLthRhGsvxY',
    'serializing',
    12,
    false,
    'KR',
    20,
    168,
    9.1,
    143800,
    11120,
    3180,
    17600,
    null,
    null,
    null,
    timezone('utc', now()) - interval '120 day'
  ),
  (
    (select id from public.authors where pen_name = '미카 사도'),
    'abyss-librarian-forbidden-archive',
    '심연의 사서와 금지된 장서관',
    '금서와 봉인 기록이 얽힌 미스터리 판타지',
    '상세 화면과 뷰어 흐름을 확인하기 좋은 작품',
    '심연 아래에 잠든 장서관에서 금서를 정리하는 사서가 봉인된 기록을 마주하는 미스터리 판타지입니다.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDaV3t5LBRIj95ywCHBLpMQev9Lmxy2UEmRKll4JPTaP-mucOSvPf58qdcC-2IqG4zUava7TepRv4uRvPvN2jpcjyyyiIHH5gOikvxL6oBph0KfUTx9qK8GrSk3x375rvs2cl5PAtyJVBaHqWXDV4IIXWU_4oOjQjf9i97wFEHkVxZkMc0dsN39y8yrGp25dQMGaETPqRroAhF1bhOw2rzDBb_xZc4Ct5-60GU5mAnU-jHETwFLDZdvp2CuVfdaMYb4raSTR-XKrGc',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuARsfZ6qNEArTC8TYqvrAwxKQ3JVUflLbZbHdwpRGS2c0QhRvSVWiABlees50Tc2VNt3wbBSR-uLXrSLj76aJrBEnsGSndwJ9L1fNOXqOHPl8utOgrJTKG1IQSEX413AWYdH4A2sQYZxKMDtvGgMbwJtd4uuDUQtnkENMGReWj-6Ub5378s4fG2byOetpLyoo8mC1YJWceGql-kBLtrQn2RbH6bBDe8A6h1A6nDxrkEdSrxDF-LrifUE-A5nfwlc4uhZ0ozdU2OvBw',
    'serializing',
    15,
    true,
    'JP',
    15,
    96,
    8.9,
    98400,
    7040,
    1940,
    14800,
    11800,
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '6 day',
    timezone('utc', now()) - interval '45 day'
  ),
  (
    (select id from public.authors where pen_name = '유리안'),
    'imperial-library-librarian-after-doom',
    '멸망 후 황실 도서관의 사서가 되었다',
    '복구와 생존을 다루는 장편 기록 판타지',
    '서재와 이어 읽기 흐름을 확인하기 좋은 장기 연재작',
    '멸망 이후 폐허가 된 황실 도서관에서 남은 기록을 지키며 살아가는 사서의 장편 판타지입니다.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBADlrvGWQF0z4_09EIlWNVO2N-FFQ7_5abukwtaCJif_Rae6ID3x1n1M2yzPuj8OP1zEO9nVQNjwusvBl4JbCRD9QQEh_j6luSBvPcvnZKLSaKeaHFD9Ca3LnY0qn_ttqVv6Qt5m30lvffTakrTlDO36R4YvTD74EX079oXZpHYGyy41gIRFxC2ybBxeSMLaRlBFHIjwU4orfIV0NnaWM6XE0Hvf1oCivvFhrTNYnk5dpyvxFxP8ZhMVd0eRjApDZzHgvOrvo7Byc',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCXF79bbqNGyc9LD7qsG4vHndq0LnuUGVJA7F24Q3D76Y-yN2xJjKXS5VCp8cqxckc-1fwNcxah82eGieiLUaDsefkdrYGLr11ZSvsYzqZdsqGI7KZlE-R8hfH1dUPCqZw6CnwDbUoIKMGE3te5GW-x_8ErI9VUFbvXMaZ59v25sVLNbZpcc09gPwEOomPXoxlPkt4JMeuGAmygrxJ-IoMcoQqlA09-K-fx2QF6n2PUr7G5ogTNc4fPhWU5ryWqjFc0-d2U6JbHWZI',
    'completed',
    12,
    false,
    'KR',
    12,
    168,
    9.0,
    121500,
    9320,
    2670,
    21000,
    12600,
    timezone('utc', now()) - interval '3 day',
    timezone('utc', now()) + interval '4 day',
    timezone('utc', now()) - interval '180 day'
  )
on conflict (slug) do update
set author_id = excluded.author_id,
    title = excluded.title,
    subtitle = excluded.subtitle,
    short_description = excluded.short_description,
    description = excluded.description,
    cover_url = excluded.cover_url,
    banner_url = excluded.banner_url,
    status = excluded.status,
    age_rating = excluded.age_rating,
    is_translation = excluded.is_translation,
    origin_country = excluded.origin_country,
    free_episode_count = excluded.free_episode_count,
    total_episode_count = excluded.total_episode_count,
    reaction_score = excluded.reaction_score,
    view_count = excluded.view_count,
    bookmark_count = excluded.bookmark_count,
    comment_count = excluded.comment_count,
    bundle_list_price = excluded.bundle_list_price,
    bundle_sale_price = excluded.bundle_sale_price,
    sale_starts_at = excluded.sale_starts_at,
    sale_ends_at = excluded.sale_ends_at,
    published_from = excluded.published_from,
    updated_at = timezone('utc', now());

insert into public.novel_tags (novel_id, tag_id)
values
  ((select id from public.novels where slug = 'black-mage-oath'), (select id from public.tags where slug = 'dark-fantasy')),
  ((select id from public.novels where slug = 'black-mage-oath'), (select id from public.tags where slug = 'long-run')),
  ((select id from public.novels where slug = 'ruined-duke-heir'), (select id from public.tags where slug = 'regression')),
  ((select id from public.novels where slug = 'ruined-duke-heir'), (select id from public.tags where slug = 'family-saga')),
  ((select id from public.novels where slug = 'abyss-librarian-forbidden-archive'), (select id from public.tags where slug = 'translation')),
  ((select id from public.novels where slug = 'abyss-librarian-forbidden-archive'), (select id from public.tags where slug = 'librarian')),
  ((select id from public.novels where slug = 'imperial-library-librarian-after-doom'), (select id from public.tags where slug = 'librarian')),
  ((select id from public.novels where slug = 'imperial-library-librarian-after-doom'), (select id from public.tags where slug = 'bundle-sale'))
on conflict do nothing;

insert into public.episodes (
  novel_id,
  episode_number,
  title,
  teaser,
  status,
  access_type,
  price,
  word_count,
  published_at
)
values
  ((select id from public.novels where slug = 'black-mage-oath'), 1, '피의 서약', '성벽 위에서 첫 추적이 시작됩니다.', 'published', 'free', 0, 2100, timezone('utc', now()) - interval '90 day'),
  ((select id from public.novels where slug = 'black-mage-oath'), 2, '추적자들', '도망자와 추적자가 뒤바뀌는 밤입니다.', 'published', 'free', 0, 2250, timezone('utc', now()) - interval '89 day'),
  ((select id from public.novels where slug = 'black-mage-oath'), 31, '검은 문장', '무료 구간 이후 첫 유료 회차입니다.', 'published', 'paid', 500, 2480, timezone('utc', now()) - interval '60 day'),

  ((select id from public.novels where slug = 'ruined-duke-heir'), 1, '돌아온 회귀자', '몰락 직전의 가문으로 돌아갑니다.', 'published', 'free', 0, 2050, timezone('utc', now()) - interval '120 day'),
  ((select id from public.novels where slug = 'ruined-duke-heir'), 2, '첫 번째 장부', '가문의 빚을 정리하기 시작합니다.', 'published', 'free', 0, 2180, timezone('utc', now()) - interval '119 day'),
  ((select id from public.novels where slug = 'ruined-duke-heir'), 21, '겨울 입성', '북부 세력과의 첫 교섭입니다.', 'published', 'paid', 400, 2360, timezone('utc', now()) - interval '90 day'),

  ((select id from public.novels where slug = 'abyss-librarian-forbidden-archive'), 1, '금서의 문', '금지된 서고의 첫 문이 열립니다.', 'published', 'free', 0, 2120, timezone('utc', now()) - interval '45 day'),
  ((select id from public.novels where slug = 'abyss-librarian-forbidden-archive'), 2, '사라진 목차', '기록에서 지워진 장을 추적합니다.', 'published', 'free', 0, 2240, timezone('utc', now()) - interval '44 day'),
  ((select id from public.novels where slug = 'abyss-librarian-forbidden-archive'), 16, '봉인의 문장', '첫 유료 구간으로 넘어갑니다.', 'published', 'paid', 500, 2410, timezone('utc', now()) - interval '30 day'),

  ((select id from public.novels where slug = 'imperial-library-librarian-after-doom'), 1, '폐허 속 첫 기록', '멸망 후 첫 기록이 남습니다.', 'published', 'free', 0, 1980, timezone('utc', now()) - interval '180 day'),
  ((select id from public.novels where slug = 'imperial-library-librarian-after-doom'), 2, '남겨진 지도', '생존자들이 남긴 지도를 확인합니다.', 'published', 'free', 0, 2160, timezone('utc', now()) - interval '179 day'),
  ((select id from public.novels where slug = 'imperial-library-librarian-after-doom'), 13, '봉쇄 구역의 서가', '장기 연재 흐름을 보여주는 회차입니다.', 'published', 'paid', 400, 2390, timezone('utc', now()) - interval '165 day')
on conflict (novel_id, episode_number) do update
set title = excluded.title,
    teaser = excluded.teaser,
    status = excluded.status,
    access_type = excluded.access_type,
    price = excluded.price,
    word_count = excluded.word_count,
    published_at = excluded.published_at,
    updated_at = timezone('utc', now());

insert into public.episode_contents (episode_id, body)
values
  ((select id from public.episodes e join public.novels n on n.id = e.novel_id where n.slug = 'black-mage-oath' and e.episode_number = 1), '성벽 위로 검은 안개가 밀려오고, 마법사는 피로 서약을 새긴다.'),
  ((select id from public.episodes e join public.novels n on n.id = e.novel_id where n.slug = 'black-mage-oath' and e.episode_number = 2), '추적자는 발자국 대신 마력의 온도를 따라간다.'),
  ((select id from public.episodes e join public.novels n on n.id = e.novel_id where n.slug = 'black-mage-oath' and e.episode_number = 31), '봉인된 문장이 열리고 마법사의 과거가 드러난다.'),

  ((select id from public.episodes e join public.novels n on n.id = e.novel_id where n.slug = 'ruined-duke-heir' and e.episode_number = 1), '가주가 되기엔 너무 어린 몸이었지만, 기억은 남아 있었다.'),
  ((select id from public.episodes e join public.novels n on n.id = e.novel_id where n.slug = 'ruined-duke-heir' and e.episode_number = 2), '소년은 불에 탄 장부를 다시 펼쳤다.'),
  ((select id from public.episodes e join public.novels n on n.id = e.novel_id where n.slug = 'ruined-duke-heir' and e.episode_number = 21), '회귀자는 이번엔 협상 테이블을 먼저 차지했다.'),

  ((select id from public.episodes e join public.novels n on n.id = e.novel_id where n.slug = 'abyss-librarian-forbidden-archive' and e.episode_number = 1), '사서는 열리지 말아야 할 문 앞에 섰다.'),
  ((select id from public.episodes e join public.novels n on n.id = e.novel_id where n.slug = 'abyss-librarian-forbidden-archive' and e.episode_number = 2), '목차에서 사라진 제목은 오히려 더 선명했다.'),
  ((select id from public.episodes e join public.novels n on n.id = e.novel_id where n.slug = 'abyss-librarian-forbidden-archive' and e.episode_number = 16), '문장 하나가 장서관 전체의 조명을 바꾸었다.'),

  ((select id from public.episodes e join public.novels n on n.id = e.novel_id where n.slug = 'imperial-library-librarian-after-doom' and e.episode_number = 1), '사서는 무너진 서가 사이에서 첫 기록표를 세웠다.'),
  ((select id from public.episodes e join public.novels n on n.id = e.novel_id where n.slug = 'imperial-library-librarian-after-doom' and e.episode_number = 2), '지도 위에는 지워진 길보다 남은 길이 적었다.'),
  ((select id from public.episodes e join public.novels n on n.id = e.novel_id where n.slug = 'imperial-library-librarian-after-doom' and e.episode_number = 13), '봉쇄 구역의 서가에서 오래된 기록이 다시 빛났다.')
on conflict (episode_id) do update
set body = excluded.body,
    updated_at = timezone('utc', now());

insert into public.events (
  slug,
  title,
  subtitle,
  description,
  event_type,
  status,
  starts_at,
  ends_at
)
values
  (
    'dark-fantasy-week',
    '다크 판타지 집중전',
    '무료 연재 상위작과 장르 대표작을 같이 노출합니다.',
    '무료 유입작과 완결 번들을 함께 배치해 재발견을 유도하는 이벤트전입니다.',
    'genre_festival',
    'active',
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '6 day'
  ),
  (
    'completed-bundle-sale',
    '완결 번들 세일',
    '반응이 꺼진 작품을 이벤트전으로 다시 띄웁니다.',
    '완결작 위주로 재노출을 유도하는 번들 할인전입니다.',
    'bundle_sale',
    'active',
    timezone('utc', now()) - interval '2 day',
    timezone('utc', now()) + interval '5 day'
  )
on conflict (slug) do update
set title = excluded.title,
    subtitle = excluded.subtitle,
    description = excluded.description,
    event_type = excluded.event_type,
    status = excluded.status,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    updated_at = timezone('utc', now());

insert into public.event_items (event_id, novel_id, sort_order, discount_percent, sale_price)
values
  (
    (select id from public.events where slug = 'dark-fantasy-week'),
    (select id from public.novels where slug = 'black-mage-oath'),
    1,
    0,
    null
  ),
  (
    (select id from public.events where slug = 'dark-fantasy-week'),
    (select id from public.novels where slug = 'abyss-librarian-forbidden-archive'),
    2,
    20,
    11800
  ),
  (
    (select id from public.events where slug = 'completed-bundle-sale'),
    (select id from public.novels where slug = 'imperial-library-librarian-after-doom'),
    1,
    40,
    12600
  ),
  (
    (select id from public.events where slug = 'completed-bundle-sale'),
    (select id from public.novels where slug = 'ruined-duke-heir'),
    2,
    15,
    14900
  )
on conflict (event_id, novel_id) do update
set sort_order = excluded.sort_order,
    discount_percent = excluded.discount_percent,
    sale_price = excluded.sale_price;
