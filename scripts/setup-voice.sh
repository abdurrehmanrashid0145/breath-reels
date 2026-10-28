#!/usr/bin/env bash
# Installs the free Kokoro voice model (~350 MB) used for voiceovers.
set -euo pipefail
DIR="${BREATH_REELS_TTS:-$HOME/.cache/breath-reels/tts}"
mkdir -p "$DIR"
# Homebrew Python refuses global pip installs, so use a venv inside the repo
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ ! -x "$ROOT/.venv/bin/python" ]; then
  PY=$(command -v python3.12 || command -v python3)
  "$PY" -m venv "$ROOT/.venv"
fi
"$ROOT/.venv/bin/pip" install --resume-retries 50 --timeout 60 kokoro-onnx soundfile
BASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f "$DIR/kokoro-v1.0.onnx" ] || curl -L -o "$DIR/kokoro-v1.0.onnx" "$BASE/kokoro-v1.0.onnx"
[ -f "$DIR/voices-v1.0.bin" ] || curl -L -o "$DIR/voices-v1.0.bin" "$BASE/voices-v1.0.bin"
echo "Voice model ready in $DIR"
