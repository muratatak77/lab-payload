import type { FlattenedField, JsonObject, PayloadRequest, SanitizedCollectionConfig } from 'payload'

import { defaultRedirectsSlug, hitsFieldName, lastHitAtFieldName } from '../constants.js'
import { isHitTrackingEnabled } from './getHitTrackingCollection.js'
import { recordRedirectHit } from './recordRedirectHit.js'

type ResolveRedirectArgs = {
  /**
   * Slug of the redirects collection.
   * @default 'redirects'
   */
  collectionSlug?: string
  /**
   * Depth used to populate `to.reference`.
   */
  depth?: number
  /**
   * The incoming path to look up, matched exactly against the `from` field.
   */
  from: string
  /**
   * @default false
   */
  overrideAccess?: boolean
  req: PayloadRequest
}

/**
 * Finds the redirect matching `from` and, if hit tracking is enabled, records a hit for it.
 * The returned document reflects the updated `hits` and `lastHitAt` values.
 *
 * Returns `null` if no redirect matches or the user cannot read it.
 */
export const resolveRedirect = async ({
  collectionSlug = defaultRedirectsSlug,
  depth,
  from,
  overrideAccess = false,
  req,
}: ResolveRedirectArgs): Promise<JsonObject | null> => {
  const { payload } = req

  const {
    docs: [redirect],
  } = await payload.find({
    collection: collectionSlug,
    depth,
    limit: 1,
    overrideAccess,
    pagination: false,
    req,
    where: {
      from: {
        equals: from,
      },
    },
  })

  if (!redirect) {
    return null
  }

  const collectionConfig = payload.collections[collectionSlug]!.config

  if (!isHitTrackingEnabled({ collectionConfig })) {
    return redirect
  }

  const stats = await recordRedirectHit({ id: redirect.id, collectionSlug, payload })

  if (!stats) {
    return redirect
  }

  const resolved: JsonObject = { ...redirect }

  // Only reflect the new stats in fields the user is allowed to read
  for (const [fieldName, value] of [
    [hitsFieldName, stats.hits],
    [lastHitAtFieldName, stats.lastHitAt],
  ] as const) {
    const field = collectionConfig.flattenedFields.find(({ name }) => name === fieldName)

    if (
      field &&
      (await canReadField({ collectionConfig, doc: redirect, field, overrideAccess, req }))
    ) {
      resolved[fieldName] = value
    }
  }

  return resolved
}

const canReadField = async ({
  collectionConfig,
  doc,
  field,
  overrideAccess,
  req,
}: {
  collectionConfig: SanitizedCollectionConfig
  doc: JsonObject
  field: FlattenedField
  overrideAccess: boolean
  req: PayloadRequest
}): Promise<boolean> => {
  if (overrideAccess || !field.access?.read) {
    return true
  }

  return field.access.read({
    id: doc.id,
    collection: collectionConfig,
    data: doc,
    doc,
    req,
    siblingData: doc,
  })
}
