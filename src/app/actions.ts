'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { DomainError } from '@/server/errors/DomainError'
import { createLogger } from '@/server/logging/createLogger'
import { RunKind } from '@/server/modules/runs/enums/RunKind'
import { RunTrigger } from '@/server/modules/runs/enums/RunTrigger'
import { getServices } from '@/server/services'
import type { FormState } from './_types/FormState'

const logger = createLogger('actions')

const STARTABLE_KINDS = new Set<string>([
  RunKind.WEEKLY,
  RunKind.MONTHLY,
  RunKind.REFRESH,
  RunKind.BACKFILL,
])

/** Adds a ticker, then backfills its history once the response is sent. */
export async function addCompany(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { companiesService, jobRunner } = getServices()

  try {
    const { company, isNew } = await companiesService.add(
      String(formData.get('ticker') ?? ''),
    )
    after(() =>
      startInBackground(() =>
        jobRunner.run(RunKind.BACKFILL, {
          trigger: RunTrigger.APP,
          companyIds: [company.id],
        }),
      ),
    )
    refresh()
    return {
      message: isNew
        ? `${company.ticker} added. Click Sync in the extension to pull its calls.`
        : `${company.ticker} is on the watchlist.`,
      isError: false,
    }
  } catch (error) {
    return toFormError(error)
  }
}

export async function unwatchCompany(formData: FormData): Promise<void> {
  const companyId = String(formData.get('companyId') ?? '')
  await getServices().companiesService.unwatch(companyId)
  redirect('/')
}

/** Starts a run without waiting for it. The Runs page shows progress. */
export async function startRun(formData: FormData): Promise<void> {
  const kind = String(formData.get('kind') ?? '')
  if (!STARTABLE_KINDS.has(kind)) {
    return
  }

  const { jobRunner } = getServices()
  after(() =>
    startInBackground(() =>
      jobRunner.run(kind as RunKind, { trigger: RunTrigger.APP }),
    ),
  )
  refresh()
}

/** Follows an author from a profile link or username. */
export async function followAuthor(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { author, isNew } = await getServices().authorsService.follow(
      String(formData.get('author') ?? ''),
    )
    refresh()
    return {
      message: isNew
        ? `Following ${author.name}. Click Sync in the extension to pull their articles.`
        : `You already follow ${author.name}.`,
      isError: false,
    }
  } catch (error) {
    return toFormError(error)
  }
}

/** The Follow button on an author's page. */
export async function followAuthorFromPage(formData: FormData): Promise<void> {
  await getServices().authorsService.follow(String(formData.get('slug') ?? ''))
  refresh()
}

export async function unfollowAuthor(formData: FormData): Promise<void> {
  await getServices().authorsService.unfollow(
    String(formData.get('authorId') ?? ''),
  )
  refresh()
}

export async function setAuthorFavorite(formData: FormData): Promise<void> {
  await getServices().authorsService.setFavorite(
    String(formData.get('authorId') ?? ''),
    formData.get('isFavorite') === 'true',
  )
  refresh()
}

async function startInBackground(work: () => Promise<unknown>): Promise<void> {
  try {
    await work()
  } catch (error) {
    // JobRunner already recorded and logged the failure on the run.
    logger.debug({ err: error }, 'background run ended with an error')
  }
}

function toFormError(error: unknown): FormState {
  if (error instanceof DomainError) {
    return { message: error.message, isError: true }
  }
  logger.error({ err: error }, 'form action failed')
  return { message: 'Something went wrong. Try again.', isError: true }
}
