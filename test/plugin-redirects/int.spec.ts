import type { Payload } from 'payload'

import { recordRedirectHit, resetRedirectHits, resolveRedirect } from '@payloadcms/plugin-redirects'
import { createPayloadRequest } from 'payload'
import { expect } from 'vitest'

import type { Page, Redirect } from './payload-types.js'

import { test } from '../__helpers/int/vitest.js'
import { pagesSlug, protectedRedirectFrom, redirectsSlug, usersSlug } from './shared.js'

let page: Page

test.suite('@payloadcms/plugin-redirects', { config: './config.ts' }, () => {
  test.beforeEach(async ({ payload }) => {
    page = await payload.create({
      collection: 'pages',
      data: {
        title: 'Test',
      },
      overrideAccess: true,
    })
  })

  test('should add a redirects collection', async ({ payload }) => {
    const redirect = await payload.find({
      collection: 'redirects',
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })

    expect(redirect).toBeTruthy()
  })

  test('should add a redirect with to internal page', async ({ payload }) => {
    const redirect = await payload.create({
      collection: 'redirects',
      data: {
        from: '/test',
        to: {
          type: 'reference',
          reference: {
            relationTo: pagesSlug,
            value: page.id,
          },
        },
        type: '301',
      },
      overrideAccess: true,
    })

    expect(redirect).toBeTruthy()
    expect(redirect.from).toBe('/test')
    expect(redirect.to.reference.value).toMatchObject(page)
  })

  test('should add a redirect with to custom url', async ({ payload }) => {
    const redirect = await payload.create({
      collection: 'redirects',
      data: {
        from: '/test2',
        to: {
          type: 'custom',
          url: '/test',
        },
        type: '301',
      },
      overrideAccess: true,
    })

    expect(redirect).toBeTruthy()
    expect(redirect.from).toBe('/test2')
    expect(redirect.to.url).toBe('/test')
  })

  test.describe('hit tracking', () => {
    test('should start new redirects with zero hits', async ({ payload }) => {
      const redirect = await createCustomRedirect({ from: '/fresh', payload })

      expect(redirect.hits).toBe(0)
      expect(redirect.lastHitAt).toBeFalsy()
    })

    test('should ignore hits passed through the API on create and update', async ({
      restClient,
    }) => {
      await restClient.login({ slug: usersSlug })

      const createResponse = await restClient.POST(`/${redirectsSlug}`, {
        body: JSON.stringify({
          from: '/spoofed',
          hits: 500,
          lastHitAt: new Date().toISOString(),
          to: { type: 'custom', url: '/target' },
          type: '301',
        }),
      })

      const { doc: created } = await createResponse.json()

      expect(createResponse.status).toBe(201)
      expect(created.hits).toBe(0)
      expect(created.lastHitAt).toBeFalsy()

      const updateResponse = await restClient.PATCH(`/${redirectsSlug}/${created.id}`, {
        body: JSON.stringify({ hits: 1000 }),
      })

      const { doc: updated } = await updateResponse.json()

      expect(updateResponse.status).toBe(200)
      expect(updated.hits).toBe(0)
    })

    test('should resolve a redirect by path and record a hit', async ({ payload, restClient }) => {
      const redirect = await createCustomRedirect({ from: '/old-path', payload })

      const response = await restClient.GET(`/${redirectsSlug}/resolve`, {
        auth: false,
        query: { from: '/old-path' },
      })

      const resolved = await response.json()

      expect(response.status).toBe(200)
      expect(resolved.id).toBe(redirect.id)
      expect(resolved.to.url).toBe('/target')
      expect(resolved.hits).toBe(1)
      expect(new Date(resolved.lastHitAt).getTime()).toBeGreaterThan(0)

      const stored = await payload.findByID({
        id: redirect.id,
        collection: redirectsSlug,
        overrideAccess: true,
      })

      expect(stored.hits).toBe(1)
      expect(stored.lastHitAt).toBe(resolved.lastHitAt)
    })

    test('should not change updatedAt when recording a hit', async ({ payload }) => {
      const redirect = await createCustomRedirect({ from: '/stable', payload })

      await recordRedirectHit({ id: redirect.id, payload })

      const stored = await payload.findByID({
        id: redirect.id,
        collection: redirectsSlug,
        overrideAccess: true,
      })

      expect(stored.hits).toBe(1)
      expect(stored.updatedAt).toBe(redirect.updatedAt)
    })

    test('should populate the redirect reference according to depth', async ({
      payload,
      restClient,
    }) => {
      await payload.create({
        collection: redirectsSlug,
        data: {
          from: '/to-page',
          to: { type: 'reference', reference: { relationTo: pagesSlug, value: page.id } },
          type: '301',
        },
        overrideAccess: true,
      })

      const populated = await (
        await restClient.GET(`/${redirectsSlug}/resolve`, { query: { from: '/to-page' } })
      ).json()

      const unpopulated = await (
        await restClient.GET(`/${redirectsSlug}/resolve`, {
          query: { depth: 0, from: '/to-page' },
        })
      ).json()

      expect(populated.to.reference.value.title).toBe(page.title)
      expect(unpopulated.to.reference.value).toBe(page.id)
      expect(unpopulated.hits).toBe(2)
    })

    test('should respond with 404 when no redirect matches', async ({ restClient }) => {
      const response = await restClient.GET(`/${redirectsSlug}/resolve`, {
        query: { from: '/does-not-exist' },
      })

      expect(response.status).toBe(404)
    })

    test('should respond with 400 when from is missing', async ({ restClient }) => {
      const response = await restClient.GET(`/${redirectsSlug}/resolve`)

      expect(response.status).toBe(400)
    })

    test('should count concurrent hits without losing updates', async ({ payload }) => {
      const redirect = await createCustomRedirect({ from: '/busy', payload })

      await Promise.all(
        Array.from({ length: 10 }, () => recordRedirectHit({ id: redirect.id, payload })),
      )

      const stored = await payload.findByID({
        id: redirect.id,
        collection: redirectsSlug,
        overrideAccess: true,
      })

      expect(stored.hits).toBe(10)
    })

    test('should initialize the counter of redirects created before tracking was enabled', async ({
      payload,
    }) => {
      const redirect = await createCustomRedirect({ from: '/legacy', payload })

      await payload.db.updateOne({
        id: redirect.id,
        collection: redirectsSlug,
        data: { hits: null },
      })

      const stats = await recordRedirectHit({ id: redirect.id, payload })

      expect(stats?.hits).toBe(1)

      const nextStats = await recordRedirectHit({ id: redirect.id, payload })

      expect(nextStats?.hits).toBe(2)
    })

    test('should count concurrent first hits of redirects created before tracking was enabled', async ({
      payload,
    }) => {
      const redirect = await createCustomRedirect({ from: '/legacy-busy', payload })

      await payload.db.updateOne({
        id: redirect.id,
        collection: redirectsSlug,
        data: { hits: null },
      })

      await Promise.all(
        Array.from({ length: 10 }, () => recordRedirectHit({ id: redirect.id, payload })),
      )

      const stored = await payload.findByID({
        id: redirect.id,
        collection: redirectsSlug,
        overrideAccess: true,
      })

      expect(stored.hits).toBe(10)
    })

    test('should resolve without recording a hit when tracking is disabled', async ({
      payload,
    }) => {
      const redirect = await createCustomRedirect({ from: '/untracked', payload })
      const pluginCustom = payload.collections[redirectsSlug].config.custom['plugin-redirects']

      pluginCustom.trackHits = false

      try {
        const req = await createPayloadRequest({ payload })

        const resolved = await resolveRedirect({ from: '/untracked', req })

        expect(resolved?.id).toBe(redirect.id)
        expect(resolved?.hits).toBe(0)
      } finally {
        pluginCustom.trackHits = true
      }

      const stored = await payload.findByID({
        id: redirect.id,
        collection: redirectsSlug,
        overrideAccess: true,
      })

      expect(stored.hits).toBe(0)
      expect(stored.lastHitAt).toBeFalsy()
    })

    test('should not expose recorded hit stats to users without field read access', async ({
      payload,
    }) => {
      await createCustomRedirect({ from: '/hidden-stats', payload })

      const hitsField = payload.collections[redirectsSlug].config.flattenedFields.find(
        ({ name }) => name === 'hits',
      )!
      const originalAccess = hitsField.access

      hitsField.access = { ...originalAccess, read: () => false }

      try {
        const req = await createPayloadRequest({ payload })

        const resolved = await resolveRedirect({ from: '/hidden-stats', req })

        expect(resolved?.hits).not.toBe(1)
        expect(resolved?.lastHitAt).toBeTruthy()
      } finally {
        hitsField.access = originalAccess
      }
    })

    test('should return null when recording a hit for a missing redirect', async ({ payload }) => {
      const redirect = await createCustomRedirect({ from: '/deleted', payload })

      await payload.delete({ id: redirect.id, collection: redirectsSlug, overrideAccess: true })

      const stats = await recordRedirectHit({ id: redirect.id, payload })

      expect(stats).toBeNull()
    })

    test('should resolve redirects through the Local API', async ({ payload }) => {
      await createCustomRedirect({ from: '/local', payload })

      const req = await createPayloadRequest({ payload })

      const resolved = await resolveRedirect({ depth: 0, from: '/local', req })
      const missing = await resolveRedirect({ from: '/missing', req })

      expect(resolved?.hits).toBe(1)
      expect(missing).toBeNull()
    })

    test('should reset hits for users with update access', async ({ payload, restClient }) => {
      const redirect = await createCustomRedirect({ from: '/reset-me', payload })

      await recordRedirectHit({ id: redirect.id, payload })
      await recordRedirectHit({ id: redirect.id, payload })
      await restClient.login({ slug: usersSlug })

      const response = await restClient.DELETE(`/${redirectsSlug}/${redirect.id}/hits`)

      const { doc, message } = await response.json()

      expect(response.status).toBe(200)
      expect(message).toBe('Hit counter has been reset.')
      expect(doc).toMatchObject({ id: redirect.id, hits: 0, lastHitAt: null })

      const stored = await payload.findByID({
        id: redirect.id,
        collection: redirectsSlug,
        overrideAccess: true,
      })

      expect(stored.hits).toBe(0)
      expect(stored.lastHitAt).toBeFalsy()
      expect(stored.updatedAt).toBe(redirect.updatedAt)
    })

    test('should not reset hits for anonymous users', async ({ payload, restClient }) => {
      const redirect = await createCustomRedirect({ from: '/anonymous', payload })

      await recordRedirectHit({ id: redirect.id, payload })

      const response = await restClient.DELETE(`/${redirectsSlug}/${redirect.id}/hits`, {
        auth: false,
      })

      expect(response.status).toBe(403)
      await expectHits({ id: redirect.id, hits: 1, payload })
    })

    test('should not reset hits when update access is denied for the document', async ({
      payload,
      restClient,
    }) => {
      const redirect = await createCustomRedirect({ from: protectedRedirectFrom, payload })

      await recordRedirectHit({ id: redirect.id, payload })
      await restClient.login({ slug: usersSlug })

      const response = await restClient.DELETE(`/${redirectsSlug}/${redirect.id}/hits`)

      expect(response.status).toBe(403)
      await expectHits({ id: redirect.id, hits: 1, payload })
    })

    test('should respond with 404 when resetting hits of a missing redirect', async ({
      payload,
      restClient,
    }) => {
      const redirect = await createCustomRedirect({ from: '/gone', payload })

      await payload.delete({ id: redirect.id, collection: redirectsSlug, overrideAccess: true })
      await restClient.login({ slug: usersSlug })

      const response = await restClient.DELETE(`/${redirectsSlug}/${redirect.id}/hits`)

      expect(response.status).toBe(404)
    })

    test('should reset hits through the Local API when overriding access', async ({ payload }) => {
      const redirect = await createCustomRedirect({ from: protectedRedirectFrom, payload })

      await recordRedirectHit({ id: redirect.id, payload })

      const req = await createPayloadRequest({ payload })

      await expect(resetRedirectHits({ id: redirect.id, req })).rejects.toThrow()

      const stats = await resetRedirectHits({ id: redirect.id, overrideAccess: true, req })

      expect(stats.hits).toBe(0)
    })
  })
})

async function createCustomRedirect({
  from,
  payload,
}: {
  from: string
  payload: Payload
}): Promise<Redirect> {
  return payload.create({
    collection: redirectsSlug,
    data: {
      from,
      to: { type: 'custom', url: '/target' },
      type: '301',
    },
    overrideAccess: true,
  })
}

async function expectHits({
  id,
  hits,
  payload,
}: {
  hits: number
  id: Redirect['id']
  payload: Payload
}): Promise<void> {
  const stored = await payload.findByID({ id, collection: redirectsSlug, overrideAccess: true })

  expect(stored.hits).toBe(hits)
}
