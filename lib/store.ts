'use client'

import {
  useEffect,
  useState,
} from 'react'

import {
  useUnifiedProducts,
  useUnifiedRequests,
  useUnifiedMasterData,
  useUnifiedSuppliers,
} from './supabase-unified-store'

import {
  demoOrders,
  demoProducts,
  demoRequests,
  demoSuppliers,
} from './demo-data'

import type {
  BarSetup,
  InternalRequest,
  InventoryRecord,
  MasterDataItem,
  Product,
  StockMovement,
  Supplier,
  SupplierOrder,
  Transfer,
} from './types'

import {
  applyRequisitionToStock,
  closeInventoryInStock,
  receiveSupplierOrder,
  transferProductStock,
} from './stock-engine'

export const KEYS = {
  products:
    'nukustock_products_v11',
  requests:
    'nukustock_requests_v11',
  suppliers:
    'nukustock_suppliers_v11',
  orders:
    'nukustock_orders_v11',
  transfers:
    'nukustock_transfers_v11',
  inventories:
    'nukustock_inventories_v11',
  masterData:
    'nukustock_masterdata_v12',

  setups:
    'nukustock_setups_v1',

  // Historique central de tous les mouvements.
  stockMovements:
    'nukustock_stock_movements_v1',
}

function nextSequentialRef(
  prefix: string,
  refs: Array<string | undefined>
) {
  const matcher = new RegExp(
    `^${prefix}-(\\d{3})$`,
    'i'
  )

  const max = refs.reduce(
    (current, ref) => {
      const match =
        (ref || '').trim().match(
          matcher
        )

      if (!match) {
        return current
      }

      const value =
        Number(match[1])

      return Number.isFinite(value)
        ? Math.max(
            current,
            value
          )
        : current
    },
    0
  )

  return `${prefix}-${String(
    max + 1
  ).padStart(3, '0')}`
}

function withSupplierRefs(
  suppliers: Supplier[]
) {
  const refs =
    suppliers.map(
      (supplier) =>
        supplier.internalRef
    )

  return suppliers.map(
    (supplier) => {
      if (
        supplier.internalRef
          ?.trim()
      ) {
        return supplier
      }

      const internalRef =
        nextSequentialRef(
          'FOU',
          refs
        )

      refs.push(internalRef)

      return {
        ...supplier,
        internalRef,
      }
    }
  )
}

function prefixForMasterType(
  type: MasterDataItem['type']
) {
  switch (type) {
    case 'location':
      return 'LIE'
    case 'zone':
      return 'ZON'
    case 'category':
      return 'CAT'
    case 'subcategory':
      return 'SCA'
    default:
      return ''
  }
}

function withMasterDataRefs(
  items: MasterDataItem[]
) {
  const refsByType =
    new Map<
      MasterDataItem['type'],
      Array<
        string | undefined
      >
    >()

  for (const item of items) {
    const existing =
      refsByType.get(
        item.type
      ) || []

    existing.push(
      item.internalRef
    )

    refsByType.set(
      item.type,
      existing
    )
  }

  return items.map(
    (item) => {
      if (
        item.internalRef?.trim()
      ) {
        return item
      }

      const prefix =
        prefixForMasterType(
          item.type
        )

      if (!prefix) {
        return item
      }

      const refs =
        refsByType.get(
          item.type
        ) || []

      const internalRef =
        nextSequentialRef(
          prefix,
          refs
        )

      refs.push(internalRef)

      refsByType.set(
        item.type,
        refs
      )

      return {
        ...item,
        internalRef,
      }
    }
  )
}

function readLocal<T>(
  key: string,
  fallback: T
): T {
  if (
    typeof window === 'undefined'
  ) {
    return fallback
  }

  try {
    const raw =
      localStorage.getItem(key)

    return raw
      ? (JSON.parse(raw) as T)
      : fallback
  } catch {
    return fallback
  }
}

function writeLocal<T>(
  key: string,
  value: T
) {
  localStorage.setItem(
    key,
    JSON.stringify(value)
  )

  window.dispatchEvent(
    new CustomEvent(
      'nukustock-change',
      {
        detail: { key },
      }
    )
  )
}

function useLocalStore<T>(
  key: string,
  initial: T
) {
  const [items, setItems] =
    useState<T>(initial)

  const reload = () => {
    setItems(
      readLocal<T>(
        key,
        initial
      )
    )
  }

  useEffect(() => {
    reload()

    const onChange = (
      event: Event
    ) => {
      const custom =
        event as CustomEvent<{
          key?: string
        }>

      if (
        !custom.detail?.key ||
        custom.detail.key === key
      ) {
        reload()
      }
    }

    const onStorage = (
      event: StorageEvent
    ) => {
      if (event.key === key) {
        reload()
      }
    }

    window.addEventListener(
      'nukustock-change',
      onChange
    )

    window.addEventListener(
      'storage',
      onStorage
    )

    return () => {
      window.removeEventListener(
        'nukustock-change',
        onChange
      )

      window.removeEventListener(
        'storage',
        onStorage
      )
    }
  }, [key])

  const save = (next: T) => {
    setItems(next)
    writeLocal(key, next)
  }

  return {
    items,
    save,
    reload,
  }
}

/* =========================================================
   COMPATIBILITÉ COMMANDES FOURNISSEURS
   ========================================================= */

function normalizeOrderStatus(
  status: unknown
): SupplierOrder['status'] {
  switch (status) {
    case 'En traitement':
    case 'Validé':
    case 'En attente':
    case 'Clôturé':
    case 'Traité':
      return status

    case 'Brouillon':
      return 'En traitement'

    case 'Commandée':
      return 'Validé'

    case 'En transit':
      return 'En traitement'

    case 'À réceptionner':
      return 'En attente'

    case 'Réceptionnée':
      return 'Traité'

    default:
      return 'En traitement'
  }
}

function normalizeSupplierOrder(
  order: any
): SupplierOrder {
  return {
    id: String(
      order?.id ||
        crypto.randomUUID()
    ),

    supplierId: String(
      order?.supplierId || ''
    ),

    supplierName: String(
      order?.supplierName || ''
    ),

    date: String(
      order?.date ||
        new Date()
          .toISOString()
          .slice(0, 10)
    ),

    quoteNumber: String(
      order?.quoteNumber || ''
    ),

    purchaseOrderNumber:
      String(
        order
          ?.purchaseOrderNumber ||
          ''
      ),

    invoiceNumber: String(
      order?.invoiceNumber || ''
    ),

    bl: String(
      order?.bl || ''
    ),

    receptionMode:
      order?.receptionMode ===
      'Avion'
        ? 'Avion'
        : order?.receptionMode ===
          'Achat local'
        ? 'Achat local'
        : 'Bateau',

    departureDate: String(
      order?.departureDate ||
        order?.receptionDate ||
        ''
    ),

    status:
      normalizeOrderStatus(
        order?.status
      ),

    lines:
      Array.isArray(
        order?.lines
      )
        ? order.lines.map(
            (line: any) => ({
              productId: String(
                line?.productId ||
                  ''
              ),

              productName:
                String(
                  line?.productName ||
                    ''
                ),

              ordered: Math.max(
                0,
                Number(
                  line?.ordered
                ) || 0
              ),

              received: Math.max(
                0,
                Number(
                  line?.received
                ) || 0
              ),
            })
          )
        : [],

    receptionLocation:
      String(
        order
          ?.receptionLocation ||
          ''
      ) || undefined,

    receivedAt:
      String(
        order?.receivedAt || ''
      ) || undefined,

    stockAppliedAt:
      String(
        order?.stockAppliedAt ||
          ''
      ) || undefined,
  }
}

/* =========================================================
   STORES
   ========================================================= */

export function useProducts() {
  return useUnifiedProducts()
}

export function useRequests() {
  return useUnifiedRequests()
}

export function useSuppliers() {
  return useUnifiedSuppliers()
}

export function useOrders() {
  const initialOrders =
    (
      demoOrders as unknown[]
    ).map(
      normalizeSupplierOrder
    )

  const store =
    useLocalStore<
      SupplierOrder[]
    >(
      KEYS.orders,
      initialOrders
    )

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(
          KEYS.orders
        )

      if (!raw) return

      const parsed =
        JSON.parse(raw)

      if (
        !Array.isArray(parsed)
      ) {
        return
      }

      const normalized =
        parsed.map(
          normalizeSupplierOrder
        )

      if (
        JSON.stringify(parsed) !==
        JSON.stringify(
          normalized
        )
      ) {
        store.save(
          normalized
        )
      }
    } catch {
      // L'application reste utilisable
      // même si une ancienne donnée
      // est invalide.
    }
  }, [])

  return store
}

export function useTransfers() {
  return useLocalStore<
    Transfer[]
  >(
    KEYS.transfers,
    []
  )
}

export function useInventories() {
  return useLocalStore<
    InventoryRecord[]
  >(
    KEYS.inventories,
    []
  )
}

export function useMasterData() {
  const store =
    useUnifiedMasterData()

  const items =
    withMasterDataRefs(
      store.items
    )

  useEffect(() => {
    const changed =
      items.some(
        (item, index) =>
          item.internalRef !==
          store.items[index]
            ?.internalRef
      )

    if (changed) {
      store.save(items)
    }
  }, [items, store])

  const save = (
    next: MasterDataItem[]
  ) => {
    store.save(
      withMasterDataRefs(next)
    )
  }

  return {
    ...store,
    items,
    save,
  }
}

export function useSetups() {
  return useLocalStore<
    BarSetup[]
  >(
    KEYS.setups,
    []
  )
}

export function useStockMovements() {
  return useLocalStore<
    StockMovement[]
  >(
    KEYS.stockMovements,
    []
  )
}

/* =========================================================
   MOTEUR CENTRAL CONNECTÉ
   ========================================================= */

export function useStockEngine() {
  const productsStore =
    useProducts()

  const movementsStore =
    useStockMovements()

  const requestsStore =
    useRequests()

  const ordersStore =
    useOrders()

  const transfersStore =
    useTransfers()

  const inventoriesStore =
    useInventories()

  const appendMovements = (
    movements: StockMovement[]
  ) => {
    if (!movements.length) {
      return
    }

    movementsStore.save([
      ...movementsStore.items,
      ...movements,
    ])
  }

  const fulfillRequest = (
    requestId: string,
    user?: string
  ) => {
    const request =
      requestsStore.items.find(
        (item) =>
          item.id === requestId
      )

    if (!request) {
      return {
        ok: false,
        message:
          'Réquisition introuvable',
      }
    }

    const result =
      applyRequisitionToStock(
        productsStore.items,
        request,
        user
      )

    if (!result.ok) {
      return {
        ok: false,
        message:
          result.message,
      }
    }

    const timestamp =
      new Date().toISOString()

    productsStore.save(
      result.products
    )

    appendMovements(
      result.movements
    )

    requestsStore.save(
      requestsStore.items.map(
        (item) =>
          item.id === requestId
            ? {
                ...item,
                status: 'Livrée',
                deliveredAt:
                  timestamp,
                stockAppliedAt:
                  timestamp,
              }
            : item
      )
    )

    return {
      ok: true,
      message:
        'Réquisition livrée et stock mis à jour.',
    }
  }

  const executeTransfer = (
    transfer: Transfer
  ) => {
    if (
      transfer.stockAppliedAt
    ) {
      return {
        ok: false,
        message:
          'Ce transfert a déjà été appliqué.',
      }
    }

    const result =
      transferProductStock(
        productsStore.items,
        transfer.productId,
        transfer.from,
        transfer.to,
        transfer.qty,
        transfer.id,
        transfer.user
      )

    if (!result.ok) {
      return {
        ok: false,
        message:
          result.message,
      }
    }

    const timestamp =
      new Date().toISOString()

    productsStore.save(
      result.products
    )

    appendMovements(
      result.movements
    )

    const exists =
      transfersStore.items.some(
        (item) =>
          item.id === transfer.id
      )

    const updatedTransfer = {
      ...transfer,
      stockAppliedAt:
        timestamp,
    }

    transfersStore.save(
      exists
        ? transfersStore.items.map(
            (item) =>
              item.id ===
              transfer.id
                ? updatedTransfer
                : item
          )
        : [
            ...transfersStore.items,
            updatedTransfer,
          ]
    )

    return {
      ok: true,
      message:
        'Transfert effectué et stock synchronisé.',
    }
  }

  const receiveOrder = (
    orderId: string,
    location: string,
    user?: string
  ) => {
    const order =
      ordersStore.items.find(
        (item) =>
          item.id === orderId
      )

    if (!order) {
      return {
        ok: false,
        message:
          'Commande introuvable',
      }
    }

    const result =
      receiveSupplierOrder(
        productsStore.items,
        order,
        location,
        user
      )

    if (!result.ok) {
      return {
        ok: false,
        message:
          result.message,
      }
    }

    const timestamp =
      new Date().toISOString()

    productsStore.save(
      result.products
    )

    appendMovements(
      result.movements
    )

    ordersStore.save(
      ordersStore.items.map(
        (item) =>
          item.id === orderId
            ? {
                ...item,
                status: 'Traité',
                receptionLocation:
                  location,
                receivedAt:
                  timestamp,
                stockAppliedAt:
                  timestamp,
              }
            : item
      )
    )

    return {
      ok: true,
      message:
        'Commande réceptionnée et stock augmenté.',
    }
  }

  const closeInventory = (
    inventoryId: string,
    user?: string
  ) => {
    const inventory =
      inventoriesStore.items.find(
        (item) =>
          item.id ===
          inventoryId
      )

    if (!inventory) {
      return {
        ok: false,
        message:
          'Inventaire introuvable',
      }
    }

    const result =
      closeInventoryInStock(
        productsStore.items,
        inventory,
        user
      )

    if (!result.ok) {
      return {
        ok: false,
        message:
          result.message,
      }
    }

    const timestamp =
      new Date().toISOString()

    productsStore.save(
      result.products
    )

    appendMovements(
      result.movements
    )

    inventoriesStore.save(
      inventoriesStore.items.map(
        (item) =>
          item.id ===
          inventoryId
            ? {
                ...item,
                stockAppliedAt:
                  timestamp,
              }
            : item
      )
    )

    return {
      ok: true,
      message:
        'Inventaire clôturé et stock corrigé.',
    }
  }

  return {
    products:
      productsStore.items,
    movements:
      movementsStore.items,

    fulfillRequest,
    executeTransfer,
    receiveOrder,
    closeInventory,
  }
}

/* =========================================================
   COMPATIBILITÉ ANCIEN CODE
   ========================================================= */

export function moveProductStock(
  products: Product[],
  productId: string,
  from: string,
  to: string,
  qty: number
) {
  return transferProductStock(
    products,
    productId,
    from,
    to,
    qty
  )
}

/* =========================================================
   RESET
   ========================================================= */

export function resetDemoData() {
  Object.values(KEYS).forEach(
    (key) =>
      localStorage.removeItem(
        key
      )
  )

  location.reload()
}