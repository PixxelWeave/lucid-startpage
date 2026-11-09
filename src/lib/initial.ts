/**
 * 名称首字母：英文取首字母，中文取拼音首字母，其他（数字、符号等）为 '#'。
 *
 * 中文拼音首字母借助浏览器 Intl.Collator('zh-CN') 的拼音排序推算：
 * 每个字母对应该拼音区间内排序最靠前的一个汉字，比较目标汉字落在哪个区间。
 * （I、U、V 不作为拼音声母开头，没有对应区间。）
 */
const collator = new Intl.Collator('zh-CN', { numeric: true })
const BOUNDARY_HAN = '阿八嚓哒妸发旮哈讥咔垃痳拏噢妑七呥扨它穵夕丫帀'
const BOUNDARY_LETTERS = 'ABCDEFGHJKLMNOPQRSTWXYZ'

export function initialOf(name: string): string {
  const ch = Array.from(name.trim())[0] ?? ''
  if (/[a-z]/i.test(ch)) return ch.toUpperCase()
  if (!/\p{Script=Han}/u.test(ch)) return '#'

  let letter = '#'
  for (let i = 0; i < BOUNDARY_HAN.length; i++) {
    if (collator.compare(ch, BOUNDARY_HAN[i]) < 0) break
    letter = BOUNDARY_LETTERS[i]
  }
  return letter
}

/** 按首字母排序（A–Z，'#' 组在最后），同一字母内按名称排序。返回新数组。 */
export function sortByInitial<T>(list: readonly T[], getName: (item: T) => string): T[] {
  const keyed = list.map((item) => ({ item, name: getName(item), initial: initialOf(getName(item)) }))
  keyed.sort((a, b) => {
    if (a.initial !== b.initial) {
      if (a.initial === '#') return 1
      if (b.initial === '#') return -1
      return a.initial < b.initial ? -1 : 1
    }
    return collator.compare(a.name, b.name)
  })
  return keyed.map((k) => k.item)
}

export interface InitialGroup<T> {
  /** 'A'–'Z' 或 '#' */
  letter: string
  items: T[]
}

/** 按首字母分组（A–Z，'#' 组在最后），只包含有内容的字母；组内按名称排序。 */
export function groupByInitial<T>(list: readonly T[], getName: (item: T) => string): InitialGroup<T>[] {
  const groups: InitialGroup<T>[] = []
  for (const item of sortByInitial(list, getName)) {
    const letter = initialOf(getName(item))
    const last = groups.at(-1)
    if (last?.letter === letter) last.items.push(item)
    else groups.push({ letter, items: [item] })
  }
  return groups
}
