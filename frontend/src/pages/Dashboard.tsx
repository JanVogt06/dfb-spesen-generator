import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SessionList } from '@/components/sessions/SessionList';
import { MatchList } from '@/components/matches/MatchList';
import { getUserSessions, startGeneration, type Session } from '@/lib/sessions';
import { getAllMatches, type MatchData } from '@/lib/matches';
import { logout } from '@/lib/auth';
import { Settings, LogOut, Zap, AlertCircle, Calendar, FolderClock } from 'lucide-react';

export function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'matches' | 'sessions'>('matches');
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Lade beide parallel
      const [matchesData, sessionsData] = await Promise.all([
        getAllMatches(),
        getUserSessions()
      ]);
      setMatches(matchesData);
      setSessions(sessionsData);
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

      // Reload matches nach kurzer Verzögerung (damit Scraping abgeschlossen ist)
      setTimeout(async () => {
        try {
          const updatedMatches = await getAllMatches();
          setMatches(updatedMatches);
        } catch (err) {
          console.error('Fehler beim Neuladen der Matches:', err);
        }
      }, 3000);
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="bg-primary rounded-xl sm:rounded-2xl shadow-lg mb-6 sm:mb-8 p-4 sm:p-6 lg:p-8 text-primary-foreground">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">TFV Spesen Generator</h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => navigate('/settings')}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm w-full sm:w-auto"
              >
                <Settings className="mr-2 h-4 w-4" />
                Einstellungen
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm w-full sm:w-auto"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>

        {/* Generierungs-Button */}
        <div className="mb-6 sm:mb-8">
          <Button
            onClick={handleStartGeneration}
            disabled={isGenerating}
            size="lg"
            className="w-full sm:w-auto shadow-lg hover:shadow-xl"
          >
            <Zap className="mr-2 h-5 w-5" />
            {isGenerating ? 'Starte Generierung...' : 'Neue Spesen generieren'}
          </Button>

          {error && (
            <div className="mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 break-words">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setActiveTab('matches')}
            variant={activeTab === 'matches' ? 'default' : 'outline'}
            className="flex-1 sm:flex-none"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Meine Spiele ({matches.length})
          </Button>
          <Button
            onClick={() => setActiveTab('sessions')}
            variant={activeTab === 'sessions' ? 'default' : 'outline'}
            className="flex-1 sm:flex-none"
          >
            <FolderClock className="mr-2 h-4 w-4" />
            Sessions ({sessions.length})
          </Button>
        </div>

        {/* Content */}
        <div>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-gray-600 mt-4">Lade Daten...</p>
            </div>
          ) : (
            <>
              {activeTab === 'matches' ? (
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-800">
                    Alle Spiele
                  </h2>
                  <MatchList matches={matches} />
                </div>
              ) : (
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-800">
                    Deine Sessions
                  </h2>
                  <SessionList sessions={sessions} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}