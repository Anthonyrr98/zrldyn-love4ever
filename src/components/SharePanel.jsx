import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './SharePanel.css'

/**
 * 分享面板组件
 * @param {Object} props
 * @param {string} props.title - 分享标题
 * @param {string} props.url - 分享链接
 * @param {string} props.image - 分享图片
 * @param {string} props.description - 分享描述
 */
function SharePanel({ title, url, image, description }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef(null)

  const shareUrl = url || window.location.href
  const shareTitle = title || document.title
  const shareDesc = description || ''

  const showToast = (msg) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2200)
  }

  // 复制链接
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      showToast(t('share.copied'))
    } catch (err) {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      showToast(t('share.copied'))
    }
  }

  // 微博分享
  const shareToWeibo = () => {
    const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}&pic=${encodeURIComponent(image || '')}`
    window.open(weiboUrl, '_blank', 'width=600,height=500')
  }

  // 微信分享（显示二维码提示）
  const shareToWechat = async () => {
    // 微信无法直接从网页唤起分享：这里做“复制链接 + 提示”
    try {
      await navigator.clipboard.writeText(shareUrl)
      showToast(t('share.wechatCopiedTip'))
    } catch {
      showToast(t('share.wechatTip'))
    }
  }

  // 原生分享 API（移动端）
  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareDesc,
          url: shareUrl,
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err)
        }
      }
    } else {
      setShowPanel(true)
    }
  }

  return (
    <div className="share-panel-wrapper">
      <button
        type="button"
        className="share-trigger-button"
        onClick={() => setShowPanel(!showPanel)}
        aria-label={t('share.share')}
        title={t('share.share')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        <span>{t('share.share')}</span>
      </button>

      {showPanel && (
        <>
          <div className="share-panel-overlay" onClick={() => setShowPanel(false)} />
          <div className="share-panel">
            <div className="share-panel-header">
              <span className="share-panel-title">{t('share.shareTo')}</span>
              <button
                type="button"
                className="share-panel-close"
                onClick={() => setShowPanel(false)}
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>
            <div className="share-panel-buttons">
              <button
                type="button"
                className="share-button share-button--wechat"
                onClick={shareToWechat}
                title={t('share.wechat')}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89l-.045-.033h-.002zm-2.89 2.86c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/>
                </svg>
                <span>{t('share.wechat')}</span>
              </button>

              <button
                type="button"
                className="share-button share-button--weibo"
                onClick={shareToWeibo}
                title={t('share.weibo')}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.194.573zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.64 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zm7.563-1.224c-.346-.105-.579-.18-.405-.649.387-1.044.428-1.946.003-2.587-.796-1.203-2.973-1.14-5.478-.033l.001.001c-.69.304-.533.114-.454-.09.149-.426.128-.738-.095-.995-.512-.59-1.962-.564-4.089.174-1.768.612-3.688 1.778-5.056 3.259C.436 12.806-.417 14.778.186 16.43c1.156 3.166 5.591 5.088 10.251 4.602 6.882-.716 11.669-5.172 10.302-8.011-.39-.811-1.178-1.136-2.68-1.572zm2.005-5.552c-.988-1.092-2.441-1.511-3.855-1.287l-.001-.001c-.462.072-.774.5-.698.955.077.456.508.76.969.69.939-.148 1.903.13 2.56.856.66.724.879 1.707.627 2.625-.122.448.144.912.596 1.035.452.122.92-.142 1.041-.59.378-1.387.049-2.872-.942-3.953l-.297-.33zm-.397 2.391c.241-.64-.084-1.357-.725-1.6-.643-.241-1.362.082-1.603.723-.238.64.086 1.356.727 1.6.641.241 1.361-.08 1.601-.723zm-1.283-5.291C17.406 2.296 15.197 1.366 12.833 1.703c-.614.088-1.04.658-.949 1.269.091.61.663 1.033 1.277.942 1.614-.231 3.125.406 4.041 1.534.914 1.128 1.136 2.615.677 3.955-.171.498.098 1.04.6 1.21.502.169 1.045-.097 1.216-.596.682-1.986.353-4.185-1.004-5.858l-.002-.001z"/>
                </svg>
                <span>{t('share.weibo')}</span>
              </button>

              <button
                type="button"
                className={`share-button share-button--copy ${copied ? 'is-copied' : ''}`}
                onClick={copyLink}
                title={t('share.copyLink')}
              >
                {copied ? (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                )}
                <span>{copied ? t('share.copied') : t('share.copyLink')}</span>
              </button>
            </div>
            {toast && (
              <div className="share-panel-toast" role="status" aria-live="polite">
                {toast}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default SharePanel
