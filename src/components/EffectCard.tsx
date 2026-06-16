import type { Effect } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Edit, Trash2, Microscope, AlertCircle, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface EffectCardProps {
  effect: Effect;
  onAnalyze: (effect: Effect) => void;
  onEdit: (effect: Effect) => void;
  onDelete: (effectId: string) => void;
}

const characterIcons: Record<NonNullable<Effect['character']>, React.ElementType> = {
  compatible: CheckCircle2,
  moderate: AlertTriangle,
  severe: AlertCircle,
  critical: ShieldAlert,
  pending: Zap,
};

const characterColors: Record<NonNullable<Effect['character']>, string> = {
  compatible: 'bg-green-500',
  moderate: 'bg-yellow-500',
  severe: 'bg-orange-600',
  critical: 'bg-red-700',
  pending: 'bg-blue-500',
};


export default function EffectCard({ effect, onAnalyze, onEdit, onDelete }: EffectCardProps) {
  const Icon = characterIcons[effect.character || 'pending'] || Zap;
  const badgeColor = characterColors[effect.character || 'pending'] || 'bg-gray-500';

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-lg text-primary flex items-center gap-2">
                <Icon className={`h-5 w-5 ${effect.character ? '' : 'text-muted-foreground'}`} />
                Effect on {effect.factorName}
            </CardTitle>
            <CardDescription>Due to: {effect.actionName}</CardDescription>
          </div>
          {effect.character && (
            <Badge className={`${badgeColor} text-white`}>{effect.character}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">{effect.description}</p>
        {effect.justification && (
          <p className="text-xs text-muted-foreground italic">AI Justification: {effect.justification}</p>
        )}
        <div className="flex gap-4 pt-2">
            <Badge variant="secondary" className="text-[10px]">Q: {effect.qualitative?.calculatedImportance || 0}</Badge>
            <Badge variant="secondary" className="text-[10px]">C: {effect.quantitative?.calculatedValue?.toFixed(3) || 0}</Badge>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => onAnalyze(effect)} title="Analyze with AI">
          <Microscope className="mr-2 h-4 w-4" /> Analyze
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(effect)} title="Edit Effect">
          <Edit className="mr-2 h-4 w-4" /> Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(effect.id)} title="Delete Effect">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
