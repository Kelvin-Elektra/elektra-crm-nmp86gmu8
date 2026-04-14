import pb from '@/lib/pocketbase/client'

export const getUsers = () => pb.collection('users').getFullList({ sort: '-created' })
export const createUser = (data: any) => pb.collection('users').create(data)
export const updateUser = (id: string, data: any) => pb.collection('users').update(id, data)
export const getCompany = (id: string) => pb.collection('companies').getOne(id)

export const getLeads = () => pb.collection('leads').getFullList({ sort: '-created' })
export const createLead = (data: any) => pb.collection('leads').create(data)
export const updateLead = (id: string, data: any) => pb.collection('leads').update(id, data)
export const deleteLead = (id: string) => pb.collection('leads').delete(id)

export const getTags = () => pb.collection('tags').getFullList({ sort: '-created' })
export const createTag = (data: any) => pb.collection('tags').create(data)
export const updateTag = (id: string, data: any) => pb.collection('tags').update(id, data)
export const deleteTag = (id: string) => pb.collection('tags').delete(id)

export const getPipelineStages = () =>
  pb.collection('pipeline_stages').getFullList({ sort: 'order' })
export const createPipelineStage = (data: any) => pb.collection('pipeline_stages').create(data)
export const updatePipelineStage = (id: string, data: any) =>
  pb.collection('pipeline_stages').update(id, data)
export const deletePipelineStage = (id: string) => pb.collection('pipeline_stages').delete(id)

export const getNegotiations = () =>
  pb.collection('negotiations').getFullList({ expand: 'lead_id,owner_id', sort: '-created' })

export const getNegotiation = (id: string) =>
  pb.collection('negotiations').getOne(id, { expand: 'lead_id,owner_id' })

export const updateNegotiation = (id: string, data: any) =>
  pb.collection('negotiations').update(id, data)

export const createNegotiation = (data: any) => pb.collection('negotiations').create(data)

export const getProposalsByNeg = (id: string) =>
  pb.collection('proposals').getFullList({ filter: `negotiation_id = '${id}'`, sort: '-created' })

export const getProposals = () =>
  pb.collection('proposals').getFullList({ expand: 'negotiation_id', sort: '-created' })

export const createProposal = (data: any) => pb.collection('proposals').create(data)

export const updateProposal = (id: string, data: any) => pb.collection('proposals').update(id, data)
