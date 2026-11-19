#!/usr/bin/env bash
# Kept for older notes: the full setup (voice, browser, ffmpeg check, Desktop shortcut) is now
#   npm run setup
set -euo pipefail
cd "$(dirname "$0")/.." && npm run setup
