'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import {
  moveProductStock,
  useProducts,
  useRequests,
} from '@/lib/store'

import type {
  InternalRequest,
  Product,
} from '@/lib/types'

type FilterMode =
  | 'A traiter'
  | 'Toutes'
  | 'Partielles'
  | 'Livrées'

type TreatmentLine = {
  productId: string
  sourceLocation: string
  quantity: number
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

export default function BarPage() {
  const {
    items: requests,
    save: saveRequests,
  } = useRequests()

  const {
    items: products,
    save: saveProducts,
  } = useProducts()

  const [filter, setFilter] =
    useState<FilterMode>('A traiter')

  const [treatingId, setTreatingId] =
    useState<string>('')

  const [
    treatmentLines,
    setTreatmentLines,
  ] = useState<TreatmentLine[]>([])

  const [message, setMessage] =
    useState('')

  const [error, setError] =
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
      const sorted = [...requests].sort(
        (a, b) =>
          String(b.createdAt).localeCompare(
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
            request.status === 'Partielle'
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

  const getLocationsForProduct = (
    productId: string
  ) => {
    const product =
      getProduct(productId)

    if (!product) return []

    const quantities =
      new Map<string, number>()

    product.lots.forEach((lot) => {
      const location =
        lot.location?.trim()

      if (!location) return

      quantities.set(
        location,
        (quantities.get(location) || 0) +
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

    return getLocationsForProduct(
      productId
    ).find(
      (item) =>
        normalize(item.location) ===
        target
    )?.quantity || 0
  }

  const openTreatment = (
    request: InternalRequest
  ) => {
    setError('')
    setMessage('')

    if (request.stockAppliedAt) {
      setError(
        'Cette réquisition a déjà été appliquée au stock.'
      )
      return
    }

    const initial =
      request.items.map((line) => {
        const locations =
          getLocationsForProduct(
            line.productId
          )

        const firstWithStock =
          locations.find(
            (location) =>
              location.quantity > 0
          )

        const requestedQuantity =
          line.approved > 0
            ? line.approved
            : line.requested

        return {
          productId:
            line.productId,

          sourceLocation:
            firstWithStock?.location ||
            request.sourceLocation ||
            '',

          quantity:
            requestedQuantity,
        }
      })

    setTreatmentLines(initial)
    setTreatingId(request.id)
  }

  const closeTreatment = () => {
    setTreatingId('')
    setTreatmentLines([])
    setError('')
  }

  const updateTreatment = (
    productId: string,
    patch: Partial<TreatmentLine>
  ) => {
    setTreatmentLines(
      (current) =>
        current.map((line) =>
          line.productId === productId
            ? {
                ...line,
                ...patch,
              }
            : line
        )
    )
  }

  const confirmTreatment = () => {
    setError('')
    setMessage('')

    if (!currentRequest) {
      setError(
        'Réquisition introuvable.'
      )
      return
    }

    if (currentRequest.stockAppliedAt) {
      setError(
        'Cette réquisition a déjà été traitée.'
      )
      return
    }

    for (
      const requestLine of
      currentRequest.items
    ) {
      const treatment =
        treatmentLines.find(
          (line) =>
            line.productId ===
            requestLine.productId
        )

      if (!treatment) {
        setError(
          `Ligne introuvable pour ${requestLine.productName}.`
        )
        return
      }

      if (!treatment.sourceLocation) {
        setError(
          `Choisis le lieu source pour ${requestLine.productName}.`
        )
        return
      }

      if (
        !Number.isFinite(
          treatment.quantity
        ) ||
        treatment.quantity < 0
      ) {
        setError(
          `Quantité invalide pour ${requestLine.productName}.`
        )
        return
      }

      const available =
        getAvailableQuantity(
          requestLine.productId,
          treatment.sourceLocation
        )

      if (
        treatment.quantity >
        available
      ) {
        setError(
          `${requestLine.productName} : stock insuffisant à ${treatment.sourceLocation}. Disponible : ${available}, sortie demandée : ${treatment.quantity}.`
        )
        return
      }

      const maxRequested =
        requestLine.approved > 0
          ? requestLine.approved
          : requestLine.requested

      if (
        treatment.quantity >
        maxRequested
      ) {
        setError(
          `${requestLine.productName} : la quantité sortie ne peut pas dépasser ${maxRequested}.`
        )
        return
      }
    }

    let nextProducts =
      products

    let hasPartial = false

    const destination =
      currentRequest.destinationLocation ||
      'Destination'

    for (
      const requestLine of
      currentRequest.items
    ) {
      const treatment =
        treatmentLines.find(
          (line) =>
            line.productId ===
            requestLine.productId
        )

      if (!treatment) continue

      const requested =
        requestLine.approved > 0
          ? requestLine.approved
          : requestLine.requested

      if (
        treatment.quantity <
        requested
      ) {
        hasPartial = true
      }

      if (
        treatment.quantity === 0
      ) {
        continue
      }

      const result =
        moveProductStock(
          nextProducts,
          requestLine.productId,
          treatment.sourceLocation,
          destination,
          treatment.quantity
        )

      if (!result.ok) {
        setError(
          result.message ||
            `Impossible de sortir ${requestLine.productName}.`
        )
        return
      }

      nextProducts =
        result.products
    }

    const timestamp =
      new Date().toISOString()

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
              (requestLine) => {
                const treatment =
                  treatmentLines.find(
                    (line) =>
                      line.productId ===
                      requestLine.productId
                  )

                return {
                  ...requestLine,
                  approved:
                    treatment?.quantity ||
                    0,
                }
              }
            )

          return {
            ...request,

            status:
              hasPartial
                ? ('Partielle' as const)
                : ('Livrée' as const),

            deliveredAt:
              hasPartial
                ? request.deliveredAt
                : timestamp,

            stockAppliedAt:
              hasPartial
                ? undefined
                : timestamp,

            items:
              updatedItems,
          }
        }
      )

    saveProducts(nextProducts)
    saveRequests(updatedRequests)

    setMessage(
      hasPartial
        ? `Réquisition ${currentRequest.id} traitée partiellement.`
        : `Réquisition ${currentRequest.id} livrée. Stock mis à jour.`
    )

    setTreatingId('')
    setTreatmentLines([])
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

            <h1>Bar Nuku</h1>

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
              Consulter et traiter les
              demandes reçues.
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
                Aucune demande dans cette
                catégorie.
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
                      (line) => (
                        <div
                          className="requestLine"
                          key={
                            line.productId
                          }
                        >
                          <div>
                            <strong>
                              {
                                line.productName
                              }
                            </strong>
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

                            {line.approved >
                              0 && (
                              <span>
                                Validé
                                <b>
                                  {
                                    line.approved
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
                        ✓ Réquisition traitée
                      </div>
                    )}
                  </div>
                </article>
              )
            )
          )}
        </div>
      </section>

      {currentRequest && (
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
                  {
                    currentRequest.service
                  }{' '}
                  →{' '}
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

            <div className="modalBody">
              {currentRequest.items.map(
                (requestLine) => {
                  const treatment =
                    treatmentLines.find(
                      (line) =>
                        line.productId ===
                        requestLine.productId
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

                  return (
                    <div
                      className="treatmentProduct"
                      key={
                        requestLine.productId
                      }
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
                              requestLine.productId,
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

                      <label>
                        <span>
                          Quantité à sortir
                        </span>

                        <input
                          type="number"
                          min={0}
                          max={Math.min(
                            requested,
                            available
                          )}
                          value={
                            treatment?.quantity ??
                            0
                          }
                          onChange={(
                            event
                          ) =>
                            updateTreatment(
                              requestLine.productId,
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

                      {treatment &&
                        treatment.quantity <
                          requested && (
                          <div className="partialInfo">
                            Cette ligne sera
                            traitée
                            partiellement.
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
                Valider la sortie
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
          box-shadow:
            0 0 0 1px
            rgba(255,255,255,.12);
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
          border:
            1px solid
            rgba(255,255,255,.12);
          border-radius: 999px;
          background:
            rgba(255,255,255,.07);
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
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
          font-size: 19px;
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

        .quickCard b {
          color: #98a2b3;
        }

        .requestSection {
          padding: 22px;
          border: 1px solid #e4e7ec;
          border-radius: 20px;
          background: #fff;
        }

        .sectionHeader {
          display: flex;
          align-items: flex-start;
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
          margin-top: 1px;
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
          align-items: flex-start;
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

        .requestStatus.validated {
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

        .requestStatus.delivered {
          background: #ecfdf3;
          color: #067647;
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
          text-transform: uppercase;
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
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-bottom:
            1px solid #f2f4f7;
        }

        .requestLine:last-child {
          border-bottom: 0;
        }

        .requestLine strong {
          font-size: 11px;
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

        .treatButton,
        .confirmButton {
          border: 0;
          border-radius: 11px;
          background: #7c3aed;
          color: #fff;
          cursor: pointer;
          font-weight: 900;
        }

        .treatButton {
          min-height: 40px;
          padding: 0 16px;
          font-size: 11px;
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
          text-align: center;
          color: #667085;
        }

        .emptyState strong {
          color: #344054;
          font-size: 15px;
        }

        .emptyState span {
          margin-top: 5px;
          font-size: 11px;
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
          width: min(720px,100%);
          max-height: calc(100dvh - 40px);
          overflow: hidden;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          background: #fff;
          box-shadow:
            0 30px 80px
            rgba(15,23,42,.30);
        }

        .modalHeader {
          padding: 19px 20px;
          display: flex;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid #eaecf0;
        }

        .modalHeader span {
          color: #7c3aed;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .1em;
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

        .productHeader {
          display: flex;
          align-items: center;
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
          outline: none;
        }

        .availability {
          margin-top: 8px;
          padding: 8px 10px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f2f4f7;
        }

        .availability strong {
          font-size: 14px;
        }

        .partialInfo {
          margin-top: 8px;
          padding: 7px 9px;
          border-radius: 8px;
          background: #fffaeb;
          color: #b54708;
          font-size: 9px;
          font-weight: 700;
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
          padding: 0 16px;
        }

        .cancelButton {
          border: 1px solid #d0d5dd;
          border-radius: 11px;
          background: #fff;
          color: #344054;
          cursor: pointer;
          font-weight: 800;
        }

        @media (max-width: 760px) {
          .barPage {
            padding: 12px;
          }

          .barHero {
            padding: 17px;
            align-items: flex-start;
            flex-direction: column;
          }

          .barLogo {
            width: 58px;
            height: 58px;
          }

          .barHero h1 {
            font-size: 25px;
          }

          .quickLinks {
            grid-template-columns: 1fr 1fr;
          }

          .requestSection {
            padding: 14px;
          }

          .requestMeta {
            grid-template-columns: 1fr 1fr;
          }

          .requestLine {
            align-items: flex-start;
            flex-direction: column;
          }

          .quantities {
            width: 100%;
          }

          .quantities span {
            flex: 1;
          }

          .requestActions {
            justify-content: stretch;
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
            border-radius: 20px 20px 0 0;
          }

          .modalBody {
            padding: 13px;
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
          }

          .cancelButton,
          .confirmButton {
            flex: 1;
          }
        }
      `}</style>
    </main>
  )
}