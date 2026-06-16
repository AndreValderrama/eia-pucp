'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, CheckCircle, AlertCircle, Zap, Layers, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mockProject } from '@/lib/mockData';
import type { Alternative, Effect, EnvironmentalFactor, Project } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { alternativeService } from '@/lib/services/alternative-service';
import { factorService } from '@/lib/services/factor-service';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"

// Simplified scoring for demonstration.
const scoreCharacter = (character: Effect['character']): number => {
  switch (character) {
    case 'compatible': return 4;
    case 'moderate': return 3;
    case 'severe': return 2;
    case 'critical': return 1;
    default: return 0; 
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
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [leafFactors, setLeafFactors] = useState<EnvironmentalFactor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setProject(mockProject as any); // Still mock for now

    async function loadData() {
      if (user) {
        try {
          const [alts, factorTree] = await Promise.all([
            alternativeService.getUserAlternatives(user.uid),
            factorService.getUserFactors(user.uid)
          ]);
          setAlternatives(alts);
          setLeafFactors(factorService.getLeafFactors(factorTree));
        } catch (error) {
          console.error("Error loading results data:", error);
        } finally {
          setLoading(false);
        }
      } else if (!authLoading) {
        setLoading(false);
      }
    }

    loadData();
  }, [user, authLoading]);

  const alternativeScores = useMemo(() => {
    if (alternatives.length === 0) return [];

    const scores = alternatives.map(alt => {
      let totalScore = 0;
      let weightedScore = 0;
      const effectsSummary = { compatible: 0, moderate: 0, severe: 0, critical: 0, pending: 0 };

      alt.effects.forEach(effect => {
        const characterScore = scoreCharacter(effect.character);
        totalScore += characterScore;
        
        // Find factor in our leaf factors to get its weight
        const factor = leafFactors.find(f => f.name === effect.factorName);
        if (factor) {
          weightedScore += characterScore * factor.weight;
        }

        if (effect.character && effect.character !== 'pending') {
          effectsSummary[effect.character as keyof typeof effectsSummary]++;
        } else {
          effectsSummary.pending++;
        }
      });
      return { name: alt.name, totalScore, weightedScore, effectsSummary };
    });

    return scores.sort((a, b) => b.weightedScore - a.weightedScore);
  }, [alternatives, leafFactors]);

  const chartData = useMemo(() => 
    alternativeScores.map(alt => ({
      name: alt.name,
      score: Number(alt.weightedScore.toFixed(2)),
      fill: "hsl(var(--primary))",
    })), [alternativeScores]);

  const chartConfig = {
    score: {
      label: "Weighted Score",
      color: "hsl(var(--primary))",
    },
  } satisfies Parameters<typeof ChartContainer>[0]["config"];


  if (authLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Calculating assessment results...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-center">
        <h2 className="text-2xl font-headline text-primary">Assessment Results</h2>
        <p className="text-muted-foreground">Please sign in to view your assessment results.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-primary flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Project Results & Comparison
          </CardTitle>
          <CardDescription>
            Summary of environmental impact assessment. Alternatives are ranked by weighted score.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-md">
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
                <p className="text-muted-foreground text-center py-12">No data available for chart.</p>
            )}
            </CardContent>
        </Card>

        <Card className="shadow-md bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="font-headline text-xl">Top Alternative</CardTitle>
                <CardDescription>Based on weighted environmental scores</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                {alternativeScores.length > 0 ? (
                    <div className="space-y-4">
                        <div className="bg-primary/20 p-4 rounded-full inline-block">
                            <Layers className="h-12 w-12 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-primary">{alternativeScores[0].name}</h3>
                            <p className="text-sm text-muted-foreground">Score: {alternativeScores[0].weightedScore.toFixed(2)}</p>
                        </div>
                        <Badge className="bg-green-500 text-white hover:bg-green-600 px-4 py-1 text-sm">
                            Most Compatible
                        </Badge>
                    </div>
                ) : (
                    <p className="text-muted-foreground">No assessment data.</p>
                )}
            </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
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
                      {altScore.effectsSummary.compatible > 0 && <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="mr-1 h-3-w-3" /> C: {altScore.effectsSummary.compatible}</Badge>}
                      {altScore.effectsSummary.moderate > 0 && <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-black"><AlertCircle className="mr-1 h-3-w-3" /> M: {altScore.effectsSummary.moderate}</Badge>}
                      {altScore.effectsSummary.severe > 0 && <Badge variant="default" className="bg-orange-600 hover:bg-orange-700 text-white"><AlertCircle className="mr-1 h-3-w-3" /> S: {altScore.effectsSummary.severe}</Badge>}
                      {altScore.effectsSummary.critical > 0 && <Badge variant="destructive"><AlertCircle className="mr-1 h-3-w-3" /> Crit: {altScore.effectsSummary.critical}</Badge>}
                      {altScore.effectsSummary.pending > 0 && <Badge variant="secondary"><Zap className="mr-1 h-3-w-3" /> P: {altScore.effectsSummary.pending}</Badge>}
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
            <p><strong>Weighted Score:</strong> Calculated by multiplying the Impact Character score (Compatible=4, Critical=1) by the weight of the specific environmental factor defined in your factors tree.</p>
            <p><strong>Impact Character Summary:</strong> (C: Compatible, M: Moderate, S: Severe, Crit: Critical, P: Pending AI Analysis).</p>
        </CardContent>
      </Card>
    </div>
  );
}
