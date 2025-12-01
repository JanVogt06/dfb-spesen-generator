import {useState} from 'react';
import type {MatchData} from '@/lib/matches';
import {MatchCard} from '../matches/MatchCard';
import {Calendar} from 'lucide-react';
import {api} from '@/lib/api';

interface MatchListProps {
    matches: MatchData[];
}

export function MatchList({matches}: MatchListProps) {
    const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

    const handleDownload = async (sessionId: string, filename: string) => {
        setDownloadingFile(filename);
        try {
            const response = await api.get(`/api/download/${sessionId}/${filename}`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Download fehlgeschlagen');
        } finally {
            setDownloadingFile(null);
        }
    };

    if (matches.length === 0) {
        return (
            <div className="text-center py-12 bg-card rounded-lg shadow border border-border">
                <Calendar className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4"/>
                <p className="text-muted-foreground font-medium mb-2">
                    Noch keine Spiele
                </p>
                <p className="text-muted-foreground text-sm">
                    Starte die erste Generierung mit dem Button oben!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {matches.map((match, index) => {
                // KORRIGIERT: Verwende _filename vom Backend!
                const filename = match._filename || `spiel_${index + 1}.docx`;
                const sessionId = match._session_id || '';

                return (
                    <MatchCard
                        key={`${match.spiel_info.heim_team}-${match.spiel_info.gast_team}-${match._datum}-${index}`}
                        match={match}
                        index={index}
                        filename={filename}
                        onDownload={(fname) => handleDownload(sessionId, fname)}
                        isDownloading={downloadingFile === filename}
                    />
                );
            })}
        </div>
    );
}