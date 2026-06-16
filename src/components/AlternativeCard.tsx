import type { Alternative } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Layers, ArrowRight, Edit3 } from 'lucide-react';

interface AlternativeCardProps {
  alternative: Alternative;
}

export default function AlternativeCard({ alternative }: AlternativeCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">
          <Layers className="h-6 w-6" />
          {alternative.name}
        </CardTitle>
        {alternative.description && (
          <CardDescription>{alternative.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">
          {alternative.effects.length} effect{alternative.effects.length !== 1 ? 's' : ''} defined.
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Link href={`/alternatives/${alternative.id}/edit`} passHref>
          <Button variant="outline" size="sm">
            <Edit3 className="mr-2 h-4 w-4" /> Edit
          </Button>
        </Link>
        <Link href={`/alternatives/${alternative.id}`} passHref>
          <Button size="sm">
            View Details <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
