import type { Session } from '@/lib/sessions';

interface SessionProgressProps {
  session: Session;
}

export function SessionProgress({ session }: SessionProgressProps) {
  const progress = session.progress;

  if (!progress) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-600">Initialisierung...</div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '10%' }} />
        </div>
      </div>
    );
  }

  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{progress.step}</span>
        <span className="text-gray-900 font-medium">
          {progress.current} / {progress.total}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 text-right">
        {percentage}%
      </div>
    </div>
  );
}