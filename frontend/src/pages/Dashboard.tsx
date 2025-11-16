import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { logout } from '@/lib/auth';
import type { Session } from '@/lib/sessions';
import { getUserSessions, startGeneration } from '@/lib/sessions';
import { SessionList } from '@/components/sessions/SessionList';
import { Zap, Settings, LogOut, AlertCircle } from 'lucide-react';

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
      setSessions([newSession, ...sessions]);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message;
      setError(errorMessage);

      if (err.response?.data?.error?.code === 'CREDENTIALS_MISSING') {
        setTimeout(() => navigate('/settings'), 2000);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header mit Gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg mb-8 p-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">TFV Spesen Generator</h1>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/settings')}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <Settings className="mr-2 h-4 w-4" />
                Einstellungen
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>

        {/* Generierungs-Button */}
        <div className="mb-8">
          <Button
            onClick={handleStartGeneration}
            disabled={isGenerating}
            size="lg"
            className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl"
          >
            <Zap className="mr-2 h-5 w-5" />
            {isGenerating ? 'Starte Generierung...' : 'Neue Spesen generieren'}
          </Button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sessions-Liste */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Deine Sessions</h2>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-4">Lade Sessions...</p>
            </div>
          ) : (
            <SessionList sessions={sessions} />
          )}
        </div>
      </div>
    </div>
  );
}