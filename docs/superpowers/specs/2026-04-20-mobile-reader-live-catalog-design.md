# 모바일 독자 실데이터 카탈로그 전환 설계 문서

**날짜**: 2026-04-20  
**범위**: `/home/ciel/nova/inkroad-app` 내부 Expo 앱의 `홈 / 검색 / 작품 상세 / 뷰어`  
**제외 범위**: 서재, 구매 차단, 읽기 진행도 저장, 프로필, 결제/코인, `mob/` 웹 목업  
**원칙**: 독자 화면 UI는 최대한 유지하고, `mockInkroad`를 독자 공개 카탈로그 흐름에서 분리한다

---

## 목표

이번 단계의 목표는 독자용 공개 카탈로그 흐름을 실제 Supabase 데이터에 연결하는 것이다.

대상 흐름:

1. 홈에서 실제 작품 노출
2. 검색에서 실제 작품 필터링
3. 작품 상세에서 실제 작품/회차 정보 표시
4. 뷰어에서 실제 공개 회차 본문 열람

이번 단계는 “읽을 수 있는 공개 작품 흐름”을 복구하는 것이 목표이며, 구매 여부나 개인화 상태까지 해결하는 단계는 아니다.

---

## 제안한 접근과 선택

### 접근안 A. 화면에서 Supabase row 직접 사용

- 각 화면이 `novels`, `episodes`, `authors`, `tags` 결과를 직접 다룸
- 장점: 중간 계층이 적다
- 단점: 현재 화면이 `Novel` / `Episode` 목업 타입에 깊게 묶여 있어 변경 범위가 커진다

### 접근안 B. Reader Repository + Adapter 도입

- Supabase 전용 조회 코드는 repository에 모으고
- 화면은 기존 `Novel` / `Episode` 형태와 가까운 reader view model만 받음
- 장점: UI 변경 폭이 작고, mock 의존성을 깔끔하게 분리할 수 있다
- 단점: mapper 계층이 하나 더 생긴다

### 접근안 C. 홈만 먼저 실데이터, 나머지는 점진 전환

- 홈 화면만 실데이터로 바꾸고 검색/상세/뷰어는 순차 전환
- 장점: 가장 빨리 눈에 보이는 변화가 생긴다
- 단점: 데이터 경로가 이중화되고 상세/뷰어에서 다시 재정리해야 한다

### 선택

**접근안 B. Reader Repository + Adapter 도입**을 채택한다.

이유:

- 현재 UI를 크게 흔들지 않고 실데이터 전환이 가능하다
- `mockInkroad`를 독자 공개 흐름에서 끊어낼 수 있다
- 이후 서재/구매/진행도 저장을 붙일 때도 같은 repository를 확장하기 쉽다

---

## 아키텍처

### 새 경계

`inkroad-app/src/mobile/reader/` 아래에 다음 책임을 둔다.

- `repository.ts`
  - 공개 작품 목록 조회
  - 작품 상세 조회
  - 공개 회차 목록 조회
  - 공개 회차 본문 조회
- `mappers.ts`
  - Supabase row를 모바일 화면용 view model로 변환
- `types.ts`
  - reader 전용 원격 row / view model 타입 정의

### 기존 화면 책임

- `HomeScreen.tsx`
  - hero 작품, 할인 작품, 인기 작품, 최근 업데이트 작품을 repository에서 받는다
- `SearchScreen.tsx`
  - query + 장르 필터를 repository 결과에 적용한다
- `NovelDetailScreen.tsx`
  - 작품 정보와 공개 회차 목록을 repository에서 받는다
- `NovelViewerScreen.tsx`
  - 선택한 회차의 공개 본문을 repository에서 받는다

화면은 Supabase client를 직접 호출하지 않는다.  
모든 네트워크 접근은 reader repository를 통해서만 일어난다.

---

## 데이터 계약

### 원격 소스

공개 카탈로그는 다음 공개 테이블을 기준으로 읽는다.

- `novels`
- `authors`
- `episodes`
- `episode_contents`
- `novel_tags`
- `tags`

### 화면용 모델

기존 UI 컴포넌트 재사용을 위해 `NovelCard`가 기대하는 `Novel` shape에 맞춘다.

대표 매핑 규칙:

- `Novel.id`
  - 실제 `novels.id` UUID 문자열 사용
- `Novel.title`
  - `novels.title`
- `Novel.author`
  - `authors.pen_name`
- `Novel.coverUrl`
  - `novels.cover_url`
- `Novel.heroImageUrl`
  - `novels.banner_url` 우선, 없으면 `cover_url`
- `Novel.tagline`
  - `novels.short_description`
- `Novel.synopsis`
  - `novels.description`
- `Novel.tags`
  - `tags.name[]`
- `Novel.views`
  - `novels.view_count`
- `Novel.rating`
  - `novels.reaction_score`
- `Novel.totalEpisodes`
  - `novels.total_episode_count`
- `Novel.freeEpisodes`
  - `novels.free_episode_count`
- `Novel.pricePerEpisode`
  - bundle sale가 있으면 회차 기본 가격 대신 대표 표시값으로 사용하지 않는다
  - 공개 회차 목록에서 유료 회차의 대표 가격 하나를 계산해 넣고, 없으면 0으로 둔다
- `Novel.salePercent`
  - `bundle_list_price`와 `bundle_sale_price`로 계산
- `Novel.salePrice`
  - `bundle_sale_price`
- `Novel.status`
  - `published` 계열은 `연재중`, 완결 상태는 `완결`로 표시
- `Novel.source`
  - 이번 단계에서는 전부 `INKROAD`

회차 매핑 규칙:

- `Episode.id` -> `episodes.id`
- `Episode.number` -> `episodes.episode_number`
- `Episode.title` -> `episodes.title`
- `Episode.summary` -> `episodes.teaser`
- `Episode.isFree` -> `episodes.access_type === "free"`
- `Episode.price` -> `episodes.price ?? 0`
- `Episode.body` -> `episode_contents.body`

---

## 화면별 동작

### 홈

- 공개 작품 목록을 불러온 뒤 화면 섹션을 계산한다
- hero는 최신 업데이트 + 표지/배너 품질이 있는 작품 중 우선순위를 정해 1개 선택한다
- 할인 섹션은 sale percent가 있는 작품
- 인기 섹션은 `view_count`, `reaction_score` 기준 상위 작품
- 최근 업데이트 섹션은 최신 공개 회차 발행일 기준 작품

이번 단계에서는 관리자 전용 홈 배너 RPC를 쓰지 않고, 공개 작품 데이터만으로 홈 구성을 만든다.

### 검색

- 최초에는 공개 작품 전체를 불러온 뒤 클라이언트 검색을 적용한다
- 검색 대상은 제목, 작가명, 태그명
- 장르 chip은 `tags.name` 기준으로 동작한다
- 현재 UI에 있는 `출처 / 상태 / 정렬` 버튼은 시각 요소로 유지하되, 이번 단계에서는 실제 정렬만 최소 구현한다

### 작품 상세

- 작품 기본 정보
- 공개 회차 목록
- 첫 화 이동

만 제공한다.

찜, 구매, 이어읽기 개인화 문구는 이번 단계에서 실제 상태와 연결하지 않는다.

### 뷰어

- 선택한 작품의 특정 공개 회차 본문을 읽을 수 있어야 한다
- 이전화/다음화 이동이 동작해야 한다
- 비공개 회차, 초안 회차, 접근 권한이 필요한 회차는 열람 대상에서 제외한다

이번 단계에서는:

- 구매 여부 검사 안 함
- 읽기 진행도 저장 안 함
- 마지막 읽은 회차 복구 안 함

---

## 라우팅과 식별자

현재 라우트는 `/novel/[id]`, `/viewer/[id]`를 사용하므로 이번 단계에서는 이 구조를 유지한다.

- `[id]`에는 `novels.id`를 사용한다
- 추가 파라미터 `episode`는 `episode_number`를 사용한다

`slug`는 repository 내부 캐시와 후속 웹/서재 연동을 위해 함께 보존하지만, 모바일 1차 전환에서는 화면 라우트의 기본 식별자로 쓰지 않는다.

---

## 오류 처리

모든 화면은 다음 세 상태를 공통 처리한다.

1. 로딩 중
2. 빈 결과
3. 네트워크/쿼리 실패

표시 원칙:

- 홈/검색은 실패 시 재시도 가능한 안내 문구를 보여준다
- 상세/뷰어는 대상을 찾지 못한 경우와 네트워크 실패를 구분한다
- 공개 데이터가 비어 있더라도 앱이 빈 화면으로 멈추지 않게 한다

이번 단계에서는 mock fallback으로 되돌아가지 않는다.  
실패는 실패로 보여주고, 원인을 감추지 않는다.

---

## 테스트 전략

### 단위 테스트

- mapper가 Supabase row를 `Novel` / `Episode`로 올바르게 변환하는지
- sale percent 계산이 올바른지
- 공개 회차만 필터링되는지
- 최근 업데이트 / 인기 / 할인 섹션 분류가 의도대로 되는지

### 화면 테스트

- 홈이 repository 결과를 렌더링하는지
- 검색이 query와 tag 필터를 함께 적용하는지
- 상세가 공개 회차 목록을 보여주는지
- 뷰어가 이전화/다음화 이동 상태를 올바르게 계산하는지

### 제외 검증

이번 단계에서는 다음을 테스트 범위에 넣지 않는다.

- 구매 차단
- 서재 상태
- 읽기 진행도 저장
- 개인화 이어읽기

---

## 구현 순서

1. reader repository / mapper / 타입 추가
2. repository 단위 테스트 추가
3. 홈 / 검색을 repository 기반으로 전환
4. 상세 / 뷰어를 repository 기반으로 전환
5. 화면 테스트 갱신

---

## 성공 기준

다음이 만족되면 이번 단계는 완료로 본다.

1. `HomeScreen`, `SearchScreen`, `NovelDetailScreen`, `NovelViewerScreen`이 더 이상 `mockInkroad`를 직접 읽지 않는다
2. 공개 작품과 공개 회차가 Supabase에서 실제로 렌더링된다
3. 작품 상세에서 첫 화 진입과 회차 목록 진입이 동작한다
4. 뷰어에서 실제 본문과 이전화/다음화 이동이 동작한다
5. 유료 구매, 서재, 진행도 저장은 명시적으로 다음 단계로 남아 있다
