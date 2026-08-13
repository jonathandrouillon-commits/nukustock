'use client'

import { useMemo, useState } from 'react'
import { Card, Page } from '@/components/ui'
import {
  useMasterData,
  useProducts,
  useStockMovements,
} from '@/lib/store'
import type {
  Lot,
  Product,
  StockMovement,
} from '@/lib/types'

type EntryLine = {
  id: string
  productId: string
  location: string
  quantity: string
  lotNumber: string
  expiry: string
}

function numberValue(value: string) {
  return (
    Number(
      String(value)
        .replace(',', '.')
        .trim()
    ) || 0
  )
}

function emptyLine(): EntryLine {
  return {
    id: crypto.randomUUID(),
    productId: '',
    location: '',
    quantity: '',
    lotNumber: '',
    expiry: '',
  }
}

function nextEntryReference(
  movements: StockMovement[]
) {
  const highest = movements.reduce(
    (max, movement) => {
      const match =
        movement.referenceId?.match(
          /^ER-(\d+)$/
        )

      if (!match) return max

      return Math.max(
        max,
        Number(match[1]) || 0
      )
    },
    0
  )

  return `ER-${String(
    highest + 1
  ).padStart(5, '0')}`
}

function addLotToProduct(
  product: Product,
  line: EntryLine,
  quantity: number
): Product {
  const lotNumber =
    line.lotNumber.trim()
  const expiry = line.expiry || ''

  const sameLotIndex =
    product.lots.findIndex(
      (lot) =>
        lot.location ===
          line.location &&
        (lot.lotNumber || '') ===
          lotNumber &&
        (lot.expiry || '') ===
          expiry
    )

  const nextLots: Lot[] =
    product.lots.map((lot) => ({
      ...lot,
    }))

  if (sameLotIndex >= 0) {
    nextLots[sameLotIndex] = {
      ...nextLots[sameLotIndex],
      quantity:
        Number(
          nextLots[sameLotIndex]
            .quantity
        ) + quantity,
    }
  } else {
    nextLots.push({
      id: crypto.randomUUID(),
      lotNumber,
      expiry,
      location: line.location,
      quantity,
    })
  }

  return {
    ...product,
    lots: nextLots,
  }
}

export default function StockEntryPage() {
  const {
    items: products,
    save: saveProducts,
  } = useProducts()

  const { items: masterData } =
    useMasterData()

  const {
    items: movements,
    save: saveMovements,
  } = useStockMovements()

  const [lines, setLines] =
    useState<EntryLine[]>([
      emptyLine(),
    ])

  const [note, setNote] =
    useState('')

  const [
    toRegularize,
    setToRegularize,
  ] = useState(true)

  const [message, setMessage] =
    useState('')

  const locations = useMemo(
    () =>
      masterData
        .filter(
          (item) =>
            item.type ===
              'location' &&
            item.active !== false
        )
        .map((item) => item.name)
        .filter(Boolean)
        .sort((a, b) =>
          a.localeCompare(
            b,
            'fr',
            {
              numeric: true,
              sensitivity: 'base',
            }
          )
        ),
    [masterData]
  )

  const sortedProducts =
    useMemo(
      () =>
        [...products].sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
              'fr'
            )
        ),
      [products]
    )

  const reference =
    useMemo(
      () =>
        nextEntryReference(
          movements
        ),
      [movements]
    )

  const updateLine = (
    id: string,
    patch: Partial<EntryLine>
  ) => {
    setLines((current) =>
      current.map((line) =>
        line.id === id
          ? {
              ...line,
              ...patch,
            }
          : line
      )
    )
  }

  const addLine = () => {
    setLines((current) => [
      ...current,
      emptyLine(),
    ])
  }

  const removeLine = (
    id: string
  ) => {
    setLines((current) => {
      if (current.length === 1) {
        return [emptyLine()]
      }

      return current.filter(
        (line) =>
          line.id !== id
      )
    })
  }

  const reset = () => {
    setLines([emptyLine()])
    setNote('')
    setToRegularize(true)
  }

  const validate = () => {
    setMessage('')

    const prepared = lines.map(
      (line, index) => ({
        line,
        index,
        product:
          products.find(
            (product) =>
              product.id ===
              line.productId
          ),
        quantity: numberValue(
          line.quantity
        ),
      })
    )

    const invalid =
      prepared.find(
        ({
          product,
          quantity,
          line,
        }) =>
          !product ||
          !line.location ||
          quantity <= 0
      )

    if (invalid) {
      window.alert(
        `Ligne ${
          invalid.index + 1
        } : produit, lieu et quantité sont obligatoires.`
      )
      return
    }

    const operationReference =
      nextEntryReference(
        movements
      )

    const createdAt =
      new Date().toISOString()

    let nextProducts =
      products.map(
        (product) => ({
          ...product,
          lots: product.lots.map(
            (lot) => ({
              ...lot,
            })
          ),
        })
      )

    const newMovements:
      StockMovement[] = []

    for (const {
      line,
      product,
      quantity,
    } of prepared) {
      if (!product) continue

      nextProducts =
        nextProducts.map(
          (currentProduct) =>
            currentProduct.id ===
            product.id
              ? addLotToProduct(
                  currentProduct,
                  line,
                  quantity
                )
              : currentProduct
        )

      newMovements.push({
        id: crypto.randomUUID(),
        createdAt,
        type: 'ENTREE_PRODUIT',
        productId:
          product.id,
        productName:
          product.name,
        internalRef:
          product.internalRef,
        quantity,
        toLocation:
          line.location,
        lotNumber:
          line.lotNumber.trim() ||
          undefined,
        expiry:
          line.expiry ||
          undefined,
        referenceId:
          operationReference,
        note:
          note.trim() ||
          'Entrée rapide multi-produits',
        specialNote:
          note.trim() ||
          undefined,
        regularizationStatus:
          toRegularize
            ? 'A_REGULARISER'
            : 'NON_REQUIS',
      })
    }

    saveProducts(
      nextProducts
    )

    saveMovements([
      ...movements,
      ...newMovements,
    ])

    const totalQuantity =
      newMovements.reduce(
        (sum, movement) =>
          sum +
          movement.quantity,
        0
      )

    setMessage(
      `${operationReference} validée : ${newMovements.length} produit(s), ${totalQuantity.toLocaleString(
        'fr-FR'
      )} unité(s) ajoutée(s) au stock.${
        toRegularize
          ? ' L’entrée est à régulariser dans Mouvements.'
          : ''
      }`
    )

    reset()
  }

  return (
    <Page
      title="Entrée rapide"
      subtitle="Entrée multi-produits immédiate, sans commande fournisseur"
    >
      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: 14,
            borderRadius: 12,
            border:
              '1px solid #abefc6',
            background: '#ecfdf3',
            color: '#067647',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {message}
        </div>
      )}

      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'flex-start',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
              }}
            >
              Nouvelle entrée
            </h2>

            <div
              style={{
                marginTop: 5,
                color: '#667085',
                fontSize: 12,
              }}
            >
              Tous les produits validés ensemble portent la même référence.
            </div>
          </div>

          <div
            style={{
              padding:
                '9px 12px',
              borderRadius: 10,
              background:
                '#f2f4f7',
              fontSize: 13,
              fontWeight: 900,
              color: '#344054',
            }}
          >
            {reference}
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            display: 'grid',
            gap: 12,
          }}
        >
          {lines.map(
            (line, index) => {
              const selected =
                products.find(
                  (product) =>
                    product.id ===
                    line.productId
                )

              return (
                <div
                  key={line.id}
                  style={{
                    padding: 14,
                    border:
                      '1px solid #e5e7eb',
                    borderRadius: 14,
                    background:
                      '#fff',
                  }}
                >
                  <div
                    style={{
                      display:
                        'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'center',
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <strong>
                      Produit{' '}
                      {index + 1}
                    </strong>

                    <button
                      className="button secondary small"
                      type="button"
                      onClick={() =>
                        removeLine(
                          line.id
                        )
                      }
                    >
                      Supprimer
                    </button>
                  </div>

                  <div
                    style={{
                      display:
                        'grid',
                      gridTemplateColumns:
                        'minmax(230px,2fr) minmax(170px,1.2fr) 110px minmax(130px,1fr) minmax(145px,1fr)',
                      gap: 10,
                      alignItems:
                        'end',
                    }}
                  >
                    <div>
                      <label
                        style={
                          label
                        }
                      >
                        Produit *
                      </label>

                      <select
                        className="input"
                        style={{
                          width:
                            '100%',
                        }}
                        value={
                          line.productId
                        }
                        onChange={(
                          event
                        ) =>
                          updateLine(
                            line.id,
                            {
                              productId:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                      >
                        <option value="">
                          Sélectionner...
                        </option>

                        {sortedProducts.map(
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
                              {product.internalRef
                                ? `${product.internalRef} — `
                                : ''}
                              {
                                product.name
                              }
                            </option>
                          )
                        )}
                      </select>

                      {selected && (
                        <div
                          style={{
                            marginTop: 4,
                            color:
                              '#98a2b3',
                            fontSize: 10,
                          }}
                        >
                          {[
                            selected.category,
                            selected.subcategory,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              ' · '
                            )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        style={
                          label
                        }
                      >
                        Lieu *
                      </label>

                      <select
                        className="input"
                        style={{
                          width:
                            '100%',
                        }}
                        value={
                          line.location
                        }
                        onChange={(
                          event
                        ) =>
                          updateLine(
                            line.id,
                            {
                              location:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                      >
                        <option value="">
                          Sélectionner...
                        </option>

                        {locations.map(
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

                    <div>
                      <label
                        style={
                          label
                        }
                      >
                        Qté *
                      </label>

                      <input
                        className="input"
                        style={{
                          width:
                            '100%',
                        }}
                        inputMode="decimal"
                        value={
                          line.quantity
                        }
                        onChange={(
                          event
                        ) =>
                          updateLine(
                            line.id,
                            {
                              quantity:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label
                        style={
                          label
                        }
                      >
                        Lot
                      </label>

                      <input
                        className="input"
                        style={{
                          width:
                            '100%',
                        }}
                        value={
                          line.lotNumber
                        }
                        onChange={(
                          event
                        ) =>
                          updateLine(
                            line.id,
                            {
                              lotNumber:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                        placeholder="Facultatif"
                      />
                    </div>

                    <div>
                      <label
                        style={
                          label
                        }
                      >
                        DLUO / DLC
                      </label>

                      <input
                        className="input"
                        style={{
                          width:
                            '100%',
                        }}
                        type="date"
                        value={
                          line.expiry
                        }
                        onChange={(
                          event
                        ) =>
                          updateLine(
                            line.id,
                            {
                              expiry:
                                event
                                  .target
                                  .value,
                            }
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              )
            }
          )}

          <button
            className="button secondary"
            type="button"
            onClick={addLine}
            style={{
              justifySelf:
                'start',
            }}
          >
            + Ajouter un produit
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 14,
            marginTop: 22,
            paddingTop: 20,
            borderTop:
              '1px solid #eef1f5',
          }}
        >
          <div>
            <label style={label}>
              Note spéciale
            </label>

            <textarea
              className="input"
              value={note}
              onChange={(event) =>
                setNote(
                  event.target.value
                )
              }
              rows={4}
              placeholder="Ex. Livraison urgente, documents à récupérer..."
              style={{
                width: '100%',
                paddingTop: 10,
                resize: 'vertical',
              }}
            />
          </div>

          <label
            style={{
              display: 'flex',
              gap: 11,
              alignItems:
                'flex-start',
              padding: 14,
              border:
                '1px solid #f0c36d',
              background:
                '#fffaeb',
              borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={
                toRegularize
              }
              onChange={(
                event
              ) =>
                setToRegularize(
                  event.target
                    .checked
                )
              }
              style={{
                width: 18,
                height: 18,
                marginTop: 1,
              }}
            />

            <span>
              <strong
                style={{
                  display:
                    'block',
                }}
              >
                À régulariser
              </strong>

              <span
                style={{
                  display:
                    'block',
                  marginTop: 3,
                  color:
                    '#667085',
                  fontSize: 12,
                }}
              >
                Le stock entre maintenant. Fournisseur, devis, BC, facture et documents pourront être complétés ensuite sur toute l&apos;opération {reference}.
              </span>
            </span>
          </label>

          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <button
              className="button"
              type="button"
              onClick={validate}
            >
              Valider toute l&apos;entrée
            </button>

            <button
              className="button secondary"
              type="button"
              onClick={reset}
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <h2
          style={{
            margin:
              '0 0 12px',
            fontSize: 18,
          }}
        >
          Fonctionnement
        </h2>

        <div
          style={{
            color: '#667085',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          Une validation crée une seule opération ER avec plusieurs lignes produits. Chaque ligne peut avoir son propre lieu, sa quantité, son lot et sa DLUO/DLC. Les quantités sont ajoutées immédiatement au stock. Si l&apos;opération est marquée « À régulariser », les documents sont complétés plus tard depuis Mouvements sans ajouter une seconde fois le stock.
        </div>
      </Card>
    </Page>
  )
}

const label:
  React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  color: '#344054',
  fontSize: 11,
  fontWeight: 800,
}