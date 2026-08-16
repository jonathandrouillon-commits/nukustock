'use client'

import {
  useMemo,
  useState,
} from 'react'

import {
  Page,
  Card,
  Badge,
} from '@/components/ui'

import RequisitionForm from '@/components/requisition-form'
import RequisitionTreatment from '@/components/requisition-treatment'

import {
  useMasterData,
  useProducts,
  useRequests,
  useStockEngine,
} from '@/lib/store'

import type {
  InternalRequest,
  Product,
} from '@/lib/types'

const DEFAULT_LOCATIONS = [
  'Bungalow infini',
  ...Array.from(
    { length: 16 },
    (_, index) => `Bungalow ${index}`
  ),
  'Villa 16 - Salon',
  'Villa 16 - Queen',
  'Villa 16 - King',
  'Villa 17 - Salon',
  'Villa 17 - Queen',
  'Villa 17 - King',
  'Business Center',
  'Container',
  'Extension Bar',
  'Extension Bar - Meuble à Vin',
  'Fare Intendant',
  'Fitness',
  'Mirador',
  'Poker',
  'Reception',
  'Resto - Meuble 1',
  'Resto - Meuble 2',
  'Salle de Jeux',
  'Spa 1',
  'Spa 2',
  'Sporting',
  'VDM',
].sort((a, b) =>
  a.localeCompare(
    b,
    'fr',
    {
      numeric: true,
      sensitivity: 'base',
    }
  )
)

const departments = [
  'Activités',
  'Bar',
  'Cafeteria',
  'Cuisine',
  'Direction',
  'Housekeeping',
  'Infirmerie',
  'Jardin',
  'Lune Rouge',
  'Maintenance',
  'Restaurant',
  'Room Service',
].sort((a, b) =>
  a.localeCompare(b, 'fr')
)

type NewLine = {
  productId: string
  qty: number
}

type SourceChoice = {
  productId: string
  sourceLocation: string
}

const BUNGALOW_ALLOWED_PRODUCT_NAMES = [
  'Hinano Blonde', 'Hinano Ambré', 'Heineken', 'Corona', 'Hoa',
  'Hoa Mara 0%',
  'Coca', 'Coca Zero', 'Sprite', 'Tonic', 'Rotui Mangue',
  'Rotui Ananas', 'Vals', 'Evian',
] as const

function normalizeProductName(value: string) {
  return value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isBungalowRestricted(locationName: string) {
  const normalized = normalizeProductName(locationName)
  if (normalized === 'bungalow infini') return true
  const match = normalized.match(/^bungalow\s+(\d+)$/)
  if (!match) return false
  const number = Number(match[1])
  return number >= 0 && number <= 15
}

function isAllowedBungalowProduct(productName: string) {
  const name = normalizeProductName(productName)
  const rules = [
    /^hinano blonde(?:\s|$)/, /^hinano ambre(?:\s|$)/,
    /^heineken(?:\s|$)/, /^corona(?:\s|$)/, /^hoa mara 0(?:\s|$)/,
    /^hoa(?:\s|$)/,
    /^coca cola zero(?:\s|$)/, /^coca zero(?:\s|$)/,
    /^coca cola(?:\s|$)/, /^coca(?:\s|$)/, /^sprite(?:\s|$)/,
    /^tonic(?:\s|$)/, /^rotui mangue(?:\s|$)/,
    /^rotui ananas(?:\s|$)/, /^vals(?:\s|$)/, /^evian(?:\s|$)/,
  ]
  return rules.some((rule) => rule.test(name))
}

function normalizeLocation(
  value: string
) {
  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .trim()
    .toLowerCase()
}

function stockByLocation(
  product?: Product
) {
  const result =
    new Map<
      string,
      {
        displayName: string
        quantity: number
      }
    >()

  if (!product) {
    return result
  }

  for (const lot of product.lots) {
    const location =
      lot.location?.trim()

    if (!location) {
      continue
    }

    const qty =
      Math.max(
        0,
        Number(
          lot.quantity
        ) || 0
      )

    const key =
      normalizeLocation(
        location
      )

    const current =
      result.get(key)

    result.set(
      key,
      {
        displayName:
          current?.displayName ||
          location,

        quantity:
          (current?.quantity ||
            0) + qty,
      }
    )
  }

  return result
}

export default function Requests() {
  const {
    items,
    save,
    removeRequest,
  } = useRequests()

  const {
    items: products,
  } = useProducts()

  const {
    items: masterData,
  } = useMasterData()

  const {
    fulfillRequest,
  } = useStockEngine()

  const centralLocations =
    useMemo(
      () =>
        masterData
          .filter(
            (item) =>
              item.type ===
                'location' &&
              item.active !==
                false
          )
          .map((item) =>
            item.name.trim()
          )
          .filter(Boolean)
          .sort((a, b) =>
            a.localeCompare(
              b,
              'fr',
              {
                numeric: true,
                sensitivity:
                  'base',
              }
            )
          ),
      [masterData]
    )

  const allKnownLocations =
    useMemo(
      () =>
        centralLocations.length
          ? centralLocations
          : DEFAULT_LOCATIONS,
      [centralLocations]
    )

  const [
    specialRequest,
    setSpecialRequest,
  ] = useState(false)


  const [open, setOpen] =
    useState(false)


  const [
    editingRequestId,
    setEditingRequestId,
  ] = useState('')

  const [
    partialOpen,
    setPartialOpen,
  ] = useState(false)

  const [
    partialRequestId,
    setPartialRequestId,
  ] = useState('')

  const [
    partialQuantities,
    setPartialQuantities,
  ] = useState<
    Record<string, number>
  >({})

  const [
    treatmentOpen,
    setTreatmentOpen,
  ] = useState(false)

  const [
    treatingRequestId,
    setTreatingRequestId,
  ] = useState('')

  const [
    treatmentSources,
    setTreatmentSources,
  ] = useState<
    SourceChoice[]
  >([])

  const [
    department,
    setDepartment,
  ] = useState(
    departments[0] ||
      'Activités'
  )

  const [
    destination,
    setDestination,
  ] = useState('')

  const bungalowRestricted =
    isBungalowRestricted(destination)

  const availableProducts =
    useMemo(
      () =>
        bungalowRestricted && !specialRequest
          ? products.filter((product) =>
              isAllowedBungalowProduct(product.name)
            )
          : products,
      [products, bungalowRestricted, specialRequest]
    )

  const [lines, setLines] =
    useState<NewLine[]>([
      {
        productId:
          products[0]?.id ||
          '',
        qty: 1,
      },
    ])

  const [msg, setMsg] =
    useState('')

  const [error, setError] =
    useState('')

  const [filter, setFilter] =
    useState('Toutes')

  const add = () =>
    setLines([
      ...lines,
      {
        productId:
          availableProducts[0]?.id ||
          '',
        qty: 1,
      },
    ])

  const remove = (
    index: number
  ) => {
    setLines(
      lines.length <= 1
        ? lines
        : lines.filter(
            (_, i) =>
              i !== index
          )
    )
  }

  const updateLine = (
    index: number,
    patch:
      Partial<NewLine>
  ) => {
    setLines(
      lines.map(
        (line, i) =>
          i === index
            ? {
                ...line,
                ...patch,
              }
            : line
      )
    )
  }

  const resetForm = () => {
    setEditingRequestId('')

    setDepartment(
      departments[0] ||
        'Activités'
    )

    const firstDestination =
      allKnownLocations[0] || ''

    setDestination(firstDestination)
    setSpecialRequest(false)

    const firstProducts =
      isBungalowRestricted(firstDestination)
        ? products.filter((product) =>
            isAllowedBungalowProduct(product.name)
          )
        : products

    setLines([
      {
        productId:
          firstProducts[0]?.id || '',
        qty: 1,
      },
    ])
  }

  const closeRequestModal = () => {
    setOpen(false)
  }

  const openNewRequest = () => {
    resetForm()
    setMsg('')
    setError('')
    setOpen(true)
  }

  const openEditRequest = (
    request: InternalRequest
  ) => {
    if (request.stockAppliedAt) {
      setError(
        'Cette réquisition a déjà été appliquée au stock et ne peut plus être modifiée.'
      )
      return
    }

    setMsg('')
    setError('')
    setEditingRequestId(
      request.id
    )
    setDepartment(
      request.service
    )
    const editDestination =
      request.destinationLocation || ''

    setDestination(editDestination)

    setSpecialRequest(
      isBungalowRestricted(editDestination) &&
      request.items.some((item) => {
        const product = products.find(
          (p) => p.id === item.productId
        )
        return product
          ? !isAllowedBungalowProduct(product.name)
          : false
      })
    )

    setLines(
      request.items.map(
        (item) => ({
          productId:
            item.productId,
          qty:
            item.requested,
        })
      )
    )
    setOpen(true)
  }

  const submit = () => {
    setMsg('')
    setError('')

    if (!destination) {
      setError(
        'Choisis le lieu de destination.'
      )
      return
    }

    const clean =
      lines.filter(
        (line) =>
          line.productId &&
          line.qty > 0
      )

    if (!clean.length) {
      setError(
        'Ajoute au moins un produit avec une quantité supérieure à 0.'
      )
      return
    }

    if (bungalowRestricted && !specialRequest) {
      const unauthorized = clean
        .map((line) =>
          products.find(
            (product) => product.id === line.productId
          )
        )
        .filter(
          (product) =>
            product &&
            !isAllowedBungalowProduct(product.name)
        )

      if (unauthorized.length) {
        setError(
          `Pour ${destination}, seuls les produits autorisés Bungalow peuvent être demandés.`
        )
        return
      }
    }

    const existing =
      editingRequestId
        ? items.find(
            (request) =>
              request.id ===
              editingRequestId
          )
        : undefined

    const req:
      InternalRequest = {
      id:
        existing?.id ||
        `REQ-${Date.now()
          .toString()
          .slice(-6)}`,

      service:
        department,

      destinationLocation:
        destination,

      status:
        existing?.status ||
        'Envoyée',

      createdAt:
        existing?.createdAt ||
        new Date()
          .toISOString()
          .slice(0, 10),

      items:
        clean.map(
          (line) => {
            const product =
              products.find(
                (p) =>
                  p.id ===
                  line.productId
              )

            const oldLine =
              existing?.items.find(
                (item) =>
                  item.productId ===
                  line.productId
              )

            return {
              productId:
                line.productId,

              productName:
                product?.name ||
                oldLine?.productName ||
                'Produit',

              requested:
                line.qty,

              approved:
                existing?.status ===
                  'Validée'
                  ? line.qty
                  : Math.min(
                      oldLine?.approved ||
                        0,
                      line.qty
                    ),

              sourceLocation:
                oldLine
                  ?.sourceLocation,
            }
          }
        ),
    }

    save(
      existing
        ? items.map(
            (request) =>
              request.id ===
              existing.id
                ? req
                : request
          )
        : [
            req,
            ...items,
          ]
    )

    setOpen(false)
    resetForm()

    setMsg(
      existing
        ? `Réquisition ${req.id} modifiée.`
        : 'Réquisition créée. Le lieu source sera choisi au moment du traitement.'
    )
  }

  const validateFull = (
    request: InternalRequest
  ) => {
    if (request.stockAppliedAt) {
      setError(
        'Cette réquisition a déjà été appliquée au stock.'
      )
      return
    }

    save(
      items.map(
        (item) =>
          item.id ===
          request.id
            ? {
                ...item,
                status: 'Validée',
                items:
                  item.items.map(
                    (line) => ({
                      ...line,
                      approved:
                        line.requested,
                    })
                  ),
              }
            : item
      )
    )

    setError('')
    setMsg(
      `Réquisition ${request.id} validée intégralement.`
    )
  }

  const openPartialValidation = (
    request: InternalRequest
  ) => {
    if (request.stockAppliedAt) {
      setError(
        'Cette réquisition a déjà été appliquée au stock.'
      )
      return
    }

    const initial:
      Record<string, number> = {}

    request.items.forEach(
      (line) => {
        initial[line.productId] =
          Math.min(
            line.approved ||
              line.requested,
            line.requested
          )
      }
    )

    setPartialRequestId(
      request.id
    )
    setPartialQuantities(
      initial
    )
    setMsg('')
    setError('')
    setPartialOpen(true)
  }

  const confirmPartialValidation =
    () => {
      const request =
        items.find(
          (item) =>
            item.id ===
            partialRequestId
        )

      if (!request) {
        setError(
          'Réquisition introuvable.'
        )
        return
      }

      const approvedItems =
        request.items.map(
          (line) => {
            const value =
              Math.max(
                0,
                Math.min(
                  line.requested,
                  Number(
                    partialQuantities[
                      line.productId
                    ]
                  ) || 0
                )
              )

            return {
              ...line,
              approved: value,
            }
          }
        )

      const totalApproved =
        approvedItems.reduce(
          (sum, line) =>
            sum +
            line.approved,
          0
        )

      const totalRequested =
        approvedItems.reduce(
          (sum, line) =>
            sum +
            line.requested,
          0
        )

      if (totalApproved <= 0) {
        setError(
          'Pour une validation partielle, au moins une quantité doit être supérieure à 0.'
        )
        return
      }

      if (
        totalApproved ===
        totalRequested
      ) {
        setError(
          'Toutes les quantités sont validées. Utilise plutôt le bouton "Valider".'
        )
        return
      }

      save(
        items.map(
          (item) =>
            item.id ===
            request.id
              ? {
                  ...item,
                  status:
                    'Partielle',
                  items:
                    approvedItems,
                }
              : item
        )
      )

      setPartialOpen(false)
      setError('')
      setMsg(
        `Réquisition ${request.id} validée partiellement.`
      )
  }

  const deleteRequest = async (
    request: InternalRequest
  ) => {
    if (request.stockAppliedAt) {
      setError(
        'Impossible de supprimer une réquisition déjà appliquée au stock.'
      )
      return
    }

    const confirmed =
      window.confirm(
        `Supprimer définitivement la réquisition ${request.id} ?`
      )

    if (!confirmed) {
      return
    }

    setMsg('')
    setError('')

    try {
      await removeRequest(
        request.id
      )

      setMsg(
        `Réquisition ${request.id} supprimée définitivement.`
      )
    } catch (caughtError) {
      console.error(
        'Suppression réquisition :',
        caughtError
      )

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Erreur lors de la suppression de la réquisition.'
      )
    }
  }

  const getProductLocations =
    (
      productId: string
    ) => {
      const product =
        products.find(
          (p) =>
            p.id ===
            productId
        )

      const stockMap =
        stockByLocation(
          product
        )

      const merged =
        new Map<
          string,
          {
            location: string
            quantity: number
          }
        >()

      /*
       * 1) Tous les lieux du
       * référentiel central.
       */
      for (
        const location of
        centralLocations
      ) {
        const key =
          normalizeLocation(
            location
          )

        const stock =
          stockMap.get(key)

        merged.set(
          key,
          {
            location,
            quantity:
              stock?.quantity ||
              0,
          }
        )
      }

      /*
       * 2) Tous les lieux réellement
       * présents dans les lots.
       * Ainsi, un ancien stock reste
       * toujours visible même si le
       * référentiel a été créé après.
       */
      for (
        const [
          key,
          stock,
        ] of stockMap
      ) {
        if (
          !merged.has(key)
        ) {
          merged.set(
            key,
            {
              location:
                stock.displayName,
              quantity:
                stock.quantity,
            }
          )
        }
      }

      return [
        ...merged.values(),
      ].sort(
        (a, b) => {
          /*
           * Les lieux avec stock sont
           * affichés en premier.
           */
          if (
            a.quantity > 0 &&
            b.quantity <= 0
          ) {
            return -1
          }

          if (
            b.quantity > 0 &&
            a.quantity <= 0
          ) {
            return 1
          }

          return a.location.localeCompare(
            b.location,
            'fr',
            {
              numeric: true,
              sensitivity:
                'base',
            }
          )
        }
      )
    }

  const openTreatment = (
    request:
      InternalRequest
  ) => {
    setMsg('')
    setError('')

    const initial =
      request.items.map(
        (item) => {
          const locations =
            getProductLocations(
              item.productId
            )

          const firstWithStock =
            locations.find(
              (location) =>
                location.quantity >
                0
            )

          return {
            productId:
              item.productId,

            sourceLocation:
              item.sourceLocation ||
              firstWithStock
                ?.location ||
              '',
          }
        }
      )

    setTreatingRequestId(
      request.id
    )

    setTreatmentSources(
      initial
    )

    setTreatmentOpen(
      true
    )
  }

  const updateTreatmentSource =
    (
      productId: string,
      sourceLocation: string
    ) => {
      setTreatmentSources(
        (current) =>
          current.map(
            (item) =>
              item.productId ===
              productId
                ? {
                    ...item,
                    sourceLocation,
                  }
                : item
          )
      )
    }

  const confirmTreatment =
    () => {
      setMsg('')
      setError('')

      const request =
        items.find(
          (item) =>
            item.id ===
            treatingRequestId
        )

      if (!request) {
        setError(
          'Réquisition introuvable.'
        )
        return
      }

      for (
        const line of
        request.items
      ) {
        const source =
          treatmentSources.find(
            (item) =>
              item.productId ===
              line.productId
          )
            ?.sourceLocation ||
          ''

        if (!source) {
          setError(
            `Choisis le lieu source pour ${line.productName}.`
          )
          return
        }

        const sourceKey =
          normalizeLocation(
            source
          )

        const available =
          getProductLocations(
            line.productId
          ).find(
            (item) =>
              normalizeLocation(
                item.location
              ) === sourceKey
          )
            ?.quantity ||
          0

        const needed =
          line.approved ||
          line.requested

        if (
          available <
          needed
        ) {
          setError(
            `${line.productName} : stock insuffisant à ${source}. Disponible : ${available}, demandé : ${needed}.`
          )
          return
        }
      }

      const updated:
        InternalRequest = {
        ...request,

        items:
          request.items.map(
            (line) => ({
              ...line,

              sourceLocation:
                treatmentSources.find(
                  (item) =>
                    item.productId ===
                    line.productId
                )
                  ?.sourceLocation ||
                '',
            })
          ),
      }

      const nextItems =
        items.map(
          (item) =>
            item.id ===
            updated.id
              ? updated
              : item
        )

      save(nextItems)

      localStorage.setItem(
        'nukustock_requests_v11',
        JSON.stringify(
          nextItems
        )
      )

      window.dispatchEvent(
        new CustomEvent(
          'nukustock-change',
          {
            detail: {
              key:
                'nukustock_requests_v11',
            },
          }
        )
      )

      window.setTimeout(
        () => {
          const result =
            fulfillRequest(
              updated.id
            )

          if (!result.ok) {
            setError(
              result.message
            )
            return
          }

          setTreatmentOpen(
            false
          )

          setMsg(
            result.message
          )
        },
        0
      )
    }

  const filtered =
    useMemo(() => {
      if (
        filter === 'Toutes'
      ) {
        return items
      }

      return items.filter(
        (request) =>
          request.status ===
          filter
      )
    }, [
      items,
      filter,
    ])

  const getTone = (
    status: string
  ):
    | 'neutral'
    | 'good'
    | 'warn'
    | 'danger'
    | 'info' => {
    if (
      status === 'Livrée'
    ) {
      return 'good'
    }

    if (
      status ===
      'Partielle'
    ) {
      return 'warn'
    }

    if (
      status ===
        'Validée' ||
      status ===
        'Préparation'
    ) {
      return 'info'
    }

    return 'neutral'
  }

  const treatingRequest =
    items.find(
      (item) =>
        item.id ===
        treatingRequestId
    )

  return (
    <Page
      title="Réquisitions"
      subtitle="Le lieu source est choisi au moment du traitement, produit par produit"
      action={
        <RequisitionForm />
      }
    >
      {msg && (
        <div className="notice goodNotice">
          {msg}
        </div>
      )}

      {error && (
        <div
          className="notice"
          style={{
            background:
              'rgba(220,38,38,.08)',
            border:
              '1px solid rgba(220,38,38,.2)',
            color: '#b42318',
          }}
        >
          {error}
        </div>
      )}

      <div className="toolbar">
        <select
          className="select"
          value={filter}
          onChange={(e) =>
            setFilter(
              e.target.value
            )
          }
        >
          <option value="Toutes">
            Tous les statuts
          </option>

          <option value="Envoyée">
            Envoyée
          </option>

          <option value="Validée">
            Validée
          </option>

          <option value="Préparation">
            Préparation
          </option>

          <option value="Livrée">
            Livrée
          </option>

          <option value="Partielle">
            Partielle
          </option>
        </select>
      </div>

      <div className="list">
        {filtered.map(
          (request) => (
            <div
              key={request.id}
              className="requestCardWrap"
            >
              <Card>
              <div
                style={{
                  display:
                    'flex',
                  justifyContent:
                    'space-between',
                  alignItems:
                    'flex-start',
                  gap: 12,
                  flexWrap:
                    'wrap',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize:
                        17,
                      fontWeight:
                        800,
                    }}
                  >
                    {
                      request.id
                    }
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      color:
                        '#667085',
                    }}
                  >
                    Département :{' '}
                    <strong>
                      {
                        request.service
                      }
                    </strong>
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 13,
                      color:
                        '#667085',
                    }}
                  >
                    Destination :{' '}
                    <strong>
                      {request
                        .destinationLocation ||
                        'Non définie'}
                    </strong>
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 11,
                      color:
                        '#98a2b3',
                    }}
                  >
                    Créée le{' '}
                    {new Date(
                      request.createdAt
                    ).toLocaleDateString(
                      'fr-FR'
                    )}
                  </div>
                </div>

                <Badge
                  tone={getTone(
                    request.status
                  )}
                >
                  {
                    request.status
                  }
                </Badge>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: 'grid',
                  gap: 8,
                }}
              >
                {request.items.map(
                  (item) => (
                    <div
                      key={
                        item.productId
                      }
                      className="requestProductRow"
                      style={{
                        display:
                          'grid',
                        gridTemplateColumns:
                          'minmax(180px,1fr) 110px 110px minmax(160px,1fr)',
                        gap: 10,
                        alignItems:
                          'center',
                        padding:
                          '8px 0',
                        borderTop:
                          '1px solid rgba(255,255,255,.08)',
                      }}
                    >
                      <strong>
                        {
                          item.productName
                        }
                      </strong>

                      <span>
                        Demandé :{' '}
                        {
                          item.requested
                        }
                      </span>

                      <span>
                        Approuvé :{' '}
                        {
                          item.approved
                        }
                      </span>

                      <span
                        style={{
                          fontSize:
                            12,
                          opacity:
                            0.75,
                        }}
                      >
                        Source :{' '}
                        <strong>
                          {item.sourceLocation ||
                            (request.status ===
                              'Livrée'
                              ? 'Non renseignée'
                              : 'À choisir au traitement')}
                        </strong>
                      </span>
                    </div>
                  )
                )}
              </div>

              <div
                className="requestActions"
                style={{
                  display:
                    'flex',
                  justifyContent:
                    'flex-end',
                  gap: 8,
                  marginTop: 14,
                  flexWrap:
                    'wrap',
                }}
              >
                {!request.stockAppliedAt && (
                  <button
                    className="button secondary small"
                    onClick={() =>
                      openEditRequest(
                        request
                      )
                    }
                  >
                    Modifier
                  </button>
                )}

                {!request.stockAppliedAt &&
                  request.status !==
                    'Livrée' && (
                    <button
                      className="button secondary small"
                      onClick={() =>
                        validateFull(
                          request
                        )
                      }
                    >
                      Valider
                    </button>
                  )}

                {!request.stockAppliedAt &&
                  request.status !==
                    'Livrée' && (
                    <button
                      className="button secondary small"
                      onClick={() =>
                        openPartialValidation(
                          request
                        )
                      }
                    >
                      Valider partiel
                    </button>
                  )}

                {(request.status ===
                  'Préparation' ||
                  request.status ===
                    'Validée' ||
                  request.status ===
                    'Partielle') &&
                  !request.stockAppliedAt && (
                    <RequisitionTreatment
                      requestId={request.id}
                      className="button"
                      label="Traiter la demande"
                    />
                  )}

                {!request.stockAppliedAt && (
                  <button
                    className="button secondary small"
                    style={{
                      color:
                        '#b42318',
                      borderColor:
                        '#fda29b',
                    }}
                    onClick={() =>
                      deleteRequest(
                        request
                      )
                    }
                  >
                    Supprimer
                  </button>
                )}
              </div>
              </Card>
            </div>
          )
        )}

        {filtered.length ===
          0 && (
          <Card>
            <div className="muted">
              Aucune réquisition trouvée.
            </div>
          </Card>
        )}
      </div>

      {open && (
        <div className="modalBackdrop requestModalBackdrop">
          <div className="modal requestModal">
            <div className="modalHead requestModalHead">
              <h2>
                {editingRequestId
                  ? `Modifier ${editingRequestId}`
                  : 'Nouvelle réquisition'}
              </h2>

              <button
                className="button secondary small"
                onClick={closeRequestModal}
              >
                Fermer
              </button>
            </div>

            <div className="formGrid">
              <div className="field">
                <label>
                  Département
                </label>

                <select
                  value={
                    department
                  }
                  onChange={(e) =>
                    setDepartment(
                      e.target.value
                    )
                  }
                >
                  {departments.map(
                    (name) => (
                      <option
                        key={
                          name
                        }
                        value={
                          name
                        }
                      >
                        {name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="field">
                <label>
                  Lieu de destination
                </label>

                <select
                  className="destinationNativeSelect"
                  value={
                    destination
                  }
                  onChange={(e) => {
                    const nextDestination =
                      e.target.value

                    setDestination(nextDestination)

                    const nextProducts =
                      specialRequest ||
                      !isBungalowRestricted(nextDestination)
                        ? products
                        : products.filter(
                            (product) =>
                              isAllowedBungalowProduct(
                                product.name
                              )
                          )

                    const allowedIds =
                      new Set(
                        nextProducts.map(
                          (product) => product.id
                        )
                      )

                    setLines(
                      (current) =>
                        current.map(
                          (line) => ({
                            ...line,
                            productId:
                              allowedIds.has(line.productId)
                                ? line.productId
                                : nextProducts[0]?.id || '',
                          })
                        )
                    )
                  }}
                >
                  <option value="">
                    Choisir le lieu de destination
                  </option>

                  {allKnownLocations.map(
                    (
                      location
                    ) => (
                      <option
                        key={
                          location
                        }
                        value={
                          location
                        }
                      >
                        {
                          location
                        }
                      </option>
                    )
                  )}
                </select>


              </div>
            </div>

            {bungalowRestricted && (
              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 14,
                  border: specialRequest
                    ? '1px solid #86efac'
                    : '1px solid #fed7aa',
                  background: specialRequest
                    ? '#f0fdf4'
                    : '#fff7ed',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    fontWeight: 800,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={specialRequest}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setSpecialRequest(checked)

                      if (checked) return

                      const allowed =
                        products.filter(
                          (product) =>
                            isAllowedBungalowProduct(
                              product.name
                            )
                        )

                      const allowedIds =
                        new Set(
                          allowed.map(
                            (product) => product.id
                          )
                        )

                      setLines(
                        (current) =>
                          current.map(
                            (line) => ({
                              ...line,
                              productId:
                                allowedIds.has(line.productId)
                                  ? line.productId
                                  : allowed[0]?.id || '',
                            })
                          )
                      )
                    }}
                    style={{
                      width: 18,
                      height: 18,
                      marginTop: 1,
                    }}
                  />
                  <span>
                    Demande spéciale
                    <span
                      style={{
                        display: 'block',
                        marginTop: 4,
                        color: '#667085',
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {specialRequest
                        ? 'Toute la liste produits est débloquée.'
                        : `Pour ${destination}, seuls les produits autorisés Bungalow sont disponibles.`}
                    </span>
                  </span>
                </label>

                {!specialRequest && (
                  <div
                    style={{
                      marginTop: 10,
                      color: '#9a3412',
                      fontSize: 11,
                      lineHeight: 1.5,
                    }}
                  >
                    {BUNGALOW_ALLOWED_PRODUCT_NAMES.join(' · ')}
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                marginTop: 22,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 22,
                }}
              >
                Produits requis
              </h3>

              <button
                className="button"
                type="button"
                onClick={add}
              >
                + Ajouter un produit
              </button>
            </div>

            <div
              className="requestProductTable"
              style={{
                marginTop: 14,
                border: '1px solid #e4e7ec',
                borderRadius: 14,
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              <div
                className="requestProductTableHead"
                style={{
                  minHeight: 50,
                  padding: '0 14px',
                  display: 'grid',
                  gridTemplateColumns:
                    'minmax(0,1.8fr) minmax(150px,.65fr) 120px',
                  gap: 14,
                  alignItems: 'center',
                  background: '#f8fafc',
                  color: '#475467',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                <div>Produit</div>
                <div>Quantité demandée</div>
                <div style={{ textAlign: 'right' }}>
                  Actions
                </div>
              </div>

              <div
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  borderTop: '1px solid #b2ccff',
                  borderBottom: '1px solid #b2ccff',
                  background: '#eff8ff',
                  color: '#344054',
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                <span
                  style={{
                    flex: '0 0 auto',
                    width: 20,
                    height: 20,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 999,
                    background: '#1570ef',
                    color: '#fff',
                    fontWeight: 900,
                  }}
                >
                  i
                </span>

                <div>
                  <strong>
                    La quantité demandée est exprimée en unité
                  </strong>{' '}
                  (pièce, bouteille, canette, etc.).
                  <div>
                    Le conditionnement n&apos;apparaît pas pour éviter toute confusion.
                  </div>
                </div>
              </div>

              {lines.map(
                (
                  line,
                  index
                ) => {
                  const selectedProduct =
                    products.find(
                      (product) =>
                        product.id ===
                        line.productId
                    )

                  return (
                    <div
                      key={index}
                      className="requestFormProductRow requestProductVisualRow"
                      style={{
                        minHeight: 100,
                        padding: '12px 14px',
                        display: 'grid',
                        gridTemplateColumns:
                          'minmax(0,1.8fr) minmax(150px,.65fr) 120px',
                        gap: 14,
                        alignItems: 'center',
                        borderBottom:
                          index === lines.length - 1
                            ? 'none'
                            : '1px solid #eaecf0',
                      }}
                    >
                      <div
                        style={{
                          minWidth: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div
                          className="requestProductPhoto"
                          style={{
                            flex: '0 0 auto',
                            width: 66,
                            height: 66,
                            overflow: 'hidden',
                            display: 'grid',
                            placeItems: 'center',
                            border: '1px solid #e4e7ec',
                            borderRadius: 10,
                            background: '#f8fafc',
                          }}
                        >
                          {selectedProduct?.photo ? (
                            <img
                              src={selectedProduct.photo}
                              alt={selectedProduct.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                              }}
                            />
                          ) : (
                            <span
                              style={{
                                color: '#98a2b3',
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              PHOTO
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                            flex: '1 1 auto',
                          }}
                        >
                          <select
                            value={
                              line.productId
                            }
                            onChange={(e) =>
                              updateLine(
                                index,
                                {
                                  productId:
                                    e.target.value,
                                }
                              )
                            }
                            style={{
                              width: '100%',
                              minHeight: 44,
                              fontWeight: 700,
                            }}
                          >
                            <option value="">
                              Choisir un produit
                            </option>

                            {[...availableProducts]
                              .sort(
                                (
                                  a,
                                  b
                                ) =>
                                  a.name.localeCompare(
                                    b.name,
                                    'fr'
                                  )
                              )
                              .map(
                                (
                                  product
                                ) => (
                                  <option
                                    key={
                                      product.id
                                    }
                                    value={
                                      product.id
                                    }
                                  >
                                    {
                                      product.name
                                    }
                                  </option>
                                )
                              )}
                          </select>

                          {selectedProduct && (
                            <div
                              style={{
                                marginTop: 6,
                                display: 'grid',
                                gap: 2,
                                color: '#667085',
                                fontSize: 12,
                              }}
                            >
                              <strong
                                style={{
                                  color: '#475467',
                                }}
                              >
                                {
                                  selectedProduct.internalRef ||
                                  ''
                                }
                              </strong>

                              <span>
                                {
                                  [
                                    selectedProduct.category,
                                    selectedProduct.subcategory,
                                  ]
                                    .filter(Boolean)
                                    .join(' > ')
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <input
                          type="number"
                          min="1"
                          value={
                            line.qty
                          }
                          onChange={(e) =>
                            updateLine(
                              index,
                              {
                                qty:
                                  Math.max(
                                    1,
                                    Number(
                                      e.target.value
                                    ) || 1
                                  ),
                              }
                            )
                          }
                          style={{
                            width: '100%',
                            minHeight: 44,
                            boxSizing: 'border-box',
                          }}
                        />

                        <div
                          style={{
                            marginTop: 5,
                            color: '#175cd3',
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          unité
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <button
                          className="button secondary small"
                          type="button"
                          disabled={
                            lines.length <= 1
                          }
                          onClick={() =>
                            remove(
                              index
                            )
                          }
                          style={{
                            minHeight: 44,
                            color: '#b42318',
                            borderColor: '#fda29b',
                          }}
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  )
                }
              )}

              <div
                style={{
                  padding: '11px 14px',
                  borderTop: '1px solid #eaecf0',
                  color: '#344054',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Total de lignes : {lines.length}
              </div>
            </div>

            <div className="actions requestModalActions">
              <button
                className="button secondary"
                onClick={closeRequestModal}
              >
                Annuler
              </button>

              <button
                className="button"
                onClick={
                  submit
                }
              >
                {editingRequestId
                  ? 'Enregistrer les modifications'
                  : 'Envoyer la réquisition'}
              </button>
            </div>
          </div>
        </div>
      )}

      {partialOpen && (
        <div className="modalBackdrop">
          <div
            className="modal"
            style={{
              width:
                'min(820px,100%)',
              maxHeight:
                '92vh',
              overflowY:
                'auto',
            }}
          >
            <div className="modalHead">
              <div>
                <h2
                  style={{
                    margin: 0,
                  }}
                >
                  Validation partielle{' '}
                  {partialRequestId}
                </h2>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    opacity: 0.7,
                  }}
                >
                  Saisis la quantité réellement approuvée pour chaque produit.
                </div>
              </div>

              <button
                className="button secondary small"
                onClick={() =>
                  setPartialOpen(
                    false
                  )
                }
              >
                Fermer
              </button>
            </div>

            <div
              style={{
                marginTop: 16,
                display: 'grid',
                gap: 10,
              }}
            >
              {items
                .find(
                  (request) =>
                    request.id ===
                    partialRequestId
                )
                ?.items.map(
                  (line) => (
                    <Card
                      key={
                        line.productId
                      }
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'minmax(220px,1fr) 140px 170px',
                          gap: 12,
                          alignItems:
                            'end',
                        }}
                      >
                        <div>
                          <strong>
                            {
                              line.productName
                            }
                          </strong>
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                          }}
                        >
                          Demandé :{' '}
                          <strong>
                            {
                              line.requested
                            }
                          </strong>
                        </div>

                        <div className="field">
                          <label>
                            Quantité validée
                          </label>

                          <input
                            type="number"
                            min="0"
                            max={
                              line.requested
                            }
                            value={
                              partialQuantities[
                                line.productId
                              ] ?? 0
                            }
                            onChange={(
                              event
                            ) =>
                              setPartialQuantities(
                                (
                                  current
                                ) => ({
                                  ...current,

                                  [line.productId]:
                                    Math.max(
                                      0,
                                      Math.min(
                                        line.requested,
                                        Number(
                                          event
                                            .target
                                            .value
                                        ) ||
                                          0
                                      )
                                    ),
                                })
                              )
                            }
                          />
                        </div>
                      </div>
                    </Card>
                  )
                )}
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 10,
                background:
                  'rgba(245,158,11,.08)',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              Une quantité à 0 signifie que ce produit n&apos;est pas validé. Lors du traitement, seules les quantités approuvées seront sorties du stock.
            </div>

            <div className="actions">
              <button
                className="button secondary"
                onClick={() =>
                  setPartialOpen(
                    false
                  )
                }
              >
                Annuler
              </button>

              <button
                className="button"
                onClick={
                  confirmPartialValidation
                }
              >
                Confirmer validation partielle
              </button>
            </div>
          </div>
        </div>
      )}

      {treatmentOpen &&
        treatingRequest && (
          <div className="modalBackdrop">
            <div
              className="modal"
              style={{
                width:
                  'min(900px,100%)',
                maxHeight:
                  '92vh',
                overflowY:
                  'auto',
              }}
            >
              <div className="modalHead">
                <div>
                  <h2
                    style={{
                      margin: 0,
                    }}
                  >
                    Traiter{' '}
                    {
                      treatingRequest.id
                    }
                  </h2>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      opacity: 0.7,
                    }}
                  >
                    Destination :{' '}
                    <strong>
                      {treatingRequest
                        .destinationLocation ||
                        'Non définie'}
                    </strong>
                  </div>
                </div>

                <button
                  className="button secondary small"
                  onClick={() =>
                    setTreatmentOpen(
                      false
                    )
                  }
                >
                  Fermer
                </button>
              </div>

              <div
                style={{
                  marginTop: 16,
                  display:
                    'grid',
                  gap: 14,
                }}
              >
                {treatingRequest.items.map(
                  (line) => {
                    const locationOptions =
                      getProductLocations(
                        line.productId
                      )

                    const selected =
                      treatmentSources.find(
                        (item) =>
                          item.productId ===
                          line.productId
                      )
                        ?.sourceLocation ||
                      ''

                    const needed =
                      line.approved ||
                      line.requested

                    const totalAvailable =
                      locationOptions.reduce(
                        (
                          sum,
                          location
                        ) =>
                          sum +
                          location.quantity,
                        0
                      )

                    return (
                      <Card
                        key={
                          line.productId
                        }
                      >
                        <div
                          style={{
                            fontWeight:
                              800,
                          }}
                        >
                          {
                            line.productName
                          }
                        </div>

                        <div
                          style={{
                            marginTop:
                              4,
                            fontSize:
                              12,
                            opacity:
                              0.7,
                          }}
                        >
                          Quantité à traiter :{' '}
                          <strong>
                            {
                              needed
                            }
                          </strong>

                          {' · '}

                          Stock total disponible :{' '}
                          <strong>
                            {
                              totalAvailable
                            }
                          </strong>
                        </div>

                        <div
                          className="field"
                          style={{
                            marginTop:
                              12,
                          }}
                        >
                          <label>
                            D&apos;où vient le stock ?
                          </label>

                          <select
                            value={
                              selected
                            }
                            onChange={(
                              e
                            ) =>
                              updateTreatmentSource(
                                line.productId,
                                e
                                  .target
                                  .value
                              )
                            }
                          >
                            <option value="">
                              Choisir un lieu source
                            </option>

                            {locationOptions.map(
                              (
                                location
                              ) => (
                                <option
                                  key={
                                    location.location
                                  }
                                  value={
                                    location.location
                                  }
                                  disabled={
                                    location.quantity <=
                                    0
                                  }
                                >
                                  {
                                    location.location
                                  }{' '}
                                  — disponible :{' '}
                                  {
                                    location.quantity
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        {totalAvailable ===
                          0 && (
                          <div
                            style={{
                              marginTop:
                                8,
                              color:
                                '#b42318',
                              fontSize:
                                12,
                            }}
                          >
                            Aucun stock disponible pour ce produit.
                          </div>
                        )}
                      </Card>
                    )
                  }
                )}
              </div>

              <div className="actions">
                <button
                  className="button secondary"
                  onClick={() =>
                    setTreatmentOpen(
                      false
                    )
                  }
                >
                  Annuler
                </button>

                <button
                  className="button"
                  onClick={
                    confirmTreatment
                  }
                >
                  Confirmer et déduire le stock
                </button>
              </div>
            </div>
          </div>
        )}

      <style jsx global>{`
        @media (max-width: 767px) {
          .requestCardWrap {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }

          .requestCardWrap > * {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
          }

          .requestProductRow {
            grid-template-columns: 1fr !important;
            gap: 4px !important;
            padding: 12px 0 !important;
            align-items: start !important;
          }

          .requestProductRow > strong {
            font-size: 16px !important;
            margin-bottom: 3px !important;
          }

          .requestProductRow > span {
            display: block !important;
            font-size: 13px !important;
            line-height: 1.35 !important;
          }

          .requestActions {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0,1fr)) !important;
            gap: 8px !important;
            width: 100% !important;
          }

          .requestActions button {
            width: 100% !important;
            min-width: 0 !important;
            min-height: 44px !important;
            white-space: normal !important;
            line-height: 1.2 !important;
          }

          .requestActions .button:not(.secondary) {
            grid-column: 1 / -1 !important;
          }

          .requestActions button[style*="b42318"] {
            grid-column: 1 / -1 !important;
          }

          .list {
            gap: 12px !important;
          }


          /* Nouvelle réquisition — correction téléphone */
          .view-phone:has(.requestModalBackdrop) .nskMobileNav {
            display: none !important;
          }

          .requestModalBackdrop {
            position: fixed !important;
            inset: 0 !important;
            z-index: 1000 !important;
            width: 100vw !important;
            height: 100svh !important;
            max-height: 100svh !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: hidden !important;
          }

          .requestModal {
            position: relative !important;
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100svh !important;
            max-height: 100svh !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            overscroll-behavior: contain !important;
            -webkit-overflow-scrolling: touch !important;
            padding:
              max(12px, env(safe-area-inset-top))
              14px
              calc(150px + env(safe-area-inset-bottom))
              14px !important;
          }

          .requestModalHead {
            position: sticky !important;
            top: 0 !important;
            z-index: 1010 !important;
            margin: -12px -14px 14px !important;
            padding:
              max(12px, env(safe-area-inset-top))
              14px
              10px !important;
            background: inherit !important;
          }

          .requestModalHead h2 {
            margin: 0 !important;
            min-width: 0 !important;
            font-size: 20px !important;
          }

          .requestModalHead button {
            flex: 0 0 auto !important;
            min-height: 42px !important;
          }

          .requestModal .formGrid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          .requestModal select,
          .requestModal input {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: 48px !important;
            box-sizing: border-box !important;
            font-size: 16px !important;
          }

          .requestFormProductRow {
            grid-template-columns: 1fr !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            gap: 8px !important;
          }

          .requestFormProductRow > * {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          .requestFormProductRow button {
            min-height: 44px !important;
          }

          .requestModalActions {
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 1020 !important;
            display: grid !important;
            grid-template-columns: 1fr 1.35fr !important;
            gap: 8px !important;
            width: 100vw !important;
            margin: 0 !important;
            padding:
              10px
              12px
              calc(10px + env(safe-area-inset-bottom)) !important;
            background: #ffffff !important;
            border-top: 1px solid #e5e7eb !important;
            box-shadow: 0 -8px 24px rgba(15,23,42,.12) !important;
          }

          .requestModalActions button {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: 50px !important;
            padding: 10px !important;
            white-space: normal !important;
            line-height: 1.15 !important;
            font-size: 14px !important;
          }
          .view-phone .destinationNativeSelect {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: 48px !important;
            box-sizing: border-box !important;
            font-size: 16px !important;
          }
        }

        @media (max-width: 390px) {
          .requestActions {
            grid-template-columns: 1fr !important;
          }

          .requestActions .button,
          .requestActions button {
            grid-column: 1 !important;
          }
        }
      `}</style>

      <style jsx global>{`
        @media (max-width: 767px) {
          .pageContent .list {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            padding: 0 12px 24px !important;
            margin: 0 !important;
            overflow: hidden !important;
          }

          .requestCardWrap {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
          }

          .requestCardWrap > * {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            overflow: hidden !important;
          }

          .requestProductRow {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            gap: 5px !important;
            padding: 12px 0 !important;
            overflow: hidden !important;
          }

          .requestProductRow > * {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            word-break: normal !important;
          }

          .requestProductRow > strong {
            display: block !important;
            font-size: 16px !important;
            line-height: 1.25 !important;
          }

          .requestProductRow > span {
            display: block !important;
            font-size: 13px !important;
            line-height: 1.35 !important;
          }

          .requestActions {
            display: grid !important;
            grid-template-columns: 1fr !important;
            width: 100% !important;
            max-width: 100% !important;
            gap: 8px !important;
            margin-top: 12px !important;
          }

          .requestActions button {
            grid-column: 1 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: 46px !important;
            padding: 10px 12px !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            line-height: 1.2 !important;
          }

          .requestActions .button {
            width: 100% !important;
          }

          .requestCardWrap [style*="gridTemplateColumns"],
          .requestCardWrap [style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }

          .requestCardWrap [style*="minmax(180px"],
          .requestCardWrap [style*="110px"] {
            display: flex !important;
            flex-direction: column !important;
          }
        }

        @media (max-width: 767px) {
          .requestProductTableHead {
            display: none !important;
          }

          .requestProductVisualRow {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
            align-items: stretch !important;
          }

          .requestProductPhoto {
            width: 58px !important;
            height: 58px !important;
          }

          .requestProductVisualRow > div:last-child {
            justify-content: stretch !important;
          }

          .requestProductVisualRow > div:last-child button {
            width: 100% !important;
          }
        }

      `}</style>

      <style jsx global>{`
        @media (max-width: 767px) {
          .requestModal .destinationNativeSelect,
          .view-phone .requestModal .destinationNativeSelect {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: 48px !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            font-size: 16px !important;
          }

          .requestModal .field {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }
        }
      `}</style>


      <style jsx global>{`
        @media (max-width: 767px) {
          /* =====================================================
             RÉQUISITION - CRÉATION / MODIFICATION - TÉLÉPHONE
             ===================================================== */

          .requestModalBackdrop {
            position: fixed !important;
            inset: 0 !important;
            z-index: 2000 !important;
            width: 100vw !important;
            height: 100dvh !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #f4f6f9 !important;
          }

          .requestModal {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            max-width: 100vw !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            min-height: 100dvh !important;
            margin: 0 !important;
            padding:
              calc(12px + env(safe-area-inset-top))
              12px
              calc(92px + env(safe-area-inset-bottom))
              12px !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-sizing: border-box !important;
            background: #f4f6f9 !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            overscroll-behavior-y: contain !important;
            -webkit-overflow-scrolling: touch !important;
          }

          .requestModalHead {
            position: sticky !important;
            top: calc(-12px - env(safe-area-inset-top)) !important;
            z-index: 20 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 10px !important;
            width: calc(100% + 24px) !important;
            margin:
              calc(-12px - env(safe-area-inset-top))
              -12px
              16px !important;
            padding:
              calc(12px + env(safe-area-inset-top))
              12px
              12px !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            border-bottom: 1px solid #e4e7ec !important;
          }

          .requestModalHead h2 {
            margin: 0 !important;
            min-width: 0 !important;
            font-size: 20px !important;
            line-height: 1.15 !important;
          }

          .requestModalHead .button {
            flex: 0 0 auto !important;
            min-height: 40px !important;
            padding: 0 12px !important;
          }

          .requestModal .formGrid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 12px !important;
            width: 100% !important;
          }

          .requestModal .field {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
          }

          .requestModal .field label {
            display: block !important;
            margin-bottom: 6px !important;
            font-size: 13px !important;
            font-weight: 800 !important;
          }

          .requestModal select,
          .requestModal input,
          .requestModal textarea,
          .requestModal .destinationNativeSelect {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: 50px !important;
            margin: 0 !important;
            padding-left: 12px !important;
            padding-right: 12px !important;
            box-sizing: border-box !important;
            font-size: 16px !important;
            border-radius: 12px !important;
          }

          .requestModal h3 {
            font-size: 20px !important;
          }

          .requestModal .requestProductTable {
            width: 100% !important;
            max-width: 100% !important;
            margin-top: 12px !important;
            border: 0 !important;
            border-radius: 0 !important;
            overflow: visible !important;
            background: transparent !important;
          }

          .requestProductTableHead {
            display: none !important;
          }

          .requestProductVisualRow,
          .requestFormProductRow {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 12px !important;
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            min-height: 0 !important;
            margin: 0 0 12px !important;
            padding: 14px !important;
            box-sizing: border-box !important;
            border: 1px solid #e4e7ec !important;
            border-radius: 14px !important;
            background: #ffffff !important;
          }

          .requestProductVisualRow > *,
          .requestFormProductRow > * {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
          }

          .requestProductVisualRow > div:first-child {
            display: grid !important;
            grid-template-columns: 58px minmax(0, 1fr) !important;
            gap: 10px !important;
            align-items: start !important;
          }

          .requestProductPhoto {
            width: 58px !important;
            height: 58px !important;
            border-radius: 10px !important;
          }

          .requestProductVisualRow select {
            width: 100% !important;
            min-height: 48px !important;
          }

          .requestProductVisualRow input[type="number"] {
            width: 100% !important;
            min-height: 48px !important;
          }

          .requestProductVisualRow > div:last-child {
            display: block !important;
          }

          .requestProductVisualRow > div:last-child button {
            width: 100% !important;
            min-height: 46px !important;
          }

          .requestModal .requestModalActions {
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 2050 !important;
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 8px !important;
            width: 100vw !important;
            margin: 0 !important;
            padding:
              10px
              12px
              calc(10px + env(safe-area-inset-bottom)) !important;
            box-sizing: border-box !important;
            background: rgba(255,255,255,.98) !important;
            border-top: 1px solid #e4e7ec !important;
            box-shadow: 0 -8px 24px rgba(15,23,42,.10) !important;
          }

          .requestModal .requestModalActions button {
            width: 100% !important;
            min-height: 48px !important;
            font-size: 14px !important;
          }

          /* Annuler plus discret sur téléphone */
          .requestModal .requestModalActions .secondary {
            min-height: 42px !important;
          }
        }
      `}</style>

    </Page>
  )
}