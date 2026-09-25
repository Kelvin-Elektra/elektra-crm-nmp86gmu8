import { describe, it, expect } from 'vitest'
import {
  buildDefaultSigners,
  mapAssinafyStatusToCrm,
  SIGNATURE_POLICY_LABELS,
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

    it('fallback para policy não informada deve ser client_only', () => {
      const signers = buildDefaultSigners({ lead })
      expect(signers).toHaveLength(1)
      expect(signers[0].role).toBe('client')
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
      expect(SIGNATURE_POLICY_LABELS.client_rep).toBe('Representante + Cliente')
      expect(SIGNATURE_POLICY_LABELS.client_rep_owner).toBe(
        'Representante + Cliente + Dono da Empresa',
      )
      expect(SIGNATURE_POLICY_LABELS.client_owner).toBe('Cliente + Dono da Empresa')
    })
  })
})
