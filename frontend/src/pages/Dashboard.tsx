import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SessionList } from '@/components/sessions/SessionList';
import { MatchList } from '@/components/matches/MatchList';
import { getUserSessions, startGeneration, isSessionRunning, getSession, type Session } from '@/lib/sessions';
import { getAllMatches, type MatchData } from '@/lib/matches';
import { logout } from '@/lib/auth';
import { Settings, LogOut, Zap, AlertCircle, Calendar, FolderClock, Loader2 } from 'lucide-react';

export function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'matches' | 'sessions'>('matches');
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const hadRunningSessions = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  // Zentrales Polling für laufende Sessions
  // Aktualisiert nur die laufenden Sessions, nicht alle
  useEffect(() => {
    const pollRunningSessions = async () => {
      const runningSessions = sessions.filter(isSessionRunning);

      if (runningSessions.length === 0) {
        // Keine laufenden Sessions mehr
        if (hadRunningSessions.current) {
          // Sessions waren am Laufen, jetzt fertig - lade Matches neu
          hadRunningSessions.current = false;
          try {
            const updatedMatches = await getAllMatches();
            setMatches(updatedMatches);
          } catch (err) {
            console.error('Fehler beim Neuladen der Matches:', err);
          }
        }
        return;
      }

      hadRunningSessions.current = true;

      // Alle laufenden Sessions parallel abfragen
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

      // State aktualisieren mit neuen Daten
      setSessions((prevSessions) => {
        return prevSessions.map((session) => {
          const update = updates.find(
            (u) => u && u.session_id === session.session_id
          );
          return update || session;
        });
      });
    };

    // Polling alle 2 Sekunden
    const interval = setInterval(pollRunningSessions, 2000);

    return () => clearInterval(interval);
  }, [sessions]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Lade beide parallel
      const [matchesData, sessionsData] = await Promise.all([
        getAllMatches(),
        getUserSessions()
      ]);
      setMatches(matchesData);
      setSessions(sessionsData);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const newSession = await startGeneration();
      setSessions([newSession, ...sessions]);
      // Matches werden automatisch neu geladen wenn Session completed ist (via Polling)
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string; code?: string } } }; message?: string };
      const errorMessage = axiosError.response?.data?.error?.message || axiosError.message || 'Unbekannter Fehler';
      setError(errorMessage);

      if (axiosError.response?.data?.error?.code === 'CREDENTIALS_MISSING') {
        setTimeout(() => navigate('/settings'), 2000);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Finde laufende Sessions (nutzt zentrale Helper-Funktion)
  const runningSessions = sessions.filter(isSessionRunning);
  const hasRunningSessions = runningSessions.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="bg-primary rounded-xl sm:rounded-2xl shadow-lg mb-6 sm:mb-8 p-4 sm:p-6 lg:p-8 text-primary-foreground">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">TFV Spesen Generator</h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => navigate('/settings')}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm w-full sm:w-auto"
              >
                <Settings className="mr-2 h-4 w-4" />
                Einstellungen
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm w-full sm:w-auto"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-lg shadow-sm animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive break-words">{error}</p>
            </div>
          </div>
        )}

        {/* Tabs + Generate Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex gap-2">
            <Button
              onClick={() => setActiveTab('matches')}
              variant={activeTab === 'matches' ? 'default' : 'outline'}
              className="flex-1 sm:flex-none"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Meine Spiele ({matches.length})
            </Button>
            <Button
              onClick={() => setActiveTab('sessions')}
              variant={activeTab === 'sessions' ? 'default' : 'outline'}
              className="flex-1 sm:flex-none"
            >
              <FolderClock className="mr-2 h-4 w-4" />
              Sessions ({sessions.length})
            </Button>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleStartGeneration}
            disabled={isGenerating}
            size="lg"
            className="w-full sm:w-auto shadow-lg hover:shadow-xl"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Starte Generierung...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Neue Spesen generieren
              </>
            )}
          </Button>
        </div>

        {/* Running Sessions Progress - Sichtbar in BEIDEN Tabs */}
        {hasRunningSessions && (
          <Card className="mb-6 border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5 shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-primary-foreground animate-spin" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {runningSessions.length === 1
                      ? 'Session wird gerade verarbeitet'
                      : `${runningSessions.length} Sessions werden gerade verarbeitet`}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Das Scraping läuft im Hintergrund. Du wirst benachrichtigt, wenn es fertig ist.
                  </p>
                  {runningSessions.slice(0, 2).map((session) => (
                    <div key={session.session_id} className="space-y-1.5 mb-3 last:mb-0">
                      <div className="flex items-center justify-between text-xs text-foreground">
                        <span className="font-medium">
                          {session.progress?.step || 'Initialisierung...'}
                        </span>
                        <span className="font-semibold text-primary">
                          {session.progress
                            ? `${session.progress.current}/${session.progress.total} Spiele`
                            : 'Starte...'
                          }
                        </span>
                      </div>
                      <div className="h-2.5 bg-background rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500 ease-out ${
                            !session.progress ? 'animate-pulse' : ''
                          }`}
                          style={{
                            width: session.progress && session.progress.total > 0
                              ? `${(session.progress.current / session.progress.total) * 100}%`
                              : '5%'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {runningSessions.length > 2 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      + {runningSessions.length - 2} weitere Session{runningSessions.length > 3 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        <div>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-muted-foreground mt-4">Lade Daten...</p>
            </div>
          ) : (
            <>
              {activeTab === 'matches' ? (
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">
                    Alle Spiele
                  </h2>
                  <MatchList matches={matches} />
                </div>
              ) : (
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground">
                    Deine Sessions
                  </h2>
                  <SessionList sessions={sessions} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}