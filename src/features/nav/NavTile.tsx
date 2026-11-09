import { useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type Ref } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '@/components/ui'
import { cx } from '@/lib/cx'
import { durationMs, easing } from '@/lib/tokens'
import { sortTransition } from './sortTransition'
import { TileIcon } from './TileIcon'
import type { NavItem } from './types'
import styles from './NavTile.module.scss'

type SortableHandle = Pick<ReturnType<typeof useSortable>, 'attributes' | 'listeners'>

interface NavTileProps {
  item: NavItem
  editing?: boolean
  openInNewTab?: boolean
  /** placeholder：拖拽中留下的空位；lifted：跟随指针的浮起图标 */
  state?: 'idle' | 'placeholder' | 'lifted'
  ref?: Ref<HTMLDivElement>
  style?: CSSProperties
  handle?: SortableHandle
  onLinkClick?: (e: MouseEvent<HTMLAnchorElement>) => void
  onContextMenu?: (e: MouseEvent<HTMLAnchorElement>) => void
  onRemove?: () => void
  /** 超出主屏（行 × 列）的资源库图标：所在行（从 0 起）与当前是否隐藏，用于“追赶”动画 */
  chase?: ChaseState
  /** 内层元素（承载追赶 / 飞入动画） */
  bodyRef?: Ref<HTMLDivElement>
}

export interface ChaseState {
  row: number
  /** 主屏状态下隐藏（且不可交互） */
  hidden: boolean
}

export function NavTile({
  item,
  editing = false,
  openInNewTab = true,
  state = 'idle',
  ref,
  style,
  handle,
  onLinkClick,
  onContextMenu,
  onRemove,
  chase,
  bodyRef,
}: NavTileProps) {
  return (
    <div
      ref={ref}
      style={style}
      inert={chase?.hidden}
      data-nav-id={item.id}
      className={cx(
        styles.tile,
        editing && styles.editing,
        state === 'placeholder' && styles.placeholder,
        state === 'lifted' && styles.lifted,
      )}
      data-tile
    >
      {/* 追赶动画放在内层：根元素的 transform / transition 由拖拽库以内联样式接管 */}
      <div
        ref={bodyRef}
        className={styles.body}
        data-chase={chase ? (chase.hidden ? 'hidden' : 'shown') : undefined}
        style={chase ? ({ '--chase-row': chase.row } as CSSProperties) : undefined}
      >
        <a
          className={styles.link}
          href={item.url}
          target={openInNewTab ? '_blank' : undefined}
          rel="noopener noreferrer"
          draggable={false}
          onClick={onLinkClick}
          onContextMenu={onContextMenu}
          {...handle?.listeners}
          {...handle?.attributes}
          // 保留链接语义，不使用 dnd-kit 默认的 role="button"
          role={undefined}
          title={editing ? undefined : item.url}
        >
          <span className={styles.icon}>
            <TileIcon name={item.name} url={item.url} icon={item.icon} />
          </span>
          <span className={styles.label}>{item.name}</span>
        </a>
        {editing && state === 'idle' && (
          <button
            type="button"
            className={styles.remove}
            aria-label={`删除 ${item.name}`}
            onClick={onRemove}
          >
            <Icon name="remove" size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

interface SortableNavTileProps {
  item: NavItem
  editing: boolean
  openInNewTab: boolean
  onLinkClick: (e: MouseEvent<HTMLAnchorElement>, item: NavItem) => void
  onContextMenu: (e: MouseEvent<HTMLAnchorElement>, item: NavItem) => void
  onRemove: (item: NavItem) => void
  chase?: ChaseState
  /** 当前处于主屏（非资源库）状态 */
  onHome: boolean
}

export function SortableNavTile({
  item,
  editing,
  openInNewTab,
  onLinkClick,
  onContextMenu,
  onRemove,
  chase,
  onHome,
}: SortableNavTileProps) {
  const bodyRef = useRef<HTMLDivElement>(null)

  // 主屏状态下，从“隐藏的资源库图标”变为主屏图标（如删除主屏图标后补位、调大行数）：
  // 从屏幕下方飞入，提示资源库就在下方。（按 React 推荐的方式在渲染中比较上一次的值）
  const hidden = chase?.hidden ?? false
  const [prevHidden, setPrevHidden] = useState(hidden)
  const [entering, setEntering] = useState(false)
  if (hidden !== prevHidden) {
    setPrevHidden(hidden)
    if (prevHidden && !chase && onHome) setEntering(true)
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    transition: sortTransition(),
  })

  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!entering || !body) return
    setEntering(false)
    const fromY = window.innerHeight - body.getBoundingClientRect().top
    body.animate(
      [
        { translate: `0 ${fromY}px`, opacity: 0 },
        { translate: '0 0', opacity: 1 },
      ],
      {
        duration: durationMs('extra-long'),
        easing: easing('expressive'),
        delay: durationMs('short') / 2,
        // 延迟期间也停在起始帧（屏幕下方、透明），避免先在目标位置闪一下
        fill: 'backwards',
      },
    )
  }, [entering])

  return (
    <NavTile
      ref={setNodeRef}
      bodyRef={bodyRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      item={item}
      editing={editing}
      openInNewTab={openInNewTab}
      state={isDragging ? 'placeholder' : 'idle'}
      handle={{ attributes, listeners }}
      onLinkClick={(e) => onLinkClick(e, item)}
      onContextMenu={(e) => onContextMenu(e, item)}
      onRemove={() => onRemove(item)}
      chase={chase}
    />
  )
}
