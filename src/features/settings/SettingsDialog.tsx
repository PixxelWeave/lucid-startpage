import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  Button,
  Card,
  ColorPicker,
  Icon,
  IconButton,
  IconTile,
  ListItem,
  Modal,
  SegmentedButton,
  SheetHandle,
  Slider,
  Switch,
  type ColorSwatch,
  type IconName,
  type IconTileTone,
  type SegmentedOption,
} from '@/components/ui'
import Clock from '@/components/Clock/Clock'
import { formatDate } from '@/components/Clock/format'
import { BackgroundCropDialog } from '@/features/background/BackgroundCropDialog'
import { BackgroundView } from '@/features/background/BackgroundView'
import {
  backgroundAspect,
  cropFromSettings,
  cropToSettings,
  DEFAULT_CROP,
  type BackgroundCrop,
} from '@/features/background/crop'
import { pruneBackgroundImages, saveBackgroundImage } from '@/features/background/storage'
import { useBackgroundImage } from '@/features/background/useBackgroundImage'
import type { NavItemsApi } from '@/features/nav/useNavItems'
import { isExtension } from '@/lib/env'
import { cx } from '@/lib/cx'
import { COMPACT_QUERY, useMediaQuery } from '@/lib/useMediaQuery'
import { viewportDiagnostics } from '@/lib/viewportGap'
import { downloadBackup, parseBackup } from './backup'
import { useSettings } from './SettingsContext'
import {
  SETTING_RANGES,
  type ClockFont,
  type ClockWeight,
  type DateFormat,
  type ThemeMode,
} from './types'
import styles from './SettingsDialog.module.scss'

type SectionId = 'home' | 'clock' | 'general' | 'appearance' | 'data' | 'about'

const SECTIONS: {
  id: SectionId
  label: string
  icon: IconName
  tone: IconTileTone
  description: string
}[] = [
  { id: 'home', label: '主屏', icon: 'apps', tone: 'primary', description: '图标布局与内容位置。' },
  { id: 'clock', label: '时钟', icon: 'schedule', tone: 'tertiary', description: '时钟与日期的字体、颜色和格式。' },
  { id: 'general', label: '通用', icon: 'tune', tone: 'secondary', description: '导航的打开方式。' },
  { id: 'appearance', label: '外观', icon: 'palette', tone: 'tertiary', description: '主题与背景图片。' },
  { id: 'data', label: '数据', icon: 'storage', tone: 'secondary', description: '备份或导入你的导航与设置。' },
  { id: 'about', label: '关于', icon: 'info', tone: 'neutral', description: '简洁的新标签页导航。' },
]

const THEME_OPTIONS: SegmentedOption<ThemeMode>[] = [
  { value: 'system', label: '自动' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

const FONT_OPTIONS: SegmentedOption<ClockFont>[] = [
  { value: 'default', label: '默认' },
  { value: 'rounded', label: '圆体' },
  { value: 'serif', label: '衬线' },
  { value: 'mono', label: '等宽' },
]

const WEIGHT_OPTIONS: SegmentedOption<ClockWeight>[] = [
  { value: 'light', label: '细' },
  { value: 'regular', label: '常规' },
  { value: 'bold', label: '粗' },
]

const DATE_OPTIONS: SegmentedOption<DateFormat>[] = [
  { value: 'none', label: '隐藏' },
  { value: 'month-day', label: '月日' },
  { value: 'full', label: '年月日' },
  { value: 'iso', label: '数字' },
]

// 时钟文字颜色：跟随主题 + 常用浅色 / 深色（用户内容色）
const CLOCK_SWATCHES: ColorSwatch[] = [
  { value: null, label: '跟随主题' },
  { value: '#ffffff', label: '白色' },
  { value: '#1f1f1f', label: '黑色' },
  { value: '#d3e3fd', label: '浅蓝' },
  { value: '#c4eed0', label: '浅绿' },
  { value: '#ffdfa0', label: '浅黄' },
  { value: '#0b57d0', label: '蓝色' },
]

interface Confirmation {
  title: string
  description: ReactNode
  confirmLabel?: string
  danger?: boolean
  /** 不提供时为纯提示，只有“好”按钮 */
  onConfirm?: () => void
}

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  nav: NavItemsApi
}

export function SettingsDialog({ open, onClose, nav }: SettingsDialogProps) {
  const { settings, updateSettings } = useSettings()
  const [sectionId, setSectionId] = useState<SectionId>('home')
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const [processingImage, setProcessingImage] = useState(false)
  const background = useBackgroundImage(settings.backgroundImage)
  const hasBackground = background.status === 'ready'
  /**
   * 裁切弹窗。新选的图片（pending）先裁切，点“完成”才替换当前背景，取消则删除；
   * 调整现有图片时 pending 为 null。关闭后保留内容，退场动画期间图片不消失
   */
  const [cropOpen, setCropOpen] = useState(false)
  const [pending, setPending] = useState<{ id: string; url: string } | null>(null)
  useEffect(() => (pending ? () => URL.revokeObjectURL(pending.url) : undefined), [pending])
  /** 关于 → 诊断信息：点击时读取，排查手机布局问题用 */
  const [diagnostics, setDiagnostics] = useState<Record<string, string> | null>(null)
  /** 日期格式示例用（打开设置时的日期即可） */
  const [today] = useState(() => new Date())

  const section = SECTIONS.find((s) => s.id === sectionId)!
  const itemCount = nav.items?.length ?? 0

  // 紧凑布局（手机）：底部 sheet + 两级菜单（分类列表 → 分类详情）
  const compact = useMediaQuery(COMPACT_QUERY)
  const [mobileSectionId, setMobileSectionId] = useState<SectionId | null>(null)
  const [mobileDirection, setMobileDirection] = useState<'forward' | 'back'>('forward')
  const mobileSection = SECTIONS.find((s) => s.id === mobileSectionId)
  // 每次打开都从分类列表开始（关闭时不重置，避免 sheet 滑出时内容跳变）
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setMobileSectionId(null)
  }
  // 背景预览按背景图层（视口）的实际比例显示，与裁切取景一致
  const screenRatio = backgroundAspect()
  const openMobileSection = (id: SectionId | null) => {
    setMobileDirection(id ? 'forward' : 'back')
    setMobileSectionId(id)
  }

  const handleImport = async (file: File | undefined) => {
    if (!file) return
    const backup = parseBackup(await file.text())
    if (!backup) {
      setConfirmation({
        title: '无法导入',
        description: '这不是有效的 Lucid 备份文件。',
      })
      return
    }
    setConfirmation({
      title: '导入备份？',
      description: `将用备份中的 ${backup.items.length} 个导航替换当前的 ${itemCount} 个导航${
        backup.settings ? '，并恢复备份中的设置' : ''
      }。`,
      confirmLabel: '导入',
      onConfirm: () => {
        nav.replaceAll(backup.items)
        // 背景图片只存在本机，导入时保留当前的图片与裁切
        if (backup.settings) {
          updateSettings({
            ...backup.settings,
            backgroundImage: settings.backgroundImage,
            ...cropToSettings(cropFromSettings(settings)),
          })
        }
      },
    })
  }

  const handleBackgroundFile = async (file: File | undefined) => {
    if (!file) return
    setProcessingImage(true)
    try {
      const saved = await saveBackgroundImage(file)
      setPending({ id: saved.id, url: URL.createObjectURL(saved.image) })
      setCropOpen(true)
    } catch (err) {
      console.error('Failed to save background image', err)
      setConfirmation({
        title: '无法使用这张图片',
        description: '图片读取失败，请换一张 JPG、PNG 或 WebP 格式的图片。',
      })
    } finally {
      setProcessingImage(false)
    }
  }

  const saveCrop = (crop: BackgroundCrop) => {
    setCropOpen(false)
    if (pending) {
      updateSettings({ backgroundImage: pending.id, ...cropToSettings(crop) })
      pruneBackgroundImages(pending.id).catch(console.error)
    } else {
      updateSettings(cropToSettings(crop))
    }
  }

  const cancelCrop = () => {
    setCropOpen(false)
    // 放弃新选的图片：删除除当前背景以外的所有图片
    if (pending) pruneBackgroundImages(settings.backgroundImage).catch(console.error)
  }

  const homeSlots = settings.homeColumns * settings.homeRows
  const clockOn = settings.showClock

  const panels: Record<SectionId, ReactNode> = {
    home: (
      <>
        <Card>
          <ListItem
            title="列数"
            trailing={
              <Slider
                label="列数"
                {...SETTING_RANGES.homeColumns}
                value={settings.homeColumns}
                onChange={(homeColumns) => updateSettings({ homeColumns })}
                format={(v) => `${v} 列`}
              />
            }
          />
          <ListItem
            title="行数"
            description={`主屏最多显示 ${homeSlots} 个图标，其余在资源库中；窗口较窄时列数会自动减少`}
            trailing={
              <Slider
                label="行数"
                {...SETTING_RANGES.homeRows}
                value={settings.homeRows}
                onChange={(homeRows) => updateSettings({ homeRows })}
                format={(v) => `${v} 行`}
              />
            }
          />
        </Card>
        <Card>
          <ListItem
            title="顶部距离"
            description="主屏内容与页面顶部的距离，占窗口高度"
            trailing={
              <Slider
                label="顶部距离"
                {...SETTING_RANGES.homeTopOffset}
                value={settings.homeTopOffset}
                onChange={(homeTopOffset) => updateSettings({ homeTopOffset })}
                format={(v) => `${v}%`}
              />
            }
          />
        </Card>
      </>
    ),

    clock: (
      <>
        <Card>
          <ListItem
            asLabel
            title="显示时钟"
            trailing={
              <Switch
                checked={settings.showClock}
                onChange={(showClock) => updateSettings({ showClock })}
              />
            }
          />
          <ListItem
            asLabel
            title="24 小时制"
            disabled={!clockOn}
            trailing={
              <Switch
                checked={settings.use24Hour}
                disabled={!clockOn}
                onChange={(use24Hour) => updateSettings({ use24Hour })}
              />
            }
          />
        </Card>
        <Card>
          <ListItem
            title="字体"
            disabled={!clockOn}
            trailing={
              <SegmentedButton
                label="字体"
                options={FONT_OPTIONS}
                value={settings.clockFont}
                onChange={(clockFont) => updateSettings({ clockFont })}
              />
            }
          />
          <ListItem
            title="字重"
            disabled={!clockOn}
            trailing={
              <SegmentedButton
                label="字重"
                options={WEIGHT_OPTIONS}
                value={settings.clockWeight}
                onChange={(clockWeight) => updateSettings({ clockWeight })}
              />
            }
          />
        </Card>
        <Card>
          <ListItem
            title="颜色"
            description="时间与日期的文字颜色"
            disabled={!clockOn}
            trailing={
              <ColorPicker
                label="时钟颜色"
                swatches={CLOCK_SWATCHES}
                defaultSwatch="theme"
                value={settings.clockColor}
                disabled={!clockOn}
                onChange={(clockColor) => updateSettings({ clockColor })}
              />
            }
          />
          <ListItem
            title="不透明度"
            disabled={!clockOn}
            trailing={
              <Slider
                label="不透明度"
                {...SETTING_RANGES.clockOpacity}
                step={5}
                value={settings.clockOpacity}
                disabled={!clockOn}
                onChange={(clockOpacity) => updateSettings({ clockOpacity })}
                format={(v) => `${v}%`}
              />
            }
          />
        </Card>
        <Card>
          <ListItem
            title="日期格式"
            description={
              settings.dateFormat === 'none'
                ? '不显示日期'
                : formatDate(today, settings.dateFormat, false)
            }
            disabled={!clockOn}
            trailing={
              <SegmentedButton
                label="日期格式"
                options={DATE_OPTIONS}
                value={settings.dateFormat}
                onChange={(dateFormat) => updateSettings({ dateFormat })}
              />
            }
          />
          <ListItem
            asLabel
            title="显示星期"
            disabled={!clockOn}
            trailing={
              <Switch
                checked={settings.showWeekday}
                disabled={!clockOn}
                onChange={(showWeekday) => updateSettings({ showWeekday })}
              />
            }
          />
        </Card>
      </>
    ),

    general: (
      <>
        <Card>
          <ListItem
            asLabel
            title="在新标签页打开"
            description="关闭后，点击导航会在当前标签页打开"
            trailing={
              <Switch
                checked={settings.openInNewTab}
                onChange={(openInNewTab) => updateSettings({ openInNewTab })}
              />
            }
          />
        </Card>
      </>
    ),

    appearance: (
      <>
        <Card>
          <ListItem
            title="主题"
            description="“自动”会跟随系统的浅色 / 深色设置"
            trailing={
              <SegmentedButton
                label="主题"
                options={THEME_OPTIONS}
                value={settings.theme}
                onChange={(theme) => updateSettings({ theme })}
              />
            }
          />
        </Card>
        <Card>
          {hasBackground ? (
            <BackgroundView
              className={styles.backgroundPreview}
              style={{ '--screen-ratio': screenRatio } as CSSProperties}
              image={background}
              crop={cropFromSettings(settings)}
              dim={settings.backgroundDim}
              role="img"
              aria-label="当前背景图片预览"
            />
          ) : (
            <div className={styles.backgroundPreview} style={{ '--screen-ratio': screenRatio } as CSSProperties}>
              <Icon name="image" size={32} />
              {processingImage ? '正在处理图片…' : '未设置背景图片'}
            </div>
          )}
          <ListItem
            title={hasBackground ? '更换背景图片' : '选择背景图片'}
            description={processingImage ? '正在处理图片…' : '图片会自动压缩，只保存在本机，不包含在备份中'}
            leading={<IconTile icon="image" tone="tertiary" />}
            trailing={<Icon name="chevron-right" />}
            disabled={processingImage}
            onClick={() => imageInput.current?.click()}
          />
          {hasBackground && (
            <ListItem
              title="调整位置和缩放"
              description="按当前窗口的比例取景，拖动或缩放选择显示的部分"
              leading={<IconTile icon="crop" tone="tertiary" />}
              trailing={<Icon name="chevron-right" />}
              onClick={() => {
                setPending(null)
                setCropOpen(true)
              }}
            />
          )}
          {hasBackground && (
            <ListItem
              title="遮罩"
              description="在图片上叠加一层底色，让时钟和图标更清晰"
              trailing={
                <Slider
                  label="遮罩"
                  {...SETTING_RANGES.backgroundDim}
                  step={5}
                  value={settings.backgroundDim}
                  onChange={(backgroundDim) => updateSettings({ backgroundDim })}
                  format={(v) => `${v}%`}
                />
              }
            />
          )}
          {hasBackground && (
            <ListItem
              title="移除背景图片"
              leading={<IconTile icon="delete" tone="neutral" />}
              danger
              onClick={() =>
                setConfirmation({
                  title: '移除背景图片？',
                  description: '图片会从本机删除，之后需要重新选择。',
                  confirmLabel: '移除',
                  danger: true,
                  onConfirm: () => {
                    updateSettings({ backgroundImage: null })
                    pruneBackgroundImages(null).catch(console.error)
                  },
                })
              }
            />
          )}
        </Card>
        <input
          ref={imageInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void handleBackgroundFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </>
    ),

    data: (
      <>
        <Card>
          <ListItem
            title="导出备份"
            description={`将 ${itemCount} 个导航和设置保存为 JSON 文件（不含背景图片）`}
            leading={<IconTile icon="download" tone="secondary" />}
            trailing={<Icon name="chevron-right" />}
            onClick={() => downloadBackup(nav.items ?? [], settings)}
          />
          <ListItem
            title="导入备份"
            description="从 JSON 文件恢复，会替换当前导航"
            leading={<IconTile icon="upload" tone="secondary" />}
            trailing={<Icon name="chevron-right" />}
            onClick={() => fileInput.current?.click()}
          />
        </Card>
        {/* 仅开发预览：恢复默认导航 / 载入示例导航，用于调试数据与多行布局（构建时整段被剔除） */}
        {import.meta.env.DEV && (
          <Card>
            <ListItem
              title="恢复默认导航"
              description="开发用：清空当前导航，恢复为初始列表"
              leading={<IconTile icon="restore" tone="neutral" />}
              danger
              onClick={() =>
                setConfirmation({
                  title: '恢复默认导航？',
                  description: `当前的 ${itemCount} 个导航会被替换为默认列表，此操作无法撤销。`,
                  confirmLabel: '恢复',
                  danger: true,
                  onConfirm: nav.resetToDefaults,
                })
              }
            />
          </Card>
        )}
        {import.meta.env.DEV && (
          <Card>
            <ListItem
              title="载入示例导航"
              description="开发用：50 个示例网站，查看多行布局与各种图标形态"
              leading={<IconTile icon="tune" tone="tertiary" />}
              onClick={() =>
                setConfirmation({
                  title: '载入示例导航？',
                  description: `当前的 ${itemCount} 个导航会被替换为 50 个示例，可通过“恢复默认导航”还原。`,
                  confirmLabel: '载入',
                  onConfirm: () =>
                    void import('@/features/nav/mockItems').then((m) => nav.replaceAll(m.createMockItems())),
                })
              }
            />
          </Card>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            void handleImport(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </>
    ),

    about: (
      <>
        <Card>
          <ListItem title="版本" trailing={__APP_VERSION__} />
          <ListItem title="数据存储" trailing={isExtension ? '扩展本地存储' : '浏览器本地存储'} />
        </Card>
        <Card>
          <ListItem
            title="长按图标"
            description="电脑上进入编辑模式，拖动即可调整顺序；手机上弹出菜单，按住继续移动即可拖动排序"
          />
          <ListItem title="右键点击图标" description="编辑、分享、编辑主屏幕或删除" />
          <ListItem title="编辑模式下点击图标" description="修改名称、网址和图标" />
          <ListItem title="退出编辑模式" description="点击“完成”、按 Esc 或点击空白处" />
        </Card>
        <Card>
          <ListItem
            title="诊断信息"
            description="屏幕、视口与安全区的实际数值，排查手机上的布局问题时使用"
            trailing={diagnostics ? undefined : <Icon name="chevron-right" />}
            onClick={() => setDiagnostics(viewportDiagnostics())}
          />
          {diagnostics &&
            Object.entries(diagnostics).map(([key, value]) => <ListItem key={key} title={key} trailing={value} />)}
        </Card>
      </>
    ),
  }

  // 时钟分类顶部的实时预览（两种布局共用）
  const clockPreview = (
    <Card className={cx(styles.hero, styles.preview)}>
      {clockOn ? <Clock settings={settings} compact /> : <p className={styles.heroDescription}>时钟已隐藏</p>}
    </Card>
  )

  const mobileLayout = (
    <div className={styles.sheet}>
      {/* 拖动条 + 标题栏：可向下拖动关闭（见 Modal 的 sheet） */}
      <div className={styles.sheetHeader} data-sheet-grab>
        <SheetHandle />
        <div className={styles.sheetBar}>
          {mobileSection ? (
            <IconButton icon="arrow-back" label="返回" onClick={() => openMobileSection(null)} />
          ) : (
            <IconButton icon="close" label="关闭" onClick={onClose} />
          )}
          <h2 className={styles.sheetTitle}>{mobileSection?.label ?? '设置'}</h2>
        </div>
      </div>
      <section
        key={mobileSectionId ?? 'root'}
        className={cx(styles.sheetBody, mobileDirection === 'back' ? styles.slideBack : styles.slideForward)}
        aria-label={mobileSection?.label ?? '设置分类'}
      >
        {mobileSection ? (
          <>
            {mobileSection.id === 'clock' && clockPreview}
            {panels[mobileSection.id]}
          </>
        ) : (
          <Card>
            {SECTIONS.map((s) => (
              <ListItem
                key={s.id}
                title={s.label}
                description={s.description}
                leading={<IconTile icon={s.icon} tone={s.tone} />}
                trailing={<Icon name="chevron-right" />}
                onClick={() => openMobileSection(s.id)}
              />
            ))}
          </Card>
        )}
      </section>
    </div>
  )

  return (
    <>
      <Modal open={open} onClose={onClose} title="设置" size="lg" bare sheet={compact}>
        {compact ? mobileLayout : (
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <IconButton icon="close" label="关闭" onClick={onClose} />
              <h2 className={styles.sidebarTitle}>设置</h2>
            </div>
            <nav aria-label="设置分类">
              <ul className={styles.nav}>
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={cx(styles.navItem, s.id === sectionId && styles.navItemActive)}
                      aria-current={s.id === sectionId ? 'page' : undefined}
                      onClick={() => setSectionId(s.id)}
                    >
                      <IconTile icon={s.icon} tone={s.tone} />
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <section key={sectionId} className={styles.content} aria-label={section.label}>
            {sectionId === 'clock' ? (
              // 时钟分类：说明卡片换成实时预览
              clockPreview
            ) : (
              <Card className={styles.hero}>
                <IconTile icon={section.icon} tone={section.tone} size="lg" />
                <h3 className={styles.heroTitle}>{section.label}</h3>
                <p className={styles.heroDescription}>{section.description}</p>
              </Card>
            )}
            {panels[sectionId]}
          </section>
        </div>
        )}
      </Modal>

      <BackgroundCropDialog
        open={cropOpen}
        image={pending ?? (hasBackground ? background : null)}
        initialCrop={pending ? DEFAULT_CROP : cropFromSettings(settings)}
        dim={settings.backgroundDim}
        onCancel={cancelCrop}
        onSave={saveCrop}
      />

      <Modal
        open={confirmation !== null}
        onClose={() => setConfirmation(null)}
        title={confirmation?.title ?? ''}
        description={confirmation?.description}
        actions={
          confirmation?.onConfirm ? (
            <>
              <Button variant="text" onClick={() => setConfirmation(null)}>
                取消
              </Button>
              <Button
                variant="text"
                danger={confirmation.danger}
                onClick={() => {
                  confirmation.onConfirm?.()
                  setConfirmation(null)
                }}
              >
                {confirmation.confirmLabel ?? '确定'}
              </Button>
            </>
          ) : (
            <Button variant="text" onClick={() => setConfirmation(null)}>
              好
            </Button>
          )
        }
      />
    </>
  )
}
