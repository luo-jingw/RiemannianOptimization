/** Where the player reads series, timelines and audio. */
export interface DataSource {
  readonly seriesUrl: string;
  timelineUrl(episodeId: string): string;
  audioUrl(episodeId: string): string;
}

/** Vite dev server: project files served under /data (see vite.config.ts), uncompressed mix. */
export class DevDataSource implements DataSource {
  constructor(readonly seriesUrl: string = "/data/content/series.json") {}

  timelineUrl(episodeId: string): string {
    return `/data/build/${episodeId}/en/timeline.json`;
  }

  audioUrl(episodeId: string): string {
    return `/data/build/${episodeId}/en/audio/mix.wav`;
  }
}

/** Static site built by render/build-site.ts: relative paths, AAC audio taken from the delivered MP4. */
export class StaticDataSource implements DataSource {
  readonly seriesUrl = "data/series.json";

  timelineUrl(episodeId: string): string {
    return `data/${episodeId}/timeline.json`;
  }

  audioUrl(episodeId: string): string {
    return `data/${episodeId}/audio.m4a`;
  }
}
