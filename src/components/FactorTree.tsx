'use client';

import React from 'react';
import { EnvironmentalFactor } from '@/lib/types';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wind, ChevronRight, Hash, Edit2, Plus, Trash2 } from 'lucide-react';

interface FactorTreeProps {
  factors: EnvironmentalFactor[];
  level?: number;
  onEdit: (factor: EnvironmentalFactor) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (factorId: string) => void;
}

export default function FactorTree({ 
  factors, 
  level = 0, 
  onEdit, 
  onAddChild, 
  onDelete 
}: FactorTreeProps) {
  if (!factors || factors.length === 0) return null;

  return (
    <div className={`space-y-4 ${level > 0 ? 'ml-6 mt-2 border-l-2 border-primary/20 pl-4' : ''}`}>
      {factors.map((factor) => {
        const hasChildren = factor.children && factor.children.length > 0;

        const ActionButtons = () => (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto px-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-primary" 
              onClick={(e) => { e.stopPropagation(); onAddChild(factor.id); }}
              title="Add Sub-factor"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-amber-600" 
              onClick={(e) => { e.stopPropagation(); onEdit(factor); }}
              title="Edit Factor"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive" 
              onClick={(e) => { e.stopPropagation(); onDelete(factor.id); }}
              title="Delete Factor"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );

        if (hasChildren) {
          return (
            <Accordion key={factor.id} type="single" collapsible className="w-full">
              <AccordionItem value={factor.id} className="border-none">
                <div className="flex items-center group">
                  <AccordionTrigger className="hover:no-underline py-2 flex-1">
                    <div className="flex items-center gap-3 text-left">
                      <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <Wind className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-headline text-lg font-medium">{factor.name}</p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                         Weight: {factor.weight}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <ActionButtons />
                </div>
                <AccordionContent>
                  <FactorTree 
                    factors={factor.children!} 
                    level={level + 1} 
                    onEdit={onEdit}
                    onAddChild={onAddChild}
                    onDelete={onDelete}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        }

        return (
          <Card key={factor.id} className="bg-card/50 border-dashed hover:border-primary/50 transition-colors group">
            <CardContent className="p-4 flex items-center gap-3">
              <ChevronRight className="h-4 w-4 text-primary/40" />
              <div className="flex-1">
                <p className="font-medium text-foreground">{factor.name}</p>
                {factor.description && <p className="text-xs text-muted-foreground">{factor.description}</p>}
              </div>
              <Badge variant="outline" className="bg-accent/50 text-accent-foreground border-accent">
                <Hash className="h-3 w-3 mr-1" /> {factor.weight}
              </Badge>
              <ActionButtons />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
