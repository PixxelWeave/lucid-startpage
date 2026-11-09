/** 是否运行在 Chrome 扩展页面中（开发预览时为 false）。 */
export const isExtension =
  typeof chrome !== 'undefined' && typeof chrome.runtime?.id === 'string'
