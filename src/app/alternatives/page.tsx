
'use client';

import AlternativeCard from '@/components/AlternativeCard';
import { Button } from '@/components/ui/button';
import { mockAlternatives } from '@/lib/mockData';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import type { Alternative } from '@/lib/types';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AlternativesListPage() {
  const [alternativesToRender, setAlternativesToRender] = useState<Alternative[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    // Re-sync with mockAlternatives when the page is navigated to,
    // ensuring a fresh list is displayed.
    setAlternativesToRender([...mockAlternatives]); // Use spread to ensure a new array reference
  }, [pathname]); // Re-run effect if pathname changes

  // Fallback if client-side update via useEffect is delayed or doesn't catch initial state
  // This ensures initial render also uses the potentially updated mockAlternatives
  if (alternativesToRender.length === 0 && mockAlternatives.length > 0 && pathname === '/alternatives') {
     //This condition is to handle the case where the effect might not run immediately or if there's a direct load.
     //However, the primary update mechanism is the useEffect above.
     //To avoid issues with this during normal useEffect updates, we ensure it's only a fallback for an empty state.
     //A more common pattern is to initialize useState with mockAlternatives directly: useState([...mockAlternatives])
     //but given the mutation, useEffect ensures re-sync on navigation.
     //For simplicity and to avoid complex conditional rendering, let's stick to useEffect for updates.
     //The initial state will be empty, then useEffect will populate it.
  }


  return (
    <div className="space-y-8">
      <section>
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-headline text-3xl text-primary">Project Alternatives</h1>
          <Link href="/alternatives/create" passHref>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Alternative
            </Button>
          </Link>
        </div>
        {alternativesToRender.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alternativesToRender.map((alt) => (
              <AlternativeCard key={alt.id} alternative={alt} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground mb-4">No alternatives defined yet.</p>
            <Link href="/alternatives/create" passHref>
                <Button size="lg">
                    <PlusCircle className="mr-2 h-5 w-5" /> Create Your First Alternative
                </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
