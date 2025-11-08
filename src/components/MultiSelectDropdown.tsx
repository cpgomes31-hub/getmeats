import React, { useEffect, useRef, useState } from 'react'

type MultiSelectOption<T extends string> = {
  value: T
  label: string
  count?: number
}

interface MultiSelectDropdownProps<T extends string> {
  label: string
  placeholder?: string
  options: MultiSelectOption<T>[]
  selected: T[]
  onChange: (values: T[]) => void
  emptyLabel?: string
}

export default function MultiSelectDropdown<T extends string>({
  label,
  placeholder = 'Selecione...',
  options,
  selected,
  onChange,
  emptyLabel = 'Nenhum filtro aplicado'
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleValue = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const selectedLabels = options
    .filter(option => selected.includes(option.value))
    .map(option => option.label)

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <button
        type="button"
        className="inline-flex w-64 justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
        onClick={() => setIsOpen(prev => !prev)}
      >
        <span className="truncate text-left">
          {selectedLabels.length > 0 ? selectedLabels.join(', ') : placeholder}
        </span>
        <svg
          className="ml-2 h-4 w-4 text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.584l3.71-4.353a.75.75 0 111.14.976l-4.25 5a.75.75 0 01-1.14 0l-4.25-5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-72 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="p-2 max-h-64 overflow-y-auto">
            {options.length === 0 ? (
              <p className="text-sm text-gray-500 px-2 py-4 text-center">{emptyLabel}</p>
            ) : (
              options.map(option => {
                const isChecked = selected.includes(option.value)
                return (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center justify-between rounded px-2 py-2 hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                        checked={isChecked}
                        onChange={() => toggleValue(option.value)}
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </div>
                    {typeof option.count === 'number' && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                        {option.count}
                      </span>
                    )}
                  </label>
                )
              })
            )}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
            <button
              type="button"
              className="text-sm text-red-600 hover:text-red-700"
              onClick={() => onChange([])}
            >
              Limpar seleção
            </button>
            <button
              type="button"
              className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
              onClick={() => setIsOpen(false)}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
