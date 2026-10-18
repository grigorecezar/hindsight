import { z } from 'zod'

/** Shapes the extension sends for list rows and sync windows. */
export const windowSchema = z.object({
  since: z.iso.datetime({ offset: true }),
  until: z.iso.datetime({ offset: true }).nullable(),
  isBackfill: z.boolean(),
})

export const listItemSchema = z.object({
  articleId: z.string().regex(/^\d+$/),
  title: z.string().min(1).max(500),
  url: z.string().max(1000).nullable(),
  rating: z.string().max(40).nullable(),
  authorName: z.string().max(200).nullable(),
  authorSlug: z.string().max(200).nullable(),
  dateText: z.string().max(100).nullable(),
  datetime: z.string().max(100).nullable(),
  tickers: z.array(z.string().max(20)).max(20).optional(),
})
