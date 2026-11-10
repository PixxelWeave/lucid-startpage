#!/usr/bin/env bash
# 构建网页版并部署到 Cloudflare Pages（直接上传，不经过 git）。
#
#   pnpm deploy:web            # 部署到正式环境（lucid-startpage.pages.dev）
#   pnpm deploy:web preview    # 部署为预览版本（独立网址，不影响正式环境）
#
# 凭证放在项目根目录的 .env.deploy.local（已被 .gitignore 的 *.local 忽略，不会提交）：
#
#   CLOUDFLARE_API_TOKEN=...      # API Token，权限：Account → Cloudflare Pages → Edit
#   CLOUDFLARE_ACCOUNT_ID=...     # 控制台 Workers & Pages 页右侧的 Account ID
#   CF_PAGES_PROJECT=...          # 可选，Pages 项目名，默认 lucid-startpage（即 lucid-startpage.pages.dev）
#
# 也可以直接用同名环境变量，环境变量优先。
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.deploy.local"
if [[ -f "$ENV_FILE" ]]; then
  # 只补充未设置的变量：命令行 / 环境里已有的值优先
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" == \#* ]] && continue
    if [[ -z "${!key:-}" ]]; then export "$key=$value"; fi
  done < "$ENV_FILE"
fi

: "${CLOUDFLARE_API_TOKEN:?缺少 CLOUDFLARE_API_TOKEN（写进 ${ENV_FILE} 或设为环境变量）}"
: "${CLOUDFLARE_ACCOUNT_ID:?缺少 CLOUDFLARE_ACCOUNT_ID（写进 ${ENV_FILE} 或设为环境变量）}"
PROJECT="${CF_PAGES_PROJECT:-lucid-startpage}"
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID

case "${1:-production}" in
  production) BRANCH=main ;;
  preview) BRANCH=preview ;;
  *) echo "未知参数：${1}（可选 production / preview）" >&2; exit 1 ;;
esac

echo "▸ 构建网页版"
pnpm build:web

# 首次部署时创建项目。
# 新版 wrangler 默认把 `pages project create` 转交给 Workers，并“自动配置”项目
# （安装 @cloudflare/vite-plugin、改 vite.config.ts、生成 wrangler.jsonc）。
# 这里明确使用 Pages：--force 走原有的 Pages 创建流程，不改动项目文件。
echo "▸ 确认 Pages 项目：${PROJECT}"
if ! pnpm exec wrangler pages project list 2>/dev/null | grep -qw -- "$PROJECT"; then
  echo "  首次部署，创建项目"
  pnpm exec wrangler pages project create "$PROJECT" --production-branch main --force
fi

echo "▸ 上传到 Cloudflare Pages（${BRANCH}）"
pnpm exec wrangler pages deploy dist-web \
  --project-name "$PROJECT" \
  --branch "$BRANCH" \
  --commit-hash "$(git rev-parse HEAD 2>/dev/null || echo unknown)" \
  --commit-message "$(git log -1 --pretty=%s 2>/dev/null || echo manual deploy)" \
  --commit-dirty="$([[ -n "$(git status --porcelain 2>/dev/null)" ]] && echo true || echo false)"
