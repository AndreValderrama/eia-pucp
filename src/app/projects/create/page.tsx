'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FolderPlus, ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { projectService } from '@/lib/services/project-service';
import { actionService } from '@/lib/services/action-service';

const projectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters.'),
  description: z.string().min(10, 'Provide a brief description of the project.'),
  projectType: z.string().min(1, 'Please select a project framework.'),
  authors: z.string().min(3, 'Authors are required.'),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export default function CreateProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const projectTypes = actionService.getAvailableProjectTypes();

  const { register, handleSubmit, control, formState: { errors } } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { projectType: projectTypes[0] }
  });

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: 'Authentication Required', variant: 'destructive' });
      router.push('/');
    }
  }, [user, authLoading, router, toast]);

  const onSubmit = async (data: ProjectFormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const standardActions = actionService.getActionsForType(data.projectType);
      
      const projectId = await projectService.createProject(user.uid, {
        name: data.name,
        description: data.description,
        projectType: data.projectType,
        authors: data.authors.split(',').map(s => s.trim()),
        actionTree: standardActions,
      });

      toast({ title: 'Project Created', description: `"${data.name}" is ready for assessment.` });
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({ title: 'Error', description: 'Could not create project.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin" /></div>;
  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
      </Button>

      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary flex items-center gap-2">
            <FolderPlus className="h-7 w-7" /> New Environmental Project
          </CardTitle>
          <CardDescription>Initialize your EIA project with a standardized action framework.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input id="name" {...register('name')} placeholder="e.g., Coastal Highway Expansion" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="projectType">Assessment Framework (Template)</Label>
              <Controller
                name="projectType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="authors">Authors / Collaborators</Label>
              <Input id="authors" {...register('authors')} placeholder="e.g., Dr. Smith, Jane Doe (comma separated)" />
              {errors.authors && <p className="text-xs text-destructive">{errors.authors.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Project Description</Label>
              <Textarea id="description" {...register('description')} className="min-h-[100px]" />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Initializing...' : 'Create Project Framework'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
