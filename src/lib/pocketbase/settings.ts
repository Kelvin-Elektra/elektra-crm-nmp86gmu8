import pb from '@/lib/pocketbase/client'

let cachedSettings: any = null

export const getSystemSettings = async () => {
  if (cachedSettings) return cachedSettings
  try {
    cachedSettings = await pb.collection('system_settings').getFirstListItem('')
  } catch (e) {
    cachedSettings = null
  }
  return cachedSettings
}

export const getCachedSystemSettings = () => cachedSettings
