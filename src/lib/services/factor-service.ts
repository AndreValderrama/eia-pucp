import { 
  doc, 
  getDoc, 
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { EnvironmentalFactor } from '../types';
import { factorTemplate } from '../data/factor-template';

const COLLECTION_NAME = 'factors';
const DOCUMENT_ID = 'tree';

export const factorService = {
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
  async importTemplate(userId: string): Promise<EnvironmentalFactor[]> {
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
    await this.saveUserFactors(userId, treeWithIds);
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
