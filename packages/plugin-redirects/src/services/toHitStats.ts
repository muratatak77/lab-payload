import type { JsonObject } from 'payload'

import type { RedirectHitStats } from '../types.js'

import { hitsFieldName, lastHitAtFieldName } from '../constants.js'

export const hitStatsSelect = {
  [hitsFieldName]: true,
  [lastHitAtFieldName]: true,
} as const

export const toHitStats = (doc: JsonObject): RedirectHitStats => ({
  id: doc.id,
  hits: typeof doc[hitsFieldName] === 'number' ? doc[hitsFieldName] : 0,
  lastHitAt: doc[lastHitAtFieldName] ?? null,
})
