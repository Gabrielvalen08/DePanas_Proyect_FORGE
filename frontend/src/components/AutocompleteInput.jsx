import React, { useState } from 'react'

/**
 * AutocompleteInput
 * Input con dropdown de sugerencias basado en datos previos.
 * Props:
 *  - value, onChange, placeholder, id
 *  - getSuggestions: función que recibe el texto y retorna array de strings
 */
export default function AutocompleteInput({
  value,
  onChange,
  placeholder,
  id,
  getSuggestions,
  className = '',
}) {
  const [suggestions, setSuggestions] = useState([])
  const [highlighted, setHighlighted] = useState(-1)
  const [open, setOpen] = useState(false)

  function handleChange(e) {
    const val = e.target.value
    onChange(val)
    if (val.length > 0) {
      const filtered = getSuggestions(val)
      setSuggestions(filtered)
      setOpen(filtered.length > 0)
    } else {
      setSuggestions([])
      setOpen(false)
    }
    setHighlighted(-1)
  }

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      setHighlighted(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      setHighlighted(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      select(suggestions[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function select(val) {
    onChange(val)
    setOpen(false)
    setSuggestions([])
    setHighlighted(-1)
  }

  return (
    <div className={`autocomplete-wrapper ${className}`} style={{ position: 'relative' }}>
      <input
        id={id}
        className="input"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true)
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <div className="autocomplete-dropdown">
          {suggestions.map((s, i) => (
            <div
              key={s}
              className={`autocomplete-item ${i === highlighted ? 'highlighted' : ''}`}
              onMouseDown={() => select(s)}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
