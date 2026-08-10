'use client'

import {
  useMemo,
  useState,
} from 'react'

import {
  Badge,
  Card,
  Page,
} from '@/components/ui'

import {
  useProducts,
  useStockMovements,
} from '@/lib/store'

import type {
  StockMovement,
  StockMovementType,
} from '@/lib/types'

type MovementFilter =
  | 'Tous'
  | StockMovementType

const movementLabels:
  Record<
    StockMovementType,
    string
  > = {
  ENTREE_PRODUIT:
    'Entrée produit',
  REQUISITION:
    'Réquisition',
  TRANSFERT_SORTIE:
    'Transfert - sortie',
  TRANSFERT_ENTREE:
    'Transfert - entrée',
  RECEPTION_COMMANDE:
    'Réception fournisseur',
  AJUSTEMENT_INVENTAIRE:
    'Ajustement inventaire',
  CORRECTION_MANUELLE:
    'Correction manuelle',
}

function getMovementTone(
  movement: StockMovement
):
  | 'good'
  | 'warn'
  | 'danger'
  | 'info'
  | 'neutral' {
  if (
    movement.type ===
      'RECEPTION_COMMANDE' ||
    movement.type ===
      'TRANSFERT_ENTREE' ||
    movement.type ===
      'ENTREE_PRODUIT'
  ) {
    return 'good'
  }

  if (
    movement.type ===
      'REQUISITION' ||
    movement.type ===
      'TRANSFERT_SORTIE'
  ) {
    return 'warn'
  }

  if (
    movement.type ===
      'AJUSTEMENT_INVENTAIRE'
  ) {
    return movement.quantity < 0
      ? 'danger'
      : 'info'
  }

  return 'neutral'
}

function formatQuantity(
  value: number
) {
  const prefix =
    value > 0 ? '+' : ''

  return `${prefix}${value.toLocaleString(
    'fr-FR'
  )}`
}

export default function StockMovementsPage() {
  const {
    items: movements,
  } = useStockMovements()

  const {
    items: products,
  } = useProducts()

  const [q, setQ] =
    useState('')

  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState<MovementFilter>(
      'Tous'
    )

  const [
    productFilter,
    setProductFilter,
  ] = useState('Tous')

  const [
    locationFilter,
    setLocationFilter,
  ] = useState('Tous')

  const [
    dateFrom,
    setDateFrom,
  ] = useState('')

  const [
    dateTo,
    setDateTo,
  ] = useState('')

  const locations =
    useMemo(() => {
      const values =
        new Set<string>()

      movements.forEach(
        (movement) => {
          if (
            movement.fromLocation
          ) {
            values.add(
              movement.fromLocation
            )
          }

          if (
            movement.toLocation
          ) {
            values.add(
              movement.toLocation
            )
          }
        }
      )

      return [
        ...values,
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
    }, [movements])

  const filtered =
    useMemo(() => {
      const search =
        q
          .trim()
          .toLowerCase()

      const fromTime =
        dateFrom
          ? new Date(
              `${dateFrom}T00:00:00`
            ).getTime()
          : null

      const toTime =
        dateTo
          ? new Date(
              `${dateTo}T23:59:59`
            ).getTime()
          : null

      return [
        ...movements,
      ]
        .filter(
          (movement) => {
            if (
              typeFilter !==
                'Tous' &&
              movement.type !==
                typeFilter
            ) {
              return false
            }

            if (
              productFilter !==
                'Tous' &&
              movement.productId !==
                productFilter
            ) {
              return false
            }

            if (
              locationFilter !==
                'Tous' &&
              movement.fromLocation !==
                locationFilter &&
              movement.toLocation !==
                locationFilter
            ) {
              return false
            }

            const time =
              new Date(
                movement.createdAt
              ).getTime()

            if (
              fromTime !== null &&
              time < fromTime
            ) {
              return false
            }

            if (
              toTime !== null &&
              time > toTime
            ) {
              return false
            }

            if (search) {
              const haystack =
                [
                  movement.productName,
                  movement.internalRef,
                  movement.fromLocation,
                  movement.toLocation,
                  movement.referenceId,
                  movement.referenceType,
                  movement.note,
                  movement.user,
                  movement.lotNumber,
                  movement.expiry,
                  movementLabels[
                    movement.type
                  ],
                ]
                  .filter(Boolean)
                  .join(' ')
                  .toLowerCase()

              if (
                !haystack.includes(
                  search
                )
              ) {
                return false
              }
            }

            return true
          }
        )
        .sort(
          (a, b) =>
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
        )
    }, [
      movements,
      q,
      typeFilter,
      productFilter,
      locationFilter,
      dateFrom,
      dateTo,
    ])

  const totalEntries =
    filtered
      .filter(
        (movement) =>
          movement.quantity > 0
      )
      .reduce(
        (sum, movement) =>
          sum +
          movement.quantity,
        0
      )

  const totalOutputs =
    Math.abs(
      filtered
        .filter(
          (movement) =>
            movement.quantity < 0
        )
        .reduce(
          (
            sum,
            movement
          ) =>
            sum +
            movement.quantity,
          0
        )
    )

  const resetFilters = () => {
    setQ('')
    setTypeFilter('Tous')
    setProductFilter(
      'Tous'
    )
    setLocationFilter(
      'Tous'
    )
    setDateFrom('')
    setDateTo('')
  }

  const exportCsv = () => {
    const rows = [
      [
        'Date',
        'Type',
        'Référence',
        'Produit',
        'Quantité',
        'Lieu source',
        'Lieu destination',
        'Lot',
        'DLUO/DLC',
        'Référence opération',
        'Utilisateur',
        'Note',
      ],

      ...filtered.map(
        (movement) => [
          new Date(
            movement.createdAt
          ).toLocaleString(
            'fr-FR'
          ),

          movementLabels[
            movement.type
          ],

          movement.internalRef ||
            '',

          movement.productName,

          movement.quantity,

          movement.fromLocation ||
            '',

          movement.toLocation ||
            '',

          movement.lotNumber ||
            '',

          movement.expiry ||
            '',

          movement.referenceId ||
            '',

          movement.user ||
            '',

          movement.note ||
            '',
        ]
      ),
    ]

    const escapeCsv = (
      value: unknown
    ) =>
      `"${String(
        value ?? ''
      ).replaceAll(
        '"',
        '""'
      )}"`

    const csv =
      '\ufeff' +
      rows
        .map((row) =>
          row
            .map(escapeCsv)
            .join(';')
        )
        .join('\n')

    const blob =
      new Blob(
        [csv],
        {
          type:
            'text/csv;charset=utf-8',
        }
      )

    const url =
      URL.createObjectURL(
        blob
      )

    const link =
      document.createElement(
        'a'
      )

    link.href = url

    link.download =
      `NukuStock-Mouvements-${new Date()
        .toISOString()
        .slice(
          0,
          10
        )}.csv`

    document.body.appendChild(
      link
    )

    link.click()
    link.remove()

    URL.revokeObjectURL(
      url
    )
  }

  return (
    <Page
      title="Mouvements de stock"
      subtitle="Journal central de toutes les entrées, sorties, transferts, réquisitions, réceptions et ajustements"
      action={
        <button
          className="button secondary"
          type="button"
          onClick={exportCsv}
        >
          Exporter Excel / CSV
        </button>
      }
    >
      <div className="movementStats">
        <Card>
          <div className="movementStatLabel">
            Mouvements affichés
          </div>

          <div className="movementStatValue">
            {filtered.length}
          </div>
        </Card>

        <Card>
          <div className="movementStatLabel">
            Entrées
          </div>

          <div className="movementStatValue">
            +
            {totalEntries.toLocaleString(
              'fr-FR'
            )}
          </div>
        </Card>

        <Card>
          <div className="movementStatLabel">
            Sorties
          </div>

          <div className="movementStatValue">
            -
            {totalOutputs.toLocaleString(
              'fr-FR'
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="movementFilters">
          <div className="movementField movementSearch">
            <label>
              Recherche
            </label>

            <input
              className="input"
              value={q}
              onChange={(e) =>
                setQ(
                  e.target.value
                )
              }
              placeholder="Rechercher..."
            />
          </div>

          <div className="movementField">
            <label>
              Mouvement
            </label>

            <select
              className="select"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(
                  e.target
                    .value as MovementFilter
                )
              }
            >
              <option value="Tous">
                Tous les mouvements
              </option>

              {Object.entries(
                movementLabels
              ).map(
                ([
                  value,
                  label,
                ]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="movementField">
            <label>
              Produit
            </label>

            <select
              className="select"
              value={productFilter}
              onChange={(e) =>
                setProductFilter(
                  e.target.value
                )
              }
            >
              <option value="Tous">
                Tous les produits
              </option>

              {[...products]
                .sort(
                  (a, b) =>
                    a.name.localeCompare(
                      b.name,
                      'fr'
                    )
                )
                .map(
                  (product) => (
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

          <div className="movementField">
            <label>
              Lieu
            </label>

            <select
              className="select"
              value={locationFilter}
              onChange={(e) =>
                setLocationFilter(
                  e.target.value
                )
              }
            >
              <option value="Tous">
                Tous les lieux
              </option>

              {locations.map(
                (location) => (
                  <option
                    key={
                      location
                    }
                    value={
                      location
                    }
                  >
                    {location}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="movementField">
            <label>
              Du
            </label>

            <input
              className="input"
              type="date"
              value={dateFrom}
              onChange={(e) =>
                setDateFrom(
                  e.target.value
                )
              }
            />
          </div>

          <div className="movementField">
            <label>
              Au
            </label>

            <input
              className="input"
              type="date"
              value={dateTo}
              onChange={(e) =>
                setDateTo(
                  e.target.value
                )
              }
            />
          </div>

          <div className="movementReset">
            <button
              className="button secondary"
              type="button"
              onClick={
                resetFilters
              }
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="movementTableWrap">
          <div className="movementTable">
            <div className="movementTableHeader">
              <div>
                Date
              </div>

              <div>
                Mouvement
              </div>

              <div>
                Référence
              </div>

              <div>
                Produit
              </div>

              <div>
                Qté
              </div>

              <div>
                Source
              </div>

              <div>
                Destination
              </div>

              <div>
                Opération
              </div>
            </div>

            {filtered.map(
              (movement) => (
                <div
                  key={
                    movement.id
                  }
                  className="movementRow"
                >
                  <div className="movementCell movementDate">
                    <span className="mobileCellLabel">
                      Date
                    </span>

                    <span>
                      {new Date(
                        movement.createdAt
                      ).toLocaleString(
                        'fr-FR'
                      )}
                    </span>
                  </div>

                  <div className="movementCell">
                    <span className="mobileCellLabel">
                      Mouvement
                    </span>

                    <Badge
                      tone={getMovementTone(
                        movement
                      )}
                    >
                      {
                        movementLabels[
                          movement.type
                        ]
                      }
                    </Badge>
                  </div>

                  <div className="movementCell">
                    <span className="mobileCellLabel">
                      Référence
                    </span>

                    <strong>
                      {movement.internalRef ||
                        '—'}
                    </strong>
                  </div>

                  <div className="movementCell">
                    <span className="mobileCellLabel">
                      Produit
                    </span>

                    <div>
                      <strong>
                        {
                          movement.productName
                        }
                      </strong>

                      {(movement.lotNumber ||
                        movement.expiry) && (
                        <div className="movementSubtext">
                          {movement.lotNumber
                            ? `Lot ${movement.lotNumber}`
                            : ''}

                          {movement.lotNumber &&
                          movement.expiry
                            ? ' · '
                            : ''}

                          {movement.expiry
                            ? `DLUO/DLC ${new Date(
                                `${movement.expiry}T00:00:00`
                              ).toLocaleDateString(
                                'fr-FR'
                              )}`
                            : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="movementCell">
                    <span className="mobileCellLabel">
                      Qté
                    </span>

                    <strong className="movementQuantity">
                      {formatQuantity(
                        movement.quantity
                      )}
                    </strong>
                  </div>

                  <div className="movementCell">
                    <span className="mobileCellLabel">
                      Source
                    </span>

                    <span>
                      {movement.fromLocation ||
                        '—'}
                    </span>
                  </div>

                  <div className="movementCell">
                    <span className="mobileCellLabel">
                      Destination
                    </span>

                    <span>
                      {movement.toLocation ||
                        '—'}
                    </span>
                  </div>

                  <div className="movementCell">
                    <span className="mobileCellLabel">
                      Opération
                    </span>

                    <div>
                      <span>
                        {movement.referenceId ||
                          '—'}
                      </span>

                      {movement.note && (
                        <div className="movementSubtext">
                          {
                            movement.note
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}

            {filtered.length === 0 && (
              <div className="movementEmpty">
                Aucun mouvement de stock trouvé.
              </div>
            )}
          </div>
        </div>
      </Card>

      <style jsx global>{`
        .movementStats {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 14px;
          margin-bottom: 16px;
        }

        .movementStats > * {
          min-height: 104px;
        }

        .movementStatLabel {
          color: #667085;
          font-size: 11px;
          font-weight: 700;
        }

        .movementStatValue {
          margin-top: 8px;
          color: #101828;
          font-size: 28px;
          line-height: 1;
          font-weight: 900;
        }

        .movementFilters {
          display: grid;
          grid-template-columns:
            minmax(220px, 1.35fr)
            minmax(190px, 1fr)
            minmax(190px, 1fr)
            minmax(190px, 1fr);
          gap: 14px;
          align-items: end;
        }

        .movementField {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .movementField label {
          color: #667085;
          font-size: 11px;
          font-weight: 700;
        }

        .movementField .input,
        .movementField .select {
          width: 100%;
          height: 48px;
          min-width: 0;
          margin: 0;
          border-radius: 12px;
        }

        .movementReset {
          display: flex;
          align-items: end;
        }

        .movementReset .button {
          min-width: 150px;
          height: 48px;
          white-space: nowrap;
        }

        .movementTableWrap {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .movementTable {
          min-width: 1180px;
        }

        .movementTableHeader,
        .movementRow {
          display: grid;
          grid-template-columns:
            145px
            170px
            135px
            minmax(210px, 1.5fr)
            80px
            155px
            155px
            165px;
          gap: 12px;
          align-items: center;
        }

        .movementTableHeader {
          padding: 2px 4px 12px;
          color: #344054;
          font-size: 11px;
          font-weight: 800;
        }

        .movementRow {
          padding: 13px 4px;
          border-top: 1px solid #eef1f5;
        }

        .movementCell {
          min-width: 0;
          color: #344054;
          font-size: 12px;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .movementDate {
          font-size: 11px;
        }

        .movementQuantity {
          color: #101828;
          font-size: 14px;
        }

        .movementSubtext {
          margin-top: 4px;
          color: #98a2b3;
          font-size: 10px;
          line-height: 1.35;
        }

        .mobileCellLabel {
          display: none;
        }

        .movementEmpty {
          padding: 34px 20px;
          text-align: center;
          color: #667085;
          font-size: 14px;
        }

        @media (max-width: 1150px) {
          .movementStats {
            grid-template-columns:
              repeat(
                3,
                minmax(0, 1fr)
              );
          }

          .movementFilters {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }

          .movementReset .button {
            width: 100%;
          }
        }

        @media (max-width: 767px) {
          .movementStats {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .movementStats > * {
            min-height: 88px;
          }

          .movementStatValue {
            font-size: 24px;
          }

          .movementFilters {
            grid-template-columns: 1fr;
            gap: 11px;
          }

          .movementField .input,
          .movementField .select,
          .movementReset .button {
            width: 100%;
            min-width: 0;
            height: 48px;
            font-size: 16px;
          }

          .movementTableWrap {
            overflow: visible;
          }

          .movementTable {
            min-width: 0;
            width: 100%;
          }

          .movementTableHeader {
            display: none;
          }

          .movementRow {
            display: grid;
            grid-template-columns:
              1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
            padding: 14px;
            border: 1px solid #e7eaf0;
            border-radius: 14px;
            background: #fff;
          }

          .movementCell {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 13px;
          }

          .mobileCellLabel {
            display: block;
            color: #98a2b3;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .04em;
          }

          .movementCell:nth-child(4),
          .movementCell:nth-child(8) {
            grid-column: 1 / -1;
          }

          .movementDate {
            font-size: 12px;
          }

          .movementQuantity {
            font-size: 16px;
          }

          .movementEmpty {
            padding: 28px 14px;
          }
        }

        @media (max-width: 420px) {
          .movementRow {
            grid-template-columns: 1fr;
          }

          .movementCell:nth-child(4),
          .movementCell:nth-child(8) {
            grid-column: auto;
          }
        }
      `}</style>
    </Page>
  )
}