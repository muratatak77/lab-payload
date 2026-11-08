import type { GenericTranslationsObject } from '@payloadcms/translations'

export const pt: GenericTranslationsObject = {
  $schema: '../translation-schema.json',
  'plugin-redirects': {
    customUrl: 'URL Personalizada',
    documentToRedirect: 'Documento para Redirecionar',
    fromUrl: 'URL de Origem',
    hits: 'Acessos',
    hitsReset: 'O contador de acessos foi redefinido.',
    internalLink: 'Link Interno',
    lastHitAt: 'Último Acesso',
    redirectType: 'Tipo de Redirecionamento',
    resetHits: 'Redefinir Acessos',
    resetHitsConfirmation:
      'Tem certeza de que deseja redefinir o contador de acessos deste redirecionamento? Esta ação não pode ser desfeita.',
    toUrlType: 'Tipo de Destino',
  },
}
