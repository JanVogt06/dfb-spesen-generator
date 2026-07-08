import type {Session} from '@/lib/sessions';

interface SessionProgressProps {
    session: Session;
}

export function SessionProgress({session}: SessionProgressProps) {
    const progress = session.progress;

    if (!progress) {
        return (
            <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">Initialisierung...</div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full animate-pulse rounded-full bg-primary" style={{width: '10%'}}/>
                </div>
            </div>
        );
    }

    const percentage = progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{progress.step}</span>
                <span className="font-mono font-medium">
                    {progress.current}/{progress.total}
                </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{width: `${percentage}%`}}
                />
            </div>
        </div>
    );
}
