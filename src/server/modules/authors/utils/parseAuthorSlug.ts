import { InvalidAuthorError } from '../errors/InvalidAuthorError'

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,80}$/

/**
 * The author's Seeking Alpha slug from a profile link
 * ("https://seekingalpha.com/author/small-cap-connoisseur/analysis") or the
 * slug itself ("small-cap-connoisseur", "@small-cap-connoisseur").
 */
export function parseAuthorSlug(input: string): string {
  const trimmed = input.trim()
  const fromLink = trimmed.match(/\/author\/([^/?#\s]+)/i)?.[1]
  const slug = (fromLink ?? trimmed.replace(/^@/, '')).toLowerCase()
  if (!SLUG_PATTERN.test(slug)) {
    throw new InvalidAuthorError(input)
  }
  return slug
}
