"""Platform titles and descriptions (Bilibili, YouTube) from content/publish/episodes.json and the timelines."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

from rvideo.paths import ProjectPaths
from rvideo.schema.series import SeriesManifest
from rvideo.schema.timeline import Timeline


def _stamp(seconds: float) -> str:
    s = int(seconds)
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m}:{sec:02d}"


@dataclass(frozen=True)
class ChapterTitle:
    start: float
    en: str
    zh: str


class PublishMetadataWriter:
    """Writes output/publish/metadata.md."""

    def __init__(self, paths: ProjectPaths) -> None:
        self._paths = paths

    def _zh_chapter_titles(self, episode_id: str) -> dict[str, str]:
        text = (self._paths.episode_content(episode_id) / "storyboard.md").read_text(encoding="utf-8")
        return {m.group(1): m.group(2).strip() for m in re.finditer(r"^### (c\d\d-[a-z0-9-]+) — (.+)$", text, re.M)}

    def _chapters(self, episode_id: str) -> list[ChapterTitle]:
        timeline = Timeline.load(self._paths.timeline_file(episode_id))
        zh = self._zh_chapter_titles(episode_id)
        # YouTube needs the first chapter at 0:00 and every chapter ≥ 10 s, so the 5 s intro joins chapter 1.
        return [ChapterTitle(0.0 if i == 0 else c.start, c.title, zh.get(c.id, c.title))
                for i, c in enumerate(timeline.chapters)]

    def write(self) -> Path:
        meta = json.loads((self._paths.content / "publish" / "episodes.json").read_text(encoding="utf-8"))
        series = SeriesManifest.load(self._paths.series_file)
        s = meta["series"]
        lines: list[str] = [f"# Publishing metadata — {s['zh_title']} / {s['en_title']}", ""]

        # Bilibili, recommended: one video per episode, grouped in a 合集 (collection).
        lines += ["## Bilibili（推荐：每集单独投稿 + 合集）", "", "**合集名称**", "", s["bilibili_collection_title"], "",
                  "**合集简介**", "", s["zh_intro"], ""]
        for ep in meta["episodes"]:
            order = series.episode(ep["id"]).order
            title = s["bilibili_episode_title"].format(order=order, zh=ep["zh"])
            lines += [f"### EP{order}", "", f"**标题**（{len(title)} 字）", "", title, "", "**封面**", "",
                      f"`output/publish/covers/{ep['id']}-bilibili.jpg`（16:10），`{ep['id']}-bilibili-4x3.jpg`（4:3）", "",
                      "**简介**", "", "```", ep["zh_summary"], "",
                      "本系列：拓扑 → 光滑流形 → 反函数定理 → 隐函数与正则水平集 → 切空间与正交群 → 黎曼梯度与 Retraction", "",
                      s["zh_footer"], "```", "", "**标签**", "", "、".join(s["bilibili_tags"]), "",
                      "**视频章节**（编辑页「视频章节」中添加）", "", "```"]
            lines += [f"{_stamp(c.start)} {c.zh}" for c in self._chapters(ep["id"])]
            lines += ["```", ""]

        # Bilibili, alternative: one submission with six parts (one cover only).
        lines += ["## Bilibili（备选：一次投稿，多 P；整个稿件只有一套封面）", "", "**标题**", "", s["bilibili_title"], "",
                  "**封面**", "", "`output/publish/covers/series-bilibili.jpg`（16:10），`series-bilibili-4x3.jpg`（4:3）", "",
                  "**简介**", "", "```", s["zh_intro"], ""]
        for ep in meta["episodes"]:
            lines.append(f"P{series.episode(ep['id']).order} {ep['zh']}：{ep['zh_summary']}")
        lines += ["", s["zh_footer"], "```", "", "**分 P 标题**", ""]
        lines += [f"- P{series.episode(ep['id']).order} {ep['zh']}" for ep in meta["episodes"]]
        lines.append("")

        lines += ["## YouTube（每集单独上传，加入同一播放列表）", "", f"**Playlist**: {s['en_title']}", "",
                  f"**Tags**: {', '.join(s['youtube_tags'])}", ""]
        for ep in meta["episodes"]:
            entry = series.episode(ep["id"])
            title = f"{s['en_title']} · Ep {entry.order}: {entry.title}"
            lines += [f"### Ep {entry.order}", "", "**Title**", "", title[:100], "", "**Thumbnail**", "",
                      f"`output/publish/covers/{ep['id']}-youtube.jpg`", "", "**Description**", "", "```",
                      ep["en_summary"], "", f"{ep['zh']}｜{ep['zh_summary']}", "", "Chapters"]
            lines += [f"{_stamp(c.start)} {c.en}" for c in self._chapters(ep["id"])]
            lines += ["", s["en_footer"], "", "#RiemannianOptimization #DifferentialGeometry #Math", "```", ""]
        out = self._paths.root / "output" / "publish" / "metadata.md"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text("\n".join(lines), encoding="utf-8")
        return out
