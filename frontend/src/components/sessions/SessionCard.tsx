import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@/lib/sessions';
import { getDownloadAllUrl, isSessionRunning, isSessionCompleted, isSessionFailed } from '@/lib/sessions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SessionProgress } from './SessionProgress';
import { api } from '@/lib/api';
import {
  Clock,
  PlayCircle,
  Database,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  Download
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SessionStatus } from '@/lib/sessionUtils';

interface SessionCardProps {
  session: Session;  // GEÄNDERT: Nicht mehr "initialSession", sondern "session" - wird von Parent aktualisiert
}

export function SessionCard({ session }: SessionCardProps) {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // ENTFERNT: Kein eigenes Polling mehr - Parent (Dashboard) macht das zentral
  // const { session } = useSessionPolling(...)

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const response = await api.get(getDownloadAllUrl(session.session_id), {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/zip' });
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

  const getStatusBadge = (status: SessionStatus) => {
    const badges: Record<SessionStatus, { text: string; className: string; icon: LucideIcon }> = {
      pending: {
        text: 'Wartend',
        className: 'bg-muted text-muted-foreground border border-border',
        icon: Clock
      },
      in_progress: {
        text: 'Läuft',
        className: 'bg-primary/10 text-primary border border-primary/20',
        icon: PlayCircle
      },
      scraping: {
        text: 'Scraping',
        className: 'bg-accent text-accent-foreground border border-border',
        icon: Database
      },
      generating: {
        text: 'Generierung',
        className: 'bg-secondary text-secondary-foreground border border-border',
        icon: FileText
      },
      completed: {
        text: 'Fertig',
        className: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
        icon: CheckCircle2
      },
      failed: {
        text: 'Fehler',
        className: 'bg-destructive/10 text-destructive border border-destructive/20',
        icon: XCircle
      },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium ${badge.className} flex items-center gap-1.5 whitespace-nowrap`}>
        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
        <span className="hidden sm:inline">{badge.text}</span>
      </span>
    );
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

  const getDocxCount = () => {
    return session.files.filter(file => file.name.toLowerCase().endsWith('.docx')).length;
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-border hover:border-primary/30">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg break-words">
              {formatSessionTitle(session.created_at)}
            </CardTitle>
            <CardDescription className="text-xs mt-1 break-all">
              Session-ID: {session.session_id}
            </CardDescription>
          </div>
          <div className="self-start">
            {getStatusBadge(session.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress-Anzeige für laufende Sessions */}
        {isSessionRunning(session) && <SessionProgress session={session} />}

        {/* Fertig: Download-Buttons */}
        {isSessionCompleted(session) && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span>{getDocxCount()} Spesenabrechnungen generiert</span>
            </p>
            {downloadError && (
              <div className="text-sm text-destructive flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{downloadError}</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                className="flex-1 w-full sm:w-auto"
                onClick={() => navigate(`/session/${session.session_id}`)}
                variant="outline"
              >
                <Eye className="mr-2 h-4 w-4" />
                Details anzeigen
              </Button>
              <Button
                className="flex-1 w-full sm:w-auto"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                <Download className="mr-2 h-4 w-4" />
                {isDownloading ? 'Lädt...' : 'Alle (ZIP)'}
              </Button>
            </div>
          </div>
        )}

        {/* Fehler */}
        {isSessionFailed(session) && (
          <div className="text-sm text-destructive flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>Bei der Generierung ist ein Fehler aufgetreten.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}