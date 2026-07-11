import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface NumericInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'type' | 'inputMode'
> {
  value?: number | string
  onValueChange?: (value: number) => void
  onChange?: (value: number) => void
  allowNegative?: boolean
}

export function NumericInput({
  value,
  onValueChange,
  onChange,
  allowNegative = false,
  className,
  ...props
}: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState('')
  const isFocused = useRef(false)

  const { onBlur: externalOnBlur, onFocus: externalOnFocus, ...restProps } = props

  useEffect(() => {
    if (isFocused.current) return
    if (value == null || value === '') {
      setDisplayValue('')
      return
    }
    const numVal = typeof value === 'string' ? parseFloat(value) : value
    setDisplayValue(isNaN(numVal) ? '' : String(numVal))
  }, [value])

  const sanitize = (raw: string): string => {
    if (raw === '' || raw === '-') return raw

    const pattern = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/
    if (!pattern.test(raw)) return displayValue

    let result = raw
    const isNeg = allowNegative && result.startsWith('-')
    if (isNeg) result = result.slice(1)

    if (result.includes('.')) {
      const [intPart, ...decParts] = result.split('.')
      const cleanInt = intPart.replace(/^0+/, '') || '0'
      result = cleanInt + '.' + decParts.join('')
    } else if (result.length > 1 && result.startsWith('0')) {
      result = result.replace(/^0+/, '') || '0'
    }

    return (isNeg ? '-' : '') + result
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitize(e.target.value)
    setDisplayValue(sanitized)

    const numVal = parseFloat(sanitized)
    const finalVal = isNaN(numVal) ? 0 : numVal
    onValueChange?.(finalVal)
    onChange?.(finalVal)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocused.current = false
    const numVal = parseFloat(displayValue)
    if (isNaN(numVal)) {
      setDisplayValue('')
    } else {
      setDisplayValue(String(numVal))
    }
    externalOnBlur?.(e)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocused.current = true
    externalOnFocus?.(e)
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      className={cn(className)}
      {...restProps}
    />
  )
}
