import type { Payload, SanitizedCollectionConfig } from 'payload'

import { APIError } from 'payload'

import type { RedirectsCollectionCustom } from '../types.js'

import { customConfigKey } from '../constants.js'

/**
 * Returns `true` if the plugin enabled hit tracking for the given redirects collection.
 */
export const isHitTrackingEnabled = ({
  collectionConfig,
}: {
  collectionConfig: SanitizedCollectionConfig
}): boolean => {
  const pluginCustom = collectionConfig.custom?.[customConfigKey] as
    | RedirectsCollectionCustom
    | undefined

  return pluginCustom?.trackHits === true
}

/**
 * Returns the config of a redirects collection that has hit tracking enabled, or throws.
 */
export const getHitTrackingCollection = ({
  collectionSlug,
  payload,
}: {
  collectionSlug: string
  payload: Payload
}): SanitizedCollectionConfig => {
  const collectionConfig = payload.collections[collectionSlug]?.config

  if (!collectionConfig) {
    throw new APIError(`Collection "${collectionSlug}" does not exist.`, 500)
  }

  if (!isHitTrackingEnabled({ collectionConfig })) {
    throw new APIError(
      `Hit tracking is not enabled for the "${collectionSlug}" collection. Set \`trackHits: true\` in the redirects plugin options.`,
      500,
    )
  }

  return collectionConfig
}
