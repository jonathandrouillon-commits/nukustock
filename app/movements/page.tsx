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
          onClick={
            exportCsv
          }
        >
          Exporter Excel / CSV
        </button>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit,minmax(180px,1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Card>
          <div
            style={{
              fontSize: 11,
              opacity: 0.65,
            }}
          >
            Mouvements affichés
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 26,
              fontWeight: 900,
            }}
          >
            {
              filtered.length
            }
          </div>
        </Card>

        <Card>
          <div
            style={{
              fontSize: 11,
              opacity: 0.65,
            }}
          >
            Entrées
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 26,
              fontWeight: 900,
            }}
          >
            +
            {totalEntries.toLocaleString(
              'fr-FR'
            )}
          </div>
        </Card>

        <Card>
          <div
            style={{
              fontSize: 11,
              opacity: 0.65,
            }}
          >
            Sorties
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 26,
              fontWeight: 900,
            }}
          >
            -
            {totalOutputs.toLocaleString(
              'fr-FR'
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(180px,1fr))',
            gap: 10,
          }}
        >
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

          <select
            className="select"
            value={
              typeFilter
            }
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

          <select
            className="select"
            value={
              productFilter
            }
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

          <select
            className="select"
            value={
              locationFilter
            }
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

          <div className="field">
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

          <div className="field">
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
      </Card>

      <Card>
        <div
          style={{
            overflowX: 'auto',
          }}
        >
          <div
            style={{
              minWidth: 1250,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '150px 180px 150px minmax(220px,1.7fr) 100px 170px 170px 180px',
                gap: 10,
                padding:
                  '0 0 10px',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
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
                  style={{
                    display:
                      'grid',
                    gridTemplateColumns:
                      '150px 180px 150px minmax(220px,1.7fr) 100px 170px 170px 180px',
                    gap: 10,
                    padding:
                      '11px 0',
                    alignItems:
                      'center',
                    borderTop:
                      '1px solid rgba(255,255,255,.08)',
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        11,
                    }}
                  >
                    {new Date(
                      movement.createdAt
                    ).toLocaleString(
                      'fr-FR'
                    )}
                  </div>

                  <div>
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

                  <strong
                    style={{
                      fontSize:
                        11,
                    }}
                  >
                    {movement.internalRef ||
                      '—'}
                  </strong>

                  <div>
                    <strong>
                      {
                        movement.productName
                      }
                    </strong>

                    {(movement.lotNumber ||
                      movement.expiry) && (
                      <div
                        style={{
                          marginTop:
                            3,
                          fontSize:
                            10,
                          opacity:
                            0.65,
                        }}
                      >
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

                  <strong
                    style={{
                      fontSize:
                        14,
                    }}
                  >
                    {formatQuantity(
                      movement.quantity
                    )}
                  </strong>

                  <div>
                    {movement.fromLocation ||
                      '—'}
                  </div>

                  <div>
                    {movement.toLocation ||
                      '—'}
                  </div>

                  <div
                    style={{
                      fontSize:
                        11,
                    }}
                  >
                    {movement.referenceId ||
                      '—'}

                    {movement.note && (
                      <div
                        style={{
                          marginTop:
                            3,
                          opacity:
                            0.65,
                        }}
                      >
                        {
                          movement.note
                        }
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {filtered.length ===
              0 && (
              <div
                style={{
                  padding: 28,
                  textAlign:
                    'center',
                  opacity: 0.65,
                }}
              >
                Aucun mouvement de stock trouvé.
              </div>
            )}
          </div>
        </div>
      </Card>
    </Page>
  )
}