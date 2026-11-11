import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { Button, Modal, Slider } from '@/components/ui'
import { COMPACT_QUERY, useMediaQuery } from '@/lib/useMediaQuery'
import { backgroundAspect, DEFAULT_CROP, MAX_ZOOM, type BackgroundCrop } from './crop'
import styles from './BackgroundCropDialog.module.scss'

interface BackgroundCropDialogProps {
  open: boolean
  image: { url: string } | null
  initialCrop: BackgroundCrop
  /** 遮罩浓度（%），取景框内按实际效果叠加 */
  dim: number
  onCancel: () => void
  onSave: (crop: BackgroundCrop) => void
}

interface Size {
  width: number
  height: number
}

/** 取景框与舞台边缘的留白：框外露出被裁掉的部分（压暗） */
const FRAME_INSET = 24
const KEY_STEP = 16 // px，方向键平移
const KEY_STEP_LARGE = 64 // px，Shift + 方向键
const KEY_ZOOM = 1.1
const WHEEL_ZOOM = 0.002 // 每像素滚动的缩放（指数）

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

// ---- 几何（模型见 crop.ts），坐标都相对舞台 ----

interface Geometry {
  /** 取景框：与背景图层同比例，在舞台中居中 */
  frame: { x: number; y: number; width: number; height: number }
  /** 图片铺满取景框（cover）时的缩放 */
  cover: number
  image: Size
}

function computeGeometry(stage: Size, image: Size, aspect: number): Geometry {
  const maxW = Math.max(1, stage.width - FRAME_INSET * 2)
  const maxH = Math.max(1, stage.height - FRAME_INSET * 2)
  const width = Math.min(maxW, maxH * aspect)
  const height = width / aspect
  return {
    frame: { x: (stage.width - width) / 2, y: (stage.height - height) / 2, width, height },
    cover: Math.max(width / image.width, height / image.height),
    image,
  }
}

/** 图片在舞台中的位置与尺寸 */
function layoutOf(g: Geometry, c: BackgroundCrop) {
  const width = g.image.width * g.cover * c.zoom
  const height = g.image.height * g.cover * c.zoom
  return {
    left: g.frame.x + c.x * (g.frame.width - width),
    top: g.frame.y + c.y * (g.frame.height - height),
    width,
    height,
  }
}

/** 由图片左上角位置反推裁切比例（并限制在铺满取景框的范围内） */
function cropAt(g: Geometry, prev: BackgroundCrop, left: number, top: number, zoom: number): BackgroundCrop {
  const overflowX = g.frame.width - g.image.width * g.cover * zoom
  const overflowY = g.frame.height - g.image.height * g.cover * zoom
  // 某一方向恰好铺满（没有可移动的余量）时，位置无意义，保持原值
  const x = overflowX < -0.5 ? clamp((left - g.frame.x) / overflowX, 0, 1) : prev.x
  const y = overflowY < -0.5 ? clamp((top - g.frame.y) / overflowY, 0, 1) : prev.y
  return { x, y, zoom }
}

/**
 * 背景图片裁切：取景框的长宽比与当前背景图层（视口）一致，
 * 拖动调整位置，双指 / 滚轮 / 滑块缩放；框外压暗显示被裁掉的部分。
 * 裁切不改动原图（模型见 crop.ts），换到其他长宽比的窗口时按同样的位置与缩放铺满。
 */
export function BackgroundCropDialog({ open, image, initialCrop, dim, onCancel, onSave }: BackgroundCropDialogProps) {
  const compact = useMediaQuery(COMPACT_QUERY)
  const stageRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<Size | null>(null)
  const [natural, setNatural] = useState<{ url: string; size: Size } | null>(null)
  const [aspect, setAspect] = useState(1)
  const [crop, setCropState] = useState(initialCrop)
  // 手势回调里读最新值（同一帧内可能连续多次更新），渲染时只用 state
  const cropRef = useRef(crop)
  const setCrop = (next: BackgroundCrop) => {
    cropRef.current = next
    setCropState(next)
  }

  // 每次打开：从当前裁切开始，按此刻的视口比例取景
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setCropState(initialCrop)
      setAspect(backgroundAspect())
    }
  }

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setStage({ width: el.clientWidth, height: el.clientHeight }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const imageSize = natural && natural.url === image?.url ? natural.size : null
  const geometry = stage && imageSize ? computeGeometry(stage, imageSize, aspect) : null
  const geometryRef = useRef(geometry)
  useLayoutEffect(() => {
    geometryRef.current = geometry
    cropRef.current = crop
  })

  const panBy = (dx: number, dy: number) => {
    const g = geometryRef.current
    if (!g) return
    const c = cropRef.current
    const l = layoutOf(g, c)
    setCrop(cropAt(g, c, l.left + dx, l.top + dy, c.zoom))
  }

  /** 以舞台上的一点为中心缩放：该点下方的图片内容保持不动 */
  const zoomAt = (px: number, py: number, nextZoom: number) => {
    const g = geometryRef.current
    if (!g) return
    const c = cropRef.current
    const zoom = clamp(nextZoom, 1, MAX_ZOOM)
    const l = layoutOf(g, c)
    const u = (px - l.left) / l.width
    const v = (py - l.top) / l.height
    const width = g.image.width * g.cover * zoom
    const height = g.image.height * g.cover * zoom
    setCrop(cropAt(g, c, px - u * width, py - v * height, zoom))
  }

  const zoomAtCenter = (nextZoom: number) => {
    const g = geometryRef.current
    if (g) zoomAt(g.frame.x + g.frame.width / 2, g.frame.y + g.frame.height / 2, nextZoom)
  }

  // ---- 手势：单指 / 鼠标拖动平移，双指捏合缩放 ----
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  const localPoint = (e: PointerEvent) => {
    const rect = stageRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, localPoint(e))
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const map = pointers.current
    const prev = map.get(e.pointerId)
    if (!prev) return
    const point = localPoint(e)

    if (map.size === 1) {
      map.set(e.pointerId, point)
      panBy(point.x - prev.x, point.y - prev.y)
      return
    }
    // 双指：以两指中点为中心按距离变化缩放，同时跟随中点平移
    const [other] = [...map.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p)
    if (!other) return
    const before = { x: (prev.x + other.x) / 2, y: (prev.y + other.y) / 2 }
    const after = { x: (point.x + other.x) / 2, y: (point.y + other.y) / 2 }
    const distBefore = Math.hypot(prev.x - other.x, prev.y - other.y)
    const distAfter = Math.hypot(point.x - other.x, point.y - other.y)
    map.set(e.pointerId, point)
    if (distBefore > 0) zoomAt(before.x, before.y, cropRef.current.zoom * (distAfter / distBefore))
    panBy(after.x - before.x, after.y - before.y)
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
  }

  // 滚轮缩放（以指针为中心）：需要阻止页面滚动，React 的 onWheel 是 passive 的，改为手动监听
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      // 触控板双指捏合在浏览器中表现为按住 Ctrl 的滚轮，幅度更小，放大处理
      const delta = e.ctrlKey ? e.deltaY * 8 : e.deltaY
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, cropRef.current.zoom * Math.exp(-delta * WHEEL_ZOOM))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // zoomAt 只读 ref，不需要重新绑定
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    }
    if (moves[e.key]) panBy(...moves[e.key])
    else if (e.key === '+' || e.key === '=') zoomAtCenter(cropRef.current.zoom * KEY_ZOOM)
    else if (e.key === '-') zoomAtCenter(cropRef.current.zoom / KEY_ZOOM)
    else return
    e.preventDefault()
  }

  const placed = geometry && layoutOf(geometry, crop)
  const imageStyle: CSSProperties | undefined = placed
    ? { left: placed.left, top: placed.top, width: placed.width, height: placed.height }
    : undefined
  const frameStyle = geometry
    ? ({
        left: geometry.frame.x,
        top: geometry.frame.y,
        width: geometry.frame.width,
        height: geometry.frame.height,
        '--dim': `${dim}%`,
      } as CSSProperties)
    : undefined

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="调整背景图片"
      description={compact ? '拖动调整位置，双指缩放' : '拖动调整位置，滚轮或触控板缩放'}
      size="wide"
      sheet
      actions={
        <>
          <Button variant="text" className={styles.reset} onClick={() => setCrop(DEFAULT_CROP)}>
            还原
          </Button>
          <Button variant="text" onClick={onCancel}>
            取消
          </Button>
          <Button variant="text" onClick={() => onSave(cropRef.current)}>
            完成
          </Button>
        </>
      }
    >
      <div
        ref={stageRef}
        className={styles.stage}
        tabIndex={0}
        role="application"
        aria-label="背景图片取景：方向键移动，加号 / 减号缩放"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        {image && (
          <img
            key={image.url}
            className={styles.image}
            src={image.url}
            alt=""
            draggable={false}
            // 读到原图尺寸、排好位置之前不显示
            style={imageStyle ?? { visibility: 'hidden' }}
            onLoad={(e) => {
              const img = e.currentTarget
              setNatural({ url: image.url, size: { width: img.naturalWidth, height: img.naturalHeight } })
            }}
          />
        )}
        {geometry && <div className={styles.frame} style={frameStyle} aria-hidden="true" />}
      </div>
      <div className={styles.zoom}>
        <span className={styles.zoomLabel}>缩放</span>
        <Slider
          label="缩放"
          min={100}
          max={MAX_ZOOM * 100}
          value={Math.round(crop.zoom * 100)}
          onChange={(v) => zoomAtCenter(v / 100)}
          format={(v) => `${(v / 100).toFixed(1)}×`}
        />
      </div>
    </Modal>
  )
}
