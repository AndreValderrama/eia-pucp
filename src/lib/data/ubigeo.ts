/**
 * Peru ubigeo (INEI) lookups for departamento → provincia → distrito.
 * The ~200 KB dataset is loaded on demand.
 */
type Row = { departamento: string; provincia: string; distrito: string; nombre: string };

export interface UbigeoOption {
  code: string; // 2 digits (dep), 4 digits (dep+prov) or 6 digits (full ubigeo)
  name: string;
}

let cache: Row[] | null = null;

const fullCode = (r: Row) => r.departamento + r.provincia + r.distrito;

/**
 * Fixes known errors in the ubigeo-peru dataset and drops duplicate codes,
 * so every option has a unique code (and React key).
 * - Bagua province is listed as 01-00-00 (the Amazonas departamento code); its districts are 01-02-xx.
 */
function clean(rows: Row[]): Row[] {
  const fixed = rows.map(r =>
    r.departamento === '01' && r.provincia === '00' && r.distrito === '00' && r.nombre === 'Bagua'
      ? { ...r, provincia: '02' }
      : r
  );
  const seen = new Set<string>();
  return fixed.filter(r => {
    const code = fullCode(r);
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}

export async function loadUbigeo(): Promise<Row[]> {
  if (!cache) {
    const mod = await import('ubigeo-peru/src/ubigeo-inei.json');
    cache = clean((mod.default ?? mod) as Row[]);
  }
  return cache;
}

const byName = (a: UbigeoOption, b: UbigeoOption) => a.name.localeCompare(b.name, 'es');

export const departamentos = (rows: Row[]): UbigeoOption[] =>
  rows
    .filter(r => r.provincia === '00' && r.distrito === '00')
    .map(r => ({ code: r.departamento, name: r.nombre }))
    .sort(byName);

export const provincias = (rows: Row[], depCode: string): UbigeoOption[] =>
  rows
    .filter(r => r.departamento === depCode && r.provincia !== '00' && r.distrito === '00')
    .map(r => ({ code: r.departamento + r.provincia, name: r.nombre }))
    .sort(byName);

export const distritos = (rows: Row[], provCode: string): UbigeoOption[] =>
  rows
    .filter(r => r.departamento + r.provincia === provCode && r.distrito !== '00')
    .map(r => ({ code: r.departamento + r.provincia + r.distrito, name: r.nombre }))
    .sort(byName);
