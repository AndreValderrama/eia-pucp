'use client';

import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProjectLocation } from '@/lib/types';
import { loadUbigeo, departamentos, provincias, distritos } from '@/lib/data/ubigeo';

type Rows = Awaited<ReturnType<typeof loadUbigeo>>;

interface Props {
  value?: ProjectLocation;
  onChange: (value: ProjectLocation | undefined) => void;
}

/** Cascading departamento → provincia → distrito picker (INEI ubigeo). */
export default function LocationSelect({ value, onChange }: Props) {
  const [rows, setRows] = useState<Rows | null>(null);
  useEffect(() => { loadUbigeo().then(setRows).catch(console.error); }, []);

  // Codes are derived from the stored ubigeo, or matched by name for older data.
  const deps = useMemo(() => (rows ? departamentos(rows) : []), [rows]);
  const depCode = value?.ubigeo?.slice(0, 2) || deps.find(d => d.name === value?.departamento)?.code || '';
  const provs = useMemo(() => (rows && depCode ? provincias(rows, depCode) : []), [rows, depCode]);
  const provCode = value?.ubigeo && value.ubigeo.length >= 4 ? value.ubigeo.slice(0, 4) : provs.find(p => p.name === value?.provincia)?.code || '';
  const dists = useMemo(() => (rows && provCode ? distritos(rows, provCode) : []), [rows, provCode]);
  const distCode = value?.ubigeo?.length === 6 ? value.ubigeo : dists.find(d => d.name === value?.distrito)?.code || '';

  const loading = !rows;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="grid gap-1.5">
        <Label>Departamento</Label>
        <Select
          value={depCode}
          disabled={loading}
          onValueChange={code => {
            const d = deps.find(x => x.code === code)!;
            onChange({ departamento: d.name, provincia: '', distrito: '', ubigeo: code });
          }}
        >
          <SelectTrigger><SelectValue placeholder={loading ? 'Cargando…' : 'Selecciona'} /></SelectTrigger>
          <SelectContent>{deps.map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Provincia</Label>
        <Select
          value={provCode}
          disabled={!depCode}
          onValueChange={code => {
            const p = provs.find(x => x.code === code)!;
            onChange({ departamento: value!.departamento, provincia: p.name, distrito: '', ubigeo: code });
          }}
        >
          <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
          <SelectContent>{provs.map(p => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Distrito</Label>
        <Select
          value={distCode}
          disabled={!provCode}
          onValueChange={code => {
            const d = dists.find(x => x.code === code)!;
            onChange({ departamento: value!.departamento, provincia: value!.provincia, distrito: d.name, ubigeo: code });
          }}
        >
          <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
          <SelectContent>{dists.map(d => <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
}
