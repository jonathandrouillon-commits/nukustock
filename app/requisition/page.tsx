'use client'

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
import { supabase } from '@/lib/supabase'
import RequisitionPushNotifications from '@/components/requisition-push-notifications'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

type Department = {
  id: string
  name: string
}

type Location = {
  id: string
  name: string
}

type Product = {
  id: string
  name: string
  packaging: string | null
  base_unit: string
  internal_reference: string | null
  category: string | null
  subcategory: string | null
  photo_url: string | null
}

type RequestRow = {
  id: string
  request_number: string
  department_id: string
  destination_location_id: string
  requested_for: string
  priority: string
  status: string
  notes: string | null
  requested_by: string | null
  created_at: string
}

type RequestLine = {
  id: string
  request_id: string
  product_id: string
  requested_quantity: number
  approved_quantity: number
  delivered_quantity: number
  notes: string | null
}

type DraftLine = {
  id: string
  product_id: string
  quantity: number
}

const BUNGALOW_ALLOWED_PRODUCT_NAMES = [
  'Hinano Blonde',
  'Hinano Ambré',
  'Heineken',
  'Corona',
  'Hoa',
  'Hoa Mara 0%',
  'Coca',
  'Coca Zero',
  'Sprite',
  'Tonic',
  'Rotui Mangue',
  'Rotui Ananas',
  'Vals',
  'Evian',
] as const

const SPECIAL_REQUEST_MARKER =
  '[DEMANDE SPÉCIALE BUNGALOW]'

function cleanSpecialRequestMarker(
  value: string | null | undefined
) {
  return (value || '')
    .replace(SPECIAL_REQUEST_MARKER, '')
    .trim()
}

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isBungalowRestricted(
  locationName: string
) {
  const normalized =
    normalizeName(locationName)

  if (normalized === 'bungalow infini') {
    return true
  }

  const match =
    normalized.match(
      /^bungalow\s+(\d+)$/
    )

  if (!match) {
    return false
  }

  const number = Number(match[1])

  return number >= 0 && number <= 15
}

function isAllowedBungalowProduct(
  productName: string
) {
  const name = normalizeName(productName)

  const rules = [
    /^hinano blonde(?:\s|$)/,
    /^hinano ambre(?:\s|$)/,
    /^heineken(?:\s|$)/,
    /^corona(?:\s|$)/,
    /^hoa mara 0(?:\s|$)/,
    /^hoa(?:\s|$)/,
    /^coca cola zero(?:\s|$)/,
    /^coca zero(?:\s|$)/,
    /^coca cola(?:\s|$)/,
    /^coca(?:\s|$)/,
    /^sprite(?:\s|$)/,
    /^tonic(?:\s|$)/,
    /^rotui mangue(?:\s|$)/,
    /^rotui ananas(?:\s|$)/,
    /^vals(?:\s|$)/,
    /^evian(?:\s|$)/,
  ]

  return rules.some((rule) =>
    rule.test(name)
  )
}

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10)
}

function statusLabel(
  status: string
) {
  const labels:
    Record<string, string> = {
      draft: 'Brouillon',
      submitted: 'Envoyée',
      approved: 'Validée',
      partially_approved:
        'Partiellement validée',
      preparing:
        'Préparation',
      delivered: 'Livrée',
      received: 'Reçue',
      rejected: 'Refusée',
      cancelled: 'Annulée',
    }

  return (
    labels[status] ||
    status
  )
}

function canEdit(
  status: string
) {
  return (
    status === 'draft' ||
    status === 'submitted'
  )
}

export default function RequisitionPage() {
  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    saving,
    setSaving,
  ] = useState(false)
  const [
    specialRequest,
    setSpecialRequest,
  ] = useState(false)


  const [
    message,
    setMessage,
  ] = useState('')

  const [
    error,
    setError,
  ] = useState('')

  const [
    userId,
    setUserId,
  ] = useState('')

  const [
    fullName,
    setFullName,
  ] = useState('')

  const [
    profileDepartmentId,
    setProfileDepartmentId,
  ] = useState<
    string | null
  >(null)

  const [
    departments,
    setDepartments,
  ] = useState<
    Department[]
  >([])

  const [
    locations,
    setLocations,
  ] = useState<
    Location[]
  >([])

  const [
    products,
    setProducts,
  ] = useState<
    Product[]
  >([])

  const [
    requests,
    setRequests,
  ] = useState<
    RequestRow[]
  >([])

  const [
    requestLines,
    setRequestLines,
  ] = useState<
    RequestLine[]
  >([])

  const [
    formOpen,
    setFormOpen,
  ] = useState(false)

  const [
    editingId,
    setEditingId,
  ] = useState('')

  const [
    departmentId,
    setDepartmentId,
  ] = useState('')

  const [
    destinationId,
    setDestinationId,
  ] = useState('')

  const [
    requestedFor,
    setRequestedFor,
  ] = useState(
    today()
  )

  const [
    notes,
    setNotes,
  ] = useState('')

  const [
    lines,
    setLines,
  ] = useState<
    DraftLine[]
  >([])

  const [
    installPrompt,
    setInstallPrompt,
  ] = useState<BeforeInstallPromptEvent | null>(null)

  const [
    appInstalled,
    setAppInstalled,
  ] = useState(false)

  const [
    installMessage,
    setInstallMessage,
  ] = useState('')

  const productsById =
    useMemo(
      () =>
        new Map(
          products.map(
            (product) => [
              product.id,
              product,
            ]
          )
        ),
      [products]
    )

  const departmentsById =
    useMemo(
      () =>
        new Map(
          departments.map(
            (item) => [
              item.id,
              item.name,
            ]
          )
        ),
      [departments]
    )

  const locationsById =
    useMemo(
      () =>
        new Map(
          locations.map(
            (item) => [
              item.id,
              item.name,
            ]
          )
        ),
      [locations]
    )

  const selectedDestinationName =
    locationsById.get(destinationId) || ''

  const bungalowRestricted =
    isBungalowRestricted(
      selectedDestinationName
    )

  const availableProducts =
    useMemo(
      () =>
        bungalowRestricted &&
        !specialRequest
          ? products.filter(
              (product) =>
                isAllowedBungalowProduct(
                  product.name
                )
            )
          : products,
      [
        products,
        bungalowRestricted,
        specialRequest,
      ]
    )

  const productsForLocationId = (
    locationId: string
  ) => {
    const locationName =
      locationsById.get(locationId) || ''

    return isBungalowRestricted(
      locationName
    )
      ? products.filter(
          (product) =>
            isAllowedBungalowProduct(
              product.name
            )
        )
      : products
  }

  const loadData =
    async () => {
      setLoading(true)
      setError('')

      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser()

      if (!user) {
        window.location.href =
          '/login'
        return
      }

      setUserId(user.id)

      const [
        profileResult,
        departmentsResult,
        locationsResult,
        productsResult,
        requestsResult,
      ] =
        await Promise.all([
          supabase
            .from('profiles')
            .select(
              'full_name, department_id, role, active'
            )
            .eq('id', user.id)
            .single(),

          supabase
            .from('departments')
            .select('id, name')
            .eq('active', true)
            .order('name'),

          supabase
            .from(
              'storage_locations'
            )
            .select('id, name')
            .eq('active', true)
            .order('name'),

          supabase
            .from('products')
            .select(
              'id, name, packaging, base_unit, internal_reference, category, subcategory, photo_url'
            )
            .eq('active', true)
            .order('name'),

          supabase
            .from(
              'internal_requests'
            )
            .select(
              'id, request_number, department_id, destination_location_id, requested_for, priority, status, notes, requested_by, created_at'
            )
            .eq(
              'requested_by',
              user.id
            )
            .order(
              'created_at',
              {
                ascending:
                  false,
              }
            ),
        ])

      if (
        profileResult.error
      ) {
        setError(
          profileResult.error.message
        )
        setLoading(false)
        return
      }

      setFullName(
        profileResult.data
          ?.full_name ||
          user.email ||
          ''
      )

      setProfileDepartmentId(
        profileResult.data
          ?.department_id ||
          null
      )

      if (
        departmentsResult.error ||
        locationsResult.error ||
        productsResult.error ||
        requestsResult.error
      ) {
        setError(
          departmentsResult.error
            ?.message ||
            locationsResult.error
              ?.message ||
            productsResult.error
              ?.message ||
            requestsResult.error
              ?.message ||
            'Impossible de charger les données.'
        )
        setLoading(false)
        return
      }

      const nextRequests =
        (requestsResult.data ||
          []) as RequestRow[]

      setDepartments(
        (departmentsResult.data ||
          []) as Department[]
      )
      setLocations(
        (locationsResult.data ||
          []) as Location[]
      )
      setProducts(
        (productsResult.data ||
          []) as Product[]
      )
      setRequests(
        nextRequests
      )

      if (
        nextRequests.length
      ) {
        const ids =
          nextRequests.map(
            (request) =>
              request.id
          )

        const {
          data: lineData,
          error: lineError,
        } = await supabase
          .from(
            'internal_request_lines'
          )
          .select(
            'id, request_id, product_id, requested_quantity, approved_quantity, delivered_quantity, notes'
          )
          .in(
            'request_id',
            ids
          )

        if (lineError) {
          setError(
            lineError.message
          )
        } else {
          setRequestLines(
            (lineData ||
              []) as RequestLine[]
          )
        }
      } else {
        setRequestLines([])
      }

      setLoading(false)
    }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    if (standalone) {
      setAppInstalled(true)
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
      setInstallMessage('')
    }

    const handleAppInstalled = () => {
      setAppInstalled(true)
      setInstallPrompt(null)
      setInstallMessage('Application installée.')
    }

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    )
    window.addEventListener(
      'appinstalled',
      handleAppInstalled
    )

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )
      window.removeEventListener(
        'appinstalled',
        handleAppInstalled
      )
    }
  }, [])

  const installApp = async () => {
    if (!installPrompt) {
      setInstallMessage(
        'Installation non disponible pour le moment. Si tu as déjà installé l’application, cherche “Réquisitions” dans tes applications.'
      )
      return
    }

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice

    if (choice.outcome === 'accepted') {
      setInstallMessage('Installation lancée.')
    } else {
      setInstallMessage('Installation annulée.')
    }

    setInstallPrompt(null)
  }

  const resetForm =
    () => {
      setEditingId('')
      setDepartmentId(
        profileDepartmentId ||
          departments[0]?.id ||
          ''
      )
      const firstLocationId =
        locations[0]?.id || ''

      const firstProducts =
        productsForLocationId(
          firstLocationId
        )

      setDestinationId(
        firstLocationId
      )
      setRequestedFor(
        today()
      )
      setNotes('')
      setSpecialRequest(false)
      setLines([
        {
          id:
            crypto.randomUUID(),
          product_id:
            firstProducts[0]?.id ||
            '',
          quantity: 1,
        },
      ])
    }

  const openNew =
    () => {
      setMessage('')
      setError('')
      resetForm()
      setFormOpen(true)
    }

  const openEdit = (
    request: RequestRow
  ) => {
    if (
      !canEdit(
        request.status
      )
    ) {
      return
    }

    setMessage('')
    setError('')
    setEditingId(
      request.id
    )
    setDepartmentId(
      request.department_id
    )
    setDestinationId(
      request.destination_location_id
    )
    setRequestedFor(
      request.requested_for
    )
    const requestDestinationName =
      locationsById.get(
        request.destination_location_id
      ) || ''

    setSpecialRequest(
      isBungalowRestricted(
        requestDestinationName
      ) &&
      (request.notes || '').includes(
        SPECIAL_REQUEST_MARKER
      )
    )

    setNotes(
      cleanSpecialRequestMarker(
        request.notes
      )
    )

    const existingLines =
      requestLines
        .filter(
          (line) =>
            line.request_id ===
            request.id
        )
        .map(
          (line) => ({
            id: line.id,
            product_id:
              line.product_id,
            quantity:
              Number(
                line.requested_quantity
              ) || 1,
          })
        )

    setLines(
      existingLines.length
        ? existingLines
        : [
            {
              id:
                crypto.randomUUID(),
              product_id:
                products[0]
                  ?.id || '',
              quantity: 1,
            },
          ]
    )

    setFormOpen(true)
  }

  const addLine = () => {
    setLines(
      (current) => [
        ...current,
        {
          id:
            crypto.randomUUID(),
          product_id:
            availableProducts[0]?.id ||
            '',
          quantity: 1,
        },
      ]
    )
  }

  const updateLine = (
    id: string,
    patch:
      Partial<DraftLine>
  ) => {
    setLines(
      (current) =>
        current.map(
          (line) =>
            line.id === id
              ? {
                  ...line,
                  ...patch,
                }
              : line
        )
    )
  }

  const removeLine = (
    id: string
  ) => {
    setLines(
      (current) =>
        current.length <= 1
          ? current
          : current.filter(
              (line) =>
                line.id !== id
            )
    )
  }

  const saveRequest =
    async () => {
      setError('')
      setMessage('')

      if (
        !departmentId
      ) {
        setError(
          'Choisis le département.'
        )
        return
      }

      if (
        !destinationId
      ) {
        setError(
          'Choisis le lieu de destination.'
        )
        return
      }

      const cleanLines =
        lines.filter(
          (line) =>
            line.product_id &&
            Number(
              line.quantity
            ) > 0
        )

      if (
        !cleanLines.length
      ) {
        setError(
          'Ajoute au moins un produit.'
        )
        return
      }

      if (
        bungalowRestricted &&
        !specialRequest
      ) {
        const unauthorized =
          cleanLines
            .map((line) =>
              productsById.get(
                line.product_id
              )
            )
            .filter(
              (product) =>
                product &&
                !isAllowedBungalowProduct(
                  product.name
                )
            )

        if (unauthorized.length) {
          setError(
            `Pour ${selectedDestinationName}, seuls les produits autorisés pour les Bungalows peuvent être demandés.`
          )
          return
        }
      }

      const persistedNotes =
        specialRequest
          ? [
              SPECIAL_REQUEST_MARKER,
              notes.trim(),
            ]
              .filter(Boolean)
              .join(' ')
          : notes.trim() || null

      setSaving(true)

      try {
        if (editingId) {
          const request =
            requests.find(
              (item) =>
                item.id ===
                editingId
            )

          if (
            !request ||
            !canEdit(
              request.status
            )
          ) {
            throw new Error(
              'Cette réquisition ne peut plus être modifiée.'
            )
          }

          const {
            error:
              updateError,
          } = await supabase
            .from(
              'internal_requests'
            )
            .update({
              department_id:
                departmentId,
              destination_location_id:
                destinationId,
              requested_for:
                requestedFor,
              notes:
                persistedNotes,
              status:
                'submitted',
            })
            .eq(
              'id',
              editingId
            )

          if (updateError) {
            throw updateError
          }

          const {
            error:
              deleteError,
          } = await supabase
            .from(
              'internal_request_lines'
            )
            .delete()
            .eq(
              'request_id',
              editingId
            )

          if (deleteError) {
            throw deleteError
          }

          const {
            error:
              insertLinesError,
          } = await supabase
            .from(
              'internal_request_lines'
            )
            .insert(
              cleanLines.map(
                (line) => ({
                  id:
                    crypto.randomUUID(),
                  request_id:
                    editingId,
                  product_id:
                    line.product_id,
                  requested_quantity:
                    Number(
                      line.quantity
                    ),
                  approved_quantity:
                    0,
                  delivered_quantity:
                    0,
                  notes: null,
                })
              )
            )

          if (
            insertLinesError
          ) {
            throw insertLinesError
          }

          setMessage(
            'Réquisition modifiée.'
          )
        } else {
          const requestId =
            crypto.randomUUID()

          const requestNumber =
            `REQ-${Date.now()
              .toString()
              .slice(-8)}`

          const {
            error:
              requestError,
          } = await supabase
            .from(
              'internal_requests'
            )
            .insert({
              id: requestId,
              request_number:
                requestNumber,
              department_id:
                departmentId,
              destination_location_id:
                destinationId,
              requested_for:
                requestedFor,
              priority:
                'normal',
              status:
                'submitted',
              notes:
                persistedNotes,
              requested_by:
                userId,
            })

          if (requestError) {
            throw requestError
          }

          const {
            error:
              lineError,
          } = await supabase
            .from(
              'internal_request_lines'
            )
            .insert(
              cleanLines.map(
                (line) => ({
                  id:
                    crypto.randomUUID(),
                  request_id:
                    requestId,
                  product_id:
                    line.product_id,
                  requested_quantity:
                    Number(
                      line.quantity
                    ),
                  approved_quantity:
                    0,
                  delivered_quantity:
                    0,
                  notes: null,
                })
              )
            )

          if (lineError) {
            throw lineError
          }

          setMessage(
            `Réquisition ${requestNumber} envoyée.`
          )
        }

        setFormOpen(false)
        await loadData()
      } catch (
        caughtError
      ) {
        setError(
          caughtError instanceof
          Error
            ? caughtError.message
            : 'Erreur lors de l’enregistrement.'
        )
      } finally {
        setSaving(false)
      }
    }

  const signOut =
    async () => {
      await supabase.auth.signOut()
      window.location.href =
        '/login'
    }

  if (loading) {
    return (
      <main style={styles.center}>
        Chargement...
      </main>
    )
  }

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .requisition-modal {
            width: 100% !important;
            min-height: 100dvh !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }

          .requisition-form-body {
            padding: 16px !important;
          }

          .requisition-top-fields {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
          }

          .requisition-lines-header {
            align-items: stretch !important;
            flex-direction: column !important;
          }

          .requisition-add-product {
            width: 100% !important;
          }

          .requisition-table-header {
            display: none !important;
          }

          .requisition-product-row {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
            padding: 16px !important;
          }

          .requisition-product-cell {
            align-items: flex-start !important;
          }

          .requisition-action-cell {
            justify-content: stretch !important;
          }

          .requisition-remove-button {
            width: 100% !important;
          }

          .requisition-modal-actions {
            grid-template-columns: 1fr !important;
            padding: 12px 16px calc(12px + env(safe-area-inset-bottom)) !important;
          }

          .requisition-form-title {
            font-size: 26px !important;
          }

          .requisition-products-section,
          .requisition-form-section {
            padding: 16px !important;
          }
        }
      `}</style>
      <main style={styles.page}>
        <RequisitionPushNotifications />
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>
            NUKUTEPIPI
          </div>

          <h1 style={styles.title}>
            Requisition Nuku
          </h1>

          <div style={styles.userName}>
            {fullName}
          </div>
        </div>

        <button
          type="button"
          onClick={signOut}
          style={styles.secondaryButton}
        >
          Déconnexion
        </button>
      </header>

      <section style={styles.content}>
        {message && (
          <div style={styles.success}>
            {message}
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <div style={styles.installBox}>
          {appInstalled ? (
            <div style={styles.installedBadge}>
              ✓ Application installée
            </div>
          ) : installPrompt ? (
            <button
              type="button"
              onClick={installApp}
              style={styles.installButton}
            >
              Installer Réquisitions
            </button>
          ) : (
            <div style={styles.installHint}>
              Réquisitions n’est pas ouverte en mode application.
            </div>
          )}

          {installMessage && (
            <div style={styles.installMessage}>
              {installMessage}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={openNew}
          style={styles.primaryButton}
        >
          + Nouvelle réquisition
        </button>

        <h2 style={styles.sectionTitle}>
          Mes réquisitions
        </h2>

        <div style={styles.list}>
          {requests.map(
            (request) => {
              const linesForRequest =
                requestLines.filter(
                  (line) =>
                    line.request_id ===
                    request.id
                )

              return (
                <article
                  key={request.id}
                  style={styles.card}
                >
                  <div style={styles.cardTop}>
                    <div>
                      <strong
                        style={{
                          fontSize: 17,
                        }}
                      >
                        {
                          request.request_number
                        }
                      </strong>

                      <div style={styles.muted}>
                        {new Date(
                          request.created_at
                        ).toLocaleDateString(
                          'fr-FR'
                        )}
                      </div>
                    </div>

                    <span style={styles.badge}>
                      {statusLabel(
                        request.status
                      )}
                    </span>
                  </div>

                  <div style={styles.meta}>
                    <div>
                      <span style={styles.muted}>
                        Département
                      </span>
                      <strong>
                        {departmentsById.get(
                          request.department_id
                        ) || '—'}
                      </strong>
                    </div>

                    <div>
                      <span style={styles.muted}>
                        Destination
                      </span>
                      <strong>
                        {locationsById.get(
                          request.destination_location_id
                        ) || '—'}
                      </strong>
                    </div>
                  </div>

                  <div style={styles.products}>
                    {linesForRequest.map(
                      (line) => {
                        const product =
                          productsById.get(
                            line.product_id
                          )

                        return (
                          <div
                            key={line.id}
                            style={styles.productRow}
                          >
                            <span>
                              {product?.name ||
                                'Produit'}
                            </span>

                            <strong>
                              {Number(
                                line.requested_quantity
                              )}
                            </strong>
                          </div>
                        )
                      }
                    )}
                  </div>

                  {canEdit(
                    request.status
                  ) ? (
                    <button
                      type="button"
                      onClick={() =>
                        openEdit(
                          request
                        )
                      }
                      style={styles.editButton}
                    >
                      Modifier
                    </button>
                  ) : (
                    <div style={styles.locked}>
                      Réquisition verrouillée après validation.
                    </div>
                  )}
                </article>
              )
            }
          )}

          {!requests.length && (
            <div style={styles.empty}>
              Aucune réquisition pour le moment.
            </div>
          )}
        </div>
      </section>

      {formOpen && (
        <div style={styles.modalBackdrop}>
          <div className="requisition-modal" style={styles.modal}>
            <div className="requisition-form-body" style={styles.formBody}>
              <div style={styles.breadcrumb}>
                Réquisitions
                <span>›</span>
                {editingId
                  ? 'Modifier la réquisition'
                  : 'Nouvelle réquisition'}
              </div>

              <div style={styles.formTitleBlock}>
                <h2 className="requisition-form-title" style={styles.formTitle}>
                  {editingId
                    ? 'Modifier la réquisition'
                    : 'Nouvelle réquisition'}
                </h2>

                <div style={styles.formSubtitle}>
                  Sélectionnez les produits et les quantités souhaitées.
                </div>
              </div>

              <section className="requisition-form-section" style={styles.formSection}>
                <div className="requisition-top-fields" style={styles.topFieldsGrid}>
                  <label style={styles.field}>
                    <span>
                      Département
                      <span style={styles.required}> *</span>
                    </span>

                    <select
                      value={departmentId}
                      onChange={(event) =>
                        setDepartmentId(
                          event.target.value
                        )
                      }
                      disabled={
                        Boolean(
                          profileDepartmentId
                        )
                      }
                      style={styles.input}
                    >
                      <option value="">
                        Choisir
                      </option>

                      {departments.map(
                        (department) => (
                          <option
                            key={department.id}
                            value={department.id}
                          >
                            {department.name}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label style={styles.field}>
                    <span>
                      Lieu de destination
                      <span style={styles.required}> *</span>
                    </span>

                    <select
                      value={destinationId}
                      onChange={(event) => {
                        const nextDestinationId =
                          event.target.value

                        setDestinationId(
                          nextDestinationId
                        )

                        const nextProducts =
                          specialRequest
                            ? products
                            : productsForLocationId(
                                nextDestinationId
                              )

                        const allowedIds =
                          new Set(
                            nextProducts.map(
                              (product) =>
                                product.id
                            )
                          )

                        setLines(
                          (current) =>
                            current.map(
                              (line) => ({
                                ...line,
                                product_id:
                                  allowedIds.has(
                                    line.product_id
                                  )
                                    ? line.product_id
                                    : nextProducts[0]
                                        ?.id ||
                                      '',
                              })
                            )
                        )
                      }}
                      style={styles.input}
                    >
                      <option value="">
                        Choisir
                      </option>

                      {locations.map(
                        (location) => (
                          <option
                            key={location.id}
                            value={location.id}
                          >
                            {location.name}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label style={styles.field}>
                    <span>
                      Date souhaitée
                      <span style={styles.required}> *</span>
                    </span>

                    <input
                      type="date"
                      value={requestedFor}
                      onChange={(event) =>
                        setRequestedFor(
                          event.target.value
                        )
                      }
                      style={styles.input}
                    />
                  </label>
                </div>

                <label
                  style={{
                    ...styles.field,
                    marginBottom: 0,
                  }}
                >
                  <span>Commentaire</span>

                  <textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder="Ajouter un commentaire (optionnel)"
                    style={{
                      ...styles.input,
                      minHeight: 88,
                      padding: 12,
                      resize: 'vertical',
                    }}
                  />
                </label>
              </section>

              {bungalowRestricted && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    marginTop: 14,
                    marginBottom: 12,
                    padding: 12,
                    borderRadius: 12,
                    border: specialRequest
                      ? '1px solid #86efac'
                      : '1px solid #d0d5dd',
                    background: specialRequest
                      ? '#f0fdf4'
                      : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={specialRequest}
                    onChange={(event) => {
                      const checked =
                        event.target.checked

                      setSpecialRequest(
                        checked
                      )

                      if (checked) {
                        return
                      }

                      const allowedIds =
                        new Set(
                          products
                            .filter(
                              (product) =>
                                isAllowedBungalowProduct(
                                  product.name
                                )
                            )
                            .map(
                              (product) =>
                                product.id
                            )
                        )

                      const firstAllowed =
                        products.find(
                          (product) =>
                            isAllowedBungalowProduct(
                              product.name
                            )
                        )

                      setLines(
                        (current) =>
                          current.map(
                            (line) => ({
                              ...line,
                              product_id:
                                allowedIds.has(
                                  line.product_id
                                )
                                  ? line.product_id
                                  : firstAllowed
                                      ?.id ||
                                    '',
                            })
                          )
                      )
                    }}
                    style={{
                      marginTop: 2,
                      width: 18,
                      height: 18,
                      flex: '0 0 auto',
                    }}
                  />

                  <span>
                    <strong>
                      Demande spéciale
                    </strong>
                    <span
                      style={{
                        display: 'block',
                        marginTop: 3,
                        color: '#667085',
                        fontSize: 11,
                        lineHeight: 1.4,
                      }}
                    >
                      Cocher pour débloquer exceptionnellement toute la liste des produits pour ce bungalow.
                    </span>
                  </span>
                </label>
              )}

              {bungalowRestricted &&
                !specialRequest && (
                <div
                  style={{
                    marginTop: 14,
                    marginBottom: 14,
                    padding: 12,
                    borderRadius: 12,
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    color: '#9a3412',
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  <strong>
                    Produits autorisés pour {selectedDestinationName}
                  </strong>
                  <div style={{ marginTop: 4 }}>
                    {BUNGALOW_ALLOWED_PRODUCT_NAMES.join(' · ')}
                  </div>
                </div>
              )}

              {bungalowRestricted &&
                specialRequest && (
                  <div
                    style={{
                      marginTop: 12,
                      marginBottom: 14,
                      padding: 12,
                      borderRadius: 12,
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      color: '#166534',
                      fontSize: 12,
                      lineHeight: 1.45,
                    }}
                  >
                    <strong>
                      Demande spéciale activée
                    </strong>
                    <div style={{ marginTop: 4 }}>
                      Toute la liste produits est disponible pour cette réquisition.
                    </div>
                  </div>
                )}

              <section className="requisition-products-section" style={styles.productsSection}>
                <div className="requisition-lines-header" style={styles.linesHeader}>
                  <h3 style={styles.productsTitle}>
                    Produits requis
                  </h3>

                  <button
                    type="button"
                    onClick={addLine}
                    className="requisition-add-product"
                    style={styles.addProductButton}
                  >
                    + Ajouter un produit
                  </button>
                </div>

                <div style={styles.productsTable}>
                  <div className="requisition-table-header" style={styles.tableHeader}>
                    <div>Produit</div>
                    <div>Quantité demandée</div>
                    <div style={{ textAlign: 'right' }}>
                      Actions
                    </div>
                  </div>

                  <div style={styles.unitNotice}>
                    <div style={styles.infoIcon}>
                      i
                    </div>

                    <div>
                      <strong>
                        La quantité demandée est exprimée en unité
                      </strong>{' '}
                      (pièce, bouteille, canette, etc.).
                      <div>
                        Le conditionnement n&apos;apparaît pas pour éviter toute confusion.
                      </div>
                    </div>
                  </div>

                  {lines.map(
                    (line) => {
                      const selectedProduct =
                        products.find(
                          (product) =>
                            product.id ===
                            line.product_id
                        )

                      return (
                        <div
                          key={line.id}
                          className="requisition-product-row"
                          style={styles.productTableRow}
                        >
                          <div className="requisition-product-cell" style={styles.productCell}>
                            <div style={styles.productImageWrap}>
                              {selectedProduct?.photo_url ? (
                                <img
                                  src={selectedProduct.photo_url}
                                  alt=""
                                  style={styles.productImage}
                                />
                              ) : (
                                <div style={styles.productImagePlaceholder}>
                                  N
                                </div>
                              )}
                            </div>

                            <div style={styles.productContent}>
                              <select
                                value={line.product_id}
                                onChange={(event) =>
                                  updateLine(
                                    line.id,
                                    {
                                      product_id:
                                        event.target.value,
                                    }
                                  )
                                }
                                style={styles.productSelect}
                              >
                                <option value="">
                                  Choisir un produit
                                </option>

                                {availableProducts.map(
                                  (product) => (
                                    <option
                                      key={product.id}
                                      value={product.id}
                                    >
                                      {product.name}
                                    </option>
                                  )
                                )}
                              </select>

                              {selectedProduct && (
                                <div style={styles.productDetails}>
                                  <strong>
                                    {selectedProduct.internal_reference || ''}
                                  </strong>

                                  <span>
                                    {[
                                      selectedProduct.category,
                                      selectedProduct.subcategory,
                                    ]
                                      .filter(Boolean)
                                      .join(' > ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={styles.quantityCell}>
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(event) =>
                                updateLine(
                                  line.id,
                                  {
                                    quantity:
                                      Math.max(
                                        1,
                                        Number(
                                          event.target.value
                                        ) || 1
                                      ),
                                  }
                                )
                              }
                              style={styles.quantityInput}
                            />

                            <div style={styles.unitLabel}>
                              unité
                            </div>
                          </div>

                          <div className="requisition-action-cell" style={styles.actionCell}>
                            <button
                              type="button"
                              onClick={() =>
                                removeLine(
                                  line.id
                                )
                              }
                              disabled={
                                lines.length <= 1
                              }
                              className="requisition-remove-button"
                              style={{
                                ...styles.removeButton,
                                width: undefined,
                                opacity:
                                  lines.length <= 1
                                    ? 0.45
                                    : 1,
                              }}
                            >
                              Retirer
                            </button>
                          </div>
                        </div>
                      )
                    }
                  )}

                  <div style={styles.lineCount}>
                    Total de lignes : {lines.length}
                  </div>
                </div>
              </section>
            </div>

            <div className="requisition-modal-actions" style={styles.modalActions}>
              <button
                type="button"
                onClick={() =>
                  setFormOpen(false)
                }
                style={styles.cancelButton}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={saveRequest}
                disabled={saving}
                style={styles.primaryButton}
              >
                {saving
                  ? 'Envoi...'
                  : editingId
                  ? 'Enregistrer'
                  : 'Envoyer la réquisition'}
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </>
  )
}

const styles:
  Record<
    string,
    CSSProperties
  > = {
  page: {
    minHeight: '100vh',
    background: '#f4f6f9',
    color: '#101828',
  },
  center: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: '#f4f6f9',
    fontWeight: 700,
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    minHeight: 76,
    padding:
      '12px max(16px, env(safe-area-inset-left))',
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: 12,
    background:
      'rgba(255,255,255,.97)',
    borderBottom:
      '1px solid #e5e7eb',
  },
  content: {
    width: 'min(720px,100%)',
    margin: '0 auto',
    padding:
      '18px 14px 40px',
  },
  eyebrow: {
    color: '#98a2b3',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '.1em',
  },
  title: {
    margin: '2px 0 0',
    fontSize: 22,
  },
  userName: {
    marginTop: 3,
    color: '#667085',
    fontSize: 12,
  },
  installBox: {
    marginBottom: 14,
  },
  installButton: {
    width: '100%',
    minHeight: 48,
    padding: '0 16px',
    border: '1px solid #0b1220',
    borderRadius: 12,
    background: '#ffffff',
    color: '#0b1220',
    fontSize: 14,
    fontWeight: 900,
    cursor: 'pointer',
  },
  installedBadge: {
    minHeight: 46,
    padding: '0 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #abefc6',
    borderRadius: 12,
    background: '#ecfdf3',
    color: '#067647',
    fontSize: 13,
    fontWeight: 900,
  },
  installHint: {
    padding: '10px 12px',
    border: '1px solid #e4e7ec',
    borderRadius: 12,
    background: '#ffffff',
    color: '#667085',
    fontSize: 12,
    textAlign: 'center',
  },
  installMessage: {
    marginTop: 7,
    color: '#667085',
    fontSize: 11,
    textAlign: 'center',
  },
  sectionTitle: {
    margin: '22px 0 12px',
    fontSize: 19,
  },
  list: {
    display: 'grid',
    gap: 12,
  },
  card: {
    padding: 16,
    border:
      '1px solid #e5e7eb',
    borderRadius: 18,
    background: '#fff',
    boxShadow:
      '0 8px 24px rgba(16,24,40,.05)',
  },
  cardTop: {
    display: 'flex',
    justifyContent:
      'space-between',
    alignItems:
      'flex-start',
    gap: 10,
  },
  badge: {
    padding: '6px 9px',
    borderRadius: 999,
    background: '#f2f4f7',
    fontSize: 11,
    fontWeight: 800,
  },
  muted: {
    color: '#667085',
    fontSize: 11,
    display: 'block',
  },
  meta: {
    marginTop: 14,
    display: 'grid',
    gridTemplateColumns:
      'repeat(2,minmax(0,1fr))',
    gap: 10,
  },
  products: {
    marginTop: 14,
    borderTop:
      '1px solid #eaecf0',
  },
  productRow: {
    minHeight: 42,
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: 10,
    borderBottom:
      '1px solid #f2f4f7',
    fontSize: 13,
  },
  secondaryButton: {
    minHeight: 42,
    padding: '0 14px',
    border:
      '1px solid #d0d5dd',
    borderRadius: 11,
    background: '#fff',
    color: '#344054',
    fontWeight: 700,
    cursor: 'pointer',
  },
  editButton: {
    width: '100%',
    minHeight: 44,
    marginTop: 14,
    border:
      '1px solid #d0d5dd',
    borderRadius: 11,
    background: '#fff',
    color: '#101828',
    fontWeight: 800,
  },
  locked: {
    marginTop: 12,
    color: '#667085',
    fontSize: 11,
  },
  empty: {
    padding: 28,
    textAlign: 'center',
    border:
      '1px dashed #d0d5dd',
    borderRadius: 16,
    color: '#667085',
  },
  success: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    background: '#ecfdf3',
    border:
      '1px solid #abefc6',
    color: '#067647',
    fontSize: 13,
  },
  error: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    background: '#fef3f2',
    border:
      '1px solid #fecdca',
    color: '#b42318',
    fontSize: 13,
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background:
      'rgba(15,23,42,.42)',
    overflowY: 'auto',
  },
  modal: {
    width: 'min(1360px,calc(100% - 28px))',
    minHeight: 'calc(100vh - 28px)',
    margin: '14px auto',
    borderRadius: 20,
    background: '#f8fafc',
    boxShadow:
      '0 24px 70px rgba(15,23,42,.22)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  formBody: {
    flex: '1 1 auto',
    padding: '20px',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#475467',
    fontSize: 13,
    fontWeight: 800,
  },
  formTitleBlock: {
    marginTop: 18,
    marginBottom: 18,
  },
  formTitle: {
    margin: 0,
    color: '#101828',
    fontSize: 30,
    lineHeight: 1.1,
    fontWeight: 900,
  },
  formSubtitle: {
    marginTop: 7,
    color: '#667085',
    fontSize: 14,
  },
  formSection: {
    padding: 20,
    border: '1px solid #e4e7ec',
    borderRadius: 16,
    background: '#ffffff',
  },
  topFieldsGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(3,minmax(0,1fr))',
    gap: 18,
  },
  field: {
    display: 'grid',
    gap: 7,
    marginBottom: 16,
    color: '#344054',
    fontSize: 13,
    fontWeight: 800,
  },
  required: {
    color: '#175cd3',
  },
  input: {
    width: '100%',
    minHeight: 52,
    border: '1px solid #d0d5dd',
    borderRadius: 12,
    padding: '0 14px',
    background: '#fff',
    color: '#101828',
    fontSize: 16,
    boxSizing: 'border-box',
    outline: 'none',
  },
  productsSection: {
    marginTop: 16,
    padding: 20,
    border: '1px solid #e4e7ec',
    borderRadius: 16,
    background: '#ffffff',
  },
  linesHeader: {
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  productsTitle: {
    margin: 0,
    color: '#101828',
    fontSize: 24,
    fontWeight: 900,
  },
  addProductButton: {
    minHeight: 48,
    padding: '0 18px',
    border: 0,
    borderRadius: 12,
    background: '#0b1220',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
  },
  productsTable: {
    border: '1px solid #e4e7ec',
    borderRadius: 14,
    overflow: 'hidden',
  },
  tableHeader: {
    minHeight: 52,
    padding: '0 14px',
    display: 'grid',
    gridTemplateColumns:
      'minmax(0,1.75fr) minmax(180px,.65fr) 150px',
    alignItems: 'center',
    gap: 16,
    background: '#f8fafc',
    color: '#475467',
    fontSize: 12,
    fontWeight: 900,
  },
  unitNotice: {
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    borderTop: '1px solid #b2ccff',
    borderBottom: '1px solid #b2ccff',
    background: '#eff8ff',
    color: '#344054',
    fontSize: 12,
    lineHeight: 1.45,
  },
  infoIcon: {
    flex: '0 0 auto',
    width: 20,
    height: 20,
    borderRadius: 999,
    display: 'grid',
    placeItems: 'center',
    background: '#1570ef',
    color: '#fff',
    fontSize: 12,
    fontWeight: 900,
  },
  productTableRow: {
    minHeight: 100,
    padding: '12px 14px',
    display: 'grid',
    gridTemplateColumns:
      'minmax(0,1.75fr) minmax(180px,.65fr) 150px',
    alignItems: 'center',
    gap: 16,
    borderBottom: '1px solid #eaecf0',
    background: '#ffffff',
  },
  productCell: {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  productImageWrap: {
    flex: '0 0 auto',
    width: 68,
    height: 68,
    border: '1px solid #e4e7ec',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#f8fafc',
  },
  productImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    color: '#98a2b3',
    fontWeight: 900,
  },
  productContent: {
    minWidth: 0,
    flex: '1 1 auto',
  },
  productSelect: {
    width: '100%',
    minHeight: 46,
    border: '1px solid #d0d5dd',
    borderRadius: 10,
    padding: '0 12px',
    background: '#fff',
    color: '#101828',
    fontSize: 15,
    fontWeight: 800,
    boxSizing: 'border-box',
  },
  productDetails: {
    marginTop: 6,
    display: 'grid',
    gap: 2,
    color: '#667085',
    fontSize: 12,
  },
  quantityCell: {
    alignSelf: 'center',
  },
  quantityInput: {
    width: '100%',
    minHeight: 46,
    border: '1px solid #d0d5dd',
    borderRadius: 10,
    padding: '0 12px',
    background: '#fff',
    color: '#101828',
    fontSize: 16,
    boxSizing: 'border-box',
  },
  unitLabel: {
    marginTop: 5,
    color: '#175cd3',
    fontSize: 11,
    fontWeight: 800,
  },
  actionCell: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  removeButton: {
    minHeight: 46,
    padding: '0 16px',
    border: '1px solid #fda29b',
    borderRadius: 10,
    background: '#fff',
    color: '#b42318',
    fontWeight: 800,
    cursor: 'pointer',
  },
  lineCount: {
    padding: '12px 14px',
    color: '#344054',
    fontSize: 12,
    fontWeight: 800,
    background: '#fff',
  },
  modalActions: {
    flex: '0 0 auto',
    padding: '14px 20px',
    display: 'grid',
    gridTemplateColumns: '1fr 1.35fr',
    gap: 12,
    borderTop: '1px solid #e4e7ec',
    background: '#ffffff',
  },
  cancelButton: {
    minHeight: 54,
    border: '1px solid #d0d5dd',
    borderRadius: 12,
    background: '#fff',
    color: '#344054',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
  },
  primaryButton: {
    width: '100%',
    minHeight: 54,
    padding: '0 18px',
    border: 0,
    borderRadius: 12,
    background: '#0b1220',
    color: '#fff',
    fontSize: 15,
    fontWeight: 900,
    cursor: 'pointer',
  },
}