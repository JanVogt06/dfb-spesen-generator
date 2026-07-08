import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import type {Session} from '@/lib/sessions';
import {getDownloadAllUrl, isSessionRunning, isSessionCompleted, isSessionFailed} from '@/lib/sessions';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {Button} from '@/components/ui/button';
import {SessionProgress} from './SessionProgress';
import {api} from '@/lib/api';
import {FileText, XCircle, Eye, Download} from 'lucide-react';
import {cn} from '@/lib/utils';
import type {SessionStatus} from '@/lib/sessionUtils';

interface SessionCardProps {
    session: Session;
}

const STATUS_META: Record<SessionStatus, { text: string; dotClass: string; pulse?: boolean }> = {
    pending: {text: 'Wartend', dotClass: 'bg-muted-foreground/40'},
    in_progress: {text: 'Läuft', dotClass: 'bg-primary', pulse: true},
    scraping: {text: 'Scraping', dotClass: 'bg-primary', pulse: true},
    generating: {text: 'Generierung', dotClass: 'bg-primary', pulse: true},
    completed: {text: 'Fertig', dotClass: 'bg-success'},
    failed: {text: 'Fehler', dotClass: 'bg-destructive'},
};

export function SessionCard({session}: SessionCardProps) {
    const navigate = useNavigate();
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handleDownload = async () => {
        setIsDownloading(true);
        setDownloadError(null);
        try {
            const response = await api.get(getDownloadAllUrl(session.session_id), {
                responseType: 'blob',
            });

            const blob = new Blob([response.data], {type: 'application/zip'});
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `spesen_${session.session_id}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download-Fehler:', error);
            setDownloadError('Fehler beim Download. Bitte versuche es erneut.');
        } finally {
            setIsDownloading(false);
        }
    };

    const statusMeta = STATUS_META[session.status] || STATUS_META.pending;

    const formatSessionDate = (createdAt: string) => {
        const date = new Date(createdAt);
        return `${date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })} · ${date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
        })} Uhr`;
    };

    const getDocxCount = () => {
        return session.files.filter(file => file.name.toLowerCase().endsWith('.docx')).length;
    };

    return (
        <Card className="gap-0 overflow-hidden py-0 transition-all hover:ring-foreground/20">
            <CardHeader className="flex h-11 flex-row items-center gap-2 px-4 py-0">
                <CardTitle className="min-w-0 flex-1 truncate text-sm">
                    {formatSessionDate(session.created_at)}
                </CardTitle>
                <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn('size-2 rounded-full', statusMeta.dotClass, statusMeta.pulse && 'animate-pulse')}/>
                    {statusMeta.text}
                </span>
            </CardHeader>
            <Separator/>
            <CardContent className="space-y-3 p-4">
                <p className="truncate font-mono text-xs text-muted-foreground">
                    {session.session_id}
                </p>

                {/* Progress-Anzeige für laufende Sessions */}
                {isSessionRunning(session) && <SessionProgress session={session}/>}

                {/* Fertig: Download-Buttons */}
                {isSessionCompleted(session) && (
                    <div className="space-y-3">
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <FileText className="size-4 shrink-0"/>
                            <span>{getDocxCount()} Spesenabrechnungen</span>
                        </p>
                        {downloadError && (
                            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive ring-1 ring-destructive/20">
                                <XCircle className="mt-0.5 size-4 shrink-0"/>
                                <span>{downloadError}</span>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Button
                                className="flex-1"
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/session/${session.session_id}`)}
                            >
                                <Eye className="size-4"/>
                                Details
                            </Button>
                            <Button
                                className="flex-1"
                                size="sm"
                                onClick={handleDownload}
                                disabled={isDownloading}
                            >
                                <Download className="size-4"/>
                                {isDownloading ? 'Lädt...' : 'ZIP'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Fehler */}
                {isSessionFailed(session) && (
                    <div className="space-y-3">
                        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive ring-1 ring-destructive/20">
                            <XCircle className="mt-0.5 size-4 shrink-0"/>
                            <div>
                                <p className="font-medium">
                                    {session.progress?.error_code === 'DFB_CREDENTIALS_INVALID'
                                        ? 'DFBnet-Login fehlgeschlagen'
                                        : 'Generierung fehlgeschlagen'}
                                </p>
                                <p className="mt-1 text-destructive/80">
                                    {session.progress?.error_message || 'Bei der Generierung ist ein Fehler aufgetreten.'}
                                </p>
                            </div>
                        </div>
                        <Button
                            className="w-full"
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(
                                session.progress?.error_code === 'DFB_CREDENTIALS_INVALID'
                                    ? '/settings'
                                    : `/session/${session.session_id}`
                            )}
                        >
                            {session.progress?.error_code === 'DFB_CREDENTIALS_INVALID'
                                ? 'Zu den Einstellungen'
                                : 'Details anzeigen'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
