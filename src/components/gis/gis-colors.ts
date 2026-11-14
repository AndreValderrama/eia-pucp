import type { StationVariables } from '@/lib/types';
import { toNumber } from '@/lib/utils/gis-parse';

/** Sequential blue → red ramp for the selected station variable. */
export const RAMP_COLORS = ['#2563eb', '#06b6d4', '#84cc16', '#f59e0b', '#dc2626'];

export const variableRange = (variables: StationVariables | null, column: string | null) => {
  if (!variables || !column) return null;
  const values = variables.rows.map(r => toNumber(r[column])).filter((n): n is number => n !== null);
  if (!values.length) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
};

export const rampColor = (value: number | null, range: { min: number; max: number } | null) => {
  if (value === null || !range) return '#9ca3af';
  const t = range.max === range.min ? 0.5 : (value - range.min) / (range.max - range.min);
  return RAMP_COLORS[Math.min(RAMP_COLORS.length - 1, Math.floor(t * RAMP_COLORS.length))];
};
