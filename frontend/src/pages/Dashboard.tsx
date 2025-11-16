import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { logout } from '@/lib/auth';
import type { Session } from '@/lib/sessions';
import { getUserSessions, startGeneration } from '@/lib/sessions';
import { SessionList } from '@/components/sessions/SessionList';

export function DashboardPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Sessions beim Laden holen
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await getUserSessions();
      setSessions(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const newSession = await startGeneration();
      // Neue Session zur Liste hinzufügen
      setSessions([newSession, ...sessions]);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message;
      setError(errorMessage);

      // Wenn DFB-Credentials fehlen, zu Settings leiten
      if (err.response?.data?.error?.code === 'CREDENTIALS_MISSING') {
        setTimeout(() => navigate('/settings'), 2000);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/settings')} variant="outline">
              Einstellungen
            </Button>
            <Button onClick={logout} variant="outline">
              Abmelden
            </Button>
          </div>
        </div>

        {/* Generierungs-Button */}
        <div className="mb-8">
          <Button
            onClick={handleStartGeneration}
            disabled={isGenerating}
            size="lg"
            className="w-full md:w-auto"
          >
            {isGenerating ? 'Starte Generierung...' : '🚀 Neue Spesen generieren'}
          </Button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Sessions-Liste */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Deine Sessions</h2>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Lade Sessions...</p>
            </div>
          ) : (
            <SessionList sessions={sessions} />
          )}
        </div>
      </div>
    </div>
  );
}