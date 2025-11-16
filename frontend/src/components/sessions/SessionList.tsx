import type { Session } from '@/lib/sessions';
import { SessionCard } from './SessionCard';
import { FileText } from 'lucide-react';

interface SessionListProps {
  sessions: Session[];
}

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 font-medium mb-2">
          Noch keine Sessions
        </p>
        <p className="text-gray-500 text-sm">
          Starte die erste Generierung mit dem Button oben!
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