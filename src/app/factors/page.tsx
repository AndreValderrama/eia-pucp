'use client';

import { useState, useEffect } from 'react';
import FactorItem from '@/components/FactorItem';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mockFactors } from '@/lib/mockData';
import type { EnvironmentalFactor } from '@/lib/types';
import { PlusCircle, Wind } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const factorFormSchema = z.object({
  name: z.string().min(3, "Factor name is required."),
  weight: z.coerce.number().min(0, "Weight must be non-negative.").max(1, "Weight must be between 0 and 1 for normalized weights, or adjust schema for other scales."), // Assuming normalized 0-1
  description: z.string().optional(),
});
type FactorFormValues = z.infer<typeof factorFormSchema>;


export default function FactorsPage() {
  const [factors, setFactors] = useState<EnvironmentalFactor[]>([]);
  const [isFactorDialogOpen, setIsFactorDialogOpen] = useState(false);
  const [editingFactor, setEditingFactor] = useState<EnvironmentalFactor | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FactorFormValues>({
    resolver: zodResolver(factorFormSchema),
  });

  useEffect(() => {
    setFactors(mockFactors);
  }, []);
  
  useEffect(() => {
    if (editingFactor) {
      reset({
        name: editingFactor.name,
        weight: editingFactor.weight,
        description: editingFactor.description,
      });
    } else {
      reset({ name: '', weight: 0.1, description: ''});
    }
  }, [editingFactor, reset]);

  const handleFactorSubmit = (data: FactorFormValues) => {
    const newOrUpdatedFactor: EnvironmentalFactor = {
      id: editingFactor ? editingFactor.id : `factor-${Date.now()}`,
      ...data,
    };

    if (editingFactor) {
      setFactors(factors.map(f => f.id === editingFactor.id ? newOrUpdatedFactor : f));
      // Update mock data
      const factorIndex = mockFactors.findIndex(f => f.id === editingFactor.id);
      if (factorIndex !== -1) mockFactors[factorIndex] = newOrUpdatedFactor;
      toast({ title: "Factor Updated", description: `${newOrUpdatedFactor.name} has been updated.` });

    } else {
      setFactors([...factors, newOrUpdatedFactor]);
      mockFactors.push(newOrUpdatedFactor); // Update mock data
      toast({ title: "Factor Added", description: `${newOrUpdatedFactor.name} has been added.` });
    }
    setIsFactorDialogOpen(false);
    setEditingFactor(null);
  };

  const handleOpenFactorDialog = (factor: EnvironmentalFactor | null = null) => {
    setEditingFactor(factor);
    setIsFactorDialogOpen(true);
  };

  const handleDeleteFactor = (factorId: string) => {
    setFactors(factors.filter(f => f.id !== factorId));
    // Update mock data
    const factorIndex = mockFactors.findIndex(f => f.id === factorId);
    if (factorIndex !== -1) mockFactors.splice(factorIndex, 1);
    toast({ title: "Factor Deleted", description: "The factor has been removed.", variant: "destructive" });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="font-headline text-3xl text-primary flex items-center gap-2">
          <Wind className="h-8 w-8" /> Manage Environmental Factors
        </h1>
        <Button onClick={() => handleOpenFactorDialog()}>
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Factor
        </Button>
      </div>

      {factors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {factors.map((factor) => (
            <FactorItem
              key={factor.id}
              factor={factor}
              onEdit={handleOpenFactorDialog}
              onDelete={handleDeleteFactor}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
            <p className="text-xl text-muted-foreground mb-4">No environmental factors defined yet.</p>
            <Button size="lg" onClick={() => handleOpenFactorDialog()}>
                <PlusCircle className="mr-2 h-5 w-5" /> Add Your First Factor
            </Button>
        </div>
      )}

      <Dialog open={isFactorDialogOpen} onOpenChange={setIsFactorDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingFactor ? 'Edit' : 'Add New'} Factor</DialogTitle>
            <DialogDescription>
              {editingFactor ? 'Update the details of this environmental factor.' : 'Define a new environmental factor and its relative weight.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleFactorSubmit)}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="name">Factor Name</Label>
                <Input id="name" {...register('name')} placeholder="e.g., Air Quality, Biodiversity" />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="weight">Weight (0.0 - 1.0)</Label>
                <Input id="weight" type="number" step="0.01" {...register('weight')} placeholder="e.g., 0.25" />
                {errors.weight && <p className="text-sm text-destructive mt-1">{errors.weight.message}</p>}
                 <p className="text-xs text-muted-foreground mt-1">Relative importance of this factor. Sum of all factor weights typically equals 1.</p>
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea id="description" {...register('description')} placeholder="Briefly describe what this factor entails." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFactorDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingFactor ? 'Save Changes' : 'Add Factor'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
