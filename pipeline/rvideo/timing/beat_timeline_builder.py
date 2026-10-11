"""Timeline on a musical bar grid (trailers): sections start on bar lines, sentences start on their anchor bar."""
from __future__ import annotations

from rvideo.schema.provenance import VoiceProvenance
from rvideo.schema.story import Story
from rvideo.schema.timeline import Timeline, TimelineCaption, TimelineChapter

SENTENCE_LEAD_S = 0.08      # narration starts just after the downbeat
MIN_GAP_S = 0.25            # required silence before the next anchor


class BeatTimelineBuilder:
    def __init__(self, bpm: float, beats_per_bar: int) -> None:
        self.bar_seconds = 60.0 / bpm * beats_per_bar

    def build(self, story: Story, provenance: VoiceProvenance) -> Timeline:
        by_key = {(s.scene_id, s.index): s for s in provenance.sentences}
        bar = self.bar_seconds
        chapters: list[TimelineChapter] = []
        anchors: list[tuple[str, int, float, float, str, str]] = []   # scene, index, start, end, en, zh
        t = 0.0
        for ci, scene in enumerate(story.scenes):
            if scene.bars is None:
                raise ValueError(f"{scene.id}: trailer scene has no bars")
            start = t
            end = start + scene.bars * bar
            starts: list[float] = []
            ends: list[float] = []
            for i, sentence in enumerate(scene.sentences):
                if sentence.bar is None:
                    raise ValueError(f"{scene.id}[{i}]: trailer sentence has no bar anchor")
                audio = by_key.get((scene.id, i))
                if audio is None or audio.text != sentence.en:
                    raise ValueError(f"{scene.id}[{i}]: missing or stale audio")
                s0 = start + sentence.bar * bar + SENTENCE_LEAD_S
                anchors.append((scene.id, i, s0, s0 + audio.duration, sentence.en, sentence.zh))
                starts.append(round(s0 - start, 4))
                ends.append(round(s0 + audio.duration - start, 4))
            chapters.append(TimelineChapter(id=scene.id, index=ci, start=round(start, 4), end=round(end, 4),
                                            title=scene.title, music=scene.music, sentence_starts=tuple(starts),
                                            sentence_ends=tuple(ends)))
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
                        captions=captions, bar_seconds=bar)
