import { ActionNode } from '../types';

export const newNodeId = () => Math.random().toString(36).slice(2, 11);

export const childTypeOf = (parent: ActionNode | null): ActionNode['type'] =>
  !parent ? 'phase' : parent.type === 'phase' ? 'labor' : 'action';

export const findNode = (nodes: ActionNode[], id: string): ActionNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children || [], id);
    if (found) return found;
  }
  return null;
};

export const addNode = (nodes: ActionNode[], parentId: string | null, newNode: ActionNode): ActionNode[] => {
  if (!parentId) return [...nodes, newNode];
  return nodes.map(node =>
    node.id === parentId
      ? { ...node, children: [...(node.children || []), newNode] }
      : { ...node, children: addNode(node.children || [], parentId, newNode) }
  );
};

export const renameNode = (nodes: ActionNode[], id: string, name: string): ActionNode[] =>
  nodes.map(node =>
    node.id === id ? { ...node, name } : { ...node, children: renameNode(node.children || [], id, name) }
  );

export const deleteNode = (nodes: ActionNode[], id: string): ActionNode[] =>
  nodes
    .filter(node => node.id !== id)
    .map(node => ({ ...node, children: deleteNode(node.children || [], id) }));

/** Ids of a node and all of its descendants. */
export const collectIds = (node: ActionNode): string[] => [
  node.id,
  ...(node.children || []).flatMap(collectIds),
];

const cloneWithNewIds = (node: ActionNode): ActionNode => ({
  ...node,
  id: newNodeId(),
  children: (node.children || []).map(cloneWithNewIds),
});

/**
 * Copies a phase, labor or action (with all of its children, using fresh ids)
 * and inserts the copy right after the original, at the same level.
 */
export const duplicateNode = (nodes: ActionNode[], id: string): ActionNode[] => {
  const index = nodes.findIndex(n => n.id === id);
  if (index !== -1) {
    const copy = cloneWithNewIds(nodes[index]);
    copy.name = `${nodes[index].name} (copia)`;
    return [...nodes.slice(0, index + 1), copy, ...nodes.slice(index + 1)];
  }
  return nodes.map(node => ({ ...node, children: duplicateNode(node.children || [], id) }));
};
