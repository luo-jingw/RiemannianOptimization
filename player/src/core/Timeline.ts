/** Timeline produced by pipeline/rvideo/timing/timeline_builder.py. Seconds, single time origin. */
export interface TimelineCaption {
  start: number;
  end: number;
  text: string;
  translation: string;
}

export interface TimelineChapter {
  id: string;
  index: number;
  start: number;
  end: number;
  title: string;
  music: string;
  sentenceStarts: number[];
  sentenceEnds: number[];
}

export interface Timeline {
  language: "en";
  episode: string;
  duration: number;
  chapters: TimelineChapter[];
  captions: TimelineCaption[];
}
