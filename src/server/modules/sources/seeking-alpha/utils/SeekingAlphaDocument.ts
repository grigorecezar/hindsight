import type { SourceAuthor } from '../../types/SourceAuthor'
import type { JsonApiDocument } from '../types/JsonApiDocument'
import type { JsonApiIdentifier } from '../types/JsonApiIdentifier'
import type { JsonApiResource } from '../types/JsonApiResource'

/**
 * Read access to one Seeking Alpha JSON:API document: its articles, and the
 * tickers, authors and sentiments each article points at through `included`.
 *
 * Field names have drifted between Seeking Alpha surfaces, so every reader
 * tries the known spellings in turn instead of trusting one.
 */
export class SeekingAlphaDocument {
  private static readonly SITE_URL = 'https://seekingalpha.com'
  private static readonly SENTIMENT_TYPE = 'sentiment'

  private readonly includedByKey: Map<string, JsonApiResource>
  private readonly sentimentsByArticleId: Map<string, JsonApiResource[]>

  constructor(private readonly document: JsonApiDocument) {
    const included = document.included ?? []
    this.includedByKey = new Map(
      included.map((resource) => [this.keyOf(resource), resource]),
    )
    this.sentimentsByArticleId = this.indexSentiments(included)
  }

  public static from(value: unknown): SeekingAlphaDocument {
    const isObject = typeof value === 'object' && value !== null
    return new SeekingAlphaDocument(isObject ? (value as JsonApiDocument) : {})
  }

  public articles(): JsonApiResource[] {
    const data = this.document.data
    if (!data) {
      return []
    }
    return Array.isArray(data) ? data : [data]
  }

  /** Whether this document carries ratings at all. */
  public hasRatingData(): boolean {
    if (this.sentimentsByArticleId.size > 0) {
      return true
    }
    return this.articles().some(
      (article) => article.relationships?.sentiments !== undefined,
    )
  }

  public publishedAt(article: JsonApiResource): Date | null {
    const attributes = article.attributes ?? {}
    const value =
      attributes.publishOn ?? attributes.publishedAt ?? attributes.createdAt
    return this.toDate(value)
  }

  public title(article: JsonApiResource): string | null {
    const title = article.attributes?.title
    return typeof title === 'string' ? title : null
  }

  public url(article: JsonApiResource): string {
    const self = article.links?.self
    if (typeof self === 'string' && self.startsWith('/')) {
      return `${SeekingAlphaDocument.SITE_URL}${self}`
    }
    if (typeof self === 'string' && self.startsWith('http')) {
      return self
    }
    return `${SeekingAlphaDocument.SITE_URL}/article/${article.id}`
  }

  /**
   * Slugs of the tickers an article is primarily about, or null when the
   * document does not say (then the caller trusts the ticker it asked for).
   */
  public primaryTickerSlugs(article: JsonApiResource): string[] | null {
    const identifiers = this.relatedIdentifiers(article, 'primaryTickers')
    if (identifiers === null) {
      return null
    }

    // Tags missing from `included` tell us nothing, so they count as unknown.
    const slugs = identifiers
      .map((identifier) => this.resolve(identifier)?.attributes?.slug)
      .filter((slug): slug is string => typeof slug === 'string')
      .map((slug) => slug.toLowerCase())
    return slugs.length > 0 ? slugs : null
  }

  /**
   * The sentiment an article gives one ticker. An article that rates several
   * tickers tags each sentiment; an untagged one belongs to the article.
   */
  public sentimentFor(
    article: JsonApiResource,
    tickerSlug: string,
  ): JsonApiResource | null {
    const sentiments = this.sentimentsOf(article)
    const tagIds = this.tagIdsForSlug(article, tickerSlug)

    const tagged = sentiments.find((sentiment) =>
      tagIds.has(this.sentimentTagId(sentiment) ?? ''),
    )
    if (tagged) {
      return tagged
    }

    const untagged = sentiments.find(
      (sentiment) => this.sentimentTagId(sentiment) === null,
    )
    if (untagged) {
      return untagged
    }

    // Tags we cannot resolve against the article: a lone sentiment is its.
    const isLoneUnresolved = tagIds.size === 0 && sentiments.length === 1
    return isLoneUnresolved ? sentiments[0] : null
  }

  /**
   * Whether an article has a rating we cannot read: it points at sentiments
   * but none of them carries a type. That is what a logged out or non
   * Premium request gets back.
   */
  public hasLockedSentiment(article: JsonApiResource): boolean {
    const references = this.relatedIdentifiers(article, 'sentiments') ?? []
    if (references.length === 0) {
      return false
    }
    return !this.sentimentsOf(article).some(
      (sentiment) => typeof sentiment.attributes?.type === 'string',
    )
  }

  public author(article: JsonApiResource): SourceAuthor | null {
    // The feed and the analysis list name the relationship differently.
    const identifier = ['author', 'authors', 'user']
      .map((name) => this.relatedIdentifiers(article, name)?.[0])
      .find(Boolean)
    const author = identifier ? this.resolve(identifier) : undefined
    if (!author) {
      return null
    }

    const attributes = author.attributes ?? {}
    const name = [
      attributes.nick,
      attributes.name,
      attributes.displayName,
      attributes.slug,
    ].find((value): value is string => typeof value === 'string' && !!value)
    if (!name) {
      return null
    }

    const slug = typeof attributes.slug === 'string' ? attributes.slug : null
    return {
      externalId: String(author.id),
      name,
      url: slug ? `${SeekingAlphaDocument.SITE_URL}/author/${slug}` : null,
    }
  }

  private sentimentsOf(article: JsonApiResource): JsonApiResource[] {
    const fromRelationship = (
      this.relatedIdentifiers(article, 'sentiments') ?? []
    )
      .map((identifier) => this.resolve(identifier))
      .filter((resource): resource is JsonApiResource => !!resource)
    const fromArticleId =
      this.sentimentsByArticleId.get(String(article.id)) ?? []

    const unique = new Map<string, JsonApiResource>()
    for (const sentiment of [...fromRelationship, ...fromArticleId]) {
      unique.set(this.keyOf(sentiment), sentiment)
    }
    return [...unique.values()]
  }

  private tagIdsForSlug(
    article: JsonApiResource,
    tickerSlug: string,
  ): Set<string> {
    const identifiers = [
      ...(this.relatedIdentifiers(article, 'primaryTickers') ?? []),
      ...(this.relatedIdentifiers(article, 'secondaryTickers') ?? []),
    ]
    const matching = identifiers.filter(
      (identifier) =>
        String(this.resolve(identifier)?.attributes?.slug).toLowerCase() ===
        tickerSlug,
    )
    return new Set(matching.map((identifier) => String(identifier.id)))
  }

  private sentimentTagId(sentiment: JsonApiResource): string | null {
    const attributes = sentiment.attributes ?? {}
    const fromAttributes = attributes.tagId ?? attributes.tag_id
    if (fromAttributes !== undefined && fromAttributes !== null) {
      return String(fromAttributes)
    }

    const fromRelationship =
      this.relatedIdentifiers(sentiment, 'tag')?.[0] ??
      this.relatedIdentifiers(sentiment, 'ticker')?.[0]
    return fromRelationship ? String(fromRelationship.id) : null
  }

  private indexSentiments(
    included: JsonApiResource[],
  ): Map<string, JsonApiResource[]> {
    const index = new Map<string, JsonApiResource[]>()
    const sentiments = included.filter(
      (resource) => resource.type === SeekingAlphaDocument.SENTIMENT_TYPE,
    )

    for (const sentiment of sentiments) {
      const articleId =
        sentiment.attributes?.articleId ?? sentiment.attributes?.article_id
      if (articleId === undefined || articleId === null) {
        continue
      }
      const key = String(articleId)
      index.set(key, [...(index.get(key) ?? []), sentiment])
    }
    return index
  }

  private relatedIdentifiers(
    resource: JsonApiResource,
    name: string,
  ): JsonApiIdentifier[] | null {
    const relationship = resource.relationships?.[name]
    if (!relationship || relationship.data === undefined) {
      return null
    }
    if (relationship.data === null) {
      return []
    }
    return Array.isArray(relationship.data)
      ? relationship.data
      : [relationship.data]
  }

  private resolve(identifier: JsonApiIdentifier): JsonApiResource | undefined {
    return this.includedByKey.get(this.keyOf(identifier))
  }

  private keyOf(identifier: JsonApiIdentifier): string {
    return `${identifier.type}:${identifier.id}`
  }

  private toDate(value: unknown): Date | null {
    if (typeof value === 'number') {
      // Epoch seconds or milliseconds.
      return new Date(value < 1e12 ? value * 1000 : value)
    }
    if (typeof value !== 'string') {
      return null
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
}
