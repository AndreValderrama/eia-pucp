'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FuzzyLogicAssistant from '@/components/FuzzyLogicAssistant';
import EffectCard from '@/components/EffectCard';
import ActionTree from '@/components/ActionTree';
import type { Alternative, Effect, EnvironmentalFactor, ActionNode, Project } from '@/lib/types';
import type { EffectCharacterInferenceOutput } from '@/ai/flows/effect-character-inference';
import { Layers, PlusCircle, ChevronLeft, Edit3, BrainCircuit, Loader2, Settings2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { alternativeService } from '@/lib/services/alternative-service';
import { factorService } from '@/lib/services/factor-service';
import { actionService } from '@/lib/services/action-service';
import { projectService } from '@/lib/services/project-service';
import { useAuth } from '@/lib/auth-context';

const effectFormSchema = z.object({
  actionName: z.string().min(3, "Action name is required."),
  actionDescription: z.string().min(10, "Action description is required."),
  factorName: z.string().min(1, "Environmental factor is required."),
  description: z.string().min(10, "Effect description is required."),
  idoneityScore: z.coerce.number().min(0).max(100).default(50),
});
type EffectFormValues = z.infer<typeof effectFormSchema>;

export default function AlternativeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const id = params.id as string;

  const [alternative, setAlternative] = useState<Alternative | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [availableFactors, setAvailableFactors] = useState<EnvironmentalFactor[]>([]);
  const [actionTree, setActionTree] = useState<ActionNode[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isEffectDialogOpen, setIsEffectDialogOpen] = useState(false);
  const [editingEffect, setEditingEffect] = useState<Effect | null>(null);
  const [selectedEffectForAI, setSelectedEffectForAI] = useState<Effect | undefined>(undefined);

  const { control, handleSubmit, register, reset, setValue, formState: { errors: effectFormErrors } } = useForm<EffectFormValues>({
    resolver: zodResolver(effectFormSchema),
    defaultValues: { idoneityScore: 50 }
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const altData = await alternativeService.getAlternative(id);
      if (altData) {
        setAlternative(altData);
        setEffects(altData.effects || []);
        
        // Load parent project and factors
        const [projData, factorTree] = await Promise.all([
            projectService.getProject(altData.projectId),
            factorService.getUserFactors(user.uid)
        ]);
        
        if (projData) {
            setProject(projData);
            setActionTree(projData.actionTree || []);
        }
        setAvailableFactors(factorService.getLeafFactors(factorTree));
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Could not load alternative details.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, user, toast]);

  useEffect(() => {
    if (!authLoading && user) loadData();
    else if (!authLoading) setLoading(false);
  }, [authLoading, user, loadData]);

  // --- Effect Handlers ---
  const handleEffectSubmit = async (data: EffectFormValues) => {
    const newOrUpdatedEffect: Effect = {
      id: editingEffect ? editingEffect.id : `effect-${Date.now()}`,
      ...data,
      character: editingEffect ? editingEffect.character : 'pending',
      justification: editingEffect ? editingEffect.justification : undefined,
    };

    const updatedEffects = editingEffect 
      ? effects.map(e => e.id === editingEffect.id ? newOrUpdatedEffect : e)
      : [...effects, newOrUpdatedEffect];

    try {
      await alternativeService.updateAlternative(id, { effects: updatedEffects });
      setEffects(updatedEffects);
      toast({ title: editingEffect ? "Effect Updated" : "Effect Added" });
      setIsEffectDialogOpen(false);
      setEditingEffect(null);
      reset();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleInferenceComplete = async (effectId: string | undefined, output: EffectCharacterInferenceOutput) => {
    if (effectId) {
      const updated = effects.map(e => e.id === effectId ? { ...e, character: output.character as any, justification: output.justification } : e);
      try {
          await alternativeService.updateAlternative(id, { effects: updated });
          setEffects(updated);
      } catch (error) {
          toast({ title: "Error saving AI result", variant: "destructive" });
      }
    }
  };

  if (authLoading || loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!alternative || !project) return <div className="p-12 text-center">Alternative not found.</div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href={`/projects/${project.id}`}><ChevronLeft className="mr-2 h-4 w-4" /> Back to Project</Link>
      </Button>

      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-3xl text-primary flex items-center gap-2">
              <Layers className="h-8 w-8" /> {alternative.name}
            </CardTitle>
            <div className="flex gap-2">
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20">
                    Project: {project.name}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => router.push(`/alternatives/${id}/edit`)}>
                <Edit3 className="mr-2 h-4 w-4" /> Edit Details
                </Button>
            </div>
          </div>
          {alternative.description && <CardDescription className="text-base pt-2">{alternative.description}</CardDescription>}
        </CardHeader>
      </Card>

      <section id="effects-section">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline text-2xl text-primary">Environmental Effects</h2>
          <Button onClick={() => { setEditingEffect(null); setIsEffectDialogOpen(true); reset(); }}>
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Effect
          </Button>
        </div>
        {effects.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {effects.map((effect) => (
              <EffectCard 
                key={effect.id} 
                effect={effect} 
                onAnalyze={(e) => { setSelectedEffectForAI(e); document.getElementById('fuzzy-logic-assistant')?.scrollIntoView({ behavior: 'smooth' }); }} 
                onEdit={(e) => { setEditingEffect(e); setIsEffectDialogOpen(true); reset(e as any); }} 
                onDelete={(eid) => alternativeService.deleteAlternative(eid).then(() => setEffects(prev => prev.filter(e => e.id !== eid)))} 
              />
            ))}
          </div>
        ) : <p className="text-muted-foreground text-center py-8">No effects defined yet. Click "Add New Effect" to begin.</p>}
      </section>

      <Separator className="my-12" />

      <section id="fuzzy-logic-assistant" className="pt-8">
        <h2 className="font-headline text-2xl text-primary mb-6 flex items-center gap-2"><BrainCircuit className="h-7 w-7" /> AI Impact Analyzer</h2>
        <FuzzyLogicAssistant 
          availableFactors={availableFactors} 
          initialEffect={selectedEffectForAI} 
          onInferenceComplete={handleInferenceComplete} 
        />
      </section>

      {/* --- Modals --- */}
      <Dialog open={isEffectDialogOpen} onOpenChange={setIsEffectDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">{editingEffect ? 'Edit' : 'Add New'} Effect</DialogTitle>
            <DialogDescription>Define the environmental impact using the project's standardized action framework.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEffectSubmit)} className="space-y-4 pt-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="actionName">Standardized Action</Label>
                <Controller name="actionName" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select an action" /></SelectTrigger>
                    <SelectContent>
                      {actionService.getLeafActions(actionTree).map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {effectFormErrors.actionName && <p className="text-xs text-destructive mt-1">{effectFormErrors.actionName.message}</p>}
              </div>
              
              <div>
                <Label htmlFor="actionDescription">Action Description</Label>
                <Textarea id="actionDescription" {...register('actionDescription')} placeholder="Describe the specific task causing this effect." />
              </div>
              
              <div>
                <Label htmlFor="factorName">Environmental Factor</Label>
                <Controller name="factorName" control={control} render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select affected factor" /></SelectTrigger>
                    <SelectContent>{availableFactors.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>

              <div>
                <Label htmlFor="description">Effect Description</Label>
                <Textarea id="description" {...register('description')} placeholder="Detail the resulting environmental impact." />
              </div>

              <div>
                <Label htmlFor="idoneityScore">Initial Idoneity Score (0-100)</Label>
                <Input type="number" {...register('idoneityScore')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEffectDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Effect</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
