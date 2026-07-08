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

            const url = window.URL.createObjectURL(response.data);
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
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-3 py-12 text-center">
                <span className="grid size-14 place-items-center rounded-2xl border border-dashed bg-muted/30">
                    <Calendar className="size-6 text-muted-foreground"/>
                </span>
                <p className="text-sm font-medium">Noch keine Spiele</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                    Starte die erste Generierung mit dem Button oben.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
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
                        downloadingFilename={downloadingFile}
                    />
                );
            })}
        </div>
    );
}