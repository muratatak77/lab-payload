import type { PayloadRequest } from 'payload'

import { docAccessOperation, Forbidden, NotFound } from 'payload'

import type { RedirectHitStats } from '../types.js'

import { defaultRedirectsSlug, hitsFieldName, lastHitAtFieldName } from '../constants.js'
import { getHitTrackingCollection } from './getHitTrackingCollection.js'
import { hitStatsSelect, toHitStats } from './toHitStats.js'

type ResetRedirectHitsArgs = {
  /**
   * Slug of the redirects collection.
   * @default 'redirects'
   */
  collectionSlug?: string
  id: number | string
  /**
   * When `false`, the user on `req` must be able to read and update the redirect.
   * @default false
   */
  overrideAccess?: boolean
  req: PayloadRequest
}

/**
 * Resets the hit counter and `lastHitAt` timestamp of a redirect.
 *
 * Returns the reset stats (`hits: 0`, `lastHitAt: null`) of the redirect.
 *
 * Throws if hit tracking is not enabled for the collection, `NotFound` if the redirect does not exist or cannot be read, and `Forbidden` if the user
 * is not allowed to update it.
 */
export const resetRedirectHits = async ({
  id,
  collectionSlug = defaultRedirectsSlug,
  overrideAccess = false,
  req,
}: ResetRedirectHitsArgs): Promise<RedirectHitStats> => {
  const { payload } = req

  getHitTrackingCollection({ collectionSlug, payload })

  if (!overrideAccess) {
    await payload.findByID({
      id,
      collection: collectionSlug,
      depth: 0,
      overrideAccess: false,
      req,
      select: hitStatsSelect,
    })

    const permissions = await docAccessOperation({
      id,
      collection: payload.collections[collectionSlug]!,
      req,
    })

    if (!permissions.update) {
      throw new Forbidden(req.t)
    }
  }

  const doc = await payload.db.updateOne({
    id,
    collection: collectionSlug,
    data: {
      [hitsFieldName]: 0,
      [lastHitAtFieldName]: null,
      updatedAt: null,
    },
    req,
    select: hitStatsSelect,
  })

  if (!doc) {
    throw new NotFound(req.t)
  }

  return toHitStats(doc)
}
