import { 
  collection, 
  addDoc, 
  query, 
  where, 
  doc, 
  getDocs, 
  updateDoc, 
  arrayUnion, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Group } from '../types';

const COLLECTION_NAME = 'groups';

export const groupService = {
  async createGroup(name: string, userId: string): Promise<string> {
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const groupRef = await addDoc(collection(db, COLLECTION_NAME), {
      name,
      inviteCode,
      members: [userId],
      createdAt: Timestamp.now(),
    });
    return groupRef.id;
  },

  async joinGroup(inviteCode: string, userId: string): Promise<void> {
    const q = query(collection(db, COLLECTION_NAME), where('inviteCode', '==', inviteCode.toUpperCase()));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) throw new Error("Invalid invitation code");
    
    const groupRef = doc(db, COLLECTION_NAME, snapshot.docs[0].id);
    await updateDoc(groupRef, {
      members: arrayUnion(userId)
    });
  },

  async getMyGroups(userId: string): Promise<Group[]> {
    const q = query(collection(db, COLLECTION_NAME), where('members', 'array-contains', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
  }
};
