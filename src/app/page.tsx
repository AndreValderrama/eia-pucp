
'use client';

import ProjectInfo from '@/components/ProjectInfo';
import AlternativeCard from '@/components/AlternativeCard';
import { Button } from '@/components/ui/button';
import { mockProject } from '@/lib/mockData';
import Link from 'next/link';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Project, Alternative } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { alternativeService } from '@/lib/services/alternative-service';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Project is still mock for now, we'll fix that later if needed
    setProject(mockProject as any);

    async function loadData() {
      if (user) {
        try {
          const data = await alternativeService.getUserAlternatives(user.uid);
          setAlternatives(data);
        } catch (error) {
          console.error("Error loading alternatives:", error);
        } finally {
          setLoading(false);
        }
      } else if (!authLoading) {
        setLoading(false);
      }
    }

    loadData();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4 text-center">
        <h2 className="text-2xl font-headline text-primary">Welcome to EnviroWise EIA</h2>
        <p className="text-muted-foreground max-w-md">Please sign in to view your projects and environmental impact assessments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {project && <ProjectInfo project={project as any} />}

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline text-2xl text-primary">Your Project Alternatives</h2>
          <Link href="/alternatives/create" passHref>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Alternative
            </Button>
          </Link>
        </div>
        {alternatives.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alternatives.map((alt) => (
              <AlternativeCard key={alt.id} alternative={alt} />
            ))}
          </div>
        ) : (
          <div className="bg-card border-2 border-dashed rounded-xl p-12 text-center">
             <p className="text-muted-foreground mb-4">No alternatives defined yet. Create one to get started with your assessment.</p>
             <Link href="/alternatives/create">
                <Button variant="outline">Create Your First Alternative</Button>
             </Link>
          </div>
        )}
      </section>
    </div>
  );
}
