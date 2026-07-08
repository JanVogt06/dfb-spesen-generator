import {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {AppShell} from '@/components/layout/AppShell';
import {getSession, getSessionMatches, getDownloadFileUrl, type Session, type MatchData} from '@/lib/sessions';
import {api} from '@/lib/api';
import {SessionProgress} from '@/components/sessions/SessionProgress';
import {useSessionPolling} from '@/hooks/useSessionPolling';
import {MatchCard} from '@/components/matches/MatchCard';
import {cn} from '@/lib/utils';
import type {SessionStatus} from '@/lib/sessionUtils';
import {
    ArrowLeft,
    Loader2,
    FileText,
    XCircle,
    AlertCircle
} from 'lucide-react';

const STATUS_META: Record<SessionStatus, { text: string; dotClass: string; pulse?: boolean }> = {
    pending: {text: 'Wartend', dotClass: 'bg-muted-foreground/40'},
    in_progress: {text: 'Läuft', dotClass: 'bg-primary', pulse: true},
    scraping: {text: 'Scraping', dotClass: 'bg-primary', pulse: true},
    generating: {text: 'Generierung', dotClass: 'bg-primary', pulse: true},
    completed: {text: 'Fertig', dotClass: 'bg-success'},
    failed: {text: 'Fehler', dotClass: 'bg-destructive'},
};

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

            const url = window.URL.createObjectURL(response.data);
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

    const renderStatus = (status: string) => {
        const meta = STATUS_META[status as SessionStatus] || STATUS_META.pending;
        return (
            <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                <span className={cn('size-2 rounded-full', meta.dotClass, meta.pulse && 'animate-pulse')}/>
                {meta.text}
            </span>
        );
    };

    if (isLoading) {
        return (
            <AppShell>
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-3 py-12 text-sm text-muted-foreground">
                    <Loader2 className="size-5 animate-spin"/>
                    Lade Session...
                </div>
            </AppShell>
        );
    }

    if (error || !currentSession) {
        return (
            <AppShell>
                <Button
                    onClick={() => navigate('/dashboard')}
                    variant="ghost"
                    size="sm"
                    className="mb-6 text-muted-foreground"
                >
                    <ArrowLeft className="size-4"/>
                    Zurück zum Dashboard
                </Button>
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-4 py-3 ring-1 ring-destructive/20">
                    <XCircle className="mt-0.5 size-4 shrink-0 text-destructive"/>
                    <p className="text-sm break-words text-destructive">
                        {error || 'Session nicht gefunden'}
                    </p>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            {/* Kopf */}
            <Button
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                size="sm"
                className="mb-4 text-muted-foreground"
            >
                <ArrowLeft className="size-4"/>
                Zurück zum Dashboard
            </Button>

            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="break-words text-xl font-semibold tracking-tight sm:text-2xl">
                        {formatSessionTitle(currentSession.created_at)}
                    </h1>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        {currentSession.session_id}
                    </p>
                </div>
                {renderStatus(currentSession.status)}
            </div>

            {/* Progress für laufende Sessions */}
            {isRunning && (
                <Card className="mb-6 gap-0 overflow-hidden py-0">
                    <CardHeader className="flex h-11 flex-row items-center gap-2 px-4 py-0">
                        <Loader2 className="size-4 animate-spin text-muted-foreground"/>
                        <CardTitle className="text-sm">Fortschritt</CardTitle>
                    </CardHeader>
                    <Separator/>
                    <CardContent className="p-4">
                        <SessionProgress session={currentSession}/>
                    </CardContent>
                </Card>
            )}

            {/* Fehler */}
            {currentSession.status === 'failed' && (
                <div className="mb-6 flex items-start gap-2 rounded-lg bg-destructive/10 px-4 py-3 ring-1 ring-destructive/20">
                    <XCircle className="mt-0.5 size-4 shrink-0 text-destructive"/>
                    <div>
                        <p className="text-sm font-medium text-destructive">
                            {currentSession.progress?.error_code === 'DFB_CREDENTIALS_INVALID'
                                ? 'DFBnet-Login fehlgeschlagen'
                                : 'Generierung fehlgeschlagen'}
                        </p>
                        <p className="mt-1 text-sm text-destructive/80">
                            {currentSession.progress?.error_message || 'Bei der Generierung ist ein Fehler aufgetreten.'}
                        </p>
                        {currentSession.progress?.error_code === 'DFB_CREDENTIALS_INVALID' && (
                            <Button
                                variant="destructive"
                                size="sm"
                                className="mt-3"
                                onClick={() => navigate('/settings')}
                            >
                                Zu den Einstellungen
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Datei-Liste */}
            {currentSession.status === 'completed' && (
                <div>
                    {isLoadingMatches ? (
                        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-3 py-12 text-sm text-muted-foreground">
                            <Loader2 className="size-5 animate-spin"/>
                            Lade Spieldaten...
                        </div>
                    ) : matches.length > 0 ? (
                        <div>
                            <h2 className="mb-3 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                <FileText className="size-3.5"/>
                                Spiele ({matches.length})
                            </h2>
                            <div className="space-y-3">
                                {matches.map((match, index) => {
                                    const filename = match._filename || `spiel_${index + 1}.docx`;

                                    return (
                                        <MatchCard
                                            key={index}
                                            match={match}
                                            index={index}
                                            filename={filename}
                                            onDownload={handleDownloadFile}
                                            downloadingFilename={downloadingFile}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-3 py-12 text-center">
                            <span className="grid size-14 place-items-center rounded-2xl border border-dashed bg-muted/30">
                                <AlertCircle className="size-6 text-muted-foreground"/>
                            </span>
                            <p className="text-sm text-muted-foreground">
                                Keine Spieldaten gefunden.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </AppShell>
    );
}
