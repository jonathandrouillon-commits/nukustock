'use client'

import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

import { Page, Card } from '@/components/ui'
import { useMasterData, useProducts, useSuppliers } from '@/lib/store'
import type { Product, Supplier } from '@/lib/types'

type LabelMode =
  | 'categories'
  | 'subcategories'
  | 'products'
  | 'suppliers'
  | 'locations'

type PrintableLabel = {
  id: string
  title: string
  subtitle?: string
  reference?: string
  qrValue: string
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }

  return result
}

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

function locationQrValue(location: {
  id: string
  name: string
  internalRef?: string
}) {
  return JSON.stringify({
    app: 'NukuStock',
    type: 'location',
    id: location.id,
    reference: location.internalRef || '',
    location: location.name,
  })
}

function supplierQrValue(supplier: Supplier) {
  return JSON.stringify({
    app: 'NukuStock',
    type: 'supplier',
    id: supplier.id,
    reference: supplier.internalRef || '',
    supplier: supplier.name,
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
  const { items: suppliers } = useSuppliers()
  const { items: masterData } = useMasterData()

  const locations = useMemo(
    () =>
      masterData
        .filter(
          (item) =>
            item.type === 'location' &&
            item.active !== false
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            'fr',
            {
              numeric: true,
              sensitivity: 'base',
            }
          )
        ),
    [masterData]
  )

  const activeSuppliers = useMemo(
    () =>
      [...suppliers]
        .filter(
          (supplier) =>
            supplier.active !== false
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            'fr',
            {
              sensitivity: 'base',
            }
          )
        ),
    [suppliers]
  )

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

  const filteredSuppliers = useMemo(() => {
    const query = normalize(search)

    return activeSuppliers.filter(
      (supplier) =>
        !query ||
        normalize(
          `${supplier.internalRef || ''} ${supplier.name}`
        ).includes(query)
    )
  }, [activeSuppliers, search])

  const filteredLocations = useMemo(() => {
    const query = normalize(search)

    return locations.filter(
      (location) =>
        !query ||
        normalize(
          `${location.internalRef || ''} ${location.name}`
        ).includes(query)
    )
  }, [locations, search])

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
        : mode === 'suppliers'
        ? filteredSuppliers.map(
            (supplier) =>
              `supplier:${supplier.id}`
          )
        : filteredLocations.map(
            (location) =>
              `location:${location.id}`
          )

    setSelectedIds((current) => [
      ...new Set([
        ...current,
        ...ids,
      ]),
    ])
  }

  const selectedLabelItems = useMemo<PrintableLabel[]>(
    () =>
      selectedIds.flatMap((id) => {
        if (id.startsWith('category:')) {
          const category = id.slice('category:'.length)

          if (!categories.includes(category)) {
            return []
          }

          return [
            {
              id,
              title: category,
              subtitle: 'Catégorie NukuStock',
              qrValue: categoryQrValue(category),
            },
          ]
        }

        if (id.startsWith('subcategory:')) {
          const raw = id.slice('subcategory:'.length)
          const separatorIndex = raw.indexOf(':')

          if (separatorIndex < 0) {
            return []
          }

          const category = raw.slice(0, separatorIndex)
          const subcategory = raw.slice(separatorIndex + 1)

          const exists = subcategories.some(
            (item) =>
              item.category === category &&
              item.subcategory === subcategory
          )

          if (!exists) {
            return []
          }

          return [
            {
              id,
              title: subcategory,
              subtitle: `Catégorie : ${category}`,
              qrValue: subcategoryQrValue(
                category,
                subcategory
              ),
            },
          ]
        }

        if (id.startsWith('product:')) {
          const productId = id.slice('product:'.length)
          const product = products.find(
            (item) => item.id === productId
          )

          if (!product) {
            return []
          }

          return [
            {
              id,
              title: product.name,
              subtitle:
                `${product.category} · ${product.subcategory}`,
              reference: product.internalRef,
              qrValue: productQrValue(product),
            },
          ]
        }

        if (id.startsWith('supplier:')) {
          const supplierId = id.slice('supplier:'.length)
          const supplier = suppliers.find(
            (item) => item.id === supplierId
          )

          if (!supplier) {
            return []
          }

          return [
            {
              id,
              title: supplier.name,
              subtitle: 'Fournisseur NukuStock',
              reference: supplier.internalRef || '',
              qrValue: supplierQrValue(supplier),
            },
          ]
        }

        if (id.startsWith('location:')) {
          const locationId = id.slice('location:'.length)
          const location = locations.find(
            (item) => item.id === locationId
          )

          if (!location) {
            return []
          }

          return [
            {
              id,
              title: location.name,
              subtitle: 'Lieu de stockage',
              reference: location.internalRef || '',
              qrValue: locationQrValue(location),
            },
          ]
        }

        return []
      }),
    [
      selectedIds,
      categories,
      subcategories,
      products,
      suppliers,
      locations,
    ]
  )

  const a4Pages = useMemo(
    () => chunk(selectedLabelItems, 6),
    [selectedLabelItems]
  )

  const printLabels = () => {
    if (!selectedLabelItems.length) {
      window.alert(
        'Sélectionne au moins une étiquette.'
      )
      return
    }

    window.print()
  }

  const downloadPdf = async () => {
    if (!selectedLabelItems.length) {
      window.alert(
        'Sélectionne au moins une étiquette.'
      )
      return
    }

    try {
      const [{ default: html2canvas }, { jsPDF }] =
        await Promise.all([
          import('html2canvas'),
          import('jspdf'),
        ])

      const pages = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.a4Page'
        )
      )

      if (!pages.length) {
        throw new Error(
          'Aucune planche A4 à exporter.'
        )
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      for (
        let index = 0;
        index < pages.length;
        index += 1
      ) {
        const page = pages[index]

        const canvas = await html2canvas(
          page,
          {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            logging: false,
          }
        )

        const image =
          canvas.toDataURL(
            'image/jpeg',
            0.95
          )

        if (index > 0) {
          pdf.addPage('a4', 'portrait')
        }

        pdf.addImage(
          image,
          'JPEG',
          0,
          0,
          210,
          297,
          undefined,
          'FAST'
        )
      }

      pdf.save(
        `Etiquettes-NukuStock-${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      )
    } catch (error) {
      console.error(
        'Téléchargement PDF étiquettes :',
        error
      )

      window.alert(
        'Impossible de créer le PDF des étiquettes.'
      )
    }
  }


  return (
    <Page
      title="Étiquettes & QR Codes"
      subtitle="Catégories, sous-catégories, produits, fournisseurs et lieux de stockage"
      action={
        <div
          className="screenOnly"
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              void downloadPdf()
            }}
          >
            Télécharger PDF
          </button>

          <button
            className="button"
            type="button"
            onClick={printLabels}
          >
            Imprimer
          </button>
        </div>
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
            setSearch('')
          }}
        >
          Produits
        </button>

        <button
          className={
            mode === 'suppliers'
              ? 'button'
              : 'button secondary'
          }
          type="button"
          onClick={() => {
            setMode('suppliers')
            setSearch('')
          }}
        >
          Fournisseurs
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
                  : mode === 'suppliers'
                  ? 'Nom ou référence fournisseur...'
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

        {mode === 'suppliers' &&
          filteredSuppliers.map(
            (supplier) => {
              const id =
                `supplier:${supplier.id}`

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
                      {supplier.name}
                    </strong>

                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 10,
                        opacity: 0.65,
                      }}
                    >
                      Fournisseur
                    </div>
                  </div>

                  <strong
                    style={{
                      fontSize: 11,
                    }}
                  >
                    {supplier.internalRef || ''}
                  </strong>
                </label>
              )
            }
          )}

        {mode === 'locations' &&
          filteredLocations.map(
            (location) => {
              const id =
                `location:${location.id}`

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
                      {location.name}
                    </strong>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 11,
                        opacity: 0.65,
                      }}
                    >
                      {location.internalRef || ''}
                    </div>
                  </div>
                </label>
              )
            }
          )}
      </div>

      <div
        className="screenOnly"
        style={{
          marginTop: 18,
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <strong>
            Planche A4
          </strong>

          <div
            style={{
              marginTop: 3,
              fontSize: 11,
              opacity: 0.7,
            }}
          >
            {selectedLabelItems.length} étiquette
            {selectedLabelItems.length > 1 ? 's' : ''}
            {' · '}
            6 par page
            {' · '}
            {a4Pages.length} page
            {a4Pages.length > 1 ? 's' : ''}
          </div>
        </div>

        {!!selectedLabelItems.length && (
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              setSelectedIds([])
            }
          >
            Vider la planche
          </button>
        )}
      </div>

      {!selectedLabelItems.length && (
        <Card>
          <div
            className="screenOnly"
            style={{
              padding: 20,
              textAlign: 'center',
              opacity: 0.7,
            }}
          >
            Sélectionne les étiquettes souhaitées.
            Elles se placeront automatiquement sur
            la planche A4 dans l’ordre de sélection.
          </div>
        </Card>
      )}

      <div className="a4Pages">
        {a4Pages.map((pageItems, pageIndex) => (
          <div
            className="a4Page"
            key={`page-${pageIndex}`}
          >
            <div className="a4LabelGrid">
              {pageItems.map((label) => (
                <LabelCard
                  key={label.id}
                  title={label.title}
                  subtitle={label.subtitle}
                  reference={label.reference}
                  qrValue={label.qrValue}
                />
              ))}
            </div>
          </div>
        ))}
      </div>


      <style jsx global>{`
        .a4Pages {
          display: grid;
          gap: 22px;
          margin-top: 12px;
        }

        .a4Page {
          width: 210mm;
          min-height: 297mm;
          box-sizing: border-box;
          padding: 10mm;
          margin: 0 auto;
          background: #fff;
          color: #101828;
          box-shadow:
            0 8px 30px rgba(16, 24, 40, 0.16);
        }

        .a4LabelGrid {
          display: grid;
          grid-template-columns:
            repeat(2, 1fr);
          grid-template-rows:
            repeat(3, 1fr);
          gap: 5mm;
          height: 277mm;
        }

        .a4Page .printLabel {
          width: 100% !important;
          min-height: 0 !important;
          height: 89mm !important;
          box-sizing: border-box !important;
          border-radius: 2mm !important;
          padding: 4mm !important;
          gap: 2mm !important;
          overflow: hidden !important;
        }

        .a4Page .printLabel svg {
          width: 43mm !important;
          height: 43mm !important;
          flex: 0 0 auto;
        }

        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .sidebar,
          .topbar,
          .mobileNav,
          .screenOnly {
            display: none !important;
          }

          .shell,
          .main,
          .page {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            width: auto !important;
            max-width: none !important;
            background: #fff !important;
          }

          .a4Pages {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .a4Page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-after: page !important;
          }

          .a4Page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .a4LabelGrid {
            display: grid !important;
            grid-template-columns:
              repeat(2, 1fr) !important;
            grid-template-rows:
              repeat(3, 1fr) !important;
            gap: 5mm !important;
            height: 277mm !important;
          }

          .printLabel {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1px solid #7d8696 !important;
          }
        }

        @media screen and (max-width: 1000px) {
          .a4Page {
            width: 100%;
            min-height: auto;
            padding: 16px;
          }

          .a4LabelGrid {
            height: auto;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            grid-template-rows: none;
            gap: 12px;
          }

          .a4Page .printLabel {
            height: auto !important;
            min-height: 300px !important;
          }
        }

        @media screen and (max-width: 650px) {
          .a4LabelGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Page>
  )
}