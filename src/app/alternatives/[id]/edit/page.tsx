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
import { useAuth } from '@/lib/auth-context';
import { alternativeService } from '@/lib/services/alternative-service';
import type { Alternative } from '@/lib/types';
import { Layers, ChevronLeft, Loader2 } from 'lucide-react';

const alternativeSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().optional(),
});

type AlternativeFormValues = z.infer<typeof alternativeSchema>;

export default function EditAlternativePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alternative, setAlternative] = useState<Alternative | null>(null);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AlternativeFormValues>({
    resolver: zodResolver(alternativeSchema),
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    alternativeService.getAlternative(id)
      .then(alt => {
        setAlternative(alt);
        if (alt) reset({ name: alt.name, description: alt.description || '' });
      })
      .catch(err => console.error('Error loading alternative:', err))
      .finally(() => setLoading(false));
  }, [id, user, authLoading, reset]);

  const onSubmit = async (data: AlternativeFormValues) => {
    setIsSubmitting(true);
    try {
      await alternativeService.updateAlternative(id, {
        name: data.name.trim(),
        description: data.description?.trim() || '',
      });
      toast({ title: 'Alternativa actualizada', description: `"${data.name}" se guardó correctamente.` });
      router.push(`/alternatives/${id}`);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'No se pudo guardar la alternativa.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <div className="flex justify-center p-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!alternative) return <div className="p-12 text-center">Alternativa no encontrada.</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href={`/alternatives/${id}`}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Volver a la alternativa
        </Link>
      </Button>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary flex items-center gap-2">
            <Layers className="h-7 w-7" /> Editar alternativa
          </CardTitle>
          <CardDescription>
            Cambia el nombre y la descripción. Las fases, labores y acciones se editan en la página de la alternativa.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea id="description" {...register('description')} className="min-h-[100px]" />
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button type="button" variant="outline" asChild><Link href={`/alternatives/${id}`}>Cancelar</Link></Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
