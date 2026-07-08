import {AppShell} from '@/components/layout/AppShell';
import {GenerateButton} from '@/components/sessions/GenerateButton';
import {SessionList} from '@/components/sessions/SessionList';
import {useSessions} from '@/hooks/useSessions';
import {AlertCircle, Loader2} from 'lucide-react';

export function SessionsPage() {
    const {sessions, isLoading, isGenerating, error, startGeneration} = useSessions();

    return (
        <AppShell actions={<GenerateButton isGenerating={isGenerating} onClick={startGeneration}/>}>
            {/* Fehler */}
            {error && (
                <div className="mb-6 flex items-start gap-2 rounded-lg bg-destructive/10 px-4 py-3 ring-1 ring-destructive/20 animate-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive"/>
                    <p className="text-sm break-words text-destructive">{error}</p>
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-3 py-12 text-sm text-muted-foreground">
                    <Loader2 className="size-5 animate-spin"/>
                    Lade Sessions...
                </div>
            ) : (
                <SessionList sessions={sessions}/>
            )}
        </AppShell>
    );
}
