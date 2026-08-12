'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Badge,
  Card,
  Page,
} from '@/components/ui'

import {
  useMasterData,
  useProducts,
} from '@/lib/store'

import type {
  MasterDataItem,
} from '@/lib/types'

function normalize(
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

export default function LocationsPage() {
  const {
    items: masterData,
    save: saveMasterData,
  } = useMasterData()

  const {
    items: products,
  } = useProducts()

  const [name, setName] =
    useState('')

  const [q, setQ] =
    useState('')

  const [msg, setMsg] =
    useState('')

  const [error, setError] =
    useState('')

  const [editingId, setEditingId] =
    useState('')

  const [
    editingName,
    setEditingName,
  ] = useState('')

  const locations =
    useMemo(
      () =>
        masterData
          .filter(
            (item) =>
              item.type ===
              'location'
          )
          .sort((a, b) =>
            a.name.localeCompare(
              b.name,
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


  const filtered =
    useMemo(() => {
      const search =
        normalize(q)

      if (!search) {
        return locations
      }

      return locations.filter(
        (item) =>
          normalize(
            item.name
          ).includes(search)
      )
    }, [locations, q])

  const getStockInLocation =
    (
      locationName: string
    ) => {
      return products.reduce(
        (
          total,
          product
        ) =>
          total +
          product.lots
            .filter(
              (lot) =>
                lot.location ===
                locationName
            )
            .reduce(
              (
                subtotal,
                lot
              ) =>
                subtotal +
                Math.max(
                  0,
                  Number(
                    lot.quantity
                  ) || 0
                ),
              0
            ),
        0
      )
    }

  const getProductCount =
    (
      locationName: string
    ) => {
      return products.filter(
        (product) =>
          product.lots.some(
            (lot) =>
              lot.location ===
                locationName &&
              Number(
                lot.quantity
              ) > 0
          )
      ).length
    }

  const addLocation = () => {
    setMsg('')
    setError('')

    const clean =
      name.trim()

    if (!clean) {
      setError(
        'Saisis un nom de lieu.'
      )
      return
    }

    const exists =
      locations.some(
        (item) =>
          normalize(
            item.name
          ) ===
          normalize(clean)
      )

    if (exists) {
      setError(
        'Ce lieu de stockage existe déjà.'
      )
      return
    }

    const item:
      MasterDataItem = {
      id:
        crypto.randomUUID(),
      type: 'location',
      name: clean,
      active: true,
    }

    saveMasterData([
      ...masterData,
      item,
    ])

    setName('')

    setMsg(
      `Lieu "${clean}" ajouté.`
    )
  }

  const startEdit = (
    item: MasterDataItem
  ) => {
    setMsg('')
    setError('')
    setEditingId(item.id)
    setEditingName(item.name)
  }

  const cancelEdit = () => {
    setEditingId('')
    setEditingName('')
  }

  const saveEdit = (
    item: MasterDataItem
  ) => {
    setMsg('')
    setError('')

    const clean =
      editingName.trim()

    if (!clean) {
      setError(
        'Le nom du lieu ne peut pas être vide.'
      )
      return
    }

    const duplicate =
      locations.some(
        (other) =>
          other.id !==
            item.id &&
          normalize(
            other.name
          ) ===
            normalize(clean)
      )

    if (duplicate) {
      setError(
        'Un autre lieu porte déjà ce nom.'
      )
      return
    }

    const oldName =
      item.name

    const stockUsed =
      getStockInLocation(
        oldName
      )

    if (
      stockUsed > 0 &&
      oldName !== clean
    ) {
      setError(
        `Impossible de renommer "${oldName}" car du stock y est actuellement affecté. Transfère d'abord le stock vers un autre lieu.`
      )
      return
    }

    saveMasterData(
      masterData.map(
        (current) =>
          current.id ===
          item.id
            ? {
                ...current,
                name: clean,
              }
            : current
      )
    )

    cancelEdit()

    setMsg(
      `Lieu renommé en "${clean}".`
    )
  }

  const toggleActive = (
    item: MasterDataItem
  ) => {
    setMsg('')
    setError('')

    const nextActive =
      item.active === false

    if (
      !nextActive &&
      getStockInLocation(
        item.name
      ) > 0
    ) {
      setError(
        `Impossible de désactiver "${item.name}" : du stock y est encore présent.`
      )
      return
    }

    saveMasterData(
      masterData.map(
        (current) =>
          current.id ===
          item.id
            ? {
                ...current,
                active:
                  nextActive,
              }
            : current
      )
    )

    setMsg(
      nextActive
        ? `Lieu "${item.name}" activé.`
        : `Lieu "${item.name}" désactivé.`
    )
  }

  const removeLocation = (
    item: MasterDataItem
  ) => {
    setMsg('')
    setError('')

    const stock =
      getStockInLocation(
        item.name
      )

    if (stock > 0) {
      setError(
        `Impossible de supprimer "${item.name}" : ${stock} unité(s) sont encore stockées dans ce lieu.`
      )
      return
    }

    const confirmed =
      window.confirm(
        `Supprimer définitivement le lieu de stockage "${item.name}" ?`
      )

    if (!confirmed) {
      return
    }

    saveMasterData(
      masterData.filter(
        (current) =>
          current.id !==
          item.id
      )
    )

    setMsg(
      `Lieu "${item.name}" supprimé.`
    )
  }

  return (
    <Page
      title="Lieux de stockage"
      subtitle="Référentiel central utilisé par Produits, Stocks, Réquisitions, Transferts, Commandes et Inventaires"
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

      <Card>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(220px,1fr) auto',
            gap: 10,
            alignItems: 'end',
          }}
        >
          <div className="field">
            <label>
              Nouveau lieu de stockage
            </label>

            <input
              className="input"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              placeholder="Ex. Cave principale"
              onKeyDown={(e) => {
                if (
                  e.key ===
                  'Enter'
                ) {
                  addLocation()
                }
              }}
            />
          </div>

          <button
            className="button"
            type="button"
            onClick={
              addLocation
            }
          >
            + Ajouter
          </button>
        </div>
      </Card>

      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 14,
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
            placeholder="Rechercher un lieu..."
            style={{
              maxWidth: 360,
            }}
          />

          <div
            style={{
              fontSize: 12,
              opacity: 0.7,
            }}
          >
            {
              locations.filter(
                (item) =>
                  item.active !==
                  false
              ).length
            }{' '}
            lieu(x) actif(s)
          </div>
        </div>

        <div
          style={{
            overflowX: 'auto',
          }}
        >
          <div
            style={{
              minWidth: 850,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '120px minmax(230px,1fr) 130px 130px 120px 300px',
                gap: 12,
                padding:
                  '0 0 10px',
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              <div>
                Lieu de stockage
              </div>

              <div>
                Produits
              </div>

              <div>
                Stock total
              </div>

              <div>
                Statut
              </div>

              <div>
                Actions
              </div>
            </div>

            {filtered.map(
              (item) => {
                const stock =
                  getStockInLocation(
                    item.name
                  )

                const count =
                  getProductCount(
                    item.name
                  )

                const editing =
                  editingId ===
                  item.id

                return (
                  <div
                    key={
                      item.id
                    }
                    style={{
                      display:
                        'grid',
                      gridTemplateColumns:
                        '120px minmax(230px,1fr) 130px 130px 120px 300px',
                      gap: 12,
                      alignItems:
                        'center',
                      padding:
                        '12px 0',
                      borderTop:
                        '1px solid rgba(255,255,255,.08)',
                    }}
                  >
                    <div>
                      {editing ? (
                        <input
                          className="input"
                          value={
                            editingName
                          }
                          onChange={(
                            e
                          ) =>
                            setEditingName(
                              e
                                .target
                                .value
                            )
                          }
                        />
                      ) : (
                        <strong>
                          {
                            item.name
                          }
                        </strong>
                      )}
                    </div>

                    <div>
                      {count}
                    </div>

                    <div>
                      <strong>
                        {stock.toLocaleString(
                          'fr-FR'
                        )}
                      </strong>
                    </div>

                    <div>
                      <Badge
                        tone={
                          item.active ===
                          false
                            ? 'neutral'
                            : 'good'
                        }
                      >
                        {item.active ===
                        false
                          ? 'Inactif'
                          : 'Actif'}
                      </Badge>
                    </div>

                    <div
                      style={{
                        display:
                          'flex',
                        gap: 6,
                        flexWrap:
                          'wrap',
                      }}
                    >
                      {editing ? (
                        <>
                          <button
                            className="button small"
                            onClick={() =>
                              saveEdit(
                                item
                              )
                            }
                          >
                            Enregistrer
                          </button>

                          <button
                            className="button secondary small"
                            onClick={
                              cancelEdit
                            }
                          >
                            Annuler
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="button secondary small"
                            onClick={() =>
                              startEdit(
                                item
                              )
                            }
                          >
                            Renommer
                          </button>

                          <button
                            className="button secondary small"
                            onClick={() =>
                              toggleActive(
                                item
                              )
                            }
                          >
                            {item.active ===
                            false
                              ? 'Activer'
                              : 'Désactiver'}
                          </button>

                          <button
                            className="button secondary small"
                            onClick={() =>
                              removeLocation(
                                item
                              )
                            }
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              }
            )}

            {filtered.length ===
              0 && (
              <div
                style={{
                  padding: 24,
                  textAlign:
                    'center',
                  opacity: 0.65,
                }}
              >
                Aucun lieu de stockage trouvé.
              </div>
            )}
          </div>
        </div>
      </Card>
    </Page>
  )
}