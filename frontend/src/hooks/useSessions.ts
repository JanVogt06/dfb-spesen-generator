import {useState, useEffect, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import {getUserSessions, startGeneration, isSessionRunning, getSession, type Session} from '@/lib/sessions';

/**
 * Laedt die Sessions des Users, pollt laufende Sessions alle 2 Sekunden
 * und stellt die Generierung bereit. Wird von Dashboard und Sessions-Seite genutzt.
 *
 * @param onRunningFinished Optionaler Callback, wenn alle laufenden Sessions fertig sind
 *                          (z.B. um die Spiele-Liste neu zu laden).
 */
export function useSessions(onRunningFinished?: () => void) {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const hadRunningSessions = useRef(false);
    const onFinishedRef = useRef(onRunningFinished);
    onFinishedRef.current = onRunningFinished;

    useEffect(() => {
        const loadSessions = async () => {
            setIsLoading(true);
            try {
                const sessionsData = await getUserSessions();
                setSessions(sessionsData);
            } catch (err: unknown) {
                setError((err as Error).message);
            } finally {
                setIsLoading(false);
            }
        };
        loadSessions();
    }, []);

    // Zentrales Polling fuer laufende Sessions
    useEffect(() => {
        const pollRunningSessions = async () => {
            const runningSessions = sessions.filter(isSessionRunning);

            if (runningSessions.length === 0) {
                if (hadRunningSessions.current) {
                    // Sessions waren am Laufen, jetzt fertig
                    hadRunningSessions.current = false;
                    onFinishedRef.current?.();
                }
                return;
            }

            hadRunningSessions.current = true;

            const updates = await Promise.all(
                runningSessions.map(async (session) => {
                    try {
                        return await getSession(session.session_id);
                    } catch (error) {
                        console.error(`Fehler beim Polling von Session ${session.session_id}:`, error);
                        return null;
                    }
                })
            );

            setSessions((prevSessions) =>
                prevSessions.map((session) => {
                    const update = updates.find(
                        (u) => u && u.session_id === session.session_id
                    );
                    return update || session;
                })
            );
        };

        const interval = setInterval(pollRunningSessions, 2000);
        return () => clearInterval(interval);
    }, [sessions]);

    const handleStartGeneration = async () => {
        setIsGenerating(true);
        setError('');

        try {
            const newSession = await startGeneration();
            setSessions((prev) => [newSession, ...prev]);
        } catch (err: unknown) {
            const axiosError = err as {
                response?: { data?: { error?: { message?: string; code?: string } } };
                message?: string
            };
            const errorMessage = axiosError.response?.data?.error?.message || axiosError.message || 'Unbekannter Fehler';
            setError(errorMessage);

            if (axiosError.response?.data?.error?.code === 'CREDENTIALS_MISSING') {
                setTimeout(() => navigate('/settings'), 2000);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const runningSessions = sessions.filter(isSessionRunning);

    return {
        sessions,
        isLoading,
        isGenerating,
        error,
        runningSessions,
        startGeneration: handleStartGeneration,
    };
}
