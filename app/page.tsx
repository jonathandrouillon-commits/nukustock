'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Page, Card, Badge } from '@/components/ui'
import {
  useInventories,
  useOrders,
  useProducts,
  useRequests,
  useStockMovements,
  useTransfers,
} from '@/lib/store'


type DashboardBlockKey =
  | 'operationalSummary'
  | 'stockByLocation'
  | 'mainStats'
  | 'charts'
  | 'alerts'
  | 'quickEntries'
  | 'recentMovements'
  | 'latestInventory'
  | 'topConsumption'
  | 'orders'
  | 'requests'

type DashboardVisibility = Record<
  DashboardBlockKey,
  boolean
>

const DASHBOARD_VISIBILITY_KEY =
  'nukustock_dashboard_visibility_v1'

const DEFAULT_DASHBOARD_VISIBILITY:
  DashboardVisibility = {
  operationalSummary: true,
  stockByLocation: true,
  mainStats: true,
  charts: true,
  alerts: true,
  quickEntries: true,
  recentMovements: true,
  latestInventory: true,
  topConsumption: true,
  orders: true,
  requests: true,
}

const DASHBOARD_BLOCK_LABELS:
  Record<DashboardBlockKey, string> = {
  operationalSummary:
    'Synthèse opérationnelle',
  stockByLocation:
    'Stock par lieu',
  mainStats:
    'Indicateurs principaux',
  charts:
    'Rapports graphiques',
  alerts:
    'À traiter / Alertes',
  quickEntries:
    'Entrées rapides',
  recentMovements:
    'Mouvements récents',
  latestInventory:
    'Dernier inventaire',
  topConsumption:
    'Plus fortes consommations',
  orders:
    'Commandes fournisseurs',
  requests:
    'Réquisitions',
}

function movementSign(
  quantity: number
) {
  return quantity > 0 ? '+' : ''
}

function DashboardBarChart({
  items,
  valueFormatter = (value: number) => value.toLocaleString('fr-FR'),
}: {
  items: { label: string; value: number }[]
  valueFormatter?: (value: number) => string
}) {
  const max = Math.max(1, ...items.map((item) => item.value))

  if (items.length === 0) {
    return <div className="muted">Aucune donnée disponible.</div>
  }

  return (
    <div style={{ display: 'grid', gap: 11 }}>
      {items.map((item) => (
        <div key={item.label}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              fontSize: 11,
              marginBottom: 5,
            }}
          >
            <strong
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </strong>
            <span style={{ color: '#667085', flexShrink: 0 }}>
              {valueFormatter(item.value)}
            </span>
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: '#eef2f6',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.max(2, (item.value / max) * 100)}%`,
                height: '100%',
                borderRadius: 999,
                background: '#0b1220',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function DashboardDonut({
  items,
  centerLabel,
}: {
  items: { label: string; value: number; color: string }[]
  centerLabel: string
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  let cursor = 0
  const gradient = total
    ? items
        .filter((item) => item.value > 0)
        .map((item) => {
          const start = (cursor / total) * 100
          cursor += item.value
          const end = (cursor / total) * 100
          return `${item.color} ${start}% ${end}%`
        })
        .join(', ')
    : '#eef2f6 0% 100%'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(130px,180px) minmax(0,1fr)',
        gap: 18,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          borderRadius: '50%',
          background: `conic-gradient(${gradient})`,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div
          style={{
            width: '64%',
            aspectRatio: '1',
            borderRadius: '50%',
            background: '#fff',
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            padding: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>
              {total.toLocaleString('fr-FR')}
            </div>
            <div style={{ fontSize: 10, color: '#667085' }}>{centerLabel}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((item) => (
          <div
            key={item.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '10px minmax(0,1fr) auto',
              gap: 8,
              alignItems: 'center',
              fontSize: 11,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: item.color,
              }}
            />
            <span>{item.label}</span>
            <strong>{item.value.toLocaleString('fr-FR')}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const { items: products } = useProducts()
  const { items: orders } = useOrders()
  const { items: requests } = useRequests()
  const { items: inventories } = useInventories()
  const { items: transfers } = useTransfers()
  const { items: movements } = useStockMovements()

  const [
    dashboardVisibility,
    setDashboardVisibility,
  ] = useState<DashboardVisibility>(
    DEFAULT_DASHBOARD_VISIBILITY
  )

  const [
    displayOpen,
    setDisplayOpen,
  ] = useState(false)

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(
          DASHBOARD_VISIBILITY_KEY
        )

      if (!raw) return

      const parsed =
        JSON.parse(raw)

      setDashboardVisibility({
        ...DEFAULT_DASHBOARD_VISIBILITY,
        ...parsed,
      })
    } catch {
      // Garde les réglages par défaut.
    }
  }, [])

  const setBlockVisible = (
    key: DashboardBlockKey,
    visible: boolean
  ) => {
    setDashboardVisibility(
      (current) => {
        const next = {
          ...current,
          [key]: visible,
        }

        try {
          localStorage.setItem(
            DASHBOARD_VISIBILITY_KEY,
            JSON.stringify(next)
          )
        } catch {
          // Le Dashboard reste utilisable.
        }

        return next
      }
    )
  }

  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const totalStockValue = products.reduce((sum, product) => {
      const qty = product.lots.reduce(
        (total, lot) => total + Math.max(0, Number(lot.quantity) || 0),
        0
      )

      return sum + qty * Math.max(0, Number(product.purchasePrice) || 0)
    }, 0)

    const totalQty = products.reduce(
      (sum, product) =>
        sum +
        product.lots.reduce(
          (total, lot) =>
            total + Math.max(0, Number(lot.quantity) || 0),
          0
        ),
      0
    )

    const lowStock = products.filter((product) => {
      const qty = product.lots.reduce(
        (total, lot) =>
          total + Math.max(0, Number(lot.quantity) || 0),
        0
      )

      return qty < Math.max(0, Number(product.minStock) || 0)
    }).length

    let expired = 0
    let under30Days = 0

    products.forEach((product) => {
      product.lots.forEach((lot) => {
        if (!lot.expiry || lot.quantity <= 0) return

        const expiry = new Date(`${lot.expiry}T00:00:00`)
        const days =
          (expiry.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)

        if (days < 0) expired += 1
        else if (days < 30) under30Days += 1
      })
    })

    const pendingOrders = orders.filter(
      (order) =>
        order.status !== 'Clôturé' &&
        order.status !== 'Traité'
    ).length

    const pendingRequests = requests.filter(
      (request) =>
        request.status !== 'Livrée' &&
        request.status !== 'Partielle'
    ).length

    return {
      totalStockValue,
      totalQty,
      lowStock,
      expired,
      under30Days,
      pendingOrders,
      pendingRequests,
    }
  }, [products, orders, requests])

  const latestInventory = useMemo(() => {
    return [...inventories].sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    )[0]
  }, [inventories])

  const consumptionSummary = useMemo(() => {
    if (!latestInventory) {
      return {
        totalConsumption: 0,
        totalValue: 0,
        perDay: 0,
        perGuestPerDay: 0,
        days: 0,
        guests: 0,
      }
    }

    const totalConsumption = latestInventory.lines.reduce(
      (sum, line) =>
        sum + Math.max(0, Number(line.diff) || 0),
      0
    )

    const totalValue = latestInventory.lines.reduce(
      (sum, line) =>
        sum + Math.max(0, Number(line.value) || 0),
      0
    )

    const days = Math.max(
      1,
      Number(latestInventory.durationDays) || 1
    )

    const guests = Math.max(
      1,
      Number(latestInventory.guestCount) || 1
    )

    return {
      totalConsumption,
      totalValue,
      perDay: totalConsumption / days,
      perGuestPerDay:
        totalConsumption / (days * guests),
      days,
      guests,
    }
  }, [latestInventory])

  const topConsumption = useMemo(() => {
    if (!latestInventory) return []

    return [...latestInventory.lines]
      .filter((line) => Number(line.diff) > 0)
      .sort(
        (a, b) =>
          Number(b.diff) - Number(a.diff)
      )
      .slice(0, 8)
  }, [latestInventory])

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.date).getTime() -
            new Date(a.date).getTime()
        )
        .slice(0, 5),
    [orders]
  )

  const recentRequests = useMemo(
    () =>
      [...requests]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        )
        .slice(0, 5),
    [requests]
  )

  const byLocation = useMemo(() => {
    const locations = Array.from(
      new Set(
        products.flatMap((product) =>
          product.lots
            .map((lot) => lot.location)
            .filter(Boolean)
        )
      )
    )

    return locations
      .map((location) => {
        const rows = products.flatMap((product) =>
          product.lots
            .filter((lot) => lot.location === location)
            .map((lot) => ({ product, lot }))
        )

        return {
          location,
          qty: rows.reduce(
            (sum, row) =>
              sum +
              Math.max(
                0,
                Number(row.lot.quantity) || 0
              ),
            0
          ),
          value: rows.reduce(
            (sum, row) =>
              sum +
              Math.max(
                0,
                Number(row.lot.quantity) || 0
              ) *
                Math.max(
                  0,
                  Number(
                    row.product.purchasePrice
                  ) || 0
                ),
            0
          ),
        }
      })
      .sort(
        (a, b) =>
          b.value - a.value
      )
  }, [products])


  const stockByCategory = useMemo(() => {
    const map = new Map<string, number>()

    products.forEach((product) => {
      const category = product.category || 'Sans catégorie'
      const value = product.lots.reduce(
        (sum, lot) =>
          sum +
          Math.max(0, Number(lot.quantity) || 0) *
            Math.max(0, Number(product.purchasePrice) || 0),
        0
      )
      map.set(category, (map.get(category) || 0) + value)
    })

    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [products])

  const expiryChart = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const buckets = {
      expired: 0,
      under30: 0,
      oneToThree: 0,
      threeToSix: 0,
      sixToTwelve: 0,
      overYear: 0,
    }

    products.forEach((product) => {
      product.lots.forEach((lot) => {
        const qty = Math.max(0, Number(lot.quantity) || 0)
        if (!lot.expiry || qty <= 0) return
        const expiry = new Date(`${lot.expiry}T00:00:00`)
        const days =
          (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)

        if (days < 0) buckets.expired += qty
        else if (days < 30) buckets.under30 += qty
        else if (days < 90) buckets.oneToThree += qty
        else if (days < 180) buckets.threeToSix += qty
        else if (days < 365) buckets.sixToTwelve += qty
        else buckets.overYear += qty
      })
    })

    return [
      { label: 'Périmé', value: buckets.expired, color: '#991b1b' },
      { label: '< 1 mois', value: buckets.under30, color: '#dc2626' },
      { label: '1–3 mois', value: buckets.oneToThree, color: '#f97316' },
      { label: '3–6 mois', value: buckets.threeToSix, color: '#eab308' },
      { label: '6–12 mois', value: buckets.sixToTwelve, color: '#84cc16' },
      { label: '+ 1 an', value: buckets.overYear, color: '#16a34a' },
    ]
  }, [products])

  const movement30Days = useMemo(() => {
    const now = new Date()
    const rows = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(now)
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (29 - index))
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        in: 0,
        out: 0,
      }
    })
    const map = new Map(rows.map((row) => [row.key, row]))

    movements.forEach((movement) => {
      const key = new Date(movement.createdAt).toISOString().slice(0, 10)
      const row = map.get(key)
      if (!row) return
      const qty = Number(movement.quantity) || 0
      if (qty >= 0) row.in += qty
      else row.out += Math.abs(qty)
    })

    return rows
  }, [movements])

  const requestStatusChart = useMemo(() => {
    const map = new Map<string, number>()
    requests.forEach((request) => {
      map.set(request.status, (map.get(request.status) || 0) + 1)
    })
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [requests])

  const orderStatusChart = useMemo(() => {
    const map = new Map<string, number>()
    orders.forEach((order) => {
      map.set(order.status, (map.get(order.status) || 0) + 1)
    })
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [orders])

  const quickEntryGroups =
    useMemo(() => {
      const groups =
        new Map<
          string,
          {
            reference: string
            createdAt: string
            movements: typeof movements
          }
        >()

      movements
        .filter(
          (movement) =>
            movement.type ===
              'ENTREE_PRODUIT' &&
            Boolean(
              movement.referenceId?.startsWith(
                'ER-'
              )
            )
        )
        .forEach((movement) => {
          const reference =
            movement.referenceId ||
            'ER-SANS-REF'

          const existing =
            groups.get(reference)

          if (existing) {
            existing.movements.push(
              movement
            )

            if (
              new Date(
                movement.createdAt
              ).getTime() >
              new Date(
                existing.createdAt
              ).getTime()
            ) {
              existing.createdAt =
                movement.createdAt
            }
          } else {
            groups.set(
              reference,
              {
                reference,
                createdAt:
                  movement.createdAt,
                movements: [
                  movement,
                ],
              }
            )
          }
        })

      return [
        ...groups.values(),
      ].sort(
        (a, b) =>
          new Date(
            b.createdAt
          ).getTime() -
          new Date(
            a.createdAt
          ).getTime()
      )
    }, [movements])

  const pendingQuickEntries =
    useMemo(
      () =>
        quickEntryGroups.filter(
          (group) =>
            group.movements.some(
              (movement) =>
                movement.regularizationStatus ===
                'A_REGULARISER'
            )
        ),
      [quickEntryGroups]
    )

  const recentQuickEntries =
    useMemo(
      () =>
        quickEntryGroups.slice(
          0,
          6
        ),
      [quickEntryGroups]
    )

  const recentMovements =
    useMemo(
      () =>
        [...movements]
          .sort(
            (a, b) =>
              new Date(
                b.createdAt
              ).getTime() -
              new Date(
                a.createdAt
              ).getTime()
          )
          .slice(0, 8),
      [movements]
    )

  const alertItems =
    useMemo(
      () => [
        {
          label:
            'Entrées rapides à régulariser',
          value:
            pendingQuickEntries.length,
          href: '/movements',
          tone:
            pendingQuickEntries.length >
            0
              ? 'warn'
              : 'good',
        },
        {
          label:
            'Produits sous stock minimum',
          value:
            stats.lowStock,
          href: '/stocks',
          tone:
            stats.lowStock > 0
              ? 'warn'
              : 'good',
        },
        {
          label:
            'DLUO / DLC < 30 jours',
          value:
            stats.under30Days,
          href: '/stocks',
          tone:
            stats.under30Days > 0
              ? 'warn'
              : 'good',
        },
        {
          label:
            'Lots périmés',
          value:
            stats.expired,
          href: '/stocks',
          tone:
            stats.expired > 0
              ? 'danger'
              : 'good',
        },
        {
          label:
            'Commandes en cours',
          value:
            stats.pendingOrders,
          href: '/orders',
          tone:
            stats.pendingOrders > 0
              ? 'info'
              : 'good',
        },
        {
          label:
            'Réquisitions en cours',
          value:
            stats.pendingRequests,
          href: '/requests',
          tone:
            stats.pendingRequests > 0
              ? 'info'
              : 'good',
        },
      ],
      [
        pendingQuickEntries.length,
        stats,
      ]
    )

  const deliveredRequests =
    requests.filter(
      (request) =>
        request.status ===
        'Livrée'
    ).length

  const activeLots =
    products.reduce(
      (sum, product) =>
        sum +
        product.lots.length,
      0
    )

  const statStyle = {
    padding: 18,
    borderRadius: 16,
    background: '#fff',
    border: '1px solid #e5e7eb',
  } as const

  return (
    <Page
      title="Dashboard"
      subtitle="Pilotage, rapports et analyses NukuStock"
      action={
        <div
          style={{
            position: 'relative',
          }}
        >
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              setDisplayOpen(
                (current) =>
                  !current
              )
            }
          >
            Affichage
          </button>

          {displayOpen && (
            <div
              style={{
                position:
                  'absolute',
                top:
                  'calc(100% + 8px)',
                right: 0,
                width: 300,
                zIndex: 50,
                padding: 14,
                border:
                  '1px solid #e5e7eb',
                borderRadius: 14,
                background: '#fff',
                boxShadow:
                  '0 18px 50px rgba(16,24,40,.16)',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  marginBottom: 10,
                }}
              >
                Blocs du Dashboard
              </div>

              {(
                Object.keys(
                  DASHBOARD_BLOCK_LABELS
                ) as DashboardBlockKey[]
              ).map((key) => (
                <label
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems:
                      'center',
                    gap: 9,
                    padding:
                      '7px 0',
                    cursor:
                      'pointer',
                    fontSize: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      dashboardVisibility[
                        key
                      ]
                    }
                    onChange={(
                      event
                    ) =>
                      setBlockVisible(
                        key,
                        event.target
                          .checked
                      )
                    }
                  />

                  <span>
                    {
                      DASHBOARD_BLOCK_LABELS[
                        key
                      ]
                    }
                  </span>
                </label>
              ))}

              <button
                className="button secondary small"
                type="button"
                onClick={() => {
                  setDashboardVisibility(
                    DEFAULT_DASHBOARD_VISIBILITY
                  )

                  localStorage.setItem(
                    DASHBOARD_VISIBILITY_KEY,
                    JSON.stringify(
                      DEFAULT_DASHBOARD_VISIBILITY
                    )
                  )
                }}
                style={{
                  marginTop: 8,
                  width: '100%',
                }}
              >
                Tout afficher
              </button>
            </div>
          )}
        </div>
      }
    >


      {dashboardVisibility.operationalSummary && (
      <Card>
        <div
          style={{
            fontSize: 11,
            color: '#667085',
            fontWeight: 800,
            letterSpacing: '.08em',
          }}
        >
          RAPPORTS & ANALYSES
        </div>

        <h2
          style={{
            margin: '5px 0 14px',
            fontSize: 22,
          }}
        >
          Synthèse opérationnelle
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(180px,1fr))',
            gap: 12,
          }}
        >
          <div style={statStyle}>
            <div
              style={{
                fontSize: 12,
                color: '#667085',
              }}
            >
              Valeur stock
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                marginTop: 7,
              }}
            >
              {stats.totalStockValue.toLocaleString(
                'fr-FR'
              )}{' '}
              XPF
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: '#98a2b3',
              }}
            >
              Tous les lieux
            </div>
          </div>

          <div style={statStyle}>
            <div
              style={{
                fontSize: 12,
                color: '#667085',
              }}
            >
              Demandes livrées
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                marginTop: 7,
              }}
            >
              {deliveredRequests}
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: '#98a2b3',
              }}
            >
              Depuis la remise à zéro
            </div>
          </div>

          <div style={statStyle}>
            <div
              style={{
                fontSize: 12,
                color: '#667085',
              }}
            >
              Transferts
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                marginTop: 7,
              }}
            >
              {transfers.length}
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: '#98a2b3',
              }}
            >
              Mouvements enregistrés
            </div>
          </div>

          <div style={statStyle}>
            <div
              style={{
                fontSize: 12,
                color: '#667085',
              }}
            >
              Lots actifs
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                marginTop: 7,
              }}
            >
              {activeLots}
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: '#98a2b3',
              }}
            >
              Avec DLUO / DLC
            </div>
          </div>
        </div>

        {dashboardVisibility.stockByLocation && (
        <div
          style={{
            marginTop: 18,
          }}
        >
          <h3
            style={{
              margin: '0 0 10px',
              fontSize: 16,
            }}
          >
            Stock par lieu
          </h3>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Lieu</th>
                  <th>Quantité</th>
                  <th>Valorisation</th>
                  <th>Part</th>
                </tr>
              </thead>

              <tbody>
                {byLocation.map(
                  (item) => (
                    <tr
                      key={
                        item.location
                      }
                    >
                      <td>
                        <strong>
                          {
                            item.location
                          }
                        </strong>
                      </td>

                      <td>
                        {item.qty.toLocaleString(
                          'fr-FR'
                        )}
                      </td>

                      <td>
                        {item.value.toLocaleString(
                          'fr-FR'
                        )}{' '}
                        XPF
                      </td>

                      <td>
                        <Badge tone="neutral">
                          {stats.totalQty
                            ? Math.round(
                                (item.qty /
                                  Math.max(
                                    1,
                                    stats.totalQty
                                  )) *
                                  100
                              )
                            : 0}
                          %
                        </Badge>
                      </td>
                    </tr>
                  )
                )}

                {byLocation.length ===
                  0 && (
                  <tr>
                    <td colSpan={4}>
                      Aucun stock par lieu disponible.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </Card>
      )}

      <div
        style={{
          height: 16,
        }}
      />

      {dashboardVisibility.mainStats && (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit,minmax(190px,1fr))',
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div style={statStyle}>
          <div
            style={{
              fontSize: 12,
              color: '#667085',
            }}
          >
            Valeur totale du stock
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              marginTop: 7,
            }}
          >
            {stats.totalStockValue.toLocaleString(
              'fr-FR'
            )}{' '}
            XPF
          </div>
        </div>

        <div style={statStyle}>
          <div
            style={{
              fontSize: 12,
              color: '#667085',
            }}
          >
            Références produits
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              marginTop: 7,
            }}
          >
            {products.length}
          </div>
        </div>

        <div style={statStyle}>
          <div
            style={{
              fontSize: 12,
              color: '#667085',
            }}
          >
            Quantité totale
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              marginTop: 7,
            }}
          >
            {stats.totalQty.toLocaleString(
              'fr-FR'
            )}
          </div>
        </div>

        <div style={statStyle}>
          <div
            style={{
              fontSize: 12,
              color: '#667085',
            }}
          >
            Sous stock minimum
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              marginTop: 7,
            }}
          >
            {stats.lowStock}
          </div>
        </div>

        <div style={statStyle}>
          <div
            style={{
              fontSize: 12,
              color: '#667085',
            }}
          >
            DLUO &lt; 30 jours
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              marginTop: 7,
            }}
          >
            {stats.under30Days}
          </div>
        </div>

        <div style={statStyle}>
          <div
            style={{
              fontSize: 12,
              color: '#667085',
            }}
          >
            Lots périmés
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              marginTop: 7,
            }}
          >
            {stats.expired}
          </div>
        </div>

        <div style={statStyle}>
          <div
            style={{
              fontSize: 12,
              color: '#667085',
            }}
          >
            Commandes en cours
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              marginTop: 7,
            }}
          >
            {stats.pendingOrders}
          </div>
        </div>

        <div style={statStyle}>
          <div
            style={{
              fontSize: 12,
              color: '#667085',
            }}
          >
            Réquisitions en cours
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              marginTop: 7,
            }}
          >
            {stats.pendingRequests}
          </div>
        </div>
      </div>
      )}

      {dashboardVisibility.charts && (
        <div style={{ marginBottom: 16 }}>
          <Card>
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  color: '#667085',
                  fontWeight: 800,
                  letterSpacing: '.08em',
                }}
              >
                RAPPORTS GRAPHIQUES
              </div>
              <h2 style={{ margin: '5px 0 0', fontSize: 22 }}>
                Analyse visuelle du stock
              </h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
                gap: 16,
              }}
            >
              <div style={statStyle}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>
                  Stock par catégorie
                </h3>
                <DashboardBarChart
                  items={stockByCategory}
                  valueFormatter={(value) =>
                    `${Math.round(value).toLocaleString('fr-FR')} XPF`
                  }
                />
              </div>

              <div style={statStyle}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>
                  Valorisation par lieu
                </h3>
                <DashboardBarChart
                  items={byLocation.slice(0, 10).map((item) => ({
                    label: item.location,
                    value: item.value,
                  }))}
                  valueFormatter={(value) =>
                    `${Math.round(value).toLocaleString('fr-FR')} XPF`
                  }
                />
              </div>

              <div style={statStyle}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>
                  DLUO / DLC
                </h3>
                <DashboardDonut items={expiryChart} centerLabel="unités datées" />
              </div>

              <div style={statStyle}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>
                  Top consommations
                </h3>
                <DashboardBarChart
                  items={topConsumption.slice(0, 8).map((line) => ({
                    label: line.productName,
                    value: Math.max(0, Number(line.diff) || 0),
                  }))}
                />
              </div>

              <div style={statStyle}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>
                  Mouvements sur 30 jours
                </h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: '#667085',
                    }}
                  >
                    <span>Entrées</span>
                    <strong style={{ color: '#101828' }}>
                      {movement30Days
                        .reduce((sum, row) => sum + row.in, 0)
                        .toLocaleString('fr-FR')}
                    </strong>
                  </div>
                  <div
                    style={{
                      height: 90,
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 3,
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    {movement30Days.map((row) => {
                      const max = Math.max(
                        1,
                        ...movement30Days.map((item) => Math.max(item.in, item.out))
                      )
                      return (
                        <div
                          key={row.key}
                          title={`${row.label} · Entrées ${row.in} · Sorties ${row.out}`}
                          style={{
                            flex: 1,
                            minWidth: 2,
                            height: `${Math.max(2, (Math.max(row.in, row.out) / max) * 100)}%`,
                            borderRadius: '4px 4px 0 0',
                            background: row.in >= row.out ? '#0b1220' : '#98a2b3',
                          }}
                        />
                      )
                    })}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 10,
                      color: '#98a2b3',
                    }}
                  >
                    <span>{movement30Days[0]?.label}</span>
                    <span>{movement30Days[movement30Days.length - 1]?.label}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: '#667085',
                    }}
                  >
                    <span>Sorties</span>
                    <strong style={{ color: '#101828' }}>
                      {movement30Days
                        .reduce((sum, row) => sum + row.out, 0)
                        .toLocaleString('fr-FR')}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={statStyle}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>
                  Réquisitions par statut
                </h3>
                <DashboardBarChart items={requestStatusChart} />
                <h3 style={{ margin: '20px 0 14px', fontSize: 15 }}>
                  Commandes par statut
                </h3>
                <DashboardBarChart items={orderStatusChart} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {dashboardVisibility.alerts && (
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
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: '#667085',
                  fontWeight: 800,
                  letterSpacing:
                    '.08em',
                }}
              >
                À TRAITER
              </div>

              <h2
                style={{
                  margin:
                    '4px 0 0',
                }}
              >
                Alertes opérationnelles
              </h2>
            </div>

            <Link
              href="/movements"
              className="button secondary small"
            >
              Voir les mouvements
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit,minmax(220px,1fr))',
              gap: 10,
              marginTop: 16,
            }}
          >
            {alertItems.map(
              (item) => (
                <Link
                  key={
                    item.label
                  }
                  href={
                    item.href
                  }
                  style={{
                    display:
                      'flex',
                    justifyContent:
                      'space-between',
                    alignItems:
                      'center',
                    gap: 10,
                    padding: 13,
                    border:
                      '1px solid #e5e7eb',
                    borderRadius: 12,
                    color:
                      '#101828',
                    textDecoration:
                      'none',
                    background:
                      '#fff',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </span>

                  <Badge
                    tone={
                      item.tone as
                        | 'good'
                        | 'warn'
                        | 'danger'
                        | 'info'
                    }
                  >
                    {item.value}
                  </Badge>
                </Link>
              )
            )}
          </div>
        </Card>
      )}

      {(dashboardVisibility.quickEntries ||
        dashboardVisibility.recentMovements) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(360px,1fr))',
            gap: 16,
            marginTop: 16,
          }}
        >
          {dashboardVisibility.quickEntries && (
            <Card>
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems:
                    'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                    }}
                  >
                    Entrées rapides
                  </h2>
                  <div
                    style={{
                      marginTop: 4,
                      color:
                        '#667085',
                      fontSize: 11,
                    }}
                  >
                    {
                      pendingQuickEntries.length
                    }{' '}
                    à régulariser
                  </div>
                </div>

                <Link
                  href="/stock-entry"
                  className="button secondary small"
                >
                  Nouvelle entrée
                </Link>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: 'grid',
                  gap: 10,
                }}
              >
                {recentQuickEntries.length >
                0 ? (
                  recentQuickEntries.map(
                    (group) => {
                      const total =
                        group.movements.reduce(
                          (
                            sum,
                            movement
                          ) =>
                            sum +
                            movement.quantity,
                          0
                        )

                      const pending =
                        group.movements.some(
                          (
                            movement
                          ) =>
                            movement.regularizationStatus ===
                            'A_REGULARISER'
                        )

                      return (
                        <Link
                          key={
                            group.reference
                          }
                          href="/movements"
                          style={{
                            display:
                              'flex',
                            justifyContent:
                              'space-between',
                            alignItems:
                              'center',
                            gap: 12,
                            paddingBottom:
                              10,
                            borderBottom:
                              '1px solid #e5e7eb',
                            color:
                              '#101828',
                            textDecoration:
                              'none',
                          }}
                        >
                          <div>
                            <strong>
                              {
                                group.reference
                              }
                            </strong>
                            <div
                              style={{
                                marginTop:
                                  3,
                                fontSize:
                                  11,
                                color:
                                  '#667085',
                              }}
                            >
                              {
                                group
                                  .movements
                                  .length
                              }{' '}
                              produit(s) ·{' '}
                              {total.toLocaleString(
                                'fr-FR'
                              )}{' '}
                              unité(s)
                            </div>
                          </div>

                          <Badge
                            tone={
                              pending
                                ? 'warn'
                                : 'good'
                            }
                          >
                            {pending
                              ? 'À régulariser'
                              : 'Régularisé'}
                          </Badge>
                        </Link>
                      )
                    }
                  )
                ) : (
                  <div className="muted">
                    Aucune entrée rapide.
                  </div>
                )}
              </div>
            </Card>
          )}

          {dashboardVisibility.recentMovements && (
            <Card>
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems:
                    'center',
                  gap: 10,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                  }}
                >
                  Mouvements récents
                </h2>

                <Link
                  href="/movements"
                  className="button secondary small"
                >
                  Tout voir
                </Link>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: 'grid',
                  gap: 10,
                }}
              >
                {recentMovements.length >
                0 ? (
                  recentMovements.map(
                    (
                      movement
                    ) => (
                      <div
                        key={
                          movement.id
                        }
                        style={{
                          display:
                            'grid',
                          gridTemplateColumns:
                            '60px minmax(0,1fr) auto',
                          gap: 10,
                          alignItems:
                            'center',
                          paddingBottom:
                            10,
                          borderBottom:
                            '1px solid #e5e7eb',
                        }}
                      >
                        <strong
                          style={{
                            fontSize:
                              13,
                          }}
                        >
                          {movementSign(
                            movement.quantity
                          )}
                          {movement.quantity.toLocaleString(
                            'fr-FR'
                          )}
                        </strong>

                        <div>
                          <div
                            style={{
                              fontWeight:
                                700,
                              fontSize:
                                12,
                            }}
                          >
                            {
                              movement.productName
                            }
                          </div>
                          <div
                            style={{
                              marginTop:
                                2,
                              color:
                                '#667085',
                              fontSize:
                                10,
                            }}
                          >
                            {movement.toLocation ||
                              movement.fromLocation ||
                              '—'}
                            {movement.referenceId
                              ? ` · ${movement.referenceId}`
                              : ''}
                          </div>
                        </div>

                        <Badge
                          tone={
                            movement.quantity >=
                            0
                              ? 'good'
                              : 'warn'
                          }
                        >
                          {
                            movement.type
                          }
                        </Badge>
                      </div>
                    )
                  )
                ) : (
                  <div className="muted">
                    Aucun mouvement enregistré.
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit,minmax(320px,1fr))',
          gap: 16,
        }}
      >
        {dashboardVisibility.latestInventory && (
        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              gap: 12,
              alignItems:
                'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>
                Dernier inventaire
              </h2>

              {latestInventory ? (
                <div
                  style={{
                    marginTop: 5,
                    color: '#667085',
                    fontSize: 12,
                  }}
                >
                  {latestInventory.id} ·{' '}
                  {new Date(
                    latestInventory.date
                  ).toLocaleDateString('fr-FR')}
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 5,
                    color: '#667085',
                    fontSize: 12,
                  }}
                >
                  Aucun inventaire clôturé
                </div>
              )}
            </div>

            {latestInventory && (
              <Badge tone="info">
                {latestInventory.guestCount || 0}{' '}
                invité
                {(latestInventory.guestCount || 0) >
                1
                  ? 's'
                  : ''}
              </Badge>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(2,minmax(0,1fr))',
              gap: 12,
              marginTop: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: '#667085',
                }}
              >
                Consommation totale
              </div>

              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  marginTop: 4,
                }}
              >
                {consumptionSummary.totalConsumption.toLocaleString(
                  'fr-FR',
                  {
                    maximumFractionDigits: 2,
                  }
                )}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  color: '#667085',
                }}
              >
                Valeur consommée
              </div>

              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  marginTop: 4,
                }}
              >
                {consumptionSummary.totalValue.toLocaleString(
                  'fr-FR'
                )}{' '}
                XPF
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  color: '#667085',
                }}
              >
                Moyenne / jour
              </div>

              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  marginTop: 4,
                }}
              >
                {consumptionSummary.perDay.toLocaleString(
                  'fr-FR',
                  {
                    maximumFractionDigits: 2,
                  }
                )}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  color: '#667085',
                }}
              >
                / invité / jour
              </div>

              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  marginTop: 4,
                }}
              >
                {consumptionSummary.perGuestPerDay.toLocaleString(
                  'fr-FR',
                  {
                    maximumFractionDigits: 3,
                  }
                )}
              </div>
            </div>
          </div>
        </Card>
        )}

        {dashboardVisibility.topConsumption && (
        <Card>
          <h2 style={{ margin: 0 }}>
            Plus fortes consommations
          </h2>

          <div
            style={{
              marginTop: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {topConsumption.length > 0 ? (
              topConsumption.map((line) => (
                <div
                  key={`${line.productId}-${line.location || ''}`}
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: 12,
                    paddingBottom: 9,
                    borderBottom:
                      '1px solid #e5e7eb',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      {line.productName}
                    </div>

                    {line.location && (
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 11,
                          color: '#667085',
                        }}
                      >
                        {line.location}
                      </div>
                    )}
                  </div>

                  <strong>
                    {Number(
                      line.diff
                    ).toLocaleString('fr-FR')}
                  </strong>
                </div>
              ))
            ) : (
              <div className="muted">
                Aucune consommation disponible.
              </div>
            )}
          </div>
        </Card>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit,minmax(360px,1fr))',
          gap: 16,
          marginTop: 16,
        }}
      >
        {dashboardVisibility.orders && (
        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <h2 style={{ margin: 0 }}>
              Commandes fournisseurs
            </h2>

            <Badge tone="neutral">
              {orders.length}
            </Badge>
          </div>

          <div
            style={{
              marginTop: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    gap: 12,
                    alignItems: 'center',
                    paddingBottom: 10,
                    borderBottom:
                      '1px solid #e5e7eb',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      {order.supplierName}
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 11,
                        color: '#667085',
                      }}
                    >
                      {order.id} ·{' '}
                      {new Date(
                        order.date
                      ).toLocaleDateString(
                        'fr-FR'
                      )}
                    </div>
                  </div>

                  <Badge
                    tone={
                      order.status === 'Clôturé' ||
                      order.status === 'Traité'
                        ? 'good'
                        : order.status ===
                          'En attente'
                        ? 'warn'
                        : 'info'
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="muted">
                Aucune commande fournisseur.
              </div>
            )}
          </div>
        </Card>
        )}

        {dashboardVisibility.requests && (
        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <h2 style={{ margin: 0 }}>
              Réquisitions
            </h2>

            <Badge tone="neutral">
              {requests.length}
            </Badge>
          </div>

          <div
            style={{
              marginTop: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {recentRequests.length > 0 ? (
              recentRequests.map(
                (request) => (
                  <div
                    key={request.id}
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 12,
                      alignItems:
                        'center',
                      paddingBottom: 10,
                      borderBottom:
                        '1px solid #e5e7eb',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                        }}
                      >
                        {request.service}
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 11,
                          color: '#667085',
                        }}
                      >
                        {request.id} ·{' '}
                        {request.items.length}{' '}
                        produit
                        {request.items.length >
                        1
                          ? 's'
                          : ''}
                      </div>
                    </div>

                    <Badge
                      tone={
                        request.status ===
                        'Livrée'
                          ? 'good'
                          : request.status ===
                            'Partielle'
                          ? 'warn'
                          : request.status ===
                            'Validée'
                          ? 'info'
                          : 'neutral'
                      }
                    >
                      {request.status}
                    </Badge>
                  </div>
                )
              )
            ) : (
              <div className="muted">
                Aucune réquisition.
              </div>
            )}
          </div>
        </Card>
        )}
      </div>
    </Page>
  )
}