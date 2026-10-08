import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import pb from '@/lib/pocketbase/client'
import { sendNegotiationToFlow } from '@/services/flow'
import { useToast } from '@/hooks/use-toast'
import { SendHorizontal, User, Zap, Box, Coins, Loader2, CheckCircle2 } from 'lucide-react'

interface SendToFlowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  neg: any
  proposals?: any[]
  onSuccess?: () => void
}

export function SendToFlowDialog({
  open,
  onOpenChange,
  neg,
  proposals = [],
  onSuccess,
}: SendToFlowDialogProps) {
  const [loading, setLoading] = useState(false)
  const [modulesList, setModulesList] = useState<any[]>([])
  const [invertersList, setInvertersList] = useState<any[]>([])
  const { toast } = useToast()

  const sizing = neg?.sizing || {}
  const lead = neg?.expand?.lead_id || {}
  const companyId = neg?.company_id

  useEffect(() => {
    let cancelled = false
    if (open && companyId) {
      Promise.all([
        pb.collection('pv_modules').getFullList({ filter: `company_id='${companyId}'` }),
        pb.collection('pv_inverters').getFullList({ filter: `company_id='${companyId}'` }),
      ])
        .then(([mods, invs]) => {
          if (!cancelled) {
            setModulesList(mods)
            setInvertersList(invs)
          }
        })
        .catch((err) => {
          console.warn('[SendToFlowDialog] Falha ao carregar catálogo de módulos/inversores:', err)
        })
    }
    return () => {
      cancelled = true
    }
  }, [open, companyId])

  if (!neg) return null

  // Dados do Cliente
  const clientName = lead.name || neg.title || 'Cliente'
  const clientDoc = lead.document || 'Não informado'
  const clientCity = lead.city || sizing.address_struct?.city || neg.city || ''
  const clientState = lead.state || sizing.address_struct?.state || neg.state || ''
  const clientLocation =
    clientCity && clientState
      ? `${clientCity}/${clientState}`
      : clientCity || clientState || 'Não informada'

  // Resolução do Módulo
  const selectedModId = sizing.selected_module_id || sizing.moduleId || ''
  const matchedMod = selectedModId ? modulesList.find((m) => m.id === selectedModId) : null

  const moduleQty = Number(
    sizing.module_qty !== undefined && sizing.module_qty !== null
      ? sizing.module_qty
      : sizing.modules_count || 0,
  )

  let resolvedPowerW = Number(sizing.module_power || sizing.power_w || 0)
  if (!resolvedPowerW && matchedMod) {
    resolvedPowerW = Number(matchedMod.power || 0)
  }

  let resolvedModuleName = sizing.module_model || sizing.moduleName || ''
  if (matchedMod) {
    const brand = (matchedMod.brand || '').trim()
    const name = (matchedMod.name || '').trim()
    resolvedModuleName = brand && name ? `${brand} - ${name}` : brand || name || 'Módulo Solar'
  } else if (!resolvedModuleName) {
    resolvedModuleName = 'Módulo Solar'
  }

  // Potência CC
  let powerDcKwp = 0
  if (moduleQty > 0 && resolvedPowerW > 0) {
    powerDcKwp = (moduleQty * resolvedPowerW) / 1000
  } else if (sizing.kit_power_kwp) {
    powerDcKwp = Number(sizing.kit_power_kwp) || 0
  } else if (sizing.system_power_kwp) {
    powerDcKwp = Number(sizing.system_power_kwp) || 0
  } else if (sizing.totalPower) {
    powerDcKwp = Number(sizing.totalPower) || 0
  }
  const displayKwp = powerDcKwp > 0 ? `${powerDcKwp.toFixed(2)} kWp` : 'Não calculada'

  // Inversores
  const rawInverters: any[] =
    Array.isArray(sizing.inverters) && sizing.inverters.length > 0
      ? sizing.inverters
      : sizing.selected_inverter_id
        ? [{ id: sizing.selected_inverter_id, qty: 1 }]
        : []

  const resolvedInverterSummaries: string[] = []
  let totalInvertersQty = 0

  for (const item of rawInverters) {
    if (!item) continue
    const qty = Number(item.qty || item.quantity || 1)
    if (qty <= 0) continue
    totalInvertersQty += qty

    const invRec = item.id ? invertersList.find((inv) => inv.id === item.id) : null
    let invPower = Number(item.power || 0)
    let invName = item.name || ''

    if (invRec) {
      const brand = (invRec.brand || '').trim()
      const name = (invRec.name || '').trim()
      invName = brand && name ? `${brand} ${name}` : brand || name || 'Inversor'
      if (!invPower) {
        invPower = Number(invRec.power || 0)
      }
    }

    if (!invName) {
      invName = 'Inversor Solar'
    }

    const powerStr = invPower > 0 ? ` (${invPower}kW)` : ''
    resolvedInverterSummaries.push(`${qty}x ${invName}${powerStr}`)
  }

  // Valor da negociação
  let dealValue = 0
  if (proposals && proposals.length > 0) {
    const accepted = proposals.find((p) => {
      const st = (p.status || '').toLowerCase()
      return st === 'accepted' || st === 'aprovada' || st === 'ganho'
    })
    const chosen = accepted || proposals[0]
    dealValue = Number(chosen.total_value || chosen.price || 0)
  }
  if (!dealValue && sizing.total_price) {
    dealValue = Number(sizing.total_price) || 0
  }
  if (!dealValue && sizing.kit_price) {
    dealValue = Number(sizing.kit_price) || 0
  }

  const formattedValue =
    dealValue > 0
      ? dealValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'Não definido'

  // UCs Beneficiárias
  let beneficiariesCount = 0
  try {
    const raw = neg.uc_beneficiaries
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Array.isArray(list)) {
      beneficiariesCount = list.filter((b) => b && b.name).length
    }
  } catch {
    /* intentionally ignored */
  }

  const handleSend = async () => {
    setLoading(true)
    try {
      const res = await sendNegotiationToFlow(neg.id)
      toast({
        title: 'Enviado ao Elektra Flow',
        description: res.message || 'Projeto e cliente sincronizados com sucesso no Flow.',
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha ao sincronizar com o Flow',
        description:
          err.message || 'Ocorreu um erro ao enviar os dados. Você pode tentar novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <SendHorizontal className="h-5 w-5 text-primary" /> Enviar ao Flow
          </DialogTitle>
          <VisuallyHidden>
            <DialogDescription>
              Confirmação de envio do projeto e do cliente ao Elektra Flow para início da gestão de
              obras.
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <p className="text-muted-foreground text-xs">
            Confira o resumo das informações que serão sincronizadas no Elektra Flow para abertura
            da obra:
          </p>

          <div className="bg-muted/40 rounded-lg p-3 space-y-2 border">
            {/* Cliente */}
            <div className="flex items-start gap-2.5">
              <User className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{clientName}</p>
                <p className="text-xs text-muted-foreground">
                  {clientDoc} • {clientLocation}
                </p>
              </div>
            </div>

            {/* Projeto e Potência */}
            <div className="flex items-start gap-2.5 pt-1 border-t border-border/40">
              <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground truncate">{neg.title}</p>
                  <Badge variant="outline" className="font-mono text-xs shrink-0">
                    {displayKwp}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  UC: {neg.uc || 'Não informada'} • Concessionária:{' '}
                  {neg.concessionaire || 'Não informada'}
                </p>
              </div>
            </div>

            {/* Equipamentos */}
            <div className="flex items-start gap-2.5 pt-1 border-t border-border/40">
              <Box className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 text-xs text-muted-foreground">
                <p>
                  <strong className="text-foreground font-medium">Módulos:</strong>{' '}
                  {moduleQty > 0
                    ? `${moduleQty}x ${resolvedModuleName}${resolvedPowerW > 0 ? ` (${resolvedPowerW}W)` : ''}`
                    : 'Não configurados'}
                </p>
                <p className="mt-0.5">
                  <strong className="text-foreground font-medium">Inversores:</strong>{' '}
                  {resolvedInverterSummaries.length > 0
                    ? resolvedInverterSummaries.join(', ')
                    : totalInvertersQty > 0
                      ? `${totalInvertersQty} inversor(es)`
                      : 'Não configurados'}
                </p>
                {beneficiariesCount > 0 && (
                  <p className="mt-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    {beneficiariesCount} unidade(s) beneficiária(s) vinculada(s)
                  </p>
                )}
              </div>
            </div>

            {/* Valor */}
            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Coins className="h-4 w-4 text-emerald-600" />
                <span>Valor Total:</span>
              </div>
              <span className="font-semibold text-foreground text-sm">{formattedValue}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 p-2 rounded border border-primary/20">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span>
              O Flow atualiza o registro automaticamente caso já tenha sido enviado antes.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={loading} className="gap-1.5">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <SendHorizontal className="h-4 w-4" />
                Confirmar Envio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
