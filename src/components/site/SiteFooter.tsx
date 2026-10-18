import { Container } from '@/components/ui/Container'

export function SiteFooter() {
  return (
    <footer className="mt-24 pb-10 text-sm text-ink/65">
      <Container>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-ink/15 pt-6">
          <span>Hindsight. Scores calls against what the stock did next.</span>
          <span>Not investment advice.</span>
        </div>
      </Container>
    </footer>
  )
}
