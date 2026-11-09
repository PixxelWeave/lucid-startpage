/** 解析 #rgb / #rrggbb；其他格式返回 null。 */
function parseHex(color: string): [number, number, number] | null {
  const m = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color.trim())
  if (!m) return null
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

/** 是否为深色（用于决定其上的文字用浅色还是深色）。无法解析时视为浅色。 */
export function isDarkColor(color: string): boolean {
  const rgb = parseHex(color)
  if (!rgb) return false
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.4
}

/** 规范化为 #rrggbb（供 <input type="color"> 使用）；无法解析时返回 fallback。 */
export function toHex6(color: string | null, fallback = '#ffffff'): string {
  const rgb = color ? parseHex(color) : null
  return rgb ? `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}` : fallback
}
