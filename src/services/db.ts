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

export const getLeads = async (companyId?: string) => {
  const cid = companyId || pb.authStore.record?.company_id
  const filter = cid ? `company_id = '${cid}'` : ''
  return await pb.collection('leads').getFullList({ filter, sort: '-created' })
}

export const createLead = async (data: any) => {
  const payload = { ...data }
  if (!payload.company_id && pb.authStore.record?.company_id) {
    payload.company_id = pb.authStore.record.company_id
  }
  if (!payload.email) delete payload.email
  if (!payload.document) delete payload.document
  if (!payload.phone) delete payload.phone
  if (!payload.company_id) delete payload.company_id
  if (!payload.owner_id) delete payload.owner_id
  return await pb.collection('leads').create(payload)
}

export const updateLead = async (id: string, data: any) => {
  const payload = { ...data }
  if (!payload.email) payload.email = ''
  if (!payload.document) payload.document = ''
  if (!payload.phone) payload.phone = ''
  if (!payload.company_id) delete payload.company_id
  if (!payload.owner_id) delete payload.owner_id
  return await pb.collection('leads').update(id, payload)
}

export const deleteLead = async (id: string) => {
  return await pb.collection('leads').delete(id)
}

export const getCepCache = async (cep: string) => {
  try {
    return await pb.collection('cep_cache').getFirstListItem(`cep='${cep}'`)
  } catch {
    return null
  }
}

export const createCepCache = async (data: any) => {
  return await pb.collection('cep_cache').create(data)
}

export const getProposals = async (companyId?: string) => {
  const cid = companyId || pb.authStore.record?.company_id
  const filter = cid ? `company_id = '${cid}'` : ''
  return await pb.collection('proposals').getFullList({ filter, sort: '-created' })
}

export const getNegotiations = async (companyId?: string) => {
  const cid = companyId || pb.authStore.record?.company_id
  const filter = cid ? `company_id = '${cid}'` : ''
  return await pb.collection('negotiations').getFullList({ filter, sort: '-created' })
}

export const createNegotiation = async (data: any) => {
  const payload = { ...data }
  if (!payload.company_id && pb.authStore.record?.company_id) {
    payload.company_id = pb.authStore.record.company_id
  }
  return await pb.collection('negotiations').create(payload)
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

export const getProposalsByNeg = async (id: string, companyId?: string) => {
  const cid = companyId || pb.authStore.record?.company_id
  const filter = cid
    ? `negotiation_id = '${id}' && company_id = '${cid}'`
    : `negotiation_id = '${id}'`
  return await pb.collection('proposals').getFullList({ filter })
}

export const deleteNegotiation = async (id: string) => {
  return await pb.collection('negotiations').delete(id)
}
