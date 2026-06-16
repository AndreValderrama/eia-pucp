'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { mockAlternatives } from '@/lib/mockData';
import type { Alternative } from '@/lib/types';
import { Layers, ChevronLeft } from 'lucide-react';

const alternativeSchema = z.object({
  name: z.string().min(3, 'Alternative name must be at least 3 characters.'),
  description: z.string().optional(),
});

type AlternativeFormValues = z.infer<typeof alternativeSchema>;

export default function EditAlternativePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alternative, setAlternative] = useState<Alternative | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AlternativeFormValues>({
    resolver: zodResolver(alternativeSchema),
  });

  useEffect(() => {
    const foundAlternative = mockAlternatives.find(alt => alt.id === id);
    if (foundAlternative) {
      setAlternative(foundAlternative);
      reset({ name: foundAlternative.name, description: foundAlternative.description });
    } else {
      // Handle not found
      toast({ variant: "destructive", title: "Error", description: "Alternative not found." });
      router.push('/alternatives');
    }
  }, [id, reset, router, toast]);

  const onSubmit = async (data: AlternativeFormValues) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Updated Alternative Data:', data);
    
    // Update mock data (in real app, this would be a backend call)
    const altIndex = mockAlternatives.findIndex(alt => alt.id === id);
    if (altIndex !== -1 && alternative) {
      mockAlternatives[altIndex] = { ...alternative, ...data };
    }

    toast({
      title: 'Alternative Updated',
      description: `"${data.name}" has been successfully updated.`,
    });
    setIsSubmitting(false);
    router.push(`/alternatives/${id}`); 
  };

  if (!alternative) {
    return <div className="flex justify-center items-center h-screen"><p>Loading alternative data...</p></div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href={`/alternatives/${id}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Alternative Details
          </Link>
        </Button>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary flex items-center gap-2">
            <Layers className="h-7 w-7" />
            Edit Alternative: {alternative.name}
          </CardTitle>
          <CardDescription>
            Update the name and description for this project alternative.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Alternative Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" {...register('description')} className="min-h-[100px]" />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
