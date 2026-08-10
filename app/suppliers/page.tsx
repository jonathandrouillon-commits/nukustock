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
  useOrders,
  useProducts,
  useSuppliers,
} from '@/lib/store'

import type {
  Supplier,
} from '@/lib/types'

const emptySupplier:
  Supplier = {
  id: '',
  name: '',
  contact: '',
  phone: '',
  payment: '',
  notes: '',

  contactPerson: '',
  email: '',
  address: '',
  deliveryLeadTime: '',
  currency: 'XPF',
  active: true,
}

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

export default function Suppliers() {
  const {
    items,
    save,
  } = useSuppliers()

  const {
    items: products,
    save: saveProducts,
  } = useProducts()

  const {
    items: orders,
    save: saveOrders,
  } = useOrders()

  const [q, setQ] =
    useState('')

  const [open, setOpen] =
    useState(false)

  const [form, setForm] =
    useState<Supplier>(
      emptySupplier
    )

  const [msg, setMsg] =
    useState('')

  const [error, setError] =
    useState('')

  const shown =
    useMemo(() => {
      const search =
        normalize(q)

      return [...items]
        .filter(
          (supplier) => {
            if (!search) {
              return true
            }

            return normalize(
              [
                supplier.name,
                supplier.contactPerson,
                supplier.email,
                supplier.contact,
                supplier.phone,
                supplier.payment,
                supplier.address,
                supplier.currency,
                supplier.notes,
              ]
                .filter(Boolean)
                .join(' ')
            ).includes(
              search
            )
          }
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
              'fr',
              {
                sensitivity:
                  'base',
              }
            )
        )
    }, [items, q])

  const getLinkedProducts =
    (
      supplier:
        Supplier
    ) =>
      products.filter(
        (product) =>
          product.mainSupplierId ===
            supplier.id ||
          (
            !product.mainSupplierId &&
            normalize(
              product.mainSupplier ||
                ''
            ) ===
              normalize(
                supplier.name
              )
          )
      )

  const getLinkedOrders =
    (
      supplier:
        Supplier
    ) =>
      orders.filter(
        (order) =>
          order.supplierId ===
            supplier.id ||
          (
            !order.supplierId &&
            normalize(
              order.supplierName ||
                ''
            ) ===
              normalize(
                supplier.name
              )
          )
      )

  const openNew = () => {
    setMsg('')
    setError('')

    setForm({
      ...emptySupplier,
      id: '',
      currency: 'XPF',
      active: true,
    })

    setOpen(true)
  }

  const openEdit = (
    supplier:
      Supplier
  ) => {
    setMsg('')
    setError('')

    setForm({
      ...emptySupplier,
      ...supplier,

      contactPerson:
        supplier.contactPerson ||
        '',

      email:
        supplier.email ||
        supplier.contact ||
        '',

      contact:
        supplier.contact ||
        supplier.email ||
        '',

      address:
        supplier.address ||
        '',

      deliveryLeadTime:
        supplier.deliveryLeadTime ||
        '',

      currency:
        supplier.currency ||
        'XPF',

      active:
        supplier.active !==
        false,
    })

    setOpen(true)
  }

  const submit = () => {
    setMsg('')
    setError('')

    const name =
      form.name.trim()

    if (!name) {
      setError(
        'Le nom du fournisseur est obligatoire.'
      )
      return
    }

    const duplicate =
      items.find(
        (supplier) =>
          supplier.id !==
            form.id &&
          normalize(
            supplier.name
          ) ===
            normalize(name)
      )

    if (duplicate) {
      setError(
        `Le fournisseur "${duplicate.name}" existe déjà.`
      )
      return
    }

    const previous =
      form.id
        ? items.find(
            (supplier) =>
              supplier.id ===
              form.id
          )
        : undefined

    const supplier:
      Supplier = {
      ...form,

      id:
        form.id ||
        crypto.randomUUID(),

      name,

      contactPerson:
        form.contactPerson
          ?.trim() ||
        '',

      email:
        form.email
          ?.trim() ||
        '',

      /*
       * On garde "contact"
       * synchronisé avec l'e-mail
       * pour compatibilité avec
       * les anciennes pages.
       */
      contact:
        form.email
          ?.trim() ||
        form.contact
          ?.trim() ||
        '',

      phone:
        form.phone
          ?.trim() ||
        '',

      address:
        form.address
          ?.trim() ||
        '',

      payment:
        form.payment
          ?.trim() ||
        '',

      deliveryLeadTime:
        form.deliveryLeadTime
          ?.trim() ||
        '',

      currency:
        form.currency
          ?.trim() ||
        'XPF',

      notes:
        form.notes
          ?.trim() ||
        '',

      active:
        form.active !==
        false,
    }

    save(
      form.id
        ? items.map(
            (item) =>
              item.id ===
              form.id
                ? supplier
                : item
          )
        : [
            ...items,
            supplier,
          ]
    )

    /*
     * Si le fournisseur est renommé,
     * on met à jour les produits et
     * commandes liés pour que tous
     * les onglets restent connectés.
     */
    if (
      previous &&
      previous.name !==
        supplier.name
    ) {
      saveProducts(
        products.map(
          (product) =>
            product.mainSupplierId ===
              supplier.id ||
            (
              !product.mainSupplierId &&
              normalize(
                product.mainSupplier ||
                  ''
              ) ===
                normalize(
                  previous.name
                )
            )
              ? {
                  ...product,
                  mainSupplier:
                    supplier.name,
                  mainSupplierId:
                    supplier.id,
                }
              : product
        )
      )

      saveOrders(
        orders.map(
          (order) =>
            order.supplierId ===
              supplier.id ||
            (
              !order.supplierId &&
              normalize(
                order.supplierName ||
                  ''
              ) ===
                normalize(
                  previous.name
                )
            )
              ? {
                  ...order,
                  supplierName:
                    supplier.name,
                  supplierId:
                    supplier.id,
                }
              : order
        )
      )
    }

    setOpen(false)

    setMsg(
      form.id
        ? `Fournisseur "${supplier.name}" modifié.`
        : `Fournisseur "${supplier.name}" ajouté.`
    )

    setForm(
      emptySupplier
    )
  }

  const deleteSupplier =
    (
      supplier:
        Supplier
    ) => {
      setMsg('')
      setError('')

      const linkedProducts =
        getLinkedProducts(
          supplier
        )

      const linkedOrders =
        getLinkedOrders(
          supplier
        )

      /*
       * Protection de la base :
       * on ne supprime pas un
       * fournisseur encore utilisé.
       */
      if (
        linkedProducts.length >
          0 ||
        linkedOrders.length >
          0
      ) {
        const details = [
          linkedProducts.length
            ? `${linkedProducts.length} produit(s)`
            : '',

          linkedOrders.length
            ? `${linkedOrders.length} commande(s)`
            : '',
        ]
          .filter(Boolean)
          .join(' et ')

        setError(
          `Impossible de supprimer "${supplier.name}" : il est encore lié à ${details}. Modifie d'abord ces éléments ou désactive le fournisseur.`
        )
        return
      }

      const confirmed =
        window.confirm(
          `Supprimer définitivement le fournisseur "${supplier.name}" ?`
        )

      if (!confirmed) {
        return
      }

      save(
        items.filter(
          (item) =>
            item.id !==
            supplier.id
        )
      )

      setMsg(
        `Fournisseur "${supplier.name}" supprimé.`
      )
    }

  const toggleActive =
    (
      supplier:
        Supplier
    ) => {
      const nextActive =
        supplier.active ===
        false

      save(
        items.map(
          (item) =>
            item.id ===
            supplier.id
              ? {
                  ...item,
                  active:
                    nextActive,
                }
              : item
        )
      )

      setMsg(
        nextActive
          ? `Fournisseur "${supplier.name}" activé.`
          : `Fournisseur "${supplier.name}" désactivé.`
      )

      setError('')
    }

  const fieldStyle:
    CSSProperties = {
    display: 'flex',
    flexDirection:
      'column',
  }

  const labelStyle:
    CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 7,
  }

  return (
    <Page
      title="Fournisseurs"
      subtitle="Fiches fournisseurs, contacts, conditions et rattachement aux produits"
      action={
        <button
          className="button"
          type="button"
          onClick={openNew}
        >
          + Ajouter un fournisseur
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

      <div className="toolbar">
        <input
          className="input"
          value={q}
          onChange={(event) =>
            setQ(
              event.target.value
            )
          }
          placeholder="Rechercher un fournisseur..."
        />
      </div>

      <Card>
        <div className="tableWrap">
          <table
            style={{
              minWidth:
                1200,
            }}
          >
            <thead>
              <tr>
                <th>
                  Fournisseur
                </th>

                <th>
                  Contact
                </th>

                <th>
                  Téléphone
                </th>

                <th>
                  Paiement
                </th>

                <th>
                  Délai
                </th>

                <th>
                  Devise
                </th>

                <th>
                  Produits
                </th>

                <th>
                  Commandes
                </th>

                <th>
                  Statut
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {shown.map(
                (
                  supplier
                ) => {
                  const productCount =
                    getLinkedProducts(
                      supplier
                    ).length

                  const orderCount =
                    getLinkedOrders(
                      supplier
                    ).length

                  return (
                    <tr
                      key={
                        supplier.id
                      }
                    >
                      <td>
                        <strong>
                          {
                            supplier.name
                          }
                        </strong>

                        {supplier.address && (
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
                              supplier.address
                            }
                          </div>
                        )}
                      </td>

                      <td>
                        <div>
                          {supplier.contactPerson ||
                            '—'}
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
                          {supplier.email ||
                            supplier.contact ||
                            '—'}
                        </div>
                      </td>

                      <td>
                        {supplier.phone ||
                          '—'}
                      </td>

                      <td>
                        {supplier.payment ||
                          '—'}
                      </td>

                      <td>
                        {supplier.deliveryLeadTime ||
                          '—'}
                      </td>

                      <td>
                        {supplier.currency ||
                          'XPF'}
                      </td>

                      <td>
                        <Badge
                          tone={
                            productCount >
                            0
                              ? 'info'
                              : 'neutral'
                          }
                        >
                          {
                            productCount
                          }
                        </Badge>
                      </td>

                      <td>
                        <Badge
                          tone={
                            orderCount >
                            0
                              ? 'info'
                              : 'neutral'
                          }
                        >
                          {
                            orderCount
                          }
                        </Badge>
                      </td>

                      <td>
                        <Badge
                          tone={
                            supplier.active ===
                            false
                              ? 'neutral'
                              : 'good'
                          }
                        >
                          {supplier.active ===
                          false
                            ? 'Inactif'
                            : 'Actif'}
                        </Badge>
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
                          <button
                            className="button secondary small"
                            type="button"
                            onClick={() =>
                              openEdit(
                                supplier
                              )
                            }
                          >
                            Modifier
                          </button>

                          <button
                            className="button secondary small"
                            type="button"
                            onClick={() =>
                              toggleActive(
                                supplier
                              )
                            }
                          >
                            {supplier.active ===
                            false
                              ? 'Activer'
                              : 'Désactiver'}
                          </button>

                          <button
                            className="button secondary small"
                            type="button"
                            style={{
                              color:
                                '#b42318',
                              borderColor:
                                '#fda29b',
                            }}
                            onClick={() =>
                              deleteSupplier(
                                supplier
                              )
                            }
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }
              )}

              {shown.length ===
                0 && (
                <tr>
                  <td
                    colSpan={
                      10
                    }
                  >
                    Aucun fournisseur trouvé.
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
                  {form.id
                    ? 'Modifier le fournisseur'
                    : 'Nouveau fournisseur'}
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
                  {form.id
                    ? 'Les modifications seront répercutées sur les produits et commandes liés.'
                    : 'Créer une nouvelle fiche fournisseur.'}
                </div>
              </div>

              <button
                className="button secondary small"
                type="button"
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
                  'repeat(auto-fit,minmax(230px,1fr))',
                gap: 16,
                marginTop: 18,
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
                  Nom du fournisseur *
                </label>

                <input
                  className="input"
                  value={
                    form.name
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      name:
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
                  Contact principal
                </label>

                <input
                  className="input"
                  value={
                    form.contactPerson ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      contactPerson:
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
                  Email
                </label>

                <input
                  className="input"
                  type="email"
                  value={
                    form.email ||
                    form.contact ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      email:
                        event
                          .target
                          .value,

                      contact:
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
                  Téléphone
                </label>

                <input
                  className="input"
                  value={
                    form.phone ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      phone:
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
                  Adresse
                </label>

                <input
                  className="input"
                  value={
                    form.address ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      address:
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
                  Conditions de paiement
                </label>

                <input
                  className="input"
                  value={
                    form.payment ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      payment:
                        event
                          .target
                          .value,
                    })
                  }
                  placeholder="Ex. 30 jours fin de mois"
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
                  Délai de livraison
                </label>

                <input
                  className="input"
                  value={
                    form.deliveryLeadTime ||
                    ''
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      deliveryLeadTime:
                        event
                          .target
                          .value,
                    })
                  }
                  placeholder="Ex. 7 jours"
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
                  Devise
                </label>

                <select
                  className="input"
                  value={
                    form.currency ||
                    'XPF'
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      currency:
                        event
                          .target
                          .value,
                    })
                  }
                >
                  <option value="XPF">
                    XPF
                  </option>

                  <option value="EUR">
                    EUR
                  </option>

                  <option value="USD">
                    USD
                  </option>

                  <option value="NZD">
                    NZD
                  </option>

                  <option value="AUD">
                    AUD
                  </option>
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
                  Statut
                </label>

                <select
                  className="input"
                  value={
                    form.active ===
                    false
                      ? 'inactive'
                      : 'active'
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      active:
                        event
                          .target
                          .value ===
                        'active',
                    })
                  }
                >
                  <option value="active">
                    Actif
                  </option>

                  <option value="inactive">
                    Inactif
                  </option>
                </select>
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
              }}
            >
              <label
                style={
                  labelStyle
                }
              >
                Notes
              </label>

              <textarea
                className="input"
                value={
                  form.notes ||
                  ''
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    notes:
                      event
                        .target
                        .value,
                  })
                }
                rows={5}
                style={{
                  resize:
                    'vertical',
                }}
              />
            </div>

            <div className="actions">
              {form.id && (
                <button
                  className="button secondary"
                  type="button"
                  style={{
                    color:
                      '#b42318',
                    borderColor:
                      '#fda29b',
                  }}
                  onClick={() => {
                    const supplier =
                      items.find(
                        (item) =>
                          item.id ===
                          form.id
                      )

                    if (
                      supplier
                    ) {
                      deleteSupplier(
                        supplier
                      )
                    }
                  }}
                >
                  Supprimer
                </button>
              )}

              <button
                className="button secondary"
                type="button"
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
                type="button"
                onClick={
                  submit
                }
              >
                {form.id
                  ? 'Enregistrer les modifications'
                  : 'Créer le fournisseur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}