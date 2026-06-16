
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

const alternativeSchema = z.object({
  name: z.string().min(3, 'Alternative name must be at least 3 characters.'),
  description: z.string().optional(),
});

type AlternativeFormValues = z.infer<typeof alternativeSchema>;

export default function CreateAlternativePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const { register, handleSubmit, formState: { errors } } = useForm<AlternativeFormValues>({
    resolver: zodResolver(alternativeSchema),
  });

  const onSubmit = async (data: AlternativeFormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const newAlternativeId = await alternativeService.createAlternative(user.uid, {
        name: data.name,
        description: data.description || '',
      });

      toast({
        title: 'Alternative Created',
        description: `"${data.name}" has been successfully created.`,
      });
      router.push(`/alternatives/${newAlternativeId}`);
    } catch (error) {
      console.error('Error creating alternative:', error);
      toast({
        title: 'Error',
        description: 'Could not create alternative. Please try again.',
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
            Define a new alternative for your project. You can add specific environmental effects later.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Alternative Name</Label>
              <Input id="name" {...register('name')} placeholder="e.g., Tunnel Bypass Route, Upgraded Technology Option" />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
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
