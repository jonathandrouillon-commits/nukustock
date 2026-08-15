'use client'

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  Page,
  Card,
} from '@/components/ui'

import { resetDemoData, useMasterData } from '@/lib/store'
import { supabase } from '@/lib/supabase'

import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

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

type SettingsSectionKey =
  | 'system'
  | 'categories'
  | 'subcategories'
  | 'users'

type SettingsSectionState =
  Record<SettingsSectionKey, boolean>

const SETTINGS_SECTION_VISIBILITY_KEY =
  'nukustock_settings_section_visibility_v1'

const SETTINGS_SECTION_OPEN_KEY =
  'nukustock_settings_section_open_v1'

const DEFAULT_SETTINGS_SECTION_STATE:
  SettingsSectionState = {
  system: true,
  categories: true,
  subcategories: true,
  users: true,
}

const SETTINGS_SECTION_LABELS:
  Record<SettingsSectionKey, string> = {
  system: 'Système',
  categories: 'Catégories produits',
  subcategories: 'Sous-catégories',
  users: 'Gestion des utilisateurs',
}

function SettingsSectionFrame({
  sectionKey,
  title,
  description,
  open,
  onToggleOpen,
  onExcel,
  onPdf,
  onPrint,
  children,
}: {
  sectionKey: SettingsSectionKey
  title: string
  description: string
  open: boolean
  onToggleOpen: () => void
  onExcel: () => void
  onPdf: () => void
  onPrint: () => void
  children: ReactNode
}) {
  return (
    <section
      data-settings-section={sectionKey}
      style={{ marginBottom: 16 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          padding: 14,
          border: '1px solid #e5e7eb',
          borderRadius: 14,
          background: '#fff',
          marginBottom: open ? 10 : 0,
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 240px' }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>
            {title}
          </div>
          <div
            style={{
              marginTop: 4,
              color: '#667085',
              fontSize: 11,
              lineHeight: 1.45,
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 7,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="button secondary small"
            onClick={onToggleOpen}
          >
            {open ? 'Masquer détails' : 'Ouvrir en détails'}
          </button>
          <button
            type="button"
            className="button secondary small"
            onClick={onExcel}
          >
            XLS
          </button>
          <button
            type="button"
            className="button secondary small"
            onClick={onPdf}
          >
            PDF A4
          </button>
          <button
            type="button"
            className="button secondary small"
            onClick={onPrint}
          >
            Imprimer
          </button>
        </div>
      </div>

      {open && children}
    </section>
  )
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

  const [
    sectionVisibility,
    setSectionVisibility,
  ] = useState<SettingsSectionState>(
    DEFAULT_SETTINGS_SECTION_STATE
  )

  const [
    sectionOpen,
    setSectionOpen,
  ] = useState<SettingsSectionState>(
    DEFAULT_SETTINGS_SECTION_STATE
  )

  useEffect(() => {
    try {
      const visibleRaw = localStorage.getItem(
        SETTINGS_SECTION_VISIBILITY_KEY
      )

      if (visibleRaw) {
        setSectionVisibility({
          ...DEFAULT_SETTINGS_SECTION_STATE,
          ...JSON.parse(visibleRaw),
        })
      }

      const openRaw = localStorage.getItem(
        SETTINGS_SECTION_OPEN_KEY
      )

      if (openRaw) {
        setSectionOpen({
          ...DEFAULT_SETTINGS_SECTION_STATE,
          ...JSON.parse(openRaw),
        })
      }
    } catch {
      // Garde les réglages par défaut.
    }
  }, [])

  const updateSectionVisibility = (
    key: SettingsSectionKey,
    visible: boolean
  ) => {
    setSectionVisibility((current) => {
      const next = {
        ...current,
        [key]: visible,
      }

      localStorage.setItem(
        SETTINGS_SECTION_VISIBILITY_KEY,
        JSON.stringify(next)
      )

      return next
    })
  }

  const toggleSectionOpen = (
    key: SettingsSectionKey
  ) => {
    setSectionOpen((current) => {
      const next = {
        ...current,
        [key]: !current[key],
      }

      localStorage.setItem(
        SETTINGS_SECTION_OPEN_KEY,
        JSON.stringify(next)
      )

      return next
    })
  }

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

  const getSettingsSectionRows = (
    key: SettingsSectionKey
  ): Record<string, string | number>[] => {
    if (key === 'system') {
      return [
        {
          Élément: 'Mode de données',
          Valeur:
            'Supabase + données locales NukuStock',
        },
        {
          Élément: 'Catégories',
          Valeur: categories.length,
        },
        {
          Élément: 'Sous-catégories',
          Valeur: masterData.filter(
            (item) => item.type === 'subcategory'
          ).length,
        },
        {
          Élément: 'Utilisateurs',
          Valeur: users.length,
        },
      ]
    }

    if (key === 'categories') {
      return categories.map((category) => {
        const subcategoryCount =
          masterData.filter(
            (item) =>
              item.type === 'subcategory' &&
              item.parentId === category.id
          ).length

        return {
          ID: category.id,
          Catégorie: category.name,
          Statut:
            category.active === false
              ? 'Désactivée'
              : 'Active',
          'Sous-catégories':
            subcategoryCount,
        }
      })
    }

    if (key === 'subcategories') {
      return masterData
        .filter(
          (item) =>
            item.type === 'subcategory'
        )
        .sort((a, b) =>
          a.name.localeCompare(b.name, 'fr')
        )
        .map((subcategory) => {
          const parent = categories.find(
            (category) =>
              category.id ===
              subcategory.parentId
          )

          return {
            ID: subcategory.id,
            'Sous-catégorie':
              subcategory.name,
            Catégorie:
              parent?.name ||
              'Non rattachée',
          }
        })
    }

    return users.map((user) => {
      const department = departments.find(
        (item) =>
          item.id ===
          user.department_id
      )

      return {
        Nom:
          [user.first_name, user.last_name]
            .filter(Boolean)
            .join(' ') ||
          user.full_name ||
          '',
        Email: user.email,
        Fonction: user.job_title || '',
        Rôle: roleLabel[user.role],
        Département: department?.name || '',
        Statut: user.active
          ? 'Actif'
          : 'Inactif',
      }
    })
  }

  const exportSettingsSectionExcel = (
    key: SettingsSectionKey
  ) => {
    const rows = getSettingsSectionRows(key)

    if (!rows.length) {
      setError('Aucune donnée à exporter.')
      return
    }

    const workbook = XLSX.utils.book_new()
    const worksheet =
      XLSX.utils.json_to_sheet(rows)

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      SETTINGS_SECTION_LABELS[key].slice(0, 31)
    )

    XLSX.writeFile(
      workbook,
      `NukuStock-${key}-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    )
  }

  const exportSettingsSectionPdf = (
    key: SettingsSectionKey
  ) => {
    const rows = getSettingsSectionRows(key)

    if (!rows.length) {
      setError('Aucune donnée à exporter.')
      return
    }

    const headers = Object.keys(rows[0])
    const body = rows.map((row) =>
      headers.map((header) =>
        String(row[header] ?? '')
      )
    )

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    doc.setFontSize(16)
    doc.text(
      `NukuStock - ${SETTINGS_SECTION_LABELS[key]}`,
      14,
      15
    )

    doc.setFontSize(8)
    doc.text(
      `Édité le ${new Date().toLocaleDateString('fr-FR')}`,
      14,
      21
    )

    autoTable(doc, {
      startY: 27,
      head: [headers],
      body,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      headStyles: {
        fontStyle: 'bold',
      },
      margin: {
        left: 10,
        right: 10,
      },
    })

    doc.save(
      `NukuStock-${key}-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`
    )
  }

  const printSettingsSection = (
    key: SettingsSectionKey
  ) => {
    const rows = getSettingsSectionRows(key)

    if (!rows.length) {
      setError('Aucune donnée à imprimer.')
      return
    }

    const headers = Object.keys(rows[0])
    const popup = window.open(
      '',
      '_blank',
      'width=1100,height=800'
    )

    if (!popup) {
      setError(
        'Le navigateur a bloqué la fenêtre d’impression.'
      )
      return
    }

    const escapeHtml = (value: unknown) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

    popup.document.write(`
      <!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <title>NukuStock - ${escapeHtml(
            SETTINGS_SECTION_LABELS[key]
          )}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            body {
              font-family: Arial, sans-serif;
              color: #101828;
              margin: 0;
            }
            h1 {
              font-size: 18px;
              margin: 0 0 4px;
            }
            .meta {
              font-size: 10px;
              color: #667085;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
            }
            th, td {
              border: 1px solid #d0d5dd;
              padding: 5px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f2f4f7;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <h1>NukuStock - ${escapeHtml(
            SETTINGS_SECTION_LABELS[key]
          )}</h1>
          <div class="meta">
            Édité le ${escapeHtml(
              new Date().toLocaleDateString('fr-FR')
            )}
          </div>
          <table>
            <thead>
              <tr>
                ${headers
                  .map(
                    (header) =>
                      `<th>${escapeHtml(header)}</th>`
                  )
                  .join('')}
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) =>
                    `<tr>${headers
                      .map(
                        (header) =>
                          `<td>${escapeHtml(
                            row[header]
                          )}</td>`
                      )
                      .join('')}</tr>`
                )
                .join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => window.print()
          </script>
        </body>
      </html>
    `)

    popup.document.close()
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

      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>
              Affichage des réglages
            </h2>
            <p
              className="muted"
              style={{ margin: '5px 0 0' }}
            >
              Masque ou affiche les différentes sections. Chaque section peut être ouverte en détails, exportée en XLS/PDF A4 ou imprimée.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 7,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="button secondary small"
              onClick={() => {
                setSectionVisibility(
                  DEFAULT_SETTINGS_SECTION_STATE
                )
                localStorage.setItem(
                  SETTINGS_SECTION_VISIBILITY_KEY,
                  JSON.stringify(
                    DEFAULT_SETTINGS_SECTION_STATE
                  )
                )
              }}
            >
              Tout afficher
            </button>

            <button
              type="button"
              className="button secondary small"
              onClick={() => {
                const next: SettingsSectionState = {
                  system: false,
                  categories: false,
                  subcategories: false,
                  users: false,
                }
                setSectionVisibility(next)
                localStorage.setItem(
                  SETTINGS_SECTION_VISIBILITY_KEY,
                  JSON.stringify(next)
                )
              }}
            >
              Tout masquer
            </button>

            <button
              type="button"
              className="button secondary small"
              onClick={() => {
                setSectionOpen(
                  DEFAULT_SETTINGS_SECTION_STATE
                )
                localStorage.setItem(
                  SETTINGS_SECTION_OPEN_KEY,
                  JSON.stringify(
                    DEFAULT_SETTINGS_SECTION_STATE
                  )
                )
              }}
            >
              Ouvrir tout
            </button>

            <button
              type="button"
              className="button secondary small"
              onClick={() => {
                const next: SettingsSectionState = {
                  system: false,
                  categories: false,
                  subcategories: false,
                  users: false,
                }
                setSectionOpen(next)
                localStorage.setItem(
                  SETTINGS_SECTION_OPEN_KEY,
                  JSON.stringify(next)
                )
              }}
            >
              Fermer tout
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(220px,1fr))',
            gap: 8,
            marginTop: 14,
          }}
        >
          {(
            Object.keys(
              SETTINGS_SECTION_LABELS
            ) as SettingsSectionKey[]
          ).map((key) => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                minHeight: 44,
                padding: '8px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                cursor: 'pointer',
                background:
                  sectionVisibility[key]
                    ? '#f8fafc'
                    : '#fff',
              }}
            >
              <input
                type="checkbox"
                checked={sectionVisibility[key]}
                onChange={(event) =>
                  updateSectionVisibility(
                    key,
                    event.target.checked
                  )
                }
              />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {SETTINGS_SECTION_LABELS[key]}
              </span>
            </label>
          ))}
        </div>
      </Card>

      <div style={{ height: 16 }} />

      {sectionVisibility.system && (
        <SettingsSectionFrame
          sectionKey="system"
          title="Système"
          description="Mode actuel, état de la configuration et remise à zéro."
          open={sectionOpen.system}
          onToggleOpen={() => toggleSectionOpen('system')}
          onExcel={() => exportSettingsSectionExcel('system')}
          onPdf={() => exportSettingsSectionPdf('system')}
          onPrint={() => printSettingsSection('system')}
        >
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
        </SettingsSectionFrame>
      )}

      <div
        style={{
          height: 16,
        }}
      />

      {sectionVisibility.categories && (
        <SettingsSectionFrame
          sectionKey="categories"
          title="Catégories produits"
          description="Afficher/masquer, ouvrir en détails, exporter ou imprimer le référentiel des catégories produits."
          open={sectionOpen.categories}
          onToggleOpen={() => toggleSectionOpen('categories')}
          onExcel={() => exportSettingsSectionExcel('categories')}
          onPdf={() => exportSettingsSectionPdf('categories')}
          onPrint={() => printSettingsSection('categories')}
        >
      <Card>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(150px,1fr))',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 11,
              border: '1px solid #e5e7eb',
              background: '#f8fafc',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: '#667085',
              }}
            >
              Catégories
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              {categories.length}
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 11,
              border: '1px solid #e5e7eb',
              background: '#f8fafc',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: '#667085',
              }}
            >
              Actives
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              {
                categories.filter(
                  (category) =>
                    category.active !== false
                ).length
              }
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 11,
              border: '1px solid #e5e7eb',
              background: '#f8fafc',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: '#667085',
              }}
            >
              Sous-catégories
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              {
                masterData.filter(
                  (item) =>
                    item.type ===
                    'subcategory'
                ).length
              }
            </div>
          </div>
        </div>

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
                    colSpan={3}
                  >
                    Aucune catégorie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
        </SettingsSectionFrame>
      )}

      <div
        style={{
          height: 16,
        }}
      />

      {sectionVisibility.subcategories && (
        <SettingsSectionFrame
          sectionKey="subcategories"
          title="Sous-catégories"
          description="Référentiel rattaché aux catégories principales."
          open={sectionOpen.subcategories}
          onToggleOpen={() => toggleSectionOpen('subcategories')}
          onExcel={() => exportSettingsSectionExcel('subcategories')}
          onPdf={() => exportSettingsSectionPdf('subcategories')}
          onPrint={() => printSettingsSection('subcategories')}
        >
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
                    colSpan={3}
                  >
                    Aucune sous-catégorie pour cette catégorie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
        </SettingsSectionFrame>
      )}

      <div
        style={{
          height: 16,
        }}
      />

      {sectionVisibility.users && (
        <SettingsSectionFrame
          sectionKey="users"
          title="Gestion des utilisateurs"
          description="Comptes, rôles, départements et statut des utilisateurs."
          open={sectionOpen.users}
          onToggleOpen={() => toggleSectionOpen('users')}
          onExcel={() => exportSettingsSectionExcel('users')}
          onPdf={() => exportSettingsSectionPdf('users')}
          onPrint={() => printSettingsSection('users')}
        >
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
        </SettingsSectionFrame>
      )}

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