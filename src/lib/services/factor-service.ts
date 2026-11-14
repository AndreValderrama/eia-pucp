import { 
  doc, 
  getDoc, 
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { EnvironmentalFactor, Project } from '../types';
import { factorTemplate } from '../data/factor-template';

const COLLECTION_NAME = 'factors';
const DOCUMENT_ID = 'tree';

/** Whose factor tree: a user's personal tree or a group's shared tree. */
export type FactorScope = { type: 'user'; uid: string } | { type: 'group'; groupId: string };

export const factorDocId = (scope: FactorScope) =>
  scope.type === 'user' ? `${scope.uid}_${DOCUMENT_ID}` : `group_${scope.groupId}`;

export type FactorChange =
  | { type: 'add'; parentId: string | null; data: { name: string; weight: number; description?: string } }
  | { type: 'edit'; targetId: string; data: { name: string; weight: number; description?: string } }
  | { type: 'delete'; targetId: string };

/** Lowercase, trimmed, accent-free, single-spaced: "Calidad  del Aire" == "calidad del aire". */
export const normalizeFactorName = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();

const flatten = (items: EnvironmentalFactor[]): EnvironmentalFactor[] =>
  items.flatMap(item => [item, ...flatten(item.children || [])]);

const newFactorId = () => `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const factorService = {
  async getTree(scope: FactorScope): Promise<EnvironmentalFactor[]> {
    const snap = await getDoc(doc(db, COLLECTION_NAME, factorDocId(scope)));
    return snap.exists() ? ((snap.data().tree || []) as EnvironmentalFactor[]) : [];
  },

  async saveTree(scope: FactorScope, tree: EnvironmentalFactor[]): Promise<void> {
    await setDoc(doc(db, COLLECTION_NAME, factorDocId(scope)), {
      ...(scope.type === 'user' ? { userId: scope.uid } : { groupId: scope.groupId }),
      tree,
      updatedAt: new Date().toISOString(),
    });
  },

  /** The tree a project is assessed against: its group's shared tree, or its owner's personal tree. */
  scopeForProject(project: Pick<Project, 'userId' | 'groupId'>): FactorScope {
    return project.groupId ? { type: 'group', groupId: project.groupId } : { type: 'user', uid: project.userId };
  },

  /** Another factor with the same normalized name, ignoring `excludeId`. */
  findDuplicate(tree: EnvironmentalFactor[], name: string, excludeId?: string): EnvironmentalFactor | null {
    const target = normalizeFactorName(name);
    return flatten(tree).find(f => f.id !== excludeId && normalizeFactorName(f.name) === target) || null;
  },

  findFactor(tree: EnvironmentalFactor[], id: string): EnvironmentalFactor | null {
    return flatten(tree).find(f => f.id === id) || null;
  },

  /**
   * Applies one add/edit/delete to a tree and rebalances parent weights.
   * Throws if the change would create a duplicate name or targets a missing factor.
   */
  applyChange(tree: EnvironmentalFactor[], change: FactorChange, userId: string): EnvironmentalFactor[] {
    if (change.type !== 'delete') {
      const excludeId = change.type === 'edit' ? change.targetId : undefined;
      const dup = this.findDuplicate(tree, change.data.name, excludeId);
      if (dup) throw new Error(`Ya existe un factor llamado "${dup.name}"`);
    }
    if (change.type !== 'add' && !this.findFactor(tree, change.targetId)) {
      throw new Error('El factor ya no existe');
    }

    let next: EnvironmentalFactor[];
    if (change.type === 'add') {
      const factor: EnvironmentalFactor = {
        ...change.data,
        name: change.data.name.trim(),
        id: newFactorId(),
        userId,
        children: [],
      };
      if (change.parentId && !this.findFactor(tree, change.parentId)) throw new Error('El factor padre ya no existe');
      const add = (items: EnvironmentalFactor[]): EnvironmentalFactor[] =>
        items.map(item =>
          item.id === change.parentId
            ? { ...item, children: [...(item.children || []), factor] }
            : { ...item, children: add(item.children || []) }
        );
      next = change.parentId ? add(tree) : [...tree, factor];
    } else if (change.type === 'edit') {
      const edit = (items: EnvironmentalFactor[]): EnvironmentalFactor[] =>
        items.map(item =>
          item.id === change.targetId
            ? { ...item, ...change.data, name: change.data.name.trim() }
            : { ...item, children: edit(item.children || []) }
        );
      next = edit(tree);
    } else {
      const remove = (items: EnvironmentalFactor[]): EnvironmentalFactor[] =>
        items.filter(item => item.id !== change.targetId).map(item => ({ ...item, children: remove(item.children || []) }));
      next = remove(tree);
    }
    return this.recalculateWeights(next);
  },

  /**
   * Gets the factor tree for a specific user.
   */
  async getUserFactors(userId: string): Promise<EnvironmentalFactor[]> {
    const docRef = doc(db, COLLECTION_NAME, `${userId}_${DOCUMENT_ID}`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().tree as EnvironmentalFactor[];
    }
    
    return [];
  },

  /**
   * Saves the entire factor tree for a user.
   */
  async saveUserFactors(userId: string, tree: EnvironmentalFactor[]): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, `${userId}_${DOCUMENT_ID}`);
    await setDoc(docRef, {
      userId,
      tree,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Imports the default template for a user.
   */
  async importTemplate(userId: string, scope: FactorScope = { type: 'user', uid: userId }): Promise<EnvironmentalFactor[]> {
    // Add IDs to the template items recursively
    const addIds = (items: Partial<EnvironmentalFactor>[]): EnvironmentalFactor[] => {
      return items.map((item, index) => ({
        ...item,
        id: `f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        children: item.children ? addIds(item.children) : [],
      })) as EnvironmentalFactor[];
    };

    const treeWithIds = addIds(factorTemplate);
    await this.saveTree(scope, treeWithIds);
    return treeWithIds;
  },

  /**
   * Flattens the tree to get only leaf nodes (the ones used for assessment).
   */
  getLeafFactors(tree: EnvironmentalFactor[]): EnvironmentalFactor[] {
    const leaves: EnvironmentalFactor[] = [];
    const traverse = (items: EnvironmentalFactor[]) => {
      items.forEach(item => {
        if (!item.children || item.children.length === 0) {
          leaves.push(item);
        } else {
          traverse(item.children);
        }
      });
    };
    traverse(tree);
    return leaves;
  },

  /**
   * Recursively recalculates weights from bottom to top.
   * Parent weight = Sum of children weights.
   */
  recalculateWeights(tree: EnvironmentalFactor[]): EnvironmentalFactor[] {
    return tree.map(item => {
      let updatedItem = { ...item };
      
      if (item.children && item.children.length > 0) {
        // First, recursively calculate children weights
        const updatedChildren = this.recalculateWeights(item.children);
        updatedItem.children = updatedChildren;
        
        // Then, set parent weight as the sum of updated children weights
        updatedItem.weight = updatedChildren.reduce((sum, child) => sum + child.weight, 0);
      }
      
      return updatedItem;
    });
  }
};
