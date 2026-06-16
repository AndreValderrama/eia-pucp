'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Loader2, Folder, ChevronRight, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { projectService } from '@/lib/services/project-service';
import type { Project } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      if (user) {
        try {
          const data = await projectService.getUserProjects(user.uid);
          setProjects(data);
        } catch (error) {
          console.error("Error loading projects:", error);
        } finally {
          setLoading(false);
        }
      } else if (!authLoading) {
        setLoading(false);
      }
    }
    loadProjects();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your projects...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-6 text-center">
        <div className="bg-primary/10 p-6 rounded-full">
            <Folder className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
            <h2 className="text-3xl font-headline text-primary">EnviroWise EIA</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
                The professional tool for hierarchical Environmental Impact Assessments. 
                Sign in to manage your projects and frameworks.
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="font-headline text-3xl text-primary">My Projects</h1>
            <p className="text-muted-foreground">Manage your assessment frameworks and alternatives.</p>
        </div>
        <Link href="/projects/create">
          <Button className="shadow-lg">
            <PlusCircle className="mr-2 h-5 w-5" /> New Project
          </Button>
        </Link>
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="group">
                <Card className="h-full hover:shadow-xl transition-all border-t-4 border-t-primary/40 group-hover:border-t-primary">
                    <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                {project.projectType}
                            </Badge>
                        </div>
                        <CardTitle className="font-headline text-xl group-hover:text-primary transition-colors">
                            {project.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 min-h-[40px]">
                            {project.description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="truncate">{project.authors.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(project.creationDate).toLocaleDateString()}</span>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t bg-muted/20 flex justify-end group-hover:bg-primary/5 transition-colors py-3">
                        <span className="text-xs font-medium text-primary flex items-center">
                            Open Project <ChevronRight className="ml-1 h-3 w-3" />
                        </span>
                    </CardFooter>
                </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-2 border-dashed p-16 text-center bg-card/50">
           <div className="flex flex-col items-center gap-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <Folder className="h-12 w-12 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-headline font-semibold">No Projects Yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                  Start by creating your first project and selecting an environmental framework.
                </p>
              </div>
              <Link href="/projects/create" className="mt-4">
                <Button size="lg">
                    <PlusCircle className="mr-2 h-5 w-5" /> Initialize First Project
                </Button>
              </Link>
           </div>
        </Card>
      )}
    </div>
  );
}
