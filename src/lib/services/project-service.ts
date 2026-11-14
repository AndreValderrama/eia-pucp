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
import { Project, ActionNode, Group } from '../types';
import { groupService } from './group-service';

export type AccessibleProject = Project & { groupName?: string };

const COLLECTION_NAME = 'projects';

export const projectService = {
  async createProject(userId: string, data: Partial<Project>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      userId,
      creationDate: new Date().toISOString(),
      actionTree: data.actionTree || [],
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getUserProjects(userId: string): Promise<Project[]> {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Project[];
  },

  async getGroupProjects(groupId: string): Promise<Project[]> {
    const q = query(collection(db, COLLECTION_NAME), where('groupId', '==', groupId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Project[];
  },

  /**
   * The user's own projects plus every project shared with a group they belong to.
   * Each project carries the name of its group, when it has one.
   */
  async getAccessibleProjects(user: { uid: string; email: string | null }): Promise<AccessibleProject[]> {
    const groups: Group[] = user.email ? await groupService.getMyGroups(user.email) : [];
    const groupNames = new Map(groups.map(g => [g.id, g.name]));

    const [own, ...shared] = await Promise.all([
      this.getUserProjects(user.uid),
      ...groups.map(g => this.getGroupProjects(g.id)),
    ]);

    const byId = new Map<string, AccessibleProject>();
    for (const p of [...own, ...shared.flat()]) {
      byId.set(p.id, { ...p, groupName: p.groupId ? groupNames.get(p.groupId) : undefined });
    }
    return Array.from(byId.values()).sort((a, b) =>
      (b.creationDate || '').localeCompare(a.creationDate || '')
    );
  },

  async setProjectGroup(projectId: string, groupId: string | null): Promise<void> {
    await updateDoc(doc(db, COLLECTION_NAME, projectId), { groupId });
  },

  async getProject(id: string): Promise<Project | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Project;
    }
    return null;
  },

  async updateProject(id: string, data: Partial<Project>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, data);
  },

  async updateProjectFramework(id: string, actionTree: ActionNode[]): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { actionTree });
  },

  async deleteProject(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};
