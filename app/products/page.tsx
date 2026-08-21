'use client'

// PAGE PRODUITS NUKUSTOCK — ne pas remplacer par app/settings/page.tsx

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Page, Card, Badge } from '@/components/ui'
import { useProducts, useSuppliers, useMasterData } from '@/lib/store'
import { Product, Supplier, MasterDataItem } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { QRCodeSVG } from 'qrcode.react'
import { ColumnVisibility, useColumnVisibility } from '@/components/column-visibility'


const PRODUCT_REF_COUNTER_KEY = 'nukustock_product_ref_counters_v1'

const PRODUCT_SCREEN_COLUMNS = [
  { key: 'reference', label: 'Référence' },
  { key: 'qrProduct', label: 'QR Produit', qr: true },
  { key: 'product', label: 'Produit / Photo' },
  { key: 'category', label: 'Catégorie' },
  { key: 'qrCategory', label: 'QR Catégorie', qr: true },
  { key: 'subcategory', label: 'Sous-catégorie' },
  { key: 'qrSubcategory', label: 'QR Sous-catégorie', qr: true },
  { key: 'supplier', label: 'Fournisseur' },
  { key: 'type', label: 'Type' },
  { key: 'stock', label: 'Stock' },
  { key: 'expiry', label: 'DLUO / DLC' },
  { key: 'locations', label: 'Lieux de stockage' },
  { key: 'mini', label: 'Mini' },
  { key: 'price', label: 'Prix' },
  { key: 'unitWeight', label: 'Poids unitaire' },
  { key: 'caseWeight', label: 'Poids conditionnement' },
  { key: 'totalWeight', label: 'Poids total stock' },
  { key: 'actions', label: 'Actions' },
]

const PRODUCT_SCREEN_ESSENTIAL = [
  'reference',
  'qrProduct',
  'product',
  'category',
  'subcategory',
  'stock',
  'expiry',
  'locations',
  'price',
  'actions',
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

function cleanRefPart(value: string) {
  const cleaned = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()

  if (!cleaned) return 'XXX'

  return cleaned.slice(0, 3).padEnd(3, 'X')
}

function getRefPrefix(category: string, subcategory: string) {
  return `${cleanRefPart(category)}-${cleanRefPart(subcategory)}`
}

function getStoredCounters(): Record<string, number> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = localStorage.getItem(PRODUCT_REF_COUNTER_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function getHighestExistingRefNumber(
  prefix: string,
  products: Product[]
) {
  const matcher = new RegExp(
    `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`
  )

  return products.reduce((max, product) => {
    const match = product.internalRef?.match(matcher)

    if (!match) return max

    const value = Number(match[1])

    return Number.isFinite(value)
      ? Math.max(max, value)
      : max
  }, 0)
}

function previewNextInternalRef(
  category: string,
  subcategory: string,
  products: Product[]
) {
  if (!category.trim() || !subcategory.trim()) {
    return ''
  }

  const prefix = getRefPrefix(category, subcategory)
  const counters = getStoredCounters()
  const stored = Number(counters[prefix] || 0)
  const existing = getHighestExistingRefNumber(prefix, products)
  const next = Math.max(stored, existing) + 1

  return `${prefix}-${String(next).padStart(3, '0')}`
}

function allocateInternalRef(
  category: string,
  subcategory: string,
  products: Product[]
) {
  const ref = previewNextInternalRef(
    category,
    subcategory,
    products
  )

  if (!ref) return ''

  const prefix = getRefPrefix(category, subcategory)
  const number = Number(ref.split('-').pop() || 0)
  const counters = getStoredCounters()

  counters[prefix] = number

  localStorage.setItem(
    PRODUCT_REF_COUNTER_KEY,
    JSON.stringify(counters)
  )

  return ref
}


function shouldRegenerateInternalRef(ref?: string) {
  const value = (ref || '').trim()

  if (!value) return true

  // Ancien format NukuStock : PRO-0001, PRO-0002...
  return /^PRO-\d+$/i.test(value)
}

function generateMissingInternalRefs(
  products: Product[]
) {
  const counters = getStoredCounters()
  const working = products.map((product) => ({
    ...product,
  }))

  let changed = 0

  // On garde d'abord les références déjà conformes
  // pour connaître les plus grands numéros utilisés.
  working.forEach((product) => {
    if (
      shouldRegenerateInternalRef(
        product.internalRef
      )
    ) {
      return
    }

    if (
      !product.category?.trim() ||
      !product.subcategory?.trim()
    ) {
      return
    }

    const prefix = getRefPrefix(
      product.category,
      product.subcategory
    )

    const match =
      product.internalRef.match(
        new RegExp(
          `^${prefix.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          )}-(\\d+)$`
        )
      )

    if (match) {
      const number = Number(match[1])

      if (Number.isFinite(number)) {
        counters[prefix] = Math.max(
          Number(
            counters[prefix] || 0
          ),
          number
        )
      }
    }
  })

  working.forEach((product) => {
    if (
      !shouldRegenerateInternalRef(
        product.internalRef
      )
    ) {
      return
    }

    if (
      !product.category?.trim() ||
      !product.subcategory?.trim()
    ) {
      return
    }

    const prefix = getRefPrefix(
      product.category,
      product.subcategory
    )

    const stored = Number(
      counters[prefix] || 0
    )

    const existing =
      getHighestExistingRefNumber(
        prefix,
        working
      )

    const next =
      Math.max(
        stored,
        existing
      ) + 1

    product.internalRef =
      `${prefix}-${String(next).padStart(
        3,
        '0'
      )}`

    counters[prefix] = next
    changed += 1
  })

  if (
    changed > 0 &&
    typeof window !== 'undefined'
  ) {
    localStorage.setItem(
      PRODUCT_REF_COUNTER_KEY,
      JSON.stringify(counters)
    )
  }

  return {
    products: working,
    changed,
  }
}
const SUPPLIER_REFERENCE_UPDATES: Record<string, string> = {
  'ALC-ANI-001': '452007',
  'ALC-APE-001': '120008',
  'ALC-APE-004': '120009',
  'ALC-APE-005': '362115',
  'ALC-APE-006': '363122',
  'ALC-ARM-002': '134',
  'ALC-CHR-001': '452308',
  'ALC-CHR-002': '501282',
  'ALC-COG-002': '650000',
  'ALC-COG-005': '371233',
  'ALC-EDV-002': '374132',
  'ALC-GIN-003': '501345',
  'ALC-GIN-004': '5,0101E+12',
  'ALC-GIN-005': '452370',
  'ALC-LIQ-002': '374065',
  'ALC-LIQ-007': '600256',
  'ALC-LIQ-008': '600271',
  'ALC-LIQ-011': '334033',
  'ALC-LIQ-016': '160118',
  'ALC-LIQ-017': '372105',
  'ALC-LIQ-019': '373081',
  'ALC-LIQ-020': '373081',
  'ALC-LIQ-021': '373064',
  'ALC-LIQ-026': '160074',
  'ALC-LIQ-029': '373066',
  'ALC-LIQ-034': '452650',
  'ALC-LIQ-037': '452000',
  'ALC-LIQ-038': '160015',
  'ALC-LIQ-039': '452012',
  'ALC-LIQ-040': '452098',
  'ALC-LIQ-041': '452082',
  'ALC-LIQ-042': '452103',
  'ALC-LIQ-044': '452132',
  'ALC-LIQ-045': '600344',
  'ALC-LIQ-051': '374102',
  'ALC-LIQ-053': '374102',
  'ALC-RHA-001': '391008',
  'ALC-RHI-001': '452302',
  'ALC-RHI-002': '5,00028E+12',
  'ALC-RHI-003': '375148',
  'ALC-RHI-005': '375158',
  'ALC-RHI-006': '162002',
  'ALC-RHI-007': '378013',
  'ALC-TEQ-007': '160046',
  'ALC-TEQ-008': '376374',
  'ALC-TEQ-011': '347150',
  'ALC-TEQ-012': '452121',
  'ALC-TEQ-017': '160027',
  'ALC-TEQ-018': '160027',
  'ALC-VOD-002': '372069',
  'ALC-VOD-005': '372069',
  'ALC-VOD-010': '160028',
  'ALC-WBO-002': '160009',
  'ALC-WJA-001': '377321',
  'ALC-WSC-002': '263600',
  'ALC-WSC-003': '263041',
  'ALC-WSC-004': '377402',
  'ALC-WSC-005': '160040',
  'ALC-WSC-006': '160187',
  'BIE-DIV-001': '3770013289019',
  'BIE-DIV-002': '0405',
  'BIE-DIV-003': '0104',
  'BIE-IMP-001': '335015',
  'BIE-IMP-002': 'HKT0001',
  'BIE-SAN-001': 'HKH0253',
  'CHA-CHA-001': 'A001705',
  'CHA-CHA-002': 'A001706',
  'CHA-CHA-003': '351069',
  'CHA-CHA-004': '351083',
  'CHA-CHA-005': '351133',
  'SOF-DIV-001': '121157',
  'SOF-EAG-001': '121104',
  'SOF-EAG-002': 'DAN0136',
  'SOF-EAG-003': '121154',
  'SOF-EAG-004': '121158',
  'SOF-EAP-001': 'DAN009',
  'SOF-JUS-001': '2517',
  'SOF-JUS-002': '2217',
  'SOF-JUS-003': '2261',
  'SOF-JUS-004': '2517',
  'SOF-JUS-005': '2336',
  'SOF-JUS-006': '2256',
  'SOF-JUS-008': '303038',
  'SOF-JUS-009': '303096',
  'SOF-JUS-010': '107272',
  'SOF-JUS-011': '107273',
  'SOF-LIM-001': '305569',
  'SOF-PRE-001': 'Lune Rouge',
  'SOF-PRE-002': 'Lune Rouge',
  'SOF-PRE-004': 'Lune Rouge',
  'SOF-PRE-005': 'Lune Rouge',
  'SOF-PRE-006': '305532',
  'SOF-PRE-007': '305540',
  'SOF-SIR-001': '106012',
  'SOF-SIR-003': '106014',
  'SOF-SIR-004': '106013',
  'SOF-SOD-001': '106328',
  'SOF-SOD-002': '10177',
  'SOF-SOD-003': '1653',
  'SOF-SOD-005': '1334',
  'SOF-SOD-006': '1864',
  'SOF-SOD-007': '106162',
  'SOF-SOD-008': '10947',
  'SOF-THE-001': '107264',
  'SOF-THE-002': '107263',
  'SOF-THE-003': '107265',
  'SOF-THE-004': '109043',
  'SOF-THE-005': '109040',
  'VIN-VBL-001': '183065',
  'VIN-VBL-002': '183162',
  'VIN-VRG-001': 'VIT0070',
  'VIN-VRG-002': '181671',
  'VIN-VRG-003': '201002',
  'VIN-VRG-004': '184604',
  'VIN-VRG-005': '180226',
  'VIN-VRG-006': 'BXR1062',
  'VIN-VRG-007': 'BXR1230',
  'VIN-VRG-008': '8GR0309',
  'VIN-VRG-009': 'BXR0996',
  'VIN-VRG-010': 'BXR1073',
  'VIN-VRG-011': '181408',
  'VIN-VRG-015': '201002',
  'VIN-VRG-019': '184604',
  'VIN-VRG-020': 'BXR1109',
  'VIN-VRG-021': 'BGR0280',
  'VIN-VRG-022': 'BGR0309',
  'VIN-VRG-023': '184604',
  'VIN-VRG-024': '184604',
  'VIN-VRG-025': '181651',
  'VIN-VRG-026': 'VIT0070',
  'VIN-VRG-027': '190168',
  'VIN-VRG-030': '210020',
  'VIN-VRS-001': 'BXR1081',
  'VIN-VRS-003': '180000',
}

const emptyProduct: Product = {
  id: '',
  internalRef: '',
  supplierRef: '',
  name: '',
  photo: '',
  zone: 'BEVERAGE',
  brand: '',
  category: '',
  subcategory: '',
  packaging: '',
  unit: 'unité',
  netUnitWeightKg: 0,
  caseWeightKg: 0,
  purchasePrice: 0,
  priceUpdatedAt: new Date().toISOString().slice(0, 10),
  mainSupplier: '',
  minStock: 0,
  productType: 'acheté',
  lots: [],
}

const emptySupplier: Supplier = {
  id: '',
  name: '',
  contact: '',
  phone: '',
  payment: '',
  notes: '',
  address: '',
  contactPerson: '',
  email: '',
  deliveryLeadTime: '',
  currency: 'XPF',
  active: true,
}

type AllocationRow = {
  id: string
  location: string
  quantity: number
}

type ExpiryEntry = {
  id: string
  lotNumber: string
  hasExpiry: boolean
  expiry: string
  quantity: number
  allocations: AllocationRow[]
}

const CAVE_A_JUS = 'Cave à jus'
const CAVE_A_JUS_ZONES = [
  'Stock Mahana Resort',
  'Stock Emile / Guy',
] as const

function normalizeLocationKey(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function isCaveAJusLocation(value: string) {
  const normalized = normalizeLocationKey(value)

  return (
    normalized === 'cave a jus' ||
    normalized.startsWith('cave a jus - ')
  )
}

function getCaveAJusZone(value: string) {
  if (!isCaveAJusLocation(value)) return ''

  const separatorIndex = value.indexOf(' - ')

  if (separatorIndex < 0) return ''

  return value.slice(separatorIndex + 3).trim()
}

function buildCaveAJusLocation(zone: string) {
  return zone
    ? `${CAVE_A_JUS} - ${zone}`
    : CAVE_A_JUS
}

const createAllocation = (defaultLocation = ''): AllocationRow => ({
  id: crypto.randomUUID(),
  location: defaultLocation,
  quantity: 0,
})

const createExpiryEntry = (defaultLocation = ''): ExpiryEntry => ({
  id: crypto.randomUUID(),
  lotNumber: '',
  hasExpiry: true,
  expiry: '',
  quantity: 0,
  allocations: [createAllocation(defaultLocation)],
})

export default function Products() {
  const { items, save } = useProducts()
  const { items: suppliers, save: saveSuppliers } = useSuppliers()
  const { items: masterData, save: saveMasterData } = useMasterData()

  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [syncingProducts, setSyncingProducts] = useState(false)
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [supplierForm, setSupplierForm] = useState<Supplier>(emptySupplier)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Product>(emptyProduct)
  const [designationFocused, setDesignationFocused] = useState(false)

  const productDisplay = useColumnVisibility(
    'nukustock_display_products_v1',
    PRODUCT_SCREEN_ESSENTIAL
  )

  const [globalQuantity, setGlobalQuantity] = useState(0)

  // Option générale du produit :
  // coché = ce produit peut avoir une DLUO / DLC
  // décoché = aucune DLUO / DLC n'est demandée
  const [productHasExpiry, setProductHasExpiry] =
    useState(true)

  const [expiryEntries, setExpiryEntries] = useState<ExpiryEntry[]>([
    createExpiryEntry(),
  ])

  useEffect(() => {
    const result =
      generateMissingInternalRefs(items)

    if (result.changed > 0) {
      save(result.products)

      setMsg(
        `${result.changed} ancienne(s) référence(s) interne(s) convertie(s) automatiquement au nouveau format.`
      )
    }
  }, []) // migration automatique une seule fois au chargement

  // Mise à jour automatique des références fournisseur à partir
  // du document de référence transmis. La correspondance se fait
  // par référence interne, donc elle ne dépend pas du libellé produit.
  useEffect(() => {
    if (!items.length) return

    let changed = false

    const next = items.map((product) => {
      const supplierRef =
        SUPPLIER_REFERENCE_UPDATES[
          product.internalRef
        ]

      if (
        !supplierRef ||
        product.supplierRef === supplierRef
      ) {
        return product
      }

      changed = true

      return {
        ...product,
        supplierRef,
      }
    })

    if (changed) {
      save(next)
      setMsg(
        'Références fournisseur mises à jour automatiquement.'
      )
    }
  }, [items, save])

  const shown = useMemo(() => {
    const search = q.toLowerCase().trim()

    return items.filter((p) =>
      `${p.name} ${p.internalRef} ${p.category} ${p.subcategory} ${p.mainSupplier || ''}`
        .toLowerCase()
        .includes(search)
    )
  }, [items, q])


  const supplierSuggestions = useMemo(
    () =>
      suppliers
        .filter((supplier) => supplier.active !== false)
        .map((supplier) => supplier.name)
        .sort((a, b) => a.localeCompare(b, 'fr')),
    [suppliers]
  )

  const zoneChoices = useMemo(
    () =>
      [
        ...new Set(
          [
            ...getMasterItems('zone').map((item) => item.name),
            form.zone || 'BEVERAGE',
          ].filter((value): value is string => Boolean(value))
        ),
      ].sort((a, b) => a.localeCompare(b, 'fr')),
    [masterData, form.zone]
  )

  const categoryChoices = useMemo(
    () =>
      [
        ...new Set(
          [
            ...getMasterItems('category').map((item) => item.name),
            form.category,
          ].filter((value): value is string => Boolean(value))
        ),
      ].sort((a, b) => a.localeCompare(b, 'fr')),
    [masterData, items, form.category]
  )

  const subcategoryChoices = useMemo(() => {
    const categoryId =
      form.categoryId || resolveMasterId('category', form.category)

    const existing = [
      ...getMasterItems('subcategory')
        .filter((item) => !categoryId || item.parentId === categoryId)
        .map((item) => item.name),
      form.subcategory,
    ]

    return [...new Set(existing.filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'fr')
    )
  }, [masterData, items, form.category, form.categoryId, form.subcategory])

  const packagingChoices = useMemo(
    () =>
      [
        ...new Set(
          [
            ...getMasterItems('packaging').map((item) => item.name),

            // Récupère aussi tous les conditionnements déjà utilisés
            // dans les produits existants afin que la liste ne soit
            // jamais vide si le référentiel central n'a pas encore
            // été initialisé.
            ...items
              .map((product) => product.packaging)
              .filter(
                (value): value is string =>
                  Boolean(value?.trim())
              ),

            form.packaging,
          ].filter((value): value is string => Boolean(value))
        ),
      ].sort((a, b) => a.localeCompare(b, 'fr')),
    [masterData, items, form.packaging]
  )

  const unitChoices = useMemo(
    () =>
      [
        ...new Set(
          [
            ...getMasterItems('unit').map((item) => item.name),
            form.unit || 'unité',
          ].filter((value): value is string => Boolean(value))
        ),
      ].sort((a, b) => a.localeCompare(b, 'fr')),
    [masterData, items, form.unit]
  )

  const locationChoices = useMemo(
    () =>
      [
        ...new Set(
          [
            ...getMasterItems('location')
              .map((item) =>
                isCaveAJusLocation(item.name)
                  ? CAVE_A_JUS
                  : item.name
              )
              .filter(
                (name) =>
                  !normalizeLocationKey(name).startsWith(
                    'cave a jus - '
                  )
              ),
            ...form.lots
              .map((lot) =>
                isCaveAJusLocation(lot.location)
                  ? CAVE_A_JUS
                  : lot.location
              )
              .filter(Boolean),
          ].filter((value): value is string => Boolean(value))
        ),
      ].sort((a, b) => a.localeCompare(b, 'fr')),
    [masterData, items, form.lots]
  )

  const askNewValue = (label: string) => {
    const value = window.prompt(`Ajouter ${label}`)?.trim()
    return value || ''
  }

  function getMasterItems(type: MasterDataItem['type']) {
    return masterData.filter(
      (item) => item.type === type && item.active !== false
    )
  }

  const upsertMasterItem = (
    type: MasterDataItem['type'],
    name: string,
    parentId?: string
  ) => {
    const cleanName = name.trim()
    if (!cleanName) return null

    const existing = masterData.find(
      (item) =>
        item.type === type &&
        item.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        (parentId ? item.parentId === parentId : true)
    )

    if (existing) return existing

    const created: MasterDataItem = {
      id: crypto.randomUUID(),
      type,
      name: cleanName,
      parentId,
      active: true,
    }

    saveMasterData([...masterData, created])
    return created
  }

  const renameMasterItem = (
    type: MasterDataItem['type'],
    currentName: string,
    parentId?: string
  ) => {
    if (!currentName.trim()) {
      alert('Sélectionne d’abord une valeur à modifier.')
      return ''
    }

    const item = masterData.find(
      (entry) =>
        entry.type === type &&
        entry.name.trim().toLowerCase() === currentName.trim().toLowerCase() &&
        (parentId ? entry.parentId === parentId : true)
    )

    if (!item) {
      alert('Cette valeur n’est pas encore dans le référentiel. Ajoute-la d’abord.')
      return ''
    }

    const nextName = window.prompt('Nouveau nom', item.name)?.trim()
    if (!nextName || nextName === item.name) return ''

    const duplicate = masterData.find(
      (entry) =>
        entry.type === type &&
        entry.id !== item.id &&
        entry.name.trim().toLowerCase() === nextName.toLowerCase() &&
        (parentId ? entry.parentId === parentId : true)
    )

    if (duplicate) {
      alert(`La valeur « ${duplicate.name} » existe déjà.`)
      return ''
    }

    saveMasterData(
      masterData.map((entry) =>
        entry.id === item.id ? { ...entry, name: nextName } : entry
      )
    )

    // Répercute le renommage sur les produits existants pour éviter
    // de conserver d’anciennes valeurs orphelines.
    if (type === 'category') {
      save(
        items.map((product) =>
          product.category === item.name
            ? { ...product, category: nextName }
            : product
        )
      )
    }

    if (type === 'subcategory') {
      save(
        items.map((product) =>
          product.subcategory === item.name &&
          (!parentId || product.categoryId === parentId)
            ? { ...product, subcategory: nextName }
            : product
        )
      )
    }

    if (type === 'brand') {
      save(
        items.map((product) =>
          product.brand === item.name ? { ...product, brand: nextName } : product
        )
      )
    }

    if (type === 'packaging') {
      save(
        items.map((product) =>
          product.packaging === item.name
            ? { ...product, packaging: nextName }
            : product
        )
      )
    }

    if (type === 'unit') {
      save(
        items.map((product) =>
          product.unit === item.name ? { ...product, unit: nextName } : product
        )
      )
    }

    if (type === 'location') {
      save(
        items.map((product) => ({
          ...product,
          lots: product.lots.map((lot) =>
            lot.location === item.name ? { ...lot, location: nextName } : lot
          ),
        }))
      )
    }

    return nextName
  }

  const deactivateMasterItem = (
    type: MasterDataItem['type'],
    currentName: string,
    parentId?: string
  ) => {
    if (!currentName.trim()) {
      alert('Sélectionne d’abord une valeur à désactiver.')
      return
    }

    const item = masterData.find(
      (entry) =>
        entry.type === type &&
        entry.name.trim().toLowerCase() === currentName.trim().toLowerCase() &&
        (parentId ? entry.parentId === parentId : true)
    )

    if (!item) {
      alert('Valeur introuvable dans le référentiel.')
      return
    }

    if (!window.confirm(`Désactiver « ${item.name} » ? Elle ne sera plus proposée pour les nouvelles saisies.`)) {
      return
    }

    saveMasterData(
      masterData.map((entry) =>
        entry.id === item.id ? { ...entry, active: false } : entry
      )
    )
  }

  function resolveMasterId(
    type: MasterDataItem['type'],
    name: string,
    parentId?: string
  ) {
    return (
      masterData.find(
        (item) =>
          item.type === type &&
          item.name.trim().toLowerCase() === name.trim().toLowerCase() &&
          (parentId ? item.parentId === parentId : true)
      )?.id || ''
    )
  }

  const saveSupplierFromModal = () => {
    if (!supplierForm.name.trim()) {
      alert('Le nom du fournisseur est obligatoire.')
      return
    }

    const cleanEmail = (supplierForm.email || supplierForm.contact || '').trim()

    const supplier: Supplier = {
      ...supplierForm,
      id: supplierForm.id || crypto.randomUUID(),
      name: supplierForm.name.trim(),
      email: cleanEmail,
      contact: cleanEmail,
      currency: supplierForm.currency || 'XPF',
      active: supplierForm.active !== false,
    }

    saveSuppliers(
      supplierForm.id
        ? suppliers.map((item) =>
            item.id === supplierForm.id ? supplier : item
          )
        : [...suppliers, supplier]
    )

    setForm({
      ...form,
      mainSupplier: supplier.name,
      mainSupplierId: supplier.id,
    })
    setSupplierModalOpen(false)
    setSupplierForm(emptySupplier)
  }

  const designationSuggestions = useMemo(() => {
    const search = form.name.trim().toLowerCase()

    if (search.length < 2) return []

    return [...items]
      .filter((product) => {
        const haystack =
          `${product.name} ${product.packaging} ${product.internalRef}`
            .toLowerCase()

        return haystack.includes(search)
      })
      .sort((a, b) => {
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()

        const aStarts = aName.startsWith(search)
        const bStarts = bName.startsWith(search)

        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1

        return a.name.localeCompare(b.name, 'fr')
      })
      .slice(0, 8)
  }, [items, form.name])

  const subcategories = subcategoryChoices

  const totalExpiryQuantity = expiryEntries.reduce(
    (sum, entry) => sum + Math.max(0, Number(entry.quantity) || 0),
    0
  )

  const remainingGlobalQuantity = globalQuantity - totalExpiryQuantity

  const getAllocatedQuantity = (entry: ExpiryEntry) =>
    entry.allocations.reduce(
      (sum, allocation) =>
        sum + Math.max(0, Number(allocation.quantity) || 0),
      0
    )

  const getExpiryPriority = (expiry: string) => {
    if (!expiry) return 'Aucune date'

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const expiryDate = new Date(`${expiry}T00:00:00`)
    expiryDate.setHours(0, 0, 0, 0)

    const days =
      (expiryDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)

    if (days < 0) return 'Périmé'
    if (days < 30) return "Moins d'un mois"
    if (days < 90) return 'De 1 à 3 mois'
    if (days < 180) return 'De 3 à 6 mois'
    if (days < 365) return 'De 6 mois à 1 an'

    return "+ d'un an"
  }

  const getPriorityTone = (
    expiry: string
  ): 'danger' | 'warn' | 'good' | 'neutral' | 'info' => {
    const priority = getExpiryPriority(expiry)

    if (priority === 'Périmé') return 'danger'
    if (priority === "Moins d'un mois") return 'danger'
    if (priority === 'De 1 à 3 mois') return 'warn'
    if (priority === 'De 3 à 6 mois') return 'warn'
    if (priority === 'De 6 mois à 1 an') return 'info'
    if (priority === "+ d'un an") return 'good'

    return 'neutral'
  }

  const generateAutomaticLotNumber = (
    existingLots: number,
    entryIndex: number
  ) => {
    const date = new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll('-', '')

    return `AUTO-${date}-${String(existingLots + entryIndex + 1).padStart(
      3,
      '0'
    )}`
  }

  const resetStockEntry = () => {
    setGlobalQuantity(0)
    setExpiryEntries([createExpiryEntry(locationChoices[0] || '')])
  }

  const openNewProduct = () => {
    setMsg('')
    setProductHasExpiry(true)
    setForm({
      ...emptyProduct,
      zone: 'BEVERAGE',
      priceUpdatedAt: new Date().toISOString().slice(0, 10),
    })
    resetStockEntry()
    setDesignationFocused(false)
    setOpen(true)
  }

  const openEditProduct = (product: Product) => {
    setMsg('')

    setProductHasExpiry(
      product.hasExpiry ??
        product.lots.some(
          (lot) => Boolean(lot.expiry)
        )
    )

    setForm(product)
    resetStockEntry()
    setDesignationFocused(false)
    setOpen(true)
  }

  const selectExistingProduct = (product: Product) => {
    setForm({
      ...product,
      lots: [...product.lots],
    })
    resetStockEntry()
    setDesignationFocused(false)
  }

  const addExpiryEntry = () => {
    setExpiryEntries((current) => [...current, createExpiryEntry(locationChoices[0] || '')])
  }

  const removeExpiryEntry = (entryId: string) => {
    setExpiryEntries((current) =>
      current.length <= 1
        ? current
        : current.filter((entry) => entry.id !== entryId)
    )
  }

  const updateExpiryEntry = (
    entryId: string,
    patch: Partial<Omit<ExpiryEntry, 'id' | 'allocations'>>
  ) => {
    setExpiryEntries((current) =>
      current.map((entry) =>
        entry.id === entryId ? { ...entry, ...patch } : entry
      )
    )
  }

  const addAllocation = (entryId: string) => {
    setExpiryEntries((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              allocations: [...entry.allocations, createAllocation(locationChoices[0] || '')],
            }
          : entry
      )
    )
  }

  const removeAllocation = (entryId: string, allocationId: string) => {
    setExpiryEntries((current) =>
      current.map((entry) => {
        if (entry.id !== entryId) return entry

        return {
          ...entry,
          allocations:
            entry.allocations.length <= 1
              ? entry.allocations
              : entry.allocations.filter(
                  (allocation) => allocation.id !== allocationId
                ),
        }
      })
    )
  }

  const updateAllocation = (
    entryId: string,
    allocationId: string,
    patch: Partial<Omit<AllocationRow, 'id'>>
  ) => {
    setExpiryEntries((current) =>
      current.map((entry) => {
        if (entry.id !== entryId) return entry

        return {
          ...entry,
          allocations: entry.allocations.map((allocation) =>
            allocation.id === allocationId
              ? { ...allocation, ...patch }
              : allocation
          ),
        }
      })
    )
  }

  const validateStockEntry = () => {
    const hasAnyStockData =
      globalQuantity > 0 ||
      expiryEntries.some(
        (entry) =>
          entry.expiry !== '' ||
          entry.lotNumber.trim() !== '' ||
          entry.quantity > 0 ||
          entry.allocations.some((allocation) => allocation.quantity > 0)
      )

    if (!hasAnyStockData) {
      return { ok: true as const, hasStock: false as const }
    }

    if (globalQuantity <= 0) {
      alert('La quantité globale doit être supérieure à 0.')
      return { ok: false as const, hasStock: true as const }
    }

    if (totalExpiryQuantity !== globalQuantity) {
      alert(
        `La somme des quantités des lots doit être égale à la quantité globale. Global : ${globalQuantity}, affecté : ${totalExpiryQuantity}.`
      )
      return { ok: false as const, hasStock: true as const }
    }

    for (let index = 0; index < expiryEntries.length; index += 1) {
      const entry = expiryEntries[index]
      const allocated = getAllocatedQuantity(entry)

      if (
        productHasExpiry &&
        entry.hasExpiry &&
        !entry.expiry
      ) {
        alert(`Lot n°${index + 1} : renseigne une DLUO / DLC ou décoche l'option.`)
        return { ok: false as const, hasStock: true as const }
      }

      if (entry.quantity <= 0) {
        alert(
          `Lot n°${index + 1} : la quantité doit être supérieure à 0.`
        )
        return { ok: false as const, hasStock: true as const }
      }

      if (allocated !== entry.quantity) {
        alert(
          `Lot n°${index + 1} : la répartition par lieux doit être égale à ${entry.quantity}. Réparti : ${allocated}.`
        )
        return { ok: false as const, hasStock: true as const }
      }

      if (
        entry.allocations.some(
          (allocation) =>
            !allocation.location ||
            allocation.quantity <= 0 ||
            !Number.isFinite(allocation.quantity)
        )
      ) {
        alert(
          `Lot n°${index + 1} : chaque lieu doit avoir une quantité supérieure à 0.`
        )
        return { ok: false as const, hasStock: true as const }
      }

      const usedLocations = new Set<string>()

      for (const allocation of entry.allocations) {
        if (
          isCaveAJusLocation(allocation.location) &&
          !getCaveAJusZone(allocation.location)
        ) {
          alert(
            `Lot n°${index + 1} : pour « Cave à jus », choisis « Stock Mahana Resort » ou « Stock Emile / Guy ».`
          )
          return { ok: false as const, hasStock: true as const }
        }

        if (usedLocations.has(allocation.location)) {
          alert(
            `Lot n°${index + 1} : le lieu "${allocation.location}" est présent plusieurs fois.`
          )
          return { ok: false as const, hasStock: true as const }
        }

        usedLocations.add(allocation.location)
      }
    }

    return { ok: true as const, hasStock: true as const }
  }

  const handleProductPhoto = (file?: File) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Sélectionne un fichier image.')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      const image = new Image()

      image.onload = () => {
        const maxSize = 800
        const ratio = Math.min(
          1,
          maxSize / Math.max(image.width, image.height)
        )

        const width = Math.max(1, Math.round(image.width * ratio))
        const height = Math.max(1, Math.round(image.height * ratio))

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const context = canvas.getContext('2d')

        if (!context) {
          alert("Impossible de traiter l'image.")
          return
        }

        context.drawImage(image, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.72)

        setForm((current) => ({
          ...current,
          photo: dataUrl,
        }))
      }

      image.src = String(reader.result || '')
    }

    reader.readAsDataURL(file)
  }

  const duplicateProduct = (product: Product) => {
    const copy: Product = {
      ...structuredClone(product),
      id: '',
      internalRef: '',
      supplierRef: '',
      name: `${product.name} - Copie`,
      lots: [],
      priceUpdatedAt: new Date().toISOString().slice(0, 10),
    }

    setMsg('')
    setProductHasExpiry(
      product.hasExpiry ??
        product.lots.some(
          (lot) => Boolean(lot.expiry)
        )
    )
    setForm(copy)
    resetStockEntry()
    setDesignationFocused(false)
    setOpen(true)
  }

  const deleteProduct = (productId: string, productName: string) => {
    const firstConfirmation = window.confirm(
      `Supprimer le produit « ${productName} » ?\n\nCette action supprimera également son stock actuel, ses lots, ses DLUO/DLC et sa photo.`
    )

    if (!firstConfirmation) return

    const secondConfirmation = window.confirm(
      `DERNIÈRE CONFIRMATION : « ${productName} » sera supprimé définitivement de la base Produits. Confirmer ?`
    )

    if (!secondConfirmation) return

    save(items.filter((product) => product.id !== productId))

    if (form.id === productId) {
      setOpen(false)
      setForm(emptyProduct)
    }

    setMsg(`Produit supprimé : ${productName}`)
  }

  const generateRefsForExistingProducts = () => {
    const missing = items.filter(
      (product) =>
        shouldRegenerateInternalRef(
          product.internalRef
        ) &&
        product.category?.trim() &&
        product.subcategory?.trim()
    )

    if (!missing.length) {
      setMsg(
        'Toutes les références internes sont déjà au nouveau format.'
      )
      return
    }

    const confirmed = window.confirm(
      `Générer / corriger automatiquement la référence interne de ${missing.length} produit(s) ?\n\nLes anciennes références du type PRO-0001 seront remplacées par CAT-SOU-001.`
    )

    if (!confirmed) return

    const result = generateMissingInternalRefs(items)

    save(result.products)

    setMsg(
      `${result.changed} référence(s) interne(s) générée(s).`
    )
  }

  const generatedInternalRef = form.id
    ? form.internalRef
    : previewNextInternalRef(
        form.category,
        form.subcategory,
        items
      )

  const syncProductsToSupabase = async () => {
    if (!items.length) {
      alert('Aucun produit à synchroniser.')
      return
    }

    const confirmed = window.confirm(
      `Synchroniser ${items.length} produit(s) vers Requisition Nuku ?`
    )

    if (!confirmed) return

    setSyncingProducts(true)
    setMsg('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Session administrateur introuvable. Reconnecte-toi.')
      }

      const response = await fetch('/api/admin/sync-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ products: items }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Synchronisation impossible.')
      }

      const errorCount = Array.isArray(data.errors) ? data.errors.length : 0

      setMsg(
        `Synchronisation Requisition Nuku : ${data.inserted || 0} ajouté(s), ${data.updated || 0} mis à jour, ${data.skipped || 0} ignoré(s)${errorCount ? `, ${errorCount} erreur(s)` : ''}.`
      )

      if (errorCount && data.errors?.[0]) {
        alert(
          `Synchronisation partielle. Première erreur : ${data.errors[0].product} — ${data.errors[0].message}`
        )
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur de synchronisation.'

      alert(message)
      setMsg(`Erreur : ${message}`)
    } finally {
      setSyncingProducts(false)
    }
  }

  const submit = () => {
    if (!form.name.trim()) {
      alert('La désignation du produit est obligatoire.')
      return
    }

    if (!form.id && !form.category.trim()) {
      alert(
        'La catégorie est obligatoire pour générer la référence interne.'
      )
      return
    }

    if (!form.id && !form.subcategory.trim()) {
      alert(
        'La sous-catégorie est obligatoire pour générer la référence interne.'
      )
      return
    }

    if (!form.id) {
      const duplicate = items.find(
        (item) =>
          item.name.trim().toLowerCase() ===
          form.name.trim().toLowerCase()
      )

      if (duplicate) {
        alert(
          `Le produit "${duplicate.name}" existe déjà. Sélectionne-le dans les suggestions pour ajouter du stock sans créer de doublon.`
        )
        return
      }
    }

    const validation = validateStockEntry()
    if (!validation.ok) return

    const lots = [...form.lots]

    if (validation.hasStock) {
      expiryEntries.forEach((entry, entryIndex) => {
        const effectiveLotNumber =
          entry.lotNumber.trim() ||
          generateAutomaticLotNumber(lots.length, entryIndex)

        entry.allocations.forEach((allocation) => {
          const effectiveExpiry =
            productHasExpiry && entry.hasExpiry
              ? entry.expiry
              : ''

          const existing = lots.find(
            (lot) => {
              const sameLot =
                lot.lotNumber === effectiveLotNumber &&
                lot.expiry === effectiveExpiry

              if (!sameLot) {
                return false
              }

              if (lot.location === allocation.location) {
                return true
              }

              // Si on change uniquement la sous-zone de la Cave à jus,
              // on considère qu'il s'agit du même lot.
              return (
                isCaveAJusLocation(lot.location) &&
                isCaveAJusLocation(allocation.location)
              )
            }
          )

          if (existing) {
            // Important : enregistrer aussi le nouveau lieu.
            existing.location = allocation.location
            existing.quantity += allocation.quantity
          } else {
            lots.push({
              id: crypto.randomUUID(),
              lotNumber: effectiveLotNumber,
              expiry:
                productHasExpiry &&
                entry.hasExpiry
                  ? entry.expiry
                  : '',
              location: allocation.location,
              quantity: allocation.quantity,
            })
          }
        })
      })
    }

    const categoryId =
      form.categoryId ||
      resolveMasterId('category', form.category)

    const subcategoryId =
      form.subcategoryId ||
      resolveMasterId('subcategory', form.subcategory, categoryId || undefined)


    const brandId =
      form.brandId ||
      resolveMasterId('brand', form.brand || '')

    const packagingId =
      form.packagingId ||
      resolveMasterId('packaging', form.packaging)

    const unitId =
      form.unitId ||
      resolveMasterId('unit', form.unit)

    const supplierId =
      form.mainSupplierId ||
      suppliers.find(
        (supplier) =>
          supplier.name.trim().toLowerCase() ===
          form.mainSupplier.trim().toLowerCase()
      )?.id ||
      ''

    const product: Product = {
      ...form,
      categoryId,
      subcategoryId,
      brandId,
      packagingId,
      unitId,
      mainSupplierId: supplierId,
      id: form.id || crypto.randomUUID(),
      hasExpiry: productHasExpiry,
      internalRef: form.id
        ? form.internalRef
        : allocateInternalRef(
            form.category,
            form.subcategory,
            items
          ),
      priceUpdatedAt:
        form.priceUpdatedAt || new Date().toISOString().slice(0, 10),
      lots,
    }

    save(
      form.id
        ? items.map((item) => (item.id === form.id ? product : item))
        : [...items, product]
    )

    setMsg(
      form.id
        ? `Produit modifié : ${product.name}`
        : `Produit créé : ${product.name}`
    )

    setOpen(false)
    setForm(emptyProduct)
    resetStockEntry()
  }

  const fieldLabelStyle: CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 7,
    color: '#dbe4f0',
  }

  const fieldWrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  }

  const sectionTitleStyle: CSSProperties = {
    fontSize: 17,
    fontWeight: 800,
    marginBottom: 16,
    color: '#ffffff',
  }

  const summaryBoxStyle: CSSProperties = {
    padding: 14,
    borderRadius: 12,
    background: 'rgba(255,255,255,.05)',
    border: '1px solid rgba(255,255,255,.08)',
  }

  return (
    <Page
      title="Produits"
      subtitle="Mercuriel central, lots, DLUO/DLC et types de production"
      action={
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <ColumnVisibility
            columns={PRODUCT_SCREEN_COLUMNS}
            visible={productDisplay.visible}
            onChange={productDisplay.setVisible}
            essential={PRODUCT_SCREEN_ESSENTIAL}
          />

          <button
            className="button secondary"
            type="button"
            disabled={syncingProducts}
            onClick={() => void syncProductsToSupabase()}
          >
            {syncingProducts
              ? 'Synchronisation...'
              : '☁ Synchroniser vers Requisition Nuku'}
          </button>

          <button
            className="button secondary"
            type="button"
            onClick={generateRefsForExistingProducts}
          >
            Corriger / générer les références
          </button>

          <button
            className="button"
            type="button"
            onClick={openNewProduct}
          >
            + Ajouter
          </button>
        </div>
      }
    >
      {msg && (
        <div className="notice goodNotice">
          {msg}
        </div>
      )}

      <input
        className="input"
        placeholder="Rechercher un produit..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <Card>
        <div style={{ overflowX: 'auto' }}>
          {(() => {
            const cols = [
              productDisplay.isVisible('reference') && '120px',
              productDisplay.isVisible('qrProduct') && '76px',
              productDisplay.isVisible('product') && 'minmax(230px,2fr)',
              productDisplay.isVisible('category') && '145px',
              productDisplay.isVisible('qrCategory') && '76px',
              productDisplay.isVisible('subcategory') && '155px',
              productDisplay.isVisible('qrSubcategory') && '76px',
              productDisplay.isVisible('supplier') && '150px',
              productDisplay.isVisible('type') && '120px',
              productDisplay.isVisible('stock') && '110px',
              productDisplay.isVisible('expiry') && '185px',
              productDisplay.isVisible('locations') && '210px',
              productDisplay.isVisible('mini') && '80px',
              productDisplay.isVisible('price') && '110px',
              productDisplay.isVisible('unitWeight') && '125px',
              productDisplay.isVisible('caseWeight') && '165px',
              productDisplay.isVisible('totalWeight') && '145px',
              productDisplay.isVisible('actions') && '100px',
            ].filter(Boolean).join(' ')

            return (
              <div style={{ minWidth: Math.max(900, productDisplay.visible.length * 105) }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: cols,
                    gap: 12,
                    alignItems: 'center',
                    fontWeight: 700,
                    paddingBottom: 12,
                  }}
                >
                  {productDisplay.isVisible('reference') && <div>Référence</div>}
                  {productDisplay.isVisible('qrProduct') && <div>QR Produit</div>}
                  {productDisplay.isVisible('product') && <div>Produit</div>}
                  {productDisplay.isVisible('category') && <div>Catégorie</div>}
                  {productDisplay.isVisible('qrCategory') && <div>QR Cat.</div>}
                  {productDisplay.isVisible('subcategory') && <div>Sous-catégorie</div>}
                  {productDisplay.isVisible('qrSubcategory') && <div>QR Sous-cat.</div>}
                  {productDisplay.isVisible('supplier') && <div>Fournisseur</div>}
                  {productDisplay.isVisible('type') && <div>Type</div>}
                  {productDisplay.isVisible('stock') && <div>Stock</div>}
                  {productDisplay.isVisible('expiry') && <div>DLUO / DLC</div>}
                  {productDisplay.isVisible('locations') && <div>Lieux de stockage</div>}
                  {productDisplay.isVisible('mini') && <div>Mini</div>}
                  {productDisplay.isVisible('price') && <div>Prix</div>}
                  {productDisplay.isVisible('unitWeight') && <div>Poids unitaire</div>}
                  {productDisplay.isVisible('caseWeight') && <div>Poids conditionnement</div>}
                  {productDisplay.isVisible('totalWeight') && <div>Poids total stock</div>}
                  {productDisplay.isVisible('actions') && <div></div>}
                </div>

                {shown.map((p) => {
                  const qty = p.lots.reduce((total, lot) => total + lot.quantity, 0)
                  const expiryMap = new Map<string, number>()
                  p.lots.forEach((lot) => {
                    if (!lot.expiry) return
                    expiryMap.set(lot.expiry, (expiryMap.get(lot.expiry) || 0) + lot.quantity)
                  })
                  const sortedExpiries = [...expiryMap.entries()].sort(
                    ([dateA], [dateB]) =>
                      new Date(`${dateA}T00:00:00`).getTime() -
                      new Date(`${dateB}T00:00:00`).getTime()
                  )
                  const visibleExpiries = sortedExpiries.slice(0, 3)
                  const remainingExpiryCount = sortedExpiries.length - visibleExpiries.length

                  const locationMap = new Map<string, number>()
                  p.lots.forEach((lot) => {
                    if (!lot.location || lot.quantity <= 0) return
                    locationMap.set(
                      lot.location,
                      (locationMap.get(lot.location) || 0) + lot.quantity
                    )
                  })
                  const sortedLocations = [...locationMap.entries()].sort(
                    ([a], [b]) => a.localeCompare(b, 'fr')
                  )
                  const visibleLocations = sortedLocations.slice(0, 4)
                  const remainingLocationCount = sortedLocations.length - visibleLocations.length

                  const qrBox = (value: string) => (
                    <div
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
                      <QRCodeSVG value={value} size={54} level="M" marginSize={0} />
                    </div>
                  )

                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: cols,
                        gap: 12,
                        alignItems: 'center',
                        padding: '14px 0',
                        borderTop: '1px solid rgba(255,255,255,.08)',
                      }}
                    >
                      {productDisplay.isVisible('reference') && (
                        <div>
                          {p.internalRef ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                minHeight: 28,
                                padding: '4px 8px',
                                borderRadius: 8,
                                background: 'rgba(59,130,246,.12)',
                                border: '1px solid rgba(59,130,246,.28)',
                                fontSize: 11,
                                fontWeight: 900,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.internalRef}
                            </span>
                          ) : 'À générer'}
                        </div>
                      )}

                      {productDisplay.isVisible('qrProduct') &&
                        qrBox(`NUKUSTOCK|PRODUCT|${p.internalRef || p.id}`)}

                      {productDisplay.isVisible('product') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div
                            style={{
                              width: 72,
                              height: 72,
                              borderRadius: 10,
                              overflow: 'hidden',
                              background: 'rgba(255,255,255,.05)',
                              border: '1px solid rgba(255,255,255,.08)',
                              flexShrink: 0,
                              display: 'grid',
                              placeItems: 'center',
                            }}
                          >
                            {p.photo ? (
                              <img
                                src={p.photo}
                                alt={p.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  padding: 4,
                                }}
                              />
                            ) : <span style={{ fontSize: 8, opacity: 0.45 }}>PHOTO</span>}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700 }}>{p.name}</div>
                            <div style={{ opacity: 0.7, fontSize: 13, marginTop: 3 }}>
                              {p.packaging || 'Sans conditionnement'}
                            </div>
                          </div>
                        </div>
                      )}

                      {productDisplay.isVisible('category') && <div>{p.category || '—'}</div>}
                      {productDisplay.isVisible('qrCategory') &&
                        qrBox(`NUKUSTOCK|CATEGORY|${p.category || 'Sans catégorie'}`)}
                      {productDisplay.isVisible('subcategory') && <div>{p.subcategory || '—'}</div>}
                      {productDisplay.isVisible('qrSubcategory') &&
                        qrBox(`NUKUSTOCK|SUBCATEGORY|${p.subcategory || 'Sans sous-catégorie'}`)}

                      {productDisplay.isVisible('supplier') && (
                        <div>
                          {p.mainSupplier || '—'}
                        </div>
                      )}

                      {productDisplay.isVisible('type') && (
                        <div>
                          <Badge tone={p.productType === 'fabriqué' ? 'info' : 'neutral'}>
                            {p.productType}
                          </Badge>
                        </div>
                      )}

                      {productDisplay.isVisible('stock') && (
                        <div>
                          <Badge tone={qty < p.minStock ? 'danger' : 'good'}>
                            {qty} {p.unit}
                          </Badge>
                        </div>
                      )}

                      {productDisplay.isVisible('expiry') && (
                        <div>
                          {visibleExpiries.length === 0 ? (
                            <span style={{ fontSize: 12, opacity: 0.5 }}>Aucune date</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {visibleExpiries.map(([expiry, expiryQty]) => (
                                <div key={expiry} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                                  <Badge tone={getPriorityTone(expiry)}>
                                    {new Date(`${expiry}T00:00:00`).toLocaleDateString('fr-FR')}
                                  </Badge>
                                  <span style={{ fontSize: 11, opacity: 0.65 }}>
                                    {expiryQty} {p.unit}
                                  </span>
                                </div>
                              ))}
                              {remainingExpiryCount > 0 && (
                                <span style={{ fontSize: 11, opacity: 0.65 }}>
                                  + {remainingExpiryCount} autre{remainingExpiryCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {productDisplay.isVisible('locations') && (
                        <div>
                          {visibleLocations.length === 0 ? (
                            <span style={{ fontSize: 12, opacity: 0.5 }}>Aucun stock</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {visibleLocations.map(([location, locationQty]) => (
                                <div key={location} style={{ display: 'flex', gap: 6 }}>
                                  <strong style={{ fontSize: 12 }}>{location}</strong>
                                  <span style={{ fontSize: 11, opacity: 0.65 }}>
                                    {locationQty} {p.unit}
                                  </span>
                                </div>
                              ))}
                              {remainingLocationCount > 0 && (
                                <span style={{ fontSize: 11, opacity: 0.65 }}>
                                  + {remainingLocationCount} autre{remainingLocationCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {productDisplay.isVisible('mini') && <div>{p.minStock}</div>}
                      {productDisplay.isVisible('price') && (
                        <div>{Number(p.purchasePrice || 0).toLocaleString('fr-FR')} XPF</div>
                      )}

                      {productDisplay.isVisible('unitWeight') && (
                        <div style={{ fontWeight: 700 }}>
                          {formatWeightKg(p.netUnitWeightKg)}
                        </div>
                      )}

                      {productDisplay.isVisible('caseWeight') && (
                        <div style={{ fontWeight: 700 }}>
                          {formatWeightKg(p.caseWeightKg)}
                        </div>
                      )}

                      {productDisplay.isVisible('totalWeight') && (
                        <div>
                          <strong>
                            {formatWeightKg(
                              qty * Number(p.netUnitWeightKg || 0)
                            )}
                          </strong>
                          {qty > 0 && Number(p.netUnitWeightKg || 0) > 0 && (
                            <div
                              style={{
                                marginTop: 3,
                                fontSize: 10,
                                opacity: 0.6,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {qty} × {formatWeightKg(p.netUnitWeightKg)}
                            </div>
                          )}
                        </div>
                      )}

                      {productDisplay.isVisible('actions') && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            flexWrap: 'wrap',
                          }}
                        >
                          <button
                            className="button secondary small"
                            type="button"
                            title="Ouvrir la fiche produit Bar Team"
                            onClick={() => {
                              window.location.href =
                                `/product-sheets?productId=${encodeURIComponent(
                                  p.id
                                )}&edit=1`
                            }}
                          >
                            ℹ Info
                          </button>

                          <button
                            className="button secondary small"
                            type="button"
                            onClick={() => openEditProduct(p)}
                          >
                            Modifier
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </Card>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 999,
          }}
        >
          <div
            style={{
              width: 'min(1100px, 100%)',
              maxHeight: '94vh',
              overflowY: 'auto',
              background: '#111827',
              borderRadius: 18,
              padding: 24,
              boxShadow: '0 25px 80px rgba(0,0,0,.45)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 26,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 24 }}>
                {form.id ? 'Modifier le produit' : 'Nouveau produit'}
              </h2>

              <button
                className="button secondary small"
                onClick={() => setOpen(false)}
              >
                Fermer
              </button>
            </div>

            <div className="productFormIntro">
              <strong>
                {form.id ? 'Modification du produit' : 'Création rapide'}
              </strong>
              <span>
                Ouvre uniquement les sections dont tu as besoin.
              </span>
            </div>

            <div className="productAccordionStack">
              <details className="productAccordion" open>
                <summary>
                  <span className="accordionNumber">1</span>
                  <span>
                    <strong>Identification</strong>
                    <small>Nom, photo et références</small>
                  </span>
                  <span className="accordionChevron">⌄</span>
                </summary>

                <div className="productAccordionGrid">
              <div
                style={{
                  ...fieldWrapStyle,
                  position: 'relative',
                }}
              >
                <label style={fieldLabelStyle}>Désignation *</label>

                <input
                  className="input"
                  value={form.name}
                  autoComplete="off"
                  onFocus={() => setDesignationFocused(true)}
                  onBlur={() => {
                    window.setTimeout(
                      () => setDesignationFocused(false),
                      120
                    )
                  }}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                    setDesignationFocused(true)
                  }}
                  placeholder="Ex. Coca-Cola 33 cl"
                />

                {designationFocused &&
                  form.name.trim().length >= 2 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        background: '#ffffff',
                        color: '#101828',
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        boxShadow:
                          '0 12px 30px rgba(16,24,40,.18)',
                        overflow: 'hidden',
                        maxHeight: 310,
                        overflowY: 'auto',
                      }}
                    >
                      {designationSuggestions.length > 0 ? (
                        designationSuggestions.map(
                          (product) => (
                            <button
                              key={product.id}
                              type="button"
                              onMouseDown={(e) =>
                                e.preventDefault()
                              }
                              onClick={() =>
                                selectExistingProduct(
                                  product
                                )
                              }
                              style={{
                                width: '100%',
                                border: 0,
                                borderBottom:
                                  '1px solid #f0f1f3',
                                background:
                                  '#ffffff',
                                color: '#101828',
                                padding:
                                  '11px 12px',
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'block',
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: 13,
                                }}
                              >
                                {product.name}
                              </div>

                              <div
                                style={{
                                  marginTop: 3,
                                  fontSize: 11,
                                  color: '#667085',
                                }}
                              >
                                {[
                                  product.packaging,
                                  product.category,
                                  product.subcategory,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </div>

                              <div
                                style={{
                                  marginTop: 3,
                                  fontSize: 10,
                                  color: '#98a2b3',
                                }}
                              >
                                Produit existant — cliquer pour le sélectionner
                              </div>
                            </button>
                          )
                        )
                      ) : (
                        <div
                          style={{
                            padding: 12,
                            fontSize: 12,
                            color: '#667085',
                            lineHeight: 1.4,
                          }}
                        >
                          Aucun produit existant ne correspond. Continue la saisie pour créer un nouveau produit.
                        </div>
                      )}
                    </div>
                  )}

                <div
                  style={{
                    marginTop: 5,
                    fontSize: 11,
                    opacity: 0.65,
                  }}
                >
                  Saisis au moins 2 lettres pour rechercher un produit déjà enregistré.
                </div>
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Photo du produit</label>

                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: 14,
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,.14)',
                      background: 'rgba(255,255,255,.05)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {form.photo ? (
                      <img
                        src={form.photo}
                        alt={form.name || 'Photo produit'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          opacity: 0.55,
                          textAlign: 'center',
                          padding: 8,
                        }}
                      >
                        Aucune photo
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      flex: 1,
                      minWidth: 180,
                    }}
                  >
                    <input
                      className="input"
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        handleProductPhoto(event.target.files?.[0])
                      }
                    />

                    {form.photo && (
                      <button
                        className="button secondary small"
                        type="button"
                        style={{ alignSelf: 'flex-start' }}
                        onClick={() =>
                          setForm({
                            ...form,
                            photo: '',
                          })
                        }
                      >
                        Supprimer la photo
                      </button>
                    )}

                    <div
                      style={{
                        fontSize: 10,
                        opacity: 0.55,
                        lineHeight: 1.4,
                      }}
                    >
                      JPG, PNG ou photo prise depuis téléphone/tablette.
                      L&apos;image est automatiquement réduite avant enregistrement.
                    </div>
                  </div>
                </div>
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>
                  Référence interne
                </label>

                <input
                  className="input"
                  value={generatedInternalRef}
                  readOnly
                  placeholder="Choisis une catégorie et une sous-catégorie"
                  style={{
                    fontWeight: 800,
                    letterSpacing: '.04em',
                    background: 'rgba(255,255,255,.04)',
                    cursor: 'not-allowed',
                  }}
                />

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 10,
                    opacity: 0.6,
                    lineHeight: 1.4,
                  }}
                >
                  Générée automatiquement : 3 premières lettres de la
                  catégorie + 3 premières lettres de la sous-catégorie +
                  numéro séquentiel sur 3 chiffres.
                </div>

                {!form.id &&
                  (!form.category.trim() ||
                    !form.subcategory.trim()) && (
                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 10,
                        color: '#fbbf24',
                      }}
                    >
                      Sélectionne la catégorie et la sous-catégorie pour
                      générer la référence.
                    </div>
                  )}
              </div>

              <div style={fieldWrapStyle}>
                <input
                  className="input"
                  value={form.supplierRef}
                  onChange={(e) =>
                    setForm({ ...form, supplierRef: e.target.value })
                  }
                  placeholder="Ex. REF-FOURN-001"
                />
              </div>

                </div>
              </details>

              <details className="productAccordion" open>
                <summary>
                  <span className="accordionNumber">2</span>
                  <span>
                    <strong>Classement</strong>
                    <small>Zone, catégorie puis sous-catégorie</small>
                  </span>
                  <span className="accordionChevron">⌄</span>
                </summary>

                <div className="productAccordionGrid">
                  <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Zone</label>
                <select
                  className="input"
                  value={form.zone || ''}
                  onChange={(e) => {
                    const zone = e.target.value
                    setForm({
                      ...form,
                      zone,
                      zoneId: resolveMasterId('zone', zone),
                    })
                  }}
                >
                  <option value="">Choisir une zone</option>
                  {zoneChoices.map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 7 }}>
                  <button className="button secondary small" type="button"
                    onClick={() => {
                      const value = askNewValue('une nouvelle zone')
                      if (value) {
                        const created = upsertMasterItem('zone', value)
                        setForm({ ...form, zone: value, zoneId: created?.id || '' })
                      }
                    }}>+ Ajouter</button>
                  
                  
                </div>
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Catégorie</label>
                <select
                  className="input"
                  value={form.category}
                  onChange={(e) => {
                    const category = e.target.value
                    const categoryId = resolveMasterId('category', category)

                    setForm({
                      ...form,
                      category,
                      categoryId,
                      subcategory: '',
                      subcategoryId: '',
                    })
                  }}
                >
                  <option value="">Choisir une catégorie</option>
                  {categoryChoices.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <button
                  className="button secondary small"
                  type="button"
                  style={{ marginTop: 7, alignSelf: 'flex-start' }}
                  onClick={() => {
                    const value = askNewValue('une nouvelle catégorie')
                    if (value) {
                      const created = upsertMasterItem('category', value)
                      setForm({
                        ...form,
                        category: value,
                        categoryId: created?.id || '',
                        subcategory: '',
                        subcategoryId: '',
                      })
                    }
                  }}
                >
                  + Ajouter une nouvelle catégorie
                </button>
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Sous-catégorie</label>
                <select
                  className="input"
                  value={form.subcategory}
                  disabled={!form.category}
                  onChange={(e) => {
                    const subcategory = e.target.value
                    const categoryId =
                      form.categoryId ||
                      resolveMasterId('category', form.category)

                    setForm({
                      ...form,
                      categoryId,
                      subcategory,
                      subcategoryId: resolveMasterId(
                        'subcategory',
                        subcategory,
                        categoryId || undefined
                      ),
                    })
                  }}
                >
                  <option value="">
                    {form.category
                      ? 'Choisir une sous-catégorie'
                      : "Choisir d'abord une catégorie"}
                  </option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))}
                </select>

                <button
                  className="button secondary small"
                  type="button"
                  style={{ marginTop: 7, alignSelf: 'flex-start' }}
                  onClick={() => {
                    if (!form.category) {
                      alert("Choisis d'abord une catégorie.")
                      return
                    }

                    const value = askNewValue('une nouvelle sous-catégorie')
                    if (value) {
                      const categoryId =
                        form.categoryId ||
                        resolveMasterId('category', form.category) ||
                        upsertMasterItem('category', form.category)?.id ||
                        ''

                      const created = upsertMasterItem(
                        'subcategory',
                        value,
                        categoryId || undefined
                      )

                      setForm({
                        ...form,
                        categoryId,
                        subcategory: value,
                        subcategoryId: created?.id || '',
                      })
                    }
                  }}
                >
                  + Ajouter une nouvelle sous-catégorie
                </button>
              </div>

                </div>
              </details>

              <details className="productAccordion">
                <summary>
                  <span className="accordionNumber">3</span>
                  <span>
                    <strong>Achat & conditionnement</strong>
                    <small>Conditionnement, prix, fournisseur et poids</small>
                  </span>
                  <span className="accordionChevron">⌄</span>
                </summary>

                <div className="productAccordionGrid">
              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Conditionnement</label>
                <select
                  className="input"
                  value={form.packaging}
                  onChange={(e) => {
                    const packaging = e.target.value
                    setForm({
                      ...form,
                      packaging,
                      packagingId: resolveMasterId('packaging', packaging),
                    })
                  }}
                >
                  <option value="">Choisir un conditionnement</option>
                  {packagingChoices.map((packaging) => (
                    <option key={packaging} value={packaging}>
                      {packaging}
                    </option>
                  ))}
                </select>

                <button
                  className="button secondary small"
                  type="button"
                  style={{ marginTop: 7, alignSelf: 'flex-start' }}
                  onClick={() => {
                    const value = askNewValue('un nouveau conditionnement')
                    if (value) {
                      const created = upsertMasterItem('packaging', value)
                      setForm({
                        ...form,
                        packaging: value,
                        packagingId: created?.id || '',
                      })
                    }
                  }}
                >
                  + Ajouter un nouveau conditionnement
                </button>
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Unité de gestion</label>
                <select
                  className="input"
                  value={form.unit}
                  onChange={(e) => {
                    const unit = e.target.value
                    setForm({
                      ...form,
                      unit,
                      unitId: resolveMasterId('unit', unit),
                    })
                  }}
                >
                  {unitChoices.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>

                <button
                  className="button secondary small"
                  type="button"
                  style={{ marginTop: 7, alignSelf: 'flex-start' }}
                  onClick={() => {
                    const value = askNewValue('une nouvelle unité de gestion')
                    if (value) {
                      const created = upsertMasterItem('unit', value)
                      setForm({
                        ...form,
                        unit: value,
                        unitId: created?.id || '',
                      })
                    }
                  }}
                >
                  + Ajouter une nouvelle unité
                </button>
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>
                  Poids net unitaire (kg)
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.netUnitWeightKg ?? 0}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      netUnitWeightKg: Math.max(
                        0,
                        Number(e.target.value) || 0
                      ),
                    })
                  }
                  placeholder="Ex. 0.33"
                />
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>
                  Poids d'un colis / conditionnement (kg)
                </label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.caseWeightKg ?? 0}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      caseWeightKg: Math.max(
                        0,
                        Number(e.target.value) || 0
                      ),
                    })
                  }
                  placeholder="Ex. 8.50"
                />
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Fournisseur principal</label>
                <select
                  className="input"
                  value={
                    form.mainSupplierId ||
                    suppliers.find(
                      (supplier) =>
                        supplier.name
                          .trim()
                          .toLowerCase() ===
                        form.mainSupplier
                          .trim()
                          .toLowerCase()
                    )?.id ||
                    ''
                  }
                  onChange={(e) => {
                    const supplierId = e.target.value

                    if (!supplierId) {
                      setForm({
                        ...form,
                        mainSupplier: '',
                        mainSupplierId: '',
                      })
                      return
                    }

                    const linkedSupplier = suppliers.find(
                      (supplier) =>
                        supplier.id === supplierId
                    )

                    setForm({
                      ...form,
                      mainSupplier:
                        linkedSupplier?.name || '',
                      mainSupplierId:
                        linkedSupplier?.id || '',
                    })
                  }}
                >
                  <option value="">
                    — Sélectionner un fournisseur —
                  </option>

                  {[...suppliers]
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
                    )
                    .map((supplier) => (
                      <option
                        key={supplier.id}
                        value={supplier.id}
                      >
                        {supplier.name}
                      </option>
                    ))}
                </select>

                <button
                  className="button secondary small"
                  type="button"
                  style={{ marginTop: 7, alignSelf: 'flex-start' }}
                  onClick={() => {
                    setSupplierForm(emptySupplier)
                    setSupplierModalOpen(true)
                  }}
                >
                  + Ajouter un nouveau fournisseur
                </button>
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>
                  Gestion DLUO / DLC du produit
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    minHeight: 46,
                    padding: '10px 12px',
                    border:
                      '1px solid rgba(255,255,255,.14)',
                    borderRadius: 11,
                    cursor: 'pointer',
                    background:
                      productHasExpiry
                        ? 'rgba(34,197,94,.10)'
                        : 'rgba(255,255,255,.025)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={productHasExpiry}
                    onChange={(event) => {
                      const checked =
                        event.target.checked

                      setProductHasExpiry(
                        checked
                      )

                      setExpiryEntries(
                        (current) =>
                          current.map(
                            (entry) => ({
                              ...entry,
                              hasExpiry:
                                checked
                                  ? entry.hasExpiry
                                  : false,
                              expiry:
                                checked
                                  ? entry.expiry
                                  : '',
                            })
                          )
                      )
                    }}
                    style={{
                      width: 19,
                      height: 19,
                    }}
                  />

                  <span>
                    <strong>
                      {productHasExpiry
                        ? 'Produit avec DLUO / DLC'
                        : 'Produit sans DLUO / DLC'}
                    </strong>

                    <span
                      style={{
                        display: 'block',
                        marginTop: 2,
                        fontSize: 10,
                        opacity: 0.65,
                      }}
                    >
                      {productHasExpiry
                        ? 'Les dates pourront être saisies lot par lot.'
                        : 'Aucune date ne sera demandée pour ce produit.'}
                    </span>
                  </span>
                </label>
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Type de produit</label>
                <select
                  className="input"
                  value={form.productType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      productType:
                        e.target.value as Product['productType'],
                    })
                  }
                >
                  <option value="acheté">Acheté</option>
                  <option value="fabriqué">Fabriqué sur place</option>
                  <option value="modifié">Modifié sur place</option>
                </select>
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Prix d&apos;achat XPF</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.purchasePrice}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      purchasePrice: Math.max(
                        0,
                        Number(e.target.value) || 0
                      ),
                      priceUpdatedAt: new Date()
                        .toISOString()
                        .slice(0, 10),
                    })
                  }
                />
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>
                  Date de mise à jour du tarif
                </label>
                <input
                  className="input"
                  type="date"
                  value={form.priceUpdatedAt}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priceUpdatedAt: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Stock minimum</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minStock: Math.max(
                        0,
                        Number(e.target.value) || 0
                      ),
                    })
                  }
                />
              </div>
                </div>
              </details>

              <details className="productAccordion stockAccordion">
                <summary>
                  <span className="accordionNumber">4</span>
                  <span>
                    <strong>Stock initial / nouvelle entrée</strong>
                    <small>Quantité, DLUO/DLC et lieux de stockage</small>
                  </span>
                  <span className="accordionChevron">⌄</span>
                </summary>

                <div className="productStockAccordionContent">

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 16,
              }}
            >
              <div>
                <div style={sectionTitleStyle}>
                  Nouvelle entrée de stock
                </div>
                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.7,
                    marginTop: -8,
                  }}
                >
                  Une entrée peut contenir plusieurs lots. Pour chaque lot, tu peux
                  choisir s'il possède une DLUO / DLC, puis le répartir sur un ou plusieurs lieux.
                </div>
              </div>
            </div>

            <div style={{ ...fieldWrapStyle, maxWidth: 320 }}>
              <label style={fieldLabelStyle}>
                Quantité globale reçue
              </label>
              <input
                className="input"
                type="number"
                min="0"
                value={globalQuantity}
                onChange={(e) =>
                  setGlobalQuantity(
                    Math.max(0, Number(e.target.value) || 0)
                  )
                }
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                marginTop: 18,
                marginBottom: 22,
              }}
            >
              <div style={summaryBoxStyle}>
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  Quantité globale
                </div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  {globalQuantity}
                </div>
              </div>

              <div style={summaryBoxStyle}>
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  Affecté aux DLUO/DLC
                </div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  {totalExpiryQuantity}
                </div>
              </div>

              <div
                style={{
                  ...summaryBoxStyle,
                  background:
                    remainingGlobalQuantity === 0 && globalQuantity > 0
                      ? 'rgba(34,197,94,.12)'
                      : remainingGlobalQuantity < 0
                      ? 'rgba(239,68,68,.12)'
                      : 'rgba(245,158,11,.12)',
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {remainingGlobalQuantity < 0
                    ? 'Dépassement'
                    : 'Reste à affecter'}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  {Math.abs(remainingGlobalQuantity)}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              {expiryEntries.map((entry, entryIndex) => {
                const allocated = getAllocatedQuantity(entry)
                const remainingForEntry = entry.quantity - allocated

                return (
                  <div
                    key={entry.id}
                    style={{
                      border: '1px solid rgba(255,255,255,.12)',
                      borderRadius: 16,
                      padding: 18,
                      background: 'rgba(255,255,255,.035)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                        marginBottom: 18,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                        }}
                      >
                        Lot n°{entryIndex + 1}
                      </div>

                      <button
                        className="button secondary small"
                        type="button"
                        disabled={expiryEntries.length <= 1}
                        onClick={() => removeExpiryEntry(entry.id)}
                      >
                        Retirer ce lot
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(210px, 1fr))',
                        gap: 16,
                      }}
                    >
                      <div style={fieldWrapStyle}>
                        <label style={fieldLabelStyle}>
                          DLUO / DLC
                        </label>

                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            minHeight: 44,
                            padding: '10px 12px',
                            border: '1px solid rgba(255,255,255,.14)',
                            borderRadius: 11,
                            cursor: 'pointer',
                            background: entry.hasExpiry
                              ? 'rgba(255,255,255,.06)'
                              : 'rgba(255,255,255,.025)',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={
                              productHasExpiry &&
                              entry.hasExpiry
                            }
                            disabled={
                              !productHasExpiry
                            }
                            onChange={(e) =>
                              updateExpiryEntry(entry.id, {
                                hasExpiry: e.target.checked,
                                expiry: e.target.checked
                                  ? entry.expiry
                                  : '',
                              })
                            }
                            style={{
                              width: 18,
                              height: 18,
                              flexShrink: 0,
                            }}
                          />

                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            {productHasExpiry
                              ? 'Ce lot possède une DLUO / DLC'
                              : 'Produit défini sans DLUO / DLC'}
                          </span>
                        </label>

                        {productHasExpiry &&
                        entry.hasExpiry ? (
                          <input
                            className="input"
                            type="date"
                            value={entry.expiry}
                            onChange={(e) =>
                              updateExpiryEntry(entry.id, {
                                expiry: e.target.value,
                              })
                            }
                            style={{
                              marginTop: 8,
                            }}
                          />
                        ) : (
                          <div
                            className="input"
                            style={{
                              marginTop: 8,
                              minHeight: 44,
                              display: 'flex',
                              alignItems: 'center',
                              color: '#98a2b3',
                              background: 'rgba(255,255,255,.035)',
                            }}
                          >
                            Pas de DLUO / DLC
                          </div>
                        )}
                      </div>

                      <div style={fieldWrapStyle}>
                        <label style={fieldLabelStyle}>
                          Numéro de lot (facultatif)
                        </label>
                        <input
                          className="input"
                          value={entry.lotNumber}
                          onChange={(e) =>
                            updateExpiryEntry(entry.id, {
                              lotNumber: e.target.value,
                            })
                          }
                          placeholder="Laisser vide si inconnu"
                        />
                      </div>

                      <div style={fieldWrapStyle}>
                        <label style={fieldLabelStyle}>
                          Quantité pour cette DLUO *
                        </label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={entry.quantity}
                          onChange={(e) =>
                            updateExpiryEntry(entry.id, {
                              quantity: Math.max(
                                0,
                                Number(e.target.value) || 0
                              ),
                            })
                          }
                        />
                      </div>

                      <div style={fieldWrapStyle}>
                        <label style={fieldLabelStyle}>
                          Priorité DLUO / DLC
                        </label>
                        <div
                          className="input"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            minHeight: 44,
                            fontWeight: 700,
                          }}
                        >
                          {!productHasExpiry ||
                          !entry.hasExpiry
                            ? 'Sans DLUO / DLC'
                            : entry.expiry
                            ? getExpiryPriority(entry.expiry)
                            : 'Date à renseigner'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        height: 1,
                        background: 'rgba(255,255,255,.08)',
                        margin: '20px 0',
                      }}
                    />

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                        marginBottom: 14,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>
                          Répartition par lieu
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.65,
                            marginTop: 3,
                          }}
                        >
                          Réparti : {allocated} / {entry.quantity}
                        </div>
                      </div>

                      <button
                        className="button secondary small"
                        type="button"
                        onClick={() => addAllocation(entry.id)}
                      >
                        + Ajouter un lieu
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      {entry.allocations.map(
                        (allocation, allocationIndex) => (
                          <div
                            key={allocation.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns:
                                'minmax(220px,2fr) minmax(130px,1fr) 100px',
                              gap: 10,
                              alignItems: 'end',
                            }}
                          >
                            <div style={fieldWrapStyle}>
                              <label style={fieldLabelStyle}>
                                Lieu {allocationIndex + 1}
                              </label>
                              <div
                                style={{
                                  display: 'grid',
                                  gap: 8,
                                }}
                              >
                                <select
                                  className="input"
                                  value={
                                    isCaveAJusLocation(allocation.location)
                                      ? CAVE_A_JUS
                                      : allocation.location
                                  }
                                  onChange={(e) => {
                                    const nextLocation = e.target.value

                                    updateAllocation(
                                      entry.id,
                                      allocation.id,
                                      {
                                        location:
                                          isCaveAJusLocation(nextLocation)
                                            ? CAVE_A_JUS
                                            : nextLocation,
                                      }
                                    )
                                  }}
                                >
                                  <option value="">Choisir un lieu</option>
                                  {locationChoices.map((location) => (
                                    <option
                                      key={location}
                                      value={location}
                                    >
                                      {location}
                                    </option>
                                  ))}
                                </select>

                                {isCaveAJusLocation(
                                  allocation.location
                                ) && (
                                  <div
                                    style={{
                                      display: 'grid',
                                      gap: 6,
                                      padding: 10,
                                      borderRadius: 10,
                                      border:
                                        '1px solid rgba(255,255,255,.14)',
                                      background:
                                        'rgba(255,255,255,.05)',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 900,
                                        color: '#ffffff',
                                      }}
                                    >
                                      Zone Cave à jus
                                    </div>

                                    <select
                                      className="input"
                                      value={getCaveAJusZone(
                                        allocation.location
                                      )}
                                      onChange={(e) =>
                                        updateAllocation(
                                          entry.id,
                                          allocation.id,
                                          {
                                            location:
                                              buildCaveAJusLocation(
                                                e.target.value
                                              ),
                                          }
                                        )
                                      }
                                    >
                                      <option value="">
                                        Choisir la zone
                                      </option>

                                      {CAVE_A_JUS_ZONES.map((zone) => (
                                        <option
                                          key={zone}
                                          value={zone}
                                        >
                                          {zone}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  gap: 5,
                                  flexWrap: 'wrap',
                                  marginTop: 6,
                                }}
                              >
                                <button
                                  className="button secondary small"
                                  type="button"
                                  onClick={() => {
                                    const value = askNewValue(
                                      'un nouveau lieu de stockage'
                                    )
                                    if (!value) return
                                    const created = upsertMasterItem(
                                      'location',
                                      value
                                    )
                                    updateAllocation(
                                      entry.id,
                                      allocation.id,
                                      {
                                        location: created?.name || value,
                                      }
                                    )
                                  }}
                                >
                                  + Lieu
                                </button>

                                <button
                                  className="button secondary small"
                                  type="button"
                                  disabled={!allocation.location}
                                  onClick={() => {
                                    const nextName = renameMasterItem(
                                      'location',
                                      allocation.location
                                    )
                                    if (nextName) {
                                      updateAllocation(
                                        entry.id,
                                        allocation.id,
                                        { location: nextName }
                                      )
                                    }
                                  }}
                                >
                                  Modifier
                                </button>

                                <button
                                  className="button secondary small"
                                  type="button"
                                  disabled={!allocation.location}
                                  onClick={() =>
                                    deactivateMasterItem(
                                      'location',
                                      allocation.location
                                    )
                                  }
                                >
                                  Désactiver
                                </button>
                              </div>
                            </div>

                            <div style={fieldWrapStyle}>
                              <label style={fieldLabelStyle}>
                                Quantité
                              </label>
                              <input
                                className="input"
                                type="number"
                                min="0"
                                value={allocation.quantity}
                                onChange={(e) =>
                                  updateAllocation(
                                    entry.id,
                                    allocation.id,
                                    {
                                      quantity: Math.max(
                                        0,
                                        Number(e.target.value) || 0
                                      ),
                                    }
                                  )
                                }
                              />
                            </div>

                            <button
                              className="button secondary small"
                              type="button"
                              disabled={entry.allocations.length <= 1}
                              onClick={() =>
                                removeAllocation(
                                  entry.id,
                                  allocation.id
                                )
                              }
                            >
                              Retirer
                            </button>
                          </div>
                        )
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        padding: 12,
                        borderRadius: 10,
                        background:
                          remainingForEntry === 0 && entry.quantity > 0
                            ? 'rgba(34,197,94,.12)'
                            : remainingForEntry < 0
                            ? 'rgba(239,68,68,.12)'
                            : 'rgba(245,158,11,.12)',
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {entry.quantity <= 0
                        ? 'Saisis la quantité de cette DLUO/DLC.'
                        : remainingForEntry === 0
                        ? `Répartition complète : ${allocated} / ${entry.quantity}`
                        : remainingForEntry > 0
                        ? `Il reste ${remainingForEntry} à répartir pour cette DLUO/DLC.`
                        : `Dépassement de ${Math.abs(
                            remainingForEntry
                          )} pour cette DLUO/DLC.`}
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              className="button secondary"
              type="button"
              onClick={addExpiryEntry}
              style={{ marginTop: 18 }}
            >
              + Ajouter un lot
            </button>

            <div
              style={{
                background: 'rgba(255,255,255,.05)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: 12,
                padding: 14,
                marginTop: 18,
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              La quantité globale doit être entièrement répartie entre les
              différentes DLUO/DLC. Ensuite, chaque quantité DLUO/DLC doit
              être entièrement répartie entre ses lieux de stockage. Les
              quantités négatives sont bloquées.
            </div>

                </div>
              </details>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                marginTop: 24,
                flexWrap: 'wrap',
              }}
            >
              {form.id && (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    window.location.href =
                      `/product-sheets?productId=${encodeURIComponent(
                        form.id
                      )}&edit=1`
                  }}
                >
                  ℹ Ouvrir la fiche produit
                </button>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginLeft: 'auto',
                }}
              >
              {form.id && (
                <>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => {
                      const current = items.find(
                        (item) => item.id === form.id
                      )

                      if (current) {
                        duplicateProduct(current)
                      }
                    }}
                  >
                    Dupliquer le produit
                  </button>

                  <button
                    className="button dangerButton"
                    type="button"
                    onClick={() =>
                      deleteProduct(form.id, form.name)
                    }
                  >
                    Supprimer le produit
                  </button>
                </>
              )}

              <button
                className="button secondary"
                onClick={() => setOpen(false)}
              >
                Annuler
              </button>

              <button className="button" onClick={submit}>
                Enregistrer
              </button>
              </div>
            </div>
          </div>
        </div>
      )}


      <style jsx>{`
        .productFormIntro {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:14px;
          padding:12px 14px;
          border:1px solid rgba(255,255,255,.10);
          border-radius:12px;
          background:rgba(255,255,255,.04);
        }

        .productFormIntro strong {
          font-size:14px;
          color:#fff;
        }

        .productFormIntro span {
          font-size:11px;
          color:#98a2b3;
        }

        .productAccordionStack {
          display:grid;
          gap:12px;
        }

        .productAccordion {
          overflow:hidden;
          border:1px solid rgba(255,255,255,.12);
          border-radius:15px;
          background:rgba(255,255,255,.035);
        }

        .productAccordion > summary {
          list-style:none;
          display:grid;
          grid-template-columns:34px minmax(0,1fr) 24px;
          gap:10px;
          align-items:center;
          min-height:64px;
          padding:10px 14px;
          cursor:pointer;
          user-select:none;
        }

        .productAccordion > summary::-webkit-details-marker {
          display:none;
        }

        .accordionNumber {
          display:grid;
          width:30px;
          height:30px;
          place-items:center;
          border-radius:9px;
          background:rgba(255,255,255,.10);
          color:#fff;
          font-size:12px;
          font-weight:900;
        }

        .productAccordion summary strong {
          display:block;
          color:#fff;
          font-size:14px;
        }

        .productAccordion summary small {
          display:block;
          margin-top:3px;
          color:#98a2b3;
          font-size:10px;
        }

        .accordionChevron {
          color:#98a2b3;
          font-size:15px;
          transition:transform .15s ease;
        }

        .productAccordion[open] .accordionChevron {
          transform:rotate(180deg);
        }

        .productAccordionGrid {
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
          gap:18px;
          padding:0 14px 16px;
          border-top:1px solid rgba(255,255,255,.08);
          padding-top:16px;
        }

        .productStockAccordionContent {
          padding:16px 14px 18px;
          border-top:1px solid rgba(255,255,255,.08);
        }

        @media (max-width:640px) {
          .productFormIntro {
            align-items:flex-start;
            flex-direction:column;
          }

          .productAccordionGrid {
            grid-template-columns:1fr;
          }

          .productAccordion > summary {
            grid-template-columns:30px minmax(0,1fr) 20px;
            padding:10px;
          }
        }
      `}</style>

      {supplierModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 1200,
          }}
        >
          <div
            style={{
              width: 'min(820px, 100%)',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#111827',
              borderRadius: 18,
              padding: 24,
              boxShadow: '0 25px 80px rgba(0,0,0,.45)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 22,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Nouveau fournisseur</h2>
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.65 }}>
                  Même fiche que dans l&apos;onglet Fournisseurs.
                </div>
              </div>

              <button
                className="button secondary small"
                type="button"
                onClick={() => {
                  setSupplierModalOpen(false)
                  setSupplierForm(emptySupplier)
                }}
              >
                Fermer
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(230px, 1fr))',
                gap: 16,
              }}
            >
              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Nom du fournisseur *</label>
                <input
                  className="input"
                  value={supplierForm.name}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      name: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Contact principal</label>
                <input
                  className="input"
                  value={supplierForm.contactPerson || ''}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      contactPerson: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Email</label>
                <input
                  className="input"
                  type="email"
                  value={supplierForm.email || supplierForm.contact}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      email: e.target.value,
                      contact: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Téléphone</label>
                <input
                  className="input"
                  value={supplierForm.phone}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      phone: e.target.value,
                    })
                  }
                />
              </div>

              <div style={{ ...fieldWrapStyle, gridColumn: '1 / -1' }}>
                <label style={fieldLabelStyle}>Adresse</label>
                <input
                  className="input"
                  value={supplierForm.address || ''}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      address: e.target.value,
                    })
                  }
                />
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Conditions de paiement</label>
                <input
                  className="input"
                  value={supplierForm.payment}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      payment: e.target.value,
                    })
                  }
                  placeholder="Ex. 30 jours fin de mois"
                />
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Délai de livraison</label>
                <input
                  className="input"
                  value={supplierForm.deliveryLeadTime || ''}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      deliveryLeadTime: e.target.value,
                    })
                  }
                  placeholder="Ex. 7 jours"
                />
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Devise</label>
                <select
                  className="input"
                  value={supplierForm.currency || 'XPF'}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      currency: e.target.value,
                    })
                  }
                >
                  <option value="XPF">XPF</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="NZD">NZD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>

              <div style={fieldWrapStyle}>
                <label style={fieldLabelStyle}>Statut</label>
                <select
                  className="input"
                  value={supplierForm.active === false ? 'inactive' : 'active'}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      active: e.target.value === 'active',
                    })
                  }
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>

              <div style={{ ...fieldWrapStyle, gridColumn: '1 / -1' }}>
                <label style={fieldLabelStyle}>Notes</label>
                <textarea
                  className="input"
                  style={{ minHeight: 90, resize: 'vertical' }}
                  value={supplierForm.notes}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      notes: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 24,
                flexWrap: 'wrap',
              }}
            >
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  setSupplierModalOpen(false)
                  setSupplierForm(emptySupplier)
                }}
              >
                Annuler
              </button>

              <button
                className="button"
                type="button"
                onClick={saveSupplierFromModal}
              >
                Enregistrer le fournisseur
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}