'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus } from 'lucide-react';
import { projectService } from '@/lib/services/project-service';
import { ActionNode, Project } from '@/lib/types';
import ActionTree from '@/components/ActionTree';
import { useToast } from '@/hooks/use-toast';

export default function ProjectFrameworkEditor() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<ActionNode | null>(null);
  const [parentNodeId, setParentNodeId] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState('');

  const loadProject = useCallback(async () => {
    if (!id) return;
    try {
      const data = await projectService.getProject(id);
      setProject(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);

  // Helper to add node recursively
  const addNode = (nodes: ActionNode[], parentId: string, newNode: ActionNode): ActionNode[] => {
    return nodes.map(node => {
      if (node.id === parentId) {
        return { ...node, children: [...(node.children || []), newNode] };
      }
      return { ...node, children: addNode(node.children || [], parentId, newNode) };
    });
  };

  const deleteNode = (nodes: ActionNode[], id: string): ActionNode[] => {
    return nodes
      .filter(node => node.id !== id)
      .map(node => ({
        ...node,
        children: deleteNode(node.children || [], id)
      }));
  };

  const findNode = (nodes: ActionNode[], id: string): ActionNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNode(node.children || [], id);
      if (found) return found;
    }
    return null;
  };

  const handleSaveNode = async () => {
    if (!project) return;
    let newTree = [...(project.actionTree || [])];
    
    if (editingNode) {
        const update = (nodes: ActionNode[]): ActionNode[] => nodes.map(node => {
            if (node.id === editingNode.id) return { ...node, name: newNodeName };
            return { ...node, children: update(node.children || []) };
        });
        newTree = update(newTree);
    } else {
        const parent = parentNodeId ? findNode(newTree, parentNodeId) : null;
        let type: 'phase' | 'labor' | 'action' = 'phase';
        if (parent) {
             type = parent.type === 'phase' ? 'labor' : 'action';
        }

        const newNode: ActionNode = { 
            id: Math.random().toString(36).substr(2, 9), 
            name: newNodeName, 
            type: type, 
            children: [] 
        };
        if (parentNodeId) {
            newTree = addNode(newTree, parentNodeId, newNode);
        } else {
            newTree = [...newTree, newNode];
        }
    }
    await projectService.updateProject(project.id, { actionTree: newTree });
    toast({ title: "Framework updated" });
    
    setIsDialogOpen(false);
    setNewNodeName('');
    setParentNodeId(null);
    setEditingNode(null);
    loadProject();
  };

  const handleDelete = async (id: string) => {
    if (!project) return;
    const newTree = deleteNode(project.actionTree || [], id);
    await projectService.updateProject(project.id, { actionTree: newTree });
    toast({ title: "Node deleted" });
    loadProject();
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold font-headline">{project?.name} - Framework</h1>
            <p className="text-muted-foreground">Define the standard phases, labors, and actions.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}><Plus className="mr-2" /> Add Phase</Button>
      </div>

      <ActionTree 
        nodes={project?.actionTree || []} 
        onEdit={(node) => { setEditingNode(node); setNewNodeName(node.name); setIsDialogOpen(true); }}
        onAddChild={(parentId) => { setParentNodeId(parentId); setIsDialogOpen(true); }}
        onDelete={handleDelete}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>{editingNode ? 'Edit' : 'Add'} Component</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <Label>Name</Label>
                <Input value={newNodeName} onChange={(e) => setNewNodeName(e.target.value)} />
            </div>
            <DialogFooter>
                <Button onClick={handleSaveNode}>Save</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
