'use client'

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { Card, Page } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useProducts } from '@/lib/store'

type Ingredient = {
  amountMl: number
  productId: string
  productName: string
}

type Cocktail = {
  id: string
  name: string
  ingredients: Ingredient[]
  garnish: string
  method: string
  otherMethod: string
  glassProductId: string
  glassName: string
  note: string
  specialComment: string
  photoDataUrl: string
  sortOrder: number
  createdBy: string
  createdByName: string
  createdAt?: string
  updatedAt?: string
}

type BarRole =
  | 'manager_admin'
  | 'assistant_manager'
  | 'staff'
  | null

const METHODS = [
  'Shaker',
  'Verre à mélange',
  'Blender',
  'Direct au verre',
  'Autres',
] as const

const ML_VALUES = Array.from(
  { length: 61 },
  (_, index) => index * 5
)

function normalizeText(
  value: string
) {
  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .trim()
}

function isGlasswareProduct(
  product: any
) {
  const text =
    normalizeText(
      [
        product.zone,
        product.category,
        product.subcategory,
        product.name,
      ]
        .filter(Boolean)
        .join(' ')
    )

  return (
    text.includes('verrerie') ||
    text.includes('verre') ||
    text.includes('glass') ||
    text.includes('tumbler') ||
    text.includes('hurricane') ||
    text.includes('old fashioned') ||
    text.includes('chope') ||
    text.includes('tiki') ||
    text.includes('titane')
  )
}

function mapRow(
  row: any
): Cocktail {
  return {
    id: row.id,
    name: row.name || '',
    ingredients:
      Array.isArray(
        row.ingredients
      )
        ? row.ingredients.map(
            (item: any) => ({
              amountMl:
                Number(
                  item.amountMl
                ) || 0,
              productId:
                String(
                  item.productId ||
                    ''
                ),
              productName:
                String(
                  item.productName ||
                    ''
                ),
            })
          )
        : [],
    garnish:
      row.garnish || '',
    method:
      row.method || '',
    otherMethod:
      row.other_method || '',
    glassProductId:
      row.glass_product_id ||
      '',
    glassName:
      row.glass_name || '',
    note:
      row.note || '',
    specialComment:
      row.special_comment ||
      '',
    photoDataUrl:
      row.photo_data_url ||
      '',
    sortOrder:
      Number(row.sort_order) ||
      0,
    createdBy:
      row.created_by || '',
    createdByName:
      row.created_by_name || '',
    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,
  }
}

function emptyCocktail():
  Cocktail {
  return {
    id: '',
    name: '',
    ingredients: [
      {
        amountMl: 0,
        productId: '',
        productName: '',
      },
    ],
    garnish: '',
    method: 'Shaker',
    otherMethod: '',
    glassProductId: '',
    glassName: '',
    note: '',
    specialComment: '',
    photoDataUrl: '',
    sortOrder: 100,
    createdBy: '',
    createdByName: '',
  }
}

async function imageToDataUrl(
  file: File
) {
  const bitmap =
    await createImageBitmap(file)

  const maxSize = 1400
  const scale = Math.min(
    1,
    maxSize /
      Math.max(
        bitmap.width,
        bitmap.height
      )
  )

  const width =
    Math.max(
      1,
      Math.round(
        bitmap.width * scale
      )
    )
  const height =
    Math.max(
      1,
      Math.round(
        bitmap.height * scale
      )
    )

  const canvas =
    document.createElement(
      'canvas'
    )
  canvas.width = width
  canvas.height = height

  const ctx =
    canvas.getContext('2d')

  if (!ctx) {
    throw new Error(
      'Impossible de traiter la photo.'
    )
  }

  ctx.drawImage(
    bitmap,
    0,
    0,
    width,
    height
  )

  return canvas.toDataURL(
    'image/jpeg',
    0.82
  )
}

export default function CocktailsGuyPage() {
  const { items: products } =
    useProducts()

  const [
    cocktails,
    setCocktails,
  ] =
    useState<Cocktail[]>([])

  const [
    role,
    setRole,
  ] =
    useState<BarRole>(null)

  const [
    currentUserId,
    setCurrentUserId,
  ] =
    useState('')

  const [
    currentUserName,
    setCurrentUserName,
  ] =
    useState('')

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    saving,
    setSaving,
  ] =
    useState(false)

  const [
    deleting,
    setDeleting,
  ] =
    useState(false)

  const [
    editorOpen,
    setEditorOpen,
  ] =
    useState(false)

  const [
    detail,
    setDetail,
  ] =
    useState<Cocktail | null>(
      null
    )

  const [
    form,
    setForm,
  ] =
    useState<Cocktail>(
      emptyCocktail()
    )

  const [
    search,
    setSearch,
  ] =
    useState('')

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    message,
    setMessage,
  ] =
    useState('')

  const photoInput =
    useRef<HTMLInputElement>(
      null
    )

  const isManager =
    role === 'manager_admin' ||
    role ===
      'assistant_manager'

  const canCreate =
    role === 'manager_admin' ||
    role === 'assistant_manager' ||
    role === 'staff'

  const canEditCocktail = (
    cocktail: Cocktail
  ) =>
    isManager ||
    (
      Boolean(currentUserId) &&
      cocktail.createdBy ===
        currentUserId
    )

  const productOptions =
    useMemo(() => {
      return [...products]
        .filter(
          (product) =>
            Boolean(
              product?.name
            )
        )
        .sort((a, b) =>
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

  const glassOptions =
    useMemo(() => {
      return [...products]
        .filter(
          isGlasswareProduct
        )
        .sort((a, b) =>
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

  const loadRole =
    async () => {
      // Lecture locale de la session :
      // pas de requête Auth supplémentaire à chaque sauvegarde/rendu.
      const {
        data: { session },
      } =
        await supabase.auth.getSession()

      const raw =
        String(
          session?.user
            ?.app_metadata
            ?.bar_role || ''
        )

      setCurrentUserId(
        session?.user?.id || ''
      )

      setCurrentUserName(
        String(
          session?.user
            ?.app_metadata
            ?.employee_name ||
          session?.user
            ?.user_metadata
            ?.full_name ||
          session?.user
            ?.email ||
          ''
        )
      )

      setRole(
        raw ===
            'manager_admin' ||
          raw ===
            'assistant_manager' ||
          raw === 'staff'
          ? raw
          : null
      )
    }

  const loadCocktails =
    async () => {
      setLoading(true)

      const {
        data,
        error: loadError,
      } =
        await supabase
          .from(
            'bar_cocktails_guy'
          )
          .select('*')
          .order(
            'sort_order',
            {
              ascending: true,
            }
          )
          .order(
            'name',
            {
              ascending: true,
            }
          )

      if (loadError) {
        setError(
          loadError.message
        )
        setLoading(false)
        return
      }

      setCocktails(
        (data || []).map(
          mapRow
        )
      )
      setLoading(false)
    }

  useEffect(() => {
    void loadRole()
    void loadCocktails()

    const channel =
      supabase
        .channel(
          'cocktails-guy-live'
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table:
              'bar_cocktails_guy',
          },
          () => {
            void loadCocktails()
          }
        )
        .subscribe()

    return () => {
      void supabase.removeChannel(
        channel
      )
    }
  }, [])

  const visibleCocktails =
    useMemo(() => {
      const q =
        normalizeText(search)

      if (!q) {
        return cocktails
      }

      return cocktails.filter(
        (cocktail) =>
          normalizeText(
            [
              cocktail.name,
              cocktail.garnish,
              cocktail.method,
              cocktail.glassName,
              cocktail.note,
              cocktail.specialComment,
              ...cocktail.ingredients.map(
                (ingredient) =>
                  ingredient.productName
              ),
            ].join(' ')
          ).includes(q)
      )
    }, [
      cocktails,
      search,
    ])

  const openCreate = () => {
    if (!canCreate) {
      return
    }

    const next =
      emptyCocktail()

    next.sortOrder =
      cocktails.length + 1

    setForm(next)
    setDetail(null)
    setEditorOpen(true)
    setError('')
    setMessage('')
  }

  const openEdit = (
    cocktail: Cocktail
  ) => {
    if (
      !canEditCocktail(
        cocktail
      )
    ) {
      return
    }

    setForm({
      ...cocktail,
      ingredients:
        cocktail.ingredients.map(
          (ingredient) => ({
            ...ingredient,
          })
        ),
    })
    setDetail(null)
    setEditorOpen(true)
    setError('')
    setMessage('')
  }

  const addIngredient =
    () => {
      setForm(
        (current) => ({
          ...current,
          ingredients: [
            ...current.ingredients,
            {
              amountMl: 0,
              productId: '',
              productName: '',
            },
          ],
        })
      )
    }

  const removeIngredient =
    (
      index: number
    ) => {
      setForm(
        (current) => {
          const next =
            current.ingredients.filter(
              (_, i) =>
                i !== index
            )

          return {
            ...current,
            ingredients:
              next.length > 0
                ? next
                : [
                    {
                      amountMl:
                        0,
                      productId:
                        '',
                      productName:
                        '',
                    },
                  ],
          }
        }
      )
    }

  const updateIngredient =
    (
      index: number,
      patch:
        Partial<Ingredient>
    ) => {
      setForm(
        (current) => ({
          ...current,
          ingredients:
            current.ingredients.map(
              (
                ingredient,
                i
              ) =>
                i === index
                  ? {
                      ...ingredient,
                      ...patch,
                    }
                  : ingredient
            ),
        })
      )
    }

  const chooseProduct =
    (
      index: number,
      productId: string
    ) => {
      const product =
        productOptions.find(
          (item) =>
            item.id ===
            productId
        )

      updateIngredient(
        index,
        {
          productId,
          productName:
            product?.name || '',
        }
      )
    }

  const chooseGlass =
    (
      productId: string
    ) => {
      const glass =
        glassOptions.find(
          (item) =>
            item.id ===
            productId
        )

      setForm(
        (current) => ({
          ...current,
          glassProductId:
            productId,
          glassName:
            glass?.name || '',
        })
      )
    }

  const onPhoto =
    async (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0]

      if (!file) {
        return
      }

      if (
        !file.type.startsWith(
          'image/'
        )
      ) {
        setError(
          'Le fichier doit être une image.'
        )
        return
      }

      try {
        setSaving(true)
        const dataUrl =
          await imageToDataUrl(
            file
          )

        setForm(
          (current) => ({
            ...current,
            photoDataUrl:
              dataUrl,
          })
        )
      } catch (photoError) {
        setError(
          photoError instanceof
            Error
            ? photoError.message
            : 'Erreur photo.'
        )
      } finally {
        setSaving(false)
        if (
          photoInput.current
        ) {
          photoInput.current.value =
            ''
        }
      }
    }

  const save =
    async () => {
      if (!canCreate) {
        return
      }

      if (
        form.id &&
        !canEditCocktail(form)
      ) {
        setError(
          'Tu ne peux modifier que les cocktails que tu as créés.'
        )
        return
      }

      const name =
        form.name.trim()

      if (!name) {
        setError(
          'Le nom du cocktail est obligatoire.'
        )
        return
      }

      const ingredients =
        form.ingredients.filter(
          (ingredient) =>
            ingredient.productId
        )

      if (
        ingredients.length === 0
      ) {
        setError(
          'Ajoute au moins un produit.'
        )
        return
      }

      setSaving(true)
      setError('')
      setMessage('')

      const payload = {
        name,
        ingredients,
        garnish:
          form.garnish.trim(),
        method:
          form.method,
        other_method:
          form.method ===
          'Autres'
            ? form.otherMethod.trim()
            : '',
        glass_product_id:
          form.glassProductId ||
          null,
        glass_name:
          form.glassName || '',
        note:
          form.note.trim(),
        special_comment:
          form.specialComment.trim(),
        photo_data_url:
          form.photoDataUrl ||
          '',
        sort_order:
          form.sortOrder,
        updated_at:
          new Date().toISOString(),
      }

      const createPayload = {
        ...payload,
        created_by:
          currentUserId,
        created_by_name:
          currentUserName,
      }

      const operation =
        form.id
          ? supabase
              .from(
                'bar_cocktails_guy'
              )
              .update(payload)
              .eq(
                'id',
                form.id
              )
          : supabase
              .from(
                'bar_cocktails_guy'
              )
              .insert(
                createPayload
              )

      const {
        error: saveError,
      } =
        await operation

      if (saveError) {
        setError(
          saveError.message
        )
        setSaving(false)
        return
      }

      setEditorOpen(false)
      setSaving(false)
      setMessage(
        form.id
          ? 'Cocktail modifié.'
          : 'Cocktail ajouté.'
      )
      await loadCocktails()
    }

  const removeCocktail =
    async (
      cocktail: Cocktail
    ) => {
      if (
        !canEditCocktail(
          cocktail
        )
      ) {
        return
      }

      if (
        !window.confirm(
          `Supprimer définitivement "${cocktail.name}" ?`
        )
      ) {
        return
      }

      setDeleting(true)

      const { error } =
        await supabase
          .from(
            'bar_cocktails_guy'
          )
          .delete()
          .eq(
            'id',
            cocktail.id
          )

      setDeleting(false)

      if (error) {
        setError(
          error.message
        )
        return
      }

      setDetail(null)
      setMessage(
        'Cocktail supprimé.'
      )
      await loadCocktails()
    }

  return (
    <Page
      title="Cocktails Guy"
      subtitle="Fiches techniques de référence · Bar Team"
      action={
        canCreate ? (
          <button
            type="button"
            className="primaryButton"
            onClick={
              openCreate
            }
          >
            + Ajouter un cocktail
          </button>
        ) : undefined
      }
    >
      <div className="pageWrap">
        <div className="toolbar">
          <div className="counter">
            <strong>
              {visibleCocktails.length}
            </strong>
            <span>
              fiche
              {visibleCocktails.length >
              1
                ? 's'
                : ''}
            </span>
          </div>

          <input
            type="search"
            placeholder="Rechercher cocktail, produit, verre..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
        </div>

        {role === 'staff' && (
          <div className="info">
            Tu peux créer tes propres cocktails. Tu peux modifier ou supprimer uniquement ceux que tu as créés. Les recettes officielles et celles des autres barmans sont en lecture seule.
          </div>
        )}

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

        {loading ? (
          <Card>
            <div className="empty">
              Chargement…
            </div>
          </Card>
        ) : (
          <div className="grid">
            {visibleCocktails.map(
              (cocktail) => (
                <button
                  type="button"
                  className="card"
                  key={
                    cocktail.id
                  }
                  onClick={() =>
                    setDetail(
                      cocktail
                    )
                  }
                >
                  <div className="photo">
                    {cocktail.photoDataUrl ? (
                      <img
                        src={
                          cocktail.photoDataUrl
                        }
                        alt={
                          cocktail.name
                        }
                      />
                    ) : (
                      <div className="placeholder">
                        <span>
                          ◉
                        </span>
                        <small>
                          Ajouter une photo
                        </small>
                      </div>
                    )}
                  </div>

                  <div className="cardBody">
                    <h2>
                      {cocktail.name}
                    </h2>

                    <div className="preview">
                      {cocktail.ingredients
                        .slice(0, 4)
                        .map(
                          (
                            ingredient,
                            index
                          ) => (
                            <span
                              key={
                                index
                              }
                            >
                              {ingredient.amountMl >
                              0
                                ? `${ingredient.amountMl} ml `
                                : ''}
                              {
                                ingredient.productName
                              }
                            </span>
                          )
                        )}
                    </div>

                    <div className="chips">
                      <span>
                        {cocktail.method ===
                        'Autres'
                          ? cocktail.otherMethod ||
                            'Autres'
                          : cocktail.method}
                      </span>

                      {cocktail.glassName && (
                        <span>
                          {
                            cocktail.glassName
                          }
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            )}
          </div>
        )}
      </div>

      {detail && (
        <div className="overlay">
          <div className="detail">
            <div className="head">
              <div>
                <span>
                  FICHE TECHNIQUE
                </span>
                <h2>
                  {detail.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDetail(null)
                }
              >
                ×
              </button>
            </div>

            {detail.photoDataUrl && (
              <div className="detailPhoto">
                <img
                  src={
                    detail.photoDataUrl
                  }
                  alt={
                    detail.name
                  }
                />
              </div>
            )}

            <div className="detailBody">
              {detail.createdByName && (
                <div className="ownerLine">
                  Créé par <strong>{detail.createdByName}</strong>
                </div>
              )}

              <section>
                <h3>
                  Ingrédients
                </h3>

                <div className="ingredients">
                  {detail.ingredients.map(
                    (
                      ingredient,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                      >
                        <strong>
                          {ingredient.amountMl >
                          0
                            ? `${ingredient.amountMl} ml`
                            : '—'}
                        </strong>

                        <span>
                          {
                            ingredient.productName
                          }
                        </span>
                      </div>
                    )
                  )}
                </div>
              </section>

              <div className="meta">
                <div>
                  <span>
                    Méthode
                  </span>
                  <strong>
                    {detail.method ===
                    'Autres'
                      ? detail.otherMethod ||
                        'Autres'
                      : detail.method}
                  </strong>
                </div>

                <div>
                  <span>
                    Verre
                  </span>
                  <strong>
                    {detail.glassName ||
                      '—'}
                  </strong>
                </div>

                <div>
                  <span>
                    Décoration
                  </span>
                  <strong>
                    {detail.garnish ||
                      '—'}
                  </strong>
                </div>
              </div>

              {detail.note && (
                <section className="textBlock">
                  <h3>
                    Note
                  </h3>
                  <p>
                    {detail.note}
                  </p>
                </section>
              )}

              {detail.specialComment && (
                <section className="textBlock special">
                  <h3>
                    Commentaire spécial
                  </h3>
                  <p>
                    {
                      detail.specialComment
                    }
                  </p>
                </section>
              )}
            </div>

            {canEditCocktail(
              detail
            ) && (
              <div className="actions">
                <button
                  type="button"
                  onClick={() =>
                    openEdit(
                      detail
                    )
                  }
                >
                  Modifier
                </button>

                <button
                  type="button"
                  className="danger"
                  disabled={
                    deleting
                  }
                  onClick={() =>
                    void removeCocktail(
                      detail
                    )
                  }
                >
                  {deleting
                    ? 'Suppression…'
                    : 'Supprimer'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {editorOpen &&
        canCreate && (
          <div className="overlay">
            <div className="editor">
              <div className="head">
                <div>
                  <span>
                    COCKTAILS GUY
                  </span>
                  <h2>
                    {form.id
                      ? 'Modifier le cocktail'
                      : 'Nouveau cocktail'}
                  </h2>
                </div>

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    setEditorOpen(
                      false
                    )
                  }
                >
                  ×
                </button>
              </div>

              <div className="editorBody">
                <label className="field">
                  <span>
                    Nom du cocktail *
                  </span>
                  <input
                    value={
                      form.name
                    }
                    onChange={(
                      event
                    ) =>
                      setForm(
                        (
                          current
                        ) => ({
                          ...current,
                          name:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </label>

                <div className="photoEditor">
                  <div className="photoPreview">
                    {form.photoDataUrl ? (
                      <img
                        src={
                          form.photoDataUrl
                        }
                        alt="Aperçu"
                      />
                    ) : (
                      <span>
                        Aucune photo
                      </span>
                    )}
                  </div>

                  <div>
                    <strong>
                      Photo
                    </strong>

                    <input
                      ref={
                        photoInput
                      }
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(
                        event
                      ) =>
                        void onPhoto(
                          event
                        )
                      }
                    />

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        photoInput.current?.click()
                      }
                    >
                      {form.photoDataUrl
                        ? 'Changer la photo'
                        : '+ Ajouter une photo'}
                    </button>

                    {form.photoDataUrl && (
                      <button
                        type="button"
                        className="linkDanger"
                        onClick={() =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,
                              photoDataUrl:
                                '',
                            })
                          )
                        }
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                </div>

                <div className="ingredientsEditor">
                  <div className="sectionTitle">
                    <strong>
                      Ingrédients
                    </strong>

                    <button
                      type="button"
                      onClick={
                        addIngredient
                      }
                    >
                      + Ajouter
                    </button>
                  </div>

                  {form.ingredients.map(
                    (
                      ingredient,
                      index
                    ) => (
                      <div
                        className="ingredientLine"
                        key={
                          index
                        }
                      >
                        <select
                          value={
                            ingredient.amountMl
                          }
                          onChange={(
                            event
                          ) =>
                            updateIngredient(
                              index,
                              {
                                amountMl:
                                  Number(
                                    event
                                      .target
                                      .value
                                  ),
                              }
                            )
                          }
                        >
                          {ML_VALUES.map(
                            (ml) => (
                              <option
                                key={
                                  ml
                                }
                                value={
                                  ml
                                }
                              >
                                {ml ===
                                0
                                  ? '— ml'
                                  : `${ml} ml`}
                              </option>
                            )
                          )}
                        </select>

                        <select
                          value={
                            ingredient.productId
                          }
                          onChange={(
                            event
                          ) =>
                            chooseProduct(
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

                          {productOptions.map(
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

                        <button
                          type="button"
                          title="Supprimer la ligne"
                          onClick={() =>
                            removeIngredient(
                              index
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}
                </div>

                <div className="twoCols">
                  <label className="field">
                    <span>
                      Méthode
                    </span>
                    <select
                      value={
                        form.method
                      }
                      onChange={(
                        event
                      ) =>
                        setForm(
                          (
                            current
                          ) => ({
                            ...current,
                            method:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    >
                      {METHODS.map(
                        (method) => (
                          <option
                            key={
                              method
                            }
                            value={
                              method
                            }
                          >
                            {
                              method
                            }
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  {form.method ===
                    'Autres' && (
                    <label className="field">
                      <span>
                        Préciser la méthode
                      </span>
                      <input
                        value={
                          form.otherMethod
                        }
                        onChange={(
                          event
                        ) =>
                          setForm(
                            (
                              current
                            ) => ({
                              ...current,
                              otherMethod:
                                event
                                  .target
                                  .value,
                            })
                          )
                        }
                      />
                    </label>
                  )}

                  <label className="field">
                    <span>
                      Verre
                    </span>
                    <select
                      value={
                        form.glassProductId
                      }
                      onChange={(
                        event
                      ) =>
                        chooseGlass(
                          event.target
                            .value
                        )
                      }
                    >
                      <option value="">
                        Choisir dans Matériel & Verrerie
                      </option>

                      {glassOptions.map(
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
                  </label>

                  <label className="field">
                    <span>
                      Décoration
                    </span>
                    <input
                      value={
                        form.garnish
                      }
                      onChange={(
                        event
                      ) =>
                        setForm(
                          (
                            current
                          ) => ({
                            ...current,
                            garnish:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                    />
                  </label>
                </div>

                <label className="field">
                  <span>
                    Note
                  </span>
                  <textarea
                    rows={3}
                    value={
                      form.note
                    }
                    onChange={(
                      event
                    ) =>
                      setForm(
                        (
                          current
                        ) => ({
                          ...current,
                          note:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </label>

                <label className="field">
                  <span>
                    Commentaire spécial
                  </span>
                  <textarea
                    rows={4}
                    value={
                      form.specialComment
                    }
                    onChange={(
                      event
                    ) =>
                      setForm(
                        (
                          current
                        ) => ({
                          ...current,
                          specialComment:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </label>
              </div>

              <div className="editorFooter">
                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    setEditorOpen(
                      false
                    )
                  }
                >
                  Annuler
                </button>

                <button
                  type="button"
                  className="primaryButton"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    void save()
                  }
                >
                  {saving
                    ? 'Enregistrement…'
                    : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}

      <style jsx>{`
        .pageWrap {
          display:grid;
          gap:14px;
        }

        .toolbar {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:12px;
          border:1px solid #e4e7ec;
          border-radius:14px;
          background:#fff;
        }

        .toolbar input {
          width:min(380px,100%);
          min-height:40px;
          border:1px solid #d0d5dd;
          border-radius:10px;
          padding:0 12px;
        }

        .counter {
          display:flex;
          align-items:baseline;
          gap:6px;
        }

        .counter strong {
          font-size:22px;
        }

        .counter span {
          color:#667085;
          font-size:11px;
          font-weight:800;
        }

        .primaryButton {
          min-height:40px;
          padding:0 14px;
          border:1px solid #101828;
          border-radius:10px;
          background:#101828;
          color:#fff;
          font-weight:900;
          cursor:pointer;
        }

        .info,
        .notice {
          padding:10px 12px;
          border-radius:10px;
          font-size:11px;
          font-weight:750;
        }

        .info {
          border:1px solid #d0d5dd;
          background:#f8fafc;
          color:#475467;
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

        .empty {
          padding:28px;
          text-align:center;
          color:#667085;
        }

        .grid {
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:12px;
        }

        .card {
          overflow:hidden;
          padding:0;
          border:1px solid #e4e7ec;
          border-radius:15px;
          background:#fff;
          color:#101828;
          text-align:left;
          cursor:pointer;
          box-shadow:0 4px 14px rgba(16,24,40,.05);
        }

        .photo {
          height:190px;
          overflow:hidden;
          display:grid;
          place-items:center;
          background:#f2f4f7;
        }

        .photo img,
        .detailPhoto img,
        .photoPreview img {
          width:100%;
          height:100%;
          object-fit:cover;
        }

        .placeholder {
          display:grid;
          place-items:center;
          gap:6px;
          color:#98a2b3;
        }

        .placeholder span {
          font-size:30px;
        }

        .cardBody {
          padding:13px;
          display:grid;
          gap:9px;
        }

        .cardBody h2 {
          margin:0;
          font-size:16px;
        }

        .preview {
          min-height:54px;
          display:grid;
          gap:3px;
        }

        .preview span {
          color:#475467;
          font-size:10px;
        }

        .chips {
          display:flex;
          gap:5px;
          flex-wrap:wrap;
        }

        .chips span {
          padding:4px 7px;
          border-radius:999px;
          background:#f2f4f7;
          color:#475467;
          font-size:9px;
          font-weight:850;
        }

        .overlay {
          position:fixed;
          inset:0;
          z-index:1000;
          overflow:auto;
          padding:22px;
          display:grid;
          place-items:center;
          background:rgba(16,24,40,.55);
          backdrop-filter:blur(4px);
        }

        .detail,
        .editor {
          width:min(780px,100%);
          max-height:calc(100vh - 44px);
          overflow:auto;
          border-radius:18px;
          background:#fff;
          box-shadow:0 30px 80px rgba(16,24,40,.25);
        }

        .editor {
          width:min(900px,100%);
        }

        .head {
          position:sticky;
          top:0;
          z-index:3;
          padding:14px 16px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          border-bottom:1px solid #eaecf0;
          background:rgba(255,255,255,.96);
          backdrop-filter:blur(10px);
        }

        .head > div {
          display:grid;
          gap:3px;
        }

        .head span {
          color:#667085;
          font-size:9px;
          font-weight:900;
          letter-spacing:.08em;
        }

        .head h2 {
          margin:0;
          font-size:21px;
        }

        .head > button {
          width:36px;
          height:36px;
          border:1px solid #d0d5dd;
          border-radius:10px;
          background:#fff;
          cursor:pointer;
          font-size:20px;
        }

        .detailPhoto {
          height:320px;
          overflow:hidden;
          background:#f2f4f7;
        }

        .detailBody,
        .editorBody {
          padding:16px;
          display:grid;
          gap:16px;
        }

        .detailBody h3 {
          margin:0 0 8px;
          font-size:12px;
        }

        .ingredients {
          overflow:hidden;
          border:1px solid #eaecf0;
          border-radius:12px;
        }

        .ingredients > div {
          display:grid;
          grid-template-columns:105px 1fr;
          gap:10px;
          padding:9px 11px;
          border-bottom:1px solid #eaecf0;
        }

        .ingredients > div:last-child {
          border-bottom:0;
        }

        .ingredients strong,
        .ingredients span {
          font-size:11px;
        }

        .meta {
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:8px;
        }

        .meta > div {
          padding:10px;
          display:grid;
          gap:4px;
          border:1px solid #eaecf0;
          border-radius:10px;
          background:#f9fafb;
        }

        .meta span {
          color:#667085;
          font-size:9px;
          font-weight:850;
        }

        .meta strong {
          font-size:11px;
        }

        .ownerLine {
          padding:8px 10px;
          border:1px solid #eaecf0;
          border-radius:9px;
          background:#f9fafb;
          color:#667085;
          font-size:10px;
        }

        .textBlock {
          padding:12px;
          border-radius:10px;
          background:#f9fafb;
        }

        .textBlock.special {
          border:1px solid #fdb022;
          background:#fffaeb;
        }

        .textBlock p {
          margin:0;
          color:#344054;
          font-size:11px;
          line-height:1.5;
          white-space:pre-wrap;
        }

        .actions,
        .editorFooter {
          position:sticky;
          bottom:0;
          padding:12px 16px;
          display:flex;
          justify-content:flex-end;
          gap:8px;
          border-top:1px solid #eaecf0;
          background:#fff;
        }

        .actions button,
        .editorFooter button,
        .photoEditor button,
        .sectionTitle button {
          min-height:36px;
          padding:0 12px;
          border:1px solid #d0d5dd;
          border-radius:9px;
          background:#fff;
          color:#344054;
          font-weight:850;
          cursor:pointer;
        }

        .actions .danger,
        .linkDanger {
          color:#b42318 !important;
        }

        .field {
          display:grid;
          gap:6px;
        }

        .field > span {
          color:#475467;
          font-size:10px;
          font-weight:850;
        }

        .field input,
        .field select,
        .field textarea {
          width:100%;
          min-height:40px;
          border:1px solid #d0d5dd;
          border-radius:9px;
          padding:8px 10px;
          background:#fff;
          color:#101828;
          font:inherit;
        }

        .photoEditor {
          display:grid;
          grid-template-columns:170px 1fr;
          gap:12px;
          align-items:center;
          padding:12px;
          border:1px solid #e4e7ec;
          border-radius:12px;
        }

        .photoPreview {
          height:120px;
          overflow:hidden;
          display:grid;
          place-items:center;
          border-radius:9px;
          background:#f2f4f7;
          color:#98a2b3;
          font-size:10px;
        }

        .photoEditor > div:last-child {
          display:flex;
          align-items:center;
          gap:8px;
          flex-wrap:wrap;
        }

        .photoEditor strong {
          width:100%;
        }

        .ingredientsEditor {
          display:grid;
          gap:8px;
        }

        .sectionTitle {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
        }

        .ingredientLine {
          display:grid;
          grid-template-columns:105px minmax(0,1fr) 38px;
          gap:7px;
        }

        .ingredientLine select {
          min-width:0;
          min-height:40px;
          border:1px solid #d0d5dd;
          border-radius:9px;
          padding:0 9px;
          background:#fff;
        }

        .ingredientLine > button {
          border:1px solid #fda29b;
          border-radius:9px;
          background:#fff;
          color:#b42318;
          font-size:18px;
          cursor:pointer;
        }

        .twoCols {
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px;
        }

        @media (max-width:900px) {
          .grid {
            grid-template-columns:repeat(2,minmax(0,1fr));
          }
        }

        @media (max-width:640px) {
          .toolbar {
            align-items:stretch;
            flex-direction:column;
          }

          .toolbar input {
            width:100%;
          }

          .grid {
            grid-template-columns:1fr;
          }

          .photo {
            height:220px;
          }

          .overlay {
            padding:8px;
            align-items:start;
          }

          .detail,
          .editor {
            max-height:calc(100vh - 16px);
            border-radius:14px;
          }

          .detailPhoto {
            height:240px;
          }

          .meta,
          .twoCols {
            grid-template-columns:1fr;
          }

          .photoEditor {
            grid-template-columns:1fr;
          }

          .ingredientLine {
            grid-template-columns:92px minmax(0,1fr) 36px;
          }

          .actions,
          .editorFooter {
            padding:10px;
          }
        }
      `}</style>
    </Page>
  )
}