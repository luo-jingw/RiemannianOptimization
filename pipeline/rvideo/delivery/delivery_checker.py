"""Automated checks on a delivered version: streams, durations, full decode, loudness, sample frames."""
from __future__ import annotations

import json
import re
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path

from rvideo.paths import ProjectPaths
from rvideo.schema.timeline import Timeline

DURATION_TOLERANCE_S = 0.2


@dataclass(frozen=True)
class DeliveryReport:
    episode: str
    version: int
    mp4: str
    timeline_duration: float
    video_duration: float
    audio_duration: float
    video_frames: int
    width: int
    height: int
    subtitle_stream: bool
    decode_exit: int
    decode_stderr_bytes: int
    integrated_lufs: float
    peak_dbfs: float
    sample_frames: list[str]
    problems: list[str]


class DeliveryChecker:
    def __init__(self, paths: ProjectPaths) -> None:
        self._paths = paths

    def check(self, episode: str, version: int) -> DeliveryReport:
        out_dir = self._paths.output_dir(episode, version)
        mp4 = out_dir / f"{episode}.en.mp4"
        timeline = Timeline.load(self._paths.timeline_file(episode))
        probe = json.loads(subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,duration,nb_frames", "-of", "json", str(mp4)],
            capture_output=True, text=True, check=True).stdout)
        streams = probe["streams"]
        video = next(s for s in streams if s["codec_type"] == "video")
        audio = next(s for s in streams if s["codec_type"] == "audio")
        has_subs = any(s["codec_type"] == "subtitle" for s in streams)
        decode = subprocess.run(["ffmpeg", "-hide_banner", "-v", "error", "-i", str(mp4), "-map", "0:v", "-map", "0:a",
                                 "-f", "null", "-"], capture_output=True, text=True)
        loud = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(mp4), "-map", "0:a", "-af",
                               "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
        summary = loud[loud.rfind("Summary:"):]
        lufs = float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1))  # type: ignore[union-attr]
        peak = float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary).group(1))  # type: ignore[union-attr]
        frames = self._sample_frames(episode, version, mp4, timeline)
        problems: list[str] = []
        for name, value in (("video", float(video["duration"])), ("audio", float(audio["duration"]))):
            if abs(value - timeline.duration) > DURATION_TOLERANCE_S:
                problems.append(f"{name} duration {value:.2f}s differs from timeline {timeline.duration:.2f}s")
        if decode.returncode != 0 or decode.stderr.strip():
            problems.append(f"decode exit {decode.returncode}: {decode.stderr.strip()[:300]}")
        if not has_subs:
            problems.append("no subtitle stream")
        if (int(video["width"]), int(video["height"])) != (1920, 1080):
            problems.append(f"frame size {video['width']}x{video['height']}")
        report = DeliveryReport(
            episode=episode, version=version, mp4=str(mp4), timeline_duration=timeline.duration,
            video_duration=float(video["duration"]), audio_duration=float(audio["duration"]),
            video_frames=int(video.get("nb_frames", 0)), width=int(video["width"]), height=int(video["height"]),
            subtitle_stream=has_subs, decode_exit=decode.returncode, decode_stderr_bytes=len(decode.stderr),
            integrated_lufs=lufs, peak_dbfs=peak, sample_frames=frames, problems=problems)
        path = self._paths.build_dir(episode) / "qa" / f"delivery-v{version}.json"
        path.write_text(json.dumps(asdict(report), ensure_ascii=False, indent=1), encoding="utf-8")
        return report

    def _sample_frames(self, episode: str, version: int, mp4: Path, timeline: Timeline) -> list[str]:
        """Intro card, each chapter at 55 % of its length, outro card."""
        out = self._paths.build_dir(episode) / "qa" / f"delivery-v{version}-frames"
        out.mkdir(parents=True, exist_ok=True)
        times = [2.5] + [c.start + 0.55 * (c.end - c.start) for c in timeline.chapters] + [timeline.duration - 2.0]
        files: list[str] = []
        for t in times:
            f = out / f"t{t:08.2f}.png"
            subprocess.run(["ffmpeg", "-hide_banner", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(mp4),
                            "-frames:v", "1", str(f)], check=True)
            files.append(str(f))
        return files
