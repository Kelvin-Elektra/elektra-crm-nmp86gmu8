import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export function LocationCombobox({
  cities,
  value,
  onChange,
  disabled,
}: {
  cities: string[]
  value: string
  onChange: (val: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal bg-background"
          disabled={disabled}
        >
          {value || 'Selecione ou digite...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-[100]" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar cidade..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start px-2 py-1.5 text-sm"
                  onClick={() => {
                    onChange(inputValue)
                    setOpen(false)
                  }}
                >
                  Usar "{inputValue}"
                </Button>
              ) : (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Nenhuma cidade encontrada.
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {cities.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => {
                    onChange(city)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === city ? 'opacity-100' : 'opacity-0')}
                  />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
