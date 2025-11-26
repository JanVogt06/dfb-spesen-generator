import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { login } from '@/lib/auth';
import { AlertCircle } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = axiosError.response?.data?.error?.message || 'Login fehlgeschlagen';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-4 sm:mx-0">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-xl sm:text-2xl">Anmelden</CardTitle>
        <CardDescription className="text-sm">
          Melde dich mit deinem TFV Spesen Generator Account an
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm sm:text-base">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="deine@email.de"
              className="text-sm sm:text-base"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm sm:text-base">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="text-sm sm:text-base"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive break-words">
                  {error}
                </p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full text-sm sm:text-base"
            disabled={isLoading}
          >
            {isLoading ? 'Anmelden...' : 'Anmelden'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center px-4 sm:px-6">
        <p className="text-sm text-muted-foreground text-center">
          Noch kein Account?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Jetzt registrieren
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}