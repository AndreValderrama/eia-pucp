'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  PlusCircle, 
  Loader2, 
  Folder, 
  ChevronRight, 
  Users, 
  Calendar, 
  BookOpenText,
  Layers,
  LayoutGrid,
  Map,
  Trash2,
  Anchor,
  Dam,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { projectService } from '@/lib/services/project-service';
import { alternativeService } from '@/lib/services/alternative-service';
import { actionService } from '@/lib/services/action-service';
import type { Project, Alternative } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { generateComparativeReport } from '@/lib/utils/report-generator';
import { impactService } from '@/lib/services/impact-service';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [projects, setProjects] = useState<(Project & { alternatives?: Alternative[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAltDialogOpen, setIsAltDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const projectTypes = actionService.getAvailableProjectTypes();

  const loadData = async () => {
    if (!user) return;
    try {
      const userProjects = await projectService.getUserProjects(user.uid);
      
      // Fetch alternatives for each project
      const projectsWithAlts = await Promise.all(userProjects.map(async (p) => {
        const alts = await alternativeService.getProjectAlternatives(p.id);
        return { ...p, alternatives: alts };
      }));
      
      setProjects(projectsWithAlts);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading]);

  const handleCreateAlternative = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedProjectId) return;
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    try {
      const project = projects.find(p => p.id === selectedProjectId);
      // Initialize alternative framework from parent project template
      const initialTree = project?.actionTree || [];

      const altId = await alternativeService.createAlternative(user.uid, selectedProjectId, {
        name,
        description,
        actionTree: initialTree,
      });

      toast({ title: "Alternative Created" });
      setIsAltDialogOpen(false);
      loadData(); // Refresh list
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'Proyecto Vial': return <Map className="h-4 w-4" />;
      case 'Vertedero': return <Trash2 className="h-4 w-4" />;
      case 'Puerto': return <Anchor className="h-4 w-4" />;
      case 'Presa': return <Dam className="h-4 w-4" />;
      default: return <BookOpenText className="h-4 w-4" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Syncing your EIA workspace...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-6 text-center">
        <div className="bg-primary/10 p-6 rounded-full">
            <LayoutGrid className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
            <h2 className="text-3xl font-headline text-primary">EnviroWise EIA</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
                Professional hierarchical Environmental Impact Assessment. 
                Sign in to start your projects.
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      {/* 1. Templates Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 text-primary/80">
            <BookOpenText className="h-5 w-5" />
            <h2 className="font-headline text-xl font-bold uppercase tracking-wider">Assessment Frameworks</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {projectTypes.map(type => (
                <Card key={type} className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => router.push(`/templates`)}>
                    <CardHeader className="p-4">
                        <div className="bg-muted p-2 rounded-lg w-fit mb-2 group-hover:bg-primary/10 transition-colors">
                            {getTemplateIcon(type)}
                        </div>
                        <CardTitle className="text-sm font-headline group-hover:text-primary transition-colors">{type}</CardTitle>
                        <CardDescription className="text-[10px]">Click to view framework</CardDescription>
                    </CardHeader>
                </Card>
            ))}
        </div>
      </section>

      {/* 2. My Projects Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-primary">
                <Folder className="h-6 w-6" />
                <h1 className="font-headline text-2xl font-bold uppercase tracking-wider">My Active Projects</h1>
            </div>
            <Link href="/projects/create">
                <Button className="shadow-lg">
                    <PlusCircle className="mr-2 h-5 w-5" /> New Project
                </Button>
            </Link>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="shadow-md border-t-4 border-t-primary/60 overflow-hidden">
                <CardHeader className="bg-muted/10 pb-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                    {project.projectType}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> {new Date(project.creationDate).toLocaleDateString()}
                                </span>
                            </div>
                            <CardTitle className="font-headline text-2xl text-primary">{project.name}</CardTitle>
                            <CardDescription>{project.description}</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedProjectId(project.id); setIsAltDialogOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" /> Add Alternative
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-4 border-t">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="alternatives" className="border-none">
                            <AccordionTrigger className="hover:no-underline py-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Layers className="h-4 w-4 text-primary/60" />
                                    Alternatives ({project.alternatives?.length || 0})
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4">
                                {project.alternatives && project.alternatives.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {project.alternatives.map(alt => (
                                            <div key={alt.id} className="p-4 rounded-lg border bg-card hover:border-primary transition-all group flex flex-col gap-4">
                                                <div className="flex justify-between items-start">
                                                    <Link href={`/alternatives/${alt.id}`} className="flex-1">
                                                        <p className="font-headline font-bold text-foreground group-hover:text-primary transition-colors">
                                                            {alt.name}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                                                            {alt.description || 'No description'}
                                                        </p>
                                                    </Link>
                                                    <div className="flex flex-col items-end">
                                                        <Badge variant={alt.valorada ? "default" : "outline"} className="text-[10px] font-mono">
                                                            {(alt.valorTotal || 0).toFixed(3)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                
                                                <div className="pt-2 border-t">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm" 
                                                        className="w-full text-[10px] uppercase tracking-tighter"
                                                        disabled={!alt.effects.every(e => e.character !== 'pending')}
                                                        onClick={async () => {
                                                            const impacts = await impactService.getAlternativeImpacts(alt.id);
                                                            const total = impacts.reduce((sum, i) => sum + (i.qualitative?.calculatedImportance || 0) * i.normalizedWeight * (i.quantitative?.calculatedValue || 0), 0);
                                                            await alternativeService.valuarAlternative(alt.id, total);
                                                            toast({ title: "Alternative Valued", description: `Total score: ${total.toFixed(3)}` });
                                                            loadData();
                                                        }}
                                                    >
                                                        Valorar
                                                    </Button>

                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 border rounded-lg border-dashed bg-muted/5">
                                        <p className="text-xs text-muted-foreground">No alternatives created for this project yet.</p>
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
                <CardFooter className="bg-muted/20 py-3 flex justify-between items-center gap-4 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> Authors: {project.authors.join(', ')}
                    </div>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        className="text-[10px] uppercase tracking-tighter"
                        disabled={(project.alternatives?.filter(a => a.valorada)?.length || 0) < 2}
                        onClick={async () => {
                            const impactsMap: Record<string, Impact[]> = {};
                            for (const alt of (project.alternatives || [])) {
                                impactsMap[alt.id] = await impactService.getAlternativeImpacts(alt.id);
                            }
                            generateComparativeReport(project, project.alternatives || [], impactsMap);
                        }}
                    >
                        Generar Informe Comparativo
                    </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-2 border-dashed p-16 text-center bg-card/50">
             <div className="flex flex-col items-center gap-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Folder className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-headline font-semibold">Ready to begin?</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                    Create your first EIA project to start managing alternatives and assessing impacts.
                  </p>
                </div>
                <Link href="/projects/create">
                  <Button size="lg">Initialize New Project</Button>
                </Link>
             </div>
          </Card>
        )}
      </section>

      {/* Alternative Creation Dialog */}
      <Dialog open={isAltDialogOpen} onOpenChange={setIsAltDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project Alternative</DialogTitle>
            <DialogDescription>This alternative will inherit the project's standardized action framework.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAlternative} className="space-y-4 pt-2">
            <div className="space-y-2">
                <Label htmlFor="name">Alternative Name</Label>
                <Input name="name" required placeholder="e.g. Optimized Route, Clean Tech Option" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea name="description" placeholder="Briefly describe what this alternative entails." />
            </div>
            <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAltDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create Alternative</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
