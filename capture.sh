#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${CAPTURE_URL:?CAPTURE_URL must be the exact preview URL}"
: "${CAPTURE_DIR:?CAPTURE_DIR must point to capture evidence storage}"

run() { /usr/bin/time -p "$@"; }

run mkdir -p "$CAPTURE_DIR"
run node "$PROJECT_DIR/capture.mjs"
