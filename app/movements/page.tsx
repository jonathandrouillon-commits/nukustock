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
      <div className="mvStats">
        <Card>
          <div className="mvStatTitle">
            Mouvements affichés
          </div>
          <div className="mvStatNumber">
            {filtered.length}
          </div>
        </Card>

        <Card>
          <div className="mvStatTitle">
            Entrées
          </div>
          <div className="mvStatNumber">
            +{totalEntries.toLocaleString('fr-FR')}
          </div>
        </Card>

        <Card>
          <div className="mvStatTitle">
            Sorties
          </div>
          <div className="mvStatNumber">
            -{totalOutputs.toLocaleString('fr-FR')}
          </div>
        </Card>
      </div>

      <div className="mvFilterCard">
        <div className="mvFilterGrid">
          <div className="mvField">
            <label>Recherche</label>
            <input
              type="text"
              value={q}
              onChange={(e) =>
                setQ(e.target.value)
              }
              placeholder="Rechercher..."
            />
          </div>

          <div className="mvField">
            <label>Mouvement</label>
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(
                  e.target.value as MovementFilter
                )
              }
            >
              <option value="Tous">
                Tous les mouvements
              </option>

              {Object.entries(
                movementLabels
              ).map(
                ([value, label]) => (
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

          <div className="mvField">
            <label>Produit</label>
            <select
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
                .sort((a, b) =>
                  a.name.localeCompare(
                    b.name,
                    'fr'
                  )
                )
                .map(
                  (product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name}
                    </option>
                  )
                )}
            </select>
          </div>

          <div className="mvField">
            <label>Lieu</label>
            <select
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
                    key={location}
                    value={location}
                  >
                    {location}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="mvField">
            <label>Du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) =>
                setDateFrom(
                  e.target.value
                )
              }
            />
          </div>

          <div className="mvField">
            <label>Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) =>
                setDateTo(
                  e.target.value
                )
              }
            />
          </div>

          <div className="mvField mvResetField">
            <label aria-hidden="true">
              &nbsp;
            </label>
            <button
              type="button"
              onClick={resetFilters}
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      <Card>
        <div className="mvTableScroll">
          <div className="mvTable">
            <div className="mvTableHead">
              <div>Date</div>
              <div>Mouvement</div>
              <div>Référence</div>
              <div>Produit</div>
              <div>Qté</div>
              <div>Source</div>
              <div>Destination</div>
              <div>Opération</div>
            </div>

            {filtered.map(
              (movement) => (
                <div
                  key={movement.id}
                  className="mvRow"
                >
                  <div className="mvCell">
                    <span className="mvMobileLabel">
                      Date
                    </span>
                    {new Date(
                      movement.createdAt
                    ).toLocaleString(
                      'fr-FR'
                    )}
                  </div>

                  <div className="mvCell">
                    <span className="mvMobileLabel">
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

                  <div className="mvCell">
                    <span className="mvMobileLabel">
                      Référence
                    </span>
                    <strong>
                      {movement.internalRef ||
                        '—'}
                    </strong>
                  </div>

                  <div className="mvCell">
                    <span className="mvMobileLabel">
                      Produit
                    </span>

                    <div>
                      <strong>
                        {movement.productName}
                      </strong>

                      {(movement.lotNumber ||
                        movement.expiry) && (
                        <div className="mvSub">
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

                  <div className="mvCell">
                    <span className="mvMobileLabel">
                      Qté
                    </span>
                    <strong>
                      {formatQuantity(
                        movement.quantity
                      )}
                    </strong>
                  </div>

                  <div className="mvCell">
                    <span className="mvMobileLabel">
                      Source
                    </span>
                    {movement.fromLocation ||
                      '—'}
                  </div>

                  <div className="mvCell">
                    <span className="mvMobileLabel">
                      Destination
                    </span>
                    {movement.toLocation ||
                      '—'}
                  </div>

                  <div className="mvCell">
                    <span className="mvMobileLabel">
                      Opération
                    </span>

                    <div>
                      {movement.referenceId ||
                        '—'}

                      {movement.note && (
                        <div className="mvSub">
                          {movement.note}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}

            {filtered.length === 0 && (
              <div className="mvEmpty">
                Aucun mouvement de stock trouvé.
              </div>
            )}
          </div>
        </div>
      </Card>

      <style jsx global>{`
        .mvStats {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }

        .mvStatTitle {
          color: #667085;
          font-size: 12px;
          font-weight: 700;
        }

        .mvStatNumber {
          margin-top: 8px;
          color: #101828;
          font-size: 30px;
          line-height: 1;
          font-weight: 900;
        }

        .mvFilterCard {
          width: 100%;
          margin: 0 0 16px;
          padding: 22px;
          border: 1px solid #e5e9f0;
          border-radius: 18px;
          background: #fff;
        }

        .mvFilterGrid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 16px;
          align-items: end;
        }

        .mvField {
          min-width: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .mvField label {
          display: block;
          margin: 0;
          color: #667085;
          font-size: 12px;
          line-height: 1;
          font-weight: 700;
        }

        .mvField input,
        .mvField select,
        .mvField button {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          height: 50px !important;
          min-height: 50px !important;
          margin: 0 !important;
          padding: 0 14px !important;
          box-sizing: border-box !important;
          border: 1px solid #dfe3e8 !important;
          border-radius: 12px !important;
          background: #fff !important;
          color: #101828 !important;
          font-family: inherit !important;
          font-size: 15px !important;
          line-height: normal !important;
          box-shadow: none !important;
          outline: none !important;
        }

        .mvField select {
          cursor: pointer;
        }

        .mvField input:focus,
        .mvField select:focus {
          border-color: #98a2b3 !important;
          box-shadow:
            0 0 0 3px
            rgba(152,162,179,.12) !important;
        }

        .mvResetField button {
          cursor: pointer;
          font-weight: 800 !important;
        }

        .mvResetField button:hover {
          background: #f8fafc !important;
        }

        .mvTableScroll {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .mvTable {
          min-width: 1180px;
        }

        .mvTableHead,
        .mvRow {
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

        .mvTableHead {
          padding: 2px 4px 12px;
          color: #344054;
          font-size: 11px;
          font-weight: 800;
        }

        .mvRow {
          padding: 13px 4px;
          border-top: 1px solid #eef1f5;
        }

        .mvCell {
          min-width: 0;
          color: #344054;
          font-size: 12px;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .mvSub {
          margin-top: 4px;
          color: #98a2b3;
          font-size: 10px;
          line-height: 1.35;
        }

        .mvMobileLabel {
          display: none;
        }

        .mvEmpty {
          padding: 34px 20px;
          text-align: center;
          color: #667085;
          font-size: 14px;
        }

        @media (max-width: 1200px) {
          .mvFilterGrid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .mvFilterGrid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 767px) {
          .mvStats {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .mvFilterCard {
            padding: 14px;
          }

          .mvFilterGrid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .mvField input,
          .mvField select,
          .mvField button {
            height: 48px !important;
            min-height: 48px !important;
            font-size: 16px !important;
          }

          .mvTableScroll {
            overflow: visible;
          }

          .mvTable {
            min-width: 0;
            width: 100%;
          }

          .mvTableHead {
            display: none;
          }

          .mvRow {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 12px;
            padding: 14px;
            border: 1px solid #e7eaf0;
            border-radius: 14px;
            background: #fff;
          }

          .mvCell {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 13px;
          }

          .mvMobileLabel {
            display: block;
            color: #98a2b3;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .04em;
          }

          .mvCell:nth-child(4),
          .mvCell:nth-child(8) {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 420px) {
          .mvRow {
            grid-template-columns: 1fr;
          }

          .mvCell:nth-child(4),
          .mvCell:nth-child(8) {
            grid-column: auto;
          }
        }
      `}</style>
    </Page>
  )
}