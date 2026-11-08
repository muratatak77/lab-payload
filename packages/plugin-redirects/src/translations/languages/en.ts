import type { GenericTranslationsObject } from '@payloadcms/translations'

export const en: GenericTranslationsObject = {
  $schema: '../translation-schema.json',
  'plugin-redirects': {
    customUrl: 'Custom URL',
    documentToRedirect: 'Document to redirect to',
    fromUrl: 'From URL',
    hits: 'Hits',
    hitsReset: 'Hit counter has been reset.',
    internalLink: 'Internal link',
    lastHitAt: 'Last hit',
    redirectType: 'Redirect Type',
    resetHits: 'Reset hits',
    resetHitsConfirmation:
      'Are you sure you want to reset the hit counter for this redirect? This cannot be undone.',
    toUrlType: 'To URL Type',
  },
}
