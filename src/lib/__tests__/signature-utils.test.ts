import { describe, it, expect } from 'vitest'
import {
  buildDefaultSigners,
  mapAssinafyStatusToCrm,
  SIGNATURE_POLICY_LABELS,
  checkboxesToPolicy,
  policyToCheckboxes,
  formatSignerSummary,
} from '../signature-utils'

describe('Signature Utils', () => {
  describe('buildDefaultSigners', () => {
    const lead = {
      name: 'João Silva',
      email: 'joao.silva@exemplo.com',
      phone: '11999999999',
    }

    const representative = {
      name: 'Carlos Consultor',
      email: 'carlos@empresa.com',
      phone: '11988888888',
    }

    const owner = {
      name: 'Roberto Dono',
      email: 'roberto@empresa.com',
      phone: '11977777777',
    }

    it('client_only: deve retornar apenas o cliente', () => {
      const signers = buildDefaultSigners({
        policy: 'client_only',
        lead,
        representative,
        owner,
      })

      expect(signers).toHaveLength(1)
      expect(signers[0]).toEqual({
        name: 'João Silva',
        email: 'joao.silva@exemplo.com',
        phone: '11999999999',
        role: 'client',
      })
    })

    it('client_rep: deve incluir representante e cliente', () => {
      const signers = buildDefaultSigners({
        policy: 'client_rep',
        lead,
        representative,
        owner,
      })

      expect(signers).toHaveLength(2)
      expect(signers[0].role).toBe('representative')
      expect(signers[0].name).toBe('Carlos Consultor')
      expect(signers[1].role).toBe('client')
      expect(signers[1].name).toBe('João Silva')
    })

    it('client_rep_owner: deve incluir representante, cliente e dono da empresa', () => {
      const signers = buildDefaultSigners({
        policy: 'client_rep_owner',
        lead,
        representative,
        owner,
      })

      expect(signers).toHaveLength(3)
      expect(signers[0].role).toBe('representative')
      expect(signers[1].role).toBe('client')
      expect(signers[2].role).toBe('owner')
      expect(signers[2].name).toBe('Roberto Dono')
    })

    it('client_owner: deve incluir cliente e dono da empresa', () => {
      const signers = buildDefaultSigners({
        policy: 'client_owner',
        lead,
        representative,
        owner,
      })

      expect(signers).toHaveLength(2)
      expect(signers[0].role).toBe('client')
      expect(signers[1].role).toBe('owner')
      expect(signers[1].email).toBe('roberto@empresa.com')
    })

    it('rep_only: deve incluir apenas representante', () => {
      const signers = buildDefaultSigners({
        policy: 'rep_only',
        lead,
        representative,
        owner,
      })

      expect(signers).toHaveLength(1)
      expect(signers[0].role).toBe('representative')
      expect(signers[0].name).toBe('Carlos Consultor')
    })

    it('owner_only: deve incluir apenas dono da empresa', () => {
      const signers = buildDefaultSigners({
        policy: 'owner_only',
        lead,
        representative,
        owner,
      })

      expect(signers).toHaveLength(1)
      expect(signers[0].role).toBe('owner')
      expect(signers[0].name).toBe('Roberto Dono')
    })

    it('rep_owner: deve incluir representante e dono da empresa', () => {
      const signers = buildDefaultSigners({
        policy: 'rep_owner',
        lead,
        representative,
        owner,
      })

      expect(signers).toHaveLength(2)
      expect(signers[0].role).toBe('representative')
      expect(signers[1].role).toBe('owner')
    })

    it('fallback para policy não informada deve ser client_only', () => {
      const signers = buildDefaultSigners({ lead })
      expect(signers).toHaveLength(1)
      expect(signers[0].role).toBe('client')
    })
  })

  describe('checkboxesToPolicy & policyToCheckboxes (8 combinações)', () => {
    it('combinação 1: nenhum marcado = inherit', () => {
      const state = { client: false, representative: false, owner: false }
      expect(checkboxesToPolicy(state)).toBe('inherit')
      expect(policyToCheckboxes('inherit')).toEqual(state)
      expect(policyToCheckboxes('')).toEqual(state)
      expect(policyToCheckboxes(null)).toEqual(state)
      expect(formatSignerSummary(state)).toBe('Herdar da empresa')
    })

    it('combinação 2: apenas cliente = client_only', () => {
      const state = { client: true, representative: false, owner: false }
      expect(checkboxesToPolicy(state)).toBe('client_only')
      expect(policyToCheckboxes('client_only')).toEqual(state)
      expect(formatSignerSummary(state)).toBe('Cliente')
    })

    it('combinação 3: apenas representante = rep_only', () => {
      const state = { client: false, representative: true, owner: false }
      expect(checkboxesToPolicy(state)).toBe('rep_only')
      expect(policyToCheckboxes('rep_only')).toEqual(state)
      expect(formatSignerSummary(state)).toBe('Representante')
    })

    it('combinação 4: apenas dono = owner_only', () => {
      const state = { client: false, representative: false, owner: true }
      expect(checkboxesToPolicy(state)).toBe('owner_only')
      expect(policyToCheckboxes('owner_only')).toEqual(state)
      expect(formatSignerSummary(state)).toBe('Dono da Empresa')
    })

    it('combinação 5: cliente + representante = client_rep', () => {
      const state = { client: true, representative: true, owner: false }
      expect(checkboxesToPolicy(state)).toBe('client_rep')
      expect(policyToCheckboxes('client_rep')).toEqual(state)
      expect(formatSignerSummary(state)).toBe('Cliente + Representante')
    })

    it('combinação 6: cliente + dono = client_owner', () => {
      const state = { client: true, representative: false, owner: true }
      expect(checkboxesToPolicy(state)).toBe('client_owner')
      expect(policyToCheckboxes('client_owner')).toEqual(state)
      expect(formatSignerSummary(state)).toBe('Cliente + Dono da Empresa')
    })

    it('combinação 7: representante + dono = rep_owner', () => {
      const state = { client: false, representative: true, owner: true }
      expect(checkboxesToPolicy(state)).toBe('rep_owner')
      expect(policyToCheckboxes('rep_owner')).toEqual(state)
      expect(formatSignerSummary(state)).toBe('Representante + Dono da Empresa')
    })

    it('combinação 8: cliente + representante + dono = client_rep_owner', () => {
      const state = { client: true, representative: true, owner: true }
      expect(checkboxesToPolicy(state)).toBe('client_rep_owner')
      expect(policyToCheckboxes('client_rep_owner')).toEqual(state)
      expect(formatSignerSummary(state)).toBe('Cliente + Representante + Dono da Empresa')
    })
  })

  describe('mapAssinafyStatusToCrm', () => {
    it('mapeia eventos de assinatura concluída', () => {
      expect(mapAssinafyStatusToCrm('signer_signed_document', true)).toBe('assinado')
      expect(mapAssinafyStatusToCrm('signer_signed_document', false)).toBe('aguardando')
      expect(mapAssinafyStatusToCrm('certificated')).toBe('assinado')
    })

    it('mapeia eventos de recusa', () => {
      expect(mapAssinafyStatusToCrm('signer_rejected_document')).toBe('recusado')
      expect(mapAssinafyStatusToCrm('user_rejected_document')).toBe('recusado')
      expect(mapAssinafyStatusToCrm('rejected_by_signer')).toBe('recusado')
    })

    it('mapeia eventos de cancelamento ou falha', () => {
      expect(mapAssinafyStatusToCrm('document_processing_failed')).toBe('cancelado')
      expect(mapAssinafyStatusToCrm('expired')).toBe('cancelado')
    })

    it('mapeia upload e aguardo', () => {
      expect(mapAssinafyStatusToCrm('uploaded')).toBe('enviado')
      expect(mapAssinafyStatusToCrm('pending_signature')).toBe('aguardando')
      expect(mapAssinafyStatusToCrm('document_ready')).toBe('aguardando')
    })
  })

  describe('SIGNATURE_POLICY_LABELS', () => {
    it('possui rótulos legíveis para todas as opções de política', () => {
      expect(SIGNATURE_POLICY_LABELS.client_only).toBe('Apenas o Cliente')
      expect(SIGNATURE_POLICY_LABELS.client_rep).toBe('Cliente + Representante Comercial')
      expect(SIGNATURE_POLICY_LABELS.client_rep_owner).toBe(
        'Cliente + Representante + Dono da Empresa',
      )
      expect(SIGNATURE_POLICY_LABELS.client_owner).toBe('Cliente + Dono da Empresa')
      expect(SIGNATURE_POLICY_LABELS.rep_only).toBe('Apenas o Representante')
      expect(SIGNATURE_POLICY_LABELS.owner_only).toBe('Apenas o Dono da Empresa')
      expect(SIGNATURE_POLICY_LABELS.rep_owner).toBe('Representante + Dono da Empresa')
      expect(SIGNATURE_POLICY_LABELS.inherit).toBe('Herdar da empresa')
    })
  })
})
