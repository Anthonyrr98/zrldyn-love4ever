import { useEffect, useMemo, useRef, useState } from 'react'
import './Select.css'

/**
 * 轻量可控 Select（自定义下拉面板）
 * - 支持键盘：Enter/Space 打开，Esc 关闭，↑↓移动，Enter 选择
 * - 支持搜索（可选）
 * - 点击外部关闭
 *
 * @param {Object} props
 * @param {string} props.value
 * @param {(nextValue: string) => void} props.onChange
 * @param {{ value: string, label?: string, disabled?: boolean }[]} props.options
 * @param {string} [props.placeholder]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.searchable]
 */
function Select({
  value,
  onChange,
  options,
  placeholder = '请选择',
  disabled = false,
  searchable = false,
}) {
  const wrapRef = useRef(null)
  const listRef = useRef(null)
  const searchRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const normalizedOptions = Array.isArray(options) ? options : []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!searchable || !q) return normalizedOptions
    return normalizedOptions.filter((opt) => {
      const label = (opt.label ?? opt.value ?? '').toString().toLowerCase()
      return label.includes(q)
    })
  }, [normalizedOptions, query, searchable])

  const selected = useMemo(() => {
    const found = normalizedOptions.find((o) => o.value === value)
    return found || null
  }, [normalizedOptions, value])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!wrapRef.current) return
      const target = e.target
      if (target instanceof Node && !wrapRef.current.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    // 打开时让 activeIndex 指向当前选中项
    const idx = Math.max(0, filtered.findIndex((o) => o.value === value))
    setActiveIndex(idx === -1 ? 0 : idx)
    // 可搜索时聚焦搜索框，否则聚焦列表
    const t = window.setTimeout(() => {
      if (searchable && searchRef.current) searchRef.current.focus()
      else if (listRef.current) listRef.current.focus()
    }, 0)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const commit = (next) => {
    if (!next || next.disabled) return
    onChange?.(next.value)
    setOpen(false)
  }

  const onTriggerKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen((v) => !v)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
    }
  }

  const onListKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtered[activeIndex]
      if (opt) commit(opt)
    }
  }

  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector?.(`[data-idx="${activeIndex}"]`)
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, open])

  const label = selected ? (selected.label ?? selected.value) : ''

  return (
    <div ref={wrapRef} className={`p4p-select ${disabled ? 'is-disabled' : ''}`}>
      <button
        type="button"
        className={`p4p-select-trigger ${open ? 'is-open' : ''}`}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={`p4p-select-value ${label ? '' : 'is-placeholder'}`}>
          {label || placeholder}
        </span>
        <svg className="p4p-select-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="p4p-select-popover" role="presentation">
          {searchable && (
            <div className="p4p-select-search">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索…"
              />
            </div>
          )}

          <div
            ref={listRef}
            className="p4p-select-list"
            role="listbox"
            tabIndex={0}
            onKeyDown={onListKeyDown}
          >
            {filtered.length === 0 ? (
              <div className="p4p-select-empty">无匹配项</div>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = opt.value === value
                const isActive = idx === activeIndex
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`p4p-select-option ${isSelected ? 'is-selected' : ''} ${isActive ? 'is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => commit(opt)}
                    role="option"
                    aria-selected={isSelected}
                    disabled={!!opt.disabled}
                    data-idx={idx}
                  >
                    <span className="p4p-select-option-label">{opt.label ?? opt.value}</span>
                    {isSelected && (
                      <svg className="p4p-select-check" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Select
