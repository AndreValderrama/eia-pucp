export interface Group {
  id: string;
  name: string;
  description?: string;
  ownerId: string; // UID of the creator, the only one who can manage the group
  ownerEmail: string;
  memberEmails: string[]; // Lowercase @pucp.edu.pe / @pucp.pe emails, owner included
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Project {
  id: string;
  userId: string;
  groupId?: string | null; // Group the project is shared with (members can see it)
  name: string;
  description: string;
  creationDate: string; // ISO date string
  authors: string[];
  projectType?: string; // e.g., 'Vial', 'Vertedero', 'Puerto', 'Presa'
  actionTree?: ActionNode[]; // Master framework for all alternatives in this project
  location?: ProjectLocation | null;
  report?: ProjectReportInfo;
}

export interface ProjectLocation {
  departamento: string;
  provincia: string;
  distrito: string;
  /** INEI ubigeo code, e.g. 150101. */
  ubigeo?: string;
}

/** Extra data printed in the report (informe). */
export interface ProjectReportInfo {
  codigo?: string;
  objetivo?: string;
  consultora?: string;
  responsable?: string;
  fechaEstudio?: string; // yyyy-mm-dd
  superficieHa?: number;
}

export type GisLayerKey = 'area_proyecto' | 'aid' | 'aii' | 'estaciones';

/** A map layer stored with a project. GeoJSON is kept as a string because Firestore can't store nested arrays. */
export interface GisLayer {
  key: GisLayerKey;
  fileName: string;
  geojson: string;
  featureCount: number;
  uploadedBy: string;
  uploadedAt: string;
}

/** Variables (CSV) measured at the monitoring stations. */
export interface StationVariables {
  fileName: string;
  columns: string[];
  rows: Record<string, string>[];
  /** CSV column holding the station code. */
  joinColumn: string;
  /** Station layer property matched against `joinColumn`. */
  stationField: string;
  uploadedBy: string;
  uploadedAt: string;
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
  /** 'function': y from min/max/x. 'likert': y from the members' 1–5 vote mean, (mean − 1) / 4. */
  method?: 'function' | 'likert';
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
  /** Screening votes, keyed by voter UID. `importance` holds the most-voted category. */
  votes?: Record<string, MemberVote<ImpactImportance>>;
  /** Likert 1–5 magnitude votes, keyed by voter UID. */
  likertVotes?: Record<string, MemberVote<number>>;
  createdAt: string;
}

export interface MemberVote<T> {
  email: string;
  value: T;
}

export type FactorProposalType = 'add' | 'edit' | 'delete';

export interface FactorProposal {
  id: string;
  groupId: string;
  type: FactorProposalType;
  /** Factor being edited or deleted. */
  targetId?: string;
  targetName?: string;
  /** Parent for a new factor; null adds a root factor. */
  parentId?: string | null;
  data?: { name: string; weight: number; description?: string };
  proposedBy: string; // email
  approvals: string[]; // emails
  rejections: string[]; // emails
  status: 'pending' | 'applied' | 'rejected';
  createdAt?: unknown;
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
  valorada?: boolean;
  valorTotal?: number;
}
