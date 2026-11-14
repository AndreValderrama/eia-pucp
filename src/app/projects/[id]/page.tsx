'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ChevronLeft, Loader2, Pencil, MapPin, Map as MapIcon, Info, Layers, Users, Settings2, FileText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { projectService } from '@/lib/services/project-service';
import { alternativeService } from '@/lib/services/alternative-service';
import { groupService } from '@/lib/services/group-service';
import type { Alternative, Group, Project } from '@/lib/types';
import ProjectForm, { ProjectFormResult } from '@/components/ProjectForm';
import GisPanel from '@/components/gis/GisPanel';

const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="space-y-0.5">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="text-sm">{value || <span className="text-muted-foreground">—</span>}</dd>
  </div>
);

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [p, alts, groups] = await Promise.all([
        projectService.getProject(id),
        alternativeService.getProjectAlternatives(id),
        user.email ? groupService.getMyGroups(user.email) : Promise.resolve([]),
      ]);
      setProject(p);
      setAlternatives(alts);
      setMyGroups(groups);
      setGroup(p?.groupId ? groups.find(g => g.id === p.groupId) ?? (await groupService.getGroup(p.groupId).catch(() => null)) : null);
    } catch (err) {
      console.error('Error loading project:', err);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (user) load();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, load]);

  const handleSave = async (data: ProjectFormResult) => {
    if (!project) return;
    setSaving(true);
    try {
      await projectService.updateProject(project.id, {
        name: data.name,
        description: data.description,
        authors: data.authors,
        groupId: data.groupId,
        location: data.location ?? null,
        report: data.report,
      });
      toast({ title: 'Proyecto actualizado' });
      setEditOpen(false);
      await load();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'No se pudo guardar el proyecto.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) return <div className="flex justify-center p-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <div className="p-12 text-center text-muted-foreground">Inicia sesión para ver el proyecto.</div>;
  if (!project) return <div className="p-12 text-center">Proyecto no encontrado.</div>;

  const loc = project.location;
  const r = project.report || {};

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Panel</Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${project.id}/framework`}><Settings2 className="h-4 w-4 mr-1" />Marco de acciones</Link>
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4 mr-1" />Editar proyecto</Button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {project.projectType && <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{project.projectType}</Badge>}
          {group && <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />Cliente: {group.name}</Badge>}
          {loc && <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{[loc.distrito, loc.provincia, loc.departamento].filter(Boolean).join(', ')}</Badge>}
        </div>
        <h1 className="font-headline text-3xl text-primary">{project.name}</h1>
        <p className="text-muted-foreground max-w-3xl">{project.description}</p>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info" className="gap-2"><Info className="h-4 w-4" />Información</TabsTrigger>
          <TabsTrigger value="gis" className="gap-2"><MapIcon className="h-4 w-4" />Mapa SIG</TabsTrigger>
          <TabsTrigger value="alternatives" className="gap-2"><Layers className="h-4 w-4" />Alternativas ({alternatives.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Datos generales</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <Field label="Nombre" value={project.name} />
                  <Field label="Cliente (grupo)" value={group?.name} />
                  <Field label="Departamento" value={loc?.departamento} />
                  <Field label="Provincia" value={loc?.provincia} />
                  <Field label="Distrito" value={loc?.distrito} />
                  <Field label="Ubigeo" value={loc?.ubigeo} />
                  <Field label="Autores" value={project.authors?.join(', ')} />
                  <Field label="Creado" value={project.creationDate ? new Date(project.creationDate).toLocaleDateString() : undefined} />
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Datos para el informe</CardTitle>
                <CardDescription>Se imprimen en la portada del informe comparativo.</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <Field label="Código / expediente" value={r.codigo} />
                  <Field label="Fecha del estudio" value={r.fechaEstudio} />
                  <Field label="Consultora" value={r.consultora} />
                  <Field label="Responsable técnico" value={r.responsable} />
                  <Field label="Superficie (ha)" value={r.superficieHa?.toString()} />
                  <div className="col-span-2"><Field label="Objetivo" value={r.objetivo} /></div>
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gis" className="mt-6">
          <GisPanel projectId={project.id} userEmail={user.email || ''} />
        </TabsContent>

        <TabsContent value="alternatives" className="mt-6">
          {alternatives.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {alternatives.map(alt => (
                <Link key={alt.id} href={`/alternatives/${alt.id}`}>
                  <Card className="hover:border-primary transition-colors h-full">
                    <CardHeader>
                      <CardTitle className="text-base">{alt.name}</CardTitle>
                      <CardDescription className="line-clamp-2">{alt.description || 'Sin descripción'}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      {alt.valorada ? `Valor total: ${(alt.valorTotal ?? 0).toFixed(3)}` : 'Sin valorar'}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-8 text-center">
              Aún no hay alternativas. Créalas desde el panel con “Add Alternative”.
            </p>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar proyecto</DialogTitle>
            <DialogDescription>Cambia los datos generales, la ubicación, el cliente y los datos del informe.</DialogDescription>
          </DialogHeader>
          <ProjectForm
            initial={project}
            groups={group && !myGroups.some(g => g.id === group.id) ? [...myGroups, group] : myGroups}
            submitLabel="Guardar cambios"
            submitting={saving}
            onSubmit={handleSave}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
