'use client'

import {
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

import {
  Page,
  Card,
} from '@/components/ui'

import {
  useMasterData,
  useProducts,
  useSuppliers,
} from '@/lib/store'

type ImportKind =
  | 'products'
  | 'weights'
  | 'suppliers'
  | 'locations'

type Row = Record<string, any>

function normalizeText(
  value: unknown
) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .trim()
    .toLowerCase()
}

function valueFrom(
  row: Row,
  candidates: string[]
) {
  const entries =
    Object.entries(row)

  for (
    const candidate of candidates
  ) {
    const wanted =
      normalizeText(candidate)

    const found =
      entries.find(
        ([key]) =>
          normalizeText(key) ===
          wanted
      )

    if (
      found &&
      found[1] !== undefined &&
      found[1] !== null &&
      String(found[1]).trim() !== ''
    ) {
      return found[1]
    }
  }

  return ''
}

function toNumber(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0
  }

  if (
    typeof value === 'number'
  ) {
    return Number.isFinite(value)
      ? value
      : 0
  }

  const normalized =
    String(value)
      .replace(/\s/g, '')
      .replace(',', '.')

  const number =
    Number(normalized)

  return Number.isFinite(number)
    ? number
    : 0
}

function toIsoDate(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return ''
  }

  if (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  ) {
    return value
      .toISOString()
      .slice(0, 10)
  }

  if (
    typeof value === 'number'
  ) {
    const parsed =
      XLSX.SSF.parse_date_code(
        value
      )

    if (parsed) {
      return [
        String(parsed.y)
          .padStart(4, '0'),
        String(parsed.m)
          .padStart(2, '0'),
        String(parsed.d)
          .padStart(2, '0'),
      ].join('-')
    }
  }

  const text =
    String(value).trim()

  const french =
    text.match(
      /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/
    )

  if (french) {
    const year =
      french[3].length === 2
        ? `20${french[3]}`
        : french[3]

    return `${year}-${french[2].padStart(
      2,
      '0'
    )}-${french[1].padStart(
      2,
      '0'
    )}`
  }

  const iso =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    )

  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`
  }

  const date =
    new Date(text)

  if (
    !Number.isNaN(
      date.getTime()
    )
  ) {
    return date
      .toISOString()
      .slice(0, 10)
  }

  return ''
}

function readSheet(
  workbook: XLSX.WorkBook,
  names: string[]
) {
  const wanted =
    names.map(
      normalizeText
    )

  const sheetName =
    workbook.SheetNames.find(
      (name) =>
        wanted.includes(
          normalizeText(name)
        )
    )

  if (!sheetName) {
    return []
  }

  const sheet =
    workbook.Sheets[sheetName]

  return XLSX.utils.sheet_to_json<Row>(
    sheet,
    {
      defval: '',
      raw: true,
    }
  )
}

async function readWorkbook(
  file: File
) {
  const buffer =
    await file.arrayBuffer()

  return XLSX.read(
    buffer,
    {
      type: 'array',
      cellDates: true,
    }
  )
}

function uniqueByName<T extends {
  name?: string
}>(
  rows: T[]
) {
  const map =
    new Map<string, T>()

  for (const row of rows) {
    const key =
      normalizeText(
        row.name
      )

    if (!key) continue

    if (!map.has(key)) {
      map.set(
        key,
        row
      )
    }
  }

  return [
    ...map.values(),
  ]
}

export default function ImportExportPage() {
  const {
    items: products,
    save: saveProducts,
  } = useProducts()

  const {
    items: suppliers,
    save: saveSuppliers,
  } = useSuppliers()

  const {
    items: masterData,
    save: saveMasterData,
  } = useMasterData()

  const productsInput =
    useRef<HTMLInputElement>(
      null
    )

  const weightsInput =
    useRef<HTMLInputElement>(
      null
    )

  const suppliersInput =
    useRef<HTMLInputElement>(
      null
    )

  const locationsInput =
    useRef<HTMLInputElement>(
      null
    )

  const [
    busy,
    setBusy,
  ] = useState<
    ImportKind | 'clear-locations' | ''
  >('')

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    error,
    setError,
  ] = useState('')

  const startImport = (
    kind: ImportKind
  ) => {
    setMessage('')
    setError('')

    if (
      kind === 'products'
    ) {
      productsInput
        .current
        ?.click()
      return
    }

    if (
      kind === 'weights'
    ) {
      weightsInput
        .current
        ?.click()
      return
    }

    if (
      kind === 'suppliers'
    ) {
      suppliersInput
        .current
        ?.click()
      return
    }

    locationsInput
      .current
      ?.click()
  }

  const importProducts =
    async (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0]

      event.target.value = ''

      if (!file) return

      setBusy('products')
      setMessage('')
      setError('')

      try {
        const workbook =
          await readWorkbook(
            file
          )

        const productRows =
          readSheet(
            workbook,
            [
              'Produits',
              'Products',
            ]
          )

        if (
          !productRows.length
        ) {
          throw new Error(
            'La feuille "Produits" est introuvable ou vide.'
          )
        }

        const stockRows =
          readSheet(
            workbook,
            [
              'Stocks_DLUO',
              'Stocks DLUO',
              'Stocks',
              'Lots',
            ]
          )

        const lotsByRef =
          new Map<
            string,
            any[]
          >()

        for (
          const row of stockRows
        ) {
          const ref =
            String(
              valueFrom(
                row,
                [
                  'Réf interne',
                  'Ref interne',
                  'Reference interne',
                  'Référence interne',
                ]
              ) || ''
            ).trim()

          if (!ref) {
            continue
          }

          const quantity =
            Math.max(
              0,
              toNumber(
                valueFrom(
                  row,
                  [
                    'Quantité',
                    'Quantite',
                    'Quantity',
                    'Stock',
                  ]
                )
              )
            )

          const location =
            String(
              valueFrom(
                row,
                [
                  'Lieu de stockage',
                  'Lieu',
                  'Location',
                ]
              ) || ''
            ).trim()

          const expiry =
            toIsoDate(
              valueFrom(
                row,
                [
                  'DLUO / DLC',
                  'DLUO',
                  'DLC',
                  'DDM',
                  'Expiry',
                ]
              )
            )

          const lotNumber =
            String(
              valueFrom(
                row,
                [
                  'N° lot',
                  'No lot',
                  'Lot',
                  'Numero de lot',
                  'Numéro de lot',
                ]
              ) || ''
            ).trim()

          if (
            !location &&
            !expiry &&
            !lotNumber &&
            quantity <= 0
          ) {
            continue
          }

          const current =
            lotsByRef.get(
              ref
            ) || []

          current.push({
            id:
              crypto.randomUUID(),
            lotNumber,
            expiry,
            location:
              location ||
              'Non affecté',
            quantity,
          })

          lotsByRef.set(
            ref,
            current
          )
        }

        const existingByRef =
          new Map(
            products
              .filter(
                (product) =>
                  product.internalRef
              )
              .map(
                (product) => [
                  normalizeText(
                    product.internalRef
                  ),
                  product,
                ]
              )
          )

        const existingByName =
          new Map(
            products.map(
              (product) => [
                normalizeText(
                  product.name
                ),
                product,
              ]
            )
          )

        const imported:
          any[] = []

        for (
          let index = 0;
          index <
          productRows.length;
          index++
        ) {
          const row =
            productRows[index]

          const name =
            String(
              valueFrom(
                row,
                [
                  'Nom',
                  'Produit',
                  'Désignation',
                  'Designation',
                  'Name',
                ]
              ) || ''
            ).trim()

          if (!name) {
            continue
          }

          const internalRef =
            String(
              valueFrom(
                row,
                [
                  'Réf interne',
                  'Ref interne',
                  'Reference interne',
                  'Référence interne',
                ]
              ) ||
                `IMP-${String(
                  index + 1
                ).padStart(
                  5,
                  '0'
                )}`
            ).trim()

          const existing =
            existingByRef.get(
              normalizeText(
                internalRef
              )
            ) ||
            existingByName.get(
              normalizeText(
                name
              )
            )

          const hasExpiryRaw =
            normalizeText(
              valueFrom(
                row,
                [
                  'Gestion DLUO/DLC',
                  'Gestion DLUO',
                  'DLUO',
                  'Has expiry',
                ]
              )
            )

          const lots =
            lotsByRef.get(
              internalRef
            ) ||
            existing?.lots ||
            []

          imported.push({
            id:
              existing?.id ||
              crypto.randomUUID(),

            internalRef,

            supplierRef:
              String(
                valueFrom(
                  row,
                  [
                    'Réf fournisseur',
                    'Ref fournisseur',
                    'Référence fournisseur',
                    'Reference fournisseur',
                  ]
                ) || ''
              ).trim(),

            name,

            photo:
              String(
                valueFrom(
                  row,
                  [
                    'Photo',
                    'Photo URL',
                  ]
                ) || ''
              ).trim(),

            hasExpiry:
              hasExpiryRaw
                ? [
                    'oui',
                    'yes',
                    'true',
                    '1',
                  ].includes(
                    hasExpiryRaw
                  )
                : lots.some(
                    (lot) =>
                      Boolean(
                        lot.expiry
                      )
                  ),

            category:
              String(
                valueFrom(
                  row,
                  [
                    'Catégorie',
                    'Categorie',
                    'Category',
                  ]
                ) || ''
              ).trim(),

            subcategory:
              String(
                valueFrom(
                  row,
                  [
                    'Sous-catégorie',
                    'Sous categorie',
                    'Subcategory',
                  ]
                ) || ''
              ).trim(),

            brand:
              String(
                valueFrom(
                  row,
                  [
                    'Marque',
                    'Brand',
                  ]
                ) || ''
              ).trim(),

            packaging:
              String(
                valueFrom(
                  row,
                  [
                    'Conditionnement',
                    'Packaging',
                  ]
                ) ||
                  'Unité'
              ).trim(),

            unit:
              String(
                valueFrom(
                  row,
                  [
                    'Unité',
                    'Unite',
                    'Unit',
                  ]
                ) ||
                  'unité'
              ).trim(),

            purchasePrice:
              Math.max(
                0,
                toNumber(
                  valueFrom(
                    row,
                    [
                      "Prix d'achat",
                      'Prix achat',
                      'Prix unitaire',
                      'Purchase price',
                    ]
                  )
                )
              ),

            priceUpdatedAt:
              toIsoDate(
                valueFrom(
                  row,
                  [
                    'Date MAJ prix',
                    'Date mise à jour prix',
                    'Price updated',
                  ]
                )
              ) ||
              new Date()
                .toISOString()
                .slice(0, 10),

            mainSupplier:
              String(
                valueFrom(
                  row,
                  [
                    'Fournisseur principal',
                    'Fournisseur',
                    'Supplier',
                  ]
                ) || ''
              ).trim(),

            minStock:
              Math.max(
                0,
                toNumber(
                  valueFrom(
                    row,
                    [
                      'Stock mini',
                      'Stock minimum',
                      'Minimum stock',
                    ]
                  )
                )
              ),

            productType:
              String(
                valueFrom(
                  row,
                  [
                    'Type produit',
                    'Product type',
                  ]
                ) ||
                  'acheté'
              ).trim(),

            lots,
          })
        }

        if (
          !imported.length
        ) {
          throw new Error(
            'Aucun produit valide trouvé dans le fichier.'
          )
        }

        const importedKeys =
          new Set(
            imported.flatMap(
              (product) => [
                `ref:${normalizeText(
                  product.internalRef
                )}`,
                `name:${normalizeText(
                  product.name
                )}`,
              ]
            )
          )

        const untouched =
          products.filter(
            (product) =>
              !importedKeys.has(
                `ref:${normalizeText(
                  product.internalRef
                )}`
              ) &&
              !importedKeys.has(
                `name:${normalizeText(
                  product.name
                )}`
              )
          )

        saveProducts([
          ...untouched,
          ...imported,
        ])

        const supplierNames =
          uniqueByName(
            imported
              .filter(
                (product) =>
                  product.mainSupplier
              )
              .map(
                (product) => ({
                  name:
                    product.mainSupplier,
                })
              )
          )

        const existingSupplierNames =
          new Set(
            suppliers.map(
              (supplier) =>
                normalizeText(
                  supplier.name
                )
            )
          )

        const newSuppliers =
          supplierNames
            .filter(
              (supplier) =>
                !existingSupplierNames.has(
                  normalizeText(
                    supplier.name
                  )
                )
            )
            .map(
              (supplier) => ({
                id:
                  crypto.randomUUID(),
                name:
                  supplier.name,
                contact: '',
                phone: '',
                payment: '',
                notes:
                  'Créé automatiquement lors de l’import Produits',
                contactPerson: '',
                email: '',
                address: '',
                deliveryLeadTime:
                  '',
                currency: 'XPF',
                active: true,
              })
            )

        if (
          newSuppliers.length
        ) {
          saveSuppliers([
            ...suppliers,
            ...newSuppliers,
          ])
        }

        setMessage(
          `${imported.length} produit(s) importé(s) ou mis à jour. ${stockRows.length} ligne(s) de stock/DLUO lue(s).`
        )
      } catch (
        caughtError
      ) {
        console.error(
          'Import produits :',
          caughtError
        )

        setError(
          caughtError instanceof
            Error
            ? caughtError.message
            : "Erreur pendant l'import des produits."
        )
      } finally {
        setBusy('')
      }
    }

  const importWeights =
    async (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0]

      event.target.value = ''

      if (!file) return

      setBusy('weights')
      setMessage('')
      setError('')

      try {
        const {
          data: {
            session,
          },
        } =
          await supabase.auth
            .getSession()

        if (
          !session
            ?.access_token
        ) {
          throw new Error(
            'Session administrateur introuvable. Reconnecte-toi.'
          )
        }

        const formData =
          new FormData()

        formData.append(
          'file',
          file
        )

        const response =
          await fetch(
            '/api/admin/import-product-weights',
            {
              method: 'POST',
              headers: {
                Authorization:
                  `Bearer ${session.access_token}`,
              },
              body: formData,
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Import des poids impossible.'
          )
        }

        const parts = [
          `${data.updated || 0} produit(s) mis à jour`,
        ]

        if (data.notFound) {
          parts.push(
            `${data.notFound} introuvable(s)`
          )
        }

        if (data.ignored) {
          parts.push(
            `${data.ignored} ligne(s) ignorée(s)`
          )
        }

        if (data.failed) {
          parts.push(
            `${data.failed} erreur(s)`
          )
        }

        setMessage(
          `Import poids terminé : ${parts.join(' · ')}.`
        )
      } catch (
        caughtError
      ) {
        console.error(
          'Import poids produits :',
          caughtError
        )

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Erreur pendant l'import des poids produits."
        )
      } finally {
        setBusy('')
      }
    }

  const importSuppliers =
    async (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0]

      event.target.value = ''

      if (!file) return

      setBusy('suppliers')
      setMessage('')
      setError('')

      try {
        const workbook =
          await readWorkbook(
            file
          )

        const rows =
          readSheet(
            workbook,
            [
              'Fournisseurs',
              'Suppliers',
              'Feuil1',
              'Sheet1',
            ]
          )

        if (!rows.length) {
          const first =
            workbook
              .SheetNames[0]

          if (first) {
            rows.push(
              ...XLSX.utils
                .sheet_to_json<Row>(
                  workbook
                    .Sheets[first],
                  {
                    defval: '',
                    raw: true,
                  }
                )
            )
          }
        }

        const existingByName =
          new Map(
            suppliers.map(
              (supplier) => [
                normalizeText(
                  supplier.name
                ),
                supplier,
              ]
            )
          )

        const imported:
          any[] = []

        for (
          const row of rows
        ) {
          const name =
            String(
              valueFrom(
                row,
                [
                  'Nom',
                  'Fournisseur',
                  'Supplier',
                  'Name',
                ]
              ) || ''
            ).trim()

          if (!name) {
            continue
          }

          const existing =
            existingByName.get(
              normalizeText(
                name
              )
            )

          imported.push({
            id:
              existing?.id ||
              crypto.randomUUID(),

            name,

            contact:
              String(
                valueFrom(
                  row,
                  [
                    'Contact',
                  ]
                ) ||
                  existing?.contact ||
                  ''
              ).trim(),

            phone:
              String(
                valueFrom(
                  row,
                  [
                    'Téléphone',
                    'Telephone',
                    'Phone',
                  ]
                ) ||
                  existing?.phone ||
                  ''
              ).trim(),

            payment:
              String(
                valueFrom(
                  row,
                  [
                    'Paiement',
                    'Payment',
                  ]
                ) ||
                  existing?.payment ||
                  ''
              ).trim(),

            notes:
              String(
                valueFrom(
                  row,
                  [
                    'Notes',
                  ]
                ) ||
                  existing?.notes ||
                  ''
              ).trim(),

            contactPerson:
              String(
                valueFrom(
                  row,
                  [
                    'Contact principal',
                    'Contact person',
                  ]
                ) ||
                  existing
                    ?.contactPerson ||
                  ''
              ).trim(),

            email:
              String(
                valueFrom(
                  row,
                  [
                    'Email',
                    'E-mail',
                  ]
                ) ||
                  existing?.email ||
                  ''
              ).trim(),

            address:
              String(
                valueFrom(
                  row,
                  [
                    'Adresse',
                    'Address',
                  ]
                ) ||
                  existing?.address ||
                  ''
              ).trim(),

            deliveryLeadTime:
              String(
                valueFrom(
                  row,
                  [
                    'Délai livraison',
                    'Delai livraison',
                    'Delivery lead time',
                  ]
                ) ||
                  existing
                    ?.deliveryLeadTime ||
                  ''
              ).trim(),

            currency:
              String(
                valueFrom(
                  row,
                  [
                    'Devise',
                    'Currency',
                  ]
                ) ||
                  existing?.currency ||
                  'XPF'
              ).trim(),

            active: true,
          })
        }

        const clean =
          uniqueByName(
            imported
          )

        if (!clean.length) {
          throw new Error(
            'Aucun fournisseur valide trouvé.'
          )
        }

        const importedNames =
          new Set(
            clean.map(
              (supplier) =>
                normalizeText(
                  supplier.name
                )
            )
          )

        saveSuppliers([
          ...suppliers.filter(
            (supplier) =>
              !importedNames.has(
                normalizeText(
                  supplier.name
                )
              )
          ),
          ...clean,
        ])

        setMessage(
          `${clean.length} fournisseur(s) importé(s) ou mis à jour.`
        )
      } catch (
        caughtError
      ) {
        console.error(
          'Import fournisseurs :',
          caughtError
        )

        setError(
          caughtError instanceof
            Error
            ? caughtError.message
            : "Erreur pendant l'import des fournisseurs."
        )
      } finally {
        setBusy('')
      }
    }

  const importLocations =
    async (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0]

      event.target.value = ''

      if (!file) return

      setBusy('locations')
      setMessage('')
      setError('')

      try {
        const workbook =
          await readWorkbook(
            file
          )

        let rows =
          readSheet(
            workbook,
            [
              'Lieux',
              'Lieux de stockage',
              'Locations',
              'Storage locations',
              'Feuil1',
              'Sheet1',
            ]
          )

        if (!rows.length) {
          const first =
            workbook
              .SheetNames[0]

          if (first) {
            rows =
              XLSX.utils
                .sheet_to_json<Row>(
                  workbook
                    .Sheets[first],
                  {
                    defval: '',
                    raw: true,
                  }
                )
          }
        }

        const names =
          [
            ...new Set(
              rows
                .map(
                  (row) =>
                    String(
                      valueFrom(
                        row,
                        [
                          'Nom',
                          'Lieu',
                          'Lieu de stockage',
                          'Location',
                          'Name',
                        ]
                      ) || ''
                    ).trim()
                )
                .filter(
                  Boolean
                )
            ),
          ]

        if (!names.length) {
          throw new Error(
            'Aucun lieu de stockage valide trouvé.'
          )
        }

        const existingLocations =
          masterData.filter(
            (item) =>
              item.type ===
              'location'
          )

        const otherMasterData =
          masterData.filter(
            (item) =>
              item.type !==
              'location'
          )

        const byName =
          new Map(
            existingLocations.map(
              (item) => [
                normalizeText(
                  item.name
                ),
                item,
              ]
            )
          )

        const imported =
          names.map(
            (name) => {
              const existing =
                byName.get(
                  normalizeText(
                    name
                  )
                )

              return {
                id:
                  existing?.id ||
                  crypto.randomUUID(),
                type:
                  'location' as const,
                name,
                active: true,
              }
            }
          )

        const importedNames =
          new Set(
            imported.map(
              (item) =>
                normalizeText(
                  item.name
                )
            )
          )

        const untouchedLocations =
          existingLocations.filter(
            (item) =>
              !importedNames.has(
                normalizeText(
                  item.name
                )
              )
          )

        saveMasterData([
          ...otherMasterData,
          ...untouchedLocations,
          ...imported,
        ])

        setMessage(
          `${imported.length} lieu(x) de stockage importé(s) ou mis à jour.`
        )
      } catch (
        caughtError
      ) {
        console.error(
          'Import lieux :',
          caughtError
        )

        setError(
          caughtError instanceof
            Error
            ? caughtError.message
            : "Erreur pendant l'import des lieux."
        )
      } finally {
        setBusy('')
      }
    }

  const clearAllProducts =
    async () => {
      setMessage('')
      setError('')

      if (!products.length) {
        setError(
          'Il n’y a aucun produit à supprimer.'
        )
        return
      }

      const firstConfirm =
        window.confirm(
          `ATTENTION : tu vas supprimer les ${products.length} produit(s) actuellement présents dans NukuStock.\n\nCette action supprimera également leurs lots et leur stock affiché.\n\nContinuer ?`
        )

      if (!firstConfirm) {
        return
      }

      const secondConfirm =
        window.confirm(
          `DERNIÈRE CONFIRMATION\n\nEffacer définitivement TOUS les produits actifs de NukuStock ?\n\nLes fournisseurs et les lieux de stockage seront conservés.`
        )

      if (!secondConfirm) {
        return
      }

      setBusy('products')

      try {
        const {
          data: {
            session,
          },
        } =
          await supabase
            .auth
            .getSession()

        if (
          !session
            ?.access_token
        ) {
          throw new Error(
            'Session administrateur introuvable. Reconnecte-toi.'
          )
        }

        const response =
          await fetch(
            '/api/admin/sync-products',
            {
              method:
                'DELETE',
              headers: {
                Authorization:
                  `Bearer ${session.access_token}`,
              },
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Suppression globale impossible.'
          )
        }

        if (
          Number(
            data.remaining
          ) !== 0
        ) {
          throw new Error(
            `Suppression incomplète : ${data.remaining} produit(s) restent actifs.`
          )
        }

        // Maintenant seulement on vide l'état local.
        // Le cache passe donc également à [] et ne pourra
        // plus réinjecter d'anciens produits.
        saveProducts([])

        setMessage(
          `${data.deleted || products.length} produit(s) supprimé(s). Il reste 0 produit actif. Fournisseurs et lieux conservés.`
        )
      } catch (
        caughtError
      ) {
        console.error(
          'Effacement global produits :',
          caughtError
        )

        setError(
          caughtError instanceof
            Error
            ? caughtError.message
            : 'Erreur pendant la suppression globale des produits.'
        )
      } finally {
        setBusy('')
      }
    }

  const clearAllLocations =
    async () => {
      setMessage('')
      setError('')

      const locations =
        masterData.filter(
          (item) =>
            item.type ===
            'location'
        )

      if (!locations.length) {
        setError(
          'Il n’y a aucun lieu de stockage à supprimer.'
        )
        return
      }

      const firstConfirm =
        window.confirm(
          `ATTENTION : tu vas supprimer les ${locations.length} lieu(x) de stockage actuellement présents dans NukuStock.\n\nLes produits, fournisseurs, catégories et sous-catégories seront conservés.\n\nContinuer ?`
        )

      if (!firstConfirm) {
        return
      }

      const secondConfirm =
        window.confirm(
          `DERNIÈRE CONFIRMATION\n\nEffacer définitivement TOUS les lieux de stockage ?\n\nCette action ne supprime pas les produits ni les fournisseurs.`
        )

      if (!secondConfirm) {
        return
      }

      setBusy(
        'clear-locations'
      )

      try {
        // Suppression directe dans Supabase.
        // Les IDs sont supprimés un par un pour ne pas dépendre
        // d'une condition artificielle du type "id != ...".
        const ids =
          locations.map(
            (item) => item.id
          )

        const { error:
          deleteError } =
          await supabase
            .from(
              'storage_locations'
            )
            .delete()
            .in('id', ids)

        if (deleteError) {
          throw deleteError
        }

        // Vérification réelle : aucun des lieux supprimés
        // ne doit encore exister dans Supabase.
        const {
          data: remainingRows,
          error:
            verificationError,
        } =
          await supabase
            .from(
              'storage_locations'
            )
            .select('id')
            .in('id', ids)

        if (
          verificationError
        ) {
          throw verificationError
        }

        if (
          (remainingRows || [])
            .length !== 0
        ) {
          throw new Error(
            `Suppression incomplète : ${(remainingRows || []).length} lieu(x) sont encore présents dans Supabase.`
          )
        }

        // On retire ensuite uniquement les lieux de l'état local.
        // Tous les autres référentiels restent intacts.
        saveMasterData(
          masterData.filter(
            (item) =>
              item.type !==
              'location'
          )
        )

        setMessage(
          `${locations.length} lieu(x) de stockage supprimé(s). Produits, fournisseurs, catégories et sous-catégories conservés.`
        )
      } catch (
        caughtError
      ) {
        console.error(
          'Effacement global lieux :',
          caughtError
        )

        setError(
          caughtError instanceof
            Error
            ? caughtError.message
            : 'Erreur pendant la suppression globale des lieux.'
        )
      } finally {
        setBusy('')
      }
    }

  const exportBackup =
    () => {
      const payload = {
        exportedAt:
          new Date()
            .toISOString(),
        products,
        suppliers,
        masterData,
      }

      const blob =
        new Blob(
          [
            JSON.stringify(
              payload,
              null,
              2
            ),
          ],
          {
            type:
              'application/json;charset=utf-8',
          }
        )

      const url =
        URL.createObjectURL(
          blob
        )

      const anchor =
        document.createElement(
          'a'
        )

      anchor.href = url
      anchor.download =
        `NukuStock-backup-${new Date()
          .toISOString()
          .slice(0, 10)}.json`

      anchor.click()

      URL.revokeObjectURL(
        url
      )

      setMessage(
        'Sauvegarde JSON exportée.'
      )
    }

  return (
    <Page
      title="Import / Export"
      subtitle="Importer les bases NukuStock sans modifier manuellement les fiches une par une"
      action={
        <button
          type="button"
          className="button secondary"
          onClick={
            exportBackup
          }
        >
          Exporter une sauvegarde
        </button>
      }
    >
      <input
        ref={productsInput}
        type="file"
        accept=".xlsx,.xls,.xlsm"
        style={{
          display: 'none',
        }}
        onChange={
          importProducts
        }
      />

      <input
        ref={weightsInput}
        type="file"
        accept=".xlsx,.xls,.xlsm"
        style={{
          display: 'none',
        }}
        onChange={
          importWeights
        }
      />

      <input
        ref={suppliersInput}
        type="file"
        accept=".xlsx,.xls,.xlsm"
        style={{
          display: 'none',
        }}
        onChange={
          importSuppliers
        }
      />

      <input
        ref={locationsInput}
        type="file"
        accept=".xlsx,.xls,.xlsm"
        style={{
          display: 'none',
        }}
        onChange={
          importLocations
        }
      />

      {message && (
        <div
          className="notice goodNotice"
          style={{
            marginBottom: 16,
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          className="notice"
          style={{
            marginBottom: 16,
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
          padding: 14,
          marginBottom: 18,
          borderRadius: 14,
          border:
            '1px solid rgba(59,130,246,.18)',
          background:
            'rgba(59,130,246,.07)',
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        <strong>
          Import sécurisé :
        </strong>{' '}
        une référence déjà présente est
        mise à jour. Les autres produits,
        fournisseurs et lieux existants
        sont conservés.
      </div>

      <div
        className="importGrid"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(4,minmax(0,1fr))',
          gap: 16,
        }}
      >
        <Card>
          <div
            style={{
              minHeight: 235,
              display: 'flex',
              flexDirection:
                'column',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                letterSpacing:
                  '.05em',
                color: '#667085',
              }}
            >
              BASE PRODUITS
            </div>

            <h2
              style={{
                margin:
                  '8px 0 8px',
              }}
            >
              Importer Produits
            </h2>

            <p
              className="muted"
              style={{
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Compatible avec le fichier
              NukuStock contenant les
              feuilles Produits et
              Stocks_DLUO.
            </p>

            <div
              style={{
                marginTop: 'auto',
                paddingTop: 22,
              }}
            >
              <button
                type="button"
                className="button"
                style={{
                  width: '100%',
                }}
                disabled={
                  busy !== ''
                }
                onClick={() =>
                  startImport(
                    'products'
                  )
                }
              >
                {busy ===
                'products'
                  ? 'Import en cours...'
                  : 'Importer Produits'}
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div
            style={{
              minHeight: 235,
              display: 'flex',
              flexDirection:
                'column',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                letterSpacing:
                  '.05em',
                color: '#667085',
              }}
            >
              POIDS PRODUITS
            </div>

            <h2
              style={{
                margin:
                  '8px 0 8px',
              }}
            >
              Importer les poids
            </h2>

            <p
              className="muted"
              style={{
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Met à jour uniquement le poids
              unitaire plein et le poids du
              conditionnement complet à partir
              de la référence interne.
            </p>

            <div
              style={{
                marginTop: 'auto',
                paddingTop: 22,
              }}
            >
              <button
                type="button"
                className="button"
                style={{
                  width: '100%',
                }}
                disabled={
                  busy !== ''
                }
                onClick={() =>
                  startImport(
                    'weights'
                  )
                }
              >
                {busy ===
                'weights'
                  ? 'Import en cours...'
                  : 'Importer les poids'}
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div
            style={{
              minHeight: 235,
              display: 'flex',
              flexDirection:
                'column',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                letterSpacing:
                  '.05em',
                color: '#667085',
              }}
            >
              RÉFÉRENTIEL
            </div>

            <h2
              style={{
                margin:
                  '8px 0 8px',
              }}
            >
              Importer Fournisseurs
            </h2>

            <p
              className="muted"
              style={{
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Importe les noms, contacts,
              téléphones, paiements,
              emails, adresses et notes.
            </p>

            <div
              style={{
                marginTop: 'auto',
                paddingTop: 22,
              }}
            >
              <button
                type="button"
                className="button"
                style={{
                  width: '100%',
                }}
                disabled={
                  busy !== ''
                }
                onClick={() =>
                  startImport(
                    'suppliers'
                  )
                }
              >
                {busy ===
                'suppliers'
                  ? 'Import en cours...'
                  : 'Importer Fournisseurs'}
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div
            style={{
              minHeight: 235,
              display: 'flex',
              flexDirection:
                'column',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                letterSpacing:
                  '.05em',
                color: '#667085',
              }}
            >
              STOCKAGE
            </div>

            <h2
              style={{
                margin:
                  '8px 0 8px',
              }}
            >
              Importer Lieux
            </h2>

            <p
              className="muted"
              style={{
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Ajoute ou met à jour les
              lieux du référentiel central
              de stockage.
            </p>

            <div
              style={{
                marginTop: 'auto',
                paddingTop: 22,
              }}
            >
              <button
                type="button"
                className="button"
                style={{
                  width: '100%',
                }}
                disabled={
                  busy !== ''
                }
                onClick={() =>
                  startImport(
                    'locations'
                  )
                }
              >
                {busy ===
                'locations'
                  ? 'Import en cours...'
                  : 'Importer Lieux'}
              </button>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            padding: 2,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: '#b42318',
                marginBottom: 4,
              }}
            >
              ZONE DE SÉCURITÉ
            </div>

            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Effacer tous les produits
            </div>

            <div
              className="muted"
              style={{
                marginTop: 4,
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              Supprime tous les produits et leurs stocks affichés.
              Les fournisseurs et les lieux de stockage sont conservés.
              Deux confirmations sont obligatoires.
            </div>
          </div>

          <button
            type="button"
            className="button"
            disabled={
              busy !== '' ||
              products.length === 0
            }
            onClick={
              clearAllProducts
            }
            style={{
              background: '#b42318',
              borderColor: '#b42318',
              color: '#ffffff',
              minWidth: 220,
            }}
          >
            Effacer tous les produits
          </button>
        </div>
      </Card>

      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            padding: 2,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: '#b42318',
                marginBottom: 4,
              }}
            >
              ZONE DE SÉCURITÉ
            </div>

            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Réinitialiser tous les lieux
            </div>

            <div
              className="muted"
              style={{
                marginTop: 4,
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              Supprime tous les lieux de stockage du référentiel.
              Les produits, fournisseurs, catégories et sous-catégories sont conservés.
              Deux confirmations sont obligatoires.
            </div>
          </div>

          <button
            type="button"
            className="button"
            disabled={
              busy !== '' ||
              masterData.filter(
                (item) =>
                  item.type ===
                  'location'
              ).length === 0
            }
            onClick={
              clearAllLocations
            }
            style={{
              background: '#b42318',
              borderColor: '#b42318',
              color: '#ffffff',
              minWidth: 220,
            }}
          >
            {busy ===
            'clear-locations'
              ? 'Suppression en cours...'
              : 'Réinitialiser les lieux'}
          </button>
        </div>
      </Card>

      <Card>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(3,minmax(0,1fr))',
            gap: 16,
          }}
          className="importStats"
        >
          <div>
            <div
              className="muted"
              style={{
                fontSize: 12,
              }}
            >
              Produits actuels
            </div>

            <strong
              style={{
                display: 'block',
                marginTop: 5,
                fontSize: 26,
              }}
            >
              {products.length}
            </strong>
          </div>

          <div>
            <div
              className="muted"
              style={{
                fontSize: 12,
              }}
            >
              Fournisseurs actuels
            </div>

            <strong
              style={{
                display: 'block',
                marginTop: 5,
                fontSize: 26,
              }}
            >
              {suppliers.length}
            </strong>
          </div>

          <div>
            <div
              className="muted"
              style={{
                fontSize: 12,
              }}
            >
              Lieux actuels
            </div>

            <strong
              style={{
                display: 'block',
                marginTop: 5,
                fontSize: 26,
              }}
            >
              {
                masterData.filter(
                  (item) =>
                    item.type ===
                    'location'
                ).length
              }
            </strong>
          </div>
        </div>
      </Card>

      <style jsx global>{`
        @media (max-width: 900px) {
          .importGrid {
            grid-template-columns: 1fr !important;
          }

          .importStats {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </Page>
  )
}