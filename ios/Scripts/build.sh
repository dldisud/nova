#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DERIVED_DATA="$ROOT_DIR/.build/DerivedData"
SCHEME="${SCHEME:-InkRoad}"
SIMULATOR_NAME="${SIMULATOR_NAME:-iPhone 16}"

cd "$ROOT_DIR"

tuist generate

xcodebuild \
  -project InkRoad.xcodeproj \
  -scheme "$SCHEME" \
  -destination "platform=iOS Simulator,name=$SIMULATOR_NAME" \
  -derivedDataPath "$DERIVED_DATA" \
  build

echo "Build finished for scheme: $SCHEME"
