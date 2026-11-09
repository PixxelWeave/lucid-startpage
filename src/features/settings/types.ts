export type ThemeMode = 'system' | 'light' | 'dark'
/** 时钟字体，对应 token 中的字体族（default → brand） */
export type ClockFont = 'default' | 'rounded' | 'serif' | 'mono'
export type ClockWeight = 'light' | 'regular' | 'bold'
/** 日期格式：不显示 / 11月9日 / 2026年11月9日 / 2026-11-09 */
export type DateFormat = 'none' | 'month-day' | 'full' | 'iso'

export interface Settings {
  theme: ThemeMode
  showClock: boolean
  use24Hour: boolean
  clockFont: ClockFont
  clockWeight: ClockWeight
  /** 时钟与日期的文字颜色（#rrggbb）；null 跟随主题 */
  clockColor: string | null
  /** 时钟与日期的不透明度（%） */
  clockOpacity: number
  dateFormat: DateFormat
  showWeekday: boolean
  /** 点击导航时在新标签页打开 */
  openInNewTab: boolean
  /** 主屏图标列数（窗口过窄时按实际可容纳的列数显示） */
  homeColumns: number
  /** 主屏图标行数；超出 行 × 列 的图标只在资源库中显示 */
  homeRows: number
  /** 主屏内容（时钟）与页面顶部的距离，占窗口高度的百分比 */
  homeTopOffset: number
  /** 背景图片 id（图片本身存在 IndexedDB，见 features/background）；null 为不使用 */
  backgroundImage: string | null
  /** 背景图片上的遮罩浓度（%），用于提高文字可读性 */
  backgroundDim: number
}

/** 数值类设置的取值范围 */
export const SETTING_RANGES = {
  homeColumns: { min: 3, max: 10 },
  homeRows: { min: 1, max: 6 },
  homeTopOffset: { min: 0, max: 40 },
  clockOpacity: { min: 20, max: 100 },
  backgroundDim: { min: 0, max: 80 },
} as const

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  showClock: true,
  use24Hour: true,
  clockFont: 'default',
  clockWeight: 'regular',
  clockColor: null,
  clockOpacity: 100,
  dateFormat: 'month-day',
  showWeekday: true,
  openInNewTab: true,
  homeColumns: 8,
  homeRows: 3,
  homeTopOffset: 18,
  backgroundImage: null,
  backgroundDim: 20,
}

const THEMES: readonly ThemeMode[] = ['system', 'light', 'dark']
export const CLOCK_FONTS: readonly ClockFont[] = ['default', 'rounded', 'serif', 'mono']
export const CLOCK_WEIGHTS: readonly ClockWeight[] = ['light', 'regular', 'bold']
export const DATE_FORMATS: readonly DateFormat[] = ['none', 'month-day', 'full', 'iso']

type NumericKey = keyof typeof SETTING_RANGES

/** 与默认值合并并校验类型；缺失或非法字段使用默认值，数值限制在取值范围内。 */
export function parseSettings(raw: unknown): Settings | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const bool = (key: keyof Settings) =>
    typeof r[key] === 'boolean' ? (r[key] as boolean) : (DEFAULT_SETTINGS[key] as boolean)
  const int = (key: NumericKey) => {
    const v = r[key]
    if (typeof v !== 'number' || !Number.isFinite(v)) return DEFAULT_SETTINGS[key]
    const { min, max } = SETTING_RANGES[key]
    return Math.min(max, Math.max(min, Math.round(v)))
  }
  const oneOf = <K extends keyof Settings>(key: K, values: readonly Settings[K][]) =>
    values.includes(r[key] as Settings[K]) ? (r[key] as Settings[K]) : DEFAULT_SETTINGS[key]
  const color = (v: unknown) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null)

  return {
    theme: oneOf('theme', THEMES),
    showClock: bool('showClock'),
    use24Hour: bool('use24Hour'),
    clockFont: oneOf('clockFont', CLOCK_FONTS),
    clockWeight: oneOf('clockWeight', CLOCK_WEIGHTS),
    clockColor: color(r.clockColor),
    clockOpacity: int('clockOpacity'),
    dateFormat: oneOf('dateFormat', DATE_FORMATS),
    showWeekday: bool('showWeekday'),
    openInNewTab: bool('openInNewTab'),
    homeColumns: int('homeColumns'),
    homeRows: int('homeRows'),
    homeTopOffset: int('homeTopOffset'),
    backgroundImage: typeof r.backgroundImage === 'string' ? r.backgroundImage : null,
    backgroundDim: int('backgroundDim'),
  }
}

/** 时钟用到的设置 */
export type ClockSettings = Pick<
  Settings,
  'use24Hour' | 'clockFont' | 'clockWeight' | 'clockColor' | 'clockOpacity' | 'dateFormat' | 'showWeekday'
>
