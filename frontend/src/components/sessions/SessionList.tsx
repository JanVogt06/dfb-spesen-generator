import type {Session} from '@/lib/sessions';
import {SessionCard} from './SessionCard';
import {FileText} from 'lucide-react';

interface SessionListProps {
    sessions: Session[];
}

export function SessionList({sessions}: SessionListProps) {
    if (sessions.length === 0) {
        return (
            <div className="text-center py-12 bg-card rounded-lg shadow border border-border">
                <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4"/>
                <p className="text-muted-foreground font-medium mb-2">
                    Noch keine Sessions
                </p>
                <p className="text-muted-foreground text-sm">
                    Starte die erste Generierung mit dem Button oben!
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
                // GEÄNDERT: prop heißt jetzt "session" statt "initialSession"
                <SessionCard key={session.session_id} session={session}/>
            ))}
        </div>
    );
}