import type {
  InternalRequest,
  InventoryRecord,
  Product,
  StockEngineResult,
  StockMovement,
  SupplierOrder,
} from './types'

function cloneProducts(products: Product[]) {
  return structuredClone(products) as Product[]
}

function nowIso() {
  return new Date().toISOString()
}

function positiveNumber(value: unknown) {
  const number = Number(value)

  return Number.isFinite(number) && number > 0
    ? number
    : 0
}

function sortLotsFEFO<T extends {
  expiry?: string
}>(lots: T[]) {
  return [...lots].sort((a, b) => {
    if (!a.expiry && !b.expiry) return 0
    if (!a.expiry) return 1
    if (!b.expiry) return -1
    return a.expiry.localeCompare(b.expiry)
  })
}

function movementBase(
  product: Product,
  quantity: number
) {
  return {
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    productId: product.id,
    productName: product.name,
    internalRef: product.internalRef,
    quantity,
  }
}

export function getStockAtLocation(
  product: Product,
  location: string
) {
  return product.lots
    .filter((lot) => lot.location === location)
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

export function getTotalProductStock(
  product: Product
) {
  return product.lots.reduce(
    (sum, lot) =>
      sum +
      Math.max(
        0,
        Number(lot.quantity) || 0
      ),
    0
  )
}

export function decreaseProductStock(
  products: Product[],
  productId: string,
  location: string,
  quantity: number,
  movement: Omit<
    StockMovement,
    | 'id'
    | 'createdAt'
    | 'productId'
    | 'productName'
    | 'internalRef'
    | 'quantity'
  >
): StockEngineResult {
  const qty = positiveNumber(quantity)

  if (!qty) {
    return {
      ok: false,
      message: 'Quantité invalide',
      products,
      movements: [],
    }
  }

  if (!location) {
    return {
      ok: false,
      message: 'Lieu de stockage manquant',
      products,
      movements: [],
    }
  }

  const next = cloneProducts(products)
  const product = next.find(
    (item) => item.id === productId
  )

  if (!product) {
    return {
      ok: false,
      message: 'Produit introuvable',
      products,
      movements: [],
    }
  }

  const available =
    getStockAtLocation(
      product,
      location
    )

  if (available < qty) {
    return {
      ok: false,
      message:
        `Stock insuffisant pour ${product.name} : ` +
        `${available} disponible(s) à ${location}`,
      products,
      movements: [],
    }
  }

  let remaining = qty
  const movements: StockMovement[] = []

  const sourceLots = sortLotsFEFO(
    product.lots.filter(
      (lot) =>
        lot.location === location &&
        Number(lot.quantity) > 0
    )
  )

  for (const lot of sourceLots) {
    if (remaining <= 0) break

    const availableInLot = Math.max(
      0,
      Number(lot.quantity) || 0
    )

    const take = Math.min(
      availableInLot,
      remaining
    )

    if (take <= 0) continue

    lot.quantity =
      availableInLot - take

    remaining -= take

    movements.push({
      ...movementBase(product, -take),
      ...movement,
      fromLocation:
        movement.fromLocation ||
        location,
      lotNumber: lot.lotNumber,
      expiry: lot.expiry,
    })
  }

  product.lots = product.lots
    .map((lot) => ({
      ...lot,
      quantity: Math.max(
        0,
        Number(lot.quantity) || 0
      ),
    }))
    .filter((lot) => lot.quantity > 0)

  return {
    ok: true,
    message: 'Stock déduit',
    products: next,
    movements,
  }
}

export function increaseProductStock(
  products: Product[],
  productId: string,
  location: string,
  quantity: number,
  options?: {
    lotNumber?: string
    expiry?: string
    movement?: Omit<
      StockMovement,
      | 'id'
      | 'createdAt'
      | 'productId'
      | 'productName'
      | 'internalRef'
      | 'quantity'
    >
  }
): StockEngineResult {
  const qty = positiveNumber(quantity)

  if (!qty) {
    return {
      ok: false,
      message: 'Quantité invalide',
      products,
      movements: [],
    }
  }

  if (!location) {
    return {
      ok: false,
      message: 'Lieu de stockage manquant',
      products,
      movements: [],
    }
  }

  const next = cloneProducts(products)
  const product = next.find(
    (item) => item.id === productId
  )

  if (!product) {
    return {
      ok: false,
      message: 'Produit introuvable',
      products,
      movements: [],
    }
  }

  const lotNumber =
    options?.lotNumber?.trim() || ''

  const expiry =
    options?.expiry?.trim() || ''

  const existing = product.lots.find(
    (lot) =>
      lot.location === location &&
      lot.lotNumber === lotNumber &&
      lot.expiry === expiry
  )

  if (existing) {
    existing.quantity =
      Math.max(
        0,
        Number(existing.quantity) || 0
      ) + qty
  } else {
    product.lots.push({
      id: crypto.randomUUID(),
      lotNumber,
      expiry,
      location,
      quantity: qty,
    })
  }

  const movement: StockMovement = {
    ...movementBase(product, qty),
    type:
      options?.movement?.type ||
      'ENTREE_PRODUIT',
    ...options?.movement,
    toLocation:
      options?.movement?.toLocation ||
      location,
    lotNumber,
    expiry,
  }

  return {
    ok: true,
    message: 'Stock ajouté',
    products: next,
    movements: [movement],
  }
}

export function transferProductStock(
  products: Product[],
  productId: string,
  from: string,
  to: string,
  quantity: number,
  referenceId?: string,
  user?: string
): StockEngineResult {
  if (!from || !to) {
    return {
      ok: false,
      message:
        'Lieu source ou destination manquant',
      products,
      movements: [],
    }
  }

  if (from === to) {
    return {
      ok: false,
      message:
        'Le lieu source et le lieu destination doivent être différents',
      products,
      movements: [],
    }
  }

  const qty = positiveNumber(quantity)

  if (!qty) {
    return {
      ok: false,
      message: 'Quantité invalide',
      products,
      movements: [],
    }
  }

  const next = cloneProducts(products)
  const product = next.find(
    (item) => item.id === productId
  )

  if (!product) {
    return {
      ok: false,
      message: 'Produit introuvable',
      products,
      movements: [],
    }
  }

  const available =
    getStockAtLocation(
      product,
      from
    )

  if (available < qty) {
    return {
      ok: false,
      message:
        `Stock insuffisant : ${available} disponible(s) à ${from}`,
      products,
      movements: [],
    }
  }

  let remaining = qty
  const movements: StockMovement[] = []

  const sourceLots = sortLotsFEFO(
    product.lots.filter(
      (lot) =>
        lot.location === from &&
        Number(lot.quantity) > 0
    )
  )

  for (const lot of sourceLots) {
    if (remaining <= 0) break

    const availableInLot = Math.max(
      0,
      Number(lot.quantity) || 0
    )

    const take = Math.min(
      availableInLot,
      remaining
    )

    if (take <= 0) continue

    lot.quantity =
      availableInLot - take

    const destinationLot =
      product.lots.find(
        (candidate) =>
          candidate.location === to &&
          candidate.lotNumber ===
            lot.lotNumber &&
          candidate.expiry ===
            lot.expiry
      )

    if (destinationLot) {
      destinationLot.quantity =
        Math.max(
          0,
          Number(
            destinationLot.quantity
          ) || 0
        ) + take
    } else {
      product.lots.push({
        id: crypto.randomUUID(),
        lotNumber: lot.lotNumber,
        expiry: lot.expiry,
        location: to,
        quantity: take,
      })
    }

    movements.push({
      ...movementBase(product, -take),
      type: 'TRANSFERT_SORTIE',
      fromLocation: from,
      toLocation: to,
      lotNumber: lot.lotNumber,
      expiry: lot.expiry,
      referenceType: 'transfer',
      referenceId,
      user,
    })

    movements.push({
      ...movementBase(product, take),
      type: 'TRANSFERT_ENTREE',
      fromLocation: from,
      toLocation: to,
      lotNumber: lot.lotNumber,
      expiry: lot.expiry,
      referenceType: 'transfer',
      referenceId,
      user,
    })

    remaining -= take
  }

  product.lots = product.lots
    .map((lot) => ({
      ...lot,
      quantity: Math.max(
        0,
        Number(lot.quantity) || 0
      ),
    }))
    .filter((lot) => lot.quantity > 0)

  return {
    ok: true,
    message: 'Transfert enregistré',
    products: next,
    movements,
  }
}

export function applyRequisitionToStock(
  products: Product[],
  request: InternalRequest,
  user?: string
): StockEngineResult {
  if (request.stockAppliedAt) {
    return {
      ok: false,
      message:
        'Cette réquisition a déjà été appliquée au stock.',
      products,
      movements: [],
    }
  }

  const destination =
    request.destinationLocation || ''

  let next = cloneProducts(products)
  const movements: StockMovement[] = []

  for (const line of request.items) {
    const qty =
      positiveNumber(
        request.status ===
          'Partielle'
          ? line.approved
          : (
              line.approved >
              0
                ? line.approved
                : line.requested
            )
      )

    if (!qty) continue

    const source =
      line.sourceLocation ||
      request.sourceLocation ||
      ''

    if (!source) {
      return {
        ok: false,
        message:
          `Choisis le lieu source pour ${line.productName}.`,
        products,
        movements: [],
      }
    }

    let result: StockEngineResult

    if (
      destination &&
      destination !== source
    ) {
      result = transferProductStock(
        next,
        line.productId,
        source,
        destination,
        qty,
        request.id,
        user
      )

      if (result.ok) {
        result.movements =
          result.movements.map(
            (movement) => ({
              ...movement,
              type:
                movement.quantity < 0
                  ? 'REQUISITION'
                  : movement.type,
              referenceType: 'request',
              referenceId: request.id,
            })
          )
      }
    } else {
      result = decreaseProductStock(
        next,
        line.productId,
        source,
        qty,
        {
          type: 'REQUISITION',
          referenceType: 'request',
          referenceId: request.id,
          user,
          note:
            `Réquisition ${request.service}`,
        }
      )
    }

    if (!result.ok) {
      return {
        ok: false,
        message: result.message,
        products,
        movements: [],
      }
    }

    next = result.products
    movements.push(
      ...result.movements
    )
  }

  return {
    ok: true,
    message:
      'Réquisition appliquée au stock',
    products: next,
    movements,
  }
}

export function receiveSupplierOrder(
  products: Product[],
  order: SupplierOrder,
  location: string,
  user?: string
): StockEngineResult {
  if (order.stockAppliedAt) {
    return {
      ok: false,
      message:
        'Cette commande a déjà été réceptionnée dans le stock.',
      products,
      movements: [],
    }
  }

  if (!location) {
    return {
      ok: false,
      message:
        'Choisis le lieu de stockage de réception.',
      products,
      movements: [],
    }
  }

  const totalReceived =
    order.lines.reduce(
      (sum, line) =>
        sum +
        positiveNumber(
          line.received
        ),
      0
    )

  if (totalReceived <= 0) {
    return {
      ok: false,
      message:
        'Aucune quantité reçue à ajouter au stock.',
      products,
      movements: [],
    }
  }

  let next = cloneProducts(products)
  const movements: StockMovement[] = []

  for (const line of order.lines) {
    const qty =
      positiveNumber(
        line.received
      )

    if (!qty) continue

    const result =
      increaseProductStock(
        next,
        line.productId,
        location,
        qty,
        {
          movement: {
            type:
              'RECEPTION_COMMANDE',
            referenceType: 'order',
            referenceId: order.id,
            user,
            note:
              `Réception fournisseur ${order.supplierName}`,
          },
        }
      )

    if (!result.ok) {
      return {
        ok: false,
        message: result.message,
        products,
        movements: [],
      }
    }

    next = result.products
    movements.push(
      ...result.movements
    )
  }

  return {
    ok: true,
    message:
      'Commande réceptionnée dans le stock',
    products: next,
    movements,
  }
}

export function setProductStockAtLocation(
  products: Product[],
  productId: string,
  location: string,
  realQuantity: number,
  referenceId?: string,
  user?: string
): StockEngineResult {
  const target = Math.max(
    0,
    Number(realQuantity) || 0
  )

  const product =
    products.find(
      (item) =>
        item.id === productId
    )

  if (!product) {
    return {
      ok: false,
      message: 'Produit introuvable',
      products,
      movements: [],
    }
  }

  const current =
    getStockAtLocation(
      product,
      location
    )

  const delta = target - current

  if (delta === 0) {
    return {
      ok: true,
      message:
        'Aucun ajustement nécessaire',
      products,
      movements: [],
    }
  }

  if (delta > 0) {
    return increaseProductStock(
      products,
      productId,
      location,
      delta,
      {
        movement: {
          type:
            'AJUSTEMENT_INVENTAIRE',
          referenceType: 'inventory',
          referenceId,
          user,
          note:
            `Inventaire : ${current} → ${target}`,
        },
      }
    )
  }

  return decreaseProductStock(
    products,
    productId,
    location,
    Math.abs(delta),
    {
      type:
        'AJUSTEMENT_INVENTAIRE',
      referenceType: 'inventory',
      referenceId,
      user,
      note:
        `Inventaire : ${current} → ${target}`,
    }
  )
}

export function closeInventoryInStock(
  products: Product[],
  inventory: InventoryRecord,
  user?: string
): StockEngineResult {
  if (inventory.stockAppliedAt) {
    return {
      ok: false,
      message:
        'Cet inventaire a déjà été appliqué au stock.',
      products,
      movements: [],
    }
  }

  let next = cloneProducts(products)
  const movements: StockMovement[] = []

  for (const line of inventory.lines) {
    const location =
      line.location ||
      inventory.location

    if (!location) continue

    const result =
      setProductStockAtLocation(
        next,
        line.productId,
        location,
        line.real,
        inventory.id,
        user
      )

    if (!result.ok) {
      return {
        ok: false,
        message: result.message,
        products,
        movements: [],
      }
    }

    next = result.products
    movements.push(
      ...result.movements
    )
  }

  return {
    ok: true,
    message:
      'Inventaire clôturé et stock ajusté',
    products: next,
    movements,
  }
}