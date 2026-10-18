/** A readable stand in until the real name is synced: "Small Cap Connoisseur". */
export function nameFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
