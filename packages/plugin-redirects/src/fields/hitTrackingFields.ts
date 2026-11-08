import type { DateField, FieldAccess, NumberField } from 'payload'

import { hitsFieldName, lastHitAtFieldName } from '../constants.js'

/**
 * Hit stats are only ever written through `recordRedirectHit` / `resetRedirectHits`, which go
 * straight to the database adapter. Denying field-level create/update keeps regular REST, GraphQL
 * and admin saves from overwriting a counter that may be changing concurrently.
 */
const denyWrite: FieldAccess = () => false

/**
 * Returns the read-only `hits` and `lastHitAt` fields added when hit tracking is enabled.
 * Pass `canResetHits: false` when the reset endpoint is not registered, so the Admin Panel does
 * not offer a **Reset hits** button that would fail.
 */
export const getHitTrackingFields = ({
  canResetHits,
}: {
  canResetHits: boolean
}): [NumberField, DateField] => [
  {
    name: hitsFieldName,
    type: 'number',
    access: {
      create: denyWrite,
      update: denyWrite,
    },
    admin: {
      components: {
        Field: {
          clientProps: {
            canResetHits,
          },
          path: '@payloadcms/plugin-redirects/client#RedirectHitsField',
        },
      },
      position: 'sidebar',
      readOnly: true,
    },
    defaultValue: 0,
    index: true,
    // @ts-expect-error - translations are not typed in plugins yet
    label: ({ t }) => t('plugin-redirects:hits'),
    min: 0,
  },
  {
    name: lastHitAtFieldName,
    type: 'date',
    access: {
      create: denyWrite,
      update: denyWrite,
    },
    admin: {
      date: {
        pickerAppearance: 'dayAndTime',
      },
      position: 'sidebar',
      readOnly: true,
    },
    // @ts-expect-error - translations are not typed in plugins yet
    label: ({ t }) => t('plugin-redirects:lastHitAt'),
  },
]
