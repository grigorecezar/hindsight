import type { Source } from '../types/Source'

/** Every source the app knows about. Runs ask it which ones to sync. */
export class SourceRegistry {
  constructor(private readonly sources: readonly Source[]) {}

  public all(): readonly Source[] {
    return this.sources
  }

  public configured(): Source[] {
    return this.sources.filter((source) => source.isConfigured())
  }

  public find(id: string): Source | null {
    return this.sources.find((source) => source.id === id) ?? null
  }
}
