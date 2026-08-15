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

  // Zone métier du produit (ex. BEVERAGE).
  // Modifiable sans changer la référence interne.
  zone?: string
  zoneId?: string

  category: string
  categoryId?: string

  subcategory: string
  subcategoryId?: string

  // Conservé uniquement pour compatibilité
  // avec les anciennes données.
  // Le champ Marque n'est plus utilisé
  // dans l'interface.
  brand?: string
  brandId?: string

  packaging: string
  packagingId?: string

  unit: string
  unitId?: string

  // Poids produit
  netUnitWeightKg?: number
  caseWeightKg?: number

  purchasePrice: number
  priceUpdatedAt: string

  mainSupplier: string
  mainSupplierId?: string

  minStock: number

  productType:
    | 'acheté'
    | 'fabriqué'
    | 'modifié'

  lots: Lot[]
}

/* =========================================================
   RÉQUISITIONS
   ========================================================= */

export type RequestLineTreatmentStatus =
  | 'pending'
  | 'fulfilled'
  | 'partial'
  | 'out_of_stock'

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

  /*
   * Compatibilité avec les anciennes réquisitions.
   *
   * sourceLocation :
   * ancien lieu source général de la réquisition.
   *
   * Les nouvelles réquisitions utilisent plutôt
   * sourceLocation directement sur chaque ligne produit.
   */
  sourceLocation?: string

  /*
   * Lieu auquel la réquisition est destinée.
   * Exemple :
   * Bungalow 8
   * Restaurant
   * Sporting
   */
  destinationLocation?: string

  /*
   * Date de livraison complète.
   */
  deliveredAt?: string

  /*
   * Permet d'empêcher une réquisition complètement
   * traitée d'être appliquée une deuxième fois au stock.
   */
  stockAppliedAt?: string

  items: {
    productId: string

    productName: string

    /*
     * Quantité demandée par le service.
     */
    requested: number

    /*
     * Quantité validée / autorisée.
     *
     * Si 0, l'application peut utiliser requested
     * comme quantité à traiter.
     */
    approved: number

    /*
     * Quantité réellement remise au service.
     *
     * Exemple :
     *
     * requested = 24
     * approved = 24
     * delivered = 10
     *
     * => traitement partiel
     */
    delivered?: number

    /*
     * Lieu depuis lequel cette ligne produit
     * a réellement été sortie.
     *
     * Exemple :
     * Container
     * Bar principal
     * Restaurant
     */
    sourceLocation?: string

    /*
     * État de traitement réel de la ligne.
     *
     * pending
     * = pas encore traitée
     *
     * fulfilled
     * = quantité entièrement servie
     *
     * partial
     * = quantité partiellement servie
     *
     * out_of_stock
     * = produit indisponible
     */
    treatmentStatus?: RequestLineTreatmentStatus

    /*
     * Date à laquelle la ligne a été traitée.
     */
    treatedAt?: string

    /*
     * Note facultative.
     *
     * Exemple :
     * "Stock restant insuffisant"
     * "Produit attendu prochain bateau"
     */
    treatmentNote?: string
  }[]
}

/* =========================================================
   FOURNISSEURS
   ========================================================= */

export type Supplier = {
  id: string

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

/* =========================================================
   COMMANDES FOURNISSEURS
   ========================================================= */

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

  receptionMode?:
    | 'Bateau'
    | 'Avion'
    | 'Achat local'

  departureDate?: string

  status:
    | 'En traitement'
    | 'Validé'
    | 'En attente'
    | 'Clôturé'
    | 'Traité'

  lines: SupplierOrderLine[]

  receptionLocation?: string

  receivedAt?: string

  stockAppliedAt?: string
}

/* =========================================================
   TRANSFERTS
   ========================================================= */

export type Transfer = {
  id: string

  productId: string

  product: string

  from: string

  to: string

  qty: number

  date: string

  user: string

  stockAppliedAt?: string
}

/* =========================================================
   INVENTAIRES
   ========================================================= */

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

/* =========================================================
   MOUVEMENTS DE STOCK
   ========================================================= */

export type StockMovementType =
  | 'ENTREE_PRODUIT'
  | 'REQUISITION'
  | 'TRANSFERT_SORTIE'
  | 'TRANSFERT_ENTREE'
  | 'RECEPTION_COMMANDE'
  | 'AJUSTEMENT_INVENTAIRE'
  | 'CORRECTION_MANUELLE'

export type StockRegularizationStatus =
  | 'NON_REQUIS'
  | 'A_REGULARISER'
  | 'REGULARISE'

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

  /*
   * Entrées rapides /
   * régularisation administrative.
   */
  regularizationStatus?:
    StockRegularizationStatus

  regularizedAt?: string

  supplierName?: string

  quoteNumber?: string

  purchaseOrderNumber?: string

  invoiceNumber?: string

  unitPrice?: number

  specialNote?: string
}

export type StockEngineResult = {
  ok: boolean

  message: string

  products: Product[]

  movements: StockMovement[]
}

/* =========================================================
   RÉFÉRENTIELS
   ========================================================= */

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

  internalRef?: string

  type: MasterDataType

  name: string

  parentId?: string

  active?: boolean
}

/* =========================================================
   SET UP BAR
   ========================================================= */

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