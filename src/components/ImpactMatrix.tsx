'use client';

import { useMemo } from 'react';
import type { ActionNode, EnvironmentalFactor, Impact, ImpactImportance } from '@/lib/types';
import { IMPORTANCE_LABEL } from '@/lib/utils/impact-calculations';

export type MatrixMode = 'identification' | 'screening' | 'valuation';

interface ImpactMatrixProps {
  actionTree: ActionNode[];
  factors: EnvironmentalFactor[]; // leaf factors
  impacts: Impact[];
  mode: MatrixMode;
  memberCount: number;
  onCellClick?: (action: ActionNode, factor: EnvironmentalFactor, impact?: Impact) => void;
}

const CELL_STYLE: Record<ImpactImportance, string> = {
  significativo: 'bg-orange-600 text-white',
  notable: 'bg-amber-400 text-amber-950',
  difuso: 'bg-blue-500 text-white',
  despreciable: 'bg-slate-300 text-slate-800 dark:bg-slate-600 dark:text-slate-100',
};

/** Final valuation of an impact: weight × importance × magnitude, or null if not evaluated yet. */
export const impactScore = (impact: Impact) =>
  impact.qualitative && impact.quantitative
    ? impact.normalizedWeight * impact.qualitative.calculatedImportance * impact.quantitative.calculatedValue
    : null;

type Row = { action: ActionNode; path: string };

const leafRows = (nodes: ActionNode[], path: string[] = []): Row[] =>
  nodes.flatMap(node =>
    node.children && node.children.length
      ? leafRows(node.children, [...path, node.name])
      : [{ action: node, path: path.join(' › ') }]
  );

export default function ImpactMatrix({ actionTree, factors, impacts, mode, memberCount, onCellClick }: ImpactMatrixProps) {
  const rows = useMemo(() => leafRows(actionTree), [actionTree]);
  const byCell = useMemo(() => {
    const map = new Map<string, Impact>();
    impacts.forEach(i => map.set(`${i.actionId}|${i.factorId}`, i));
    return map;
  }, [impacts]);

  if (!rows.length || !factors.length) {
    return (
      <div className="p-8 border-2 border-dashed rounded-xl text-center text-sm text-muted-foreground">
        La matriz aparecerá cuando la alternativa tenga acciones y el proyecto tenga factores.
      </div>
    );
  }

  const factorTotals = factors.map(f => impacts.filter(i => i.factorId === f.id).length);
  const scoreRange = Math.max(1e-9, ...impacts.map(i => Math.abs(impactScore(i) ?? 0)));

  const renderCell = (impact?: Impact) => {
    if (!impact) return null;
    if (mode === 'identification') return <span className="font-bold text-primary">X</span>;
    if (mode === 'screening') {
      const voted = Object.keys(impact.votes || {}).length;
      return (
        <span
          className={`inline-flex flex-col items-center justify-center rounded w-full h-full leading-none ${CELL_STYLE[impact.importance]}`}
          title={`${IMPORTANCE_LABEL[impact.importance]} · ${voted}/${memberCount} votos`}
        >
          <span className="font-bold text-xs">{impact.importance[0].toUpperCase()}</span>
          <span className="text-[9px] opacity-80">{voted}/{memberCount}</span>
        </span>
      );
    }
    const score = impactScore(impact);
    if (score === null) return <span className="text-muted-foreground text-[10px]">—</span>;
    const intensity = Math.abs(score) / scoreRange;
    const color = score < 0 ? `rgba(220, 38, 38, ${0.15 + intensity * 0.6})` : `rgba(22, 163, 74, ${0.15 + intensity * 0.6})`;
    return (
      <span className="inline-flex items-center justify-center rounded w-full h-full font-mono text-[10px]" style={{ background: color }}>
        {score.toFixed(1)}
      </span>
    );
  };

  return (
    <div className="space-y-2">
      <div className="overflow-auto max-h-[70vh] rounded-xl border bg-card">
        <table className="border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-card">
            <tr>
              <th className="sticky left-0 z-30 bg-card border-b border-r p-2 text-left min-w-[220px] align-bottom">
                <span className="text-amber-600 font-bold uppercase tracking-wider">Acciones</span>
                <span className="text-muted-foreground"> \ </span>
                <span className="text-primary font-bold uppercase tracking-wider">Factores</span>
              </th>
              {factors.map(f => (
                <th key={f.id} className="border-b border-r p-1 align-bottom min-w-[36px] max-w-[36px] h-40">
                  <div
                    className="mx-auto [writing-mode:vertical-rl] rotate-180 whitespace-nowrap overflow-hidden text-ellipsis max-h-36 font-medium"
                    title={f.name}
                  >
                    {f.name}
                  </div>
                </th>
              ))}
              <th className="border-b p-1 align-bottom text-muted-foreground font-semibold">Σ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ action, path }) => {
              const rowImpacts = impacts.filter(i => i.actionId === action.id);
              return (
                <tr key={action.id} className="hover:bg-muted/40">
                  <th className="sticky left-0 z-10 bg-card border-b border-r p-2 text-left font-normal">
                    {path && <div className="text-[10px] text-muted-foreground truncate max-w-[260px]">{path}</div>}
                    <div className="font-medium truncate max-w-[260px]" title={action.name}>{action.name}</div>
                  </th>
                  {factors.map(f => {
                    const impact = byCell.get(`${action.id}|${f.id}`);
                    return (
                      <td
                        key={f.id}
                        className={`border-b border-r text-center h-9 w-9 p-0.5 ${onCellClick ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 hover:ring-inset' : ''}`}
                        onClick={() => onCellClick?.(action, f, impact)}
                        title={impact ? `${action.name} → ${f.name}` : `Vincular ${action.name} → ${f.name}`}
                      >
                        {renderCell(impact)}
                      </td>
                    );
                  })}
                  <td className="border-b text-center font-semibold text-muted-foreground px-2">{rowImpacts.length || ''}</td>
                </tr>
              );
            })}
            <tr className="bg-muted/30">
              <th className="sticky left-0 z-10 bg-muted border-r p-2 text-left text-muted-foreground">Σ impactos por factor</th>
              {factorTotals.map((t, i) => (
                <td key={factors[i].id} className="border-r text-center font-semibold text-muted-foreground">{t || ''}</td>
              ))}
              <td className="text-center font-bold text-primary">{impacts.length}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {mode === 'screening' && (
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {(Object.keys(CELL_STYLE) as ImpactImportance[]).map(k => (
            <span key={k} className="flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded ${CELL_STYLE[k]}`} /> {IMPORTANCE_LABEL[k]}
            </span>
          ))}
          <span>· número = votos emitidos / miembros</span>
        </div>
      )}
      {mode === 'valuation' && (
        <p className="text-[11px] text-muted-foreground">
          Valor = peso normalizado × importancia × magnitud. Rojo perjudicial, verde beneficioso; “—” aún sin valorar.
        </p>
      )}
    </div>
  );
}
