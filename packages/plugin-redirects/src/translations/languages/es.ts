import type { GenericTranslationsObject } from '@payloadcms/translations'

export const es: GenericTranslationsObject = {
  $schema: '../translation-schema.json',
  'plugin-redirects': {
    customUrl: 'URL personalizada',
    documentToRedirect: 'Documento al que redirigir',
    fromUrl: 'URL de origen',
    hits: 'Visitas',
    hitsReset: 'El contador de visitas se ha restablecido.',
    internalLink: 'Enlace interno',
    lastHitAt: 'Última visita',
    redirectType: 'Tipo de redirección',
    resetHits: 'Restablecer visitas',
    resetHitsConfirmation:
      '¿Seguro que quieres restablecer el contador de visitas de esta redirección? Esta acción no se puede deshacer.',
    toUrlType: 'Tipo de URL de destino',
  },
}
