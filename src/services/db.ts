import pb from '@/lib/pocketbase/client'

export const getPipelineStages = async () => {
  return await pb.collection('pipeline_stages').getFullList({ sort: 'order' })
}

export const createPipelineStage = async (data: any) => {
  return await pb.collection('pipeline_stages').create(data)
}

export const updatePipelineStage = async (id: string, data: any) => {
  return await pb.collection('pipeline_stages').update(id, data)
}

export const deletePipelineStage = async (id: string) => {
  return await pb.collection('pipeline_stages').delete(id)
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

export const createLead = async (data: any) => {
  return await pb.collection('leads').create(data)
}

export const updateLead = async (id: string, data: any) => {
  return await pb.collection('leads').update(id, data)
}

export const deleteLead = async (id: string) => {
  return await pb.collection('leads').delete(id)
}

export const getProposals = async () => {
  return await pb.collection('proposals').getFullList({ sort: '-created' })
}

export const createNegotiation = async (data: any) => {
  return await pb.collection('negotiations').create(data)
}

export const updateNegotiation = async (id: string, data: any) => {
  let hasFiles = false
  for (const key in data) {
    const val = data[key]
    if (val instanceof File || val instanceof Blob) hasFiles = true
    if (
      Array.isArray(val) &&
      val.length > 0 &&
      (val[0] instanceof File || val[0] instanceof Blob)
    ) {
      hasFiles = true
    }
  }

  // Optimize payload: Use JSON for simple metadata updates to avoid server-side FormData parsing issues
  if (!hasFiles) {
    return await pb.collection('negotiations').update(id, data)
  }

  const formData = new FormData()
  for (const key in data) {
    const val = data[key]
    if (val === undefined) continue

    if (val === null) {
      formData.append(key, '')
    } else if (val instanceof File || val instanceof Blob) {
      formData.append(key, val)
    } else if (Array.isArray(val)) {
      if (val.length > 0 && (val[0] instanceof File || val[0] instanceof Blob)) {
        for (const file of val) {
          formData.append(key, file)
        }
      } else {
        formData.append(key, JSON.stringify(val))
      }
    } else if (typeof val === 'object') {
      formData.append(key, JSON.stringify(val))
    } else {
      formData.append(key, String(val))
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
