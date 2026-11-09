export type IconSource =
  /** iTab 图标库中的图案（相对 CDN 的路径） */
  | { kind: 'library'; path: string }
  /** Google favicon 服务；domain 缺省为网址本身的域名，也可指定为根域名 */
  | { kind: 'favicon'; domain?: string }
  /** 用户上传的图片（data URL） */
  | { kind: 'image'; src: string }
  /** 名称首字 */
  | { kind: 'letter' }

export interface NavIcon {
  source: IconSource
  /** 背景填充：开启时显示圆角矩形底色，关闭时背景透明 */
  fill: boolean
  /** 图案占图标的比例，0.3 – 1 */
  scale: number
  /** 背景颜色（CSS 颜色）；null 表示默认白色 */
  background: string | null
}

export interface NavItem {
  id: string
  name: string
  url: string
  icon: NavIcon
}
