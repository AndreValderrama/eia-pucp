'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Sparkles, Lightbulb, AlertTriangle } from 'lucide-react';
import { inferEffectCharacter, type EffectCharacterInferenceInput, type EffectCharacterInferenceOutput } from '@/ai/flows/effect-character-inference';
import { useToast } from "@/hooks/use-toast";
import type { Effect, EnvironmentalFactor } from '@/lib/types';

const formSchema = z.object({
  effectDescription: z.string().min(10, 'Effect description must be at least 10 characters.'),
  actionDescription: z.string().min(10, 'Action description must be at least 10 characters.'),
  environmentalFactor: z.string().min(1, 'Environmental factor is required.'),
  idoneityScore: z.number().min(0).max(100),
});

type FuzzyFormValues = z.infer<typeof formSchema>;

interface FuzzyLogicAssistantProps {
  availableFactors: EnvironmentalFactor[];
  initialEffect?: Effect; // Optional: To pre-fill form for a specific effect
  onInferenceComplete: (effectId: string | undefined, output: EffectCharacterInferenceOutput) => void;
}

export default function FuzzyLogicAssistant({ availableFactors, initialEffect, onInferenceComplete }: FuzzyLogicAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<EffectCharacterInferenceOutput | null>(null);
  const { toast } = useToast();

  const { control, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FuzzyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      effectDescription: initialEffect?.description || '',
      actionDescription: initialEffect?.actionDescription || '',
      environmentalFactor: initialEffect?.factorName || (availableFactors.length > 0 ? availableFactors[0].name : ''),
      idoneityScore: initialEffect?.idoneityScore || 50,
    },
  });

  const idoneityScore = watch('idoneityScore');

  const onSubmit = async (data: FuzzyFormValues) => {
    setIsLoading(true);
    setInferenceResult(null);
    try {
      const input: EffectCharacterInferenceInput = {
        effectDescription: data.effectDescription,
        actionDescription: data.actionDescription,
        environmentalFactor: data.environmentalFactor,
        idoneityScore: data.idoneityScore,
      };
      const result = await inferEffectCharacter(input);
      setInferenceResult(result);
      onInferenceComplete(initialEffect?.id, result);
      toast({
        title: "Inference Successful",
        description: `The AI has inferred the impact character as: ${result.character}.`,
      });
    } catch (error) {
      console.error('Error inferring effect character:', error);
      toast({
        variant: "destructive",
        title: "Inference Error",
        description: "Could not infer impact character. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (initialEffect) {
      reset({
        effectDescription: initialEffect.description,
        actionDescription: initialEffect.actionDescription,
        environmentalFactor: initialEffect.factorName,
        idoneityScore: initialEffect.idoneityScore || 50,
      });
      setInferenceResult(initialEffect.character && initialEffect.justification ? { character: initialEffect.character as any, justification: initialEffect.justification } : null);
    } else {
      // Optionally reset the form if no initialEffect is provided or it's cleared
      reset({
        effectDescription: '',
        actionDescription: '',
        environmentalFactor: availableFactors.length > 0 ? availableFactors[0].name : '',
        idoneityScore: 50,
      });
      setInferenceResult(null);
    }
  }, [initialEffect, reset, availableFactors]);


  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary flex items-center gap-2">
          <Sparkles className="h-7 w-7" />
          Fuzzy Logic Impact Assistant
        </CardTitle>
        <CardDescription>
          Describe the environmental effect and adjust the idoneity score. The AI will help infer the impact character.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="environmentalFactor">Environmental Factor</Label>
            <Controller
              name="environmentalFactor"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} defaultValue={initialEffect?.factorName || (availableFactors.length > 0 ? availableFactors[0].name : '')}>
                  <SelectTrigger id="environmentalFactor">
                    <SelectValue placeholder="Select a factor" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFactors.map(factor => (
                      <SelectItem key={factor.id} value={factor.name}>{factor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.environmentalFactor && <p className="text-sm text-destructive mt-1">{errors.environmentalFactor.message}</p>}
          </div>

          <div>
            <Label htmlFor="actionDescription">Action Description</Label>
            <Controller
              name="actionDescription"
              control={control}
              render={({ field }) => <Textarea id="actionDescription" placeholder="e.g., Construction of a new bridge, operation of a factory unit" {...field} className="min-h-[80px]" />}
            />
            {errors.actionDescription && <p className="text-sm text-destructive mt-1">{errors.actionDescription.message}</p>}
          </div>

          <div>
            <Label htmlFor="effectDescription">Effect Description</Label>
            <Controller
              name="effectDescription"
              control={control}
              render={({ field }) => <Textarea id="effectDescription" placeholder="e.g., Increased sediment load in river, displacement of local fauna" {...field} className="min-h-[100px]" />}
            />
            {errors.effectDescription && <p className="text-sm text-destructive mt-1">{errors.effectDescription.message}</p>}
          </div>

          <div>
            <Label htmlFor="idoneityScore" className="flex justify-between">
              <span>Idoneity Score</span>
              <span className="text-primary font-semibold">{idoneityScore}</span>
            </Label>
            <Controller
              name="idoneityScore"
              control={control}
              render={({ field }) => (
                <Slider
                  id="idoneityScore"
                  min={0}
                  max={100}
                  step={1}
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                  className="my-2"
                />
              )}
            />
             <p className="text-xs text-muted-foreground">Higher scores (towards 100) indicate greater idoneity/compatibility, lower scores (towards 0) indicate less idoneity/more critical impact.</p>
            {errors.idoneityScore && <p className="text-sm text-destructive mt-1">{errors.idoneityScore.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4">
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Inferring...
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-5 w-5" /> Infer Impact Character
              </>
            )}
          </Button>

          {inferenceResult && (
            <Alert variant={inferenceResult.character === 'critical' || inferenceResult.character === 'severe' ? 'destructive' : 'default'} className="mt-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle className="font-headline">AI Inference Result</AlertTitle>
              <AlertDescription className="space-y-2">
                <p><strong>Character:</strong> <span className="font-semibold capitalize text-lg">{inferenceResult.character}</span></p>
                <p><strong>Justification:</strong> {inferenceResult.justification}</p>
              </AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
