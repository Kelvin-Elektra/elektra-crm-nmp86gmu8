import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  parseSnapshot,
  getBranding,
  getTemplate,
  getPagesLayout,
  type ProposalPageData,
} from '@/components/proposal/proposal-utils'

export function useProposalData(proposal: any, negotiation: any, open: boolean) {
  const [company, setCompany] = useState<any>(null)
  const [moduleRec, setModuleRec] = useState<any>(null)
  const [inverterRecs, setInverterRecs] = useState<any[]>([])
  const [hspData, setHspData] = useState<any>(null)
  const [installationName, setInstallationName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [snapshotReady, setSnapshotReady] = useState(false)

  const snapshot = parseSnapshot(proposal)
  const branding = getBranding(snapshot)
  const template = getTemplate(snapshot)
  const pagesLayout = getPagesLayout(snapshot)
  const sizing = snapshot?.sizing || negotiation?.sizing || {}
  const lead = negotiation?.expand?.lead_id || {}
  const financialProjection = snapshot?.financialProjection || null
  const tariffDetails = financialProjection?.tariffDetails || null

  useEffect(() => {
    if (!open || !negotiation) {
      setLoading(false)
      setSnapshotReady(false)
      return
    }
    let cancelled = false
    const loadData = async () => {
      setLoading(true)
      setSnapshotReady(false)
      setHspData(null)
      setInstallationName(null)
      try {
        const hasSnapshot =
          proposal?.snapshot_data &&
          typeof proposal.snapshot_data === 'object' &&
          Object.keys(proposal.snapshot_data).length > 0

        if (negotiation.company_id) {
          const comp = await pb
            .collection('companies')
            .getOne(negotiation.company_id)
            .catch(() => null)
          if (!cancelled) setCompany(comp)
        }

        if (negotiation.city_id) {
          const hsp = await pb
            .collection('pv_hsp_data')
            .getOne(negotiation.city_id)
            .catch(() => null)
          if (!cancelled) setHspData(hsp)
        } else if (negotiation.city && negotiation.state) {
          const hsp = await pb
            .collection('pv_hsp_data')
            .getFirstListItem(`state='${negotiation.state}' && city~'${negotiation.city}'`)
            .catch(() => null)
          if (!cancelled) setHspData(hsp)
        }

        const instId = sizing?.installation_id || sizing?.installation_type
        if (instId) {
          const inst = await pb
            .collection('pv_installations')
            .getOne(instId)
            .catch(() => null)
          if (!cancelled) setInstallationName(inst?.name || instId || null)
        }

        if (snapshot?.rawModule) {
          if (!cancelled) setModuleRec(snapshot.rawModule)
        } else if (sizing.selected_module_id) {
          const mod = await pb
            .collection('pv_modules')
            .getOne(sizing.selected_module_id)
            .catch(() => null)
          if (!cancelled) setModuleRec(mod)
        }
        if (snapshot?.rawInverters?.length > 0) {
          if (!cancelled) setInverterRecs(snapshot.rawInverters)
        } else if (sizing.inverters?.length > 0) {
          const invs = await Promise.all(
            sizing.inverters.map(async (i: any) => {
              const rec = await pb
                .collection('pv_inverters')
                .getOne(i.id)
                .catch(() => null)
              return rec ? { ...rec, qty: i.qty } : null
            }),
          )
          if (!cancelled) setInverterRecs(invs.filter(Boolean))
        }
        if (!cancelled) setSnapshotReady(hasSnapshot)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => {
      cancelled = true
    }
  }, [open, negotiation?.id, proposal?.id])

  const data: ProposalPageData = {
    company,
    branding,
    template,
    sizing,
    lead,
    negotiation,
    proposal,
    moduleRec,
    inverterRecs,
    financialProjection,
    tariffDetails,
    hspData,
    installationName,
  }

  return { data, pagesLayout, loading, snapshotReady }
}
