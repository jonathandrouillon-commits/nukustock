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
  StockRegularizationStatus,
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
    save: saveMovements,
  } = useStockMovements()

  const {
    items: products,
    save: saveProducts,
  } = useProducts()

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

  const [
    regularizationFilter,
    setRegularizationFilter,
  ] = useState<
    'Tous' | StockRegularizationStatus
  >('Tous')

  const [
    regularizeMovementId,
    setRegularizeMovementId,
  ] = useState('')

  const [regSupplier, setRegSupplier] =
    useState('')
  const [regQuote, setRegQuote] =
    useState('')
  const [regBc, setRegBc] =
    useState('')
  const [regInvoice, setRegInvoice] =
    useState('')
  const [regUnitPrice, setRegUnitPrice] =
    useState('')
  const [regNote, setRegNote] =
    useState('')

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

            if (
              regularizationFilter !==
                'Tous' &&
              (movement.regularizationStatus ||
                'NON_REQUIS') !==
                regularizationFilter
            ) {
              return false
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
      typeFilter,
      productFilter,
      locationFilter,
      dateFrom,
      dateTo,
      regularizationFilter,
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
    setTypeFilter('Tous')
    setProductFilter(
      'Tous'
    )
    setLocationFilter(
      'Tous'
    )
    setDateFrom('')
    setDateTo('')
    setRegularizationFilter('Tous')
  }

  const movementToRegularize =
    movements.find(
      (movement) =>
        movement.id ===
        regularizeMovementId
    )

  const regularizationGroup =
    useMemo(() => {
      if (!movementToRegularize) {
        return []
      }

      const reference =
        movementToRegularize.referenceId

      if (!reference) {
        return [
          movementToRegularize,
        ]
      }

      return movements.filter(
        (movement) =>
          movement.referenceId ===
            reference &&
          movement.type ===
            'ENTREE_PRODUIT'
      )
    }, [
      movements,
      movementToRegularize,
    ])

  const openRegularization = (
    movement: StockMovement
  ) => {
    setRegularizeMovementId(movement.id)
    setRegSupplier(
      movement.supplierName || ''
    )
    setRegQuote(
      movement.quoteNumber || ''
    )
    setRegBc(
      movement.purchaseOrderNumber || ''
    )
    setRegInvoice(
      movement.invoiceNumber || ''
    )
    setRegUnitPrice(
      movement.unitPrice !== undefined
        ? String(movement.unitPrice)
        : ''
    )
    setRegNote(
      movement.specialNote ||
        movement.note ||
        ''
    )
  }

  const saveRegularization = () => {
    if (!movementToRegularize) return

    const parsedPrice =
      regUnitPrice.trim() === ''
        ? undefined
        : Math.max(
            0,
            Number(regUnitPrice) || 0
          )

    const now =
      new Date().toISOString()

    const groupIds =
      new Set(
        regularizationGroup.map(
          (movement) =>
            movement.id
        )
      )

    saveMovements(
      movements.map((movement) =>
        groupIds.has(
          movement.id
        )
          ? {
              ...movement,
              regularizationStatus:
                'REGULARISE',
              regularizedAt: now,
              supplierName:
                regSupplier.trim() ||
                undefined,
              quoteNumber:
                regQuote.trim() ||
                undefined,
              purchaseOrderNumber:
                regBc.trim() ||
                undefined,
              invoiceNumber:
                regInvoice.trim() ||
                undefined,
              unitPrice:
                regularizationGroup.length ===
                  1
                  ? parsedPrice
                  : movement.unitPrice,
              specialNote:
                regNote.trim() ||
                undefined,
              note:
                regNote.trim() ||
                movement.note,
            }
          : movement
      )
    )

    if (
      regularizationGroup.length ===
        1 &&
      parsedPrice !== undefined &&
      parsedPrice >= 0
    ) {
      saveProducts(
        products.map((product) =>
          product.id ===
          movementToRegularize.productId
            ? {
                ...product,
                purchasePrice:
                  parsedPrice,
                priceUpdatedAt:
                  now,
                mainSupplier:
                  regSupplier.trim() ||
                  product.mainSupplier,
              }
            : product
        )
      )
    }

    setRegularizeMovementId('')

    window.alert(
      `${
        movementToRegularize.referenceId ||
        'Entrée'
      } régularisée : ${
        regularizationGroup.length
      } ligne(s). Le stock n’a pas été ajouté une seconde fois.`
    )
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
        'Statut régularisation',
        'Fournisseur',
        'Devis',
        'BC',
        'Facture',
        'Prix unitaire',
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

          movement.regularizationStatus ||
            'NON_REQUIS',

          movement.supplierName ||
            '',

          movement.quoteNumber ||
            '',

          movement.purchaseOrderNumber ||
            '',

          movement.invoiceNumber ||
            '',

          movement.unitPrice ??
            '',

          movement.specialNote ||
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
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <Badge tone="warn">
            {
              movements.filter(
                (movement) =>
                  movement.regularizationStatus ===
                  'A_REGULARISER'
              ).length
            }{' '}
            à régulariser
          </Badge>

          <button
            className="button secondary"
            type="button"
            onClick={exportCsv}
          >
            Exporter Excel / CSV
          </button>
        </div>
      }
    >
      <div className="mvStats">
        <Card>
          <div className="mvStatTitle">Mouvements affichés</div>
          <div className="mvStatNumber">{filtered.length}</div>
        </Card>

        <Card>
          <div className="mvStatTitle">Entrées</div>
          <div className="mvStatNumber">
            +{totalEntries.toLocaleString('fr-FR')}
          </div>
        </Card>

        <Card>
          <div className="mvStatTitle">Sorties</div>
          <div className="mvStatNumber">
            -{totalOutputs.toLocaleString('fr-FR')}
          </div>
        </Card>
      </div>

      <div className="mvFilterCard">
        <div className="mvFilterGridTop">
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
              <option value="Tous">Tous les mouvements</option>
              {Object.entries(movementLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
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
                setProductFilter(e.target.value)
              }
            >
              <option value="Tous">Tous les produits</option>
              {[...products]
                .sort((a, b) =>
                  a.name.localeCompare(b.name, 'fr')
                )
                .map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="mvField">
            <label>Lieu</label>
            <select
              value={locationFilter}
              onChange={(e) =>
                setLocationFilter(e.target.value)
              }
            >
              <option value="Tous">Tous les lieux</option>
              {locations.map((location) => (
                <option
                  key={location}
                  value={location}
                >
                  {location}
                </option>
              ))}
            </select>
          </div>
          <div className="mvField">
            <label>Régularisation</label>
            <select
              value={regularizationFilter}
              onChange={(e) =>
                setRegularizationFilter(
                  e.target.value as
                    | 'Tous'
                    | StockRegularizationStatus
                )
              }
            >
              <option value="Tous">
                Tous les statuts
              </option>
              <option value="A_REGULARISER">
                À régulariser
              </option>
              <option value="REGULARISE">
                Régularisés
              </option>
              <option value="NON_REQUIS">
                Sans régularisation
              </option>
            </select>
          </div>
        </div>

        <div className="mvFilterGridBottom">
          <div className="mvField">
            <label>Du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) =>
                setDateFrom(e.target.value)
              }
            />
          </div>

          <div className="mvField">
            <label>Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) =>
                setDateTo(e.target.value)
              }
            />
          </div>

          <div className="mvReset">
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

            {filtered.map((movement) => (
              <div
                key={movement.id}
                className="mvRow"
              >
                <div className="mvCell">
                  <span className="mvMobileLabel">Date</span>
                  {new Date(
                    movement.createdAt
                  ).toLocaleString('fr-FR')}
                </div>

                <div className="mvCell">
                  <span className="mvMobileLabel">Mouvement</span>
                  <Badge
                    tone={getMovementTone(movement)}
                  >
                    {movementLabels[movement.type]}
                  </Badge>
                </div>

                <div className="mvCell">
                  <span className="mvMobileLabel">Référence</span>
                  <strong>
                    {movement.internalRef || '—'}
                  </strong>
                </div>

                <div className="mvCell">
                  <span className="mvMobileLabel">Produit</span>
                  <div>
                    <strong>{movement.productName}</strong>

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
                            ).toLocaleDateString('fr-FR')}`
                          : ''}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mvCell">
                  <span className="mvMobileLabel">Qté</span>
                  <strong>
                    {formatQuantity(movement.quantity)}
                  </strong>
                </div>

                <div className="mvCell">
                  <span className="mvMobileLabel">Source</span>
                  {movement.fromLocation || '—'}
                </div>

                <div className="mvCell">
                  <span className="mvMobileLabel">Destination</span>
                  {movement.toLocation || '—'}
                </div>

                <div className="mvCell">
                  <span className="mvMobileLabel">Opération</span>
                  <div>
                    {movement.referenceId || '—'}

                    {movement.regularizationStatus ===
                      'A_REGULARISER' && (
                      <div
                        style={{
                          marginTop: 6,
                          display: 'flex',
                          gap: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Badge tone="warn">
                          À régulariser
                        </Badge>
                        <button
                          className="button secondary small"
                          type="button"
                          onClick={() =>
                            openRegularization(
                              movement
                            )
                          }
                        >
                          Régulariser
                        </button>
                      </div>
                    )}

                    {movement.regularizationStatus ===
                      'REGULARISE' && (
                      <div
                        style={{
                          marginTop: 6,
                        }}
                      >
                        <Badge tone="good">
                          Régularisé
                        </Badge>
                      </div>
                    )}

                    {(movement.specialNote ||
                      movement.note) && (
                      <div className="mvSub">
                        {movement.specialNote ||
                          movement.note}
                      </div>
                    )}

                    {movement.invoiceNumber && (
                      <div className="mvSub">
                        Facture :{' '}
                        {movement.invoiceNumber}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="mvEmpty">
                Aucun mouvement de stock trouvé.
              </div>
            )}
          </div>
        </div>
      </Card>


      {movementToRegularize && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            background:
              'rgba(15,23,42,.65)',
            display: 'grid',
            placeItems: 'center',
            padding: 18,
          }}
          onMouseDown={(event) => {
            if (
              event.currentTarget ===
              event.target
            ) {
              setRegularizeMovementId('')
            }
          }}
        >
          <div
            style={{
              width: 'min(720px,100%)',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#fff',
              color: '#101828',
              borderRadius: 18,
              padding: 24,
              boxShadow:
                '0 25px 80px rgba(0,0,0,.30)',
            }}
          >
            <h2 style={{ margin: 0 }}>
              Régulariser l&apos;opération
            </h2>

            <div
              style={{
                marginTop: 5,
                color: '#667085',
                fontSize: 12,
              }}
            >
              <strong>
                {movementToRegularize.referenceId ||
                  'Entrée rapide'}
              </strong>
              {' · '}
              {regularizationGroup.length}{' '}
              produit(s)
              {' · '}
              {regularizationGroup
                .reduce(
                  (sum, movement) =>
                    sum +
                    movement.quantity,
                  0
                )
                .toLocaleString('fr-FR')}{' '}
              unité(s)
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 10,
                background: '#ecfdf3',
                border:
                  '1px solid #abefc6',
                fontSize: 12,
                color: '#067647',
              }}
            >
              Cette régularisation complète les documents du mouvement existant. Elle ne modifie pas la quantité de stock.
            </div>

            {regularizationGroup.length > 1 && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  border:
                    '1px solid #e5e7eb',
                  background: '#f8fafc',
                }}
              >
                <strong
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontSize: 12,
                  }}
                >
                  Produits de l&apos;opération
                </strong>

                {regularizationGroup.map(
                  (movement) => (
                    <div
                      key={movement.id}
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        gap: 12,
                        padding:
                          '6px 0',
                        borderTop:
                          '1px solid #eef1f5',
                        fontSize: 11,
                      }}
                    >
                      <span>
                        {movement.productName}
                        {' · '}
                        {movement.toLocation ||
                          'Lieu non renseigné'}
                      </span>

                      <strong>
                        +{movement.quantity}
                      </strong>
                    </div>
                  )
                )}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2,minmax(0,1fr))',
                gap: 14,
                marginTop: 18,
              }}
            >
              <div
                style={{
                  gridColumn: '1 / -1',
                }}
              >
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#344054',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  Fournisseur
                </label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  value={regSupplier}
                  onChange={(event) =>
                    setRegSupplier(
                      event.target.value
                    )
                  }
                  placeholder="Nom du fournisseur"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#344054',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  N° devis
                </label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  value={regQuote}
                  onChange={(event) =>
                    setRegQuote(
                      event.target.value
                    )
                  }
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#344054',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  N° BC
                </label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  value={regBc}
                  onChange={(event) =>
                    setRegBc(
                      event.target.value
                    )
                  }
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#344054',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  N° facture
                </label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  value={regInvoice}
                  onChange={(event) =>
                    setRegInvoice(
                      event.target.value
                    )
                  }
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#344054',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  Prix unitaire XPF
                  {regularizationGroup.length > 1
                    ? ' — uniquement pour une entrée à 1 produit'
                    : ''}
                </label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={
                    regularizationGroup.length > 1
                  }
                  value={regUnitPrice}
                  onChange={(event) =>
                    setRegUnitPrice(
                      event.target.value
                    )
                  }
                  placeholder="Facultatif"
                />
              </div>

              <div
                style={{
                  gridColumn: '1 / -1',
                }}
              >
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  color: '#344054',
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  Note / documents
                </label>
                <textarea
                  className="input"
                  style={{
                    width: '100%',
                    minHeight: 95,
                    paddingTop: 10,
                    resize: 'vertical',
                  }}
                  value={regNote}
                  onChange={(event) =>
                    setRegNote(
                      event.target.value
                    )
                  }
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'flex-end',
                gap: 10,
                marginTop: 22,
              }}
            >
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  setRegularizeMovementId('')
                }
              >
                Annuler
              </button>

              <button
                className="button"
                type="button"
                onClick={saveRegularization}
              >
                Marquer comme régularisé
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .mvStats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
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
          padding: 18px;
          border: 1px solid #e5e9f0;
          border-radius: 16px;
          background: #fff;
          overflow: hidden;
        }

        .mvFilterGridTop {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 14px;
          align-items: end;
        }

        .mvFilterGridBottom {
          display: grid;
          grid-template-columns: 220px 220px 160px;
          gap: 14px;
          align-items: end;
          margin-top: 14px;
        }

        .mvField {
          min-width: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .mvField label {
          display: block;
          min-height: 16px;
          margin: 0;
          color: #667085;
          font-size: 11px;
          line-height: 16px;
          font-weight: 800;
        }

        .mvField input,
        .mvField select {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          height: 44px !important;
          min-height: 44px !important;
          max-height: 44px !important;
          margin: 0 !important;
          padding: 0 12px !important;
          border: 1px solid #d8dee8 !important;
          border-radius: 10px !important;
          background: #fff !important;
          color: #101828 !important;
          font-family: inherit !important;
          font-size: 13px !important;
          line-height: 44px !important;
          box-shadow: none !important;
          outline: none !important;
        }

        .mvField select {
          padding-right: 32px !important;
        }

        .mvField input[type="date"] {
          line-height: normal !important;
        }

        .mvField input:focus,
        .mvField select:focus {
          border-color: #98a2b3 !important;
          box-shadow: 0 0 0 3px rgba(152,162,179,.12) !important;
        }

        .mvReset {
          display: flex;
          align-items: flex-end;
        }

        .mvReset button {
          width: 160px !important;
          min-width: 160px !important;
          height: 44px !important;
          min-height: 44px !important;
          margin: 0 !important;
          padding: 0 16px !important;
          border: 1px solid #d8dee8 !important;
          border-radius: 10px !important;
          background: #fff !important;
          color: #344054 !important;
          font-family: inherit !important;
          font-size: 13px !important;
          font-weight: 800 !important;
          line-height: 44px !important;
          white-space: nowrap !important;
          cursor: pointer;
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

        @media (max-width: 1100px) {
          .mvFilterGridTop {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .mvFilterGridBottom {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .mvReset {
            grid-column: 1 / -1;
          }

          .mvReset button {
            width: 100% !important;
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

          .mvFilterGridTop,
          .mvFilterGridBottom {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .mvFilterGridBottom {
            margin-top: 10px;
          }

          .mvReset {
            grid-column: auto;
          }

          .mvField input,
          .mvField select,
          .mvReset button {
            width: 100% !important;
            min-width: 0 !important;
            height: 48px !important;
            min-height: 48px !important;
            font-size: 16px !important;
            line-height: normal !important;
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
            grid-template-columns: repeat(2, minmax(0, 1fr));
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