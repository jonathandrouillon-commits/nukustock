'use client'

import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

import { Page, Card } from '@/components/ui'
import { useProducts } from '@/lib/store'
import { locations } from '@/lib/demo-data'
import type { Product } from '@/lib/types'

type LabelMode =
  | 'categories'
  | 'subcategories'
  | 'products'
  | 'locations'

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function categoryQrValue(category: string) {
  return JSON.stringify({
    app: 'NukuStock',
    type: 'category',
    category,
  })
}

function subcategoryQrValue(
  category: string,
  subcategory: string
) {
  return JSON.stringify({
    app: 'NukuStock',
    type: 'subcategory',
    category,
    subcategory,
  })
}

function productQrValue(product: Product) {
  return JSON.stringify({
    app: 'NukuStock',
    type: 'product',
    id: product.id,
    reference: product.internalRef,
    name: product.name,
    category: product.category,
    subcategory: product.subcategory,
  })
}

function locationQrValue(location: string) {
  return JSON.stringify({
    app: 'NukuStock',
    type: 'location',
    location,
  })
}

function LabelCard({
  title,
  subtitle,
  reference,
  qrValue,
}: {
  title: string
  subtitle?: string
  reference?: string
  qrValue: string
}) {
  return (
    <div
      className="printLabel"
      style={{
        width: 260,
        minHeight: 330,
        border: '1px solid #d0d5dd',
        borderRadius: 16,
        background: '#fff',
        color: '#101828',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        breakInside: 'avoid',
      }}
    >
      <div
        style={{
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: '.12em',
            fontWeight: 900,
            color: '#667085',
          }}
        >
          NUKUTEPIPI · NUKUSTOCK
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 18,
            fontWeight: 900,
            lineHeight: 1.15,
          }}
        >
          {title}
        </div>

        {subtitle && (
          <div
            style={{
              marginTop: 5,
              fontSize: 11,
              color: '#667085',
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
        )}

        {reference && (
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: '.06em',
            }}
          >
            {reference}
          </div>
        )}
      </div>

      <QRCodeSVG
        value={qrValue}
        size={180}
        level="M"
        marginSize={2}
        title={title}
      />

      <div
        style={{
          fontSize: 9,
          color: '#98a2b3',
          textAlign: 'center',
        }}
      >
        Scanner avec NukuStock
      </div>
    </div>
  )
}

export default function LabelsPage() {
  const { items: products } = useProducts()

  const [mode, setMode] =
    useState<LabelMode>('categories')

  const [search, setSearch] = useState('')

  const [selectedIds, setSelectedIds] =
    useState<string[]>([])

  const categories = useMemo(() => {
    return [
      ...new Set(
        products
          .map((product) => product.category)
          .filter(Boolean)
      ),
    ].sort((a, b) =>
      a.localeCompare(b, 'fr')
    )
  }, [products])

  const subcategories = useMemo(() => {
    const map = new Map<string, {
      category: string
      subcategory: string
    }>()

    products.forEach((product) => {
      if (!product.subcategory) return

      const key =
        `${product.category}|||${product.subcategory}`

      map.set(key, {
        category: product.category,
        subcategory: product.subcategory,
      })
    })

    return [...map.values()].sort((a, b) => {
      const categoryCompare =
        a.category.localeCompare(
          b.category,
          'fr'
        )

      if (categoryCompare !== 0) {
        return categoryCompare
      }

      return a.subcategory.localeCompare(
        b.subcategory,
        'fr'
      )
    })
  }, [products])

  const filteredProducts = useMemo(() => {
    const query = normalize(search)

    return products
      .filter((product) => {
        if (!query) return true

        return normalize(
          `${product.internalRef} ${product.name} ${product.brand} ${product.category} ${product.subcategory}`
        ).includes(query)
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'fr')
      )
  }, [products, search])

  const filteredLocations = useMemo(() => {
    const query = normalize(search)

    return locations
      .filter((location) =>
        !query ||
        normalize(location).includes(query)
      )
      .sort((a, b) =>
        a.localeCompare(b, 'fr')
      )
  }, [search])

  const filteredCategories = useMemo(() => {
    const query = normalize(search)

    return categories.filter(
      (category) =>
        !query ||
        normalize(category).includes(query)
    )
  }, [categories, search])

  const filteredSubcategories =
    useMemo(() => {
      const query = normalize(search)

      return subcategories.filter((item) => {
        if (!query) return true

        return normalize(
          `${item.category} ${item.subcategory}`
        ).includes(query)
      })
    }, [subcategories, search])

  const toggle = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter(
            (item) => item !== id
          )
        : [...current, id]
    )
  }

  const selectAllVisible = () => {
    const ids =
      mode === 'categories'
        ? filteredCategories.map(
            (category) =>
              `category:${category}`
          )
        : mode === 'subcategories'
        ? filteredSubcategories.map(
            (item) =>
              `subcategory:${item.category}:${item.subcategory}`
          )
        : mode === 'products'
        ? filteredProducts.map(
            (product) =>
              `product:${product.id}`
          )
        : filteredLocations.map(
            (location) =>
              `location:${location}`
          )

    setSelectedIds((current) => [
      ...new Set([
        ...current,
        ...ids,
      ]),
    ])
  }

  const selectedCategories =
    filteredCategories.filter((category) =>
      selectedIds.includes(
        `category:${category}`
      )
    )

  const selectedSubcategories =
    filteredSubcategories.filter((item) =>
      selectedIds.includes(
        `subcategory:${item.category}:${item.subcategory}`
      )
    )

  const selectedProducts =
    filteredProducts.filter((product) =>
      selectedIds.includes(
        `product:${product.id}`
      )
    )

  const selectedLocations =
    filteredLocations.filter((location) =>
      selectedIds.includes(
        `location:${location}`
      )
    )

  return (
    <Page
      title="Étiquettes & QR Codes"
      subtitle="Catégories, sous-catégories, produits et lieux de stockage"
      action={
        <button
          className="button"
          type="button"
          onClick={() =>
            window.print()
          }
        >
          Imprimer
        </button>
      }
    >
      <div
        className="screenOnly"
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <button
          className={
            mode === 'categories'
              ? 'button'
              : 'button secondary'
          }
          type="button"
          onClick={() => {
            setMode('categories')
            setSelectedIds([])
            setSearch('')
          }}
        >
          Catégories
        </button>

        <button
          className={
            mode === 'subcategories'
              ? 'button'
              : 'button secondary'
          }
          type="button"
          onClick={() => {
            setMode('subcategories')
            setSelectedIds([])
            setSearch('')
          }}
        >
          Sous-catégories
        </button>

        <button
          className={
            mode === 'products'
              ? 'button'
              : 'button secondary'
          }
          type="button"
          onClick={() => {
            setMode('products')
            setSelectedIds([])
            setSearch('')
          }}
        >
          Produits
        </button>

        <button
          className={
            mode === 'locations'
              ? 'button'
              : 'button secondary'
          }
          type="button"
          onClick={() => {
            setMode('locations')
            setSelectedIds([])
            setSearch('')
          }}
        >
          Lieux de stockage
        </button>
      </div>

      <Card>
        <div
          className="screenOnly"
          style={{
            display: 'grid',
            gridTemplateColumns:
              '1fr auto auto',
            gap: 10,
            alignItems: 'end',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 800,
                marginBottom: 6,
              }}
            >
              Rechercher
            </label>

            <input
              className="input"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder={
                mode === 'categories'
                  ? 'Catégorie...'
                  : mode ===
                    'subcategories'
                  ? 'Catégorie ou sous-catégorie...'
                  : mode === 'products'
                  ? 'Nom, référence, marque...'
                  : 'Lieu de stockage...'
              }
            />
          </div>

          <button
            className="button secondary"
            type="button"
            onClick={selectAllVisible}
          >
            Tout sélectionner
          </button>

          <button
            className="button secondary"
            type="button"
            onClick={() =>
              setSelectedIds([])
            }
          >
            Effacer
          </button>
        </div>
      </Card>

      <div
        className="screenOnly"
        style={{
          marginTop: 16,
          display: 'grid',
          gap: 8,
        }}
      >
        {mode === 'categories' &&
          filteredCategories.map(
            (category) => {
              const id =
                `category:${category}`

              return (
                <label
                  key={id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'auto 1fr',
                    gap: 10,
                    alignItems:
                      'center',
                    padding: 10,
                    border:
                      '1px solid rgba(255,255,255,.08)',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(
                      id
                    )}
                    onChange={() =>
                      toggle(id)
                    }
                  />

                  <strong>
                    {category}
                  </strong>
                </label>
              )
            }
          )}

        {mode ===
          'subcategories' &&
          filteredSubcategories.map(
            (item) => {
              const id =
                `subcategory:${item.category}:${item.subcategory}`

              return (
                <label
                  key={id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'auto 1fr',
                    gap: 10,
                    alignItems:
                      'center',
                    padding: 10,
                    border:
                      '1px solid rgba(255,255,255,.08)',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(
                      id
                    )}
                    onChange={() =>
                      toggle(id)
                    }
                  />

                  <div>
                    <strong>
                      {item.subcategory}
                    </strong>

                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 10,
                        opacity: 0.65,
                      }}
                    >
                      Catégorie :{' '}
                      {item.category}
                    </div>
                  </div>
                </label>
              )
            }
          )}

        {mode === 'products' &&
          filteredProducts.map(
            (product) => {
              const id =
                `product:${product.id}`

              return (
                <label
                  key={id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'auto 1fr auto',
                    gap: 10,
                    alignItems:
                      'center',
                    padding: 10,
                    border:
                      '1px solid rgba(255,255,255,.08)',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(
                      id
                    )}
                    onChange={() =>
                      toggle(id)
                    }
                  />

                  <div>
                    <strong>
                      {product.name}
                    </strong>

                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 10,
                        opacity: 0.65,
                      }}
                    >
                      {product.category}{' '}
                      ·{' '}
                      {
                        product.subcategory
                      }
                    </div>
                  </div>

                  <strong
                    style={{
                      fontSize: 11,
                    }}
                  >
                    {
                      product.internalRef
                    }
                  </strong>
                </label>
              )
            }
          )}

        {mode === 'locations' &&
          filteredLocations.map(
            (location) => {
              const id =
                `location:${location}`

              return (
                <label
                  key={id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'auto 1fr',
                    gap: 10,
                    alignItems:
                      'center',
                    padding: 10,
                    border:
                      '1px solid rgba(255,255,255,.08)',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(
                      id
                    )}
                    onChange={() =>
                      toggle(id)
                    }
                  />

                  <strong>
                    {location}
                  </strong>
                </label>
              )
            }
          )}
      </div>

      <div
        className="labelsGrid"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          marginTop: 18,
        }}
      >
        {mode === 'categories' &&
          selectedCategories.map(
            (category) => (
              <LabelCard
                key={category}
                title={category}
                subtitle="Catégorie NukuStock"
                qrValue={categoryQrValue(
                  category
                )}
              />
            )
          )}

        {mode ===
          'subcategories' &&
          selectedSubcategories.map(
            (item) => (
              <LabelCard
                key={`${item.category}-${item.subcategory}`}
                title={
                  item.subcategory
                }
                subtitle={`Catégorie : ${item.category}`}
                qrValue={subcategoryQrValue(
                  item.category,
                  item.subcategory
                )}
              />
            )
          )}

        {mode === 'products' &&
          selectedProducts.map(
            (product) => (
              <LabelCard
                key={product.id}
                title={product.name}
                subtitle={`${product.category} · ${product.subcategory}`}
                reference={
                  product.internalRef
                }
                qrValue={productQrValue(
                  product
                )}
              />
            )
          )}

        {mode === 'locations' &&
          selectedLocations.map(
            (location) => (
              <LabelCard
                key={location}
                title={location}
                subtitle="Lieu de stockage"
                qrValue={locationQrValue(
                  location
                )}
              />
            )
          )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .sidebar,
          .topbar,
          .mobileNav,
          .screenOnly {
            display: none !important;
          }

          .shell,
          .main {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }

          .labelsGrid {
            display: grid !important;
            grid-template-columns:
              repeat(3, 1fr) !important;
            gap: 10mm !important;
            padding: 10mm !important;
          }

          .printLabel {
            width: 58mm !important;
            min-height: 78mm !important;
            border: 1px solid #999 !important;
            border-radius: 3mm !important;
            padding: 5mm !important;
          }
        }
      `}</style>
    </Page>
  )
}