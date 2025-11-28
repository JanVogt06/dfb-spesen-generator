import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { DFBCredentialsForm } from '@/components/auth/DFBCredentialsForm';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { ThemeCard } from '@/components/settings/ThemeCard';
import { ArrowLeft } from 'lucide-react';

export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Einstellungen</h1>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zum Dashboard
          </Button>
        </div>

        {/* Settings Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 justify-items-center">
          {/* DFB Credentials */}
          <DFBCredentialsForm />

          {/* Passwort ändern */}
          <ChangePasswordForm />

          {/* Theme / Dark Mode */}
          <ThemeCard />
        </div>
      </div>
    </div>
  );
}