
export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  creationDate: string; // ISO date string
  authors: string[];
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
  name: string;
  description?: string;
  effects: Effect[];
}
