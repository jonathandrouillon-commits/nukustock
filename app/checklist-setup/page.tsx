'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Page, Card, Badge } from '@/components/ui'
import { supabase } from '@/lib/supabase'

type Category = {
  id: string
  name: string
  sort_order: number
  active: boolean
}

type Template = {
  id: string
  name: string
  active: boolean
  created_at: string
  updated_at: string
}

type TemplateLine = {
  id: string
  setup_id: string
  category_id: string
  label: string
  quantity: number
  sort_order: number
  active: boolean
}

type Run = {
  id: string
  setup_id: string
  bartender_name: string
  status: 'in_progress' | 'signed' | 'cancelled'
  started_at: string
  completed_at?: string | null
  signed_at?: string | null
  signature_data?: string | null
  created_at: string
}

type RunLine = {
  id: string
  run_id: string
  template_line_id?: string | null
  category_name: string
  label: string
  quantity: number
  sort_order: number
  done: boolean
  done_at?: string | null
}

type Tab = 'mes-checklists' | 'historique' | 'modeles'

function safeNumber(value: unknown) {
  return Math.max(0, Number(value) || 0)
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}

function formatTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function categoryIcon(name: string) {
  const normalized = normalize(name)
  if (normalized.includes('mobilier')) return '▰'
  if (normalized.includes('accessoires bar')) return '◼'
  if (normalized.includes('produits bar')) return '◒'
  if (normalized.includes('glace')) return '❄'
  if (normalized.includes('verrerie')) return '♢'
  if (normalized.includes('decoration')) return '◉'
  if (normalized.includes('divers')) return '◆'
  return '•'
}

function categoryTone(name: string) {
  const normalized = normalize(name)
  if (normalized.includes('mobilier')) return 'blue'
  if (normalized.includes('accessoires bar')) return 'green'
  if (normalized.includes('produits bar')) return 'orange'
  if (normalized.includes('glace')) return 'cyan'
  if (normalized.includes('verrerie')) return 'sky'
  if (normalized.includes('decoration')) return 'pink'
  if (normalized.includes('divers')) return 'purple'
  return 'gray'
}

export default function ChecklistSetupPage() {
  const [tab, setTab] = useState<Tab>('mes-checklists')
  const [categories, setCategories] = useState<Category[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateLines, setTemplateLines] = useState<TemplateLine[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [runLines, setRunLines] = useState<RunLine[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedRunId, setSelectedRunId] = useState('')
  const [bartenderName, setBartenderName] = useState('')
  const [newSetupName, setNewSetupName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newLineLabel, setNewLineLabel] = useState('')
  const [newLineQuantity, setNewLineQuantity] = useState(1)
  const [newLineCategoryId, setNewLineCategoryId] = useState('')
  const [editingLineId, setEditingLineId] = useState('')
  const [editingLabel, setEditingLabel] = useState('')
  const [editingQuantity, setEditingQuantity] = useState(1)
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)

  const reload = async () => {
    setLoading(true)

    const [
      categoryResult,
      templateResult,
      templateLinesResult,
      runsResult,
      runLinesResult,
    ] = await Promise.all([
      supabase
        .from('bar_setup_categories')
        .select('id,name,sort_order,active')
        .eq('active', true)
        .order('sort_order')
        .order('name'),
      supabase
        .from('bar_setup_templates')
        .select('id,name,active,created_at,updated_at')
        .eq('active', true)
        .order('name'),
      supabase
        .from('bar_setup_template_lines')
        .select('id,setup_id,category_id,label,quantity,sort_order,active')
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('bar_setup_runs')
        .select(
          'id,setup_id,bartender_name,status,started_at,completed_at,signed_at,signature_data,created_at'
        )
        .order('started_at', { ascending: false }),
      supabase
        .from('bar_setup_run_lines')
        .select(
          'id,run_id,template_line_id,category_name,label,quantity,sort_order,done,done_at'
        )
        .order('sort_order'),
    ])

    const firstError =
      categoryResult.error ||
      templateResult.error ||
      templateLinesResult.error ||
      runsResult.error ||
      runLinesResult.error

    if (firstError) {
      setMessage(`Erreur Supabase : ${firstError.message}`)
      setLoading(false)
      return
    }

    const nextCategories = (categoryResult.data || []) as Category[]
    const nextTemplates = (templateResult.data || []) as Template[]
    const nextTemplateLines = (templateLinesResult.data || []).map(
      (row: any) => ({
        ...row,
        quantity: safeNumber(row.quantity),
      })
    ) as TemplateLine[]
    const nextRuns = (runsResult.data || []) as Run[]
    const nextRunLines = (runLinesResult.data || []).map((row: any) => ({
      ...row,
      quantity: safeNumber(row.quantity),
    })) as RunLine[]

    setCategories(nextCategories)
    setTemplates(nextTemplates)
    setTemplateLines(nextTemplateLines)
    setRuns(nextRuns)
    setRunLines(nextRunLines)

    if (!selectedTemplateId && nextTemplates[0]) {
      setSelectedTemplateId(nextTemplates[0].id)
    }

    if (!newLineCategoryId && nextCategories[0]) {
      setNewLineCategoryId(nextCategories[0].id)
    }

    const currentRun =
      nextRuns.find((run) => run.status === 'in_progress') || null

    if (!selectedRunId && currentRun) {
      setSelectedRunId(currentRun.id)
    }

    setLoading(false)
  }

  useEffect(() => {
    void reload()
  }, [])

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  )

  const selectedTemplateLines = useMemo(
    () =>
      templateLines
        .filter((line) => line.setup_id === selectedTemplateId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [templateLines, selectedTemplateId]
  )

  const inProgressRuns = useMemo(
    () => runs.filter((run) => run.status === 'in_progress'),
    [runs]
  )

  const signedRuns = useMemo(
    () => runs.filter((run) => run.status === 'signed'),
    [runs]
  )

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) || null,
    [runs, selectedRunId]
  )

  const selectedRunLines = useMemo(
    () =>
      runLines
        .filter((line) => line.run_id === selectedRunId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [runLines, selectedRunId]
  )

  const completed = selectedRunLines.filter((line) => line.done).length
  const total = selectedRunLines.length
  const progress = total ? Math.round((completed / total) * 100) : 0
  const canSign = !!selectedRun && total > 0 && completed === total

  const runGroups = useMemo(() => {
    const ordered = categories
      .map((category) => ({
        name: category.name,
        sort_order: category.sort_order,
        lines: selectedRunLines.filter(
          (line) => line.category_name === category.name
        ),
      }))
      .filter((group) => group.lines.length > 0)

    const known = new Set(ordered.map((group) => group.name))
    const extras = Array.from(
      new Set(
        selectedRunLines
          .map((line) => line.category_name)
          .filter((name) => !known.has(name))
      )
    ).map((name, index) => ({
      name,
      sort_order: 1000 + index,
      lines: selectedRunLines.filter(
        (line) => line.category_name === name
      ),
    }))

    return [...ordered, ...extras]
  }, [categories, selectedRunLines])

  const templateGroups = useMemo(() => {
    return categories
      .map((category) => ({
        category,
        lines: selectedTemplateLines.filter(
          (line) => line.category_id === category.id
        ),
      }))
      .filter((group) => group.lines.length > 0)
  }, [categories, selectedTemplateLines])

  const createDefaultDelvoyIfMissing = async () => {
    const delvoy = templates.find(
      (template) => normalize(template.name) === 'delvoy'
    )
    if (!delvoy) return

    const existing = templateLines.filter(
      (line) => line.setup_id === delvoy.id
    )
    if (existing.length > 0) return

    const byName = new Map(
      categories.map((category) => [normalize(category.name), category.id])
    )

    const getCat = (name: string) =>
      byName.get(normalize(name)) || categories[0]?.id

    const rows = [
      ['Mobilier', 'Bar lumineux', 1],
      ['Mobilier', 'Tables plastique', 2],
      ['Mobilier', 'Nappes', 2],
      ['Mobilier', 'Marche lumineuse', 1],
      ['Accessoires Divers', 'Cendriers', 3],
      ['Accessoires Divers', 'Cendrier Monsieur', 1],
      ['Accessoires Divers', 'Boîte à mouchoirs', 1],
      ['Accessoires Divers', 'Boîte à cigarettes', 1],
      ['Accessoires Divers', 'Chewing-gum', 1],
      ['Accessoires Bar', 'Shakers', 2],
      ['Accessoires Bar', 'Pelle à glace', 1],
      ['Accessoires Bar', 'Doseurs', 2],
      ['Accessoires Bar', 'Pourers', 6],
      ['Accessoires Bar', 'Serviettes en papier', 2],
      ['Accessoires Bar', 'Bol à chips', 1],
      ['Accessoires Bar', 'Blender', 1],
      ['Accessoires Bar', 'Strainer', 1],
      ['Accessoires Bar', 'Torchon', 1],
      ['Accessoires Bar', 'Chiffon', 1],
      ['Accessoires Bar', 'Sopalin', 1],
      ['Accessoires Bar', 'Boîte à fruits', 1],
      ['Produits Bar', 'Chips', 1],
      ['Produits Bar', 'Gin', 2],
      ['Produits Bar', 'Vodka', 2],
      ['Produits Bar', 'Téquila', 2],
      ['Produits Bar', 'Rhum', 2],
    ]

    const payload = rows
      .map(([category, label, quantity], index) => ({
        setup_id: delvoy.id,
        category_id: getCat(String(category)),
        label: String(label),
        quantity: Number(quantity),
        sort_order: (index + 1) * 10,
        active: true,
      }))
      .filter((row) => Boolean(row.category_id))

    if (!payload.length) return

    const { error } = await supabase
      .from('bar_setup_template_lines')
      .insert(payload)

    if (!error) {
      await reload()
    }
  }

  useEffect(() => {
    if (!loading && templates.length && categories.length) {
      void createDefaultDelvoyIfMissing()
    }
  }, [loading, templates.length, categories.length])

  const createTemplate = async () => {
    const name = newSetupName.trim()
    if (!name) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('bar_setup_templates')
      .insert({
        name,
        active: true,
        created_by: user?.id || null,
      })
      .select('id')
      .single()

    if (error) {
      setMessage(error.message)
      return
    }

    setNewSetupName('')
    setSelectedTemplateId(data.id)
    await reload()
  }

  const createCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return

    const { error } = await supabase
      .from('bar_setup_categories')
      .insert({
        name,
        active: true,
        sort_order: (categories.at(-1)?.sort_order || 0) + 10,
      })

    if (error) {
      setMessage(error.message)
      return
    }

    setNewCategoryName('')
    await reload()
  }

  const addTemplateLine = async () => {
    if (!selectedTemplate || !newLineLabel.trim() || !newLineCategoryId) {
      return
    }

    const { error } = await supabase
      .from('bar_setup_template_lines')
      .insert({
        setup_id: selectedTemplate.id,
        category_id: newLineCategoryId,
        label: newLineLabel.trim(),
        quantity: safeNumber(newLineQuantity),
        sort_order: (selectedTemplateLines.at(-1)?.sort_order || 0) + 10,
        active: true,
      })

    if (error) {
      setMessage(error.message)
      return
    }

    setNewLineLabel('')
    setNewLineQuantity(1)
    await reload()
  }

  const startEditLine = (line: TemplateLine) => {
    setEditingLineId(line.id)
    setEditingLabel(line.label)
    setEditingQuantity(line.quantity)
    setEditingCategoryId(line.category_id)
  }

  const saveEditLine = async () => {
    if (!editingLineId || !editingLabel.trim() || !editingCategoryId) return

    const { error } = await supabase
      .from('bar_setup_template_lines')
      .update({
        category_id: editingCategoryId,
        label: editingLabel.trim(),
        quantity: safeNumber(editingQuantity),
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingLineId)

    if (error) {
      setMessage(error.message)
      return
    }

    setEditingLineId('')
    await reload()
  }

  const deleteTemplateLine = async (line: TemplateLine) => {
    if (!window.confirm(`Supprimer "${line.label}" ?`)) return

    const { error } = await supabase
      .from('bar_setup_template_lines')
      .delete()
      .eq('id', line.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await reload()
  }

  const startRun = async () => {
    if (!selectedTemplate) return

    const name = bartenderName.trim()
    if (!name) {
      setMessage('Renseigne le nom du barman.')
      return
    }

    if (!selectedTemplateLines.length) {
      setMessage('Ce modèle ne contient encore aucun élément.')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: run, error: runError } = await supabase
      .from('bar_setup_runs')
      .insert({
        setup_id: selectedTemplate.id,
        bartender_name: name,
        status: 'in_progress',
        created_by: user?.id || null,
      })
      .select('id')
      .single()

    if (runError) {
      setMessage(runError.message)
      return
    }

    const categoryMap = new Map(
      categories.map((category) => [category.id, category.name])
    )

    const payload = selectedTemplateLines.map((line) => ({
      run_id: run.id,
      template_line_id: line.id,
      category_name:
        categoryMap.get(line.category_id) || 'Sans catégorie',
      label: line.label,
      quantity: line.quantity,
      sort_order: line.sort_order,
      done: false,
    }))

    const { error: lineError } = await supabase
      .from('bar_setup_run_lines')
      .insert(payload)

    if (lineError) {
      await supabase.from('bar_setup_runs').delete().eq('id', run.id)
      setMessage(lineError.message)
      return
    }

    setSelectedRunId(run.id)
    setBartenderName('')
    setTab('mes-checklists')
    await reload()
  }

  const toggleRunLine = async (line: RunLine) => {
    if (!selectedRun || selectedRun.status !== 'in_progress') return

    const done = !line.done

    const { error } = await supabase
      .from('bar_setup_run_lines')
      .update({
        done,
        done_at: done ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', line.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await reload()
  }

  const setAllRunLines = async (done: boolean) => {
    if (!selectedRun) return

    const { error } = await supabase
      .from('bar_setup_run_lines')
      .update({
        done,
        done_at: done ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('run_id', selectedRun.id)

    if (error) {
      setMessage(error.message)
      return
    }

    await reload()
  }

  const resetRun = async () => {
    if (!selectedRun) return
    if (!window.confirm('Réinitialiser toute la check-list ?')) return
    await setAllRunLines(false)
  }

  const prepareCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.round(rect.width * ratio))
    canvas.height = Math.max(1, Math.round(rect.height * ratio))

    const context = canvas.getContext('2d')
    if (!context) return

    context.scale(ratio, ratio)
    context.lineWidth = 2.2
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#101828'
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, rect.width, rect.height)
  }

  useEffect(() => {
    if (!signatureOpen) return
    const timer = window.setTimeout(prepareCanvas, 50)
    return () => window.clearTimeout(timer)
  }, [signatureOpen])

  const pointerPosition = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const startDrawing = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    drawingRef.current = true
    canvas.setPointerCapture(event.pointerId)
    const point = pointerPosition(event)
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  const draw = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    if (!drawingRef.current) return
    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    const point = pointerPosition(event)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const stopDrawing = () => {
    drawingRef.current = false
  }

  const clearSignature = () => {
    prepareCanvas()
  }

  const signAndClose = async () => {
    if (!selectedRun || !canSign) return
    const canvas = canvasRef.current
    if (!canvas) return

    const now = new Date().toISOString()

    const { error } = await supabase
      .from('bar_setup_runs')
      .update({
        status: 'signed',
        completed_at: now,
        signed_at: now,
        signature_data: canvas.toDataURL('image/png'),
        updated_at: now,
      })
      .eq('id', selectedRun.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setSignatureOpen(false)
    setSelectedRunId('')
    setTab('historique')
    await reload()
  }

  const renderRunCard = (group: {
    name: string
    lines: RunLine[]
  }) => {
    const done = group.lines.filter((line) => line.done).length
    const count = group.lines.length
    const pct = count ? Math.round((done / count) * 100) : 0
    const tone = categoryTone(group.name)

    return (
      <section
        className={`clCategoryCard tone-${tone}`}
        key={group.name}
      >
        <div className="clCategoryCardHeader">
          <div className="clCategoryIcon">
            {categoryIcon(group.name)}
          </div>
          <strong>{group.name}</strong>
        </div>

        <div className="clCategoryItems">
          {group.lines.map((line) => (
            <button
              key={line.id}
              type="button"
              className={`clCategoryItem ${line.done ? 'done' : ''}`}
              onClick={() => toggleRunLine(line)}
            >
              <span className="clMiniCheck">
                {line.done ? '✓' : ''}
              </span>
              <span className="clItemLabel">{line.label}</span>
              <span className="clItemQty">
                {line.quantity.toLocaleString('fr-FR')}
              </span>
            </button>
          ))}
        </div>

        <div className="clCategoryFooter">
          <span>
            {done} / {count}
          </span>
          <div className="clMiniProgress">
            <div style={{ width: `${pct}%` }} />
          </div>
          <strong>{pct}%</strong>
        </div>
      </section>
    )
  }

  return (
    <Page
      title="Check List & Set Up"
      subtitle=""
    >
      <div className="clPageToolbar">
        <div className="clTabs">
          <button
            className={tab === 'mes-checklists' ? 'active' : ''}
            onClick={() => setTab('mes-checklists')}
          >
            MES CHECK-LISTS
          </button>
          <button
            className={tab === 'historique' ? 'active' : ''}
            onClick={() => setTab('historique')}
          >
            HISTORIQUE
          </button>
          <button
            className={tab === 'modeles' ? 'active' : ''}
            onClick={() => setTab('modeles')}
          >
            MODÈLES DE SET UP
          </button>
        </div>

        <button
          type="button"
          className="clPrimaryButton"
          onClick={() => setTab('modeles')}
        >
          + Nouveau Set Up
        </button>
      </div>

      {message && (
        <div className="clNotice">
          {message}
        </div>
      )}

      {loading ? (
        <Card>Chargement…</Card>
      ) : tab === 'mes-checklists' ? (
        <>
          {inProgressRuns.length === 0 ? (
            <Card>
              <div className="clEmptyRun">
                <strong>Aucune check-list en cours</strong>
                <span>
                  Choisis un modèle et démarre une nouvelle check-list.
                </span>
                <button
                  className="clPrimaryButton"
                  onClick={() => setTab('modeles')}
                >
                  Choisir un modèle
                </button>
              </div>
            </Card>
          ) : (
            <>
              <div className="clRunSelector">
                {inProgressRuns.map((run) => {
                  const template = templates.find(
                    (item) => item.id === run.setup_id
                  )
                  return (
                    <button
                      key={run.id}
                      type="button"
                      className={
                        selectedRunId === run.id ? 'active' : ''
                      }
                      onClick={() => setSelectedRunId(run.id)}
                    >
                      {template?.name || 'Set Up'}
                    </button>
                  )
                })}
              </div>

              {selectedRun && (
                <>
                  <div className="clSummaryGrid">
                    <div className="clSummaryCard">
                      <span>Set Up sélectionné</span>
                      <strong>
                        {templates.find(
                          (item) => item.id === selectedRun.setup_id
                        )?.name || 'Set Up'}
                      </strong>
                      <button
                        type="button"
                        onClick={() => setTab('modeles')}
                      >
                        Changer de modèle
                      </button>
                    </div>

                    <div className="clSummaryCard">
                      <span>Barman</span>
                      <div className="clSummaryValue">
                        <b>◉</b>
                        <strong>{selectedRun.bartender_name}</strong>
                      </div>
                    </div>

                    <div className="clSummaryCard">
                      <span>Début</span>
                      <div className="clSummaryValue">
                        <b>▣</b>
                        <div>
                          <strong>
                            {formatDate(selectedRun.started_at)}
                          </strong>
                          <small>
                            {formatTime(selectedRun.started_at)}
                          </small>
                        </div>
                      </div>
                    </div>

                    <div className="clSummaryCard">
                      <span>Progression</span>
                      <strong className="clBigNumber">{progress}%</strong>
                      <div className="clSummaryProgress">
                        <div style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="clSummaryCard">
                      <span>Statut</span>
                      <div className="clStatusPill">
                        EN COURS
                      </div>
                    </div>
                  </div>

                  <div className="clWorkspace">
                    <div className="clWorkspaceHeader">
                      <h2>
                        {templates.find(
                          (item) => item.id === selectedRun.setup_id
                        )?.name || 'Set Up'}
                      </h2>

                      <div className="clWorkspaceActions">
                        <button
                          type="button"
                          onClick={() => setAllRunLines(true)}
                        >
                          ✓ Tout cocher
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllRunLines(false)}
                        >
                          □ Tout décocher
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={resetRun}
                        >
                          ↻ Réinitialiser
                        </button>
                      </div>
                    </div>

                    <div className="clCategoryGrid">
                      {runGroups.map(renderRunCard)}
                    </div>

                    <div className="clSignatureBar">
                      <div className="clInfoDot">i</div>
                      <div className="clSignatureInfo">
                        La signature sera disponible
                        <br />
                        une fois 100% des éléments cochés.
                      </div>

                      <button
                        type="button"
                        className="clSignatureButton"
                        disabled={!canSign}
                        onClick={() => setSignatureOpen(true)}
                      >
                        <span>✎</span>
                        <span>
                          <strong>Signature</strong>
                          <small>
                            {canSign
                              ? 'Disponible'
                              : `Indisponible (${progress}%)`}
                          </small>
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </>
      ) : tab === 'historique' ? (
        <div className="clHistoryGrid">
          {signedRuns.length === 0 ? (
            <Card>Aucun set up signé.</Card>
          ) : (
            signedRuns.map((run) => {
              const template = templates.find(
                (item) => item.id === run.setup_id
              )
              return (
                <Card key={run.id}>
                  <div className="clHistoryHeader">
                    <div>
                      <span className="clHistoryEyebrow">SIGNÉ</span>
                      <h3>{template?.name || 'Set Up'}</h3>
                    </div>
                    <Badge tone="good">Terminé</Badge>
                  </div>

                  <div className="clHistoryMeta">
                    <div>
                      <span>Barman</span>
                      <strong>{run.bartender_name}</strong>
                    </div>
                    <div>
                      <span>Début</span>
                      <strong>
                        {formatDate(run.started_at)} ·{' '}
                        {formatTime(run.started_at)}
                      </strong>
                    </div>
                    <div>
                      <span>Fin</span>
                      <strong>
                        {formatDate(run.completed_at)} ·{' '}
                        {formatTime(run.completed_at)}
                      </strong>
                    </div>
                  </div>

                  {run.signature_data && (
                    <div className="clHistorySignature">
                      <span>Signature</span>
                      <img
                        src={run.signature_data}
                        alt="Signature"
                      />
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      ) : (
        <div className="clModelsGrid">
          <div>
            <Card>
              <h3>Créer un Set Up</h3>
              <div className="clFormRow">
                <input
                  value={newSetupName}
                  onChange={(event) =>
                    setNewSetupName(event.target.value)
                  }
                  placeholder="Nom du Set Up"
                />
                <button
                  className="clPrimaryButton"
                  onClick={createTemplate}
                >
                  + Créer
                </button>
              </div>
            </Card>

            <Card>
              <h3>Modèles existants</h3>
              <div className="clTemplateList">
                {templates.map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    className={
                      selectedTemplateId === template.id
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setSelectedTemplateId(template.id)
                    }
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <h3>Catégories</h3>
              <div className="clFormRow">
                <input
                  value={newCategoryName}
                  onChange={(event) =>
                    setNewCategoryName(event.target.value)
                  }
                  placeholder="Nouvelle catégorie"
                />
                <button onClick={createCategory}>
                  + Ajouter
                </button>
              </div>

              <div className="clCategoryAdminList">
                {categories.map((category) => (
                  <div key={category.id}>
                    <span
                      className={`clAdminDot tone-${categoryTone(
                        category.name
                      )}`}
                    />
                    <strong>{category.name}</strong>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div>
            {!selectedTemplate ? (
              <Card>Sélectionne un modèle.</Card>
            ) : (
              <>
                <Card>
                  <div className="clModelTop">
                    <div>
                      <span>MODÈLE DE SET UP</span>
                      <h2>{selectedTemplate.name}</h2>
                    </div>
                  </div>

                  <div className="clStartRow">
                    <input
                      value={bartenderName}
                      onChange={(event) =>
                        setBartenderName(event.target.value)
                      }
                      placeholder="Nom du barman"
                    />
                    <button
                      className="clPrimaryButton"
                      onClick={startRun}
                    >
                      Démarrer la check-list
                    </button>
                  </div>
                </Card>

                <Card>
                  <h3>Ajouter une ligne</h3>
                  <div className="clAddLineRow">
                    <select
                      value={newLineCategoryId}
                      onChange={(event) =>
                        setNewLineCategoryId(event.target.value)
                      }
                    >
                      {categories.map((category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={newLineLabel}
                      onChange={(event) =>
                        setNewLineLabel(event.target.value)
                      }
                      placeholder="Élément"
                    />
                    <input
                      type="number"
                      min="0"
                      value={newLineQuantity}
                      onChange={(event) =>
                        setNewLineQuantity(
                          Number(event.target.value)
                        )
                      }
                      placeholder="Qté"
                    />
                    <button
                      className="clPrimaryButton"
                      onClick={addTemplateLine}
                    >
                      + Ajouter
                    </button>
                  </div>
                </Card>

                <div className="clTemplateCategoryGrid">
                  {templateGroups.map(({ category, lines }) => (
                    <section
                      className={`clCategoryCard tone-${categoryTone(
                        category.name
                      )}`}
                      key={category.id}
                    >
                      <div className="clCategoryCardHeader">
                        <div className="clCategoryIcon">
                          {categoryIcon(category.name)}
                        </div>
                        <strong>{category.name}</strong>
                      </div>

                      <div className="clTemplateLines">
                        {lines.map((line) => {
                          const editing =
                            editingLineId === line.id

                          return (
                            <div
                              className="clTemplateLine"
                              key={line.id}
                            >
                              {editing ? (
                                <>
                                  <select
                                    value={editingCategoryId}
                                    onChange={(event) =>
                                      setEditingCategoryId(
                                        event.target.value
                                      )
                                    }
                                  >
                                    {categories.map((item) => (
                                      <option
                                        key={item.id}
                                        value={item.id}
                                      >
                                        {item.name}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    value={editingLabel}
                                    onChange={(event) =>
                                      setEditingLabel(
                                        event.target.value
                                      )
                                    }
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    value={editingQuantity}
                                    onChange={(event) =>
                                      setEditingQuantity(
                                        Number(event.target.value)
                                      )
                                    }
                                  />
                                  <button onClick={saveEditLine}>
                                    Enregistrer
                                  </button>
                                  <button
                                    onClick={() =>
                                      setEditingLineId('')
                                    }
                                  >
                                    Annuler
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span>{line.label}</span>
                                  <strong>
                                    {line.quantity.toLocaleString(
                                      'fr-FR'
                                    )}
                                  </strong>
                                  <button
                                    onClick={() =>
                                      startEditLine(line)
                                    }
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    onClick={() =>
                                      deleteTemplateLine(line)
                                    }
                                  >
                                    Supprimer
                                  </button>
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {signatureOpen && selectedRun && (
        <div className="clModalBackdrop">
          <div className="clModal">
            <h2>Signature finale</h2>
            <p>
              Tous les éléments sont cochés.{' '}
              {selectedRun.bartender_name} peut signer.
            </p>

            <canvas
              ref={canvasRef}
              className="clSignatureCanvas"
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              onPointerLeave={stopDrawing}
            />

            <div className="clModalActions">
              <button onClick={clearSignature}>Effacer</button>
              <button onClick={() => setSignatureOpen(false)}>
                Annuler
              </button>
              <button
                className="clPrimaryButton"
                onClick={signAndClose}
              >
                Signer et clôturer
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .clPageToolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
          border-bottom: 1px solid #e8edf3;
        }

        .clTabs {
          display: flex;
          gap: 26px;
          align-items: center;
        }

        .clTabs button {
          height: 48px;
          border: 0;
          border-bottom: 2px solid transparent;
          background: transparent;
          color: #475467;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
        }

        .clTabs button.active {
          color: #155eef;
          border-bottom-color: #155eef;
        }

        .clPrimaryButton {
          min-height: 40px;
          padding: 0 14px;
          border: 0;
          border-radius: 8px;
          background: #155eef;
          color: #fff;
          cursor: pointer;
          font-weight: 800;
        }

        .clNotice {
          margin-bottom: 14px;
          padding: 10px 12px;
          border: 1px solid #abefc6;
          border-radius: 10px;
          background: #ecfdf3;
          color: #067647;
          font-size: 12px;
          font-weight: 700;
        }

        .clRunSelector {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .clRunSelector button {
          min-height: 38px;
          border: 1px solid #d0d5dd;
          border-radius: 8px;
          background: #fff;
          padding: 0 12px;
          cursor: pointer;
          font-weight: 700;
        }

        .clRunSelector button.active {
          background: #101828;
          color: #fff;
          border-color: #101828;
        }

        .clSummaryGrid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.1fr)
            minmax(0, .9fr)
            minmax(0, .95fr)
            minmax(0, .9fr)
            minmax(0, .8fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .clSummaryCard {
          min-height: 126px;
          border: 1px solid #e4e7ec;
          border-radius: 10px;
          background: #fff;
          padding: 16px;
          box-shadow: 0 2px 4px rgba(16,24,40,.02);
        }

        .clSummaryCard > span {
          display: block;
          color: #475467;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 14px;
        }

        .clSummaryCard > strong {
          display: block;
          color: #101828;
          font-size: 18px;
          font-weight: 900;
        }

        .clSummaryCard > button {
          margin-top: 14px;
          min-height: 34px;
          width: 100%;
          border: 1px solid #d0d5dd;
          border-radius: 7px;
          background: #fff;
          cursor: pointer;
          font-weight: 700;
        }

        .clSummaryValue {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 42px;
        }

        .clSummaryValue b {
          width: 28px;
          text-align: center;
          font-size: 18px;
        }

        .clSummaryValue strong,
        .clSummaryValue small {
          display: block;
        }

        .clSummaryValue small {
          margin-top: 3px;
          font-size: 12px;
          color: #344054;
          font-weight: 700;
        }

        .clBigNumber {
          font-size: 24px !important;
        }

        .clSummaryProgress {
          height: 8px;
          margin-top: 15px;
          background: #f2f4f7;
          border-radius: 999px;
          overflow: hidden;
        }

        .clSummaryProgress > div {
          height: 100%;
          background: #155eef;
        }

        .clStatusPill {
          width: fit-content;
          min-width: 112px;
          padding: 8px 14px;
          border-radius: 8px;
          background: #ffead5;
          color: #c4320a;
          text-align: center;
          font-size: 12px;
          font-weight: 900;
        }

        .clWorkspace {
          border: 1px solid #e4e7ec;
          border-radius: 12px;
          background: #fff;
          padding: 18px;
        }

        .clWorkspaceHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid #eaecf0;
          margin-bottom: 16px;
        }

        .clWorkspaceHeader h2 {
          margin: 0;
          padding-left: 12px;
          border-left: 3px solid #155eef;
          font-size: 20px;
        }

        .clWorkspaceActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .clWorkspaceActions button {
          min-height: 34px;
          padding: 0 12px;
          border: 1px solid #d0d5dd;
          border-radius: 7px;
          background: #fff;
          cursor: pointer;
          font-weight: 700;
        }

        .clWorkspaceActions button.danger {
          color: #d92d20;
        }

        .clCategoryGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 12px;
        }

        .clCategoryCard {
          min-width: 0;
          min-height: 210px;
          border: 1px solid #e4e7ec;
          border-radius: 10px;
          background: #fff;
          padding: 14px;
          display: flex;
          flex-direction: column;
        }

        .clCategoryCardHeader {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 10px;
        }

        .clCategoryIcon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          font-size: 17px;
          font-weight: 900;
        }

        .tone-blue .clCategoryIcon {
          background: #eaf2ff;
          color: #155eef;
        }
        .tone-green .clCategoryIcon {
          background: #eafaf1;
          color: #039855;
        }
        .tone-orange .clCategoryIcon {
          background: #fff0e0;
          color: #f79009;
        }
        .tone-cyan .clCategoryIcon {
          background: #e6fbfb;
          color: #0e9384;
        }
        .tone-sky .clCategoryIcon {
          background: #eaf4ff;
          color: #1570ef;
        }
        .tone-pink .clCategoryIcon {
          background: #fce7f6;
          color: #c11574;
        }
        .tone-purple .clCategoryIcon {
          background: #f4ebff;
          color: #7f56d9;
        }

        .clCategoryCardHeader strong {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .02em;
        }

        .clCategoryItems {
          flex: 1;
        }

        .clCategoryItem {
          width: 100%;
          min-height: 38px;
          display: grid;
          grid-template-columns: 24px minmax(0,1fr) auto;
          align-items: center;
          gap: 8px;
          border: 0;
          border-bottom: 1px solid #f2f4f7;
          background: transparent;
          cursor: pointer;
          text-align: left;
          padding: 0;
        }

        .clCategoryItem.done .clItemLabel {
          text-decoration: line-through;
          color: #98a2b3;
        }

        .clMiniCheck {
          width: 16px;
          height: 16px;
          border: 1px solid #b9c2cf;
          border-radius: 3px;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 900;
          color: #fff;
        }

        .clCategoryItem.done .clMiniCheck {
          background: #155eef;
          border-color: #155eef;
        }

        .clItemLabel {
          font-size: 12px;
          color: #344054;
        }

        .clItemQty {
          color: #155eef;
          font-size: 12px;
          font-weight: 900;
        }

        .clCategoryFooter {
          display: grid;
          grid-template-columns: auto minmax(0,1fr) auto;
          gap: 8px;
          align-items: center;
          margin-top: 12px;
          color: #475467;
          font-size: 10px;
        }

        .clMiniProgress {
          height: 5px;
          background: #f2f4f7;
          border-radius: 999px;
          overflow: hidden;
        }

        .clMiniProgress > div {
          height: 100%;
          background: #155eef;
        }

        .clSignatureBar {
          display: grid;
          grid-template-columns: 26px minmax(0,1fr) 360px;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          border: 1px solid #e4e7ec;
          border-radius: 10px;
          padding: 14px;
          background: #fff;
        }

        .clInfoDot {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #2e90fa;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
        }

        .clSignatureInfo {
          color: #475467;
          font-size: 11px;
          line-height: 1.45;
        }

        .clSignatureButton {
          min-height: 54px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 0;
          border-radius: 8px;
          padding: 0 16px;
          background: #f2f4f7;
          color: #667085;
          text-align: left;
        }

        .clSignatureButton:not(:disabled) {
          background: #155eef;
          color: #fff;
          cursor: pointer;
        }

        .clSignatureButton span > strong,
        .clSignatureButton span > small {
          display: block;
        }

        .clSignatureButton small {
          margin-top: 2px;
          font-size: 10px;
        }

        .clModelsGrid {
          display: grid;
          grid-template-columns: 320px minmax(0,1fr);
          gap: 16px;
          align-items: start;
        }

        .clFormRow,
        .clStartRow,
        .clAddLineRow {
          display: grid;
          gap: 8px;
        }

        .clFormRow {
          grid-template-columns: 1fr auto;
        }

        .clStartRow {
          grid-template-columns: minmax(220px,1fr) auto;
        }

        .clAddLineRow {
          grid-template-columns:
            180px
            minmax(200px,1fr)
            100px
            auto;
        }

        .clFormRow input,
        .clStartRow input,
        .clAddLineRow input,
        .clAddLineRow select,
        .clTemplateLine input,
        .clTemplateLine select {
          min-height: 40px;
          width: 100%;
          border: 1px solid #d0d5dd;
          border-radius: 8px;
          background: #fff;
          padding: 0 10px;
          font: inherit;
        }

        .clTemplateList {
          display: grid;
          gap: 6px;
        }

        .clTemplateList button {
          min-height: 40px;
          border: 1px solid #e4e7ec;
          border-radius: 8px;
          background: #fff;
          text-align: left;
          padding: 0 10px;
          cursor: pointer;
          font-weight: 700;
        }

        .clTemplateList button.active {
          background: #101828;
          color: #fff;
        }

        .clCategoryAdminList {
          display: grid;
          gap: 7px;
          margin-top: 12px;
        }

        .clCategoryAdminList > div {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 34px;
        }

        .clAdminDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #98a2b3;
        }

        .clModelTop span {
          color: #667085;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .06em;
        }

        .clModelTop h2 {
          margin: 5px 0 16px;
        }

        .clTemplateCategoryGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 12px;
        }

        .clTemplateLines {
          display: grid;
          gap: 6px;
        }

        .clTemplateLine {
          display: grid;
          grid-template-columns:
            minmax(0,1fr)
            70px
            auto
            auto;
          gap: 6px;
          align-items: center;
          min-height: 36px;
          border-bottom: 1px solid #f2f4f7;
        }

        .clTemplateLine > strong {
          text-align: right;
          color: #155eef;
        }

        .clTemplateLine > button {
          min-height: 30px;
          border: 1px solid #d0d5dd;
          border-radius: 6px;
          background: #fff;
          cursor: pointer;
          font-size: 11px;
        }

        .clHistoryGrid {
          display: grid;
          gap: 12px;
        }

        .clHistoryHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .clHistoryHeader h3 {
          margin: 4px 0 0;
        }

        .clHistoryEyebrow {
          color: #039855;
          font-size: 10px;
          font-weight: 900;
        }

        .clHistoryMeta {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 12px;
          margin-top: 14px;
        }

        .clHistoryMeta span,
        .clHistoryMeta strong {
          display: block;
        }

        .clHistoryMeta span {
          color: #667085;
          font-size: 10px;
          margin-bottom: 4px;
        }

        .clHistorySignature {
          margin-top: 16px;
          border-top: 1px solid #eaecf0;
          padding-top: 12px;
        }

        .clHistorySignature span {
          display: block;
          color: #667085;
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .clHistorySignature img {
          max-width: 320px;
          max-height: 100px;
          object-fit: contain;
          border: 1px solid #e4e7ec;
          border-radius: 8px;
        }

        .clEmptyRun {
          padding: 30px;
          display: grid;
          justify-items: center;
          gap: 10px;
          text-align: center;
        }

        .clEmptyRun span {
          color: #667085;
          font-size: 12px;
        }

        .clModalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 3000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(16,24,40,.72);
        }

        .clModal {
          width: min(720px,100%);
          border-radius: 14px;
          background: #fff;
          padding: 22px;
        }

        .clSignatureCanvas {
          width: 100%;
          height: 220px;
          display: block;
          margin: 16px 0;
          border: 2px dashed #b9c2cf;
          border-radius: 10px;
          background: #fff;
          touch-action: none;
        }

        .clModalActions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .clModalActions button {
          min-height: 38px;
          padding: 0 12px;
          border: 1px solid #d0d5dd;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
          font-weight: 700;
        }

        @media (max-width: 1200px) {
          .clSummaryGrid {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }

          .clCategoryGrid {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }

          .clSignatureBar {
            grid-template-columns: 26px minmax(0,1fr);
          }

          .clSignatureButton {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 900px) {
          .clModelsGrid {
            grid-template-columns: 1fr;
          }

          .clTemplateCategoryGrid,
          .clCategoryGrid {
            grid-template-columns: 1fr;
          }

          .clAddLineRow,
          .clStartRow,
          .clFormRow {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 767px) {
          .clPageToolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .clTabs {
            overflow-x: auto;
            gap: 16px;
          }

          .clSummaryGrid {
            grid-template-columns: 1fr;
          }

          .clWorkspaceHeader {
            align-items: stretch;
            flex-direction: column;
          }

          .clWorkspaceActions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .clSignatureBar {
            grid-template-columns: 22px minmax(0,1fr);
          }

          .clHistoryMeta {
            grid-template-columns: 1fr;
          }

          .clTemplateLine {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Page>
  )
}