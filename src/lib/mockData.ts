import type { Project, Alternative, EnvironmentalFactor, Effect } from './types';

export const mockProject: Project = {
  id: 'proj-001',
  name: 'Coastal Highway Development Phase II',
  description: 'Expansion of the existing coastal highway to improve connectivity and support regional economic growth. This phase focuses on a 20km stretch passing through ecologically sensitive zones.',
  creationDate: new Date().toISOString(),
  authors: ['Dr. Eleanor Vance', 'Michael Chen', 'Sophia Al-Jamil'],
};

export const mockFactors: EnvironmentalFactor[] = [
  { id: 'factor-1', name: 'Air Quality', weight: 0.25, description: 'Impact on particulate matter, NOx, SOx levels.' },
  { id: 'factor-2', name: 'Water Resources', weight: 0.3, description: 'Effects on groundwater, surface water quality and quantity.' },
  { id: 'factor-3', name: 'Biodiversity', weight: 0.2, description: 'Impact on local flora, fauna, and habitat integrity.' },
  { id: 'factor-4', name: 'Soil Integrity', weight: 0.15, description: 'Concerns regarding soil erosion, contamination, and land degradation.' },
  { id: 'factor-5', name: 'Noise Pollution', weight: 0.1, description: 'Increase in ambient noise levels due to construction and operation.' },
];

const commonActions = {
  construction: { name: "Highway Construction", description: "Clearing land, grading, paving, bridge building." },
  operation: { name: "Highway Operation", description: "Traffic flow, maintenance activities." }
};

export const mockEffectsAlternative1: Effect[] = [
  { 
    id: 'effect-a1-1', 
    actionName: commonActions.construction.name,
    actionDescription: commonActions.construction.description,
    factorName: 'Biodiversity', 
    description: 'Habitat fragmentation due to land clearing for the new lanes.',
    idoneityScore: 30,
    character: 'pending',
  },
  { 
    id: 'effect-a1-2', 
    actionName: commonActions.construction.name,
    actionDescription: commonActions.construction.description,
    factorName: 'Water Resources', 
    description: 'Potential contamination of nearby streams from construction runoff.',
    idoneityScore: 45,
    character: 'pending',
  },
  {
    id: 'effect-a1-3',
    actionName: commonActions.operation.name,
    actionDescription: commonActions.operation.description,
    factorName: 'Noise Pollution',
    description: 'Increased traffic noise affecting residential areas near the expanded highway.',
    idoneityScore: 60,
    character: 'pending',
  }
];

export const mockEffectsAlternative2: Effect[] = [
  { 
    id: 'effect-a2-1', 
    actionName: "Tunnel Boring",
    actionDescription: "Excavation of a tunnel to bypass a sensitive ecological area.",
    factorName: 'Biodiversity', 
    description: 'Reduced surface habitat fragmentation compared to open cutting, but potential impact on subterranean ecosystems.',
    idoneityScore: 70,
    character: 'pending',
  },
  { 
    id: 'effect-a2-2', 
    actionName: "Tunnel Operation",
    actionDescription: "Ventilation systems and traffic within the tunnel.",
    factorName: 'Air Quality', 
    description: 'Localized air pollution at tunnel exits, requiring advanced ventilation and filtration.',
    idoneityScore: 55,
    character: 'pending',
  },
];


export const mockAlternatives: Alternative[] = [
  {
    id: 'alt-001',
    name: 'Baseline Expansion Plan',
    description: 'Standard expansion method involving widening the existing roadbed and constructing new bridges using conventional techniques.',
    effects: mockEffectsAlternative1,
  },
  {
    id: 'alt-002',
    name: 'Tunnel Bypass Route',
    description: 'Constructing a tunnel to bypass the most ecologically sensitive 5km stretch, with surface-level expansion for the remaining 15km.',
    effects: mockEffectsAlternative2,
  },
  {
    id: 'alt-003',
    name: 'Elevated Viaduct Option',
    description: 'Utilizing an elevated viaduct structure over sensitive wetland areas to minimize ground-level disturbance.',
    effects: [],
  },
];
