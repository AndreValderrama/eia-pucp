'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Calculator, Activity, BarChart3 } from 'lucide-react';
import { Impact, QualitativeAssessment, QuantitativeAssessment } from '@/lib/types';
import { 
  calculateQualitativeImportance, 
  calculateQuantitativeValue, 
  QUALITATIVE_WEIGHTS 
} from '@/lib/utils/impact-calculations';
import { impactService } from '@/lib/services/impact-service';
import { useToast } from '@/hooks/use-toast';

interface ImpactEvaluationDialogProps {
  impact: Impact | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export default function ImpactEvaluationDialog({ impact, isOpen, onOpenChange, onUpdate }: ImpactEvaluationDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Qualitative State
  const [qualitative, setQualitative] = useState<QualitativeAssessment>(() => ({
    signo: impact?.qualitative?.signo || '-',
    acumulacion: impact?.qualitative?.acumulacion || 1,
    extension: impact?.qualitative?.extension || 1,
    intensidad: impact?.qualitative?.intensidad || 1,
    persistencia: impact?.qualitative?.persistencia || 1,
    reversibilidad: impact?.qualitative?.reversibilidad || 1,
    recuperabilidad: impact?.qualitative?.recuperabilidad || 1,
    periodicidad: impact?.qualitative?.periodicidad || 1,
    momento: impact?.qualitative?.momento || 1,
    efecto: impact?.qualitative?.efecto || 3,
    calculatedImportance: impact?.qualitative?.calculatedImportance || 0,
  }));

  // Quantitative State
  const [quantitative, setQuantitative] = useState<QuantitativeAssessment>(() => ({
    functionType: impact?.quantitative?.functionType || 'Lineal creciente',
    min: impact?.quantitative?.min ?? 0,
    max: impact?.quantitative?.max ?? 100,
    x: impact?.quantitative?.x ?? 50,
    umbral: impact?.quantitative?.umbral ?? 0,
    a: impact?.quantitative?.a ?? 0,
    calculatedValue: impact?.quantitative?.calculatedValue ?? 0.5,
  }));

  // Update importance when qualitative changes
  useEffect(() => {
    const importance = calculateQualitativeImportance(qualitative);
    setQualitative(prev => ({ ...prev, calculatedImportance: importance }));
  }, [
    qualitative.signo, qualitative.acumulacion, qualitative.extension, 
    qualitative.intensidad, qualitative.persistencia, qualitative.reversibilidad, 
    qualitative.recuperabilidad, qualitative.periodicidad, qualitative.momento, 
    qualitative.efecto
  ]);

  // Update value when quantitative changes
  useEffect(() => {
    const value = calculateQuantitativeValue(
      quantitative.functionType,
      quantitative.x,
      quantitative.min,
      quantitative.max,
      { umbral: quantitative.umbral, a: quantitative.a }
    );
    setQuantitative(prev => ({ ...prev, calculatedValue: value }));
  }, [
    quantitative.functionType, quantitative.x, quantitative.min, 
    quantitative.max, quantitative.umbral, quantitative.a
  ]);

  // Reset state when impact changes
  useEffect(() => {
    if (impact) {
      if (impact.qualitative) setQualitative(impact.qualitative);
      if (impact.quantitative) setQuantitative(impact.quantitative);
    }
  }, [impact]);

  const finalScore = useMemo(() => {
    if (!impact) return 0;
    return impact.normalizedWeight * qualitative.calculatedImportance * quantitative.calculatedValue;
  }, [impact, qualitative.calculatedImportance, quantitative.calculatedValue]);

  const handleSave = async () => {
    if (!impact) return;
    setIsSaving(true);
    try {
      await impactService.updateImpact(impact.id, {
        qualitative,
        quantitative
      });
      toast({ title: "Evaluation Saved", description: "The impact assessment has been updated." });
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error saving evaluation", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!impact) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Evaluación Significativa: {impact.factorName}
          </DialogTitle>
          <DialogDescription>
            Análisis detallado del impacto de <strong>{impact.actionName}</strong> sobre <strong>{impact.factorName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
          <div className="lg:col-span-2">
            <Tabs defaultValue="qualitative" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qualitative" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Cualitativa
                </TabsTrigger>
                <TabsTrigger value="quantitative" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Cuantitativa
                </TabsTrigger>
              </TabsList>

              <TabsContent value="qualitative" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Signo */}
                  <div className="space-y-2">
                    <Label>Signo</Label>
                    <Select value={qualitative.signo} onValueChange={(v: '+' | '-') => setQualitative({...qualitative, signo: v})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+">Impacto beneficioso (+)</SelectItem>
                        <SelectItem value="-">Impacto perjudicial (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Intensidad */}
                  <div className="space-y-2">
                    <Label>Intensidad (IN)</Label>
                    <Select value={String(qualitative.intensidad)} onValueChange={(v) => setQualitative({...qualitative, intensidad: Number(v)})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUALITATIVE_WEIGHTS.INTENSIDAD).map(([k, v]) => (
                          <SelectItem key={k} value={String(v)}>{k.replace('_', ' ')} ({v})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Extension */}
                  <div className="space-y-2">
                    <Label>Extensión (E)</Label>
                    <Select value={String(qualitative.extension)} onValueChange={(v) => setQualitative({...qualitative, extension: Number(v)})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUALITATIVE_WEIGHTS.EXTENSION).map(([k, v]) => (
                          <SelectItem key={k} value={String(v)}>{k} ({v})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                   {/* Acumulacion */}
                   <div className="space-y-2">
                    <Label>Acumulación (A)</Label>
                    <Select value={String(qualitative.acumulacion)} onValueChange={(v) => setQualitative({...qualitative, acumulacion: Number(v)})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUALITATIVE_WEIGHTS.ACUMULACION).map(([k, v]) => (
                          <SelectItem key={k} value={String(v)}>{k} ({v})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Persistencia */}
                  <div className="space-y-2">
                    <Label>Persistencia (P)</Label>
                    <Select value={String(qualitative.persistencia)} onValueChange={(v) => setQualitative({...qualitative, persistencia: Number(v)})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUALITATIVE_WEIGHTS.PERSISTENCIA).map(([k, v]) => (
                          <SelectItem key={k} value={String(v)}>{k} ({v})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reversibilidad */}
                  <div className="space-y-2">
                    <Label>Reversibilidad (RV)</Label>
                    <Select value={String(qualitative.reversibilidad)} onValueChange={(v) => setQualitative({...qualitative, reversibilidad: Number(v)})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUALITATIVE_WEIGHTS.REVERSIBILIDAD).map(([k, v]) => (
                          <SelectItem key={k} value={String(v)}>{k.replace('_', ' ')} ({v})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Recuperabilidad */}
                  <div className="space-y-2">
                    <Label>Recuperabilidad (RC)</Label>
                    <Select value={String(qualitative.recuperabilidad)} onValueChange={(v) => setQualitative({...qualitative, recuperabilidad: Number(v)})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUALITATIVE_WEIGHTS.RECUPERABILIDAD).map(([k, v]) => (
                          <SelectItem key={k} value={String(v)}>{k.replace('_', ' ')} ({v})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Periodicidad */}
                  <div className="space-y-2">
                    <Label>Periodicidad (PR)</Label>
                    <Select value={String(qualitative.periodicidad)} onValueChange={(v) => setQualitative({...qualitative, periodicidad: Number(v)})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUALITATIVE_WEIGHTS.PERIODICIDAD).map(([k, v]) => (
                          <SelectItem key={k} value={String(v)}>{k} ({v})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                   {/* Momento */}
                   <div className="space-y-2">
                    <Label>Momento (MO)</Label>
                    <Select value={String(qualitative.momento)} onValueChange={(v) => setQualitative({...qualitative, momento: Number(v)})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUALITATIVE_WEIGHTS.MOMENTO).map(([k, v]) => (
                          <SelectItem key={k} value={String(v)}>{k.replace('_', ' ')} ({v})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Efecto */}
                  <div className="space-y-2">
                    <Label>Efecto (EF)</Label>
                    <Select value={String(qualitative.efecto)} onValueChange={(v) => setQualitative({...qualitative, efecto: Number(v)})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(QUALITATIVE_WEIGHTS.EFECTO).map(([k, v]) => (
                          <SelectItem key={k} value={String(v)}>{k} ({v})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="quantitative" className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Función de Transformación</Label>
                    <Select 
                        value={quantitative.functionType} 
                        onValueChange={(v) => setQuantitative({...quantitative, functionType: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lineal creciente">Lineal creciente</SelectItem>
                        <SelectItem value="Lineal decreciente">Lineal decreciente</SelectItem>
                        <SelectItem value="Parabólica creciente I">Parabólica creciente I</SelectItem>
                        <SelectItem value="Parabólica decreciente I">Parabólica decreciente I</SelectItem>
                        <SelectItem value="Parabólica creciente II">Parabólica creciente II</SelectItem>
                        <SelectItem value="Parabólica decreciente II">Parabólica decreciente II</SelectItem>
                        <SelectItem value="Parabólica doble creciente I">Parabólica doble creciente I</SelectItem>
                        <SelectItem value="Parabólica doble decreciente I">Parabólica doble decreciente I</SelectItem>
                        <SelectItem value="Parabólica doble creciente II">Parabólica doble creciente II</SelectItem>
                        <SelectItem value="Parabólica doble decreciente II">Parabólica doble decreciente II</SelectItem>
                        <SelectItem value="Máximo intermedio">Máximo intermedio</SelectItem>
                        <SelectItem value="Mínimo intermedio">Mínimo intermedio</SelectItem>
                        <SelectItem value="Umbral creciente">Umbral creciente</SelectItem>
                        <SelectItem value="Umbral decreciente">Umbral decreciente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Function Graph */}
                  <div className="h-32 w-full bg-muted/20 rounded-lg border flex items-center justify-center relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 100 32" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-primary"
                        points={(() => {
                          const points = [];
                          const steps = 20;
                          for (let i = 0; i <= steps; i++) {
                            const xVal = quantitative.min + (i / steps) * (quantitative.max - quantitative.min);
                            const yVal = calculateQuantitativeValue(quantitative.functionType, xVal, quantitative.min, quantitative.max, { umbral: quantitative.umbral, a: quantitative.a });
                            points.push(`${(i / steps) * 100},${32 - (yVal * 32)}`);
                          }
                          return points.join(' ');
                        })()}
                      />
                    </svg>
                    <div className="absolute top-1 left-2 text-[10px] text-muted-foreground">0.0</div>
                    <div className="absolute bottom-1 left-2 text-[10px] text-muted-foreground">1.0</div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Mínimo</Label>
                      <Input type="number" value={quantitative.min} onChange={(e) => setQuantitative({...quantitative, min: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Máximo</Label>
                      <Input type="number" value={quantitative.max} onChange={(e) => setQuantitative({...quantitative, max: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Actual (x)</Label>
                      <Input type="number" value={quantitative.x} onChange={(e) => setQuantitative({...quantitative, x: Number(e.target.value)})} />
                    </div>
                  </div>

                  {(quantitative.functionType.includes('intermedio')) && (
                     <div className="space-y-2">
                        <Label>Punto Óptimo (a)</Label>
                        <Input type="number" value={quantitative.a} onChange={(e) => setQuantitative({...quantitative, a: Number(e.target.value)})} />
                     </div>
                  )}

                  {(quantitative.functionType.includes('Umbral')) && (
                     <div className="space-y-2">
                        <Label>Umbral</Label>
                        <Input type="number" value={quantitative.umbral} onChange={(e) => setQuantitative({...quantitative, umbral: Number(e.target.value)})} />
                     </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-headline text-lg text-primary flex items-center gap-2">
                  <Calculator className="h-5 w-5" /> Resultados
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Importancia (I):</span>
                    <Badge variant={qualitative.signo === '+' ? 'default' : 'destructive'} className="font-mono">
                        {qualitative.calculatedImportance}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Magnitud (y):</span>
                    <Badge variant="outline" className="font-mono">
                        {quantitative.calculatedValue.toFixed(3)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Peso Norm.:</span>
                    <span className="font-mono">{impact.normalizedWeight.toFixed(4)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-primary/10">
                  <div className="text-xs uppercase text-muted-foreground font-bold tracking-wider mb-1">Valoración Final</div>
                  <div className="text-4xl font-black text-primary font-mono tracking-tighter">
                    {finalScore.toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardContent className="p-4 text-xs space-y-2 text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <p>La importancia se calcula sumando los parámetros ponderados según el signo seleccionado.</p>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <p>La magnitud (y) normaliza el valor actual (x) entre 0 y 1 usando la función seleccionada.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar Valoración"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
