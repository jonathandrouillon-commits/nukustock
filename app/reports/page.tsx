'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Page, Card, Badge } from '@/components/ui'
import {
  useInventories,
  useOrders,
  useProducts,
  useRequests,
  useSetups,
  useTransfers,
} from '@/lib/store'

export default function Home() {
  const { items: products } = useProducts()
  const { items: orders } = useOrders()
  const { items: requests } = useRequests()
  const { items: inventories } = useInventories()
  const { items: setups } = useSetups()
  const { items: transfers } = useTransfers()

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
      subtitle="Vue d’ensemble de NukuStock"
    >
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 18,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: '#667085',
                fontWeight: 800,
                letterSpacing: '.08em',
              }}
            >
              SET UP
            </div>

            <h2
              style={{
                margin: '5px 0 5px',
                fontSize: 22,
              }}
            >
              Fiches et photos des Set Up Bar
            </h2>

            <div
              style={{
                color: '#667085',
                fontSize: 13,
              }}
            >
              {setups.length} Set Up enregistré
              {setups.length > 1 ? 's' : ''} · photos, matériel,
              verrerie, produits et consignes par lieu.
            </div>
          </div>

          <Link
            href="/setup"
            className="button"
          >
            Ouvrir SET UP
          </Link>
        </div>
      </Card>

      <div
        style={{
          height: 16,
        }}
      />

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
      </Card>

      <div
        style={{
          height: 16,
        }}
      />

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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit,minmax(320px,1fr))',
          gap: 16,
        }}
      >
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
      </div>
    </Page>
  )
}