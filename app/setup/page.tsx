'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { Page, Card, Badge } from '@/components/ui'
import { useSetups } from '@/lib/store'
import { BarSetup, SetupItem } from '@/lib/types'

const setupLocations = [
  'Bungalow 0',
  'Bungalow 1',
  'Bungalow 2',
  'Bungalow 3',
  'Bungalow 4',
  'Bungalow 5',
  'Bungalow 6',
  'Bungalow 7',
  'Bungalow 8',
  'Bungalow 9',
  'Bungalow 10',
  'Bungalow 11',
  'Bungalow 12',
  'Bungalow 13',
  'Bungalow 14',
  'Bungalow 15',
  'Bungalow Infini',
  'Fare Intendant',
  'Fitness',
  'Lune Rouge',
  'Mirador',
  'Poker',
  'Restaurant',
  'Salon Bar',
  'Salle de Jeux',
  'Sporting',
  'Villa 16 - King',
  'Villa 16 - Queen',
  'Villa 16 - Salon',
  'Villa 17 - King',
  'Villa 17 - Queen',
  'Villa 17 - Salon',
].sort((a, b) =>
  a.localeCompare(b, 'fr', {
    numeric: true,
    sensitivity: 'base',
  })
)

const emptySetup: BarSetup = {
  id: '',
  location: 'Salon Bar',
  title: '',
  setupType: 'Bar permanent',
  description: '',
  notes: '',
  updatedAt: new Date().toISOString(),
  photos: [],
  items: [],
}

const emptyItem = (): SetupItem => ({
  id: crypto.randomUUID(),
  name: '',
  quantity: 1,
  category: 'Équipement',
})

export default function SetupPage() {
  const { items, save } = useSetups()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<BarSetup>(emptySetup)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('Tous')
  const [msg, setMsg] = useState('')

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()

    return [...items]
      .filter((setup) => {
        const matchesSearch =
          !q ||
          `${setup.location} ${setup.title} ${setup.setupType} ${setup.description}`
            .toLowerCase()
            .includes(q)

        const matchesLocation =
          locationFilter === 'Tous' ||
          setup.location === locationFilter

        return matchesSearch && matchesLocation
      })
      .sort((a, b) =>
        a.location.localeCompare(b.location, 'fr', {
          numeric: true,
          sensitivity: 'base',
        })
      )
  }, [items, search, locationFilter])

  const openNew = () => {
    setForm({
      ...emptySetup,
      id: '',
      location: 'Salon Bar',
      updatedAt: new Date().toISOString(),
      photos: [],
      items: [],
    })
    setMsg('')
    setOpen(true)
  }

  const openEdit = (setup: BarSetup) => {
    setForm(structuredClone(setup))
    setMsg('')
    setOpen(true)
  }

  const handlePhoto = (file?: File) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Sélectionne une image.')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      const image = new Image()

      image.onload = () => {
        const maxSize = 1200
        const ratio = Math.min(
          1,
          maxSize / Math.max(image.width, image.height)
        )

        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * ratio))
        canvas.height = Math.max(1, Math.round(image.height * ratio))

        const context = canvas.getContext('2d')

        if (!context) return

        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        )

        const dataUrl = canvas.toDataURL('image/jpeg', 0.75)

        setForm((current) => ({
          ...current,
          photos: [
            ...current.photos,
            {
              id: crypto.randomUUID(),
              dataUrl,
              caption: '',
            },
          ],
        }))
      }

      image.src = String(reader.result || '')
    }

    reader.readAsDataURL(file)
  }

  const removePhoto = (id: string) => {
    setForm({
      ...form,
      photos: form.photos.filter((photo) => photo.id !== id),
    })
  }

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, emptyItem()],
    })
  }

  const updateItem = (
    id: string,
    patch: Partial<SetupItem>
  ) => {
    setForm({
      ...form,
      items: form.items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
            }
          : item
      ),
    })
  }

  const removeItem = (id: string) => {
    setForm({
      ...form,
      items: form.items.filter((item) => item.id !== id),
    })
  }

  const submit = () => {
    if (!form.location) {
      alert('Choisis un lieu.')
      return
    }

    const setup: BarSetup = {
      ...form,
      id: form.id || crypto.randomUUID(),
      title:
        form.title.trim() ||
        `Set Up ${form.location}`,
      updatedAt: new Date().toISOString(),
      items: form.items.filter(
        (item) => item.name.trim() && item.quantity > 0
      ),
    }

    save(
      form.id
        ? items.map((item) =>
            item.id === form.id ? setup : item
          )
        : [...items, setup]
    )

    setOpen(false)
    setForm(emptySetup)
    setMsg('Set Up enregistré.')
  }

  const deleteSetup = (id: string) => {
    if (!confirm('Supprimer définitivement ce Set Up ?')) {
      return
    }

    save(items.filter((item) => item.id !== id))
    setMsg('Set Up supprimé.')
  }

  const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 7,
    color: '#dbe4f0',
  }

  const fieldStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <Page
      title="SET UP"
      subtitle="Photos et fiches techniques de tous les Set Up Bar par lieu"
      action={
        <button
          className="button"
          onClick={openNew}
        >
          + Nouveau Set Up
        </button>
      }
    >
      {msg && (
        <div className="notice goodNotice">
          {msg}
        </div>
      )}

      <div className="toolbar">
        <input
          className="input"
          placeholder="Rechercher un Set Up..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        <select
          className="select"
          value={locationFilter}
          onChange={(event) =>
            setLocationFilter(event.target.value)
          }
        >
          <option value="Tous">
            Tous les lieux
          </option>

          {setupLocations.map((location) => (
            <option
              key={location}
              value={location}
            >
              {location}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit,minmax(300px,1fr))',
          gap: 16,
        }}
      >
        {shown.map((setup) => (
          <Card key={setup.id}>
            <div
              style={{
                width: '100%',
                aspectRatio: '16 / 9',
                borderRadius: 14,
                overflow: 'hidden',
                background: '#f2f4f7',
                display: 'grid',
                placeItems: 'center',
                marginBottom: 14,
              }}
            >
              {setup.photos[0] ? (
                <img
                  src={setup.photos[0].dataUrl}
                  alt={setup.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    color: '#98a2b3',
                    fontSize: 13,
                  }}
                >
                  Aucune photo
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 18,
                  }}
                >
                  {setup.location}
                </div>

                <div
                  style={{
                    marginTop: 4,
                    color: '#667085',
                    fontSize: 13,
                  }}
                >
                  {setup.title}
                </div>
              </div>

              <Badge tone="info">
                {setup.photos.length} photo
                {setup.photos.length > 1 ? 's' : ''}
              </Badge>
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: '#667085',
                lineHeight: 1.5,
              }}
            >
              {setup.description ||
                'Aucune description.'}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginTop: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#98a2b3',
                  }}
                >
                  TYPE
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {setup.setupType || '—'}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#98a2b3',
                  }}
                >
                  ÉLÉMENTS
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {setup.items.length}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
              }}
            >
              <button
                className="button secondary small"
                onClick={() => openEdit(setup)}
              >
                Ouvrir / Modifier
              </button>

              <button
                className="button secondary small"
                onClick={() =>
                  deleteSetup(setup.id)
                }
              >
                Supprimer
              </button>
            </div>
          </Card>
        ))}

        {shown.length === 0 && (
          <Card>
            <div className="muted">
              Aucun Set Up enregistré.
            </div>
          </Card>
        )}
      </div>

      {open && (
        <div className="modalBackdrop">
          <div
            className="modal"
            style={{
              maxWidth: 1000,
            }}
          >
            <div className="modalHead">
              <h2>
                {form.id
                  ? 'Modifier le Set Up'
                  : 'Nouveau Set Up'}
              </h2>

              <button
                className="button secondary small"
                onClick={() => setOpen(false)}
              >
                Fermer
              </button>
            </div>

            <div className="formGrid">
              <div className="field">
                <label>Lieu *</label>

                <select
                  value={form.location}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      location: event.target.value,
                    })
                  }
                >
                  {setupLocations.map((location) => (
                    <option
                      key={location}
                      value={location}
                    >
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Nom du Set Up</label>

                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      title: event.target.value,
                    })
                  }
                  placeholder="Ex. Set Up Sunset"
                />
              </div>

              <div className="field">
                <label>Type de Set Up</label>

                <select
                  value={form.setupType}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      setupType: event.target.value,
                    })
                  }
                >
                  <option>Bar permanent</option>
                  <option>Bar événementiel</option>
                  <option>Bar mobile</option>
                  <option>Beach Bar</option>
                  <option>Pool Bar</option>
                  <option>Set Up ponctuel</option>
                  <option>Autre</option>
                </select>
              </div>

              <div className="field full">
                <label>Description</label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  placeholder="Organisation générale du Set Up, position du bar, sens de service..."
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 24,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <h3 style={{ margin: 0 }}>
                  Photos
                </h3>

                <label
                  className="button secondary small"
                  style={{
                    cursor: 'pointer',
                  }}
                >
                  + Ajouter une photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={(event) => {
                      handlePhoto(
                        event.target.files?.[0]
                      )
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit,minmax(170px,1fr))',
                  gap: 12,
                  marginTop: 12,
                }}
              >
                {form.photos.map((photo) => (
                  <div
                    key={photo.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      padding: 8,
                    }}
                  >
                    <img
                      src={photo.dataUrl}
                      alt=""
                      style={{
                        width: '100%',
                        aspectRatio: '4 / 3',
                        objectFit: 'cover',
                        borderRadius: 8,
                      }}
                    />

                    <button
                      className="button secondary small"
                      type="button"
                      style={{
                        marginTop: 8,
                        width: '100%',
                      }}
                      onClick={() =>
                        removePhoto(photo.id)
                      }
                    >
                      Supprimer
                    </button>
                  </div>
                ))}

                {form.photos.length === 0 && (
                  <div className="muted">
                    Aucune photo ajoutée.
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: 26,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <h3 style={{ margin: 0 }}>
                  Équipement / Verrerie / Mise en place
                </h3>

                <button
                  className="button secondary small"
                  type="button"
                  onClick={addItem}
                >
                  + Ajouter un élément
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  marginTop: 12,
                }}
              >
                {form.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        '170px minmax(220px,1fr) 110px 90px',
                      gap: 10,
                      alignItems: 'end',
                    }}
                  >
                    <div style={fieldStyle}>
                      <label style={labelStyle}>
                        Catégorie
                      </label>

                      <select
                        className="input"
                        value={item.category}
                        onChange={(event) =>
                          updateItem(item.id, {
                            category:
                              event.target
                                .value as SetupItem['category'],
                          })
                        }
                      >
                        <option>Équipement</option>
                        <option>Verrerie</option>
                        <option>Mise en place</option>
                        <option>Produit</option>
                      </select>
                    </div>

                    <div style={fieldStyle}>
                      <label style={labelStyle}>
                        Élément
                      </label>

                      <input
                        className="input"
                        value={item.name}
                        onChange={(event) =>
                          updateItem(item.id, {
                            name: event.target.value,
                          })
                        }
                        placeholder="Ex. Shaker Boston"
                      />
                    </div>

                    <div style={fieldStyle}>
                      <label style={labelStyle}>
                        Quantité
                      </label>

                      <input
                        className="input"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.id, {
                            quantity: Math.max(
                              1,
                              Number(
                                event.target.value
                              ) || 1
                            ),
                          })
                        }
                      />
                    </div>

                    <button
                      className="button secondary small"
                      type="button"
                      onClick={() =>
                        removeItem(item.id)
                      }
                    >
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: 26,
              }}
              className="field"
            >
              <label>Notes</label>

              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    notes: event.target.value,
                  })
                }
                placeholder="Consignes particulières, heure de mise en place, informations importantes..."
              />
            </div>

            <div className="actions">
              <button
                className="button secondary"
                onClick={() => setOpen(false)}
              >
                Annuler
              </button>

              <button
                className="button"
                onClick={submit}
              >
                Enregistrer le Set Up
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}