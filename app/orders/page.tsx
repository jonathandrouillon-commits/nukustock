'use client'

import {
  useMemo,
  useState,
  type CSSProperties,
} from 'react'

import {
  Badge,
  Card,
  Page,
} from '@/components/ui'

import {
  useMasterData,
  useOrders,
  useProducts,
  useStockEngine,
  useSuppliers,
} from '@/lib/store'

import type {
  SupplierOrder,
  SupplierOrderLine,
} from '@/lib/types'

const statuses:
  SupplierOrder['status'][] = [
  'En traitement',
  'Validé',
  'En attente',
  'Clôturé',
  'Traité',
]

const receptionModes:
  NonNullable<
    SupplierOrder['receptionMode']
  >[] = [
  'Bateau',
  'Avion',
  'Achat local',
]

const emptyOrder:
  SupplierOrder = {
  id: '',
  supplierId: '',
  supplierName: '',
  date:
    new Date()
      .toISOString()
      .slice(0, 10),

  quoteNumber: '',
  purchaseOrderNumber: '',
  invoiceNumber: '',

  bl: '',
  receptionMode: 'Bateau',
  departureDate: '',

  status: 'En traitement',
  lines: [],
}

const createEmptyLine =
  (): SupplierOrderLine => ({
    productId: '',
    productName: '',
    ordered: 1,
    received: 0,
  })

function getStatusTone(
  status:
    SupplierOrder['status']
):
  | 'neutral'
  | 'good'
  | 'warn'
  | 'danger'
  | 'info' {
  if (
    status === 'Clôturé' ||
    status === 'Traité'
  ) {
    return 'good'
  }

  if (
    status === 'En attente'
  ) {
    return 'warn'
  }

  if (
    status === 'Validé' ||
    status === 'En traitement'
  ) {
    return 'info'
  }

  return 'neutral'
}

export default function Orders() {
  const {
    items,
    save,
  } = useOrders()

  const {
    items: suppliers,
  } = useSuppliers()

  const {
    items: products,
  } = useProducts()

  const {
    items: masterData,
  } = useMasterData()

  const {
    receiveOrder,
  } = useStockEngine()

  const [open, setOpen] =
    useState(false)

  const [
    receptionOpen,
    setReceptionOpen,
  ] = useState(false)

  const [
    receptionOrderId,
    setReceptionOrderId,
  ] = useState('')

  const [
    receptionLocation,
    setReceptionLocation,
  ] = useState('')

  const [
    receptionLines,
    setReceptionLines,
  ] = useState<
    SupplierOrderLine[]
  >([])

  const [form, setForm] =
    useState<SupplierOrder>(
      emptyOrder
    )

  const [q, setQ] =
    useState('')

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('Tous')

  const [msg, setMsg] =
    useState('')

  const [error, setError] =
    useState('')

  const locations =
    useMemo(
      () =>
        masterData
          .filter(
            (item) =>
              item.type ===
                'location' &&
              item.active !==
                false
          )
          .map(
            (item) =>
              item.name
          )
          .sort(
            (a, b) =>
              a.localeCompare(
                b,
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

  const shown =
    useMemo(() => {
      const search =
        q
          .trim()
          .toLowerCase()

      return [...items]
        .filter(
          (order) => {
            const matchesSearch =
              [
                order.id,
                order.supplierName,
                order.quoteNumber,
                order.purchaseOrderNumber,
                order.invoiceNumber,
                order.bl,
                order.receptionLocation,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(
                  search
                )

            const matchesStatus =
              statusFilter ===
                'Tous' ||
              order.status ===
                statusFilter

            return (
              matchesSearch &&
              matchesStatus
            )
          }
        )
        .sort(
          (a, b) =>
            new Date(
              b.date
            ).getTime() -
            new Date(
              a.date
            ).getTime()
        )
    }, [
      items,
      q,
      statusFilter,
    ])

  const supplierProducts =
    useMemo(() => {
      if (!form.supplierId) {
        return []
      }

      const supplier =
        suppliers.find(
          (item) =>
            item.id ===
            form.supplierId
        )

      return products
        .filter(
          (product) =>
            product.mainSupplierId ===
              form.supplierId ||
            (
              supplier?.name &&
              product.mainSupplier
                ?.trim()
                .toLowerCase() ===
                supplier.name
                  .trim()
                  .toLowerCase()
            )
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
              'fr'
            )
        )
    }, [
      form.supplierId,
      products,
      suppliers,
    ])

  const openNew = () => {
    setError('')
    setMsg('')

    setForm({
      ...emptyOrder,
      date:
        new Date()
          .toISOString()
          .slice(0, 10),
      lines: [
        createEmptyLine(),
      ],
    })

    setOpen(true)
  }

  const openEdit = (
    order: SupplierOrder
  ) => {
    if (
      order.stockAppliedAt
    ) {
      setError(
        'Cette commande a déjà été réceptionnée dans le stock et ne peut plus être modifiée.'
      )
      return
    }

    setError('')
    setMsg('')

    setForm({
      ...order,
      quoteNumber:
        order.quoteNumber ||
        '',
      purchaseOrderNumber:
        order.purchaseOrderNumber ||
        '',
      invoiceNumber:
        order.invoiceNumber ||
        '',
      receptionMode:
        order.receptionMode ||
        'Bateau',
      departureDate:
        order.departureDate ||
        '',
      lines:
        order.lines.length >
        0
          ? order.lines.map(
              (line) => ({
                ...line,
              })
            )
          : [
              createEmptyLine(),
            ],
    })

    setOpen(true)
  }

  const addLine = () => {
    setForm({
      ...form,
      lines: [
        ...form.lines,
        createEmptyLine(),
      ],
    })
  }

  const removeLine = (
    index: number
  ) => {
    setForm({
      ...form,
      lines:
        form.lines.length <=
        1
          ? form.lines
          : form.lines.filter(
              (
                _,
                lineIndex
              ) =>
                lineIndex !==
                index
            ),
    })
  }

  const updateLine = (
    index: number,
    patch:
      Partial<
        SupplierOrderLine
      >
  ) => {
    setForm({
      ...form,
      lines:
        form.lines.map(
          (
            line,
            lineIndex
          ) =>
            lineIndex ===
            index
              ? {
                  ...line,
                  ...patch,
                }
              : line
        ),
    })
  }

  const selectProduct = (
    index: number,
    productId: string
  ) => {
    const product =
      products.find(
        (item) =>
          item.id ===
          productId
      )

    updateLine(
      index,
      {
        productId,
        productName:
          product?.name ||
          '',
      }
    )
  }

  const selectSupplier = (
    supplierId: string
  ) => {
    const supplier =
      suppliers.find(
        (item) =>
          item.id ===
          supplierId
      )

    setForm({
      ...form,
      supplierId,
      supplierName:
        supplier?.name || '',
      lines: [
        createEmptyLine(),
      ],
    })
  }

  const submit = () => {
    setError('')
    setMsg('')

    if (!form.supplierId) {
      setError(
        'Sélectionne un fournisseur.'
      )
      return
    }

    if (!form.date) {
      setError(
        'Renseigne la date de commande.'
      )
      return
    }

    const validLines =
      form.lines.filter(
        (line) =>
          line.productId &&
          Number(
            line.ordered
          ) > 0
      )

    if (
      validLines.length ===
      0
    ) {
      setError(
        'Ajoute au moins un produit avec une quantité commandée supérieure à 0.'
      )
      return
    }

    if (
      validLines.some(
        (line) =>
          line.ordered <
            0 ||
          line.received <
            0
      )
    ) {
      setError(
        'Les quantités négatives ne sont pas autorisées.'
      )
      return
    }

    const order:
      SupplierOrder = {
      ...form,

      id:
        form.id ||
        `CMD-${Date.now()
          .toString()
          .slice(-6)}`,

      lines:
        validLines.map(
          (line) => ({
            ...line,
            received:
              Math.max(
                0,
                Number(
                  line.received
                ) || 0
              ),
          })
        ),
    }

    save(
      form.id
        ? items.map(
            (item) =>
              item.id ===
              form.id
                ? order
                : item
          )
        : [
            order,
            ...items,
          ]
    )

    setOpen(false)
    setForm(emptyOrder)

    setMsg(
      form.id
        ? 'Commande fournisseur mise à jour.'
        : 'Commande fournisseur créée.'
    )
  }

  const openReception = (
    order: SupplierOrder
  ) => {
    setError('')
    setMsg('')

    if (
      order.stockAppliedAt
    ) {
      setError(
        'Cette commande a déjà été réceptionnée dans le stock.'
      )
      return
    }

    if (
      order.lines.length ===
      0
    ) {
      setError(
        'Cette commande ne contient aucun produit.'
      )
      return
    }

    if (
      locations.length === 0
    ) {
      setError(
        'Aucun lieu de stockage actif. Ajoute d’abord un lieu dans Lieux de stockage.'
      )
      return
    }

    setReceptionOrderId(
      order.id
    )

    setReceptionLocation(
      order.receptionLocation ||
        locations[0] ||
        ''
    )

    setReceptionLines(
      order.lines.map(
        (line) => ({
          ...line,

          received:
            line.received >
            0
              ? line.received
              : line.ordered,
        })
      )
    )

    setReceptionOpen(
      true
    )
  }

  const updateReceptionLine =
    (
      index: number,
      received: number
    ) => {
      setReceptionLines(
        (current) =>
          current.map(
            (
              line,
              lineIndex
            ) =>
              lineIndex ===
              index
                ? {
                    ...line,
                    received:
                      Math.min(
                        Math.max(
                          0,
                          received
                        ),
                        line.ordered
                      ),
                  }
                : line
          )
      )
    }

  const confirmReception =
    () => {
      setError('')
      setMsg('')

      if (
        !receptionLocation
      ) {
        setError(
          'Choisis le lieu de stockage de réception.'
        )
        return
      }

      const order =
        items.find(
          (item) =>
            item.id ===
            receptionOrderId
        )

      if (!order) {
        setError(
          'Commande introuvable.'
        )
        return
      }

      const totalReceived =
        receptionLines.reduce(
          (sum, line) =>
            sum +
            Math.max(
              0,
              Number(
                line.received
              ) || 0
            ),
          0
        )

      if (
        totalReceived <=
        0
      ) {
        setError(
          'Saisis au moins une quantité reçue.'
        )
        return
      }

      const updatedOrder:
        SupplierOrder = {
        ...order,
        lines:
          receptionLines.map(
            (line) => ({
              ...line,
              received:
                Math.max(
                  0,
                  Number(
                    line.received
                  ) || 0
                ),
            })
          ),
      }

      const nextOrders =
        items.map(
          (item) =>
            item.id ===
            updatedOrder.id
              ? updatedOrder
              : item
        )

      /*
       * On écrit d'abord les
       * quantités réellement reçues.
       * Le moteur central relit ensuite
       * exactement cette commande.
       */
      save(nextOrders)

      localStorage.setItem(
        'nukustock_orders_v11',
        JSON.stringify(
          nextOrders
        )
      )

      window.dispatchEvent(
        new CustomEvent(
          'nukustock-change',
          {
            detail: {
              key:
                'nukustock_orders_v11',
            },
          }
        )
      )

      window.setTimeout(
        () => {
          const result =
            receiveOrder(
              updatedOrder.id,
              receptionLocation
            )

          if (!result.ok) {
            setError(
              result.message
            )
            return
          }

          setReceptionOpen(
            false
          )

          setMsg(
            result.message
          )
        },
        0
      )
    }

  const closeOrder = (
    order:
      SupplierOrder
  ) => {
    if (
      order.stockAppliedAt
    ) {
      return
    }

    save(
      items.map(
        (item) =>
          item.id ===
          order.id
            ? {
                ...item,
                status:
                  'Clôturé',
              }
            : item
      )
    )

    setMsg(
      `Commande ${order.id} clôturée sans réception de stock.`
    )
  }

  const labelStyle:
    CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 7,
  }

  const fieldStyle:
    CSSProperties = {
    display: 'flex',
    flexDirection:
      'column',
  }

  return (
    <Page
      title="Commandes fournisseurs"
      subtitle="Création, suivi et réception connectée au stock"
      action={
        <button
          className="button"
          onClick={openNew}
        >
          + Nouvelle commande
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

      <div
        style={{
          padding: 12,
          marginBottom: 14,
          borderRadius: 12,
          background:
            'rgba(59,130,246,.08)',
          border:
            '1px solid rgba(59,130,246,.16)',
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        <strong>
          Réception connectée :
        </strong>{' '}
        au moment de réceptionner
        une commande, NukuStock
        demande le lieu de stockage,
        augmente automatiquement le
        stock des produits et crée
        les mouvements
        « Réception fournisseur ».
      </div>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Rechercher fournisseur, devis, BC, facture..."
          value={q}
          onChange={(event) =>
            setQ(
              event.target.value
            )
          }
        />

        <select
          className="select"
          value={
            statusFilter
          }
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
        >
          <option value="Tous">
            Tous les statuts
          </option>

          {statuses.map(
            (status) => (
              <option
                key={
                  status
                }
                value={
                  status
                }
              >
                {status}
              </option>
            )
          )}
        </select>
      </div>

      <Card>
        <div className="tableWrap">
          <table
            style={{
              minWidth:
                1250,
            }}
          >
            <thead>
              <tr>
                <th>
                  Commande
                </th>
                <th>
                  Fournisseur
                </th>
                <th>
                  Devis
                </th>
                <th>
                  BC
                </th>
                <th>
                  Facture
                </th>
                <th>
                  Transport
                </th>
                <th>
                  Départ
                </th>
                <th>
                  Réception stock
                </th>
                <th>
                  Statut
                </th>
                <th>
                  Produits
                </th>
                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {shown.map(
                (order) => (
                  <tr
                    key={
                      order.id
                    }
                  >
                    <td>
                      <strong>
                        {
                          order.id
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
                        {new Date(
                          `${order.date}T12:00:00`
                        ).toLocaleDateString(
                          'fr-FR'
                        )}
                      </div>
                    </td>

                    <td>
                      <strong>
                        {
                          order.supplierName
                        }
                      </strong>
                    </td>

                    <td>
                      {order.quoteNumber ||
                        '—'}
                    </td>

                    <td>
                      {order.purchaseOrderNumber ||
                        '—'}
                    </td>

                    <td>
                      {order.invoiceNumber ||
                        '—'}
                    </td>

                    <td>
                      {order.receptionMode ||
                        '—'}

                      {order.bl && (
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
                          BL :{' '}
                          {
                            order.bl
                          }
                        </div>
                      )}
                    </td>

                    <td>
                      {order.departureDate
                        ? new Date(
                            `${order.departureDate}T12:00:00`
                          ).toLocaleDateString(
                            'fr-FR'
                          )
                        : '—'}
                    </td>

                    <td>
                      {order.stockAppliedAt ? (
                        <div>
                          <Badge tone="good">
                            Réceptionnée
                          </Badge>

                          <div
                            style={{
                              marginTop:
                                4,
                              fontSize:
                                11,
                            }}
                          >
                            {order.receptionLocation ||
                              '—'}
                          </div>
                        </div>
                      ) : (
                        <Badge tone="neutral">
                          À réceptionner
                        </Badge>
                      )}
                    </td>

                    <td>
                      <Badge
                        tone={getStatusTone(
                          order.status
                        )}
                      >
                        {
                          order.status
                        }
                      </Badge>
                    </td>

                    <td>
                      {
                        order.lines.length
                      }
                    </td>

                    <td>
                      <div
                        style={{
                          display:
                            'flex',
                          gap: 6,
                          flexWrap:
                            'wrap',
                        }}
                      >
                        {!order.stockAppliedAt && (
                          <button
                            className="button secondary small"
                            onClick={() =>
                              openEdit(
                                order
                              )
                            }
                          >
                            Modifier
                          </button>
                        )}

                        {!order.stockAppliedAt &&
                          order.status !==
                            'Clôturé' && (
                            <button
                              className="button small"
                              onClick={() =>
                                openReception(
                                  order
                                )
                              }
                            >
                              Réceptionner
                            </button>
                          )}

                        {!order.stockAppliedAt &&
                          order.status !==
                            'Clôturé' && (
                            <button
                              className="button secondary small"
                              onClick={() =>
                                closeOrder(
                                  order
                                )
                              }
                            >
                              Clôturer
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                )
              )}

              {shown.length ===
                0 && (
                <tr>
                  <td
                    colSpan={
                      11
                    }
                  >
                    Aucune commande fournisseur trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {open && (
        <div className="modalBackdrop">
          <div
            className="modal"
            style={{
              width:
                'min(1050px,100%)',
              maxHeight:
                '92vh',
              overflowY:
                'auto',
            }}
          >
            <div className="modalHead">
              <h2>
                {form.id
                  ? 'Modifier la commande'
                  : 'Nouvelle commande fournisseur'}
              </h2>

              <button
                className="button secondary small"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
              >
                Fermer
              </button>
            </div>

            <div
              style={{
                display:
                  'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(220px,1fr))',
                gap: 14,
              }}
            >
              <div
                style={
                  fieldStyle
                }
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Fournisseur *
                </label>

                <select
                  className="input"
                  value={
                    form.supplierId
                  }
                  onChange={(
                    event
                  ) =>
                    selectSupplier(
                      event
                        .target
                        .value
                    )
                  }
                >
                  <option value="">
                    Choisir un fournisseur
                  </option>

                  {suppliers
                    .filter(
                      (supplier) =>
                        supplier.active !==
                        false
                    )
                    .sort(
                      (a, b) =>
                        a.name.localeCompare(
                          b.name,
                          'fr'
                        )
                    )
                    .map(
                      (
                        supplier
                      ) => (
                        <option
                          key={
                            supplier.id
                          }
                          value={
                            supplier.id
                          }
                        >
                          {
                            supplier.name
                          }
                        </option>
                      )
                    )}
                </select>
              </div>

              <div
                style={
                  fieldStyle
                }
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Date de commande *
                </label>

                <input
                  className="input"
                  type="date"
                  value={
                    form.date
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      date:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </div>

              <div
                style={
                  fieldStyle
                }
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Numéro de devis
                </label>

                <input
                  className="input"
                  value={
                    form.quoteNumber ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      quoteNumber:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </div>

              <div
                style={
                  fieldStyle
                }
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Numéro de BC
                </label>

                <input
                  className="input"
                  value={
                    form.purchaseOrderNumber ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      purchaseOrderNumber:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </div>

              <div
                style={
                  fieldStyle
                }
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Numéro de facture
                </label>

                <input
                  className="input"
                  value={
                    form.invoiceNumber ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      invoiceNumber:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </div>

              <div
                style={
                  fieldStyle
                }
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  N° BL / Connaissement
                </label>

                <input
                  className="input"
                  value={
                    form.bl ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      bl:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </div>

              <div
                style={
                  fieldStyle
                }
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Mode de transport
                </label>

                <select
                  className="input"
                  value={
                    form.receptionMode ||
                    'Bateau'
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      receptionMode:
                        event
                          .target
                          .value as SupplierOrder['receptionMode'],
                    })
                  }
                >
                  {receptionModes.map(
                    (mode) => (
                      <option
                        key={
                          mode
                        }
                        value={
                          mode
                        }
                      >
                        {mode}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div
                style={
                  fieldStyle
                }
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Date de départ
                </label>

                <input
                  className="input"
                  type="date"
                  value={
                    form.departureDate ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      departureDate:
                        event
                          .target
                          .value,
                    })
                  }
                />
              </div>

              <div
                style={
                  fieldStyle
                }
              >
                <label
                  style={
                    labelStyle
                  }
                >
                  Statut
                </label>

                <select
                  className="input"
                  value={
                    form.status
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      status:
                        event
                          .target
                          .value as SupplierOrder['status'],
                    })
                  }
                >
                  {statuses.map(
                    (status) => (
                      <option
                        key={
                          status
                        }
                        value={
                          status
                        }
                      >
                        {status}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div
              style={{
                height: 1,
                background:
                  'rgba(255,255,255,.12)',
                margin:
                  '24px 0',
              }}
            />

            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                gap: 10,
                flexWrap:
                  'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize:
                      17,
                    fontWeight:
                      800,
                  }}
                >
                  Produits commandés
                </div>

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
                  Seuls les produits liés au fournisseur sélectionné sont proposés.
                </div>
              </div>

              <button
                className="button secondary small"
                type="button"
                disabled={
                  !form.supplierId
                }
                onClick={
                  addLine
                }
              >
                + Ajouter un produit
              </button>
            </div>

            {!form.supplierId && (
              <div
                style={{
                  marginTop:
                    12,
                  padding: 12,
                  borderRadius:
                    10,
                  background:
                    'rgba(245,158,11,.08)',
                  fontSize:
                    12,
                }}
              >
                Sélectionne d’abord un fournisseur.
              </div>
            )}

            {form.supplierId &&
              supplierProducts.length ===
                0 && (
                <div
                  style={{
                    marginTop:
                      12,
                    padding:
                      12,
                    borderRadius:
                      10,
                    background:
                      'rgba(245,158,11,.08)',
                    fontSize:
                      12,
                  }}
                >
                  Aucun produit n’est actuellement lié à ce fournisseur.
                </div>
              )}

            <div
              style={{
                marginTop:
                  12,
                display:
                  'flex',
                flexDirection:
                  'column',
                gap: 10,
              }}
            >
              {form.lines.map(
                (
                  line,
                  index
                ) => (
                  <div
                    key={
                      index
                    }
                    style={{
                      display:
                        'grid',
                      gridTemplateColumns:
                        'minmax(260px,2fr) 140px 90px',
                      gap: 10,
                      alignItems:
                        'end',
                      padding:
                        12,
                      borderRadius:
                        12,
                      background:
                        'rgba(255,255,255,.04)',
                    }}
                  >
                    <div
                      style={
                        fieldStyle
                      }
                    >
                      <label
                        style={
                          labelStyle
                        }
                      >
                        Produit
                      </label>

                      <select
                        className="input"
                        value={
                          line.productId
                        }
                        onChange={(
                          event
                        ) =>
                          selectProduct(
                            index,
                            event
                              .target
                              .value
                          )
                        }
                      >
                        <option value="">
                          Choisir un produit
                        </option>

                        {supplierProducts.map(
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

                    <div
                      style={
                        fieldStyle
                      }
                    >
                      <label
                        style={
                          labelStyle
                        }
                      >
                        Quantité commandée
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={
                          line.ordered
                        }
                        onChange={(
                          event
                        ) =>
                          updateLine(
                            index,
                            {
                              ordered:
                                Math.max(
                                  1,
                                  Number(
                                    event
                                      .target
                                      .value
                                  ) ||
                                    1
                                ),
                            }
                          )
                        }
                      />
                    </div>

                    <button
                      className="button secondary small"
                      type="button"
                      disabled={
                        form.lines.length <=
                        1
                      }
                      onClick={() =>
                        removeLine(
                          index
                        )
                      }
                    >
                      Retirer
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="actions">
              <button
                className="button secondary"
                onClick={() =>
                  setOpen(
                    false
                  )
                }
              >
                Annuler
              </button>

              <button
                className="button"
                onClick={
                  submit
                }
              >
                Enregistrer la commande
              </button>
            </div>
          </div>
        </div>
      )}

      {receptionOpen && (
        <div className="modalBackdrop">
          <div
            className="modal"
            style={{
              width:
                'min(900px,100%)',
              maxHeight:
                '92vh',
              overflowY:
                'auto',
            }}
          >
            <div className="modalHead">
              <div>
                <h2
                  style={{
                    margin: 0,
                  }}
                >
                  Réceptionner{' '}
                  {
                    receptionOrderId
                  }
                </h2>

                <div
                  style={{
                    marginTop:
                      4,
                    fontSize:
                      12,
                    opacity:
                      0.65,
                  }}
                >
                  Les quantités validées seront ajoutées automatiquement au stock.
                </div>
              </div>

              <button
                className="button secondary small"
                onClick={() =>
                  setReceptionOpen(
                    false
                  )
                }
              >
                Fermer
              </button>
            </div>

            <div
              className="field"
              style={{
                marginTop:
                  16,
              }}
            >
              <label>
                Lieu de stockage de réception *
              </label>

              <select
                value={
                  receptionLocation
                }
                onChange={(
                  event
                ) =>
                  setReceptionLocation(
                    event
                      .target
                      .value
                  )
                }
              >
                <option value="">
                  Choisir le lieu
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

            <div
              style={{
                marginTop:
                  18,
                display:
                  'grid',
                gap: 10,
              }}
            >
              {receptionLines.map(
                (
                  line,
                  index
                ) => (
                  <Card
                    key={`${line.productId}-${index}`}
                  >
                    <div
                      style={{
                        display:
                          'grid',
                        gridTemplateColumns:
                          'minmax(220px,1fr) 130px 160px',
                        gap: 12,
                        alignItems:
                          'end',
                      }}
                    >
                      <div>
                        <strong>
                          {
                            line.productName
                          }
                        </strong>
                      </div>

                      <div
                        style={{
                          fontSize:
                            12,
                        }}
                      >
                        Commandé :{' '}
                        <strong>
                          {
                            line.ordered
                          }
                        </strong>
                      </div>

                      <div className="field">
                        <label>
                          Reçu
                        </label>

                        <input
                          type="number"
                          min="0"
                          max={
                            line.ordered
                          }
                          value={
                            line.received
                          }
                          onChange={(
                            event
                          ) =>
                            updateReceptionLine(
                              index,
                              Number(
                                event
                                  .target
                                  .value
                              ) ||
                                0
                            )
                          }
                        />
                      </div>
                    </div>
                  </Card>
                )
              )}
            </div>

            <div
              style={{
                marginTop:
                  16,
                padding: 12,
                borderRadius:
                  10,
                background:
                  'rgba(59,130,246,.08)',
                fontSize:
                  12,
                lineHeight:
                  1.5,
              }}
            >
              Après confirmation : le stock du lieu choisi est augmenté, un mouvement « Réception fournisseur » est créé pour chaque produit reçu, et la commande passe automatiquement au statut « Traité ». Une commande réceptionnée ne peut pas être réceptionnée une seconde fois.
            </div>

            <div className="actions">
              <button
                className="button secondary"
                onClick={() =>
                  setReceptionOpen(
                    false
                  )
                }
              >
                Annuler
              </button>

              <button
                className="button"
                onClick={
                  confirmReception
                }
              >
                Confirmer la réception
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}