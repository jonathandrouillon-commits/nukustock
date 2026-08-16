
'use client'

export type WeightDisplaySettings = {
  unitWeight: boolean
  caseWeight: boolean
  totalWeight: boolean
}

export const WEIGHT_DISPLAY_SETTINGS_KEY =
  'nukustock_weight_display_v1'

export const DEFAULT_WEIGHT_DISPLAY_SETTINGS: WeightDisplaySettings = {
  unitWeight: true,
  caseWeight: true,
  totalWeight: true,
}

export function getWeightDisplaySettings(): WeightDisplaySettings {
  if (typeof window === 'undefined') {
    return DEFAULT_WEIGHT_DISPLAY_SETTINGS
  }

  try {
    const raw = localStorage.getItem(
      WEIGHT_DISPLAY_SETTINGS_KEY
    )

    if (!raw) {
      return DEFAULT_WEIGHT_DISPLAY_SETTINGS
    }

    return {
      ...DEFAULT_WEIGHT_DISPLAY_SETTINGS,
      ...JSON.parse(raw),
    }
  } catch {
    return DEFAULT_WEIGHT_DISPLAY_SETTINGS
  }
}

export function formatWeightKg(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return '—'
  }

  return `${Number(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} kg`
}