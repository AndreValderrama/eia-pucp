'use client';

import { useMemo } from 'react';
import {
  CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { QuantitativeAssessment } from '@/lib/types';
import { calculateQuantitativeValue } from '@/lib/utils/impact-calculations';

export const TRANSFORMATION_FUNCTIONS = [
  'Lineal creciente',
  'Lineal decreciente',
  'Parabólica creciente I',
  'Parabólica decreciente I',
  'Parabólica creciente II',
  'Parabólica decreciente II',
  'Parabólica doble creciente I',
  'Parabólica doble decreciente I',
  'Parabólica doble creciente II',
  'Parabólica doble decreciente II',
  'Máximo intermedio',
  'Mínimo intermedio',
  'Umbral creciente',
  'Umbral decreciente',
];

const STEPS = 80;
const fmt = (n: number) => (Math.abs(n) >= 1000 || Number.isInteger(n) ? String(Math.round(n * 100) / 100) : n.toFixed(2));

interface Props {
  quantitative: QuantitativeAssessment;
  setQuantitative: (q: QuantitativeAssessment) => void;
}

export default function QuantitativeFunctionPanel({ quantitative: q, setQuantitative }: Props) {
  const validRange = q.max > q.min;
  const usesA = q.functionType.includes('intermedio');
  const usesUmbral = q.functionType.includes('Umbral');
  const opts = { umbral: q.umbral, a: q.a };

  const data = useMemo(() => {
    if (!validRange) return [];
    return Array.from({ length: STEPS + 1 }, (_, i) => {
      const x = q.min + (i / STEPS) * (q.max - q.min);
      return { x, y: calculateQuantitativeValue(q.functionType, x, q.min, q.max, opts) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.functionType, q.min, q.max, q.umbral, q.a, validRange]);

  const y = validRange ? calculateQuantitativeValue(q.functionType, q.x, q.min, q.max, opts) : 0;
  const xOutside = validRange && (q.x < q.min || q.x > q.max);
  const set = (patch: Partial<QuantitativeAssessment>) => setQuantitative({ ...q, ...patch });
  const num = (v: string) => (v === '' ? 0 : Number(v));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Función de transformación</Label>
        <Select value={q.functionType} onValueChange={v => set({ functionType: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TRANSFORMATION_FUNCTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="q-min">Mínimo</Label>
          <Input id="q-min" type="number" value={q.min} onChange={e => set({ min: num(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="q-max">Máximo</Label>
          <Input id="q-max" type="number" value={q.max} onChange={e => set({ max: num(e.target.value) })} aria-invalid={!validRange} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="q-x">Valor (x)</Label>
          <Input id="q-x" type="number" value={q.x} onChange={e => set({ x: num(e.target.value) })} aria-invalid={xOutside} />
        </div>
        {usesA && (
          <div className="space-y-1">
            <Label htmlFor="q-a">Punto óptimo (a)</Label>
            <Input id="q-a" type="number" value={q.a ?? 0} onChange={e => set({ a: num(e.target.value) })} />
          </div>
        )}
        {usesUmbral && (
          <div className="space-y-1">
            <Label htmlFor="q-u">Umbral</Label>
            <Input id="q-u" type="number" value={q.umbral ?? 0} onChange={e => set({ umbral: num(e.target.value) })} />
          </div>
        )}
      </div>

      {!validRange ? (
        <div className="h-56 rounded-lg border border-dashed flex items-center justify-center text-sm text-destructive">
          El máximo debe ser mayor que el mínimo.
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/10 p-2">
          <div className="flex items-center justify-between px-2 pb-1 text-xs">
            <span className="text-muted-foreground">Curva de calidad ambiental</span>
            <span className="font-mono">
              x = {fmt(q.x)} → <span className="font-bold text-primary">y = {y.toFixed(3)}</span>
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 16, bottom: 18, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="x" type="number" domain={[q.min, q.max]} tickFormatter={fmt} tick={{ fontSize: 11 }}
                  label={{ value: 'Indicador (x)', position: 'insideBottom', offset: -10, fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tick={{ fontSize: 11 }} width={40}
                  label={{ value: 'Calidad (y)', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number) => [v.toFixed(3), 'y']}
                  labelFormatter={(v: number) => `x = ${fmt(v)}`}
                />
                {usesUmbral && <ReferenceLine x={q.umbral} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'umbral', fontSize: 10, position: 'top' }} />}
                {usesA && <ReferenceLine x={q.a} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'a', fontSize: 10, position: 'top' }} />}
                <Line type="monotone" dataKey="y" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                {!xOutside && (
                  <>
                    <ReferenceLine x={q.x} stroke="hsl(var(--primary))" strokeOpacity={0.35} />
                    <ReferenceLine y={y} stroke="hsl(var(--primary))" strokeOpacity={0.35} />
                    <ReferenceDot x={q.x} y={y} r={6} fill="hsl(var(--primary))" stroke="white" strokeWidth={2} />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {xOutside && (
            <p className="px-2 text-xs text-amber-600">x está fuera del rango [mín, máx]; la magnitud se recorta a {y.toFixed(0)}.</p>
          )}
        </div>
      )}
    </div>
  );
}
