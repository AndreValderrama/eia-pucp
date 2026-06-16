export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  creationDate: string; // ISO date string
  authors: string[];
  projectType?: string; // e.g., 'Vial', 'Vertedero', 'Puerto', 'Presa'
  actionTree?: ActionNode[]; // Master framework for all alternatives in this project
}

export interface ActionNode {
  id: string;
  name: string;
  type: 'phase' | 'labor' | 'action';
  children?: ActionNode[];
}

export interface EnvironmentalFactor {
  id: string;
  userId: string;
  name: string;
  weight: number; 
  description?: string;
  children?: EnvironmentalFactor[]; // Recursive structure for hierarchical factors
}

export interface Action {
  id: string;
  name: string;
  description: string;
}

export type ImpactCharacter = 'compatible' | 'critical' | 'moderate' | 'severe' | 'pending' | undefined;

export interface Effect {
  id: string;
  actionName: string; // Simplified for direct use
  actionDescription: string; // Simplified for direct use
  factorName: string; // Simplified for direct use, maps to EnvironmentalFactor.name
  description: string;
  idoneityScore: number; // 0-100
  character?: ImpactCharacter;
  justification?: string;
}

export interface Alternative {
  id: string;
  userId: string;
  projectId: string; // Link to parent project
  name: string;
  description?: string;
  effects: Effect[];
}
