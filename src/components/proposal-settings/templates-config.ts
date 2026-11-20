import { useEffect, useState } from 'react'
import {
  getTemplates,
  type GeneratorTemplate,
  type TemplateSchemaField,
} from '@/services/templates'

// Cache em nível de módulo: a lista (com variable_schema) é a mesma para todos os
// usuários — evita refazer a chamada à API do Gerador a cada visita à aba.
let cachedTemplates: GeneratorTemplate[] | null = null

/** Lista de templates do Gerador com seus variable_schema (mesma chamada usada pelo hook de preview). */
export async function fetchTemplatesWithSchema(): Promise<GeneratorTemplate[]> {
  if (cachedTemplates) return cachedTemplates
  const templates = await getTemplates()
  cachedTemplates = templates
  return templates
}

/** Campos fixos (textos/inputs simples) de um template a partir do variable_schema. */
export function getFixedFields(tpl: GeneratorTemplate | undefined): TemplateSchemaField[] {
  if (!tpl) return []
  const fixed = tpl.variable_schema?.fixed
  return Array.isArray(fixed) ? fixed : []
}

/** Merge profundo — não perde chaves de sub-objetos não citadas no patch. */
export function deepMerge(
  base: Record<string, any>,
  patch: Record<string, any> | undefined,
): Record<string, any> {
  const out: Record<string, any> = { ...(base || {}) }
  if (!patch || typeof patch !== 'object') return out
  for (const key of Object.keys(patch)) {
    const pv = patch[key]
    const bv = out[key]
    if (
      pv &&
      typeof pv === 'object' &&
      !Array.isArray(pv) &&
      bv &&
      typeof bv === 'object' &&
      !Array.isArray(bv)
    ) {
      out[key] = deepMerge(bv, pv)
    } else {
      out[key] = pv
    }
  }
  return out
}
