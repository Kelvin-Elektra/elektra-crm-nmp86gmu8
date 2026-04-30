import pb from '@/lib/pocketbase/client'

export async function getHspCities(state?: string) {
  const filter = state ? `state='${state}'` : ''
  return await pb.collection('pv_hsp_data').getFullList({ filter, sort: 'city' })
}

export async function getHspData(cityId: string) {
  return await pb.collection('pv_hsp_data').getOne(cityId)
}
