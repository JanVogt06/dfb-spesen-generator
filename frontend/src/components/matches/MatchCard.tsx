import {useState} from 'react';
import type {MatchData} from '@/lib/matches';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import {Button} from '@/components/ui/button';
import {Calendar, ChevronDown, ChevronUp, Download, Users, MapPin, Euro} from 'lucide-react';

interface SpesenInfo {
    sr: number | null;
    sra: number | null;
    sr_formatted: string;
    sra_formatted: string;
    is_punktspiel: boolean;
    sra_count?: number;
    hinweis: string | null;
}

interface MatchCardProps {
    match: MatchData & { _spesen?: SpesenInfo };
    index: number;
    filename: string;
    onDownload: (filename: string) => void;
    downloadingFilename: string | null;
}

export function MatchCard({match, index, filename, onDownload, downloadingFilename}: MatchCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const pdfFilename = filename.replace(/\.docx$/i, '.pdf');

    const getMatchTitle = () => {
        if (match.spiel_info?.heim_team && match.spiel_info?.gast_team) {
            return `${match.spiel_info.heim_team} – ${match.spiel_info.gast_team}`;
        }
        return `Spiel ${index + 1}`;
    };

    const getMatchSubtitle = () => {
        if (match.spiel_info?.anpfiff) {
            try {
                const anpfiff = match.spiel_info.anpfiff;
                let date: Date | null = null;

                // Format: "Samstag · 22.11.2025 · 11:00 Uhr" (DFBnet Format)
                if (anpfiff.includes('·')) {
                    const parts = anpfiff.split('·').map(p => p.trim());
                    // parts[0] = "Samstag", parts[1] = "22.11.2025", parts[2] = "11:00 Uhr"
                    if (parts.length >= 3) {
                        const datePart = parts[1]; // "22.11.2025"
                        const timePart = parts[2].replace('Uhr', '').trim(); // "11:00"
                        const [day, month, year] = datePart.split('.');
                        if (day && month && year) {
                            date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}`);
                        }
                    } else if (parts.length === 2) {
                        // Nur Datum ohne Zeit: "Samstag · 22.11.2025"
                        const datePart = parts[1];
                        const [day, month, year] = datePart.split('.');
                        if (day && month && year) {
                            date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                        }
                    }
                }
                // ISO 8601 Format (z.B. "2025-11-20T15:00:00")
                else if (anpfiff.includes('T') || (anpfiff.includes('-') && !anpfiff.includes('.'))) {
                    date = new Date(anpfiff);
                }
                // Deutsches Format ohne Wochentag (z.B. "20.11.2025 15:00")
                else if (anpfiff.includes('.')) {
                    const parts = anpfiff.split(' ');
                    if (parts.length >= 2) {
                        const [day, month, year] = parts[0].split('.');
                        const time = parts[1].replace('Uhr', '').trim() || '00:00';
                        date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}`);
                    } else {
                        // Nur Datum ohne Uhrzeit
                        const [day, month, year] = parts[0].split('.');
                        date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                    }
                }
                // Falls bereits ein Timestamp
                else if (!isNaN(Number(anpfiff))) {
                    date = new Date(Number(anpfiff));
                } else {
                    // Fallback: Versuche direktes Parsen
                    date = new Date(anpfiff);
                }

                // Prüfe, ob das Datum gültig ist
                if (!date || isNaN(date.getTime())) {
                    // Kein Fehler loggen, einfach Original zurückgeben
                    return anpfiff;
                }

                return date.toLocaleString('de-DE', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }) + ' Uhr';
            } catch {
                // Bei Fehlern einfach den Original-String zurückgeben
                return match.spiel_info.anpfiff;
            }
        }
        return 'Keine Zeitangabe';
    };

    const formatFieldName = (key: string): string => {
        const fieldNames: Record<string, string> = {
            anpfiff: 'Anpfiff',
            heim_team: 'Heim',
            gast_team: 'Gast',
            mannschaftsart: 'Mannschaftsart',
            spielklasse: 'Spielklasse',
            staffel: 'Staffel',
            spieltag: 'Spieltag',
            rolle: 'Rolle',
            name: 'Name',
            telefon: 'Telefon',
            email: 'E-Mail',
            strasse: 'Straße',
            plz_ort: 'PLZ/Ort',
            adresse: 'Adresse',
            platz_typ: 'Platzart',
        };
        return fieldNames[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    };

    const sectionHeaderClass = 'flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase';
    const fieldRowClass = 'grid grid-cols-[110px_1fr] gap-2 sm:grid-cols-[130px_1fr]';

    const renderSpielInfo = () => {
        if (!match.spiel_info || Object.keys(match.spiel_info).length === 0) {
            return null;
        }

        // Felder die wir immer anzeigen wollen (auch wenn leer für Konsistenz)
        const priorityFields = ['spielklasse', 'staffel', 'mannschaftsart', 'spieltag'];
        const fieldsToShow = Object.entries(match.spiel_info)
            .filter(([key, value]) =>
                value &&
                !['heim_team', 'gast_team', 'anpfiff'].includes(key) &&
                !key.startsWith('_')
            );

        if (fieldsToShow.length === 0) {
            return null;
        }

        // Sortiere Felder: Prioritäts-Felder zuerst
        fieldsToShow.sort((a, b) => {
            const aIndex = priorityFields.indexOf(a[0]);
            const bIndex = priorityFields.indexOf(b[0]);
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return 0;
        });

        return (
            <div className="space-y-2">
                <h4 className={sectionHeaderClass}>
                    <Calendar className="size-3.5"/>
                    Spieldetails
                </h4>
                <div className="grid gap-1.5 rounded-lg border border-dashed p-3 text-sm">
                    {fieldsToShow.map(([key, value]) => (
                        <div key={key} className={fieldRowClass}>
                            <span className="break-words text-muted-foreground">{formatFieldName(key)}</span>
                            <span className="break-words">{value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderSpesen = () => {
        const spesen = match._spesen;

        if (!spesen) {
            return null;
        }

        // Keine Anzeige wenn keine Spesen berechnet wurden und kein Hinweis vorhanden
        if (!spesen.sr_formatted && !spesen.hinweis) {
            return null;
        }

        // Prüfe ob SRAs angesetzt sind
        const hasSRA = match.schiedsrichter?.some(sr => sr.rolle?.startsWith('SRA'));

        return (
            <div className="space-y-2">
                <h4 className={sectionHeaderClass}>
                    <Euro className="size-3.5"/>
                    Spesen (TFV-Spesenordnung)
                </h4>
                {spesen.sr_formatted ? (
                    <div className="grid gap-1.5 rounded-lg border border-dashed p-3 text-sm">
                        <div className={fieldRowClass}>
                            <span className="text-muted-foreground">SR</span>
                            <span className="font-mono font-medium">{spesen.sr_formatted}</span>
                        </div>
                        {spesen.sra_formatted && hasSRA && (
                            <div className={fieldRowClass}>
                                <span className="text-muted-foreground">SRA</span>
                                <span className="font-mono font-medium">{spesen.sra_formatted}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    spesen.hinweis && (
                        <p className="rounded-lg border border-dashed p-3 text-sm italic text-muted-foreground">
                            {spesen.hinweis}
                        </p>
                    )
                )}
            </div>
        );
    };

    const renderSchiedsrichter = () => {
        if (!match.schiedsrichter || match.schiedsrichter.length === 0) {
            return null;
        }

        return (
            <div className="space-y-2">
                <h4 className={sectionHeaderClass}>
                    <Users className="size-3.5"/>
                    Schiedsrichter
                </h4>
                <div className="space-y-3">
                    {match.schiedsrichter.map((sr, idx) => (
                        <div key={idx} className="grid gap-1.5 rounded-lg border border-dashed p-3 text-sm">
                            {Object.entries(sr)
                                .filter(([_, value]) => value)
                                .map(([key, value]) => (
                                    <div key={key} className={fieldRowClass}>
                                        <span className="break-words text-muted-foreground">{formatFieldName(key)}</span>
                                        <span className="break-words">{value}</span>
                                    </div>
                                ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderSpielstaette = () => {
        if (!match.spielstaette || Object.keys(match.spielstaette).length === 0) {
            return null;
        }

        const fieldsToShow = Object.entries(match.spielstaette).filter(([_, value]) => value);

        if (fieldsToShow.length === 0) {
            return null;
        }

        return (
            <div className="space-y-2">
                <h4 className={sectionHeaderClass}>
                    <MapPin className="size-3.5"/>
                    Spielstätte
                </h4>
                <div className="grid gap-1.5 rounded-lg border border-dashed p-3 text-sm">
                    {fieldsToShow.map(([key, value]) => (
                        <div key={key} className={fieldRowClass}>
                            <span className="break-words text-muted-foreground">{formatFieldName(key)}</span>
                            <span className="break-words">{value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Kompakte Spesen-Anzeige im Header (nur wenn vorhanden)
    const renderHeaderSpesen = () => {
        const spesen = match._spesen;
        if (!spesen?.sr_formatted) return null;

        // Prüfe ob SRAs angesetzt sind
        const hasSRA = match.schiedsrichter?.some(sr => sr.rolle?.startsWith('SRA'));

        return (
            <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                SR {spesen.sr_formatted}
                {spesen.sra_formatted && hasSRA && ` · SRA ${spesen.sra_formatted}`}
            </span>
        );
    };

    return (
        <Card className="gap-0 overflow-hidden py-0 transition-all hover:ring-foreground/20">
            <CardHeader className="px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <CardTitle className="break-words text-sm sm:text-base">
                                {getMatchTitle()}
                            </CardTitle>
                            {renderHeaderSpesen()}
                        </div>
                        <p className="flex items-center gap-1.5 break-words text-xs text-muted-foreground sm:text-sm">
                            <Calendar className="size-3.5 shrink-0"/>
                            {getMatchSubtitle()}
                        </p>
                    </div>
                    <div className="flex gap-2 self-start">
                        <Button
                            onClick={() => onDownload(filename)}
                            disabled={downloadingFilename === filename}
                            size="sm"
                            variant="outline"
                            className="whitespace-nowrap"
                        >
                            <Download className="size-3.5"/>
                            {downloadingFilename === filename ? 'Lade...' : 'DOCX'}
                        </Button>
                        {match._pdf_available && (
                            <Button
                                onClick={() => onDownload(pdfFilename)}
                                disabled={downloadingFilename === pdfFilename}
                                variant="outline"
                                size="sm"
                                className="whitespace-nowrap"
                            >
                                <Download className="size-3.5"/>
                                {downloadingFilename === pdfFilename ? 'Lade...' : 'PDF'}
                            </Button>
                        )}
                        <Button
                            onClick={() => setIsExpanded(!isExpanded)}
                            variant="ghost"
                            size="icon-sm"
                            aria-label={isExpanded ? 'Details einklappen' : 'Details ausklappen'}
                        >
                            {isExpanded ? (
                                <ChevronUp className="size-4"/>
                            ) : (
                                <ChevronDown className="size-4"/>
                            )}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            {isExpanded && (
                <>
                    <Separator/>
                    <CardContent className="space-y-5 p-4">
                        {renderSpielInfo()}
                        {renderSpesen()}
                        {renderSchiedsrichter()}
                        {renderSpielstaette()}
                    </CardContent>
                </>
            )}
        </Card>
    );
}
