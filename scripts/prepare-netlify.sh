#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/.netlify-static"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/assets"

find "$ROOT_DIR" -maxdepth 1 -type f -name "*.html" -exec cp {} "$OUT_DIR/" \;
cp -R "$ROOT_DIR/assets/." "$OUT_DIR/assets/"
