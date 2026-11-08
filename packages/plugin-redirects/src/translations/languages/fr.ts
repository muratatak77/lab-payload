import type { GenericTranslationsObject } from '@payloadcms/translations'

export const fr: GenericTranslationsObject = {
  $schema: '../translation-schema.json',
  'plugin-redirects': {
    customUrl: 'URL personnalisée',
    documentToRedirect: 'Page de redirection',
    fromUrl: "URL d'origine",
    hits: 'Visites',
    hitsReset: 'Le compteur de visites a été réinitialisé.',
    internalLink: 'Référence vers une page',
    lastHitAt: 'Dernière visite',
    redirectType: 'Type de redirection',
    resetHits: 'Réinitialiser les visites',
    resetHitsConfirmation:
      'Voulez-vous vraiment réinitialiser le compteur de visites de cette redirection ? Cette action est irréversible.',
    toUrlType: "Type d'URL de destination",
  },
}
