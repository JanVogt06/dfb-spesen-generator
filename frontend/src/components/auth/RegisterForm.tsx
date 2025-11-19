import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { register } from '@/lib/auth';
import { AlertCircle } from 'lucide-react';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    // KRITISCH: preventDefault MUSS als allererstes kommen!
    e.preventDefault();
    e.stopPropagation();

    console.log('Form submitted - preventDefault called');

    setError('');

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Calling register...');
      await register(email, password);
      console.log('Registration successful, navigating...');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.error?.message || 'Registrierung fehlgeschlagen';
      console.log('Setting error message:', errorMessage);
      setError(errorMessage);
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-4 sm:mx-0">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-xl sm:text-2xl">Registrieren</CardTitle>
        <CardDescription className="text-sm">
          Erstelle einen neuen TFV Spesen Generator Account
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-4" action="javascript:void(0);">
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
              placeholder="Mindestens 8 Zeichen"
              className="text-sm sm:text-base"
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-500">
              Das Passwort muss mindestens 8 Zeichen lang sein
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm sm:text-base">Passwort bestätigen</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Passwort wiederholen"
              className="text-sm sm:text-base"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 break-words">
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
            {isLoading ? 'Registrieren...' : 'Registrieren'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center px-4 sm:px-6">
        <p className="text-sm text-gray-600 text-center">
          Bereits ein Account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Zum Login
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}