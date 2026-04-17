import pb from '@/lib/pocketbase/client'
import { Collections } from '@/lib/pocketbase/collections'

export const getUsers = () => pb.collection(Collections.USERS).getFullList({ sort: '-created' })
export const createUser = (data: any) => pb.collection(Collections.USERS).create(data)
export const updateUser = (id: string, data: any) =>
  pb.collection(Collections.USERS).update(id, data)
export const getCompany = (id: string) => pb.collection(Collections.COMPANIES).getOne(id)

export const getLeads = () => pb.collection(Collections.LEADS).getFullList({ sort: '-created' })
export const createLead = (data: any) => pb.collection(Collections.LEADS).create(data)
export const updateLead = (id: string, data: any) =>
  pb.collection(Collections.LEADS).update(id, data)
export const deleteLead = (id: string) => pb.collection(Collections.LEADS).delete(id)

export const getTags = () => pb.collection(Collections.TAGS).getFullList({ sort: '-created' })
export const createTag = (data: any) => pb.collection(Collections.TAGS).create(data)
export const updateTag = (id: string, data: any) => pb.collection(Collections.TAGS).update(id, data)
export const deleteTag = (id: string) => pb.collection(Collections.TAGS).delete(id)

export const getPipelineStages = () =>
  pb.collection(Collections.PIPELINE_STAGES).getFullList({ sort: 'order' })
export const createPipelineStage = (data: any) =>
  pb.collection(Collections.PIPELINE_STAGES).create(data)
export const updatePipelineStage = (id: string, data: any) =>
  pb.collection(Collections.PIPELINE_STAGES).update(id, data)
export const deletePipelineStage = (id: string) =>
  pb.collection(Collections.PIPELINE_STAGES).delete(id)

export const getNegotiations = () =>
  pb
    .collection(Collections.NEGOTIATIONS)
    .getFullList({ expand: 'lead_id,owner_id', sort: '-created' })

export const getNegotiation = (id: string) =>
  pb.collection(Collections.NEGOTIATIONS).getOne(id, { expand: 'lead_id,owner_id' })

export const updateNegotiation = (id: string, data: any) =>
  pb.collection(Collections.NEGOTIATIONS).update(id, data)

export const createNegotiation = (data: any) => pb.collection(Collections.NEGOTIATIONS).create(data)

export const deleteNegotiation = (id: string) => pb.collection(Collections.NEGOTIATIONS).delete(id)

export const getProposalsByNeg = (id: string) =>
  pb
    .collection(Collections.PROPOSALS)
    .getFullList({ filter: `negotiation_id = '${id}'`, sort: '-created' })

export const getProposals = () =>
  pb.collection(Collections.PROPOSALS).getFullList({ expand: 'negotiation_id', sort: '-created' })

export const createProposal = (data: any) => pb.collection(Collections.PROPOSALS).create(data)

export const updateProposal = (id: string, data: any) =>
  pb.collection(Collections.PROPOSALS).update(id, data)
