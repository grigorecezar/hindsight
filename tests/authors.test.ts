import { describe, expect, it } from 'vitest'
import { InvalidAuthorError } from '@/server/modules/authors/errors/InvalidAuthorError'
import { nameFromSlug } from '@/server/modules/authors/utils/nameFromSlug'
import { parseAuthorSlug } from '@/server/modules/authors/utils/parseAuthorSlug'

describe('parseAuthorSlug', () => {
  it('reads profile links in their usual shapes', () => {
    expect(
      parseAuthorSlug('https://seekingalpha.com/author/small-cap-connoisseur'),
    ).toBe('small-cap-connoisseur')
    expect(
      parseAuthorSlug(
        'seekingalpha.com/author/Small-Cap-Connoisseur/analysis?source=x',
      ),
    ).toBe('small-cap-connoisseur')
    expect(
      parseAuthorSlug(
        '  https://seekingalpha.com/author/juxtaposed-ideas#latest ',
      ),
    ).toBe('juxtaposed-ideas')
  })

  it('takes a bare username', () => {
    expect(parseAuthorSlug('small-cap-connoisseur')).toBe(
      'small-cap-connoisseur',
    )
    expect(parseAuthorSlug('@michael-mcgrath')).toBe('michael-mcgrath')
  })

  it('rejects anything else', () => {
    expect(() =>
      parseAuthorSlug('https://seekingalpha.com/symbol/META'),
    ).toThrow(InvalidAuthorError)
    expect(() => parseAuthorSlug('not a slug')).toThrow(InvalidAuthorError)
  })
})

describe('nameFromSlug', () => {
  it('makes a readable stand in name', () => {
    expect(nameFromSlug('small-cap-connoisseur')).toBe('Small Cap Connoisseur')
  })
})
