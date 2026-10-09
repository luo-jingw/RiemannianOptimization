"""Builds the episode timeline from measured sentence durations."""
from __future__ import annotations

from dataclasses import dataclass

from rvideo.schema.provenance import VoiceProvenance
from rvideo.schema.story import Story
from rvideo.schema.timeline import Timeline, TimelineCaption, TimelineChapter


@dataclass(frozen=True)
class TimelineLayout:
    """Explicit silences, in seconds."""
    episode_intro: float = 5.0      # title card before the first chapter
    chapter_head: float = 2.4       # chapter title card before its first sentence
    sentence_gap: float = 0.45      # pause between sentences
    chapter_tail: float = 1.6       # hold after a chapter's last sentence
    episode_outro: float = 5.0      # end card after the last chapter


class TimelineBuilder:
    def __init__(self, layout: TimelineLayout) -> None:
        self._layout = layout

    def build(self, story: Story, provenance: VoiceProvenance) -> Timeline:
        by_key = {(s.scene_id, s.index): s for s in provenance.sentences}
        lay = self._layout
        t = lay.episode_intro
        chapters: list[TimelineChapter] = []
        captions: list[TimelineCaption] = []
        for ci, scene in enumerate(story.scenes):
            chapter_start = t
            t += lay.chapter_head
            starts: list[float] = []
            ends: list[float] = []
            for ti, sentence in enumerate(scene.sentences):
                audio = by_key.get((scene.id, ti))
                if audio is None:
                    raise KeyError(f"no audio for {scene.id} sentence {ti}")
                if audio.text != sentence.en:
                    raise ValueError(f"stale audio for {scene.id} sentence {ti}: provenance text differs from story")
                start = t
                end = t + audio.duration
                starts.append(round(start - chapter_start, 4))
                ends.append(round(end - chapter_start, 4))
                captions.append(TimelineCaption(start=round(start, 4), end=round(end, 4), text=sentence.en,
                                                translation=sentence.zh))
                t = end + (lay.sentence_gap if ti + 1 < len(scene.sentences) else 0.0)
            t += lay.chapter_tail
            chapters.append(TimelineChapter(id=scene.id, index=ci, start=round(chapter_start, 4), end=round(t, 4),
                                            title=scene.title, music=scene.music, sentence_starts=tuple(starts),
                                            sentence_ends=tuple(ends)))
        duration = round(t + lay.episode_outro, 4)
        return Timeline(language="en", episode=story.episode, duration=duration, chapters=tuple(chapters),
                        captions=tuple(captions))
