import type { Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CalendarDays, Info } from 'lucide-react';

interface ProjectInfoProps {
  project: Project;
}

export default function ProjectInfo({ project }: ProjectInfoProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-3xl text-primary flex items-center gap-2">
          <Info className="h-8 w-8" />
          {project.name}
          {project.projectType && (
             <span className="ml-2 text-sm font-body font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
               {project.projectType}
             </span>
          )}
        </CardTitle>
        <CardDescription className="text-base">{project.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="h-5 w-5" />
          <span>Created: {new Date(project.creationDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-5 w-5" />
          <span>Authors: {project.authors.join(', ')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
