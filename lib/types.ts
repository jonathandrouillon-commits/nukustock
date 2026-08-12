export type Lot = {
  id: string
  lotNumber: string
  expiry: string
  location: string
  quantity: number
}

export type Product = {
  id: string
  internalRef: string
  supplierRef: string
  name: string
  photo?: string
  hasExpiry?: boolean

  // Zone métier du produit (ex. BEVERAGE). Modifiable sans changer la référence interne.
  zone?: string
  zoneId?: string

  category: string
  categoryId?: string

  subcategory: string
  subcategoryId?: string

  // Conservé uniquement pour compatibilité avec les anciennes données.
  // Le champ Marque n'est plus utilisé dans l'interface.
  brand?: string
  brandId?: string

  packaging: string
  packagingId?: string

  unit: string
  unitId?: string

  purchasePrice: number
  priceUpdatedAt: string

  mainSupplier: string
  mainSupplierId?: string

  minStock: number
  productType: 'acheté' | 'fabriqué' | 'modifié'
  lots: Lot[]
}

export type InternalRequest = {
  id: string
  service: string
  status:
    | 'Brouillon'
    | 'Envoyée'
    | 'Validée'
    | 'Préparation'
    | 'Livrée'
    | 'Partielle'

  createdAt: string

  // Les deux champs restent optionnels pour compatibilité.
  // La page Réquisitions pourra choisir le lieu de départ et le lieu livré.
  sourceLocation?: string
  destinationLocation?: string

  deliveredAt?: string

  // Permet d'éviter qu'une même réquisition soit déduite deux fois.
  stockAppliedAt?: string

  items: {
    productId: string
    productName: string
    requested: number
    approved: number

    // Lieu choisi au moment du traitement de la réquisition.
    // Permet d'avoir une source différente pour chaque produit.
    sourceLocation?: string
  }[]
}

export type Supplier = {
  id: string

  // Référence interne permanente : FOU-001, FOU-002...
  internalRef?: string

  name: string

  contact: string
  phone: string
  payment: string
  notes: string

  contactPerson?: string
  email?: string
  address?: string
  deliveryLeadTime?: string
  currency?: string
  active?: boolean
}

export type SupplierOrderLine = {
  productId: string
  productName: string
  ordered: number
  received: number
}

export type SupplierOrder = {
  id: string
  supplierId: string
  supplierName: string
  date: string

  quoteNumber?: string
  purchaseOrderNumber?: string
  invoiceNumber?: string

  bl: string
  receptionMode?: 'Bateau' | 'Avion' | 'Achat local'
  departureDate?: string

  status:
    | 'En traitement'
    | 'Validé'
    | 'En attente'
    | 'Clôturé'
    | 'Traité'

  lines: SupplierOrderLine[]

  // Données de réception reliées au stock.
  receptionLocation?: string
  receivedAt?: string

  // Empêche une seconde entrée de stock sur la même commande.
  stockAppliedAt?: string
}

export type Transfer = {
  id: string
  productId: string
  product: string
  from: string
  to: string
  qty: number
  date: string
  user: string

  // Le transfert est enregistré dans l'historique des mouvements.
  stockAppliedAt?: string
}

export type InventoryScope =
  | 'Tous les inventaires'
  | 'Beverage'
  | 'Food'
  | 'Matériel & Verrerie'
  | 'Matériel & Accessoires'

export type InventoryRecord = {
  id: string
  type: string
  inventoryScope?: InventoryScope

  location: string
  locations?: string[]
  date: string
  name?: string

  stayStartDate?: string
  stayEndDate?: string
  guestCount?: number
  durationDays?: number

  // Empêche de clôturer deux fois le même inventaire dans le stock.
  stockAppliedAt?: string

  lines: {
    productId: string
    productName: string
    location?: string
    theoretical: number
    real: number
    diff: number
    value: number
  }[]
}

export type StockMovementType =
  | 'ENTREE_PRODUIT'
  | 'REQUISITION'
  | 'TRANSFERT_SORTIE'
  | 'TRANSFERT_ENTREE'
  | 'RECEPTION_COMMANDE'
  | 'AJUSTEMENT_INVENTAIRE'
  | 'CORRECTION_MANUELLE'

export type StockMovement = {
  id: string
  createdAt: string
  type: StockMovementType

  productId: string
  productName: string
  internalRef?: string

  quantity: number

  fromLocation?: string
  toLocation?: string

  lotNumber?: string
  expiry?: string

  referenceType?:
    | 'product'
    | 'request'
    | 'transfer'
    | 'order'
    | 'inventory'

  referenceId?: string

  note?: string
  user?: string
}

export type StockEngineResult = {
  ok: boolean
  message: string
  products: Product[]
  movements: StockMovement[]
}

export type MasterDataType =
  | 'category'
  | 'subcategory'
  | 'brand'
  | 'packaging'
  | 'unit'
  | 'location'
  | 'service'
  | 'zone'

export type MasterDataItem = {
  id: string

  // Référence interne permanente selon le référentiel :
  // LIE-001 = lieu
  // ZON-001 = zone
  // CAT-001 = catégorie
  // SCA-001 = sous-catégorie
  internalRef?: string

  type: MasterDataType
  name: string
  parentId?: string
  active?: boolean
}

export type SetupPhoto = {
  id: string
  dataUrl: string
  caption?: string
}

export type SetupItem = {
  id: string
  name: string
  quantity: number
  category:
    | 'Équipement'
    | 'Verrerie'
    | 'Mise en place'
    | 'Produit'
}

export type BarSetup = {
  id: string
  location: string
  title: string
  setupType: string
  description: string
  notes: string
  updatedAt: string
  photos: SetupPhoto[]
  items: SetupItem[]
}