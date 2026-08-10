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
    useMemo(() => {
      const map =
        new Map<
          string,
          string
        >()

      for (
        const location of
        centralLocations
      ) {
        map.set(
          normalizeLocation(
            location
          ),
          location
        )
      }

      for (
        const product of
        products
      ) {
        for (
          const lot of
          product.lots
        ) {
          const location =
            lot.location?.trim()

          if (!location) {
            continue
          }

          const key =
            normalizeLocation(
              location
            )

          if (!map.has(key)) {
            map.set(
              key,
              location
            )
          }
        }
      }

      return [
        ...map.values(),
      ].sort((a, b) =>
        a.localeCompare(
          b,
          'fr',
          {
            numeric: true,
            sensitivity:
              'base',
          }
        )
      )
    }, [
      centralLocations,
      products,
    ])

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
          products[0]?.id ||
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

    setDestination(
      allKnownLocations[0] ||
        ''
    )

    setLines([
      {
        productId:
          products[0]?.id ||
          '',
        qty: 1,
      },
    ])
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
    setDestination(
      request.destinationLocation ||
        ''
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

  const deleteRequest = (
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

    save(
      items.filter(
        (item) =>
          item.id !==
          request.id
      )
    )

    setError('')
    setMsg(
      `Réquisition ${request.id} supprimée.`
    )
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
        <button
          className="button"
          onClick={
            openNewRequest
          }
        >
          + Nouvelle réquisition
        </button>
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
                    <button
                      className="button"
                      onClick={() =>
                        openTreatment(
                          request
                        )
                      }
                    >
                      Traiter / choisir le stock source
                    </button>
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
        <div className="modalBackdrop">
          <div className="modal">
            <div className="modalHead">
              <h2>
                {editingRequestId
                  ? `Modifier ${editingRequestId}`
                  : 'Nouvelle réquisition'}
              </h2>

              <button
                className="button secondary small"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
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
                  value={
                    destination
                  }
                  onChange={(e) =>
                    setDestination(
                      e.target.value
                    )
                  }
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

            <div
              style={{
                marginTop: 20,
                padding: 12,
                borderRadius:
                  10,
                background:
                  'rgba(59,130,246,.08)',
                fontSize: 12,
              }}
            >
              Le lieu source est choisi au moment du traitement. Les lieux réellement présents dans le stock restent disponibles même s'ils ne figurent pas encore dans le référentiel central.
            </div>

            <div
              style={{
                marginTop: 20,
                display:
                  'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                gap: 10,
              }}
            >
              <h3
                style={{
                  margin: 0,
                }}
              >
                Produits demandés
              </h3>

              <button
                className="button secondary small"
                type="button"
                onClick={add}
              >
                + Ajouter un produit
              </button>
            </div>

            <div
              style={{
                marginTop: 12,
                display:
                  'flex',
                flexDirection:
                  'column',
                gap: 10,
              }}
            >
              {lines.map(
                (
                  line,
                  index
                ) => (
                  <div
                    key={
                      index
                    }
                    style={{
                      display:
                        'grid',
                      gridTemplateColumns:
                        '1fr 120px 90px',
                      gap: 10,
                      alignItems:
                        'end',
                    }}
                  >
                    <div className="field">
                      <label>
                        Produit
                      </label>

                      <select
                        value={
                          line.productId
                        }
                        onChange={(e) =>
                          updateLine(
                            index,
                            {
                              productId:
                                e
                                  .target
                                  .value,
                            }
                          )
                        }
                      >
                        <option value="">
                          Choisir un produit
                        </option>

                        {[...products]
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
                    </div>

                    <div className="field">
                      <label>
                        Quantité
                      </label>

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
                                    e
                                      .target
                                      .value
                                  ) ||
                                    1
                                ),
                            }
                          )
                        }
                      />
                    </div>

                    <button
                      className="button secondary small"
                      type="button"
                      disabled={
                        lines.length <=
                        1
                      }
                      onClick={() =>
                        remove(
                          index
                        )
                      }
                    >
                      Retirer
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="actions">
              <button
                className="button secondary"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
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
    </Page>
  )
}