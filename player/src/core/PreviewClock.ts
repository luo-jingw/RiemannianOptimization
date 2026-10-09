/**
 * Real-time playback clock for the interactive player. The clock owns the playback time
 * (performance.now based), so seeking always moves the live rendering, even when the audio cannot seek
 * (e.g. a static server without HTTP Range support). Audio follows the clock and is re-synced on drift.
 */
const RESYNC_THRESHOLD_S = 0.25;

export class PreviewClock {
  private playing = false;
  private baseTime = 0;        // playback time at the last start/seek
  private baseNow = 0;         // performance.now() at the last start/seek, ms

  constructor(private readonly audio: HTMLAudioElement, private readonly onFrame: (t: number) => void,
              private readonly duration: number) {}

  start(at: number): void {
    this.baseTime = this.clamp(at);
    this.syncAudio(true);
    this.onFrame(this.baseTime);
    const loop = (): void => {
      if (this.playing) {
        const t = this.time;
        if (t >= this.duration) {
          this.pause();
          this.baseTime = this.duration;
        } else {
          this.syncAudio(false);
        }
        this.onFrame(this.time);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(t: number): void {
    this.baseTime = this.clamp(t);
    this.baseNow = performance.now();
    this.syncAudio(true);
    this.onFrame(this.baseTime);
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get time(): number {
    if (!this.playing) return this.baseTime;
    return this.clamp(this.baseTime + (performance.now() - this.baseNow) / 1000);
  }

  private play(): void {
    if (this.baseTime >= this.duration) this.baseTime = 0;
    this.baseNow = performance.now();
    this.playing = true;
    this.syncAudio(true);
    void this.audio.play().catch(() => undefined);
  }

  private pause(): void {
    this.baseTime = this.time;
    this.playing = false;
    this.audio.pause();
  }

  /** Moves the audio to the clock time when forced or when it drifted. */
  private syncAudio(force: boolean): void {
    const t = this.time;
    if (force || Math.abs(this.audio.currentTime - t) > RESYNC_THRESHOLD_S) {
      try {
        this.audio.currentTime = t;
      } catch {
        // audio not seekable yet; the visuals still follow the clock
      }
    }
  }

  private clamp(t: number): number {
    return Math.max(0, Math.min(this.duration, t));
  }
}
