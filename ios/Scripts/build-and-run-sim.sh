#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DERIVED_DATA="$ROOT_DIR/.build/DerivedData"
SCHEME="${SCHEME:-InkRoad}"
SIMULATOR_NAME="${SIMULATOR_NAME:-iPhone 16}"
BUNDLE_ID="${BUNDLE_ID:-com.inkroad.app}"

cd "$ROOT_DIR"

tuist generate
xcrun simctl boot "$SIMULATOR_NAME" >/dev/null 2>&1 || true

xcodebuild \
  -project InkRoad.xcodeproj \
  -scheme "$SCHEME" \
  -destination "platform=iOS Simulator,name=$SIMULATOR_NAME" \
  -derivedDataPath "$DERIVED_DATA" \
  build

APP_PATH="$(find "$DERIVED_DATA/Build/Products" -type d -name 'InkRoad.app' -print -quit)"

if [ -z "$APP_PATH" ]; then
  echo "InkRoad.app not found in DerivedData."
  exit 1
fi

xcrun simctl install booted "$APP_PATH"
xcrun simctl launch booted "$BUNDLE_ID"

echo "Launched $BUNDLE_ID on $SIMULATOR_NAME"
