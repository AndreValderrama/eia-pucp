import {
  collection,
  addDoc,
  query,
  where,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Group } from '../types';

const COLLECTION_NAME = 'groups';
export const ALLOWED_EMAIL_DOMAINS = ['@pucp.edu.pe', '@pucp.pe'];
/** Human-readable list of the allowed domains, for messages and hints. */
export const ALLOWED_EMAIL_LABEL = ALLOWED_EMAIL_DOMAINS.join(' o ');

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidPucpEmail = (email: string) =>
  /^[^\s@]+@pucp(\.edu)?\.pe$/.test(normalizeEmail(email));

export const isGroupOwner = (group: Group, userId?: string | null) =>
  !!userId && group.ownerId === userId;

export const groupService = {
  async createGroup(
    owner: { uid: string; email: string },
    data: { name: string; description?: string; memberEmails: string[] }
  ): Promise<string> {
    const ownerEmail = normalizeEmail(owner.email);
    const members = Array.from(
      new Set([ownerEmail, ...data.memberEmails.map(normalizeEmail)])
    );
    const invalid = members.filter(e => !isValidPucpEmail(e));
    if (invalid.length) {
      throw new Error(`Correos no válidos: ${invalid.join(', ')}`);
    }

    const groupRef = await addDoc(collection(db, COLLECTION_NAME), {
      name: data.name.trim(),
      description: data.description?.trim() || '',
      ownerId: owner.uid,
      ownerEmail,
      memberEmails: members,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return groupRef.id;
  },

  async getGroup(groupId: string): Promise<Group | null> {
    const snap = await getDoc(doc(db, COLLECTION_NAME, groupId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null;
  },

  /** Groups the user belongs to, as owner or as an invited member. */
  async getMyGroups(email: string): Promise<Group[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('memberEmails', 'array-contains', normalizeEmail(email))
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Group));
  },

  async updateGroup(groupId: string, data: { name: string; description?: string }): Promise<void> {
    await updateDoc(doc(db, COLLECTION_NAME, groupId), {
      name: data.name.trim(),
      description: data.description?.trim() || '',
      updatedAt: Timestamp.now(),
    });
  },

  async addMember(groupId: string, email: string): Promise<void> {
    const normalized = normalizeEmail(email);
    if (!isValidPucpEmail(normalized)) {
      throw new Error(`Solo se permiten correos ${ALLOWED_EMAIL_LABEL}`);
    }
    await updateDoc(doc(db, COLLECTION_NAME, groupId), {
      memberEmails: arrayUnion(normalized),
      updatedAt: Timestamp.now(),
    });
  },

  async updateMember(group: Group, oldEmail: string, newEmail: string): Promise<void> {
    const oldNorm = normalizeEmail(oldEmail);
    const newNorm = normalizeEmail(newEmail);
    if (oldNorm === group.ownerEmail) throw new Error('No se puede cambiar el correo del creador');
    if (!isValidPucpEmail(newNorm)) {
      throw new Error(`Solo se permiten correos ${ALLOWED_EMAIL_LABEL}`);
    }
    if (oldNorm === newNorm) return;
    if (group.memberEmails.includes(newNorm)) throw new Error('Ese correo ya está en el grupo');

    const memberEmails = group.memberEmails.map(e => (e === oldNorm ? newNorm : e));
    await updateDoc(doc(db, COLLECTION_NAME, group.id), {
      memberEmails,
      updatedAt: Timestamp.now(),
    });
  },

  async removeMember(group: Group, email: string): Promise<void> {
    const normalized = normalizeEmail(email);
    if (normalized === group.ownerEmail) throw new Error('No se puede quitar al creador del grupo');
    await updateDoc(doc(db, COLLECTION_NAME, group.id), {
      memberEmails: arrayRemove(normalized),
      updatedAt: Timestamp.now(),
    });
  },

  /** Deletes the group and detaches its projects (the projects themselves are kept). */
  async deleteGroup(groupId: string): Promise<void> {
    const projects = await getDocs(
      query(collection(db, 'projects'), where('groupId', '==', groupId))
    );
    const batch = writeBatch(db);
    projects.docs.forEach(p => batch.update(p.ref, { groupId: null }));
    batch.delete(doc(db, COLLECTION_NAME, groupId));
    await batch.commit();
  },
};
