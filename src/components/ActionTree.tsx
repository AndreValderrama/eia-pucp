'use client';

import React from 'react';
import { ActionNode } from '@/lib/types';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, ChevronRight, Layers, Activity, Edit2, Plus, Trash2 } from 'lucide-react';

interface ActionTreeProps {
  nodes: ActionNode[];
  level?: number;
  onEdit: (node: ActionNode) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (nodeId: string) => void;
}

export default function ActionTree({ 
  nodes, 
  level = 0, 
  onEdit, 
  onAddChild, 
  onDelete 
}: ActionTreeProps) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <div className={`space-y-3 ${level > 0 ? 'ml-6 mt-2 border-l-2 border-primary/10 pl-4' : ''}`}>
      {nodes.map((node) => {
        const hasChildren = node.children && node.children.length > 0;
        
        const getIcon = () => {
            if (node.type === 'phase') return <Zap className="h-4 w-4 text-amber-500" />;
            if (node.type === 'labor') return <Activity className="h-4 w-4 text-primary" />;
            return <Layers className="h-4 w-4 text-muted-foreground" />;
        };

        const ActionButtons = () => (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto px-2">
            {node.type !== 'action' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-primary" 
                onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
                title={node.type === 'phase' ? "Add Labor" : "Add Action"}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-amber-600" 
              onClick={(e) => { e.stopPropagation(); onEdit(node); }}
              title="Edit Name"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive" 
              onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );

        if (hasChildren || node.type !== 'action') {
          return (
            <Accordion key={node.id} type="single" collapsible className="w-full">
              <AccordionItem value={node.id} className="border-none">
                <div className="flex items-center group">
                  <AccordionTrigger className="hover:no-underline py-2 flex-1">
                    <div className="flex items-center gap-3 text-left">
                      <div className={`p-2 rounded-lg transition-colors ${node.type === 'phase' ? 'bg-amber-100' : 'bg-primary/10'}`}>
                        {getIcon()}
                      </div>
                      <div>
                        <p className={`font-headline ${node.type === 'phase' ? 'text-lg font-bold' : 'text-base font-medium'}`}>
                          {node.name}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-2 capitalize text-[10px]">
                        {node.type}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <ActionButtons />
                </div>
                <AccordionContent>
                  <ActionTree 
                    nodes={node.children || []} 
                    level={level + 1} 
                    onEdit={onEdit}
                    onAddChild={onAddChild}
                    onDelete={onDelete}
                  />
                  {!hasChildren && (
                    <div className="py-2 px-4 text-xs text-muted-foreground italic border-l-2 border-primary/10 ml-6">
                      No {node.type === 'phase' ? 'labors' : 'actions'} defined yet.
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        }

        return (
          <Card key={node.id} className="bg-card/50 border-dashed hover:border-primary/50 transition-colors group">
            <CardContent className="p-3 flex items-center gap-3">
              <ChevronRight className="h-4 w-4 text-primary/40" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{node.name}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider px-2 py-0">
                Action
              </Badge>
              <ActionButtons />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
