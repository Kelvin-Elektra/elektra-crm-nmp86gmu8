export const Collections = {
  USERS: 'users',
  COMPANIES: 'companies',
  LEADS: 'leads',
  NEGOTIATIONS: 'negotiations',
  PROPOSALS: 'proposals',
  PIPELINE_STAGES: 'pipeline_stages',
  TAGS: 'tags',
  BUDGETS: 'budgets',
  PROPOSAL_SETTINGS: 'proposal_settings',
  PV_DISTRIBUTORS: 'pv_distributors',
  PV_UTILITIES: 'pv_utilities',
  PV_MODULES: 'pv_modules',
  PV_INVERTERS: 'pv_inverters',
  PV_INSTALLATIONS: 'pv_installations',
  PV_SUPPLIES: 'pv_supplies',
  PV_SUPPLY_RULES: 'pv_supply_rules',
  PV_COSTS: 'pv_costs',
  SYSTEM_SETTINGS: 'system_settings',
  PV_EFFICIENCY_RULES: 'pv_efficiency_rules',
  CEP_CACHE: 'cep_cache',
  PROPOSAL_HISTORY: 'proposal_history',
} as const

export type CollectionName = (typeof Collections)[keyof typeof Collections]

export function isValidCollection(name: string): name is CollectionName {
  return Object.values(Collections).includes(name as CollectionName)
}
