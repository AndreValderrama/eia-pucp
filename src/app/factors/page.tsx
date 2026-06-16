'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { factorService } from '@/lib/services/factor-service';
import type { EnvironmentalFactor } from '@/lib/types';
import { Wind, Download, Loader2, Sparkles, PlusCircle, Scale } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FactorTree from '@/components/FactorTree';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const factorFormSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  weight: z.coerce.number().min(0, "Weight cannot be negative"),
  description: z.string().optional(),
});
type FactorFormValues = z.infer<typeof factorFormSchema>;

export default function FactorsPage() {
  const { user, loading: authLoading } = useAuth();
  const [factors, setFactors] = useState<EnvironmentalFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // CRUD Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFactor, setEditingFactor] = useState<EnvironmentalFactor | null>(null);
  const [parentIdForNewFactor, setParentIdForNewFactor] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FactorFormValues>({
    resolver: zodResolver(factorFormSchema),
  });

  useEffect(() => {
    async function loadFactors() {
      if (user) {
        try {
          const data = await factorService.getUserFactors(user.uid);
          setFactors(data);
        } catch (error) {
          console.error("Error loading factors:", error);
        } finally {
          setLoading(false);
        }
      } else if (!authLoading) {
        setLoading(false);
      }
    }
    loadFactors();
  }, [user, authLoading]);

  // Calculate total weight recursively
  const totalWeight = useMemo(() => {
    const sum = (items: EnvironmentalFactor[]): number => {
      return items.reduce((acc, item) => acc + item.weight, 0);
    };
    return sum(factors);
  }, [factors]);

  const saveToFirestore = async (newTree: EnvironmentalFactor[]) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await factorService.saveUserFactors(user.uid, newTree);
      setFactors(newTree);
    } catch (error) {
      console.error("Error saving to Firestore:", error);
      toast({ title: "Error", description: "Could not save changes.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportTemplate = async () => {
    if (!user) return;
    setIsImporting(true);
    try {
      const newTree = await factorService.importTemplate(user.uid);
      setFactors(newTree);
      toast({ title: "Template Loaded", description: "Standard template has been imported." });
    } catch (error) {
      console.error("Error importing template:", error);
      toast({ title: "Import Error", description: "Could not load template.", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenEdit = (factor: EnvironmentalFactor) => {
    setEditingFactor(factor);
    setParentIdForNewFactor(null);
    reset({
      name: factor.name,
      weight: factor.weight,
      description: factor.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenAdd = (parentId: string | null = null) => {
    setEditingFactor(null);
    setParentIdForNewFactor(parentId);
    reset({ name: '', weight: 0, description: '' });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: FactorFormValues) => {
    let newTree = [...factors];

    const updateRecursive = (items: EnvironmentalFactor[]): EnvironmentalFactor[] => {
      return items.map(item => {
        if (item.id === editingFactor?.id) {
          return { ...item, ...data };
        }
        if (item.children) {
          return { ...item, children: updateRecursive(item.children) };
        }
        return item;
      });
    };

    const addRecursive = (items: EnvironmentalFactor[]): EnvironmentalFactor[] => {
      if (parentIdForNewFactor === null) {
        const newFactor: EnvironmentalFactor = {
          ...data,
          id: `f-${Date.now()}`,
          userId: user!.uid,
          children: []
        };
        return [...items, newFactor];
      }
      return items.map(item => {
        if (item.id === parentIdForNewFactor) {
          const newFactor: EnvironmentalFactor = {
            ...data,
            id: `f-${Date.now()}`,
            userId: user!.uid,
            children: []
          };
          return { ...item, children: [...(item.children || []), newFactor] };
        }
        if (item.children) {
          return { ...item, children: addRecursive(item.children) };
        }
        return item;
      });
    };

    if (editingFactor) {
      newTree = updateRecursive(newTree);
    } else {
      newTree = addRecursive(newTree);
    }

    // Apply the auto-summation logic
    const balancedTree = factorService.recalculateWeights(newTree);

    await saveToFirestore(balancedTree);
    setIsDialogOpen(false);
  };

  const handleDelete = async (factorId: string) => {
    const deleteRecursive = (items: EnvironmentalFactor[]): EnvironmentalFactor[] => {
      return items
        .filter(item => item.id !== factorId)
        .map(item => ({
          ...item,
          children: item.children ? deleteRecursive(item.children) : []
        }));
    };

    const newTree = deleteRecursive(factors);
    await saveToFirestore(newTree);
    toast({ title: "Factor Deleted", variant: "destructive" });
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading environmental factors...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl text-primary flex items-center gap-2">
            <Wind className="h-8 w-8" /> Environmental Factors
          </h1>
          <p className="text-muted-foreground mt-1">
            Define the hierarchical structure and weights for your assessment.
          </p>
        </div>
        
        <div className="flex gap-2">
            <Button onClick={() => handleOpenAdd(null)} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Root Factor
            </Button>
            {factors.length === 0 && (
            <Button onClick={handleImportTemplate} disabled={isImporting} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Download className="mr-2 h-5 w-5" /> Import Standard Template
            </Button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
            {factors.length > 0 ? (
                <Card className="shadow-xl border-t-4 border-t-primary">
                <CardHeader className="bg-muted/30">
                    <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Current Assessment Framework
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <FactorTree 
                        factors={factors} 
                        onEdit={handleOpenEdit}
                        onAddChild={handleOpenAdd}
                        onDelete={handleDelete}
                    />
                </CardContent>
                </Card>
            ) : (
                <Card className="border-2 border-dashed p-12 text-center bg-card/50">
                   <Button size="lg" onClick={handleImportTemplate} disabled={isImporting}>
                     <Download className="mr-2 h-5 w-5" /> Load Factors Template
                   </Button>
                </Card>
            )}
        </div>

        <div className="space-y-6">
            <Card className="sticky top-24 shadow-lg border-primary/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-headline flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" />
                        Weight Balance
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-end">
                        <span className="text-sm text-muted-foreground">Total Tree Weight</span>
                        <span className={`text-2xl font-bold ${totalWeight === 1000 ? 'text-green-600' : 'text-amber-600'}`}>
                            {totalWeight}
                        </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                            className={`h-full transition-all ${totalWeight === 1000 ? 'bg-green-500' : 'bg-amber-500'}`} 
                            style={{ width: `${Math.min((totalWeight / 1000) * 100, 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {totalWeight === 1000 
                          ? "Perfectly balanced! The total sum of root weights is 1000." 
                          : "Tip: Aim for a total root weight sum of 1000 for standard scoring."}
                    </p>
                </CardContent>
            </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline">
                {editingFactor ? 'Edit Factor' : 'Add New Factor'}
            </DialogTitle>
            <DialogDescription>
                {parentIdForNewFactor ? "This will be added as a sub-factor." : "Set the name and weight for this factor."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="weight">Weight</Label>
                <Input 
                  id="weight" 
                  type="number" 
                  {...register('weight')} 
                  disabled={editingFactor ? (editingFactor.children?.length ?? 0) > 0 : false}
                />
                {editingFactor && (editingFactor.children?.length ?? 0) > 0 && (
                  <p className="text-[10px] text-amber-600 font-medium italic">
                    Note: This is a parent factor. Its weight is automatically calculated as the sum of its children.
                  </p>
                )}
                {errors.weight && <p className="text-xs text-destructive">{errors.weight.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register('description')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Factor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
