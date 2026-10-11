"""rvideo command line: one subcommand per pipeline module."""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict

import numpy as np
import soundfile as sf

from rvideo.audio.mix_profile import MixProfile
from rvideo.audio.narration_mixer import NarrationMixer
from rvideo.music.music_composer import SAMPLE_RATE as MUSIC_RATE, MusicComposer
from rvideo.narration.kokoro_synthesizer import KokoroSynthesizer
from rvideo.paths import ProjectPaths
from rvideo.schema.pronunciation import PronunciationLexicon
from rvideo.schema.provenance import VoiceProvenance
from rvideo.schema.series import SeriesManifest
from rvideo.schema.story import Story
from rvideo.schema.timeline import Timeline
from rvideo.subtitles.srt_writer import SrtWriter
from rvideo.timing.beat_timeline_builder import BeatTimelineBuilder
from rvideo.timing.timeline_builder import TimelineBuilder, TimelineLayout
from rvideo.validate.content_validator import ContentValidator


def cmd_validate(paths: ProjectPaths, episode: str) -> int:
    report = ContentValidator(paths).validate_episode(episode)
    print(f"[validate] {episode}: scenes={report.scenes} sentences={report.sentences} words={report.words} "
          f"est_minutes={report.estimated_minutes:.1f} errors={len(report.errors)} warnings={len(report.warnings)}")
    for e in report.errors:
        print("  ERROR", e)
    for w in report.warnings:
        print("  warn ", w)
    return 1 if report.errors else 0


def cmd_narrate(paths: ProjectPaths, episode: str) -> int:
    story = Story.load(paths.story_file(episode))
    synth = KokoroSynthesizer(PronunciationLexicon.load(paths.pronunciation_file))
    prov, made, reused = synth.run(story, paths.sentence_dir(episode), paths.provenance_file(episode))
    durations = np.array([s.duration for s in prov.sentences])
    peaks = np.array([s.peak_dbfs for s in prov.sentences])
    print(f"[narrate] {episode}: sentences={len(prov.sentences)} synthesized={made} reused={reused} "
          f"speech_total={durations.sum():.1f}s dur[min/med/max]={durations.min():.2f}/{np.median(durations):.2f}/"
          f"{durations.max():.2f}s peak_max={peaks.max():.1f}dBFS sr={prov.sample_rate} voice={prov.voice}")
    return 0


TRAILER_BPM = 120.0
TRAILER_BEATS_PER_BAR = 4


def _kind(paths: ProjectPaths, episode: str) -> str:
    return SeriesManifest.load(paths.series_file).episode(episode).kind


def cmd_timeline(paths: ProjectPaths, episode: str) -> int:
    story = Story.load(paths.story_file(episode))
    prov = VoiceProvenance.load(paths.provenance_file(episode))
    if _kind(paths, episode) == "trailer":
        timeline = BeatTimelineBuilder(TRAILER_BPM, TRAILER_BEATS_PER_BAR).build(story, prov)
    else:
        timeline = TimelineBuilder(TimelineLayout()).build(story, prov)
    timeline.save(paths.timeline_file(episode))
    print(f"[timeline] {episode}: duration={timeline.duration:.2f}s chapters={len(timeline.chapters)} "
          f"captions={len(timeline.captions)} -> {paths.timeline_file(episode)}")
    return 0


def cmd_subtitles(paths: ProjectPaths, episode: str) -> int:
    timeline = Timeline.load(paths.timeline_file(episode))
    count = SrtWriter().write(timeline, paths.srt_file(episode))
    print(f"[subtitles] {episode}: cues={count} -> {paths.srt_file(episode)}")
    return 0


def cmd_music(paths: ProjectPaths, episode: str) -> int:
    timeline = Timeline.load(paths.timeline_file(episode))
    order = SeriesManifest.load(paths.series_file).episode(episode).order
    music = MusicComposer().compose(timeline, order)
    out = paths.music_wav(episode)
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, music, MUSIC_RATE, subtype="PCM_24")
    print(f"[music] {episode}: order={order} duration={music.shape[0] / MUSIC_RATE:.2f}s "
          f"peak={20 * np.log10(np.abs(music).max()):.1f}dBFS -> {out}")
    return 0


def cmd_mix(paths: ProjectPaths, episode: str) -> int:
    timeline = Timeline.load(paths.timeline_file(episode))
    prov = VoiceProvenance.load(paths.provenance_file(episode))
    mixer = NarrationMixer(MixProfile.for_kind(_kind(paths, episode)).mix)
    narration = mixer.build_narration(timeline, prov, paths.sentence_dir(episode))
    music, sr = sf.read(paths.music_wav(episode), dtype="float64")
    if sr != MUSIC_RATE:
        raise RuntimeError(f"music sample rate {sr} != {MUSIC_RATE}")
    narration, mix, report = mixer.mix(narration, music)
    mixer.save(paths.narration_wav(episode), narration)
    mixer.save(paths.mix_wav(episode), mix)
    print(f"[mix] {episode}: " + json.dumps({k: round(v, 2) for k, v in asdict(report).items()}))
    return 0


def cmd_transcribe(paths: ProjectPaths, episode: str) -> int:
    from rvideo.validate.transcript_checker import TranscriptChecker
    prov = VoiceProvenance.load(paths.provenance_file(episode))
    results = TranscriptChecker().check(prov, paths.sentence_dir(episode))
    out = paths.build_dir(episode) / "qa" / "transcript-check.json"
    TranscriptChecker.save(results, out)
    sims = [r.similarity for r in results]
    print(f"[transcribe] {episode}: sentences={len(results)} similarity[min/mean]={min(sims):.3f}/"
          f"{sum(sims) / len(sims):.3f} below_0.9={sum(1 for x in sims if x < 0.9)} -> {out}")
    for r in sorted(results, key=lambda r: r.similarity)[:12]:
        if r.similarity < 1.0:
            print(f"  {r.similarity:.3f} {r.scene_id}[{r.index}] {r.differing}")
    return 0


def cmd_check(paths: ProjectPaths, episode: str, version: int) -> int:
    from rvideo.delivery.delivery_checker import DeliveryChecker
    r = DeliveryChecker(paths).check(episode, version)
    print(f"[check] {episode} v{version}: video={r.video_duration:.2f}s audio={r.audio_duration:.2f}s "
          f"timeline={r.timeline_duration:.2f}s frames={r.video_frames} {r.width}x{r.height} subs={r.subtitle_stream} "
          f"decode_exit={r.decode_exit} lufs={r.integrated_lufs} peak={r.peak_dbfs} sample_frames={len(r.sample_frames)} "
          f"problems={r.problems}")
    return 1 if r.problems else 0


def cmd_deliver(paths: ProjectPaths, episode: str, version: int, workers: int, port: int) -> int:
    """Full chain for a finished episode: audio -> capture -> mux -> check."""
    import subprocess
    for step in (cmd_validate, cmd_narrate, cmd_timeline, cmd_subtitles, cmd_music, cmd_mix):
        if step(paths, episode):
            return 1
    video = paths.render_video(episode)
    capture = subprocess.run(["npx", "tsx", "render/capture.ts", "--episode", episode, "--out", str(video),
                              "--workers", str(workers), "--port", str(port)], cwd=paths.root / "player")
    if capture.returncode != 0:
        print(f"[deliver] capture failed with exit {capture.returncode}")
        return 1
    if cmd_mux(paths, episode, version):
        return 1
    return cmd_check(paths, episode, version)


def cmd_mux(paths: ProjectPaths, episode: str, version: int) -> int:
    from rvideo.delivery.muxer import Muxer
    result = Muxer(paths).mux(episode, version)
    print(f"[mux] {episode}: " + json.dumps(result, ensure_ascii=False))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="rvideo")
    parser.add_argument("command", choices=["validate", "narrate", "timeline", "subtitles", "music", "mix", "mux", "audio", "transcribe", "check", "deliver"])
    parser.add_argument("episode")
    parser.add_argument("--version", type=int, default=1)
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--port", type=int, default=5300)
    args = parser.parse_args(argv)
    paths = ProjectPaths.discover()
    if args.command == "audio":       # the full audio chain in dependency order
        for step in (cmd_validate, cmd_narrate, cmd_timeline, cmd_subtitles, cmd_music, cmd_mix):
            code = step(paths, args.episode)
            if code:
                return code
        return 0
    if args.command == "check":
        return cmd_check(paths, args.episode, args.version)
    if args.command == "deliver":
        return cmd_deliver(paths, args.episode, args.version, args.workers, args.port)
    if args.command == "transcribe":
        return cmd_transcribe(paths, args.episode)
    if args.command == "mux":
        return cmd_mux(paths, args.episode, args.version)
    table = {"validate": cmd_validate, "narrate": cmd_narrate, "timeline": cmd_timeline,
             "subtitles": cmd_subtitles, "music": cmd_music, "mix": cmd_mix}
    return table[args.command](paths, args.episode)


if __name__ == "__main__":
    sys.exit(main())
