import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { DFBCredentialsForm } from '@/components/auth/DFBCredentialsForm';

export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Einstellungen</h1>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
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
