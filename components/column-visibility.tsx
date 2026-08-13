'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type DisplayColumn = {
  key: string
  label: string
  qr?: boolean
}

export function useColumnVisibility(
  storageKey: string,
  defaultVisible: string[]
) {
  const [visible, setVisible] = useState<string[]>(defaultVisible)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setVisible(parsed.filter((item) => typeof item === 'string'))
      }
    } catch {
      // On conserve l'affichage par défaut si le stockage local est illisible.
    }
  }, [storageKey])

  const update = (next: string[]) => {
    setVisible(next)
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // L'affichage reste fonctionnel même si localStorage est indisponible.
    }
  }

  const isVisible = (key: string) => visible.includes(key)

  const toggle = (key: string) => {
    update(
      isVisible(key)
        ? visible.filter((item) => item !== key)
        : [...visible, key]
    )
  }

  return {
    visible,
    isVisible,
    toggle,
    setVisible: update,
  }
}

export function ColumnVisibility({
  columns,
  visible,
  onChange,
  essential,
  label = 'Affichage',
}: {
  columns: DisplayColumn[]
  visible: string[]
  onChange: (next: string[]) => void
  essential: string[]
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const qrKeys = useMemo(
    () => columns.filter((column) => column.qr).map((column) => column.key),
    [columns]
  )

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const toggle = (key: string) => {
    onChange(
      visible.includes(key)
        ? visible.filter((item) => item !== key)
        : [...visible, key]
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="button secondary"
        onClick={() => setOpen((current) => !current)}
      >
        ◫ {label}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 400,
            width: 330,
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: '75vh',
            overflowY: 'auto',
            padding: 14,
            border: '1px solid #e5e7eb',
            borderRadius: 15,
            background: '#fff',
            color: '#101828',
            boxShadow: '0 20px 55px rgba(15,23,42,.18)',
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 4 }}>
            Colonnes visibles
          </div>
          <div
            style={{
              color: '#667085',
              fontSize: 11,
              marginBottom: 12,
            }}
          >
            Le choix est mémorisé séparément pour cette page.
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            {columns.map((column) => (
              <label
                key={column.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  minHeight: 36,
                  padding: '6px 8px',
                  borderRadius: 9,
                  background: visible.includes(column.key)
                    ? '#f4f7fb'
                    : 'transparent',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <input
                  type="checkbox"
                  checked={visible.includes(column.key)}
                  onChange={() => toggle(column.key)}
                />
                <span style={{ flex: 1 }}>{column.label}</span>
                {column.qr && (
                  <span
                    style={{
                      fontSize: 9,
                      color: '#667085',
                      fontWeight: 900,
                    }}
                  >
                    QR
                  </span>
                )}
              </label>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 7,
              marginTop: 13,
            }}
          >
            <button
              type="button"
              className="button secondary small"
              onClick={() => onChange(columns.map((column) => column.key))}
            >
              Tout afficher
            </button>
            <button
              type="button"
              className="button secondary small"
              onClick={() => onChange(essential)}
            >
              Essentiel
            </button>
            <button
              type="button"
              className="button secondary small"
              onClick={() =>
                onChange([
                  ...new Set([
                    ...visible,
                    ...qrKeys,
                  ]),
                ])
              }
            >
              Tous les QR
            </button>
            <button
              type="button"
              className="button secondary small"
              onClick={() =>
                onChange(
                  visible.filter((key) => !qrKeys.includes(key))
                )
              }
            >
              Masquer QR
            </button>
          </div>
        </div>
      )}
    </div>
  )
}