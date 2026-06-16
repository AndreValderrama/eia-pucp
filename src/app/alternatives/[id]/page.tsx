'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Layers, 
  ChevronLeft, 
  Loader2, 
  Zap, 
  Wind, 
  ArrowRight, 
  Plus, 
  Trash2,
  Settings2,
  Info,
  CheckCircle2,
  Calculator
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { alternativeService } from '@/lib/services/alternative-service';
import { projectService } from '@/lib/services/project-service';
import { factorService } from '@/lib/services/factor-service';
import { actionService } from '@/lib/services/action-service';
import { impactService } from '@/lib/services/impact-service';
import type { Project, Alternative, ActionNode, EnvironmentalFactor, Impact, ImpactImportance } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import ActionTree from '@/components/ActionTree';
import ImpactEvaluationDialog from '@/components/ImpactEvaluationDialog';

export default function AlternativeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const id = params.id as string;

  const [alternative, setAlternative] = useState<Alternative | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [actionTree, setActionTree] = useState<ActionNode[]>([]);
  const [factorTree, setFactorTree] = useState<EnvironmentalFactor[]>([]);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State for Node Selection
  const [selectedAction, setSelectedAction] = useState<ActionNode | null>(null);
  const [selectedFactor, setSelectedFactor] = useState<EnvironmentalFactor | null>(null);
  const [isImpactDialogOpen, setIsImpactDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Evaluation Dialog State
  const [isEvalDialogOpen, setIsEvalDialogOpen] = useState(false);
  const [impactToEval, setImpactToEval] = useState<Impact | null>(null);

  const loadData = useCallback(async () => {
    if (!user || !id) return;
    try {
      const [altData, userFactors] = await Promise.all([
        alternativeService.getAlternative(id),
        factorService.getUserFactors(user.uid)
      ]);

      if (altData) {
        setAlternative(altData);
        setFactorTree(userFactors);
        
        const [projData, altImpacts] = await Promise.all([
            projectService.getProject(altData.projectId),
            impactService.getAlternativeImpacts(id)
        ]);

        if (projData) {
            setProject(projData);
            setActionTree(altData.actionTree || projData.actionTree || []);
        }
        setImpacts(altImpacts);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (!authLoading && user) loadData();
    else if (!authLoading) setLoading(false);
  }, [authLoading, user, loadData]);

  // Derived leaf nodes
  const leafActions = useMemo(() => actionService.getLeafActions(actionTree), [actionTree]);
  const leafFactors = useMemo(() => factorService.getLeafFactors(factorTree), [factorTree]);
  const totalFactorWeight = useMemo(() => leafFactors.reduce((sum, f) => sum + f.weight, 0), [leafFactors]);

  // Check if a link exists between action and factor
  const getImpact = (actionId: string, factorId: string) => {
    return impacts.find(i => i.actionId === actionId && i.factorId === factorId);
  };

  const handleCreateImpact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedAction || !selectedFactor || !alternative || !project) return;

    const formData = new FormData(e.currentTarget);
    const importance = formData.get('importance') as ImpactImportance;
    const description = formData.get('description') as string;

    setIsSaving(true);
    try {
      await impactService.createImpact(user.uid, {
        projectId: project.id,
        alternativeId: alternative.id,
        actionId: selectedAction.id,
        actionName: selectedAction.name,
        factorId: selectedFactor.id,
        factorName: selectedFactor.name,
        importance,
        normalizedWeight: selectedFactor.weight / (totalFactorWeight || 1),
        description
      });

      toast({ title: "Impact Linked", description: `${selectedAction.name} → ${selectedFactor.name}` });
      setIsImpactDialogOpen(false);
      setSelectedAction(null);
      setSelectedFactor(null);
      loadData(); // Refresh list
    } catch (error) {
      toast({ title: "Error linking nodes", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteImpact = async (impactId: string) => {
    try {
        await impactService.deleteImpact(impactId);
        setImpacts(prev => prev.filter(i => i.id !== impactId));
        toast({ title: "Impact removed" });
    } catch (error) {
        toast({ title: "Error deleting impact", variant: "destructive" });
    }
  };

  if (authLoading || loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!alternative || !project) return <div className="p-12 text-center">Alternative not found.</div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" asChild>
            <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Dashboard</Link>
        </Button>
        <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                Project: {project.name}
            </Badge>
            <Badge className="bg-primary text-white">
                Alternative: {alternative.name}
            </Badge>
        </div>
      </div>

      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Node Mapping
          </TabsTrigger>
          <TabsTrigger value="framework" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Framework Logic
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="space-y-8 mt-6">
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="px-0">
                    <CardTitle className="text-2xl font-headline text-primary">Environmental Node Mapping</CardTitle>
                    <CardDescription>Select an action on the left and a factor on the right to link an environmental impact.</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                    <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-start">
                        {/* 1. Actions Column */}
                        <div className="md:col-span-4 space-y-4">
                            <h3 className="flex items-center gap-2 font-headline font-bold text-amber-600 uppercase text-xs tracking-widest px-2">
                                <Zap className="h-4 w-4" /> Standardized Actions
                            </h3>
                            <div className="space-y-2 max-h-[600px] overflow-auto p-2 bg-muted/30 rounded-xl border">
                                {leafActions.map(action => (
                                    <div 
                                        key={action.id}
                                        onClick={() => setSelectedAction(action)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                            selectedAction?.id === action.id 
                                            ? 'bg-amber-100 border-amber-500 shadow-md translate-x-2' 
                                            : 'bg-card hover:border-amber-300'
                                        }`}
                                    >
                                        <p className="text-sm font-medium">{action.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Connection Indicator */}
                        <div className="md:col-span-1 flex flex-col items-center justify-center h-full pt-12">
                            <div className={`p-3 rounded-full transition-all ${selectedAction && selectedFactor ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-muted text-muted-foreground'}`}>
                                <ArrowRight className="h-6 w-6" />
                            </div>
                            {selectedAction && selectedFactor && (
                                <Button 
                                    className="mt-4 animate-bounce" 
                                    size="sm"
                                    onClick={() => setIsImpactDialogOpen(true)}
                                >
                                    Link
                                </Button>
                            )}
                        </div>

                        {/* 3. Factors Column */}
                        <div className="md:col-span-4 space-y-4">
                            <h3 className="flex items-center gap-2 font-headline font-bold text-primary uppercase text-xs tracking-widest px-2">
                                <Wind className="h-4 w-4" /> Environmental Factors
                            </h3>
                            <div className="space-y-2 max-h-[600px] overflow-auto p-2 bg-muted/30 rounded-xl border">
                                {leafFactors.map(factor => (
                                    <div 
                                        key={factor.id}
                                        onClick={() => setSelectedFactor(factor)}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                            selectedFactor?.id === factor.id 
                                            ? 'bg-primary/10 border-primary shadow-md -translate-x-2' 
                                            : 'bg-card hover:border-primary/30'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm font-medium">{factor.name}</p>
                                            <Badge variant="outline" className="text-[10px] opacity-60">W: {factor.weight}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 4. Mini Legend/Stats */}
                        <div className="md:col-span-2 space-y-4">
                             <Card className="bg-primary/5 border-primary/10">
                                <CardHeader className="p-4">
                                    <CardTitle className="text-xs uppercase tracking-tighter">Total Impacts</CardTitle>
                                    <div className="text-3xl font-bold text-primary">{impacts.length}</div>
                                </CardHeader>
                             </Card>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Separator />

            <section className="space-y-6">
                <h2 className="font-headline text-2xl text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6" /> Current Impact Matrix
                </h2>
                {impacts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {impacts.map(impact => (
                            <Card key={impact.id} className="group hover:border-destructive/30 transition-colors">
                                <CardHeader className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <Badge className={`capitalize ${
                                            impact.importance === 'significativo' ? 'bg-orange-600' :
                                            impact.importance === 'notable' ? 'bg-amber-500' :
                                            impact.importance === 'difuso' ? 'bg-blue-500' : 'bg-slate-400'
                                        }`}>
                                            {impact.importance}
                                        </Badge>
                                        <div className="flex gap-1">
                                            {impact.importance === 'significativo' && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 text-orange-600 hover:text-orange-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => {
                                                        setImpactToEval(impact);
                                                        setIsEvalDialogOpen(true);
                                                    }}
                                                    title="Evaluar Impacto"
                                                >
                                                    <Calculator className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleDeleteImpact(impact.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] text-amber-600 font-bold uppercase tracking-tight flex items-center gap-1">
                                            <Zap className="h-3 w-3" /> {impact.actionName}
                                        </div>
                                        <div className="text-[10px] text-primary font-bold uppercase tracking-tight flex items-center gap-1">
                                            <Wind className="h-3 w-3" /> {impact.factorName}
                                        </div>
                                    </div>
                                    {impact.description && (
                                        <p className="text-xs text-muted-foreground italic border-l-2 pl-2">
                                            "{impact.description}"
                                        </p>
                                    )}
                                </CardHeader>
                                <CardFooter className="p-3 bg-muted/20 text-[10px] flex justify-between">
                                    <span>Norm. Weight: {impact.normalizedWeight.toFixed(4)}</span>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 border-2 border-dashed rounded-2xl text-center text-muted-foreground bg-muted/10">
                        No links created yet. Start by selecting nodes above.
                    </div>
                )}
            </section>
        </TabsContent>

        <TabsContent value="framework" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                        <div>
                            <CardTitle className="text-xl font-headline">Alternative Action Logic</CardTitle>
                            <CardDescription>Customize the Phases and Labors for this specific alternative.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <ActionTree nodes={actionTree} onEdit={() => {}} onAddChild={() => {}} onDelete={() => {}} />
                    </CardContent>
                </Card>

                <Card className="bg-muted/10 border-dashed">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Info className="h-5 w-5 text-primary" />
                            Framework Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-4 text-muted-foreground">
                        <p>This alternative currently uses its own action framework derived from <strong>{project.projectType}</strong>.</p>
                        <p>Linking an <strong>Action</strong> to a <strong>Factor</strong> creates an entry in the impacts matrix.</p>
                        <p>The <strong>Normalized Weight</strong> used for final scoring is calculated as: <code>Factor Weight / Total Alternative Weight</code>.</p>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
      </Tabs>

      {/* Impact Importance Dialog */}
      <Dialog open={isImpactDialogOpen} onOpenChange={setIsImpactDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Define Environmental Impact</DialogTitle>
            <DialogDescription>
              Linking <strong>{selectedAction?.name}</strong> to <strong>{selectedFactor?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateImpact} className="space-y-6 pt-4">
            <div className="space-y-3">
              <Label className="text-sm font-bold">Importancia del Impacto</Label>
              <RadioGroup name="importance" defaultValue="notable" className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="despreciable" id="des" />
                  <Label htmlFor="des" className="font-medium cursor-pointer">Despreciable</Label>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-muted/50 transition-colors border-amber-200">
                  <RadioGroupItem value="notable" id="not" />
                  <Label htmlFor="not" className="font-medium cursor-pointer text-amber-700">Notable</Label>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-muted/50 transition-colors border-orange-200">
                  <RadioGroupItem value="significativo" id="sig" />
                  <Label htmlFor="sig" className="font-medium cursor-pointer text-orange-700">Significativo</Label>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-muted/50 transition-colors border-blue-200">
                  <RadioGroupItem value="difuso" id="dif" />
                  <Label htmlFor="dif" className="font-medium cursor-pointer text-blue-700">Difuso</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-bold">Justification / Description</Label>
              <Textarea 
                name="description" 
                placeholder="Describe why this action impacts this factor..."
                className="min-h-[100px]"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsImpactDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Linking..." : "Confirm Connection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detailed Evaluation Dialog */}
      <ImpactEvaluationDialog 
        impact={impactToEval}
        isOpen={isEvalDialogOpen}
        onOpenChange={setIsEvalDialogOpen}
        onUpdate={loadData}
      />
    </div>
  );
}
