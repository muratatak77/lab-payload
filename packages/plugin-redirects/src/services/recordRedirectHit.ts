import type { Payload, PayloadRequest } from 'payload'

import type { RedirectHitStats } from '../types.js'

import { defaultRedirectsSlug, hitsFieldName, lastHitAtFieldName } from '../constants.js'
import { getHitTrackingCollection } from './getHitTrackingCollection.js'
import { hitStatsSelect, toHitStats } from './toHitStats.js'

type RecordRedirectHitArgs = {
  /**
   * Slug of the redirects collection.
   * @default 'redirects'
   */
  collectionSlug?: string
  id: number | string
  payload: Payload
  /**
   * Only pass `req` if the hit should be part of an ongoing transaction. By default the hit is
   * written outside of any transaction, so concurrent requests always see the latest count.
   */
  req?: PayloadRequest
}

/**
 * Atomically increments the hit counter of a redirect and updates its `lastHitAt` timestamp.
 *
 * Writes go straight to the database adapter: no hooks run, no version is created and
 * `updatedAt` is left untouched, so tracking traffic does not look like an edit.
 *
 * Returns `null` if the redirect does not exist.
 */
export const recordRedirectHit = async ({
  id,
  collectionSlug = defaultRedirectsSlug,
  payload,
  req,
}: RecordRedirectHitArgs): Promise<null | RedirectHitStats> => {
  getHitTrackingCollection({ collectionSlug, payload })

  const lastHitAt = new Date().toISOString()

  const incremented = await payload.db.updateOne({
    collection: collectionSlug,
    data: {
      [hitsFieldName]: { $inc: 1 },
      [lastHitAtFieldName]: lastHitAt,
      updatedAt: null,
    },
    req,
    select: hitStatsSelect,
    where: {
      and: [{ id: { equals: id } }, { [hitsFieldName]: { exists: true } }],
    },
  })

  if (incremented) {
    return toHitStats(incremented)
  }

  // Redirects created before hit tracking was enabled have no stored counter, and SQL adapters
  // cannot increment NULL. Initialize the counter with the first hit instead.
  const initialized = await payload.db.updateOne({
    id,
    collection: collectionSlug,
    data: {
      [hitsFieldName]: 1,
      [lastHitAtFieldName]: lastHitAt,
      updatedAt: null,
    },
    req,
    select: hitStatsSelect,
  })

  return initialized ? toHitStats(initialized) : null
}
