import { durationMs, easing } from '@/lib/tokens'

let base: { duration: number; easing: string } | null = null

/**
 * 图标位移动画参数（固定时长）：拖拽排序让位 / 松手落位、删除后补位、字母视图切换共用。
 * duration extra-long + easing standard（起步柔和；dnd-kit 默认 200ms ease 偏快）。读取一次后缓存。
 */
export function sortTransition() {
  base ??= { duration: durationMs('extra-long'), easing: easing('standard') }
  return base
}
