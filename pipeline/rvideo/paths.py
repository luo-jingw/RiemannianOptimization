"""Project path layout. Every module resolves files through this class."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ProjectPaths:
    root: Path

    @property
    def content(self) -> Path:
        return self.root / "content"

    @property
    def series_file(self) -> Path:
        return self.content / "series.json"

    @property
    def glossary_file(self) -> Path:
        return self.content / "glossary.json"

    @property
    def pronunciation_file(self) -> Path:
        return self.content / "pronunciation.json"

    def episode_content(self, episode_id: str) -> Path:
        return self.content / "episodes" / episode_id

    def story_file(self, episode_id: str) -> Path:
        return self.episode_content(episode_id) / "story.en.json"

    def build_dir(self, episode_id: str, language: str = "en") -> Path:
        return self.root / "build" / episode_id / language

    def sentence_dir(self, episode_id: str) -> Path:
        return self.build_dir(episode_id) / "audio" / "sentences"

    def provenance_file(self, episode_id: str) -> Path:
        return self.build_dir(episode_id) / "voice-provenance.json"

    def timeline_file(self, episode_id: str) -> Path:
        return self.build_dir(episode_id) / "timeline.json"

    def srt_file(self, episode_id: str) -> Path:
        return self.build_dir(episode_id) / "captions.srt"

    def narration_wav(self, episode_id: str) -> Path:
        return self.build_dir(episode_id) / "audio" / "narration.wav"

    def music_wav(self, episode_id: str) -> Path:
        return self.build_dir(episode_id) / "audio" / "music.wav"

    def mix_wav(self, episode_id: str) -> Path:
        return self.build_dir(episode_id) / "audio" / "mix.wav"

    def render_video(self, episode_id: str) -> Path:
        return self.build_dir(episode_id) / "render" / "video.mp4"

    def output_dir(self, episode_id: str, version: int) -> Path:
        return self.root / "output" / episode_id / f"v{version}"

    @staticmethod
    def discover() -> ProjectPaths:
        here = Path(__file__).resolve()
        for parent in here.parents:
            if (parent / "AGENTS.md").exists() and (parent / "content").is_dir():
                return ProjectPaths(root=parent)
        raise FileNotFoundError("project root (AGENTS.md + content/) not found above " + str(here))
