import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { DFBCredentialsForm } from '@/components/auth/DFBCredentialsForm';
import { ArrowLeft } from 'lucide-react';

export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Einstellungen</h1>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
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