import type { Endpoint, PayloadRequest } from 'payload'

import { APIError } from 'payload'

import { resetRedirectHits } from '../services/resetRedirectHits.js'

export const getResetRedirectHitsEndpoint = ({
  collectionSlug,
}: {
  collectionSlug: string
}): Endpoint => ({
  handler: async (req) => {
    const id = getIDFromRoute({ collectionSlug, req })

    const doc = await resetRedirectHits({
      id,
      collectionSlug,
      req,
    })

    return Response.json({
      doc,
      // @ts-expect-error - translations are not typed in plugins yet
      message: req.t('plugin-redirects:hitsReset'),
    })
  },
  method: 'delete',
  path: '/:id/hits',
})

const getIDFromRoute = ({
  collectionSlug,
  req,
}: {
  collectionSlug: string
  req: PayloadRequest
}): number | string => {
  const id = req.routeParams?.id

  if (typeof id !== 'string' || !id) {
    throw new APIError(req.t('error:invalidRequestArgs', { args: `'id'` }), 400, null, true)
  }

  const isNumericID =
    req.payload.db.defaultIDType === 'number' &&
    req.payload.collections[collectionSlug]?.customIDType !== 'text'

  return isNumericID ? Number(id) : id
}
