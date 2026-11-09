import type { DateFormat } from '@/features/settings/types'

const formatters = new Map<string, Intl.DateTimeFormat>()

/** 缓存 Intl.DateTimeFormat（构造开销较大，时钟每秒都要格式化） */
function formatter(options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(options)
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, options)
    formatters.set(key, f)
  }
  return f
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatTime(date: Date, use24Hour: boolean) {
  return formatter({ hour: '2-digit', minute: '2-digit', hourCycle: use24Hour ? 'h23' : 'h12' }).format(date)
}

/** 日期行文字；日期与星期都不显示时返回空字符串 */
export function formatDate(date: Date, format: DateFormat, showWeekday: boolean) {
  const weekday = showWeekday ? ({ weekday: 'long' } as const) : {}
  switch (format) {
    case 'month-day':
      return formatter({ month: 'long', day: 'numeric', ...weekday }).format(date)
    case 'full':
      return formatter({ year: 'numeric', month: 'long', day: 'numeric', ...weekday }).format(date)
    case 'iso': {
      const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      return showWeekday ? `${iso} ${formatter(weekday).format(date)}` : iso
    }
    case 'none':
      return showWeekday ? formatter(weekday).format(date) : ''
  }
}
