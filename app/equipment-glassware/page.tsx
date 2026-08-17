'use client'

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
import { Page, Card, Badge } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import {
  ColumnVisibility,
  useColumnVisibility,
} from '@/components/column-visibility'

type Family = 'Matériel' | 'Verrerie'

type EquipmentItem = {
  id: string
  designation: string
  family: Family
  category: string
  photo_url?: string | null
  supplier_ref?: string | null
  supplier?: string | null
  quantity: number
  condition?: string | null
  unit_value_ht: number
  location?: string | null
  notes?: string | null
  sort_order: number
  active: boolean
}

type FormState = {
  designation: string
  family: Family
  category: string
  photo_url: string
  supplier_ref: string
  supplier: string
  quantity: string
  condition: string
  unit_value_ht: string
  location: string
  notes: string
}

const SCREEN_COLUMNS = [
  { key: 'photo', label: 'Photo' },
  { key: 'designation', label: 'Désignation' },
  { key: 'family', label: 'Famille' },
  { key: 'category', label: 'Catégorie' },
  { key: 'supplierRef', label: 'Réf. fournisseur' },
  { key: 'supplier', label: 'Fournisseur' },
  { key: 'quantity', label: 'Quantité' },
  { key: 'condition', label: 'État' },
  { key: 'unitValue', label: 'Valeur HT' },
  { key: 'totalValue', label: 'Total HT' },
  { key: 'location', label: 'Lieu' },
  { key: 'actions', label: 'Actions' },
]

const ESSENTIAL = [
  'designation',
  'family',
  'category',
  'quantity',
  'condition',
  'unitValue',
  'totalValue',
  'actions',
]

const EMPTY_FORM: FormState = {
  designation: '',
  family: 'Matériel',
  category: 'ACCESSOIRES',
  photo_url: '',
  supplier_ref: '',
  supplier: '',
  quantity: '0',
  condition: 'BON',
  unit_value_ht: '0',
  location: '',
  notes: '',
}

const DEFAULT_CATEGORIES = [
  'ACCESSOIRES',
  'ELECTRONIQUE',
  'VIN/ CHAMP',
  'CONSOMMABLE',
  'VERRERIE',
  'MOBILIER',
  'DIVERS',
]

const CONDITIONS = [
  'BON',
  'MOYEN',
  'HS',
  'À RÉPARER',
  'À REMPLACER',
]

function money(value: number) {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} XPF`
}

function toneForCondition(condition?: string | null) {
  const value = String(condition || '').toUpperCase()

  if (value === 'BON') return 'good'
  if (value === 'MOYEN') return 'warn'
  if (value === 'HS' || value.includes('REMPLACER')) return 'danger'
  return 'info'
}

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function EquipmentGlasswarePage() {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [familyFilter, setFamilyFilter] =
    useState<'Tous' | Family>('Tous')
  const [categoryFilter, setCategoryFilter] = useState('Toutes')
  const [conditionFilter, setConditionFilter] = useState('Tous')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const display = useColumnVisibility(
    'equipment-glassware',
    ESSENTIAL
  )

  const reload = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('equipment_glassware_items')
      .select(
        'id,designation,family,category,photo_url,supplier_ref,supplier,quantity,condition,unit_value_ht,location,notes,sort_order,active'
      )
      .eq('active', true)
      .order('family')
      .order('category')
      .order('designation')

    if (error) {
      setMessage(`Erreur Supabase : ${error.message}`)
      setLoading(false)
      return
    }

    setItems(
      (data || []).map((item: any) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        unit_value_ht: Number(item.unit_value_ht || 0),
        sort_order: Number(item.sort_order || 0),
      })) as EquipmentItem[]
    )

    setLoading(false)
  }

  useEffect(() => {
    void reload()
  }, [])

  const categories = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_CATEGORIES,
          ...items.map((item) => item.category).filter(Boolean),
        ])
      ).sort((a, b) =>
        a.localeCompare(b, 'fr', {
          numeric: true,
          sensitivity: 'base',
        })
      ),
    [items]
  )

  const suppliers = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.supplier)
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b, 'fr')),
    [items]
  )

  const locations = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => item.location)
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b, 'fr')),
    [items]
  )

  const filtered = useMemo(() => {
    const q = normalize(search)

    return items.filter((item) => {
      if (familyFilter !== 'Tous' && item.family !== familyFilter) {
        return false
      }

      if (
        categoryFilter !== 'Toutes' &&
        item.category !== categoryFilter
      ) {
        return false
      }

      if (
        conditionFilter !== 'Tous' &&
        String(item.condition || '') !== conditionFilter
      ) {
        return false
      }

      if (!q) return true

      return [
        item.designation,
        item.family,
        item.category,
        item.supplier_ref,
        item.supplier,
        item.condition,
        item.location,
      ].some((value) => normalize(value).includes(q))
    })
  }, [
    items,
    search,
    familyFilter,
    categoryFilter,
    conditionFilter,
  ])

  const stats = useMemo(() => {
    const quantity = filtered.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    )
    const totalValue = filtered.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity || 0) *
          Number(item.unit_value_ht || 0),
      0
    )
    const hs = filtered.filter(
      (item) => normalize(item.condition) === 'hs'
    ).length

    return {
      references: filtered.length,
      quantity,
      totalValue,
      hs,
    }
  }, [filtered])

  const openCreate = () => {
    setEditingId('')
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (item: EquipmentItem) => {
    setEditingId(item.id)
    setForm({
      designation: item.designation || '',
      family: item.family || 'Matériel',
      category: item.category || 'DIVERS',
      photo_url: item.photo_url || '',
      supplier_ref: item.supplier_ref || '',
      supplier: item.supplier || '',
      quantity: String(item.quantity ?? 0),
      condition: item.condition || '',
      unit_value_ht: String(item.unit_value_ht ?? 0),
      location: item.location || '',
      notes: item.notes || '',
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.designation.trim()) {
      setMessage('La désignation est obligatoire.')
      return
    }

    setSaving(true)

    const payload = {
      designation: form.designation.trim(),
      family: form.family,
      category: form.category.trim() || 'DIVERS',
      photo_url: form.photo_url.trim() || null,
      supplier_ref: form.supplier_ref.trim() || null,
      supplier: form.supplier.trim() || null,
      quantity: Math.max(0, Number(form.quantity) || 0),
      condition: form.condition.trim() || null,
      unit_value_ht: Math.max(
        0,
        Number(form.unit_value_ht) || 0
      ),
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const result = editingId
      ? await supabase
          .from('equipment_glassware_items')
          .update(payload)
          .eq('id', editingId)
      : await supabase
          .from('equipment_glassware_items')
          .insert(payload)

    setSaving(false)

    if (result.error) {
      setMessage(`Erreur : ${result.error.message}`)
      return
    }

    setModalOpen(false)
    setMessage(
      editingId
        ? 'Élément modifié.'
        : 'Élément ajouté.'
    )
    await reload()
  }

  const remove = async (item: EquipmentItem) => {
    if (
      !window.confirm(
        `Supprimer "${item.designation}" de Matériel & Verrerie ?`
      )
    ) {
      return
    }

    const { error } = await supabase
      .from('equipment_glassware_items')
      .delete()
      .eq('id', item.id)

    if (error) {
      setMessage(`Erreur : ${error.message}`)
      return
    }

    await reload()
  }

  return (
    <Page
      title="Matériel & Verrerie"
      subtitle="Gestion du matériel, équipements, accessoires et verrerie dans le même esprit que le mercuriel boissons."
    >
      {message && (
        <div className="egNotice">
          {message}
        </div>
      )}

      <div className="egToolbar">
        <div className="egToolbarLeft">
          <input
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher matériel, verrerie, fournisseur..."
          />

          <select
            className="input"
            value={familyFilter}
            onChange={(event) =>
              setFamilyFilter(
                event.target.value as 'Tous' | Family
              )
            }
          >
            <option value="Tous">Toutes les familles</option>
            <option value="Matériel">Matériel</option>
            <option value="Verrerie">Verrerie</option>
          </select>

          <select
            className="input"
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
          >
            <option value="Toutes">Toutes les catégories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={conditionFilter}
            onChange={(event) =>
              setConditionFilter(event.target.value)
            }
          >
            <option value="Tous">Tous les états</option>
            {CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </div>

        <div className="egToolbarRight">
          <ColumnVisibility
            columns={SCREEN_COLUMNS}
            visible={display.visible}
            onChange={display.setVisible}
            essential={ESSENTIAL}
            label="Affichage"
          />

          <button
            type="button"
            className="button"
            onClick={openCreate}
          >
            + Ajouter
          </button>
        </div>
      </div>

      <div className="egStats">
        <Card>
          <span>Références</span>
          <strong>{stats.references}</strong>
        </Card>
        <Card>
          <span>Quantité totale</span>
          <strong>
            {stats.quantity.toLocaleString('fr-FR')}
          </strong>
        </Card>
        <Card>
          <span>Valeur totale HT</span>
          <strong>{money(stats.totalValue)}</strong>
        </Card>
        <Card>
          <span>Éléments HS</span>
          <strong>{stats.hs}</strong>
        </Card>
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: 20 }}>
            Chargement…
          </div>
        ) : (
          <div className="tableWrap">
            <table className="egTable">
              <thead>
                <tr>
                  {display.isVisible('photo') && <th>Photo</th>}
                  {display.isVisible('designation') && (
                    <th>Désignation</th>
                  )}
                  {display.isVisible('family') && <th>Famille</th>}
                  {display.isVisible('category') && (
                    <th>Catégorie</th>
                  )}
                  {display.isVisible('supplierRef') && (
                    <th>Réf. fournisseur</th>
                  )}
                  {display.isVisible('supplier') && (
                    <th>Fournisseur</th>
                  )}
                  {display.isVisible('quantity') && (
                    <th>Quantité</th>
                  )}
                  {display.isVisible('condition') && <th>État</th>}
                  {display.isVisible('unitValue') && (
                    <th>Valeur HT</th>
                  )}
                  {display.isVisible('totalValue') && (
                    <th>Total HT</th>
                  )}
                  {display.isVisible('location') && <th>Lieu</th>}
                  {display.isVisible('actions') && (
                    <th>Actions</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filtered.map((item) => {
                  const total =
                    Number(item.quantity || 0) *
                    Number(item.unit_value_ht || 0)

                  return (
                    <tr key={item.id}>
                      {display.isVisible('photo') && (
                        <td>
                          {item.photo_url ? (
                            <img
                              src={item.photo_url}
                              alt={item.designation}
                              className="egPhoto"
                            />
                          ) : (
                            <div className="egPhotoPlaceholder">
                              PHOTO
                            </div>
                          )}
                        </td>
                      )}

                      {display.isVisible('designation') && (
                        <td>
                          <strong>{item.designation}</strong>
                        </td>
                      )}

                      {display.isVisible('family') && (
                        <td>
                          <Badge
                            tone={
                              item.family === 'Verrerie'
                                ? 'info'
                                : 'good'
                            }
                          >
                            {item.family}
                          </Badge>
                        </td>
                      )}

                      {display.isVisible('category') && (
                        <td>{item.category}</td>
                      )}

                      {display.isVisible('supplierRef') && (
                        <td>{item.supplier_ref || '—'}</td>
                      )}

                      {display.isVisible('supplier') && (
                        <td>{item.supplier || '—'}</td>
                      )}

                      {display.isVisible('quantity') && (
                        <td>
                          <strong>
                            {Number(
                              item.quantity || 0
                            ).toLocaleString('fr-FR')}
                          </strong>
                        </td>
                      )}

                      {display.isVisible('condition') && (
                        <td>
                          {item.condition ? (
                            <Badge
                              tone={toneForCondition(
                                item.condition
                              )}
                            >
                              {item.condition}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}

                      {display.isVisible('unitValue') && (
                        <td>{money(item.unit_value_ht)}</td>
                      )}

                      {display.isVisible('totalValue') && (
                        <td>
                          <strong>{money(total)}</strong>
                        </td>
                      )}

                      {display.isVisible('location') && (
                        <td>{item.location || '—'}</td>
                      )}

                      {display.isVisible('actions') && (
                        <td>
                          <div className="egActions">
                            <button
                              type="button"
                              className="button secondary"
                              onClick={() => openEdit(item)}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="button secondary egDelete"
                              onClick={() => remove(item)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      style={{
                        padding: 28,
                        textAlign: 'center',
                        color: '#667085',
                      }}
                    >
                      Aucun élément correspondant aux filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalOpen && (
        <div className="modalBackdrop">
          <div className="modal egModal">
            <div className="egModalHeader">
              <div>
                <span>
                  MATÉRIEL & VERRERIE
                </span>
                <h2>
                  {editingId
                    ? 'Modifier un élément'
                    : 'Ajouter un élément'}
                </h2>
              </div>

              <button
                type="button"
                className="egClose"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="formGrid egForm">
              <label>
                <span>Désignation *</span>
                <input
                  className="input"
                  value={form.designation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      designation: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Famille</span>
                <select
                  className="input"
                  value={form.family}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      family:
                        event.target.value as Family,
                    }))
                  }
                >
                  <option value="Matériel">Matériel</option>
                  <option value="Verrerie">Verrerie</option>
                </select>
              </label>

              <label>
                <span>Catégorie</span>
                <input
                  className="input"
                  list="eg-categories"
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                />
                <datalist id="eg-categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </label>

              <label>
                <span>État</span>
                <select
                  className="input"
                  value={form.condition}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      condition: event.target.value,
                    }))
                  }
                >
                  <option value="">Non renseigné</option>
                  {CONDITIONS.map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Référence fournisseur</span>
                <input
                  className="input"
                  value={form.supplier_ref}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      supplier_ref: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Fournisseur</span>
                <input
                  className="input"
                  list="eg-suppliers"
                  value={form.supplier}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      supplier: event.target.value,
                    }))
                  }
                />
                <datalist id="eg-suppliers">
                  {suppliers.map((supplier) => (
                    <option key={supplier} value={supplier} />
                  ))}
                </datalist>
              </label>

              <label>
                <span>Quantité</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={form.quantity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      quantity: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Valeur unitaire HT</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={form.unit_value_ht}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      unit_value_ht: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Lieu</span>
                <input
                  className="input"
                  list="eg-locations"
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                />
                <datalist id="eg-locations">
                  {locations.map((location) => (
                    <option key={location} value={location} />
                  ))}
                </datalist>
              </label>

              <label>
                <span>Photo URL</span>
                <input
                  className="input"
                  value={form.photo_url}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      photo_url: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </label>

              <label className="egFullWidth">
                <span>Notes</span>
                <textarea
                  className="input"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                />
              </label>
            </div>

            <div className="egCalculated">
              Total HT calculé :
              <strong>
                {money(
                  (Number(form.quantity) || 0) *
                    (Number(form.unit_value_ht) || 0)
                )}
              </strong>
            </div>

            <div className="egModalActions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModalOpen(false)}
              >
                Annuler
              </button>

              <button
                type="button"
                className="button"
                disabled={saving}
                onClick={save}
              >
                {saving
                  ? 'Enregistrement…'
                  : editingId
                  ? 'Enregistrer'
                  : '+ Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .egNotice {
          margin-bottom: 14px;
          padding: 10px 12px;
          border: 1px solid #abefc6;
          border-radius: 10px;
          background: #ecfdf3;
          color: #067647;
          font-size: 12px;
          font-weight: 700;
        }

        .egToolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .egToolbarLeft,
        .egToolbarRight {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .egToolbarLeft > input {
          width: min(340px, 100%);
        }

        .egToolbarLeft > select {
          min-width: 150px;
        }

        .egStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .egStats .card {
          min-height: 92px;
        }

        .egStats span,
        .egStats strong {
          display: block;
        }

        .egStats span {
          color: #667085;
          font-size: 11px;
          font-weight: 700;
        }

        .egStats strong {
          margin-top: 8px;
          font-size: 22px;
        }

        .egTable th {
          white-space: nowrap;
        }

        .egTable td {
          vertical-align: middle;
        }

        .egPhoto,
        .egPhotoPlaceholder {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          border: 1px solid #e4e7ec;
        }

        .egPhoto {
          object-fit: contain;
          background: #fff;
        }

        .egPhotoPlaceholder {
          display: grid;
          place-items: center;
          color: #98a2b3;
          background: #f8fafc;
          font-size: 8px;
          font-weight: 800;
        }

        .egActions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .egDelete {
          color: #b42318 !important;
        }

        .egModal {
          width: min(920px, calc(100vw - 30px));
          max-height: calc(100dvh - 30px);
          overflow-y: auto;
        }

        .egModalHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .egModalHeader span {
          color: #667085;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .egModalHeader h2 {
          margin: 4px 0 0;
        }

        .egClose {
          width: 38px;
          height: 38px;
          border: 1px solid #e4e7ec;
          border-radius: 10px;
          background: #fff;
          cursor: pointer;
          font-size: 22px;
        }

        .egForm {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .egForm label {
          display: grid;
          gap: 6px;
        }

        .egForm label > span {
          font-size: 11px;
          font-weight: 800;
          color: #344054;
        }

        .egFullWidth {
          grid-column: 1 / -1;
        }

        .egForm textarea.input {
          min-height: 90px;
          padding-top: 10px;
          resize: vertical;
        }

        .egCalculated {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: 8px;
          background: #f8fafc;
          font-size: 12px;
        }

        .egModalActions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 16px;
        }

        @media (max-width: 1000px) {
          .egStats {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }
        }

        @media (max-width: 767px) {
          .egToolbar,
          .egToolbarLeft,
          .egToolbarRight {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .egToolbarLeft > input,
          .egToolbarLeft > select,
          .egToolbarRight > * {
            width: 100%;
          }

          .egStats {
            grid-template-columns: 1fr 1fr;
          }

          .egForm {
            grid-template-columns: 1fr;
          }

          .egFullWidth {
            grid-column: auto;
          }
        }
      `}</style>
    </Page>
  )
}