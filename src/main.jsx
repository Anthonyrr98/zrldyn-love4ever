import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n'
import App from './App'
import { loadThemeColor } from './utils/theme'
import './index.css'

// 应用启动时加载主题色
loadThemeColor()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>加载中...</div>}>
        <App />
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
