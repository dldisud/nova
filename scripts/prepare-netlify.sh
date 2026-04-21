#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/.netlify-static"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/assets"

# www/ 기본 파일 복사 (베이스)
find "$ROOT_DIR/www" -maxdepth 1 -type f -name "*.html" -exec cp {} "$OUT_DIR/" \;

# 루트 HTML 복사 (루트가 최신본이므로 www/ 덮어씀)
find "$ROOT_DIR" -maxdepth 1 -type f -name "*.html" -exec cp {} "$OUT_DIR/" \;

cp -R "$ROOT_DIR/www/assets/." "$OUT_DIR/assets/"
