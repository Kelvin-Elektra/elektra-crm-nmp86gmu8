export const Collections = {
  USERS: 'users',
  COMPANIES: 'companies',
  LEADS: 'leads',
  NEGOTIATIONS: 'negotiations',
  PROPOSALS: 'proposals',
  PIPELINE_STAGES: 'pipeline_stages',
  TAGS: 'tags',
} as const

export type CollectionName = (typeof Collections)[keyof typeof Collections]

export function isValidCollection(name: string): name is CollectionName {
  return Object.values(Collections).includes(name as CollectionName)
}
