# InkRoad iOS Starter

InkRoad 웹 서비스 구조를 바탕으로 만든 SwiftUI 스타터 앱입니다.

## 포함된 것

- SwiftUI + Tuist 기반 iPhone / iPad 앱 스캐폴드
- 탭 4개: 홈 / 탐색 / 서재 / MY
- 작품 상세 / 회차 뷰어 흐름
- 목업 데이터 저장소
- 나중에 Supabase로 교체할 수 있는 저장소 프로토콜
- CLI-first 빌드 스크립트

## 현재 상태

- 이 폴더는 **macOS + Xcode 환경에서 생성/빌드**하는 전제를 갖습니다.
- 현재 작업은 Windows 환경에서 스캐폴드만 만든 상태입니다.
- 그래서 이 저장소 안에서는 `tuist`, `swift`, `xcodebuild` 실행 검증까지는 못 했습니다.

## macOS에서 실행하기

### 1) Tuist 설치

```bash
curl -Ls https://install.tuist.io | bash
```

### 2) 프로젝트 생성

```bash
cd ios
tuist generate
```

### 3) 가장 작은 빌드 확인

```bash
xcodebuild \
  -project InkRoad.xcodeproj \
  -scheme InkRoad \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  build
```

### 4) 빌드 + 실행

```bash
./Scripts/build-and-run-sim.sh
```

### 5) 테스트

```bash
./Scripts/test.sh
```

## 기본 검증 목표

- 홈 / 탐색 / 서재 / MY 탭이 뜨는지
- 홈에서 상세로 이동되는지
- 상세에서 회차 뷰어가 열리는지
- MY에서 데모 로그인 / 로그아웃이 되는지
