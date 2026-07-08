import type {Session} from '@/lib/sessions';
import {SessionCard} from './SessionCard';
import {FolderClock} from 'lucide-react';

interface SessionListProps {
    sessions: Session[];
}

export function SessionList({sessions}: SessionListProps) {
    if (sessions.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-3 py-12 text-center">
                <span className="grid size-14 place-items-center rounded-2xl border border-dashed bg-muted/30">
                    <FolderClock className="size-6 text-muted-foreground"/>
                </span>
                <p className="text-sm font-medium">Noch keine Sessions</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                    Starte die erste Generierung mit dem Button oben.
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
                <SessionCard key={session.session_id} session={session}/>
            ))}
        </div>
    );
}
