'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { Page, Card, Badge } from '@/components/ui'
import { useMasterData, useProducts, useStockMovements } from '@/lib/store'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { QRCodeSVG } from 'qrcode.react'
import QRCode from 'qrcode'
import { ColumnVisibility, useColumnVisibility } from '@/components/column-visibility'
import { ImportExportMenu, type ImportExportSettings } from '@/components/import-export-menu'
import type { StockMovement } from '@/lib/types'

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

type ExportSortMode =
  | 'category-subcategory-location-product'
  | 'location-category-subcategory-product'
  | 'category-subcategory-product'
  | 'location-product'
  | 'product'

const EXPORT_SORT_OPTIONS: {
  value: ExportSortMode
  label: string
}[] = [
  {
    value: 'category-subcategory-location-product',
    label: 'Catégorie → Sous-catégorie → Lieu → Produit A-Z',
  },
  {
    value: 'location-category-subcategory-product',
    label: 'Lieu → Catégorie → Sous-catégorie → Produit A-Z',
  },
  {
    value: 'category-subcategory-product',
    label: 'Catégorie → Sous-catégorie → Produit A-Z',
  },
  {
    value: 'location-product',
    label: 'Lieu → Produit A-Z',
  },
  {
    value: 'product',
    label: 'Produit A-Z',
  },
]

function compareText(a: unknown, b: unknown) {
  return String(a || '').localeCompare(
    String(b || ''),
    'fr',
    {
      numeric: true,
      sensitivity: 'base',
    }
  )
}

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

const STOCK_SCREEN_COLUMNS = [
  { key: 'reference', label: 'Référence' },
  { key: 'photo', label: 'Photo' },
  { key: 'qrProduct', label: 'QR Produit', qr: true },
  { key: 'product', label: 'Produit' },
  { key: 'zone', label: 'Zone' },
  { key: 'category', label: 'Catégorie' },
  { key: 'qrCategory', label: 'QR Catégorie', qr: true },
  { key: 'subcategory', label: 'Sous-catégorie' },
  { key: 'qrSubcategory', label: 'QR Sous-catégorie', qr: true },
  { key: 'location', label: 'Lieu' },
  { key: 'qrLocation', label: 'QR Lieu', qr: true },
  { key: 'lot', label: 'Lot' },
  { key: 'expiry', label: 'DLUO / DLC' },
  { key: 'quantity', label: 'Disponible' },
  { key: 'price', label: 'Prix' },
  { key: 'value', label: 'Valeur' },
  { key: 'unitWeight', label: 'Poids unitaire' },
  { key: 'caseWeight', label: 'Poids conditionnement' },
  { key: 'totalWeight', label: 'Poids total stock' },
  { key: 'transfer', label: 'Transfert' },
]

const STOCK_SCREEN_ESSENTIAL = [
  'reference',
  'photo',
  'qrProduct',
  'product',
  'category',
  'subcategory',
  'location',
  'expiry',
  'quantity',
]

function formatWeightKg(value: number | null | undefined) {
  const numeric = Number(value || 0)

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '—'
  }

  return `${numeric.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} kg`
}

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
  const { items, save: saveProducts } = useProducts()
  const { items: masterData } = useMasterData()
  const {
    items: stockMovements,
    save: saveStockMovements,
  } = useStockMovements()

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

  const stockDisplay = useColumnVisibility(
    'nukustock_display_stocks_v1',
    STOCK_SCREEN_ESSENTIAL
  )

  const [printColumnsOpen, setPrintColumnsOpen] =
    useState(false)

  const [stockPrintColumns, setStockPrintColumns] =
    useState<StockPrintColumnKey[]>(
      DEFAULT_STOCK_PRINT_COLUMNS
    )

  const [exportSortMode, setExportSortMode] =
    useState<ExportSortMode>(
      'category-subcategory-location-product'
    )

  const [printOrientation, setPrintOrientation] =
    useState<'portrait' | 'landscape'>('landscape')

  const [printFontSize, setPrintFontSize] =
    useState(8)

  const [quickEntryOpen, setQuickEntryOpen] =
    useState(false)
  const [quickProductId, setQuickProductId] =
    useState('')
  const [quickQuantity, setQuickQuantity] =
    useState(1)
  const [quickLocation, setQuickLocation] =
    useState('')
  const [quickLotNumber, setQuickLotNumber] =
    useState('')
  const [quickExpiry, setQuickExpiry] =
    useState('')
  const [quickNeedsRegularization, setQuickNeedsRegularization] =
    useState(true)
  const [quickNote, setQuickNote] =
    useState('')

  const [transferOpen, setTransferOpen] = useState(false)
  const [transferProductId, setTransferProductId] = useState('')
  const [transferLotId, setTransferLotId] = useState('')
  const [transferFromLocation, setTransferFromLocation] = useState('')
  const [transferToLocation, setTransferToLocation] = useState('')
  const [transferQuantity, setTransferQuantity] = useState(1)
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [correctionProductId, setCorrectionProductId] = useState('')
  const [correctionLotId, setCorrectionLotId] = useState('')
  const [correctionQuantity, setCorrectionQuantity] = useState(0)
  const [correctionReason, setCorrectionReason] = useState('Erreur de saisie')
  const [correctionNote, setCorrectionNote] = useState('')


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

  const quickEntryLocations = useMemo(
    () =>
      masterData
        .filter(
          (item) =>
            item.type === 'location' &&
            item.active !== false
        )
        .map((item) => item.name)
        .sort((a, b) =>
          a.localeCompare(b, 'fr', {
            numeric: true,
            sensitivity: 'base',
          })
        ),
    [masterData]
  )

  const resetQuickEntry = () => {
    setQuickProductId('')
    setQuickQuantity(1)
    setQuickLocation('')
    setQuickLotNumber('')
    setQuickExpiry('')
    setQuickNeedsRegularization(true)
    setQuickNote('')
  }

  const saveQuickEntry = () => {
    const product = items.find(
      (item) => item.id === quickProductId
    )

    if (!product) {
      window.alert('Choisis un produit.')
      return
    }

    const quantity = Math.max(
      0,
      Number(quickQuantity) || 0
    )

    if (quantity <= 0) {
      window.alert(
        'La quantité doit être supérieure à 0.'
      )
      return
    }

    if (!quickLocation) {
      window.alert('Choisis un lieu de stockage.')
      return
    }

    const sameLotIndex = product.lots.findIndex(
      (lot) =>
        lot.location === quickLocation &&
        (lot.lotNumber || '') ===
          quickLotNumber.trim() &&
        (lot.expiry || '') === quickExpiry
    )

    const nextLots = product.lots.map(
      (lot) => ({ ...lot })
    )

    if (sameLotIndex >= 0) {
      nextLots[sameLotIndex] = {
        ...nextLots[sameLotIndex],
        quantity:
          Math.max(
            0,
            Number(
              nextLots[sameLotIndex].quantity
            ) || 0
          ) + quantity,
      }
    } else {
      nextLots.push({
        id: crypto.randomUUID(),
        lotNumber: quickLotNumber.trim(),
        expiry: quickExpiry,
        location: quickLocation,
        quantity,
      })
    }

    saveProducts(
      items.map((item) =>
        item.id === product.id
          ? {
              ...item,
              lots: nextLots,
            }
          : item
      )
    )

    const now = new Date().toISOString()

    const movement: StockMovement = {
      id: crypto.randomUUID(),
      createdAt: now,
      type: 'ENTREE_PRODUIT',
      productId: product.id,
      productName: product.name,
      internalRef: product.internalRef,
      quantity,
      toLocation: quickLocation,
      lotNumber:
        quickLotNumber.trim() || undefined,
      expiry: quickExpiry || undefined,
      referenceType: 'product',
      referenceId: `RAP-${Date.now()
        .toString()
        .slice(-8)}`,
      note:
        quickNote.trim() ||
        'Entrée rapide de stock',
      specialNote:
        quickNote.trim() || undefined,
      regularizationStatus:
        quickNeedsRegularization
          ? 'A_REGULARISER'
          : 'NON_REQUIS',
    }

    saveStockMovements([
      movement,
      ...stockMovements,
    ])

    setQuickEntryOpen(false)
    resetQuickEntry()

    window.alert(
      quickNeedsRegularization
        ? `Entrée ajoutée : +${quantity} ${product.unit} de ${product.name} dans ${quickLocation}. Mouvement marqué À régulariser.`
        : `Entrée ajoutée : +${quantity} ${product.unit} de ${product.name} dans ${quickLocation}.`
    )
  }

  const openTransfer = (product: any, lot: any, quantity: number) => {
    if (!lot.location) {
      window.alert('Ce stock n’a pas de lieu source.')
      return
    }
    if (quantity <= 0) {
      window.alert('Aucun stock disponible à transférer.')
      return
    }

    setTransferProductId(product.id)
    setTransferLotId(lot.id)
    setTransferFromLocation(lot.location)
    setTransferToLocation('')
    setTransferQuantity(1)
    setTransferOpen(true)
  }

  const saveTransfer = () => {
    const product = items.find((item) => item.id === transferProductId)
    if (!product) {
      window.alert('Produit introuvable.')
      return
    }

    const sourceIndex = product.lots.findIndex(
      (lot) => lot.id === transferLotId
    )
    if (sourceIndex < 0) {
      window.alert('Lot source introuvable.')
      return
    }

    const sourceLot = product.lots[sourceIndex]
    const available = Math.max(0, Number(sourceLot.quantity) || 0)
    const quantity = Math.max(0, Number(transferQuantity) || 0)

    if (!transferToLocation) {
      window.alert('Choisis le lieu de destination.')
      return
    }
    if (transferToLocation === transferFromLocation) {
      window.alert('Le lieu de destination doit être différent du lieu source.')
      return
    }
    if (quantity <= 0) {
      window.alert('La quantité doit être supérieure à 0.')
      return
    }
    if (quantity > available) {
      window.alert(`Stock insuffisant. Disponible : ${available} ${product.unit || ''}.`)
      return
    }

    const nextLots = product.lots.map((lot) => ({ ...lot }))
    nextLots[sourceIndex] = {
      ...nextLots[sourceIndex],
      quantity: available - quantity,
    }

    const destinationIndex = nextLots.findIndex(
      (lot, index) =>
        index !== sourceIndex &&
        lot.location === transferToLocation &&
        (lot.lotNumber || '') === (sourceLot.lotNumber || '') &&
        (lot.expiry || '') === (sourceLot.expiry || '')
    )

    if (destinationIndex >= 0) {
      nextLots[destinationIndex] = {
        ...nextLots[destinationIndex],
        quantity:
          Math.max(0, Number(nextLots[destinationIndex].quantity) || 0) +
          quantity,
      }
    } else {
      nextLots.push({
        id: crypto.randomUUID(),
        lotNumber: sourceLot.lotNumber || '',
        expiry: sourceLot.expiry || '',
        location: transferToLocation,
        quantity,
      })
    }

    saveProducts(
      items.map((item) =>
        item.id === product.id
          ? { ...item, lots: nextLots }
          : item
      )
    )

    const transferReference =
      `TRF-${Date.now().toString().slice(-8)}`

    const createdAt =
      new Date().toISOString()

    const movements: StockMovement[] = [
      {
        id: crypto.randomUUID(),
        createdAt,
        type: 'TRANSFERT_SORTIE',
        productId: product.id,
        productName: product.name,
        internalRef: product.internalRef,
        quantity: -quantity,
        fromLocation: transferFromLocation,
        toLocation: transferToLocation,
        lotNumber: sourceLot.lotNumber || undefined,
        expiry: sourceLot.expiry || undefined,
        referenceType: 'transfer',
        referenceId: transferReference,
        note: `Transfert de ${transferFromLocation} vers ${transferToLocation}`,
        regularizationStatus: 'NON_REQUIS',
      },
      {
        id: crypto.randomUUID(),
        createdAt,
        type: 'TRANSFERT_ENTREE',
        productId: product.id,
        productName: product.name,
        internalRef: product.internalRef,
        quantity,
        fromLocation: transferFromLocation,
        toLocation: transferToLocation,
        lotNumber: sourceLot.lotNumber || undefined,
        expiry: sourceLot.expiry || undefined,
        referenceType: 'transfer',
        referenceId: transferReference,
        note: `Transfert de ${transferFromLocation} vers ${transferToLocation}`,
        regularizationStatus: 'NON_REQUIS',
      },
    ]

    saveStockMovements([
      ...movements,
      ...stockMovements,
    ])

    setTransferOpen(false)
    window.alert(
      `Transfert effectué : ${quantity} ${product.unit || ''} de ${product.name} vers ${transferToLocation}.`
    )
  }

  const openCorrection = (product: any, lot: any, quantity: number) => {
    if (!lot?.id || String(lot.id).startsWith('empty-')) return
    setCorrectionProductId(product.id)
    setCorrectionLotId(lot.id)
    setCorrectionQuantity(Math.max(0, Number(quantity) || 0))
    setCorrectionReason('Erreur de saisie')
    setCorrectionNote('')
    setCorrectionOpen(true)
  }

  const saveCorrection = () => {
    const product = items.find((item) => item.id === correctionProductId)
    if (!product) return window.alert('Produit introuvable.')
    const lotIndex = product.lots.findIndex((lot) => lot.id === correctionLotId)
    if (lotIndex < 0) return window.alert('Ligne de stock introuvable.')

    const newQuantity = Number(correctionQuantity)
    if (!Number.isFinite(newQuantity) || newQuantity < 0)
      return window.alert('La nouvelle quantité doit être supérieure ou égale à 0.')

    const sourceLot = product.lots[lotIndex]
    const oldQuantity = Math.max(0, Number(sourceLot.quantity) || 0)
    if (newQuantity === oldQuantity) return window.alert('La quantité est identique au stock actuel.')

    const nextLots = product.lots.map((lot) => ({ ...lot }))
    nextLots[lotIndex] = { ...nextLots[lotIndex], quantity: newQuantity }

    saveProducts(items.map((item) =>
      item.id === product.id ? { ...item, lots: nextLots } : item
    ))

    const difference = newQuantity - oldQuantity
    const movement: StockMovement = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      type: 'CORRECTION_STOCK' as StockMovement['type'],
      productId: product.id,
      productName: product.name,
      internalRef: product.internalRef,
      quantity: difference,
      fromLocation: sourceLot.location || undefined,
      toLocation: sourceLot.location || undefined,
      lotNumber: sourceLot.lotNumber || undefined,
      expiry: sourceLot.expiry || undefined,
      referenceType: 'product',
      referenceId: `COR-${Date.now().toString().slice(-8)}`,
      note: `Correction manuelle : ${correctionReason}. Stock ${oldQuantity} → ${newQuantity}.${correctionNote.trim() ? ` ${correctionNote.trim()}` : ''}`,
      specialNote: correctionNote.trim() || undefined,
      regularizationStatus: 'NON_REQUIS',
    }
    saveStockMovements([movement, ...stockMovements])
    setCorrectionOpen(false)
    window.alert(`Stock corrigé : ${oldQuantity} → ${newQuantity} ${product.unit || ''}.`)
  }

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

  const getSortedExportRows = (scope: 'current' | 'all' = 'current') => {
    const rows = [...(scope === 'all' ? allRows : filteredRows)]

    const compareRow = (
      a: StockRow,
      b: StockRow
    ) => {
      const byProduct = () =>
        compareText(
          a.product.name,
          b.product.name
        )

      const byCategory = () =>
        compareText(
          a.product.category,
          b.product.category
        )

      const bySubcategory = () =>
        compareText(
          a.product.subcategory,
          b.product.subcategory
        )

      const byLocation = () =>
        compareText(
          a.lot.location,
          b.lot.location
        )

      const chain = (
        comparators: Array<() => number>
      ) => {
        for (const comparator of comparators) {
          const result = comparator()
          if (result !== 0) return result
        }
        return 0
      }

      switch (exportSortMode) {
        case 'location-category-subcategory-product':
          return chain([
            byLocation,
            byCategory,
            bySubcategory,
            byProduct,
          ])

        case 'category-subcategory-product':
          return chain([
            byCategory,
            bySubcategory,
            byProduct,
          ])

        case 'location-product':
          return chain([
            byLocation,
            byProduct,
          ])

        case 'product':
          return byProduct()

        case 'category-subcategory-location-product':
        default:
          return chain([
            byCategory,
            bySubcategory,
            byLocation,
            byProduct,
          ])
      }
    }

    return rows.sort(compareRow)
  }

  const getExportRows = () =>
    getSortedExportRows().map(
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

  const exportExcel = (settings?: ImportExportSettings) => {
    const selected = new Set(
      settings?.selectedColumns?.length
        ? settings.selectedColumns
        : STOCK_PRINT_COLUMNS.map((column) => column.key)
    )

    const rows = getSortedExportRows(settings?.scope || 'current').map((row) => {
      const output: Record<string, string | number> = {}

      STOCK_PRINT_COLUMNS.forEach((column) => {
        if (!selected.has(column.key)) return
        if (column.key.startsWith('qr')) return
        output[column.label] = getStockPrintValue(column.key, row)
      })

      return output
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 22 }))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock disponible')

    XLSX.writeFile(
      workbook,
      `NukuStock-Stock-${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  }

  const exportPdf = (settings?: ImportExportSettings) => {
    const selectedDefinitions = STOCK_PRINT_COLUMNS.filter((column) =>
      (settings?.selectedColumns?.length
        ? settings.selectedColumns
        : DEFAULT_STOCK_PRINT_COLUMNS
      ).includes(column.key)
    )

    const doc = new jsPDF({
      orientation: settings?.orientation || 'landscape',
      unit: 'mm',
      format: settings?.paperSize || 'a4',
    })

    let startY = 12

    if (settings?.showHeader !== false) {
      doc.setFontSize(17)
      doc.text('NUKUTEPIPI - NukuStock', 12, startY)
      startY += 6
      doc.setFontSize(12)
      doc.text(`État du stock disponible - Zone : ${zoneFilter}`, 12, startY)
      startY += 5
    }

    if (settings?.showDate !== false) {
      doc.setFontSize(8)
      doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')}`, 12, startY)
      startY += 5
    }

    autoTable(doc, {
      startY: startY + 2,
      head: [selectedDefinitions.map((column) => column.label)],
      body: getSortedExportRows(settings?.scope || 'current').map((row) =>
        selectedDefinitions.map((column) => getStockPrintValue(column.key, row))
      ),
      styles: {
        fontSize: Math.max(5, settings?.fontSize || 8),
        cellPadding: 1.5,
        overflow: 'linebreak',
      },
      headStyles: { fontStyle: 'bold' },
      margin: { left: 7, right: 7 },
    })

    doc.save(
      `NukuStock-Stock-${new Date().toISOString().slice(0, 10)}.pdf`
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

  const printStock = async (settings?: ImportExportSettings) => {
    const printColumns = (settings?.selectedColumns?.length
      ? settings.selectedColumns
      : stockPrintColumns) as StockPrintColumnKey[]

    if (printColumns.length === 0) {
      window.alert(
        'Sélectionne au moins une colonne à imprimer.'
      )
      return
    }

    const selectedDefinitions =
      STOCK_PRINT_COLUMNS.filter((column) =>
        printColumns.includes(column.key)
      )

    const headers = selectedDefinitions
      .map((column) => `<th>${column.label}</th>`)
      .join('')

    const sortedPrintRows =
      getSortedExportRows(settings?.scope || 'current')

    let currentCategory = ''
    let currentSubcategory = ''

    const printedRows: string[] = []

    for (const row of sortedPrintRows) {
      const category =
        String(
          row.product.category ||
            'Sans catégorie'
        ).trim()

      const subcategory =
        String(
          row.product.subcategory ||
            'Sans sous-catégorie'
        ).trim()

      if (category !== currentCategory) {
        currentCategory = category
        currentSubcategory = ''

        printedRows.push(
          `<tr class="categoryRow"><td colspan="${selectedDefinitions.length}">${category.toUpperCase()}</td></tr>`
        )
      }

      if (subcategory !== currentSubcategory) {
        currentSubcategory = subcategory

        printedRows.push(
          `<tr class="subcategoryRow"><td colspan="${selectedDefinitions.length}"><span>${subcategory}</span></td></tr>`
        )
      }

      const cells = await Promise.all(
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
      )

      printedRows.push(
        `<tr class="productRow">${cells.join('')}</tr>`
      )
    }

    const rows = printedRows.join('')

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
              size: ${(settings?.paperSize || 'a4').toUpperCase()} ${settings?.orientation || printOrientation};
              margin: 10mm;
            }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              zoom: ${settings?.scale && settings.scale !== 'fit' ? Number(settings.scale) / 100 : 1};
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
              font-size: ${settings?.fontSize || printFontSize}px;
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

            .categoryRow td {
              padding: 7px 8px !important;
              background: #172033 !important;
              color: #fff !important;
              border-color: #172033 !important;
              font-size: ${(settings?.fontSize || printFontSize) + 2}px !important;
              font-weight: 900 !important;
              letter-spacing: .08em;
            }
            .subcategoryRow td {
              padding: 6px 8px !important;
              background: #eef2f6 !important;
              color: #111827 !important;
              border-color: #cfd6df !important;
              font-size: ${(settings?.fontSize || printFontSize) + 1}px !important;
              font-weight: 900 !important;
            }
            .subcategoryRow td span {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .subcategoryRow td span::after {
              content: "";
              flex: 1;
              border-bottom: 1px dotted #98a2b3;
            }
            .productRow td {
              font-size: ${settings?.fontSize || printFontSize}px !important;
            }
          </style>
        </head>
        <body>
          ${(settings?.showHeader !== false || settings?.showDate !== false) ? `<div class="header">
            ${settings?.showHeader !== false ? `<div class="brand">NUKUTEPIPI - NukuStock</div><div class="title">État du stock disponible</div><div class="zone">ZONE : ${zoneFilter}</div>` : ''}
            ${settings?.showDate !== false ? `<div class="meta">Édité le ${new Date().toLocaleDateString('fr-FR')}</div>` : ''}
          </div>` : ''}
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

  const handleImportExport = async (settings: ImportExportSettings) => {
    if (settings.format === 'excel') {
      exportExcel(settings)
      return
    }

    if (settings.format === 'pdf') {
      exportPdf(settings)
      return
    }

    await printStock(settings)
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
          <ColumnVisibility
            columns={STOCK_SCREEN_COLUMNS}
            visible={stockDisplay.visible}
            onChange={stockDisplay.setVisible}
            essential={STOCK_SCREEN_ESSENTIAL}
          />

          <button
            className="button"
            type="button"
            onClick={() => {
              resetQuickEntry()
              setQuickEntryOpen(true)
            }}
          >
            + Entrée rapide
          </button>

          <ImportExportMenu
            title="Importer / Exporter"
            columns={STOCK_PRINT_COLUMNS}
            defaultColumns={DEFAULT_STOCK_PRINT_COLUMNS}
            allowImportExcel
            onImportExcel={() => {
              window.location.href = '/import'
            }}
            onExport={handleImportExport}
          />
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
        <div style={{ overflowX: 'auto' }}>
          {(() => {
            const cols = [
              stockDisplay.isVisible('reference') && '150px',
              stockDisplay.isVisible('photo') && '76px',
              stockDisplay.isVisible('qrProduct') && '76px',
              stockDisplay.isVisible('product') && 'minmax(230px,2fr)',
              stockDisplay.isVisible('zone') && '135px',
              stockDisplay.isVisible('category') && '150px',
              stockDisplay.isVisible('qrCategory') && '76px',
              stockDisplay.isVisible('subcategory') && '165px',
              stockDisplay.isVisible('qrSubcategory') && '76px',
              stockDisplay.isVisible('location') && '160px',
              stockDisplay.isVisible('qrLocation') && '76px',
              stockDisplay.isVisible('lot') && '145px',
              stockDisplay.isVisible('expiry') && '135px',
              stockDisplay.isVisible('quantity') && '120px',
              stockDisplay.isVisible('price') && '120px',
              stockDisplay.isVisible('value') && '120px',
              stockDisplay.isVisible('unitWeight') && '125px',
              stockDisplay.isVisible('caseWeight') && '165px',
              stockDisplay.isVisible('totalWeight') && '145px',
              '120px',
            ].filter(Boolean).join(' ')

            const minWidth = Math.max(
              850,
              stockDisplay.visible.length * 105
            )

            const qrBox = (
              value: string,
              title: string
            ) => (
              <div
                className="screenOnly"
                title={title}
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
                <QRCodeSVG
                  value={value}
                  size={54}
                  level="M"
                  marginSize={0}
                  title={title}
                />
              </div>
            )

            return (
              <div style={{ minWidth }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: cols,
                    gap: 12,
                    padding: '0 0 12px',
                    fontWeight: 700,
                    alignItems: 'center',
                  }}
                >
                  {stockDisplay.isVisible('reference') && <div>Référence</div>}
                  {stockDisplay.isVisible('photo') && <div>Photo</div>}
                  {stockDisplay.isVisible('qrProduct') && <div>QR Produit</div>}
                  {stockDisplay.isVisible('product') && (
                    <button style={thButton} onClick={() => toggleSort('product')}>
                      Produit{sortIndicator('product')}
                    </button>
                  )}
                  {stockDisplay.isVisible('zone') && <div>Zone</div>}
                  {stockDisplay.isVisible('category') && (
                    <button style={thButton} onClick={() => toggleSort('category')}>
                      Catégorie{sortIndicator('category')}
                    </button>
                  )}
                  {stockDisplay.isVisible('qrCategory') && <div>QR Cat.</div>}
                  {stockDisplay.isVisible('subcategory') && (
                    <button style={thButton} onClick={() => toggleSort('subcategory')}>
                      Sous-catégorie{sortIndicator('subcategory')}
                    </button>
                  )}
                  {stockDisplay.isVisible('qrSubcategory') && <div>QR Sous-cat.</div>}
                  {stockDisplay.isVisible('location') && (
                    <button style={thButton} onClick={() => toggleSort('location')}>
                      Lieu{sortIndicator('location')}
                    </button>
                  )}
                  {stockDisplay.isVisible('qrLocation') && <div>QR Lieu</div>}
                  {stockDisplay.isVisible('lot') && <div>Lot</div>}
                  {stockDisplay.isVisible('expiry') && (
                    <button style={thButton} onClick={() => toggleSort('expiry')}>
                      DLUO / DLC{sortIndicator('expiry')}
                    </button>
                  )}
                  {stockDisplay.isVisible('quantity') && (
                    <button style={thButton} onClick={() => toggleSort('quantity')}>
                      Disponible{sortIndicator('quantity')}
                    </button>
                  )}
                  {stockDisplay.isVisible('price') && (
                    <button style={thButton} onClick={() => toggleSort('price')}>
                      Prix{sortIndicator('price')}
                    </button>
                  )}
                  {stockDisplay.isVisible('value') && (
                    <button style={thButton} onClick={() => toggleSort('value')}>
                      Valeur{sortIndicator('value')}
                    </button>
                  )}
                  {stockDisplay.isVisible('unitWeight') && <div>Poids unitaire</div>}
                  {stockDisplay.isVisible('caseWeight') && <div>Poids conditionnement</div>}
                  {stockDisplay.isVisible('totalWeight') && <div>Poids total stock</div>}
                  <div className="screenOnly">Action</div>
                </div>

                {filteredRows.map(({ product, lot, quantity, value }, index) => (
                  <div
                    key={`${product.id}-${lot.id}-${index}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: cols,
                      gap: 12,
                      padding: '13px 0',
                      borderTop: '1px solid rgba(255,255,255,.08)',
                      alignItems: 'center',
                    }}
                  >
                    {stockDisplay.isVisible('reference') && (
                      <strong style={{ fontSize: 11, letterSpacing: '.03em' }}>
                        {product.internalRef || '—'}
                      </strong>
                    )}

                    {stockDisplay.isVisible('photo') && (
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
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: 10,
                              opacity: 0.5,
                            }}
                          >
                            PHOTO
                          </div>
                        )}
                      </div>
                    )}

                    {stockDisplay.isVisible('qrProduct') &&
                      qrBox(
                        `NUKUSTOCK|PRODUCT|${product.internalRef || product.id}`,
                        `QR Produit ${product.internalRef || product.name}`
                      )}

                    {stockDisplay.isVisible('product') && (
                      <div>
                        <div style={{ fontWeight: 800 }}>{product.name}</div>
                        <div style={{ marginTop: 3, fontSize: 11, opacity: 0.65 }}>
                          {[product.packaging].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    )}

                    {stockDisplay.isVisible('zone') && (
                      <div><Badge tone="info">{detectProductZone(product)}</Badge></div>
                    )}

                    {stockDisplay.isVisible('category') && (
                      <div>{product.category || '—'}</div>
                    )}

                    {stockDisplay.isVisible('qrCategory') &&
                      qrBox(
                        `NUKUSTOCK|CATEGORY|${product.category || 'Sans catégorie'}`,
                        `QR Catégorie ${product.category || ''}`
                      )}

                    {stockDisplay.isVisible('subcategory') && (
                      <div>{product.subcategory || '—'}</div>
                    )}

                    {stockDisplay.isVisible('qrSubcategory') &&
                      qrBox(
                        `NUKUSTOCK|SUBCATEGORY|${product.subcategory || 'Sans sous-catégorie'}`,
                        `QR Sous-catégorie ${product.subcategory || ''}`
                      )}

                    {stockDisplay.isVisible('location') && (
                      <div>{lot.location || 'Non affecté'}</div>
                    )}

                    {stockDisplay.isVisible('qrLocation') &&
                      qrBox(
                        `NUKUSTOCK|LOCATION|${lot.location || 'Non affecté'}`,
                        `QR Lieu ${lot.location || 'Non affecté'}`
                      )}

                    {stockDisplay.isVisible('lot') && (
                      <div>{lot.lotNumber || '—'}</div>
                    )}

                    {stockDisplay.isVisible('expiry') && (
                      <div>
                        {lot.expiry ? (
                          <Badge tone={getExpiryTone(lot.expiry)}>
                            {new Date(`${lot.expiry}T00:00:00`).toLocaleDateString('fr-FR')}
                          </Badge>
                        ) : (
                          <span style={{ opacity: 0.5, fontSize: 12 }}>Sans DLUO</span>
                        )}
                      </div>
                    )}

                    {stockDisplay.isVisible('quantity') && (
                      <div>
                        <Badge
                          tone={
                            quantity <= 0
                              ? 'danger'
                              : quantity < Math.max(0, Number(product.minStock) || 0)
                              ? 'warn'
                              : 'good'
                          }
                        >
                          {quantity} {product.unit}
                        </Badge>
                      </div>
                    )}

                    {stockDisplay.isVisible('price') && (
                      <div>
                        {Math.max(0, Number(product.purchasePrice) || 0).toLocaleString('fr-FR')} XPF
                      </div>
                    )}

                    {stockDisplay.isVisible('value') && (
                      <div>{value.toLocaleString('fr-FR')} XPF</div>
                    )}

                    {stockDisplay.isVisible('unitWeight') && (
                      <div style={{ fontWeight: 700 }}>
                        {formatWeightKg(product.netUnitWeightKg)}
                      </div>
                    )}

                    {stockDisplay.isVisible('caseWeight') && (
                      <div style={{ fontWeight: 700 }}>
                        {formatWeightKg(product.caseWeightKg)}
                      </div>
                    )}

                    {stockDisplay.isVisible('totalWeight') && (
                      <div>
                        <strong>
                          {formatWeightKg(
                            quantity * Number(product.netUnitWeightKg || 0)
                          )}
                        </strong>
                        {quantity > 0 && Number(product.netUnitWeightKg || 0) > 0 && (
                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 10,
                              opacity: 0.6,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {quantity} × {formatWeightKg(product.netUnitWeightKg)}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="screenOnly" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        className="button small"
                        type="button"
                        disabled={quantity <= 0 || !lot.location}
                        onClick={() => openTransfer(product, lot, quantity)}
                      >
                        Transférer
                      </button>
                      <button
                        className="button secondary small"
                        type="button"
                        disabled={!lot?.id || String(lot.id).startsWith('empty-')}
                        onClick={() => openCorrection(product, lot, quantity)}
                      >
                        Corriger
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
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
                marginBottom: 18,
              }}
            >
              <label
                style={{
                  display: 'block',
                  marginBottom: 7,
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Ordre de tri
              </label>

              <select
                className="input"
                value={exportSortMode}
                onChange={(event) =>
                  setExportSortMode(
                    event.target.value as ExportSortMode
                  )
                }
                style={{
                  width: '100%',
                }}
              >
                {EXPORT_SORT_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(180px,1fr))',
                gap: 10,
                marginBottom: 18,
              }}
            >
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800 }}>
                Format
                <select
                  className="input"
                  value={printOrientation}
                  onChange={(event) =>
                    setPrintOrientation(
                      event.target.value as 'portrait' | 'landscape'
                    )
                  }
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Paysage</option>
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800 }}>
                Taille typographie
                <select
                  className="input"
                  value={printFontSize}
                  onChange={(event) =>
                    setPrintFontSize(Number(event.target.value) || 8)
                  }
                >
                  <option value={7}>Petite</option>
                  <option value={8}>Normale</option>
                  <option value={10}>Grande</option>
                  <option value={12}>Très grande</option>
                </select>
              </label>
            </div>

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
               onClick={() => void printStock()}
              >
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}


      {correctionOpen && (() => {
        const product = items.find((item) => item.id === correctionProductId)
        const lot = product?.lots.find((item) => item.id === correctionLotId)
        const currentQuantity = Math.max(0, Number(lot?.quantity) || 0)
        const difference = Number(correctionQuantity || 0) - currentQuantity
        return (
          <div className="screenOnly" style={{ position:'fixed', inset:0, zIndex:1500, background:'rgba(15,23,42,.65)', display:'grid', placeItems:'center', padding:18 }}
            onMouseDown={(event) => { if (event.currentTarget === event.target) setCorrectionOpen(false) }}>
            <div style={{ width:'min(600px,100%)', maxHeight:'92vh', overflowY:'auto', background:'#fff', color:'#101828', borderRadius:18, padding:24, boxShadow:'0 25px 80px rgba(0,0,0,.30)' }}>
              <h2 style={{ margin:0 }}>Correction manuelle du stock</h2>
              <div style={{ marginTop:6, color:'#667085', fontSize:13 }}>Pour corriger une erreur ou un écart constaté.</div>
              <div style={{ marginTop:18, padding:14, borderRadius:12, background:'#f8fafc', border:'1px solid #e5e7eb', lineHeight:1.7 }}>
                <strong>Produit :</strong> {product?.name || '—'}<br/>
                <strong>Lieu :</strong> {lot?.location || 'Non affecté'}<br/>
                <strong>Stock actuel :</strong> {currentQuantity} {product?.unit || ''}
                {lot?.expiry ? <><br/><strong>DLUO / DLC :</strong> {new Date(`${lot.expiry}T00:00:00`).toLocaleDateString('fr-FR')}</> : null}
                {lot?.lotNumber ? <><br/><strong>Lot :</strong> {lot.lotNumber}</> : null}
              </div>
              <div style={{ display:'grid', gap:14, marginTop:18 }}>
                <label style={{ display:'grid', gap:6, fontSize:12, fontWeight:800 }}>
                  Nouvelle quantité
                  <input className="input" type="number" min="0" step="0.01" value={correctionQuantity}
                    onChange={(e)=>setCorrectionQuantity(Math.max(0,Number(e.target.value)||0))}/>
                  <span style={{ color:difference===0?'#667085':difference>0?'#067647':'#b42318' }}>
                    Écart : {difference>0?'+':''}{difference.toLocaleString('fr-FR')} {product?.unit || ''}
                  </span>
                </label>
                <label style={{ display:'grid', gap:6, fontSize:12, fontWeight:800 }}>
                  Motif
                  <select className="input" value={correctionReason} onChange={(e)=>setCorrectionReason(e.target.value)}>
                    <option>Erreur de saisie</option><option>Casse</option><option>Perte</option>
                    <option>Produit périmé</option><option>Correction inventaire</option><option>Autre</option>
                  </select>
                </label>
                <label style={{ display:'grid', gap:6, fontSize:12, fontWeight:800 }}>
                  Commentaire (facultatif)
                  <textarea className="input" style={{ minHeight:90, paddingTop:10 }} value={correctionNote}
                    onChange={(e)=>setCorrectionNote(e.target.value)} placeholder="Précision sur la correction..."/>
                </label>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:22 }}>
                <button className="button secondary" type="button" onClick={()=>setCorrectionOpen(false)}>Annuler</button>
                <button className="button" type="button" onClick={saveCorrection}>Valider la correction</button>
              </div>
            </div>
          </div>
        )
      })()}

      {transferOpen && (() => {
        const product = items.find((item) => item.id === transferProductId)
        const sourceLot = product?.lots.find((lot) => lot.id === transferLotId)
        const available = Math.max(0, Number(sourceLot?.quantity) || 0)

        return (
          <div
            className="screenOnly"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1400,
              background: 'rgba(15,23,42,.65)',
              display: 'grid',
              placeItems: 'center',
              padding: 18,
            }}
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setTransferOpen(false)
            }}
          >
            <div
              style={{
                width: 'min(560px,100%)',
                maxHeight: '92vh',
                overflowY: 'auto',
                background: '#fff',
                color: '#101828',
                borderRadius: 18,
                padding: 24,
                boxShadow: '0 25px 80px rgba(0,0,0,.30)',
              }}
            >
              <h2 style={{ margin: 0 }}>Transférer le stock</h2>
              <div style={{ marginTop: 6, color: '#667085', fontSize: 13 }}>
                {product?.name || 'Produit'}
              </div>

              <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
                <div style={{ padding: 12, borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
                  <strong>Lieu source :</strong> {transferFromLocation}<br />
                  <strong>Disponible :</strong> {available} {product?.unit || ''}<br />
                  <strong>DLUO / DLC :</strong>{' '}
                  {sourceLot?.expiry
                    ? new Date(`${sourceLot.expiry}T00:00:00`).toLocaleDateString('fr-FR')
                    : 'Sans DLUO'}
                  {sourceLot?.lotNumber ? <><br /><strong>Lot :</strong> {sourceLot.lotNumber}</> : null}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 800 }}>
                    Lieu destination
                  </label>
                  <select
                    className="input"
                    style={{ width: '100%' }}
                    value={transferToLocation}
                    onChange={(event) => setTransferToLocation(event.target.value)}
                  >
                    <option value="">Choisir un lieu</option>
                    {quickEntryLocations
                      .filter((location) => location !== transferFromLocation)
                      .map((location) => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 800 }}>
                    Quantité à transférer
                  </label>
                  <input
                    className="input"
                    style={{ width: '100%' }}
                    type="number"
                    min="0.01"
                    max={available}
                    step="0.01"
                    value={transferQuantity}
                    onChange={(event) =>
                      setTransferQuantity(Math.max(0, Number(event.target.value) || 0))
                    }
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
                <button className="button secondary" type="button" onClick={() => setTransferOpen(false)}>
                  Annuler
                </button>
                <button className="button" type="button" onClick={saveTransfer}>
                  Confirmer le transfert
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {quickEntryOpen && (
        <div
          className="screenOnly"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            background: 'rgba(15,23,42,.65)',
            display: 'grid',
            placeItems: 'center',
            padding: 18,
          }}
          onMouseDown={(event) => {
            if (
              event.currentTarget ===
              event.target
            ) {
              setQuickEntryOpen(false)
            }
          }}
        >
          <div
            style={{
              width: 'min(720px,100%)',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#fff',
              color: '#101828',
              borderRadius: 18,
              padding: 24,
              boxShadow:
                '0 25px 80px rgba(0,0,0,.30)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                gap: 14,
                alignItems: 'flex-start',
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  Entrée rapide de stock
                </h2>
                <div
                  style={{
                    marginTop: 5,
                    color: '#667085',
                    fontSize: 12,
                  }}
                >
                  Ajoute immédiatement le stock sans créer de commande fournisseur.
                </div>
              </div>

              <button
                className="button secondary small"
                type="button"
                onClick={() =>
                  setQuickEntryOpen(false)
                }
              >
                Fermer
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2,minmax(0,1fr))',
                gap: 14,
                marginTop: 20,
              }}
            >
              <div
                style={{
                  gridColumn: '1 / -1',
                }}
              >
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#344054',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  Produit
                </label>
                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={quickProductId}
                  onChange={(event) =>
                    setQuickProductId(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Choisir un produit
                  </option>
                  {[...items]
                    .sort((a, b) =>
                      a.name.localeCompare(
                        b.name,
                        'fr'
                      )
                    )
                    .map((product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.internalRef
                          ? `${product.internalRef} · `
                          : ''}
                        {product.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#344054',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  Quantité
                </label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quickQuantity}
                  onChange={(event) =>
                    setQuickQuantity(
                      Math.max(
                        0,
                        Number(
                          event.target.value
                        ) || 0
                      )
                    )
                  }
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#344054',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  Lieu de stockage
                </label>
                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={quickLocation}
                  onChange={(event) =>
                    setQuickLocation(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Choisir un lieu
                  </option>
                  {quickEntryLocations.map(
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
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#344054',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  Lot (facultatif)
                </label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  value={quickLotNumber}
                  onChange={(event) =>
                    setQuickLotNumber(
                      event.target.value
                    )
                  }
                  placeholder="Ex. LOT-2408"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#344054',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  DLUO / DLC (facultatif)
                </label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  type="date"
                  value={quickExpiry}
                  onChange={(event) =>
                    setQuickExpiry(
                      event.target.value
                    )
                  }
                />
              </div>

              <div
                style={{
                  gridColumn: '1 / -1',
                }}
              >
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#344054',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  Note spéciale
                </label>
                <textarea
                  className="input"
                  style={{
                    width: '100%',
                    minHeight: 90,
                    paddingTop: 10,
                    resize: 'vertical',
                  }}
                  value={quickNote}
                  onChange={(event) =>
                    setQuickNote(
                      event.target.value
                    )
                  }
                  placeholder="Ex. Livraison urgente, facture à récupérer demain."
                />
              </div>

              <label
                style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: 13,
                  borderRadius: 12,
                  background: '#fff7e6',
                  border:
                    '1px solid #f4c56a',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    quickNeedsRegularization
                  }
                  onChange={(event) =>
                    setQuickNeedsRegularization(
                      event.target.checked
                    )
                  }
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong>
                    À régulariser
                  </strong>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 3,
                      color: '#667085',
                      fontSize: 11,
                      lineHeight: 1.45,
                    }}
                  >
                    Le stock est ajouté tout de suite. Les documents, fournisseur, facture, BC et prix pourront être complétés plus tard dans Mouvements.
                  </span>
                </span>
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'flex-end',
                gap: 10,
                marginTop: 22,
              }}
            >
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  setQuickEntryOpen(false)
                }
              >
                Annuler
              </button>

              <button
                className="button"
                type="button"
                onClick={saveQuickEntry}
              >
                Valider l&apos;entrée
              </button>
            </div>
          </div>

        </div>
      )}

    </Page>
  )
}