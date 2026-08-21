'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Card, Page } from '@/components/ui'
import { supabase } from '@/lib/supabase'

type Employee = {
  id: string
  name: string
  role: string
  color: string
}

type DayPlanning = {
  off: boolean
  split: boolean
  start: string
  end: string
  start2: string
  end2: string
  breakMinutes: number
  validated: boolean
  validatedAt?: string
}

type PlanningData = Record<string, Record<string, DayPlanning>>

type WeeklySignature = {
  signed: boolean
  signatureDataUrl: string
  signedAt: string
}

type WeeklySignatures = Record<string, WeeklySignature>

type SpecialDayInfo = Record<string, string>

type PlanningStatus = 'En cours' | 'Vérifié' | 'Publié'

type SavedPlanning = {
  id: string
  name: string
  weekStart: string
  weekEnd: string
  status: PlanningStatus
  createdAt: string
  updatedAt: string
  employees: Employee[]
  planning: PlanningData
  specialDayInfo: SpecialDayInfo
  weeklySignatures: WeeklySignatures
}



type AdjustmentStatus =
  | 'En attente'
  | 'Acceptée'
  | 'Refusée'

type AdjustmentRequest = {
  id: string
  week_start: string
  employee_id: string
  employee_name: string
  date_key: string
  original_day: DayPlanning
  requested_day: DayPlanning
  comment?: string | null
  status: AdjustmentStatus
  created_at: string
  decided_at?: string | null
  decided_by?: string | null
}

type BarPlanningDbRow = {
  id: string
  planning_id: string
  week_start: string
  week_end: string
  name: string
  status: PlanningStatus
  employees: Employee[]
  planning: PlanningData
  special_day_info: SpecialDayInfo
  weekly_signatures: WeeklySignatures
  created_at: string
  updated_at: string
}

function savedPlanningFromDb(
  row: BarPlanningDbRow
): SavedPlanning {
  return {
    id: row.planning_id,
    name: row.name,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    employees: Array.isArray(row.employees)
      ? row.employees
      : [],
    planning:
      row.planning &&
      typeof row.planning === 'object'
        ? row.planning
        : {},
    specialDayInfo:
      row.special_day_info &&
      typeof row.special_day_info === 'object'
        ? row.special_day_info
        : {},
    weeklySignatures:
      row.weekly_signatures &&
      typeof row.weekly_signatures === 'object'
        ? row.weekly_signatures
        : {},
  }
}

function savedPlanningToDb(
  saved: SavedPlanning
) {
  return {
    planning_id: saved.id,
    week_start: saved.weekStart,
    week_end: saved.weekEnd,
    name: saved.name,
    status: saved.status,
    employees: saved.employees,
    planning: saved.planning,
    special_day_info: saved.specialDayInfo,
    weekly_signatures: saved.weeklySignatures,
    created_at: saved.createdAt,
    updated_at: saved.updatedAt,
  }
}

const EMPLOYEES_KEY = 'nukustock_bar_planning_employees_v1'
const PLANNING_KEY = 'nukustock_bar_planning_v1'
const WEEK_KEY = 'nukustock_bar_planning_week_v1'
const SIGNATURES_KEY = 'nukustock_bar_planning_signatures_v1'
const SPECIAL_INFO_KEY = 'nukustock_bar_planning_special_info_v1'
const SAVED_PLANNINGS_KEY = 'nukustock_bar_saved_plannings_v1'

const EMPLOYEE_ROLES: Record<string, string> = {
  jon: 'Bar Manager',
  jonathan: 'Bar Manager',
  emma: 'Assistant Bar Manager',
  marie: 'Morning Girl',
  lola: 'Barmaid',
  jeremy: 'Barman',
}

function employeeRole(
  id: string,
  name: string
) {
  return (
    EMPLOYEE_ROLES[id.toLowerCase()] ||
    EMPLOYEE_ROLES[name.toLowerCase()] ||
    'Équipe Bar'
  )
}

const EMPLOYEE_COLORS = [
  '#cfe3ff', // bleu pastel clair
  '#ffffff', // blanc
  '#d5f5df', // vert pastel clair
  '#ffffff', // blanc
  '#ffd9ea', // rose pastel clair
  '#ffffff', // blanc
  '#fff0b8', // jaune pastel clair
  '#ffffff', // blanc
  '#e4dcff', // violet pastel clair
  '#ffffff', // blanc
  '#c9f3f5', // turquoise pastel clair
  '#ffffff', // blanc
  '#ffe0c2', // orange pastel clair
  '#ffffff', // blanc
]


const HISTORICAL_EMPLOYEES: Employee[] = [
  {
    id: 'emma',
    name: 'EMMA',
    role: 'Assistant Bar Manager',
    color: EMPLOYEE_COLORS[0],
  },
  {
    id: 'jon',
    name: 'JON',
    role: 'Bar Manager',
    color: EMPLOYEE_COLORS[1],
  },
  {
    id: 'marie',
    name: 'MARIE',
    role: 'Morning Girl',
    color: EMPLOYEE_COLORS[2],
  },
  {
    id: 'jeremy',
    name: 'JEREMY',
    role: 'Barman',
    color: EMPLOYEE_COLORS[3],
  },
  {
    id: 'lola',
    name: 'LOLA',
    role: 'Barmaid',
    color: EMPLOYEE_COLORS[4],
  },
]

function historicalDay(
  start = '',
  end = '',
  options?: {
    off?: boolean
    split?: boolean
    start2?: string
    end2?: string
    breakMinutes?: number
  }
): DayPlanning {
  return {
    off: options?.off || false,
    split: options?.split || false,
    start,
    end,
    start2: options?.start2 || '',
    end2: options?.end2 || '',
    breakMinutes: options?.breakMinutes ?? 30,
    validated: false,
    validatedAt: undefined,
  }
}

const HISTORICAL_PLANNINGS: SavedPlanning[] = [
  {
    id: 'historique-2026-07-27',
    name: 'Planning Bar — semaine du 27 juillet au 2 août 2026',
    weekStart: '2026-07-27',
    weekEnd: '2026-08-02',
    status: 'Vérifié',
    createdAt: '2026-08-02T12:00:00.000Z',
    updatedAt: '2026-08-02T12:00:00.000Z',
    employees: HISTORICAL_EMPLOYEES.slice(0, 4),
    specialDayInfo: {},
    weeklySignatures: {},
    planning: {
      emma: {
        '2026-08-01': historicalDay('11:30', '14:30', {
          split: true,
          start2: '17:00',
          end2: '01:00',
          breakMinutes: 30,
        }),
        '2026-08-02': historicalDay('11:30', '14:00', {
          split: true,
          start2: '17:00',
          end2: '22:00',
          breakMinutes: 30,
        }),
      },
      jon: {
        '2026-08-01': historicalDay('07:00', '10:00', {
          breakMinutes: 30,
        }),
        '2026-08-02': historicalDay('', '', { off: true }),
      },
      marie: {
        '2026-08-01': historicalDay('08:30', '17:00', {
          breakMinutes: 30,
        }),
        '2026-08-02': historicalDay('08:30', '17:00', {
          breakMinutes: 30,
        }),
      },
      jeremy: {
        '2026-08-01': historicalDay('14:00', '23:00', {
          breakMinutes: 30,
        }),
        '2026-08-02': historicalDay('14:00', '23:00', {
          breakMinutes: 30,
        }),
      },
    },
  },
  {
    id: 'historique-2026-08-03',
    name: 'Planning Bar — semaine du 3 au 9 août 2026',
    weekStart: '2026-08-03',
    weekEnd: '2026-08-09',
    status: 'Vérifié',
    createdAt: '2026-08-09T12:00:00.000Z',
    updatedAt: '2026-08-09T12:00:00.000Z',
    employees: HISTORICAL_EMPLOYEES,
    specialDayInfo: {},
    weeklySignatures: {},
    planning: {
      emma: {
        '2026-08-03': historicalDay('11:30', '14:30', {
          split: true, start2: '17:00', end2: '02:00', breakMinutes: 30,
        }),
        '2026-08-04': historicalDay('10:00', '18:00', { breakMinutes: 30 }),
        '2026-08-05': historicalDay('', '', { off: true }),
        '2026-08-06': historicalDay('08:30', '15:30', { breakMinutes: 30 }),
        '2026-08-07': historicalDay('14:30', '22:00', { breakMinutes: 30 }),
        '2026-08-08': historicalDay('14:30', '22:30', { breakMinutes: 30 }),
        '2026-08-09': historicalDay('', '', { off: true }),
      },
      jon: {
        '2026-08-03': historicalDay('', '', { off: true }),
        '2026-08-04': historicalDay('17:30', '23:00', { breakMinutes: 30 }),
        '2026-08-05': historicalDay('07:00', '23:00', { breakMinutes: 30 }),
        '2026-08-06': historicalDay('10:00', '23:00', { breakMinutes: 30 }),
        '2026-08-07': historicalDay('07:00', '15:00', { breakMinutes: 30 }),
        '2026-08-08': historicalDay('16:30', '23:00', { breakMinutes: 30 }),
        '2026-08-09': historicalDay('07:00', '23:00', { breakMinutes: 30 }),
      },
      marie: {
        '2026-08-03': historicalDay('08:30', '16:00', { breakMinutes: 30 }),
        '2026-08-04': historicalDay('08:30', '16:00', { breakMinutes: 30 }),
        '2026-08-05': historicalDay('08:30', '16:00', { breakMinutes: 30 }),
        '2026-08-06': historicalDay('', '', { off: true }),
        '2026-08-07': historicalDay('08:30', '16:00', { breakMinutes: 30 }),
        '2026-08-08': historicalDay('08:30', '16:00', { breakMinutes: 30 }),
        '2026-08-09': historicalDay('08:30', '16:00', { breakMinutes: 30 }),
      },
      jeremy: {
        '2026-08-03': historicalDay('14:00', '02:00', { breakMinutes: 30 }),
        '2026-08-04': historicalDay('', '', { off: true }),
        '2026-08-05': historicalDay('15:30', '23:00', { breakMinutes: 30 }),
        '2026-08-06': historicalDay('16:30', '23:00', { breakMinutes: 30 }),
        '2026-08-07': historicalDay('16:30', '00:00', { breakMinutes: 30 }),
        '2026-08-08': historicalDay('16:30', '22:15', { breakMinutes: 30 }),
        '2026-08-09': historicalDay('16:30', '22:00', { breakMinutes: 30 }),
      },
      lola: {
        '2026-08-03': historicalDay('', '', { off: true }),
        '2026-08-04': historicalDay('', '', { off: true }),
        '2026-08-05': historicalDay('12:30', '23:00', { breakMinutes: 30 }),
        '2026-08-06': historicalDay('14:30', '23:00', { breakMinutes: 30 }),
        '2026-08-07': historicalDay('14:30', '22:00', { breakMinutes: 30 }),
        '2026-08-08': historicalDay('14:30', '23:00', { breakMinutes: 30 }),
        '2026-08-09': historicalDay('14:30', '23:00', { breakMinutes: 30 }),
      },
    },
  },
  {
    id: 'historique-2026-08-10',
    name: 'Planning Bar — semaine du 10 au 16 août 2026',
    weekStart: '2026-08-10',
    weekEnd: '2026-08-16',
    status: 'Vérifié',
    createdAt: '2026-08-16T12:00:00.000Z',
    updatedAt: '2026-08-16T12:00:00.000Z',
    employees: HISTORICAL_EMPLOYEES,
    specialDayInfo: {},
    weeklySignatures: {},
    planning: {
      emma: {
        '2026-08-10': historicalDay('', '', { off: true }),
        '2026-08-11': historicalDay('08:30', '16:00', { breakMinutes: 0 }),
        '2026-08-12': historicalDay('17:00', '22:30', { breakMinutes: 30 }),
        '2026-08-13': historicalDay('17:00', '00:30', { breakMinutes: 30 }),
        '2026-08-14': historicalDay('17:00', '00:30', { breakMinutes: 30 }),
        '2026-08-15': historicalDay('17:00', '00:30', { breakMinutes: 30 }),
        '2026-08-16': historicalDay('17:00', '00:30', { breakMinutes: 30 }),
      },
      jon: {
        '2026-08-10': historicalDay('08:30', '23:00', { breakMinutes: 30 }),
        '2026-08-11': historicalDay('08:30', '23:00', { breakMinutes: 30 }),
        '2026-08-12': historicalDay('21:30', '03:00', { breakMinutes: 0 }),
        '2026-08-13': historicalDay('08:30', '16:00', { breakMinutes: 30 }),
        '2026-08-14': historicalDay('08:30', '00:30', { breakMinutes: 30 }),
        '2026-08-15': historicalDay('08:30', '00:30', { breakMinutes: 30 }),
        '2026-08-16': historicalDay('08:30', '00:30', { breakMinutes: 30 }),
      },
      marie: {
        '2026-08-10': historicalDay('08:30', '16:00', { breakMinutes: 30 }),
        '2026-08-11': historicalDay('11:30', '18:30', { breakMinutes: 0 }),
        '2026-08-12': historicalDay('08:30', '16:00', { breakMinutes: 30 }),
        '2026-08-13': historicalDay('', '', { off: true }),
        '2026-08-14': historicalDay('08:30', '16:00', { breakMinutes: 30 }),
        '2026-08-15': historicalDay('08:30', '16:00', { breakMinutes: 30 }),
        '2026-08-16': historicalDay('08:30', '16:00', { breakMinutes: 30 }),
      },
      jeremy: {
        '2026-08-10': historicalDay('11:30', '19:00', { breakMinutes: 30 }),
        '2026-08-11': historicalDay('', '', { off: true }),
        '2026-08-12': historicalDay('11:30', '18:30', { breakMinutes: 0 }),
        '2026-08-13': historicalDay('11:30', '18:30', { breakMinutes: 0 }),
        '2026-08-14': historicalDay('11:30', '18:30', { breakMinutes: 0 }),
        '2026-08-15': historicalDay('11:30', '18:30', { breakMinutes: 0 }),
        '2026-08-16': historicalDay('11:30', '18:30', { breakMinutes: 0 }),
      },
      lola: {
        '2026-08-10': historicalDay('17:00', '23:00', { breakMinutes: 30 }),
        '2026-08-11': historicalDay('17:00', '23:00', { breakMinutes: 30 }),
        '2026-08-12': historicalDay('17:00', '22:30', { breakMinutes: 30 }),
        '2026-08-13': historicalDay('17:00', '00:30', { breakMinutes: 30 }),
        '2026-08-14': historicalDay('', '', { off: true }),
        '2026-08-15': historicalDay('17:00', '00:30', { breakMinutes: 30 }),
        '2026-08-16': historicalDay('17:00', '00:30', { breakMinutes: 30 }),
      },
    },
  }

]


function dedupePlanningsByWeek(
  items: Array<SavedPlanning | null | undefined>
) {
  const byWeek = new Map<string, SavedPlanning>()

  items
    .filter(
      (item): item is SavedPlanning =>
        Boolean(
          item &&
            item.id &&
            item.name &&
            item.weekStart &&
            item.weekEnd
        )
    )
    .forEach(item => {
      const current = byWeek.get(item.weekStart)

      if (!current) {
        byWeek.set(item.weekStart, item)
        return
      }

      const currentUpdated =
        new Date(current.updatedAt || current.createdAt).getTime()

      const nextUpdated =
        new Date(item.updatedAt || item.createdAt).getTime()

      // Garde la version la plus récente de la même semaine.
      if (nextUpdated >= currentUpdated) {
        byWeek.set(item.weekStart, item)
      }
    })

  return Array.from(byWeek.values())
}


function mergeSignaturesIntoSavedPlannings(
  plannings: Array<SavedPlanning | null | undefined>,
  signatures: WeeklySignatures
) {
  return plannings.map(saved => {
    if (!saved) return saved

    const weekPrefix = `${saved.weekStart}:`
    const signaturesForWeek = Object.entries(signatures).reduce<WeeklySignatures>(
      (result, [key, signature]) => {
        if (key.startsWith(weekPrefix) && signature?.signed) {
          result[key] = signature
        }
        return result
      },
      {}
    )

    return {
      ...saved,
      weeklySignatures: {
        ...(saved.weeklySignatures || {}),
        ...signaturesForWeek,
      },
    }
  })
}

function mergeHistoricalPlannings(
  existing: Array<SavedPlanning | null | undefined>
) {
  const cleanExisting =
    dedupePlanningsByWeek(existing)

  const existingWeeks = new Set(
    cleanExisting.map(item => item.weekStart)
  )

  const missingHistorical =
    HISTORICAL_PLANNINGS.filter(
      item =>
        !existingWeeks.has(item.weekStart)
    )

  return dedupePlanningsByWeek([
    ...cleanExisting,
    ...missingHistorical,
  ])
}

const defaultEmployees: Employee[] = [
  {
    id: 'emma',
    name: 'EMMA',
    role: 'Assistant Bar Manager',
    color: EMPLOYEE_COLORS[0],
  },
  {
    id: 'jon',
    name: 'JON',
    role: 'Bar Manager',
    color: EMPLOYEE_COLORS[1],
  },
  {
    id: 'marie',
    name: 'MARIE',
    role: 'Morning Girl',
    color: EMPLOYEE_COLORS[2],
  },
  {
    id: 'jeremy',
    name: 'JEREMY',
    role: 'Barman',
    color: EMPLOYEE_COLORS[3],
  },
  {
    id: 'lola',
    name: 'LOLA',
    role: 'Barmaid',
    color: EMPLOYEE_COLORS[4],
  },
]

function emptyDay(): DayPlanning {
  return {
    off: false,
    split: false,
    start: '',
    end: '',
    start2: '',
    end2: '',
    breakMinutes: 30,
    validated: false,
    validatedAt: undefined,
  }
}

function mondayOf(date: Date) {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function isoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDate(date: Date) {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  })
}

function formatDay(date: Date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'long' })
}

function minutesBetween(start: string, end: string, breakMinutes: number) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let startM = sh * 60 + sm
  let endM = eh * 60 + em
  if (endM < startM) endM += 24 * 60
  return Math.max(0, endM - startM - (breakMinutes || 0))
}

function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

function dateIsInSavedWeek(
  dateKey: string,
  saved: SavedPlanning
) {
  return (
    dateKey >= saved.weekStart &&
    dateKey <= saved.weekEnd
  )
}

function dayWorkedMinutes(day: DayPlanning | undefined) {
  if (!day || day.off) return 0

  const firstShift = minutesBetween(
    day.start,
    day.end,
    day.split ? 0 : day.breakMinutes
  )

  const secondShift = day.split
    ? minutesBetween(day.start2, day.end2, 0)
    : 0

  return Math.max(
    0,
    firstShift +
      secondShift -
      (day.split ? day.breakMinutes : 0)
  )
}

function savedPlanningTotalMinutes(
  saved: SavedPlanning
) {
  return saved.employees.reduce(
    (planningTotal, employee) =>
      planningTotal +
      employeePlanningMinutes(
        saved,
        employee.id
      ),
    0
  )
}

function employeePlanningMinutes(
  saved: SavedPlanning,
  employeeId: string
) {
  const employeeDays =
    saved.planning[employeeId] || {}

  return Object.entries(employeeDays)
    .filter(([dateKey]) =>
      dateIsInSavedWeek(
        dateKey,
        saved
      )
    )
    .reduce(
      (sum, [, day]) =>
        sum +
        dayWorkedMinutes(day),
      0
    )
}


function allPlanningDates(
  plannings: SavedPlanning[]
) {
  const dates = new Set<string>()

  plannings.forEach(saved => {
    Object.values(saved.planning).forEach(employeeDays => {
      Object.keys(employeeDays).forEach(dateKey => {
        dates.add(dateKey)
      })
    })
  })

  return Array.from(dates).sort()
}

function findEmployeeDayAcrossPlannings(
  plannings: SavedPlanning[],
  employeeId: string,
  dateKey: string
) {
  for (const saved of plannings) {
    const day =
      saved.planning[employeeId]?.[dateKey]

    if (day) return day
  }

  return undefined
}

type OffInterval = {
  fromOff: string
  toOff: string
  consecutiveDays: number
}

function calendarDaysBetween(
  fromDateKey: string,
  toDateKey: string
) {
  const from =
    new Date(`${fromDateKey}T12:00:00`)
  const to =
    new Date(`${toDateKey}T12:00:00`)

  const diffMs =
    to.getTime() - from.getTime()

  const diffDays =
    Math.round(
      diffMs / (1000 * 60 * 60 * 24)
    )

  // On exclut les deux jours OFF eux-mêmes.
  // Exemple : OFF 03/08 puis OFF 13/08 = 9 jours consécutifs.
  return Math.max(0, diffDays - 1)
}

function employeeOffIntervals(
  plannings: SavedPlanning[],
  employeeId: string
): OffInterval[] {
  const sortedPlannings = [
    ...dedupePlanningsByWeek(plannings),
  ].sort(
    (a, b) =>
      new Date(a.weekStart).getTime() -
      new Date(b.weekStart).getTime()
  )

  const dates =
    allPlanningDates(sortedPlannings)

  const offDates = dates.filter(dateKey => {
    const day =
      findEmployeeDayAcrossPlannings(
        sortedPlannings,
        employeeId,
        dateKey
      )

    return Boolean(day?.off)
  })

  const intervals: OffInterval[] = []

  for (
    let index = 0;
    index < offDates.length - 1;
    index += 1
  ) {
    const fromOff = offDates[index]
    const toOff = offDates[index + 1]

    intervals.push({
      fromOff,
      toOff,
      consecutiveDays:
        calendarDaysBetween(
          fromOff,
          toOff
        ),
    })
  }

  return intervals
}

function formatOffIntervalDate(value: string) {
  const date =
    new Date(`${value}T12:00:00`)

  return date.toLocaleDateString(
    'fr-FR',
    {
      day: '2-digit',
      month: '2-digit',
    }
  )
}

function offIntervalLabelForWeek(
  plannings: SavedPlanning[],
  saved: SavedPlanning,
  employeeId: string
) {
  const intervals =
    employeeOffIntervals(
      plannings,
      employeeId
    )

  const relevant = intervals.filter(
    interval =>
      interval.fromOff <= saved.weekEnd &&
      interval.toOff >= saved.weekStart
  )

  if (!relevant.length) {
    return '—'
  }

  const interval = relevant[relevant.length - 1]
  const days = interval.consecutiveDays

  return `${days} jour${days > 1 ? 's' : ''} consécutif${days > 1 ? 's' : ''}`
}

function buildTimeOptions(stepMinutes = 15) {
  const options: string[] = []

  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60

    options.push(
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    )
  }

  return options
}

const TIME_OPTIONS = buildTimeOptions(15)

function formatShortDateForList(value: string) {
  if (!value) return '—'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('fr-FR')
}



function isWeeklySignature(value: unknown): value is WeeklySignature {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<WeeklySignature>

  return (
    candidate.signed === true &&
    typeof candidate.signatureDataUrl === 'string' &&
    candidate.signatureDataUrl.startsWith('data:image/') &&
    typeof candidate.signedAt === 'string'
  )
}

function recoverSignaturesFromUnknownValue(
  value: unknown,
  result: WeeklySignatures
) {
  if (!value || typeof value !== 'object') return

  if (Array.isArray(value)) {
    value.forEach(item =>
      recoverSignaturesFromUnknownValue(
        item,
        result
      )
    )
    return
  }

  const record = value as Record<string, unknown>

  Object.entries(record).forEach(([key, child]) => {
    if (
      /^\d{4}-\d{2}-\d{2}:.+/.test(key) &&
      isWeeklySignature(child)
    ) {
      result[key] = child
    }

    recoverSignaturesFromUnknownValue(
      child,
      result
    )
  })
}

function recoverLegacySignaturesFromLocalStorage() {
  const recovered: WeeklySignatures = {}

  try {
    for (
      let index = 0;
      index < window.localStorage.length;
      index += 1
    ) {
      const key =
        window.localStorage.key(index)

      if (!key) continue

      const normalized =
        key.toLowerCase()

      if (
        !normalized.includes('planning') &&
        !normalized.includes('signature') &&
        !normalized.includes('bar')
      ) {
        continue
      }

      const raw =
        window.localStorage.getItem(key)

      if (!raw) continue

      try {
        recoverSignaturesFromUnknownValue(
          JSON.parse(raw),
          recovered
        )
      } catch {
        // Ignore les anciennes valeurs qui ne sont pas du JSON.
      }
    }
  } catch {
    // localStorage peut être indisponible dans certains contextes.
  }

  return recovered
}

function savedEmployeeSignature(
  saved: SavedPlanning,
  employeeId: string
) {
  const key = `${saved.weekStart}:${employeeId}`
  return saved.weeklySignatures?.[key]
}

function savedEmployeeIsSigned(
  saved: SavedPlanning,
  employeeId: string
) {
  return Boolean(
    savedEmployeeSignature(
      saved,
      employeeId
    )?.signed
  )
}

function BarPlanningPage() {
  const [employees, setEmployees] = useState<Employee[]>(defaultEmployees)
  const [planning, setPlanning] = useState<PlanningData>({})
  const [weekStart, setWeekStart] = useState(() => isoDate(mondayOf(new Date())))
  const [newEmployee, setNewEmployee] = useState('')
  const [weeklySignatures, setWeeklySignatures] =
    useState<WeeklySignatures>({})
  const [specialDayInfo, setSpecialDayInfo] =
    useState<SpecialDayInfo>({})
  const [signatureEmployeeId, setSignatureEmployeeId] =
    useState<string | null>(null)
  const [savedPlannings, setSavedPlannings] =
    useState<SavedPlanning[]>(
      dedupePlanningsByWeek(HISTORICAL_PLANNINGS)
    )
  const [planningView, setPlanningView] =
    useState<'dashboard' | 'planning' | 'saved'>('dashboard')
  const [planningZoom, setPlanningZoom] =
    useState(100)
  const [planningDevice, setPlanningDevice] =
    useState<'pc' | 'tablet' | 'phone'>('pc')
  const [shellDisplayMode, setShellDisplayMode] =
    useState<'pc' | 'tablet' | 'phone'>('pc')
  const [currentSavedPlanningId, setCurrentSavedPlanningId] =
    useState<string | null>(null)
  const [exportMenuOpen, setExportMenuOpen] =
    useState(false)
  const [shareMenuOpen, setShareMenuOpen] =
    useState(false)
  const [mobileManagerMenuOpen, setMobileManagerMenuOpen] =
    useState(false)
  const [showMonthlyDetails, setShowMonthlyDetails] =
    useState(false)
  const [staffManagerMode, setStaffManagerMode] =
    useState<'add' | 'remove' | null>(null)
  const [isBarNukuPortal, setIsBarNukuPortal] =
    useState(false)
  const [barNukuEmployeeId, setBarNukuEmployeeId] =
    useState<string | null>(null)
  const [barNukuIdentityReady, setBarNukuIdentityReady] =
    useState(false)
  const [barNukuRole, setBarNukuRole] =
    useState<
      'manager_admin' |
      'assistant_manager' |
      'staff' |
      null
    >(null)
  const [barNukuShowOnlyMine, setBarNukuShowOnlyMine] =
    useState(false)
  const [newPlanningModalOpen, setNewPlanningModalOpen] =
    useState(false)
  const [newPlanningDate, setNewPlanningDate] =
    useState(weekStart)
  const [loaded, setLoaded] = useState(false)
  const [supabaseReady, setSupabaseReady] = useState(false)
  const [adjustmentRequests, setAdjustmentRequests] =
    useState<AdjustmentRequest[]>([])
  const [adjustmentModal, setAdjustmentModal] = useState<{
    employeeId: string
    dateKey: string
  } | null>(null)
  const [adjustmentForm, setAdjustmentForm] = useState({
    start: '',
    end: '',
    split: false,
    start2: '',
    end2: '',
    breakMinutes: 30,
    off: false,
    comment: '',
  })
  const remoteApplyingRef = useRef(false)
  const autoSaveTimerRef = useRef<number | null>(null)
  const periodicSaveRef = useRef<number | null>(null)
  const [lastAutoSaveAt, setLastAutoSaveAt] =
    useState<string | null>(null)

  const weekEndFor = (start: string) => {
    const end = new Date(`${start}T12:00:00`)
    end.setDate(end.getDate() + 6)
    return isoDate(end)
  }

  const buildCurrentSnapshot = (): SavedPlanning => {
    const now = new Date().toISOString()
    const existing =
      savedPlannings.find(
        item => item.weekStart === weekStart
      )

    const id =
      existing?.id ||
      currentSavedPlanningId ||
      `planning-${weekStart}`

    const base = new Date(`${weekStart}T12:00:00`)
    const currentDays = Array.from(
      { length: 7 },
      (_, index) => {
        const day = new Date(base)
        day.setDate(base.getDate() + index)
        return day
      }
    )

    return {
      id,
      name: `Planning Bar — semaine du ${formatDate(currentDays[0])} au ${formatDate(currentDays[6])}`,
      weekStart,
      weekEnd: weekEndFor(weekStart),
      status: existing?.status || 'En cours',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      employees: employees.map(employee => ({
        ...employee,
      })),
      planning: employees.reduce<PlanningData>(
        (result, employee) => {
          const employeeDays: Record<string, DayPlanning> = {}

          currentDays.forEach(day => {
            const dateKey = isoDate(day)
            const currentDay =
              planning[employee.id]?.[dateKey]

            if (currentDay) {
              employeeDays[dateKey] =
                JSON.parse(
                  JSON.stringify(currentDay)
                )
            }
          })

          if (Object.keys(employeeDays).length) {
            result[employee.id] = employeeDays
          }

          return result
        },
        {}
      ),
      specialDayInfo:
        currentDays.reduce<SpecialDayInfo>(
          (result, day) => {
            const dateKey = isoDate(day)
            const info = specialDayInfo[dateKey]

            if (info) {
              result[dateKey] = info
            }

            return result
          },
          {}
        ),
      weeklySignatures:
        employees.reduce<WeeklySignatures>(
          (result, employee) => {
            const key =
              `${weekStart}:${employee.id}`

            const signature =
              weeklySignatures[key] ||
              existing?.weeklySignatures?.[key]

            if (signature) {
              result[key] =
                JSON.parse(
                  JSON.stringify(signature)
                )
            }

            return result
          },
          {
            ...(existing?.weeklySignatures || {}),
          }
        ),
    }
  }

  const planningHasContent = (
    value: PlanningData
  ) =>
    Object.values(value || {}).some(
      employeeDays =>
        Object.values(
          employeeDays || {}
        ).some(day =>
          Boolean(
            day.off ||
            day.start ||
            day.end ||
            day.start2 ||
            day.end2 ||
            day.validated
          )
        )
    )

  const safeSyncPlanningToSupabase = async (
    snapshot: SavedPlanning
  ) => {
    // Sécurité : une sauvegarde automatique vide ne doit jamais
    // écraser un planning déjà rempli dans Supabase.
    if (!planningHasContent(snapshot.planning)) {
      const { data: existing } = await supabase
        .from('bar_plannings')
        .select('planning')
        .eq('week_start', snapshot.weekStart)
        .maybeSingle()

      if (
        existing?.planning &&
        planningHasContent(
          existing.planning as PlanningData
        )
      ) {
        console.warn(
          'Autosave ignoré : planning local vide, version Supabase remplie.'
        )
        return false
      }
    }

    const { error } = await supabase
      .from('bar_plannings')
      .upsert(
        savedPlanningToDb(snapshot),
        {
          onConflict: 'week_start',
        }
      )

    if (error) {
      console.error(
        'Synchronisation planning Supabase :',
        error
      )
      return false
    }

    setLastAutoSaveAt(
      new Date().toISOString()
    )
    return true
  }

  const syncPlanningToSupabase = async (
    snapshot: SavedPlanning
  ) => {
    await safeSyncPlanningToSupabase(
      snapshot
    )
  }

  const applyRemotePlanning = (
    saved: SavedPlanning
  ) => {
    const localSameWeek =
      savedPlannings.find(
        item =>
          item.weekStart ===
          saved.weekStart
      )

    if (
      !planningHasContent(
        saved.planning
      ) &&
      localSameWeek &&
      planningHasContent(
        localSameWeek.planning
      )
    ) {
      console.warn(
        'Realtime ignoré : version Supabase vide, version locale remplie.'
      )
      return
    }

    remoteApplyingRef.current = true

    setSavedPlannings(current => {
      const withoutSameWeek =
        current.filter(
          item =>
            item.weekStart !== saved.weekStart
        )

      return dedupePlanningsByWeek([
        saved,
        ...withoutSameWeek,
      ])
    })

    if (saved.weekStart === weekStart) {
      setEmployees(
        saved.employees.map(
          (employee, index) => ({
            ...employee,
            role:
              employee.role ||
              employeeRole(
                employee.id,
                employee.name
              ),
            color:
              EMPLOYEE_COLORS[
                index %
                  EMPLOYEE_COLORS.length
              ],
          })
        )
      )
      setPlanning(saved.planning || {})
      setSpecialDayInfo(
        saved.specialDayInfo || {}
      )
      setWeeklySignatures(
        saved.weeklySignatures || {}
      )
      setCurrentSavedPlanningId(saved.id)
    }

    window.setTimeout(() => {
      remoteApplyingRef.current = false
    }, 0)
  }


  const loadAdjustmentRequests = async () => {
    const { data, error } = await supabase
      .from('bar_planning_adjustment_requests')
      .select(
        'id,week_start,employee_id,employee_name,date_key,original_day,requested_day,comment,status,created_at,decided_at,decided_by'
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error(
        'Chargement demandes ajustement :',
        error
      )
      return
    }

    setAdjustmentRequests(
      (data || []) as AdjustmentRequest[]
    )
  }

  const openAdjustmentRequest = (
    employeeId: string,
    dateKey: string
  ) => {
    if (
      barNukuReadOnly &&
      employeeId !== barNukuEmployeeId
    ) return
    const current =
      getDay(employeeId, dateKey)

    setAdjustmentForm({
      start: current.start || '',
      end: current.end || '',
      split: Boolean(current.split),
      start2: current.start2 || '',
      end2: current.end2 || '',
      breakMinutes:
        Number(current.breakMinutes || 0),
      off: Boolean(current.off),
      comment: '',
    })

    setAdjustmentModal({
      employeeId,
      dateKey,
    })
  }

  const submitAdjustmentRequest = async () => {
    if (!adjustmentModal) return

    const employee =
      employees.find(
        item =>
          item.id ===
          adjustmentModal.employeeId
      )

    if (!employee) return

    const originalDay =
      getDay(
        adjustmentModal.employeeId,
        adjustmentModal.dateKey
      )

    const requestedDay: DayPlanning = {
      ...originalDay,
      start: adjustmentForm.start,
      end: adjustmentForm.end,
      split: adjustmentForm.split,
      start2: adjustmentForm.start2,
      end2: adjustmentForm.end2,
      breakMinutes:
        Number(
          adjustmentForm.breakMinutes
        ) || 0,
      off: adjustmentForm.off,
      validated: false,
      validatedAt: undefined,
    }

    const { error } = await supabase
      .from(
        'bar_planning_adjustment_requests'
      )
      .insert({
        week_start: weekStart,
        employee_id: employee.id,
        employee_name: employee.name,
        date_key:
          adjustmentModal.dateKey,
        original_day: originalDay,
        requested_day: requestedDay,
        comment:
          adjustmentForm.comment.trim() ||
          null,
        status: 'En attente',
      })

    if (error) {
      window.alert(
        `Impossible d'envoyer la demande : ${error.message}`
      )
      return
    }

    setAdjustmentModal(null)
    await loadAdjustmentRequests()
    window.alert(
      'Demande d’ajustement envoyée.'
    )
  }

  const acceptAdjustmentRequest = async (
    request: AdjustmentRequest
  ) => {
    const now =
      new Date().toISOString()

    const validatedDay: DayPlanning = {
      ...(request.requested_day ||
        request.original_day),
      validated: true,
      validatedAt: now,
    }

    const planningForWeek =
      savedPlannings.find(
        item =>
          item.weekStart ===
          request.week_start
      )

    const sourcePlanning =
      planningForWeek?.planning ||
      (weekStart === request.week_start
        ? planning
        : {})

    const updatedPlanning: PlanningData = {
      ...sourcePlanning,
      [request.employee_id]: {
        ...(sourcePlanning[
          request.employee_id
        ] || {}),
        [request.date_key]:
          validatedDay,
      },
    }

    const updatedSaved: SavedPlanning =
      planningForWeek
        ? {
            ...planningForWeek,
            planning:
              updatedPlanning,
            updatedAt: now,
          }
        : {
            id:
              `planning-${request.week_start}`,
            name:
              `Planning Bar — semaine du ${request.week_start}`,
            weekStart:
              request.week_start,
            weekEnd:
              weekEndFor(
                request.week_start
              ),
            status: 'En cours',
            createdAt: now,
            updatedAt: now,
            employees:
              employees.map(e => ({
                ...e,
              })),
            planning:
              updatedPlanning,
            specialDayInfo: {},
            weeklySignatures: {},
          }

    const { error: planningError } =
      await supabase
        .from('bar_plannings')
        .upsert(
          savedPlanningToDb(
            updatedSaved
          ),
          {
            onConflict:
              'week_start',
          }
        )

    if (planningError) {
      window.alert(
        `Impossible de modifier le planning : ${planningError.message}`
      )
      return
    }

    const { error: requestError } =
      await supabase
        .from(
          'bar_planning_adjustment_requests'
        )
        .update({
          status: 'Acceptée',
          decided_at: now,
        })
        .eq('id', request.id)

    if (requestError) {
      window.alert(
        `Planning modifié mais demande non clôturée : ${requestError.message}`
      )
      return
    }

    setSavedPlannings(
      current => {
        const others =
          current.filter(
            item =>
              item.weekStart !==
              request.week_start
          )

        return dedupePlanningsByWeek([
          updatedSaved,
          ...others,
        ])
      }
    )

    if (
      weekStart ===
      request.week_start
    ) {
      setPlanning(
        updatedPlanning
      )
      setCurrentSavedPlanningId(
        updatedSaved.id
      )
    }

    await loadAdjustmentRequests()
  }

  const rejectAdjustmentRequest = async (
    request: AdjustmentRequest
  ) => {
    const { error } = await supabase
      .from(
        'bar_planning_adjustment_requests'
      )
      .update({
        status: 'Refusée',
        decided_at:
          new Date().toISOString(),
      })
      .eq('id', request.id)

    if (error) {
      window.alert(
        `Impossible de refuser : ${error.message}`
      )
      return
    }

    await loadAdjustmentRequests()
  }

  useEffect(() => {
    setIsBarNukuPortal(
      window.location.hostname
        .toLowerCase() ===
        'barnuku.fenuaprobartender.com'
    )
  }, [])

  useEffect(() => {
    const readShellMode = () => {
      const shell =
        document.querySelector(
          '.nskAppShell'
        )

      if (!shell) {
        setShellDisplayMode('pc')
        return
      }

      if (
        shell.classList.contains(
          'view-phone'
        )
      ) {
        setShellDisplayMode('phone')
        return
      }

      if (
        shell.classList.contains(
          'view-tablet'
        )
      ) {
        setShellDisplayMode('tablet')
        return
      }

      setShellDisplayMode('pc')
    }

    readShellMode()

    const shell =
      document.querySelector(
        '.nskAppShell'
      )

    if (!shell) return

    const observer =
      new MutationObserver(
        readShellMode
      )

    observer.observe(
      shell,
      {
        attributes: true,
        attributeFilter: ['class'],
      }
    )

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!isBarNukuPortal) {
      setBarNukuIdentityReady(true)
      return
    }

    let active = true

    const resolveBarNukuEmployeeOnce = async () => {
      // La session globale est déjà gérée par AuthGate/AppShell.
      // Planning lit la session une seule fois et n'installe pas
      // son propre listener onAuthStateChange.
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!active) return

      const user = session?.user || null

      if (!user) {
        setBarNukuEmployeeId(null)
        setBarNukuRole(null)
        setBarNukuIdentityReady(true)
        return
      }

      const appMetadata =
        user.app_metadata || {}

      const employeeId =
        String(
          appMetadata.employee_id || ''
        )
          .trim()
          .toLowerCase()

      const role =
        String(
          appMetadata.bar_role || 'staff'
        )

      const matched =
        employees.find(
          employee =>
            employee.id.toLowerCase() ===
            employeeId
        ) || null

      setBarNukuEmployeeId(
        matched?.id || employeeId || null
      )

      setBarNukuRole(
        role === 'manager_admin' ||
        role === 'assistant_manager' ||
        role === 'staff'
          ? role
          : 'staff'
      )

      setBarNukuIdentityReady(true)
    }

    void resolveBarNukuEmployeeOnce()

    return () => {
      active = false
    }
  }, [isBarNukuPortal, employees])

  const barNukuCanManage =
    !isBarNukuPortal ||
    barNukuRole === 'manager_admin' ||
    barNukuRole === 'assistant_manager'

  const barNukuReadOnly =
    isBarNukuPortal &&
    !barNukuCanManage

  const barNukuIsAdmin =
    isBarNukuPortal &&
    barNukuRole === 'manager_admin'


  useEffect(() => {
    try {
      const e = localStorage.getItem(EMPLOYEES_KEY)
      const p = localStorage.getItem(PLANNING_KEY)
      const w = localStorage.getItem(WEEK_KEY)
      const s = localStorage.getItem(SIGNATURES_KEY)
      const special = localStorage.getItem(SPECIAL_INFO_KEY)
      const saved = localStorage.getItem(SAVED_PLANNINGS_KEY)
      if (e) {
        const parsed = JSON.parse(e) as Employee[]
        setEmployees(
          parsed.map((employee, index) => ({
            ...employee,
            role:
              employee.role ||
              employeeRole(
                employee.id,
                employee.name
              ),
            // Force la palette actuelle même si une ancienne couleur
            // est déjà enregistrée dans le localStorage.
            color:
              EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length],
          }))
        )
      }
      if (p) setPlanning(JSON.parse(p))
      if (w) setWeekStart(w)
      const parsedSignatures: WeeklySignatures =
        s ? JSON.parse(s) : {}

      const legacySignatures =
        recoverLegacySignaturesFromLocalStorage()

      const allRecoveredSignatures: WeeklySignatures = {
        ...legacySignatures,
        ...parsedSignatures,
      }

      if (Object.keys(allRecoveredSignatures).length) {
        setWeeklySignatures(allRecoveredSignatures)
      }
      if (special) setSpecialDayInfo(JSON.parse(special))

      if (saved) {
        const parsedSaved = JSON.parse(saved) as Array<
          SavedPlanning | null | undefined
        >

        const restoredSaved =
          mergeSignaturesIntoSavedPlannings(
            Array.isArray(parsedSaved)
              ? parsedSaved
              : [],
            allRecoveredSignatures
          )

        setSavedPlannings(
          mergeHistoricalPlannings(
            restoredSaved
          )
        )
      } else {
        setSavedPlannings(
          mergeHistoricalPlannings(
            mergeSignaturesIntoSavedPlannings(
              HISTORICAL_PLANNINGS,
              allRecoveredSignatures
            )
          )
        )
      }
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees))
    localStorage.setItem(PLANNING_KEY, JSON.stringify(planning))
    localStorage.setItem(WEEK_KEY, weekStart)
    localStorage.setItem(SIGNATURES_KEY, JSON.stringify(weeklySignatures))
    localStorage.setItem(SPECIAL_INFO_KEY, JSON.stringify(specialDayInfo))
    localStorage.setItem(
      SAVED_PLANNINGS_KEY,
      JSON.stringify(
        dedupePlanningsByWeek(savedPlannings)
      )
    )
  }, [
    employees,
    planning,
    weekStart,
    weeklySignatures,
    specialDayInfo,
    savedPlannings,
    loaded,
  ])


  useEffect(() => {
    if (!loaded) return

    let active = true

    const initialiseSupabase = async () => {
      const { data, error } = await supabase
        .from('bar_plannings')
        .select(
          'id,planning_id,week_start,week_end,name,status,employees,planning,special_day_info,weekly_signatures,created_at,updated_at'
        )
        .order('week_start', {
          ascending: false,
        })

      if (!active) return

      if (error) {
        console.error(
          'Chargement plannings Supabase :',
          error
        )
        setSupabaseReady(true)
        return
      }

      const remotePlannings =
        (data || []).map(row =>
          savedPlanningFromDb(
            row as BarPlanningDbRow
          )
        )

      const remoteByWeek =
        new Map(
          remotePlannings.map(item => [
            item.weekStart,
            item,
          ])
        )

      const localPlannings =
        dedupePlanningsByWeek(
          savedPlannings
        )

      const merged =
        dedupePlanningsByWeek([
          ...remotePlannings,
          ...localPlannings.map(local => {
            const remote =
              remoteByWeek.get(
                local.weekStart
              )

            if (!remote) return local

            const remoteHasPlanning =
              planningHasContent(
                remote.planning
              )

            const localHasPlanning =
              planningHasContent(
                local.planning
              )

            const remoteTime =
              new Date(
                remote.updatedAt
              ).getTime()

            const localTime =
              new Date(
                local.updatedAt
              ).getTime()

            // Règle de sécurité :
            // une version remplie gagne toujours contre une version vide,
            // même si la version vide a un updatedAt plus récent.
            const newest =
              remoteHasPlanning &&
              !localHasPlanning
                ? remote
                : localHasPlanning &&
                    !remoteHasPlanning
                  ? local
                  : remoteTime >= localTime
                    ? remote
                    : local

            return {
              ...newest,
              weeklySignatures: {
                ...(local.weeklySignatures ||
                  {}),
                ...(remote.weeklySignatures ||
                  {}),
              },
            }
          }),
        ])

      setSavedPlannings(merged)

      const directRemote =
        remoteByWeek.get(weekStart)

      const selectedRemote =
        directRemote &&
        planningHasContent(
          directRemote.planning
        )
          ? directRemote
          : merged.find(
              item =>
                item.weekStart ===
                weekStart
            )

      if (selectedRemote) {
        applyRemotePlanning(
          selectedRemote
        )
      }

      for (const local of localPlannings) {
        const remote =
          remoteByWeek.get(
            local.weekStart
          )

        const shouldUpload =
          !remote ||
          new Date(
            local.updatedAt
          ).getTime() >
            new Date(
              remote.updatedAt
            ).getTime()

        if (shouldUpload) {
          await syncPlanningToSupabase({
            ...local,
            weeklySignatures: {
              ...(local.weeklySignatures ||
                {}),
              ...(remote?.weeklySignatures ||
                {}),
            },
          })
        }
      }

      setSupabaseReady(true)
      void loadAdjustmentRequests()
    }

    void initialiseSupabase()

    const channel = supabase
      .channel(
        'bar-plannings-realtime'
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bar_plannings',
        },
        payload => {
          if (
            payload.eventType === 'DELETE'
          ) {
            const oldRow =
              payload.old as Partial<BarPlanningDbRow>

            if (oldRow.week_start) {
              setSavedPlannings(
                current =>
                  current.filter(
                    item =>
                      item.weekStart !==
                      oldRow.week_start
                  )
              )
            }

            return
          }

          const row =
            payload.new as BarPlanningDbRow

          applyRemotePlanning(
            savedPlanningFromDb(row)
          )
        }
      )
      .subscribe()

    const adjustmentChannel = supabase
      .channel(
        'bar-planning-adjustments-realtime'
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table:
            'bar_planning_adjustment_requests',
        },
        () => {
          void loadAdjustmentRequests()
        }
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(
        channel
      )
      void supabase.removeChannel(
        adjustmentChannel
      )
    }
  }, [loaded])

  useEffect(() => {
    if (
      !loaded ||
      !supabaseReady ||
      remoteApplyingRef.current
    ) {
      return
    }

    if (
      autoSaveTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        autoSaveTimerRef.current
      )
    }

    autoSaveTimerRef.current =
      window.setTimeout(() => {
        const snapshot =
          buildCurrentSnapshot()

        setSavedPlannings(
          current => {
            const withoutSameWeek =
              current.filter(
                item =>
                  item.weekStart !==
                  snapshot.weekStart
              )

            return dedupePlanningsByWeek([
              snapshot,
              ...withoutSameWeek,
            ])
          }
        )

        setCurrentSavedPlanningId(
          snapshot.id
        )

        void syncPlanningToSupabase(
          snapshot
        )
      }, 700)

    return () => {
      if (
        autoSaveTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          autoSaveTimerRef.current
        )
      }
    }
  }, [
    loaded,
    supabaseReady,
    weekStart,
    employees,
    planning,
    specialDayInfo,
    weeklySignatures,
  ])


  useEffect(() => {
    if (
      !loaded ||
      !supabaseReady ||
      barNukuReadOnly
    ) {
      return
    }

    if (periodicSaveRef.current !== null) {
      window.clearInterval(
        periodicSaveRef.current
      )
    }

    periodicSaveRef.current =
      window.setInterval(() => {
        if (remoteApplyingRef.current) {
          return
        }

        const snapshot =
          buildCurrentSnapshot()

        // Une semaine totalement vide n'a rien à sauvegarder.
        // Surtout, elle ne peut pas remplacer une semaine existante remplie.
        if (
          !planningHasContent(
            snapshot.planning
          )
        ) {
          return
        }

        setSavedPlannings(current => {
          const withoutSameWeek =
            current.filter(
              item =>
                item.weekStart !==
                snapshot.weekStart
            )

          return dedupePlanningsByWeek([
            snapshot,
            ...withoutSameWeek,
          ])
        })

        setCurrentSavedPlanningId(
          snapshot.id
        )

        void safeSyncPlanningToSupabase(
          snapshot
        )
      }, 30000)

    return () => {
      if (
        periodicSaveRef.current !== null
      ) {
        window.clearInterval(
          periodicSaveRef.current
        )
        periodicSaveRef.current = null
      }
    }
  }, [
    loaded,
    supabaseReady,
    barNukuReadOnly,
    weekStart,
    employees,
    planning,
    specialDayInfo,
    weeklySignatures,
  ])

  const days = useMemo(() => {
    const base = new Date(`${weekStart}T12:00:00`)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return d
    })
  }, [weekStart])

  const getDay = (employeeId: string, dateKey: string): DayPlanning =>
    planning[employeeId]?.[dateKey] || emptyDay()

  const updateDay = (
    employeeId: string,
    dateKey: string,
    patch: Partial<DayPlanning>,
    force = false
  ) => {
    if (barNukuReadOnly && !force) return
    const currentDay = getDay(employeeId, dateKey)

    if (currentDay.validated && !force) return

    setPlanning(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [dateKey]: {
          ...currentDay,
          ...patch,
        },
      },
    }))
  }

  const validateDay = (
    employeeId: string,
    dateKey: string
  ) => {
    if (
      barNukuReadOnly &&
      employeeId !== barNukuEmployeeId
    ) return
    const current = getDay(employeeId, dateKey)

    if (!current.off && (!current.start || !current.end)) {
      window.alert('Renseigne les horaires de la journée avant de la valider.')
      return
    }

    if (
      current.split &&
      (!current.start2 || !current.end2)
    ) {
      window.alert('Renseigne aussi les horaires de la coupure avant validation.')
      return
    }

    updateDay(
      employeeId,
      dateKey,
      {
        validated: true,
        validatedAt: new Date().toISOString(),
      },
      true
    )
  }

  const validateWeek = (
    employeeId: string
  ) => {
    if (
      barNukuReadOnly &&
      employeeId !== barNukuEmployeeId
    ) return
    const employee =
      employees.find(
        item =>
          item.id === employeeId
      )

    const invalidDays =
      days.filter(day => {
        const dateKey =
          isoDate(day)

        const current =
          getDay(
            employeeId,
            dateKey
          )

        if (current.off) {
          return false
        }

        if (
          !current.start ||
          !current.end
        ) {
          return true
        }

        if (
          current.split &&
          (
            !current.start2 ||
            !current.end2
          )
        ) {
          return true
        }

        return false
      })

    if (invalidDays.length) {
      const labels =
        invalidDays
          .map(day =>
            `${formatDay(day)} ${formatDate(day)}`
          )
          .join(', ')

      window.alert(
        `Impossible de valider la semaine de ${employee?.name || 'cet employé'}. Horaires incomplets : ${labels}.`
      )
      return
    }

    const confirmed =
      window.confirm(
        `Valider toute la semaine de ${employee?.name || 'cet employé'} ?`
      )

    if (!confirmed) {
      return
    }

    const validatedAt =
      new Date().toISOString()

    setPlanning(prev => {
      const next = {
        ...prev,
      }

      const employeePlanning = {
        ...(next[employeeId] || {}),
      }

      days.forEach(day => {
        const dateKey =
          isoDate(day)

        const current =
          employeePlanning[
            dateKey
          ] ||
          emptyDay()

        employeePlanning[
          dateKey
        ] = {
          ...current,
          validated: true,
          validatedAt,
        }
      })

      next[employeeId] =
        employeePlanning

      return next
    })
  }

  const unlockDay = (
    employeeId: string,
    dateKey: string
  ) => {
    if (barNukuReadOnly) return
    updateDay(
      employeeId,
      dateKey,
      {
        validated: false,
        validatedAt: undefined,
      },
      true
    )

    const signatureKey = `${weekStart}:${employeeId}`
    if (weeklySignatures[signatureKey]?.signed) {
      const next = { ...weeklySignatures }
      delete next[signatureKey]
      setWeeklySignatures(next)
    }
  }

  const addEmployee = () => {
    const name = newEmployee.trim().toUpperCase()
    if (!name) return
    setEmployees(prev => [
      ...prev,
      {
        id: `emp-${Date.now()}`,
        name,
        role: 'Équipe Bar',
        color:
          EMPLOYEE_COLORS[
            employees.length % EMPLOYEE_COLORS.length
          ],
      },
    ])
    setNewEmployee('')
  }

  const removeEmployee = (id: string) => {
    const employee = employees.find(e => e.id === id)
    if (!employee) return
    if (!window.confirm(`Supprimer ${employee.name} du planning ?`)) return
    setEmployees(prev => prev.filter(e => e.id !== id))
    setPlanning(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const openWeek = async (
    targetWeekStart: string,
    options?: {
      saveCurrent?: boolean
    }
  ) => {
    // BARNUKU = lecture seule :
    // - ne sauvegarde jamais la semaine courante en naviguant
    // - ne vide jamais le planning si la semaine cible n'existe pas
    // - charge uniquement une semaine réellement présente dans Supabase
    if (barNukuReadOnly) {
      const {
        data: remoteRow,
        error: remoteError,
      } = await supabase
        .from('bar_plannings')
        .select(
          'id,planning_id,week_start,week_end,name,status,employees,planning,special_day_info,weekly_signatures,created_at,updated_at'
        )
        .eq('week_start', targetWeekStart)
        .maybeSingle()

      if (remoteError) {
        console.error(
          'Navigation BarNuku :',
          remoteError
        )
        window.alert(
          'Impossible de charger cette semaine.'
        )
        return
      }

      if (!remoteRow) {
        window.alert(
          'Aucun planning publié pour cette semaine.'
        )
        return
      }

      const remotePlanning =
        savedPlanningFromDb(
          remoteRow as BarPlanningDbRow
        )

      if (
        !planningHasContent(
          remotePlanning.planning
        )
      ) {
        window.alert(
          'Le planning de cette semaine est vide. La semaine actuelle reste affichée.'
        )
        return
      }

      loadSavedPlanning(
        remotePlanning
      )

      setSavedPlannings(current => {
        const withoutTarget =
          current.filter(
            item =>
              item.weekStart !==
              targetWeekStart
          )

        return dedupePlanningsByWeek([
          remotePlanning,
          ...withoutTarget,
        ])
      })

      return
    }

    // STOCKNUKU / BACK OFFICE :
    // sauvegarde la semaine courante seulement si elle contient des données.
    if (
      options?.saveCurrent !== false &&
      planningHasContent(planning)
    ) {
      const currentSnapshot =
        buildCurrentSnapshot()

      setSavedPlannings(current => {
        const withoutCurrentWeek =
          current.filter(
            item =>
              item.weekStart !==
              currentSnapshot.weekStart
          )

        return dedupePlanningsByWeek([
          currentSnapshot,
          ...withoutCurrentWeek,
        ])
      })

      setCurrentSavedPlanningId(
        currentSnapshot.id
      )

      await safeSyncPlanningToSupabase(
        currentSnapshot
      )
    }

    const {
      data: remoteRow,
      error: remoteError,
    } = await supabase
      .from('bar_plannings')
      .select(
        'id,planning_id,week_start,week_end,name,status,employees,planning,special_day_info,weekly_signatures,created_at,updated_at'
      )
      .eq(
        'week_start',
        targetWeekStart
      )
      .maybeSingle()

    if (
      !remoteError &&
      remoteRow
    ) {
      const remotePlanning =
        savedPlanningFromDb(
          remoteRow as BarPlanningDbRow
        )

      if (
        planningHasContent(
          remotePlanning.planning
        ) ||
        Object.keys(
          remotePlanning.weeklySignatures ||
            {}
        ).length > 0
      ) {
        loadSavedPlanning(
          remotePlanning
        )

        setSavedPlannings(current => {
          const withoutTarget =
            current.filter(
              item =>
                item.weekStart !==
                targetWeekStart
            )

          return dedupePlanningsByWeek([
            remotePlanning,
            ...withoutTarget,
          ])
        })

        return
      }
    }

    const localSavedWeek =
      savedPlannings.find(
        item =>
          item.weekStart ===
          targetWeekStart &&
          (
            planningHasContent(
              item.planning
            ) ||
            Object.keys(
              item.weeklySignatures ||
                {}
            ).length > 0
          )
      ) ||
      HISTORICAL_PLANNINGS.find(
        item =>
          item.weekStart ===
          targetWeekStart
      )

    if (localSavedWeek) {
      loadSavedPlanning(
        localSavedWeek
      )
      return
    }

    // Nouvelle semaine réelle côté back-office uniquement.
    setWeekStart(targetWeekStart)
    setCurrentSavedPlanningId(null)
    setPlanning({})
    setSpecialDayInfo({})
    setWeeklySignatures({})
    setPlanningView('planning')
  }

  const changeWeek = (offset: number) => {
    const d =
      new Date(
        `${weekStart}T12:00:00`
      )

    d.setDate(
      d.getDate() +
        offset * 7
    )

    void openWeek(
      isoDate(d),
      {
        saveCurrent:
          !barNukuReadOnly,
      }
    )
  }

  const createNewPlanning = () => {
    if (barNukuReadOnly) return

    setNewPlanningDate(weekStart)
    setNewPlanningModalOpen(true)
  }

  const confirmCreateNewPlanning = async () => {
    if (!newPlanningDate) {
      window.alert(
        'Choisis une date pour le nouveau planning.'
      )
      return
    }

    // Peu importe le jour choisi :
    // on ramène automatiquement au lundi de cette semaine.
    const selectedDate =
      new Date(
        `${newPlanningDate}T12:00:00`
      )

    const selectedMonday =
      isoDate(
        mondayOf(selectedDate)
      )

    const selectedSundayDate =
      new Date(
        `${selectedMonday}T12:00:00`
      )
    selectedSundayDate.setDate(
      selectedSundayDate.getDate() + 6
    )
    const selectedSunday =
      isoDate(selectedSundayDate)

    const existingRemote =
      await supabase
        .from('bar_plannings')
        .select('week_start,name,status')
        .eq(
          'week_start',
          selectedMonday
        )
        .maybeSingle()

    if (existingRemote.data) {
      const openExisting =
        window.confirm(
          `Un planning existe déjà pour la semaine du ${formatShortDateForList(selectedMonday)} au ${formatShortDateForList(selectedSunday)}.\n\nVoulez-vous ouvrir ce planning existant ?`
        )

      if (openExisting) {
        setNewPlanningModalOpen(false)
        await openWeek(
          selectedMonday,
          {
            saveCurrent: true,
          }
        )
      }

      return
    }

    if (
      planningHasContent(planning)
    ) {
      const currentSnapshot =
        buildCurrentSnapshot()

      setSavedPlannings(current => {
        const withoutCurrent =
          current.filter(
            item =>
              item.weekStart !==
              currentSnapshot.weekStart
          )

        return dedupePlanningsByWeek([
          currentSnapshot,
          ...withoutCurrent,
        ])
      })

      await safeSyncPlanningToSupabase(
        currentSnapshot
      )
    }

    setWeekStart(selectedMonday)
    setCurrentSavedPlanningId(null)
    setPlanning({})
    setSpecialDayInfo({})
    setWeeklySignatures({})
    setPlanningView('planning')
    setNewPlanningModalOpen(false)
  }

  const copyPreviousWeek = () => {
    const current = new Date(`${weekStart}T12:00:00`)
    const previous = new Date(current)
    previous.setDate(previous.getDate() - 7)

    setPlanning(prev => {
      const next = { ...prev }
      employees.forEach(employee => {
        days.forEach((day, index) => {
          const prevDay = new Date(previous)
          prevDay.setDate(previous.getDate() + index)
          const source = prev[employee.id]?.[isoDate(prevDay)]
          if (source) {
            next[employee.id] = {
              ...(next[employee.id] || {}),
              [isoDate(day)]: { ...source },
            }
          }
        })
      })
      return next
    })
  }


  const signatureKeyFor = (employeeId: string) =>
    `${weekStart}:${employeeId}`

  const isWeekFullyValidated = (employeeId: string) =>
    days.every(day =>
      getDay(employeeId, isoDate(day)).validated
    )

  const saveWeeklySignature = (
    employeeId: string,
    signatureDataUrl: string
  ) => {
    if (
      barNukuReadOnly &&
      employeeId !== barNukuEmployeeId
    ) return
    const key = signatureKeyFor(employeeId)
    const signature: WeeklySignature = {
      signed: true,
      signatureDataUrl,
      signedAt: new Date().toISOString(),
    }

    setWeeklySignatures(current => ({
      ...current,
      [key]: signature,
    }))

    setSavedPlannings(current =>
      current.map(saved =>
        saved.weekStart === weekStart
          ? {
              ...saved,
              weeklySignatures: {
                ...(saved.weeklySignatures || {}),
                [key]: signature,
              },
              updatedAt: new Date().toISOString(),
            }
          : saved
      )
    )

    setSignatureEmployeeId(null)
  }

  const clearWeeklySignature = (employeeId: string) => {
    if (barNukuReadOnly) return
    const key = signatureKeyFor(employeeId)
    const next = { ...weeklySignatures }
    delete next[key]
    setWeeklySignatures(next)

    setSavedPlannings(current =>
      current.map(saved => {
        if (saved.weekStart !== weekStart) return saved

        const savedSignatures = {
          ...(saved.weeklySignatures || {}),
        }
        delete savedSignatures[key]

        return {
          ...saved,
          weeklySignatures: savedSignatures,
          updatedAt: new Date().toISOString(),
        }
      })
    )
  }



  const recoverLegacySignatures = () => {
    const recovered =
      recoverLegacySignaturesFromLocalStorage()

    const recoveredCount =
      Object.keys(recovered).length

    if (!recoveredCount) {
      window.alert(
        'Aucune ancienne signature exploitable n’a été retrouvée dans le stockage de ce navigateur.'
      )
      return
    }

    setWeeklySignatures(current => ({
      ...recovered,
      ...current,
    }))

    setSavedPlannings(current =>
      mergeHistoricalPlannings(
        mergeSignaturesIntoSavedPlannings(
          current,
          {
            ...recovered,
            ...weeklySignatures,
          }
        )
      )
    )

    window.alert(
      `${recoveredCount} signature${recoveredCount > 1 ? 's' : ''} retrouvée${recoveredCount > 1 ? 's' : ''} dans ce navigateur.`
    )
  }

  const exportExcel = () => {
    const headerCells = days
      .map(day => {
        const key = isoDate(day)
        const info = specialDayInfo[key] || ''
        return `<th>${formatDay(day)} ${formatDate(day)}${info ? `<br/><small>${info}</small>` : ''}</th>`
      })
      .join('')

    const rows = employees
      .map(employee => {
        const dayCells = days
          .map(day => {
            const d = getDay(employee.id, isoDate(day))

            if (d.off) {
              return '<td>OFF</td>'
            }

            const first = d.start && d.end
              ? `${d.start} - ${d.end}`
              : ''

            const second =
              d.split && d.start2 && d.end2
                ? `<br/>${d.start2} - ${d.end2}`
                : ''

            return `<td>${first}${second}${d.validated ? '<br/>Validé' : ''}</td>`
          })
          .join('')

        const total = days.reduce((sum, day) => {
          const d = getDay(employee.id, isoDate(day))
          if (d.off) return sum

          const first = minutesBetween(
            d.start,
            d.end,
            d.split ? 0 : d.breakMinutes
          )

          const second = d.split
            ? minutesBetween(d.start2, d.end2, 0)
            : 0

          return (
            sum +
            Math.max(
              0,
              first +
                second -
                (d.split ? d.breakMinutes : 0)
            )
          )
        }, 0)

        const signed =
          weeklySignatures[
            signatureKeyFor(employee.id)
          ]?.signed
            ? 'Oui'
            : 'Non'

        return `
          <tr>
            <td>${employee.name}</td>
            ${dayCells}
            <td>${durationLabel(total)}</td>
            <td>${signed}</td>
          </tr>
        `
      })
      .join('')

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table border="1">
            <tr>
              <th>Employé</th>
              ${headerCells}
              <th>Total</th>
              <th>Signature</th>
            </tr>
            ${rows}
          </table>
        </body>
      </html>
    `

    const blob = new Blob([html], {
      type: 'application/vnd.ms-excel;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Planning-Bar-${weekStart}.xls`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const exportPdf = () => {
    window.print()
  }

  const planningShareText = () =>
    `Planning Bar Nukutepipi — semaine du ${formatDate(days[0])} au ${formatDate(days[6])}.`

  const shareNative = async () => {
    await sharePlanningJpeg('system')
  }

  const createPlanningJpegFile = async () => {
    const target = document.querySelector(
      '.planningShareArea'
    ) as HTMLElement | null

    if (!target) {
      throw new Error(
        'Zone du planning introuvable.'
      )
    }

    const html2canvasModule =
      await import('html2canvas')

    const html2canvas =
      html2canvasModule.default

    const canvas = await html2canvas(
      target,
      {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
      }
    )

    const blob = await new Promise<Blob>(
      (resolve, reject) => {
        canvas.toBlob(
          result => {
            if (result) {
              resolve(result)
            } else {
              reject(
                new Error(
                  'Impossible de créer le JPEG.'
                )
              )
            }
          },
          'image/jpeg',
          0.92
        )
      }
    )

    return new File(
      [blob],
      `Planning-Bar-${weekStart}.jpg`,
      {
        type: 'image/jpeg',
      }
    )
  }

  const downloadPlanningJpeg = async () => {
    const file =
      await createPlanningJpegFile()

    const url =
      URL.createObjectURL(file)

    const link =
      document.createElement('a')

    link.href = url
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const sharePlanningJpeg = async (
    preferredApp:
      | 'WhatsApp'
      | 'Facebook'
      | 'system'
  ) => {
    try {
      const file =
        await createPlanningJpegFile()

      const shareData: ShareData = {
        title: 'Planning Bar Nukutepipi',
        text: planningShareText(),
        files: [file],
      }

      if (
        navigator.share &&
        (
          !navigator.canShare ||
          navigator.canShare({
            files: [file],
          })
        )
      ) {
        await navigator.share(
          shareData
        )
        return
      }

      await downloadPlanningJpeg()

      if (preferredApp === 'WhatsApp') {
        const message = encodeURIComponent(
          `${planningShareText()}\nLe planning JPEG vient d'être téléchargé. Ajoute-le au message WhatsApp.`
        )

        window.open(
          `https://wa.me/?text=${message}`,
          '_blank',
          'noopener,noreferrer'
        )
        return
      }

      if (preferredApp === 'Facebook') {
        window.open(
          'https://www.facebook.com/',
          '_blank',
          'noopener,noreferrer'
        )
        return
      }

      window.alert(
        'Le planning JPEG a été téléchargé.'
      )
    } catch (error) {
      console.error(
        'Partage JPEG du planning :',
        error
      )

      window.alert(
        'Impossible de créer le JPEG du planning.'
      )
    }
  }

  const shareWhatsApp = () =>
    sharePlanningJpeg('WhatsApp')

  const shareFacebook = () =>
    sharePlanningJpeg('Facebook')

  const weekEndKey = () => {
    const end = new Date(`${weekStart}T12:00:00`)
    end.setDate(end.getDate() + 6)
    return isoDate(end)
  }

  const saveCurrentPlanning = (
    showConfirmation = true
  ) => {
    const now = new Date().toISOString()
    const existing =
      currentSavedPlanningId
        ? savedPlannings.find(
            item => item.id === currentSavedPlanningId
          )
        : savedPlannings.find(
            item => item.weekStart === weekStart
          )

    const id =
      existing?.id ||
      `planning-${weekStart}-${Date.now()}`

    const snapshot: SavedPlanning = {
      id,
      name: `Planning Bar — semaine du ${formatDate(days[0])} au ${formatDate(days[6])}`,
      weekStart,
      weekEnd: weekEndKey(),
      status: existing?.status || 'En cours',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      employees: employees.map(employee => ({ ...employee })),
      planning: employees.reduce<PlanningData>(
        (result, employee) => {
          const weekDays: Record<string, DayPlanning> = {}

          days.forEach(day => {
            const dateKey = isoDate(day)
            const currentDay =
              planning[employee.id]?.[dateKey]

            if (currentDay) {
              weekDays[dateKey] =
                JSON.parse(
                  JSON.stringify(currentDay)
                )
            }
          })

          if (Object.keys(weekDays).length) {
            result[employee.id] = weekDays
          }

          return result
        },
        {}
      ),
      specialDayInfo: days.reduce<SpecialDayInfo>(
        (result, day) => {
          const dateKey = isoDate(day)
          const info = specialDayInfo[dateKey]

          if (info) {
            result[dateKey] = info
          }

          return result
        },
        {}
      ),
      weeklySignatures: employees.reduce<WeeklySignatures>(
        (result, employee) => {
          const key = `${weekStart}:${employee.id}`
          const signature =
            weeklySignatures[key] ||
            existing?.weeklySignatures?.[key]

          if (signature) {
            result[key] =
              JSON.parse(
                JSON.stringify(signature)
              )
          }

          return result
        },
        {
          ...(existing?.weeklySignatures || {}),
        }
      ),
    }

    setSavedPlannings(current => {
      const withoutSameWeek =
        dedupePlanningsByWeek(current).filter(
          item =>
            item.weekStart !== snapshot.weekStart
        )

      return dedupePlanningsByWeek([
        snapshot,
        ...withoutSameWeek,
      ])
    })

    setCurrentSavedPlanningId(id)

    void syncPlanningToSupabase(
      snapshot
    )

    if (showConfirmation) {
      window.alert(
        'Planning sauvegardé.'
      )
    }
  }

  const loadSavedPlanning = (saved: SavedPlanning) => {
    setEmployees(
      saved.employees.map((employee, index) => ({
        ...employee,
        role:
          employee.role ||
          employeeRole(
            employee.id,
            employee.name
          ),
        color:
          EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length],
      }))
    )
    setPlanning(saved.planning || {})
    setSpecialDayInfo(saved.specialDayInfo || {})
    setWeeklySignatures(saved.weeklySignatures || {})
    setWeekStart(saved.weekStart)
    setCurrentSavedPlanningId(saved.id)
    setPlanningView('planning')
  }

  const changeSavedPlanningStatus = (
    id: string,
    status: PlanningStatus
  ) => {
    const currentItem =
      savedPlannings.find(
        item => item.id === id
      )

    if (!currentItem) return

    const updated: SavedPlanning = {
      ...currentItem,
      status,
      updatedAt:
        new Date().toISOString(),
    }

    setSavedPlannings(current =>
      current.map(item =>
        item.id === id
          ? updated
          : item
      )
    )

    void syncPlanningToSupabase(
      updated
    )
  }

  const deleteSavedPlanning = (id: string) => {
    const item = savedPlannings.find(plan => plan.id === id)
    if (!item) return

    if (!window.confirm(`Supprimer "${item.name}" ?`)) return

    setSavedPlannings(current =>
      current.filter(plan => plan.id !== id)
    )

    if (currentSavedPlanningId === id) {
      setCurrentSavedPlanningId(null)
    }

    void supabase
      .from('bar_plannings')
      .delete()
      .eq(
        'week_start',
        item.weekStart
      )
  }

  const uniqueSavedPlannings =
    dedupePlanningsByWeek(
      savedPlannings
    )

  const sortedSavedPlannings =
    [...uniqueSavedPlannings].sort(
      (
        a: SavedPlanning,
        b: SavedPlanning
      ) =>
        new Date(
          b.weekStart
        ).getTime() -
        new Date(
          a.weekStart
        ).getTime()
    )

  const publishedCount =
    uniqueSavedPlannings.filter(
      item => item.status === 'Publié'
    ).length

  const verifiedCount =
    uniqueSavedPlannings.filter(
      item => item.status === 'Vérifié'
    ).length

  const inProgressCount =
    uniqueSavedPlannings.filter(
      item => item.status === 'En cours'
    ).length

  const augustSavedPlannings =
    [...uniqueSavedPlannings]
      .filter(
        saved =>
          saved.weekEnd >= '2026-08-01' &&
          saved.weekStart <= '2026-08-31'
      )
      .sort(
        (a, b) =>
          new Date(a.weekStart).getTime() -
          new Date(b.weekStart).getTime()
      )

  const monthlyEmployeeTotals = useMemo(() => {
    const totals = new Map<string, {
      name: string
      minutes: number
      color: string
    }>()

    augustSavedPlannings.forEach(saved => {

      saved.employees.forEach((employee, index) => {
        const current = totals.get(employee.id) || {
          name: employee.name,
          minutes: 0,
          color:
            EMPLOYEE_COLORS[
              index % EMPLOYEE_COLORS.length
            ],
        }

        current.minutes += employeePlanningMinutes(
          saved,
          employee.id
        )

        totals.set(employee.id, current)
      })
    })

    return Array.from(totals.values()).sort(
      (a, b) => b.minutes - a.minutes
    )
  }, [augustSavedPlannings])

  const augustGrandTotal =
    monthlyEmployeeTotals.reduce(
      (sum, employee) =>
        sum + employee.minutes,
      0
    )

  const currentSavedPlanning =
    savedPlannings.find(
      item => item.weekStart === weekStart
    )

  const deleteCurrentPlanning = () => {
    if (!currentSavedPlanning) {
      window.alert(
        'Aucun planning sauvegardé pour cette semaine.'
      )
      return
    }

    deleteSavedPlanning(
      currentSavedPlanning.id
    )
  }

  const moveManagerActionsBelowTitle =
    barNukuCanManage &&
    shellDisplayMode === 'phone'

  const topActionsNode = (
    <div className="planningCommandBar noPrint">
      <div className="planningCommandNav">
        <button
          type="button"
          className={`commandNavButton ${
            planningView === 'dashboard'
              ? 'active'
              : ''
          }`}
          onClick={() => {
            setMobileManagerMenuOpen(false)
            setExportMenuOpen(false)
            setShareMenuOpen(false)
            setPlanningView('dashboard')
          }}
        >
          <span className="commandIcon">⌂</span>
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          className={`commandNavButton ${
            planningView === 'planning'
              ? 'active'
              : ''
          }`}
          onClick={() => {
            setMobileManagerMenuOpen(false)
            setExportMenuOpen(false)
            setShareMenuOpen(false)
            setPlanningView('planning')
          }}
        >
          <span className="commandIcon">▦</span>
          <span>Planning</span>
        </button>

        <button
          type="button"
          className={`commandNavButton ${
            planningView === 'saved'
              ? 'active'
              : ''
          }`}
          onClick={() => {
            setMobileManagerMenuOpen(false)
            setExportMenuOpen(false)
            setShareMenuOpen(false)
            setPlanningView('saved')
          }}
        >
          <span className="commandIcon">✓</span>
          <span>Sauvegardés</span>
          <span className="commandCount">
            {uniqueSavedPlannings.length}
          </span>
        </button>
      </div>

      {barNukuCanManage && (
        <div className="planningCommandActions">
          <button
            type="button"
            className="commandButton commandPrimary"
            onClick={() =>
              saveCurrentPlanning()
            }
          >
            <span className="commandIcon">✓</span>
            Sauvegarder
          </button>

          <div className="actionDropdown">
            <button
              type="button"
              className={`commandButton ${
                mobileManagerMenuOpen
                  ? 'open'
                  : ''
              }`}
              aria-expanded={
                mobileManagerMenuOpen
              }
              onClick={() => {
                setExportMenuOpen(false)
                setShareMenuOpen(false)
                setMobileManagerMenuOpen(
                  current => !current
                )
              }}
            >
              <span className="commandIcon">⚙</span>
              Gestion
              <span className="commandChevron">
                {mobileManagerMenuOpen
                  ? '⌃'
                  : '⌄'}
              </span>
            </button>

            {mobileManagerMenuOpen && (
              <div className="actionDropdownMenu managementMenu">
                <div className="menuLabel">
                  PLANNING
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMobileManagerMenuOpen(false)
                    setPlanningView('planning')
                    createNewPlanning()
                  }}
                >
                  <span>＋</span>
                  Nouveau planning
                </button>

                <div className="menuSeparator" />

                <div className="menuLabel">
                  ÉQUIPE
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMobileManagerMenuOpen(false)
                    setStaffManagerMode('add')
                  }}
                >
                  <span>＋</span>
                  Ajouter staff
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileManagerMenuOpen(false)
                    setStaffManagerMode('remove')
                  }}
                >
                  <span>−</span>
                  Supprimer staff
                </button>

                <div className="menuSeparator" />

                <button
                  type="button"
                  className="menuDanger"
                  disabled={!currentSavedPlanning}
                  onClick={() => {
                    setMobileManagerMenuOpen(false)
                    deleteCurrentPlanning()
                  }}
                >
                  <span>×</span>
                  Supprimer planning
                </button>
              </div>
            )}
          </div>

          <div className="actionDropdown">
            <button
              type="button"
              className={`commandButton ${
                exportMenuOpen
                  ? 'open'
                  : ''
              }`}
              onClick={() => {
                setMobileManagerMenuOpen(false)
                setExportMenuOpen(open => !open)
                setShareMenuOpen(false)
              }}
            >
              <span className="commandIcon">⇩</span>
              Exporter
              <span className="commandChevron">⌄</span>
            </button>

            {exportMenuOpen && (
              <div className="actionDropdownMenu">
                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false)
                    exportExcel()
                  }}
                >
                  Excel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false)
                    exportPdf()
                  }}
                >
                  PDF
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false)
                    void downloadPlanningJpeg()
                  }}
                >
                  JPEG
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false)
                    window.print()
                  }}
                >
                  Imprimer
                </button>
              </div>
            )}
          </div>

          <div className="actionDropdown">
            <button
              type="button"
              className={`commandButton ${
                shareMenuOpen
                  ? 'open'
                  : ''
              }`}
              onClick={() => {
                setMobileManagerMenuOpen(false)
                setShareMenuOpen(open => !open)
                setExportMenuOpen(false)
              }}
            >
              <span className="commandIcon">↗</span>
              Partager
              <span className="commandChevron">⌄</span>
            </button>

            {shareMenuOpen && (
              <div className="actionDropdownMenu right">
                <button
                  type="button"
                  onClick={() => {
                    setShareMenuOpen(false)
                    shareWhatsApp()
                  }}
                >
                  WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShareMenuOpen(false)
                    shareFacebook()
                  }}
                >
                  Facebook
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShareMenuOpen(false)
                    void shareNative()
                  }}
                >
                  Partage système
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const mobileManagerActionsNode = (
    <div className="mobileManagerBar noPrint">
      <div className="mobileManagerPrimary">
        <button
          type="button"
          className={`mobileManagerTab ${
            planningView === 'dashboard'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setPlanningView('dashboard')
          }
        >
          Dashboard
        </button>

        <button
          type="button"
          className={`mobileManagerTab ${
            planningView === 'planning'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setPlanningView('planning')
          }
        >
          Planning
        </button>

        <button
          type="button"
          className={`mobileManagerTab ${
            planningView === 'saved'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setPlanningView('saved')
          }
        >
          Sauvegardés
          <span>
            {uniqueSavedPlannings.length}
          </span>
        </button>
      </div>

      <div className="mobileManagerQuick">
        <button
          type="button"
          className="mobileQuickPrimary"
          onClick={() =>
            saveCurrentPlanning()
          }
        >
          Sauvegarder
        </button>

        <button
          type="button"
          className="mobileManageToggle"
          aria-expanded={
            mobileManagerMenuOpen
          }
          onClick={() =>
            setMobileManagerMenuOpen(
              current => !current
            )
          }
        >
          Gestion
          <span>
            {mobileManagerMenuOpen
              ? '⌃'
              : '⌄'}
          </span>
        </button>
      </div>

      {mobileManagerMenuOpen && (
        <div className="mobileManagerPanel">
          <button
            type="button"
            className="mobilePanelButton"
            onClick={() => {
              setMobileManagerMenuOpen(false)
              setPlanningView('planning')
              createNewPlanning()
            }}
          >
            + Nouveau planning
          </button>

          <button
            type="button"
            className="mobilePanelButton"
            onClick={() => {
              setMobileManagerMenuOpen(false)
              setStaffManagerMode('add')
            }}
          >
            + Ajouter staff
          </button>

          <button
            type="button"
            className="mobilePanelButton"
            onClick={() => {
              setMobileManagerMenuOpen(false)
              setStaffManagerMode('remove')
            }}
          >
            Supprimer staff
          </button>

          <button
            type="button"
            className="mobilePanelButton danger"
            disabled={
              !currentSavedPlanning
            }
            onClick={() => {
              setMobileManagerMenuOpen(false)
              deleteCurrentPlanning()
            }}
          >
            Supprimer planning
          </button>

          <div className="mobileManagerPanelRow">
            <button
              type="button"
              className="mobilePanelButton"
              onClick={() => {
                setShareMenuOpen(false)
                setExportMenuOpen(
                  open => !open
                )
              }}
            >
              Exporter
            </button>

            <button
              type="button"
              className="mobilePanelButton"
              onClick={() => {
                setExportMenuOpen(false)
                setShareMenuOpen(
                  open => !open
                )
              }}
            >
              Partager
            </button>
          </div>

          {exportMenuOpen && (
            <div className="mobileSubPanel">
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false)
                  exportExcel()
                }}
              >
                Excel
              </button>

              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false)
                  exportPdf()
                }}
              >
                PDF
              </button>

              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false)
                  void downloadPlanningJpeg()
                }}
              >
                JPEG
              </button>

              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false)
                  window.print()
                }}
              >
                Imprimer
              </button>
            </div>
          )}

          {shareMenuOpen && (
            <div className="mobileSubPanel">
              <button
                type="button"
                onClick={() => {
                  setShareMenuOpen(false)
                  shareWhatsApp()
                }}
              >
                WhatsApp
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareMenuOpen(false)
                  shareFacebook()
                }}
              >
                Facebook
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareMenuOpen(false)
                  void shareNative()
                }}
              >
                Partage système
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )


  return (
    <Page
      title="Planning Bar"
      subtitle={
        supabaseReady
          ? `Synchronisé StockNuku ↔ BarNuku${isBarNukuPortal ? ` · ${barNukuRole === 'manager_admin' ? 'Manager / Admin' : barNukuRole === 'assistant_manager' ? 'Assistante Manager' : 'Équipe Bar'}` : ''} · sauvegarde auto toutes les 30 s${lastAutoSaveAt ? ` · dernière ${new Date(lastAutoSaveAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}`
          : "Connexion à la synchronisation…"
      }
      action={
        moveManagerActionsBelowTitle
          ? undefined
          : topActionsNode
      }
    >
      {moveManagerActionsBelowTitle && (
        <>
          {mobileManagerActionsNode}
        </>
      )}

      {planningView === 'dashboard' && (
        <div className="planningDashboard">
          <div className="dashboardStats">
            <Card>
              <div className="dashStat">
                <span>Plannings créés</span>
                <strong>{uniqueSavedPlannings.length}</strong>
              </div>
            </Card>

            <Card>
              <div className="dashStat">
                <span>En cours</span>
                <strong>{inProgressCount}</strong>
              </div>
            </Card>

            <Card>
              <div className="dashStat">
                <span>Vérifiés</span>
                <strong>{verifiedCount}</strong>
              </div>
            </Card>

            <Card>
              <div className="dashStat">
                <span>Publiés</span>
                <strong>{publishedCount}</strong>
              </div>
            </Card>

            <Card>
              <div className="dashStat">
                <span>Total août 2026</span>
                <strong>{durationLabel(augustGrandTotal)}</strong>
              </div>
            </Card>
          </div>

          <Card>
            <div className="dashSectionHead">
              <div>
                <h2>Heures par semaine</h2>
                <p>
                  Totaux calculés à partir des horaires enregistrés.
                </p>
              </div>
            </div>

            <div className="weeklyDashboardList">
              {sortedSavedPlannings.map(saved => (
                <button
                  type="button"
                  key={`dash-${saved.id}`}
                  className="weeklyDashboardCard"
                  onClick={() => loadSavedPlanning(saved)}
                >
                  <div>
                    <strong>{saved.name}</strong>
                    <span>
                      {formatShortDateForList(saved.weekStart)}
                      {' → '}
                      {formatShortDateForList(saved.weekEnd)}
                    </span>
                  </div>

                  <div className="weeklyEmployees">
                    {saved.employees.map(employee => (
                      <span key={`${saved.id}-${employee.id}`}>
                        <strong>{employee.name}</strong>{' '}
                        <b>
                          {durationLabel(
                            employeePlanningMinutes(
                              saved,
                              employee.id
                            )
                          )}
                        </b>
                      </span>
                    ))}
                  </div>

                  <div className="weeklyTotal">
                    <small>Total équipe</small>
                    <strong>
                      {durationLabel(
                        savedPlanningTotalMinutes(saved)
                      )}
                    </strong>
                  </div>

                  <div
                    className={`dashboardStatus status-${saved.status
                      .toLowerCase()
                      .replace('é', 'e')
                      .replace(' ', '-')}`}
                  >
                    {saved.status}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="dashSectionHead monthlyCompactHead">
              <div>
                <h2>Heures du staff — août 2026</h2>
                <p>
                  Chaque semaine affiche uniquement ses propres heures. Une même semaine n&apos;est comptée qu&apos;une seule fois.
                </p>
              </div>

              <button
                type="button"
                className="btn"
                onClick={() =>
                  setShowMonthlyDetails(value => !value)
                }
              >
                {showMonthlyDetails
                  ? 'Masquer le détail'
                  : 'Voir tout'}
              </button>
            </div>

            <div className="weeklyStaffHours">
              {augustSavedPlannings
                .map((saved, weekIndex) => (
                  <div
                    key={`staff-week-${saved.id}`}
                    className="staffWeekCard"
                  >
                    <div className="staffWeekHead">
                      <div>
                        <strong>
                          Semaine {weekIndex + 1}
                        </strong>
                        <span>
                          {formatShortDateForList(saved.weekStart)}
                          {' → '}
                          {formatShortDateForList(saved.weekEnd)}
                        </span>
                      </div>

                      <div className="staffWeekSummary">
                        <b>
                          Équipe :{' '}
                          {durationLabel(
                            savedPlanningTotalMinutes(saved)
                          )}
                        </b>

                        <span>
                          {
                            saved.employees.filter(
                              employee =>
                                savedEmployeeIsSigned(
                                  saved,
                                  employee.id
                                )
                            ).length
                          }
                          /{saved.employees.length} signé(s)
                        </span>
                      </div>
                    </div>

                    <div className="staffWeekEmployees">
                      {saved.employees.map((employee, index) => {
                        const minutes =
                          employeePlanningMinutes(
                            saved,
                            employee.id
                          )

                        return (
                          <div
                            key={`${saved.id}-${employee.id}`}
                            className={`staffWeekEmployee ${
                              minutes > 42 * 60
                                ? 'over'
                                : ''
                            }`}
                            style={{
                              background:
                                EMPLOYEE_COLORS[
                                  index % EMPLOYEE_COLORS.length
                                ],
                            }}
                          >
                            <div className="staffWeekEmployeeIdentity">
                              <span>{employee.name}</span>
                            </div>

                            <div className="staffWeekEmployeeRight">
                              <strong>
                                {durationLabel(minutes)}
                              </strong>

                              <small
                                className={
                                  savedEmployeeIsSigned(
                                    saved,
                                    employee.id
                                  )
                                    ? 'signatureStatus signed'
                                    : 'signatureStatus unsigned'
                                }
                              >
                                {savedEmployeeIsSigned(
                                  saved,
                                  employee.id
                                )
                                  ? '✓ Signé'
                                  : 'Non signé'}
                              </small>


                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>

            <div className="monthCumulativeSection">
              <div className="monthCumulativeHead">
                <div>
                  <h3>Cumul du mois</h3>
                  <span>
                    Somme des semaines affichées pour août, y compris la semaine du 27 juillet au 2 août.
                  </span>
                </div>

                <strong>
                  Équipe : {durationLabel(augustGrandTotal)}
                </strong>
              </div>

              <div className="monthlyTotalsGrid compact">
                {monthlyEmployeeTotals.map(employee => (
                  <div
                    key={`monthly-${employee.name}`}
                    className="monthlyTotalCard compact"
                    style={{
                      background: employee.color,
                    }}
                  >
                    <span>{employee.name}</span>
                    <strong>
                      {durationLabel(employee.minutes)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {showMonthlyDetails && (
              <div className="monthlyBreakdown">
                <div className="monthlyBreakdownTitle">
                  <h3>Détail complet par semaine</h3>
                  <span>
                    Les colonnes sont indépendantes : aucune semaine n&apos;inclut la précédente.
                  </span>
                </div>

                <div className="monthlyBreakdownTableWrap">
                  <table className="monthlyBreakdownTable">
                    <thead>
                      <tr>
                        <th>Employé</th>
                        {augustSavedPlannings
                          .map((saved, weekIndex) => (
                            <th key={`head-${saved.id}`}>
                              S{weekIndex + 1}
                              <br />
                              <small>
                                {formatShortDateForList(saved.weekStart)}
                                {' → '}
                                {formatShortDateForList(saved.weekEnd)}
                              </small>
                            </th>
                          ))}
                        <th>Cumul mois</th>
                      </tr>
                    </thead>

                    <tbody>
                      {monthlyEmployeeTotals.map(employee => (
                        <tr key={`breakdown-${employee.name}`}>
                          <th
                            style={{
                              background: employee.color,
                            }}
                          >
                            {employee.name}
                          </th>

                          {augustSavedPlannings
                            .map(saved => {
                              const matchingEmployee =
                                saved.employees.find(
                                  item => item.name === employee.name
                                )

                              const minutes = matchingEmployee
                                ? employeePlanningMinutes(
                                    saved,
                                    matchingEmployee.id
                                  )
                                : 0

                              return (
                                <td
                                  key={`${saved.id}-${employee.name}`}
                                  className={
                                    minutes > 42 * 60
                                      ? 'weekHoursOver'
                                      : ''
                                  }
                                >
                                  {durationLabel(minutes)}
                                </td>
                              )
                            })}

                          <td className="monthlyBreakdownTotal">
                            {durationLabel(employee.minutes)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {planningView === 'saved' && (
        <Card>
          <div className="savedPlanningHeader">
            <div>
              <h2>Plannings sauvegardés</h2>
              <p>
                Retrouve les semaines enregistrées et change leur statut.
              </p>
            </div>

            <button
              type="button"
              className="btn noPrint"
              onClick={recoverLegacySignatures}
            >
              Rechercher anciennes signatures
            </button>
          </div>

          <div className="savedPlanningList">
            {sortedSavedPlannings.length > 0 ? (
              sortedSavedPlannings.map(saved => (
                <div
                  key={saved.id}
                  className="savedPlanningCard"
                >
                  <div className="savedPlanningMain">
                    <strong>{saved.name}</strong>
                    <span>
                      Du {formatShortDateForList(saved.weekStart)} au{' '}
                      {formatShortDateForList(saved.weekEnd)}
                    </span>
                    <small>
                      Dernière sauvegarde :{' '}
                      {new Date(saved.updatedAt).toLocaleString('fr-FR')}
                    </small>
                    <b className="savedPlanningHours">
                      Total équipe :{' '}
                      {durationLabel(
                        savedPlanningTotalMinutes(saved)
                      )}
                    </b>

                    <div className="savedPlanningSignatures">
                      {(() => {
                        const signedEmployees =
                          saved.employees.filter(employee =>
                            savedEmployeeIsSigned(
                              saved,
                              employee.id
                            )
                          )

                        return signedEmployees.length > 0 ? (
                          <>
                            <span className="signedPlanningBadge">
                              ✓ Signé
                            </span>
                            <small>
                              {signedEmployees.length}/
                              {saved.employees.length} signature
                              {saved.employees.length > 1 ? 's' : ''}
                            </small>
                          </>
                        ) : (
                          <small>
                            Aucune signature enregistrée
                          </small>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="savedPlanningStatus">
                    <label>Statut</label>
                    <select
                      value={saved.status}
                      onChange={event =>
                        changeSavedPlanningStatus(
                          saved.id,
                          event.target.value as PlanningStatus
                        )
                      }
                      className={`statusSelect status-${saved.status
                        .toLowerCase()
                        .replace('é', 'e')
                        .replace(' ', '-')}`}
                    >
                      <option value="En cours">En cours</option>
                      <option value="Vérifié">Vérifié</option>
                      <option value="Publié">Publié</option>
                    </select>
                  </div>

                  <div className="savedPlanningActions">
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => loadSavedPlanning(saved)}
                    >
                      Ouvrir
                    </button>

                    <button
                      type="button"
                      className="btn danger"
                      onClick={() => deleteSavedPlanning(saved.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="emptySavedPlanning">
                Aucun planning sauvegardé pour le moment.
              </div>
            )}
          </div>
        </Card>
      )}

      {planningView === 'planning' && (
        <>
          {isBarNukuPortal &&
            barNukuIdentityReady &&
            !barNukuEmployeeId && (
              <Card>
                <div style={{ padding: 16 }}>
                  <strong>Compte BarNuku non associé à un membre du staff.</strong>
                  <div style={{ marginTop: 6 }}>
                    Aucun planning ne peut être validé, modifié ou signé avec ce compte.
                  </div>
                </div>
              </Card>
            )}
      <div className="planningShareArea">
      <Card>
        <div className="toolbar noPrint">
          <div className="weekControls">
            <label>Semaine</label>

            <div className="weekControlRow">
              <button
                type="button"
                className="btn compact"
                onClick={() => changeWeek(-1)}
                title="Semaine précédente"
              >
                ←
              </button>

              <input
                type="date"
                value={weekStart}
                onChange={e =>
                  openWeek(
                    isoDate(
                      mondayOf(
                        new Date(
                          `${e.target.value}T12:00:00`
                        )
                      )
                    )
                  )
                }
              />

              <button
                type="button"
                className="btn compact"
                onClick={() => changeWeek(1)}
                title="Semaine suivante"
              >
                →
              </button>

              <button
                type="button"
                className="btn"
                onClick={() =>
                  openWeek(
                    isoDate(
                      mondayOf(
                        new Date()
                      )
                    )
                  )
                }
              >
                Cette semaine
              </button>

              {barNukuCanManage && (
                <>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={createNewPlanning}
                  >
                    + Nouveau planning
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={copyPreviousWeek}
                  >
                    Copier précédente
                  </button>
                </>
              )}

              {barNukuReadOnly &&
                barNukuEmployeeId && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      setBarNukuShowOnlyMine(
                        current => !current
                      )
                    }
                  >
                    {barNukuShowOnlyMine
                      ? 'Afficher toute l’équipe'
                      : 'Afficher uniquement ma ligne'}
                  </button>
                )}
            </div>
          </div>

          <div className="planningDisplayControls noPrint">
            <div className="planningSizeControls">
              <span>Taille</span>
              <div>
                <button
                  type="button"
                  className="sizeBtn"
                  onClick={() =>
                    setPlanningZoom(
                      current =>
                        Math.max(
                          20,
                          current - 10
                        )
                    )
                  }
                  disabled={
                    planningZoom <= 20
                  }
                  title="Réduire de 10 %"
                >
                  −10
                </button>

                <button
                  type="button"
                  className="sizeBtn sizeCurrent"
                  onClick={() =>
                    setPlanningZoom(100)
                  }
                  title="Revenir à 100 %"
                >
                  {planningZoom}%
                </button>

                <button
                  type="button"
                  className="sizeBtn"
                  onClick={() =>
                    setPlanningZoom(
                      current =>
                        Math.min(
                          150,
                          current + 10
                        )
                    )
                  }
                  disabled={
                    planningZoom >= 150
                  }
                  title="Agrandir de 10 %"
                >
                  +10
                </button>
              </div>
            </div>

            <div className="planningDeviceControls">
              <span>Écran</span>
              <div>
                <button
                  type="button"
                  className={`deviceBtn ${
                    planningDevice === 'pc'
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    setPlanningDevice('pc')
                  }
                >
                  PC
                </button>

                <button
                  type="button"
                  className={`deviceBtn ${
                    planningDevice === 'tablet'
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    setPlanningDevice('tablet')
                  }
                >
                  Tablette
                </button>

                <button
                  type="button"
                  className={`deviceBtn ${
                    planningDevice === 'phone'
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    setPlanningDevice('phone')
                  }
                >
                  Téléphone
                </button>
              </div>
            </div>
          </div>

          {barNukuReadOnly && (
            <div className="barNukuReadOnlyNote">
              Planning global en lecture seule · tu peux valider tes journées,
              demander un ajustement et signer ta semaine.
            </div>
          )}
        </div>
      </Card>

      <div className="printTitle">
        <strong>NUKUTEPIPI — PLANNING BAR</strong>
        <span>
          Semaine du {formatDate(days[0])} au {formatDate(days[6])} {days[0].getFullYear()}
        </span>
      </div>

      <Card>
        <div
              className={`tableWrap planningDevice-${planningDevice}`}
              style={{
                ['--planning-zoom' as string]:
                  planningZoom / 100,
              }}
            >
          <table>
            <thead>
              <tr>
                <th className="employeeHead">ÉQUIPE</th>
                {days.map(day => (
                  <th key={isoDate(day)}>
                    <div className="date">{formatDate(day)}</div>
                    <div className="weekday">{formatDay(day)}</div>
                  </th>
                ))}
                <th className="totalHead">TOTAL</th>
              </tr>

              <tr className="specialInfoRow">
                <th className="specialInfoLabel">
                  INFOS SPÉCIALES
                </th>

                {days.map(day => {
                  const key = isoDate(day)

                  return (
                    <th key={`special-${key}`}>
                      <textarea
                        className="specialInfoInput"
                        value={specialDayInfo[key] || ''}
                        readOnly={barNukuReadOnly}
                        onChange={event =>
                          setSpecialDayInfo(current => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                        placeholder="Arrivée / Départ / Delvoy / Dinner hamac..."
                        rows={3}
                      />
                    </th>
                  )
                })}

                <th />
              </tr>
            </thead>

            <tbody>
              {(barNukuReadOnly &&
                barNukuShowOnlyMine
                ? employees.filter(employee =>
                    employee.id === barNukuEmployeeId
                  )
                : employees
              ).map(employee => {
                const total = days.reduce((sum, day) => {
                  const d = getDay(employee.id, isoDate(day))

                  if (d.off) return sum

                  const firstShift =
                    minutesBetween(
                      d.start,
                      d.end,
                      d.split ? 0 : d.breakMinutes
                    )

                  const secondShift =
                    d.split
                      ? minutesBetween(
                          d.start2,
                          d.end2,
                          0
                        )
                      : 0

                  return (
                    sum +
                    Math.max(
                      0,
                      firstShift +
                        secondShift -
                        (d.split ? d.breakMinutes : 0)
                    )
                  )
                }, 0)

                return (
                  <tr
                    key={employee.id}
                    style={{ background: employee.color }}
                  >
                    <th
                      className="employeeCell"
                      style={{ background: employee.color }}
                    >
                      <div className="employeeIdentity">
                        <strong>{employee.name}</strong>
                        <small className="employeeRole">
                          {employee.role}
                        </small>
                      </div>

                      {!barNukuReadOnly && (
                        <button
                          type="button"
                          className="validateWeekBtn noPrint"
                          disabled={
                            isWeekFullyValidated(
                              employee.id
                            )
                          }
                          onClick={() =>
                            validateWeek(
                              employee.id
                            )
                          }
                          title="Valider les 7 jours de la semaine"
                        >
                          {isWeekFullyValidated(
                            employee.id
                          )
                            ? '✓ Semaine validée'
                            : 'Valider semaine'}
                        </button>
                      )}

                    </th>

                    {days.map(day => {
                      const key = isoDate(day)
                      const d = getDay(employee.id, key)

                      const firstShift =
                        d.off
                          ? 0
                          : minutesBetween(
                              d.start,
                              d.end,
                              d.split ? 0 : d.breakMinutes
                            )

                      const secondShift =
                        !d.off && d.split
                          ? minutesBetween(d.start2, d.end2, 0)
                          : 0

                      const worked =
                        d.off
                          ? 0
                          : Math.max(
                              0,
                              firstShift +
                                secondShift -
                                (d.split ? d.breakMinutes : 0)
                            )

                      return (
                        <td
                          key={key}
                          className={`${d.off ? 'offCell' : ''} ${
                            d.validated ? 'validatedCell' : ''
                          }`}
                          style={
                            d.off
                              ? undefined
                              : { background: employee.color }
                          }
                        >
                          <div className="dayQuickControls noPrint">
                            <label className="quickToggle">
                              <input
                                type="checkbox"
                                checked={d.off}
                                disabled={d.validated || barNukuReadOnly}
                                onChange={e =>
                                  updateDay(employee.id, key, {
                                    off: e.target.checked,
                                    ...(e.target.checked
                                      ? {
                                          start: '',
                                          end: '',
                                          start2: '',
                                          end2: '',
                                          split: false,
                                        }
                                      : {}),
                                  })
                                }
                              />
                              <span>OFF</span>
                            </label>

                            <label
                              className={`quickToggle ${
                                d.off ? 'disabledToggle' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={d.split}
                                disabled={
                                  d.off ||
                                  d.validated ||
                                  barNukuReadOnly
                                }
                                onChange={e =>
                                  updateDay(employee.id, key, {
                                    split: e.target.checked,
                                    ...(e.target.checked
                                      ? {}
                                      : {
                                          start2: '',
                                          end2: '',
                                        }),
                                  })
                                }
                              />
                              <span>Coupure</span>
                            </label>
                          </div>

                          {d.off ? (
                            <>
                              <div className="offText">OFF</div>
                              <div className="dayValidation noPrint">
                                {d.validated ? (
                                  <>
                                    <span className="validatedBadge">✓ Validé</span>
                                    {!isBarNukuPortal && (
                                      <button
                                        type="button"
                                        className="unlockBtn"
                                        onClick={() =>
                                          unlockDay(employee.id, key)
                                        }
                                      >
                                        Modifier
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  (!barNukuReadOnly ||
                                    employee.id === barNukuEmployeeId) ? (
                                    <button
                                      type="button"
                                      className="validateBtn"
                                      onClick={() =>
                                        validateDay(employee.id, key)
                                      }
                                    >
                                      Valider journée
                                    </button>
                                  ) : null
                                )}
                              </div>
                              {barNukuReadOnly &&
                                employee.id === barNukuEmployeeId && (
                                  <button
                                    type="button"
                                    className="adjustmentRequestButton noPrint"
                                    onClick={() =>
                                      openAdjustmentRequest(employee.id, key)
                                    }
                                  >
                                    Demander une modification d&apos;heures
                                  </button>
                                )}
                            </>
                          ) : (
                            <>
                              <div className="times">
                                <select
                                  value={d.start}
                                  disabled={d.validated || barNukuReadOnly}
                                  onChange={e =>
                                    updateDay(employee.id, key, {
                                      start: e.target.value,
                                    })
                                  }
                                >
                                  <option value="">Début</option>
                                  {TIME_OPTIONS.map(time => (
                                    <option key={`start-${time}`} value={time}>
                                      {time}
                                    </option>
                                  ))}
                                </select>

                                <span>→</span>

                                <select
                                  value={d.end}
                                  disabled={d.validated || barNukuReadOnly}
                                  onChange={e =>
                                    updateDay(employee.id, key, {
                                      end: e.target.value,
                                    })
                                  }
                                >
                                  <option value="">Fin</option>
                                  {TIME_OPTIONS.map(time => (
                                    <option key={`end-${time}`} value={time}>
                                      {time}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {d.split && (
                                <div className="times secondShift">
                                  <select
                                    value={d.start2}
                                    disabled={d.validated || barNukuReadOnly}
                                    onChange={e =>
                                      updateDay(employee.id, key, {
                                        start2: e.target.value,
                                      })
                                    }
                                  >
                                    <option value="">Reprise</option>
                                    {TIME_OPTIONS.map(time => (
                                      <option key={`start2-${time}`} value={time}>
                                        {time}
                                      </option>
                                    ))}
                                  </select>

                                  <span>→</span>

                                  <select
                                    value={d.end2}
                                    disabled={d.validated || barNukuReadOnly}
                                    onChange={e =>
                                      updateDay(employee.id, key, {
                                        end2: e.target.value,
                                      })
                                    }
                                  >
                                    <option value="">Fin</option>
                                    {TIME_OPTIONS.map(time => (
                                      <option key={`end2-${time}`} value={time}>
                                        {time}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              <div className="dayMetaRow">
                                <div className="breakRow">
                                  <span>
                                    {d.split
                                      ? 'Pause'
                                      : 'Pause'}
                                  </span>
                                  <select
                                    value={d.breakMinutes}
                                    disabled={d.validated || barNukuReadOnly}
                                    onChange={e =>
                                      updateDay(employee.id, key, {
                                        breakMinutes: Number(e.target.value),
                                      })
                                    }
                                  >
                                    <option value={0}>0</option>
                                    <option value={15}>15</option>
                                    <option value={30}>30</option>
                                    <option value={45}>45</option>
                                    <option value={60}>60</option>
                                  </select>
                                  <small>min</small>
                                </div>

                                <div className="worked">
                                  {d.start &&
                                  d.end &&
                                  (!d.split || (d.start2 && d.end2))
                                    ? durationLabel(worked)
                                    : '—'}
                                </div>
                              </div>

                              <div className="dayValidation noPrint">
                                {d.validated ? (
                                  <>
                                    <span className="validatedBadge">✓ Validé</span>
                                    {!isBarNukuPortal && (
                                      <button
                                        type="button"
                                        className="unlockBtn"
                                        onClick={() =>
                                          unlockDay(employee.id, key)
                                        }
                                      >
                                        Modifier
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  (!barNukuReadOnly ||
                                    employee.id === barNukuEmployeeId) ? (
                                    <button
                                      type="button"
                                      className="validateBtn"
                                      onClick={() =>
                                        validateDay(employee.id, key)
                                      }
                                    >
                                      Valider journée
                                    </button>
                                  ) : null
                                )}
                              </div>
                              {barNukuReadOnly &&
                                employee.id === barNukuEmployeeId && (
                                  <button
                                    type="button"
                                    className="adjustmentRequestButton noPrint"
                                    onClick={() =>
                                      openAdjustmentRequest(employee.id, key)
                                    }
                                  >
                                    Demander une modification d&apos;heures
                                  </button>
                                )}
                            </>
                          )}
                        </td>
                      )
                    })}

                    <td className={`totalCell ${total > 42 * 60 ? 'over' : ''}`}>
                      {durationLabel(total)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="signatureSection">
          <div className="signatureSectionHead">
            <div>
              <h2>Validation hebdomadaire & signatures</h2>
              <p>
                La signature est disponible uniquement lorsque les 7 journées de la semaine ont été validées.
              </p>
            </div>
          </div>

          <div className="signatureGrid">
            {(barNukuReadOnly
              ? employees.filter(employee =>
                  employee.id === barNukuEmployeeId
                )
              : employees
            ).map(employee => {
              const complete = isWeekFullyValidated(employee.id)
              const signature =
                weeklySignatures[signatureKeyFor(employee.id)]
              const validatedDays =
                days.filter(day =>
                  getDay(employee.id, isoDate(day)).validated
                ).length

              return (
                <div
                  key={`signature-${employee.id}`}
                  className="signatureCard"
                  style={{ background: employee.color }}
                >
                  <div className="signatureInfo">
                    <div className="signatureEmployeeIdentity">
                      <strong>{employee.name}</strong>
                      <small>{employee.role}</small>
                    </div>
                    <span>
                      {complete
                        ? '7/7 jours validés'
                        : `${validatedDays}/7 jours validés`}
                    </span>
                  </div>

                  {signature?.signed ? (
                    <div className="signedBox">
                      <img
                        src={signature.signatureDataUrl}
                        alt={`Signature ${employee.name}`}
                      />
                      <div>
                        Signé le{' '}
                        {new Date(signature.signedAt).toLocaleString('fr-FR')}
                      </div>
                      {!barNukuReadOnly && (
                        <button
                          type="button"
                          className="unlockBtn noPrint"
                          onClick={() => clearWeeklySignature(employee.id)}
                        >
                          Effacer la signature
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn primary noPrint"
                      disabled={!complete}
                      onClick={() =>
                        setSignatureEmployeeId(employee.id)
                      }
                    >
                      Signer la semaine
                    </button>
                  )}

                  {!complete && (
                    <small>
                      Valide d&apos;abord les 7 journées.
                    </small>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {signatureEmployeeId && (
        <div className="signatureModal noPrint">
          <div className="signatureModalCard">
            <h2>
              Signature — {
                employees.find(e => e.id === signatureEmployeeId)?.name
              }
            </h2>
            <p>
              Signe dans le cadre avec la souris, le doigt ou le stylet.
            </p>

            <SignaturePad
              onCancel={() => setSignatureEmployeeId(null)}
              onSave={(dataUrl) =>
                saveWeeklySignature(signatureEmployeeId, dataUrl)
              }
            />
          </div>
        </div>
      )}
      </div>
        </>
      )}

      {newPlanningModalOpen && barNukuCanManage && (
        <div className="staffManagerBackdrop noPrint">
          <div className="staffManagerModal newPlanningModal">
            <div className="staffManagerHeader">
              <div>
                <span>NOUVEAU PLANNING</span>
                <h2>
                  Choisir la semaine
                </h2>
              </div>

              <button
                type="button"
                className="staffManagerClose"
                onClick={() =>
                  setNewPlanningModalOpen(false)
                }
              >
                ×
              </button>
            </div>

            <div className="newPlanningDatePanel">
              <label>
                <span>
                  Choisis n’importe quel jour de la semaine
                </span>
                <input
                  type="date"
                  value={newPlanningDate}
                  onChange={event =>
                    setNewPlanningDate(
                      event.target.value
                    )
                  }
                />
              </label>

              {newPlanningDate && (() => {
                const monday =
                  mondayOf(
                    new Date(
                      `${newPlanningDate}T12:00:00`
                    )
                  )

                const sunday =
                  new Date(monday)
                sunday.setDate(
                  sunday.getDate() + 6
                )

                return (
                  <div className="newPlanningWeekPreview">
                    <small>
                      Le planning créé sera :
                    </small>
                    <strong>
                      Du {formatShortDateForList(
                        isoDate(monday)
                      )}{' '}
                      au {formatShortDateForList(
                        isoDate(sunday)
                      )}
                    </strong>
                  </div>
                )
              })()}
            </div>

            <div className="egModalActions">
              <button
                type="button"
                className="btn"
                onClick={() =>
                  setNewPlanningModalOpen(false)
                }
              >
                Annuler
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={() =>
                  void confirmCreateNewPlanning()
                }
              >
                Créer ce planning
              </button>
            </div>
          </div>
        </div>
      )}

      {adjustmentModal && (
        <div className="staffManagerBackdrop noPrint">
          <div className="staffManagerModal">
            <div className="staffManagerHeader">
              <div>
                <span>DEMANDE D’AJUSTEMENT</span>
                <h2>
                  Modifier mes heures
                </h2>
              </div>

              <button
                type="button"
                className="staffManagerClose"
                onClick={() =>
                  setAdjustmentModal(null)
                }
              >
                ×
              </button>
            </div>

            <div className="adjustmentFormGrid">
              <label>
                <span>Début</span>
                <input
                  type="time"
                  value={
                    adjustmentForm.start
                  }
                  onChange={event =>
                    setAdjustmentForm(
                      current => ({
                        ...current,
                        start:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>

              <label>
                <span>Fin</span>
                <input
                  type="time"
                  value={
                    adjustmentForm.end
                  }
                  onChange={event =>
                    setAdjustmentForm(
                      current => ({
                        ...current,
                        end:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>

              <label>
                <span>Pause (min)</span>
                <input
                  type="number"
                  min="0"
                  value={
                    adjustmentForm.breakMinutes
                  }
                  onChange={event =>
                    setAdjustmentForm(
                      current => ({
                        ...current,
                        breakMinutes:
                          Number(
                            event.target.value
                          ) || 0,
                      })
                    )
                  }
                />
              </label>

              <label className="adjustmentCheckbox">
                <input
                  type="checkbox"
                  checked={
                    adjustmentForm.off
                  }
                  onChange={event =>
                    setAdjustmentForm(
                      current => ({
                        ...current,
                        off:
                          event.target.checked,
                      })
                    )
                  }
                />
                <span>OFF</span>
              </label>

              <label className="adjustmentFull">
                <span>Commentaire</span>
                <textarea
                  value={
                    adjustmentForm.comment
                  }
                  onChange={event =>
                    setAdjustmentForm(
                      current => ({
                        ...current,
                        comment:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Explique l’ajustement demandé"
                />
              </label>
            </div>

            <div className="egModalActions">
              <button
                type="button"
                className="btn"
                onClick={() =>
                  setAdjustmentModal(null)
                }
              >
                Annuler
              </button>

              <button
                type="button"
                className="btn primary"
                onClick={() =>
                  void submitAdjustmentRequest()
                }
              >
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}

      {staffManagerMode && (
        <div className="staffManagerBackdrop noPrint">
          <div className="staffManagerModal">
            <div className="staffManagerHeader">
              <div>
                <span>ÉQUIPE BAR</span>
                <h2>
                  {staffManagerMode === 'add'
                    ? 'Ajouter un staff'
                    : 'Supprimer un staff'}
                </h2>
              </div>

              <button
                type="button"
                className="staffManagerClose"
                onClick={() =>
                  setStaffManagerMode(null)
                }
              >
                ×
              </button>
            </div>

            {staffManagerMode === 'add' ? (
              <div className="staffAddPanel">
                <label>
                  Nom du staff
                </label>
                <input
                  autoFocus
                  value={newEmployee}
                  placeholder="Nom du staff"
                  onChange={event =>
                    setNewEmployee(
                      event.target.value
                    )
                  }
                  onKeyDown={event => {
                    if (
                      event.key === 'Enter'
                    ) {
                      addEmployee()
                      setStaffManagerMode(null)
                    }
                  }}
                />

                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    addEmployee()
                    setStaffManagerMode(null)
                  }}
                >
                  + Ajouter le staff
                </button>
              </div>
            ) : (
              <div className="staffRemoveList">
                {employees.map(employee => (
                  <div
                    className="staffRemoveRow"
                    key={employee.id}
                  >
                    <div>
                      <strong>
                        {employee.name}
                      </strong>
                      <small>
                        {employee.role}
                      </small>
                    </div>

                    <button
                      type="button"
                      className="btn danger"
                      onClick={() =>
                        removeEmployee(
                          employee.id
                        )
                      }
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .planningCommandBar {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          width:100%;
          padding:12px;
          border:1px solid #e4e7ec;
          border-radius:22px;
          background:#fff;
          box-shadow:0 10px 30px rgba(16,24,40,.08);
        }

        .planningCommandNav,
        .planningCommandActions {
          display:flex;
          align-items:center;
          gap:9px;
          min-width:0;
        }

        .planningCommandNav {
          padding:0;
          background:transparent;
        }

        .commandNavButton,
        .commandButton {
          min-height:48px;
          padding:0 18px;
          border:1px solid #d0d5dd;
          border-radius:14px;
          background:#fff;
          color:#1d2939;
          font-family:inherit;
          font-size:12px;
          font-weight:900;
          line-height:1;
          cursor:pointer;
          box-shadow:0 2px 5px rgba(16,24,40,.06);
          transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease, color .15s ease;
        }

        .commandNavButton {
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
        }

        .commandNavButton:hover,
        .commandButton:hover {
          border-color:#98a2b3;
          background:#f9fafb;
          color:#101828;
          transform:translateY(-1px);
          box-shadow:0 6px 14px rgba(16,24,40,.10);
        }

        .commandNavButton.active,
        .commandPrimary {
          border-color:#101828;
          background:#101828;
          color:#fff;
          box-shadow:0 7px 18px rgba(16,24,40,.20);
        }

        .commandNavButton.active:hover,
        .commandPrimary:hover {
          border-color:#1d2939;
          background:#1d2939;
          color:#fff;
        }

        .commandButton {
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
        }

        .commandButton.open {
          border-color:#101828;
          background:#f2f4f7;
          color:#101828;
          box-shadow:0 5px 14px rgba(16,24,40,.09);
        }

        .commandButton:active,
        .commandNavButton:active {
          transform:translateY(1px);
          box-shadow:0 2px 5px rgba(16,24,40,.08);
        }

        .commandCount {
          display:grid;
          min-width:22px;
          height:22px;
          place-items:center;
          padding:0 6px;
          border-radius:999px;
          background:#f2f4f7;
          color:#344054;
          font-size:9px;
          font-weight:900;
        }

        .commandNavButton.active .commandCount {
          background:rgba(255,255,255,.18);
          color:#fff;
        }

        .commandIcon {
          display:inline-grid;
          width:25px;
          height:25px;
          place-items:center;
          border-radius:8px;
          background:#f2f4f7;
          color:#344054;
          font-size:13px;
          font-weight:900;
        }

        .commandNavButton.active .commandIcon,
        .commandPrimary .commandIcon {
          background:rgba(255,255,255,.16);
          color:#fff;
        }

        .commandChevron {
          margin-left:2px;
          color:#667085;
          font-size:10px;
        }

        .commandPrimary .commandChevron { color:#fff; }

        .managementMenu {
          min-width:250px !important;
        }

        .menuLabel {
          padding:9px 12px 6px;
          color:#98a2b3;
          font-size:8px;
          font-weight:900;
          letter-spacing:.12em;
        }

        .menuSeparator {
          height:1px;
          margin:6px 5px;
          background:#eaecf0;
        }

        .actionDropdownMenu {
          padding:7px !important;
          border-radius:15px !important;
          box-shadow:0 14px 32px rgba(16,24,40,.14) !important;
        }

        .actionDropdownMenu button {
          display:flex;
          align-items:center;
          gap:9px;
          min-height:42px;
          border-radius:10px !important;
          font-weight:800 !important;
        }

        .actionDropdownMenu button:hover:not(:disabled) {
          background:#f2f4f7;
        }

        .actionDropdownMenu button:disabled {
          opacity:.38;
          cursor:not-allowed;
        }

        .actionDropdownMenu .menuDanger {
          color:#b42318;
        }

        .actionDropdownMenu .menuDanger:hover:not(:disabled) {
          background:#fef3f2;
        }

        @media (max-width:1180px) {
          .planningCommandBar {
            align-items:stretch;
            flex-direction:column;
          }

          .planningCommandNav,
          .planningCommandActions {
            width:100%;
          }

          .planningCommandActions {
            justify-content:flex-end;
          }
        }

        @media (max-width:760px) {
          .planningCommandBar {
            display:none;
          }
        }

        .topActions { display:flex; align-items:center; justify-content:flex-end; gap:10px; flex-wrap:wrap; }

        .mobileManagerBar {
          width:100%;
          margin:0 0 12px;
          padding:8px;
          border:1px solid #e4e7ec;
          border-radius:14px;
          background:#fff;
          box-shadow:0 4px 16px rgba(16,24,40,.06);
        }

        .mobileManagerPrimary {
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:5px;
        }

        .mobileManagerTab {
          min-width:0;
          min-height:42px;
          padding:0 9px;
          border:1px solid #d0d5dd;
          border-radius:12px;
          background:#fff;
          color:#344054;
          font-size:9px;
          font-weight:900;
          line-height:1.1;
          cursor:pointer;
        }

        .mobileManagerTab.active {
          border-color:#101828;
          background:#101828;
          color:#fff;
        }

        .mobileManagerTab span {
          display:inline-grid;
          min-width:16px;
          height:16px;
          margin-left:4px;
          padding:0 4px;
          place-items:center;
          border-radius:999px;
          background:#eef2f6;
          color:#344054;
          font-size:8px;
        }

        .mobileManagerTab.active span {
          background:rgba(255,255,255,.18);
          color:#fff;
        }

        .mobileManagerQuick {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:6px;
          margin-top:6px;
        }

        .mobileQuickPrimary,
        .mobileManageToggle {
          min-height:44px;
          border-radius:12px;
          font-size:10px;
          font-weight:900;
          cursor:pointer;
        }

        .mobileQuickPrimary {
          border:1px solid #101828;
          background:#101828;
          color:#fff;
        }

        .mobileManageToggle {
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          border:1px solid #d0d5dd;
          background:#f8fafc;
          color:#344054;
        }

        .mobileManagerPanel {
          display:grid;
          gap:6px;
          margin-top:7px;
          padding-top:7px;
          border-top:1px solid #eaecf0;
        }

        .mobilePanelButton {
          min-height:42px;
          padding:0 12px;
          border:1px solid #d0d5dd;
          border-radius:12px;
          background:#fff;
          color:#344054;
          text-align:left;
          font-size:9px;
          font-weight:850;
          cursor:pointer;
        }

        .mobilePanelButton.danger {
          border-color:#fda29b;
          color:#b42318;
          background:#fff8f7;
        }

        .mobilePanelButton:disabled {
          opacity:.4;
          cursor:not-allowed;
        }

        .mobileManagerPanelRow {
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:6px;
        }

        .mobileSubPanel {
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:5px;
          padding:6px;
          border:1px solid #e4e7ec;
          border-radius:9px;
          background:#f9fafb;
        }

        .mobileSubPanel button {
          min-height:32px;
          border:1px solid #d0d5dd;
          border-radius:7px;
          background:#fff;
          color:#344054;
          font-size:9px;
          font-weight:800;
          cursor:pointer;
        }

        .managerPhoneActions {
          width:100%;
          margin:0 0 12px;
        }
        .managerPhoneActions .topActions {
          width:100%;
        }
        .planningMainButtons { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
        .planningMainButtons .btn { min-height:40px; }
        .planningMainButtons .btn:disabled { opacity:.45; cursor:not-allowed; }



        .newPlanningModal {
          max-width: 500px;
        }
        .newPlanningDatePanel {
          display: grid;
          gap: 14px;
        }
        .newPlanningDatePanel label {
          display: grid;
          gap: 7px;
        }
        .newPlanningDatePanel label > span {
          color: #344054;
          font-size: 12px;
          font-weight: 800;
        }
        .newPlanningDatePanel input[type="date"] {
          width: 100%;
          min-height: 46px;
          padding: 0 12px;
          border: 1px solid #d0d5dd;
          border-radius: 9px;
          background: #fff;
          color: #101828;
          font: inherit;
        }
        .newPlanningWeekPreview {
          display: grid;
          gap: 4px;
          padding: 13px;
          border: 1px solid #dbe4f0;
          border-radius: 10px;
          background: #f8fafc;
        }
        .newPlanningWeekPreview small {
          color: #667085;
          font-size: 10px;
          font-weight: 700;
        }
        .newPlanningWeekPreview strong {
          font-size: 14px;
        }

        .adjustmentAdminPanel { margin-bottom:14px; border:1px solid #f0b429; border-radius:12px; background:#fffaf0; padding:14px; }
        .adjustmentAdminHeader { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
        .adjustmentAdminHeader span { color:#b54708; font-size:10px; font-weight:900; letter-spacing:.08em; }
        .adjustmentAdminHeader h2 { margin:4px 0 0; font-size:17px; }
        .adjustmentAdminHeader > strong { min-width:32px; height:32px; display:grid; place-items:center; border-radius:999px; background:#f79009; color:#fff; }
        .adjustmentAdminList { display:grid; gap:8px; margin-top:12px; }
        .adjustmentAdminRow { display:flex; justify-content:space-between; gap:12px; align-items:center; padding:10px; border:1px solid #fedf89; border-radius:9px; background:#fff; }
        .adjustmentAdminText { display:flex; flex-direction:column; gap:3px; min-width:0; }
        .adjustmentAdminText span,.adjustmentAdminText small,.adjustmentAdminText em { color:#667085; font-size:11px; }
        .adjustmentAdminActions { display:flex; gap:7px; flex-wrap:wrap; }
        .adjustmentRequestButton { width:100%; min-height:30px; border:1px solid #84adff; border-radius:7px; background:#eff4ff; color:#155eef; cursor:pointer; font-size:10px; font-weight:800; }
        .adjustmentFormGrid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .adjustmentFormGrid label { display:grid; gap:5px; }
        .adjustmentFormGrid label > span { color:#344054; font-size:11px; font-weight:800; }
        .adjustmentFormGrid input,.adjustmentFormGrid textarea { width:100%; min-height:42px; border:1px solid #d0d5dd; border-radius:8px; padding:0 10px; font:inherit; }
        .adjustmentFormGrid textarea { min-height:90px; padding-top:10px; resize:vertical; }
        .adjustmentCheckbox { display:flex !important; grid-template-columns:auto 1fr; align-items:center; }
        .adjustmentCheckbox input { width:18px !important; min-height:18px !important; }
        .adjustmentFull { grid-column:1/-1; }

        .staffManagerBackdrop { position:fixed; inset:0; z-index:3000; display:grid; place-items:center; padding:20px; background:rgba(15,23,42,.64); }
        .staffManagerModal { width:min(560px,100%); max-height:min(720px,90vh); overflow:auto; border-radius:16px; background:#fff; padding:20px; box-shadow:0 24px 70px rgba(15,23,42,.28); }
        .staffManagerHeader { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:18px; }
        .staffManagerHeader span { color:#667085; font-size:10px; font-weight:900; letter-spacing:.08em; }
        .staffManagerHeader h2 { margin:4px 0 0; font-size:20px; }
        .staffManagerClose { width:38px; height:38px; border:1px solid #e4e7ec; border-radius:10px; background:#fff; cursor:pointer; font-size:22px; }
        .staffAddPanel { display:grid; gap:10px; }
        .staffAddPanel label { color:#344054; font-size:11px; font-weight:800; }
        .staffAddPanel input { width:100%; min-height:44px; border:1px solid #d0d5dd; border-radius:9px; padding:0 11px; font:inherit; }
        .staffRemoveList { display:grid; gap:8px; }
        .staffRemoveRow { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px; border:1px solid #e4e7ec; border-radius:10px; }
        .staffRemoveRow > div { display:flex; flex-direction:column; min-width:0; }
        .staffRemoveRow small { margin-top:3px; color:#667085; font-size:10px; }
        .topNavGroup, .topActionGroup { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .topNavGroup { padding:4px; border:1px solid #e4e7ec; border-radius:12px; background:#f8fafc; }
        .actionDropdown { position:relative; }
        .actionDropdownMenu { position:absolute; top:calc(100% + 6px); left:0; z-index:200; min-width:180px; padding:6px; border:1px solid #e4e7ec; border-radius:12px; background:#fff; box-shadow:0 14px 35px rgba(16,24,40,.14); }
        .actionDropdownMenu.right { left:auto; right:0; }
        .actionDropdownMenu button { width:100%; min-height:38px; border:0; border-radius:8px; background:transparent; padding:0 10px; text-align:left; font-weight:700; cursor:pointer; }
        .actionDropdownMenu button:hover { background:#f2f4f7; }

        .btn.danger { color:#b42318; border-color:#fda29b; background:#fff; }

        .planningDashboard { display:grid; gap:16px; }
        .dashboardStats { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; }
        .dashStat { display:flex; flex-direction:column; gap:5px; }
        .dashStat span { color:#667085; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
        .dashStat strong { color:#101828; font-size:25px; }
        .dashSectionHead { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px; }
        .dashSectionHead h2 { margin:0; font-size:17px; }
        .dashSectionHead p { margin:4px 0 0; color:#667085; font-size:10px; }
        .weeklyDashboardList { display:grid; gap:8px; }
        .weeklyDashboardCard { width:100%; border:1px solid #e4e7ec; border-radius:12px; background:#fff; padding:12px; display:grid; grid-template-columns:minmax(230px,1.4fr) minmax(320px,2fr) 110px 90px; gap:12px; align-items:center; text-align:left; cursor:pointer; }
        .weeklyDashboardCard:hover { background:#f9fafb; border-color:#cfd4dc; }
        .weeklyDashboardCard > div:first-child { display:flex; flex-direction:column; min-width:0; }
        .weeklyDashboardCard > div:first-child strong { font-size:12px; }
        .weeklyDashboardCard > div:first-child span { margin-top:3px; color:#667085; font-size:9px; }
        .weeklyEmployees { display:flex; gap:5px; flex-wrap:wrap; }
        .weeklyEmployees span { padding:4px 6px; border-radius:7px; background:#f2f4f7; font-size:9px; color:#475467; }
        .weeklyEmployeeName { display:inline-flex; flex-direction:column; padding:0 !important; background:transparent !important; }
        .weeklyEmployeeName small { font-size:7px; color:#98a2b3; font-weight:600; }
        .weeklyTotal { display:flex; flex-direction:column; align-items:flex-end; }
        .weeklyTotal small { color:#667085; font-size:8px; }
        .weeklyTotal strong { margin-top:2px; font-size:15px; }
        .dashboardStatus { justify-self:end; padding:6px 8px; border-radius:999px; font-size:9px; font-weight:900; }
        .dashboardStatus.status-en-cours { background:#fff7ed; color:#9a3412; }
        .dashboardStatus.status-verifie { background:#eff6ff; color:#1d4ed8; }
        .dashboardStatus.status-publie { background:#ecfdf3; color:#027a48; }
        .monthGrandTotal { font-size:15px; white-space:nowrap; }
        .weeklyStaffHours { display:grid; gap:10px; }
        .staffWeekCard { border:1px solid #e4e7ec; border-radius:12px; padding:10px; background:#fff; }
        .staffWeekHead { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px; }
        .staffWeekHead > div { display:flex; flex-direction:column; }
        .staffWeekHead strong { font-size:12px; }
        .staffWeekHead span { margin-top:2px; color:#667085; font-size:9px; }
        .staffWeekHead b { font-size:12px; }
        .staffWeekSummary { display:flex; flex-direction:column; align-items:flex-end; gap:3px; }
        .staffWeekSummary span { font-size:9px; font-weight:800; color:#667085; }
        .staffWeekEmployees { display:grid; grid-template-columns:repeat(auto-fit,minmax(175px,1fr)); gap:6px; }
        .staffWeekEmployee { min-height:42px; border:1px solid #d0d5dd; border-radius:9px; padding:7px 9px; display:flex; justify-content:space-between; align-items:center; gap:6px; }
        .staffWeekEmployee span { font-size:9px; font-weight:900; }
        .staffWeekEmployeeIdentity { display:flex; flex-direction:column; align-items:flex-start; gap:2px; min-width:0; }
        .staffWeekEmployeeIdentity small { font-size:7px; color:#667085; font-weight:700; line-height:1.15; }
        .staffWeekEmployee strong { font-size:13px; }
        .staffWeekEmployeeRight { display:flex; flex-direction:column; align-items:flex-end; gap:3px; }
        .signatureStatus { font-size:8px; font-weight:900; white-space:nowrap; }
        .signatureStatus.signed { color:#067647; }
        .signatureStatus.unsigned { color:#667085; }
        .offSequenceStatus { color:#475467; font-size:8px; font-weight:800; white-space:normal; text-align:right; line-height:1.25; }
        .staffWeekEmployee.over { box-shadow:inset 0 0 0 2px #fda29b; color:#b42318; }
        .monthCumulativeSection { margin-top:16px; padding-top:14px; border-top:1px solid #e4e7ec; }
        .monthCumulativeHead { display:flex; justify-content:space-between; align-items:flex-end; gap:10px; margin-bottom:8px; }
        .monthCumulativeHead h3 { margin:0; font-size:13px; }
        .monthCumulativeHead span { display:block; margin-top:3px; color:#667085; font-size:9px; }
        .monthCumulativeHead > strong { font-size:14px; }
        .weekHoursOver { background:#fee2e2; color:#b42318; font-weight:900; }
        .monthlyTotalsGrid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:9px; }
        .monthlyTotalsGrid.compact { grid-template-columns:repeat(auto-fit,minmax(125px,1fr)); gap:7px; }
        .monthlyTotalCard { border:1px solid #d0d5dd; border-radius:11px; padding:12px; display:flex; justify-content:space-between; align-items:center; gap:8px; }
        .monthlyTotalCard.compact { padding:8px 10px; min-height:44px; }
        .monthlyTotalCard span { font-size:11px; font-weight:900; }
        .monthlyTotalCard.compact span { font-size:10px; }
        .monthlyTotalCard strong { font-size:17px; }
        .monthlyTotalCard.compact strong { font-size:14px; }
        .monthlyTotalCard.monthlyOver { box-shadow:inset 0 0 0 2px #fda29b; }
        .monthlyBreakdown { margin-top:14px; padding-top:12px; border-top:1px solid #e4e7ec; }
        .monthlyBreakdownTitle { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px; }
        .monthlyBreakdownTitle h3 { margin:0; font-size:13px; }
        .monthlyBreakdownTitle span { color:#667085; font-size:9px; }
        .monthlyBreakdownTableWrap { overflow-x:auto; }
        .monthlyBreakdownTable { width:100%; min-width:760px; border-collapse:collapse; }
        .monthlyBreakdownTable th,
        .monthlyBreakdownTable td { border:1px solid #d0d5dd; padding:8px 7px; text-align:center; font-size:10px; }
        .monthlyBreakdownTable thead th { background:#f2f4f7; font-weight:900; }
        .monthlyBreakdownTable tbody th { text-align:left; font-weight:900; }
        .monthlyBreakdownTable small { color:#667085; font-size:8px; }
        .monthlyBreakdownTotal { font-weight:900; background:#ecfdf3; }
        .monthlyBreakdownTotal.over { background:#fee2e2; color:#b42318; }
        .savedPlanningHours { margin-top:5px; color:#101828; font-size:10px; }
        .savedPlanningHeader h2 { margin:0; }
        .savedPlanningHeader p { margin:5px 0 0; color:#667085; font-size:11px; }
        .savedPlanningList { margin-top:14px; display:grid; gap:10px; }
        .savedPlanningCard { display:grid; grid-template-columns:minmax(0,1fr) 160px auto; gap:14px; align-items:center; border:1px solid #e4e7ec; border-radius:14px; padding:14px; background:#fff; }
        .savedPlanningMain { min-width:0; display:flex; flex-direction:column; }
        .savedPlanningMain strong { font-size:13px; }
        .savedPlanningMain span { margin-top:4px; color:#475467; font-size:11px; }
        .savedPlanningMain small { margin-top:4px; color:#98a2b3; font-size:9px; }
        .savedPlanningStatus label { display:block; margin-bottom:5px; color:#667085; font-size:9px; font-weight:900; text-transform:uppercase; }
        .savedPlanningStatus select { width:100%; min-height:38px; border:1px solid #d0d5dd; border-radius:9px; padding:0 9px; font-weight:800; background:#fff; }
        .statusSelect.status-en-cours { background:#fff7ed; color:#9a3412; }
        .statusSelect.status-verifie { background:#eff6ff; color:#1d4ed8; }
        .statusSelect.status-publie { background:#ecfdf3; color:#027a48; }
        .savedPlanningActions { display:flex; gap:7px; flex-wrap:wrap; justify-content:flex-end; }
        .emptySavedPlanning { padding:28px; text-align:center; color:#667085; border:1px dashed #d0d5dd; border-radius:12px; background:#fafafa; }
        .btn { min-height:38px; border:1px solid #d0d5dd; border-radius:10px; background:#fff; padding:0 12px; font-weight:800; cursor:pointer; }
        .btn:hover { background:#f8fafc; }
        .btn.activeTab { background:#101828; color:#fff; border-color:#101828; }
        .btn.compact { width:38px; padding:0; }
        .btn.primary { background:#101828; color:#fff; border-color:#101828; }
        .toolbar { display:flex; align-items:end; justify-content:space-between; gap:18px; flex-wrap:wrap; }
        .weekControls { flex:1; min-width:440px; }
        .planningDisplayControls {
          display:flex;
          align-items:flex-end;
          gap:10px;
          flex-wrap:wrap;
        }
        .planningSizeControls,
        .planningDeviceControls {
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          gap:5px;
        }
        .planningSizeControls > span,
        .planningDeviceControls > span {
          color:#667085;
          font-size:9px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.05em;
        }
        .planningSizeControls > div,
        .planningDeviceControls > div {
          display:flex;
          overflow:hidden;
          border:1px solid #d0d5dd;
          border-radius:9px;
          background:#fff;
        }
        .sizeBtn,
        .deviceBtn {
          min-width:50px;
          height:34px;
          padding:0 9px;
          border:0;
          border-right:1px solid #e4e7ec;
          background:#fff;
          color:#344054;
          font-size:10px;
          font-weight:900;
          cursor:pointer;
        }
        .deviceBtn {
          min-width:66px;
        }
        .sizeBtn:last-child,
        .deviceBtn:last-child {
          border-right:0;
        }
        .sizeBtn.active,
        .deviceBtn.active {
          background:#101828;
          color:#fff;
        }
        .sizeCurrent {
          min-width:62px;
          background:#101828;
          color:#fff;
        }
        .sizeBtn:disabled {
          opacity:.35;
          cursor:not-allowed;
        }
        .barNukuReadOnlyNote {
          width:100%;
          margin-top:8px;
          color:#667085;
          font-size:11px;
          font-weight:700;
        }
        .weekControlRow { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
        .toolbar label { display:block; font-size:11px; font-weight:900; color:#667085; margin-bottom:6px; text-transform:uppercase; letter-spacing:.05em; }
        .toolbar input { min-height:40px; border:1px solid #d0d5dd; border-radius:10px; padding:0 10px; }
        .addEmployee > div { display:flex; gap:8px; }
        .addEmployee input { min-width:230px; }
        .tableWrap {
          overflow-x:auto;
          --employee-width:118px;
          --day-width:132px;
          --day-height:104px;
          --cell-pad:6px;
          --time-font:11px;
          --date-font:13px;
          --weekday-font:10px;
        }
        .tableWrap > table {
          zoom: var(--planning-zoom);
        }

        @supports not (zoom: 1) {
          .tableWrap > table {
            transform:
              scale(var(--planning-zoom));
            transform-origin:
              top left;
            width:
              calc(
                100% /
                var(--planning-zoom)
              );
          }
        }

        table {
          width:100%;
          border-collapse:collapse;
          min-width:
            calc(
              var(--employee-width) +
              (7 * var(--day-width)) +
              82px
            );
        }
        th, td { border:1px solid #98a2b3; }
        thead th {
          background:#d0d1d2;
          padding:6px 4px;
          text-align:center;
        }
        .employeeHead {
          min-width:var(--employee-width);
          width:var(--employee-width);
        }
        .date {
          font-size:var(--date-font);
          font-weight:900;
        }
        .weekday {
          margin-top:2px;
          font-size:var(--weekday-font);
          text-transform:capitalize;
        }


        .planningDevice-pc {
          max-width:none;
        }

        .planningDevice-tablet {
          max-width:1024px;
          margin-left:auto;
          margin-right:auto;
          border-left:1px dashed #d0d5dd;
          border-right:1px dashed #d0d5dd;
        }

        .planningDevice-phone {
          max-width:430px;
          margin-left:auto;
          margin-right:auto;
          border-left:1px dashed #d0d5dd;
          border-right:1px dashed #d0d5dd;
          border-radius:10px;
        }

        .planningDevice-phone table {
          min-width:980px;
        }

        .planningDevice-tablet table {
          min-width:1100px;
        }
        .specialInfoRow th { background:#f8fafc; padding:5px; vertical-align:top; }
        .specialInfoLabel { font-size:10px; font-weight:900; color:#475467; text-align:left; }
        .specialInfoInput { width:100%; min-height:48px; resize:vertical; border:1px solid #d0d5dd; border-radius:7px; background:#fff; padding:5px; font-size:9px; line-height:1.25; }
        .employeeIdentity { display:flex; flex-direction:column; align-items:flex-start; }
        .employeeIdentity strong { font-size:14px; line-height:1.05; }
        .employeeRole { display:block; margin-top:3px; font-size:9px; color:#667085; font-weight:700; line-height:1.15; }
        .signatureEmployeeIdentity { display:flex; flex-direction:column; }
        .signatureEmployeeIdentity small { margin-top:2px; font-size:9px; color:#667085; font-weight:600; }
        .employeeCell { padding:var(--cell-pad); text-align:left; min-width:var(--employee-width); width:var(--employee-width); font-size:14px; background:#fff; }
        .deleteEmployee { margin-top:10px; border:0; background:none; color:#b42318; font-size:10px; font-weight:800; cursor:pointer; padding:0; }
        td { min-width:var(--day-width); width:var(--day-width); padding:var(--cell-pad); vertical-align:top; background:#fff; height:var(--day-height); }
        .offCell { background:#ffd8b2; }
        .dayQuickControls {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:5px;
          margin-bottom:5px;
          padding-bottom:4px;
          border-bottom:1px solid rgba(152,162,179,.35);
        }
        .quickToggle {
          display:inline-flex;
          align-items:center;
          gap:3px;
          min-width:0;
          color:#475467;
          font-size:9px;
          font-weight:900;
          white-space:nowrap;
        }
        .quickToggle input { margin:0; }
        .quickToggle.disabledToggle { opacity:.45; }
        .offText { display:grid; place-items:center; min-height:42px; font-size:16px; font-weight:900; font-style:italic; }
        .times { display:grid; grid-template-columns:1fr auto 1fr; gap:4px; align-items:center; }
        .times select { width:100%; min-width:0; border:1px solid #d0d5dd; border-radius:6px; padding:4px 3px; font-size:var(--time-font); background:#fff; }
        .secondShift { margin-top:4px; }
        .dayMetaRow {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:5px;
          margin-top:5px;
        }
        .breakRow {
          display:flex;
          align-items:center;
          gap:3px;
          margin:0;
          color:#667085;
          font-size:8px;
        }
        .breakRow select {
          width:38px;
          border:1px solid #d0d5dd;
          border-radius:5px;
          padding:2px 1px;
          font-size:9px;
          background:#fff;
        }
        .breakRow small {
          font-size:7px;
          color:#98a2b3;
        }
        .worked {
          margin:0;
          text-align:right;
          font-size:12px;
          font-weight:900;
          font-style:italic;
          white-space:nowrap;
        }
        .totalHead { min-width:90px; }
        .totalCell { min-width:90px; text-align:center; vertical-align:middle; font-size:18px; font-weight:900; background:#c9f0cf; }
        .totalCell.over { background:#ffc7ce; color:#b42318; }
        .printTitle { display:none; }

        .validatedCell { box-shadow: inset 0 0 0 2px #86efac; }
        .dayValidation { margin-top:5px; display:flex; justify-content:center; align-items:center; gap:4px; flex-wrap:wrap; }
        .validateBtn { border:0; border-radius:7px; background:#166534; color:#fff; padding:5px 8px; font-size:9px; font-weight:900; cursor:pointer; }
        .validatedBadge { padding:4px 7px; border-radius:999px; background:#dcfce7; color:#166534; font-size:9px; font-weight:900; }
        .unlockBtn { border:0; background:transparent; color:#475467; font-size:9px; font-weight:800; cursor:pointer; text-decoration:underline; }
        .signatureSection h2 { margin:0; font-size:18px; }
        .signatureSection p { margin:5px 0 0; color:#667085; font-size:11px; }
        .signatureGrid { margin-top:14px; display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; }
        .signatureCard { border:1px solid #d0d5dd; border-radius:12px; padding:12px; }
        .signatureInfo { display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:10px; }
        .signatureInfo strong { font-size:13px; }
        .signatureInfo span { font-size:10px; color:#667085; }
        .signatureCard small { display:block; margin-top:7px; color:#667085; font-size:9px; }
        .signedBox { border:1px dashed #98a2b3; border-radius:10px; padding:8px; background:rgba(255,255,255,.7); }
        .signedBox img { display:block; width:100%; height:70px; object-fit:contain; background:#fff; border-radius:6px; }
        .signedBox > div { margin-top:5px; font-size:9px; color:#667085; text-align:center; }
        .signatureModal { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; padding:20px; background:rgba(16,24,40,.55); }
        .signatureModalCard { width:min(620px,100%); background:#fff; border-radius:16px; padding:18px; box-shadow:0 24px 70px rgba(16,24,40,.28); }
        .signatureModalCard h2 { margin:0; }
        .signatureModalCard p { color:#667085; font-size:12px; }


        .savedPlanningSignatures { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:8px; }
        .savedPlanningSignatures small { color:#667085; font-size:10px; font-weight:700; }
        .signedPlanningBadge { display:inline-flex; align-items:center; min-height:24px; padding:0 8px; border-radius:999px; background:#dcfae6; color:#067647; font-size:10px; font-weight:900; }


        :global(.view-phone) .managerPhoneActions {
          width:100%;
          margin:0 0 10px;
          padding:8px;
          border:1px solid #e4e7ec;
          border-radius:12px;
          background:#fff;
        }

        :global(.view-phone) .managerPhoneActions .topActions {
          display:grid !important;
          grid-template-columns:1fr !important;
          gap:7px !important;
          width:100% !important;
        }

        :global(.view-phone) .managerPhoneActions .planningMainButtons {
          display:grid !important;
          grid-template-columns:1fr 1fr !important;
          gap:6px !important;
          width:100% !important;
        }

        :global(.view-phone) .managerPhoneActions .planningMainButtons .btn {
          width:100% !important;
          min-width:0 !important;
          min-height:36px !important;
          padding:0 6px !important;
          font-size:9px !important;
          line-height:1.1 !important;
          white-space:normal !important;
        }

        :global(.view-phone) .managerPhoneActions .planningMainButtons .btn.primary {
          grid-column:1 / -1 !important;
        }

        :global(.view-phone) .managerPhoneActions .topActionGroup {
          display:grid !important;
          grid-template-columns:1fr 1fr !important;
          gap:6px !important;
          width:100% !important;
        }

        :global(.view-phone) .managerPhoneActions .topActionGroup > .btn,
        :global(.view-phone) .managerPhoneActions .topActionGroup > .actionDropdown,
        :global(.view-phone) .managerPhoneActions .topActionGroup > .actionDropdown > .btn {
          width:100% !important;
          min-width:0 !important;
        }

        :global(.view-phone) .managerPhoneActions .topActionGroup .btn {
          min-height:34px !important;
          padding:0 5px !important;
          font-size:9px !important;
        }

        /* Mode Téléphone choisi dans la barre NukuStock / BarNuku.
           Ces règles s'appliquent même lorsque le navigateur est large. */
        :global(.view-phone) :global(.page) {
          padding-left:12px !important;
          padding-right:12px !important;
        }

        :global(.view-phone) :global(.pageHead) {
          display:block !important;
          margin-bottom:12px !important;
        }

        :global(.view-phone) :global(.pageHeadText) {
          width:100% !important;
          margin-bottom:10px !important;
        }

        :global(.view-phone) :global(.pageHeadText h1) {
          margin:0 0 4px !important;
          font-size:25px !important;
          line-height:1.05 !important;
        }

        :global(.view-phone) :global(.pageHeadText p) {
          max-width:none !important;
          margin:0 !important;
          font-size:11px !important;
          line-height:1.3 !important;
        }

        :global(.view-phone) :global(.pageAction) {
          width:100% !important;
          max-width:none !important;
        }

        :global(.view-phone) .topActions {
          width:100%;
          display:grid;
          gap:7px;
        }

        :global(.view-phone) .planningMainButtons {
          width:100%;
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:6px;
        }

        :global(.view-phone) .planningMainButtons .btn {
          width:100%;
          min-height:36px;
          padding:0 6px;
          border-radius:9px;
          font-size:9px;
          line-height:1.1;
          white-space:normal;
        }

        :global(.view-phone) .planningMainButtons .btn.primary {
          grid-column:1 / -1;
        }

        :global(.view-phone) .topActionGroup {
          width:100%;
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:6px;
        }

        :global(.view-phone) .topActionGroup > .btn,
        :global(.view-phone) .topActionGroup > .actionDropdown,
        :global(.view-phone) .topActionGroup > .actionDropdown > .btn {
          width:100%;
        }

        :global(.view-phone) .topActionGroup .btn {
          min-height:34px;
          padding:0 6px;
          font-size:9px;
        }

        :global(.view-phone) .toolbar {
          display:grid;
          gap:10px;
        }

        :global(.view-phone) .weekControls {
          min-width:0;
          width:100%;
        }

        :global(.view-phone) .weekControlRow {
          width:100%;
          display:grid;
          grid-template-columns:42px minmax(0,1fr) 42px;
          gap:6px;
        }

        :global(.view-phone) .weekControlRow > :nth-child(1) {
          grid-column:1;
        }

        :global(.view-phone) .weekControlRow > :nth-child(2) {
          grid-column:2;
        }

        :global(.view-phone) .weekControlRow > :nth-child(3) {
          grid-column:3;
        }

        :global(.view-phone) .weekControlRow > :nth-child(n+4) {
          grid-column:1 / -1;
        }

        :global(.view-phone) .weekControlRow input,
        :global(.view-phone) .weekControlRow .btn {
          width:100%;
          min-width:0;
          min-height:36px;
        }

        :global(.view-phone) .planningDisplayControls {
          width:100%;
          display:grid;
          gap:8px;
        }

        :global(.view-phone) .planningSizeControls,
        :global(.view-phone) .planningDeviceControls {
          width:100%;
          align-items:stretch;
        }

        :global(.view-phone) .planningSizeControls > div,
        :global(.view-phone) .planningDeviceControls > div {
          width:100%;
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
        }

        :global(.view-phone) .sizeBtn,
        :global(.view-phone) .deviceBtn {
          width:100%;
          min-width:0;
          height:34px;
          padding:0 4px;
          font-size:9px;
        }

        :global(.view-phone) .dashboardStats {
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:8px;
        }

        :global(.view-phone) .weeklyDashboardCard,
        :global(.view-phone) .savedPlanningCard {
          grid-template-columns:1fr;
        }

        :global(.view-phone) .staffWeekHead,
        :global(.view-phone) .monthCumulativeHead {
          align-items:flex-start;
          flex-direction:column;
        }

        /* Mode tablette simulé depuis la barre supérieure */
        :global(.view-tablet) :global(.pageHead) {
          align-items:flex-start !important;
          gap:14px !important;
        }

        :global(.view-tablet) :global(.pageAction) {
          max-width:520px !important;
        }

        :global(.view-tablet) .planningMainButtons {
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:7px;
        }

        :global(.view-tablet) .topActionGroup {
          display:flex;
          flex-wrap:wrap;
          gap:7px;
        }

        @media (max-width: 760px) {
          :global(.page) {
            padding-left:12px !important;
            padding-right:12px !important;
          }

          :global(.pageHead) {
            display:block !important;
            margin-bottom:12px !important;
          }

          :global(.pageHeadText) {
            width:100% !important;
            margin-bottom:10px !important;
          }

          :global(.pageHeadText h1) {
            margin:0 0 4px !important;
            font-size:26px !important;
            line-height:1.08 !important;
          }

          :global(.pageHeadText p) {
            max-width:none !important;
            margin:0 !important;
            font-size:12px !important;
            line-height:1.35 !important;
          }

          :global(.pageAction) {
            width:100% !important;
            max-width:none !important;
          }

          .topActions {
            width:100%;
            display:grid;
            gap:7px;
          }

          .planningMainButtons {
            width:100%;
            display:grid;
            grid-template-columns:
              repeat(2,minmax(0,1fr));
            gap:6px;
          }

          .planningMainButtons .btn {
            width:100%;
            min-height:36px;
            padding:0 7px;
            border-radius:9px;
            font-size:10px;
            line-height:1.1;
            white-space:normal;
          }

          .topActionGroup {
            width:100%;
            display:grid;
            grid-template-columns:
              repeat(2,minmax(0,1fr));
            gap:6px;
          }

          .topActionGroup > .btn,
          .topActionGroup > .actionDropdown,
          .topActionGroup > .actionDropdown > .btn {
            width:100%;
          }

          .topActionGroup .btn {
            min-height:36px;
            padding:0 7px;
            font-size:10px;
          }

          .actionDropdownMenu {
            left:0;
            right:auto;
            min-width:175px;
          }

          .actionDropdownMenu.right {
            left:auto;
            right:0;
          }

          .toolbar {
            display:grid;
            gap:10px;
          }

          .weekControls {
            min-width:0;
            width:100%;
          }

          .weekControlRow {
            width:100%;
            display:grid;
            grid-template-columns:
              repeat(6,minmax(0,1fr));
            gap:6px;
          }

          .weekControlRow > :nth-child(1) {
            grid-column:span 1;
          }

          .weekControlRow > :nth-child(2) {
            grid-column:span 4;
          }

          .weekControlRow > :nth-child(3) {
            grid-column:span 1;
          }

          .weekControlRow > :nth-child(n+4) {
            grid-column:span 3;
          }

          .weekControlRow input {
            width:100%;
            min-width:0;
            min-height:38px;
          }

          .weekControlRow .btn {
            width:100%;
            min-height:38px;
            padding:0 6px;
            font-size:10px;
            line-height:1.15;
            white-space:normal;
          }

          .planningDisplayControls {
            width:100%;
            display:grid;
            grid-template-columns:1fr;
            gap:8px;
          }

          .planningSizeControls,
          .planningDeviceControls {
            width:100%;
            align-items:stretch;
          }

          .planningSizeControls > div,
          .planningDeviceControls > div {
            width:100%;
            display:grid;
            grid-template-columns:
              repeat(3,minmax(0,1fr));
            overflow:hidden;
          }

          .sizeBtn,
          .deviceBtn {
            width:100%;
            min-width:0;
            height:34px;
            padding:0 5px;
            font-size:9px;
          }

          .planningDevice-phone,
          .planningDevice-tablet,
          .planningDevice-pc {
            max-width:100%;
            margin:0;
          }

          .tableWrap {
            border-radius:10px;
            -webkit-overflow-scrolling:touch;
            scrollbar-width:thin;
          }

          .planningDevice-phone table {
            min-width:900px;
          }

          .planningDevice-tablet table {
            min-width:1040px;
          }

          .dashboardStats {
            grid-template-columns:
              repeat(2,minmax(0,1fr));
          }

          .dashStat {
            min-width:0;
          }

          .dashStat strong {
            font-size:20px;
          }

          .monthlyCompactHead {
            align-items:flex-start;
          }

          .staffWeekHead,
          .monthCumulativeHead {
            align-items:flex-start;
            flex-direction:column;
          }

          .monthlyHeadActions {
            width:100%;
            justify-content:space-between;
          }

          .weeklyDashboardCard {
            grid-template-columns:1fr;
          }

          .weeklyTotal {
            align-items:flex-start;
          }

          .dashboardStatus {
            justify-self:start;
          }

          .savedPlanningCard {
            grid-template-columns:1fr;
          }

          .savedPlanningActions {
            justify-content:flex-start;
          }

          .addEmployee,
          .addEmployee > div {
            width:100%;
          }

          .addEmployee input {
            min-width:0;
            flex:1;
          }
        }


        /* Téléphone tourné horizontalement : adaptation automatique */
        @media (orientation: landscape) and (max-height: 600px) {
          .mobileManagerBar {
            max-width:760px;
            margin-left:auto;
            margin-right:auto;
          }

          .mobileManagerPrimary {
            grid-template-columns:repeat(3,minmax(0,1fr));
          }

          .mobileManagerQuick {
            grid-template-columns:2fr 1fr;
          }

          :global(.view-phone) :global(.page),
          :global(.page) {
            padding-left:8px !important;
            padding-right:8px !important;
          }

          :global(.view-phone) .managerPhoneActions,
          .managerPhoneActions {
            padding:6px;
            margin-bottom:8px;
          }

          :global(.view-phone) .managerPhoneActions .planningMainButtons,
          .managerPhoneActions .planningMainButtons {
            grid-template-columns:
              repeat(3,minmax(0,1fr)) !important;
          }

          :global(.view-phone) .managerPhoneActions .planningMainButtons .btn.primary,
          .managerPhoneActions .planningMainButtons .btn.primary {
            grid-column:auto !important;
          }

          :global(.view-phone) .managerPhoneActions .topActionGroup,
          .managerPhoneActions .topActionGroup {
            grid-template-columns:
              repeat(4,minmax(0,1fr)) !important;
          }

          .planningDisplayControls {
            grid-template-columns:1fr 1fr;
          }

          .planningDevice-phone {
            max-width:100%;
          }

          .planningDevice-phone table {
            min-width:960px;
          }
        }

        @media (max-width: 420px) {
          :global(.pageHeadText h1) {
            font-size:24px !important;
          }

          .planningMainButtons,
          .topActionGroup {
            grid-template-columns:1fr 1fr;
          }

          .planningMainButtons .btn,
          .topActionGroup .btn {
            min-height:34px;
            font-size:9px;
          }

          .weekControlRow > :nth-child(n+4) {
            grid-column:1 / -1;
          }

          .planningDevice-phone table {
            min-width:840px;
          }
        }
        @media print {
          @page { size:A4 landscape; margin:7mm; }
          .noPrint { display:none !important; }
          .printTitle { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:11px; }
          .signatureGrid { grid-template-columns:repeat(2,1fr); }
          .signatureCard { break-inside:avoid; }
          .signatureModal { display:none !important; }
          .tableWrap { overflow:visible; }
          table { min-width:0; width:100%; table-layout:fixed; font-size:8px; }
          th, td { border:1px solid #333; }
          thead th { padding:4px 2px; }
          .employeeHead, .employeeCell { width:70px; min-width:70px; }
          .date { font-size:9px; }
          .specialInfoRow th { padding:2px; }
          .specialInfoInput { min-height:34px; border:0; padding:1px; font-size:7px; resize:none; background:transparent; overflow:visible; }
          .weekday { font-size:8px; }
          td { min-width:0; height:65px; padding:3px; }
          .times { grid-template-columns:1fr; gap:1px; text-align:center; }
          .times span { display:none; }
          .times select { border:0; padding:0; text-align:center; font-size:8px; background:transparent; appearance:none; }
          .breakRow { margin-top:3px; font-size:7px; }
          .breakRow select { border:0; padding:0; font-size:7px; appearance:none; background:transparent; }
          .worked { margin-top:3px; font-size:9px; }
          .offText { height:48px; font-size:12px; }
          .totalHead, .totalCell { width:55px; min-width:55px; }
          .totalCell { font-size:11px; }
        }
.validateWeekBtn {
          width: 100%;
          margin-top: 8px;
          min-height: 34px;
          padding: 6px 8px;
          border: 1px solid #86efac;
          border-radius: 8px;
          background: #ecfdf3;
          color: #067647;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }
        .validateWeekBtn:disabled {
          opacity: 0.72;
          cursor: default;
        }
      `}
</style>
    </Page>
  )
}

function SignaturePad({
  onSave,
  onCancel,
}: {
  onSave: (dataUrl: string) => void
  onCancel: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ratio = window.devicePixelRatio || 1
    const width = Math.max(520, canvas.clientWidth || 520)
    const height = 180

    canvas.width = width * ratio
    canvas.height = height * ratio
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#101828'
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
  }, [])

  const point = (
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

  const start = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    drawingRef.current = true

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const p = point(event)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    canvas.setPointerCapture(event.pointerId)
  }

  const move = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    if (!drawingRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const p = point(event)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  const stop = () => {
    drawingRef.current = false
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }

  const save = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    onSave(canvas.toDataURL('image/png'))
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
        style={{
          width: '100%',
          border: '1px solid #d0d5dd',
          borderRadius: 10,
          background: '#fff',
          touchAction: 'none',
          cursor: 'crosshair',
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          marginTop: 12,
          flexWrap: 'wrap',
        }}
      >
        <button type="button" className="btn" onClick={clear}>
          Effacer
        </button>

        <button type="button" className="btn" onClick={onCancel}>
          Annuler
        </button>

        <button type="button" className="btn primary" onClick={save}>
          Valider la signature
        </button>
      </div>
    </div>
  )
}

export default BarPlanningPage
export {}