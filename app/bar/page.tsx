'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import {
  useProducts,
  useRequests,
  useStockMovements,
} from '@/lib/store'

import {
  decreaseProductStock,
} from '@/lib/stock-engine'

import type {
  InternalRequest,
  Product,
  RequestLineTreatmentStatus,
} from '@/lib/types'

type FilterMode =
  | 'A traiter'
  | 'Toutes'
  | 'Partielles'
  | 'Livrées'

type TreatmentLine = {
  lineIndex: number
  productId: string
  sourceLocation: string
  quantity: number
  status: RequestLineTreatmentStatus
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function formatDate(value?: string) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('fr-FR')
}

function statusClass(status: string) {
  if (status === 'Livrée') return 'delivered'
  if (status === 'Partielle') return 'partial'
  if (status === 'Préparation') return 'preparation'
  if (status === 'Validée') return 'validated'
  if (status === 'Envoyée') return 'sent'

  return 'neutral'
}

function lineStatusLabel(
  status?: RequestLineTreatmentStatus
) {
  if (status === 'fulfilled') {
    return 'SERVI COMPLET'
  }

  if (status === 'partial') {
    return 'PARTIEL'
  }

  if (status === 'out_of_stock') {
    return 'OUT OF STOCK'
  }

  return 'À TRAITER'
}

export default function BarPage() {
  const {
    items: requests,
    save: saveRequests,
  } = useRequests()

  const {
    items: products,
    save: saveProducts,
  } = useProducts()

  const {
    items: stockMovements,
    save: saveStockMovements,
  } = useStockMovements()

  const [filter, setFilter] =
    useState<FilterMode>('A traiter')

  const [treatingId, setTreatingId] =
    useState('')

  const [treatmentOpen, setTreatmentOpen] =
    useState(false)

  const [
    treatmentLines,
    setTreatmentLines,
  ] = useState<TreatmentLine[]>([])

  const [message, setMessage] =
    useState('')

  const [error, setError] =
    useState('')

  const [modalError, setModalError] =
    useState('')

  const currentRequest =
    useMemo(
      () =>
        requests.find(
          (request) =>
            request.id === treatingId
        ),
      [requests, treatingId]
    )

  /*
   * Une réquisition est encore à traiter
   * tant qu'elle n'a pas stockAppliedAt.
   *
   * Même une réquisition PARTIELLE sera
   * considérée comme terminée dès qu'elle
   * aura été validée depuis Bar Nuku.
   */
  const requestsToTreat =
    useMemo(
      () =>
        requests.filter(
          (request) =>
            !request.stockAppliedAt &&
            request.status !== 'Livrée' &&
            request.status !== 'Brouillon'
        ),
      [requests]
    )

  const filteredRequests =
    useMemo(() => {
      const sorted =
        [...requests].sort(
          (a, b) =>
            String(
              b.createdAt
            ).localeCompare(
              String(a.createdAt)
            )
        )

      if (filter === 'Toutes') {
        return sorted
      }

      if (filter === 'Livrées') {
        return sorted.filter(
          (request) =>
            request.status === 'Livrée'
        )
      }

      if (filter === 'Partielles') {
        return sorted.filter(
          (request) =>
            request.status ===
            'Partielle'
        )
      }

      return sorted.filter(
        (request) =>
          !request.stockAppliedAt &&
          request.status !== 'Livrée' &&
          request.status !== 'Brouillon'
      )
    }, [requests, filter])

  const getProduct = (
    productId: string
  ): Product | undefined =>
    products.find(
      (product) =>
        product.id === productId
    )

  /*
   * Liste les stocks disponibles
   * du produit par lieu.
   */
  const getLocationsForProduct = (
    productId: string
  ) => {
    const product =
      getProduct(productId)

    if (!product) {
      return []
    }

    const quantities =
      new Map<string, number>()

    product.lots.forEach((lot) => {
      const location =
        lot.location?.trim()

      if (!location) return

      quantities.set(
        location,
        (quantities.get(location) ||
          0) +
          Number(lot.quantity || 0)
      )
    })

    return Array.from(
      quantities.entries()
    )
      .map(
        ([location, quantity]) => ({
          location,
          quantity,
        })
      )
      .sort((a, b) => {
        /*
         * Stock > 0 en premier.
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
            sensitivity: 'base',
          }
        )
      })
  }

  const getAvailableQuantity = (
    productId: string,
    location: string
  ) => {
    const target =
      normalize(location)

    return (
      getLocationsForProduct(
        productId
      ).find(
        (item) =>
          normalize(
            item.location
          ) === target
      )?.quantity || 0
    )
  }

  const getTreatmentLine = (
    lineIndex: number
  ) =>
    treatmentLines.find(
      (line) =>
        line.lineIndex === lineIndex
    )

  /*
   * Ouvre la réquisition.
   */
  const openTreatment = (
    request: InternalRequest
  ) => {
    setError('')
    setModalError('')
    setMessage('')

    if (request.stockAppliedAt) {
      setError(
        'Cette réquisition est déjà traitée.'
      )
      return
    }

    const initial =
      request.items.map(
        (line, lineIndex) => {
          const locations =
            getLocationsForProduct(
              line.productId
            )

          const firstWithStock =
            locations.find(
              (location) =>
                location.quantity > 0
            )

          return {
            lineIndex,

            productId:
              line.productId,

            sourceLocation:
              line.sourceLocation ||
              firstWithStock
                ?.location ||
              request.sourceLocation ||
              '',

            /*
             * On ne considère rien comme
             * livré avant que le barman
             * choisisse son action.
             */
            quantity:
              line.delivered || 0,

            status:
              line.treatmentStatus ||
              ('pending' as const),
          }
        }
      )

    setTreatmentLines(initial)
    setTreatingId(request.id)
    setTreatmentOpen(true)
  }

  const closeTreatment = () => {
    setTreatmentOpen(false)
    setTreatingId('')
    setTreatmentLines([])
    setError('')
    setModalError('')
  }

  const updateTreatment = (
    lineIndex: number,
    patch: Partial<TreatmentLine>
  ) => {
    setTreatmentLines(
      (current) =>
        current.map((line) =>
          line.lineIndex === lineIndex
            ? {
                ...line,
                ...patch,
              }
            : line
        )
    )
  }

  /*
   * SERVI COMPLET
   */
  const setFull = (
    lineIndex: number,
    requested: number
  ) => {
    updateTreatment(
      lineIndex,
      {
        quantity: requested,
        status: 'fulfilled',
      }
    )
  }

  /*
   * PARTIEL
   */
  const setPartial = (
    lineIndex: number,
    requested: number,
    available: number
  ) => {
    const existing =
      getTreatmentLine(lineIndex)

    let quantity =
      existing?.quantity || 0

    /*
     * Préremplit avec le stock disponible
     * si cela constitue réellement un partiel.
     */
    if (
      quantity <= 0 ||
      quantity >= requested
    ) {
      quantity = Math.min(
        available,
        Math.max(
          0,
          requested - 1
        )
      )
    }

    updateTreatment(
      lineIndex,
      {
        quantity,
        status: 'partial',
      }
    )
  }

  /*
   * OUT OF STOCK
   *
   * Aucun mouvement de stock.
   * Quantité donnée = 0.
   */
  const setOutOfStock = (
    lineIndex: number
  ) => {
    updateTreatment(
      lineIndex,
      {
        quantity: 0,
        status: 'out_of_stock',
      }
    )
  }

  /*
   * Contrôle toutes les lignes
   * avant l'application au stock.
   */
  const validateTreatmentLines = () => {
    if (!currentRequest) {
      return {
        ok: false,
        message: 'Réquisition introuvable.',
        hasNonFullLine: false,
      }
    }

    if (currentRequest.stockAppliedAt) {
      return {
        ok: false,
        message: 'Cette réquisition est déjà traitée.',
        hasNonFullLine: false,
      }
    }

    let hasNonFullLine = false

    for (
      let index = 0;
      index < currentRequest.items.length;
      index += 1
    ) {
      const requestLine =
        currentRequest.items[index]

      const treatment =
        getTreatmentLine(index)

      if (!treatment) {
        return {
          ok: false,
          message:
            `Ligne introuvable pour ${requestLine.productName}.`,
          hasNonFullLine,
        }
      }

      const requested =
        requestLine.approved > 0
          ? requestLine.approved
          : requestLine.requested

      /*
       * Chaque ligne doit simplement avoir
       * une décision finale.
       */
      if (
        treatment.status === 'pending'
      ) {
        return {
          ok: false,
          message:
            `Choisis Servi complet, Partiel ou Out of stock pour ${requestLine.productName}.`,
          hasNonFullLine,
        }
      }

      /*
       * OUT OF STOCK = ligne traitée.
       * Rien à sortir du stock.
       */
      if (
        treatment.status ===
        'out_of_stock'
      ) {
        hasNonFullLine = true
        continue
      }

      if (!treatment.sourceLocation) {
        return {
          ok: false,
          message:
            `Choisis le lieu source pour ${requestLine.productName}.`,
          hasNonFullLine,
        }
      }

      const available =
        getAvailableQuantity(
          requestLine.productId,
          treatment.sourceLocation
        )

      /*
       * SERVI COMPLET
       */
      if (
        treatment.status ===
        'fulfilled'
      ) {
        if (
          treatment.quantity !==
          requested
        ) {
          return {
            ok: false,
            message:
              `${requestLine.productName} doit être servi à ${requested} pour être marqué Servi complet.`,
            hasNonFullLine,
          }
        }
      }

      /*
       * PARTIEL = ligne traitée dès qu'une
       * quantité > 0 et < quantité demandée
       * est renseignée.
       */
      if (
        treatment.status ===
        'partial'
      ) {
        hasNonFullLine = true

        if (
          treatment.quantity <= 0
        ) {
          return {
            ok: false,
            message:
              `${requestLine.productName} : saisis une quantité réellement donnée, ou utilise Out of stock.`,
            hasNonFullLine,
          }
        }

        if (
          treatment.quantity >=
          requested
        ) {
          return {
            ok: false,
            message:
              `${requestLine.productName} : pour une quantité égale à ${requested}, utilise Servi complet.`,
            hasNonFullLine,
          }
        }
      }

      if (
        treatment.quantity >
        available
      ) {
        return {
          ok: false,
          message:
            `${requestLine.productName} : stock insuffisant à ${treatment.sourceLocation}. Disponible : ${available}, sortie : ${treatment.quantity}.`,
          hasNonFullLine,
        }
      }

      if (
        treatment.quantity >
        requested
      ) {
        return {
          ok: false,
          message:
            `${requestLine.productName} : maximum autorisé ${requested}.`,
          hasNonFullLine,
        }
      }
    }

    return {
      ok: true,
      message: '',
      hasNonFullLine,
    }
  }

  /*
   * Applique réellement les sorties
   * de stock puis clôture la demande.
   */
  const confirmTreatment = () => {
    setError('')
    setModalError('')
    setMessage('')

    const validation =
      validateTreatmentLines()

    if (!validation.ok) {
      setModalError(
        validation.message
      )
      return
    }

    if (!currentRequest) {
      return
    }

    const finalStatus =
      validation.hasNonFullLine
        ? ('Partielle' as const)
        : ('Livrée' as const)

    const timestamp =
      new Date().toISOString()

    const destination =
      currentRequest
        .destinationLocation ||
      'Destination'

    let nextProducts =
      products

    const newMovements = []

    for (
      let index = 0;
      index < currentRequest.items.length;
      index += 1
    ) {
      const requestLine =
        currentRequest.items[index]

      const treatment =
        getTreatmentLine(index)

      if (!treatment) continue

      /*
       * OUT OF STOCK = traité,
       * mais aucune déduction.
       */
      if (
        treatment.status ===
          'out_of_stock' ||
        treatment.quantity <= 0
      ) {
        continue
      }

      const result =
        decreaseProductStock(
          nextProducts,
          requestLine.productId,
          treatment.sourceLocation,
          treatment.quantity,
          {
            type: 'REQUISITION',
            fromLocation:
              treatment.sourceLocation,
            toLocation:
              destination,
            referenceType: 'request',
            referenceId:
              currentRequest.id,
            note:
              `Réquisition ${currentRequest.service}`,
          }
        )

      if (!result.ok) {
        setModalError(
          result.message ||
            `Impossible de sortir ${requestLine.productName}.`
        )
        return
      }

      nextProducts =
        result.products

      newMovements.push(
        ...result.movements
      )
    }

    const updatedRequests =
      requests.map(
        (request) => {
          if (
            request.id !==
            currentRequest.id
          ) {
            return request
          }

          const updatedItems =
            request.items.map(
              (
                requestLine,
                index
              ) => {
                const treatment =
                  getTreatmentLine(index)

                if (!treatment) {
                  return requestLine
                }

                return {
                  ...requestLine,

                  delivered:
                    treatment.quantity,

                  sourceLocation:
                    treatment.status ===
                    'out_of_stock'
                      ? requestLine
                          .sourceLocation
                      : treatment
                          .sourceLocation,

                  treatmentStatus:
                    treatment.status,

                  treatedAt:
                    timestamp,

                  treatmentNote:
                    treatment.status ===
                    'out_of_stock'
                      ? 'OUT OF STOCK'
                      : treatment.status ===
                        'partial'
                      ? 'Servi partiellement'
                      : 'Servi complètement',
                }
              }
            )

          return {
            ...request,

            /*
             * Si tout est complet => Livrée.
             * Sinon => Partielle.
             *
             * Dans les deux cas, la demande
             * est considérée comme TRAITÉE.
             */
            status: finalStatus,

            deliveredAt:
              timestamp,

            stockAppliedAt:
              timestamp,

            items:
              updatedItems,
          }
        }
      )

    saveProducts(nextProducts)

    if (newMovements.length > 0) {
      saveStockMovements([
        ...stockMovements,
        ...newMovements,
      ])
    }

    saveRequests(updatedRequests)

    /*
     * Fermeture immédiate après validation.
     */
    setTreatmentOpen(false)
    setTreatingId('')
    setTreatmentLines([])
    setError('')
    setModalError('')

    setMessage(
      finalStatus === 'Livrée'
        ? `Réquisition ${currentRequest.id} livrée complètement et clôturée.`
        : `Réquisition ${currentRequest.id} traitée partiellement et clôturée.`
    )
  }

  return (
    <main className="barPage">
      <section className="barHero">
        <div className="heroIdentity">
          <img
            src="/bar-nuku-192.png"
            alt="Bar Nuku"
            className="barLogo"
          />

          <div>
            <span className="eyebrow">
              NUKUTEPIPI
            </span>

            <h1>
              Bar Nuku
            </h1>

            <p>
              Portail de l’équipe Bar
            </p>
          </div>
        </div>

        <div className="status">
          <span className="statusDot" />

          {requestsToTreat.length}{' '}
          réquisition
          {requestsToTreat.length > 1
            ? 's'
            : ''}{' '}
          à traiter
        </div>
      </section>

      {message && (
        <div className="notice success">
          {message}
        </div>
      )}

      {error && (
        <div className="notice error">
          {error}
        </div>
      )}

      <section className="quickLinks">
        <Link
          href="/planning-bar"
          className="quickCard"
        >
          <span className="quickIcon">
            ▦
          </span>

          <div>
            <strong>
              Planning
            </strong>

            <span>
              Planning de l’équipe
            </span>
          </div>

          <b>→</b>
        </Link>

        <Link
          href="/setup"
          className="quickCard"
        >
          <span className="quickIcon">
            ◫
          </span>

          <div>
            <strong>
              SET UP
            </strong>

            <span>
              Fiches des bars
            </span>
          </div>

          <b>→</b>
        </Link>
      </section>

      <section className="requestSection">
        <div className="sectionHeader">
          <div>
            <span className="sectionEyebrow">
              OPÉRATIONS
            </span>

            <h2>
              Réquisitions
            </h2>

            <p>
              Consulter, préparer et
              clôturer les demandes.
            </p>
          </div>

          <div className="requestCounter">
            {requestsToTreat.length}

            <span>
              à traiter
            </span>
          </div>
        </div>

        <div className="filters">
          {(
            [
              'A traiter',
              'Toutes',
              'Partielles',
              'Livrées',
            ] as FilterMode[]
          ).map((item) => (
            <button
              key={item}
              type="button"
              className={
                filter === item
                  ? 'filter active'
                  : 'filter'
              }
              onClick={() =>
                setFilter(item)
              }
            >
              {item}
            </button>
          ))}
        </div>

        <div className="requestList">
          {filteredRequests.length ===
          0 ? (
            <div className="emptyState">
              <strong>
                Aucune réquisition
              </strong>

              <span>
                Aucune demande dans
                cette catégorie.
              </span>
            </div>
          ) : (
            filteredRequests.map(
              (request) => (
                <article
                  className="requestCard"
                  key={request.id}
                >
                  <div className="requestTop">
                    <div>
                      <span className="requestId">
                        {request.id}
                      </span>

                      <h3>
                        {request.service}
                      </h3>
                    </div>

                    <span
                      className={`requestStatus ${statusClass(
                        request.status
                      )}`}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="requestMeta">
                    <span>
                      <small>
                        Destination
                      </small>

                      <strong>
                        {request.destinationLocation ||
                          'Non définie'}
                      </strong>
                    </span>

                    <span>
                      <small>
                        Date
                      </small>

                      <strong>
                        {formatDate(
                          request.createdAt
                        )}
                      </strong>
                    </span>

                    <span>
                      <small>
                        Produits
                      </small>

                      <strong>
                        {
                          request.items
                            .length
                        }
                      </strong>
                    </span>
                  </div>

                  <div className="requestLines">
                    {request.items.map(
                      (
                        line,
                        index
                      ) => (
                        <div
                          className="requestLine"
                          key={`${line.productId}-${index}`}
                        >
                          <div className="requestProductName">
                            <strong>
                              {
                                line.productName
                              }
                            </strong>

                            {line.treatmentStatus &&
                              line.treatmentStatus !==
                                'pending' && (
                                <span
                                  className={`miniLineStatus ${line.treatmentStatus}`}
                                >
                                  {lineStatusLabel(
                                    line.treatmentStatus
                                  )}
                                </span>
                              )}
                          </div>

                          <div className="quantities">
                            <span>
                              Demandé
                              <b>
                                {
                                  line.requested
                                }
                              </b>
                            </span>

                            {typeof line.delivered ===
                              'number' && (
                              <span>
                                Donné
                                <b>
                                  {
                                    line.delivered
                                  }
                                </b>
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="requestActions">
                    {!request.stockAppliedAt &&
                    request.status !==
                      'Livrée' ? (
                      <button
                        type="button"
                        className="treatButton"
                        onClick={() =>
                          openTreatment(
                            request
                          )
                        }
                      >
                        Traiter la demande
                      </button>
                    ) : (
                      <div className="treatedLabel">
                        ✓ Demande traitée
                      </div>
                    )}
                  </div>
                </article>
              )
            )
          )}
        </div>
      </section>

      {treatmentOpen && currentRequest && (
        <div className="modalBackdrop">
          <div className="treatmentModal">
            <div className="modalHeader">
              <div>
                <span>
                  TRAITEMENT
                </span>

                <h2>
                  {currentRequest.id}
                </h2>

                <p>
                  {currentRequest.service}
                  {' → '}
                  {currentRequest.destinationLocation ||
                    'Destination non définie'}
                </p>
              </div>

              <button
                type="button"
                className="closeButton"
                onClick={
                  closeTreatment
                }
              >
                ×
              </button>
            </div>

            <div className="modalHelp">
              Pour chaque produit,
              indique ce qui a réellement
              été remis au service.
            </div>

            {modalError && (
              <div className="modalError">
                <strong>Action requise</strong>
                <span>{modalError}</span>
              </div>
            )}

            <div className="modalBody">
              {currentRequest.items.map(
                (
                  requestLine,
                  lineIndex
                ) => {
                  const treatment =
                    getTreatmentLine(
                      lineIndex
                    )

                  const locations =
                    getLocationsForProduct(
                      requestLine.productId
                    )

                  const available =
                    treatment
                      ?.sourceLocation
                      ? getAvailableQuantity(
                          requestLine.productId,
                          treatment.sourceLocation
                        )
                      : 0

                  const requested =
                    requestLine.approved >
                    0
                      ? requestLine.approved
                      : requestLine.requested

                  const isOut =
                    treatment?.status ===
                    'out_of_stock'

                  return (
                    <div
                      className={`treatmentProduct ${
                        treatment?.status ||
                        'pending'
                      }`}
                      key={`${requestLine.productId}-${lineIndex}`}
                    >
                      <div className="productHeader">
                        <div>
                          <strong>
                            {
                              requestLine.productName
                            }
                          </strong>

                          <span>
                            Demandé :{' '}
                            {requested}
                          </span>
                        </div>

                        <span className="requestedBadge">
                          × {requested}
                        </span>
                      </div>

                      <div className="lineActionButtons">
                        <button
                          type="button"
                          className={
                            treatment?.status ===
                            'fulfilled'
                              ? 'lineAction full active'
                              : 'lineAction full'
                          }
                          onClick={() =>
                            setFull(
                              lineIndex,
                              requested
                            )
                          }
                        >
                          ✓ Servi complet
                        </button>

                        <button
                          type="button"
                          className={
                            treatment?.status ===
                            'partial'
                              ? 'lineAction partialButton active'
                              : 'lineAction partialButton'
                          }
                          onClick={() =>
                            setPartial(
                              lineIndex,
                              requested,
                              available
                            )
                          }
                        >
                          ◐ Partiel
                        </button>

                        <button
                          type="button"
                          className={
                            treatment?.status ===
                            'out_of_stock'
                              ? 'lineAction out active'
                              : 'lineAction out'
                          }
                          onClick={() =>
                            setOutOfStock(
                              lineIndex
                            )
                          }
                        >
                          OUT OF STOCK
                        </button>
                      </div>

                      {!isOut && (
                        <>
                          <label>
                            <span>
                              Lieu de stock
                              source
                            </span>

                            <select
                              value={
                                treatment?.sourceLocation ||
                                ''
                              }
                              onChange={(
                                event
                              ) =>
                                updateTreatment(
                                  lineIndex,
                                  {
                                    sourceLocation:
                                      event
                                        .target
                                        .value,
                                  }
                                )
                              }
                            >
                              <option value="">
                                Choisir un lieu
                              </option>

                              {locations.map(
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
                                  >
                                    {
                                      location.location
                                    }{' '}
                                    —{' '}
                                    {
                                      location.quantity
                                    }{' '}
                                    disponible
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          <div className="availability">
                            <span>
                              Stock disponible
                            </span>

                            <strong>
                              {available}
                            </strong>
                          </div>
                        </>
                      )}

                      {treatment?.status ===
                        'partial' && (
                        <label>
                          <span>
                            Quantité réellement
                            donnée
                          </span>

                          <input
                            type="number"
                            min={1}
                            max={Math.max(
                              1,
                              Math.min(
                                requested -
                                  1,
                                available
                              )
                            )}
                            value={
                              treatment.quantity
                            }
                            onChange={(
                              event
                            ) =>
                              updateTreatment(
                                lineIndex,
                                {
                                  quantity:
                                    Math.max(
                                      0,
                                      Number(
                                        event
                                          .target
                                          .value
                                      ) ||
                                        0
                                    ),
                                }
                              )
                            }
                          />
                        </label>
                      )}

                      {treatment?.status ===
                        'fulfilled' && (
                        <div className="resultInfo fullInfo">
                          ✓ Quantité donnée :{' '}
                          <strong>
                            {requested}
                          </strong>
                        </div>
                      )}

                      {treatment?.status ===
                        'partial' && (
                        <div className="resultInfo partialInfo">
                          Quantité donnée :{' '}
                          <strong>
                            {
                              treatment.quantity
                            }
                          </strong>{' '}
                          / {requested}
                        </div>
                      )}

                      {isOut && (
                        <div className="resultInfo outInfo">
                          OUT OF STOCK —
                          quantité donnée :{' '}
                          <strong>
                            0
                          </strong>
                        </div>
                      )}
                    </div>
                  )
                }
              )}
            </div>

            <div className="modalFooter">
              <button
                type="button"
                className="cancelButton"
                onClick={
                  closeTreatment
                }
              >
                Annuler
              </button>

              <button
                type="button"
                className="confirmButton"
                onClick={
                  confirmTreatment
                }
              >
                Valider et clôturer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .barPage {
          min-height: 100vh;
          padding: 28px;
          background: #f4f6f9;
          color: #101828;
        }

        .barHero,
        .quickLinks,
        .requestSection,
        .notice {
          width: 100%;
          max-width: 1120px;
          margin-left: auto;
          margin-right: auto;
        }

        .barHero {
          margin-bottom: 16px;
          padding: 24px 28px;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background:
            linear-gradient(
              135deg,
              #0b1020,
              #17102a
            );
          color: #fff;
          box-shadow:
            0 16px 40px
            rgba(15,23,42,.15);
        }

        .heroIdentity {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .barLogo {
          width: 76px;
          height: 76px;
          border-radius: 18px;
          object-fit: cover;
        }

        .eyebrow,
        .sectionEyebrow {
          display: block;
          color: #a78bfa;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .13em;
        }

        .barHero h1 {
          margin: 4px 0 0;
          font-size: 32px;
        }

        .barHero p {
          margin: 6px 0 0;
          color: #cbd5e1;
          font-size: 13px;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border: 1px solid
            rgba(255,255,255,.12);
          border-radius: 999px;
          background:
            rgba(255,255,255,.07);
          font-size: 12px;
          font-weight: 800;
        }

        .statusDot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #22c55e;
        }

        .notice {
          margin-bottom: 14px;
          padding: 13px 16px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .notice.success {
          background: #ecfdf3;
          border: 1px solid #abefc6;
          color: #067647;
        }

        .notice.error {
          background: #fef3f2;
          border: 1px solid #fecdca;
          color: #b42318;
        }

        .quickLinks {
          margin-bottom: 16px;
          display: grid;
          grid-template-columns:
            repeat(2,minmax(0,1fr));
          gap: 12px;
        }

        .quickCard {
          padding: 15px 17px;
          border: 1px solid #e4e7ec;
          border-radius: 16px;
          display: grid;
          grid-template-columns:
            42px minmax(0,1fr) auto;
          align-items: center;
          gap: 12px;
          background: #fff;
          color: #101828;
          text-decoration: none;
        }

        .quickIcon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: #f4f0ff;
          color: #7c3aed;
        }

        .quickCard div {
          display: flex;
          flex-direction: column;
        }

        .quickCard strong {
          font-size: 13px;
        }

        .quickCard span:not(.quickIcon) {
          margin-top: 3px;
          color: #667085;
          font-size: 10px;
        }

        .requestSection {
          padding: 22px;
          border: 1px solid #e4e7ec;
          border-radius: 20px;
          background: #fff;
        }

        .sectionHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .sectionHeader h2 {
          margin: 5px 0 0;
          font-size: 23px;
        }

        .sectionHeader p {
          margin: 5px 0 0;
          color: #667085;
          font-size: 11px;
        }

        .requestCounter {
          min-width: 72px;
          padding: 10px;
          border-radius: 13px;
          background: #f4f0ff;
          color: #6d28d9;
          text-align: center;
          font-size: 23px;
          font-weight: 900;
        }

        .requestCounter span {
          display: block;
          font-size: 8px;
          text-transform: uppercase;
        }

        .filters {
          margin-top: 18px;
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }

        .filter {
          padding: 8px 12px;
          border: 1px solid #e4e7ec;
          border-radius: 999px;
          background: #fff;
          color: #667085;
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }

        .filter.active {
          border-color: #7c3aed;
          background: #7c3aed;
          color: #fff;
        }

        .requestList {
          margin-top: 16px;
          display: grid;
          gap: 12px;
        }

        .requestCard {
          padding: 17px;
          border: 1px solid #e4e7ec;
          border-radius: 16px;
          background: #fcfcfd;
        }

        .requestTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .requestId {
          color: #7c3aed;
          font-size: 10px;
          font-weight: 900;
        }

        .requestTop h3 {
          margin: 4px 0 0;
          font-size: 16px;
        }

        .requestStatus {
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .requestStatus.sent {
          background: #eff8ff;
          color: #175cd3;
        }

        .requestStatus.validated,
        .requestStatus.delivered {
          background: #ecfdf3;
          color: #067647;
        }

        .requestStatus.preparation {
          background: #fff6ed;
          color: #c4320a;
        }

        .requestStatus.partial {
          background: #fffaeb;
          color: #b54708;
        }

        .requestStatus.neutral {
          background: #f2f4f7;
          color: #475467;
        }

        .requestMeta {
          margin-top: 14px;
          padding: 11px 0;
          border-top: 1px solid #eaecf0;
          border-bottom: 1px solid #eaecf0;
          display: grid;
          grid-template-columns:
            2fr 1fr 1fr;
          gap: 10px;
        }

        .requestMeta > span {
          display: flex;
          flex-direction: column;
        }

        .requestMeta small {
          color: #98a2b3;
          font-size: 8px;
        }

        .requestMeta strong {
          margin-top: 3px;
          font-size: 11px;
        }

        .requestLines {
          margin-top: 10px;
        }

        .requestLine {
          padding: 9px 0;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          border-bottom:
            1px solid #f2f4f7;
        }

        .requestProductName {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .requestLine strong {
          font-size: 11px;
        }

        .miniLineStatus {
          width: fit-content;
          padding: 3px 6px;
          border-radius: 6px;
          font-size: 7px;
          font-weight: 900;
        }

        .miniLineStatus.fulfilled {
          background: #ecfdf3;
          color: #067647;
        }

        .miniLineStatus.partial {
          background: #fffaeb;
          color: #b54708;
        }

        .miniLineStatus.out_of_stock {
          background: #fef3f2;
          color: #b42318;
        }

        .quantities {
          display: flex;
          gap: 8px;
        }

        .quantities span {
          padding: 5px 7px;
          border-radius: 8px;
          background: #f2f4f7;
          color: #667085;
          font-size: 8px;
        }

        .quantities b {
          margin-left: 4px;
          color: #101828;
          font-size: 11px;
        }

        .requestActions {
          margin-top: 13px;
          display: flex;
          justify-content: flex-end;
        }

        .treatButton {
          min-height: 40px;
          padding: 0 16px;
          border: 0;
          border-radius: 11px;
          background: #7c3aed;
          color: #fff;
          cursor: pointer;
          font-size: 11px;
          font-weight: 900;
        }

        .treatedLabel {
          color: #067647;
          font-size: 10px;
          font-weight: 800;
        }

        .emptyState {
          padding: 50px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #667085;
        }

        .modalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          padding: 20px;
          display: grid;
          place-items: center;
          background: rgba(15,23,42,.58);
        }

        .treatmentModal {
          width: min(760px,100%);
          max-height:
            calc(100dvh - 40px);
          overflow: hidden;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          background: #fff;
        }

        .modalHeader {
          padding: 19px 20px;
          display: flex;
          justify-content: space-between;
          gap: 15px;
          border-bottom:
            1px solid #eaecf0;
        }

        .modalHeader span {
          color: #7c3aed;
          font-size: 9px;
          font-weight: 900;
        }

        .modalHeader h2 {
          margin: 4px 0 0;
          font-size: 20px;
        }

        .modalHeader p {
          margin: 4px 0 0;
          color: #667085;
          font-size: 10px;
        }

        .closeButton {
          width: 38px;
          height: 38px;
          border: 1px solid #e4e7ec;
          border-radius: 10px;
          background: #fff;
          cursor: pointer;
          font-size: 22px;
        }

        .modalHelp {
          padding: 10px 20px;
          background: #f9fafb;
          border-bottom:
            1px solid #eaecf0;
          color: #667085;
          font-size: 10px;
        }

        .modalError {
          margin: 12px 20px 0;
          padding: 11px 13px;
          border: 1px solid #fecdca;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          background: #fef3f2;
          color: #b42318;
          font-size: 10px;
        }

        .modalError strong {
          font-size: 10px;
          font-weight: 900;
        }

        .modalError span {
          line-height: 1.4;
        }

        .modalBody {
          padding: 16px 20px;
          overflow-y: auto;
        }

        .treatmentProduct {
          padding: 15px;
          margin-bottom: 12px;
          border: 1px solid #e4e7ec;
          border-radius: 14px;
          background: #fcfcfd;
        }

        .treatmentProduct.fulfilled {
          border-color: #abefc6;
        }

        .treatmentProduct.partial {
          border-color: #fedf89;
        }

        .treatmentProduct.out_of_stock {
          border-color: #6ce9a6;
          background: #f6fef9;
        }

        .productHeader {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .productHeader > div {
          display: flex;
          flex-direction: column;
        }

        .productHeader strong {
          font-size: 13px;
        }

        .productHeader span {
          margin-top: 3px;
          color: #667085;
          font-size: 9px;
        }

        .requestedBadge {
          padding: 6px 9px;
          border-radius: 9px;
          background: #f4f0ff;
          color: #6d28d9 !important;
          font-size: 12px !important;
          font-weight: 900;
        }

        .lineActionButtons {
          margin-top: 14px;
          display: grid;
          grid-template-columns:
            repeat(3,1fr);
          gap: 7px;
        }

        .lineAction {
          min-height: 38px;
          padding: 6px 8px;
          border: 1px solid #d0d5dd;
          border-radius: 9px;
          background: #fff;
          cursor: pointer;
          font-size: 9px;
          font-weight: 900;
        }

        .lineAction.full.active {
          border-color: #079455;
          background: #ecfdf3;
          color: #067647;
        }

        .lineAction.partialButton.active {
          border-color: #dc6803;
          background: #fffaeb;
          color: #b54708;
        }

        .lineAction.out {
          color: #b42318;
        }

        .lineAction.out.active {
          border-color: #12b76a;
          background: #ecfdf3;
          color: #027a48;
        }

        .treatmentProduct label {
          margin-top: 13px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .treatmentProduct label > span,
        .availability span {
          color: #667085;
          font-size: 9px;
          font-weight: 800;
        }

        .treatmentProduct select,
        .treatmentProduct input {
          width: 100%;
          min-height: 44px;
          padding: 0 11px;
          border: 1px solid #d0d5dd;
          border-radius: 10px;
          background: #fff;
          color: #101828;
        }

        .availability {
          margin-top: 8px;
          padding: 8px 10px;
          border-radius: 9px;
          display: flex;
          justify-content: space-between;
          background: #f2f4f7;
        }

        .resultInfo {
          margin-top: 9px;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 9px;
          font-weight: 700;
        }

        .fullInfo {
          background: #ecfdf3;
          color: #067647;
        }

        .partialInfo {
          background: #fffaeb;
          color: #b54708;
        }

        .outInfo {
          background: #ecfdf3;
          color: #027a48;
        }

        .modalFooter {
          padding: 15px 20px;
          border-top: 1px solid #eaecf0;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .cancelButton,
        .confirmButton {
          min-height: 42px;
          padding: 0 15px;
          border-radius: 11px;
          cursor: pointer;
          font-size: 10px;
          font-weight: 900;
        }

        .cancelButton {
          border: 1px solid #d0d5dd;
          background: #fff;
          color: #344054;
        }

        .confirmButton {
          border: 0;
          background: #7c3aed;
          color: #fff;
        }

        @media (max-width: 760px) {
          .barPage {
            padding: 12px;
          }

          .barHero {
            padding: 17px;
            flex-direction: column;
            align-items: flex-start;
          }

          .barLogo {
            width: 58px;
            height: 58px;
          }

          .quickLinks {
            grid-template-columns:
              1fr 1fr;
          }

          .requestSection {
            padding: 14px;
          }

          .requestMeta {
            grid-template-columns:
              1fr 1fr;
          }

          .requestLine {
            flex-direction: column;
          }

          .quantities {
            width: 100%;
          }

          .quantities span {
            flex: 1;
          }

          .treatButton {
            width: 100%;
          }

          .modalBackdrop {
            padding: 0;
            place-items: end center;
          }

          .treatmentModal {
            width: 100%;
            max-height: 94dvh;
            border-radius:
              20px 20px 0 0;
          }

          .modalBody {
            padding: 13px;
          }

          .lineActionButtons {
            grid-template-columns: 1fr;
          }

          .modalFooter {
            padding:
              12px
              13px
              calc(
                12px +
                env(
                  safe-area-inset-bottom
                )
              );
            display: grid;
            grid-template-columns:
              1fr;
          }

          .cancelButton,
          .confirmButton {
            width: 100%;
          }
        }
      `}</style>
    </main>
  )
}