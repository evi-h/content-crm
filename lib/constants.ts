export const BUSINESS_COLORS = [
  { id: 'rose',    label: 'Rose',    hex: '#f43f5e', light: '#fff1f2' },
  { id: 'orange',  label: 'Orange',  hex: '#f97316', light: '#fff7ed' },
  { id: 'amber',   label: 'Amber',   hex: '#f59e0b', light: '#fffbeb' },
  { id: 'lime',    label: 'Lime',    hex: '#84cc16', light: '#f7fee7' },
  { id: 'emerald', label: 'Emerald', hex: '#10b981', light: '#ecfdf5' },
  { id: 'teal',    label: 'Teal',    hex: '#14b8a6', light: '#f0fdfa' },
  { id: 'sky',     label: 'Sky',     hex: '#0ea5e9', light: '#f0f9ff' },
  { id: 'indigo',  label: 'Indigo',  hex: '#6366f1', light: '#eef2ff' },
  { id: 'violet',  label: 'Violet',  hex: '#8b5cf6', light: '#f5f3ff' },
  { id: 'pink',    label: 'Pink',    hex: '#ec4899', light: '#fdf2f8' },
]

export type BusinessColor = typeof BUSINESS_COLORS[number]
