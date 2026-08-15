'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

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
    } catch {}
  }, [storageKey])

  const update = (next: string[]) => {
    setVisible(next)
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {}
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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const qrKeys = useMemo(
    () => columns.filter((column) => column.qr).map((column) => column.key),
    [columns]
  )

  useEffect(() => {
    if (!open) return

    const close = (event: MouseEvent) => {
      const target = event.target as Node
      const insidePanel = panelRef.current?.contains(target)
      const insideTrigger = triggerRef.current?.contains(target)
      if (!insidePanel && !insideTrigger) setOpen(false)
    }

    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', closeEscape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const mobile = window.matchMedia('(max-width: 767px)').matches
    if (!mobile) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const toggle = (key: string) => {
    onChange(
      visible.includes(key)
        ? visible.filter((item) => item !== key)
        : [...visible, key]
    )
  }

  const panel = open ? (
    <div
      className="columnVisibilityBackdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) setOpen(false)
      }}
    >
      <div
        ref={panelRef}
        className="columnVisibilityPanel"
        role="dialog"
        aria-modal="true"
        aria-label="Colonnes visibles"
      >
        <div className="columnVisibilityHead">
          <div>
            <div className="columnVisibilityTitle">Colonnes visibles</div>
            <div className="columnVisibilityText">
              Le choix est mémorisé séparément pour cette page.
            </div>
          </div>

          <button
            type="button"
            className="button secondary small columnVisibilityClose"
            onClick={() => setOpen(false)}
          >
            Fermer
          </button>
        </div>

        <div className="columnVisibilityList">
          {columns.map((column) => (
            <label
              key={column.key}
              className={`columnVisibilityRow ${
                visible.includes(column.key) ? 'isVisible' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={visible.includes(column.key)}
                onChange={() => toggle(column.key)}
              />
              <span className="columnVisibilityLabel">{column.label}</span>
              {column.qr && <span className="columnVisibilityQr">QR</span>}
            </label>
          ))}
        </div>

        <div className="columnVisibilityActions">
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
            onClick={() => onChange([...new Set([...visible, ...qrKeys])])}
          >
            Tous les QR
          </button>
          <button
            type="button"
            className="button secondary small"
            onClick={() => onChange(visible.filter((key) => !qrKeys.includes(key)))}
          >
            Masquer QR
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <div className="columnVisibilityTrigger">
        <button
          ref={triggerRef}
          type="button"
          className="button secondary"
          onClick={() => setOpen((current) => !current)}
        >
          ◫ {label}
        </button>
      </div>

      {typeof document !== 'undefined' && panel && createPortal(panel, document.body)}

      <style jsx global>{`
        .columnVisibilityTrigger {
          position: relative;
          display: inline-flex;
          max-width: 100%;
        }

        .columnVisibilityBackdrop {
          position: fixed;
          inset: 0;
          z-index: 9998;
          background: rgba(15, 23, 42, 0.28);
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          padding: 78px 18px 18px;
          box-sizing: border-box;
        }

        .columnVisibilityPanel {
          width: 330px;
          max-width: calc(100vw - 36px);
          max-height: calc(100dvh - 96px);
          overflow-y: auto;
          overflow-x: hidden;
          padding: 14px;
          box-sizing: border-box;
          border: 1px solid #e5e7eb;
          border-radius: 15px;
          background: #fff;
          color: #101828;
          box-shadow: 0 20px 55px rgba(15, 23, 42, 0.18);
          -webkit-overflow-scrolling: touch;
        }

        .columnVisibilityHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .columnVisibilityTitle {
          font-weight: 900;
          margin-bottom: 4px;
        }

        .columnVisibilityText {
          color: #667085;
          font-size: 11px;
          line-height: 1.4;
        }

        .columnVisibilityClose {
          flex: 0 0 auto;
        }

        .columnVisibilityList {
          display: grid;
          gap: 6px;
        }

        .columnVisibilityRow {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 42px;
          padding: 8px 10px;
          box-sizing: border-box;
          border-radius: 9px;
          background: transparent;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .columnVisibilityRow.isVisible {
          background: #f4f7fb;
        }

        .columnVisibilityRow input {
          flex: 0 0 auto;
          width: 18px;
          height: 18px;
          margin: 0;
        }

        .columnVisibilityLabel {
          flex: 1;
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .columnVisibilityQr {
          flex: 0 0 auto;
          font-size: 9px;
          color: #667085;
          font-weight: 900;
        }

        .columnVisibilityActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
          margin-top: 13px;
        }

        .columnVisibilityActions button {
          min-width: 0;
          white-space: normal;
        }

        @media (max-width: 767px) {
          .columnVisibilityBackdrop {
            align-items: stretch;
            justify-content: stretch;
            padding: 0;
            background: rgba(15, 23, 42, 0.48);
          }

          .columnVisibilityPanel {
            position: fixed;
            inset: 0;
            width: 100vw;
            max-width: 100vw;
            height: 100dvh;
            max-height: 100dvh;
            margin: 0;
            padding:
              calc(14px + env(safe-area-inset-top))
              14px
              calc(24px + env(safe-area-inset-bottom));
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .columnVisibilityHead {
            position: sticky;
            top: calc(-14px - env(safe-area-inset-top));
            z-index: 2;
            width: calc(100% + 28px);
            margin:
              calc(-14px - env(safe-area-inset-top))
              -14px
              14px;
            padding:
              calc(14px + env(safe-area-inset-top))
              14px
              12px;
            box-sizing: border-box;
            background: #fff;
            border-bottom: 1px solid #e5e7eb;
          }

          .columnVisibilityTitle {
            font-size: 20px;
            line-height: 1.15;
          }

          .columnVisibilityText {
            margin-top: 4px;
            font-size: 12px;
          }

          .columnVisibilityRow {
            min-height: 54px;
            padding: 10px 12px;
            border-radius: 12px;
            font-size: 15px;
          }

          .columnVisibilityRow input {
            width: 22px;
            height: 22px;
          }

          .columnVisibilityActions {
            position: sticky;
            bottom: calc(-24px - env(safe-area-inset-bottom));
            grid-template-columns: 1fr 1fr;
            width: calc(100% + 28px);
            margin: 16px -14px calc(-24px - env(safe-area-inset-bottom));
            padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
            box-sizing: border-box;
            background: #fff;
            border-top: 1px solid #e5e7eb;
          }

          .columnVisibilityActions button {
            min-height: 46px;
            font-size: 13px;
          }
        }

        @media (max-width: 390px) {
          .columnVisibilityActions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}