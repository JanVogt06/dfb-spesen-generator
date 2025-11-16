import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

export function DFBCredentialsForm() {
  const [dfbUsername, setDfbUsername] = useState('');
  const [dfbPassword, setDfbPassword] = useState('');
  const [hasCredentials, setHasCredentials] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Prüfe beim Laden ob Credentials bereits gespeichert sind
  useEffect(() => {
    const checkCredentials = async () => {
      try {
        const response = await api.get('/api/auth/dfb-credentials/status');
        setHasCredentials(response.data.has_credentials);
      } catch (err) {
        console.error('Fehler beim Laden des Credential-Status:', err);
      }
    };
    checkCredentials();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await api.post('/api/auth/dfb-credentials', {
        dfb_username: dfbUsername,
        dfb_password: dfbPassword,
      });
      
      setSuccess('DFB-Credentials erfolgreich gespeichert!');
      setHasCredentials(true);
      setDfbUsername('');
      setDfbPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Fehler beim Speichern');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>DFB-Zugangsdaten</CardTitle>
        <CardDescription>
          Speichere deine DFBnet-Zugangsdaten für die automatische Generierung
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasCredentials && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              ✓ DFB-Credentials sind gespeichert
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dfbUsername">DFB-Benutzername</Label>
            <Input
              id="dfbUsername"
              type="text"
              value={dfbUsername}
              onChange={(e) => setDfbUsername(e.target.value)}
              required
              placeholder="Dein DFBnet-Benutzername"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dfbPassword">DFB-Passwort</Label>
            <Input
              id="dfbPassword"
              type="password"
              value={dfbPassword}
              onChange={(e) => setDfbPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-red-500">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-600">
              {success}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Speichern...' : hasCredentials ? 'Aktualisieren' : 'Speichern'}
          </Button>

          <p className="text-xs text-gray-500">
            Deine Zugangsdaten werden verschlüsselt gespeichert.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
