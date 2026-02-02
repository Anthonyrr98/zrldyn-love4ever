import { useEffect, useMemo, useRef, useState } from 'react'
import './DatePicker.css'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatDateValue(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseDateValue(v) {
  if (!v || typeof v !== 'string') return null
  const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const day = Number(m[3])
  const d = new Date(y, mo, day)
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null
  return d
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addMonths(d, delta) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1)
}

/**
 * 轻量可控 DatePicker（自定义日历面板）
 * - 输出/输入值：YYYY-MM-DD（与后端一致）
 * - 点击外部关闭，Esc 关闭
 *
 * @param {Object} props
 * @param {string} props.value
 * @param {(nextValue: string) => void} props.onChange
 * @param {string} [props.placeholder]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.required]
 */
function DatePicker({ value, onChange, placeholder = 'YYYY-MM-DD', disabled = false, required = false }) {
  const wrapRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value || '')

  const selectedDate = useMemo(() => parseDateValue(value), [value])

  const [viewMonth, setViewMonth] = useState(() => {
    const d = selectedDate || new Date()
    return startOfMonth(d)
  })

  useEffect(() => {
    setInputValue(value || '')
    if (selectedDate) setViewMonth(startOfMonth(selectedDate))
  }, [value, selectedDate])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!wrapRef.current) return
      const target = e.target
      if (target instanceof Node && !wrapRef.current.contains(target)) {
        setOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const weeks = useMemo(() => {
    const first = startOfMonth(viewMonth)
    const firstDay = first.getDay() // 0=Sun
    // 以周一为一周开始：把 0(Sun) 映射到 6，1(Mon)->0
    const offset = (firstDay + 6) % 7
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset)
    const out = []
    for (let w = 0; w < 6; w++) {
      const row = []
      for (let i = 0; i < 7; i++) {
        row.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i))
      }
      out.push(row)
    }
    return out
  }, [viewMonth])

  const monthLabel = useMemo(() => {
    return `${viewMonth.getFullYear()}-${pad2(viewMonth.getMonth() + 1)}`
  }, [viewMonth])

  const commit = (d) => {
    const next = formatDateValue(d)
    onChange?.(next)
    setOpen(false)
  }

  const onInputBlur = () => {
    const d = parseDateValue(inputValue)
    if (inputValue.trim() === '') {
      onChange?.('')
      return
    }
    if (d) {
      onChange?.(formatDateValue(d))
      return
    }
    // 非法输入：回滚到当前 value
    setInputValue(value || '')
  }

  return (
    <div ref={wrapRef} className={`p4p-date ${disabled ? 'is-disabled' : ''}`}>
      <div className={`p4p-date-trigger ${open ? 'is-open' : ''}`}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => !disabled && setOpen(true)}
          onBlur={onInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          inputMode="numeric"
          aria-label="date"
        />
        <button
          type="button"
          className="p4p-date-btn"
          onClick={() => !disabled && setOpen((v) => !v)}
          aria-label="open calendar"
          disabled={disabled}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M4 4h12v12H4V4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M4 8h12M7 4v4M13 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {open && (
        <div className="p4p-date-popover" role="dialog" aria-label="calendar">
          <div className="p4p-date-header">
            <button type="button" className="p4p-date-nav" onClick={() => setViewMonth((m) => addMonths(m, -1))} aria-label="prev month">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="p4p-date-title">{monthLabel}</div>
            <button type="button" className="p4p-date-nav" onClick={() => setViewMonth((m) => addMonths(m, 1))} aria-label="next month">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="p4p-date-weekdays">
            {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
              <div key={w} className="p4p-date-weekday">{w}</div>
            ))}
          </div>

          <div className="p4p-date-grid">
            {weeks.flat().map((d) => {
              const inMonth = d.getMonth() === viewMonth.getMonth()
              const isSelected = selectedDate
                ? (d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth() && d.getDate() === selectedDate.getDate())
                : false
              return (
                <button
                  key={`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
                  type="button"
                  className={`p4p-date-day ${inMonth ? '' : 'is-out'} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => commit(d)}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker

