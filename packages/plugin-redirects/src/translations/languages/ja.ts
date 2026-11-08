import type { GenericTranslationsObject } from '@payloadcms/translations'

export const ja: GenericTranslationsObject = {
  $schema: '../translation-schema.json',
  'plugin-redirects': {
    customUrl: 'カスタムURL',
    documentToRedirect: 'リダイレクト先のドキュメント',
    fromUrl: 'リダイレクト元URL',
    hits: 'アクセス数',
    hitsReset: 'アクセス数をリセットしました。',
    internalLink: '内部リンク',
    lastHitAt: '最終アクセス',
    redirectType: 'リダイレクトの種類',
    resetHits: 'アクセス数をリセット',
    resetHitsConfirmation:
      'このリダイレクトのアクセス数をリセットしてもよろしいですか？この操作は元に戻せません。',
    toUrlType: 'リダイレクト先URLの種類',
  },
}
