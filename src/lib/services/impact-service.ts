import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  deleteDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { Impact } from '../types';

const COLLECTION_NAME = 'impacts';

export const impactService = {
  async createImpact(userId: string, data: Omit<Impact, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      userId,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getAlternativeImpacts(alternativeId: string): Promise<Impact[]> {
    const q = query(collection(db, COLLECTION_NAME), where('alternativeId', '==', alternativeId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp).toDate().toISOString()
    })) as Impact[];
  },

  async deleteImpact(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  async deleteAlternativeImpacts(alternativeId: string): Promise<void> {
    const q = query(collection(db, COLLECTION_NAME), where('alternativeId', '==', alternativeId));
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
};
