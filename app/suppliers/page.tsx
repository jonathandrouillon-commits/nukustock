'use client'

import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
} from 'react'

import * as XLSX from 'xlsx'

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

  const importInputRef =
    useRef<HTMLInputElement | null>(
      null
    )

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

      const linkedDetails = [
        linkedProducts.length
          ? `${linkedProducts.length} produit(s)`
          : '',
        linkedOrders.length
          ? `${linkedOrders.length} commande(s)`
          : '',
      ]
        .filter(Boolean)
        .join(' et ')

      const firstMessage =
        linkedDetails
          ? `Le fournisseur "${supplier.name}" est encore lié à ${linkedDetails}.\n\nSi tu continues :\n- les produits seront détachés de ce fournisseur ;\n- les anciennes commandes conserveront le NOM du fournisseur dans leur historique, mais plus son identifiant actif.\n\nContinuer ?`
          : `Supprimer le fournisseur "${supplier.name}" ?`

      const firstConfirmed =
        window.confirm(
          firstMessage
        )

      if (!firstConfirmed) {
        return
      }

      const secondConfirmed =
        window.confirm(
          `DERNIÈRE CONFIRMATION\n\nSupprimer définitivement le fournisseur "${supplier.name}" de la liste active ?`
        )

      if (!secondConfirmed) {
        return
      }

      /*
       * Produits :
       * on détache le fournisseur pour éviter
       * une référence orpheline.
       */
      if (
        linkedProducts.length >
        0
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
                    supplier.name
                  )
              )
                ? {
                    ...product,
                    mainSupplier: '',
                    mainSupplierId: '',
                  }
                : product
          )
        )
      }

      /*
       * Commandes :
       * on garde supplierName pour l'historique,
       * mais on retire supplierId afin que
       * l'ancienne commande ne bloque plus
       * la suppression du référentiel.
       */
      if (
        linkedOrders.length >
        0
      ) {
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
                    supplier.name
                  )
              )
                ? {
                    ...order,
                    supplierId: '',
                    supplierName:
                      order.supplierName ||
                      supplier.name,
                  }
                : order
          )
        )
      }

      /*
       * Suppression du référentiel fournisseur.
       */
      save(
        items.filter(
          (item) =>
            item.id !==
            supplier.id
        )
      )

      if (
        form.id ===
        supplier.id
      ) {
        setOpen(false)
        setForm(
          emptySupplier
        )
      }

      setMsg(
        linkedDetails
          ? `Fournisseur "${supplier.name}" supprimé. ${linkedDetails} ont été détaché(s) sans perdre l'historique des commandes.`
          : `Fournisseur "${supplier.name}" supprimé.`
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

  const importSuppliers =
    async (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0]

      event.target.value = ''

      if (!file) {
        return
      }

      setMsg('')
      setError('')

      try {
        const buffer =
          await file.arrayBuffer()

        const workbook =
          XLSX.read(buffer, {
            type: 'array',
          })

        const sheetName =
          workbook.SheetNames[0]

        if (!sheetName) {
          throw new Error(
            'Le fichier ne contient aucune feuille.'
          )
        }

        const sheet =
          workbook.Sheets[
            sheetName
          ]

        const rows =
          XLSX.utils.sheet_to_json<
            Record<string, unknown>
          >(sheet, {
            defval: '',
          })

        if (!rows.length) {
          throw new Error(
            'Le fichier ne contient aucun fournisseur.'
          )
        }

        const findValue = (
          row:
            Record<
              string,
              unknown
            >,
          names: string[]
        ) => {
          const entries =
            Object.entries(row)

          for (
            const name of names
          ) {
            const wanted =
              normalize(name)

            const found =
              entries.find(
                ([key]) =>
                  normalize(
                    key
                  ) === wanted
              )

            if (found) {
              return String(
                found[1] ??
                  ''
              ).trim()
            }
          }

          return ''
        }

        const next = [
          ...items,
        ]

        let added = 0
        let updated = 0

        for (const row of rows) {
          const name =
            findValue(row, [
              'Fournisseur',
              'Nom',
              'Nom fournisseur',
            ])

          if (!name) {
            continue
          }

          const incomingRef =
            findValue(row, [
              'Référence',
              'Reference',
              'Réf interne',
              'Ref interne',
              'internal_ref',
            ])

          const existing =
            next.find(
              (supplier) =>
                (
                  incomingRef &&
                  supplier.internalRef ===
                    incomingRef
                ) ||
                normalize(
                  supplier.name
                ) ===
                  normalize(
                    name
                  )
            )

          const imported:
            Supplier = {
            ...(existing ||
              emptySupplier),

            id:
              existing?.id ||
              crypto.randomUUID(),

            internalRef:
              existing?.internalRef ||
              incomingRef ||
              undefined,

            name,

            contactPerson:
              findValue(row, [
                'Contact principal',
                'Contact',
              ]),

            email:
              findValue(row, [
                'Email',
                'E-mail',
                'Mail',
              ]),

            contact:
              findValue(row, [
                'Email',
                'E-mail',
                'Mail',
              ]),

            phone:
              findValue(row, [
                'Téléphone',
                'Telephone',
                'Phone',
              ]),

            address:
              findValue(row, [
                'Adresse',
                'Address',
              ]),

            payment:
              findValue(row, [
                'Paiement',
                'Conditions de paiement',
              ]),

            deliveryLeadTime:
              findValue(row, [
                'Délai',
                'Delai',
                'Délai de livraison',
              ]),

            currency:
              findValue(row, [
                'Devise',
                'Currency',
              ]) ||
              existing?.currency ||
              'XPF',

            notes:
              findValue(row, [
                'Notes',
                'Note',
              ]),

            active:
              normalize(
                findValue(
                  row,
                  [
                    'Statut',
                    'Actif',
                    'Active',
                  ]
                )
              ) !==
              'inactif',
          }

          if (existing) {
            const index =
              next.findIndex(
                (supplier) =>
                  supplier.id ===
                  existing.id
              )

            next[index] =
              imported

            updated += 1
          } else {
            next.push(
              imported
            )

            added += 1
          }
        }

        save(next)

        setMsg(
          `Import terminé : ${added} fournisseur(s) ajouté(s), ${updated} mis à jour.`
        )
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Import impossible.'
        )
      }
    }

  const exportSuppliersExcel =
    () => {
      const rows =
        items.map(
          (supplier) => ({
            'Référence':
              supplier.internalRef ||
              '',
            'Fournisseur':
              supplier.name,
            'Contact principal':
              supplier.contactPerson ||
              '',
            'Email':
              supplier.email ||
              supplier.contact ||
              '',
            'Téléphone':
              supplier.phone ||
              '',
            'Adresse':
              supplier.address ||
              '',
            'Paiement':
              supplier.payment ||
              '',
            'Délai':
              supplier.deliveryLeadTime ||
              '',
            'Devise':
              supplier.currency ||
              'XPF',
            'Statut':
              supplier.active ===
              false
                ? 'INACTIF'
                : 'ACTIF',
            'Notes':
              supplier.notes ||
              '',
          })
        )

      const workbook =
        XLSX.utils.book_new()

      const worksheet =
        XLSX.utils.json_to_sheet(
          rows
        )

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'Fournisseurs'
      )

      XLSX.writeFile(
        workbook,
        'NukuStock-Fournisseurs.xlsx'
      )
    }

  const exportSuppliersPdf =
    () => {
      const popup =
        window.open(
          '',
          '_blank',
          'width=1100,height=800'
        )

      if (!popup) {
        setError(
          'Le navigateur bloque la fenêtre PDF.'
        )
        return
      }

      const lines =
        items
          .map(
            (supplier) => `
              <tr>
                <td>${supplier.internalRef || ''}</td>
                <td>${supplier.name || ''}</td>
                <td>${supplier.contactPerson || ''}</td>
                <td>${supplier.email || supplier.contact || ''}</td>
                <td>${supplier.phone || ''}</td>
                <td>${supplier.payment || ''}</td>
                <td>${supplier.deliveryLeadTime || ''}</td>
                <td>${supplier.currency || 'XPF'}</td>
                <td>${supplier.active === false ? 'INACTIF' : 'ACTIF'}</td>
              </tr>
            `
          )
          .join('')

      popup.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>NukuStock - Fournisseurs</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 28px;
                color: #111827;
              }
              h1 {
                margin: 0 0 18px;
                font-size: 22px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
              }
              th, td {
                border: 1px solid #d0d5dd;
                padding: 6px;
                text-align: left;
              }
              th {
                background: #f2f4f7;
              }
              @media print {
                @page {
                  size: landscape;
                  margin: 10mm;
                }
              }
            </style>
          </head>
          <body>
            <h1>NukuStock — Fournisseurs</h1>
            <table>
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Fournisseur</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Paiement</th>
                  <th>Délai</th>
                  <th>Devise</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                ${lines}
              </tbody>
            </table>
            <script>
              window.onload = () => {
                window.print();
              };
            </script>
          </body>
        </html>
      `)

      popup.document.close()
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
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{
              display: 'none',
            }}
            onChange={
              importSuppliers
            }
          />

          <button
            className="button secondary"
            type="button"
            onClick={() =>
              importInputRef.current?.click()
            }
          >
            Importer Excel
          </button>

          <button
            className="button secondary"
            type="button"
            onClick={
              exportSuppliersExcel
            }
          >
            Exporter Excel
          </button>

          <button
            className="button secondary"
            type="button"
            onClick={
              exportSuppliersPdf
            }
          >
            Exporter PDF
          </button>

          <button
            className="button"
            type="button"
            onClick={openNew}
          >
            + Ajouter un fournisseur
          </button>
        </div>
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
                  Référence
                </th>

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
                            supplier.internalRef ||
                            '—'
                          }
                        </strong>
                      </td>

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
                      11
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
              {form.id && (
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
                    Référence interne
                  </label>

                  <input
                    className="input"
                    value={
                      form.internalRef ||
                      ''
                    }
                    readOnly
                  />
                </div>
              )}

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