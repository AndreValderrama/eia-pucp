'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FolderPlus, ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { projectService } from '@/lib/services/project-service';
import { actionService } from '@/lib/services/action-service';
import { groupService } from '@/lib/services/group-service';
import type { Group } from '@/lib/types';
import ProjectForm, { ProjectFormResult } from '@/components/ProjectForm';

export default function CreateProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const projectTypes = actionService.getAvailableProjectTypes();

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: 'Inicia sesión para crear un proyecto', variant: 'destructive' });
      router.push('/');
    }
  }, [user, authLoading, router, toast]);

  useEffect(() => {
    if (user?.email) groupService.getMyGroups(user.email).then(setGroups).catch(console.error);
  }, [user]);

  const onSubmit = async (data: ProjectFormResult) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const projectType = data.projectType || projectTypes[0];
      const projectId = await projectService.createProject(user.uid, {
        name: data.name,
        description: data.description,
        projectType,
        authors: data.authors,
        actionTree: actionService.getActionsForType(projectType),
        groupId: data.groupId,
        ...(data.location && { location: data.location }),
        report: data.report,
      });
      toast({ title: 'Proyecto creado', description: `"${data.name}" está listo para evaluarse.` });
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({ title: 'Error', description: 'No se pudo crear el proyecto.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin" /></div>;
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Volver al panel</Link>
      </Button>

      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary flex items-center gap-2">
            <FolderPlus className="h-7 w-7" /> Nuevo proyecto ambiental
          </CardTitle>
          <CardDescription>Crea el proyecto con un marco estándar de acciones. Después podrás subir sus capas SIG.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm
            groups={groups}
            projectTypes={projectTypes}
            submitLabel="Crear proyecto"
            submitting={isSubmitting}
            onSubmit={onSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
