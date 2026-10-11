import type * as THREE from "three";
import type { EpisodeData } from "./EpisodeLoader";
import type { Scene } from "./Scene";
import type { SceneLayers } from "./SceneLayers";
import type { SceneRegistry } from "./SceneRegistry";
import type { TimelineChapter } from "./Timeline";
import { CaptionLayer } from "../layers/CaptionLayer";
import { TitleLayer } from "../layers/TitleLayer";
import { PlaceholderScene } from "./PlaceholderScene";
import { type SectionTransition, TRANSITION_SECONDS } from "./TransitionPass";

/** Seconds of chapter title card before the first sentence; must equal TimelineLayout.chapter_head. */
export const CHAPTER_HEAD = 2.4;

/**
 * Owns the active chapter scene, captions and title cards. renderAt(t) is the only drawing entry:
 * the frame at time t does not depend on previously rendered frames.
 */
export class EpisodeRenderer {
  private active: { chapter: TimelineChapter; scene: Scene } | null = null;
  /** Set while the active scene's preload() is outstanding; renderAt callers await it and redraw. */
  pending: Promise<void> | null = null;
  private readonly captions: CaptionLayer;
  private readonly titles: TitleLayer;

  constructor(private readonly data: EpisodeData, private readonly layers: SceneLayers,
              private readonly registry: SceneRegistry, overlayHost: HTMLElement, nextHref: string | null) {
    this.captions = new CaptionLayer(overlayHost, data.timeline.captions, data.episode.kind === "trailer" ? "shadow" : "boxed");
    this.titles = new TitleLayer(overlayHost, data, CHAPTER_HEAD, nextHref);
  }

  /** Chapter IDs present in the timeline but without a registered scene. */
  missingScenes(): string[] {
    return this.data.timeline.chapters.filter((c) => !this.registry.has(c.id)).map((c) => c.id);
  }

  private chapterAt(t: number): TimelineChapter | null {
    const chapters = this.data.timeline.chapters;
    for (const ch of chapters) if (t >= ch.start && t < ch.end) return ch;
    if (chapters.length && t >= chapters[chapters.length - 1].end) return chapters[chapters.length - 1];
    return null;
  }

  private activate(chapter: TimelineChapter | null): void {
    if (this.active && chapter && this.active.chapter.id === chapter.id) return;
    if (this.active) {
      this.active.scene.teardown(this.layers);
      this.layers.stage.clear();
      this.layers.formulas.clear();
      this.active = null;
    }
    if (!chapter) return;
    const factory = this.registry.create(chapter.id);
    const scene: Scene = factory ? factory() : new PlaceholderScene(chapter);
    this.pending = null;
    scene.setup(this.layers, { duration: chapter.end - chapter.start, sentenceStarts: chapter.sentenceStarts,
      sentenceEnds: chapter.sentenceEnds, beatTimes: chapter.beatTimes });
    this.active = { chapter, scene };
    if (scene.preload) {
      const p = scene.preload().then(() => {
        if (this.pending === p) this.pending = null;
      });
      this.pending = p;
    }
  }

  /**
   * Trailers: the zoom-through around chapter boundaries. In the last TRANSITION_SECONDS of a chapter the picture
   * zooms into the scene's exit point; in the first TRANSITION_SECONDS of the next it zooms out of the entry point.
   * Scenes without the corresponding point have no transition on that side.
   */
  private transitionAt(t: number): SectionTransition | null {
    if (this.data.episode.kind !== "trailer" || !this.active) return null;
    const { chapter, scene } = this.active;
    const chapters = this.data.timeline.chapters;
    const index = chapters.findIndex((c) => c.id === chapter.id);
    const toEnd = chapter.end - t;
    const fromStart = t - chapter.start;
    let u = 0;
    let center: THREE.Vector2 | null = null;
    if (toEnd < TRANSITION_SECONDS && index + 1 < chapters.length && scene.exitPoint) {
      u = 1 - toEnd / TRANSITION_SECONDS;
      center = scene.exitPoint();
    } else if (fromStart < TRANSITION_SECONDS && index > 0 && scene.entryPoint) {
      u = 1 - fromStart / TRANSITION_SECONDS;
      center = scene.entryPoint();
    }
    if (center === null || u <= 0) return null;
    const e = u * u;
    return { center, zoom: 1 + 1.8 * e, blur: 0.3 * e, flash: 0.04 * e * e };
  }

  renderAt(t: number): void {
    const chapter = this.chapterAt(t);
    this.activate(chapter);
    if (this.active) {
      const ch = this.active.chapter;
      this.active.scene.draw({
        localTime: Math.min(t, ch.end) - ch.start,
        duration: ch.end - ch.start,
        sentenceStarts: ch.sentenceStarts,
        sentenceEnds: ch.sentenceEnds,
        beatTimes: ch.beatTimes,
        layers: this.layers,
      });
    }
    this.layers.stage.render(this.transitionAt(t));
    this.captions.update(t);
    this.titles.update(t);
  }
}
