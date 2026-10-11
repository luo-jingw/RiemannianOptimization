"""Combines the rendered video, the mixed audio and the bilingual SRT into a versioned deliverable."""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from rvideo.audio.mix_profile import MixProfile
from rvideo.paths import ProjectPaths
from rvideo.schema.series import SeriesManifest
from rvideo.schema.timeline import Timeline

TARGET_TP = -1.5
TARGET_LRA = 11.0


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def _run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"{cmd[0]} exit {proc.returncode}: {proc.stderr.strip()[-2000:]}")
    return proc


@dataclass(frozen=True)
class LoudnessMeasurement:
    input_i: float
    input_tp: float
    input_lra: float
    input_thresh: float
    target_offset: float


class Muxer:
    """Owns output/<eid>/v<N>/. Refuses to overwrite an existing version."""

    def __init__(self, paths: ProjectPaths) -> None:
        self._paths = paths

    def _measure(self, wav: Path, target_lufs: float) -> LoudnessMeasurement:
        proc = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(wav), "-af",
                               f"loudnorm=I={target_lufs}:TP={TARGET_TP}:LRA={TARGET_LRA}:print_format=json",
                               "-f", "null", "-"], capture_output=True, text=True, check=True)
        data = json.loads(re.findall(r"\{[^{}]*\}", proc.stderr)[-1])
        return LoudnessMeasurement(input_i=float(data["input_i"]), input_tp=float(data["input_tp"]),
                                   input_lra=float(data["input_lra"]), input_thresh=float(data["input_thresh"]),
                                   target_offset=float(data["target_offset"]))

    def mux(self, episode: str, version: int) -> dict[str, object]:
        video = self._paths.render_video(episode)
        mix = self._paths.mix_wav(episode)
        srt = self._paths.srt_file(episode)
        timeline = Timeline.load(self._paths.timeline_file(episode))
        for f in (video, mix, srt):
            if not f.exists():
                raise FileNotFoundError(f)
        out_dir = self._paths.output_dir(episode, version)
        if out_dir.exists():
            raise FileExistsError(f"{out_dir} exists; deliver a new version instead of overwriting")
        out_dir.mkdir(parents=True)
        try:
            return self._write(episode, version, out_dir, video, mix, srt, timeline)
        except Exception:
            shutil.rmtree(out_dir)          # never leave a half-written version behind
            raise

    def _write(self, episode: str, version: int, out_dir: Path, video: Path, mix: Path, srt: Path,
               timeline: Timeline) -> dict[str, object]:
        mp4 = out_dir / f"{episode}.en.mp4"
        kind = SeriesManifest.load(self._paths.series_file).episode(episode).kind
        target = MixProfile.for_kind(kind).target_lufs
        m = self._measure(mix, target)
        loudnorm = (f"loudnorm=I={target}:TP={TARGET_TP}:LRA={TARGET_LRA}:measured_I={m.input_i}:"
                    f"measured_TP={m.input_tp}:measured_LRA={m.input_lra}:measured_thresh={m.input_thresh}:"
                    f"offset={m.target_offset}:linear=true,aformat=sample_rates=48000:channel_layouts=stereo")
        _run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(video), "-i", str(mix), "-i", str(srt),
              "-map", "0:v:0", "-map", "1:a:0", "-map", "2:s:0", "-c:v", "copy", "-af", loudnorm, "-c:a", "aac",
              "-b:a", "192k", "-c:s", "mov_text", "-metadata:s:a:0", "language=eng",
              "-metadata:s:s:0", "language=eng", "-metadata:s:s:0", "title=English / 中文",
              "-movflags", "+faststart", str(mp4)])
        (out_dir / f"{episode}.en.srt").write_bytes(srt.read_bytes())
        if kind == "trailer":
            # the title card with every line in, before it fades (s06-title: lines settle by bar 4, fade from bar 6.2)
            title = next(ch for ch in timeline.chapters if ch.music == "trailer-title")
            cover_t = title.start + 5 * (timeline.bar_seconds or 2.0)
        else:
            cover_t = (timeline.chapters[0].start - 1.5) if timeline.chapters else 2.0
        cover = out_dir / "cover.png"
        _run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{cover_t:.3f}", "-i", str(video),
              "-frames:v", "1", str(cover)])
        probe = json.loads(_run(["ffprobe", "-v", "error", "-show_entries",
                                 "stream=index,codec_type,codec_name,width,height,r_frame_rate,duration,sample_rate,channels:format=duration,size",
                                 "-of", "json", str(mp4)]).stdout)
        manifest = {
            "episode": episode, "version": version, "mp4": mp4.name, "mp4_sha256": _sha256(mp4),
            "srt_sha256": _sha256(srt), "cover": cover.name, "cover_time": round(cover_t, 3),
            "timeline_duration": timeline.duration, "loudness_input": m.__dict__,
            "sources": {"video_sha256": _sha256(video), "mix_sha256": _sha256(mix),
                        "timeline_sha256": _sha256(self._paths.timeline_file(episode)),
                        "story_sha256": _sha256(self._paths.story_file(episode))
                        if self._paths.story_file(episode).exists() else None},
            "ffprobe": probe,
        }
        (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
        return {"out": str(out_dir), "duration": probe["format"]["duration"], "size": probe["format"]["size"]}
