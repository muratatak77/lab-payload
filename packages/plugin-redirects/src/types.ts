import type { CollectionConfig, Field, SelectField } from 'payload'

import type { redirectTypes } from './redirectTypes.js'
export type FieldsOverride = (args: { defaultFields: Field[] }) => Field[]

export type RedirectsPluginConfig = {
  collections?: string[]
  overrides?: { fields?: FieldsOverride } & Partial<Omit<CollectionConfig, 'fields'>>
  redirectTypeFieldOverride?: Partial<SelectField>
  redirectTypes?: (typeof redirectTypes)[number][]
  /**
   * Adds read-only `hits` and `lastHitAt` fields to the redirects collection. Hits are recorded
   * by the `GET /resolve` endpoint, or by calling `recordRedirectHit` from your own front-end code.
   * Users with update access can reset the counter from the Admin Panel.
   *
   * @default false
   */
  trackHits?: boolean
}

/**
 * Stored on `collectionConfig.custom` so the service functions can tell whether hit tracking is
 * enabled for a redirects collection without access to the plugin options.
 */
export type RedirectsCollectionCustom = {
  trackHits?: boolean
}

export type RedirectHitStats = {
  hits: number
  id: number | string
  lastHitAt: null | string
}
