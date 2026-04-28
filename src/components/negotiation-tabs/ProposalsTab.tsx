import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Calendar, Eye } from 'lucide-react'
import { format } from 'date-fns'

import { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { ProposalViewer } from '@/components/ProposalViewer'

export function ProposalsTab({
  proposals,
  neg,
  reload,
}: {
  proposals: any[]
  neg: any
  reload: () => void
}) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState<any>(null)

  const handleGenerate = async () => {
    try {
      // 1. Fetch current settings, module, and inverter for snapshot
      const settings = await pb
        .collection('proposal_settings')
        .getFirstListItem(`company_id='${neg.company_id}'`)
        .catch(() => null)

      let moduleData = null
      if (neg.sizing?.selected_module_id) {
        moduleData = await pb
          .collection('pv_modules')
          .getOne(neg.sizing.selected_module_id)
          .catch(() => null)
      }

      let inverterData = null
      if (neg.sizing?.selected_inverter_id) {
        inverterData = await pb
          .collection('pv_inverters')
          .getOne(neg.sizing.selected_inverter_id)
          .catch(() => null)
      }

      // Create snapshot object
      const tariffRules = await pb
        .collection('pv_tariff_rules')
        .getFullList({
          filter: `company_id='${neg.company_id}'`,
          expand: 'distributor_id',
        })
        .catch(() => [])

      const snapshot = {
        sizing: neg.sizing || {},
        module: moduleData || {},
        inverter: inverterData || {},
        tariffs: settings?.tariffs || {},
        tariff_rules: tariffRules,
        indicators: settings?.indicators || {},
        pricing: settings?.pricing || {},
        generatedAt: new Date().toISOString(),
      }

      const totalPower = neg.sizing?.kit_power_kwp || neg.sizing?.totalPower || 0

      // Calculate base cost and a default margin (fallback)
      const baseCost =
        (moduleData?.price || 0) * (neg.sizing?.module_qty || 0) + (inverterData?.price || 0)
      const price = baseCost > 0 ? baseCost * 1.4 : totalPower * 3500

      const rec = await pb.collection('proposals').create({
        company_id: neg.company_id,
        negotiation_id: neg.id,
        description: `Proposta Sistema ${totalPower.toFixed(2)} kWp`,
        price: price,
        status: 'draft',
        kit_details: JSON.stringify(snapshot), // The Snapshot persistence
      })

      reload()
      setSelectedProposal(rec)
      setViewerOpen(true)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Propostas Fotovoltaicas</CardTitle>
            <CardDescription>Histórico de propostas comerciais enviadas.</CardDescription>
          </div>
          <Button size="sm" onClick={handleGenerate}>
            <FileText className="h-4 w-4 mr-2" /> Gerar Proposta
          </Button>
        </CardHeader>
        <CardContent>
          {proposals.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground border rounded-lg bg-muted/20">
              Nenhuma proposta gerada para esta negociação.
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{p.description || 'Proposta Padrão'}</p>
                      <p className="text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {format(new Date(p.created), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 md:text-right">
                    <div>
                      <p className="font-bold text-primary">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(p.price || 0)}
                      </p>
                      <Badge
                        variant={
                          p.status === 'accepted'
                            ? 'default'
                            : p.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {p.status || 'Rascunho'}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Pré-visualizar"
                      onClick={() => {
                        setSelectedProposal(p)
                        setViewerOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {selectedProposal && (
        <ProposalViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          proposal={selectedProposal}
          negotiation={neg}
        />
      )}
    </>
  )
}
