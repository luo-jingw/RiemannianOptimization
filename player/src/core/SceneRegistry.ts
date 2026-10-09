import type { SceneFactory } from "./Scene";

/** Maps chapter IDs of one episode to scene factories. */
export class SceneRegistry {
  private readonly factories: ReadonlyMap<string, SceneFactory>;

  constructor(entries: Record<string, SceneFactory>) {
    this.factories = new Map(Object.entries(entries));
  }

  has(chapterId: string): boolean {
    return this.factories.has(chapterId);
  }

  create(chapterId: string): SceneFactory | undefined {
    return this.factories.get(chapterId);
  }

  ids(): string[] {
    return [...this.factories.keys()];
  }
}
