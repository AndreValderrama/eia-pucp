'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { factorService, FactorScope, FactorChange } from '@/lib/services/factor-service';
import { factorProposalService, approvalsNeeded } from '@/lib/services/factor-proposal-service';
import { groupService, isGroupOwner, normalizeEmail } from '@/lib/services/group-service';
import type { EnvironmentalFactor, FactorProposal, Group } from '@/lib/types';
import {
  Wind, Download, Loader2, Sparkles, PlusCircle, Scale, Users, User, ThumbsUp, ThumbsDown, AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FactorTree from '@/components/FactorTree';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const factorFormSchema = z.object({
  name: z.string().trim().min(2, 'El nombre es muy corto'),
  weight: z.coerce.number().min(0, 'El peso no puede ser negativo'),
  description: z.string().optional(),
});
type FactorFormValues = z.infer<typeof factorFormSchema>;

const PERSONAL = 'personal';
const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error');

const proposalLabel = (p: FactorProposal) => {
  if (p.type === 'add') return `Agregar “${p.data?.name}” (peso ${p.data?.weight})`;
  if (p.type === 'edit') {
    const renamed = p.targetName && p.data && p.targetName !== p.data.name;
    return `Editar “${p.targetName}”${renamed ? ` → “${p.data!.name}”` : ''} (peso ${p.data?.weight})`;
  }
  return `Eliminar “${p.targetName}” y sus subfactores`;
};

export default function FactorsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [scopeKey, setScopeKey] = useState<string>(PERSONAL);
  const [factors, setFactors] = useState<EnvironmentalFactor[]>([]);
  const [proposals, setProposals] = useState<FactorProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Add / edit dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFactor, setEditingFactor] = useState<EnvironmentalFactor | null>(null);
  const [parentIdForNewFactor, setParentIdForNewFactor] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FactorFormValues>({
    resolver: zodResolver(factorFormSchema),
  });

  const myEmail = normalizeEmail(user?.email || '');
  const group = groups.find(g => g.id === scopeKey) || null;
  const scope: FactorScope | null = !user ? null : group
    ? { type: 'group', groupId: group.id }
    : { type: 'user', uid: user.uid };

  const loadTree = useCallback(async () => {
    if (!scope) return;
    try {
      const [tree, props] = await Promise.all([
        factorService.getTree(scope),
        scope.type === 'group' ? factorProposalService.getProposals(scope.groupId) : Promise.resolve([]),
      ]);
      setFactors(tree);
      setProposals(props);
    } catch (error) {
      console.error('Error loading factors:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los factores.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, scopeKey, toast]);

  useEffect(() => {
    if (user?.email) groupService.getMyGroups(user.email).then(setGroups).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (user) { setLoading(true); loadTree(); }
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, loadTree]);

  const totalWeight = useMemo(() => factors.reduce((acc, item) => acc + item.weight, 0), [factors]);
  const pending = proposals.filter(p => p.status === 'pending');
  const history = proposals.filter(p => p.status !== 'pending').slice(0, 8);

  // Live duplicate warning while typing in the dialog.
  const typedName = watch('name') || '';
  const duplicate = typedName.trim().length >= 2
    ? factorService.findDuplicate(factors, typedName, editingFactor?.id)
    : null;

  /** Personal trees change at once; group trees go through a proposal. */
  const submitChange = async (change: FactorChange, targetName?: string) => {
    if (!user || !scope) return false;
    setIsSaving(true);
    try {
      if (scope.type === 'user') {
        const next = factorService.applyChange(factors, change, user.uid);
        await factorService.saveTree(scope, next);
        setFactors(next);
        toast({ title: 'Factores actualizados' });
      } else {
        const applied = await factorProposalService.propose(group!, myEmail, user.uid, {
          type: change.type,
          targetId: change.type === 'add' ? undefined : change.targetId,
          targetName,
          parentId: change.type === 'add' ? change.parentId : undefined,
          data: change.type === 'delete' ? undefined : change.data,
        });
        toast(applied
          ? { title: 'Cambio aplicado' }
          : { title: 'Propuesta enviada', description: `Se aplicará cuando la aprueben ${approvalsNeeded(group!)} de ${group!.memberEmails.length} miembros.` });
        await loadTree();
      }
      return true;
    } catch (err) {
      toast({ title: 'No se pudo guardar', description: errorMessage(err), variant: 'destructive' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportTemplate = async () => {
    if (!user || !scope) return;
    setIsImporting(true);
    try {
      const newTree = await factorService.importTemplate(user.uid, scope);
      setFactors(newTree);
      toast({ title: 'Plantilla cargada' });
    } catch (error) {
      console.error('Error importing template:', error);
      toast({ title: 'Error', description: 'No se pudo cargar la plantilla.', variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenEdit = (factor: EnvironmentalFactor) => {
    setEditingFactor(factor);
    setParentIdForNewFactor(null);
    reset({ name: factor.name, weight: factor.weight, description: factor.description || '' });
    setIsDialogOpen(true);
  };

  const handleOpenAdd = (parentId: string | null = null) => {
    setEditingFactor(null);
    setParentIdForNewFactor(parentId);
    reset({ name: '', weight: 0, description: '' });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: FactorFormValues) => {
    const payload = { name: data.name.trim(), weight: data.weight, description: data.description || '' };
    const ok = editingFactor
      ? await submitChange({ type: 'edit', targetId: editingFactor.id, data: payload }, editingFactor.name)
      : await submitChange({ type: 'add', parentId: parentIdForNewFactor, data: payload });
    if (ok) setIsDialogOpen(false);
  };

  const handleDelete = (factorId: string) => {
    const target = factorService.findFactor(factors, factorId);
    submitChange({ type: 'delete', targetId: factorId }, target?.name);
  };

  const handleVote = async (proposal: FactorProposal, approve: boolean) => {
    if (!user || !group) return;
    try {
      const status = await factorProposalService.vote(group, proposal.id, myEmail, user.uid, approve);
      toast({
        title: status === 'applied' ? 'Cambio aprobado y aplicado'
          : status === 'rejected' ? 'Propuesta rechazada' : 'Voto registrado',
      });
      await loadTree();
    } catch (err) {
      toast({ title: 'Error', description: errorMessage(err), variant: 'destructive' });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando factores ambientales…</p>
      </div>
    );
  }

  if (!user) return null;

  const canImport = factors.length === 0 && (!group || isGroupOwner(group, user.uid));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl text-primary flex items-center gap-2">
            <Wind className="h-8 w-8" /> Factores Ambientales
          </h1>
          <p className="text-muted-foreground mt-1">
            {group
              ? `Árbol compartido del grupo “${group.name}”. Cada cambio necesita la aprobación de ${approvalsNeeded(group)} de ${group.memberEmails.length} miembros.`
              : 'Tu árbol personal, usado en los proyectos que no pertenecen a un grupo.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Select value={scopeKey} onValueChange={setScopeKey}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={PERSONAL}><span className="flex items-center gap-2"><User className="h-4 w-4" />Mis factores</span></SelectItem>
              {groups.map(g => (
                <SelectItem key={g.id} value={g.id}><span className="flex items-center gap-2"><Users className="h-4 w-4" />{g.name}</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => handleOpenAdd(null)} variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" /> {group ? 'Proponer factor raíz' : 'Agregar factor raíz'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {group && pending.length > 0 && (
            <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" /> Propuestas pendientes ({pending.length})
                </CardTitle>
                <CardDescription>Se aplican con {approvalsNeeded(group)} aprobaciones.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {pending.map(p => {
                  const myVote = p.approvals.includes(myEmail) ? 'up' : p.rejections.includes(myEmail) ? 'down' : null;
                  return (
                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border bg-card p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{proposalLabel(p)}</p>
                        <p className="text-xs text-muted-foreground">
                          Propuesto por {p.proposedBy} · {p.approvals.length} a favor · {p.rejections.length} en contra
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant={myVote === 'up' ? 'default' : 'outline'} onClick={() => handleVote(p, true)}>
                          <ThumbsUp className="mr-1 h-4 w-4" />Aprobar
                        </Button>
                        <Button size="sm" variant={myVote === 'down' ? 'destructive' : 'outline'} onClick={() => handleVote(p, false)}>
                          <ThumbsDown className="mr-1 h-4 w-4" />Rechazar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {factors.length > 0 ? (
            <Card className="shadow-xl border-t-4 border-t-primary">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Marco de evaluación actual
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <FactorTree
                  factors={factors}
                  onEdit={handleOpenEdit}
                  onAddChild={handleOpenAdd}
                  onDelete={handleDelete}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-dashed p-12 text-center bg-card/50 space-y-3">
              {canImport ? (
                <Button size="lg" onClick={handleImportTemplate} disabled={isImporting}>
                  <Download className="mr-2 h-5 w-5" /> Cargar plantilla de factores
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  El árbol del grupo está vacío. El creador del grupo puede cargar la plantilla, o cualquier miembro puede proponer factores.
                </p>
              )}
            </Card>
          )}

          {group && history.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Historial reciente</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {history.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <Badge variant={p.status === 'applied' ? 'default' : 'secondary'} className="text-[10px]">
                      {p.status === 'applied' ? 'Aplicado' : 'Rechazado'}
                    </Badge>
                    <span className="truncate">{proposalLabel(p)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24 shadow-lg border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-headline flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" /> Balance de pesos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-sm text-muted-foreground">Peso total</span>
                <span className={`text-2xl font-bold ${totalWeight === 1000 ? 'text-green-600' : 'text-amber-600'}`}>{totalWeight}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${totalWeight === 1000 ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min((totalWeight / 1000) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {totalWeight === 1000 ? '¡Balanceado! La suma de los factores raíz es 1000.' : 'Consejo: apunta a una suma total de 1000.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline">
              {editingFactor ? 'Editar factor' : 'Nuevo factor'}{group ? ' (propuesta)' : ''}
            </DialogTitle>
            <DialogDescription>
              {group
                ? 'El cambio se aplicará cuando lo apruebe la mayoría del grupo.'
                : parentIdForNewFactor ? 'Se agregará como subfactor.' : 'Define el nombre y el peso.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" {...register('name')} aria-invalid={!!duplicate} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                {duplicate && <p className="text-xs text-destructive">Ya existe un factor llamado “{duplicate.name}”.</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="weight">Peso</Label>
                <Input
                  id="weight"
                  type="number"
                  {...register('weight')}
                  disabled={editingFactor ? (editingFactor.children?.length ?? 0) > 0 : false}
                />
                {editingFactor && (editingFactor.children?.length ?? 0) > 0 && (
                  <p className="text-[10px] text-amber-600 font-medium italic">
                    Es un factor padre: su peso es la suma de sus subfactores.
                  </p>
                )}
                {errors.weight && <p className="text-xs text-destructive">{errors.weight.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" {...register('description')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving || !!duplicate}>
                {isSaving ? 'Guardando…' : group ? 'Enviar propuesta' : 'Guardar factor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
