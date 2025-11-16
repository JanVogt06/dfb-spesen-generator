import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { DFBCredentialsForm } from '@/components/auth/DFBCredentialsForm';
import { ArrowLeft } from 'lucide-react';

export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Einstellungen</h1>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zum Dashboard
          </Button>
        </div>

        <div className="flex justify-center">
          <DFBCredentialsForm />
        </div>
      </div>
    </div>
  );
}