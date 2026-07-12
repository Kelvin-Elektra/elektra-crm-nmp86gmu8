import pb from '@/lib/pocketbase/client'

export function getProposalHistory(proposalId: string) {
  return pb.collection('proposal_history').getFullList({
    filter: `proposal_id='${proposalId}'`,
    sort: '-created',
    expand: 'changed_by',
  })
}

export function createProposalHistory(proposalId: string, snapshotData: any) {
  return pb.collection('proposal_history').create({
    proposal_id: proposalId,
    snapshot_data: snapshotData,
    changed_by: pb.authStore.record?.id,
  })
}
