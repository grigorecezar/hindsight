import { DomainError } from '@/server/errors/DomainError'

export class InvalidAuthorError extends DomainError {
  constructor(input: string) {
    super(
      'Paste a Seeking Alpha author link, like seekingalpha.com/author/small-cap-connoisseur, or just the name after /author/.',
      { input },
    )
  }
}
