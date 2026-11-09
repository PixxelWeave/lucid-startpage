# startpage

浏览器起始页。Vite + React + TypeScript + SCSS Modules，使用 pnpm 管理依赖。

## 开发

```bash
pnpm install
pnpm dev       # 本地开发
pnpm build     # 类型检查 + 生产构建，输出到 dist/
pnpm preview   # 预览构建产物
pnpm lint      # oxlint
```

## 约定

- 组件样式使用 `*.module.scss`，类名写 kebab-case，在 TS 中以 camelCase 引用（`.search-bar` → `styles.searchBar`）。
- `src/styles/_variables.scss` 中的变量与 mixin 已自动注入每个 SCSS 文件，通过 `v.` 命名空间使用，如 `v.$gap`、`@include v.flex-center`。
- 主题色等运行时可变的值定义为 CSS 变量，见 `src/styles/global.scss`。
- `@/` 指向 `src/`。

## 目录

```
src/
├── components/      # 组件，每个组件一个目录（.tsx + .module.scss）
├── styles/          # 全局样式与 SCSS 变量
├── App.tsx
└── main.tsx
```
