import { EnvironmentalFactor } from '../types';

export const factorTemplate: Partial<EnvironmentalFactor>[] = [
  {
    name: 'SISTEMA FÍSICO NATURAL',
    weight: 550,
    children: [
      {
        name: 'Medio abiótico',
        weight: 230,
        children: [
          {
            name: 'Aire',
            weight: 80,
            children: [
              { name: 'Calidad del aire', weight: 30 },
              { name: 'Nivel sonoro', weight: 50 },
            ],
          },
          {
            name: 'Geología. Geomorfía',
            weight: 40,
            children: [
              { name: 'Relieve', weight: 25 },
              { name: 'Recursos culturales (PIGs)', weight: 15 },
            ],
          },
          {
            name: 'Suelos',
            weight: 40,
            children: [
              { name: 'Contaminación del suelo', weight: 20 },
              { name: 'Capacidad agrológica del suelo', weight: 20 },
            ],
          },
          { name: 'Aguas superficiales', weight: 40 },
          { name: 'Aguas subterráneas', weight: 30 },
        ],
      },
      {
        name: 'Medio biótico',
        weight: 240,
        children: [
          {
            name: 'Vegetación',
            weight: 120,
            children: [
              { name: 'Formaciones vegetales', weight: 100 },
              { name: 'Especies singulares', weight: 20 },
            ],
          },
          { name: 'Fauna', weight: 120 },
        ],
      },
      {
        name: 'Paisaje',
        weight: 80,
        children: [
          { name: 'Calidad. Unidades de paisaje', weight: 40 },
          { name: 'Intervisibilidad', weight: 40 },
        ],
      },
    ],
  },
  {
    name: 'MEDIO SOCIOECONÓMICO',
    weight: 300,
    children: [
      {
        name: 'Usos del suelo',
        weight: 130,
        children: [
          { name: 'Usos productivos', weight: 55 },
          { name: 'Viario rural', weight: 15 },
          { name: 'Usos recreativos', weight: 20 },
          { name: 'Conservación de la naturaleza', weight: 40 },
        ],
      },
      {
        name: 'Población',
        weight: 70,
        children: [
          { name: 'Empleo', weight: 25 },
          { name: 'Calidad de vida', weight: 30 },
          { name: 'Aceptación social', weight: 15 },
        ],
      },
      { name: 'Economía', weight: 40 },
      { name: 'Infraestructuras y planeamiento urbanístico', weight: 60 },
    ],
  },
  {
    name: 'PATRIMONIO CULTURAL',
    weight: 100,
    children: [
      { name: 'Patrimonio histórico artístico', weight: 55 },
      { name: 'Arqueología y paleontología', weight: 45 },
    ],
  },
  {
    name: 'PROCESOS',
    weight: 50,
    children: [
      { name: 'Erosión', weight: 20 },
      { name: 'Inundación', weight: 10 },
      { name: 'Incendios', weight: 20 },
    ],
  },
];
