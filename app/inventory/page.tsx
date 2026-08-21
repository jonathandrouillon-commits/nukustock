'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { supabase } from '@/lib/supabase'

type ChecklistTask = {
  id: string
  label: string
  section:
    | 'Contrôles'
    | 'Ouverture'
    | 'Préparations'
    | 'Mise en place'
}

type DailyChecklist = {
  date: string
  userId: string
  userName: string
  checked: Record<string, boolean>
  completedCount: number
  totalCount: number
  percent: number
  finishedAt: string | null
  updatedAt: string
}

type Tab =
  | 'opening'
  | 'setup'
  | 'history'

const CHECKLIST_NAME = 'Ouverture Bar'

const STORAGE_KEY =
  'barnuku_opening_checklists_v1'

const TASKS: ChecklistTask[] = [
  {
    id: 'check-fitness',
    label: 'Check Fitness',
    section: 'Contrôles',
  },
  {
    id: 'check-spa-1',
    label: 'Check Spa 1',
    section: 'Contrôles',
  },
  {
    id: 'check-spa-2',
    label: 'Check Spa 2',
    section: 'Contrôles',
  },
  {
    id: 'check-business-center',
    label: 'Check Business Center',
    section: 'Contrôles',
  },
  {
    id: 'check-game-room',
    label: 'Check Game Room',
    section: 'Contrôles',
  },

  {
    id: 'music',
    label: 'Allumage de la musique',
    section: 'Ouverture',
  },
  {
    id: 'lights',
    label: 'Allumage des lumières',
    section: 'Ouverture',
  },
  {
    id: 'glass-machine',
    label: 'Allumage machine à verres',
    section: 'Ouverture',
  },

  {
    id: 'flavoured-water',
    label: 'Préparation eau parfumée',
    section: 'Préparations',
  },
  {
    id: 'lemonade',
    label: 'Préparation citronnade',
    section: 'Préparations',
  },
  {
    id: 'fill-locations',
    label: 'Remplissage lieu',
    section: 'Préparations',
  },
  {
    id: 'fill-ice',
    label: 'Remplissage glace',
    section: 'Préparations',
  },

  {
    id: 'lemon',
    label: 'Citron',
    section: 'Mise en place',
  },
  {
    id: 'orange',
    label: 'Orange',
    section: 'Mise en place',
  },
  {
    id: 'mint',
    label: 'Menthe',
    section: 'Mise en place',
  },
  {
    id: 'basil',
    label: 'Basilic',
    section: 'Mise en place',
  },
  {
    id: 'coconut-cream',
    label: 'Crème de coco',
    section: 'Mise en place',
  },
  {
    id: 'house-syrup',
    label: 'Sirop maison',
    section: 'Mise en place',
  },
  {
    id: 'guy-lemonade',
    label: 'Citronnade Guy',
    section: 'Mise en place',
  },
  {
    id: 'guy-orange-juice',
    label: "Jus d'orange Guy",
    section: 'Mise en place',
  },
  {
    id: 'green-juice',
    label: 'Jus vert',
    section: 'Mise en place',
  },
  {
    id: 'red-juice',
    label: 'Jus rouge',
    section: 'Mise en place',
  },
]

const SECTIONS: ChecklistTask['section'][] = [
  'Contrôles',
  'Ouverture',
  'Préparations',
  'Mise en place',
]

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-')
}

function formatDateFr(value: string) {
  const date = new Date(
    `${value}T12:00:00`
  )

  return new Intl.DateTimeFormat(
    'fr-FR',
    {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }
  ).format(date)
}

function formatTime(value?: string | null) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  return new Intl.DateTimeFormat(
    'fr-FR',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(date)
}

function getStoredHistory():
  DailyChecklist[] {
  if (
    typeof window === 'undefined'
  ) {
    return []
  }

  try {
    const raw =
      window.localStorage.getItem(
        STORAGE_KEY
      )

    if (!raw) {
      return []
    }

    const parsed =
      JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
  } catch {
    return []
  }
}

function saveStoredHistory(
  history: DailyChecklist[]
) {
  if (
    typeof window === 'undefined'
  ) {
    return
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(history)
  )
}

function emptyChecked() {
  return TASKS.reduce<
    Record<string, boolean>
  >(
    (acc, task) => {
      acc[task.id] = false
      return acc
    },
    {}
  )
}

export default function ChecklistSetupPage() {
  const [tab, setTab] =
    useState<Tab>('opening')

  const [today] =
    useState(() => localDateKey())

  const [
    userId,
    setUserId,
  ] = useState('')

  const [
    userName,
    setUserName,
  ] = useState('Utilisateur')

  const [
    checked,
    setChecked,
  ] = useState<
    Record<string, boolean>
  >(emptyChecked)

  const [
    finishedAt,
    setFinishedAt,
  ] = useState<string | null>(
    null
  )

  const [
    history,
    setHistory,
  ] = useState<DailyChecklist[]>(
    []
  )

  const [
    loaded,
    setLoaded,
  ] = useState(false)

  const completedCount =
    useMemo(
      () =>
        TASKS.filter(
          (task) =>
            checked[task.id]
        ).length,
      [checked]
    )

  const percent =
    Math.round(
      (completedCount /
        TASKS.length) *
        100
    )

  const isComplete =
    completedCount === TASKS.length

  useEffect(() => {
    const load = async () => {
      const stored =
        getStoredHistory()

      setHistory(stored)

      try {
        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession()

        const user =
          session?.user

        const nextUserId =
          user?.id || 'local'

        const metadata =
          user?.user_metadata || {}

        const appMetadata =
          user?.app_metadata || {}

        const nextUserName =
          String(
            metadata.full_name ||
              metadata.first_name ||
              appMetadata.employee_name ||
              metadata.email ||
              user?.email ||
              'Utilisateur'
          )
            .trim()
            .toUpperCase()

        setUserId(nextUserId)
        setUserName(nextUserName)

        const current =
          stored.find(
            (item) =>
              item.date === today &&
              item.userId ===
                nextUserId
          )

        if (current) {
          setChecked({
            ...emptyChecked(),
            ...current.checked,
          })

          setFinishedAt(
            current.finishedAt ||
              null
          )
        }
      } finally {
        setLoaded(true)
      }
    }

    void load()
  }, [today])

  useEffect(() => {
    if (!loaded) {
      return
    }

    const now =
      new Date().toISOString()

    const record:
      DailyChecklist = {
      date: today,
      userId:
        userId || 'local',
      userName,
      checked,
      completedCount,
      totalCount:
        TASKS.length,
      percent,
      finishedAt,
      updatedAt: now,
    }

    setHistory(
      (current) => {
        const withoutToday =
          current.filter(
            (item) =>
              !(
                item.date ===
                  today &&
                item.userId ===
                  record.userId
              )
          )

        const next = [
          record,
          ...withoutToday,
        ].sort(
          (a, b) =>
            b.date.localeCompare(
              a.date
            ) ||
            b.updatedAt.localeCompare(
              a.updatedAt
            )
        )

        saveStoredHistory(
          next
        )

        return next
      }
    )
  }, [
    checked,
    completedCount,
    finishedAt,
    loaded,
    percent,
    today,
    userId,
    userName,
  ])

  const toggleTask = (
    taskId: string
  ) => {
    if (finishedAt) {
      return
    }

    setChecked(
      (current) => ({
        ...current,
        [taskId]:
          !current[taskId],
      })
    )
  }

  const finishOpening = () => {
    if (!isComplete) {
      return
    }

    setFinishedAt(
      new Date().toISOString()
    )
  }

  const reopenToday = () => {
    const confirmed =
      window.confirm(
        "Réouvrir la check list d'aujourd'hui pour la modifier ?"
      )

    if (!confirmed) {
      return
    }

    setFinishedAt(null)
  }

  const resetToday = () => {
    const confirmed =
      window.confirm(
        "Réinitialiser toutes les cases de la check list d'aujourd'hui ?"
      )

    if (!confirmed) {
      return
    }

    setChecked(
      emptyChecked()
    )
    setFinishedAt(null)
  }

  const printChecklist = () => {
    window.print()
  }

  const sectionProgress = (
    section:
      ChecklistTask['section']
  ) => {
    const tasks =
      TASKS.filter(
        (task) =>
          task.section === section
      )

    const done =
      tasks.filter(
        (task) =>
          checked[task.id]
      ).length

    return {
      done,
      total: tasks.length,
    }
  }

  return (
    <main className="checklistPage">
      <section className="pageHeader noPrint">
        <div>
          <span className="eyebrow">
            BAR TEAM
          </span>

          <h1>
            Check List & Set Up
          </h1>

          <p>
            Contrôle quotidien de
            l'ouverture du bar et
            suivi des mises en place.
          </p>
        </div>
      </section>

      <nav className="tabs noPrint">
        <button
          type="button"
          className={
            tab === 'opening'
              ? 'active'
              : ''
          }
          onClick={() =>
            setTab('opening')
          }
        >
          ✓ Ouverture Bar
        </button>

        <button
          type="button"
          className={
            tab === 'setup'
              ? 'active'
              : ''
          }
          onClick={() =>
            setTab('setup')
          }
        >
          ▣ SET UP
        </button>

        <button
          type="button"
          className={
            tab === 'history'
              ? 'active'
              : ''
          }
          onClick={() =>
            setTab('history')
          }
        >
          ↺ Historique
        </button>
      </nav>

      {tab === 'opening' && (
        <div
          className="printSheet"
          id="opening-checklist-print"
        >
          <section className="openingHero">
            <div>
              <div className="heroTop">
                <span className="heroEyebrow">
                  NUKUTEPIPI
                </span>

                <span
                  className={`statusBadge ${
                    finishedAt
                      ? 'done'
                      : isComplete
                        ? 'ready'
                        : 'progress'
                  }`}
                >
                  {finishedAt
                    ? 'TERMINÉE'
                    : isComplete
                      ? 'PRÊTE À VALIDER'
                      : 'EN COURS'}
                </span>
              </div>

              <h2>
                {CHECKLIST_NAME}
              </h2>

              <div className="metaGrid">
                <div>
                  <span>
                    Date
                  </span>
                  <strong>
                    {formatDateFr(
                      today
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Réalisé par
                  </span>
                  <strong>
                    {userName}
                  </strong>
                </div>

                <div>
                  <span>
                    Validation
                  </span>
                  <strong>
                    {finishedAt
                      ? formatTime(
                          finishedAt
                        )
                      : 'En attente'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="progressCard">
              <div className="progressTop">
                <span>
                  % de l'ouverture
                </span>

                <strong>
                  {percent}%
                </strong>
              </div>

              <div className="progressTrack">
                <div
                  className="progressFill"
                  style={{
                    width:
                      `${percent}%`,
                  }}
                />
              </div>

              <div className="progressBottom">
                <span>
                  {completedCount} /{' '}
                  {TASKS.length}{' '}
                  tâches réalisées
                </span>

                {percent === 100 && (
                  <b>
                    ✓ Complet
                  </b>
                )}
              </div>
            </div>
          </section>

          <section className="actionsBar noPrint">
            <button
              type="button"
              className="secondaryButton"
              onClick={
                printChecklist
              }
            >
              🖨 Imprimer la Check List
            </button>

            <button
              type="button"
              className="ghostButton"
              onClick={resetToday}
            >
              Réinitialiser
            </button>

            {finishedAt ? (
              <button
                type="button"
                className="secondaryButton"
                onClick={
                  reopenToday
                }
              >
                Réouvrir
              </button>
            ) : (
              <button
                type="button"
                className="primaryButton"
                disabled={!isComplete}
                onClick={
                  finishOpening
                }
              >
                ✓ Terminer l'ouverture
              </button>
            )}
          </section>

          <div className="sectionGrid">
            {SECTIONS.map(
              (section) => {
                const sectionTasks =
                  TASKS.filter(
                    (task) =>
                      task.section ===
                      section
                  )

                const progress =
                  sectionProgress(
                    section
                  )

                return (
                  <section
                    className="taskSection"
                    key={section}
                  >
                    <header>
                      <div>
                        <span className="sectionLabel">
                          {section}
                        </span>

                        <strong>
                          {
                            progress.done
                          }{' '}
                          /{' '}
                          {
                            progress.total
                          }
                        </strong>
                      </div>

                      <div className="sectionTrack">
                        <div
                          style={{
                            width: `${
                              progress.total
                                ? Math.round(
                                    (progress.done /
                                      progress.total) *
                                      100
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </header>

                    <div className="taskList">
                      {sectionTasks.map(
                        (task) => {
                          const done =
                            Boolean(
                              checked[
                                task.id
                              ]
                            )

                          return (
                            <label
                              className={`taskRow ${
                                done
                                  ? 'checked'
                                  : ''
                              } ${
                                finishedAt
                                  ? 'locked'
                                  : ''
                              }`}
                              key={
                                task.id
                              }
                            >
                              <input
                                type="checkbox"
                                checked={
                                  done
                                }
                                disabled={
                                  Boolean(
                                    finishedAt
                                  )
                                }
                                onChange={() =>
                                  toggleTask(
                                    task.id
                                  )
                                }
                              />

                              <span className="visualCheckbox">
                                {done
                                  ? '✓'
                                  : ''}
                              </span>

                              <span className="taskText">
                                {
                                  task.label
                                }
                              </span>
                            </label>
                          )
                        }
                      )}
                    </div>
                  </section>
                )
              }
            )}
          </div>

          <footer className="printFooter">
            <div>
              <span>
                Progression finale
              </span>
              <strong>
                {percent}%
              </strong>
            </div>

            <div>
              <span>
                Tâches réalisées
              </span>
              <strong>
                {completedCount} /{' '}
                {TASKS.length}
              </strong>
            </div>

            <div>
              <span>
                Heure de validation
              </span>
              <strong>
                {finishedAt
                  ? formatTime(
                      finishedAt
                    )
                  : '—'}
              </strong>
            </div>
          </footer>
        </div>
      )}

      {tab === 'setup' && (
        <section className="setupPlaceholder noPrint">
          <div className="placeholderIcon">
            ▣
          </div>

          <h2>SET UP</h2>

          <p>
            Cette zone reste dédiée
            aux fiches et photos de
            mise en place du bar.
          </p>
        </section>
      )}

      {tab === 'history' && (
        <section className="historyPanel noPrint">
          <div className="historyHeader">
            <div>
              <span className="eyebrow">
                HISTORIQUE
              </span>

              <h2>
                Ouvertures Bar
              </h2>
            </div>
          </div>

          <div className="historyTableWrap">
            <table className="historyTable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Personne</th>
                  <th>Progression</th>
                  <th>Statut</th>
                  <th>Validation</th>
                </tr>
              </thead>

              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="emptyCell"
                    >
                      Aucun historique.
                    </td>
                  </tr>
                ) : (
                  history.map(
                    (item) => (
                      <tr
                        key={`${item.date}-${item.userId}`}
                      >
                        <td>
                          {formatDateFr(
                            item.date
                          )}
                        </td>

                        <td>
                          {
                            item.userName
                          }
                        </td>

                        <td>
                          <div className="historyProgress">
                            <div>
                              <span
                                style={{
                                  width: `${item.percent}%`,
                                }}
                              />
                            </div>

                            <strong>
                              {
                                item.percent
                              }
                              %
                            </strong>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`historyStatus ${
                              item.finishedAt
                                ? 'done'
                                : ''
                            }`}
                          >
                            {item.finishedAt
                              ? 'Terminée'
                              : 'En cours'}
                          </span>
                        </td>

                        <td>
                          {item.finishedAt
                            ? formatTime(
                                item.finishedAt
                              )
                            : '—'}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <style jsx>{`
        .checklistPage {
          min-height: 100vh;
          padding: 28px;
          background: #f4f6f9;
          color: #101828;
        }

        .pageHeader {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 18px;
        }

        .eyebrow,
        .heroEyebrow,
        .sectionLabel {
          color: #7f56d9;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .pageHeader h1,
        .historyHeader h2 {
          margin: 5px 0 0;
          font-size: 30px;
          line-height: 1.05;
        }

        .pageHeader p {
          max-width: 680px;
          margin: 8px 0 0;
          color: #667085;
          font-size: 13px;
          line-height: 1.5;
        }

        .tabs {
          display: inline-flex;
          gap: 6px;
          margin-bottom: 18px;
          padding: 6px;
          border: 1px solid #e4e7ec;
          border-radius: 15px;
          background: #fff;
          box-shadow: 0 8px 24px rgba(16,24,40,.05);
        }

        .tabs button {
          min-height: 40px;
          padding: 0 15px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #667085;
          cursor: pointer;
          font-size: 12px;
          font-weight: 850;
        }

        .tabs button.active {
          background: #101828;
          color: #fff;
        }

        .printSheet {
          max-width: 1250px;
          margin: 0 auto;
        }

        .openingHero {
          display: grid;
          grid-template-columns: minmax(0,1fr) 340px;
          gap: 20px;
          padding: 24px;
          border: 1px solid #e4e7ec;
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 12px 36px rgba(16,24,40,.06);
        }

        .heroTop {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .openingHero h2 {
          margin: 8px 0 18px;
          font-size: 31px;
          letter-spacing: -.03em;
        }

        .statusBadge {
          display: inline-flex;
          min-height: 28px;
          align-items: center;
          padding: 0 10px;
          border-radius: 999px;
          background: #f2f4f7;
          color: #475467;
          font-size: 9px;
          font-weight: 900;
        }

        .statusBadge.ready {
          background: #ecfdf3;
          color: #027a48;
        }

        .statusBadge.done {
          background: #e8f8ef;
          color: #067647;
        }

        .metaGrid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 12px;
        }

        .metaGrid > div {
          padding: 12px 14px;
          border-radius: 12px;
          background: #f8fafc;
        }

        .metaGrid span,
        .printFooter span {
          display: block;
          color: #98a2b3;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        .metaGrid strong,
        .printFooter strong {
          display: block;
          margin-top: 4px;
          color: #101828;
          font-size: 12px;
        }

        .progressCard {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 20px;
          border-radius: 18px;
          background: #101828;
          color: #fff;
        }

        .progressTop {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 12px;
        }

        .progressTop span {
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 800;
        }

        .progressTop strong {
          font-size: 42px;
          line-height: .95;
          letter-spacing: -.05em;
        }

        .progressTrack {
          height: 10px;
          margin-top: 18px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.14);
        }

        .progressFill {
          height: 100%;
          border-radius: inherit;
          background: #fff;
          transition: width .2s ease;
        }

        .progressBottom {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 9px;
          color: #cbd5e1;
          font-size: 10px;
        }

        .progressBottom b {
          color: #fff;
        }

        .actionsBar {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin: 14px 0;
          flex-wrap: wrap;
        }

        .actionsBar button {
          min-height: 44px;
          padding: 0 16px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 900;
        }

        .primaryButton {
          border: 1px solid #101828;
          background: #101828;
          color: #fff;
        }

        .primaryButton:disabled {
          cursor: not-allowed;
          opacity: .35;
        }

        .secondaryButton {
          border: 1px solid #d0d5dd;
          background: #fff;
          color: #101828;
        }

        .ghostButton {
          border: 1px solid transparent;
          background: transparent;
          color: #667085;
        }

        .sectionGrid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 14px;
        }

        .taskSection {
          overflow: hidden;
          border: 1px solid #e4e7ec;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 8px 26px rgba(16,24,40,.045);
        }

        .taskSection header {
          display: grid;
          grid-template-columns: minmax(0,1fr) 120px;
          gap: 14px;
          align-items: center;
          padding: 16px 18px;
          border-bottom: 1px solid #eef2f6;
          background: #fbfcfd;
        }

        .taskSection header > div:first-child {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .taskSection header strong {
          color: #667085;
          font-size: 10px;
        }

        .sectionTrack {
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: #eaecf0;
        }

        .sectionTrack div {
          height: 100%;
          border-radius: inherit;
          background: #101828;
          transition: width .2s ease;
        }

        .taskList {
          display: grid;
          padding: 8px;
        }

        .taskRow {
          position: relative;
          display: grid;
          grid-template-columns: 28px minmax(0,1fr);
          gap: 10px;
          align-items: center;
          min-height: 52px;
          padding: 8px 10px;
          border-radius: 11px;
          cursor: pointer;
          transition: background .15s ease;
        }

        .taskRow:hover {
          background: #f8fafc;
        }

        .taskRow.checked {
          background: #f0fdf4;
        }

        .taskRow.locked {
          cursor: default;
        }

        .taskRow input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .visualCheckbox {
          display: grid;
          width: 26px;
          height: 26px;
          place-items: center;
          border: 2px solid #cfd4dc;
          border-radius: 8px;
          background: #fff;
          color: #fff;
          font-size: 14px;
          font-weight: 900;
        }

        .taskRow.checked .visualCheckbox {
          border-color: #067647;
          background: #067647;
        }

        .taskText {
          color: #344054;
          font-size: 12px;
          font-weight: 750;
        }

        .taskRow.checked .taskText {
          color: #067647;
        }

        .printFooter {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 10px;
          margin-top: 14px;
          padding: 16px 18px;
          border: 1px solid #e4e7ec;
          border-radius: 16px;
          background: #fff;
        }

        .setupPlaceholder {
          min-height: 430px;
          display: grid;
          place-items: center;
          align-content: center;
          padding: 40px;
          border: 1px solid #e4e7ec;
          border-radius: 20px;
          background: #fff;
          text-align: center;
        }

        .placeholderIcon {
          display: grid;
          width: 64px;
          height: 64px;
          place-items: center;
          border-radius: 18px;
          background: #f2f4f7;
          color: #101828;
          font-size: 24px;
        }

        .setupPlaceholder h2 {
          margin: 14px 0 4px;
        }

        .setupPlaceholder p {
          max-width: 420px;
          color: #667085;
          line-height: 1.55;
        }

        .historyPanel {
          overflow: hidden;
          border: 1px solid #e4e7ec;
          border-radius: 20px;
          background: #fff;
        }

        .historyHeader {
          padding: 20px 22px;
          border-bottom: 1px solid #eef2f6;
        }

        .historyTableWrap {
          overflow-x: auto;
        }

        .historyTable {
          width: 100%;
          border-collapse: collapse;
        }

        .historyTable th,
        .historyTable td {
          padding: 13px 16px;
          border-bottom: 1px solid #f0f2f5;
          text-align: left;
          white-space: nowrap;
          font-size: 11px;
        }

        .historyTable th {
          color: #667085;
          background: #fafbfc;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        .historyProgress {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .historyProgress > div {
          width: 100px;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: #eaecf0;
        }

        .historyProgress span {
          display: block;
          height: 100%;
          background: #101828;
        }

        .historyProgress strong {
          font-size: 10px;
        }

        .historyStatus {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 999px;
          background: #fff4e5;
          color: #b54708;
          font-size: 9px;
          font-weight: 900;
        }

        .historyStatus.done {
          background: #ecfdf3;
          color: #027a48;
        }

        .emptyCell {
          padding: 40px !important;
          text-align: center !important;
          color: #98a2b3;
        }

        @media (max-width: 900px) {
          .checklistPage {
            padding: 18px;
          }

          .openingHero {
            grid-template-columns: 1fr;
          }

          .sectionGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .checklistPage {
            padding: 12px;
          }

          .pageHeader h1 {
            font-size: 24px;
          }

          .tabs {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr;
          }

          .tabs button {
            width: 100%;
          }

          .openingHero {
            padding: 16px;
            border-radius: 16px;
          }

          .openingHero h2 {
            font-size: 25px;
          }

          .metaGrid,
          .printFooter {
            grid-template-columns: 1fr;
          }

          .actionsBar {
            display: grid;
            grid-template-columns: 1fr;
          }

          .actionsBar button {
            width: 100%;
          }

          .taskSection header {
            grid-template-columns: 1fr;
          }

          .taskRow {
            min-height: 56px;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          :global(body) {
            background: #fff !important;
          }

          :global(.nskSidebar),
          :global(.nskTopbar),
          :global(.nskMobileNav),
          :global(.noPrint) {
            display: none !important;
          }

          :global(.nskMain) {
            margin: 0 !important;
          }

          :global(.nskViewStage),
          :global(.nskViewCanvas) {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            box-shadow: none !important;
          }

          .checklistPage {
            min-height: auto;
            padding: 0;
            background: #fff;
          }

          .printSheet {
            width: 100%;
            max-width: none;
          }

          .openingHero {
            grid-template-columns: 1fr 230px;
            gap: 10px;
            padding: 12px;
            border-radius: 10px;
            box-shadow: none;
            break-inside: avoid;
          }

          .openingHero h2 {
            margin: 4px 0 10px;
            font-size: 21px;
          }

          .metaGrid {
            gap: 5px;
          }

          .metaGrid > div {
            padding: 6px 7px;
          }

          .progressCard {
            padding: 10px;
            border-radius: 10px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .progressTop strong {
            font-size: 28px;
          }

          .sectionGrid {
            grid-template-columns: repeat(2,minmax(0,1fr));
            gap: 7px;
            margin-top: 8px;
          }

          .taskSection {
            border-radius: 9px;
            box-shadow: none;
            break-inside: avoid;
          }

          .taskSection header {
            grid-template-columns: 1fr;
            padding: 7px 9px;
          }

          .sectionTrack {
            display: none;
          }

          .taskList {
            padding: 3px;
          }

          .taskRow {
            min-height: 27px;
            grid-template-columns: 18px minmax(0,1fr);
            gap: 6px;
            padding: 2px 5px;
          }

          .visualCheckbox {
            width: 16px;
            height: 16px;
            border-width: 1px;
            border-radius: 3px;
            font-size: 9px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .taskText {
            font-size: 9px;
          }

          .printFooter {
            gap: 5px;
            margin-top: 7px;
            padding: 8px 10px;
            border-radius: 8px;
            break-inside: avoid;
          }

          .printFooter span {
            font-size: 7px;
          }

          .printFooter strong {
            font-size: 9px;
          }
        }
      `}</style>

      <style jsx global>{`
        .view-phone .checklistPage {
          width: 100% !important;
          max-width: 430px !important;
          min-width: 0 !important;
          margin: 0 auto !important;
          padding: 10px 10px 92px !important;
          overflow-x: hidden !important;
          background: #f4f6f9 !important;
        }

        .view-phone .checklistPage .pageHeader {
          display: block !important;
          margin: 0 0 10px !important;
          padding: 4px 2px 0 !important;
        }

        .view-phone .checklistPage .pageHeader h1 {
          margin-top: 3px !important;
          font-size: 23px !important;
          line-height: 1.05 !important;
        }

        .view-phone .checklistPage .pageHeader p {
          margin-top: 5px !important;
          font-size: 11px !important;
          line-height: 1.4 !important;
        }

        .view-phone .checklistPage .tabs {
          width: 100% !important;
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 4px !important;
          margin: 0 0 10px !important;
          padding: 4px !important;
          border-radius: 13px !important;
        }

        .view-phone .checklistPage .tabs button {
          width: 100% !important;
          min-width: 0 !important;
          min-height: 42px !important;
          padding: 5px 4px !important;
          border-radius: 9px !important;
          font-size: 10px !important;
          line-height: 1.15 !important;
          white-space: normal !important;
        }

        .view-phone .checklistPage .printSheet {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
        }

        .view-phone .checklistPage .openingHero {
          width: 100% !important;
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 10px !important;
          padding: 14px !important;
          border-radius: 17px !important;
          box-shadow: 0 7px 22px rgba(16,24,40,.06) !important;
        }

        .view-phone .checklistPage .heroTop {
          justify-content: space-between !important;
          gap: 8px !important;
        }

        .view-phone .checklistPage .openingHero h2 {
          margin: 6px 0 11px !important;
          font-size: 25px !important;
          line-height: 1.05 !important;
        }

        .view-phone .checklistPage .metaGrid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 6px !important;
        }

        .view-phone .checklistPage .metaGrid > div {
          min-width: 0 !important;
          padding: 9px 10px !important;
          border-radius: 10px !important;
        }

        .view-phone .checklistPage .metaGrid > div:first-child {
          grid-column: 1 / -1 !important;
        }

        .view-phone .checklistPage .metaGrid strong {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          font-size: 11px !important;
          white-space: nowrap !important;
        }

        .view-phone .checklistPage .progressCard {
          padding: 14px !important;
          border-radius: 14px !important;
        }

        .view-phone .checklistPage .progressTop strong {
          font-size: 34px !important;
        }

        .view-phone .checklistPage .progressTrack {
          height: 8px !important;
          margin-top: 12px !important;
        }

        .view-phone .checklistPage .actionsBar {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 7px !important;
          width: 100% !important;
          margin: 9px 0 !important;
        }

        .view-phone .checklistPage .actionsBar button {
          width: 100% !important;
          min-width: 0 !important;
          min-height: 44px !important;
          padding: 7px 8px !important;
          border-radius: 11px !important;
          font-size: 10px !important;
          white-space: normal !important;
        }

        .view-phone .checklistPage .actionsBar .primaryButton,
        .view-phone .checklistPage .actionsBar .secondaryButton:last-child {
          grid-column: 1 / -1 !important;
        }

        .view-phone .checklistPage .sectionGrid {
          width: 100% !important;
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 9px !important;
        }

        .view-phone .checklistPage .taskSection {
          width: 100% !important;
          min-width: 0 !important;
          border-radius: 15px !important;
          box-shadow: 0 5px 16px rgba(16,24,40,.04) !important;
        }

        .view-phone .checklistPage .taskSection header {
          width: 100% !important;
          display: grid !important;
          grid-template-columns: 1fr 88px !important;
          gap: 8px !important;
          padding: 11px 12px !important;
        }

        .view-phone .checklistPage .taskList {
          width: 100% !important;
          padding: 5px !important;
        }

        .view-phone .checklistPage .taskRow {
          width: 100% !important;
          min-width: 0 !important;
          min-height: 52px !important;
          grid-template-columns: 30px minmax(0,1fr) !important;
          gap: 9px !important;
          padding: 7px 8px !important;
          border-radius: 10px !important;
        }

        .view-phone .checklistPage .visualCheckbox {
          width: 28px !important;
          height: 28px !important;
          border-radius: 8px !important;
        }

        .view-phone .checklistPage .taskText {
          min-width: 0 !important;
          font-size: 13px !important;
          line-height: 1.25 !important;
        }

        .view-phone .checklistPage .printFooter {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 6px !important;
          width: 100% !important;
          margin-top: 9px !important;
          padding: 10px !important;
          border-radius: 13px !important;
        }

        .view-phone .checklistPage .printFooter > div:first-child {
          grid-column: 1 / -1 !important;
        }

        .view-phone .checklistPage .setupPlaceholder,
        .view-phone .checklistPage .historyPanel {
          width: 100% !important;
          max-width: 100% !important;
          border-radius: 16px !important;
        }

        .view-phone .checklistPage .historyTableWrap {
          width: 100% !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }

        .view-phone .checklistPage .historyTable {
          min-width: 650px !important;
        }
      `}</style>
    </main>
  )
}
