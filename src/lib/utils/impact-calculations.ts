import { QualitativeAssessment } from "../types";

/**
 * Constants for Qualitative Assessment based on "VALORACIÓN CUALITATIVA COMPLETA"
 */
export const QUALITATIVE_WEIGHTS = {
  ACUMULACION: {
    Simple: 1,
    Acumulativo: 3,
    Sinergico: 6
  },
  EXTENSION: {
    Puntual: 1,
    Parcial: 2,
    Extenso: 4,
    Total: 6,
    Critica: 4 // Note: prompt says +4, we'll handle this as a bonus or base value
  },
  INTENSIDAD: {
    Baja: 1,
    Media: 4,
    Alta: 4,
    Muy_Alta: 6,
    Total: 10
  },
  PERSISTENCIA: {
    Fugaz: 1,
    Temporal: 2,
    Permanente: 4
  },
  REVERSIBILIDAD: {
    Corto_Plazo: 1,
    Medio_Plazo: 2,
    Largo_Plazo: 3,
    Irreversible: 4
  },
  RECUPERABILIDAD: {
    Inmediata: 1,
    Medio_Plazo: 2,
    Mitigable: 4,
    Largo_Plazo: 6,
    Irrecuperable: 8
  },
  PERIODICIDAD: {
    Aperiodico: 1,
    Periodico: 2,
    Continuo: 4
  },
  MOMENTO: {
    Largo_Plazo: 1,
    Medio_Plazo: 2,
    Inmediato: 4,
    Critico: 4 // Note: prompt says +4
  },
  EFECTO: {
    Directo: 3,
    Secundario: 2,
    Terciario: 1
  }
};

/**
 * Calculates the Importance index based on the formula:
 * Importance = Signo * (3*IN + 2*E + MO + P + RV + SI + AC + PR + MC + EF)
 * Or a variation based on the sum of all components.
 */
export function calculateQualitativeImportance(data: Omit<QualitativeAssessment, 'calculatedImportance'>): number {
  const sum = 
    (3 * data.intensidad) + 
    (2 * data.extension) + 
    data.momento + 
    data.persistencia + 
    data.reversibilidad + 
    data.recuperabilidad + 
    data.acumulacion + 
    data.periodicidad + 
    data.efecto;
  
  return data.signo === '+' ? sum : -sum;
}

/**
 * Calculates normalized value y between 0 and 1 based on the selected function.
 */
export function calculateQuantitativeValue(
  type: string, 
  x: number, 
  min: number, 
  max: number, 
  options?: { umbral?: number; a?: number }
): number {
  const { umbral = 0, a = 0 } = options || {};
  const range = max - min;
  if (range <= 0) return 0;

  let y = 0;

  switch (type) {
    case 'Lineal creciente':
      y = (x - min) / range;
      break;
    case 'Lineal decreciente':
      y = (max - x) / range;
      break;
    case 'Parabólica creciente I':
      y = (-Math.pow(x, 2) + 2 * max * x + Math.pow(min, 2) - 2 * max * min) / Math.pow(range, 2);
      break;
    case 'Parabólica decreciente I':
      y = (Math.pow(x, 2) - 2 * max * x + Math.pow(max, 2)) / Math.pow(range, 2);
      break;
    case 'Parabólica creciente II':
      y = (Math.pow(x, 2) - 2 * min * x + Math.pow(min, 2)) / Math.pow(range, 2);
      break;
    case 'Parabólica decreciente II':
      y = (-Math.pow(x, 2) + 2 * min * x + Math.pow(max, 2) - 2 * min * max) / Math.pow(range, 2);
      break;
    case 'Parabólica doble creciente I':
        if (x <= (max + min) / 2) {
            y = (-2 * Math.pow(x, 2) + 2 * range * x - 2 * max * min) / Math.pow(range, 2);
        } else {
            y = (2 * Math.pow(x, 2) - 2 * range * x + 2 * max * min) / Math.pow(range, 2);
        }
        break;
    case 'Parabólica doble decreciente I':
        if (x <= (max + min) / 2) {
            y = ((2 * Math.pow(x, 2) - 2 * range * x + 2 * max * min) / Math.pow(range, 2)) + 1;
        } else {
            y = (-2 * Math.pow(x, 2) + 2 * range * x - 2 * max * min) / Math.pow(range, 2);
        }
        break;
    case 'Parabólica doble creciente II':
        if (x <= (max + min) / 2) {
            y = (2 * Math.pow(x, 2) - 4 * min * x + 2 * Math.pow(min, 2)) / Math.pow(range, 2);
        } else {
            y = ((-2 * Math.pow(x, 2) + 4 * max * x - 2 * Math.pow(max, 2)) / Math.pow(range, 2)) + 1;
        }
        break;
    case 'Parabólica doble decreciente II':
        if (x <= (max + min) / 2) {
            y = ((-2 * Math.pow(x, 2) + 4 * min * x - 2 * Math.pow(min, 2)) / Math.pow(range, 2)) + 1;
        } else {
            y = (2 * Math.pow(x, 2) - 4 * max * x + 2 * Math.pow(max, 2)) / Math.pow(range, 2);
        }
        break;
    case 'Máximo intermedio':
        const denomMax = Math.pow(a - min, 2);
        y = denomMax === 0 ? 0 : (-Math.pow(x, 2) + 2 * a * x + Math.pow(min, 2) - 2 * a * min) / denomMax;
        break;
    case 'Mínimo intermedio':
        const denomMin = Math.pow(a - min, 2);
        y = denomMin === 0 ? 0 : (Math.pow(x, 2) - 2 * a * x + Math.pow(a, 2)) / denomMin;
        break;
    case 'Umbral creciente':
      y = x < umbral ? 0 : 1;
      break;
    case 'Umbral decreciente':
      y = x < umbral ? 1 : 0;
      break;
    default:
      y = (x - min) / range;
  }

  // Ensure y is clamped between 0 and 1
  return Math.max(0, Math.min(1, y));
}
