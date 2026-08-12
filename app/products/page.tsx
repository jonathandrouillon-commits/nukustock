'use client'

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Page,
  Card,
} from '@/components/ui'

import { resetDemoData, useMasterData } from '@/lib/store'
import { supabase } from '@/lib/supabase'

type Role =
  | 'admin'
  | 'department_manager'
  | 'requisitionnaire'

type Department = {
  id: string
  name: string
  active: boolean
}

type UserRow = {
  id: string
  email: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  job_title: string | null
  role: Role
  department_id: string | null
  active: boolean
  created_at: string
  last_sign_in_at: string | null
}

type UserForm = {
  id: string
  first_name: string
  last_name: string
  email: string
  password: string
  department_id: string
  job_title: string
  role: Role
  active: boolean
}

const emptyForm: UserForm = {
  id: '',
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  department_id: '',
  job_title: '',
  role: 'requisitionnaire',
  active: true,
}

const roleLabel:
  Record<
    Role,
    string
  > = {
  admin: 'Admin',
  department_manager:
    'Manager',
  requisitionnaire:
    'Réquisitionnaire',
}

export default function Settings() {
  const {
    items: masterData,
    save: saveMasterData,
    reload: reloadMasterData,
  } = useMasterData()

  const [
    categoryName,
    setCategoryName,
  ] = useState('')

  const [
    editingCategoryId,
    setEditingCategoryId,
  ] = useState('')

  const [
    selectedCategoryId,
    setSelectedCategoryId,
  ] = useState('')

  const [
    subcategoryName,
    setSubcategoryName,
  ] = useState('')

  const [
    editingSubcategoryId,
    setEditingSubcategoryId,
  ] = useState('')


  const [
    zoneName,
    setZoneName,
  ] = useState('')

  const [
    editingZoneId,
    setEditingZoneId,
  ] = useState('')

  const [
    users,
    setUsers,
  ] = useState<
    UserRow[]
  >([])

  const [
    departments,
    setDepartments,
  ] = useState<
    Department[]
  >([])

  const [
    form,
    setForm,
  ] = useState<UserForm>(
    emptyForm
  )

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    isAdmin,
    setIsAdmin,
  ] = useState(false)

  const normalizeReferenceName = (
    value: string
  ) =>
    value
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()

  const zones =
    useMemo(
      () =>
        masterData
          .filter(
            (item) =>
              item.type ===
              'zone'
          )
          .sort(
            (a, b) =>
              a.name.localeCompare(
                b.name,
                'fr'
              )
          ),
      [masterData]
    )

  const categories =
    useMemo(
      () =>
        masterData
          .filter(
            (item) =>
              item.type ===
              'category'
          )
          .sort(
            (a, b) =>
              a.name.localeCompare(
                b.name,
                'fr'
              )
          ),
      [masterData]
    )

  const subcategories =
    useMemo(
      () =>
        masterData
          .filter(
            (item) =>
              item.type ===
                'subcategory' &&
              (!selectedCategoryId ||
                item.parentId ===
                  selectedCategoryId)
          )
          .sort(
            (a, b) =>
              a.name.localeCompare(
                b.name,
                'fr'
              )
          ),
      [
        masterData,
        selectedCategoryId,
      ]
    )

  useEffect(() => {
    if (
      !selectedCategoryId &&
      categories.length
    ) {
      setSelectedCategoryId(
        categories[0].id
      )
    }
  }, [
    categories,
    selectedCategoryId,
  ])

  const saveCategory =
    () => {
      const name =
        categoryName
          .replace(/\s+/g, ' ')
          .trim()

      if (!name) {
        setError(
          'Le nom de la catégorie est obligatoire.'
        )
        return
      }

      const normalized =
        normalizeReferenceName(
          name
        )

      const duplicate =
        categories.find(
          (item) =>
            normalizeReferenceName(
              item.name
            ) === normalized &&
            item.id !==
              editingCategoryId
        )

      if (duplicate) {
        setError(
          `La catégorie "${duplicate.name}" existe déjà.`
        )
        return
      }

      setError('')
      setMessage('')

      if (editingCategoryId) {
        const oldCategory =
          categories.find(
            (item) =>
              item.id ===
              editingCategoryId
          )

        saveMasterData(
          masterData.map(
            (item) => {
              if (
                item.id ===
                editingCategoryId
              ) {
                return {
                  ...item,
                  name,
                }
              }

              return item
            }
          )
        )

        setMessage(
          oldCategory
            ? `Catégorie "${oldCategory.name}" renommée en "${name}".`
            : 'Catégorie modifiée.'
        )
      } else {
        saveMasterData([
          ...masterData,
          {
            id:
              crypto.randomUUID(),
            type:
              'category',
            name,
            active: true,
          },
        ])

        setMessage(
          `Catégorie "${name}" ajoutée.`
        )
      }

      setCategoryName('')
      setEditingCategoryId('')
    }

  const editCategory =
    (id: string) => {
      const category =
        categories.find(
          (item) =>
            item.id === id
        )

      if (!category) return

      setCategoryName(
        category.name
      )

      setEditingCategoryId(
        category.id
      )
    }

  const toggleCategory =
    (id: string) => {
      const category =
        categories.find(
          (item) =>
            item.id === id
        )

      if (!category) return

      const nextActive =
        category.active === false

      if (
        !window.confirm(
          nextActive
            ? `Réactiver la catégorie "${category.name}" ?`
            : `Désactiver la catégorie "${category.name}" ?`
        )
      ) {
        return
      }

      saveMasterData(
        masterData.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  active:
                    nextActive,
                }
              : item
        )
      )

      setMessage(
        nextActive
          ? `Catégorie "${category.name}" réactivée.`
          : `Catégorie "${category.name}" désactivée.`
      )
    }

  const deleteCategory =
    (id: string) => {
      const category =
        categories.find(
          (item) =>
            item.id === id
        )

      if (!category) return

      const linked =
        masterData.filter(
          (item) =>
            item.type ===
              'subcategory' &&
            item.parentId === id
        )

      if (
        !window.confirm(
          `Supprimer la catégorie "${category.name}" ?\n\n${linked.length} sous-catégorie(s) liée(s) seront également supprimée(s).`
        )
      ) {
        return
      }

      if (
        !window.confirm(
          `DERNIÈRE CONFIRMATION\n\nSupprimer définitivement "${category.name}" et ses sous-catégories ?`
        )
      ) {
        return
      }

      saveMasterData(
        masterData.filter(
          (item) =>
            item.id !== id &&
            item.parentId !== id
        )
      )

      if (
        selectedCategoryId === id
      ) {
        setSelectedCategoryId('')
      }

      setCategoryName('')
      setEditingCategoryId('')

      setMessage(
        `Catégorie "${category.name}" supprimée.`
      )
    }

  const saveSubcategory =
    () => {
      if (!selectedCategoryId) {
        setError(
          'Sélectionne une catégorie.'
        )
        return
      }

      const name =
        subcategoryName
          .replace(/\s+/g, ' ')
          .trim()

      if (!name) {
        setError(
          'Le nom de la sous-catégorie est obligatoire.'
        )
        return
      }

      const normalized =
        normalizeReferenceName(
          name
        )

      const duplicate =
        masterData.find(
          (item) =>
            item.type ===
              'subcategory' &&
            item.parentId ===
              selectedCategoryId &&
            normalizeReferenceName(
              item.name
            ) === normalized &&
            item.id !==
              editingSubcategoryId
        )

      if (duplicate) {
        setError(
          `La sous-catégorie "${duplicate.name}" existe déjà dans cette catégorie.`
        )
        return
      }

      setError('')
      setMessage('')

      if (
        editingSubcategoryId
      ) {
        saveMasterData(
          masterData.map(
            (item) =>
              item.id ===
                editingSubcategoryId
                ? {
                    ...item,
                    name,
                    parentId:
                      selectedCategoryId,
                  }
                : item
          )
        )

        setMessage(
          `Sous-catégorie modifiée : "${name}".`
        )
      } else {
        saveMasterData([
          ...masterData,
          {
            id:
              crypto.randomUUID(),
            type:
              'subcategory',
            name,
            parentId:
              selectedCategoryId,
            active: true,
          },
        ])

        setMessage(
          `Sous-catégorie "${name}" ajoutée.`
        )
      }

      setSubcategoryName('')
      setEditingSubcategoryId('')
    }

  const editSubcategory =
    (id: string) => {
      const item =
        masterData.find(
          (entry) =>
            entry.id === id &&
            entry.type ===
              'subcategory'
        )

      if (!item) return

      setSelectedCategoryId(
        item.parentId || ''
      )

      setSubcategoryName(
        item.name
      )

      setEditingSubcategoryId(
        item.id
      )
    }

  const toggleSubcategory =
    (id: string) => {
      const item =
        masterData.find(
          (entry) =>
            entry.id === id &&
            entry.type ===
              'subcategory'
        )

      if (!item) return

      const nextActive =
        item.active === false

      if (
        !window.confirm(
          nextActive
            ? `Réactiver la sous-catégorie "${item.name}" ?`
            : `Désactiver la sous-catégorie "${item.name}" ?`
        )
      ) {
        return
      }

      saveMasterData(
        masterData.map(
          (entry) =>
            entry.id === id
              ? {
                  ...entry,
                  active:
                    nextActive,
                }
              : entry
        )
      )

      setMessage(
        nextActive
          ? `Sous-catégorie "${item.name}" réactivée.`
          : `Sous-catégorie "${item.name}" désactivée.`
      )
    }

  const deleteSubcategory =
    (id: string) => {
      const item =
        masterData.find(
          (entry) =>
            entry.id === id &&
            entry.type ===
              'subcategory'
        )

      if (!item) return

      if (
        !window.confirm(
          `Supprimer définitivement la sous-catégorie "${item.name}" ?`
        )
      ) {
        return
      }

      saveMasterData(
        masterData.filter(
          (entry) =>
            entry.id !== id
        )
      )

      setSubcategoryName('')
      setEditingSubcategoryId('')

      setMessage(
        `Sous-catégorie "${item.name}" supprimée.`
      )
    }

  const saveZone =
    () => {
      const name =
        zoneName
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase()

      if (!name) {
        setError(
          'Le nom de la zone est obligatoire.'
        )
        return
      }

      const duplicate =
        zones.find(
          (item) =>
            normalizeReferenceName(
              item.name
            ) ===
              normalizeReferenceName(
                name
              ) &&
            item.id !==
              editingZoneId
        )

      if (duplicate) {
        setError(
          `La zone "${duplicate.name}" existe déjà.`
        )
        return
      }

      setError('')
      setMessage('')

      if (editingZoneId) {
        saveMasterData(
          masterData.map(
            (item) =>
              item.id ===
                editingZoneId
                ? {
                    ...item,
                    name,
                  }
                : item
          )
        )

        setMessage(
          `Zone "${name}" modifiée.`
        )
      } else {
        saveMasterData([
          ...masterData,
          {
            id:
              crypto.randomUUID(),
            type: 'zone',
            name,
            active: true,
          },
        ])

        setMessage(
          `Zone "${name}" ajoutée.`
        )
      }

      setZoneName('')
      setEditingZoneId('')
    }

  const editZone =
    (id: string) => {
      const zone =
        zones.find(
          (item) =>
            item.id === id
        )

      if (!zone) return

      setZoneName(
        zone.name
      )

      setEditingZoneId(
        zone.id
      )
    }

  const toggleZone =
    (id: string) => {
      const zone =
        zones.find(
          (item) =>
            item.id === id
        )

      if (!zone) return

      const nextActive =
        zone.active === false

      if (
        !window.confirm(
          nextActive
            ? `Réactiver la zone "${zone.name}" ?`
            : `Désactiver la zone "${zone.name}" ?`
        )
      ) {
        return
      }

      saveMasterData(
        masterData.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  active:
                    nextActive,
                }
              : item
        )
      )

      setMessage(
        nextActive
          ? `Zone "${zone.name}" réactivée.`
          : `Zone "${zone.name}" désactivée.`
      )
    }

  const deleteZone =
    (id: string) => {
      const zone =
        zones.find(
          (item) =>
            item.id === id
        )

      if (!zone) return

      if (
        !window.confirm(
          `Supprimer la zone "${zone.name}" ?`
        )
      ) {
        return
      }

      if (
        !window.confirm(
          `DERNIÈRE CONFIRMATION\n\nSupprimer définitivement la zone "${zone.name}" ?`
        )
      ) {
        return
      }

      saveMasterData(
        masterData.filter(
          (item) =>
            item.id !== id
        )
      )

      setZoneName('')
      setEditingZoneId('')

      setMessage(
        `Zone "${zone.name}" supprimée.`
      )
    }

  const departmentById =
    useMemo(
      () =>
        new Map(
          departments.map(
            (department) => [
              department.id,
              department.name,
            ]
          )
        ),
      [departments]
    )

  const getToken =
    async () => {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession()

      return (
        session?.access_token ||
        ''
      )
    }

  const adminFetch =
    async (
      input: string,
      init?:
        RequestInit
    ) => {
      const token =
        await getToken()

      return fetch(
        input,
        {
          ...init,
          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${token}`,
            ...(init?.headers ||
              {}),
          },
        }
      )
    }

  const loadUsers =
    async () => {
      setLoading(true)
      setError('')

      try {
        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser()

        if (!user) {
          setIsAdmin(false)
          setLoading(false)
          return
        }

        const {
          data: profile,
        } = await supabase
          .from('profiles')
          .select(
            'role, active'
          )
          .eq(
            'id',
            user.id
          )
          .maybeSingle()

        const admin =
          profile?.role ===
            'admin' &&
          profile?.active !==
            false

        setIsAdmin(
          admin
        )

        if (!admin) {
          setLoading(false)
          return
        }

        const response =
          await adminFetch(
            '/api/admin/users'
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Impossible de charger les utilisateurs.'
          )
        }

        setUsers(
          data.users || []
        )

        setDepartments(
          data.departments ||
            []
        )
      } catch (
        caughtError
      ) {
        setError(
          caughtError instanceof
          Error
            ? caughtError.message
            : 'Erreur'
        )
      } finally {
        setLoading(false)
      }
    }

  useEffect(() => {
    void loadUsers()
  }, [])

  const openCreate =
    () => {
      setForm({
        ...emptyForm,
      })
      setError('')
      setMessage('')
      setModalOpen(true)
    }

  const openEdit = (
    user: UserRow
  ) => {
    setForm({
      id: user.id,
      first_name:
        user.first_name ||
        '',
      last_name:
        user.last_name ||
        '',
      email:
        user.email ||
        '',
      password: '',
      department_id:
        user.department_id ||
        '',
      job_title:
        user.job_title ||
        '',
      role:
        user.role,
      active:
        user.active,
    })

    setError('')
    setMessage('')
    setModalOpen(true)
  }

  const setField =
    <K extends keyof UserForm>(
      key: K,
      value: UserForm[K]
    ) => {
      setForm(
        (current) => ({
          ...current,
          [key]: value,
        })
      )
    }

  const saveUser =
    async (
      event: FormEvent
    ) => {
      event.preventDefault()

      setSaving(true)
      setError('')
      setMessage('')

      try {
        const isEdit =
          Boolean(form.id)

        const response =
          await adminFetch(
            '/api/admin/users',
            {
              method:
                isEdit
                  ? 'PATCH'
                  : 'POST',
              body:
                JSON.stringify(
                  form
                ),
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Erreur lors de l’enregistrement.'
          )
        }

        setMessage(
          isEdit
            ? 'Utilisateur modifié.'
            : 'Utilisateur créé.'
        )

        setModalOpen(false)
        await loadUsers()
      } catch (
        caughtError
      ) {
        setError(
          caughtError instanceof
          Error
            ? caughtError.message
            : 'Erreur'
        )
      } finally {
        setSaving(false)
      }
    }

  const toggleActive =
    async (
      user: UserRow
    ) => {
      const nextActive =
        !user.active

      const confirmed =
        confirm(
          nextActive
            ? `Réactiver ${user.full_name || user.email} ?`
            : `Désactiver ${user.full_name || user.email} ?`
        )

      if (!confirmed) {
        return
      }

      setError('')
      setMessage('')

      const response =
        await adminFetch(
          '/api/admin/users',
          {
            method:
              'PATCH',
            body:
              JSON.stringify(
                {
                  id: user.id,
                  first_name:
                    user.first_name ||
                    '',
                  last_name:
                    user.last_name ||
                    '',
                  email:
                    user.email,
                  password:
                    '',
                  department_id:
                    user.department_id ||
                    '',
                  job_title:
                    user.job_title ||
                    '',
                  role:
                    user.role,
                  active:
                    nextActive,
                }
              ),
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        setError(
          data.error ||
            'Erreur.'
        )
        return
      }

      setMessage(
        nextActive
          ? 'Utilisateur réactivé.'
          : 'Utilisateur désactivé.'
      )

      await loadUsers()
    }

  const deleteUser =
    async (
      user: UserRow
    ) => {
      const confirmed =
        confirm(
          `Supprimer définitivement ${user.full_name || user.email} ? Cette action supprimera aussi son compte de connexion.`
        )

      if (!confirmed) {
        return
      }

      setError('')
      setMessage('')

      const response =
        await adminFetch(
          '/api/admin/users',
          {
            method:
              'DELETE',
            body:
              JSON.stringify({
                id: user.id,
              }),
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        setError(
          data.error ||
            'Erreur.'
        )
        return
      }

      setMessage(
        'Utilisateur supprimé.'
      )

      await loadUsers()
    }

  return (
    <Page
      title="Réglages"
      subtitle="Configuration de NukuStock"
    >
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
              '#fff0f0',
            border:
              '1px solid #fecaca',
            color:
              '#b42318',
          }}
        >
          {error}
        </div>
      )}

      <div className="grid two">
        <Card>
          <h2>
            Mode actuel
          </h2>

          <p className="muted">
            NukuStock utilise
            Supabase pour les
            comptes utilisateurs
            et les réquisitions,
            tandis que certaines
            données de la version
            de test restent encore
            locales au navigateur.
          </p>
        </Card>

        <Card>
          <h2>
            Remise à zéro
          </h2>

          <p className="muted">
            Supprime les données
            de test locales et
            recharge les données
            de démonstration
            initiales.
          </p>

          <button
            className="button dangerButton"
            onClick={() => {
              if (
                confirm(
                  'Remettre NukuStock à zéro ?'
                )
              ) {
                resetDemoData()
              }
            }}
          >
            Réinitialiser les données de test
          </button>
        </Card>
      </div>

      <div
        style={{
          height: 16,
        }}
      />

      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            gap: 12,
            flexWrap:
              'wrap',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
              }}
            >
              Zones produits
            </h2>

            <p
              className="muted"
              style={{
                margin:
                  '5px 0 0',
              }}
            >
              Référentiel central des zones produit. La référence ZON-xxx reste permanente même si le nom de la zone change.
            </p>
          </div>

          <button
            type="button"
            className="button secondary"
            onClick={() =>
              void reloadMasterData()
            }
          >
            Actualiser
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(240px,1fr) auto',
            gap: 10,
            marginTop: 18,
          }}
        >
          <input
            className="input"
            placeholder="Nom de la zone..."
            value={
              zoneName
            }
            onChange={(
              event
            ) =>
              setZoneName(
                event.target.value
              )
            }
          />

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap:
                'wrap',
            }}
          >
            <button
              type="button"
              className="button"
              onClick={
                saveZone
              }
            >
              {editingZoneId
                ? 'Enregistrer'
                : '+ Ajouter'}
            </button>

            {editingZoneId && (
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setEditingZoneId('')
                  setZoneName('')
                }}
              >
                Annuler
              </button>
            )}
          </div>
        </div>

        <div
          className="tableWrap"
          style={{
            marginTop: 18,
          }}
        >
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Zone</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {zones.map(
                (zone) => (
                  <tr
                    key={
                      zone.id
                    }
                  >
                    <td>
                      <strong>
                        {
                          zone.internalRef ||
                          '—'
                        }
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {
                          zone.name
                        }
                      </strong>
                    </td>

                    <td>
                      {zone.active ===
                      false
                        ? 'Désactivée'
                        : 'Active'}
                    </td>

                    <td>
                      <div
                        style={{
                          display:
                            'flex',
                          gap: 7,
                          flexWrap:
                            'wrap',
                        }}
                      >
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            editZone(
                              zone.id
                            )
                          }
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            toggleZone(
                              zone.id
                            )
                          }
                        >
                          {zone.active ===
                          false
                            ? 'Réactiver'
                            : 'Désactiver'}
                        </button>

                        <button
                          type="button"
                          className="button dangerButton"
                          onClick={() =>
                            deleteZone(
                              zone.id
                            )
                          }
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {!zones.length && (
                <tr>
                  <td
                    colSpan={4}
                  >
                    Aucune zone.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            gap: 12,
            flexWrap:
              'wrap',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
              }}
            >
              Catégories produits
            </h2>

            <p
              className="muted"
              style={{
                margin:
                  '5px 0 0',
              }}
            >
              Référentiel connecté à Supabase. Les catégories sont utilisées dans Produits, Stocks, filtres et imports.
            </p>
          </div>

          <button
            type="button"
            className="button secondary"
            onClick={() =>
              void reloadMasterData()
            }
          >
            Actualiser
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(240px,1fr) auto',
            gap: 10,
            marginTop: 18,
          }}
        >
          <input
            className="input"
            placeholder="Nom de la catégorie..."
            value={
              categoryName
            }
            onChange={(
              event
            ) =>
              setCategoryName(
                event.target.value
              )
            }
          />

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap:
                'wrap',
            }}
          >
            <button
              type="button"
              className="button"
              onClick={
                saveCategory
              }
            >
              {editingCategoryId
                ? 'Enregistrer'
                : '+ Ajouter'}
            </button>

            {editingCategoryId && (
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setEditingCategoryId('')
                  setCategoryName('')
                }}
              >
                Annuler
              </button>
            )}
          </div>
        </div>

        <div
          className="tableWrap"
          style={{
            marginTop: 18,
          }}
        >
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {categories.map(
                (category) => (
                  <tr
                    key={
                      category.id
                    }
                  >
                    <td>
                      <strong>
                        {
                          category.internalRef ||
                          '—'
                        }
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {
                          category.name
                        }
                      </strong>
                    </td>

                    <td>
                      <span
                        style={{
                          display:
                            'inline-flex',
                          padding:
                            '5px 9px',
                          borderRadius:
                            999,
                          fontSize: 11,
                          fontWeight:
                            800,
                          background:
                            category.active ===
                            false
                              ? '#f2f4f7'
                              : '#ecfdf3',
                          color:
                            category.active ===
                            false
                              ? '#667085'
                              : '#067647',
                        }}
                      >
                        {category.active ===
                        false
                          ? 'Désactivée'
                          : 'Active'}
                      </span>
                    </td>

                    <td>
                      <div
                        style={{
                          display:
                            'flex',
                          gap: 7,
                          flexWrap:
                            'wrap',
                        }}
                      >
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            editCategory(
                              category.id
                            )
                          }
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            toggleCategory(
                              category.id
                            )
                          }
                        >
                          {category.active ===
                          false
                            ? 'Réactiver'
                            : 'Désactiver'}
                        </button>

                        <button
                          type="button"
                          className="button dangerButton"
                          onClick={() =>
                            deleteCategory(
                              category.id
                            )
                          }
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {!categories.length && (
                <tr>
                  <td
                    colSpan={4}
                  >
                    Aucune catégorie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div
        style={{
          height: 16,
        }}
      />

      <Card>
        <div>
          <h2
            style={{
              margin: 0,
            }}
          >
            Sous-catégories
          </h2>

          <p
            className="muted"
            style={{
              margin:
                '5px 0 0',
            }}
          >
            Chaque sous-catégorie est rattachée à une catégorie principale.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(190px,.8fr) minmax(240px,1.2fr) auto',
            gap: 10,
            marginTop: 18,
          }}
        >
          <select
            className="select"
            value={
              selectedCategoryId
            }
            onChange={(
              event
            ) => {
              setSelectedCategoryId(
                event.target.value
              )
              setSubcategoryName('')
              setEditingSubcategoryId('')
            }}
          >
            <option value="">
              Sélectionner une catégorie
            </option>

            {categories.map(
              (category) => (
                <option
                  key={
                    category.id
                  }
                  value={
                    category.id
                  }
                >
                  {category.name}
                </option>
              )
            )}
          </select>

          <input
            className="input"
            placeholder="Nom de la sous-catégorie..."
            value={
              subcategoryName
            }
            onChange={(
              event
            ) =>
              setSubcategoryName(
                event.target.value
              )
            }
          />

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap:
                'wrap',
            }}
          >
            <button
              type="button"
              className="button"
              onClick={
                saveSubcategory
              }
            >
              {editingSubcategoryId
                ? 'Enregistrer'
                : '+ Ajouter'}
            </button>

            {editingSubcategoryId && (
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setEditingSubcategoryId('')
                  setSubcategoryName('')
                }}
              >
                Annuler
              </button>
            )}
          </div>
        </div>

        <div
          className="tableWrap"
          style={{
            marginTop: 18,
          }}
        >
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>
                  Sous-catégorie
                </th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {subcategories.map(
                (subcategory) => (
                  <tr
                    key={
                      subcategory.id
                    }
                  >
                    <td>
                      <strong>
                        {
                          subcategory.internalRef ||
                          '—'
                        }
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {
                          subcategory.name
                        }
                      </strong>
                    </td>

                    <td>
                      <span
                        style={{
                          display:
                            'inline-flex',
                          padding:
                            '5px 9px',
                          borderRadius:
                            999,
                          fontSize: 11,
                          fontWeight:
                            800,
                          background:
                            subcategory.active ===
                            false
                              ? '#f2f4f7'
                              : '#ecfdf3',
                          color:
                            subcategory.active ===
                            false
                              ? '#667085'
                              : '#067647',
                        }}
                      >
                        {subcategory.active ===
                        false
                          ? 'Désactivée'
                          : 'Active'}
                      </span>
                    </td>

                    <td>
                      <div
                        style={{
                          display:
                            'flex',
                          gap: 7,
                          flexWrap:
                            'wrap',
                        }}
                      >
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            editSubcategory(
                              subcategory.id
                            )
                          }
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            toggleSubcategory(
                              subcategory.id
                            )
                          }
                        >
                          {subcategory.active ===
                          false
                            ? 'Réactiver'
                            : 'Désactiver'}
                        </button>

                        <button
                          type="button"
                          className="button dangerButton"
                          onClick={() =>
                            deleteSubcategory(
                              subcategory.id
                            )
                          }
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {!subcategories.length && (
                <tr>
                  <td
                    colSpan={4}
                  >
                    Aucune sous-catégorie pour cette catégorie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            gap: 12,
            flexWrap:
              'wrap',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
              }}
            >
              Gestion des utilisateurs
            </h2>

            <p
              className="muted"
              style={{
                margin:
                  '5px 0 0',
              }}
            >
              Création, modification, activation,
              désactivation et suppression des comptes.
            </p>
          </div>

          {isAdmin && (
            <button
              className="button"
              onClick={
                openCreate
              }
            >
              + Nouvel utilisateur
            </button>
          )}
        </div>

        {!isAdmin ? (
          <div
            className="notice"
            style={{
              marginTop: 16,
            }}
          >
            Cette section est réservée aux administrateurs.
          </div>
        ) : loading ? (
          <div
            className="muted"
            style={{
              marginTop: 18,
            }}
          >
            Chargement des utilisateurs...
          </div>
        ) : (
          <div
            className="tableWrap"
            style={{
              marginTop: 18,
            }}
          >
            <table>
              <thead>
                <tr>
                  <th>
                    Utilisateur
                  </th>
                  <th>
                    Email
                  </th>
                  <th>
                    Département
                  </th>
                  <th>
                    Poste
                  </th>
                  <th>
                    Rôle
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
                {users.map(
                  (user) => (
                    <tr
                      key={
                        user.id
                      }
                    >
                      <td>
                        <strong>
                          {user.full_name ||
                            `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
                            'Sans nom'}
                        </strong>
                      </td>

                      <td>
                        {user.email ||
                          '—'}
                      </td>

                      <td>
                        {user.department_id
                          ? departmentById.get(
                              user.department_id
                            ) ||
                            '—'
                          : '—'}
                      </td>

                      <td>
                        {user.job_title ||
                          '—'}
                      </td>

                      <td>
                        {roleLabel[
                          user.role
                        ] ||
                          user.role}
                      </td>

                      <td>
                        <span
                          style={{
                            display:
                              'inline-flex',
                            padding:
                              '5px 9px',
                            borderRadius:
                              999,
                            fontSize:
                              11,
                            fontWeight:
                              800,
                            background:
                              user.active
                                ? '#ecfdf3'
                                : '#f2f4f7',
                            color:
                              user.active
                                ? '#067647'
                                : '#667085',
                          }}
                        >
                          {user.active
                            ? 'Actif'
                            : 'Désactivé'}
                        </span>
                      </td>

                      <td>
                        <div
                          style={{
                            display:
                              'flex',
                            gap: 7,
                            flexWrap:
                              'wrap',
                          }}
                        >
                          <button
                            className="button secondary"
                            onClick={() =>
                              openEdit(
                                user
                              )
                            }
                          >
                            Modifier
                          </button>

                          <button
                            className="button secondary"
                            onClick={() =>
                              void toggleActive(
                                user
                              )
                            }
                          >
                            {user.active
                              ? 'Désactiver'
                              : 'Réactiver'}
                          </button>

                          <button
                            className="button dangerButton"
                            onClick={() =>
                              void deleteUser(
                                user
                              )
                            }
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}

                {users.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={7}
                    >
                      Aucun utilisateur.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalOpen && (
        <div
          className="modalBackdrop"
          style={{
            position:
              'fixed',
            inset: 0,
            zIndex: 1000,
            background:
              'rgba(15,23,42,.48)',
            display:
              'grid',
            placeItems:
              'center',
            padding: 16,
          }}
        >
          <div
            className="modal"
            style={{
              width:
                'min(720px,100%)',
              maxHeight:
                'calc(100dvh - 24px)',
              overflowY:
                'auto',
              background:
                '#fff',
              borderRadius:
                20,
              padding: 20,
            }}
          >
            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                gap: 12,
                marginBottom:
                  18,
              }}
            >
              <h2
                style={{
                  margin: 0,
                }}
              >
                {form.id
                  ? 'Modifier utilisateur'
                  : 'Nouvel utilisateur'}
              </h2>

              <button
                className="button secondary"
                onClick={() =>
                  setModalOpen(
                    false
                  )
                }
              >
                Fermer
              </button>
            </div>

            <form
              onSubmit={
                saveUser
              }
            >
              <div
                className="formGrid"
                style={{
                  display:
                    'grid',
                  gridTemplateColumns:
                    'repeat(2,minmax(0,1fr))',
                  gap: 14,
                }}
              >
                <label className="field">
                  <span>
                    Prénom
                  </span>

                  <input
                    value={
                      form.first_name
                    }
                    onChange={(
                      event
                    ) =>
                      setField(
                        'first_name',
                        event
                          .target
                          .value
                      )
                    }
                    required
                  />
                </label>

                <label className="field">
                  <span>
                    Nom
                  </span>

                  <input
                    value={
                      form.last_name
                    }
                    onChange={(
                      event
                    ) =>
                      setField(
                        'last_name',
                        event
                          .target
                          .value
                      )
                    }
                    required
                  />
                </label>

                <label className="field">
                  <span>
                    Email
                  </span>

                  <input
                    type="email"
                    value={
                      form.email
                    }
                    onChange={(
                      event
                    ) =>
                      setField(
                        'email',
                        event
                          .target
                          .value
                      )
                    }
                    required
                  />
                </label>

                <label className="field">
                  <span>
                    {form.id
                      ? 'Nouveau mot de passe (facultatif)'
                      : 'Mot de passe'}
                  </span>

                  <input
                    type="password"
                    value={
                      form.password
                    }
                    onChange={(
                      event
                    ) =>
                      setField(
                        'password',
                        event
                          .target
                          .value
                      )
                    }
                    required={
                      !form.id
                    }
                    minLength={
                      8
                    }
                  />
                </label>

                <label className="field">
                  <span>
                    Département
                  </span>

                  <select
                    value={
                      form.department_id
                    }
                    onChange={(
                      event
                    ) =>
                      setField(
                        'department_id',
                        event
                          .target
                          .value
                      )
                    }
                  >
                    <option value="">
                      Aucun
                    </option>

                    {departments
                      .filter(
                        (
                          department
                        ) =>
                          department.active
                      )
                      .map(
                        (
                          department
                        ) => (
                          <option
                            key={
                              department.id
                            }
                            value={
                              department.id
                            }
                          >
                            {
                              department.name
                            }
                          </option>
                        )
                      )}
                  </select>
                </label>

                <label className="field">
                  <span>
                    Poste
                  </span>

                  <input
                    value={
                      form.job_title
                    }
                    onChange={(
                      event
                    ) =>
                      setField(
                        'job_title',
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Ex. Chef de rang, Responsable Bar..."
                  />
                </label>

                <label className="field">
                  <span>
                    Profil
                  </span>

                  <select
                    value={
                      form.role
                    }
                    onChange={(
                      event
                    ) =>
                      setField(
                        'role',
                        event
                          .target
                          .value as Role
                      )
                    }
                  >
                    <option value="admin">
                      Admin
                    </option>

                    <option value="department_manager">
                      Manager
                    </option>

                    <option value="requisitionnaire">
                      Réquisitionnaire
                    </option>
                  </select>
                </label>

                {form.id && (
                  <label
                    className="field"
                    style={{
                      alignContent:
                        'end',
                    }}
                  >
                    <span>
                      Statut
                    </span>

                    <select
                      value={
                        form.active
                          ? 'active'
                          : 'inactive'
                      }
                      onChange={(
                        event
                      ) =>
                        setField(
                          'active',
                          event
                            .target
                            .value ===
                            'active'
                        )
                      }
                    >
                      <option value="active">
                        Actif
                      </option>

                      <option value="inactive">
                        Désactivé
                      </option>
                    </select>
                  </label>
                )}
              </div>

              <div
                style={{
                  display:
                    'flex',
                  justifyContent:
                    'flex-end',
                  gap: 10,
                  marginTop:
                    20,
                }}
              >
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    setModalOpen(
                      false
                    )
                  }
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="button"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? 'Enregistrement...'
                    : form.id
                    ? 'Enregistrer'
                    : 'Créer utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  )
}