import type { Endpoint } from 'payload'

import { APIError, NotFound, parseParams } from 'payload'

import { resolveRedirect } from '../services/resolveRedirect.js'

export const getResolveRedirectEndpoint = ({
  collectionSlug,
}: {
  collectionSlug: string
}): Endpoint => ({
  handler: async (req) => {
    const { depth, from } = parseParams(req.query)

    if (typeof from !== 'string' || !from) {
      throw new APIError(req.t('error:invalidRequestArgs', { args: `'from'` }), 400, null, true)
    }

    const redirect = await resolveRedirect({
      collectionSlug,
      depth,
      from,
      req,
    })

    if (!redirect) {
      throw new NotFound(req.t)
    }

    return Response.json(redirect)
  },
  method: 'get',
  path: '/resolve',
})
