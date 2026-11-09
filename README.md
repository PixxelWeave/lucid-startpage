# startpage

浏览器起始页，以 Chrome 扩展形式替换新标签页。Pixel（Material 3）视觉风格，iOS 式交互。

- 导航：添加网址、名称和图标（网站图标 / 文字 / 上传图片），点击在新标签页打开
- 长按图标进入编辑模式：拖动排序、“−” 删除、点击图标编辑；点“完成”、按 Esc 或点空白处退出
- 设置（右上角齿轮）：时钟显示与 12/24 小时制、打开方式、主题（自动 / 浅色 / 深色）、导入导出备份、恢复默认
- 多个标签页之间数据自动同步

技术栈：Vite + React + TypeScript + SCSS Modules，pnpm 管理依赖，拖拽使用 dnd-kit。

## 开发

```bash
pnpm install
pnpm dev       # 本地预览页面（数据存在 localStorage）
pnpm lint      # oxlint + stylelint（含设计 token 约束检查）
pnpm build     # 类型检查 + 构建到 dist/
pnpm zip       # 构建并打包为 startpage-extension.zip
```

## 安装为 Chrome 扩展

1. `pnpm build`
2. 打开 `chrome://extensions`，开启右上角“开发者模式”
3. 点击“加载已解压的扩展程序”，选择 `dist/` 目录
4. 打开新标签页

更新代码后重新 `pnpm build`，在扩展页点刷新即可。

## 设计规范

设计 token 与公共组件的使用约定见 [CLAUDE.md](CLAUDE.md)，需求原文见 [docs/requirements.md](docs/requirements.md)。

## 目录

```
src/
├── components/
│   ├── ui/          # 公共组件：Button、Card、ListItem、Switch、Modal 等
│   └── Clock/
├── features/
│   ├── nav/         # 导航：数据、网格、拖拽图块、编辑对话框
│   └── settings/    # 设置：状态、主题、备份、设置弹窗
├── lib/             # 工具函数、存储
└── styles/          # 设计 token（_tokens.scss）与全局样式
```
