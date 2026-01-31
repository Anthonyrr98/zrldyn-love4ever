// 根据原始图片 URL 生成不同尺寸的展示地址
// 约定：
// - 阿里云 OSS：使用 x-oss-process 按百分比缩放
// - 其他（如 Unsplash 示例）：保持原地址，避免加载失败

function appendQuery(url, query) {
  if (!url) return ''
  return url.includes('?') ? `${url}&${query}` : `${url}?${query}`
}

export function getThumbUrl(originalUrl) {
  if (!originalUrl) return ''

  // 阿里云 OSS 动态缩放：10%
  if (originalUrl.includes('oss-')) {
    return appendQuery(originalUrl, 'x-oss-process=image/resize,p_10')
  }

  // 其他图片源（如示例 Unsplash），直接返回原图或依赖自身参数
  return originalUrl
}

export function getDetailPreviewUrl(originalUrl) {
  if (!originalUrl) return ''

  // 阿里云 OSS 动态缩放：25%
  if (originalUrl.includes('oss-')) {
    return appendQuery(originalUrl, 'x-oss-process=image/resize,p_25')
  }

  return originalUrl
}

