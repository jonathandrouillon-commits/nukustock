'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { Page, Card, Badge } from '@/components/ui'
import { useProducts } from '@/lib/store'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { QRCodeSVG } from 'qrcode.react'
import QRCode from 'qrcode'

type QuantityFilter =
  | 'Tous'
  | 'Rupture'
  | '1-10'
  | '11-50'
  | '51-100'
  | '100+'
  | 'Sous minimum'

type ExpiryFilter =
  | 'Toutes'
  | 'Périmé'
  | "Moins d'un mois"
  | 'De 1 à 3 mois'
  | 'De 3 à 6 mois'
  | 'De 6 mois à 1 an'
  | "+ d'un an"
  | 'Sans DLUO'

type ZoneFilter =
  | 'All'
  | 'Beverage'
  | 'Food'
  | 'Matériel & Accessoires'

type SortKey =
  | 'product'
  | 'category'
  | 'subcategory'
  | 'supplier'
  | 'location'
  | 'expiry'
  | 'quantity'
  | 'price'
  | 'value'

type SortDirection = 'asc' | 'desc'

type StockRow = {
  product: any
  lot: any
  quantity: number
  value: number
  expiryPriority: string
}

type StockPrintColumnKey =
  | 'qrProduct'
  | 'qrCategory'
  | 'qrSubcategory'
  | 'qrLocation'
  | 'reference'
  | 'product'
  | 'category'
  | 'subcategory'
  | 'supplier'
  | 'location'
  | 'lot'
  | 'expiry'
  | 'quantity'
  | 'unit'
  | 'price'
  | 'value'

const STOCK_PRINT_COLUMNS: {
  key: StockPrintColumnKey
  label: string
}[] = [
  { key: 'qrProduct', label: 'QR Produit' },
  { key: 'qrCategory', label: 'QR Catégorie' },
  { key: 'qrSubcategory', label: 'QR Sous-catégorie' },
  { key: 'qrLocation', label: 'QR Lieu' },
  { key: 'reference', label: 'Référence' },
  { key: 'product', label: 'Produit' },
  { key: 'category', label: 'Catégorie' },
  { key: 'subcategory', label: 'Sous-catégorie' },
  { key: 'supplier', label: 'Fournisseur' },
  { key: 'location', label: 'Lieu' },
  { key: 'lot', label: 'Lot' },
  { key: 'expiry', label: 'DLUO / DLC' },
  { key: 'quantity', label: 'Quantité disponible' },
  { key: 'unit', label: 'Unité' },
  { key: 'price', label: 'Prix unitaire' },
  { key: 'value', label: 'Valeur' },
]

const DEFAULT_STOCK_PRINT_COLUMNS: StockPrintColumnKey[] = [
  'reference',
  'product',
  'location',
  'expiry',
  'quantity',
  'unit',
]

function normalizeZoneText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function detectProductZone(product: any): ZoneFilter {
  const explicitZone = String(
    product.zone ||
      product.family ||
      product.inventoryScope ||
      ''
  ).trim()

  if (
    explicitZone === 'Beverage' ||
    explicitZone === 'Food' ||
    explicitZone === 'Matériel & Accessoires'
  ) {
    return explicitZone
  }

  const text = normalizeZoneText(
    `${product.category || ''} ${product.subcategory || ''} ${
      product.name || ''
    }`
  )

  const foodWords = [
    'food',
    'aliment',
    'epicerie',
    'fruit',
    'legume',
    'viande',
    'poisson',
    'produit frais',
    'surgele',
    'cuisine',
  ]

  const materialWords = [
    'materiel',
    'accessoire',
    'verrerie',
    'verre',
    'equipement',
    'ustensile',
    'barware',
    'assiette',
    'couvert',
  ]

  if (
    foodWords.some((word) =>
      text.includes(word)
    )
  ) {
    return 'Food'
  }

  if (
    materialWords.some((word) =>
      text.includes(word)
    )
  ) {
    return 'Matériel & Accessoires'
  }

  return 'Beverage'
}

function getProductPhoto(product: any) {
  return (
    product.photoUrl ||
    product.photo_url ||
    product.photo ||
    product.imageUrl ||
    product.image_url ||
    ''
  )
}

export default function Stocks() {
  const { items } = useProducts()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] =
    useState('Toutes')
  const [subcategoryFilter, setSubcategoryFilter] =
    useState('Toutes')
  const [supplierFilter, setSupplierFilter] =
    useState('Tous')
  const [locationFilter, setLocationFilter] =
    useState('Tous')

  const [zoneFilter, setZoneFilter] =
    useState<ZoneFilter>('All')

  const [quantityFilter, setQuantityFilter] =
    useState<QuantityFilter>('Tous')

  const [expiryFilter, setExpiryFilter] =
    useState<ExpiryFilter>('Toutes')

  const [sortKey, setSortKey] =
    useState<SortKey>('product')

  const [sortDirection, setSortDirection] =
    useState<SortDirection>('asc')

  const [printColumnsOpen, setPrintColumnsOpen] =
    useState(false)

  const [stockPrintColumns, setStockPrintColumns] =
    useState<StockPrintColumnKey[]>(
      DEFAULT_STOCK_PRINT_COLUMNS
    )

  const toggleStockPrintColumn = (
    key: StockPrintColumnKey
  ) => {
    setStockPrintColumns((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    )
  }

  const getExpiryPriority = (
    expiryDate: string
  ) => {
    if (!expiryDate) {
      return 'Sans DLUO'
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const target = new Date(
      `${expiryDate}T00:00:00`
    )
    target.setHours(0, 0, 0, 0)

    const days =
      (target.getTime() -
        today.getTime()) /
      (1000 * 60 * 60 * 24)

    if (days < 0) return 'Périmé'
    if (days < 30) {
      return "Moins d'un mois"
    }
    if (days < 90) {
      return 'De 1 à 3 mois'
    }
    if (days < 180) {
      return 'De 3 à 6 mois'
    }
    if (days < 365) {
      return 'De 6 mois à 1 an'
    }

    return "+ d'un an"
  }

  const getExpiryTone = (
    expiryDate: string
  ):
    | 'danger'
    | 'warn'
    | 'good'
    | 'neutral'
    | 'info' => {
    const priority =
      getExpiryPriority(expiryDate)

    if (
      priority === 'Périmé' ||
      priority === "Moins d'un mois"
    ) {
      return 'danger'
    }

    if (
      priority === 'De 1 à 3 mois' ||
      priority === 'De 3 à 6 mois'
    ) {
      return 'warn'
    }

    if (
      priority === 'De 6 mois à 1 an'
    ) {
      return 'info'
    }

    if (priority === "+ d'un an") {
      return 'good'
    }

    return 'neutral'
  }

  const categories = useMemo(
    () =>
      [
        ...new Set(
          items
            .map((product) =>
              product.category
            )
            .filter(Boolean)
        ),
      ].sort((a, b) =>
        a.localeCompare(b, 'fr')
      ),
    [items]
  )

  const subcategories = useMemo(
    () =>
      [
        ...new Set(
          items
            .filter(
              (product) =>
                categoryFilter ===
                  'Toutes' ||
                product.category ===
                  categoryFilter
            )
            .map((product) =>
              product.subcategory
            )
            .filter(Boolean)
        ),
      ].sort((a, b) =>
        a.localeCompare(b, 'fr')
      ),
    [items, categoryFilter]
  )

  const suppliers = useMemo(
    () =>
      [
        ...new Set(
          items
            .map((product) =>
              product.mainSupplier
            )
            .filter(Boolean)
        ),
      ].sort((a, b) =>
        a.localeCompare(b, 'fr')
      ),
    [items]
  )


  const locations = useMemo(
    () =>
      [
        ...new Set(
          items.flatMap((product) =>
            product.lots
              .map((lot) => lot.location)
              .filter(Boolean)
          )
        ),
      ].sort((a, b) =>
        a.localeCompare(b, 'fr')
      ),
    [items]
  )

  const allRows =
    useMemo<StockRow[]>(() => {
      return items.flatMap(
        (product) => {
          /*
           * Même si un produit n'a aucun lot,
           * on l'affiche avec un stock à zéro.
           */
          if (!product.lots.length) {
            return [
              {
                product,
                lot: {
                  id: `empty-${product.id}`,
                  lotNumber: '',
                  expiry: '',
                  location: '',
                  quantity: 0,
                },
                quantity: 0,
                value: 0,
                expiryPriority:
                  'Sans DLUO',
              },
            ]
          }

          return product.lots.map(
            (lot) => {
              const quantity = Math.max(
                0,
                Number(
                  lot.quantity
                ) || 0
              )

              return {
                product,
                lot,
                quantity,
                value:
                  quantity *
                  Math.max(
                    0,
                    Number(
                      product.purchasePrice
                    ) || 0
                  ),
                expiryPriority:
                  getExpiryPriority(
                    lot.expiry
                  ),
              }
            }
          )
        }
      )
    }, [items])

  const matchesQuantityFilter = (
    quantity: number,
    minStock: number
  ) => {
    switch (quantityFilter) {
      case 'Rupture':
        return quantity === 0

      case '1-10':
        return (
          quantity >= 1 &&
          quantity <= 10
        )

      case '11-50':
        return (
          quantity >= 11 &&
          quantity <= 50
        )

      case '51-100':
        return (
          quantity >= 51 &&
          quantity <= 100
        )

      case '100+':
        return quantity > 100

      case 'Sous minimum':
        return quantity < minStock

      default:
        return true
    }
  }

  const filteredRows = useMemo(
    () => {
      const query = search
        .trim()
        .toLowerCase()

      const rows = allRows.filter(
        ({
          product,
          lot,
          quantity,
          expiryPriority,
        }) => {
          const haystack =
            `${product.internalRef || ''} ${
              product.name || ''
            } ${
              product.category || ''
            } ${
              product.subcategory || ''
            } ${
              product.mainSupplier || ''
            } ${lot.location || ''} ${
              lot.lotNumber || ''
            }`
              .toLowerCase()

          if (
            query &&
            !haystack.includes(query)
          ) {
            return false
          }

          if (
            zoneFilter !== 'All' &&
            detectProductZone(product) !== zoneFilter
          ) {
            return false
          }

          if (
            categoryFilter !==
              'Toutes' &&
            product.category !==
              categoryFilter
          ) {
            return false
          }

          if (
            subcategoryFilter !==
              'Toutes' &&
            product.subcategory !==
              subcategoryFilter
          ) {
            return false
          }

          if (
            supplierFilter !==
              'Tous' &&
            product.mainSupplier !==
              supplierFilter
          ) {
            return false
          }

          if (
            locationFilter !==
              'Tous' &&
            lot.location !==
              locationFilter
          ) {
            return false
          }

          if (
            expiryFilter !==
              'Toutes' &&
            expiryPriority !==
              expiryFilter
          ) {
            return false
          }

          if (
            !matchesQuantityFilter(
              quantity,
              Math.max(
                0,
                Number(
                  product.minStock
                ) || 0
              )
            )
          ) {
            return false
          }

          return true
        }
      )

      return [...rows].sort(
        (a, b) => {
          const getValue = (
            row: StockRow
          ) => {
            switch (sortKey) {
              case 'category':
                return (
                  row.product
                    .category || ''
                )

              case 'subcategory':
                return (
                  row.product
                    .subcategory || ''
                )

              case 'supplier':
                return (
                  row.product
                    .mainSupplier || ''
                )

              case 'location':
                return (
                  row.lot.location || ''
                )

              case 'expiry':
                return (
                  row.lot.expiry ||
                  '9999-12-31'
                )

              case 'quantity':
                return row.quantity

              case 'price':
                return (
                  Number(
                    row.product
                      .purchasePrice
                  ) || 0
                )

              case 'value':
                return row.value

              case 'product':
              default:
                return (
                  row.product.name ||
                  ''
                )
            }
          }

          const av = getValue(a)
          const bv = getValue(b)

          const result =
            typeof av === 'number' &&
            typeof bv === 'number'
              ? av - bv
              : String(
                  av
                ).localeCompare(
                  String(bv),
                  'fr'
                )

          return sortDirection ===
            'asc'
            ? result
            : -result
        }
      )
    },
    [
      allRows,
      search,
      zoneFilter,
      categoryFilter,
      subcategoryFilter,
      supplierFilter,
      locationFilter,
      quantityFilter,
      expiryFilter,
      sortKey,
      sortDirection,
    ]
  )

  const filteredProductIds =
    useMemo(
      () =>
        new Set(
          filteredRows.map(
            (row) =>
              row.product.id
          )
        ),
      [filteredRows]
    )

  const totalQty =
    filteredRows.reduce(
      (sum, row) =>
        sum + row.quantity,
      0
    )

  const totalValue =
    filteredRows.reduce(
      (sum, row) =>
        sum + row.value,
      0
    )

  const expiredCount =
    filteredRows.filter(
      (row) =>
        row.expiryPriority ===
        'Périmé'
    ).length

  const underOneMonthCount =
    filteredRows.filter(
      (row) =>
        row.expiryPriority ===
        "Moins d'un mois"
    ).length

  const resetFilters = () => {
    setSearch('')
    setCategoryFilter('Toutes')
    setSubcategoryFilter('Toutes')
    setSupplierFilter('Tous')
    setLocationFilter('Tous')
    setZoneFilter('All')
    setQuantityFilter('Tous')
    setExpiryFilter('Toutes')
  }

  const toggleSort = (
    key: SortKey
  ) => {
    if (sortKey === key) {
      setSortDirection(
        (current) =>
          current === 'asc'
            ? 'desc'
            : 'asc'
      )
      return
    }

    setSortKey(key)
    setSortDirection('asc')
  }

  const sortIndicator = (
    key: SortKey
  ) =>
    sortKey === key
      ? sortDirection === 'asc'
        ? ' ▲'
        : ' ▼'
      : ''

  const getExportRows = () =>
    filteredRows.map(
      ({
        product,
        lot,
        quantity,
        value,
      }) => ({
        Référence:
          product.internalRef || '',
        Produit: product.name || '',
        Zone:
          detectProductZone(product),
        Catégorie:
          product.category || '',
        'Sous-catégorie':
          product.subcategory || '',
        Marque:
          product.brand || '',
        Fournisseur:
          product.mainSupplier || '',
        Lieu:
          lot.location || '',
        Lot:
          lot.lotNumber || '',
        'DLUO / DLC':
          lot.expiry
            ? new Date(
                `${lot.expiry}T00:00:00`
              ).toLocaleDateString(
                'fr-FR'
              )
            : 'Sans DLUO',
        Disponible: quantity,
        Unité:
          product.unit || '',
        'Prix unitaire XPF':
          Math.max(
            0,
            Number(
              product.purchasePrice
            ) || 0
          ),
        'Valeur XPF': value,
      })
    )

  const exportExcel = () => {
    const rows = getExportRows()

    const worksheet =
      XLSX.utils.json_to_sheet(
        rows
      )

    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 32 },
      { wch: 24 },
      { wch: 20 },
      { wch: 22 },
      { wch: 18 },
      { wch: 24 },
      { wch: 22 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
    ]

    const workbook =
      XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Stock disponible'
    )

    XLSX.writeFile(
      workbook,
      `NukuStock-Stock-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    )
  }

  const exportPdf = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    doc.setFontSize(17)
    doc.text(
      'NUKUTEPIPI - NukuStock',
      12,
      13
    )

    doc.setFontSize(12)
    doc.text(
      `État du stock disponible - Zone : ${zoneFilter}`,
      12,
      19
    )

    doc.setFontSize(8)
    doc.text(
      `Édité le ${new Date().toLocaleDateString(
        'fr-FR'
      )} - ${filteredProductIds.size} référence(s) - ${totalQty.toLocaleString(
        'fr-FR'
      )} unité(s)`,
      12,
      24
    )

    autoTable(doc, {
      startY: 29,

      head: [
        [
          'Référence',
          'Produit',
          'Catégorie',
          'Sous-cat.',
          'Lieu',
          'DLUO/DLC',
          'Disponible',
          'Prix XPF',
          'Valeur XPF',
        ],
      ],

      body: filteredRows.map(
        ({
          product,
          lot,
          quantity,
          value,
        }) => [
          product.internalRef ||
            '',
          product.name || '',
          product.category ||
            '',
          product.subcategory ||
            '',
          lot.location ||
            'Non affecté',
          lot.expiry
            ? new Date(
                `${lot.expiry}T00:00:00`
              ).toLocaleDateString(
                'fr-FR'
              )
            : 'Sans DLUO',
          `${quantity} ${
            product.unit || ''
          }`,
          Math.max(
            0,
            Number(
              product.purchasePrice
            ) || 0
          ).toLocaleString(
            'fr-FR'
          ),
          value.toLocaleString(
            'fr-FR'
          ),
        ]
      ),

      styles: {
        fontSize: 6.5,
        cellPadding: 1.5,
        overflow: 'linebreak',
      },

      headStyles: {
        fontStyle: 'bold',
      },

      margin: {
        left: 7,
        right: 7,
      },
    })

    doc.save(
      `NukuStock-Stock-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`
    )
  }

  const getStockPrintValue = (
    key: StockPrintColumnKey,
    row: StockRow
  ) => {
    const { product, lot, quantity, value } = row

    switch (key) {
      case 'qrProduct':
        return `NUKUSTOCK|PRODUCT|${product.internalRef || product.id}`
      case 'qrCategory':
        return `NUKUSTOCK|CATEGORY|${product.category || 'Sans catégorie'}`
      case 'qrSubcategory':
        return `NUKUSTOCK|SUBCATEGORY|${product.subcategory || 'Sans sous-catégorie'}`
      case 'qrLocation':
        return `NUKUSTOCK|LOCATION|${lot.location || 'Non affecté'}`
      case 'reference':
        return product.internalRef || ''
      case 'product':
        return product.name || ''
      case 'category':
        return product.category || ''
      case 'subcategory':
        return product.subcategory || ''
      case 'supplier':
        return product.mainSupplier || ''
      case 'location':
        return lot.location || 'Non affecté'
      case 'lot':
        return lot.lotNumber || ''
      case 'expiry':
        return lot.expiry
          ? new Date(
              `${lot.expiry}T00:00:00`
            ).toLocaleDateString('fr-FR')
          : 'Sans DLUO'
      case 'quantity':
        return quantity.toLocaleString('fr-FR')
      case 'unit':
        return product.unit || ''
      case 'price':
        return Math.max(
          0,
          Number(product.purchasePrice) || 0
        ).toLocaleString('fr-FR')
      case 'value':
        return value.toLocaleString('fr-FR')
      default:
        return ''
    }
  }

  const printStock = async () => {
    if (stockPrintColumns.length === 0) {
      window.alert(
        'Sélectionne au moins une colonne à imprimer.'
      )
      return
    }

    const selectedDefinitions =
      STOCK_PRINT_COLUMNS.filter((column) =>
        stockPrintColumns.includes(column.key)
      )

    const headers = selectedDefinitions
      .map((column) => `<th>${column.label}</th>`)
      .join('')

    const rows = await Promise.all(
      filteredRows.map((row) => {
        return Promise.all(
          selectedDefinitions.map(async (column) => {
            const value = getStockPrintValue(
              column.key,
              row
            )

            if (column.key.startsWith('qr')) {
              const qr = await QRCode.toDataURL(value, {
                width: 90,
                margin: 1,
                errorCorrectionLevel: 'M',
              })
              return `<td class="qrCell"><img src="${qr}" alt="${column.label}" /><div>${value.split('|').pop() || ''}</div></td>`
            }

            return `<td>${value}</td>`
          })
        ).then(
          (cells) => `<tr>${cells.join('')}</tr>`
        )
      })
    ).then((items) => items.join(''))

    const printWindow = window.open(
      '',
      '_blank',
      'width=1200,height=900'
    )

    if (!printWindow) {
      window.alert(
        "Impossible d'ouvrir la fenêtre d'impression."
      )
      return
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <title>NukuStock - Stock disponible</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #111;
              background: #fff;
            }
            .header { margin-bottom: 8mm; }
            .brand { font-size: 18px; font-weight: 800; }
            .title {
              margin-top: 3px;
              font-size: 13px;
              font-weight: 700;
            }
            .meta { margin-top: 5px; font-size: 9px; }
            .zone {
              margin-top: 6px;
              padding: 5px 0;
              border-top: 1px solid #111;
              border-bottom: 1px solid #111;
              text-align: center;
              font-size: 11px;
              font-weight: 800;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: auto;
              font-size: 7px;
            }
            th, td {
              border: 1px solid #999;
              padding: 3px 4px;
              vertical-align: middle;
              overflow-wrap: anywhere;
            }
            th {
              background: #f2f2f2;
              font-weight: 700;
              white-space: nowrap;
            }
            tr { break-inside: avoid; }
            .qrCell { text-align: center; min-width: 24mm; }
            .qrCell img { width: 20mm; height: 20mm; display: block; margin: 0 auto 1mm; }
            .qrCell div { font-size: 5.5px; font-weight: 700; overflow-wrap: anywhere; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">NUKUTEPIPI - NukuStock</div>
            <div class="title">État du stock disponible</div>
            <div class="meta">
              Édité le ${new Date().toLocaleDateString('fr-FR')} -
              ${filteredProductIds.size} référence(s) -
              ${totalQty.toLocaleString('fr-FR')} unité(s)
            </div>
            <div class="zone">ZONE : ${zoneFilter}</div>
          </div>
          <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <script>
            window.onload = () => {
              window.print()
              window.onafterprint = () => window.close()
            }
          </script>
        </body>
      </html>
    `)

    printWindow.document.close()
    setPrintColumnsOpen(false)
  }

  const statBox: CSSProperties = {
    padding: 14,
    borderRadius: 13,
    background: '#ffffff',
    border:
      '1px solid #e5e7eb',
  }

  const thButton: CSSProperties = {
    border: 0,
    background: 'transparent',
    font: 'inherit',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
    color: 'inherit',
    textAlign: 'left',
  }

  return (
    <Page
      title="Stocks"
      subtitle="Consultation du stock disponible — les modifications se font uniquement dans Produits"
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
            onClick={exportExcel}
          >
            Exporter Excel
          </button>

          <button
            className="button secondary"
            type="button"
            onClick={exportPdf}
          >
            Exporter PDF
          </button>

          <button
            className="button"
            type="button"
            onClick={() =>
              setPrintColumnsOpen(true)
            }
          >
            Imprimer le stock
          </button>
        </div>
      }
    >
      <div
        className="printOnly"
        style={{
          display: 'none',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            NUKUTEPIPI · NUKUSTOCK
          </div>

          <div
            style={{
              marginTop: 3,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            État du stock disponible
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 9,
            }}
          >
            Date d'impression :{' '}
            {new Date().toLocaleDateString('fr-FR')}{' '}
            {new Date().toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            marginBottom: 10,
            fontSize: 9,
          }}
        >
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 900,
              padding: '5px 0',
              borderTop: '1px solid #000',
              borderBottom: '1px solid #000',
            }}
          >
            ZONE : {zoneFilter}
          </div>

          <div>
            <strong>Références :</strong>{' '}
            {filteredProductIds.size}
          </div>

          <div>
            <strong>Stock total :</strong>{' '}
            {totalQty.toLocaleString('fr-FR')}
          </div>
        </div>

        <div
          style={{
            marginBottom: 8,
            fontSize: 8,
            textAlign: 'center',
          }}
        >
          Impression simplifiée : la zone est indiquée en en-tête et les numéros de lot ne sont pas imprimés.
        </div>
      </div>

      <div
        style={{
          padding: 12,
          borderRadius: 12,
          marginBottom: 16,
          background:
            'rgba(59,130,246,.08)',
          border:
            '1px solid rgba(59,130,246,.18)',
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        <strong>
          Consultation uniquement.
        </strong>{' '}
        Les quantités, DLUO/DLC,
        lots et lieux de stockage ne
        peuvent pas être modifiés ici.
        Pour effectuer une entrée ou
        modifier le stock, utilise
        l&apos;onglet{' '}
        <strong>Produits</strong>.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit,minmax(170px,1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={statBox}>
          <div
            style={{
              fontSize: 11,
              color: '#667085',
            }}
          >
            Références affichées
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              marginTop: 4,
            }}
          >
            {filteredProductIds.size}
          </div>
        </div>

        <div style={statBox}>
          <div
            style={{
              fontSize: 11,
              color: '#667085',
            }}
          >
            Stock disponible
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              marginTop: 4,
            }}
          >
            {totalQty.toLocaleString(
              'fr-FR'
            )}
          </div>
        </div>

        <div style={statBox}>
          <div
            style={{
              fontSize: 11,
              color: '#667085',
            }}
          >
            Valeur du stock
          </div>

          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              marginTop: 4,
            }}
          >
            {totalValue.toLocaleString(
              'fr-FR'
            )}{' '}
            XPF
          </div>
        </div>

        <div style={statBox}>
          <div
            style={{
              fontSize: 11,
              color: '#667085',
            }}
          >
            Lots périmés
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              marginTop: 4,
            }}
          >
            {expiredCount}
          </div>
        </div>

        <div style={statBox}>
          <div
            style={{
              fontSize: 11,
              color: '#667085',
            }}
          >
            DLUO &lt; 1 mois
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              marginTop: 4,
            }}
          >
            {underOneMonthCount}
          </div>
        </div>
      </div>

      <Card>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(180px,1fr))',
            gap: 10,
          }}
        >
          <input
            className="input"
            placeholder="Rechercher..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          <select
            className="select"
            value={zoneFilter}
            onChange={(event) =>
              setZoneFilter(
                event.target.value as ZoneFilter
              )
            }
          >
            <option value="All">
              Toutes les zones
            </option>
            <option value="Beverage">
              Beverage
            </option>
            <option value="Food">
              Food
            </option>
            <option value="Matériel & Accessoires">
              Matériel & Accessoires
            </option>
          </select>

          <select
            className="select"
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(
                event.target.value
              )
              setSubcategoryFilter(
                'Toutes'
              )
            }}
          >
            <option value="Toutes">
              Toutes les catégories
            </option>

            {categories.map(
              (category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              )
            )}
          </select>

          <select
            className="select"
            value={
              subcategoryFilter
            }
            onChange={(event) =>
              setSubcategoryFilter(
                event.target.value
              )
            }
          >
            <option value="Toutes">
              Toutes les
              sous-catégories
            </option>

            {subcategories.map(
              (subcategory) => (
                <option
                  key={subcategory}
                  value={subcategory}
                >
                  {subcategory}
                </option>
              )
            )}
          </select>

          <select
            className="select"
            value={supplierFilter}
            onChange={(event) =>
              setSupplierFilter(
                event.target.value
              )
            }
          >
            <option value="Tous">
              Tous les fournisseurs
            </option>

            {suppliers.map(
              (supplier) => (
                <option
                  key={supplier}
                  value={supplier}
                >
                  {supplier}
                </option>
              )
            )}
          </select>


          <select
            className="select"
            value={locationFilter}
            onChange={(event) =>
              setLocationFilter(
                event.target.value
              )
            }
          >
            <option value="Tous">
              Tous les lieux
            </option>

            {locations.map(
              (location) => (
                <option
                  key={location}
                  value={location}
                >
                  {location}
                </option>
              )
            )}
          </select>

          <select
            className="select"
            value={quantityFilter}
            onChange={(event) =>
              setQuantityFilter(
                event.target
                  .value as QuantityFilter
              )
            }
          >
            <option value="Tous">
              Toutes les quantités
            </option>
            <option value="Rupture">
              Stock = 0
            </option>
            <option value="1-10">
              1 à 10
            </option>
            <option value="11-50">
              11 à 50
            </option>
            <option value="51-100">
              51 à 100
            </option>
            <option value="100+">
              Plus de 100
            </option>
            <option value="Sous minimum">
              Sous stock minimum
            </option>
          </select>

          <select
            className="select"
            value={expiryFilter}
            onChange={(event) =>
              setExpiryFilter(
                event.target
                  .value as ExpiryFilter
              )
            }
          >
            <option value="Toutes">
              Toutes les DLUO/DLC
            </option>
            <option value="Périmé">
              Périmé
            </option>
            <option value="Moins d'un mois">
              Moins d&apos;un mois
            </option>
            <option value="De 1 à 3 mois">
              1 à 3 mois
            </option>
            <option value="De 3 à 6 mois">
              3 à 6 mois
            </option>
            <option value="De 6 mois à 1 an">
              6 mois à 1 an
            </option>
            <option value="+ d'un an">
              Plus d&apos;un an
            </option>
            <option value="Sans DLUO">
              Sans DLUO
            </option>
          </select>

          <button
            className="button secondary"
            type="button"
            onClick={resetFilters}
          >
            Réinitialiser filtres
          </button>
        </div>
      </Card>

      <Card>
        <div
          style={{
            overflowX: 'auto',
          }}
        >
          <div
            style={{
              minWidth: 1630,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '150px 76px 76px minmax(230px,2fr) 165px 150px 165px 160px 160px 145px 135px 120px 120px',
                gap: 12,
                padding:
                  '0 0 12px',
                fontWeight: 700,
                alignItems: 'center',
              }}
            >
              <div>Référence</div>

              <div className="screenOnly">Photo</div>

              <div className="screenOnly">QR</div>

              <button
                style={thButton}
                onClick={() =>
                  toggleSort(
                    'product'
                  )
                }
              >
                Produit
                {sortIndicator(
                  'product'
                )}
              </button>

              <div className="screenOnly">Zone</div>

              <button
                style={thButton}
                onClick={() =>
                  toggleSort(
                    'category'
                  )
                }
              >
                Catégorie
                {sortIndicator(
                  'category'
                )}
              </button>

              <button
                style={thButton}
                onClick={() =>
                  toggleSort(
                    'subcategory'
                  )
                }
              >
                Sous-catégorie
                {sortIndicator(
                  'subcategory'
                )}
              </button>

              <button
                style={thButton}
                onClick={() =>
                  toggleSort(
                    'location'
                  )
                }
              >
                Lieu
                {sortIndicator(
                  'location'
                )}
              </button>

              <div className="screenOnly">Lot</div>

              <button
                style={thButton}
                onClick={() =>
                  toggleSort(
                    'expiry'
                  )
                }
              >
                DLUO / DLC
                {sortIndicator(
                  'expiry'
                )}
              </button>

              <button
                style={thButton}
                onClick={() =>
                  toggleSort(
                    'quantity'
                  )
                }
              >
                Disponible
                {sortIndicator(
                  'quantity'
                )}
              </button>

              <button
                style={thButton}
                onClick={() =>
                  toggleSort(
                    'price'
                  )
                }
              >
                Prix
                {sortIndicator(
                  'price'
                )}
              </button>

              <button
                style={thButton}
                onClick={() =>
                  toggleSort(
                    'value'
                  )
                }
              >
                Valeur
                {sortIndicator(
                  'value'
                )}
              </button>
            </div>

            {filteredRows.map(
              (
                {
                  product,
                  lot,
                  quantity,
                  value,
                },
                index
              ) => (
                <div
                  key={`${product.id}-${lot.id}-${index}`}
                  style={{
                    display:
                      'grid',
                    gridTemplateColumns:
                      '150px 76px 76px minmax(230px,2fr) 165px 150px 165px 160px 160px 145px 135px 120px 120px',
                    gap: 12,
                    padding:
                      '13px 0',
                    borderTop:
                      '1px solid rgba(255,255,255,.08)',
                    alignItems:
                      'center',
                  }}
                >
                  <strong
                    style={{
                      fontSize: 11,
                      letterSpacing:
                        '.03em',
                    }}
                  >
                    {product.internalRef ||
                      '—'}
                  </strong>

                  <div className="screenOnly">
                    {getProductPhoto(product) ? (
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 10,
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          padding: 4,
                        }}
                      >
                        <img
                          src={getProductPhoto(product)}
                          alt={product.name || 'Produit'}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 10,
                          border: '1px dashed #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          opacity: 0.5,
                        }}
                      >
                        PHOTO
                      </div>
                    )}
                  </div>

                  <div
                    className="screenOnly"
                    title={
                      product.internalRef
                        ? `QR produit ${product.internalRef}`
                        : 'Référence interne requise'
                    }
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 10,
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      display: 'grid',
                      placeItems: 'center',
                      padding: 4,
                    }}
                  >
                    {product.internalRef ? (
                      <QRCodeSVG
                        value={product.internalRef}
                        size={54}
                        level="M"
                        marginSize={0}
                        title={`NukuStock ${product.internalRef}`}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 9,
                          color: '#667085',
                          textAlign: 'center',
                          fontWeight: 700,
                        }}
                      >
                        SANS REF
                      </span>
                    )}
                  </div>

                  <div>
                    <div
                      style={{
                        fontWeight:
                          800,
                      }}
                    >
                      {product.name}
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 11,
                        opacity: 0.65,
                      }}
                    >
                      {[
                        product.packaging,
                      ]
                        .filter(
                          Boolean
                        )
                        .join(' · ')}
                    </div>
                  </div>

                  <div className="screenOnly">
                    <Badge tone="info">
                      {detectProductZone(
                        product
                      )}
                    </Badge>
                  </div>

                  <div>
                    {product.category ||
                      '—'}
                  </div>

                  <div>
                    {product.subcategory ||
                      '—'}
                  </div>

                  <div>
                    {lot.location ||
                      'Non affecté'}
                  </div>

                  <div className="screenOnly">
                    {lot.lotNumber ||
                      '—'}
                  </div>

                  <div>
                    {lot.expiry ? (
                      <Badge
                        tone={getExpiryTone(
                          lot.expiry
                        )}
                      >
                        {new Date(
                          `${lot.expiry}T00:00:00`
                        ).toLocaleDateString(
                          'fr-FR'
                        )}
                      </Badge>
                    ) : (
                      <span
                        style={{
                          opacity: 0.5,
                          fontSize: 12,
                        }}
                      >
                        Sans DLUO
                      </span>
                    )}
                  </div>

                  <div>
                    <Badge
                      tone={
                        quantity <= 0
                          ? 'danger'
                          : quantity <
                            Math.max(
                              0,
                              Number(
                                product.minStock
                              ) || 0
                            )
                          ? 'warn'
                          : 'good'
                      }
                    >
                      {quantity}{' '}
                      {product.unit}
                    </Badge>
                  </div>

                  <div>
                    {Math.max(
                      0,
                      Number(
                        product.purchasePrice
                      ) || 0
                    ).toLocaleString(
                      'fr-FR'
                    )}{' '}
                    XPF
                  </div>

                  <div>
                    {value.toLocaleString(
                      'fr-FR'
                    )}{' '}
                    XPF
                  </div>
                </div>
              )
            )}

            {filteredRows.length ===
              0 && (
              <div
                style={{
                  padding: 24,
                  textAlign:
                    'center',
                  opacity: 0.65,
                }}
              >
                Aucun stock ne
                correspond aux
                filtres.
              </div>
            )}
          </div>
        </div>
      </Card>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
      `}</style>

      {printColumnsOpen && (
        <div
          className="screenOnly"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15,23,42,.58)',
            display: 'grid',
            placeItems: 'center',
            padding: 18,
          }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setPrintColumnsOpen(false)
            }
          }}
        >
          <div
            style={{
              width: 'min(620px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#fff',
              borderRadius: 18,
              padding: 22,
              boxShadow: '0 24px 70px rgba(15,23,42,.25)',
            }}
          >
            <h2 style={{ margin: 0 }}>
              Colonnes à imprimer
            </h2>
            <p
              style={{
                margin: '6px 0 18px',
                color: '#667085',
                fontSize: 13,
              }}
            >
              Coche uniquement les informations que tu veux voir sur l&apos;impression du stock.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(180px,1fr))',
                gap: 9,
              }}
            >
              {STOCK_PRINT_COLUMNS.map((column) => (
                <label
                  key={column.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 11,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={stockPrintColumns.includes(
                      column.key
                    )}
                    onChange={() =>
                      toggleStockPrintColumn(
                        column.key
                      )
                    }
                  />
                  {column.label}
                </label>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginTop: 16,
              }}
            >
              <button
                className="button secondary small"
                type="button"
                onClick={() =>
                  setStockPrintColumns(
                    STOCK_PRINT_COLUMNS.map(
                      (column) => column.key
                    )
                  )
                }
              >
                Tout sélectionner
              </button>
              <button
                className="button secondary small"
                type="button"
                onClick={() =>
                  setStockPrintColumns(
                    DEFAULT_STOCK_PRINT_COLUMNS
                  )
                }
              >
                Réinitialiser
              </button>
              <button
                className="button secondary small"
                type="button"
                onClick={() =>
                  setStockPrintColumns([])
                }
              >
                Tout décocher
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 9,
                marginTop: 22,
              }}
            >
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  setPrintColumnsOpen(false)
                }
              >
                Annuler
              </button>
              <button
                className="button"
                type="button"
                onClick={printStock}
              >
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}

    </Page>
  )
}