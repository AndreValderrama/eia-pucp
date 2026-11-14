import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
  runTransaction,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Impact, ImpactImportance, MemberVote } from '../types';
import { consensusImportance, likertMean, likertToMagnitude } from '../utils/impact-calculations';
import { normalizeEmail } from './group-service';

const COLLECTION_NAME = 'impacts';

const toIso = (value: unknown) =>
  value instanceof Timestamp ? value.toDate().toISOString() : typeof value === 'string' ? value : new Date().toISOString();

export const impactService = {
  /** Creates an impact; the creator's chosen importance counts as their first screening vote. */
  async createImpact(
    user: { uid: string; email: string | null },
    data: Omit<Impact, 'id' | 'createdAt' | 'userId' | 'votes' | 'likertVotes'>
  ): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      userId: user.uid,
      votes: { [user.uid]: { email: normalizeEmail(user.email || ''), value: data.importance } },
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getAlternativeImpacts(alternativeId: string): Promise<Impact[]> {
    const q = query(collection(db, COLLECTION_NAME), where('alternativeId', '==', alternativeId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: toIso(d.data().createdAt),
    })) as Impact[];
  },

  async deleteImpact(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  },

  async updateImpact(id: string, data: Partial<Impact>): Promise<void> {
    // Votes are written only through the vote methods, so concurrent voters don't overwrite each other.
    const { id: _id, createdAt: _c, votes: _v, likertVotes: _l, ...cleanData } = data;
    await updateDoc(doc(db, COLLECTION_NAME, id), cleanData);
  },

  /** Sets the member's screening vote and recomputes the impact's consensus importance. */
  async voteImportance(impactId: string, voter: { uid: string; email: string | null }, value: ImpactImportance) {
    const ref = doc(db, COLLECTION_NAME, impactId);
    return runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('El impacto ya no existe');
      const votes: Record<string, MemberVote<ImpactImportance>> = {
        ...(snap.data().votes || {}),
        [voter.uid]: { email: normalizeEmail(voter.email || ''), value },
      };
      const importance = consensusImportance(votes) ?? value;
      tx.update(ref, { [`votes.${voter.uid}`]: votes[voter.uid], importance });
      return importance;
    });
  },

  /**
   * Sets the member's Likert 1–5 magnitude vote. When the impact uses the Likert method,
   * its magnitude is updated to the normalized mean of all votes.
   */
  async voteLikert(impactId: string, voter: { uid: string; email: string | null }, value: number) {
    if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error('El voto debe ser de 1 a 5');
    const ref = doc(db, COLLECTION_NAME, impactId);
    return runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('El impacto ya no existe');
      const data = snap.data() as Impact;
      const likertVotes = {
        ...(data.likertVotes || {}),
        [voter.uid]: { email: normalizeEmail(voter.email || ''), value },
      };
      const mean = likertMean(likertVotes)!;
      const update: Record<string, unknown> = { [`likertVotes.${voter.uid}`]: likertVotes[voter.uid] };
      if (data.quantitative?.method === 'likert') {
        update['quantitative.calculatedValue'] = likertToMagnitude(mean);
      }
      tx.update(ref, update);
      return mean;
    });
  },

  async deleteAlternativeImpacts(alternativeId: string): Promise<void> {
    const q = query(collection(db, COLLECTION_NAME), where('alternativeId', '==', alternativeId));
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  },
};
