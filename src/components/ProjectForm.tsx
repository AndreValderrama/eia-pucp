'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LocationSelect from '@/components/LocationSelect';
import type { Group, Project, ProjectLocation, ProjectReportInfo } from '@/lib/types';

export const NO_GROUP = 'none';

const schema = z.object({
  name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().trim().min(10, 'Agrega una breve descripción del proyecto.'),
  projectType: z.string().optional(),
  groupId: z.string(),
  authors: z.string().trim().min(3, 'Indica los autores.'),
  location: z
    .object({ departamento: z.string(), provincia: z.string(), distrito: z.string(), ubigeo: z.string().optional() })
    .optional(),
  codigo: z.string().optional(),
  objetivo: z.string().optional(),
  consultora: z.string().optional(),
  responsable: z.string().optional(),
  fechaEstudio: z.string().optional(),
  superficieHa: z.union([z.coerce.number().min(0, 'No puede ser negativa'), z.literal('')]).optional(),
});

type FormValues = z.infer<typeof schema>;

export interface ProjectFormResult {
  name: string;
  description: string;
  projectType?: string;
  groupId: string | null;
  authors: string[];
  location?: ProjectLocation;
  report: ProjectReportInfo;
}

interface Props {
  initial?: Partial<Project>;
  groups: Group[];
  /** Template choices; shown only when creating a project. */
  projectTypes?: string[];
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (values: ProjectFormResult) => void | Promise<void>;
  onCancel?: () => void;
}

export default function ProjectForm({ initial, groups, projectTypes, submitLabel, submitting, onSubmit, onCancel }: Props) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      projectType: initial?.projectType ?? projectTypes?.[0],
      groupId: initial?.groupId ?? NO_GROUP,
      authors: initial?.authors?.join(', ') ?? '',
      location: initial?.location ?? undefined,
      codigo: initial?.report?.codigo ?? '',
      objetivo: initial?.report?.objetivo ?? '',
      consultora: initial?.report?.consultora ?? '',
      responsable: initial?.report?.responsable ?? '',
      fechaEstudio: initial?.report?.fechaEstudio ?? '',
      superficieHa: initial?.report?.superficieHa ?? '',
    },
  });

  const submit = (v: FormValues) => {
    const report: ProjectReportInfo = {};
    (['codigo', 'objetivo', 'consultora', 'responsable', 'fechaEstudio'] as const).forEach(k => {
      const val = v[k]?.trim();
      if (val) report[k] = val;
    });
    if (v.superficieHa !== '' && v.superficieHa !== undefined) report.superficieHa = Number(v.superficieHa);
    return onSubmit({
      name: v.name,
      description: v.description,
      projectType: v.projectType,
      groupId: v.groupId === NO_GROUP ? null : v.groupId,
      authors: v.authors.split(',').map(s => s.trim()).filter(Boolean),
      location: v.location?.departamento ? v.location : undefined,
      report,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="name">Nombre del proyecto</Label>
        <Input id="name" {...register('name')} placeholder="p. ej. Ampliación de la carretera costera" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" {...register('description')} className="min-h-[90px]" />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {projectTypes && (
          <div className="grid gap-2">
            <Label>Marco de evaluación (plantilla)</Label>
            <Controller
              name="projectType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Selecciona una plantilla" /></SelectTrigger>
                  <SelectContent>{projectTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              )}
            />
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="groupId">Cliente (grupo)</Label>
          <Controller
            name="groupId"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="groupId"><SelectValue placeholder="Sin grupo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GROUP}>Sin cliente (solo yo)</SelectItem>
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">El nombre del grupo es el cliente; sus miembros verán el proyecto.</p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="authors">Autores / colaboradores</Label>
        <Input id="authors" {...register('authors')} placeholder="separados por comas" />
        {errors.authors && <p className="text-xs text-destructive">{errors.authors.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label className="text-sm font-semibold">Ubicación</Label>
        <Controller
          name="location"
          control={control}
          render={({ field }) => <LocationSelect value={field.value} onChange={field.onChange} />}
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold">Datos para el informe</p>
          <p className="text-xs text-muted-foreground">Opcionales; se imprimen en la portada del informe comparativo.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="codigo">Código / expediente</Label>
            <Input id="codigo" {...register('codigo')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fechaEstudio">Fecha del estudio</Label>
            <Input id="fechaEstudio" type="date" {...register('fechaEstudio')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="consultora">Consultora</Label>
            <Input id="consultora" {...register('consultora')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="responsable">Responsable técnico</Label>
            <Input id="responsable" {...register('responsable')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="superficieHa">Superficie del proyecto (ha)</Label>
            <Input id="superficieHa" type="number" step="any" {...register('superficieHa')} />
            {errors.superficieHa && <p className="text-xs text-destructive">{errors.superficieHa.message}</p>}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="objetivo">Objetivo del estudio</Label>
          <Textarea id="objetivo" {...register('objetivo')} className="min-h-[70px]" />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" disabled={submitting}>{submitting ? 'Guardando…' : submitLabel}</Button>
      </div>
    </form>
  );
}
