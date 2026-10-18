/** How an author's calls have done, and the weight that earns them. */
export interface AuthorTrackRecord {
  authorId: string
  authorName: string
  authorSlug: string | null
  authorUrl: string | null
  source: string
  callCount: number
  companyCount: number
  lastCallAt: Date
  // Calls whose primary horizon has passed.
  scoredCount: number
  hitRate: number | null
  // Average excess return in the direction of the call (sells count inverted).
  meanEdge: number | null
  // The edge shrunk toward zero for authors with few scored calls.
  skill: number
  weight: number
}
