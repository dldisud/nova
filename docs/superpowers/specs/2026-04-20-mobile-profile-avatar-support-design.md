# 모바일 프로필 아바타와 앱 내 문의 설계 문서

**날짜**: 2026-04-20  
**범위**: `/home/ciel/nova/inkroad-app` 내부 Expo 앱의 `ProfileScreen`에서 아바타 업로드와 앱 내 문의 기능 추가  
**제외 범위**: 언어 설정, 결제/코인, 계정 삭제, 서재 액션, `mob/` 웹 목업  
**원칙**: 이미 연결된 모바일 `ProfileScreen` 흐름을 유지하면서, 아바타는 Supabase Storage에 올리고 문의는 앱 내 폼으로 접수한 뒤 관리자에게 즉시 알림을 보낸다

---

## 목표

이번 단계의 목표는 `ProfileScreen`을 “기본 설정 화면”에서 “프로필 이미지 변경 + 고객 문의 접수”가 가능한 실제 계정 관리 화면으로 확장하는 것이다.

대상 기능:

1. 사용자가 앱 안에서 프로필 아바타 이미지를 선택하고 업로드
2. 업로드된 이미지 URL을 `profiles.avatar_url`에 저장하고 즉시 반영
3. 사용자가 앱 내 문의 폼으로 고객센터 문의를 제출
4. 문의 내용을 Supabase에 저장
5. 저장 직후 관리자 `rimuru2178@gmail.com`에게 즉시 이메일 알림

이번 단계는 “모바일에서 프로필 이미지와 고객 문의를 실제 백엔드와 연결하는 것”이 목표이며, 언어 설정과 결제 시스템은 포함하지 않는다.

---

## 현재 상태 요약

현재 레포 기준으로 확인된 전제는 다음과 같다.

- `profiles.avatar_url` 컬럼은 이미 존재한다
- 모바일 `ProfileScreen`은 `profiles` 읽기와 기본 설정 저장 흐름을 이미 사용 중이다
- `expo-image-picker`는 아직 `inkroad-app/package.json`에 없다
- `supabase/functions` 디렉터리는 아직 없다
- 모바일 앱 코드에는 Supabase Storage 업로드나 `supabase.functions.invoke()` 사용 예가 아직 없다

즉, 이번 작업은 기존 화면 위에 얹는 확장 작업이지만, 이미지 선택기와 Supabase 함수는 신규 추가가 필요하다.

---

## 제안한 접근과 선택

### 접근안 A. Supabase Storage + `support_tickets` + Supabase Edge Function

- 아바타는 Supabase Storage bucket에 업로드
- 문의는 `support_tickets` 테이블에 저장
- 저장 직후 Edge Function이 관리자 이메일로 알림 발송
- 장점: 모바일 앱에 메일 비밀키를 두지 않아 안전하다
- 단점: Supabase Storage와 Edge Function 설정이 새로 필요하다

### 접근안 B. 앱에서 직접 메일 API 호출

- 모바일 앱이 문의 저장과 메일 발송을 직접 처리
- 장점: 구조가 단순해 보인다
- 단점: 메일 서비스 비밀값이 앱 쪽에 노출되기 쉬워 보안상 좋지 않다

### 접근안 C. 문의 저장 후 외부 webhook 서비스로 전달

- DB 저장 후 Make, Apps Script 같은 외부 서비스로 알림 위임
- 장점: 메일 발송을 빨리 붙일 수 있다
- 단점: 레포 밖 운영 의존성이 늘고, 추적이 어려워진다

### 선택

**접근안 A. Supabase Storage + `support_tickets` + Supabase Edge Function**을 채택한다.

이유:

- 이미 모바일 데이터가 Supabase를 기준으로 움직이고 있어서 경로 일관성이 좋다
- 메일 발송 비밀값을 모바일 앱이 직접 알 필요가 없다
- 문의 저장 성공과 관리자 알림 실패를 분리해 다루기 쉽다

---

## 아키텍처

### 모바일 앱

`ProfileScreen`은 다음 두 흐름을 추가로 갖는다.

- 아바타 변경
  - 이미지 선택
  - 업로드 진행 상태 표시
  - 업로드 성공 시 프로필 카드 즉시 갱신
- 고객센터 문의
  - 앱 내 문의 폼 열기
  - 제목/카테고리/내용 입력
  - 제출 진행 상태 표시
  - 접수 성공/알림 실패 상태 분리 표시

화면은 직접 Supabase Storage나 Edge Function을 세세하게 다루지 않고, account repository의 새 메서드를 호출한다.

### 모바일 repository 계층

`inkroad-app/src/mobile/reader/accountRepository.ts`를 확장해 다음 책임을 추가한다.

- 아바타 파일 업로드
- 업로드된 퍼블릭 URL 또는 서명 URL 계산
- `profiles.avatar_url` 갱신
- `support_tickets` 행 생성
- Edge Function 호출로 관리자 알림 트리거

### Supabase 백엔드

신규 구성:

- Storage bucket: `profile-avatars`
- 신규 테이블: `support_tickets`
- 신규 Edge Function: `notify-support-ticket`

문의 처리 흐름:

1. 모바일 앱이 `support_tickets`에 문의를 저장
2. 저장 성공 후 Edge Function 호출
3. Edge Function이 관리자 `rimuru2178@gmail.com`으로 메일 발송
4. 메일 발송 성공 여부를 앱에 결과로 반환

---

## 데이터 계약

### 프로필 아바타

기존 `profiles` 테이블의 다음 필드를 사용한다.

- `profiles.id`
- `profiles.avatar_url`
- `profiles.display_name`
- `profiles.role`
- `profiles.marketing_opt_in`

### 신규 문의 테이블

`support_tickets` 테이블은 다음 필드를 가진다.

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `email text not null`
- `category text not null`
- `subject text not null`
- `message text not null`
- `status text not null default 'open'`
- `created_at timestamptz not null`

기본 카테고리:

- `account`
- `payment`
- `content`
- `bug`
- `other`

### Edge Function 입력

`notify-support-ticket`는 다음 payload를 받는다.

- `ticketId`
- `email`
- `category`
- `subject`
- `message`
- `userId`

함수는 이 payload를 이용해 관리자 메일을 생성한다.

---

## 화면 동작

### 아바타 업로드

로그인된 사용자는 프로필 카드에서 다음을 볼 수 있다.

- `avatar_url`이 있으면 원형 이미지 표시
- 없으면 기존처럼 이니셜 표시
- “아바타 변경” 액션 버튼

업로드 흐름:

1. 사용자가 “아바타 변경”을 누른다
2. 이미지 선택기에서 기기 사진을 고른다
3. 업로드 중에는 버튼을 비활성화하고 상태를 보여 준다
4. 업로드 성공 시:
   - `profiles.avatar_url` 갱신
   - 프로필 카드 이미지 즉시 반영
   - 성공 메시지 표시
5. 업로드 실패 시:
   - 기존 아바타 유지
   - 실패 메시지 표시

이번 단계에서는 이미지 자르기/회전 편집기는 포함하지 않는다.

### 앱 내 문의

`고객센터` 메뉴는 더 이상 placeholder alert이 아니라 앱 내 문의 폼을 연다.

폼 구성:

- 문의 카테고리 선택
- 제목 입력
- 문의 내용 입력
- 제출 버튼

문의 제출 흐름:

1. 사용자가 폼을 작성해 제출
2. 필수값 검증 후 `support_tickets`에 저장
3. 저장 성공 후 `notify-support-ticket` 호출
4. 결과에 따라 사용자에게 상태 표시

결과 분기:

- 저장 성공 + 메일 성공
  - “문의가 접수되었고 관리자에게 전달되었습니다.”
- 저장 성공 + 메일 실패
  - “문의는 접수되었지만 관리자 알림이 지연될 수 있습니다.”
- 저장 실패
  - “문의 접수에 실패했습니다. 잠시 후 다시 시도해 주세요.”

---

## 오류 처리

이번 단계는 아바타와 문의를 각각 독립적으로 실패 처리한다.

### 아바타

- 권한 거부
- 이미지 선택 취소
- 업로드 실패
- 프로필 URL 저장 실패

권한 거부나 취소는 조용히 종료할 수 있지만, 업로드/저장 실패는 명시적으로 메시지를 보여 준다.

### 문의

- 입력 검증 실패
- DB 저장 실패
- 관리자 메일 발송 실패

중요 원칙:

- DB 저장이 실패하면 문의는 접수되지 않은 것으로 본다
- DB 저장이 성공하고 메일만 실패하면 문의는 접수된 것으로 본다

---

## 보안과 운영 원칙

- 메일 발송 비밀값은 모바일 앱에 두지 않는다
- 관리자 이메일 주소는 Edge Function 쪽 환경변수로 관리하는 것을 기본으로 한다
- 앱은 Function endpoint만 호출한다
- Storage bucket은 사용자 본인만 자신의 아바타를 업로드할 수 있게 제한한다
- `support_tickets`는 본인 문의만 insert/select 가능한 정책을 둔다

---

## 테스트 전략

이번 단계도 테스트를 먼저 작성하고 구현한다.

필수 테스트:

1. account repository가 아바타 URL 갱신 결과를 반환하는지
2. account repository가 문의 저장 후 함수 호출을 시도하는지
3. 함수 실패 시에도 문의 저장 성공 결과를 유지하는지
4. `ProfileScreen`이 아바타 업로드 액션을 렌더링하는지
5. `ProfileScreen`이 문의 폼을 열고 제출 성공 메시지를 보여 주는지
6. 문의 저장 실패와 메일 실패를 다른 메시지로 보여 주는지

백엔드 검증:

- migration이 `support_tickets`와 RLS를 올바르게 추가하는지
- Edge Function이 입력 payload를 받아 관리자 이메일 발송 로직을 수행하는지

---

## 구현 순서

1. `expo-image-picker` 의존성 추가
2. `support_tickets` 테이블과 RLS migration 작성
3. Storage bucket과 접근 정책 정의
4. `notify-support-ticket` Edge Function 추가
5. account repository에 아바타 업로드/문의 제출 메서드 추가
6. `ProfileScreen`에 아바타 변경과 앱 내 문의 UI 추가
7. 테스트와 회귀 검증 실행

---

## 비범위와 후속 작업

이번 단계에서 일부러 하지 않는 작업:

- 언어 설정 저장
- 문의 답변 목록 조회
- 관리자용 문의 처리 대시보드
- 아바타 편집기
- 푸시 알림 전송

후속 단계는 다음 순서가 자연스럽다.

1. 언어 설정을 로컬 또는 계정 단위로 설계
2. 관리자 문의 처리 화면 추가
3. 문의 답변과 상태 변경 기능 추가
