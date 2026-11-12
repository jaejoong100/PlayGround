#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$PROJECT_DIR/dist"
PORT="${PORT:-3000}"
: "${OPENCODE_WEB_DIR:?OPENCODE_WEB_DIR must point to worker metadata storage}"

run() { /usr/bin/time -p "$@"; }

cd "$PROJECT_DIR"

# This game is plain static HTML/CSS/JS and has no dependency manifest to install.
run mkdir -p "$DIST_DIR"
run cp index.html style.css game.js game-draw.js game-play.js game-fx.js game-ui.js "$DIST_DIR/"

# Publish the built static directory for the preview controller.
run python3 -c 'import json, os, sys; project, directory, metadata = sys.argv[1:]; os.makedirs(metadata, exist_ok=True); path = os.path.join(metadata, "deployment-output.json"); f = open(path, "w", encoding="utf-8"); json.dump({"project": project, "directory": directory}, f); f.write(chr(10)); f.close()' "$PROJECT_DIR" "$DIST_DIR" "$OPENCODE_WEB_DIR"

# Keep the server in the foreground; the controller owns its persistent tmux session.
run python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$DIST_DIR"
