import type { EnvironmentalFactor } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wind, Edit, Trash2, Scale } from 'lucide-react';

interface FactorItemProps {
  factor: EnvironmentalFactor;
  onEdit: (factor: EnvironmentalFactor) => void;
  onDelete: (factorId: string) => void;
}

export default function FactorItem({ factor, onEdit, onDelete }: FactorItemProps) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle className="font-headline text-lg text-primary flex items-center gap-2">
                <Wind className="h-5 w-5" />
                {factor.name}
            </CardTitle>
            <Badge variant="secondary" className="flex items-center gap-1">
                <Scale className="h-3 w-3" /> Weight: {factor.weight}
            </Badge>
        </div>
        {factor.description && <CardDescription className="pt-1">{factor.description}</CardDescription>}
      </CardHeader>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(factor)}>
          <Edit className="mr-2 h-4 w-4" /> Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(factor.id)}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
