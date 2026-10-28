#!/usr/bin/env python3
"""Voiceover for a reel with Kokoro (open-source, offline TTS).

usage: tts.py <job.json> <out.wav>
job.json: {"voice": "am_puck", "speed": 1.1, "duration": 66, "lines": [{"t": 0.3, "say": "..."}]}
Each line starts at its cue time, or right after the previous line if that one
is still talking. Prints the actual start/end of each line as JSON.
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

MODEL_DIR = os.environ.get("BREATH_REELS_TTS", os.path.expanduser("~/.cache/breath-reels/tts"))


def main():
    job = json.load(open(sys.argv[1]))
    kok = Kokoro(os.path.join(MODEL_DIR, "kokoro-v1.0.onnx"), os.path.join(MODEL_DIR, "voices-v1.0.bin"))
    sr = 24000
    out = np.zeros(int((job["duration"] + 1) * sr), dtype=np.float32)
    cursor, timings = 0.0, []
    for line in job["lines"]:
        audio, sr = kok.create(line["say"], voice=job["voice"], speed=job["speed"], lang="en-us")
        audio = trim(audio, sr)
        start = max(line["t"], cursor + 0.12)
        s = int(start * sr)
        e = min(len(out), s + len(audio))
        out[s:e] += audio[: e - s]
        cursor = start + len(audio) / sr
        timings.append({"t": round(start, 2), "end": round(cursor, 2), "say": line["say"]})
    peak = np.abs(out).max() or 1
    out = out / peak * 0.95
    sf.write(sys.argv[2], out[: int(job["duration"] * sr)], sr)
    print(json.dumps(timings))


def trim(a, sr, thresh=0.01):
    idx = np.where(np.abs(a) > thresh)[0]
    if not len(idx):
        return a
    return a[max(0, idx[0] - int(0.02 * sr)): idx[-1] + int(0.08 * sr)]


if __name__ == "__main__":
    main()
