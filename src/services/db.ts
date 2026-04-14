import pb from '@/lib/pocketbase/client'

export const getLeads = () => pb.collection('leads').getFullList({ sort: '-created' })

export const getNegotiations = () =>
  pb.collection('negotiations').getFullList({ expand: 'lead_id', sort: '-created' })

export const updateNegotiation = (id: string, data: any) =>
  pb.collection('negotiations').update(id, data)

export const createNegotiation = (data: any) => pb.collection('negotiations').create(data)

export const getProposalsByNeg = (id: string) =>
  pb.collection('proposals').getFullList({ filter: `negotiation_id = '${id}'`, sort: '-created' })

export const getProposals = () =>
  pb.collection('proposals').getFullList({ expand: 'negotiation_id', sort: '-created' })

export const createProposal = (data: any) => pb.collection('proposals').create(data)

export const updateProposal = (id: string, data: any) => pb.collection('proposals').update(id, data)
