'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  groupService, isGroupOwner, isValidPucpEmail, normalizeEmail, ALLOWED_EMAIL_DOMAIN,
} from '@/lib/services/group-service';
import { projectService } from '@/lib/services/project-service';
import { Group, Project } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Users, Plus, Pencil, Trash2, Check, X, Crown, Mail, Folder, UserPlus, Link2Off,
} from 'lucide-react';

const parseEmails = (text: string) =>
  Array.from(new Set(text.split(/[\s,;]+/).map(normalizeEmail).filter(Boolean)));

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Ocurrió un error');

export default function GroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [projectsByGroup, setProjectsByGroup] = useState<Record<string, Project[]>>({});
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEmails, setFormEmails] = useState('');
  const [saving, setSaving] = useState(false);

  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  const loadGroups = useCallback(async () => {
    if (!user?.email) return;
    try {
      const [myGroups, own] = await Promise.all([
        groupService.getMyGroups(user.email),
        projectService.getUserProjects(user.uid),
      ]);
      const groupProjects = await Promise.all(myGroups.map(g => projectService.getGroupProjects(g.id)));
      setGroups(myGroups);
      setMyProjects(own);
      setProjectsByGroup(Object.fromEntries(myGroups.map((g, i) => [g.id, groupProjects[i]])));
    } catch (e) {
      console.error('Error loading groups:', e);
      toast({ title: 'Error', description: 'No se pudieron cargar los grupos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) loadGroups();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, loadGroups]);

  const openCreate = () => {
    setEditingGroup(null);
    setFormName('');
    setFormDescription('');
    setFormEmails('');
    setDialogOpen(true);
  };

  const openEdit = (group: Group) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormDescription(group.description || '');
    setDialogOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !formName.trim()) return;

    setSaving(true);
    try {
      if (editingGroup) {
        await groupService.updateGroup(editingGroup.id, { name: formName, description: formDescription });
        toast({ title: 'Grupo actualizado' });
      } else {
        const emails = parseEmails(formEmails);
        const invalid = emails.filter(em => !isValidPucpEmail(em));
        if (invalid.length) {
          toast({
            title: `Solo se permiten correos ${ALLOWED_EMAIL_DOMAIN}`,
            description: invalid.join(', '),
            variant: 'destructive',
          });
          return;
        }
        await groupService.createGroup(
          { uid: user.uid, email: user.email },
          { name: formName, description: formDescription, memberEmails: emails }
        );
        toast({ title: 'Grupo creado' });
      }
      setDialogOpen(false);
      await loadGroups();
    } catch (err) {
      toast({ title: 'Error', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await groupService.deleteGroup(groupToDelete.id);
      toast({ title: 'Grupo eliminado', description: 'Sus proyectos siguen disponibles para sus creadores.' });
      setGroupToDelete(null);
      await loadGroups();
    } catch (err) {
      toast({ title: 'Error', description: errorMessage(err), variant: 'destructive' });
    }
  };

  if (authLoading || loading) {
    return <div className="flex justify-center p-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        Inicia sesión con tu correo {ALLOWED_EMAIL_DOMAIN} para gestionar tus grupos.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary flex items-center gap-2">
            <Users className="h-7 w-7" /> Gestión de Grupos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crea un grupo, agrega correos {ALLOWED_EMAIL_DOMAIN} y comparte tus proyectos. Los miembros verán los
            proyectos del grupo al iniciar sesión.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Nuevo grupo</Button>
      </div>

      {groups.length === 0 ? (
        <Card className="border-2 border-dashed p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <Users className="h-10 w-10 text-primary" />
            <p className="font-semibold">Aún no perteneces a ningún grupo</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Crea uno y agrega a tus compañeros por su correo. Si alguien te agrega a su grupo, aparecerá aquí.
            </p>
            <Button onClick={openCreate} className="mt-2"><Plus className="mr-2 h-4 w-4" /> Crear grupo</Button>
          </div>
        </Card>
      ) : (
        groups.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            currentUid={user.uid}
            currentEmail={normalizeEmail(user.email || '')}
            projects={projectsByGroup[group.id] || []}
            myProjects={myProjects}
            onEdit={() => openEdit(group)}
            onDelete={() => setGroupToDelete(group)}
            onChanged={loadGroups}
          />
        ))
      )}

      {/* Create / edit group */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Editar grupo' : 'Nuevo grupo'}</DialogTitle>
            <DialogDescription>
              {editingGroup
                ? 'Cambia el nombre o la descripción del grupo.'
                : 'Serás el creador del grupo y el único que puede gestionarlo.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveGroup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Nombre</Label>
              <Input id="group-name" required value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Descripción (opcional)</Label>
              <Textarea id="group-description" value={formDescription} onChange={e => setFormDescription(e.target.value)} />
            </div>
            {!editingGroup && (
              <div className="space-y-2">
                <Label htmlFor="group-emails">Correos de los miembros</Label>
                <Textarea
                  id="group-emails"
                  value={formEmails}
                  onChange={e => setFormEmails(e.target.value)}
                  placeholder={`a20201234${ALLOWED_EMAIL_DOMAIN}, profesor${ALLOWED_EMAIL_DOMAIN}`}
                />
                <p className="text-xs text-muted-foreground">
                  Separados por comas o saltos de línea. Puedes agregar más después.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingGroup ? 'Guardar' : 'Crear grupo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete group */}
      <AlertDialog open={!!groupToDelete} onOpenChange={open => !open && setGroupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el grupo “{groupToDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Los miembros dejarán de ver los proyectos del grupo. Los proyectos no se eliminan: siguen
              disponibles para quien los creó. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GroupCard({
  group, currentUid, currentEmail, projects, myProjects, onEdit, onDelete, onChanged,
}: {
  group: Group;
  currentUid: string;
  currentEmail: string;
  projects: Project[];
  myProjects: Project[];
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => Promise<void>;
}) {
  const { toast } = useToast();
  const isOwner = isGroupOwner(group, currentUid);
  const [newEmail, setNewEmail] = useState('');
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [projectToShare, setProjectToShare] = useState('');

  const shareable = myProjects.filter(p => p.groupId !== group.id);

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast({ title: success });
      await onChanged();
      return true;
    } catch (err) {
      toast({ title: 'Error', description: errorMessage(err), variant: 'destructive' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const emails = parseEmails(newEmail);
    if (!emails.length) return;
    const invalid = emails.filter(em => !isValidPucpEmail(em));
    if (invalid.length) {
      toast({ title: `Solo se permiten correos ${ALLOWED_EMAIL_DOMAIN}`, description: invalid.join(', '), variant: 'destructive' });
      return;
    }
    const ok = await run(
      async () => { for (const em of emails) await groupService.addMember(group.id, em); },
      emails.length > 1 ? 'Miembros agregados' : 'Miembro agregado'
    );
    if (ok) setNewEmail('');
  };

  const handleSaveEdit = async (oldEmail: string) => {
    const ok = await run(() => groupService.updateMember(group, oldEmail, editValue), 'Correo actualizado');
    if (ok) setEditingEmail(null);
  };

  const sortedMembers = [...group.memberEmails].sort((a, b) =>
    a === group.ownerEmail ? -1 : b === group.ownerEmail ? 1 : a.localeCompare(b)
  );

  return (
    <Card className="shadow-md border-t-4 border-t-primary/60">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
          <div className="space-y-1">
            <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">
              {group.name}
              {isOwner && <Badge variant="secondary" className="text-[10px]"><Crown className="h-3 w-3 mr-1" />Creador</Badge>}
            </CardTitle>
            {group.description && <CardDescription>{group.description}</CardDescription>}
            <p className="text-xs text-muted-foreground">
              Creado por {group.ownerEmail} · {group.memberEmails.length} miembro{group.memberEmails.length === 1 ? '' : 's'}
            </p>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
              <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />Eliminar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 md:grid-cols-2">
        {/* Members */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Mail className="h-4 w-4 text-primary/70" />Miembros</h3>
          <ul className="space-y-1">
            {sortedMembers.map(email => {
              const isOwnerEmail = email === group.ownerEmail;
              const isEditing = editingEmail === email;
              return (
                <li key={email} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                  {isEditing ? (
                    <>
                      <Input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(email); }
                          if (e.key === 'Escape') setEditingEmail(null);
                        }}
                        className="h-7 text-sm"
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={busy} onClick={() => handleSaveEdit(email)} aria-label="Guardar">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingEmail(null)} aria-label="Cancelar">
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate">{email}</span>
                      {isOwnerEmail && <Badge variant="outline" className="text-[10px]">Creador</Badge>}
                      {email === currentEmail && !isOwnerEmail && <Badge variant="outline" className="text-[10px]">Tú</Badge>}
                      {isOwner && !isOwnerEmail && (
                        <>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7" aria-label={`Editar ${email}`}
                            onClick={() => { setEditingEmail(email); setEditValue(email); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                            aria-label={`Quitar ${email}`} disabled={busy}
                            onClick={() => run(() => groupService.removeMember(group, email), 'Miembro eliminado')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          {isOwner && (
            <form onSubmit={handleAdd} className="flex gap-2">
              <Input
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder={`correo${ALLOWED_EMAIL_DOMAIN}`}
                className="h-9"
              />
              <Button type="submit" size="sm" disabled={busy || !newEmail.trim()}>
                <UserPlus className="mr-2 h-4 w-4" />Agregar
              </Button>
            </form>
          )}
        </section>

        {/* Projects */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Folder className="h-4 w-4 text-primary/70" />Proyectos del grupo</h3>
          {projects.length === 0 ? (
            <p className="text-xs text-muted-foreground border border-dashed rounded-md p-3">
              Todavía no hay proyectos compartidos en este grupo.
            </p>
          ) : (
            <ul className="space-y-1">
              {projects.map(p => {
                const canUnshare = isOwner || p.userId === currentUid;
                return (
                  <li key={p.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                    <Link href="/" className="flex-1 truncate hover:text-primary">{p.name}</Link>
                    {p.projectType && <Badge variant="outline" className="text-[10px]">{p.projectType}</Badge>}
                    {canUnshare && (
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7" aria-label={`Quitar ${p.name} del grupo`} disabled={busy}
                        onClick={() => run(() => projectService.setProjectGroup(p.id, null), 'Proyecto quitado del grupo')}
                      >
                        <Link2Off className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {shareable.length > 0 && (
            <div className="flex gap-2">
              <Select value={projectToShare} onValueChange={setProjectToShare}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Compartir uno de mis proyectos" /></SelectTrigger>
                <SelectContent>
                  {shareable.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                size="sm" disabled={busy || !projectToShare}
                onClick={async () => {
                  const ok = await run(() => projectService.setProjectGroup(projectToShare, group.id), 'Proyecto compartido');
                  if (ok) setProjectToShare('');
                }}
              >
                <Plus className="mr-2 h-4 w-4" />Compartir
              </Button>
            </div>
          )}
        </section>
      </CardContent>
      {!isOwner && (
        <>
          <Separator />
          <CardFooter className="py-3 text-xs text-muted-foreground">
            Solo el creador ({group.ownerEmail}) puede editar el grupo y sus miembros.
          </CardFooter>
        </>
      )}
    </Card>
  );
}
