'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { Impact } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { impactService } from '@/lib/services/impact-service';
import { likertMean, likertToMagnitude } from '@/lib/utils/impact-calculations';
import { useToast } from '@/hooks/use-toast';

const SCALE = [
  { value: 1, label: 'Muy baja' },
  { value: 2, label: 'Baja' },
  { value: 3, label: 'Media' },
  { value: 4, label: 'Alta' },
  { value: 5, label: 'Muy alta' },
];

interface Props {
  impact: Impact;
  memberCount: number;
  onVoted: () => void;
}

/** Each member rates the magnitude 1–5; the mean, normalized to 0–1, is the impact's magnitude. */
export default function LikertPanel({ impact, memberCount, onVoted }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState<number | null>(null);

  const votes = Object.values(impact.likertVotes || {});
  const myVote = user ? impact.likertVotes?.[user.uid]?.value : undefined;
  const mean = likertMean(impact.likertVotes);
  const counts = SCALE.map(s => votes.filter(v => v.value === s.value).length);
  const maxCount = Math.max(1, ...counts);

  const vote = async (value: number) => {
    if (!user) return;
    setSaving(value);
    try {
      await impactService.voteLikert(impact.id, user, value);
      onVoted();
    } catch (err) {
      toast({ title: 'No se pudo votar', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Tu voto de magnitud</p>
        <div className="grid grid-cols-5 gap-2">
          {SCALE.map(s => (
            <Button
              key={s.value}
              type="button"
              variant={myVote === s.value ? 'default' : 'outline'}
              className="h-auto py-2 flex flex-col"
              onClick={() => vote(s.value)}
              disabled={saving !== null}
            >
              {saving === s.value ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="text-lg font-bold">{s.value}</span>}
              <span className="text-[10px] font-normal">{s.label}</span>
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Tu voto se guarda al instante; los demás miembros pueden votar desde este mismo diálogo.</p>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Votos del grupo</span>
          <span>{votes.length}/{memberCount} miembros</span>
        </div>
        {SCALE.map((s, i) => (
          <div key={s.value} className="flex items-center gap-2 text-xs">
            <span className="w-4 text-right font-mono">{s.value}</span>
            <div className="flex-1 h-3 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${(counts[i] / maxCount) * 100}%` }} />
            </div>
            <span className="w-4 font-mono">{counts[i]}</span>
          </div>
        ))}
        <div className="flex justify-between items-center pt-2 border-t text-sm">
          <span>Media</span>
          <span className="font-mono font-semibold">{mean === null ? '—' : mean.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span>Magnitud y = (media − 1) / 4</span>
          <span className="font-mono font-bold text-primary">{mean === null ? '—' : likertToMagnitude(mean).toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}
