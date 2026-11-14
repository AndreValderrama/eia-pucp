import {
  collection,
  doc,
  getDocs,
  query,
  where,
  addDoc,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { EnvironmentalFactor, FactorProposal, Group } from '../types';
import { factorService, factorDocId, FactorChange } from './factor-service';
import { normalizeEmail } from './group-service';

const COLLECTION_NAME = 'factorProposals';

/** More than half of the group's members. */
export const approvalsNeeded = (group: Pick<Group, 'memberEmails'>) =>
  Math.floor(group.memberEmails.length / 2) + 1;

const toChange = (p: Pick<FactorProposal, 'type' | 'targetId' | 'parentId' | 'data'>): FactorChange => {
  if (p.type === 'add') return { type: 'add', parentId: p.parentId ?? null, data: p.data! };
  if (p.type === 'edit') return { type: 'edit', targetId: p.targetId!, data: p.data! };
  return { type: 'delete', targetId: p.targetId! };
};

export const factorProposalService = {
  async getProposals(groupId: string): Promise<FactorProposal[]> {
    const snap = await getDocs(query(collection(db, COLLECTION_NAME), where('groupId', '==', groupId)));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as FactorProposal))
      .sort((a, b) => ((b.createdAt as Timestamp)?.toMillis?.() ?? 0) - ((a.createdAt as Timestamp)?.toMillis?.() ?? 0));
  },

  /**
   * Proposes a change to the group's factor tree. The proposer's own approval counts,
   * so in a one-person group the change applies at once.
   * Returns true when the change was applied immediately.
   */
  async propose(
    group: Group,
    proposerEmail: string,
    proposerUid: string,
    proposal: Pick<FactorProposal, 'type' | 'targetId' | 'targetName' | 'parentId' | 'data'>
  ): Promise<boolean> {
    const email = normalizeEmail(proposerEmail);
    const tree = await factorService.getTree({ type: 'group', groupId: group.id });
    // Validate now so duplicates are reported before anyone votes.
    factorService.applyChange(tree, toChange(proposal), proposerUid);
    await this.assertNoPendingDuplicate(group.id, proposal);

    const ref = await addDoc(collection(db, COLLECTION_NAME), {
      groupId: group.id,
      type: proposal.type,
      targetId: proposal.targetId ?? null,
      targetName: proposal.targetName ?? null,
      parentId: proposal.parentId ?? null,
      data: proposal.data ?? null,
      proposedBy: email,
      approvals: [email],
      rejections: [],
      status: 'pending',
      createdAt: Timestamp.now(),
    });

    if (approvalsNeeded(group) <= 1) {
      return (await this.vote(group, ref.id, email, proposerUid, true)) === 'applied';
    }
    return false;
  },

  /** Blocks a second pending proposal that adds or renames to the same name. */
  async assertNoPendingDuplicate(
    groupId: string,
    proposal: Pick<FactorProposal, 'type' | 'targetId' | 'data'>
  ): Promise<void> {
    if (proposal.type === 'delete' || !proposal.data) return;
    const pending = (await this.getProposals(groupId)).filter(p => p.status === 'pending' && p.data);
    const clash = pending.find(
      p => p.targetId !== proposal.targetId &&
        factorService.findDuplicate([{ id: 'x', name: p.data!.name, weight: 0, userId: '' }], proposal.data!.name)
    );
    if (clash) throw new Error(`Ya hay una propuesta pendiente con el nombre "${clash.data!.name}"`);
  },

  /**
   * Records a member's vote. When approvals reach a majority the change is applied to the
   * shared tree in the same transaction; when a majority can no longer be reached it is rejected.
   */
  async vote(
    group: Group,
    proposalId: string,
    voterEmail: string,
    voterUid: string,
    approve: boolean
  ): Promise<FactorProposal['status']> {
    const email = normalizeEmail(voterEmail);
    if (!group.memberEmails.includes(email)) throw new Error('Solo los miembros del grupo pueden votar');

    const proposalRef = doc(db, COLLECTION_NAME, proposalId);
    const treeRef = doc(db, 'factors', factorDocId({ type: 'group', groupId: group.id }));
    const needed = approvalsNeeded(group);
    const members = group.memberEmails.length;

    return runTransaction(db, async tx => {
      const [pSnap, tSnap] = await Promise.all([tx.get(proposalRef), tx.get(treeRef)]);
      if (!pSnap.exists()) throw new Error('La propuesta ya no existe');
      const p = { id: pSnap.id, ...pSnap.data() } as FactorProposal;
      if (p.status !== 'pending') return p.status;

      const approvals = p.approvals.filter(e => e !== email);
      const rejections = p.rejections.filter(e => e !== email);
      (approve ? approvals : rejections).push(email);

      // Only count votes from current members.
      const validApprovals = approvals.filter(e => group.memberEmails.includes(e)).length;
      const validRejections = rejections.filter(e => group.memberEmails.includes(e)).length;

      let status: FactorProposal['status'] = 'pending';
      if (validApprovals >= needed) {
        const tree = (tSnap.exists() ? tSnap.data().tree : []) as EnvironmentalFactor[];
        const next = factorService.applyChange(tree, toChange(p), voterUid);
        tx.set(treeRef, { groupId: group.id, tree: next, updatedAt: new Date().toISOString() });
        status = 'applied';
      } else if (members - validRejections < needed) {
        status = 'rejected';
      }

      tx.update(proposalRef, { approvals, rejections, status });
      return status;
    });
  },
};
