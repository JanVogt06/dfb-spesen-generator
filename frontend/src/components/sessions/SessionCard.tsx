import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@/lib/sessions';
import { getDownloadAllUrl } from '@/lib/sessions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SessionProgress } from './SessionProgress';
import { useSessionPolling } from '@/hooks/useSessionPolling';
import { api } from '@/lib/api';

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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {formatSessionTitle(currentSession.created_at)}
            </CardTitle>
            <CardDescription>
              Session-ID: {currentSession.session_id}
            </CardDescription>
          </div>
          {getStatusBadge(currentSession.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress-Anzeige für laufende Sessions */}
        {isRunning && <SessionProgress session={currentSession} />}

        {/* Fertig: Download-Buttons */}
        {currentSession.status === 'completed' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {getDocxCount()} Spesenabrechnungen generiert
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => navigate(`/session/${currentSession.session_id}`)}
                variant="outline"
              >
                Details anzeigen
              </Button>
              <Button
                className="flex-1"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? 'Lädt herunter...' : 'Alle (ZIP)'}
              </Button>
            </div>
          </div>
        )}

        {/* Fehler */}
        {currentSession.status === 'failed' && (
          <div className="text-sm text-red-600">
            Bei der Generierung ist ein Fehler aufgetreten.
          </div>
        )}
      </CardContent>
    </Card>
  );
}