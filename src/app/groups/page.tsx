'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { groupService } from '@/lib/services/group-service';
import { Group } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Key } from 'lucide-react';

export default function GroupsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const loadGroups = async () => {
    if (!user) return;
    const myGroups = await groupService.getMyGroups(user.uid);
    setGroups(myGroups);
    setLoading(false);
  };

  useEffect(() => { loadGroups(); }, [user]);

  const handleCreateGroup = async () => {
    if (!user || !groupName) return;
    await groupService.createGroup(groupName, user.uid);
    toast({ title: "Grupo Creado" });
    setGroupName('');
    loadGroups();
  };

  const handleJoinGroup = async () => {
    if (!user || !inviteCode) return;
    try {
        await groupService.joinGroup(inviteCode, user.uid);
        toast({ title: "Te has unido al grupo" });
        setInviteCode('');
        loadGroups();
    } catch (e) {
        toast({ title: "Error", description: "Código de invitación inválido", variant: "destructive" });
    }
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Gestión de Grupos</h1>

      {groups.length > 0 ? (
        <Card>
            <CardHeader><CardTitle>Tu Grupo</CardTitle></CardHeader>
            <CardContent>
                <p className="font-bold">{groups[0].name}</p>
                <p className="text-sm text-muted-foreground">Código de invitación: {groups[0].inviteCode}</p>
            </CardContent>
        </Card>
      ) : (
        <>
            <Card>
                <CardHeader><CardTitle>Crear Nuevo Grupo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <Label>Nombre del Grupo</Label>
                    <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                    <Button onClick={handleCreateGroup}>Crear</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Unirse a un Grupo</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <Label>Código de Invitación</Label>
                    <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                    <Button onClick={handleJoinGroup}>Unirse</Button>
                </CardContent>
            </Card>
        </>
      )}
    </div>
  );
}
