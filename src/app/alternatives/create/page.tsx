
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Layers, ChevronLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { alternativeService } from '@/lib/services/alternative-service';
import { actionService } from '@/lib/services/action-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Controller } from 'react-hook-form';

const alternativeSchema = z.object({
  name: z.string().min(3, 'Alternative name must be at least 3 characters.'),
  description: z.string().optional(),
  projectType: z.string().min(1, 'Please select a project framework.'),
});

type AlternativeFormValues = z.infer<typeof alternativeSchema>;

export default function CreateAlternativePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const projectTypes = actionService.getAvailableProjectTypes();

  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to create alternatives.',
        variant: 'destructive',
      });
      router.push('/');
    }
  }, [user, loading, router, toast]);

  const { register, handleSubmit, control, formState: { errors } } = useForm<AlternativeFormValues>({
    resolver: zodResolver(alternativeSchema),
    defaultValues: { projectType: projectTypes[0] }
  });

  const onSubmit = async (data: AlternativeFormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Get the standard action tree for this project type
      const standardActions = actionService.getActionsForType(data.projectType);
      
      const newAlternativeId = await alternativeService.createAlternative(user.uid, {
        name: data.name,
        description: data.description || '',
        actionTree: standardActions, // Each alternative gets its own copy
      });

      toast({
        title: 'Alternative Created',
        description: `"${data.name}" has been created with the "${data.projectType}" framework.`,
      });
      router.push(`/alternatives/${newAlternativeId}`);
    } catch (error) {
      console.error('Error creating alternative:', error);
      toast({
        title: 'Error',
        description: 'Could not create alternative.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12">Loading...</div>;
  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/alternatives">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Alternatives
          </Link>
        </Button>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary flex items-center gap-2">
            <Layers className="h-7 w-7" />
            Create New Alternative
          </CardTitle>
          <CardDescription>
            Define a new alternative and select its starting action framework.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="name">Alternative Name</Label>
              <Input id="name" {...register('name')} placeholder="e.g., Solar Array A, Route Option 1" />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="projectType">Action Framework Template</Label>
              <Controller
                name="projectType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground mt-1">This will populate the alternative with standardized Phases, Labors, and Actions.</p>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" {...register('description')} placeholder="Provide a brief description of this alternative." />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Creating...' : 'Create Alternative'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
