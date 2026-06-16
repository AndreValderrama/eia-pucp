'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { projectService } from '@/lib/services/project-service';
import { alternativeService } from '@/lib/services/alternative-service';
import type { Project, Alternative, ActionNode } from '@/lib/types';
import { 
  Folder, 
  Settings2, 
  Layers, 
  PlusCircle, 
  Loader2, 
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ActionTree from '@/components/ActionTree';
import ProjectInfo from '@/components/ProjectInfo';
import AlternativeCard from '@/components/AlternativeCard';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const actionNodeSchema = z.object({
  name: z.string().min(2, "Name is too short"),
});
type ActionNodeValues = z.infer<typeof actionNodeSchema>;

const alternativeSchema = z.object({
  name: z.string().min(3, "Name is too short"),
  description: z.string().optional(),
});
type AlternativeFormValues = z.infer<typeof alternativeSchema>;

export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modals state
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [editingActionNode, setEditingActionNode] = useState<ActionNode | null>(null);
  const [parentIdForNewAction, setParentIdForNewAction] = useState<string | null>(null);

  const [isAltDialogOpen, setIsAltDialogOpen] = useState(false);

  const { register: regAction, handleSubmit: handleSubAction, reset: resetAction } = useForm<ActionNodeValues>({
    resolver: zodResolver(actionNodeSchema),
  });

  const { register: regAlt, handleSubmit: handleSubAlt, reset: resetAlt } = useForm<AlternativeFormValues>({
    resolver: zodResolver(alternativeSchema),
  });

  const loadData = useCallback(async () => {
    try {
      const [projData, altsData] = await Promise.all([
        projectService.getProject(id),
        alternativeService.getProjectAlternatives(id)
      ]);
      if (projData) setProject(projData);
      setAlternatives(altsData);
    } catch (error) {
      toast({ title: "Error", description: "Could not load project.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (!authLoading && user) loadData();
    else if (!authLoading) setLoading(false);
  }, [authLoading, user, loadData]);

  // --- Framework CRUD ---
  const handleSaveFramework = async (newTree: ActionNode[]) => {
    setIsSaving(true);
    try {
      await projectService.updateProjectFramework(id, newTree);
      setProject(prev => prev ? { ...prev, actionTree: newTree } : null);
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const onActionSubmit = async (data: ActionNodeValues) => {
    if (!project) return;
    let newTree = [...(project.actionTree || [])];

    const updateRecursive = (items: ActionNode[]): ActionNode[] => {
      return items.map(item => {
        if (item.id === editingActionNode?.id) return { ...item, ...data };
        if (item.children) return { ...item, children: updateRecursive(item.children) };
        return item;
      });
    };

    const addRecursive = (items: ActionNode[]): ActionNode[] => {
      if (parentIdForNewAction === null) {
        const newNode: ActionNode = { id: `a-${Date.now()}`, name: data.name, type: 'phase', children: [] };
        return [...items, newNode];
      }
      return items.map(item => {
        if (item.id === parentIdForNewAction) {
          const type = item.type === 'phase' ? 'labor' : 'action';
          const newNode: ActionNode = { id: `a-${Date.now()}`, name: data.name, type, children: type === 'action' ? undefined : [] };
          return { ...item, children: [...(item.children || []), newNode] };
        }
        if (item.children) return { ...item, children: addRecursive(item.children) };
        return item;
      });
    };

    newTree = editingActionNode ? updateRecursive(newTree) : addRecursive(newTree);
    await handleSaveFramework(newTree);
    setIsActionDialogOpen(false);
  };

  const onDeleteAction = async (nodeId: string) => {
    if (!project) return;
    const deleteRecursive = (items: ActionNode[]): ActionNode[] => {
      return items.filter(item => item.id !== nodeId).map(item => ({
        ...item,
        children: item.children ? deleteRecursive(item.children) : undefined
      }));
    };
    await handleSaveFramework(deleteRecursive(project.actionTree || []));
  };

  // --- Alternative CRUD ---
  const onAltSubmit = async (data: AlternativeFormValues) => {
    if (!user) return;
    try {
      const altId = await alternativeService.createAlternative(user.uid, id, {
        name: data.name,
        description: data.description || '',
      });
      toast({ title: "Alternative Created" });
      loadData();
      setIsAltDialogOpen(false);
      resetAlt();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (authLoading || loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin" /></div>;
  if (!project) return <div className="p-12 text-center">Project not found.</div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Button variant="outline" size="sm" asChild>
        <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
      </Button>

      <ProjectInfo project={project} />

      <Tabs defaultValue="alternatives" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="alternatives" className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Alternatives
          </TabsTrigger>
          <TabsTrigger value="framework" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Action Framework
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alternatives" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-headline text-primary">Project Alternatives</h2>
            <Button onClick={() => setIsAltDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Alternative
            </Button>
          </div>
          
          {alternatives.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alternatives.map(alt => (
                <AlternativeCard key={alt.id} alternative={alt} />
              ))}
            </div>
          ) : (
            <div className="p-12 border-2 border-dashed rounded-xl text-center text-muted-foreground">
              No alternatives yet. Create one to start assessing impacts.
            </div>
          )}
        </TabsContent>

        <TabsContent value="framework" className="mt-6">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-headline">Master Action Framework</CardTitle>
                <CardDescription>Define the standardized Phases, Labors, and Actions for all project alternatives.</CardDescription>
              </div>
              <Button size="sm" onClick={() => handleOpenAddAction(null)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Phase
              </Button>
            </CardHeader>
            <CardContent>
              <ActionTree 
                nodes={project.actionTree || []} 
                onEdit={handleOpenEditAction}
                onAddChild={(pid) => handleOpenAddAction(pid)}
                onDelete={onDeleteAction}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline">{editingActionNode ? 'Edit Framework Item' : 'Add Framework Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubAction(onActionSubmit)} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input {...regAction('name')} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSaving}>Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alternative Dialog */}
      <Dialog open={isAltDialogOpen} onOpenChange={setIsAltDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline">Create New Alternative</DialogTitle>
            <DialogDescription>This alternative will use the Master Action Framework defined for this project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubAlt(onAltSubmit)} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label>Alternative Name</Label>
              <Input {...regAlt('name')} placeholder="e.g., Option A (Baseline)" />
            </div>
            <div className="grid gap-2">
              <Label>Description (Optional)</Label>
              <Textarea {...regAlt('description')} />
            </div>
            <DialogFooter>
              <Button type="submit">Create Alternative</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  function handleOpenEditAction(node: ActionNode) {
    setEditingActionNode(node);
    setParentIdForNewAction(null);
    resetAction({ name: node.name });
    setIsActionDialogOpen(true);
  }

  function handleOpenAddAction(parentId: string | null) {
    setEditingActionNode(null);
    setParentIdForNewAction(parentId);
    resetAction({ name: '' });
    setIsActionDialogOpen(true);
  }
}
