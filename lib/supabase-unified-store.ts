'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { InternalRequest, MasterDataItem, Product, Supplier } from '@/lib/types'

const PRODUCT_CACHE_KEY = 'nukustock_products_v11'
const REQUEST_CACHE_KEY = 'nukustock_requests_v11'
const MASTER_CACHE_KEY = 'nukustock_masterdata_v12'
const SUPPLIER_CACHE_KEY = 'nukustock_suppliers_v12'

function readCache<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function writeCache<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('nukustock-change', { detail: { key } }))
}

function uuid() {
  return crypto.randomUUID()
}

const STATUS_TO_DB: Record<string, string> = {
  Brouillon: 'draft',
  Envoyée: 'submitted',
  Validée: 'approved',
  Préparation: 'preparing',
  Livrée: 'delivered',
  Partielle: 'partially_approved',
}

const STATUS_FROM_DB: Record<string, InternalRequest['status']> = {
  draft: 'Brouillon',
  submitted: 'Envoyée',
  approved: 'Validée',
  partially_approved: 'Partielle',
  preparing: 'Préparation',
  delivered: 'Livrée',
  received: 'Livrée',
  rejected: 'Partielle',
  cancelled: 'Partielle',
}

function parseSourceLocation(notes: string | null | undefined) {
  if (!notes) return undefined
  try {
    const parsed = JSON.parse(notes)
    return typeof parsed?.sourceLocation === 'string' ? parsed.sourceLocation : undefined
  } catch {
    return undefined
  }
}

function lineNotes(sourceLocation?: string) {
  return sourceLocation ? JSON.stringify({ sourceLocation }) : null
}

async function fetchProducts(): Promise<Product[]> {
  const [{ data: rows, error }, { data: lots, error: lotsError }] = await Promise.all([
    supabase
      .from('products')
      .select('id, legacy_id, internal_reference, supplier_reference, name, category, subcategory, brand, packaging, base_unit, default_unit_cost, minimum_stock, active, photo_url, has_expiry, product_type, price_updated_at, main_supplier, zone, net_unit_weight_kg, case_weight_kg')
      .eq('active', true)
      .order('name'),
    supabase
      .from('product_lots')
      .select('id, legacy_id, product_id, lot_number, expiry, location_name, quantity'),
  ])

  if (error) throw error
  if (lotsError) throw lotsError

  const lotsByProduct = new Map<string, any[]>()
  for (const lot of lots || []) {
    const current = lotsByProduct.get(lot.product_id) || []
    current.push(lot)
    lotsByProduct.set(lot.product_id, current)
  }

  return (rows || []).map((row: any) => ({
    id: row.legacy_id || row.id,
    internalRef: row.internal_reference || '',
    supplierRef: row.supplier_reference || '',
    name: row.name || '',
    photo: row.photo_url || '',
    hasExpiry: row.has_expiry !== false,
    zone: row.zone || '',
    category: row.category || '',
    subcategory: row.subcategory || '',
    brand: row.brand || '',
    packaging: row.packaging || '',
    unit: row.base_unit || 'unité',
    purchasePrice: Number(row.default_unit_cost) || 0,
    priceUpdatedAt: row.price_updated_at || new Date().toISOString().slice(0, 10),
    mainSupplier: row.main_supplier || '',
    netUnitWeightKg: Number(row.net_unit_weight_kg) || 0,
    caseWeightKg: Number(row.case_weight_kg) || 0,
    minStock: Number(row.minimum_stock) || 0,
    productType: (row.product_type || 'acheté') as Product['productType'],
    lots: (lotsByProduct.get(row.id) || []).map((lot: any) => ({
      id: lot.legacy_id || lot.id,
      lotNumber: lot.lot_number || '',
      expiry: lot.expiry || '',
      location: lot.location_name || '',
      quantity: Number(lot.quantity) || 0,
    })),
  }))
}

async function syncProducts(products: Product[]) {
  const { data: existing, error: existingError } = await supabase
    .from('products')
    .select('id, legacy_id, internal_reference')

  if (existingError) throw existingError

  const byLegacy = new Map((existing || []).filter((x: any) => x.legacy_id).map((x: any) => [x.legacy_id, x]))
  const byRef = new Map((existing || []).map((x: any) => [x.internal_reference, x]))
  const activeDbIds: string[] = []

  for (const product of products) {
    const found: any = byLegacy.get(product.id) || byRef.get(product.internalRef)
    const dbId = found?.id || uuid()
    activeDbIds.push(dbId)

    const payload = {
      id: dbId,
      legacy_id: product.id,
      internal_reference: product.internalRef || `PRO-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      supplier_reference: product.supplierRef || null,
      name: product.name,
      category: product.category || null,
      subcategory: product.subcategory || null,
      brand: product.brand || null,
      packaging: product.packaging || null,
      base_unit: product.unit || 'unité',
      units_per_case: 1,
      default_unit_cost: Math.max(0, Number(product.purchasePrice) || 0),
      minimum_stock: Math.max(0, Number(product.minStock) || 0),
      active: true,
      photo_url: product.photo || null,
      has_expiry: product.hasExpiry !== false,
      product_type: product.productType || 'acheté',
      price_updated_at: product.priceUpdatedAt || null,
      main_supplier: product.mainSupplier || null,
      zone: product.zone || null,
      net_unit_weight_kg: Math.max(
        0,
        Number(product.netUnitWeightKg) || 0
      ),
      case_weight_kg: Math.max(
        0,
        Number(product.caseWeightKg) || 0
      ),
    }

    const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' })
    if (error) throw error

    const { error: deleteLotsError } = await supabase
      .from('product_lots')
      .delete()
      .eq('product_id', dbId)
    if (deleteLotsError) throw deleteLotsError

    if (product.lots.length) {
      const { error: insertLotsError } = await supabase.from('product_lots').insert(
        product.lots.map((lot) => ({
          id: uuid(),
          legacy_id: lot.id,
          product_id: dbId,
          lot_number: lot.lotNumber || null,
          expiry: lot.expiry || null,
          location_name: lot.location || 'Non affecté',
          quantity: Math.max(0, Number(lot.quantity) || 0),
        }))
      )
      if (insertLotsError) throw insertLotsError
    }
  }

  const removed = (existing || []).filter((row: any) => !activeDbIds.includes(row.id)).map((row: any) => row.id)
  if (removed.length) {
    const { error } = await supabase.from('products').update({ active: false }).in('id', removed)
    if (error) throw error
  }
}

export function useUnifiedProducts() {
  const [items, setItems] = useState<Product[]>(() => readCache<Product[]>(PRODUCT_CACHE_KEY, []))

  const reload = useCallback(async () => {
    try {
      let remote = await fetchProducts()

      // Première migration automatique : si Supabase est vide mais que ce navigateur possède la base historique.
      if (!remote.length) {
        const cached = readCache<Product[]>(PRODUCT_CACHE_KEY, [])
        if (cached.length) {
          await syncProducts(cached)
          remote = await fetchProducts()
        }
      }

      setItems(remote)
      writeCache(PRODUCT_CACHE_KEY, remote)
    } catch (error) {
      console.error('NukuStock products Supabase:', error)
    }
  }, [])

  useEffect(() => {
    void reload()
    const onFocus = () => void reload()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])

  const save = (next: Product[]) => {
    setItems(next)
    writeCache(PRODUCT_CACHE_KEY, next)
    void syncProducts(next)
      .then(() => reload())
      .catch((error) => console.error('NukuStock save products:', error))
  }

  return { items, save, reload }
}



async function ensureSuppliersFromProducts() {
  const [
    { data: productRows, error: productError },
    { data: supplierRows, error: supplierError },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('main_supplier')
      .not('main_supplier', 'is', null),

    supabase
      .from('suppliers')
      .select('id, name'),
  ])

  if (productError) throw productError
  if (supplierError) throw supplierError

  const existingNames = new Set(
    (supplierRows || [])
      .map((row: any) =>
        String(row.name || '')
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
  )

  const names = Array.from(
    new Set(
      (productRows || [])
        .map((row: any) =>
          String(row.main_supplier || '').trim()
        )
        .filter(
          (name: string) =>
            name &&
            name.toLowerCase() !== '(vide)' &&
            name !== '0'
        )
    )
  )

  const missing = names.filter(
    (name) =>
      !existingNames.has(
        name.toLowerCase()
      )
  )

  if (!missing.length) return

  const { error } = await supabase
    .from('suppliers')
    .insert(
      missing.map((name) => ({
        id: uuid(),
        name,
        contact: null,
        phone: null,
        payment: null,
        notes:
          'Créé automatiquement depuis les fournisseurs des produits',
        address: null,
        contact_person: null,
        email: null,
        delivery_lead_time: null,
        currency: 'XPF',
        active: true,
      }))
    )

  if (error) throw error
}

async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select(
      'id, name, contact, phone, payment, notes, address, contact_person, email, delivery_lead_time, currency, active'
    )
    .order('name')

  if (error) throw error

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name || '',
    contact: row.contact || row.email || '',
    phone: row.phone || '',
    payment: row.payment || '',
    notes: row.notes || '',
    address: row.address || '',
    contactPerson: row.contact_person || '',
    email: row.email || '',
    deliveryLeadTime: row.delivery_lead_time || '',
    currency: row.currency || 'XPF',
    active: row.active !== false,
  }))
}

async function syncSuppliers(suppliers: Supplier[]) {
  const { data: existing, error: existingError } = await supabase
    .from('suppliers')
    .select('id')

  if (existingError) throw existingError

  if (suppliers.length) {
    const payload = suppliers.map((supplier) => ({
      id: supplier.id || uuid(),
      name: supplier.name.trim(),
      contact: supplier.contact || null,
      phone: supplier.phone || null,
      payment: supplier.payment || null,
      notes: supplier.notes || null,
      address: supplier.address || null,
      contact_person: supplier.contactPerson || null,
      email: supplier.email || null,
      delivery_lead_time: supplier.deliveryLeadTime || null,
      currency: supplier.currency || 'XPF',
      active: supplier.active !== false,
    }))

    const { error } = await supabase
      .from('suppliers')
      .upsert(payload, { onConflict: 'id' })

    if (error) throw error
  }

  const keepIds = new Set(
    suppliers
      .map((supplier) => supplier.id)
      .filter(Boolean)
  )

  const removedIds = (existing || [])
    .map((row: any) => row.id)
    .filter((id: string) => !keepIds.has(id))

  if (removedIds.length) {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .in('id', removedIds)

    if (error) throw error
  }
}

export function useUnifiedSuppliers() {
  const [items, setItems] = useState<Supplier[]>(
    () => readCache<Supplier[]>(SUPPLIER_CACHE_KEY, [])
  )

  const reload = useCallback(async () => {
    try {
      // Synchronise automatiquement tous les noms de fournisseurs
      // déjà présents dans les produits vers la table suppliers.
      await ensureSuppliersFromProducts()

      let remote = await fetchSuppliers()

      // Si aucun fournisseur n'existe encore dans Supabase,
      // on tente aussi de récupérer l'ancien cache local.
      if (!remote.length) {
        const cached = readCache<Supplier[]>(
          SUPPLIER_CACHE_KEY,
          []
        )

        if (cached.length) {
          await syncSuppliers(cached)
          await ensureSuppliersFromProducts()
          remote = await fetchSuppliers()
        }
      }

      setItems(remote)
      writeCache(SUPPLIER_CACHE_KEY, remote)
    } catch (error) {
      console.error(
        'NukuStock suppliers Supabase:',
        error
      )
    }
  }, [])

  useEffect(() => {
    void reload()

    const onFocus = () => void reload()
    window.addEventListener('focus', onFocus)

    return () =>
      window.removeEventListener('focus', onFocus)
  }, [reload])

  const save = (next: Supplier[]) => {
    setItems(next)
    writeCache(SUPPLIER_CACHE_KEY, next)

    void syncSuppliers(next)
      .then(() => reload())
      .catch((error) =>
        console.error(
          'NukuStock save suppliers:',
          error
        )
      )
  }

  return {
    items,
    save,
    reload,
  }
}

async function fetchMasterData(): Promise<MasterDataItem[]> {
  const local = readCache<MasterDataItem[]>(MASTER_CACHE_KEY, [])
    .filter(
      (item) =>
        item.type !== 'category' &&
        item.type !== 'subcategory' &&
        item.type !== 'location' &&
        item.type !== 'service' &&
        item.type !== 'zone'
    )

  const [
    { data: categories, error: categoryError },
    { data: subcategories, error: subcategoryError },
    { data: departments, error: depError },
    { data: locations, error: locError },
    { data: zones, error: zoneError },
  ] = await Promise.all([
    supabase
      .from('product_categories')
      .select('id, name, active, sort_order, internal_ref')
      .order('sort_order')
      .order('name'),
    supabase
      .from('product_subcategories')
      .select('id, category_id, name, active, sort_order, internal_ref')
      .order('sort_order')
      .order('name'),
    supabase
      .from('departments')
      .select('id, name, active')
      .order('name'),
    supabase
      .from('storage_locations')
      .select('id, name, active, internal_ref')
      .order('name'),
    supabase
      .from('product_zones')
      .select('id, name, active, sort_order, internal_ref')
      .order('sort_order')
      .order('name'),
  ])

  if (categoryError) throw categoryError
  if (subcategoryError) throw subcategoryError
  if (depError) throw depError
  if (locError) throw locError
  if (zoneError) throw zoneError

  return [
    ...local,

    ...(categories || []).map(
      (row: any) => ({
        id: row.id,
        internalRef: row.internal_ref || '',
        type: 'category' as const,
        name: row.name,
        active: row.active !== false,
      })
    ),

    ...(subcategories || []).map(
      (row: any) => ({
        id: row.id,
        internalRef: row.internal_ref || '',
        type: 'subcategory' as const,
        name: row.name,
        parentId: row.category_id,
        active: row.active !== false,
      })
    ),

    ...(departments || []).map(
      (row: any) => ({
        id: row.id,
        type: 'service' as const,
        name: row.name,
        active: row.active,
      })
    ),

    ...(locations || []).map(
      (row: any) => ({
        id: row.id,
        internalRef: row.internal_ref || '',
        type: 'location' as const,
        name: row.name,
        active: row.active,
      })
    ),

    ...(zones || []).map(
      (row: any) => ({
        id: row.id,
        type: 'zone' as const,
        internalRef: row.internal_ref || '',
        name: row.name,
        active: row.active !== false,
      })
    ),
  ]
}

async function syncMasterData(items: MasterDataItem[]) {
  // Les référentiels qui restent uniquement locaux.
  const localOnly = items.filter(
    (item) =>
      item.type !== 'category' &&
      item.type !== 'subcategory' &&
      item.type !== 'location' &&
      item.type !== 'service' &&
      item.type !== 'zone'
  )

  writeCache(MASTER_CACHE_KEY, localOnly)

  const categories = items.filter(
    (item) => item.type === 'category'
  )

  const subcategories = items.filter(
    (item) => item.type === 'subcategory'
  )

  const services = items.filter(
    (item) => item.type === 'service'
  )

  const locations = items.filter(
    (item) => item.type === 'location'
  )

  const zones = items.filter(
    (item) => item.type === 'zone'
  )

  // =========================================================
  // CATEGORIES
  // =========================================================

  const {
    data: remoteCategories,
    error: remoteCategoryError,
  } = await supabase
    .from('product_categories')
    .select('id, name, internal_ref')

  if (remoteCategoryError) {
    throw remoteCategoryError
  }

  // Index des catégories déjà présentes dans Supabase.
  // La comparaison se fait par nom normalisé pour éviter
  // de recréer une catégorie déjà existante avec un autre ID.
  const remoteCategoryByName =
    new Map(
      (remoteCategories || []).map(
        (row: any) => [
          String(row.name || '')
            .trim()
            .toLowerCase(),
          row,
        ]
      )
    )

  // Correspondance entre l'ID local et l'ID réel Supabase.
  // Elle est utilisée ensuite pour rattacher correctement
  // les sous-catégories à leur catégorie.
  const resolvedCategoryIdByLocalId =
    new Map<string, string>()

  if (categories.length) {
    const payload =
      categories.map(
        (item, index) => {
          const normalizedName =
            item.name
              .trim()
              .toLowerCase()

          const existing: any =
            remoteCategoryByName.get(
              normalizedName
            )

          const resolvedId =
            existing?.id ||
            item.id

          resolvedCategoryIdByLocalId.set(
            item.id,
            resolvedId
          )

          return {
            id: resolvedId,
            internal_ref:
              item.internalRef ||
              existing?.internal_ref ||
              null,
            name:
              item.name.trim(),
            active:
              item.active !== false,
            sort_order:
              index + 1,
            updated_at:
              new Date()
                .toISOString(),
          }
        }
      )

    const { error } =
      await supabase
        .from(
          'product_categories'
        )
        .upsert(
          payload,
          {
            onConflict: 'id',
          }
        )

    if (error) {
      throw error
    }
  }

  const categoryIds =
    new Set(
      categories.map(
        (item) =>
          resolvedCategoryIdByLocalId.get(
            item.id
          ) ||
          item.id
      )
    )

  const removedCategoryIds =
    (remoteCategories || [])
      .map(
        (row: any) =>
          row.id
      )
      .filter(
        (id: string) =>
          !categoryIds.has(id)
      )

  if (
    removedCategoryIds.length
  ) {
    const { error } =
      await supabase
        .from(
          'product_categories'
        )
        .delete()
        .in(
          'id',
          removedCategoryIds
        )

    if (error) {
      throw error
    }
  }

  // =========================================================
  // SOUS-CATEGORIES
  // =========================================================

  const {
    data: remoteSubcategories,
    error: remoteSubcategoryError,
  } = await supabase
    .from('product_subcategories')
    .select('id')

  if (remoteSubcategoryError) {
    throw remoteSubcategoryError
  }

  if (subcategories.length) {
    const byParentOrder =
      new Map<string, number>()

    const payload =
      subcategories.map((item) => {
        const parent =
          item.parentId || ''

        const nextOrder =
          (byParentOrder.get(parent) || 0) +
          1

        byParentOrder.set(
          parent,
          nextOrder
        )

        return {
          id: item.id,
          internal_ref:
            item.internalRef || null,
          category_id:
            resolvedCategoryIdByLocalId.get(
              item.parentId || ''
            ) ||
            item.parentId,
          name:
            item.name.trim(),
          active:
            item.active !== false,
          sort_order:
            nextOrder,
          updated_at:
            new Date().toISOString(),
        }
      })

    const { error } = await supabase
      .from('product_subcategories')
      .upsert(
        payload,
        {
          onConflict: 'id',
        }
      )

    if (error) throw error
  }

  const subcategoryIds =
    new Set(
      subcategories.map(
        (item) => item.id
      )
    )

  const removedSubcategoryIds =
    (remoteSubcategories || [])
      .map((row: any) => row.id)
      .filter(
        (id: string) =>
          !subcategoryIds.has(id)
      )

  if (
    removedSubcategoryIds.length
  ) {
    const { error } = await supabase
      .from(
        'product_subcategories'
      )
      .delete()
      .in(
        'id',
        removedSubcategoryIds
      )

    if (error) throw error
  }

  // =========================================================
  // ZONES PRODUITS
  // =========================================================

  if (zones.length) {
    const { error } = await supabase
      .from('product_zones')
      .upsert(
        zones.map((item, index) => ({
          id: item.id,
          internal_ref: item.internalRef || null,
          name: item.name.trim(),
          active: item.active !== false,
          sort_order: index + 1,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'id' }
      )

    if (error) throw error
  }

  // =========================================================
  // DEPARTEMENTS / SERVICES
  // =========================================================

  if (services.length) {
    const { error } = await supabase
      .from('departments')
      .upsert(
        services.map(
          (item) => ({
            id: item.id,
            name: item.name,
            active:
              item.active !== false,
          })
        ),
        {
          onConflict: 'id',
        }
      )

    if (error) throw error
  }

  // =========================================================
  // LIEUX
  // =========================================================

  if (locations.length) {
    const {
      data: existing,
    } = await supabase
      .from('storage_locations')
      .select(
        'id, location_type'
      )

    const typeById =
      new Map(
        (existing || []).map(
          (row: any) => [
            row.id,
            row.location_type,
          ]
        )
      )

    const { error } = await supabase
      .from('storage_locations')
      .upsert(
        locations.map(
          (item) => ({
            id: item.id,
            internal_ref: item.internalRef || null,
            name: item.name,
            location_type:
              typeById.get(
                item.id
              ) ||
              'consumption_point',
            active:
              item.active !== false,
          })
        ),
        {
          onConflict: 'id',
        }
      )

    if (error) throw error
  }
}

export function useUnifiedMasterData() {
  const [items, setItems] =
    useState<MasterDataItem[]>(
      () =>
        readCache<
          MasterDataItem[]
        >(
          MASTER_CACHE_KEY,
          []
        )
    )

  const reload =
    useCallback(async () => {
      try {
        const remote =
          await fetchMasterData()

        setItems(remote)
      } catch (error) {
        console.error(
          'NukuStock master data Supabase:',
          error
        )
      }
    }, [])

  useEffect(() => {
    void reload()

    const onFocus = () =>
      void reload()

    window.addEventListener(
      'focus',
      onFocus
    )

    return () =>
      window.removeEventListener(
        'focus',
        onFocus
      )
  }, [reload])

  const save = (
    next: MasterDataItem[]
  ) => {
    setItems(next)

    void syncMasterData(next)
      .then(() => reload())
      .catch((error) =>
        console.error(
          'NukuStock save master data:',
          error
        )
      )
  }

  return {
    items,
    save,
    reload,
  }
}

async function fetchRequests(): Promise<InternalRequest[]> {
  const [{ data: requestRows, error: requestError }, { data: lineRows, error: lineError }, { data: deps }, { data: locs }, { data: productRows }] = await Promise.all([
    supabase.from('internal_requests').select('id, request_number, department_id, destination_location_id, requested_for, status, requested_by, created_at, delivered_at, stock_applied_at').order('created_at', { ascending: false }),
    supabase.from('internal_request_lines').select('id, request_id, product_id, requested_quantity, approved_quantity, delivered_quantity, notes'),
    supabase.from('departments').select('id, name'),
    supabase.from('storage_locations').select('id, name'),
    supabase.from('products').select('id, legacy_id, name'),
  ])

  if (requestError) throw requestError
  if (lineError) throw lineError

  const depName = new Map((deps || []).map((x: any) => [x.id, x.name]))
  const locName = new Map((locs || []).map((x: any) => [x.id, x.name]))
  const productByDbId = new Map((productRows || []).map((x: any) => [x.id, x]))
  const linesByRequest = new Map<string, any[]>()

  for (const line of lineRows || []) {
    const current = linesByRequest.get(line.request_id) || []
    current.push(line)
    linesByRequest.set(line.request_id, current)
  }

  return (requestRows || []).map((row: any) => ({
    id: row.request_number,
    service: depName.get(row.department_id) || '—',
    status: STATUS_FROM_DB[row.status] || 'Envoyée',
    createdAt: (row.created_at || row.requested_for || new Date().toISOString()).slice(0, 10),
    destinationLocation: locName.get(row.destination_location_id) || '',
    deliveredAt: row.delivered_at || undefined,
    stockAppliedAt: row.stock_applied_at || undefined,
    items: (linesByRequest.get(row.id) || []).map((line: any) => {
      const product: any = productByDbId.get(line.product_id)
      return {
        productId: product?.legacy_id || product?.id || line.product_id,
        productName: product?.name || 'Produit',
        requested: Number(line.requested_quantity) || 0,
        approved: Number(line.approved_quantity) || 0,
        sourceLocation: parseSourceLocation(line.notes),
      }
    }),
  }))
}

async function syncRequests(requests: InternalRequest[]) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Utilisateur non connecté')

  const [{ data: deps }, { data: locs }, { data: products }, { data: existingRequests }] = await Promise.all([
    supabase.from('departments').select('id, name'),
    supabase.from('storage_locations').select('id, name'),
    supabase.from('products').select('id, legacy_id, name'),
    supabase.from('internal_requests').select('id, request_number, requested_by, delivered_at, stock_applied_at'),
  ])

  const depByName = new Map((deps || []).map((x: any) => [String(x.name).trim().toLowerCase(), x.id]))
  const locByName = new Map((locs || []).map((x: any) => [String(x.name).trim().toLowerCase(), x.id]))
  const productByLegacy = new Map((products || []).map((x: any) => [x.legacy_id || x.id, x.id]))
  const productByName = new Map((products || []).map((x: any) => [String(x.name).trim().toLowerCase(), x.id]))
  const reqByNumber = new Map((existingRequests || []).map((x: any) => [x.request_number, x]))

  for (const request of requests) {
    const departmentId = depByName.get(
      String(request.service || '')
        .trim()
        .toLowerCase()
    )

    const destinationId = locByName.get(
      String(request.destinationLocation || '')
        .trim()
        .toLowerCase()
    )

    if (!departmentId) {
      throw new Error(
        `Département introuvable dans Supabase pour la réquisition ${request.id} : ${request.service || '—'}`
      )
    }

    if (!destinationId) {
      throw new Error(
        `Lieu de destination introuvable dans Supabase pour la réquisition ${request.id} : ${request.destinationLocation || '—'}`
      )
    }

    const existing: any = reqByNumber.get(request.id)
    const dbId = existing?.id || uuid()

    const { error: requestError } = await supabase.from('internal_requests').upsert({
      id: dbId,
      request_number: request.id,
      department_id: departmentId,
      destination_location_id: destinationId,
      requested_for: request.createdAt || new Date().toISOString().slice(0, 10),
      priority: 'normal',
      status: STATUS_TO_DB[request.status] || 'submitted',
      notes: null,
      requested_by: existing?.requested_by || user.id,
      delivered_at:
        request.deliveredAt ||
        (request.status === 'Livrée'
          ? existing?.delivered_at || new Date().toISOString()
          : null),
      stock_applied_at:
        request.stockAppliedAt ||
        existing?.stock_applied_at ||
        null,
    }, { onConflict: 'id' })

    if (requestError) throw requestError

    const { error: deleteError } = await supabase.from('internal_request_lines').delete().eq('request_id', dbId)
    if (deleteError) throw deleteError

    if (request.items.length) {
      const payload = request.items.flatMap((item) => {
        const productId =
          productByLegacy.get(item.productId) ||
          productByName.get(
            item.productName.trim().toLowerCase()
          )

        if (!productId) {
          return []
        }

        return [
          {
            id: uuid(),
            request_id: dbId,
            product_id: productId,
            requested_quantity: Math.max(
              0,
              Number(item.requested) || 0
            ),
            approved_quantity: Math.max(
              0,
              Number(item.approved) || 0
            ),
            delivered_quantity:
              request.status === 'Livrée'
                ? Math.max(
                    0,
                    Number(
                      item.approved ||
                        item.requested
                    ) || 0
                  )
                : 0,
            notes: lineNotes(
              item.sourceLocation
            ),
          },
        ]
      })

      if (payload.length) {
        const { error } =
          await supabase
            .from(
              'internal_request_lines'
            )
            .insert(payload)

        if (error) {
          throw error
        }
      }
    }
  }
}

export function useUnifiedRequests() {
  const [items, setItems] = useState<InternalRequest[]>(
    () => readCache<InternalRequest[]>(REQUEST_CACHE_KEY, [])
  )

  const reload = useCallback(async () => {
    try {
      const remote = await fetchRequests()

      setItems(remote)
      writeCache(REQUEST_CACHE_KEY, remote)
    } catch (error) {
      console.error(
        'NukuStock requests Supabase:',
        error
      )
    }
  }, [])

  useEffect(() => {
    void reload()

    const onFocus = () => {
      void reload()
    }

    window.addEventListener(
      'focus',
      onFocus
    )

    const requestsChannel =
      supabase
        .channel(
          `nukustock-internal-requests-realtime-${crypto.randomUUID()}`
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'internal_requests',
          },
          () => {
            void reload()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'internal_request_lines',
          },
          () => {
            void reload()
          }
        )
        .subscribe()

    return () => {
      window.removeEventListener(
        'focus',
        onFocus
      )

      void supabase.removeChannel(
        requestsChannel
      )
    }
  }, [reload])

  const save = (next: InternalRequest[]) => {
    setItems(next)
    writeCache(REQUEST_CACHE_KEY, next)

    void syncRequests(next)
      .then(() => reload())
      .catch((error) => {
        console.error(
          'NukuStock save requests:',
          error
        )
      })
  }

  const removeRequest = async (
    requestNumber: string
  ) => {
    const {
      data: existing,
      error: findError,
    } = await supabase
      .from('internal_requests')
      .select('id, request_number')
      .eq('request_number', requestNumber)
      .maybeSingle()

    if (findError) {
      throw findError
    }

    if (!existing) {
      await reload()
      throw new Error(
        `Réquisition ${requestNumber} introuvable dans Supabase.`
      )
    }

    const {
      error: deleteLinesError,
    } = await supabase
      .from('internal_request_lines')
      .delete()
      .eq('request_id', existing.id)

    if (deleteLinesError) {
      throw deleteLinesError
    }

    const {
      data: deleted,
      error: deleteRequestError,
    } = await supabase
      .from('internal_requests')
      .delete()
      .eq('id', existing.id)
      .select('id, request_number')
      .maybeSingle()

    if (deleteRequestError) {
      throw deleteRequestError
    }

    if (!deleted) {
      throw new Error(
        `Supabase n'a pas autorisé la suppression de ${requestNumber}.`
      )
    }

    const remote = await fetchRequests()

    setItems(remote)
    writeCache(REQUEST_CACHE_KEY, remote)

    return true
  }

  return {
    items,
    save,
    reload,
    removeRequest,
  }
}