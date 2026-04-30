import pb from '@/lib/pocketbase/client'

export async function getHspCities(state?: string) {
  const filter = state ? `state='${state}'` : ''
  return await pb.collection('pv_hsp_data').getFullList({ filter, sort: 'city' })
}

export async function getHspData(cityId: string) {
  return await pb.collection('pv_hsp_data').getOne(cityId)
}

export async function getOrFetchHsp(city: string, state: string) {
  try {
    const record = await pb
      .collection('pv_hsp_data')
      .getFirstListItem(`state='${state}' && city~'${city}'`)
    return record.annual_avg
  } catch (error) {
    return null
  }
}
