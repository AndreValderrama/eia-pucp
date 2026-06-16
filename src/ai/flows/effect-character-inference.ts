// src/ai/flows/effect-character-inference.ts
'use server';

/**
 * @fileOverview An AI assistant that guides users in assigning an environmental impact character to an effect.
 *
 * - inferEffectCharacter - A function that handles the environmental impact character inference process.
 * - EffectCharacterInferenceInput - The input type for the inferEffectCharacter function.
 * - EffectCharacterInferenceOutput - The return type for the inferEffectCharacter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EffectCharacterInferenceInputSchema = z.object({
  effectDescription: z
    .string()
    .describe('A description of the environmental effect.'),
  actionDescription: z.string().describe('A description of the action causing the effect.'),
  environmentalFactor: z.string().describe('The environmental factor being affected.'),
  idoneityScore: z
    .number()
    .min(0)
    .max(100)
    .describe('A score (0-100) indicating the idoneity of the effect.'),
});
export type EffectCharacterInferenceInput = z.infer<
  typeof EffectCharacterInferenceInputSchema
>;

const EffectCharacterInferenceOutputSchema = z.object({
  character: z
    .enum(['compatible', 'critical', 'moderate', 'severe'])
    .describe('The inferred character of the environmental impact.'),
  justification: z.string().describe('The AI justification for assigning the character.'),
});
export type EffectCharacterInferenceOutput = z.infer<
  typeof EffectCharacterInferenceOutputSchema
>;

export async function inferEffectCharacter(
  input: EffectCharacterInferenceInput
): Promise<EffectCharacterInferenceOutput> {
  return inferEffectCharacterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'effectCharacterInferencePrompt',
  input: {schema: EffectCharacterInferenceInputSchema},
  output: {schema: EffectCharacterInferenceOutputSchema},
  prompt: `You are an AI assistant that helps users assess environmental impacts by assigning a character (compatible, critical, moderate, or severe) to an environmental effect using fuzzy logic.

  Consider the following information:

  - Environmental Factor: {{{environmentalFactor}}}
  - Action Description: {{{actionDescription}}}
  - Effect Description: {{{effectDescription}}}
  - Idoneity Score: {{{idoneityScore}}} (0-100, where higher scores indicate greater idoneity)

  Based on this information, infer the most appropriate character for the environmental impact. Provide a justification for your choice. The idoneity score should strongly influence the character assigned; an idoneity score close to 0 should skew towards "critical" and scores close to 100 should skew towards "compatible".

  Output the character and justification in JSON format.
`,
});

const inferEffectCharacterFlow = ai.defineFlow(
  {
    name: 'inferEffectCharacterFlow',
    inputSchema: EffectCharacterInferenceInputSchema,
    outputSchema: EffectCharacterInferenceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
