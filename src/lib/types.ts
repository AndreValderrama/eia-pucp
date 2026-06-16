export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  members: string[]; // User UIDs
}

export interface Project {
  id: string;
  userId: string;
  groupId?: string; // New: Access Control
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
  groupId?: string; // New: Access Control
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

export interface QualitativeAssessment {
  signo: '+' | '-';
  acumulacion: number; // A
  extension: number; // E
  intensidad: number; // IN
  persistencia: number; // P
  reversibilidad: number; // RV
  recuperabilidad: number; // RC
  periodicidad: number; // PR
  momento: number; // MO
  efecto: number; // EF
  calculatedImportance: number;
}

export interface QuantitativeAssessment {
  functionType: string;
  min: number;
  max: number;
  x: number;
  umbral?: number;
  a?: number;
  calculatedValue: number; // y between -1 and 1
}

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
  normalizedWeight: number;
  description?: string;
  qualitative?: QualitativeAssessment;
  quantitative?: QuantitativeAssessment;
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
