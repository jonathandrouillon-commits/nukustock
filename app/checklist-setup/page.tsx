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

type Tab = 'modeles' | 'encours' | 'historique'

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR')
}

function safeNumber(value: unknown) {
  return Math.max(0, Number(value) || 0)
}

export default function ChecklistSetupPage() {
  const [tab, setTab] = useState<Tab>('modeles')
  const [categories, setCategories] = useState<Category[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateLines, setTemplateLines] = useState<TemplateLine[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [runLines, setRunLines] = useState<RunLine[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedRunId, setSelectedRunId] = useState('')
  const [newSetupName, setNewSetupName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newLineLabel, setNewLineLabel] = useState('')
  const [newLineQuantity, setNewLineQuantity] = useState(1)
  const [newLineCategoryId, setNewLineCategoryId] = useState('')
  const [bartenderName, setBartenderName] = useState('')
  const [editingLineId, setEditingLineId] = useState('')
  const [editingLabel, setEditingLabel] = useState('')
  const [editingQuantity, setEditingQuantity] = useState(1)
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [signatureOpen, setSignatureOpen] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)

  const reload = async () => {
    setLoading(true)

    const [
      categoriesResult,
      templatesResult,
      linesResult,
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
      categoriesResult.error ||
      templatesResult.error ||
      linesResult.error ||
      runsResult.error ||
      runLinesResult.error

    if (firstError) {
      setMessage(`Erreur Supabase : ${firstError.message}`)
      setLoading(false)
      return
    }

    const nextCategories = (categoriesResult.data || []) as Category[]
    const nextTemplates = (templatesResult.data || []) as Template[]
    const nextLines = (linesResult.data || []).map((row: any) => ({
      ...row,
      quantity: safeNumber(row.quantity),
    })) as TemplateLine[]
    const nextRuns = (runsResult.data || []) as Run[]
    const nextRunLines = (runLinesResult.data || []).map((row: any) => ({
      ...row,
      quantity: safeNumber(row.quantity),
    })) as RunLine[]

    setCategories(nextCategories)
    setTemplates(nextTemplates)
    setTemplateLines(nextLines)
    setRuns(nextRuns)
    setRunLines(nextRunLines)

    if (!selectedTemplateId && nextTemplates[0]) {
      setSelectedTemplateId(nextTemplates[0].id)
    }

    if (!newLineCategoryId && nextCategories[0]) {
      setNewLineCategoryId(nextCategories[0].id)
    }

    const inProgress = nextRuns.find((run) => run.status === 'in_progress')
    if (!selectedRunId && inProgress) {
      setSelectedRunId(inProgress.id)
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

  const historyRuns = useMemo(
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

  const runCompletedCount = selectedRunLines.filter((line) => line.done).length
  const runTotalCount = selectedRunLines.length
  const runProgress = runTotalCount
    ? Math.round((runCompletedCount / runTotalCount) * 100)
    : 0
  const canSign = !!selectedRun && runTotalCount > 0 && runCompletedCount === runTotalCount

  const linesByCategory = useMemo(() => {
    return categories
      .map((category) => ({
        category,
        lines: selectedTemplateLines.filter(
          (line) => line.category_id === category.id
        ),
      }))
      .filter((group) => group.lines.length > 0)
  }, [categories, selectedTemplateLines])

  const runLinesByCategory = useMemo(() => {
    const names = Array.from(
      new Set(selectedRunLines.map((line) => line.category_name))
    )

    return names.map((name) => ({
      name,
      lines: selectedRunLines.filter((line) => line.category_name === name),
    }))
  }, [selectedRunLines])

  const createCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return

    setSaving(true)
    const { error } = await supabase.from('bar_setup_categories').insert({
      name,
      sort_order: (categories.at(-1)?.sort_order || 0) + 10,
      active: true,
    })
    setSaving(false)

    if (error) {
      setMessage(`Impossible de créer la catégorie : ${error.message}`)
      return
    }

    setNewCategoryName('')
    setMessage(`Catégorie "${name}" créée.`)
    await reload()
  }

  const renameCategory = async (category: Category) => {
    const name = window.prompt('Nouveau nom de catégorie', category.name)?.trim()
    if (!name || name === category.name) return

    const { error } = await supabase
      .from('bar_setup_categories')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', category.id)

    if (error) {
      setMessage(`Impossible de modifier la catégorie : ${error.message}`)
      return
    }

    await reload()
  }

  const deleteCategory = async (category: Category) => {
    const used = templateLines.some((line) => line.category_id === category.id)
    if (used) {
      setMessage(
        `La catégorie "${category.name}" est utilisée par au moins une ligne. Déplace ou supprime d'abord ces lignes.`
      )
      return
    }

    if (!window.confirm(`Supprimer la catégorie "${category.name}" ?`)) return

    const { error } = await supabase
      .from('bar_setup_categories')
      .delete()
      .eq('id', category.id)

    if (error) {
      setMessage(`Impossible de supprimer la catégorie : ${error.message}`)
      return
    }

    await reload()
  }

  const createTemplate = async () => {
    const name = newSetupName.trim()
    if (!name) {
      setMessage('Indique le nom du set up.')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('bar_setup_templates')
      .insert({
        name,
        created_by: user?.id || null,
        active: true,
      })
      .select('id')
      .single()

    if (error) {
      setMessage(`Impossible de créer le set up : ${error.message}`)
      return
    }

    setNewSetupName('')
    setSelectedTemplateId(data.id)
    setMessage(`Set up "${name}" créé.`)
    await reload()
  }

  const renameTemplate = async () => {
    if (!selectedTemplate) return

    const name = window
      .prompt('Nouveau nom du set up', selectedTemplate.name)
      ?.trim()

    if (!name || name === selectedTemplate.name) return

    const { error } = await supabase
      .from('bar_setup_templates')
      .update({
        name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedTemplate.id)

    if (error) {
      setMessage(`Impossible de modifier le set up : ${error.message}`)
      return
    }

    await reload()
  }

  const deleteTemplate = async () => {
    if (!selectedTemplate) return

    const alreadyUsed = runs.some(
      (run) => run.setup_id === selectedTemplate.id
    )

    if (alreadyUsed) {
      if (
        !window.confirm(
          `Ce set up a déjà été utilisé. Le masquer des modèles sans supprimer l'historique ?`
        )
      ) {
        return
      }

      const { error } = await supabase
        .from('bar_setup_templates')
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTemplate.id)

      if (error) {
        setMessage(`Impossible de masquer le set up : ${error.message}`)
        return
      }
    } else {
      if (
        !window.confirm(
          `Supprimer définitivement le set up "${selectedTemplate.name}" ?`
        )
      ) {
        return
      }

      const { error } = await supabase
        .from('bar_setup_templates')
        .delete()
        .eq('id', selectedTemplate.id)

      if (error) {
        setMessage(`Impossible de supprimer le set up : ${error.message}`)
        return
      }
    }

    setSelectedTemplateId('')
    await reload()
  }

  const addTemplateLine = async () => {
    if (!selectedTemplate) return

    const label = newLineLabel.trim()
    if (!label || !newLineCategoryId) {
      setMessage('Renseigne la catégorie et la désignation.')
      return
    }

    const { error } = await supabase.from('bar_setup_template_lines').insert({
      setup_id: selectedTemplate.id,
      category_id: newLineCategoryId,
      label,
      quantity: safeNumber(newLineQuantity),
      sort_order: (selectedTemplateLines.at(-1)?.sort_order || 0) + 10,
      active: true,
    })

    if (error) {
      setMessage(`Impossible d'ajouter la ligne : ${error.message}`)
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
    if (!editingLineId) return

    const label = editingLabel.trim()
    if (!label || !editingCategoryId) return

    const { error } = await supabase
      .from('bar_setup_template_lines')
      .update({
        label,
        category_id: editingCategoryId,
        quantity: safeNumber(editingQuantity),
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingLineId)

    if (error) {
      setMessage(`Impossible de modifier la ligne : ${error.message}`)
      return
    }

    setEditingLineId('')
    await reload()
  }

  const deleteTemplateLine = async (line: TemplateLine) => {
    if (!window.confirm(`Supprimer la ligne "${line.label}" ?`)) return

    const { error } = await supabase
      .from('bar_setup_template_lines')
      .delete()
      .eq('id', line.id)

    if (error) {
      setMessage(`Impossible de supprimer la ligne : ${error.message}`)
      return
    }

    await reload()
  }

  const startRun = async () => {
    if (!selectedTemplate) return

    const name = bartenderName.trim()
    if (!name) {
      setMessage('Le barman doit renseigner son nom.')
      return
    }

    if (!selectedTemplateLines.length) {
      setMessage('Ajoute au moins une ligne au set up avant de le démarrer.')
      return
    }

    setSaving(true)

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
      setSaving(false)
      setMessage(`Impossible de démarrer le set up : ${runError.message}`)
      return
    }

    const categoryById = new Map(
      categories.map((category) => [category.id, category.name])
    )

    const payload = selectedTemplateLines.map((line) => ({
      run_id: run.id,
      template_line_id: line.id,
      category_name: categoryById.get(line.category_id) || 'Sans catégorie',
      label: line.label,
      quantity: line.quantity,
      sort_order: line.sort_order,
      done: false,
    }))

    const { error: linesError } = await supabase
      .from('bar_setup_run_lines')
      .insert(payload)

    setSaving(false)

    if (linesError) {
      await supabase.from('bar_setup_runs').delete().eq('id', run.id)
      setMessage(`Impossible de créer la check-list : ${linesError.message}`)
      return
    }

    setSelectedRunId(run.id)
    setBartenderName('')
    setTab('encours')
    setMessage('Check-list démarrée. Date et heure enregistrées automatiquement.')
    await reload()
  }

  const toggleRunLine = async (line: RunLine) => {
    if (!selectedRun || selectedRun.status !== 'in_progress') return

    const nextDone = !line.done

    const { error } = await supabase
      .from('bar_setup_run_lines')
      .update({
        done: nextDone,
        done_at: nextDone ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', line.id)

    if (error) {
      setMessage(`Impossible de cocher la ligne : ${error.message}`)
      return
    }

    await reload()
  }

  const cancelRun = async () => {
    if (!selectedRun) return

    if (
      !window.confirm(
        `Annuler la check-list de ${selectedRun.bartender_name} ?`
      )
    ) {
      return
    }

    const { error } = await supabase
      .from('bar_setup_runs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedRun.id)

    if (error) {
      setMessage(`Impossible d'annuler : ${error.message}`)
      return
    }

    setSelectedRunId('')
    await reload()
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
    if (signatureOpen) {
      const timer = window.setTimeout(prepareCanvas, 40)
      return () => window.clearTimeout(timer)
    }
  }, [signatureOpen])

  const pointerPosition = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    drawingRef.current = true
    canvas.setPointerCapture(event.pointerId)
    const point = pointerPosition(event)
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
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

    const signatureData = canvas.toDataURL('image/png')
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('bar_setup_runs')
      .update({
        status: 'signed',
        completed_at: now,
        signed_at: now,
        signature_data: signatureData,
        updated_at: now,
      })
      .eq('id', selectedRun.id)

    if (error) {
      setMessage(`Impossible de signer : ${error.message}`)
      return
    }

    setSignatureOpen(false)
    setSelectedRunId('')
    setTab('historique')
    setMessage('Set up signé et clôturé.')
    await reload()
  }

  return (
    <Page
      title="Check List & Set Up"
      subtitle="Préparation Bar Team par catégories, validation à 100 % et signature finale."
    >
      {message && (
        <div className="clNotice">
          {message}
        </div>
      )}

      <div className="clTabs">
        <button
          className={tab === 'modeles' ? 'active' : ''}
          onClick={() => setTab('modeles')}
        >
          Modèles
        </button>
        <button
          className={tab === 'encours' ? 'active' : ''}
          onClick={() => setTab('encours')}
        >
          En cours ({inProgressRuns.length})
        </button>
        <button
          className={tab === 'historique' ? 'active' : ''}
          onClick={() => setTab('historique')}
        >
          Historique ({historyRuns.length})
        </button>
      </div>

      {loading ? (
        <Card>Chargement…</Card>
      ) : tab === 'modeles' ? (
        <div className="clMainGrid">
          <div>
            <Card>
              <h3>Catégories</h3>
              <div className="clInline">
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Nouvelle catégorie"
                />
                <button className="button" onClick={createCategory}>
                  + Ajouter
                </button>
              </div>

              <div className="clCategoryList">
                {categories.map((category) => (
                  <div className="clCategoryRow" key={category.id}>
                    <span>{category.name}</span>
                    <div>
                      <button onClick={() => renameCategory(category)}>
                        Modifier
                      </button>
                      <button onClick={() => deleteCategory(category)}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3>Créer un set up</h3>
              <div className="clInline">
                <input
                  value={newSetupName}
                  onChange={(event) => setNewSetupName(event.target.value)}
                  placeholder="Nom du set up"
                />
                <button className="button" onClick={createTemplate}>
                  + Créer
                </button>
              </div>
            </Card>

            <Card>
              <h3>Mes set up</h3>
              <div className="clSetupList">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    className={
                      selectedTemplateId === template.id ? 'active' : ''
                    }
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div>
            {!selectedTemplate ? (
              <Card>Sélectionne ou crée un set up.</Card>
            ) : (
              <>
                <Card>
                  <div className="clHeaderRow">
                    <div>
                      <span className="clEyebrow">MODÈLE</span>
                      <h2>{selectedTemplate.name}</h2>
                    </div>
                    <div className="clActions">
                      <button className="button secondary" onClick={renameTemplate}>
                        Renommer
                      </button>
                      <button className="button secondary" onClick={deleteTemplate}>
                        Supprimer
                      </button>
                    </div>
                  </div>

                  <div className="clStartRun">
                    <input
                      value={bartenderName}
                      onChange={(event) => setBartenderName(event.target.value)}
                      placeholder="Nom du barman"
                    />
                    <button
                      className="button"
                      onClick={startRun}
                      disabled={saving}
                    >
                      Démarrer la check-list
                    </button>
                  </div>
                  <small>
                    La date et l'heure de début seront enregistrées automatiquement.
                  </small>
                </Card>

                <Card>
                  <h3>Ajouter une ligne</h3>
                  <div className="clAddLine">
                    <select
                      value={newLineCategoryId}
                      onChange={(event) =>
                        setNewLineCategoryId(event.target.value)
                      }
                    >
                      {categories.map((category) => (
                        <option value={category.id} key={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={newLineLabel}
                      onChange={(event) => setNewLineLabel(event.target.value)}
                      placeholder="Désignation"
                    />
                    <input
                      type="number"
                      min="0"
                      value={newLineQuantity}
                      onChange={(event) =>
                        setNewLineQuantity(Number(event.target.value))
                      }
                      placeholder="Qté"
                    />
                    <button className="button" onClick={addTemplateLine}>
                      + Ajouter
                    </button>
                  </div>
                </Card>

                {linesByCategory.length === 0 ? (
                  <Card>Aucune ligne dans ce set up.</Card>
                ) : (
                  linesByCategory.map(({ category, lines }) => (
                    <Card key={category.id}>
                      <div className="clCategoryTitle">
                        {category.name}
                        <Badge tone="info">{lines.length}</Badge>
                      </div>

                      <div className="clLines">
                        {lines.map((line) => {
                          const editing = editingLineId === line.id

                          return (
                            <div className="clLine" key={line.id}>
                              {editing ? (
                                <>
                                  <select
                                    value={editingCategoryId}
                                    onChange={(event) =>
                                      setEditingCategoryId(event.target.value)
                                    }
                                  >
                                    {categories.map((item) => (
                                      <option key={item.id} value={item.id}>
                                        {item.name}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    value={editingLabel}
                                    onChange={(event) =>
                                      setEditingLabel(event.target.value)
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
                                  <button onClick={saveEditLine}>Enregistrer</button>
                                  <button onClick={() => setEditingLineId('')}>
                                    Annuler
                                  </button>
                                </>
                              ) : (
                                <>
                                  <div className="clLineName">
                                    <strong>{line.label}</strong>
                                    <small>
                                      Quantité :{' '}
                                      {line.quantity.toLocaleString('fr-FR')}
                                    </small>
                                  </div>
                                  <button onClick={() => startEditLine(line)}>
                                    Modifier
                                  </button>
                                  <button
                                    onClick={() => deleteTemplateLine(line)}
                                  >
                                    Supprimer
                                  </button>
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      ) : tab === 'encours' ? (
        <div className="clMainGrid">
          <Card>
            <h3>Check-lists en cours</h3>
            <div className="clSetupList">
              {inProgressRuns.map((run) => {
                const template = templates.find(
                  (item) => item.id === run.setup_id
                )
                return (
                  <button
                    key={run.id}
                    className={selectedRunId === run.id ? 'active' : ''}
                    onClick={() => setSelectedRunId(run.id)}
                  >
                    <strong>{template?.name || 'Set up'}</strong>
                    <small>
                      {run.bartender_name} · {formatDateTime(run.started_at)}
                    </small>
                  </button>
                )
              })}
            </div>
          </Card>

          {!selectedRun ? (
            <Card>Aucune check-list sélectionnée.</Card>
          ) : (
            <div>
              <Card>
                <div className="clHeaderRow">
                  <div>
                    <span className="clEyebrow">EN COURS</span>
                    <h2>
                      {templates.find(
                        (item) => item.id === selectedRun.setup_id
                      )?.name || 'Set up'}
                    </h2>
                    <div className="clMeta">
                      Barman : <strong>{selectedRun.bartender_name}</strong>
                      <br />
                      Début : {formatDateTime(selectedRun.started_at)}
                    </div>
                  </div>
                  <button className="button secondary" onClick={cancelRun}>
                    Annuler
                  </button>
                </div>

                <div className="clProgress">
                  <div style={{ width: `${runProgress}%` }} />
                </div>
                <div className="clProgressText">
                  <span>
                    {runCompletedCount} / {runTotalCount} terminé
                    {runCompletedCount > 1 ? 's' : ''}
                  </span>
                  <strong>{runProgress}%</strong>
                </div>

                <button
                  className="button clSignButton"
                  disabled={!canSign}
                  onClick={() => setSignatureOpen(true)}
                >
                  {canSign
                    ? 'Signer et clôturer'
                    : 'Signature disponible à 100 %'}
                </button>
              </Card>

              {runLinesByCategory.map((group) => (
                <Card key={group.name}>
                  <div className="clCategoryTitle">
                    {group.name}
                    <Badge tone="info">{group.lines.length}</Badge>
                  </div>

                  <div className="clRunLines">
                    {group.lines.map((line) => (
                      <button
                        key={line.id}
                        className={`clRunLine ${line.done ? 'done' : ''}`}
                        onClick={() => toggleRunLine(line)}
                      >
                        <span className="clCheck">
                          {line.done ? '✓' : ''}
                        </span>
                        <span>
                          <strong>{line.label}</strong>
                          <small>
                            Quantité : {line.quantity.toLocaleString('fr-FR')}
                          </small>
                        </span>
                        <Badge tone={line.done ? 'good' : 'warn'}>
                          {line.done ? 'Fait' : 'À faire'}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="clHistory">
          {historyRuns.length === 0 ? (
            <Card>Aucun set up signé pour le moment.</Card>
          ) : (
            historyRuns.map((run) => {
              const template = templates.find(
                (item) => item.id === run.setup_id
              )
              const lines = runLines.filter(
                (line) => line.run_id === run.id
              )

              return (
                <Card key={run.id}>
                  <div className="clHeaderRow">
                    <div>
                      <span className="clEyebrow">SIGNÉ</span>
                      <h2>{template?.name || 'Set up'}</h2>
                      <div className="clMeta">
                        Barman : <strong>{run.bartender_name}</strong>
                        <br />
                        Début : {formatDateTime(run.started_at)}
                        <br />
                        Fin : {formatDateTime(run.completed_at)}
                      </div>
                    </div>

                    <div className="clHistoryRight">
                      <Badge tone="good">Terminé</Badge>
                      <div>
                        {lines.length} / {lines.length} lignes
                      </div>
                    </div>
                  </div>

                  {run.signature_data && (
                    <div className="clSignatureHistory">
                      <span>Signature</span>
                      <img src={run.signature_data} alt="Signature du barman" />
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      )}

      {signatureOpen && selectedRun && (
        <div className="clModalBackdrop">
          <div className="clModal">
            <h2>Signature finale</h2>
            <p>
              Toutes les lignes sont cochées. {selectedRun.bartender_name} peut
              maintenant signer et clôturer le set up.
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

            <div className="clActions">
              <button className="button secondary" onClick={clearSignature}>
                Effacer
              </button>
              <button
                className="button secondary"
                onClick={() => setSignatureOpen(false)}
              >
                Annuler
              </button>
              <button className="button" onClick={signAndClose}>
                Signer et clôturer
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .clNotice {
          margin-bottom: 14px;
          padding: 11px 13px;
          border-radius: 10px;
          background: #ecfdf3;
          border: 1px solid #abefc6;
          color: #067647;
          font-size: 13px;
          font-weight: 700;
        }

        .clTabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .clTabs button,
        .clSetupList button,
        .clCategoryRow button,
        .clLine button {
          border: 1px solid #d0d5dd;
          background: #fff;
          border-radius: 9px;
          min-height: 38px;
          padding: 0 11px;
          cursor: pointer;
          font-weight: 700;
        }

        .clTabs button.active,
        .clSetupList button.active {
          background: #101828;
          color: #fff;
          border-color: #101828;
        }

        .clMainGrid {
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }

        .clMainGrid > div,
        .clHistory {
          min-width: 0;
        }

        .clInline,
        .clStartRun,
        .clAddLine {
          display: grid;
          gap: 8px;
        }

        .clInline {
          grid-template-columns: 1fr auto;
        }

        .clStartRun {
          grid-template-columns: minmax(220px, 1fr) auto;
          margin-top: 14px;
        }

        .clAddLine {
          grid-template-columns: 180px minmax(220px,1fr) 100px auto;
        }

        .clInline input,
        .clStartRun input,
        .clAddLine input,
        .clAddLine select,
        .clLine input,
        .clLine select {
          width: 100%;
          min-height: 42px;
          border: 1px solid #d0d5dd;
          border-radius: 9px;
          background: #fff;
          color: #101828;
          padding: 0 11px;
          font: inherit;
        }

        .clCategoryList,
        .clSetupList,
        .clLines,
        .clRunLines,
        .clHistory {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        .clCategoryRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border: 1px solid #eaecf0;
          border-radius: 10px;
        }

        .clCategoryRow > div {
          display: flex;
          gap: 5px;
        }

        .clSetupList button {
          text-align: left;
          display: grid;
          gap: 3px;
          padding: 9px 11px;
          height: auto;
        }

        .clSetupList small {
          color: #667085;
        }

        .clSetupList button.active small {
          color: #d0d5dd;
        }

        .clHeaderRow {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
        }

        .clHeaderRow h2 {
          margin: 4px 0;
        }

        .clEyebrow {
          font-size: 11px;
          font-weight: 800;
          color: #667085;
          letter-spacing: .06em;
        }

        .clActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .clCategoryTitle {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .clLine {
          display: grid;
          grid-template-columns: minmax(0,1fr) auto auto;
          gap: 8px;
          align-items: center;
          padding: 10px;
          border: 1px solid #eaecf0;
          border-radius: 10px;
        }

        .clLine:has(input) {
          grid-template-columns: 180px minmax(180px,1fr) 100px auto auto;
        }

        .clLineName {
          min-width: 0;
        }

        .clLineName strong,
        .clLineName small {
          display: block;
        }

        .clLineName small,
        .clMeta {
          color: #667085;
          font-size: 12px;
          margin-top: 4px;
          line-height: 1.5;
        }

        .clProgress {
          height: 10px;
          margin-top: 18px;
          background: #eaecf0;
          border-radius: 999px;
          overflow: hidden;
        }

        .clProgress > div {
          height: 100%;
          background: #101828;
          transition: width 180ms ease;
        }

        .clProgressText {
          display: flex;
          justify-content: space-between;
          margin-top: 7px;
          font-size: 12px;
        }

        .clSignButton {
          width: 100%;
          margin-top: 16px;
        }

        .clSignButton:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .clRunLine {
          width: 100%;
          display: grid;
          grid-template-columns: 42px minmax(0,1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border: 1px solid #eaecf0;
          border-radius: 11px;
          background: #fff;
          text-align: left;
          cursor: pointer;
        }

        .clRunLine.done {
          background: #f6fef9;
          border-color: #abefc6;
        }

        .clRunLine.done strong {
          text-decoration: line-through;
          color: #667085;
        }

        .clRunLine small {
          display: block;
          color: #667085;
          margin-top: 3px;
        }

        .clCheck {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          border: 2px solid #98a2b3;
          font-size: 20px;
          font-weight: 900;
        }

        .clRunLine.done .clCheck {
          background: #101828;
          color: #fff;
          border-color: #101828;
        }

        .clHistoryRight {
          text-align: right;
          display: grid;
          gap: 8px;
          justify-items: end;
          font-size: 12px;
        }

        .clSignatureHistory {
          margin-top: 16px;
          border-top: 1px solid #eaecf0;
          padding-top: 12px;
        }

        .clSignatureHistory span {
          display: block;
          color: #667085;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 5px;
        }

        .clSignatureHistory img {
          max-width: 320px;
          max-height: 100px;
          object-fit: contain;
          background: #fff;
          border: 1px solid #eaecf0;
          border-radius: 8px;
        }

        .clModalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(0,0,0,.7);
          display: grid;
          place-items: center;
          padding: 20px;
        }

        .clModal {
          width: min(720px,100%);
          background: #fff;
          color: #101828;
          border-radius: 16px;
          padding: 22px;
        }

        .clModal h2 {
          margin: 0 0 8px;
        }

        .clSignatureCanvas {
          display: block;
          width: 100%;
          height: 220px;
          margin: 18px 0;
          border: 2px dashed #98a2b3;
          border-radius: 12px;
          background: #fff;
          touch-action: none;
          cursor: crosshair;
        }

        @media (max-width: 1000px) {
          .clMainGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 767px) {
          .clInline,
          .clStartRun,
          .clAddLine,
          .clLine,
          .clLine:has(input) {
            grid-template-columns: 1fr;
          }

          .clRunLine {
            grid-template-columns: 42px minmax(0,1fr);
          }

          .clRunLine > :last-child {
            grid-column: 2;
            justify-self: start;
          }
        }
      `}</style>
    </Page>
  )
}