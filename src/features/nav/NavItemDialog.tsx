import { useId, useRef, useState, type FormEvent } from 'react'
import {
  Button,
  Card,
  ColorPicker,
  Icon,
  ListItem,
  Modal,
  SearchField,
  Slider,
  Switch,
  TextField,
  type ColorSwatch,
} from '@/components/ui'
import { toHex6 } from '@/lib/color'
import { cx } from '@/lib/cx'
import { imageFileToDataUrl } from '@/lib/image'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { COMPACT_QUERY, useMediaQuery } from '@/lib/useMediaQuery'
import { hostnameOf, normalizeUrl, rootDomain } from '@/lib/url'
import { iconPresets, sameSource, SCALE_MAX, SCALE_MIN } from './icon'
import {
  findLibraryIcons,
  libraryBackground,
  searchLibraryIcons,
  useIconLibrary,
  type LibraryIcon,
} from './iconLibrary'
import { TileIcon } from './TileIcon'
import type { NavIcon, NavItem } from './types'
import { useFaviconAvailable } from './useFaviconAvailable'
import styles from './NavItemDialog.module.scss'

// 背景颜色预设（用户内容色，非 UI 色）：Google 品牌色系
const BASE_SWATCHES: ColorSwatch[] = [
  { value: null, label: '默认（白色）' },
  { value: '#202124', label: '黑色' },
  { value: '#f1f3f4', label: '浅灰' },
  { value: '#ea4335', label: '红色' },
  { value: '#fbbc04', label: '黄色' },
  { value: '#34a853', label: '绿色' },
  { value: '#4285f4', label: '蓝色' },
  { value: '#a142f4', label: '紫色' },
]

interface Candidate {
  key: string
  label: string
  /** 悬停提示，默认同 label */
  title?: string
  preset: NavIcon
}

interface NavItemDialogProps {
  open: boolean
  /** 传入则为编辑，否则为新增 */
  item?: NavItem
  onSubmit: (data: Omit<NavItem, 'id'>) => void
  onClose: () => void
}

export function NavItemDialog({ open, item, onSubmit, onClose }: NavItemDialogProps) {
  const formId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  // 手机上为底部 sheet（同设置）
  const compact = useMediaQuery(COMPACT_QUERY)
  const lib = useIconLibrary()

  const [url, setUrl] = useState(item?.url ?? '')
  const [name, setName] = useState(item?.name ?? '')
  const [urlError, setUrlError] = useState<string>()
  const [uploadError, setUploadError] = useState<string>()
  /** 用户选择 / 调整过的图标；null 表示自动选择第一个候选 */
  const [chosen, setChosen] = useState<NavIcon | null>(item?.icon ?? null)
  const [query, setQuery] = useState('')
  const [uploaded, setUploaded] = useState<string | null>(
    item?.icon.source.kind === 'image' ? item.icon.source.src : null,
  )

  const normalized = normalizeUrl(url)
  const fallbackName = normalized ? hostnameOf(normalized) : ''
  // 匹配图标按停止输入后的网址计算，避免逐字请求
  const matchUrl = useDebouncedValue(normalized, 300)
  const matchHost = matchUrl ? hostnameOf(matchUrl) : null
  const matchRoot = matchHost ? rootDomain(matchHost) : null
  // Google 图标：先按完整域名，再按根域名（子域名常常没有收录，如 mail.proton.me）
  const hostFaviconOk = useFaviconAvailable(matchHost)
  const rootFaviconOk = useFaviconAvailable(matchRoot !== matchHost ? matchRoot : null)
  const libraryMatches = lib && matchUrl ? findLibraryIcons(lib, matchUrl) : []
  // 搜索图标库：有关键词时，用搜索结果替换按域名匹配的 iTab 图标
  const searching = query.trim() !== ''
  const searchResults = lib && searching ? searchLibraryIcons(lib, query) : []

  const toCandidate = (m: LibraryIcon): Candidate => ({
    key: `lib:${m.path}`,
    label: m.name || m.host,
    title: m.name ? `${m.name} · ${m.host}` : m.host,
    preset: iconPresets.library(m.path, m.background),
  })

  // 候选：1. iTab 图标（同根域名的全部 / 搜索结果）  2. Google 图标（完整域名 / 根域名，足够清晰时）
  //       3. 文字  4. 已上传的图片
  const otherCandidates: Candidate[] = [
    ...(hostFaviconOk ? [{ key: 'favicon', label: '网站图标', preset: iconPresets.favicon() }] : []),
    ...(rootFaviconOk && matchRoot
      ? [{ key: `favicon:${matchRoot}`, label: matchRoot, preset: iconPresets.favicon(matchRoot) }]
      : []),
    { key: 'letter', label: '文字', preset: iconPresets.letter() },
    ...(uploaded ? [{ key: 'image', label: '图片', preset: iconPresets.image(uploaded) }] : []),
  ]
  const domainCandidates = [...libraryMatches.map(toCandidate), ...otherCandidates]
  const candidates = searching ? [...searchResults.map(toCandidate), ...otherCandidates] : domainCandidates

  // 未手动选择时，默认使用按域名匹配的第一个（不随搜索变化）
  const icon = chosen ?? domainCandidates[0].preset
  const adjust = (patch: Partial<NavIcon>) => setChosen({ ...icon, ...patch })

  // 当前图标不在列表中（例如编辑时改了网址，或清空了搜索），保留为“当前”
  if (!candidates.some((c) => sameSource(c.preset.source, icon.source))) {
    candidates.unshift({ key: 'current', label: '当前', preset: icon })
  }

  // 选中 iTab 图标时，额外提供它的原始底色
  const original =
    icon.source.kind === 'library' && lib ? libraryBackground(lib, icon.source.path) : null
  // 白色即“默认”，以及与预设重复的颜色，都不再单独列出
  const swatches: ColorSwatch[] =
    original &&
    toHex6(original) !== '#ffffff' &&
    !BASE_SWATCHES.some((s) => s.value && toHex6(s.value) === toHex6(original))
      ? [BASE_SWATCHES[0], { value: original, label: '原始底色' }, ...BASE_SWATCHES.slice(1)]
      : BASE_SWATCHES

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const src = await imageFileToDataUrl(file)
      setUploaded(src)
      setChosen(iconPresets.image(src))
      setUploadError(undefined)
    } catch {
      setUploadError('无法读取这张图片')
    }
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!normalized) {
      setUrlError('请输入有效的网址')
      return
    }
    onSubmit({ url: normalized, name: name.trim() || fallbackName, icon })
  }

  const previewUrl = normalized ?? ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? '编辑导航' : '添加导航'}
      size="wide"
      sheet={compact}
      actions={
        <>
          <Button variant="text" onClick={onClose}>
            取消
          </Button>
          <Button variant="filled" type="submit" form={formId}>
            {item ? '保存' : '添加'}
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
        {/* 左栏：预览 + 外观调整 */}
        <div className={styles.editor}>
          <div className={styles.preview}>
            <TileIcon name={name || fallbackName} url={previewUrl} icon={icon} />
            <span className={styles.previewLabel}>{name.trim() || fallbackName || '预览'}</span>
          </div>

          <Card className={styles.adjust}>
            <ListItem
              asLabel
              title="背景填充"
              trailing={<Switch checked={icon.fill} onChange={(fill) => adjust({ fill })} />}
            />
            <ListItem
              title="缩放"
              trailing={
                <Slider
                  label="缩放"
                  min={SCALE_MIN}
                  max={SCALE_MAX}
                  step={0.05}
                  value={icon.scale}
                  onChange={(scale) => adjust({ scale })}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
              }
            />
            <div className={styles.colorRow}>
              <span className={cx(styles.colorLabel, !icon.fill && styles.muted)}>背景颜色</span>
              <ColorPicker
                label="背景颜色"
                value={icon.background}
                swatches={swatches}
                disabled={!icon.fill}
                onChange={(background) => adjust({ background })}
              />
            </div>
          </Card>
        </div>

        {/* 右栏：网址、名称、候选图标 */}
        <div className={styles.details}>
          <TextField
            label="网址"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              if (urlError) setUrlError(undefined)
            }}
            placeholder="example.com"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            data-autofocus={item ? undefined : true}
            error={urlError}
          />

          <TextField
            label="名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={fallbackName || '默认使用域名'}
            autoComplete="off"
            data-autofocus={item ? true : undefined}
          />

          <section className={styles.section} aria-labelledby={`${formId}-icons`}>
            <h3 id={`${formId}-icons`} className={styles.sectionTitle}>
              图标
            </h3>
            <SearchField
              label="搜索图标库"
              placeholder="搜索图标库：名称或域名"
              value={query}
              onChange={setQuery}
            />
            <div className={styles.options} role="radiogroup" aria-labelledby={`${formId}-icons`}>
              {candidates.map((c) => {
                const selected = sameSource(c.preset.source, icon.source)
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={cx(styles.option, selected && styles.optionSelected)}
                    title={c.title ?? c.label}
                    onClick={() => setChosen(selected ? icon : c.preset)}
                  >
                    <TileIcon
                      name={name || fallbackName}
                      url={previewUrl}
                      icon={selected ? icon : c.preset}
                      size="sm"
                    />
                    <span className={styles.optionLabel}>{c.label}</span>
                  </button>
                )
              })}
              <button
                type="button"
                className={styles.option}
                title="上传图片"
                onClick={() => fileInput.current?.click()}
              >
                <span className={styles.uploadTile}>
                  <Icon name="upload" />
                </span>
                <span className={styles.optionLabel}>上传</span>
              </button>
            </div>
            {searching && lib && searchResults.length === 0 && (
              <p className={styles.hint}>图标库中没有找到“{query.trim()}”</p>
            )}
            {!searching && !normalized && (
              <p className={styles.hint}>输入网址后，会列出同一域名下的图标；也可以直接搜索图标库</p>
            )}
            {uploadError && <p className={styles.error}>{uploadError}</p>}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void handleFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </section>
        </div>
      </form>
    </Modal>
  )
}
