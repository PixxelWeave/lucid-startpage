// =============================================================================
// 开发用示例导航（50 个），用于查看多行布局、各种图标形态。
// 仅在 `pnpm dev` 下通过 设置 → 数据 → “载入示例导航” 动态加载，不会进入构建产物。
// =============================================================================

import { createId } from '@/lib/id'
import { iconPresets } from './icon'
import type { NavIcon, NavItem } from './types'

const lib = iconPresets.library

const MOCK: [name: string, url: string, icon: NavIcon][] = [
  ['Google', 'https://www.google.com/', lib('icons/google.svg', '#fff')],
  ['Gmail', 'https://mail.google.com/', lib('icons/gmail.svg', '#fff')],
  ['YouTube', 'https://www.youtube.com/', lib('icons/youtube.svg', '#ff0000')],
  ['GitHub', 'https://github.com/', lib('icons/github.svg', '#000')],
  ['哔哩哔哩', 'https://www.bilibili.com/', lib('icons/bilibili2.svg', '#ff5ca1')],
  ['知乎', 'https://www.zhihu.com/', lib('icons/zhihu.svg', '#0c6dfe')],
  ['微博', 'https://weibo.com/', lib('icons/weibo.svg', '#ffd850')],
  ['京东', 'https://www.jd.com/', lib('icons/jd.svg', '#ff0000')],
  ['抖音', 'https://www.douyin.com/', lib('website/douyin.svg', '#1c0b1a')],
  ['小红书', 'https://www.xiaohongshu.com/', lib('icons/xiaohongshu.svg', '#ff2442')],
  ['百度', 'https://www.baidu.com/', lib('icons/baidu.svg', '#346efd')],
  ['QQ邮箱', 'https://mail.qq.com/', lib('icons/qq-mail.svg', '#fff')],
  ['腾讯视频', 'https://v.qq.com/', lib('icons/qqvideo.svg', '#ffffff')],
  ['爱奇艺', 'https://www.iqiyi.com/', lib('icons/iqiyi.svg', '#00cc4c')],
  ['豆瓣', 'https://www.douban.com/', lib('icons/douban.svg', '#00c117')],
  ['X', 'https://x.com/', lib('icons/x.com.svg', '#000000')],
  ['Reddit', 'https://www.reddit.com/', lib('icons/www.reddit.com.svg', '#fe4f0e')],
  ['Stack Overflow', 'https://stackoverflow.com/', lib('icons/stackoverflow.svg', '#444444')],
  // 关闭背景填充 + 缩放
  ['Notion', 'https://www.notion.so/', { ...lib('icons/notion.svg', '#fff'), fill: false, scale: 0.8 }],
  ['Figma', 'https://www.figma.com/', lib('icons/figma.svg', '#161616')],
  ['ChatGPT', 'https://chatgpt.com/', lib('icons/chatgpt.com.svg', '#fff')],
  ['Spotify', 'https://open.spotify.com/', lib('icons/spotify.svg', '#fff')],
  ['力扣', 'https://leetcode.cn/', lib('icons/leetcode.svg', '#fff')],
  ['MDN', 'https://developer.mozilla.org/', lib('icons/mdn-web-docs.svg', '#000000')],
  ['语雀', 'https://www.yuque.com/', lib('icons/www.yuque.com.svg', '#5dbd6a')],
  ['少数派', 'https://sspai.com/', lib('icons/sspai.svg', '#d7191a')],
  ['微信读书', 'https://weread.qq.com/', lib('icons/weread-qq.svg', '#fff')],
  ['QQ音乐', 'https://y.qq.com/', lib('icons/qqmusic.svg', '#fff')],
  ['网易云音乐', 'https://music.163.com/', lib('icons/music163.svg', '#fe1816')],
  ['维基百科', 'https://zh.wikipedia.org/', lib('icons/wikipedia.svg', '#fff')],
  ['掘金', 'https://juejin.cn/', lib('icons/juejin.svg', '#0984fe')],
  ['V2EX', 'https://www.v2ex.com/', lib('icons/v2ex.svg', '#222222')],
  ['Google翻译', 'https://translate.google.com/', lib('icons/translate-google.svg', '#fff')],
  ['Google Drive', 'https://drive.google.com/', lib('icons/drive-google.svg', '#fff')],
  ['优酷', 'https://www.youku.com/', lib('icons/youku.svg', '#ffffff')],
  ['斗鱼', 'https://www.douyu.com/', lib('icons/douyu.svg', '#ff6a2d')],
  ['拼多多', 'https://www.pinduoduo.com/', lib('icons/pinduoduo.svg', '#ff0000')],
  ['美团', 'https://www.meituan.com/', lib('icons/60b9ef3fae5a9ba4024b479d.png', '#ffc200')],
  ['携程', 'https://www.ctrip.com/', lib('icons/ctrip.svg', '#2c8bed')],
  ['12306', 'https://www.12306.cn/', lib('icons/12306.svg', '#37aee4')],
  ['高德地图', 'https://ditu.amap.com/', lib('icons/amap.svg', '#ffffff')],
  ['Twitch', 'https://www.twitch.tv/', lib('icons/www.twitch.tv.svg', '#5c399b')],
  ['Facebook', 'https://www.facebook.com/', lib('icons/facebook.svg', '#39579a')],
  ['Steam', 'https://store.steampowered.com/', lib('icons/steam.svg', '#000000')],
  ['飞书', 'https://www.feishu.cn/', lib('icons/feishu.svg', '#fff')],
  ['DeepSeek', 'https://chat.deepseek.com/', lib('icons/deepseek.svg', '#fff')],
  // Google 图标（不在 iTab 库中；不清晰时自动降级为首字）
  ['淘宝', 'https://www.taobao.com/', iconPresets.favicon()],
  ['httpbin', 'https://httpbin.org/', iconPresets.favicon()],
  // 首字 + 自定义底色
  ['Example', 'https://example.com/', { ...iconPresets.letter(), background: '#4285f4' }],
  // 超长名称（看省略号）
  ['这是一个名字特别长的测试网站', 'https://example.org/', iconPresets.letter()],
]

export function createMockItems(): NavItem[] {
  return MOCK.map(([name, url, icon]) => ({ id: createId(), name, url, icon }))
}
