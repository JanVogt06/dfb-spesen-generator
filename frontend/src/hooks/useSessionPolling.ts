import { useEffect, useState } from 'react';
import type { Session } from '@/lib/sessions';
import { getSession } from '@/lib/sessions';

export function useSessionPolling(sessionId: string | null, enabled: boolean = true) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !enabled) {
      return;
    }

    // Initiales Laden
    const fetchSession = async () => {
      try {
        const data = await getSession(sessionId);
        setSession(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchSession();

    // Polling nur wenn Status nicht "completed" oder "failed"
    const interval = setInterval(async () => {
      try {
        const data = await getSession(sessionId);
        setSession(data);

        // Stoppe Polling wenn fertig
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
        }
      } catch (err: any) {
        setError(err.message);
      }
    }, 2000); // Alle 2 Sekunden

    return () => clearInterval(interval);
  }, [sessionId, enabled]);

  return { session, error };
}