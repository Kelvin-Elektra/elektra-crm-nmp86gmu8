import pb from '@/lib/pocketbase/client'

export const getPipelineStages = async () => {
  return await pb.collection('pipeline_stages').getFullList({ sort: 'order' })
}

export const getTags = async () => {
  return await pb.collection('tags').getFullList()
}

export const createTag = async (data: any) => {
  return await pb.collection('tags').create(data)
}

export const deleteTag = async (id: string) => {
  return await pb.collection('tags').delete(id)
}

export const getLeads = async () => {
  return await pb.collection('leads').getFullList({ sort: '-created' })
}

export const deleteLead = async (id: string) => {
  return await pb.collection('leads').delete(id)
}

export const getProposals = async () => {
  return await pb.collection('proposals').getFullList({ sort: '-created' })
}

export const updateNegotiation = async (id: string, data: any) => {
  const formData = new FormData()
  for (const key in data) {
    if (data[key] !== undefined && data[key] !== null) {
      if (
        typeof data[key] === 'object' &&
        !(data[key] instanceof File) &&
        !(data[key] instanceof Blob)
      ) {
        formData.append(key, JSON.stringify(data[key]))
      } else {
        formData.append(key, String(data[key]))
      }
    }
  }
  return await pb.collection('negotiations').update(id, formData)
}

export const getNegotiation = async (id: string) => {
  return await pb.collection('negotiations').getOne(id, { expand: 'lead_id,owner_id,company_id' })
}

export const getProposalsByNeg = async (id: string) => {
  return await pb.collection('proposals').getFullList({ filter: `negotiation_id = '${id}'` })
}

export const deleteNegotiation = async (id: string) => {
  return await pb.collection('negotiations').delete(id)
}
