# Lucid（startpage）

浏览器起始页（Chrome 新标签页扩展），产品名 Lucid，核心功能是导航。存储键与备份标识仍为 `startpage`，不要改（会丢失已有数据 / 旧备份无法导入）。需求原文见 [docs/requirements.md](docs/requirements.md)。

## 命令

- `pnpm dev` —— 开发预览（数据存 localStorage）
- `pnpm build` —— 类型检查 + 构建；`dist/` 即为可加载的扩展目录（manifest 由 vite.config.ts 插件生成；扩展图标的唯一源文件是 `public/icon.svg`，构建时用 resvg 栅格化为 16 / 32 / 48 / 128 PNG，页面 favicon 直接用 SVG）
- `pnpm zip` —— 构建并打包为 `startpage-extension.zip`
- `pnpm lint` —— oxlint + stylelint，提交前必须通过
- `pnpm icons:sync` —— 从 iTab 图标库重新抓取图标索引（域名、名称、图案路径、底色），生成 `src/features/nav/icon-library.json`（已提交，不必每次运行）

## 设计约束（必须遵守）

风格：Google Pixel / Material 3 扁平风格；交互参考 iOS（长按抖动编辑、拖动排序、“−” 删除、“完成” 退出）。

**设计 token 是样式的唯一来源**：`src/styles/_tokens.scss`，已自动注入每个 SCSS 文件（命名空间 `t`）。

- 颜色 `t.color(primary)`、半透明 `t.alpha(scrim, 32%)`
- 圆角 `t.radius(lg)`、间距 `t.space(4)`、阴影 `t.elevation(2)`
- 字体 `@include t.type(body-large)`（不要单独写 font-size / font-weight / line-height）
- 动效 `t.duration(medium)` / `t.easing(standard)`；交互态 `@include t.state-layer(on-surface)`；模糊 `t.blur(md)`；网格尺寸 `t.layout(tile-width)` / 列数 `t.grid-cols()`
- 用户可选的字体（如时钟）：`@include t.font-family(serif)` / `@include t.font-weight(light)`，一般文字仍用 `t.type(...)`
- 需要新值时先在 token 文件里加 token，再使用；不要在组件里写字面量。stylelint 会拦截字面量颜色、圆角、字号、间距；未知 token 名会在 Sass 编译期报错。

**公共组件优先**：`src/components/ui/`（Button、IconButton、TextField、SearchField、ExpandableSearch、Switch、Slider、ColorPicker、SegmentedButton、Card、ListItem、IconTile、Modal、Menu、Snackbar、Icon），从 `@/components/ui` 导入。新界面先复用；缺少的通用组件在此目录按需封装，不要在业务代码里重复造。

## 结构与约定

- `src/components/ui/` 公共组件；`src/components/` 页面级部件（Clock）
- `src/features/nav/` 导航功能：数据（types / storage / useNavItems）+ 视图（NavGrid / NavTile / TileIcon / NavItemDialog）
- `src/features/settings/` 设置：`useSettings()` 读写设置（主题、时钟样式、打开方式等），SettingsDialog 为左右分栏设置弹窗（“时钟”分类顶部为吸顶的实时预览），backup 负责导入导出。时钟（`components/Clock`）的字体 / 字重通过 `data-font` / `data-weight` 选 token，颜色 / 不透明度走 CSS 变量；“圆体”为打包的 Nunito（`@fontsource-variable/nunito`）
- `src/features/home/` 首页布局手势：页面本身不滚动；首页 ⇄ 展开（时钟退避、背景模糊、图标区铺满并内部滚动 + 搜索；滚动只用于展开，退出用返回按钮 / Esc；顶栏悬浮在列表之上（借鉴 liquid glass 的悬浮思路，控件仍为 Pixel 扁平样式），宽度与网格一致 `t.nav-grid-width`），见 `useExpandGestures.ts`。首屏前两帧 `<main>` 带 `.booting`，关闭时钟区 / 图标区的过渡（`--home-offset` 在首帧测量后才确定，否则刷新时图标会滑入）。资源库左上为三个圆形按钮：返回 / 字母视图（按首字母分组，`lib/initial.ts` 推算中文拼音首字母）/ 展开式搜索；关键词搜索与字母视图只影响显示，禁用拖拽排序（`SortableContext disabled`），只保留编辑与删除。删除、字母视图切换的重排动画为 NavGrid 内的 FLIP。主屏只显示 行 × 列 个图标（设置 homeRows / homeColumns，列数受窗口宽度限制，见 `useGridColumns.ts`，写入 CSS 变量 `--grid-cols`）；其余图标进入资源库时的“追赶”动画见 `NavGrid.module.scss`（`data-chase`，放在 NavTile 内层元素上，因为根元素的 transition 被拖拽库内联接管）
- `src/lib/` 无 UI 的工具函数；`isExtension` 区分扩展与开发环境
- 存储：扩展内用 `chrome.storage.local`，开发时用 `localStorage`。统一用 `lib/storage.ts` 的 `createStore(key, parse)` + `lib/useStoredState.ts`，读出的数据必须经过 parse 校验
- 大体积二进制（图片等）存 IndexedDB：`lib/idb.ts`（扩展与开发环境通用，manifest 带 `unlimitedStorage`）。自定义背景图见 `src/features/background/`：设置里只存图片 id（`backgroundImage`）与遮罩浓度，图片压缩为 WebP 后连同 32px 占位图存进 IndexedDB，不进备份；首屏由 `paint.ts` 用 localStorage 缓存的占位图同步铺底，原图加载后由 `<Background>` 淡入
- 主题：`<html data-theme>` 切换，token 在 global.scss 中按主题输出
- 样式用 CSS Modules：类名 kebab-case，TS 中 camelCase 引用；`@/` 指向 `src/`
- 导航图标：`NavIcon` = 来源（iTab 图标库 / Google favicon / 上传图片 / 首字）+ 背景填充 + 缩放 + 背景颜色，见 `features/nav/types.ts`、`icon.ts`。添加 / 编辑时按网址的**根域名**（`lib/url.ts` 的 `rootDomain`）从 iTab 索引列出候选，也可按名称 / 域名搜索整个图标库（`searchLibraryIcons`）；Google favicon 先按完整域名、再按根域名查；Google favicon 小于 64px 视为不清晰，不列出、渲染时退回首字。iTab 图标文件走 CDN，不打包
- 界面图标：Material Icons 路径（24×24）内联在 `components/ui/Icon/Icon.tsx`，需要新图标时在 `paths` 中添加
