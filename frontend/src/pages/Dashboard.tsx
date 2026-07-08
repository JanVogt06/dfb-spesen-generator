import {useState, useEffect, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {AppShell} from '@/components/layout/AppShell';
import {GenerateButton} from '@/components/sessions/GenerateButton';
import {MatchList} from '@/components/matches/MatchList';
import {useSessions} from '@/hooks/useSessions';
import {getAllMatches, type MatchData} from '@/lib/matches';
import {AlertCircle, Loader2} from 'lucide-react';
import {cn} from '@/lib/utils';

export function DashboardPage() {
    const navigate = useNavigate();
    const [matches, setMatches] = useState<MatchData[]>([]);
    const [isLoadingMatches, setIsLoadingMatches] = useState(true);
    const [matchesError, setMatchesError] = useState('');

    const loadMatches = useCallback(async () => {
        try {
            const matchesData = await getAllMatches();
            setMatches(matchesData);
        } catch (err: unknown) {
            setMatchesError((err as Error).message);
        } finally {
            setIsLoadingMatches(false);
        }
    }, []);

    // Sessions (fuer Generierung, Polling und Fehler-Banner);
    // laedt die Spiele neu, sobald laufende Sessions fertig sind
    const {sessions, isGenerating, error, runningSessions, startGeneration} = useSessions(loadMatches);

    useEffect(() => {
        loadMatches();
    }, [loadMatches]);

    const displayError = error || matchesError;
    const hasRunningSessions = runningSessions.length > 0;

    return (
        <AppShell actions={<GenerateButton isGenerating={isGenerating} onClick={startGeneration}/>}>
            {/* Fehler */}
            {displayError && (
                <div className="mb-6 flex items-start gap-2 rounded-lg bg-destructive/10 px-4 py-3 ring-1 ring-destructive/20 animate-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive"/>
                    <p className="text-sm break-words text-destructive">{displayError}</p>
                </div>
            )}

            {/* Laufende Sessions */}
            {hasRunningSessions && (
                <Card className="mb-6 gap-0 overflow-hidden py-0">
                    <CardHeader className="flex h-11 flex-row items-center gap-2 px-4 py-0">
                        <Loader2 className="size-4 animate-spin text-muted-foreground"/>
                        <CardTitle className="text-sm">
                            {runningSessions.length === 1
                                ? 'Generierung läuft'
                                : `${runningSessions.length} Generierungen laufen`}
                        </CardTitle>
                    </CardHeader>
                    <Separator/>
                    <CardContent className="space-y-4 p-4">
                        <p className="text-sm text-muted-foreground">
                            Das Scraping läuft im Hintergrund. Die Spiele erscheinen automatisch, sobald es fertig ist.
                        </p>
                        {runningSessions.slice(0, 2).map((session) => (
                            <div key={session.session_id} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                        {session.progress?.step || 'Initialisierung...'}
                                    </span>
                                    <span className="font-mono font-medium">
                                        {session.progress
                                            ? `${session.progress.current}/${session.progress.total}`
                                            : '…'}
                                    </span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className={cn(
                                            'h-full rounded-full bg-primary transition-all duration-500 ease-out',
                                            !session.progress && 'animate-pulse'
                                        )}
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
                            <p className="text-xs text-muted-foreground">
                                + {runningSessions.length - 2} weitere
                                Session{runningSessions.length > 3 ? 's' : ''}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Spiele */}
            {isLoadingMatches ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-3 py-12 text-sm text-muted-foreground">
                    <Loader2 className="size-5 animate-spin"/>
                    Lade Spiele...
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Fehler-Banner wenn letzte Session fehlgeschlagen */}
                    {sessions.length > 0 && sessions[0].status === 'failed' && (
                        <div className="flex items-start gap-3 rounded-lg bg-destructive/10 px-4 py-3 ring-1 ring-destructive/20">
                            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive"/>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-destructive">
                                    {sessions[0].progress?.error_code === 'DFB_CREDENTIALS_INVALID'
                                        ? 'DFBnet-Login fehlgeschlagen'
                                        : 'Letzte Generierung fehlgeschlagen'}
                                </p>
                                <p className="mt-0.5 text-sm text-destructive/80">
                                    {sessions[0].progress?.error_message || 'Bei der Generierung ist ein Fehler aufgetreten.'}
                                </p>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => navigate(
                                        sessions[0].progress?.error_code === 'DFB_CREDENTIALS_INVALID'
                                            ? '/settings'
                                            : `/session/${sessions[0].session_id}`
                                    )}
                                >
                                    {sessions[0].progress?.error_code === 'DFB_CREDENTIALS_INVALID'
                                        ? 'Zugangsdaten prüfen'
                                        : 'Details anzeigen'}
                                </Button>
                            </div>
                        </div>
                    )}

                    <MatchList matches={matches}/>
                </div>
            )}
        </AppShell>
    );
}
