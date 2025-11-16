import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@/lib/sessions';
import { getDownloadAllUrl } from '@/lib/sessions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SessionProgress } from './SessionProgress';
import { useSessionPolling } from '@/hooks/useSessionPolling';
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

interface SessionCardProps {
  initialSession: Session;
}

export function SessionCard({ initialSession }: SessionCardProps) {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);

  // Polling nur für laufende Sessions
  const isRunning = initialSession.status === 'in_progress'
    || initialSession.status === 'scraping'
    || initialSession.status === 'generating'
    || initialSession.status === 'pending';

  const { session } = useSessionPolling(
    initialSession.session_id,
    isRunning
  );

  // Nutze gepolte Session oder Initial-Session
  const currentSession = session || initialSession;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await api.get(getDownloadAllUrl(currentSession.session_id), {
        responseType: 'blob',
      });

      // Erstelle einen Download-Link
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `spesen_${currentSession.session_id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download-Fehler:', error);
      alert('Fehler beim Download. Bitte versuche es erneut.');
    } finally {
      setIsDownloading(false);
    }
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
    return currentSession.files.filter(file => file.name.toLowerCase().endsWith('.docx')).length;
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-gray-200 hover:border-blue-300">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg break-words">
              {formatSessionTitle(currentSession.created_at)}
            </CardTitle>
            <CardDescription className="text-xs mt-1 break-all">
              Session-ID: {currentSession.session_id}
            </CardDescription>
          </div>
          <div className="self-start">
            {getStatusBadge(currentSession.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress-Anzeige für laufende Sessions */}
        {isRunning && <SessionProgress session={currentSession} />}

        {/* Fertig: Download-Buttons */}
        {currentSession.status === 'completed' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 flex items-center gap-1.5">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span>{getDocxCount()} Spesenabrechnungen generiert</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                className="flex-1 w-full sm:w-auto"
                onClick={() => navigate(`/session/${currentSession.session_id}`)}
                variant="outline"
              >
                <Eye className="mr-2 h-4 w-4" />
                Details anzeigen
              </Button>
              <Button
                className="flex-1 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
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
        {currentSession.status === 'failed' && (
          <div className="text-sm text-red-600 flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>Bei der Generierung ist ein Fehler aufgetreten.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}