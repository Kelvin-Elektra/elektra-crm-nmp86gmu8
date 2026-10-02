import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Normaliza número de telefone para o padrão WhatsApp internacional (Brasil +55)
 */
export function formatWhatsAppUrl(rawPhone?: string | null): string | null {
  if (!rawPhone) return null
  const clean = String(rawPhone).replace(/\D/g, '')
  if (!clean || clean.length < 8) return null

  // Se já tiver DDI do Brasil (55) e tamanho compatível (12 ou 13 dígitos: 55 + DDD (2) + 8/9 dígitos)
  let finalNumber = clean
  if (clean.startsWith('55') && (clean.length === 12 || clean.length === 13)) {
    finalNumber = clean
  } else if (clean.length <= 11) {
    // Adiciona o prefixo Brasil +55
    finalNumber = `55${clean}`
  }

  return `https://wa.me/${finalNumber}`
}

interface WhatsAppContactButtonProps {
  phone?: string | null
  clientName?: string | null
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
  className?: string
}

export function WhatsAppContactButton({
  phone,
  clientName,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  className = '',
}: WhatsAppContactButtonProps) {
  const url = formatWhatsAppUrl(phone)

  if (!url) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-block">
              <Button
                type="button"
                variant="ghost"
                size={size}
                disabled
                className={`opacity-40 cursor-not-allowed ${className}`}
              >
                <MessageCircle className="h-4 w-4" />
                {showLabel && <span className="ml-1.5 text-xs">WhatsApp</span>}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Nenhum telefone cadastrado para este contato</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={variant}
            size={size}
            onClick={handleClick}
            className={`border-emerald-500/30 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 dark:text-emerald-400 ${className}`}
            title={clientName ? `Conversar com ${clientName} no WhatsApp` : 'Abrir WhatsApp'}
          >
            <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            {showLabel && <span className="ml-1.5 text-xs font-medium">WhatsApp</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{clientName ? `Conversar com ${clientName} via WhatsApp` : 'Conversar no WhatsApp'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
