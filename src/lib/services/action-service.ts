import { ActionNode } from '../types';
import { projectActionTemplates } from '../data/project-action-templates';

export const actionService = {
  /**
   * Returns the available templates names.
   */
  getAvailableProjectTypes(): string[] {
    return Object.keys(projectActionTemplates);
  },

  /**
   * Returns the actions tree for a specific project type.
   */
  getActionsForType(type: string): ActionNode[] {
    return projectActionTemplates[type] || [];
  },

  /**
   * Flattens the action tree to get only the leaf "Actions".
   */
  getLeafActions(nodes: ActionNode[]): ActionNode[] {
    const actions: ActionNode[] = [];
    const traverse = (items: ActionNode[]) => {
      items.forEach(item => {
        if (!item.children || item.children.length === 0) {
          actions.push(item);
        } else {
          traverse(item.children);
        }
      });
    };
    traverse(nodes);
    return actions;
  }
};
