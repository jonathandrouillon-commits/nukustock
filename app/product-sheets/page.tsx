'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { Card, Page } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useProducts } from '@/lib/store'

type ProductSheet = {
  product_id: string
  description: string
  history: string
  production_method: string
  aromatic_profile: string
  anecdote: string
  service_notes: string
  updated_at?: string
}

type BarRole =
  | 'manager_admin'
  | 'assistant_manager'
  | 'staff'
  | null

type ViewMode =
  | 'auto'
  | 'phone'
  | 'tablet'
  | 'pc'

function normalize(
  value: unknown
) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .trim()
}

function categoryOf(
  product: any
) {
  return (
    product.subcategory ||
    product.category ||
    'Divers'
  )
}

export default function ProductSheetsPage() {
  const { items: products } =
    useProducts()

  const [role, setRole] =
    useState<BarRole>(null)

  const [sheets, setSheets] =
    useState<
      Record<string, ProductSheet>
    >({})

  /*
   * NukuStock affiche les produits avec legacy_id quand il existe,
   * alors que bar_product_sheets utilise l'UUID réel de products.id.
   *
   * Cette table de correspondance permet de relier les deux.
   * clé   = id utilisé par l'interface NukuStock
   * valeur = UUID réel public.products.id
   */
  const [
    productDbIds,
    setProductDbIds,
  ] =
    useState<
      Record<string, string>
    >({})

  const [category, setCategory] =
    useState('Toutes')

  const [search, setSearch] =
    useState('')

  const [selectedId, setSelectedId] =
    useState('')

  const [editing, setEditing] =
    useState(false)

  const [draft, setDraft] =
    useState<ProductSheet | null>(
      null
    )

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [message, setMessage] =
    useState('')


  const importInputRef =
    useRef<HTMLInputElement>(
      null
    )

  const [
    viewMode,
    setViewMode,
  ] =
    useState<ViewMode>(
      'auto'
    )

  const [
    importing,
    setImporting,
  ] =
    useState(false)

  const [
    deleting,
    setDeleting,
  ] =
    useState(false)

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          'bar_product_sheets_view_mode'
        ) as ViewMode | null

      if (
        saved === 'auto' ||
        saved === 'phone' ||
        saved === 'tablet' ||
        saved === 'pc'
      ) {
        setViewMode(
          saved
        )
      }
    } catch {
      // Rien : affichage auto par défaut.
    }
  }, [])

  const changeViewMode = (
    nextMode: ViewMode
  ) => {
    setViewMode(
      nextMode
    )

    try {
      localStorage.setItem(
        'bar_product_sheets_view_mode',
        nextMode
      )
    } catch {
      // Rien : le choix reste actif pour la session courante.
    }
  }

  const canManage =
    role === 'manager_admin' ||
    role ===
      'assistant_manager'

  useEffect(() => {
    let active = true

    const load = async () => {
      const {
        data: { session },
      } =
        await supabase.auth
          .getSession()

      if (!active) return

      const rawRole =
        String(
          session?.user
            ?.app_metadata
            ?.bar_role || ''
        )

      setRole(
        rawRole ===
            'manager_admin' ||
          rawRole ===
            'assistant_manager' ||
          rawRole === 'staff'
          ? rawRole
          : null
      )

      /*
       * IMPORTANT :
       *
       * useProducts() expose product.id =
       *   legacy_id || products.id
       *
       * tandis que bar_product_sheets.product_id
       * contient products.id (UUID Supabase).
       *
       * On récupère donc les deux tables ensemble et
       * on convertit chaque UUID Supabase vers l'id
       * réellement utilisé par l'interface.
       */
      const [
        sheetsResult,
        productsResult,
      ] =
        await Promise.all([
          supabase
            .from(
              'bar_product_sheets'
            )
            .select('*'),

          supabase
            .from(
              'products'
            )
            .select(
              'id, legacy_id'
            )
            .eq(
              'active',
              true
            ),
        ])

      if (!active) return

      if (
        sheetsResult.error
      ) {
        setError(
          sheetsResult.error.message
        )
        setLoading(false)
        return
      }

      if (
        productsResult.error
      ) {
        setError(
          productsResult.error.message
        )
        setLoading(false)
        return
      }

      const uiToDb:
        Record<
          string,
          string
        > = {}

      const dbToUi =
        new Map<
          string,
          string
        >()

      for (
        const row
        of productsResult.data ||
        []
      ) {
        const uiId =
          String(
            row.legacy_id ||
            row.id
          )

        const dbId =
          String(
            row.id
          )

        uiToDb[
          uiId
        ] = dbId

        dbToUi.set(
          dbId,
          uiId
        )
      }

      setProductDbIds(
        uiToDb
      )

      const mapped:
        Record<
          string,
          ProductSheet
        > = {}

      for (
        const row
        of sheetsResult.data ||
        []
      ) {
        const uiProductId =
          dbToUi.get(
            String(
              row.product_id
            )
          ) ||
          String(
            row.product_id
          )

        mapped[
          uiProductId
        ] = {
          product_id:
            String(
              row.product_id
            ),

          description:
            row.description ||
            '',

          history:
            row.history ||
            '',

          production_method:
            row.production_method ||
            '',

          aromatic_profile:
            row.aromatic_profile ||
            '',

          anecdote:
            row.anecdote ||
            '',

          service_notes:
            row.service_notes ||
            '',

          updated_at:
            row.updated_at,
        }
      }

      setSheets(
        mapped
      )

      setLoading(
        false
      )
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const beverageProducts =
    useMemo(() => {
      return products
        .filter((product: any) => {
          const text =
            normalize(
              [
                product.category,
                product.subcategory,
                product.zone,
              ].join(' ')
            )

          return (
            text.includes(
              'alcool'
            ) ||
            text.includes('gin') ||
            text.includes(
              'vodka'
            ) ||
            text.includes(
              'rhum'
            ) ||
            text.includes(
              'whisky'
            ) ||
            text.includes(
              'tequila'
            ) ||
            text.includes(
              'mezcal'
            ) ||
            text.includes(
              'cognac'
            ) ||
            text.includes(
              'armagnac'
            ) ||
            text.includes(
              'liqueur'
            ) ||
            text.includes(
              'biere'
            ) ||
            text.includes(
              'vin'
            ) ||
            text.includes(
              'champagne'
            )
          )
        })
        .sort((a: any, b: any) =>
          String(a.name).localeCompare(
            String(b.name),
            'fr',
            {
              sensitivity:
                'base',
            }
          )
        )
    }, [products])

  const categories =
    useMemo(() => {
      return [
        'Toutes',
        ...Array.from(
          new Set(
            beverageProducts
              .map(
                (product: any) =>
                  categoryOf(
                    product
                  )
              )
              .filter(Boolean)
          )
        ).sort((a, b) =>
          String(a).localeCompare(
            String(b),
            'fr',
            {
              sensitivity:
                'base',
            }
          )
        ),
      ]
    }, [beverageProducts])

  const visibleProducts =
    useMemo(() => {
      const q =
        normalize(search)

      return beverageProducts.filter(
        (product: any) => {
          const matchesCategory =
            category ===
              'Toutes' ||
            categoryOf(
              product
            ) === category

          if (
            !matchesCategory
          ) {
            return false
          }

          if (!q) {
            return true
          }

          return normalize(
            [
              product.name,
              product.brand,
              product.category,
              product.subcategory,
            ].join(' ')
          ).includes(q)
        }
      )
    }, [
      beverageProducts,
      category,
      search,
    ])

  const selectedProduct =
    useMemo(() => {
      return products.find(
        (product: any) =>
          product.id ===
          selectedId
      )
    }, [
      products,
      selectedId,
    ])

  const selectedSheet =
    selectedId
      ? sheets[selectedId]
      : undefined

  const openProduct = (
    productId: string
  ) => {
    setSelectedId(
      productId
    )
    setEditing(false)
    setDraft(null)
    setError('')
    setMessage('')
  }

  const startEdit = () => {
    if (
      !canManage ||
      !selectedId
    ) {
      return
    }

    setDraft(
      selectedSheet || {
        product_id:
          productDbIds[
            selectedId
          ] ||
          selectedId,
        description: '',
        history: '',
        production_method:
          '',
        aromatic_profile:
          '',
        anecdote: '',
        service_notes: '',
      }
    )

    setEditing(true)
  }

  const saveSheet =
    async () => {
      if (
        !canManage ||
        !draft
      ) {
        return
      }

      setSaving(true)
      setError('')
      setMessage('')

      const dbProductId =
        productDbIds[
          selectedId
        ] ||
        draft.product_id

      const payload = {
        ...draft,

        /*
         * Toujours enregistrer l'UUID réel de public.products.
         * Jamais le legacy_id affiché par useProducts().
         */
        product_id:
          dbProductId,

        updated_at:
          new Date()
            .toISOString(),
      }

      const {
        data,
        error: saveError,
      } =
        await supabase
          .from(
            'bar_product_sheets'
          )
          .upsert(
            payload,
            {
              onConflict:
                'product_id',
            }
          )
          .select()
          .single()

      setSaving(false)

      if (saveError) {
        setError(
          saveError.message
        )
        return
      }

      setSheets(
        (current) => ({
          ...current,
          [selectedId]:
            {
              product_id:
                data.product_id,
              description:
                data.description ||
                '',
              history:
                data.history || '',
              production_method:
                data.production_method ||
                '',
              aromatic_profile:
                data.aromatic_profile ||
                '',
              anecdote:
                data.anecdote || '',
              service_notes:
                data.service_notes ||
                '',
              updated_at:
                data.updated_at,
            },
        })
      )

      setEditing(false)
      setDraft(null)
      setMessage(
        'Fiche produit enregistrée.'
      )
    }

  const deleteSelectedSheet =
    async () => {
      if (
        !canManage ||
        !selectedId ||
        deleting
      ) {
        return
      }

      const selectedProduct =
        products.find(
          (product: any) =>
            product.id ===
            selectedId
        )

      const productName =
        selectedProduct?.name ||
        'ce produit'

      const confirmed =
        window.confirm(
          `Supprimer la fiche de "${productName}" ?\n\nLe produit restera dans NukuStock. Seule sa fiche Bar Team sera supprimée.`
        )

      if (!confirmed) {
        return
      }

      const dbProductId =
        productDbIds[
          selectedId
        ] ||
        sheets[selectedId]
          ?.product_id

      if (!dbProductId) {
        setError(
          'Identifiant Supabase du produit introuvable.'
        )
        return
      }

      setDeleting(true)
      setError('')
      setMessage('')

      const {
        error:
          deleteError,
      } =
        await supabase
          .from(
            'bar_product_sheets'
          )
          .delete()
          .eq(
            'product_id',
            dbProductId
          )

      setDeleting(false)

      if (deleteError) {
        setError(
          deleteError.message
        )
        return
      }

      setSheets(
        (current) => {
          const next = {
            ...current,
          }

          delete next[
            selectedId
          ]

          return next
        }
      )

      setEditing(false)
      setDraft(null)

      setMessage(
        `Fiche "${productName}" supprimée.`
      )
    }

  const exportSheets =
    () => {
      const exportedSheets =
        products
          .map(
            (product: any) => {
              const sheet =
                sheets[
                  product.id
                ]

              if (!sheet) {
                return null
              }

              return {
                ui_product_id:
                  product.id,

                db_product_id:
                  productDbIds[
                    product.id
                  ] ||
                  sheet.product_id,

                internal_reference:
                  product.internalRef ||
                  product.internal_reference ||
                  '',

                name:
                  product.name ||
                  '',

                category:
                  product.category ||
                  '',

                subcategory:
                  product.subcategory ||
                  '',

                description:
                  sheet.description ||
                  '',

                history:
                  sheet.history ||
                  '',

                production_method:
                  sheet.production_method ||
                  '',

                aromatic_profile:
                  sheet.aromatic_profile ||
                  '',

                anecdote:
                  sheet.anecdote ||
                  '',

                service_notes:
                  sheet.service_notes ||
                  '',

                updated_at:
                  sheet.updated_at ||
                  null,
              }
            }
          )
          .filter(Boolean)

      const payload = {
        app:
          'NukuStock',

        module:
          'bar_product_sheets',

        version:
          1,

        exported_at:
          new Date()
            .toISOString(),

        count:
          exportedSheets.length,

        sheets:
          exportedSheets,
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

      anchor.href =
        url

      anchor.download =
        `Bar-Team-Fiches-Produits-${new Date()
          .toISOString()
          .slice(0, 10)}.json`

      anchor.click()

      URL.revokeObjectURL(
        url
      )

      setMessage(
        `${exportedSheets.length} fiche(s) exportée(s).`
      )
    }

  const importSheets =
    async (
      event:
        React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0]

      event.target.value =
        ''

      if (
        !file ||
        !canManage
      ) {
        return
      }

      setImporting(true)
      setError('')
      setMessage('')

      try {
        const raw =
          await file.text()

        const parsed =
          JSON.parse(
            raw
          )

        const rows =
          Array.isArray(
            parsed
          )
            ? parsed
            : Array.isArray(
                parsed?.sheets
              )
            ? parsed.sheets
            : []

        if (!rows.length) {
          throw new Error(
            'Aucune fiche produit trouvée dans ce fichier.'
          )
        }

        const productByRef =
          new Map<
            string,
            any
          >()

        const productByName =
          new Map<
            string,
            any
          >()

        for (
          const product
          of products as any[]
        ) {
          const ref =
            String(
              product.internalRef ||
              product.internal_reference ||
              ''
            )
              .trim()
              .toLowerCase()

          if (ref) {
            productByRef.set(
              ref,
              product
            )
          }

          const name =
            normalize(
              product.name
            )

          if (name) {
            productByName.set(
              name,
              product
            )
          }
        }

        const payloads:
          ProductSheet[] = []

        const uiIds:
          string[] = []

        for (
          const row
          of rows
        ) {
          const ref =
            String(
              row.internal_reference ||
              row.internalRef ||
              ''
            )
              .trim()
              .toLowerCase()

          const rowName =
            normalize(
              row.name
            )

          const matchedProduct =
            (
              ref
                ? productByRef.get(
                    ref
                  )
                : null
            ) ||
            (
              rowName
                ? productByName.get(
                    rowName
                  )
                : null
            ) ||
            products.find(
              (product: any) =>
                product.id ===
                row.ui_product_id
            )

          if (!matchedProduct) {
            continue
          }

          const dbProductId =
            productDbIds[
              matchedProduct.id
            ] ||
            row.db_product_id ||
            row.product_id

          if (!dbProductId) {
            continue
          }

          payloads.push({
            product_id:
              String(
                dbProductId
              ),

            description:
              String(
                row.description ||
                ''
              ),

            history:
              String(
                row.history ||
                ''
              ),

            production_method:
              String(
                row.production_method ||
                ''
              ),

            aromatic_profile:
              String(
                row.aromatic_profile ||
                ''
              ),

            anecdote:
              String(
                row.anecdote ||
                ''
              ),

            service_notes:
              String(
                row.service_notes ||
                ''
              ),

            updated_at:
              new Date()
                .toISOString(),
          })

          uiIds.push(
            matchedProduct.id
          )
        }

        if (
          !payloads.length
        ) {
          throw new Error(
            'Aucune fiche du fichier ne correspond aux produits NukuStock actuels.'
          )
        }

        const {
          data,
          error:
            importError,
        } =
          await supabase
            .from(
              'bar_product_sheets'
            )
            .upsert(
              payloads,
              {
                onConflict:
                  'product_id',
              }
            )
            .select()

        if (importError) {
          throw importError
        }

        const nextSheets = {
          ...sheets,
        }

        for (
          let index = 0;
          index <
          (data || []).length;
          index += 1
        ) {
          const row =
            data![index]

          const uiId =
            uiIds[index]

          if (!uiId) {
            continue
          }

          nextSheets[
            uiId
          ] = {
            product_id:
              row.product_id,

            description:
              row.description ||
              '',

            history:
              row.history ||
              '',

            production_method:
              row.production_method ||
              '',

            aromatic_profile:
              row.aromatic_profile ||
              '',

            anecdote:
              row.anecdote ||
              '',

            service_notes:
              row.service_notes ||
              '',

            updated_at:
              row.updated_at,
          }
        }

        setSheets(
          nextSheets
        )

        setMessage(
          `${payloads.length} fiche(s) importée(s) / mise(s) à jour.`
        )
      } catch (
        importFailure
      ) {
        setError(
          importFailure instanceof
            Error
            ? importFailure.message
            : 'Erreur pendant l’import.'
        )
      } finally {
        setImporting(false)
      }
    }

  return (
    <Page
      title="Fiches Produits"
      subtitle="Base de connaissances Bar Team · produits classés par catégorie"
    >
      <input
        ref={
          importInputRef
        }
        type="file"
        accept=".json,application/json"
        style={{
          display:
            'none',
        }}
        onChange={
          importSheets
        }
      />

      <div
        className={`sheetPage sheetView-${viewMode}`}
      >
        <div className="sheetToolbar">
          <div className="sheetActions">
            {canManage && (
              <>
                <button
                  type="button"
                  className="toolbarButton primary"
                  disabled={
                    !selectedId
                  }
                  onClick={
                    startEdit
                  }
                >
                  Modifier
                </button>

                <button
                  type="button"
                  className="toolbarButton danger"
                  disabled={
                    !selectedId ||
                    deleting
                  }
                  onClick={() =>
                    void deleteSelectedSheet()
                  }
                >
                  {deleting
                    ? 'Suppression…'
                    : 'Supprimer'}
                </button>

                <button
                  type="button"
                  className="toolbarButton"
                  disabled={
                    importing
                  }
                  onClick={() =>
                    importInputRef.current
                      ?.click()
                  }
                >
                  {importing
                    ? 'Import…'
                    : 'Importer'}
                </button>
              </>
            )}

            <button
              type="button"
              className="toolbarButton"
              onClick={
                exportSheets
              }
            >
              Exporter
            </button>
          </div>

          <div className="sheetDisplayControl">
            <span>
              Affichage
            </span>

            <div>
              <button
                type="button"
                className={
                  viewMode ===
                  'auto'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  changeViewMode(
                    'auto'
                  )
                }
              >
                Auto
              </button>

              <button
                type="button"
                className={
                  viewMode ===
                  'phone'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  changeViewMode(
                    'phone'
                  )
                }
              >
                Téléphone
              </button>

              <button
                type="button"
                className={
                  viewMode ===
                  'tablet'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  changeViewMode(
                    'tablet'
                  )
                }
              >
                Tablette
              </button>

              <button
                type="button"
                className={
                  viewMode ===
                  'pc'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  changeViewMode(
                    'pc'
                  )
                }
              >
                PC
              </button>
            </div>
          </div>
        </div>

        <div className="filters">
          <select
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value
              )
            }
          >
            {categories.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>

          <input
            type="search"
            value={search}
            placeholder="Rechercher un produit..."
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
        </div>

        {message && (
          <div className="notice good">
            {message}
          </div>
        )}

        {error && (
          <div className="notice error">
            {error}
          </div>
        )}

        <div className="layout">
          <Card>
            <div className="productList">
              <div className="listHead">
                <strong>
                  {category}
                </strong>

                <span>
                  {
                    visibleProducts.length
                  }{' '}
                  produit
                  {visibleProducts.length >
                  1
                    ? 's'
                    : ''}
                </span>
              </div>

              {loading ? (
                <div className="empty">
                  Chargement…
                </div>
              ) : (
                visibleProducts.map(
                  (product: any) => (
                    <button
                      key={
                        product.id
                      }
                      type="button"
                      className={
                        selectedId ===
                        product.id
                          ? 'productButton active'
                          : 'productButton'
                      }
                      onClick={() =>
                        openProduct(
                          product.id
                        )
                      }
                    >
                      <div className="thumb">
                        {product.photo ? (
                          <img
                            src={
                              product.photo
                            }
                            alt={
                              product.name
                            }
                          />
                        ) : (
                          <span>
                            ▣
                          </span>
                        )}
                      </div>

                      <div>
                        <strong>
                          {
                            product.name
                          }
                        </strong>

                        <span>
                          {product.brand ||
                            categoryOf(
                              product
                            )}
                        </span>
                      </div>

                      {sheets[
                        product.id
                      ] && (
                        <small>
                          ✓
                        </small>
                      )}
                    </button>
                  )
                )
              )}
            </div>
          </Card>

          <Card>
            {!selectedProduct ? (
              <div className="empty detailEmpty">
                Sélectionne un produit pour afficher sa fiche.
              </div>
            ) : (
              <div className="detail">
                <div className="hero">
                  <div className="heroPhoto">
                    {selectedProduct.photo ? (
                      <img
                        src={
                          selectedProduct.photo
                        }
                        alt={
                          selectedProduct.name
                        }
                      />
                    ) : (
                      <span>
                        ▣
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="eyebrow">
                      {categoryOf(
                        selectedProduct
                      )}
                    </span>

                    <h2>
                      {
                        selectedProduct.name
                      }
                    </h2>

                    {selectedProduct.brand && (
                      <p>
                        {
                          selectedProduct.brand
                        }
                      </p>
                    )}
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      className="editButton"
                      onClick={
                        startEdit
                      }
                    >
                      Modifier
                    </button>
                  )}
                </div>

                {!editing ? (
                  <div className="sections productInfoGrid">
                    <SheetSection
                      title="Descriptif"
                      value={
                        selectedSheet
                          ?.description
                      }
                    />

                    <SheetSection
                      title="Profil aromatique"
                      value={
                        selectedSheet
                          ?.aromatic_profile
                      }
                    />

                    <SheetSection
                      title="Histoire"
                      value={
                        selectedSheet
                          ?.history
                      }
                    />

                    <SheetSection
                      title="Méthode de fabrication"
                      value={
                        selectedSheet
                          ?.production_method
                      }
                    />

                    <SheetSection
                      title="Anecdote"
                      value={
                        selectedSheet
                          ?.anecdote
                      }
                    />

                    <SheetSection
                      title="Notes Bar Team"
                      value={
                        selectedSheet
                          ?.service_notes
                      }
                    />

                    {!selectedSheet && (
                      <div className="emptySheet">
                        Cette fiche n&apos;est pas encore renseignée.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="editor editorGrid">
                    <EditorField
                      label="Descriptif"
                      fieldClass="wide"
                      value={
                        draft
                          ?.description ||
                        ''
                      }
                      onChange={(
                        value
                      ) =>
                        setDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  description:
                                    value,
                                }
                              : current
                        )
                      }
                    />

                    <EditorField
                      label="Profil aromatique"
                      value={
                        draft
                          ?.aromatic_profile ||
                        ''
                      }
                      onChange={(
                        value
                      ) =>
                        setDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  aromatic_profile:
                                    value,
                                }
                              : current
                        )
                      }
                    />

                    <EditorField
                      label="Histoire"
                      fieldClass="wide"
                      value={
                        draft
                          ?.history ||
                        ''
                      }
                      onChange={(
                        value
                      ) =>
                        setDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  history:
                                    value,
                                }
                              : current
                        )
                      }
                    />

                    <EditorField
                      label="Méthode de fabrication"
                      value={
                        draft
                          ?.production_method ||
                        ''
                      }
                      onChange={(
                        value
                      ) =>
                        setDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  production_method:
                                    value,
                                }
                              : current
                        )
                      }
                    />

                    <EditorField
                      label="Anecdote"
                      value={
                        draft
                          ?.anecdote ||
                        ''
                      }
                      onChange={(
                        value
                      ) =>
                        setDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  anecdote:
                                    value,
                                }
                              : current
                        )
                      }
                    />

                    <EditorField
                      label="Notes Bar Team"
                      value={
                        draft
                          ?.service_notes ||
                        ''
                      }
                      onChange={(
                        value
                      ) =>
                        setDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  service_notes:
                                    value,
                                }
                              : current
                        )
                      }
                    />

                    <div className="editorActions">
                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() => {
                          setEditing(
                            false
                          )
                          setDraft(
                            null
                          )
                        }}
                      >
                        Annuler
                      </button>

                      <button
                        type="button"
                        className="primary"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          void saveSheet()
                        }
                      >
                        {saving
                          ? 'Enregistrement…'
                          : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      <style jsx>{`
        .sheetPage {
          display:grid;
          gap:12px;
        }

        .sheetToolbar {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
          padding:10px 12px;
          border:1px solid #e5e7eb;
          border-radius:14px;
          background:#fff;
        }

        .sheetActions {
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
        }

        .toolbarButton {
          min-height:38px;
          padding:0 13px;
          border:1px solid #d0d5dd;
          border-radius:10px;
          background:#fff;
          color:#344054;
          font-size:12px;
          font-weight:800;
          cursor:pointer;
        }

        .toolbarButton:hover:not(:disabled) {
          background:#f9fafb;
        }

        .toolbarButton:disabled {
          opacity:.45;
          cursor:not-allowed;
        }

        .toolbarButton.primary {
          background:#101828;
          color:#fff;
          border-color:#101828;
        }

        .toolbarButton.danger {
          color:#b42318;
          border-color:#fecdca;
          background:#fff5f5;
        }

        .sheetDisplayControl {
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
        }

        .sheetDisplayControl > span {
          font-size:10px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.08em;
          color:#667085;
        }

        .sheetDisplayControl > div {
          display:flex;
          align-items:center;
          padding:3px;
          gap:3px;
          background:#f2f4f7;
          border-radius:10px;
        }

        .sheetDisplayControl button {
          min-height:30px;
          padding:0 9px;
          border:0;
          border-radius:8px;
          background:transparent;
          color:#667085;
          font-size:10px;
          font-weight:800;
          cursor:pointer;
        }

        .sheetDisplayControl button.active {
          background:#fff;
          color:#101828;
          box-shadow:0 1px 3px rgba(16,24,40,.12);
        }

        .sheetView-phone {
          width:min(430px,100%);
          margin:0 auto;
        }

        .sheetView-tablet {
          width:min(860px,100%);
          margin:0 auto;
        }

        .sheetView-pc {
          width:100%;
        }

        .sheetView-phone .filters,
        .sheetView-phone .layout {
          grid-template-columns:1fr;
        }

        .sheetView-phone .sheetToolbar {
          align-items:stretch;
        }

        .sheetView-phone .sheetActions,
        .sheetView-phone .sheetDisplayControl {
          width:100%;
        }

        .sheetView-phone .sheetDisplayControl {
          justify-content:space-between;
        }

        .sheetView-phone .sheetDisplayControl > div {
          width:100%;
          overflow-x:auto;
        }

        .sheetView-phone .sheetDisplayControl button {
          flex:1 0 auto;
        }

        .sheetView-phone .hero {
          grid-template-columns:72px minmax(0,1fr);
        }

        .sheetView-phone .hero .editButton {
          grid-column:1 / -1;
          width:100%;
        }

        .sheetView-tablet .layout {
          grid-template-columns:minmax(240px,.8fr) minmax(0,1.4fr);
        }


        .filters {
          display:grid;
          grid-template-columns:240px 1fr;
          gap:10px;
        }

        .filters select,
        .filters input {
          min-height:42px;
          border:1px solid #d0d5dd;
          border-radius:10px;
          background:#fff;
          padding:0 12px;
        }

        .layout {
          display:grid;
          grid-template-columns:
            minmax(280px,320px)
            minmax(0,1fr);
          gap:16px;
          align-items:start;
        }

        .productList {
          max-height:72vh;
          overflow:auto;
          display:grid;
          scrollbar-width:thin;
          scrollbar-color:#d0d5dd transparent;
        }

        .listHead {
          position:sticky;
          top:0;
          z-index:2;
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:12px;
          border-bottom:1px solid #eaecf0;
          background:#fff;
        }

        .listHead span {
          color:#667085;
          font-size:10px;
          font-weight:800;
        }

        .productButton {
          width:100%;
          min-width:0;
          display:grid;
          grid-template-columns:50px minmax(0,1fr) 24px;
          align-items:center;
          gap:10px;
          padding:10px 12px;
          border:0;
          border-bottom:1px solid #f2f4f7;
          background:#fff;
          text-align:left;
          cursor:pointer;
          transition:
            background .15s ease,
            box-shadow .15s ease;
        }

        .productButton:hover {
          background:#f8fafc;
        }

        .productButton.active {
          background:#f2f4f7;
          box-shadow:
            inset 3px 0 0 #101828;
        }

        .productButton strong,
        .productButton span {
          display:block;
        }

        .productButton strong {
          font-size:11px;
        }

        .productButton span {
          margin-top:3px;
          color:#667085;
          font-size:9px;
        }

        .productButton small {
          color:#067647;
          font-weight:900;
        }

        .thumb,
        .heroPhoto {
          overflow:hidden;
          display:grid;
          place-items:center;
          background:#f2f4f7;
          color:#98a2b3;
        }

        .thumb {
          width:50px;
          height:50px;
          border-radius:11px;
          border:1px solid #eaecf0;
        }

        .thumb img,
        .heroPhoto img {
          width:100%;
          height:100%;
          object-fit:contain;
        }

        .detail {
          min-height:560px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #fbfcfe 100%
            );
        }

        .hero {
          display:grid;
          grid-template-columns:108px minmax(0,1fr) auto;
          gap:20px;
          align-items:center;
          padding:24px 26px;
          border-bottom:1px solid #eaecf0;
          background:
            linear-gradient(
              135deg,
              #ffffff 0%,
              #f8fafc 100%
            );
        }

        .heroPhoto {
          width:108px;
          height:138px;
          border-radius:16px;
          border:1px solid #e4e7ec;
          background:#f8fafc;
          box-shadow:
            0 8px 24px rgba(16,24,40,.07);
        }

        .hero h2 {
          margin:7px 0 6px;
          max-width:760px;
          color:#101828;
          font-size:26px;
          line-height:1.16;
          letter-spacing:-.025em;
        }

        .hero p {
          margin:0;
          color:#667085;
          font-size:12px;
          font-weight:650;
        }

        .eyebrow {
          display:inline-flex;
          align-items:center;
          min-height:24px;
          padding:0 9px;
          border-radius:999px;
          background:#f2f4f7;
          color:#475467;
          font-size:9px;
          font-weight:900;
          letter-spacing:.09em;
          text-transform:uppercase;
        }

        .editButton,
        .editorActions button {
          min-height:42px;
          padding:0 16px;
          border:1px solid #d0d5dd;
          border-radius:11px;
          background:#fff;
          color:#344054;
          font-size:12px;
          font-weight:850;
          box-shadow:
            0 1px 2px rgba(16,24,40,.04);
          cursor:pointer;
        }

        .editButton:hover,
        .editorActions button:hover:not(:disabled) {
          background:#f9fafb;
          border-color:#98a2b3;
        }

        .sections,
        .editor {
          padding:22px 24px 26px;
        }

        .productInfoGrid {
          display:grid;
          grid-template-columns:
            repeat(2,minmax(0,1fr));
          gap:14px;
        }

        .section {
          min-width:0;
          padding:18px;
          border:1px solid #e4e7ec;
          border-radius:14px;
          background:#fff;
          box-shadow:
            0 1px 2px rgba(16,24,40,.03);
        }

        .section:nth-child(1),
        .section:nth-child(3) {
          grid-column:1 / -1;
        }

        .section h3 {
          margin:0 0 9px;
          color:#101828;
          font-size:11px;
          font-weight:900;
          letter-spacing:.045em;
          text-transform:uppercase;
        }

        .section p {
          margin:0;
          color:#344054;
          font-size:13px;
          line-height:1.62;
          white-space:pre-wrap;
          overflow-wrap:anywhere;
        }

        .editorGrid {
          display:grid;
          grid-template-columns:
            repeat(2,minmax(0,1fr));
          gap:16px;
          align-items:start;
        }

        .editorField {
          display:grid;
          gap:8px;
          min-width:0;
          padding:15px;
          border:1px solid #e4e7ec;
          border-radius:14px;
          background:#fff;
        }

        .editorField.wide {
          grid-column:1 / -1;
        }

        .editorField span {
          color:#344054;
          font-size:11px;
          font-weight:900;
          letter-spacing:.025em;
        }

        .editorField textarea {
          width:100%;
          min-height:128px;
          box-sizing:border-box;
          resize:vertical;
          border:1px solid #d0d5dd;
          border-radius:11px;
          background:#fff;
          padding:12px 13px;
          color:#101828;
          font-family:inherit;
          font-size:13px;
          line-height:1.5;
          outline:none;
          transition:
            border-color .15s ease,
            box-shadow .15s ease;
        }

        .editorField.wide textarea {
          min-height:145px;
        }

        .editorField textarea:focus {
          border-color:#667085;
          box-shadow:
            0 0 0 3px rgba(102,112,133,.10);
        }

        .editorActions {
          grid-column:1 / -1;
          display:flex;
          justify-content:flex-end;
          gap:10px;
          padding-top:4px;
        }

        .editorActions .primary {
          min-width:120px;
          border-color:#101828;
          background:#101828;
          color:#fff;
        }

        .editorActions .primary:hover:not(:disabled) {
          background:#1d2939;
          border-color:#1d2939;
        }

        .editorActions button:disabled {
          opacity:.55;
          cursor:not-allowed;
        }

        .empty,
        .detailEmpty,
        .emptySheet {
          padding:24px;
          color:#667085;
          text-align:center;
          font-size:11px;
        }

        .notice {
          padding:10px 12px;
          border-radius:10px;
          font-size:11px;
          font-weight:800;
        }

        .notice.good {
          border:1px solid #abefc6;
          background:#ecfdf3;
          color:#067647;
        }

        .notice.error {
          border:1px solid #fecdca;
          background:#fef3f2;
          color:#b42318;
        }

        @media (max-width:1050px) {
          .productInfoGrid,
          .editorGrid {
            grid-template-columns:1fr;
          }

          .section:nth-child(1),
          .section:nth-child(3),
          .editorField.wide,
          .editorActions {
            grid-column:auto;
          }
        }

        @media (max-width:900px) {
          .layout {
            grid-template-columns:1fr;
          }

          .productList {
            max-height:320px;
          }

          .hero {
            grid-template-columns:90px minmax(0,1fr) auto;
            padding:20px;
          }

          .heroPhoto {
            width:90px;
            height:116px;
          }
        }

        @media (max-width:640px) {
          .filters {
            grid-template-columns:1fr;
          }

          .hero {
            grid-template-columns:76px minmax(0,1fr);
            gap:13px;
            padding:16px;
          }

          .heroPhoto {
            width:76px;
            height:96px;
            border-radius:12px;
          }

          .hero h2 {
            font-size:19px;
          }

          .editButton {
            grid-column:1 / -1;
            width:100%;
          }

          .sections,
          .editor {
            padding:14px;
          }

          .section,
          .editorField {
            padding:14px;
          }

          .editorActions {
            display:grid;
            grid-template-columns:1fr 1fr;
          }

          .editorActions button {
            width:100%;
          }
        }

        @media (max-width:760px) {
          .sheetToolbar {
            align-items:stretch;
          }

          .sheetActions {
            width:100%;
          }

          .sheetActions .toolbarButton {
            flex:1 1 calc(50% - 4px);
          }

          .sheetDisplayControl {
            width:100%;
          }

          .sheetDisplayControl > div {
            width:100%;
            overflow-x:auto;
          }

          .sheetDisplayControl button {
            flex:1 0 auto;
          }
        }

      `}</style>
    </Page>
  )
}

function SheetSection({
  title,
  value,
}: {
  title: string
  value?: string
}) {
  if (!value) {
    return null
  }

  return (
    <section className="section">
      <h3>{title}</h3>
      <p>{value}</p>
    </section>
  )
}

function EditorField({
  label,
  value,
  onChange,
  fieldClass = '',
}: {
  label: string
  value: string
  onChange: (
    value: string
  ) => void
  fieldClass?: string
}) {
  return (
    <label
      className={`editorField ${fieldClass}`}
    >
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
      />
    </label>
  )
}