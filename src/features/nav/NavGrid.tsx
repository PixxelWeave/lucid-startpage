import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS as DndCSS } from '@dnd-kit/utilities'
import { Button, Icon, Menu, Modal, Snackbar, type MenuAnchor, type MenuItem } from '@/components/ui'
import { useSettings } from '@/features/settings/SettingsContext'
import { cx } from '@/lib/cx'
import { groupByInitial } from '@/lib/initial'
import { shareLink } from '@/lib/share'
import { swallowNextClick } from '@/lib/swallowClick'
import { hostnameOf } from '@/lib/url'
import { filterNavItems } from './filter'
import { LONG_PRESS, LONG_PRESS_TOLERANCE, PRESS_DRAG_DISTANCE } from './gestures'
import { NavItemDialog } from './NavItemDialog'
import { NavTile, SortableNavTile, type ChaseState } from './NavTile'
import { sortTransition } from './sortTransition'
import type { NavItem } from './types'
import type { NavItemsApi } from './useNavItems'
import styles from './NavGrid.module.scss'

/** 拖拽库默认的落位副作用：落位期间隐藏原位的图标 */
const hideActiveWhileDropping = defaultDropAnimationSideEffects({ styles: { active: { opacity: '0' } } })

let dropAnimation: DropAnimation | null = null

/**
 * 松手落位：位移与让位动画一致（sortTransition）；同时把浮起放大的图标缩回原尺寸，
 * 否则落位结束时会从放大状态突然跳回（长按弹出菜单后原地松手也走这里）。
 * 首次渲染时再创建：时长读自 CSS 变量，模块加载时样式可能尚未生效
 */
function getDropAnimation(): DropAnimation {
  dropAnimation ??= {
    ...sortTransition(),
    // 拖拽库在首尾帧相同（长按后原地松手，位置没变）时会跳过落位动画，连同下面的缩回一起；
    // 标上 offset 使首尾帧不同，保证总会播放
    keyframes: ({ transform }) => [
      { transform: DndCSS.Transform.toString(transform.initial), offset: 0 },
      { transform: DndCSS.Transform.toString(transform.final), offset: 1 },
    ],
    sideEffects: (params) => {
      const cleanup = hideActiveWhileDropping(params)
      const { duration, easing: curve } = sortTransition()
      params.dragOverlay.node
        .querySelector('[data-tile-icon]')
        ?.animate({ transform: 'scale(1)', boxShadow: 'none' }, { duration, easing: curve, fill: 'forwards' })
      return cleanup
    },
  }
  return dropAnimation
}

type DialogState = { mode: 'add' } | { mode: 'edit'; item: NavItem } | null

interface NavGridProps {
  nav: NavItemsApi
  /** 编辑（抖动）模式，由外部控制以便与顶栏的“完成”按钮联动 */
  editing: boolean
  onEditingChange: (editing: boolean) => void
  /** 搜索关键词（名称 / 网址）；有关键词时只显示匹配项，并暂停拖拽排序 */
  query?: string
  /** 网格列数（已按窗口宽度限制） */
  columns: number
  /** 主屏显示的图标数（行 × 列）；其余只在资源库中显示 */
  homeCount: number
  /** 是否处于资源库（展开）状态 */
  expanded: boolean
  /** 按首字母排序显示（仅改变显示顺序，不改动保存的顺序；排序时暂停拖拽） */
  sorted?: boolean
}

export function NavGrid({
  nav,
  editing,
  onEditingChange: setEditing,
  query = '',
  columns,
  homeCount,
  expanded,
  sorted = false,
}: NavGridProps) {
  const { items, add, update, remove, move } = nav
  const { openInNewTab } = useSettings().settings

  const [activeId, setActiveId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  // 每次打开对话框换一个 key，让表单状态重新初始化
  const [dialogKey, setDialogKey] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<NavItem | null>(null)
  /**
   * 操作菜单：目标导航与弹出位置；关闭时保留内容，供退场动画使用。
   * 右键：在指针处弹出；触屏长按：锚定在图标旁（anchor），不自动聚焦第一项（touch）
   */
  const [menu, setMenu] = useState<{
    item: NavItem
    x: number
    y: number
    anchor?: MenuAnchor
    touch?: boolean
    open: boolean
  } | null>(null)
  const menuOpen = menu?.open ?? false
  const [toast, setToast] = useState<string | null>(null)
  const closeToast = useCallback(() => setToast(null), [])
  // 拖拽结束后浏览器仍会派发一次 click，需要吞掉
  const suppressClick = useRef(false)
  /**
   * 触屏长按（iOS 主屏幕）：拖拽库按长按激活后先弹出菜单、暂不进入编辑模式；
   * 按住继续移动超过 PRESS_DRAG_DISTANCE 才收起菜单、进入编辑模式并拖动；原地松手只留下菜单
   */
  const pressMenu = useRef(false)

  const modalOpen = dialog !== null || pendingDelete !== null || menuOpen

  // 非编辑模式：长按激活（同时进入编辑模式）；编辑模式：按下即可拖动
  const pointerConstraint = useMemo(
    () => (editing ? { distance: 4 } : { delay: LONG_PRESS, tolerance: 6 }),
    [editing],
  )
  const touchConstraint = useMemo(
    () =>
      editing
        ? { delay: 100, tolerance: LONG_PRESS_TOLERANCE }
        : { delay: LONG_PRESS, tolerance: LONG_PRESS_TOLERANCE },
    [editing],
  )
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: pointerConstraint }),
    useSensor(TouchSensor, { activationConstraint: touchConstraint }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Enter 留给链接本身，Space 开始拖动
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  // 编辑模式：Esc 或点击空白处退出（iOS 行为）
  useEffect(() => {
    if (!editing) return

    const onKeyDown = (e: KeyboardEvent) => {
      // 已被其他控件处理的 Esc（如搜索框清空内容）不退出编辑模式
      if (e.key === 'Escape' && !e.defaultPrevented && !activeId && !modalOpen) setEditing(false)
    }
    const onClick = (e: globalThis.MouseEvent) => {
      if (suppressClick.current) {
        suppressClick.current = false
        return
      }
      const target = e.target as Element
      // 被这次点击自身移除的元素（如菜单里的“编辑主屏幕”，进入编辑模式后不再显示）不算点击空白处
      if (!target.isConnected) return
      if (modalOpen || target.closest('[data-tile], [data-keep-editing], dialog, [popover]')) return
      setEditing(false)
    }

    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onClick)
    }
  }, [editing, activeId, modalOpen, setEditing])

  // 新的一次按下开始时，清掉上一次拖拽遗留的标记（触屏拖拽结束后不一定会派发 click）
  useEffect(() => {
    const onPointerDown = () => {
      suppressClick.current = false
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [])

  // ---- 位置变化动画（FLIP）：删除后补位、按首字母排序 / 还原 ----
  // dnd-kit 只在拖拽过程中测量位置，这些变化需要自己做动画：每次提交后记下各图标在网格中的位置
  // （offsetLeft/Top，不受位移动画影响）；需要动画时，从上一次的位置平滑移到新位置。
  // 拖拽排序由 dnd-kit 负责，搜索过滤不做动画。
  const gridRef = useRef<HTMLDivElement>(null)
  const lastPositions = useRef(new Map<string, { x: number; y: number }>())
  const reflowNext = useRef(false)
  const lastSorted = useRef(sorted)

  const removeWithReflow = (id: string) => {
    reflowNext.current = true
    remove(id)
  }

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const tiles = [...grid.querySelectorAll<HTMLElement>('[data-nav-id]')]

    // 排序 / 还原（资源库中）同样做重排动画
    if (lastSorted.current !== sorted) {
      lastSorted.current = sorted
      if (expanded) reflowNext.current = true
    }

    if (reflowNext.current) {
      reflowNext.current = false
      const { duration, easing: curve } = sortTransition()
      for (const el of tiles) {
        const prev = lastPositions.current.get(el.dataset.navId!)
        // 隐藏中的资源库图标不必动画；正在从下方飞入的补位图标由飞入动画负责
        if (!prev || el.inert || (el.firstElementChild?.getAnimations().length ?? 0) > 0) continue
        const dx = prev.x - el.offsetLeft
        const dy = prev.y - el.offsetTop
        if (!dx && !dy) continue
        el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], { duration, easing: curve })
      }
    }

    lastPositions.current = new Map(tiles.map((el) => [el.dataset.navId!, { x: el.offsetLeft, y: el.offsetTop }]))
  })

  if (!items) return null

  const searching = query.trim() !== ''
  const filtered = searching ? filterNavItems(items, query) : items
  // 字母视图：按首字母分组，每个字母至少一行（左侧字母，右侧图标，放不下换行）
  const groups = sorted ? groupByInitial(filtered, (it) => it.name) : null
  const visibleItems = groups ? groups.flatMap((g) => g.items) : filtered
  // 关键词搜索与字母视图都是“另一种搜索”：显示顺序与保存顺序 / 主屏位置无关，
  // 禁用拖拽排序，只保留编辑与删除
  const reordered = searching || sorted

  // 超出主屏（行 × 列）的位置：主屏状态下隐藏且不可交互，进入资源库时从下方“追”上来。
  // 主屏内的位置返回 undefined。“添加”也占一个位置
  const chaseOf = (index: number): ChaseState | undefined =>
    reordered || index < homeCount
      ? undefined
      : { row: Math.floor((index - homeCount) / columns), hidden: !expanded }
  const addChase = chaseOf(visibleItems.length)

  // 资源库 + 编辑模式：框出前 行数 行（即主屏会显示的图标），拖动时可直接看到哪些会上主屏
  const showHomeFrame = expanded && !reordered
  const homeFrameVisible = showHomeFrame && editing

  // 主屏状态下拖拽排序只在主屏图标之间进行，不会落到隐藏的资源库位置
  const collisionDetection: CollisionDetection = (args) => {
    if (expanded || reordered) return closestCenter(args)
    const homeIds = new Set(visibleItems.slice(0, homeCount).map((it) => it.id))
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => homeIds.has(String(c.id))),
    })
  }

  const activeItem = activeId ? items.find((it) => it.id === activeId) : undefined

  const openDialog = (state: NonNullable<DialogState>) => {
    setDialogKey((k) => k + 1)
    setDialog(state)
  }

  /** 触屏长按：在图标旁弹出菜单 */
  const openPressMenu = (item: NavItem, anchor: MenuAnchor) => {
    setMenu({ item, x: anchor.left, y: anchor.bottom, anchor, touch: true, open: true })
  }

  const handleDragStart = ({ active, activatorEvent }: DragStartEvent) => {
    const id = String(active.id)
    setActiveId(id)
    const touch = typeof TouchEvent !== 'undefined' && activatorEvent instanceof TouchEvent
    const item = items.find((it) => it.id === id)
    // 菜单锚定在图标本身（不含名称与格子留白）；拖拽开始时拖拽库尚未测量位置，直接取元素位置
    const rect = gridRef.current
      ?.querySelector(`[data-nav-id="${CSS.escape(id)}"] [data-tile-icon]`)
      ?.getBoundingClientRect()
    if (touch && !editing && item && rect) {
      pressMenu.current = true
      openPressMenu(item, rect)
      return
    }
    setEditing(true)
  }

  const handleDragMove = ({ delta }: DragMoveEvent) => {
    // 长按弹出菜单后继续移动：收起菜单，进入编辑模式并拖动
    if (pressMenu.current && Math.hypot(delta.x, delta.y) > PRESS_DRAG_DISTANCE) {
      pressMenu.current = false
      setMenu((m) => (m ? { ...m, open: false } : m))
      setEditing(true)
    }
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    suppressClick.current = true
    // 松手后浏览器补发的 click 会打开图标链接（拖拽库只阻止了传递，没有阻止默认行为）
    swallowNextClick()
    // 长按后原地松手：不算拖动，只留下菜单
    if (pressMenu.current) {
      pressMenu.current = false
      return
    }
    if (over && active.id !== over.id) move(String(active.id), String(over.id))
  }

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>, item: NavItem) => {
    if (suppressClick.current) {
      suppressClick.current = false
      e.preventDefault()
      return
    }
    if (editing) {
      e.preventDefault()
      openDialog({ mode: 'edit', item })
    }
  }

  const handleContextMenu = (e: MouseEvent<HTMLAnchorElement>, item: NavItem) => {
    e.preventDefault()
    if (activeId) return
    // 键盘触发（菜单键 / Shift+F10）时没有指针坐标，对齐到图标下方
    const fromKeyboard = e.clientX === 0 && e.clientY === 0
    const rect = e.currentTarget.getBoundingClientRect()
    setMenu({
      item,
      x: fromKeyboard ? rect.left : e.clientX,
      y: fromKeyboard ? rect.bottom : e.clientY,
      open: true,
    })
  }

  const handleShare = async (item: NavItem) => {
    const result = await shareLink(item.name, item.url)
    if (result === 'copied') setToast('链接已复制')
    if (result === 'failed') setToast('无法分享，请手动复制链接')
  }

  const renderTile = (item: NavItem, index?: number) => (
    <SortableNavTile
      key={item.id}
      item={item}
      editing={editing}
      openInNewTab={openInNewTab}
      onLinkClick={handleLinkClick}
      onContextMenu={handleContextMenu}
      onRemove={setPendingDelete}
      chase={index === undefined ? undefined : chaseOf(index)}
      onHome={!expanded}
      // 拖拽禁用时（搜索 / 字母视图）由图标自己处理触屏长按
      onLongPress={reordered ? openPressMenu : undefined}
    />
  )

  const menuItems: MenuItem[] = menu
    ? [
        { key: 'edit', label: '编辑', icon: 'edit', onSelect: () => openDialog({ mode: 'edit', item: menu.item }) },
        { key: 'share', label: '分享', icon: 'share', onSelect: () => void handleShare(menu.item) },
        // 触屏上长按不再直接进入编辑模式，由这一项进入（iOS 主屏幕的“编辑主屏幕”）
        ...(editing
          ? []
          : [{ key: 'arrange', label: '编辑主屏幕', icon: 'apps' as const, onSelect: () => setEditing(true) }]),
        {
          key: 'delete',
          label: '删除',
          icon: 'delete',
          danger: true,
          divider: true,
          onSelect: () => setPendingDelete(menu.item),
        },
      ]
    : []

  return (
    <>
      <div
        ref={gridRef}
        className={cx(styles.grid, homeFrameVisible && styles.gridFramed, groups && styles.grouped)}
      >
        {showHomeFrame && (
          <div
            className={cx(styles.homeFrame, homeFrameVisible && styles.homeFrameVisible)}
            style={{ '--home-rows': Math.max(1, Math.round(homeCount / columns)) } as CSSProperties}
            aria-hidden="true"
          >
            <span className={styles.homeFrameLabel}>主屏</span>
          </div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            pressMenu.current = false
            setActiveId(null)
            suppressClick.current = true
            swallowNextClick()
          }}
        >
          <SortableContext
            items={visibleItems.map((it) => it.id)}
            strategy={rectSortingStrategy}
            // 搜索 / 字母视图时禁用拖拽排序（不替换 sensors，避免 dnd-kit 内部 Hook 依赖长度变化）
            disabled={reordered}
          >
            {groups
              ? groups.map((group) => (
                  <section key={group.letter} className={styles.group} aria-label={group.letter}>
                    <div className={styles.groupHeader} aria-hidden="true">
                      <span className={styles.groupLetter}>{group.letter}</span>
                    </div>
                    <div className={styles.groupTiles}>{group.items.map((item) => renderTile(item))}</div>
                  </section>
                ))
              : visibleItems.map((item, index) => renderTile(item, index))}
          </SortableContext>

          {/* 渲染到 body：图标区有 transform，会让 fixed 定位的浮层错位 */}
          {createPortal(
            // 松手落位动画与让位动画一致
            <DragOverlay dropAnimation={getDropAnimation()}>
              {activeItem && <NavTile item={activeItem} editing state="lifted" />}
            </DragOverlay>,
            document.body,
          )}
        </DndContext>

        {!reordered && (
          <button
            type="button"
            className={styles.add}
            onClick={() => openDialog({ mode: 'add' })}
            data-tile
            data-chase={addChase ? (addChase.hidden ? 'hidden' : 'shown') : undefined}
            style={addChase ? ({ '--chase-row': addChase.row } as CSSProperties) : undefined}
            inert={addChase?.hidden}
          >
            <span className={styles.addIcon}>
              <Icon name="add" size={28} />
            </span>
            <span className={styles.addLabel}>添加</span>
          </button>
        )}
      </div>

      {searching && visibleItems.length === 0 && (
        <p className={styles.empty}>没有找到与“{query.trim()}”相关的导航</p>
      )}

      <Menu
        open={menuOpen}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        anchor={menu?.anchor}
        focusFirst={!menu?.touch}
        label="导航操作"
        title={menu?.item.name}
        subtitle={menu ? hostnameOf(menu.item.url) : undefined}
        items={menuItems}
        onClose={() => setMenu((m) => (m ? { ...m, open: false } : m))}
      />

      <Snackbar message={toast} onClose={closeToast} />

      <NavItemDialog
        key={dialogKey}
        open={dialog !== null}
        item={dialog?.mode === 'edit' ? dialog.item : undefined}
        onClose={() => setDialog(null)}
        onSubmit={(data) => {
          if (dialog?.mode === 'edit') update(dialog.item.id, data)
          else add(data)
          setDialog(null)
        }}
      />

      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title={`删除“${pendingDelete?.name ?? ''}”？`}
        actions={
          <>
            <Button variant="text" onClick={() => setPendingDelete(null)}>
              取消
            </Button>
            <Button
              variant="text"
              danger
              onClick={() => {
                if (pendingDelete) removeWithReflow(pendingDelete.id)
                setPendingDelete(null)
              }}
            >
              删除
            </Button>
          </>
        }
      />
    </>
  )
}
