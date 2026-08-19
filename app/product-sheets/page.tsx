'use client'

import {
  useEffect,
  useMemo,
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

  return (
    <Page
      title="Fiches Produits"
      subtitle="Base de connaissances Bar Team · produits classés par catégorie"
    >
      <div className="sheetPage">
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
                  <div className="sections">
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
                  <div className="editor">
                    <EditorField
                      label="Descriptif"
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
          grid-template-columns:320px minmax(0,1fr);
          gap:12px;
          align-items:start;
        }

        .productList {
          max-height:72vh;
          overflow:auto;
          display:grid;
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
          grid-template-columns:46px minmax(0,1fr) 24px;
          align-items:center;
          gap:9px;
          padding:9px 10px;
          border:0;
          border-bottom:1px solid #f2f4f7;
          background:#fff;
          text-align:left;
          cursor:pointer;
        }

        .productButton.active {
          background:#f2f4f7;
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
          width:46px;
          height:46px;
          border-radius:9px;
        }

        .heroPhoto {
          width:95px;
          height:120px;
          border-radius:12px;
        }

        .thumb img,
        .heroPhoto img {
          width:100%;
          height:100%;
          object-fit:contain;
        }

        .detail {
          min-height:520px;
        }

        .hero {
          display:grid;
          grid-template-columns:95px minmax(0,1fr) auto;
          gap:14px;
          align-items:center;
          padding:16px;
          border-bottom:1px solid #eaecf0;
        }

        .hero h2 {
          margin:4px 0;
          font-size:22px;
        }

        .hero p {
          margin:0;
          color:#667085;
        }

        .eyebrow {
          color:#667085;
          font-size:9px;
          font-weight:900;
          letter-spacing:.08em;
          text-transform:uppercase;
        }

        .editButton,
        .editorActions button {
          min-height:38px;
          padding:0 12px;
          border:1px solid #d0d5dd;
          border-radius:9px;
          background:#fff;
          font-weight:850;
          cursor:pointer;
        }

        .sections,
        .editor {
          padding:16px;
          display:grid;
          gap:14px;
        }

        .section {
          padding-bottom:12px;
          border-bottom:1px solid #eaecf0;
        }

        .section h3 {
          margin:0 0 6px;
          font-size:12px;
        }

        .section p {
          margin:0;
          color:#344054;
          font-size:11px;
          line-height:1.55;
          white-space:pre-wrap;
        }

        .editor label {
          display:grid;
          gap:6px;
        }

        .editor label span {
          color:#475467;
          font-size:10px;
          font-weight:850;
        }

        .editor textarea {
          width:100%;
          min-height:110px;
          resize:vertical;
          border:1px solid #d0d5dd;
          border-radius:10px;
          padding:10px;
          font:inherit;
        }

        .editorActions {
          display:flex;
          justify-content:flex-end;
          gap:8px;
        }

        .editorActions .primary {
          border-color:#101828;
          background:#101828;
          color:#fff;
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

        @media (max-width:900px) {
          .layout {
            grid-template-columns:1fr;
          }

          .productList {
            max-height:330px;
          }
        }

        @media (max-width:640px) {
          .filters {
            grid-template-columns:1fr;
          }

          .hero {
            grid-template-columns:75px minmax(0,1fr);
          }

          .heroPhoto {
            width:75px;
            height:95px;
          }

          .editButton {
            grid-column:1 / -1;
            width:100%;
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
}: {
  label: string
  value: string
  onChange: (
    value: string
  ) => void
}) {
  return (
    <label>
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