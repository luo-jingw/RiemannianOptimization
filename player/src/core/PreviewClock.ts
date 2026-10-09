/** Real-time playback for preview: drives renderAt from the audio element's clock. */
export class PreviewClock {
  private playing = false;

  constructor(private readonly audio: HTMLAudioElement, private readonly onFrame: (t: number) => void,
              private readonly duration: number) {}

  start(at: number): void {
    this.audio.addEventListener("ended", () => {
      this.playing = false;
    });
    this.audio.currentTime = at;
    this.onFrame(at);
    const loop = (): void => {
      if (this.playing) this.onFrame(this.audio.currentTime);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  toggle(): void {
    if (this.playing) {
      this.audio.pause();
      this.playing = false;
    } else {
      void this.audio.play();
      this.playing = true;
    }
  }

  seek(t: number): void {
    const clamped = Math.max(0, Math.min(this.duration, t));
    this.audio.currentTime = clamped;
    this.onFrame(clamped);
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get time(): number {
    return this.audio.currentTime;
  }
}
