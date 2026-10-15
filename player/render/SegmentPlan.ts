import { createHash } from "node:crypto";
import type { SeriesManifest } from "../src/core/EpisodeLoader";
import type { Timeline, TimelineCaption, TimelineChapter } from "../src/core/Timeline";

/** A stretch of the episode whose frames depend only on what its key describes. */
export interface Segment {
  name: string;
  /** Time of the segment's first frame; frame k is drawn at start + k / fps. */
  start: number;
  frames: number;
  key: string;
}

/** Up to `chunkFrames` consecutive frames of one segment: the unit of rendering, retry and caching. */
export interface Chunk {
  segment: string;
  /** Time of the chunk's first frame; frame k is drawn at start + k / fps. */
  start: number;
  frames: number;
  key: string;
}

/** Everything outside the timeline that the pixels of every frame depend on. */
export interface SegmentContext {
  fps: number;
  /** Render settings, Chrome version and shell hash, already combined. */
  commonKey: string;
  series: SeriesManifest;
  episodeId: string;
  /** Module-graph hash of the scene drawn for a chapter id (trailers: of the whole episode under "*"). */
  sceneHash: (chapterId: string) => string;
}

const r4 = (x: number): number => Math.round(x * 1e4) / 1e4;

/**
 * Splits an episode into segments that can be rendered and reused independently.
 * Episodes: the intro card, one segment per chapter, and the outro card (during which the last chapter's scene stays
 * drawn at its end time). Trailers: one segment, because their section transitions cross chapter boundaries.
 * Chapter starts lie on the frame grid (TimelineLayout.fps), so a chapter's frames are sampled at the same local
 * times whatever precedes it.
 */
export class SegmentPlan {
  static build(timeline: Timeline, ctx: SegmentContext): Segment[] {
    const episodes = [...ctx.series.episodes].sort((a, b) => a.order - b.order);
    const index = episodes.findIndex((e) => e.id === ctx.episodeId);
    if (index < 0) throw new Error(`episode ${ctx.episodeId} not in series.json`);
    const episode = episodes[index];
    const next = episodes[index + 1];
    const shown = {
      series: ctx.series.title,
      episode: { title: episode.title, order: episode.order, kind: episode.kind ?? "episode" },
      next: next ? { title: next.title, order: next.order } : null,
    };
    const fps = ctx.fps;
    const frame = (t: number): number => Math.round(t * fps);
    const segment = (name: string, start: number, end: number, content: unknown): Segment => ({
      name,
      start,
      frames: frame(end) - frame(start),
      key: createHash("sha256").update(JSON.stringify([ctx.commonKey, shown, content])).digest("hex"),
    });
    const captionsIn = (start: number, end: number): object[] =>
      timeline.captions.filter((c: TimelineCaption) => c.end > start && c.start < end)
        .map((c) => ({ s: r4(c.start - start), e: r4(c.end - start), text: c.text, zh: c.translation }));
    const chapterContent = (ch: TimelineChapter): object => ({
      id: ch.id, index: ch.index, title: ch.title, duration: r4(ch.end - ch.start),
      sentenceStarts: ch.sentenceStarts, sentenceEnds: ch.sentenceEnds, beatTimes: ch.beatTimes ?? null,
      scene: ctx.sceneHash(ch.id),
    });

    if (shown.episode.kind === "trailer") {
      return [segment("trailer", 0, timeline.duration, {
        kind: "trailer", duration: timeline.duration, chapters: timeline.chapters.map((c) => ({ ...c })),
        captions: captionsIn(0, timeline.duration), scene: ctx.sceneHash("*"),
      })];
    }
    const chapters = timeline.chapters;
    if (!chapters.length) throw new Error("timeline has no chapters");
    const first = chapters[0].start;
    const last = chapters[chapters.length - 1];
    const segments: Segment[] = [segment("intro", 0, first, { kind: "intro", duration: r4(first), captions: captionsIn(0, first) })];
    for (const ch of chapters) {
      segments.push(segment(ch.id, ch.start, ch.end, { kind: "chapter", ...chapterContent(ch), captions: captionsIn(ch.start, ch.end) }));
    }
    segments.push(segment("outro", last.end, timeline.duration, {
      kind: "outro", duration: r4(timeline.duration - last.end), last: chapterContent(last),
      captions: captionsIn(last.end, timeline.duration),
    }));
    const total = segments.reduce((n, s) => n + s.frames, 0);
    if (total !== frame(timeline.duration)) throw new Error(`segments cover ${total} frames, timeline ${frame(timeline.duration)}`);
    return segments.filter((s) => s.frames > 0);
  }

  static chunks(segment: Segment, fps: number, chunkFrames: number): Chunk[] {
    const out: Chunk[] = [];
    for (let k = 0; k < segment.frames; k += chunkFrames) {
      const frames = Math.min(chunkFrames, segment.frames - k);
      out.push({
        segment: segment.name,
        start: segment.start + k / fps,
        frames,
        key: createHash("sha256").update(`${segment.key}:${k}:${frames}`).digest("hex").slice(0, 32),
      });
    }
    return out;
  }
}
