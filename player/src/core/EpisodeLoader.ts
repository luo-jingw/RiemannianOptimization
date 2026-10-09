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
  /** `seriesUrl` is the series manifest to read; the default is the project's content/series.json. */
  async load(episodeId: string, seriesUrl = "/data/content/series.json"): Promise<EpisodeData> {
    const series = await fetchJson<SeriesManifest>(seriesUrl);
    const ordered = [...series.episodes].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((e) => e.id === episodeId);
    if (index < 0) throw new Error(`episode ${episodeId} not in series.json`);
    const timeline = await fetchJson<Timeline>(`/data/build/${episodeId}/en/timeline.json`);
    return {
      series,
      episode: ordered[index],
      next: ordered[index + 1],
      timeline,
      audioUrl: `/data/build/${episodeId}/en/audio/mix.wav`,
    };
  }
}
