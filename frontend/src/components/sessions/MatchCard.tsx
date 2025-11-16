import { useState } from 'react';
import type { MatchData } from '@/lib/matches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronDown, ChevronUp, Download, Users, MapPin } from 'lucide-react';

interface MatchCardProps {
  match: MatchData;
  index: number;
  filename: string;
  onDownload: (filename: string) => void;
  isDownloading: boolean;
}

export function MatchCard({ match, index, filename, onDownload, isDownloading }: MatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getMatchTitle = () => {
    if (match.spiel_info?.heim_team && match.spiel_info?.gast_team) {
      return `${match.spiel_info.heim_team} - ${match.spiel_info.gast_team}`;
    }
    return `Spiel ${index + 1}`;
  };

  const getMatchSubtitle = () => {
    if (match.spiel_info?.anpfiff) {
      const date = new Date(match.spiel_info.anpfiff);
      return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' Uhr';
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
      platz_typ: 'Platztyp',
    };
    return fieldNames[key] || key;
  };

  const renderSpielInfo = () => {
    if (!match.spiel_info || Object.keys(match.spiel_info).length === 0) {
      return null;
    }

    const fieldsToShow = Object.entries(match.spiel_info)
      .filter(([key, value]) =>
        value &&
        key !== 'heim_team' &&
        key !== 'gast_team' &&
        key !== 'anpfiff'
      );

    if (fieldsToShow.length === 0) {
      return null;
    }

    return (
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1.5 text-sm sm:text-base">
          <Calendar className="h-4 w-4" />
          Spielinformationen
        </h4>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="grid gap-2 text-xs sm:text-sm">
            {fieldsToShow.map(([key, value]) => (
              <div key={key} className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] gap-2">
                <span className="text-gray-600 break-words">{formatFieldName(key)}:</span>
                <span className="text-gray-900 break-words">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSchiedsrichter = () => {
    if (!match.schiedsrichter || match.schiedsrichter.length === 0) {
      return null;
    }

    return (
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1.5 text-sm sm:text-base">
          <Users className="h-4 w-4" />
          Schiedsrichter
        </h4>
        <div className="space-y-3">
          {match.schiedsrichter.map((sr, idx) => (
            <div key={idx} className="bg-gray-50 p-3 rounded-lg">
              <div className="grid gap-2 text-xs sm:text-sm">
                {Object.entries(sr)
                  .filter(([_, value]) => value)
                  .map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] gap-2">
                      <span className="text-gray-600 break-words">{formatFieldName(key)}:</span>
                      <span className="text-gray-900 break-words">{value}</span>
                    </div>
                  ))}
              </div>
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
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1.5 text-sm sm:text-base">
          <MapPin className="h-4 w-4" />
          Spielstätte
        </h4>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="grid gap-2 text-xs sm:text-sm">
            {fieldsToShow.map(([key, value]) => (
              <div key={key} className="grid grid-cols-[100px_1fr] sm:grid-cols-[120px_1fr] gap-2">
                <span className="text-gray-600 break-words">{formatFieldName(key)}:</span>
                <span className="text-gray-900 break-words">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-gray-200 hover:border-blue-300">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm sm:text-base break-words">{getMatchTitle()}</CardTitle>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 flex items-center gap-1.5">
              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
              <span className="break-words">{getMatchSubtitle()}</span>
            </p>
          </div>
          <div className="flex gap-2 self-start sm:ml-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-1 sm:flex-none"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Weniger</span>
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Details</span>
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => onDownload(filename)}
              disabled={isDownloading}
              className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Download className="mr-1 h-4 w-4" />
              {isDownloading ? 'Lädt...' : 'DOCX'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0 animate-in slide-in-from-top-2 duration-300">
          {!match.spiel_info && !match.schiedsrichter && !match.spielstaette ? (
            <div className="text-sm text-gray-600 py-4">
              Keine Detaildaten verfügbar
            </div>
          ) : (
            <>
              {renderSpielInfo()}
              {renderSchiedsrichter()}
              {renderSpielstaette()}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}