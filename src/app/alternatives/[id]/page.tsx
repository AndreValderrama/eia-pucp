'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Layers, ChevronLeft, Loader2, Zap, Wind, ArrowRight, Plus, Trash2, CheckCircle2, Calculator,
  Pencil, Grid3x3, Vote, Users,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/lib/auth-context';
import { alternativeService } from '@/lib/services/alternative-service';
import { projectService } from '@/lib/services/project-service';
import { factorService } from '@/lib/services/factor-service';
import { groupService } from '@/lib/services/group-service';
import { impactService } from '@/lib/services/impact-service';
import type {
  Project, Alternative, ActionNode, EnvironmentalFactor, Impact, ImpactImportance, Group,
} from '@/lib/types';
import {
  addNode, childTypeOf, collectIds, deleteNode, duplicateNode, findNode, newNodeId, renameNode,
} from '@/lib/utils/action-tree';
import { countImportanceVotes, IMPORTANCE_LABEL } from '@/lib/utils/impact-calculations';
import { useToast } from '@/hooks/use-toast';
import ActionTree from '@/components/ActionTree';
import FactorTree from '@/components/FactorTree';
import ImpactEvaluationDialog from '@/components/ImpactEvaluationDialog';
import ImpactMatrix, { MatrixMode, impactScore } from '@/components/ImpactMatrix';

const IMPORTANCE_ORDER: ImpactImportance[] = ['despreciable', 'notable', 'significativo', 'difuso'];

const BADGE_STYLE: Record<ImpactImportance, string> = {
  significativo: 'bg-orange-600',
  notable: 'bg-amber-500',
  difuso: 'bg-blue-500',
  despreciable: 'bg-slate-400',
};

type ScreeningFilter = 'all' | 'passed' | 'discarded' | 'mine';

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error');

export default function AlternativeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const id = params.id as string;

  const [alternative, setAlternative] = useState<Alternative | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [actionTree, setActionTree] = useState<ActionNode[]>([]);
  const [factorTree, setFactorTree] = useState<EnvironmentalFactor[]>([]);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [loading, setLoading] = useState(true);

  // Linking
  const [selectedAction, setSelectedAction] = useState<ActionNode | null>(null);
  const [selectedFactor, setSelectedFactor] = useState<EnvironmentalFactor | null>(null);
  const [isImpactDialogOpen, setIsImpactDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Action tree editing
  const [editingStructure, setEditingStructure] = useState(false);
  const [nodeDialog, setNodeDialog] = useState<{ mode: 'add' | 'rename'; parentId: string | null; node?: ActionNode } | null>(null);
  const [nodeName, setNodeName] = useState('');

  // Matrix & screening
  const [matrixMode, setMatrixMode] = useState<MatrixMode>('identification');
  const [filter, setFilter] = useState<ScreeningFilter>('all');

  // Evaluation
  const [isEvalDialogOpen, setIsEvalDialogOpen] = useState(false);
  const [impactToEvalId, setImpactToEvalId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user || !id) return;
    try {
      const altData = await alternativeService.getAlternative(id);
      if (!altData) return;
      setAlternative(altData);

      const [projData, altImpacts] = await Promise.all([
        projectService.getProject(altData.projectId),
        impactService.getAlternativeImpacts(id),
      ]);
      setImpacts(altImpacts);
      if (projData) {
        setProject(projData);
        setActionTree(altData.actionTree || projData.actionTree || []);
        const [tree, grp] = await Promise.all([
          factorService.getTree(factorService.scopeForProject(projData)),
          projData.groupId ? groupService.getGroup(projData.groupId).catch(() => null) : Promise.resolve(null),
        ]);
        setFactorTree(tree);
        setGroup(grp);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (!authLoading && user) loadData();
    else if (!authLoading) setLoading(false);
  }, [authLoading, user, loadData]);

  const leafFactors = useMemo(() => factorService.getLeafFactors(factorTree), [factorTree]);
  const totalFactorWeight = useMemo(() => leafFactors.reduce((sum, f) => sum + f.weight, 0), [leafFactors]);
  const memberCount = group?.memberEmails.length ?? 1;
  const impactToEval = impacts.find(i => i.id === impactToEvalId) || null;

  const visibleImpacts = useMemo(() => {
    switch (filter) {
      case 'passed': return impacts.filter(i => i.importance === 'significativo');
      case 'discarded': return impacts.filter(i => i.importance === 'despreciable');
      case 'mine': return impacts.filter(i => !user || !i.votes?.[user.uid]);
      default: return impacts;
    }
  }, [impacts, filter, user]);

  const passedCount = impacts.filter(i => i.importance === 'significativo').length;

  /* ---------- Action tree editing ---------- */

  const saveTree = async (next: ActionNode[], message: string) => {
    if (!alternative) return;
    const previous = actionTree;
    setActionTree(next);
    try {
      await alternativeService.updateAlternative(alternative.id, { actionTree: next });
      toast({ title: message });
    } catch (err) {
      setActionTree(previous);
      toast({ title: 'Error', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const openAddNode = (parentId: string | null) => {
    setNodeName('');
    setNodeDialog({ mode: 'add', parentId });
  };

  const openRenameNode = (node: ActionNode) => {
    setNodeName(node.name);
    setNodeDialog({ mode: 'rename', parentId: null, node });
  };

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeDialog || !nodeName.trim()) return;
    if (nodeDialog.mode === 'rename' && nodeDialog.node) {
      await saveTree(renameNode(actionTree, nodeDialog.node.id, nodeName.trim()), 'Nombre actualizado');
    } else {
      const parent = nodeDialog.parentId ? findNode(actionTree, nodeDialog.parentId) : null;
      const node: ActionNode = { id: newNodeId(), name: nodeName.trim(), type: childTypeOf(parent), children: [] };
      await saveTree(addNode(actionTree, nodeDialog.parentId, node), 'Elemento agregado');
    }
    setNodeDialog(null);
  };

  const handleDeleteNode = async (nodeId: string) => {
    const node = findNode(actionTree, nodeId);
    if (!node) return;
    const ids = new Set(collectIds(node));
    const linked = impacts.filter(i => ids.has(i.actionId)).length;
    if (linked) {
      toast({
        title: 'No se puede eliminar',
        description: `“${node.name}” tiene ${linked} impacto(s) vinculado(s). Elimínalos primero.`,
        variant: 'destructive',
      });
      return;
    }
    if (selectedAction && ids.has(selectedAction.id)) setSelectedAction(null);
    await saveTree(deleteNode(actionTree, nodeId), 'Elemento eliminado');
  };

  const handleDuplicateNode = (nodeId: string) => saveTree(duplicateNode(actionTree, nodeId), 'Elemento duplicado');

  /* ---------- Impacts ---------- */

  const handleCreateImpact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedAction || !selectedFactor || !alternative || !project) return;
    if (impacts.some(i => i.actionId === selectedAction.id && i.factorId === selectedFactor.id)) {
      toast({ title: 'Ya existe ese impacto', description: 'Esa acción ya está vinculada con ese factor.', variant: 'destructive' });
      return;
    }

    const formData = new FormData(e.currentTarget);
    const importance = formData.get('importance') as ImpactImportance;
    const description = formData.get('description') as string;
    const impactName = formData.get('impactName') as string;

    setIsSaving(true);
    try {
      await impactService.createImpact(user, {
        projectId: project.id,
        alternativeId: alternative.id,
        actionId: selectedAction.id,
        actionName: selectedAction.name,
        factorId: selectedFactor.id,
        factorName: selectedFactor.name,
        importance,
        normalizedWeight: selectedFactor.weight / (totalFactorWeight || 1),
        description: description ? `${impactName}: ${description}` : impactName,
      });

      toast({ title: 'Impacto creado', description: `${selectedAction.name} → ${selectedFactor.name}` });
      setIsImpactDialogOpen(false);
      setSelectedAction(null);
      setSelectedFactor(null);
      loadData();
    } catch (error) {
      toast({ title: 'Error al crear el impacto', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVote = async (impact: Impact, value: ImpactImportance) => {
    if (!user) return;
    try {
      await impactService.voteImportance(impact.id, user, value);
      await loadData();
    } catch (err) {
      toast({ title: 'No se pudo votar', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const handleDeleteImpact = async (impactId: string) => {
    try {
      await impactService.deleteImpact(impactId);
      setImpacts(prev => prev.filter(i => i.id !== impactId));
      toast({ title: 'Impacto eliminado' });
    } catch (error) {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  const handleMatrixClick = (action: ActionNode, factor: EnvironmentalFactor, impact?: Impact) => {
    if (impact) {
      setFilter('all');
      document.getElementById(`impact-${impact.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSelectedAction(action);
    setSelectedFactor(factor);
    setIsImpactDialogOpen(true);
  };

  const handleDeleteAlternative = async () => {
    if (!alternative) return;
    try {
      await alternativeService.deleteAlternative(alternative.id);
      toast({ title: 'Alternativa eliminada' });
      router.push('/');
    } catch (error) {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  if (authLoading || loading) return <div className="flex justify-center p-24"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!alternative || !project) return <div className="p-12 text-center">Alternativa no encontrada.</div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <Button variant="outline" size="sm" asChild className="w-fit">
          <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Panel</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Proyecto: {project.name}</Badge>
          {group && <Badge variant="secondary"><Users className="h-3 w-3 mr-1" />{group.name} · {memberCount} miembros</Badge>}
          <Badge className="bg-primary text-white">Alternativa: {alternative.name}</Badge>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/alternatives/${alternative.id}/edit`}><Pencil className="h-4 w-4 mr-1" />Editar</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" aria-label="Eliminar alternativa"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar la alternativa “{alternative.name}”?</AlertDialogTitle>
                <AlertDialogDescription>Se eliminarán también todos sus impactos. Esta acción no se puede deshacer.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAlternative} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="mapping" className="w-full">
        <TabsList>
          <TabsTrigger value="mapping" className="gap-2"><Layers className="h-4 w-4" /> Mapeo</TabsTrigger>
          <TabsTrigger value="matrix" className="gap-2"><Grid3x3 className="h-4 w-4" /> Matriz</TabsTrigger>
          <TabsTrigger value="impacts" className="gap-2"><Vote className="h-4 w-4" /> Impactos y votación ({impacts.length})</TabsTrigger>
        </TabsList>

        {/* ---------- Mapping ---------- */}
        <TabsContent value="mapping" className="space-y-6 mt-6">
          <div>
            <h2 className="text-2xl font-headline text-primary">Mapeo de impactos</h2>
            <p className="text-sm text-muted-foreground">
              Selecciona una acción a la izquierda y un factor a la derecha para vincular un impacto.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-start">
            <div className="md:col-span-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-2">
                <h3 className="flex items-center gap-2 font-headline font-bold text-amber-600 uppercase text-xs tracking-widest">
                  <Zap className="h-4 w-4" /> Estructura de acciones
                </h3>
                <div className="flex items-center gap-2">
                  {editingStructure && (
                    <Button size="sm" variant="outline" className="h-7" onClick={() => openAddNode(null)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Fase
                    </Button>
                  )}
                  <Label htmlFor="edit-structure" className="text-xs text-muted-foreground">Editar estructura</Label>
                  <Switch id="edit-structure" checked={editingStructure} onCheckedChange={setEditingStructure} />
                </div>
              </div>
              <div className="max-h-[600px] overflow-auto p-4 bg-muted/30 rounded-xl border">
                {actionTree.length ? (
                  <ActionTree
                    nodes={actionTree}
                    onSelect={node => setSelectedAction(node)}
                    selectedId={selectedAction?.id}
                    {...(editingStructure && {
                      onEdit: openRenameNode,
                      onAddChild: openAddNode,
                      onDelete: handleDeleteNode,
                      onDuplicate: handleDuplicateNode,
                    })}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Sin fases. Activa “Editar estructura” y agrega una fase.
                  </p>
                )}
              </div>
              {editingStructure && (
                <p className="text-[11px] text-muted-foreground px-2">
                  Pasa el cursor sobre un elemento para agregar hijos, renombrar, duplicar (copia con sus hijos) o eliminar.
                </p>
              )}
            </div>

            <div className="md:col-span-1 flex flex-col items-center justify-center h-full pt-12">
              <div className={`p-3 rounded-full transition-all ${selectedAction && selectedFactor ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-muted text-muted-foreground'}`}>
                <ArrowRight className="h-6 w-6" />
              </div>
              {selectedAction && selectedFactor && (
                <Button className="mt-4" size="sm" onClick={() => setIsImpactDialogOpen(true)}>Vincular</Button>
              )}
            </div>

            <div className="md:col-span-5 space-y-3">
              <h3 className="flex items-center gap-2 font-headline font-bold text-primary uppercase text-xs tracking-widest px-2 h-7">
                <Wind className="h-4 w-4" /> Factores ambientales
                <span className="normal-case font-normal text-muted-foreground tracking-normal">
                  ({group ? `árbol del grupo` : 'árbol del creador del proyecto'})
                </span>
              </h3>
              <div className="max-h-[600px] overflow-auto p-4 bg-muted/30 rounded-xl border">
                {factorTree.length ? (
                  <FactorTree factors={factorTree} onSelect={factor => setSelectedFactor(factor)} selectedId={selectedFactor?.id} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No hay factores. Defínelos en <Link href="/factors" className="underline">Factores</Link>.
                  </p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ---------- Matrix ---------- */}
        <TabsContent value="matrix" className="space-y-4 mt-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-headline text-primary">Matriz acciones × factores</h2>
              <p className="text-sm text-muted-foreground">Haz clic en una celda vacía para vincular un impacto.</p>
            </div>
            <Tabs value={matrixMode} onValueChange={v => setMatrixMode(v as MatrixMode)}>
              <TabsList>
                <TabsTrigger value="identification">Identificación (X)</TabsTrigger>
                <TabsTrigger value="screening">Cribado por votación</TabsTrigger>
                <TabsTrigger value="valuation">Valoración</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ImpactMatrix
            actionTree={actionTree}
            factors={leafFactors}
            impacts={impacts}
            mode={matrixMode}
            memberCount={memberCount}
            onCellClick={handleMatrixClick}
          />
        </TabsContent>

        {/* ---------- Impacts & voting ---------- */}
        <TabsContent value="impacts" className="space-y-6 mt-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <h2 className="font-headline text-2xl text-primary flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6" /> Impactos y cribado
              </h2>
              <p className="text-sm text-muted-foreground">
                Cada miembro vota la importancia; gana la más votada (en empate, la más severa).
                {' '}{passedCount} de {impacts.length} pasan el cribado (significativos) y se valoran.
              </p>
            </div>
            <Select value={filter} onValueChange={v => setFilter(v as ScreeningFilter)}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los impactos</SelectItem>
                <SelectItem value="passed">Pasan el cribado (significativos)</SelectItem>
                <SelectItem value="discarded">Descartados (despreciables)</SelectItem>
                <SelectItem value="mine">Pendientes de mi voto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibleImpacts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleImpacts.map(impact => {
                const counts = countImportanceVotes(impact.votes);
                const voters = Object.values(impact.votes || {});
                const myVote = user ? impact.votes?.[user.uid]?.value : undefined;
                const score = impactScore(impact);
                return (
                  <Card key={impact.id} id={`impact-${impact.id}`} className="flex flex-col">
                    <CardHeader className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <Badge className={BADGE_STYLE[impact.importance]}>{IMPORTANCE_LABEL[impact.importance]}</Badge>
                        <div className="flex gap-1">
                          {impact.importance === 'significativo' && (
                            <Button
                              variant="outline" size="sm" className="h-7 text-orange-700 border-orange-300"
                              onClick={() => { setImpactToEvalId(impact.id); setIsEvalDialogOpen(true); }}
                            >
                              <Calculator className="h-3.5 w-3.5 mr-1" />Valorar
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label="Eliminar impacto">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar este impacto?</AlertDialogTitle>
                                <AlertDialogDescription>Se perderán sus votos y su valoración.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteImpact(impact.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-amber-600 font-bold uppercase tracking-tight flex items-center gap-1">
                          <Zap className="h-3 w-3" /> {impact.actionName}
                        </div>
                        <div className="text-[10px] text-primary font-bold uppercase tracking-tight flex items-center gap-1">
                          <Wind className="h-3 w-3" /> {impact.factorName}
                        </div>
                      </div>
                      {impact.description && (
                        <p className="text-xs text-muted-foreground italic border-l-2 pl-2">{impact.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-2 flex-1">
                      <div className="text-[11px] font-semibold text-muted-foreground">
                        Tu voto · {voters.length}/{memberCount} miembros votaron
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {IMPORTANCE_ORDER.map(k => (
                          <Button
                            key={k}
                            size="sm"
                            variant={myVote === k ? 'default' : 'outline'}
                            className={`h-auto py-1 flex flex-col text-[10px] leading-tight ${myVote === k ? BADGE_STYLE[k] : ''}`}
                            onClick={() => handleVote(impact, k)}
                            title={`Votar ${IMPORTANCE_LABEL[k]}`}
                          >
                            <span>{IMPORTANCE_LABEL[k]}</span>
                            <span className="font-bold">{counts[k]}</span>
                          </Button>
                        ))}
                      </div>
                      {voters.length > 0 && (
                        <p className="text-[10px] text-muted-foreground truncate" title={voters.map(v => `${v.email}: ${v.value}`).join('\n')}>
                          Votaron: {voters.map(v => v.email.split('@')[0]).join(', ')}
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="p-3 bg-muted/20 text-[10px] flex justify-between">
                      <span>Peso norm.: {impact.normalizedWeight.toFixed(4)}</span>
                      {score !== null && <span className="font-mono font-semibold">Valor: {score.toFixed(2)}</span>}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="p-12 border-2 border-dashed rounded-2xl text-center text-muted-foreground bg-muted/10">
              {impacts.length ? 'Ningún impacto coincide con el filtro.' : 'Aún no hay impactos. Créalos desde Mapeo o Matriz.'}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add / rename action node */}
      <Dialog open={!!nodeDialog} onOpenChange={open => !open && setNodeDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {nodeDialog?.mode === 'rename'
                ? 'Renombrar'
                : `Nueva ${childTypeOf(nodeDialog?.parentId ? findNode(actionTree, nodeDialog.parentId) : null) === 'phase' ? 'fase'
                  : childTypeOf(nodeDialog?.parentId ? findNode(actionTree, nodeDialog.parentId) : null) === 'labor' ? 'labor' : 'acción'}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveNode} className="space-y-4">
            <Input autoFocus value={nodeName} onChange={e => setNodeName(e.target.value)} placeholder="Nombre" required />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNodeDialog(null)}>Cancelar</Button>
              <Button type="submit" disabled={!nodeName.trim()}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create impact */}
      <Dialog open={isImpactDialogOpen} onOpenChange={setIsImpactDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Nuevo impacto ambiental</DialogTitle>
            <DialogDescription>
              Vinculando <strong>{selectedAction?.name}</strong> con <strong>{selectedFactor?.name}</strong>.
              Tu elección cuenta como tu voto; el resto del grupo votará después.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateImpact} className="space-y-6 pt-4">
            <div className="space-y-3">
              <Label className="text-sm font-bold">Importancia (tu voto)</Label>
              <RadioGroup name="importance" defaultValue="notable" className="grid grid-cols-2 gap-4">
                {IMPORTANCE_ORDER.map(k => (
                  <div key={k} className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={k} id={`imp-${k}`} />
                    <Label htmlFor={`imp-${k}`} className="font-medium cursor-pointer">{IMPORTANCE_LABEL[k]}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="impactName" className="text-sm font-bold">Nombre del impacto</Label>
              <Input id="impactName" name="impactName" required placeholder="Nombre corto del impacto" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-bold">Justificación / descripción</Label>
              <Textarea id="description" name="description" placeholder="¿Por qué esta acción afecta a este factor?" className="min-h-[100px]" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsImpactDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Creando…' : 'Crear impacto'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ImpactEvaluationDialog
        impact={impactToEval}
        isOpen={isEvalDialogOpen}
        onOpenChange={setIsEvalDialogOpen}
        onUpdate={loadData}
        memberCount={memberCount}
      />
    </div>
  );
}
