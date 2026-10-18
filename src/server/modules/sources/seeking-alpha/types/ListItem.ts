/**
 * One row of a ticker's analysis list, read off the page by the extension.
 * Everything is the page's own text; Hindsight does the interpreting.
 */
export interface ListItem {
  articleId: string
  title: string
  url: string | null
  // The badge text, "STRONG BUY" to "STRONG SELL", or null for none.
  rating: string | null
  authorName: string | null
  authorSlug: string | null
  // "Fri, Oct 16", "Yesterday", "3 hours ago"...
  dateText: string | null
  // A machine readable timestamp, when the page has one.
  datetime: string | null
  // Tickers linked from the row, primary first. On an author's list this is
  // what the rating is about.
  tickers?: string[]
}
