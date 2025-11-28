import type { Session } from '@/lib/sessions';

interface SessionProgressProps {
  session: Session;
}

export function SessionProgress({ session }: SessionProgressProps) {
  const progress = session.progress;

  if (!progress) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Initialisierung...</div>
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '10%' }} />
        </div>
      </div>
    );
  }

  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{progress.step}</span>
        <span className="text-foreground font-medium">
          {progress.current} / {progress.total}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground text-right">
        {percentage}%
      </div>
    </div>
  );
}