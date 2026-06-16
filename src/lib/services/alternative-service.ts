import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Alternative, Effect } from '../types';

const COLLECTION_NAME = 'alternatives';

export const alternativeService = {
  async createAlternative(userId: string, data: Partial<Alternative>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      userId,
      effects: [],
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getUserAlternatives(userId: string): Promise<Alternative[]> {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Alternative[];
  },

  async getAlternative(id: string): Promise<Alternative | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Alternative;
    }
    return null;
  },

  async updateAlternative(id: string, data: Partial<Alternative>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, data);
  },

  async addEffectToAlternative(alternativeId: string, effect: Effect): Promise<void> {
    const alt = await this.getAlternative(alternativeId);
    if (alt) {
      const updatedEffects = [...alt.effects, effect];
      await this.updateAlternative(alternativeId, { effects: updatedEffects });
    }
  }
};
