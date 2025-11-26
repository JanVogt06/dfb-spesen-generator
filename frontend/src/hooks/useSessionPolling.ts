import { useEffect, useState } from 'react';
import type { Session } from '@/lib/sessions';
import { getSession, isSessionRunning } from '@/lib/sessions';

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
      } catch (err: unknown) {
        const error = err as Error;
        setError(error.message);
      }
    };

    fetchSession();

    // Polling nur wenn Status nicht "completed" oder "failed"
    const interval = setInterval(async () => {
      try {
        const data = await getSession(sessionId);
        setSession(data);

        // Stoppe Polling wenn fertig (nutzt zentrale Helper-Funktion)
        if (!isSessionRunning(data)) {
          clearInterval(interval);
        }
      } catch (err: unknown) {
        const error = err as Error;
        setError(error.message);
      }
    }, 2000); // Alle 2 Sekunden

    return () => clearInterval(interval);
  }, [sessionId, enabled]);

  return { session, error };
}