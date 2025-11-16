import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession, getSessionMatches, getDownloadFileUrl, type Session, type MatchData } from '@/lib/sessions';
import { api } from '@/lib/api';
import { SessionProgress } from '@/components/sessions/SessionProgress';
import { useSessionPolling } from '@/hooks/useSessionPolling';
import { MatchCard } from '@/components/sessions/MatchCard';
import {
  ArrowLeft,
  Clock,
  PlayCircle,
  Database,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

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
    const badges: Record<string, { text: string; className: string; icon: any }> = {
      pending: {
        text: 'Wartend',
        className: 'bg-gray-100 text-gray-800 border border-gray-200',
        icon: Clock
      },
      in_progress: {
        text: 'Läuft',
        className: 'bg-blue-100 text-blue-800 border border-blue-200',
        icon: PlayCircle
      },
      scraping: {
        text: 'Scraping',
        className: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        icon: Database
      },
      generating: {
        text: 'Generierung',
        className: 'bg-purple-100 text-purple-800 border border-purple-200',
        icon: FileText
      },
      completed: {
        text: 'Fertig',
        className: 'bg-green-100 text-green-800 border border-green-200',
        icon: CheckCircle2
      },
      failed: {
        text: 'Fehler',
        className: 'bg-red-100 text-red-800 border border-red-200',
        icon: XCircle
      },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${badge.className} flex items-center gap-1.5`}>
        <Icon className="h-3.5 w-3.5" />
        {badge.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Lade Session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zum Dashboard
            </Button>
          </div>
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">
                {error || 'Session nicht gefunden'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zum Dashboard
          </Button>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-gray-800">
                  {formatSessionTitle(currentSession.created_at)}
                </h1>
                <p className="text-gray-600 text-sm">
                  Session-ID: {currentSession.session_id}
                </p>
              </div>
              {getStatusBadge(currentSession.status)}
            </div>
          </div>
        </div>

        {/* Progress für laufende Sessions */}
        {isRunning && (
          <Card className="mb-8 border-blue-200 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-blue-600" />
                Fortschritt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SessionProgress session={currentSession} />
            </CardContent>
          </Card>
        )}

        {/* Fehler */}
        {currentSession.status === 'failed' && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-red-800">
                Bei der Generierung ist ein Fehler aufgetreten.
              </p>
            </div>
          </div>
        )}

        {/* Datei-Liste */}
        {currentSession.status === 'completed' && (
          <div>
            {isLoadingMatches ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 mt-4">Lade Spieldaten...</p>
              </div>
            ) : matches.length > 0 ? (
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-600" />
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
              <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Keine Spieldaten gefunden.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Keine Dateien */}
        {currentSession.status === 'completed' && currentSession.files.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Keine Dateien in dieser Session gefunden.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}