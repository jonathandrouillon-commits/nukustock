'use client'

import { useMemo, useState } from 'react'

export type ExportFormat = 'excel' | 'pdf' | 'print'
export type ExportScope = 'current' | 'all'
export type ExportOrientation = 'portrait' | 'landscape'
export type ExportPaperSize = 'a4' | 'a3' | 'letter'
export type ExportScale = 'fit' | '100' | '90' | '80' | '70'

export type ImportExportSettings = {
  format: ExportFormat
  scope: ExportScope
  orientation: ExportOrientation
  paperSize: ExportPaperSize
  scale: ExportScale
  fontSize: number
  showHeader: boolean
  showDate: boolean
  selectedColumns: string[]
}

type ColumnOption = {
  key: string
  label: string
}

type Props = {
  title?: string
  columns?: ColumnOption[]
  defaultColumns?: string[]
  allowExcel?: boolean
  allowPdf?: boolean
  allowPrint?: boolean
  allowImportExcel?: boolean
  onImportExcel?: () => void
  onExport: (settings: ImportExportSettings) => void | Promise<void>
  buttonClassName?: string
}

export function ImportExportMenu({
  title = 'Importer / Exporter',
  columns = [],
  defaultColumns,
  allowExcel = true,
  allowPdf = true,
  allowPrint = true,
  allowImportExcel = false,
  onImportExcel,
  onExport,
  buttonClassName = 'button secondary',
}: Props) {
  const initialColumns = useMemo(
    () =>
      defaultColumns && defaultColumns.length > 0
        ? defaultColumns
        : columns.map((column) => column.key),
    [columns, defaultColumns]
  )

  const defaultFormat: ExportFormat = allowExcel
    ? 'excel'
    : allowPdf
      ? 'pdf'
      : 'print'

  const [open, setOpen] = useState(false)
  const [working, setWorking] = useState(false)
  const [format, setFormat] = useState<ExportFormat>(defaultFormat)
  const [scope, setScope] = useState<ExportScope>('current')
  const [orientation, setOrientation] =
    useState<ExportOrientation>('landscape')
  const [paperSize, setPaperSize] =
    useState<ExportPaperSize>('a4')
  const [scale, setScale] = useState<ExportScale>('fit')
  const [fontSize, setFontSize] = useState(8)
  const [showHeader, setShowHeader] = useState(true)
  const [showDate, setShowDate] = useState(true)
  const [selectedColumns, setSelectedColumns] =
    useState<string[]>(initialColumns)

  const toggleColumn = (key: string) => {
    setSelectedColumns((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    )
  }

  const runExport = async () => {
    if (columns.length > 0 && selectedColumns.length === 0) {
      window.alert('Sélectionne au moins une colonne.')
      return
    }

    try {
      setWorking(true)
      await onExport({
        format,
        scope,
        orientation,
        paperSize,
        scale,
        fontSize,
        showHeader,
        showDate,
        selectedColumns,
      })
      setOpen(false)
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <button
        className={buttonClassName}
        type="button"
        onClick={() => setOpen(true)}
        title={title}
      >
        ↕ {title}
      </button>

      {open && (
        <div
          className="screenOnly"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1400,
            background: 'rgba(15,23,42,.62)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setOpen(false)
            }
          }}
        >
          <div
            style={{
              width: 'min(760px, 100%)',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#fff',
              borderRadius: 18,
              padding: 20,
              boxShadow: '0 24px 80px rgba(15,23,42,.28)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 22 }}>
                  {title}
                </h2>
                <p
                  style={{
                    margin: '5px 0 0',
                    color: '#667085',
                    fontSize: 13,
                  }}
                >
                  Choisis le format, la mise en page et les informations à sortir.
                </p>
              </div>
              <button
                type="button"
                className="button secondary small"
                onClick={() => setOpen(false)}
              >
                Fermer
              </button>
            </div>

            {allowImportExcel && onImportExcel && (
              <div
                style={{
                  paddingBottom: 16,
                  marginBottom: 16,
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: '#475467',
                    marginBottom: 8,
                  }}
                >
                  IMPORTER
                </div>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    onImportExcel()
                  }}
                >
                  Importer Excel / XLS
                </button>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                gap: 12,
              }}
            >
              <label style={labelStyle}>
                Format de sortie
                <select
                  className="input"
                  value={format}
                  onChange={(event) =>
                    setFormat(event.target.value as ExportFormat)
                  }
                >
                  {allowExcel && <option value="excel">Excel / XLSX</option>}
                  {allowPdf && <option value="pdf">PDF</option>}
                  {allowPrint && <option value="print">Imprimer</option>}
                </select>
              </label>

              <label style={labelStyle}>
                Données
                <select
                  className="input"
                  value={scope}
                  onChange={(event) =>
                    setScope(event.target.value as ExportScope)
                  }
                >
                  <option value="current">Affichage / filtres actuels</option>
                  <option value="all">Toutes les données</option>
                </select>
              </label>

              <label style={labelStyle}>
                Orientation
                <select
                  className="input"
                  value={orientation}
                  onChange={(event) =>
                    setOrientation(
                      event.target.value as ExportOrientation
                    )
                  }
                  disabled={format === 'excel'}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Paysage</option>
                </select>
              </label>

              <label style={labelStyle}>
                Papier
                <select
                  className="input"
                  value={paperSize}
                  onChange={(event) =>
                    setPaperSize(event.target.value as ExportPaperSize)
                  }
                  disabled={format === 'excel'}
                >
                  <option value="a4">A4</option>
                  <option value="a3">A3</option>
                  <option value="letter">Letter</option>
                </select>
              </label>

              <label style={labelStyle}>
                Échelle
                <select
                  className="input"
                  value={scale}
                  onChange={(event) =>
                    setScale(event.target.value as ExportScale)
                  }
                  disabled={format === 'excel'}
                >
                  <option value="fit">Ajuster à la page</option>
                  <option value="100">100 %</option>
                  <option value="90">90 %</option>
                  <option value="80">80 %</option>
                  <option value="70">70 %</option>
                </select>
              </label>

              <label style={labelStyle}>
                Taille du texte
                <select
                  className="input"
                  value={fontSize}
                  onChange={(event) =>
                    setFontSize(Number(event.target.value) || 8)
                  }
                  disabled={format === 'excel'}
                >
                  <option value={7}>Petite</option>
                  <option value={8}>Normale</option>
                  <option value={10}>Grande</option>
                  <option value={12}>Très grande</option>
                </select>
              </label>
            </div>

            {format !== 'excel' && (
              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  flexWrap: 'wrap',
                  marginTop: 14,
                }}
              >
                <label style={checkStyle}>
                  <input
                    type="checkbox"
                    checked={showHeader}
                    onChange={(event) => setShowHeader(event.target.checked)}
                  />
                  En-tête NukuStock
                </label>
                <label style={checkStyle}>
                  <input
                    type="checkbox"
                    checked={showDate}
                    onChange={(event) => setShowDate(event.target.checked)}
                  />
                  Date d&apos;édition
                </label>
              </div>
            )}

            {columns.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginBottom: 10,
                  }}
                >
                  <strong style={{ fontSize: 13 }}>Colonnes</strong>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() =>
                        setSelectedColumns(columns.map((column) => column.key))
                      }
                    >
                      Tout
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => setSelectedColumns(initialColumns)}
                    >
                      Réinitialiser
                    </button>
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => setSelectedColumns([])}
                    >
                      Aucun
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
                    gap: 8,
                  }}
                >
                  {columns.map((column) => (
                    <label key={column.key} style={columnStyle}>
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(column.key)}
                        onChange={() => toggleColumn(column.key)}
                      />
                      {column.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 22,
                flexWrap: 'wrap',
              }}
            >
              <button
                className="button secondary"
                type="button"
                onClick={() => setOpen(false)}
                disabled={working}
              >
                Annuler
              </button>
              <button
                className="button"
                type="button"
                onClick={() => void runExport()}
                disabled={working}
              >
                {working
                  ? 'Préparation…'
                  : format === 'print'
                    ? 'Imprimer'
                    : format === 'pdf'
                      ? 'Exporter PDF'
                      : 'Exporter Excel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const labelStyle = {
  display: 'grid',
  gap: 6,
  fontSize: 12,
  fontWeight: 800,
} as const

const checkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  fontWeight: 700,
} as const

const columnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '9px 10px',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
} as const
