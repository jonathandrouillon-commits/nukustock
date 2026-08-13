'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { Page, Card, Badge } from '@/components/ui'
import { useInventories, useMasterData, useProducts } from '@/lib/store'
import QRCode from 'qrcode'
import { QRCodeSVG } from 'qrcode.react'
import { ColumnVisibility, useColumnVisibility } from '@/components/column-visibility'
import jsQR from 'jsqr'

type InventoryPurpose =
  | 'Stock initial'
  | 'Contrôle'
  | 'Séjour'

type InventoryEntryMode =
  | 'Saisie classique'
  | 'Scan QR'

type ActiveInventory = {
  id: string
  name: string
  type: string
  purpose: InventoryPurpose
  entryMode: InventoryEntryMode
  date: string
  stayStartDate: string
  stayEndDate: string
  guestCount: number
  durationDays: number
  inventoryScope: InventoryScope
  createdAt: string
}


type InventoryPrintColumnKey =
  | 'qrProduct'
  | 'qrCategory'
  | 'qrSubcategory'
  | 'qrLocation'
  | 'reference'
  | 'category'
  | 'subcategory'
  | 'product'
  | 'location'
  | 'theoretical'
  | 'real'
  | 'consumption'
  | 'unit'
  | 'price'
  | 'value'

const INVENTORY_PRINT_COLUMNS: {
  key: InventoryPrintColumnKey
  label: string
}[] = [
  { key: 'qrProduct', label: 'QR Produit' },
  { key: 'qrCategory', label: 'QR Catégorie' },
  { key: 'qrSubcategory', label: 'QR Sous-catégorie' },
  { key: 'qrLocation', label: 'QR Lieu' },
  { key: 'reference', label: 'Référence' },
  { key: 'category', label: 'Catégorie' },
  { key: 'subcategory', label: 'Sous-catégorie' },
  { key: 'product', label: 'Produit' },
  { key: 'location', label: 'Lieu' },
  { key: 'theoretical', label: 'Théorique' },
  { key: 'real', label: 'Réel' },
  { key: 'consumption', label: 'Consommation' },
  { key: 'unit', label: 'Unité' },
  { key: 'price', label: 'Prix unitaire' },
  { key: 'value', label: 'Valeur consommée' },
]

const DEFAULT_INVENTORY_PRINT_COLUMNS: InventoryPrintColumnKey[] = [
  'reference',
  'product',
  'location',
  'theoretical',
  'real',
  'consumption',
  'unit',
]

const INVENTORY_SCREEN_COLUMNS = [
  { key: 'reference', label: 'Référence' },
  { key: 'photo', label: 'Photo' },
  { key: 'qrProduct', label: 'QR Produit', qr: true },
  { key: 'product', label: 'Produit' },
  { key: 'category', label: 'Catégorie' },
  { key: 'qrCategory', label: 'QR Catégorie', qr: true },
  { key: 'subcategory', label: 'Sous-catégorie' },
  { key: 'qrSubcategory', label: 'QR Sous-catégorie', qr: true },
  { key: 'location', label: 'Lieu' },
  { key: 'qrLocation', label: 'QR Lieu', qr: true },
  { key: 'theoretical', label: 'Théorique' },
  { key: 'real', label: 'Réel' },
  { key: 'consumption', label: 'Consommation' },
  { key: 'unit', label: 'Unité' },
  { key: 'price', label: 'Prix unitaire' },
  { key: 'value', label: 'Valeur consommée' },
]

const INVENTORY_SCREEN_ESSENTIAL = [
  'reference',
  'photo',
  'qrProduct',
  'product',
  'location',
  'theoretical',
  'real',
  'consumption',
]

const inventoryTypes = [
  "Début d’exploitation",
  "Fin d’exploitation",
  'Journalier',
  'Hebdomadaire',
  'Mensuel',
]


type InventoryScope =
  | 'Tous les inventaires'
  | 'Beverage'
  | 'Food'
  | 'Matériel & Verrerie'

const inventoryScopes: InventoryScope[] = [
  'Tous les inventaires',
  'Beverage',
  'Food',
  'Matériel & Verrerie',
]

const isProductInScope = (
  product: {
    category?: string
    subcategory?: string
    name?: string
  },
  scope: InventoryScope
) => {
  const haystack = `${product.category || ''} ${product.subcategory || ''} ${
    product.name || ''
  }`.toLowerCase()


  if (scope === 'Tous les inventaires') {
    return true
  }

  const beverageKeywords = [
    'alcool',
    'vin',
    'champagne',
    'bière',
    'biere',
    'soft',
    'soda',
    'jus',
    'sirop',
    'eau',
    'boisson',
    'spiritueux',
    'gin',
    'vodka',
    'rhum',
    'tequila',
    'mezcal',
    'whisky',
    'cognac',
    'liqueur',
  ]

  const foodKeywords = [
    'food',
    'aliment',
    'nourriture',
    'épicerie',
    'epicerie',
    'fruit',
    'légume',
    'legume',
    'viande',
    'poisson',
    'produit frais',
    'surgelé',
    'surgele',
    'sec',
    'cuisine',
  ]

  const equipmentKeywords = [
    'matériel',
    'materiel',
    'verrerie',
    'équipement',
    'equipement',
    'ustensile',
    'glass',
    'verre',
    'assiette',
    'couvert',
    'barware',
    'outil',
  ]

  if (scope === 'Food') {
    return foodKeywords.some((keyword) => haystack.includes(keyword))
  }

  if (scope === 'Matériel & Verrerie') {
    return equipmentKeywords.some((keyword) => haystack.includes(keyword))
  }

  // Les produits historiques de NukuStock sont principalement Beverage.
  // Tout produit non identifié comme Food ou Matériel reste classé Beverage
  // afin de ne pas disparaître de l'inventaire existant.
  const isFood = foodKeywords.some((keyword) => haystack.includes(keyword))
  const isEquipment = equipmentKeywords.some((keyword) =>
    haystack.includes(keyword)
  )

  return (
    beverageKeywords.some((keyword) => haystack.includes(keyword)) ||
    (!isFood && !isEquipment)
  )
}

function formatQty(value: number) {
  return Number((Number(value) || 0).toFixed(2)).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export default function Inventory() {
  const { items: products, save: saveProducts } = useProducts()
  const { items: history, save: saveHistory } = useInventories()
  const { items: masterData } = useMasterData()

  const locations = useMemo(
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

  const [activeInventory, setActiveInventory] =
    useState<ActiveInventory | null>(null)

  const [counted, setCounted] =
    useState<Record<string, number>>({})

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState("Début d’exploitation")
  const [newPurpose, setNewPurpose] =
    useState<InventoryPurpose>('Stock initial')

  const [newEntryMode, setNewEntryMode] =
    useState<InventoryEntryMode>('Saisie classique')
  const [newScope, setNewScope] =
    useState<InventoryScope>('Tous les inventaires')
  const [newDate, setNewDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [stayStartDate, setStayStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [stayEndDate, setStayEndDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [guestCount, setGuestCount] = useState(1)

  const [expandedLocations, setExpandedLocations] =
    useState<Record<string, boolean>>({})

  const [msg, setMsg] = useState('')

  const [closeOpen, setCloseOpen] = useState(false)
  const [applyCountToStock, setApplyCountToStock] = useState(false)

  const [scanLocation, setScanLocation] = useState('')
  const [scanProductId, setScanProductId] = useState('')
  const [scanQuantity, setScanQuantity] = useState(0)
  const [scanMessage, setScanMessage] = useState('')
  const [scanBusy, setScanBusy] = useState(false)

  const inventoryDisplay = useColumnVisibility(
    'nukustock_display_inventory_v1',
    INVENTORY_SCREEN_ESSENTIAL
  )

  const [printColumnsOpen, setPrintColumnsOpen] =
    useState(false)

  const [inventoryPrintColumns, setInventoryPrintColumns] =
    useState<InventoryPrintColumnKey[]>(
      DEFAULT_INVENTORY_PRINT_COLUMNS
    )

  const toggleInventoryPrintColumn = (
    key: InventoryPrintColumnKey
  ) => {
    setInventoryPrintColumns((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    )
  }

  const currentScope: InventoryScope =
    activeInventory?.inventoryScope || newScope

  const inventoryProducts = useMemo(
    () =>
      products.filter((product) =>
        isProductInScope(product, currentScope)
      ),
    [products, currentScope]
  )

  const keyFor = (location: string, productId: string) =>
    `${location}::${productId}`

  const calculateStayDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 1

    const start = new Date(`${startDate}T12:00:00`)
    const end = new Date(`${endDate}T12:00:00`)

    const diff =
      Math.floor(
        (end.getTime() - start.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1

    return Math.max(1, diff)
  }

  const theoretical = (
    productId: string,
    location: string
  ) =>
    inventoryProducts
      .find((product) => product.id === productId)
      ?.lots.filter((lot) => lot.location === location)
      .reduce((sum, lot) => sum + lot.quantity, 0) || 0

  const locationRows = useMemo(() => {
    return locations.map((location) => {
      const rows = inventoryProducts
        .map((product) => {
          const theoreticalQty = theoretical(product.id, location)

          const key = keyFor(location, product.id)

          const realQty =
            counted[key] ?? theoreticalQty

          const consumption = Math.max(
            0,
            theoreticalQty - realQty
          )

          return {
            key,
            product,
            theoreticalQty,
            realQty,
            diff: consumption,
            value: consumption * product.purchasePrice,
          }
        })
        .filter(
          (row) =>
            row.theoreticalQty > 0 ||
            counted[row.key] !== undefined
        )

      const theoreticalTotal = rows.reduce(
        (sum, row) => sum + row.theoreticalQty,
        0
      )

      const realTotal = rows.reduce(
        (sum, row) => sum + row.realQty,
        0
      )

      const diffTotal = rows.reduce(
        (sum, row) => sum + row.diff,
        0
      )

      const valueTotal = rows.reduce(
        (sum, row) => sum + row.value,
        0
      )

      const gapCount = rows.filter(
        (row) => row.diff !== 0
      ).length

      return {
        location,
        rows,
        theoreticalTotal,
        realTotal,
        diffTotal,
        valueTotal,
        gapCount,
      }
    })
  }, [inventoryProducts, counted])

  const locationsWithStock = locationRows.filter(
    (group) => group.rows.length > 0
  )

  const globalTheoretical = locationsWithStock.reduce(
    (sum, group) => sum + group.theoreticalTotal,
    0
  )

  const globalReal = locationsWithStock.reduce(
    (sum, group) => sum + group.realTotal,
    0
  )

  const globalDiff = locationsWithStock.reduce(
    (sum, group) => sum + group.diffTotal,
    0
  )

  const globalValue = locationsWithStock.reduce(
    (sum, group) => sum + group.valueTotal,
    0
  )

  const globalGapCount = locationsWithStock.reduce(
    (sum, group) => sum + group.gapCount,
    0
  )

  const productConsumptionSummary = useMemo(() => {
    if (!activeInventory) return []

    return inventoryProducts
      .map((product) => {
        const consumption = locationsWithStock.reduce(
          (sum, group) => {
            const row = group.rows.find(
              (item) => item.product.id === product.id
            )

            return sum + (row?.diff || 0)
          },
          0
        )

        const value =
          consumption * product.purchasePrice

        const perDay =
          consumption /
          Math.max(1, activeInventory.durationDays)

        const perGuest =
          consumption /
          Math.max(1, activeInventory.guestCount)

        const perGuestPerDay =
          consumption /
          Math.max(
            1,
            activeInventory.guestCount *
              activeInventory.durationDays
          )

        return {
          product,
          consumption,
          value,
          perDay,
          perGuest,
          perGuestPerDay,
        }
      })
      .filter((row) => row.consumption > 0)
      .sort((a, b) => b.consumption - a.consumption)
  }, [
    inventoryProducts,
    locationsWithStock,
    activeInventory,
  ])

  const createInventory = () => {
    if (
      newPurpose === 'Séjour' &&
      (!stayStartDate || !stayEndDate)
    ) {
      alert('Renseigne les dates de début et de fin du séjour.')
      return
    }

    if (
      newPurpose === 'Séjour' &&
      new Date(`${stayEndDate}T12:00:00`).getTime() <
        new Date(`${stayStartDate}T12:00:00`).getTime()
    ) {
      alert('La date de fin du séjour doit être postérieure ou égale à la date de début.')
      return
    }

    if (newPurpose === 'Séjour' && guestCount <= 0) {
      alert("Le nombre d'invités doit être supérieur à 0.")
      return
    }

    const effectiveStayStart =
      newPurpose === 'Séjour' ? stayStartDate : newDate
    const effectiveStayEnd =
      newPurpose === 'Séjour' ? stayEndDate : newDate

    const durationDays =
      newPurpose === 'Séjour'
        ? calculateStayDays(
            effectiveStayStart,
            effectiveStayEnd
          )
        : 1

    const id = `INV-${Date.now()
      .toString()
      .slice(-6)}`

    const inventory: ActiveInventory = {
      id,
      name:
        newName.trim() ||
        `${newScope} - ${newPurpose} - ${newType}`,
      type: newType,
      purpose: newPurpose,
      entryMode: newEntryMode,
      inventoryScope: newScope,
      date: newDate,
      stayStartDate: effectiveStayStart,
      stayEndDate: effectiveStayEnd,
      guestCount:
        newPurpose === 'Séjour' ? guestCount : 1,
      durationDays,
      createdAt: new Date().toISOString(),
    }

    setActiveInventory(inventory)
    setCounted({})
    setScanLocation('')
    setScanProductId('')
    setScanQuantity(0)
    setScanMessage('')

    const defaultExpanded: Record<string, boolean> = {}

    locationsWithStock.forEach((group, index) => {
      defaultExpanded[group.location] = index === 0
    })

    setExpandedLocations(defaultExpanded)
    setCreateOpen(false)
    setMsg(
      `Inventaire ${inventory.inventoryScope} ${inventory.id} créé. Le comptage est organisé par lieu de stockage.`
    )
  }

  const cancelInventory = () => {
    if (
      !confirm(
        "Annuler l'inventaire global en cours ? Les quantités saisies seront perdues."
      )
    ) {
      return
    }

    setActiveInventory(null)
    setCounted({})
    setExpandedLocations({})
    setScanLocation('')
    setScanProductId('')
    setScanQuantity(0)
    setScanMessage('')
    setMsg('Inventaire en cours annulé.')
  }

  const adjustLocationQuantity = (
    product: any,
    location: string,
    targetQty: number,
    inventoryId: string
  ) => {
    const safeTarget = Math.max(0, Number(targetQty) || 0)

    const locationLots = product.lots
      .map((lot: any, index: number) => ({ lot, index }))
      .filter(({ lot }: any) => lot.location === location)

    const currentQty = locationLots.reduce(
      (sum: number, { lot }: any) =>
        sum + Math.max(0, Number(lot.quantity) || 0),
      0
    )

    if (currentQty === safeTarget) {
      return product
    }

    const nextLots = product.lots.map((lot: any) => ({ ...lot }))

    if (locationLots.length === 0) {
      if (safeTarget <= 0) return product

      nextLots.push({
        id: crypto.randomUUID(),
        lotNumber: `INV-${inventoryId}`,
        expiry: '',
        location,
        quantity: safeTarget,
      })

      return {
        ...product,
        lots: nextLots,
      }
    }

    if (safeTarget > currentQty) {
      const difference = safeTarget - currentQty

      const preferred = [...locationLots].sort((a: any, b: any) => {
        const aExpiry = a.lot.expiry || '9999-12-31'
        const bExpiry = b.lot.expiry || '9999-12-31'
        return aExpiry.localeCompare(bExpiry)
      })[0]

      nextLots[preferred.index] = {
        ...nextLots[preferred.index],
        quantity:
          Math.max(
            0,
            Number(nextLots[preferred.index].quantity) || 0
          ) + difference,
      }

      return {
        ...product,
        lots: nextLots,
      }
    }

    let toRemove = currentQty - safeTarget

    const ordered = [...locationLots].sort((a: any, b: any) => {
      const aExpiry = a.lot.expiry || '9999-12-31'
      const bExpiry = b.lot.expiry || '9999-12-31'
      return aExpiry.localeCompare(bExpiry)
    })

    ordered.forEach(({ index }: any) => {
      if (toRemove <= 0) return

      const available = Math.max(
        0,
        Number(nextLots[index].quantity) || 0
      )
      const reduction = Math.min(available, toRemove)

      nextLots[index] = {
        ...nextLots[index],
        quantity: available - reduction,
      }

      toRemove -= reduction
    })

    return {
      ...product,
      lots: nextLots,
    }
  }

  const applyInventoryToStock = () => {
    if (!activeInventory) return

    let nextProducts = products.map((product) => ({
      ...product,
      lots: product.lots.map((lot) => ({ ...lot })),
    }))

    locationsWithStock.forEach((group) => {
      group.rows.forEach((row) => {
        nextProducts = nextProducts.map((product) =>
          product.id === row.product.id
            ? adjustLocationQuantity(
                product,
                group.location,
                row.realQty,
                activeInventory.id
              )
            : product
        )
      })
    })

    saveProducts(nextProducts)
  }

  const finalizeInventory = () => {
    if (!activeInventory) return

    const lines = locationsWithStock.flatMap((group) =>
      group.rows.map((row) => ({
        productId: row.product.id,
        productName: row.product.name,
        location: group.location,
        theoretical: row.theoreticalQty,
        real: row.realQty,
        diff: row.diff,
        value: row.value,
      }))
    )

    if (applyCountToStock) {
      applyInventoryToStock()
    }

    saveHistory([
      {
        id: activeInventory.id,
        name: activeInventory.name,
        type: `${activeInventory.purpose} · ${activeInventory.type}`,
        inventoryScope: activeInventory.inventoryScope,
        location: 'GLOBAL',
        locations: locationsWithStock.map(
          (group) => group.location
        ),
        date: new Date(
          `${activeInventory.date}T12:00:00`
        ).toISOString(),
        stayStartDate: activeInventory.stayStartDate,
        stayEndDate: activeInventory.stayEndDate,
        guestCount: activeInventory.guestCount,
        durationDays: activeInventory.durationDays,
        lines,
      },
      ...history,
    ])

    setMsg(
      applyCountToStock
        ? `Inventaire ${activeInventory.id} clôturé. Le comptage réel est maintenant appliqué au stock.`
        : `Inventaire ${activeInventory.id} clôturé et enregistré sans modification du stock.`
    )

    setCloseOpen(false)
    setApplyCountToStock(false)
    setActiveInventory(null)
    setCounted({})
    setExpandedLocations({})
    setScanLocation('')
    setScanProductId('')
    setScanQuantity(0)
    setScanMessage('')
  }

  const closeInventory = () => {
    if (!activeInventory) return

    setApplyCountToStock(
      activeInventory.purpose === 'Stock initial'
    )
    setCloseOpen(true)
  }

  const reopenHistoricalInventory = (
    inventoryId: string
  ) => {
    const inventory = history.find(
      (item) => item.id === inventoryId
    )

    if (!inventory) return

    const date = new Date(inventory.date)
      .toISOString()
      .slice(0, 10)

    const reopenStart =
      inventory.stayStartDate || date

    const reopenEnd =
      inventory.stayEndDate || date

    const reopenGuests =
      inventory.guestCount || 1

    setActiveInventory({
      id: `INV-${Date.now()
        .toString()
        .slice(-6)}`,
      name: `Recomptage ${inventory.id}`,
      type: inventory.type,
      purpose: 'Contrôle',
      entryMode: 'Saisie classique',
      inventoryScope:
        (inventory.inventoryScope as InventoryScope | undefined) ||
        'Tous les inventaires',
      date,
      stayStartDate: reopenStart,
      stayEndDate: reopenEnd,
      guestCount: reopenGuests,
      durationDays:
        inventory.durationDays ||
        calculateStayDays(reopenStart, reopenEnd),
      createdAt: new Date().toISOString(),
    })

    setCounted(
      Object.fromEntries(
        inventory.lines.map((line) => [
          keyFor(
            line.location ||
              inventory.location ||
              'Container',
            line.productId
          ),
          Math.max(0, line.real),
        ])
      )
    )

    const expanded: Record<string, boolean> = {}

    const usedLocations =
      inventory.locations ||
      [
        ...new Set(
          inventory.lines
            .map((line) => line.location)
            .filter(Boolean)
        ),
      ]

    usedLocations.forEach(
      (location, index) => {
        if (location) {
          expanded[location] = index === 0
        }
      }
    )

    setExpandedLocations(expanded)
    setMsg(
      `Recomptage global créé à partir de ${inventory.id}.`
    )
  }

  const deleteHistoricalInventory = (
    inventoryId: string
  ) => {
    if (
      !confirm(
        `Supprimer définitivement l'inventaire ${inventoryId} ?`
      )
    ) {
      return
    }

    saveHistory(
      history.filter(
        (inventory) =>
          inventory.id !== inventoryId
      )
    )

    setMsg(`Inventaire ${inventoryId} supprimé.`)
  }

  const openAllLocations = () => {
    const next: Record<string, boolean> = {}

    locationsWithStock.forEach((group) => {
      next[group.location] = true
    })

    setExpandedLocations(next)
  }

  const closeAllLocations = () => {
    setExpandedLocations({})
  }

  const printInventory = async () => {
    if (!activeInventory) return

    if (inventoryPrintColumns.length === 0) {
      window.alert(
        'Sélectionne au moins une colonne à imprimer.'
      )
      return
    }

    const selectedDefinitions =
      INVENTORY_PRINT_COLUMNS.filter((column) =>
        inventoryPrintColumns.includes(column.key)
      )

    const headers = selectedDefinitions
      .map((column) => `<th>${column.label}</th>`)
      .join('')

    const getValue = (
      key: InventoryPrintColumnKey,
      group: (typeof locationsWithStock)[number],
      row: (typeof locationsWithStock)[number]['rows'][number]
    ) => {
      switch (key) {
        case 'qrProduct':
          return `NUKUSTOCK|PRODUCT|${row.product.internalRef || row.product.id}`
        case 'qrCategory':
          return `NUKUSTOCK|CATEGORY|${row.product.category || 'Sans catégorie'}`
        case 'qrSubcategory':
          return `NUKUSTOCK|SUBCATEGORY|${row.product.subcategory || 'Sans sous-catégorie'}`
        case 'qrLocation':
          return `NUKUSTOCK|LOCATION|${group.location}`
        case 'reference':
          return row.product.internalRef || ''
        case 'product':
          return row.product.name || ''
        case 'category':
          return row.product.category || ''
        case 'subcategory':
          return row.product.subcategory || ''
        case 'location':
          return group.location
        case 'theoretical':
          return row.theoreticalQty.toLocaleString('fr-FR')
        case 'real':
          return row.realQty.toLocaleString('fr-FR')
        case 'consumption':
          return row.diff.toLocaleString('fr-FR')
        case 'unit':
          return row.product.unit || ''
        case 'price':
          return Math.max(
            0,
            Number(row.product.purchasePrice) || 0
          ).toLocaleString('fr-FR')
        case 'value':
          return row.value.toLocaleString('fr-FR')
        default:
          return ''
      }
    }

    const sections = await Promise.all(
      locationsWithStock.map(async (group) => {
        const rows = await Promise.all(
          group.rows.map(async (row) => {
            const cells = await Promise.all(
              selectedDefinitions.map(async (column) => {
                const value = getValue(
                  column.key,
                  group,
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

            return `<tr>${cells.join('')}</tr>`
          })
        ).then((items) => items.join(''))

        return `
          <section class="location-section">
            <h2>${group.location}</h2>
            <table>
              <thead><tr>${headers}</tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </section>
        `
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
          <title>NukuStock - Inventaire ${activeInventory.id}</title>
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
            .header { margin-bottom: 7mm; }
            .brand { font-size: 18px; font-weight: 800; }
            .title {
              margin-top: 3px;
              font-size: 13px;
              font-weight: 700;
            }
            .meta {
              margin-top: 5px;
              font-size: 9px;
              line-height: 1.5;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 5mm;
              margin: 5mm 0 7mm;
              font-size: 9px;
            }
            .summary div {
              border: 1px solid #bbb;
              padding: 3mm;
            }
            .location-section {
              margin: 0 0 8mm;
              break-inside: avoid-page;
            }
            h2 {
              margin: 0 0 3mm;
              padding-bottom: 2mm;
              border-bottom: 1px solid #111;
              font-size: 12px;
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
            <div class="title">
              Inventaire ${activeInventory.name}
            </div>
            <div class="meta">
              ${activeInventory.id} ·
              ${activeInventory.purpose} ·
              ${activeInventory.entryMode} ·
              ${activeInventory.inventoryScope} ·
              ${activeInventory.type} ·
              ${new Date(
                `${activeInventory.date}T12:00:00`
              ).toLocaleDateString('fr-FR')}
              <br />
              Séjour du
              ${new Date(
                `${activeInventory.stayStartDate}T12:00:00`
              ).toLocaleDateString('fr-FR')}
              au
              ${new Date(
                `${activeInventory.stayEndDate}T12:00:00`
              ).toLocaleDateString('fr-FR')}
              · ${activeInventory.durationDays} jour(s)
              · ${activeInventory.guestCount} invité(s)
            </div>
          </div>

          <div class="summary">
            <div><strong>Théorique :</strong> ${formatQty(globalTheoretical)}</div>
            <div><strong>Réel :</strong> ${formatQty(globalReal)}</div>
            <div><strong>Consommation :</strong> ${globalDiff}</div>
            <div><strong>Valeur :</strong> ${globalValue.toLocaleString('fr-FR')} XPF</div>
          </div>

          ${sections}

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


  const parseNukuStockQr = (rawValue: string) => {
    const raw = rawValue.trim()

    if (!raw) {
      return null
    }

    const parts = raw.split('|')

    if (
      parts.length >= 3 &&
      parts[0].toUpperCase() === 'NUKUSTOCK'
    ) {
      return {
        type: parts[1].toUpperCase(),
        value: parts.slice(2).join('|').trim(),
      }
    }

    // Compatibilité avec les premiers QR Produit contenant uniquement
    // la référence interne.
    const product = products.find(
      (item) =>
        item.internalRef?.trim().toLowerCase() ===
        raw.toLowerCase()
    )

    if (product) {
      return {
        type: 'PRODUCT',
        value: raw,
      }
    }

    return null
  }

  const applyScannedQrValue = (rawValue: string) => {
    if (!activeInventory) return

    const parsed = parseNukuStockQr(rawValue)

    if (!parsed) {
      setScanMessage(
        'QR non reconnu. Utilise un QR NukuStock de lieu ou de produit.'
      )
      return
    }

    if (parsed.type === 'LOCATION') {
      const matchedLocation = locations.find(
        (location) =>
          location.trim().toLowerCase() ===
          parsed.value.toLowerCase()
      )

      if (!matchedLocation) {
        setScanMessage(
          `Lieu introuvable dans NukuStock : ${parsed.value}`
        )
        return
      }

      setScanLocation(matchedLocation)
      setScanProductId('')
      setScanQuantity(0)
      setScanMessage(
        `Lieu actif : ${matchedLocation}. Scanne maintenant un produit.`
      )

      setExpandedLocations((current) => ({
        ...current,
        [matchedLocation]: true,
      }))

      return
    }

    if (parsed.type === 'PRODUCT') {
      if (!scanLocation) {
        setScanMessage(
          'Scanne d’abord le QR du lieu de stockage.'
        )
        return
      }

      const product = products.find(
        (item) =>
          item.internalRef?.trim().toLowerCase() ===
            parsed.value.toLowerCase() ||
          item.id === parsed.value
      )

      if (!product) {
        setScanMessage(
          `Produit introuvable : ${parsed.value}`
        )
        return
      }

      if (!isProductInScope(product, activeInventory.inventoryScope)) {
        setScanMessage(
          `${product.name} n’appartient pas au périmètre ${activeInventory.inventoryScope}.`
        )
        return
      }

      const existingKey = keyFor(
        scanLocation,
        product.id
      )
      const existingTheoretical = theoretical(
        product.id,
        scanLocation
      )
      const existingCount =
        counted[existingKey] ?? existingTheoretical

      setScanProductId(product.id)
      setScanQuantity(existingCount)
      setScanMessage(
        `${product.name} sélectionné dans ${scanLocation}. Saisis la quantité réelle.`
      )

      return
    }

    setScanMessage(
      `Ce QR (${parsed.type}) n’est pas utilisé pour le comptage. Scanne un QR Lieu ou Produit.`
    )
  }

  const decodeQrPhoto = async (file?: File) => {
    if (!file || !activeInventory) return

    setScanBusy(true)
    setScanMessage('Lecture du QR en cours…')

    try {
      const bitmap = await createImageBitmap(file)
      const maxDimension = 1800
      const ratio = Math.min(
        1,
        maxDimension /
          Math.max(bitmap.width, bitmap.height)
      )
      const width = Math.max(
        1,
        Math.round(bitmap.width * ratio)
      )
      const height = Math.max(
        1,
        Math.round(bitmap.height * ratio)
      )

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error(
          'Canvas indisponible pour lire le QR.'
        )
      }

      context.drawImage(
        bitmap,
        0,
        0,
        width,
        height
      )

      const imageData = context.getImageData(
        0,
        0,
        width,
        height
      )

      const result = jsQR(
        imageData.data,
        imageData.width,
        imageData.height,
        {
          inversionAttempts:
            'attemptBoth',
        }
      )

      bitmap.close()

      if (!result?.data) {
        setScanMessage(
          'Aucun QR détecté sur la photo. Rapproche-toi du QR et reprends la photo.'
        )
        return
      }

      applyScannedQrValue(result.data)
    } catch (error: any) {
      setScanMessage(
        `Impossible de lire cette photo : ${
          error?.message || 'erreur inconnue'
        }`
      )
    } finally {
      setScanBusy(false)
    }
  }

  const validateScannedProduct = () => {
    if (!activeInventory) return

    if (!scanLocation) {
      setScanMessage(
        'Scanne d’abord un lieu de stockage.'
      )
      return
    }

    if (!scanProductId) {
      setScanMessage(
        'Scanne d’abord un produit.'
      )
      return
    }

    const product = products.find(
      (item) => item.id === scanProductId
    )

    if (!product) {
      setScanMessage('Produit introuvable.')
      return
    }

    const quantity = Math.max(
      0,
      Number(scanQuantity) || 0
    )

    setCounted((current) => ({
      ...current,
      [keyFor(
        scanLocation,
        scanProductId
      )]: quantity,
    }))

    setExpandedLocations((current) => ({
      ...current,
      [scanLocation]: true,
    }))

    setScanMessage(
      `${product.name} : ${formatQty(
        quantity
      )} ${product.unit || ''} enregistré dans ${scanLocation}. Scanne le produit suivant.`
    )
    setScanProductId('')
    setScanQuantity(0)
  }

  const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 7,
    color: '#dbe4f0',
  }

  return (
    <Page
      title="Inventaires"
      subtitle="Tous les inventaires ou par famille : Beverage, Food, Matériel & Verrerie"
      action={
        activeInventory ? (
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <ColumnVisibility
              columns={INVENTORY_SCREEN_COLUMNS}
              visible={inventoryDisplay.visible}
              onChange={inventoryDisplay.setVisible}
              essential={INVENTORY_SCREEN_ESSENTIAL}
            />
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                setPrintColumnsOpen(true)
              }
            >
              Imprimer l&apos;inventaire
            </button>
            <button
              className="button"
              onClick={closeInventory}
            >
              Clôturer l&apos;inventaire
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ColumnVisibility
              columns={INVENTORY_SCREEN_COLUMNS}
              visible={inventoryDisplay.visible}
              onChange={inventoryDisplay.setVisible}
              essential={INVENTORY_SCREEN_ESSENTIAL}
            />
          <button
            className="button"
            onClick={() => {
              setNewName('')
              setNewType(
                "Début d’exploitation"
              )
              setNewPurpose('Stock initial')
              setNewEntryMode('Saisie classique')
              setNewScope('Tous les inventaires')
              const today = new Date()
                .toISOString()
                .slice(0, 10)

              setNewDate(today)
              setStayStartDate(today)
              setStayEndDate(today)
              setGuestCount(1)
              setCreateOpen(true)
            }}
          >
            + Créer un inventaire
          </button>
          </div>
        )
      }
    >
      {msg && (
        <div className="notice goodNotice">
          {msg}
        </div>
      )}

      {!activeInventory && (
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'space-between',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                }}
              >
                Aucun inventaire en cours
              </h2>

              <p
                style={{
                  margin: '7px 0 0',
                  color: '#667085',
                  fontSize: 13,
                  maxWidth: 720,
                }}
              >
                Choisis entre Tous les inventaires,
                Beverage, Food ou Matériel & Verrerie.
                Tous les lieux concernés sont regroupés
                dans un seul inventaire, avec un comptage
                séparé lieu par lieu.
              </p>
            </div>

            <button
              className="button"
              onClick={() => {
                setNewScope('Tous les inventaires')
                setCreateOpen(true)
              }}
            >
              + Créer un inventaire
            </button>
          </div>
        </Card>
      )}

      {activeInventory && (
        <>
          <Card>
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                gap: 16,
                alignItems:
                  'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#667085',
                  }}
                >
                  INVENTAIRE GLOBAL EN COURS
                </div>

                <h2
                  style={{
                    margin: '5px 0 4px',
                    fontSize: 20,
                  }}
                >
                  {activeInventory.name}
                </h2>

                <div
                  style={{
                    color: '#667085',
                    fontSize: 13,
                  }}
                >
                  {activeInventory.id} ·{' '}
                  {activeInventory.purpose} ·{' '}
                  {activeInventory.entryMode} ·{' '}
                  {activeInventory.inventoryScope} ·{' '}
                  {activeInventory.type} ·{' '}
                  {new Date(
                    `${activeInventory.date}T12:00:00`
                  ).toLocaleDateString(
                    'fr-FR'
                  )}
                </div>

                <div
                  style={{
                    color: '#98a2b3',
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  {
                    locationsWithStock.length
                  }{' '}
                  lieu
                  {locationsWithStock.length >
                  1
                    ? 'x'
                    : ''}{' '}
                  de stockage à compter
                </div>

                <div
                  style={{
                    color: '#667085',
                    fontSize: 12,
                    marginTop: 8,
                    fontWeight: 700,
                  }}
                >
                  Séjour du{' '}
                  {new Date(
                    `${activeInventory.stayStartDate}T12:00:00`
                  ).toLocaleDateString('fr-FR')}{' '}
                  au{' '}
                  {new Date(
                    `${activeInventory.stayEndDate}T12:00:00`
                  ).toLocaleDateString('fr-FR')}
                  {' · '}
                  {activeInventory.durationDays} jour
                  {activeInventory.durationDays > 1 ? 's' : ''}
                  {' · '}
                  {activeInventory.guestCount} invité
                  {activeInventory.guestCount > 1 ? 's' : ''}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <Badge tone="info">
                  Global
                </Badge>

                <Badge tone="warn">
                  En cours
                </Badge>

                <button
                  className="button secondary small"
                  onClick={
                    cancelInventory
                  }
                >
                  Annuler
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(160px,1fr))',
                gap: 12,
                marginTop: 18,
              }}
            >
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: '#f8fafc',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: '#667085',
                  }}
                >
                  Lieux
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                  }}
                >
                  {locationsWithStock.length}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: '#f8fafc',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: '#667085',
                  }}
                >
                  Théorique global
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                  }}
                >
                  {formatQty(globalTheoretical)}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: '#f8fafc',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: '#667085',
                  }}
                >
                  Réel global
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                  }}
                >
                  {formatQty(globalReal)}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background:
                    globalGapCount === 0
                      ? '#eaf8f0'
                      : '#fff3df',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: '#667085',
                  }}
                >
                  Produits consommés
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                  }}
                >
                  {globalGapCount}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background:
                    globalDiff === 0
                      ? '#eaf8f0'
                      : '#ffecec',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: '#667085',
                  }}
                >
                  Consommation globale
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                  }}
                >
                  {globalDiff > 0
                    ? '+'
                    : ''}
                  {globalDiff}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background:
                    globalValue === 0
                      ? '#eaf8f0'
                      : '#ffecec',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: '#667085',
                  }}
                >
                  Valeur consommée
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                  }}
                >
                  {globalValue > 0
                    ? '+'
                    : ''}
                  {globalValue.toLocaleString(
                    'fr-FR'
                  )}{' '}
                  XPF
                </div>
              </div>
            </div>
          </Card>

          {activeInventory.entryMode === 'Scan QR' && (
            <Card>
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'flex-start',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#667085',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                    }}
                  >
                    Comptage par QR
                  </div>

                  <h2
                    style={{
                      margin: '4px 0 0',
                    }}
                  >
                    {scanLocation
                      ? `Lieu actif : ${scanLocation}`
                      : 'Commence par scanner un lieu'}
                  </h2>
                </div>

                <button
                  className="button secondary small"
                  type="button"
                  onClick={() => {
                    setScanLocation('')
                    setScanProductId('')
                    setScanQuantity(0)
                    setScanMessage(
                      'Lieu réinitialisé. Scanne un nouveau QR de lieu.'
                    )
                  }}
                >
                  Changer de lieu
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit,minmax(220px,1fr))',
                  gap: 14,
                  marginTop: 18,
                }}
              >
                <label
                  style={{
                    minHeight: 120,
                    padding: 18,
                    border:
                      '2px dashed #cbd5e1',
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    textAlign: 'center',
                    cursor: scanBusy
                      ? 'wait'
                      : 'pointer',
                    background: '#f8fafc',
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={scanBusy}
                    style={{ display: 'none' }}
                    onChange={async (event) => {
                      const file =
                        event.target.files?.[0]
                      await decodeQrPhoto(file)
                      event.currentTarget.value = ''
                    }}
                  />

                  <span>
                    <strong
                      style={{
                        display: 'block',
                        fontSize: 15,
                      }}
                    >
                      {scanBusy
                        ? 'Lecture…'
                        : 'Prendre en photo un QR'}
                    </strong>

                    <span
                      style={{
                        display: 'block',
                        marginTop: 6,
                        color: '#667085',
                        fontSize: 12,
                        lineHeight: 1.4,
                      }}
                    >
                      QR Lieu d&apos;abord, puis QR Produit.
                    </span>
                  </span>
                </label>

                <div
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    border:
                      '1px solid #e5e7eb',
                    background: '#fff',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: '#667085',
                      fontWeight: 800,
                    }}
                  >
                    PRODUIT SCANNÉ
                  </div>

                  {scanProductId ? (
                    <>
                      <div
                        style={{
                          marginTop: 7,
                          fontSize: 16,
                          fontWeight: 800,
                        }}
                      >
                        {
                          products.find(
                            (item) =>
                              item.id ===
                              scanProductId
                          )?.name
                        }
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                        }}
                      >
                        <label
                          style={{
                            display: 'block',
                            marginBottom: 6,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          Quantité réelle
                        </label>

                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={scanQuantity}
                          onChange={(event) =>
                            setScanQuantity(
                              Math.max(
                                0,
                                Number(
                                  event.target.value
                                ) || 0
                              )
                            )
                          }
                          style={{
                            width: '100%',
                          }}
                        />
                      </div>

                      <button
                        className="button"
                        type="button"
                        onClick={
                          validateScannedProduct
                        }
                        style={{
                          width: '100%',
                          marginTop: 12,
                        }}
                      >
                        Valider ce produit
                      </button>
                    </>
                  ) : (
                    <div
                      style={{
                        marginTop: 8,
                        color: '#98a2b3',
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      Aucun produit sélectionné. Après avoir scanné un lieu, photographie le QR du produit à compter.
                    </div>
                  )}
                </div>
              </div>

              {scanMessage && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 10,
                    background:
                      'rgba(59,130,246,.08)',
                    border:
                      '1px solid rgba(59,130,246,.18)',
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  {scanMessage}
                </div>
              )}
            </Card>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              gap: 10,
              margin: '14px 0',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                color: '#667085',
                fontSize: 13,
              }}
            >
              Compte chaque lieu séparément.
              Les totaux sont regroupés
              automatiquement dans
              l&apos;inventaire global.
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
              }}
            >
              <button
                className="button secondary small"
                onClick={openAllLocations}
              >
                Tout ouvrir
              </button>

              <button
                className="button secondary small"
                onClick={closeAllLocations}
              >
                Tout fermer
              </button>
            </div>
          </div>

          {locationsWithStock.map(
            (group) => {
              const isOpen =
                expandedLocations[
                  group.location
                ] === true

              return (
                <Card key={group.location}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedLocations({
                        ...expandedLocations,
                        [group.location]:
                          !isOpen,
                      })
                    }
                    style={{
                      width: '100%',
                      border: 0,
                      background:
                        'transparent',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'center',
                      gap: 14,
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 17,
                        }}
                      >
                        {group.location}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: '#667085',
                        }}
                      >
                        {
                          group.rows.length
                        }{' '}
                        produit
                        {group.rows.length >
                        1
                          ? 's'
                          : ''}{' '}
                        · Théorique{' '}
                        {
                          group.theoreticalTotal
                        }{' '}
                        · Réel{' '}
                        {group.realTotal}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems:
                          'center',
                        gap: 10,
                      }}
                    >
                      <Badge
                        tone={
                          group.gapCount ===
                          0
                            ? 'good'
                            : 'danger'
                        }
                      >
                        {group.gapCount}{' '}
                        consommation
                        {group.gapCount >
                        1
                          ? 's'
                          : ''}
                      </Badge>

                      <span
                        style={{
                          fontSize: 18,
                        }}
                      >
                        {isOpen
                          ? '−'
                          : '+'}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        marginTop: 16,
                      }}
                    >
                      <div className="tableWrap">
                        <table>
                          <thead>
                            <tr>
                              {inventoryDisplay.isVisible('reference') && <th>Référence</th>}
                              {inventoryDisplay.isVisible('photo') && <th>Photo</th>}
                              {inventoryDisplay.isVisible('qrProduct') && <th>QR Produit</th>}
                              {inventoryDisplay.isVisible('product') && <th>Produit</th>}
                              {inventoryDisplay.isVisible('category') && <th>Catégorie</th>}
                              {inventoryDisplay.isVisible('qrCategory') && <th>QR Cat.</th>}
                              {inventoryDisplay.isVisible('subcategory') && <th>Sous-catégorie</th>}
                              {inventoryDisplay.isVisible('qrSubcategory') && <th>QR Sous-cat.</th>}
                              {inventoryDisplay.isVisible('location') && <th>Lieu</th>}
                              {inventoryDisplay.isVisible('qrLocation') && <th>QR Lieu</th>}
                              {inventoryDisplay.isVisible('theoretical') && <th>Théorique</th>}
                              {inventoryDisplay.isVisible('real') && <th>Réel</th>}
                              {inventoryDisplay.isVisible('consumption') && <th>Consommation</th>}
                              {inventoryDisplay.isVisible('unit') && <th>Unité</th>}
                              {inventoryDisplay.isVisible('price') && <th>Prix</th>}
                              {inventoryDisplay.isVisible('value') && <th>Valeur consommée</th>}
                            </tr>
                          </thead>

                          <tbody>
                            {group.rows.map(
                              ({
                                key,
                                product,
                                theoreticalQty,
                                realQty,
                                diff,
                                value,
                              }) => {
                                const qrStyle = {
                                  width: 52,
                                  height: 52,
                                  padding: 3,
                                  borderRadius: 8,
                                  background: '#fff',
                                  display: 'grid',
                                  placeItems: 'center',
                                  border: '1px solid #e5e7eb',
                                } as CSSProperties

                                return (
                                  <tr key={key}>
                                    {inventoryDisplay.isVisible('reference') && (
                                      <td><strong>{product.internalRef || '—'}</strong></td>
                                    )}
                                    {inventoryDisplay.isVisible('photo') && (
                                      <td>
                                        <div
                                          style={{
                                            width: 58,
                                            height: 58,
                                            borderRadius: 9,
                                            background: '#fff',
                                            border: '1px solid #e5e7eb',
                                            display: 'grid',
                                            placeItems: 'center',
                                            overflow: 'hidden',
                                            padding: 4,
                                          }}
                                        >
                                          {product.photo ? (
                                            <img
                                              src={product.photo}
                                              alt={product.name || 'Produit'}
                                              loading="lazy"
                                              style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                display: 'block',
                                              }}
                                            />
                                          ) : (
                                            <span
                                              style={{
                                                fontSize: 8,
                                                color: '#98a2b3',
                                                fontWeight: 800,
                                              }}
                                            >
                                              PHOTO
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                    {inventoryDisplay.isVisible('qrProduct') && (
                                      <td>
                                        <div style={qrStyle}>
                                          <QRCodeSVG
                                            value={`NUKUSTOCK|PRODUCT|${product.internalRef || product.id}`}
                                            size={44}
                                            level="M"
                                            marginSize={0}
                                          />
                                        </div>
                                      </td>
                                    )}
                                    {inventoryDisplay.isVisible('product') && (
                                      <td><strong>{product.name}</strong></td>
                                    )}
                                    {inventoryDisplay.isVisible('category') && (
                                      <td>{product.category || '—'}</td>
                                    )}
                                    {inventoryDisplay.isVisible('qrCategory') && (
                                      <td>
                                        <div style={qrStyle}>
                                          <QRCodeSVG
                                            value={`NUKUSTOCK|CATEGORY|${product.category || 'Sans catégorie'}`}
                                            size={44}
                                            level="M"
                                            marginSize={0}
                                          />
                                        </div>
                                      </td>
                                    )}
                                    {inventoryDisplay.isVisible('subcategory') && (
                                      <td>{product.subcategory || '—'}</td>
                                    )}
                                    {inventoryDisplay.isVisible('qrSubcategory') && (
                                      <td>
                                        <div style={qrStyle}>
                                          <QRCodeSVG
                                            value={`NUKUSTOCK|SUBCATEGORY|${product.subcategory || 'Sans sous-catégorie'}`}
                                            size={44}
                                            level="M"
                                            marginSize={0}
                                          />
                                        </div>
                                      </td>
                                    )}
                                    {inventoryDisplay.isVisible('location') && (
                                      <td>{group.location}</td>
                                    )}
                                    {inventoryDisplay.isVisible('qrLocation') && (
                                      <td>
                                        <div style={qrStyle}>
                                          <QRCodeSVG
                                            value={`NUKUSTOCK|LOCATION|${group.location}`}
                                            size={44}
                                            level="M"
                                            marginSize={0}
                                          />
                                        </div>
                                      </td>
                                    )}
                                    {inventoryDisplay.isVisible('theoretical') && (
                                      <td>{formatQty(theoreticalQty)}</td>
                                    )}
                                    {inventoryDisplay.isVisible('real') && (
                                      <td>
                                        <input
                                          className="input"
                                          style={{ minWidth: 90, width: 120 }}
                                          type="number"
                                          min="0"
                                          value={realQty}
                                          onChange={(event) =>
                                            setCounted({
                                              ...counted,
                                              [key]: Math.max(
                                                0,
                                                Number(event.target.value) || 0
                                              ),
                                            })
                                          }
                                        />
                                      </td>
                                    )}
                                    {inventoryDisplay.isVisible('consumption') && (
                                      <td>
                                        <Badge tone={diff === 0 ? 'good' : 'danger'}>
                                          {diff > 0 ? '+' : ''}{formatQty(diff)}
                                        </Badge>
                                      </td>
                                    )}
                                    {inventoryDisplay.isVisible('unit') && (
                                      <td>{product.unit || '—'}</td>
                                    )}
                                    {inventoryDisplay.isVisible('price') && (
                                      <td>
                                        {Math.max(0, Number(product.purchasePrice) || 0).toLocaleString('fr-FR')} XPF
                                      </td>
                                    )}
                                    {inventoryDisplay.isVisible('value') && (
                                      <td>
                                        {value > 0 ? '+' : ''}
                                        {value.toLocaleString('fr-FR')} XPF
                                      </td>
                                    )}
                                  </tr>
                                )
                              }
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fit,minmax(150px,1fr))',
                          gap: 10,
                          marginTop: 12,
                        }}
                      >
                        <div>
                          <strong>
                            Théorique :
                          </strong>{' '}
                          {
                            group.theoreticalTotal
                          }
                        </div>

                        <div>
                          <strong>
                            Réel :
                          </strong>{' '}
                          {
                            group.realTotal
                          }
                        </div>

                        <div>
                          <strong>
                            Consommation :
                          </strong>{' '}
                          {group.diffTotal >
                          0
                            ? '+'
                            : ''}
                          {
                            group.diffTotal
                          }
                        </div>

                        <div>
                          <strong>
                            Valeur :
                          </strong>{' '}
                          {group.valueTotal >
                          0
                            ? '+'
                            : ''}
                          {group.valueTotal.toLocaleString(
                            'fr-FR'
                          )}{' '}
                          XPF
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )
            }
          )}

          <Card>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 14,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  Récapitulatif consommation
                </h2>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: '#667085',
                  }}
                >
                  Moyennes calculées sur{' '}
                  {activeInventory.durationDays} jour
                  {activeInventory.durationDays > 1 ? 's' : ''}
                  {' · '}
                  {activeInventory.guestCount} invité
                  {activeInventory.guestCount > 1 ? 's' : ''}
                </div>
              </div>

              <Badge tone="info">
                {productConsumptionSummary.length} produit
                {productConsumptionSummary.length > 1 ? 's' : ''} consommé
                {productConsumptionSummary.length > 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Consommation totale</th>
                    <th>Moyenne / jour</th>
                    <th>Moyenne / invité</th>
                    <th>Moyenne / invité / jour</th>
                    <th>Valeur consommée</th>
                  </tr>
                </thead>

                <tbody>
                  {productConsumptionSummary.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        Aucune consommation enregistrée pour le moment.
                      </td>
                    </tr>
                  ) : (
                    productConsumptionSummary.map((row) => (
                      <tr key={row.product.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>
                            {row.product.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: '#667085',
                              marginTop: 3,
                            }}
                          >
                            {row.product.internalRef}
                          </div>
                        </td>

                        <td>
                          {row.consumption.toLocaleString('fr-FR', {
                            maximumFractionDigits: 2,
                          })}{' '}
                          {row.product.unit}
                        </td>

                        <td>
                          {row.perDay.toLocaleString('fr-FR', {
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        <td>
                          {row.perGuest.toLocaleString('fr-FR', {
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        <td>
                          <strong>
                            {row.perGuestPerDay.toLocaleString('fr-FR', {
                              maximumFractionDigits: 3,
                            })}
                          </strong>
                        </td>

                        <td>
                          {row.value.toLocaleString('fr-FR')} XPF
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div
            style={{
              display: 'flex',
              justifyContent:
                'flex-end',
              gap: 10,
              marginTop: 18,
              flexWrap: 'wrap',
            }}
          >
            <button
              className="button secondary"
              onClick={cancelInventory}
            >
              Annuler
            </button>

            <button
              className="button"
              onClick={closeInventory}
            >
              Clôturer l&apos;inventaire
              global
            </button>
          </div>
        </>
      )}

      {history.length > 0 && (
        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <h2 style={{ margin: 0 }}>
              Historique des inventaires
            </h2>

            <Badge tone="neutral">
              {history.length}
            </Badge>
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Inventaire</th>
                  <th>Type</th>
                  <th>Périmètre</th>
                  <th>Date</th>
                  <th>Consommations</th>
                  <th>Valeur consommée</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {history.map(
                  (inventory) => {
                    const gaps =
                      inventory.lines.filter(
                        (line) =>
                          line.diff !== 0
                      ).length

                    const value =
                      inventory.lines.reduce(
                        (sum, line) =>
                          sum +
                          line.value,
                        0
                      )

                    const locationCount =
                      inventory.locations
                        ?.length ||
                      new Set(
                        inventory.lines
                          .map(
                            (line) =>
                              line.location
                          )
                          .filter(Boolean)
                      ).size ||
                      1

                    return (
                      <tr
                        key={
                          inventory.id
                        }
                      >
                        <td>
                          <strong>
                            {
                              inventory.id
                            }
                          </strong>

                          {inventory.name && (
                            <div
                              style={{
                                fontSize: 11,
                                color: '#667085',
                                marginTop: 3,
                              }}
                            >
                              {
                                inventory.name
                              }
                            </div>
                          )}

                          {(inventory.guestCount ||
                            inventory.durationDays) && (
                            <div
                              style={{
                                fontSize: 10,
                                color: '#98a2b3',
                                marginTop: 3,
                              }}
                            >
                              {inventory.durationDays || 1} jour
                              {(inventory.durationDays || 1) > 1 ? 's' : ''}
                              {' · '}
                              {inventory.guestCount || 1} invité
                              {(inventory.guestCount || 1) > 1 ? 's' : ''}
                            </div>
                          )}
                        </td>

                        <td>
                          {
                            inventory.type
                          }
                        </td>

                        <td>
                          {inventory.location ===
                          'GLOBAL'
                            ? `Global · ${locationCount} lieux`
                            : inventory.location}
                        </td>

                        <td>
                          {new Date(
                            inventory.date
                          ).toLocaleDateString(
                            'fr-FR'
                          )}
                        </td>

                        <td>
                          <Badge
                            tone={
                              gaps === 0
                                ? 'good'
                                : 'danger'
                            }
                          >
                            {gaps}{' '}
                            consommation
                            {gaps > 1
                              ? 's'
                              : ''}
                          </Badge>
                        </td>

                        <td>
                          {value > 0
                            ? '+'
                            : ''}
                          {value.toLocaleString(
                            'fr-FR'
                          )}{' '}
                          XPF
                        </td>

                        <td>
                          <div
                            style={{
                              display:
                                'flex',
                              gap: 7,
                              flexWrap:
                                'wrap',
                            }}
                          >
                            <button
                              className="button secondary small"
                              onClick={() =>
                                reopenHistoricalInventory(
                                  inventory.id
                                )
                              }
                              disabled={
                                activeInventory !==
                                null
                              }
                            >
                              Recomptage
                            </button>

                            <button
                              className="button secondary small"
                              onClick={() =>
                                deleteHistoricalInventory(
                                  inventory.id
                                )
                              }
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}



      {closeOpen && activeInventory && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(15,23,42,.68)',
            display: 'grid',
            placeItems: 'center',
            padding: 18,
          }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setCloseOpen(false)
            }
          }}
        >
          <div
            style={{
              width: 'min(620px, 100%)',
              background: '#111827',
              color: '#fff',
              borderRadius: 18,
              padding: 24,
              boxShadow:
                '0 25px 80px rgba(0,0,0,.45)',
            }}
          >
            <h2 style={{ margin: 0 }}>
              Clôturer l&apos;inventaire
            </h2>

            <div
              style={{
                marginTop: 6,
                color: '#aab4c3',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {activeInventory.id} · {activeInventory.purpose}
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 12,
                background: 'rgba(255,255,255,.05)',
                border:
                  '1px solid rgba(255,255,255,.10)',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={applyCountToStock}
                  onChange={(event) =>
                    setApplyCountToStock(
                      event.target.checked
                    )
                  }
                  style={{ marginTop: 3 }}
                />

                <span>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: 14,
                    }}
                  >
                    Utiliser le comptage réel comme nouveau stock
                  </strong>

                  <span
                    style={{
                      display: 'block',
                      marginTop: 5,
                      color: '#aab4c3',
                      fontSize: 12,
                      lineHeight: 1.45,
                    }}
                  >
                    Si cette option est cochée, les quantités comptées remplaceront les quantités théoriques par lieu. Si elle est décochée, l&apos;inventaire sera uniquement enregistré dans l&apos;historique.
                  </span>
                </span>
              </label>
            </div>

            {applyCountToStock && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  background: 'rgba(245,158,11,.12)',
                  border: '1px solid rgba(245,158,11,.30)',
                  color: '#fde68a',
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                Attention : cette action modifiera réellement le stock de NukuStock après validation.
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 22,
              }}
            >
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  setCloseOpen(false)
                }
              >
                Annuler
              </button>

              <button
                className="button"
                type="button"
                onClick={finalizeInventory}
              >
                {applyCountToStock
                  ? 'Valider et mettre le stock à jour'
                  : 'Clôturer sans modifier le stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {printColumnsOpen && activeInventory && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(15,23,42,.64)',
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
              background: '#111827',
              color: '#fff',
              borderRadius: 18,
              padding: 22,
              boxShadow:
                '0 25px 80px rgba(0,0,0,.45)',
            }}
          >
            <h2 style={{ margin: 0 }}>
              Colonnes à imprimer
            </h2>
            <p
              style={{
                margin: '6px 0 18px',
                color: '#aab4c3',
                fontSize: 13,
              }}
            >
              Choisis les informations à faire apparaître dans l&apos;inventaire imprimé.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(180px,1fr))',
                gap: 9,
              }}
            >
              {INVENTORY_PRINT_COLUMNS.map(
                (column) => (
                  <label
                    key={column.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '10px 12px',
                      border:
                        '1px solid rgba(255,255,255,.12)',
                      background:
                        'rgba(255,255,255,.04)',
                      borderRadius: 11,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={inventoryPrintColumns.includes(
                        column.key
                      )}
                      onChange={() =>
                        toggleInventoryPrintColumn(
                          column.key
                        )
                      }
                    />
                    {column.label}
                  </label>
                )
              )}
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
                  setInventoryPrintColumns(
                    INVENTORY_PRINT_COLUMNS.map(
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
                  setInventoryPrintColumns(
                    DEFAULT_INVENTORY_PRINT_COLUMNS
                  )
                }
              >
                Réinitialiser
              </button>
              <button
                className="button secondary small"
                type="button"
                onClick={() =>
                  setInventoryPrintColumns([])
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
                onClick={printInventory}
              >
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'rgba(0,0,0,.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'center',
            padding: 20,
            zIndex: 999,
          }}
        >
          <div
            style={{
              width:
                'min(620px, 100%)',
              background: '#111827',
              borderRadius: 18,
              padding: 24,
              boxShadow:
                '0 25px 80px rgba(0,0,0,.45)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                gap: 12,
                marginBottom: 22,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  Créer un inventaire global
                </h2>

                <div
                  style={{
                    marginTop: 5,
                    fontSize: 12,
                    opacity: 0.65,
                  }}
                >
                  Choisis d&apos;abord la famille d&apos;inventaire.
                  Les lieux seront intégrés automatiquement.
                </div>
              </div>

              <button
                className="button secondary small"
                onClick={() =>
                  setCreateOpen(false)
                }
              >
                Fermer
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 1fr',
                gap: 16,
              }}
            >
              <div
                style={{
                  gridColumn:
                    '1 / -1',
                }}
              >
                <label
                  style={labelStyle}
                >
                  Nom / commentaire
                  (facultatif)
                </label>

                <input
                  className="input"
                  style={{
                    width: '100%',
                  }}
                  value={newName}
                  onChange={(event) =>
                    setNewName(
                      event.target.value
                    )
                  }
                  placeholder="Ex. Inventaire ouverture août"
                />
              </div>

              <div
                style={{
                  gridColumn: '1 / -1',
                }}
              >
                <label style={labelStyle}>
                  Utilisation de l&apos;inventaire
                </label>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit,minmax(160px,1fr))',
                    gap: 10,
                  }}
                >
                  {(
                    [
                      'Stock initial',
                      'Contrôle',
                      'Séjour',
                    ] as InventoryPurpose[]
                  ).map((purpose) => (
                    <button
                      key={purpose}
                      type="button"
                      className={
                        newPurpose === purpose
                          ? 'button'
                          : 'button secondary'
                      }
                      onClick={() =>
                        setNewPurpose(purpose)
                      }
                    >
                      {purpose}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    opacity: 0.68,
                    lineHeight: 1.45,
                  }}
                >
                  {newPurpose === 'Stock initial'
                    ? 'Le comptage peut devenir le stock réel de référence à la clôture.'
                    : newPurpose === 'Contrôle'
                    ? 'Mesure les écarts sans modifier le stock, sauf si tu choisis de les appliquer à la clôture.'
                    : 'Calcule les consommations et ratios du séjour. Le comptage final peut être appliqué au stock à la clôture.'}
                </div>
              </div>

              <div
                style={{
                  gridColumn: '1 / -1',
                }}
              >
                <label style={labelStyle}>
                  Mode de saisie
                </label>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(2,minmax(0,1fr))',
                    gap: 10,
                  }}
                >
                  {(
                    [
                      'Saisie classique',
                      'Scan QR',
                    ] as InventoryEntryMode[]
                  ).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={
                        newEntryMode === mode
                          ? 'button'
                          : 'button secondary'
                      }
                      onClick={() =>
                        setNewEntryMode(mode)
                      }
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    opacity: 0.68,
                    lineHeight: 1.45,
                  }}
                >
                  {newEntryMode === 'Scan QR'
                    ? 'Tu photographies d’abord le QR du lieu, puis le QR du produit. NukuStock affecte automatiquement le comptage au bon lieu.'
                    : 'Le comptage reste organisé dans les tableaux classiques par lieu de stockage.'}
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Famille d&apos;inventaire
                </label>

                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={newScope}
                  onChange={(event) =>
                    setNewScope(
                      event.target.value as InventoryScope
                    )
                  }
                >
                  {inventoryScopes.map((scope) => (
                    <option key={scope} value={scope}>
                      Inventaire {scope}
                    </option>
                  ))}
                </select>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    opacity: 0.65,
                    lineHeight: 1.35,
                  }}
                >
                  {newScope === 'Tous les inventaires'
                    ? 'Affiche tous les produits : Beverage + Food + Matériel & Verrerie.'
                    : newScope === 'Beverage'
                    ? 'Boissons, alcools, vins, bières, softs, jus et eaux.'
                    : newScope === 'Food'
                    ? 'Produits alimentaires et denrées cuisine.'
                    : 'Matériel, équipements, ustensiles et verrerie.'}
                </div>
              </div>

              <div>
                <label
                  style={labelStyle}
                >
                  Type d&apos;inventaire
                </label>

                <select
                  className="input"
                  style={{
                    width: '100%',
                  }}
                  value={newType}
                  onChange={(event) =>
                    setNewType(
                      event.target.value
                    )
                  }
                >
                  {inventoryTypes.map(
                    (inventoryType) => (
                      <option
                        key={
                          inventoryType
                        }
                        value={
                          inventoryType
                        }
                      >
                        {
                          inventoryType
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  style={labelStyle}
                >
                  Date de l&apos;inventaire
                </label>

                <input
                  type="date"
                  className="input"
                  style={{
                    width: '100%',
                  }}
                  value={newDate}
                  onChange={(event) =>
                    setNewDate(
                      event.target.value
                    )
                  }
                />
              </div>

              <div>
                <label
                  style={labelStyle}
                >
                  Début du séjour
                </label>

                <input
                  type="date"
                  className="input"
                  style={{
                    width: '100%',
                  }}
                  value={stayStartDate}
                  onChange={(event) =>
                    setStayStartDate(
                      event.target.value
                    )
                  }
                />
              </div>

              <div>
                <label
                  style={labelStyle}
                >
                  Fin du séjour
                </label>

                <input
                  type="date"
                  className="input"
                  style={{
                    width: '100%',
                  }}
                  value={stayEndDate}
                  onChange={(event) =>
                    setStayEndDate(
                      event.target.value
                    )
                  }
                />
              </div>

              <div>
                <label
                  style={labelStyle}
                >
                  Nombre d&apos;invités
                </label>

                <input
                  type="number"
                  min="1"
                  className="input"
                  style={{
                    width: '100%',
                  }}
                  value={guestCount}
                  onChange={(event) =>
                    setGuestCount(
                      Math.max(
                        1,
                        Number(event.target.value) || 1
                      )
                    )
                  }
                />
              </div>

              <div>
                <label
                  style={labelStyle}
                >
                  Durée du séjour
                </label>

                <div
                  className="input"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: 700,
                  }}
                >
                  {calculateStayDays(
                    stayStartDate,
                    stayEndDate
                  )}{' '}
                  jour
                  {calculateStayDays(
                    stayStartDate,
                    stayEndDate
                  ) > 1
                    ? 's'
                    : ''}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 12,
                borderRadius: 10,
                background:
                  'rgba(255,255,255,.05)',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              Cet inventaire couvrira tous les
              lieux ayant du stock. Pendant le
              comptage, chaque lieu sera affiché
              séparément. À la clôture, NukuStock
              conservera également la durée du séjour
              et le nombre d&apos;invités afin de calculer
              les consommations moyennes par jour,
              par invité et par invité/jour.
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
                onClick={() =>
                  setCreateOpen(false)
                }
              >
                Annuler
              </button>

              <button
                className="button"
                onClick={createInventory}
              >
                Créer l&apos;inventaire global
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}