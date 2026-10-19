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
import {
  SendHorizontal,
  User,
  Zap,
  Box,
  Coins,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

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
  const [selectedProposalId, setSelectedProposalId] = useState<string>('')
  const [continueWithoutSold, setContinueWithoutSold] = useState(false)
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
          }
          if (!cancelled) {
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

  // Proposta vendida
  const soldProposal = useMemo(() => {
    if (!neg || !proposals || proposals.length === 0) return null
    return (
      proposals.find((p) => {
        const st = (p.status || '').toLowerCase()
        return (
          st === 'accepted' ||
          st === 'aprovada' ||
          st === 'ganho' ||
          st === 'vendida' ||
          st === 'vendido'
        )
      }) || null
    )
  }, [neg, proposals])

  // Resetar seleção ao abrir
  useEffect(() => {
    if (open) {
      if (soldProposal) {
        setSelectedProposalId(soldProposal.id)
        setContinueWithoutSold(false)
      } else {
        setSelectedProposalId(proposals[0]?.id || '')
        setContinueWithoutSold(false)
      }
    }
  }, [open, soldProposal, proposals])

  // Valor a ser enviado:
  // Se houver proposta vendida, usa o valor da proposta vendida.
  // Se o usuário estiver escolhendo manualmente após o aviso, usa a proposta selecionada.
  const effectiveProposal = useMemo(() => {
    if (soldProposal) return soldProposal
    if (selectedProposalId) {
      return proposals.find((p) => p.id === selectedProposalId) || null
    }
    return null
  }, [soldProposal, selectedProposalId, proposals])

  const effectiveDealValue = useMemo(() => {
    if (effectiveProposal) {
      return Number(effectiveProposal.total_value || effectiveProposal.price || 0)
    }
    return 0
  }, [effectiveProposal])

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
    effectiveDealValue > 0
      ? effectiveDealValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'Não definido (R$ 0,00)'

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
    // Se não há proposta vendida e o usuário ainda não confirmou o prosseguimento manual
    if (!soldProposal && !continueWithoutSold) {
      setContinueWithoutSold(true)
      return
    }

    setLoading(true)
    try {
      const res = await sendNegotiationToFlow(neg.id, {
        proposalId: effectiveProposal?.id,
      })
      try {
        if (neg?.id) {
          localStorage.setItem(`flow_sent_${neg.id}`, 'true')
        }
      } catch {
        /* ignore */
      }
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
                <Coins className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Valor da Venda (Flow):</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-foreground text-sm">{formattedValue}</span>
                {effectiveProposal && (
                  <p className="text-[11px] text-muted-foreground">
                    Origem:{' '}
                    {effectiveProposal.proposal_code ||
                      effectiveProposal.description ||
                      `Proposta #${effectiveProposal.id.slice(0, 5)}`}
                    {soldProposal?.id === effectiveProposal.id && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {' '}
                        (Vendida)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Aviso se não houver proposta vendida */}
          {!soldProposal && (
            <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Nenhuma proposta marcada como vendida</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    O Elektra Flow espera o valor da proposta vendida. Para garantir que o Flow
                    receba o valor correto, você pode marcar uma proposta como vendida na negociação
                    ou escolher abaixo qual proposta enviar.
                  </p>
                </div>
              </div>

              {continueWithoutSold && proposals.length > 0 && (
                <div className="pt-2 border-t border-amber-200 dark:border-amber-900/50 space-y-2">
                  <p className="font-medium text-foreground">
                    Selecione qual proposta enviar ao Flow:
                  </p>
                  <RadioGroup
                    value={selectedProposalId}
                    onValueChange={setSelectedProposalId}
                    className="space-y-1.5"
                  >
                    {proposals.map((prop) => {
                      const propVal = Number(prop.total_value || prop.price || 0).toLocaleString(
                        'pt-BR',
                        { style: 'currency', currency: 'BRL' },
                      )
                      return (
                        <div
                          key={prop.id}
                          className="flex items-center space-x-2 bg-background/80 p-2 rounded border cursor-pointer hover:bg-background"
                          onClick={() => setSelectedProposalId(prop.id)}
                        >
                          <RadioGroupItem value={prop.id} id={`flow-prop-${prop.id}`} />
                          <Label
                            htmlFor={`flow-prop-${prop.id}`}
                            className="flex-1 cursor-pointer flex items-center justify-between text-xs"
                          >
                            <span className="font-medium text-foreground flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-primary" />
                              {prop.proposal_code ||
                                prop.description ||
                                `Proposta #${prop.id.slice(0, 5)}`}
                            </span>
                            <span className="font-bold text-primary">{propVal}</span>
                          </Label>
                        </div>
                      )
                    })}
                  </RadioGroup>
                </div>
              )}

              {continueWithoutSold && proposals.length === 0 && (
                <p className="text-xs text-destructive font-medium pt-1">
                  Esta negociação não possui nenhuma proposta cadastrada. Crie uma proposta
                  comercial para enviar o valor correto ao Flow.
                </p>
              )}
            </div>
          )}

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
          {!soldProposal && !continueWithoutSold ? (
            <Button
              type="button"
              variant="default"
              onClick={() => setContinueWithoutSold(true)}
              className="gap-1.5"
            >
              Continuar Mesmo Assim
            </Button>
          ) : (
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
