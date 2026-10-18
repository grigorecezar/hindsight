import { DomainError } from '@/server/errors/DomainError'

export class AuthorNotFoundError extends DomainError {
  constructor(slug: string) {
    super(`${slug} is not an author Hindsight follows.`, { slug })
  }
}
