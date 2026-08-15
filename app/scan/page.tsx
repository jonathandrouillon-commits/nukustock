'use client'

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'

import { supabase } from '@/lib/supabase'

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

      if (
        !scanType ||
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
        {error && (
          <div style={styles.error}>
            {error}
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

                                <strong
                                  style={
                                    styles.qty
                                  }
                                >
                                  {Number(
                                    lot.quantity
                                  ) || 0}
                                </strong>
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