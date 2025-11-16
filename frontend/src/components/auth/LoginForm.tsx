import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { login } from '@/lib/auth';

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
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login fehlgeschlagen');
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
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 break-words">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full text-sm sm:text-base" disabled={isLoading}>
            {isLoading ? 'Anmelden...' : 'Anmelden'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center px-4 sm:px-6">
        <p className="text-sm text-gray-600 text-center">
          Noch kein Account?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Jetzt registrieren
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}