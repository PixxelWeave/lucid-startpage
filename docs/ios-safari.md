# iOS Safari 适配：踩坑与方案

Lucid 的网页版要在 iPhone 上同时支持两种用法，并且都做到沉浸式（背景铺到状态栏和底部工具栏后面）：

- **Safari 标签页**：主屏幕图标关闭「作为网页应用打开」，点导航直接在 Safari 中打开。这是目前的主要用法。
- **主屏幕网页应用**（standalone）：全屏、没有 Safari 界面，但点导航会进入应用内浏览器（见第 9 节）。

以下结论都在 iPhone（iOS 26，屏幕高 956pt）上实测过，除非另有说明。Safari 在这方面没有官方文档，各小版本的行为也在变化，以后的 iOS 更新可能推翻其中某些结论。排查时先看第 12 节的调试方法。

## 速查：写新代码时要遵守的规则

1. **不要用 `position: fixed`**。界面元素用 `position: absolute`（相对 `#root` 或文档）放在可视区域里。浏览器顶层元素（对话框、菜单、提示条）也一样，用 `t.visible-top()` / `t.visible-bottom()` 放回可视区域。原因见第 4 节。
2. **铺满整页的层**（背景、蒙层、遮罩）相对 `#root` 铺满整个文档（`position: absolute; inset: 0`），不要只覆盖可视区域。
3. **贴屏幕边缘的元素**要加上安全区：`t.safe-area(top)` 等。
4. **页面本身永远不滚动**。需要滚动的内容放在内部的滚动容器里。页面的滚动位置由 `lib/viewportGap.ts` 和 `lib/keepScrollTop.ts` 控制。
5. **浮层的退场动画**用 `lib/usePresence.ts`，不要依赖 CSS 的 `overlay` / `allow-discrete`。
6. **生成 id 用 `lib/id.ts` 的 `createId()`**，不要直接用 `crypto.randomUUID()`。

## 1. 铺满全屏：`viewport-fit=cover` 与安全区

- **现象**：上下出现大黑边，页面没有铺满屏幕。
- **方案**：viewport 加上 `viewport-fit=cover`；所有贴屏幕边缘的元素自行加上 `env(safe-area-inset-*)`，统一用 token `t.safe-area(top | right | bottom | left)`。
- **注意**：`env()` 的回退值必须带单位（`0px`），否则在 `calc()` 里与长度相加会失效。stylelint 的 `length-zero-no-unit` 要单独关掉。

## 2. 主屏幕模式：顶部的系统渐变去不掉

- **现象**：主屏幕网页应用开启透明状态栏（`apple-mobile-web-app-status-bar-style: black-translucent`）后，状态栏下方有一层暗色渐变。
- **原因**：iOS 26.1 起，系统会在透明状态栏下画一层渐变，保证白色状态栏文字可读，页面无法关闭。`theme-color` 和 manifest 的 `theme_color` 都试过，与它无关。
- **可选方案**：去掉 `black-translucent`，改用不透明状态栏。代价是背景不再延伸到状态栏后面。我们选择接受这层渐变。
- **参考**：[autobrr/qui #2520](https://github.com/autobrr/qui/issues/2520)、[WebKit bug 301994](https://bugs.webkit.org/show_bug.cgi?id=301994)

## 3. 主屏幕模式：底部黑条与补齐

- **现象**：主屏幕网页应用里，屏幕底部有一条黑边。
- **原因**：页面的初始包含块（ICB）和文档高度比屏幕短了一个状态栏的高度（实测 894 vs 956，缺口 62，正好等于顶部安全区），而页面又从屏幕顶端开始排，于是底部露出一条。

**方案**：`lib/viewportGap.ts` 测出缺口（屏幕高度 − `innerHeight`），写入 `--viewport-gap`，只用来补齐 `html` 的高度。

**踩过的坑**：

- **固定定位的元素不能补**：它们本来就按整个屏幕排布。之前给它们也补了，结果全部伸出屏幕底边，底部弹出面板的按钮被切掉一半。
- **判断主屏幕模式要同时检查两种标志**：`navigator.standalone` 和 `display-mode: standalone` 都要看（`isStandalone()`），并且在启动后的几个时间点重新测量。
- **缺口只增不减**：补齐之后，iOS 报告的 `innerHeight` 会变成和屏幕一样高。如果重新测量，会得出缺口为 0、撤掉补齐，视口又变短……如此反复，背景随之上下抖动。所以每个屏幕方向各记一个缺口，只增不减。

## 4. Safari 标签页：沉浸式的核心机制

这是最难的一块，前后试了五种方案才成功。

### Safari 26 怎么画状态栏和工具栏后面的区域

1. 网页本身铺满整块屏幕；状态栏和底部浮动工具栏是半透明的，后面显示的是**文档中滚动到可视区域之外的真实内容**。可视区域是 796 = 956 − 160（上下栏合计）。
2. **文档范围以外**（比如页面没有滚动时，状态栏上方）只填网页的背景色。画布背景（`body` 的背景）里的图片画不过去，固定定位的元素也伸不过去。
3. **贴边的固定元素会触发着色**：只要页面上有贴着屏幕上下边缘的固定定位（或吸顶）元素，Safari 就会改为取它的背景色或毛玻璃效果去涂对应的栏，不再透出内容。
   - 元素透明或 `opacity: 0` 也照样触发，`visibility: hidden` 才不会。
   - 有开发者报告元素需要至少 3px 高、80% 宽才会被采用。
   - 浏览器顶层元素（`<dialog>`、popover）默认是固定定位，而且自带一个铺满全屏的 `::backdrop`，同样会触发。
   - 实测中，交互之后才触发的情况也有：一开始沉浸，点一下就变成纯色。
4. **`theme-color` 在 Safari 26 中已不再起作用**，实测也与此无关。

**参考**：[arpit.blog](https://arpit.blog/articles/2025/11/safari-drops-support-theme-color/)、[jahir.dev](https://jahir.dev/blog/safari-toolbar)、[1ar.io](https://1ar.io/updates/safari-26-liquid-glass-web/)、[gist](https://gist.github.com/alessiomaffeis/41224fad0df2bb722db13473091f0933)、[Edoardo Lunardi](https://www.edoardolunardi.dev/blog/safari-26-and-the-strange-case-of-fixed-overlays)、[WebKit bug 301756](https://bugs.webkit.org/show_bug.cgi?id=301756)

### 失败的尝试（不要再走）

| 做法 | 结果 |
|---|---|
| 固定定位的背景层，上下各伸出工具栏高度 | 伸出部分被裁掉，栏里仍是纯色 |
| 把背景图画在画布上，并按「可视区域 + 上下栏」计算尺寸 | 画布背景里的图片不会画到栏后面 |
| 撑高文档并滚到中间，但背景层仍是固定定位 | 画不过去 |
| 撑高文档、背景随文档排布，但主界面、毛玻璃蒙层仍是固定定位 | 刚进入时沉浸，一交互就变成纯色 |

### 最终方案

1. **撑高文档并滚到中间**（`lib/viewportGap.ts`）：
   - 测出上下栏的总高度（屏幕高度 − `innerHeight`），写入 `--browser-bars`。仅限触屏、非主屏幕模式，其余情况为 0。
   - `html` 的高度 = 100% + 2 × 栏高，上下各多出一截。
   - 页面滚动到 `scrollY = 栏高`，多出的部分正好位于状态栏和工具栏后面。不区分上下栏各占多少，两边都按总高度撑高，保证都能盖住。
   - 页面禁止用户滚动（`body { overflow: hidden }`），但程序滚动照常生效。
2. **保持滚动位置**（`lib/keepScrollTop.ts`）：
   - 设置 `history.scrollRestoration = 'manual'`。否则刷新时 Safari 会恢复上次的滚动位置，盖掉我们设定的位置。
   - 监听页面滚动，一旦偏离就在下一帧拉回：元素获得焦点、键盘收起时，浏览器可能会滚动页面。
   - 输入框获得焦点时不干预，避免和 iOS 弹出键盘时的自动滚动来回拉扯。
3. **不用任何固定定位**：
   - **背景层、资源库的毛玻璃蒙层、弹窗遮罩**（`#root::after`，见 `lib/scrim.ts`）：相对 `#root` 铺满整个文档。
   - **主界面 `.app`、右上角工具栏**：absolute，`top: t.browser-bars()`，高度为可视区域。因为页面停在固定的滚动位置，看起来和固定定位一样。
   - **顶层元素**：
     - 对话框、菜单、提示条改为 `position: absolute`。这时它们相对文档原点处的初始包含块定位，用 `t.visible-top()` / `t.visible-bottom()` 放回可视区域。
     - 菜单的坐标要加上 `scrollY`。
     - 所有 `::backdrop` 都改为 absolute，在 `global.scss` 里统一设置。对话框的 `::backdrop` 不画背景，只负责接收点击空白处关闭。
     - 背景交给 `#root::after` 遮罩，状态栏后面也会一起变暗。
4. **底部弹出面板**：
   - 向下多伸出一截栏高，铺到底部工具栏后面，否则那里会露出背景图。
   - 底部内容（按钮区、设置的滚动区）加上同样的留白，避免被工具栏挡住。
5. **毛玻璃蒙层在主屏时要用 `visibility: hidden` 隐藏**，不能只设透明度 0，原因见上面的着色规则。

拖动排序时 dnd-kit 生成的浮起副本（`DragOverlay`）仍是固定定位，但不贴边，实测没有问题。

## 5. 浮层的退场动画不播放

- **现象**：Safari 上关闭弹窗、菜单时瞬间消失。
- **原因**：关闭 dialog / popover 会立即把它移出顶层，退场过渡需要 CSS `overlay` 属性（`transition-behavior: allow-discrete`）才能播完，Safari 不支持。
- **方案**：用 `lib/usePresence.ts` 处理：
  - 关闭时先加 `[data-closing]`，播放退场过渡，等元素自身和 `::backdrop` 的过渡结束后，再真正 `close()` / `hidePopover()`。
  - 退场途中重新打开会取消退场，过渡平滑反向。
  - 兜底：如果浏览器没有生成可等待的动画对象，就按计算出的过渡时长定时关闭。

## 6. 底部面板的按钮被裁掉一截

- **原因一**：面板内部用 `height: 100%` 撑满父元素（一个两端锚定的 dialog）。Chrome 能解析这个百分比，Safari 却按内容自适应，内容一多就把底部按钮挤出面板。改用 flex 撑满（dialog `display: flex`，子元素 `flex: 1; min-height: 0`）。
- **原因二**：见第 3 节，补齐缺口时把固定定位的面板也补了，伸出了屏幕。
- **不要依赖 `100dvh`**：在主屏幕模式下它也不可靠。面板用上下两端锚定（`inset`）来决定高度。

## 7. 键盘与输入框

- **底部面板打开时不要自动聚焦输入框**：键盘会在面板滑入的同时弹出，把面板顶出屏幕。`Modal` 在 `sheet` 模式下跳过 `data-autofocus`。
- **键盘收起后页面可能停在滚动过的位置**：由 `keepScrollTop` 拉回，见第 4 节。
- **小于 16px 的输入框获得焦点时 iOS 会自动放大页面**：viewport 加 `maximum-scale=1` 可以避免。

## 8. 触屏交互细节

| 问题 | 方案 |
|---|---|
| 双指缩放 | iOS 忽略 `user-scalable=no`。三层处理：viewport `maximum-scale=1`、`html { touch-action: pan-x pan-y }`、拦截 `gesturestart` / `gesturechange`（`lib/preventZoom.ts`） |
| 点链接时出现暗色圆角矩形 | iOS 的点击高亮：`-webkit-tap-highlight-color: transparent` |
| 长按文字被选中、弹出系统菜单 | 触屏下 `user-select: none` + `-webkit-touch-callout: none`（`@include t.touch`），输入框除外。Safari 仍需 `-webkit-user-select` 前缀 |
| 点击后 hover 效果「粘住」（图标停在放大状态） | hover 样式放在 `@media (hover: hover)` 里 |
| 弹窗或菜单关闭后，触发按钮上出现焦点圈 | 浏览器把焦点还给触发按钮，iOS 会显示 `:focus-visible`。`lib/inputModality.ts` 记录最近一次是指针还是键盘操作，指针操作时隐藏焦点框 |
| 打开弹窗时第一个按钮出现焦点圈 | 默认聚焦弹窗本身（`tabIndex={-1}`），而不是第一个按钮 |
| 长按图标后松手，打开了链接 | 拖动库只阻止了点击的传递，没有阻止默认行为。拖动或长按结束后用 `lib/swallowClick.ts` 吞掉补发的点击 |
| 长按菜单在手指按住时弹出，松手就被关闭 | 原生 popover 的自动关闭把「按下」和「松手」当成一次点击外部。改用 `popover="manual"`，自行处理点击外部和 Esc |

## 9. 主屏幕网页应用：链接进入应用内浏览器

主屏幕网页应用里点击外部链接，iOS 会在应用内弹出一个浏览器（右下角有跳转 Safari 的按钮），而不是直接打开 Safari。这是系统行为，页面无法改变。

所以目前推荐的用法是：添加到主屏幕时关闭「作为网页应用打开」，用 Safari 标签页使用。注意两种模式的本地数据不互通，切换时需要导出、导入备份。

## 10. 局域网 http 预览时的限制

用 `http://192.168.x.x` 预览时页面不是安全上下文，下面这些接口不可用：

- **`crypto.randomUUID()`**：曾导致整个页面白屏，改用 `lib/id.ts` 的 `createId()`。
- **系统分享（`navigator.share`）和剪贴板 API**：`lib/share.ts` 退回旧式的 `execCommand('copy')`。

部署到 https 后这些问题都不存在。

## 11. 其他

- **刷新时图标滑入**：图标区的位置依赖首帧测量。首屏用 `.booting` 关掉过渡（见 `App.tsx`）。
- **iOS Safari 会清理 7 天未访问网站的本地数据**：每天当作起始页使用不会触发。主屏幕网页应用不受这个限制。

## 12. 调试方法

- **诊断信息**：「设置 → 关于 → 诊断信息」，显示是否主屏幕模式、两种标志、屏幕 / 视口 / 可视区域 / 文档高度、补齐缺口、浏览器工具栏高度、页面滚动位置、上下安全区。数值不对时先看这里。
- **工具栏测试页**：[docs/safari-toolbar-test.html](safari-toolbar-test.html)。开发服务器下用手机打开 `http://<局域网 IP>:5173/docs/safari-toolbar-test.html`，用彩色刻度条直接看出状态栏和工具栏后面画的是哪一段，可以切换多种对照模式：
  - 普通文档；
  - 禁止滚动并滚到中间；
  - 固定层；
  - 画布背景；
  - 加透明固定层、加主题色、加毛玻璃层。
- **局域网预览**：`pnpm dev --host`，手机连同一个 Wi-Fi（关掉 VPN），在 Safari 标签页或主屏幕模式下测试。开发服务器同样提供主屏幕图标和 manifest，可以直接添加到主屏幕。
- **浏览器模拟**：桌面浏览器复现不了 Safari 的工具栏行为。用脚本模拟时，通过覆盖 `screen.height`、`navigator.standalone`、`matchMedia('(display-mode: standalone)')` 构造场景，只能验证我们自己的计算，Safari 怎么绘制必须真机确认。
