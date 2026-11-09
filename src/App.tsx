import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Button, ExpandableSearch, IconButton } from '@/components/ui'
import Clock from '@/components/Clock/Clock'
import { Background } from '@/features/background/Background'
import { useExpandGestures } from '@/features/home/useExpandGestures'
import { useGridColumns } from '@/features/home/useGridColumns'
import { useHomeOffset } from '@/features/home/useHomeOffset'
import { filterNavItems } from '@/features/nav/filter'
import { NavGrid } from '@/features/nav/NavGrid'
import { useNavItems } from '@/features/nav/useNavItems'
import { useSettings } from '@/features/settings/SettingsContext'
import { SettingsDialog } from '@/features/settings/SettingsDialog'
import { cx } from '@/lib/cx'
import { durationMs } from '@/lib/tokens'
import styles from './App.module.scss'

/** 首页状态下，时钟与图标区之间的间距（px），与 t.space(12) 一致 */
const HOME_GAP = 48

function App() {
  const nav = useNavItems()
  const { settings } = useSettings()
  const [editing, setEditing] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  /** 展开：时钟退避，图标区铺满并可内部滚动 */
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  /** 资源库按首字母排序显示（只影响显示，退出资源库时还原） */
  const [sorted, setSorted] = useState(false)
  /** 切换动画进行中：图标区禁止滚动，切换只负责进入 / 退出，不附带滚动 */
  const [switching, setSwitching] = useState(false)
  /** 首屏：布局（时钟高度、列数）在首帧测量后才确定，期间关闭过渡，图标区直接停在对应位置 */
  const [booting, setBooting] = useState(true)

  const heroRef = useRef<HTMLElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const homeOffset = useHomeOffset(heroRef, HOME_GAP)
  // 主屏布局：列数受窗口宽度限制；主屏显示 行 × 列 个图标，其余在资源库中
  const columns = useGridColumns(scrollerRef, settings.homeColumns)
  const homeCount = columns * settings.homeRows

  const expandedRef = useRef(expanded)
  useEffect(() => {
    expandedRef.current = expanded
  })

  const expand = useCallback(() => {
    if (expandedRef.current) return
    expandedRef.current = true
    setExpanded(true)
    setSwitching(true)
  }, [])
  const collapse = useCallback(() => {
    if (expandedRef.current) {
      expandedRef.current = false
      setExpanded(false)
      setSwitching(true)
    }
    setQuery('')
    setSearchOpen(false)
    setSorted(false)
    scrollerRef.current?.scrollTo({ top: 0 })
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }, [])

  useEffect(() => {
    // 两帧之后：首帧已按测量结果绘制完毕
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setBooting(false))
    })
    return () => cancelAnimationFrame(id)
  }, [])

  useExpandGestures({ expanded, onExpand: expand, onCollapse: collapse, editing })

  // 兜底：若 transitionend 没有触发（如动画被打断），时长结束后也解除
  useEffect(() => {
    if (!switching) return
    const id = window.setTimeout(() => setSwitching(false), durationMs('extra-long') + 100)
    return () => window.clearTimeout(id)
  }, [switching])

  // 搜索框回车：打开第一个匹配项
  const openFirstMatch = () => {
    const first = filterNavItems(nav.items ?? [], query)[0]
    if (!first) return
    if (settings.openInNewTab) window.open(first.url, '_blank', 'noopener')
    else window.location.href = first.url
  }

  return (
    <>
      <Background />

      {/* 右上角：平时是设置入口，编辑模式下换成“完成”（iOS） */}
      {/* 资源库中不显示设置入口（编辑模式的“完成”仍显示） */}
      <div className={cx(styles.toolbar, expanded && !editing && styles.toolbarHidden)} data-keep-editing>
        {editing ? (
          <Button variant="tonal" onClick={() => setEditing(false)}>
            完成
          </Button>
        ) : (
          <IconButton
            icon="settings"
            label="设置"
            tabIndex={expanded ? -1 : 0}
            onClick={() => setSettingsOpen(true)}
          />
        )}
      </div>

      <main
        className={cx(
          styles.app,
          booting && styles.booting,
          expanded && styles.expanded,
          switching && styles.switching,
        )}
        style={
          {
            '--home-offset': `${homeOffset}px`,
            '--home-top': `${settings.homeTopOffset}vh`,
            '--grid-cols': columns,
          } as CSSProperties
        }
      >
        <header ref={heroRef} className={styles.hero} aria-hidden={expanded}>
          {settings.showClock && <Clock settings={settings} />}
        </header>

        <div className={styles.backdrop} aria-hidden="true" />

        <section
          className={styles.panel}
          aria-label="导航"
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && e.propertyName === 'transform') setSwitching(false)
          }}
        >
          {/* 悬浮顶栏：返回 + 搜索（Pixel 扁平样式），总宽度与图标网格一致，列表从下方滚过 */}
          <div className={styles.panelHeader}>
            <div className={styles.headerBar}>
              <IconButton
                variant="tonal"
                icon="arrow-back"
                label="返回"
                tabIndex={expanded ? 0 : -1}
                onClick={collapse}
              />
              <IconButton
                variant="tonal"
                icon={sorted ? 'restore' : 'sort-by-alpha'}
                label={sorted ? '恢复原顺序' : '按首字母排序'}
                aria-pressed={sorted}
                tabIndex={expanded ? 0 : -1}
                onClick={() => setSorted((s) => !s)}
              />
              <ExpandableSearch
                open={searchOpen}
                onOpenChange={setSearchOpen}
                label="搜索导航"
                placeholder="搜索名称或网址"
                value={query}
                tabIndex={expanded ? 0 : -1}
                onChange={setQuery}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') openFirstMatch()
                }}
              />
            </div>
          </div>
          <div ref={scrollerRef} className={styles.scroller}>
            <NavGrid
              nav={nav}
              editing={editing}
              onEditingChange={setEditing}
              query={query}
              columns={columns}
              homeCount={homeCount}
              expanded={expanded}
              sorted={sorted}
            />
          </div>
        </section>
      </main>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} nav={nav} />
    </>
  )
}

export default App
