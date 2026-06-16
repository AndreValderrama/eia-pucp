'use client';

import { useState, useEffect } from 'react';
import { BarChart3, CheckCircle, AlertCircle, Zap, Layers } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mockAlternatives, mockFactors, mockProject } from '@/lib/mockData';
import type { Alternative, Effect, EnvironmentalFactor, Project } from '@/lib/types';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"

// Simplified scoring for demonstration. Real scoring would be complex.
const scoreCharacter = (character: Effect['character']): number => {
  switch (character) {
    case 'compatible': return 4;
    case 'moderate': return 3;
    case 'severe': return 2;
    case 'critical': return 1;
    default: return 0; // For 'pending' or undefined
  }
};

interface AlternativeScore {
  name: string;
  totalScore: number;
  weightedScore: number;
  effectsSummary: {
    compatible: number;
    moderate: number;
    severe: number;
    critical: number;
    pending: number;
  };
}

export default function ResultsPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [factors, setFactors] = useState<EnvironmentalFactor[]>([]);
  const [alternativeScores, setAlternativeScores] = useState<AlternativeScore[]>([]);

  useEffect(() => {
    setProject(mockProject);
    setAlternatives(mockAlternatives);
    setFactors(mockFactors);
  }, []);

  useEffect(() => {
    if (alternatives.length > 0 && factors.length > 0) {
      const scores = alternatives.map(alt => {
        let totalScore = 0;
        let weightedScore = 0;
        const effectsSummary = { compatible: 0, moderate: 0, severe: 0, critical: 0, pending: 0 };

        alt.effects.forEach(effect => {
          const characterScore = scoreCharacter(effect.character);
          totalScore += characterScore;
          
          const factor = factors.find(f => f.name === effect.factorName);
          if (factor) {
            weightedScore += characterScore * factor.weight;
          }

          if (effect.character) {
            effectsSummary[effect.character]++;
          } else {
            effectsSummary.pending++;
          }
        });
        return { name: alt.name, totalScore, weightedScore, effectsSummary };
      });
      setAlternativeScores(scores.sort((a, b) => b.weightedScore - a.weightedScore)); // Sort by weighted score desc
    }
  }, [alternatives, factors]);

  const chartData = alternativeScores.map(alt => ({
    name: alt.name,
    score: alt.weightedScore, // Using weighted score for chart
    fill: "hsl(var(--primary))", // Use primary color for bars
  }));

  const chartConfig = {
    score: {
      label: "Weighted Score",
      color: "hsl(var(--primary))",
    },
  } satisfies Parameters<typeof ChartContainer>[0]["config"];


  if (!project) {
    return <div className="flex justify-center items-center h-full"><p>Loading results...</p></div>;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-primary flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Project Results & Comparison
          </CardTitle>
          <CardDescription>
            Summary of environmental impact assessment for "{project.name}". Alternatives are ranked by weighted score.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl">Alternatives Comparison Chart</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
             <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 50 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                    />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                   <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="score" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground">No data available for chart.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl">Detailed Scores and Impact Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Alternative</TableHead>
                <TableHead className="text-right">Weighted Score</TableHead>
                <TableHead className="text-right">Total Raw Score</TableHead>
                <TableHead>Impact Character Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alternativeScores.map((altScore) => (
                <TableRow key={altScore.name}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" /> {altScore.name}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-primary">{altScore.weightedScore.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{altScore.totalScore}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {altScore.effectsSummary.compatible > 0 && <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="mr-1 h-3 w-3" /> C: {altScore.effectsSummary.compatible}</Badge>}
                      {altScore.effectsSummary.moderate > 0 && <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-black"><AlertCircle className="mr-1 h-3 w-3" /> M: {altScore.effectsSummary.moderate}</Badge>}
                      {altScore.effectsSummary.severe > 0 && <Badge variant="default" className="bg-orange-600 hover:bg-orange-700 text-white"><AlertCircle className="mr-1 h-3 w-3" /> S: {altScore.effectsSummary.severe}</Badge>}
                      {altScore.effectsSummary.critical > 0 && <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" /> Crit: {altScore.effectsSummary.critical}</Badge>}
                      {altScore.effectsSummary.pending > 0 && <Badge variant="secondary"><Zap className="mr-1 h-3 w-3" /> P: {altScore.effectsSummary.pending}</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {alternativeScores.length === 0 && (
            <p className="text-muted-foreground text-center py-8">No alternatives scored yet. Define effects and use the AI analyzer.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="font-headline text-xl">Interpretation Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong>Weighted Score:</strong> Higher scores generally indicate a more environmentally favorable alternative, based on the defined factor weights and AI-inferred impact characters.</p>
            <p><strong>Impact Character Summary:</strong> (C: Compatible, M: Moderate, S: Severe, Crit: Critical, P: Pending AI Analysis). This provides a quick overview of the types of impacts associated with each alternative.</p>
            <p>This is a simplified scoring model for demonstration. A comprehensive EIA would involve more detailed multi-criteria analysis.</p>
        </CardContent>
      </Card>
    </div>
  );
}
