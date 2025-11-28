import {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {getSession, getSessionMatches, getDownloadFileUrl, type Session, type MatchData} from '@/lib/sessions';
import {api} from '@/lib/api';
import {SessionProgress} from '@/components/sessions/SessionProgress';
import {useSessionPolling} from '@/hooks/useSessionPolling';
import {MatchCard} from '@/components/matches/MatchCard';
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
    const {sessionId} = useParams<{ sessionId: string }>();
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

    const {session: polledSession} = useSessionPolling(sessionId || null, isRunning);

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
                className: 'bg-muted text-foreground border border-border',
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
            <span
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${badge.className} flex items-center gap-1.5 whitespace-nowrap`}>
        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0"/>
                {badge.text}
      </span>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center py-12">
                        <div
                            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="text-muted-foreground mt-4">Lade Session...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !currentSession) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6 sm:mb-8">
                        <Button
                            onClick={() => navigate('/dashboard')}
                            variant="outline"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4"/>
                            Zurück zum Dashboard
                        </Button>
                    </div>
                    <div className="p-4 sm:p-6 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                        <div className="flex items-start gap-2">
                            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"/>
                            <p className="text-sm text-red-800 break-words">
                                {error || 'Session nicht gefunden'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <Button
                        onClick={() => navigate('/dashboard')}
                        variant="outline"
                        className="mb-4"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4"/>
                        Zurück zum Dashboard
                    </Button>

                    <div className="bg-card rounded-xl shadow-md p-4 sm:p-6 border border-border">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground break-words">
                                    {formatSessionTitle(currentSession.created_at)}
                                </h1>
                                <p className="text-muted-foreground text-xs sm:text-sm break-all">
                                    Session-ID: {currentSession.session_id}
                                </p>
                            </div>
                            <div className="self-start">
                                {getStatusBadge(currentSession.status)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress für laufende Sessions */}
                {isRunning && (
                    <Card className="mb-6 sm:mb-8 border-blue-200 shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <PlayCircle className="h-5 w-5 text-blue-600"/>
                                Fortschritt
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <SessionProgress session={currentSession}/>
                        </CardContent>
                    </Card>
                )}

                {/* Fehler */}
                {currentSession.status === 'failed' && (
                    <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                        <div className="flex items-start gap-2">
                            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"/>
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
                                <div
                                    className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <p className="text-muted-foreground mt-4">Lade Spieldaten...</p>
                            </div>
                        ) : matches.length > 0 ? (
                            <div>
                                <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground flex items-center gap-2">
                                    <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0"/>
                                    <span>Spiele ({matches.length})</span>
                                </h2>
                                <div className="space-y-3">
                                    {matches.map((match, index) => {
                                        // KORRIGIERT: Verwende nur _filename vom Backend
                                        const filename = match._filename || `spiel_${index + 1}.docx`;

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
                            <div className="text-center py-12 bg-card rounded-lg shadow border border-border">
                                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                                <p className="text-muted-foreground">
                                    Keine Spieldaten gefunden.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Keine Dateien */}
                {currentSession.status === 'completed' && currentSession.files.length === 0 && (
                    <div className="text-center py-12 bg-card rounded-lg shadow border border-border">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                        <p className="text-muted-foreground">
                            Keine Dateien in dieser Session gefunden.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}