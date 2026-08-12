'use client'

import {
  ChangeEvent,
  useMemo,
  useState,
} from 'react'

import {
  Page,
  Card,
  Badge,
} from '@/components/ui'

import {
  useProducts,
} from '@/lib/store'

import {
  supabase,
} from '@/lib/supabase'

const BUCKET = 'product-images'

type ImportRow = {
  id: string
  file: File
  previewUrl: string
  reference: string
  productId: string
  productName: string
  status:
    | 'ready'
    | 'unknown'
    | 'uploading'
    | 'done'
    | 'error'
  message?: string
}

function extractReference(
  filename: string
) {
  const base = filename
    .replace(/\.[^.]+$/, '')
    .trim()
    .toUpperCase()

  const match = base.match(
    /([A-Z0-9]{3}-[A-Z0-9]{3}-\d{3})/
  )

  return match?.[1] || ''
}

async function fileToWebp(
  file: File
) {
  const bitmap =
    await createImageBitmap(file)

  const maxSize = 700
  const ratio = Math.min(
    1,
    maxSize /
      Math.max(
        bitmap.width,
        bitmap.height
      )
  )

  const width = Math.max(
    1,
    Math.round(
      bitmap.width * ratio
    )
  )

  const height = Math.max(
    1,
    Math.round(
      bitmap.height * ratio
    )
  )

  const canvas =
    document.createElement(
      'canvas'
    )

  canvas.width = width
  canvas.height = height

  const context =
    canvas.getContext('2d')

  if (!context) {
    throw new Error(
      "Impossible de traiter l'image."
    )
  }

  context.drawImage(
    bitmap,
    0,
    0,
    width,
    height
  )

  const blob =
    await new Promise<Blob>(
      (resolve, reject) => {
        canvas.toBlob(
          (value) =>
            value
              ? resolve(value)
              : reject(
                  new Error(
                    'Conversion WebP impossible.'
                  )
                ),
          'image/webp',
          0.82
        )
      }
    )

  bitmap.close()

  return blob
}

export default function ProductImagesPage() {
  const {
    items: products,
    reload: reloadProducts,
  } = useProducts()

  const [
    rows,
    setRows,
  ] = useState<ImportRow[]>(
    []
  )

  const [
    processing,
    setProcessing,
  ] = useState(false)

  const [
    message,
    setMessage,
  ] = useState('')

  const productByRef =
    useMemo(
      () =>
        new Map(
          products
            .filter(
              (product) =>
                product.internalRef
                  ?.trim()
            )
            .map(
              (product) => [
                product.internalRef
                  .trim()
                  .toUpperCase(),
                product,
              ]
            )
        ),
      [products]
    )

  const readyCount =
    rows.filter(
      (row) =>
        row.status === 'ready'
    ).length

  const doneCount =
    rows.filter(
      (row) =>
        row.status === 'done'
    ).length

  const errorCount =
    rows.filter(
      (row) =>
        row.status ===
          'unknown' ||
        row.status === 'error'
    ).length

  const chooseFiles = (
    event:
      ChangeEvent<HTMLInputElement>
  ) => {
    const files =
      Array.from(
        event.target.files || []
      )

    const next =
      files.map(
        (file): ImportRow => {
          const reference =
            extractReference(
              file.name
            )

          const product =
            reference
              ? productByRef.get(
                  reference
                )
              : undefined

          return {
            id:
              crypto.randomUUID(),
            file,
            previewUrl:
              URL.createObjectURL(
                file
              ),
            reference,
            productId:
              product?.id || '',
            productName:
              product?.name || '',
            status: product
              ? 'ready'
              : 'unknown',
            message: product
              ? ''
              : reference
              ? 'Référence inconnue'
              : 'Référence non reconnue dans le nom du fichier',
          }
        }
      )

    setRows(next)
    setMessage('')
  }

  const clearRows = () => {
    rows.forEach(
      (row) =>
        URL.revokeObjectURL(
          row.previewUrl
        )
    )

    setRows([])
    setMessage('')
  }

  const updateRow = (
    id: string,
    patch:
      Partial<ImportRow>
  ) => {
    setRows(
      (current) =>
        current.map(
          (row) =>
            row.id === id
              ? {
                  ...row,
                  ...patch,
                }
              : row
        )
    )
  }

  const uploadOne =
    async (
      row: ImportRow
    ) => {
      if (
        row.status !== 'ready'
      ) {
        return
      }

      updateRow(
        row.id,
        {
          status:
            'uploading',
          message:
            'Conversion et envoi...',
        }
      )

      try {
        const webp =
          await fileToWebp(
            row.file
          )

        const path =
          `${row.reference}.webp`

        const {
          error:
            uploadError,
        } =
          await supabase.storage
            .from(BUCKET)
            .upload(
              path,
              webp,
              {
                contentType:
                  'image/webp',
                cacheControl:
                  '3600',
                upsert: true,
              }
            )

        if (uploadError) {
          throw uploadError
        }

        const {
          data:
            publicData,
        } =
          supabase.storage
            .from(BUCKET)
            .getPublicUrl(path)

        const publicUrl =
          `${publicData.publicUrl}?v=${Date.now()}`

        const {
          error:
            updateError,
        } =
          await supabase
            .from('products')
            .update({
              photo_url:
                publicUrl,
            })
            .eq(
              'internal_reference',
              row.reference
            )

        if (updateError) {
          throw updateError
        }

        updateRow(
          row.id,
          {
            status: 'done',
            message:
              'Photo ajoutée',
          }
        )
      } catch (
        caughtError
      ) {
        updateRow(
          row.id,
          {
            status: 'error',
            message:
              caughtError instanceof
              Error
                ? caughtError.message
                : 'Erreur inconnue',
          }
        )
      }
    }

  const uploadAll =
    async () => {
      if (!readyCount) {
        setMessage(
          'Aucune photo prête à importer.'
        )
        return
      }

      setProcessing(true)
      setMessage('')

      const readyRows =
        rows.filter(
          (row) =>
            row.status ===
              'ready'
        )

      for (
        const row of
        readyRows
      ) {
        await uploadOne(row)
      }

      await reloadProducts()

      setProcessing(false)
      setMessage(
        'Import terminé. Les produits ont été actualisés.'
      )
    }

  const statusBadge = (
    row: ImportRow
  ) => {
    if (
      row.status === 'done'
    ) {
      return (
        <Badge tone="good">
          Importée
        </Badge>
      )
    }

    if (
      row.status ===
      'uploading'
    ) {
      return (
        <Badge tone="info">
          En cours
        </Badge>
      )
    }

    if (
      row.status ===
        'unknown' ||
      row.status === 'error'
    ) {
      return (
        <Badge tone="danger">
          À corriger
        </Badge>
      )
    }

    return (
      <Badge tone="neutral">
        Prête
      </Badge>
    )
  }

  return (
    <Page
      title="Photos produits"
      subtitle="Import automatique par référence interne"
    >
      {message && (
        <div
          className="notice goodNotice"
          style={{
            marginBottom: 16,
          }}
        >
          {message}
        </div>
      )}

      <Card>
        <div
          style={{
            display: 'grid',
            gap: 16,
          }}
        >
          <div>
            <h2
              style={{
                margin:
                  '0 0 6px',
              }}
            >
              Import multiple
            </h2>

            <div className="muted">
              Le nom du fichier doit contenir la référence interne du produit.
              Exemple : <strong>ALC-GIN-001.webp</strong>.
            </div>
          </div>

          <div
            style={{
              padding: 18,
              border:
                '1px dashed #98a2b3',
              borderRadius: 14,
              background:
                'rgba(255,255,255,.03)',
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={
                chooseFiles
              }
            />

            <div
              className="muted"
              style={{
                marginTop: 8,
                fontSize: 12,
              }}
            >
              JPG, PNG ou WebP. NukuStock convertit automatiquement les images en WebP et limite leur taille à 700 px.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <button
              className="button"
              type="button"
              onClick={
                uploadAll
              }
              disabled={
                processing ||
                readyCount === 0
              }
            >
              {processing
                ? 'Import en cours...'
                : `Importer ${readyCount} photo(s)`}
            </button>

            <button
              className="button secondary"
              type="button"
              onClick={
                clearRows
              }
              disabled={
                processing ||
                rows.length === 0
              }
            >
              Effacer la sélection
            </button>
          </div>

          {rows.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <Badge tone="neutral">
                {rows.length} fichier(s)
              </Badge>

              <Badge tone="good">
                {doneCount} importée(s)
              </Badge>

              <Badge tone="info">
                {readyCount} prête(s)
              </Badge>

              {errorCount >
                0 && (
                <Badge tone="danger">
                  {errorCount} à vérifier
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>

      {rows.length > 0 && (
        <Card>
          <div
            style={{
              overflowX:
                'auto',
            }}
          >
            <div
              style={{
                minWidth: 800,
              }}
            >
              <div
                style={{
                  display:
                    'grid',
                  gridTemplateColumns:
                    '80px 150px minmax(220px,1fr) 150px minmax(220px,1fr)',
                  gap: 12,
                  paddingBottom:
                    12,
                  fontWeight: 800,
                }}
              >
                <div>Photo</div>
                <div>Référence</div>
                <div>Produit</div>
                <div>Statut</div>
                <div>Détail</div>
              </div>

              {rows.map(
                (row) => (
                  <div
                    key={
                      row.id
                    }
                    style={{
                      display:
                        'grid',
                      gridTemplateColumns:
                        '80px 150px minmax(220px,1fr) 150px minmax(220px,1fr)',
                      gap: 12,
                      alignItems:
                        'center',
                      padding:
                        '12px 0',
                      borderTop:
                        '1px solid rgba(255,255,255,.08)',
                    }}
                  >
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        overflow:
                          'hidden',
                        borderRadius:
                          10,
                        background:
                          'rgba(255,255,255,.05)',
                      }}
                    >
                      <img
                        src={
                          row.previewUrl
                        }
                        alt=""
                        style={{
                          width:
                            '100%',
                          height:
                            '100%',
                          objectFit:
                            'contain',
                        }}
                      />
                    </div>

                    <strong>
                      {row.reference ||
                        '—'}
                    </strong>

                    <div>
                      {row.productName ||
                        'Produit introuvable'}
                    </div>

                    <div>
                      {statusBadge(
                        row
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.75,
                      }}
                    >
                      {row.message ||
                        'Prête à importer'}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </Card>
      )}

      <style jsx global>{`
        @media (max-width: 767px) {
          input[type='file'] {
            max-width: 100%;
          }
        }
      `}</style>
    </Page>
  )
}