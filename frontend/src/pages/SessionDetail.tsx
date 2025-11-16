import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession, getSessionMatches, getDownloadFileUrl, type Session, type MatchData } from '@/lib/sessions';
import { api } from '@/lib/api';
import { SessionProgress } from '@/components/sessions/SessionProgress';
import { useSessionPolling } from '@/hooks/useSessionPolling';
import { MatchCard } from '@/components/sessions/MatchCard';

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [error, setError] = useState('');
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  // Initiales Laden
  useEffect(() => {
    if (!sessionId) return;

    const loadSession = async () => {
      try {
        const data = await getSession(sessionId);
        setSession(data);
        setError('');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  // Lade Match-Daten wenn Session completed ist
  useEffect(() => {
    if (!sessionId || !session) return;

    if (session.status === 'completed' && matches.length === 0) {
      const loadMatches = async () => {
        setIsLoadingMatches(true);
        try {
          const matchData = await getSessionMatches(sessionId);
          setMatches(matchData);
        } catch (err: any) {
          console.error('Fehler beim Laden der Match-Daten:', err);
        } finally {
          setIsLoadingMatches(false);
        }
      };

      loadMatches();
    }
  }, [sessionId, session, matches.length]);

  // Polling für laufende Sessions
  const isRunning = session?.status === 'in_progress'
    || session?.status === 'scraping'
    || session?.status === 'generating'
    || session?.status === 'pending';

  const { session: polledSession } = useSessionPolling(sessionId || null, isRunning);

  // Nutze gepolte Session falls verfügbar
  const currentSession = polledSession || session;

  const handleDownloadFile = async (filename: string) => {
    if (!sessionId) return;

    setDownloadingFile(filename);
    try {
      const response = await api.get(getDownloadFileUrl(sessionId, filename), {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download-Fehler:', error);
      alert('Fehler beim Download. Bitte versuche es erneut.');
    } finally {
      setDownloadingFile(null);
    }
  };

  const formatSessionTitle = (createdAt: string) => {
    const date = new Date(createdAt);
    return `Generierung vom ${date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })} um ${date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    })} Uhr`;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; className: string }> = {
      pending: { text: 'Wartend', className: 'bg-gray-100 text-gray-800' },
      in_progress: { text: 'Läuft', className: 'bg-blue-100 text-blue-800' },
      scraping: { text: 'Scraping', className: 'bg-yellow-100 text-yellow-800' },
      generating: { text: 'Generierung', className: 'bg-purple-100 text-purple-800' },
      completed: { text: 'Fertig', className: 'bg-green-100 text-green-800' },
      failed: { text: 'Fehler', className: 'bg-red-100 text-red-800' },
    };

    const badge = badges[status] || badges.pending;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">Lade Session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentSession) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Zurück zum Dashboard
            </Button>
          </div>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              {error || 'Session nicht gefunden'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="mb-4">
            Zurück zum Dashboard
          </Button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {formatSessionTitle(currentSession.created_at)}
              </h1>
              <p className="text-gray-600">
                Session-ID: {currentSession.session_id}
              </p>
            </div>
            {getStatusBadge(currentSession.status)}
          </div>
        </div>

        {/* Progress für laufende Sessions */}
        {isRunning && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Fortschritt</CardTitle>
            </CardHeader>
            <CardContent>
              <SessionProgress session={currentSession} />
            </CardContent>
          </Card>
        )}

        {/* Fehler */}
        {currentSession.status === 'failed' && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              Bei der Generierung ist ein Fehler aufgetreten.
            </p>
          </div>
        )}

        {/* Datei-Liste */}
        {currentSession.status === 'completed' && (
          <div>
            {isLoadingMatches ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Lade Spieldaten...</p>
              </div>
            ) : matches.length > 0 ? (
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Spiele ({matches.length})
                </h2>
                <div className="space-y-3">
                  {matches.map((match, index) => {
                    const filename = currentSession.files[index]?.name || `spiel_${index + 1}.docx`;

                    return (
                      <MatchCard
                        key={index}
                        match={match}
                        index={index}
                        filename={filename}
                        onDownload={handleDownloadFile}
                        isDownloading={downloadingFile === filename}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-600">
                  Keine Spieldaten gefunden.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Keine Dateien */}
        {currentSession.status === 'completed' && currentSession.files.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">
              Keine Dateien in dieser Session gefunden.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}