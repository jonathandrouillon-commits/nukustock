'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'

import { supabase } from '@/lib/supabase'
import jsQR from 'jsqr'

type ProductRow = {
  id: string
  legacy_id: string | null
  internal_reference: string | null
  name: string
  category: string | null
  subcategory: string | null
  main_supplier: string | null
  photo_url: string | null
}

type LotRow = {
  id: string
  product_id: string
  lot_number: string | null
  expiry: string | null
  location_name: string | null
  quantity: number
}

type ScanType =
  | 'product'
  | 'category'
  | 'subcategory'
  | 'location'
  | 'supplier'

type StorageLocation = {
  id: string
  name: string
}

function formatDate(value: string | null) {
  if (!value) return 'Sans DLUO/DLC'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('fr-FR')
}

function expiryTime(value: string | null) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER
  }

  const time = new Date(
    `${value}T00:00:00`
  ).getTime()

  return Number.isFinite(time)
    ? time
    : Number.MAX_SAFE_INTEGER
}

function totalStock(
  productId: string,
  lots: LotRow[]
) {
  return lots
    .filter(
      (lot) =>
        lot.product_id === productId
    )
    .reduce(
      (sum, lot) =>
        sum +
        Math.max(
          0,
          Number(lot.quantity) || 0
        ),
      0
    )
}

function nextExpiry(
  productId: string,
  lots: LotRow[]
) {
  return lots
    .filter(
      (lot) =>
        lot.product_id === productId &&
        Number(lot.quantity) > 0
    )
    .sort(
      (a, b) =>
        expiryTime(a.expiry) -
        expiryTime(b.expiry)
    )[0]?.expiry || null
}

export default function ScanPage() {
  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    type,
    setType,
  ] = useState<ScanType | ''>('')

  const [
    title,
    setTitle,
  ] = useState('')

  const [
    products,
    setProducts,
  ] = useState<ProductRow[]>([])

  const [
    lots,
    setLots,
  ] = useState<LotRow[]>([])

  const [
    storageLocations,
    setStorageLocations,
  ] = useState<StorageLocation[]>([])

  const [
    transferOpen,
    setTransferOpen,
  ] = useState(false)

  const [
    transferLot,
    setTransferLot,
  ] = useState<LotRow | null>(null)

  const [
    transferTo,
    setTransferTo,
  ] = useState('')

  const [
    transferQty,
    setTransferQty,
  ] = useState(1)

  const [
    transferBusy,
    setTransferBusy,
  ] = useState(false)

  const [
    transferMessage,
    setTransferMessage,
  ] = useState('')

  const videoRef =
    useRef<HTMLVideoElement | null>(null)

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null)

  const scanLoopRef =
    useRef<number | null>(null)

  const streamRef =
    useRef<MediaStream | null>(null)

  const [
    scannerActive,
    setScannerActive,
  ] = useState(false)

  const [
    scannerError,
    setScannerError,
  ] = useState('')

  const [
    scannerStatus,
    setScannerStatus,
  ] = useState(
    'Appuie sur « Ouvrir la caméra » pour scanner un QR code NukuStock.'
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')

      const params =
        new URLSearchParams(
          window.location.search
        )

      const scanType =
        params.get('type') as ScanType | null

      if (!scanType) {
        setTitle('Scanner un QR code')
        setProducts([])
        setLots([])
        setLoading(false)
        return
      }

      if (
        ![
          'product',
          'category',
          'subcategory',
          'location',
          'supplier',
        ].includes(scanType)
      ) {
        setError(
          'QR code NukuStock non reconnu.'
        )
        setLoading(false)
        return
      }

      setType(scanType)

      try {
        const {
          data: locationRows,
          error: locationError,
        } = await supabase
          .from('storage_locations')
          .select('id, name')
          .eq('active', true)
          .order('name')

        if (locationError) {
          throw locationError
        }

        setStorageLocations(
          (locationRows || []) as StorageLocation[]
        )

        let productQuery =
          supabase
            .from('products')
            .select(
              'id, legacy_id, internal_reference, name, category, subcategory, main_supplier, photo_url'
            )
            .eq('active', true)

        if (scanType === 'product') {
          const id =
            params.get('id') || ''

          if (!id) {
            throw new Error(
              'Produit non renseigné dans le QR code.'
            )
          }

          const {
            data: productRows,
            error: productError,
          } = await productQuery

          if (productError) {
            throw productError
          }

          const product =
            (productRows || []).find(
              (row: any) =>
                row.id === id ||
                row.legacy_id === id
            )

          if (!product) {
            throw new Error(
              'Produit introuvable.'
            )
          }

          setTitle(product.name)
          setProducts([product])

          const {
            data: lotRows,
            error: lotError,
          } = await supabase
            .from('product_lots')
            .select(
              'id, product_id, lot_number, expiry, location_name, quantity'
            )
            .eq(
              'product_id',
              product.id
            )
            .order('expiry', {
              ascending: true,
            })

          if (lotError) {
            throw lotError
          }

          setLots(
            (lotRows || []) as LotRow[]
          )
        }

        if (scanType === 'category') {
          const category =
            params.get('category') || ''

          setTitle(
            `Catégorie : ${category}`
          )

          const {
            data: productRows,
            error: productError,
          } = await productQuery.eq(
            'category',
            category
          )

          if (productError) {
            throw productError
          }

          const rows =
            (productRows || []) as ProductRow[]

          setProducts(rows)

          const ids =
            rows.map(
              (product) => product.id
            )

          if (ids.length) {
            const {
              data: lotRows,
              error: lotError,
            } = await supabase
              .from('product_lots')
              .select(
                'id, product_id, lot_number, expiry, location_name, quantity'
              )
              .in('product_id', ids)

            if (lotError) {
              throw lotError
            }

            setLots(
              (lotRows || []) as LotRow[]
            )
          } else {
            setLots([])
          }
        }

        if (
          scanType === 'subcategory'
        ) {
          const category =
            params.get('category') || ''

          const subcategory =
            params.get('subcategory') || ''

          setTitle(
            `Sous-catégorie : ${subcategory}`
          )

          const {
            data: productRows,
            error: productError,
          } = await productQuery
            .eq('category', category)
            .eq(
              'subcategory',
              subcategory
            )

          if (productError) {
            throw productError
          }

          const rows =
            (productRows || []) as ProductRow[]

          setProducts(rows)

          const ids =
            rows.map(
              (product) => product.id
            )

          if (ids.length) {
            const {
              data: lotRows,
              error: lotError,
            } = await supabase
              .from('product_lots')
              .select(
                'id, product_id, lot_number, expiry, location_name, quantity'
              )
              .in('product_id', ids)

            if (lotError) {
              throw lotError
            }

            setLots(
              (lotRows || []) as LotRow[]
            )
          } else {
            setLots([])
          }
        }

        if (scanType === 'location') {
          const location =
            params.get('location') || ''

          setTitle(
            `Lieu : ${location}`
          )

          const {
            data: lotRows,
            error: lotError,
          } = await supabase
            .from('product_lots')
            .select(
              'id, product_id, lot_number, expiry, location_name, quantity'
            )
            .eq(
              'location_name',
              location
            )
            .gt('quantity', 0)

          if (lotError) {
            throw lotError
          }

          const rows =
            (lotRows || []) as LotRow[]

          setLots(rows)

          const productIds = [
            ...new Set(
              rows.map(
                (lot) => lot.product_id
              )
            ),
          ]

          if (productIds.length) {
            const {
              data: productRows,
              error: productError,
            } = await supabase
              .from('products')
              .select(
                'id, legacy_id, internal_reference, name, category, subcategory, main_supplier, photo_url'
              )
              .in('id', productIds)
              .eq('active', true)

            if (productError) {
              throw productError
            }

            setProducts(
              (productRows || []) as ProductRow[]
            )
          } else {
            setProducts([])
          }
        }

        if (scanType === 'supplier') {
          const supplier =
            params.get('supplier') || ''

          setTitle(
            `Fournisseur : ${supplier}`
          )

          const {
            data: productRows,
            error: productError,
          } = await productQuery.eq(
            'main_supplier',
            supplier
          )

          if (productError) {
            throw productError
          }

          const rows =
            (productRows || []) as ProductRow[]

          setProducts(rows)

          const ids =
            rows.map(
              (product) => product.id
            )

          if (ids.length) {
            const {
              data: lotRows,
              error: lotError,
            } = await supabase
              .from('product_lots')
              .select(
                'id, product_id, lot_number, expiry, location_name, quantity'
              )
              .in('product_id', ids)

            if (lotError) {
              throw lotError
            }

            setLots(
              (lotRows || []) as LotRow[]
            )
          } else {
            setLots([])
          }
        }
      } catch (caughtError) {
        console.error(
          'NukuStock QR scan:',
          caughtError
        )

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Impossible de charger les informations.'
        )
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const stopScanner = () => {
    if (scanLoopRef.current !== null) {
      cancelAnimationFrame(
        scanLoopRef.current
      )
      scanLoopRef.current = null
    }

    streamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop()
      )

    streamRef.current = null
    setScannerActive(false)
  }

  const openScannedValue = (
    rawValue: string
  ) => {
    const value =
      rawValue.trim()

    if (!value) {
      return
    }

    stopScanner()

    try {
      const url =
        new URL(
          value,
          window.location.origin
        )

      if (
        url.protocol === 'http:' ||
        url.protocol === 'https:'
      ) {
        setScannerStatus(
          'QR détecté. Ouverture...'
        )
        window.location.href =
          url.toString()
        return
      }
    } catch {
      // Peut être un ancien QR JSON NukuStock.
    }

    try {
      const parsed =
        JSON.parse(value)

      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.type === 'string'
      ) {
        const params =
          new URLSearchParams()

        params.set(
          'type',
          parsed.type
        )

        if (parsed.id) {
          params.set(
            'id',
            String(parsed.id)
          )
        }

        if (parsed.category) {
          params.set(
            'category',
            String(parsed.category)
          )
        }

        if (parsed.subcategory) {
          params.set(
            'subcategory',
            String(
              parsed.subcategory
            )
          )
        }

        if (
          parsed.location ||
          parsed.name
        ) {
          params.set(
            'location',
            String(
              parsed.location ||
                parsed.name
            )
          )
        }

        if (
          parsed.supplier ||
          parsed.name
        ) {
          if (
            parsed.type ===
            'supplier'
          ) {
            params.set(
              'supplier',
              String(
                parsed.supplier ||
                  parsed.name
              )
            )
          }
        }

        window.location.href =
          `/scan?${params.toString()}`
        return
      }
    } catch {
      // Ce n'est pas un ancien QR JSON.
    }

    setScannerError(
      'Ce QR code ne correspond pas à un QR NukuStock reconnu.'
    )
  }

  const scanFrame = () => {
    const video =
      videoRef.current

    const canvas =
      canvasRef.current

    if (
      !video ||
      !canvas ||
      video.readyState <
        video.HAVE_ENOUGH_DATA
    ) {
      scanLoopRef.current =
        requestAnimationFrame(
          scanFrame
        )
      return
    }

    const width =
      video.videoWidth

    const height =
      video.videoHeight

    if (
      width > 0 &&
      height > 0
    ) {
      canvas.width = width
      canvas.height = height

      const context =
        canvas.getContext(
          '2d',
          {
            willReadFrequently:
              true,
          }
        )

      if (context) {
        context.drawImage(
          video,
          0,
          0,
          width,
          height
        )

        const imageData =
          context.getImageData(
            0,
            0,
            width,
            height
          )

        const code =
          jsQR(
            imageData.data,
            imageData.width,
            imageData.height,
            {
              inversionAttempts:
                'attemptBoth',
            }
          )

        if (code?.data) {
          openScannedValue(
            code.data
          )
          return
        }
      }
    }

    scanLoopRef.current =
      requestAnimationFrame(
        scanFrame
      )
  }

  const startScanner =
    async () => {
      setScannerError('')
      setScannerStatus(
        'Recherche du QR code...'
      )

      try {
        stopScanner()

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode: {
                  ideal:
                    'environment',
                },
              },
              audio: false,
            }
          )

        streamRef.current =
          stream

        const video =
          videoRef.current

        if (!video) {
          throw new Error(
            'Caméra indisponible.'
          )
        }

        video.srcObject =
          stream

        await video.play()

        setScannerActive(true)

        scanLoopRef.current =
          requestAnimationFrame(
            scanFrame
          )
      } catch (caughtError) {
        console.error(
          'NukuStock scanner:',
          caughtError
        )

        setScannerError(
          'Impossible d’ouvrir la caméra. Vérifie que le navigateur a l’autorisation d’utiliser la caméra.'
        )

        setScannerStatus(
          'Caméra arrêtée.'
        )
      }
    }

  useEffect(() => {
    return () => {
      if (
        scanLoopRef.current !==
        null
      ) {
        cancelAnimationFrame(
          scanLoopRef.current
        )
      }

      streamRef.current
        ?.getTracks()
        .forEach((track) =>
          track.stop()
        )
    }
  }, [])

  const openTransfer = (
    lot: LotRow
  ) => {
    const available =
      Math.max(
        0,
        Number(lot.quantity) || 0
      )

    if (available <= 0) {
      setTransferMessage(
        'Aucun stock disponible à transférer.'
      )
      return
    }

    setTransferLot(lot)
    setTransferTo('')
    setTransferQty(1)
    setTransferMessage('')
    setTransferOpen(true)
  }

  const confirmTransfer =
    async () => {
      if (!transferLot) {
        return
      }

      const available =
        Math.max(
          0,
          Number(
            transferLot.quantity
          ) || 0
        )

      const quantity =
        Math.max(
          0,
          Number(transferQty) || 0
        )

      if (!transferTo) {
        setTransferMessage(
          'Choisis le lieu de destination.'
        )
        return
      }

      if (
        transferTo ===
        transferLot.location_name
      ) {
        setTransferMessage(
          'Le lieu de destination doit être différent du lieu source.'
        )
        return
      }

      if (
        quantity <= 0 ||
        quantity > available
      ) {
        setTransferMessage(
          `Quantité invalide. Disponible : ${available}.`
        )
        return
      }

      setTransferBusy(true)
      setTransferMessage('')

      try {
        const remaining =
          available - quantity

        const {
          error: sourceError,
        } = await supabase
          .from('product_lots')
          .update({
            quantity: remaining,
          })
          .eq('id', transferLot.id)

        if (sourceError) {
          throw sourceError
        }

        const {
          data: destinationLots,
          error: destinationFindError,
        } = await supabase
          .from('product_lots')
          .select(
            'id, quantity'
          )
          .eq(
            'product_id',
            transferLot.product_id
          )
          .eq(
            'location_name',
            transferTo
          )

        if (destinationFindError) {
          throw destinationFindError
        }

        const sameDestination =
          (destinationLots || []).find(
            (row: any) => {
              const lot =
                lots.find(
                  (item) =>
                    item.id === row.id
                )

              return lot
                ? (
                    (lot.lot_number || '') ===
                      (transferLot.lot_number || '') &&
                    (lot.expiry || '') ===
                      (transferLot.expiry || '')
                  )
                : false
            }
          )

        if (sameDestination) {
          const {
            error: destinationUpdateError,
          } = await supabase
            .from('product_lots')
            .update({
              quantity:
                Math.max(
                  0,
                  Number(
                    sameDestination.quantity
                  ) || 0
                ) + quantity,
            })
            .eq(
              'id',
              sameDestination.id
            )

          if (destinationUpdateError) {
            throw destinationUpdateError
          }
        } else {
          const {
            error: destinationInsertError,
          } = await supabase
            .from('product_lots')
            .insert({
              id: crypto.randomUUID(),
              legacy_id:
                crypto.randomUUID(),
              product_id:
                transferLot.product_id,
              lot_number:
                transferLot.lot_number ||
                null,
              expiry:
                transferLot.expiry ||
                null,
              location_name:
                transferTo,
              quantity,
            })

          if (destinationInsertError) {
            throw destinationInsertError
          }
        }

        const {
          data: refreshedLots,
          error: refreshError,
        } = await supabase
          .from('product_lots')
          .select(
            'id, product_id, lot_number, expiry, location_name, quantity'
          )
          .eq(
            'product_id',
            transferLot.product_id
          )
          .order('expiry', {
            ascending: true,
          })

        if (refreshError) {
          throw refreshError
        }

        setLots(
          (refreshedLots || []) as LotRow[]
        )

        setTransferOpen(false)
        setTransferMessage(
          `Transfert effectué : ${quantity} unité(s) vers ${transferTo}.`
        )
      } catch (caughtError) {
        console.error(
          'Transfert QR NukuStock:',
          caughtError
        )

        setTransferMessage(
          caughtError instanceof Error
            ? caughtError.message
            : 'Impossible d’effectuer le transfert.'
        )
      } finally {
        setTransferBusy(false)
      }
    }

  const sortedProducts =
    useMemo(
      () =>
        [...products].sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
              'fr'
            )
        ),
      [products]
    )

  if (loading) {
    return (
      <main style={styles.center}>
        Chargement du stock...
      </main>
    )
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.brand}>
            NUKUTEPIPI · NUKUSTOCK
          </div>

          <h1 style={styles.title}>
            {title || 'Scan NukuStock'}
          </h1>
        </div>
      </header>

      <section style={styles.content}>
        {!type && !error && (
          <div style={styles.scannerCard}>
            <div style={styles.scannerIntro}>
              <h2 style={styles.scannerTitle}>
                Scanner un QR code
              </h2>

              <p style={styles.scannerText}>
                Scanne un QR Produit, Catégorie,
                Sous-catégorie, Lieu ou Fournisseur.
              </p>
            </div>

            <div style={styles.cameraFrame}>
              <video
                ref={videoRef}
                playsInline
                muted
                style={styles.cameraVideo}
              />

              {!scannerActive && (
                <div style={styles.cameraPlaceholder}>
                  <div style={styles.cameraIcon}>
                    ⌗
                  </div>
                  <strong>
                    Caméra prête
                  </strong>
                </div>
              )}

              <div style={styles.scanGuide} />
            </div>

            <canvas
              ref={canvasRef}
              style={{
                display: 'none',
              }}
            />

            <div style={styles.scannerStatus}>
              {scannerStatus}
            </div>

            {scannerError && (
              <div style={styles.error}>
                {scannerError}
              </div>
            )}

            <div style={styles.scannerActions}>
              {!scannerActive ? (
                <button
                  type="button"
                  onClick={() =>
                    void startScanner()
                  }
                  style={styles.scanPrimaryButton}
                >
                  Ouvrir la caméra
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopScanner}
                  style={styles.scanSecondaryButton}
                >
                  Arrêter la caméra
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {transferMessage && !transferOpen && (
          <div style={styles.transferNotice}>
            {transferMessage}
          </div>
        )}

        {!error && (
          <>
            <div style={styles.summary}>
              <strong>
                {sortedProducts.length}
              </strong>{' '}
              produit
              {sortedProducts.length > 1
                ? 's'
                : ''}
              {' · '}
              <strong>
                {sortedProducts.reduce(
                  (sum, product) =>
                    sum +
                    totalStock(
                      product.id,
                      lots
                    ),
                  0
                )}
              </strong>{' '}
              unité
              {sortedProducts.reduce(
                (sum, product) =>
                  sum +
                  totalStock(
                    product.id,
                    lots
                  ),
                0
              ) > 1
                ? 's'
                : ''}
            </div>

            <div style={styles.list}>
              {sortedProducts.map(
                (product) => {
                  const productLots =
                    lots
                      .filter(
                        (lot) =>
                          lot.product_id ===
                            product.id &&
                          Number(
                            lot.quantity
                          ) > 0
                      )
                      .sort(
                        (a, b) =>
                          expiryTime(
                            a.expiry
                          ) -
                          expiryTime(
                            b.expiry
                          )
                      )

                  const stock =
                    totalStock(
                      product.id,
                      lots
                    )

                  const expiry =
                    nextExpiry(
                      product.id,
                      lots
                    )

                  return (
                    <article
                      key={product.id}
                      style={styles.card}
                    >
                      <div
                        style={
                          styles.productTop
                        }
                      >
                        <div
                          style={
                            styles.photoWrap
                          }
                        >
                          {product.photo_url ? (
                            <img
                              src={
                                product.photo_url
                              }
                              alt=""
                              style={
                                styles.photo
                              }
                            />
                          ) : (
                            <div
                              style={
                                styles.photoPlaceholder
                              }
                            >
                              N
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <h2
                            style={
                              styles.productName
                            }
                          >
                            {product.name}
                          </h2>

                          <div
                            style={
                              styles.reference
                            }
                          >
                            {product.internal_reference ||
                              'Sans référence'}
                          </div>

                          <div
                            style={
                              styles.category
                            }
                          >
                            {[
                              product.category,
                              product.subcategory,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </div>
                      </div>

                      <div
                        style={styles.kpis}
                      >
                        <div
                          style={
                            styles.kpi
                          }
                        >
                          <span>
                            Stock total
                          </span>
                          <strong>
                            {stock}
                          </strong>
                        </div>

                        <div
                          style={
                            styles.kpi
                          }
                        >
                          <span>
                            DLUO/DLC la +
                            courte
                          </span>
                          <strong>
                            {formatDate(
                              expiry
                            )}
                          </strong>
                        </div>
                      </div>

                      <div
                        style={
                          styles.locations
                        }
                      >
                        {productLots.length ? (
                          productLots.map(
                            (lot) => (
                              <div
                                key={lot.id}
                                style={
                                  styles.lotRow
                                }
                              >
                                <div>
                                  <strong>
                                    {lot.location_name ||
                                      'Non affecté'}
                                  </strong>

                                  <div
                                    style={
                                      styles.lotMeta
                                    }
                                  >
                                    DLUO/DLC :{' '}
                                    {formatDate(
                                      lot.expiry
                                    )}
                                    {lot.lot_number
                                      ? ` · Lot ${lot.lot_number}`
                                      : ''}
                                  </div>
                                </div>

                                <div
                                  style={{
                                    display: 'grid',
                                    justifyItems: 'end',
                                    gap: 6,
                                  }}
                                >
                                  <strong
                                    style={
                                      styles.qty
                                    }
                                  >
                                    {Number(
                                      lot.quantity
                                    ) || 0}
                                  </strong>

                                  {type === 'product' && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openTransfer(
                                          lot
                                        )
                                      }
                                      style={
                                        styles.transferButton
                                      }
                                    >
                                      Transférer
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          )
                        ) : (
                          <div
                            style={
                              styles.noStock
                            }
                          >
                            Aucun stock
                            disponible.
                          </div>
                        )}
                      </div>
                    </article>
                  )
                }
              )}

              {!sortedProducts.length && (
                <div style={styles.empty}>
                  Aucun produit trouvé pour
                  ce QR code.
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {transferOpen && transferLot && (
        <div
          style={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (
              event.currentTarget ===
              event.target
            ) {
              setTransferOpen(false)
            }
          }}
        >
          <div style={styles.modal}>
            <h2 style={{ margin: 0 }}>
              Transférer le stock
            </h2>

            <div
              style={{
                marginTop: 8,
                color: '#667085',
                fontSize: 13,
              }}
            >
              Source :{' '}
              <strong>
                {transferLot.location_name ||
                  'Non affecté'}
              </strong>
              {' · '}
              Disponible :{' '}
              <strong>
                {Math.max(
                  0,
                  Number(
                    transferLot.quantity
                  ) || 0
                )}
              </strong>
            </div>

            <div
              style={{
                marginTop: 18,
                display: 'grid',
                gap: 14,
              }}
            >
              <label>
                <div style={styles.fieldLabel}>
                  Lieu de destination
                </div>

                <select
                  value={transferTo}
                  onChange={(event) =>
                    setTransferTo(
                      event.target.value
                    )
                  }
                  style={styles.field}
                >
                  <option value="">
                    Choisir un lieu
                  </option>

                  {storageLocations
                    .filter(
                      (location) =>
                        location.name !==
                        transferLot.location_name
                    )
                    .map((location) => (
                      <option
                        key={location.id}
                        value={location.name}
                      >
                        {location.name}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                <div style={styles.fieldLabel}>
                  Quantité
                </div>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={Math.max(
                    0,
                    Number(
                      transferLot.quantity
                    ) || 0
                  )}
                  value={transferQty}
                  onChange={(event) =>
                    setTransferQty(
                      Math.max(
                        0,
                        Number(
                          event.target.value
                        ) || 0
                      )
                    )
                  }
                  style={styles.field}
                />
              </label>

              {transferMessage && (
                <div style={styles.error}>
                  {transferMessage}
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 20,
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1.3fr',
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setTransferOpen(false)
                }
                style={
                  styles.secondaryButton
                }
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={transferBusy}
                onClick={() =>
                  void confirmTransfer()
                }
                style={
                  styles.primaryButton
                }
              >
                {transferBusy
                  ? 'Transfert...'
                  : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

const styles:
  Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f4f6f9',
    color: '#101828',
  },
  center: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: '#f4f6f9',
    color: '#101828',
    fontWeight: 800,
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    padding:
      '16px max(16px, env(safe-area-inset-left))',
    background:
      'rgba(255,255,255,.98)',
    borderBottom:
      '1px solid #e4e7ec',
  },
  brand: {
    color: '#98a2b3',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '.1em',
  },
  title: {
    margin: '4px 0 0',
    fontSize: 24,
    lineHeight: 1.1,
  },
  content: {
    width: 'min(760px,100%)',
    margin: '0 auto',
    padding:
      '16px 12px 40px',
    boxSizing: 'border-box',
  },
  error: {
    padding: 14,
    borderRadius: 12,
    background: '#fef3f2',
    border: '1px solid #fecdca',
    color: '#b42318',
    fontWeight: 700,
  },
  summary: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: '#fff',
    border: '1px solid #e4e7ec',
    fontSize: 13,
  },
  list: {
    display: 'grid',
    gap: 12,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    background: '#fff',
    border: '1px solid #e4e7ec',
    boxShadow:
      '0 8px 24px rgba(16,24,40,.05)',
  },
  productTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  photoWrap: {
    flex: '0 0 auto',
    width: 64,
    height: 64,
    overflow: 'hidden',
    borderRadius: 12,
    border: '1px solid #e4e7ec',
    background: '#f8fafc',
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    color: '#98a2b3',
    fontWeight: 900,
  },
  productName: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1.2,
  },
  reference: {
    marginTop: 4,
    color: '#475467',
    fontSize: 12,
    fontWeight: 900,
  },
  category: {
    marginTop: 3,
    color: '#667085',
    fontSize: 11,
  },
  kpis: {
    marginTop: 14,
    display: 'grid',
    gridTemplateColumns:
      'repeat(2,minmax(0,1fr))',
    gap: 8,
  },
  kpi: {
    padding: 10,
    display: 'grid',
    gap: 4,
    borderRadius: 10,
    background: '#f8fafc',
    border: '1px solid #eaecf0',
  },
  locations: {
    marginTop: 12,
    borderTop:
      '1px solid #eaecf0',
  },
  lotRow: {
    minHeight: 54,
    padding: '10px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: 12,
    borderBottom:
      '1px solid #f2f4f7',
  },
  lotMeta: {
    marginTop: 3,
    color: '#667085',
    fontSize: 11,
  },
  qty: {
    flex: '0 0 auto',
    minWidth: 42,
    textAlign: 'right',
    fontSize: 18,
  },
  noStock: {
    padding: '14px 0',
    color: '#b42318',
    fontSize: 12,
    fontWeight: 700,
  },
  scannerCard: {
    padding: 16,
    borderRadius: 18,
    background: '#fff',
    border: '1px solid #e4e7ec',
    boxShadow:
      '0 12px 32px rgba(16,24,40,.06)',
  },
  scannerIntro: {
    marginBottom: 14,
  },
  scannerTitle: {
    margin: 0,
    fontSize: 22,
    lineHeight: 1.15,
  },
  scannerText: {
    margin: '7px 0 0',
    color: '#667085',
    fontSize: 13,
    lineHeight: 1.45,
  },
  cameraFrame: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 5',
    maxHeight: 560,
    overflow: 'hidden',
    borderRadius: 18,
    background: '#0c1525',
  },
  cameraVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cameraPlaceholder: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    gap: 8,
    color: '#fff',
    background:
      'linear-gradient(180deg,#101828,#0c1525)',
  },
  cameraIcon: {
    fontSize: 52,
    lineHeight: 1,
  },
  scanGuide: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 'min(68%,280px)',
    aspectRatio: '1 / 1',
    transform:
      'translate(-50%,-50%)',
    border: '3px solid rgba(255,255,255,.92)',
    borderRadius: 22,
    boxShadow:
      '0 0 0 999px rgba(0,0,0,.18)',
    pointerEvents: 'none',
  },
  scannerStatus: {
    marginTop: 12,
    padding: '10px 12px',
    borderRadius: 11,
    background: '#f8fafc',
    border: '1px solid #eaecf0',
    color: '#475467',
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'center',
  },
  scannerActions: {
    marginTop: 12,
    display: 'grid',
    gridTemplateColumns: '1fr',
  },
  scanPrimaryButton: {
    minHeight: 52,
    border: 0,
    borderRadius: 13,
    background: '#0c1525',
    color: '#fff',
    fontSize: 15,
    fontWeight: 900,
    cursor: 'pointer',
  },
  scanSecondaryButton: {
    minHeight: 52,
    border: '1px solid #d0d5dd',
    borderRadius: 13,
    background: '#fff',
    color: '#101828',
    fontSize: 15,
    fontWeight: 900,
    cursor: 'pointer',
  },
  transferButton: {
    border: '1px solid #d0d5dd',
    borderRadius: 9,
    background: '#fff',
    color: '#101828',
    padding: '7px 10px',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
  },
  transferNotice: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    background: '#ecfdf3',
    border: '1px solid #abefc6',
    color: '#067647',
    fontSize: 12,
    fontWeight: 800,
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'grid',
    placeItems: 'center',
    padding: 16,
    background: 'rgba(15,23,42,.62)',
  },
  modal: {
    width: 'min(520px,100%)',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: 20,
    borderRadius: 18,
    background: '#fff',
    color: '#101828',
    boxShadow:
      '0 24px 70px rgba(15,23,42,.28)',
  },
  fieldLabel: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 800,
  },
  field: {
    width: '100%',
    minHeight: 48,
    boxSizing: 'border-box',
    padding: '0 12px',
    borderRadius: 12,
    border: '1px solid #d0d5dd',
    background: '#fff',
    color: '#101828',
    fontSize: 16,
  },
  primaryButton: {
    minHeight: 48,
    border: 0,
    borderRadius: 12,
    background: '#101828',
    color: '#fff',
    fontWeight: 900,
    cursor: 'pointer',
  },
  secondaryButton: {
    minHeight: 48,
    border: '1px solid #d0d5dd',
    borderRadius: 12,
    background: '#fff',
    color: '#101828',
    fontWeight: 800,
    cursor: 'pointer',
  },
  empty: {
    padding: 26,
    textAlign: 'center',
    border:
      '1px dashed #d0d5dd',
    borderRadius: 14,
    color: '#667085',
    background: '#fff',
  },
}