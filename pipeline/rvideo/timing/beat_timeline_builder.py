"""Timeline on a musical grid with a tempo map (trailers): sections start on bar lines, sentences on their anchor bar.

Each scene declares its tempo as BPM at its first and last beat; beat k of n lasts 60 / bpm(k) seconds with bpm
linear in the beat's midpoint (k + 0.5) / n, so an accelerando or ritardando spreads evenly over the scene.
"""
from __future__ import annotations

from rvideo.schema.provenance import VoiceProvenance
from rvideo.schema.story import Story, StoryScene
from rvideo.schema.timeline import Timeline, TimelineCaption, TimelineChapter

BEATS_PER_BAR = 4
DEFAULT_TEMPO = (120.0, 120.0)
SENTENCE_LEAD_S = 0.08      # narration starts just after the downbeat
MIN_GAP_S = 0.25            # required silence before the next anchor


def scene_beat_times(scene: StoryScene) -> list[float]:
    """Chapter-relative start of every beat of the scene, followed by the scene's end."""
    if scene.bars is None:
        raise ValueError(f"{scene.id}: trailer scene has no bars")
    b0, b1 = scene.tempo if scene.tempo is not None else DEFAULT_TEMPO
    n = scene.bars * BEATS_PER_BAR
    times = [0.0]
    for k in range(n):
        bpm = b0 + (b1 - b0) * (k + 0.5) / n
        times.append(times[-1] + 60.0 / bpm)
    return times


class BeatTimelineBuilder:
    def build(self, story: Story, provenance: VoiceProvenance) -> Timeline:
        by_key = {(s.scene_id, s.index): s for s in provenance.sentences}
        chapters: list[TimelineChapter] = []
        anchors: list[tuple[str, int, float, float, str, str]] = []   # scene, index, start, end, en, zh
        t = 0.0
        for ci, scene in enumerate(story.scenes):
            beats = scene_beat_times(scene)
            start = t
            end = start + beats[-1]
            starts: list[float] = []
            ends: list[float] = []
            for i, sentence in enumerate(scene.sentences):
                if sentence.bar is None:
                    raise ValueError(f"{scene.id}[{i}]: trailer sentence has no bar anchor")
                audio = by_key.get((scene.id, i))
                if audio is None or audio.text != sentence.en:
                    raise ValueError(f"{scene.id}[{i}]: missing or stale audio")
                s0 = start + beats[sentence.bar * BEATS_PER_BAR] + SENTENCE_LEAD_S
                anchors.append((scene.id, i, s0, s0 + audio.duration, sentence.en, sentence.zh))
                starts.append(round(s0 - start, 4))
                ends.append(round(s0 + audio.duration - start, 4))
            chapters.append(TimelineChapter(id=scene.id, index=ci, start=round(start, 4), end=round(end, 4),
                                            title=scene.title, music=scene.music, sentence_starts=tuple(starts),
                                            sentence_ends=tuple(ends), beat_times=tuple(round(b, 5) for b in beats)))
            t = end
        duration = round(t, 4)
        # Every sentence must finish before the next anchor (or the end), with a short breath.
        for k, (scene_id, i, s0, s1, _, _) in enumerate(anchors):
            limit = anchors[k + 1][2] if k + 1 < len(anchors) else duration
            if s1 + MIN_GAP_S > limit:
                raise ValueError(f"{scene_id}[{i}]: sentence lasts {s1 - s0:.2f} s but its slot is "
                                 f"{limit - s0 - MIN_GAP_S:.2f} s; move the next anchor or shorten the line")
        captions = tuple(TimelineCaption(start=round(s0, 4), end=round(s1, 4), text=en, translation=zh)
                         for _, _, s0, s1, en, zh in anchors)
        return Timeline(language="en", episode=story.episode, duration=duration, chapters=tuple(chapters),
                        captions=captions)
