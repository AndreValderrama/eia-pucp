'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart3, CheckCircle, AlertCircle, Zap, Layers, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Alternative, Effect, EnvironmentalFactor, Project } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { projectService } from '@/lib/services/project-service';
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

export default function ResultsPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allAlternatives, setAllAlternatives] = useState<Alternative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (user) {
        try {
          const userProjects = await projectService.getUserProjects(user.uid);
          setProjects(userProjects);
          
          // Load alternatives for all projects
          const alts = await Promise.all(userProjects.map(p => alternativeService.getProjectAlternatives(p.id)));
          setAllAlternatives(alts.flat());
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

  const projectsData = useMemo(() => {
    return projects.map(p => {
        const alts = allAlternatives.filter(a => a.projectId === p.id);
        const ratedAlts = alts.filter(a => a.valorada);
        return {
            ...p,
            alternatives: alts,
            ratedCount: ratedAlts.length
        }
    });
  }, [projects, allAlternatives]);

  const chartConfig = {
    valor: { label: "Valoración Total", color: "hsl(var(--primary))" },
  } satisfies Parameters<typeof ChartContainer>[0]["config"];

  if (authLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Calculando resultados de valoración...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4">
      <Card className="shadow-lg border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-primary flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Resultados por Proyecto
          </CardTitle>
          <CardDescription>Resumen comparativo de alternativas valoradas.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-8">
        {projectsData.map(project => (
            <Card key={project.id} className="shadow-md">
                <CardHeader>
                    <CardTitle className="font-headline text-xl text-primary">{project.name}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Alternativa</TableHead>
                                <TableHead className="text-right">Valoración Total</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {project.alternatives.map(alt => (
                                <TableRow key={alt.id}>
                                    <TableCell className="font-medium">{alt.name}</TableCell>
                                    <TableCell className="text-right font-mono font-bold">
                                        {alt.valorada ? alt.valorTotal?.toFixed(3) : '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={alt.valorada ? "default" : "secondary"}>
                                            {alt.valorada ? "Valorada" : "Pendiente"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}
