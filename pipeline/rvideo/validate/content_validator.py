"""Static checks on content files. Reports observations; errors block the build."""
from __future__ import annotations

from dataclasses import dataclass, field

from rvideo.paths import ProjectPaths
from rvideo.schema.glossary import Glossary
from rvideo.schema.series import SeriesManifest
from rvideo.schema.story import EPISODE_MUSIC, TRAILER_MUSIC, Story, StoryScene

EN_CAPTION_MAX_CHARS = 150   # beyond this an English caption needs 3 lines at the burned-in font size
ZH_CAPTION_MAX_CHARS = 60


@dataclass
class ValidationReport:
    episode: str
    scenes: int = 0
    sentences: int = 0
    words: int = 0
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def estimated_minutes(self) -> float:
        return self.words / 150.0


class ContentValidator:
    def __init__(self, paths: ProjectPaths) -> None:
        self._paths = paths

    def validate_episode(self, episode_id: str) -> ValidationReport:
        report = ValidationReport(episode=episode_id)
        series = SeriesManifest.load(self._paths.series_file)
        glossary_ids = Glossary.load(self._paths.glossary_file).ids()
        kind = "episode"
        try:
            kind = series.episode(episode_id).kind
        except KeyError as exc:
            report.errors.append(str(exc))
        story_path = self._paths.story_file(episode_id)
        if not story_path.exists():
            report.errors.append(f"missing {story_path}")
            return report

        story = Story.load(story_path)
        if story.episode != episode_id:
            report.errors.append(f"story.episode {story.episode!r} != {episode_id!r}")
        seen: set[str] = set()
        for scene in story.scenes:
            report.scenes += 1
            if scene.id in seen:
                report.errors.append(f"duplicate scene id {scene.id}")
            seen.add(scene.id)
            if not scene.sentences and kind != "trailer":      # trailer sections may be music only
                report.errors.append(f"{scene.id}: no sentences")
            report.errors.extend(self._kind_errors(kind, scene))
            for term in scene.terms:
                if term not in glossary_ids:
                    report.errors.append(f"{scene.id}: unknown glossary term {term!r}")
            for i, s in enumerate(scene.sentences):
                report.sentences += 1
                report.words += len(s.en.split())
                if not s.en.strip() or not s.zh.strip():
                    report.errors.append(f"{scene.id}[{i}]: empty en or zh")
                if len(s.en) > EN_CAPTION_MAX_CHARS:
                    report.warnings.append(f"{scene.id}[{i}]: en {len(s.en)} chars > {EN_CAPTION_MAX_CHARS}")
                if len(s.zh) > ZH_CAPTION_MAX_CHARS:
                    report.warnings.append(f"{scene.id}[{i}]: zh {len(s.zh)} chars > {ZH_CAPTION_MAX_CHARS}")
        return report

    @staticmethod
    def _kind_errors(kind: str, scene: StoryScene) -> list[str]:
        """Trailers need bar lengths and bar anchors; episodes must not use them."""
        errors: list[str] = []
        if kind == "trailer":
            if scene.music not in TRAILER_MUSIC:
                errors.append(f"{scene.id}: trailer scene needs a trailer-* music category, got {scene.music!r}")
            if scene.bars is None or scene.bars <= 0:
                errors.append(f"{scene.id}: trailer scene needs bars > 0")
            previous = -1
            for i, s in enumerate(scene.sentences):
                if s.bar is None:
                    errors.append(f"{scene.id}[{i}]: trailer sentence needs a bar anchor")
                    continue
                if scene.bars is not None and not 0 <= s.bar < scene.bars:
                    errors.append(f"{scene.id}[{i}]: bar {s.bar} outside the scene's {scene.bars} bars")
                if s.bar <= previous:
                    errors.append(f"{scene.id}[{i}]: bar anchors must increase")
                previous = s.bar
        else:
            if scene.music not in EPISODE_MUSIC:
                errors.append(f"{scene.id}: episode scene uses trailer music {scene.music!r}")
            if scene.bars is not None or any(s.bar is not None for s in scene.sentences):
                errors.append(f"{scene.id}: bars / bar anchors are only for trailers")
        return errors
