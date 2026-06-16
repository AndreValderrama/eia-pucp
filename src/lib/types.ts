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

export type ImpactImportance = 'despreciable' | 'notable' | 'significativo' | 'difuso';

export interface Impact {
  id: string;
  userId: string;
  projectId: string;
  alternativeId: string;
  actionId: string;
  actionName: string;
  factorId: string;
  factorName: string;
  importance: ImpactImportance;
  normalizedWeight: number; // factor.weight / totalFactorWeight
  description?: string;
  createdAt: string;
}

export interface Effect {
  id: string;
  actionName: string;
  actionDescription: string;
  factorName: string;
  description: string;
  importance: ImpactImportance;
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
  actionTree?: ActionNode[]; // Custom framework for this alternative
}
