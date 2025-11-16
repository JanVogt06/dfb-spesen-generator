import type { Session } from '@/lib/sessions';
import { SessionCard } from './SessionCard';

interface SessionListProps {
  sessions: Session[];
}

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <p className="text-gray-600">
          Noch keine Sessions. Starte die erste Generierung!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sessions.map((session) => (
        <SessionCard key={session.session_id} initialSession={session} />
      ))}
    </div>
  );
}