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

  async updateImpact(id: string, data: Partial<Impact>): Promise<void> {
    const { collection, addDoc, getDocs, query, where, doc, deleteDoc, Timestamp, writeBatch, updateDoc } = await import('firebase/firestore');
    const docRef = doc(db, COLLECTION_NAME, id);
    // Remove id and createdAt if they accidentally slipped in
    const { id: _, createdAt: __, ...cleanData } = data as any;
    await updateDoc(docRef, cleanData);
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
