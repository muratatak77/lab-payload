'use client'

import type { NumberFieldClientProps } from 'payload'

import {
  Button,
  ConfirmationModal,
  FieldDescription,
  FieldLabel,
  toast,
  useConfig,
  useDocumentInfo,
  useEditDepth,
  useField,
  useForm,
  useModal,
  useTranslation,
} from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import React, { useCallback } from 'react'

import type { RedirectsTranslationKeys, RedirectsTranslations } from '../../translations/index.js'
import type { RedirectHitStats } from '../../types.js'

import { lastHitAtFieldName } from '../../constants.js'
import './index.css'

const baseClass = 'redirect-hits-field'

type ResetHitsResponse = {
  doc?: RedirectHitStats
  errors?: { message: string }[]
  message?: string
}

type RedirectHitsFieldProps = {
  /**
   * `false` when the reset endpoint is not registered, for example with `overrides.endpoints: false`.
   * @default true
   */
  canResetHits?: boolean
} & NumberFieldClientProps

export const RedirectHitsField: React.FC<RedirectHitsFieldProps> = (props) => {
  const {
    canResetHits = true,
    field: { admin: { description } = {}, label },
    path: pathFromProps,
  } = props

  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig()

  const { id, collectionSlug, docPermissions } = useDocumentInfo()
  const { dispatchFields } = useForm()
  const { openModal } = useModal()
  const editDepth = useEditDepth()

  const { i18n, t } = useTranslation<RedirectsTranslations, RedirectsTranslationKeys>()

  const { path, setValue, value } = useField<number>({ potentiallyStalePath: pathFromProps })

  const hits = typeof value === 'number' ? value : 0
  const confirmModalSlug = `${baseClass}-confirm-reset-${editDepth}`
  const canReset =
    canResetHits && Boolean(id && collectionSlug && docPermissions?.update) && hits > 0

  const resetHits = useCallback(async () => {
    try {
      const res = await fetch(
        formatAdminURL({
          apiRoute,
          path: `/${collectionSlug}/${id}/hits`,
        }),
        {
          credentials: 'include',
          headers: {
            'Accept-Language': i18n.language,
          },
          method: 'DELETE',
        },
      )

      const json = (await res.json()) as ResetHitsResponse

      if (!res.ok || !json.doc) {
        toast.error(json.errors?.[0]?.message || t('error:unknown'))
        return
      }

      // Stats are not part of the editable form data, so update them without marking the form as modified
      setValue(json.doc.hits, true)
      dispatchFields({
        type: 'UPDATE',
        initialValue: json.doc.lastHitAt,
        path: lastHitAtFieldName,
        value: json.doc.lastHitAt,
      })

      toast.success(json.message)
    } catch (_err) {
      toast.error(t('error:unknown'))
    }
  }, [apiRoute, collectionSlug, dispatchFields, i18n.language, id, setValue, t])

  return (
    <div className={['field-type', baseClass].join(' ')} id={`field-${path}`}>
      <FieldLabel as="span" label={label} path={path} />
      <div className={`${baseClass}__row`}>
        <output className={`${baseClass}__count`}>{hits.toLocaleString(i18n.language)}</output>
        {canReset && (
          <Button
            buttonStyle="secondary"
            className={`${baseClass}__reset`}
            margin={false}
            onClick={() => openModal(confirmModalSlug)}
            size="medium"
          >
            {t('plugin-redirects:resetHits')}
          </Button>
        )}
      </div>
      <FieldDescription description={description} path={path} />
      {canReset && (
        <ConfirmationModal
          body={t('plugin-redirects:resetHitsConfirmation')}
          confirmLabel={t('plugin-redirects:resetHits')}
          heading={t('plugin-redirects:resetHits')}
          modalSlug={confirmModalSlug}
          onConfirm={resetHits}
          role="alertdialog"
        />
      )}
    </div>
  )
}
