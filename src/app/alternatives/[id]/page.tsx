'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import FuzzyLogicAssistant from '@/components/FuzzyLogicAssistant';
import EffectCard from '@/components/EffectCard';
import { mockFactors } from '@/lib/mockData';
import type { Alternative, Effect, EnvironmentalFactor } from '@/lib/types';
import type { EffectCharacterInferenceOutput } from '@/ai/flows/effect-character-inference';
import { Layers, PlusCircle, ChevronLeft, Edit3, BrainCircuit, Loader2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { alternativeService } from '@/lib/services/alternative-service';
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
  const [effects, setEffects] = useState<Effect[]>([]);
  const [availableFactors, setAvailableFactors] = useState<EnvironmentalFactor[]>([]);
  const [selectedEffectForAI, setSelectedEffectForAI] = useState<Effect | undefined>(undefined);
  const [isEffectDialogOpen, setIsEffectDialogOpen] = useState(false);
  const [editingEffect, setEditingEffect] = useState<Effect | null>(null);
  const [loading, setLoading] = useState(true);

  const { control, handleSubmit, register, reset, formState: { errors: effectFormErrors } } = useForm<EffectFormValues>({
    resolver: zodResolver(effectFormSchema),
    defaultValues: { idoneityScore: 50 }
  });

  const loadAlternative = useCallback(async () => {
    try {
      const data = await alternativeService.getAlternative(id);
      if (data) {
        setAlternative(data);
        setEffects(data.effects || []);
      }
    } catch (error) {
      console.error("Error loading alternative:", error);
      toast({ title: "Error", description: "Could not load alternative details.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (!authLoading) {
      loadAlternative();
    }
    setAvailableFactors(mockFactors);
  }, [authLoading, loadAlternative]);

  useEffect(() => {
    if (editingEffect) {
      reset({
        actionName: editingEffect.actionName,
        actionDescription: editingEffect.actionDescription,
        factorName: editingEffect.factorName,
        description: editingEffect.description,
        idoneityScore: editingEffect.idoneityScore,
      });
    } else {
      reset({ actionName: '', actionDescription: '', factorName: '', description: '', idoneityScore: 50});
    }
  }, [editingEffect, reset]);

  const handleEffectSubmit = async (data: EffectFormValues) => {
    const newOrUpdatedEffect: Effect = {
      id: editingEffect ? editingEffect.id : `effect-${Date.now()}`,
      ...data,
      character: editingEffect ? editingEffect.character : 'pending',
      justification: editingEffect ? editingEffect.justification : undefined,
    };

    let updatedEffects: Effect[];
    if (editingEffect) {
      updatedEffects = effects.map(e => e.id === editingEffect.id ? newOrUpdatedEffect : e);
    } else {
      updatedEffects = [...effects, newOrUpdatedEffect];
    }

    try {
      await alternativeService.updateAlternative(id, { effects: updatedEffects });
      setEffects(updatedEffects);
      toast({ 
        title: editingEffect ? "Effect Updated" : "Effect Added", 
        description: `Effect on ${newOrUpdatedEffect.factorName} has been saved.` 
      });
      setIsEffectDialogOpen(false);
      setEditingEffect(null);
      reset();
    } catch (error) {
      console.error("Error saving effect:", error);
      toast({ title: "Error", description: "Could not save effect. Please try again.", variant: "destructive" });
    }
  };
  
  const handleOpenEffectDialog = (effectToEdit: Effect | null = null) => {
    setEditingEffect(effectToEdit);
    setIsEffectDialogOpen(true);
  };

  const handleDeleteEffect = async (effectId: string) => {
    const updatedEffects = effects.filter(e => e.id !== effectId);
    try {
      await alternativeService.updateAlternative(id, { effects: updatedEffects });
      setEffects(updatedEffects);
      toast({ title: "Effect Deleted", description: "The effect has been removed.", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting effect:", error);
      toast({ title: "Error", description: "Could not delete effect.", variant: "destructive" });
    }
  };

  const handleAnalyzeWithAI = (effect: Effect) => {
    setSelectedEffectForAI(effect);
    document.getElementById('fuzzy-logic-assistant')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInferenceComplete = async (effectId: string | undefined, output: EffectCharacterInferenceOutput) => {
    if (effectId) {
      const updatedEffects = effects.map(effect =>
        effect.id === effectId
          ? { ...effect, character: output.character as Effect['character'], justification: output.justification, idoneityScore: selectedEffectForAI?.idoneityScore || effect.idoneityScore }
          : effect
      );
      
      try {
        await alternativeService.updateAlternative(id, { effects: updatedEffects });
        setEffects(updatedEffects);
      } catch (error) {
        console.error("Error updating effect with AI result:", error);
        toast({ title: "Error", description: "AI inference result could not be saved.", variant: "destructive" });
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading alternative details...</p>
      </div>
    );
  }

  if (!alternative) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Layers className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Alternative Not Found</h2>
            <p className="text-muted-foreground mb-6">The alternative you are looking for does not exist or could not be loaded.</p>
            <Button asChild>
                <Link href="/">
                    <ChevronLeft className="mr-2 h-4 w-4" /> Go Back to Dashboard
                </Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-3xl text-primary flex items-center gap-2">
              <Layers className="h-8 w-8" />
              {alternative.name}
            </CardTitle>
            <Button variant="outline" onClick={() => router.push(`/alternatives/${id}/edit`)}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Alternative Details
            </Button>
          </div>
          {alternative.description && <CardDescription className="text-base pt-2">{alternative.description}</CardDescription>}
        </CardHeader>
      </Card>

      <section id="effects-section">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline text-2xl text-primary">Environmental Effects</h2>
          <Button onClick={() => handleOpenEffectDialog()}>
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Effect
          </Button>
        </div>
        {effects.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {effects.map((effect) => (
              <EffectCard
                key={effect.id}
                effect={effect}
                onAnalyze={handleAnalyzeWithAI}
                onEdit={() => handleOpenEffectDialog(effect)}
                onDelete={handleDeleteEffect}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No environmental effects defined for this alternative yet.</p>
        )}
      </section>

      <Separator className="my-12" />

      <section id="fuzzy-logic-assistant" className="pt-8">
         <h2 className="font-headline text-2xl text-primary mb-6 flex items-center gap-2">
            <BrainCircuit className="h-7 w-7" /> AI Impact Analyzer
        </h2>
        <FuzzyLogicAssistant
          availableFactors={availableFactors}
          initialEffect={selectedEffectForAI}
          onInferenceComplete={handleInferenceComplete}
        />
      </section>

      <Dialog open={isEffectDialogOpen} onOpenChange={setIsEffectDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">{editingEffect ? 'Edit' : 'Add New'} Effect</DialogTitle>
            <DialogDescription>
              Define the action, affected factor, and describe the environmental effect.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEffectSubmit)}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="actionName">Action Name</Label>
                <Input id="actionName" {...register('actionName')} placeholder="e.g., Site Clearing, Effluent Discharge" />
                {effectFormErrors.actionName && <p className="text-sm text-destructive mt-1">{effectFormErrors.actionName.message}</p>}
              </div>
              <div>
                <Label htmlFor="actionDescription">Action Description</Label>
                <Textarea id="actionDescription" {...register('actionDescription')} placeholder="Detailed description of the action causing the effect." />
                {effectFormErrors.actionDescription && <p className="text-sm text-destructive mt-1">{effectFormErrors.actionDescription.message}</p>}
              </div>
              <div>
                <Label htmlFor="factorName">Environmental Factor</Label>
                <Controller
                    name="factorName"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <SelectTrigger id="factorName">
                            <SelectValue placeholder="Select affected factor" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableFactors.map(factor => (
                            <SelectItem key={factor.id} value={factor.name}>{factor.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    )}
                />
                {effectFormErrors.factorName && <p className="text-sm text-destructive mt-1">{effectFormErrors.factorName.message}</p>}
              </div>
              <div>
                <Label htmlFor="description">Effect Description</Label>
                <Textarea id="description" {...register('description')} placeholder="Detailed description of the environmental effect." />
                {effectFormErrors.description && <p className="text-sm text-destructive mt-1">{effectFormErrors.description.message}</p>}
              </div>
              <div>
                <Label htmlFor="idoneityScore">Initial Idoneity Score (0-100)</Label>
                <Controller
                  name="idoneityScore"
                  control={control}
                  render={({ field }) => (
                    <Input type="number" id="idoneityScore" {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} />
                  )}
                />
                {effectFormErrors.idoneityScore && <p className="text-sm text-destructive mt-1">{effectFormErrors.idoneityScore.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEffectDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingEffect ? 'Save Changes' : 'Add Effect'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
