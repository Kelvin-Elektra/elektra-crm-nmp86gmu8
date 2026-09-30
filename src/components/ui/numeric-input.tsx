import React from 'react'
import { Input } from '@/components/ui/input'

interface NumericInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> {
  value: number | string | null | undefined
  onChangeValue?: (val: number | null) => void
  onValueChange?: (val: any) => void
  precision?: number
}

/**
 * Converte número/string para formato pt-BR (ex: 1234.56 -> "1234,56")
 */
export function formatToPtBrNumber(
  val: number | string | null | undefined,
  precision?: number,
): string {
  if (val === null || val === undefined || val === '') return ''
  const num = typeof val === 'number' ? val : Number(String(val).replace(',', '.'))
  if (isNaN(num)) return ''
  if (precision !== undefined) {
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })
  }
  return String(num).replace('.', ',')
}

/**
 * Converte string pt-BR (ex: "1.234,56" ou "1234,56") para número float ou null
 */
export function parsePtBrNumber(text: string): number | null {
  if (!text || text.trim() === '') return null
  // Remove pontos de milhar e substitui vírgula por ponto
  const clean = text.trim().replace(/\./g, '').replace(',', '.')
  const num = parseFloat(clean)
  return isNaN(num) ? null : num
}

export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    { value, onChangeValue, onValueChange, precision, className, placeholder, onBlur, ...rest },
    ref,
  ) => {
    const [display, setDisplay] = React.useState<string>(() => {
      if (value === null || value === undefined || value === '') return ''
      return String(value).replace('.', ',')
    })

    // Sincroniza quando o valor externo muda (e não estamos digitando ativamente caso o valor coincida)
    React.useEffect(() => {
      const parsedCurrent = parsePtBrNumber(display)
      const numValue = value === null || value === undefined || value === '' ? null : Number(value)
      if (numValue !== parsedCurrent) {
        if (numValue === null || isNaN(numValue)) {
          setDisplay('')
        } else {
          setDisplay(String(numValue).replace('.', ','))
        }
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      // Aceita apenas dígitos, vírgula e ponto
      const sanitized = raw.replace(/[^\d.,-]/g, '')
      setDisplay(sanitized)
      const parsed = parsePtBrNumber(sanitized)
      onChangeValue?.(parsed)
      onValueChange?.(parsed)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const parsed = parsePtBrNumber(display)
      if (parsed !== null && precision !== undefined) {
        setDisplay(
          parsed.toLocaleString('pt-BR', {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
          }),
        )
      } else if (parsed !== null) {
        setDisplay(String(parsed).replace('.', ','))
      } else {
        setDisplay('')
      }
      if (onBlur) onBlur(e)
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={display}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        className={className}
        {...rest}
      />
    )
  },
)

NumericInput.displayName = 'NumericInput'
