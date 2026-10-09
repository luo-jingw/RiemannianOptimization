import type { DataSource } from "./DataSource";
import type { Timeline } from "./Timeline";

export interface SeriesEpisode {
  id: string;
  order: number;
  title: string;
  status: string;
}

export interface SeriesManifest {
  title: string;
  episodes: SeriesEpisode[];
}

export interface EpisodeData {
  series: SeriesManifest;
  episode: SeriesEpisode;
  next: SeriesEpisode | undefined;
  timeline: Timeline;
  audioUrl: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export class EpisodeLoader {
  constructor(private readonly source: DataSource) {}

  async series(): Promise<SeriesManifest> {
    return fetchJson<SeriesManifest>(this.source.seriesUrl);
  }

  async load(episodeId: string): Promise<EpisodeData> {
    const series = await this.series();
    const ordered = [...series.episodes].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((e) => e.id === episodeId);
    if (index < 0) throw new Error(`episode ${episodeId} not in series.json`);
    const timeline = await fetchJson<Timeline>(this.source.timelineUrl(episodeId));
    return {
      series,
      episode: ordered[index],
      next: ordered[index + 1],
      timeline,
      audioUrl: this.source.audioUrl(episodeId),
    };
  }
}
