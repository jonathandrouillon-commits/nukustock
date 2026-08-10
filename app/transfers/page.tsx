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
  useProducts,
  useStockEngine,
  useTransfers,
} from '@/lib/store'

import type {
  Transfer,
} from '@/lib/types'

const allLocations = [
  'Bungalow Infini',
  ...Array.from(
    { length: 16 },
    (_, index) =>
      `Bungalow ${index}`
  ),
  'Container',
  'Extension Bar',
  'Fare Intendant',
  'Fitness',
  'Mirador',
  'Poker',
  'Réception',
  'Restaurant',
  'Salle de Jeux',
  'Salon Bar',
  'Spa 1',
  'Spa 2',
  'Sporting',
  'VDM',
  'Villa 16 - King',
  'Villa 16 - Queen',
  'Villa 16 - Salon',
  'Villa 17 - King',
  'Villa 17 - Queen',
  'Villa 17 - Salon',
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

export default function Transfers() {
  const {
    items: products,
  } = useProducts()

  const {
    items: transfers,
  } = useTransfers()

  const {
    executeTransfer,
  } = useStockEngine()

  const [open, setOpen] =
    useState(false)

  const [
    productId,
    setProductId,
  ] = useState(
    products[0]?.id || ''
  )

  const [
    from,
    setFrom,
  ] = useState('')

  const [to, setTo] =
    useState('')

  const [qty, setQty] =
    useState(1)

  const [msg, setMsg] =
    useState('')

  const [error, setError] =
    useState('')

  const selectedProduct =
    products.find(
      (product) =>
        product.id === productId
    )

  const sourceLocations =
    useMemo(() => {
      if (!selectedProduct) {
        return []
      }

      const map =
        new Map<
          string,
          number
        >()

      selectedProduct.lots.forEach(
        (lot) => {
          const quantity =
            Math.max(
              0,
              Number(
                lot.quantity
              ) || 0
            )

          if (
            quantity <= 0
          ) {
            return
          }

          map.set(
            lot.location,
            (map.get(
              lot.location
            ) || 0) +
              quantity
          )
        }
      )

      return [
        ...map.entries(),
      ]
        .map(
          ([
            location,
            quantity,
          ]) => ({
            location,
            quantity,
          })
        )
        .sort(
          (a, b) =>
            a.location.localeCompare(
              b.location,
              'fr',
              {
                numeric: true,
              }
            )
        )
    }, [selectedProduct])

  const availableAtSource =
    sourceLocations.find(
      (item) =>
        item.location === from
    )?.quantity || 0

  const destinationChoices =
    allLocations.filter(
      (location) =>
        location !== from
    )

  const reset = () => {
    const firstProduct =
      products[0]

    setProductId(
      firstProduct?.id || ''
    )

    const firstSource =
      firstProduct
        ? (() => {
            const map =
              new Map<
                string,
                number
              >()

            firstProduct.lots.forEach(
              (lot) => {
                if (
                  lot.quantity >
                  0
                ) {
                  map.set(
                    lot.location,
                    (map.get(
                      lot.location
                    ) || 0) +
                      lot.quantity
                  )
                }
              }
            )

            return [
              ...map.keys(),
            ][0] || ''
          })()
        : ''

    setFrom(firstSource)

    setTo(
      allLocations.find(
        (location) =>
          location !==
          firstSource
      ) || ''
    )

    setQty(1)
  }

  const openNew = () => {
    setMsg('')
    setError('')
    reset()
    setOpen(true)
  }

  const submit = () => {
    setMsg('')
    setError('')

    const product =
      products.find(
        (item) =>
          item.id ===
          productId
      )

    if (!product) {
      setError(
        'Choisis un produit.'
      )
      return
    }

    if (!from) {
      setError(
        "Choisis d'où vient le stock."
      )
      return
    }

    if (!to) {
      setError(
        'Choisis le lieu de destination.'
      )
      return
    }

    if (from === to) {
      setError(
        'Le lieu source et le lieu destination doivent être différents.'
      )
      return
    }

    if (qty <= 0) {
      setError(
        'La quantité doit être supérieure à 0.'
      )
      return
    }

    if (
      availableAtSource <
      qty
    ) {
      setError(
        `Stock insuffisant à ${from}. Disponible : ${availableAtSource}.`
      )
      return
    }

    const transfer:
      Transfer = {
      id:
        `TRF-${Date.now()
          .toString()
          .slice(-6)}`,

      productId:
        product.id,

      product:
        product.name,

      from,
      to,
      qty,

      date:
        new Date()
          .toISOString(),

      user: '',
    }

    const result =
      executeTransfer(
        transfer
      )

    if (!result.ok) {
      setError(
        result.message
      )
      return
    }

    setOpen(false)
    setMsg(
      result.message
    )
  }

  return (
    <Page
      title="Transferts"
      subtitle="Choisis le produit, le lieu source et le lieu de destination"
      action={
        <button
          className="button"
          onClick={openNew}
        >
          + Nouveau transfert
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

      <div className="list">
        {[...transfers]
          .sort(
            (a, b) =>
              new Date(
                b.date
              ).getTime() -
              new Date(
                a.date
              ).getTime()
          )
          .map(
            (transfer) => (
              <Card
                key={
                  transfer.id
                }
              >
                <div
                  style={{
                    display:
                      'grid',
                    gridTemplateColumns:
                      '1.2fr 1fr 1fr 120px 140px',
                    gap: 12,
                    alignItems:
                      'center',
                  }}
                >
                  <div>
                    <strong>
                      {
                        transfer.product
                      }
                    </strong>

                    <div
                      style={{
                        marginTop:
                          3,
                        fontSize:
                          11,
                        opacity:
                          0.65,
                      }}
                    >
                      {
                        transfer.id
                      }
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize:
                          10,
                        opacity:
                          0.65,
                      }}
                    >
                      Depuis
                    </div>

                    <strong>
                      {
                        transfer.from
                      }
                    </strong>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize:
                          10,
                        opacity:
                          0.65,
                      }}
                    >
                      Vers
                    </div>

                    <strong>
                      {
                        transfer.to
                      }
                    </strong>
                  </div>

                  <div>
                    <Badge tone="info">
                      {
                        transfer.qty
                      }
                    </Badge>
                  </div>

                  <div
                    style={{
                      fontSize:
                        11,
                      opacity:
                        0.7,
                    }}
                  >
                    {new Date(
                      transfer.date
                    ).toLocaleString(
                      'fr-FR'
                    )}
                  </div>
                </div>
              </Card>
            )
          )}

        {transfers.length ===
          0 && (
          <Card>
            <div className="muted">
              Aucun transfert enregistré.
            </div>
          </Card>
        )}
      </div>

      {open && (
        <div className="modalBackdrop">
          <div className="modal">
            <div className="modalHead">
              <h2>
                Nouveau transfert
              </h2>

              <button
                className="button secondary small"
                onClick={() =>
                  setOpen(false)
                }
              >
                Fermer
              </button>
            </div>

            <div className="formGrid">
              <div className="field">
                <label>
                  Produit
                </label>

                <select
                  value={
                    productId
                  }
                  onChange={(e) => {
                    const id =
                      e.target
                        .value

                    setProductId(
                      id
                    )

                    const product =
                      products.find(
                        (item) =>
                          item.id ===
                          id
                      )

                    const firstSource =
                      product
                        ?.lots
                        .find(
                          (lot) =>
                            lot.quantity >
                            0
                        )
                        ?.location ||
                      ''

                    setFrom(
                      firstSource
                    )
                  }}
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
                  D&apos;où vient le stock ?
                </label>

                <select
                  value={from}
                  onChange={(e) =>
                    setFrom(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Choisir le lieu source
                  </option>

                  {sourceLocations.map(
                    (item) => (
                      <option
                        key={
                          item.location
                        }
                        value={
                          item.location
                        }
                      >
                        {
                          item.location
                        }{' '}
                        — disponible :{' '}
                        {
                          item.quantity
                        }
                      </option>
                    )
                  )}
                </select>

                {productId &&
                  sourceLocations.length ===
                    0 && (
                    <div
                      style={{
                        marginTop:
                          6,
                        color:
                          '#b42318',
                        fontSize:
                          11,
                      }}
                    >
                      Aucun stock disponible pour ce produit.
                    </div>
                  )}
              </div>

              <div className="field">
                <label>
                  Destination
                </label>

                <select
                  value={to}
                  onChange={(e) =>
                    setTo(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Choisir la destination
                  </option>

                  {destinationChoices.map(
                    (location) => (
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

              <div className="field">
                <label>
                  Quantité
                </label>

                <input
                  type="number"
                  min="1"
                  max={
                    availableAtSource ||
                    undefined
                  }
                  value={qty}
                  onChange={(e) =>
                    setQty(
                      Math.max(
                        1,
                        Number(
                          e
                            .target
                            .value
                        ) || 1
                      )
                    )
                  }
                />

                {from && (
                  <div
                    style={{
                      marginTop:
                        5,
                      fontSize:
                        11,
                      opacity:
                        0.7,
                    }}
                  >
                    Disponible à{' '}
                    <strong>
                      {from}
                    </strong>
                    {' : '}
                    <strong>
                      {
                        availableAtSource
                      }
                    </strong>
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 10,
                background:
                  'rgba(59,130,246,.08)',
                fontSize: 12,
              }}
            >
              Lors de la validation, NukuStock déduira automatiquement la quantité du lieu source et l&apos;ajoutera au lieu de destination. Les DLUO/DLC sont conservées et sorties en FEFO.
            </div>

            <div className="actions">
              <button
                className="button secondary"
                onClick={() =>
                  setOpen(false)
                }
              >
                Annuler
              </button>

              <button
                className="button"
                onClick={submit}
              >
                Confirmer le transfert
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}