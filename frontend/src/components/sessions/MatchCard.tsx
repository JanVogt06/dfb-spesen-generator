import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { MatchData } from '@/lib/sessions';

interface MatchCardProps {
  match: MatchData;
  index: number;
  onDownload: (filename: string) => void;
  filename: string;
  isDownloading: boolean;
}

export function MatchCard({ match, index, onDownload, filename, isDownloading }: MatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getMatchTitle = () => {
    const spiel = match.spiel_info || {};
    if (spiel.heim_team && spiel.gast_team) {
      return `${spiel.heim_team} vs ${spiel.gast_team}`;
    }
    return `Spiel ${index + 1}`;
  };

  const getMatchSubtitle = () => {
    const spiel = match.spiel_info || {};
    const parts = [];

    if (spiel.anpfiff) parts.push(spiel.anpfiff);
    if (spiel.spielklasse) parts.push(spiel.spielklasse);
    if (spiel.mannschaftsart) parts.push(spiel.mannschaftsart);

    return parts.length > 0 ? parts.join(' • ') : 'Keine Details verfügbar';
  };

  const formatFieldName = (key: string): string => {
    const fieldNames: Record<string, string> = {
      anpfiff: 'Anpfiff',
      heim_team: 'Heimmannschaft',
      gast_team: 'Gastmannschaft',
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
    return fieldNames[key] || key.charAt(0).toUpperCase() + key.slice(1);
  };

  const renderSpielInfo = () => {
    const spiel = match.spiel_info;
    if (!spiel) return null;

    const entries = Object.entries(spiel).filter(([_, value]) => value);
    if (entries.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-gray-700">Spieldaten</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {entries.map(([key, value]) => (
            <div key={key} className="text-sm">
              <span className="text-gray-600">{formatFieldName(key)}:</span>{' '}
              <span className="text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSchiedsrichter = () => {
    const schiris = match.schiedsrichter;
    if (!schiris || schiris.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-gray-700">Schiedsrichter</h4>
        {schiris.map((schiri, idx) => {
          const entries = Object.entries(schiri).filter(([_, value]) => value);
          if (entries.length === 0) return null;

          return (
            <div key={idx} className="border-l-2 border-gray-200 pl-3 space-y-1">
              {schiri.rolle && (
                <div className="font-medium text-sm text-gray-800">{schiri.rolle}</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {entries
                  .filter(([key]) => key !== 'rolle')
                  .map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="text-gray-600">{formatFieldName(key)}:</span>{' '}
                      <span className="text-gray-900">{value}</span>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSpielstaette = () => {
    const staette = match.spielstaette;
    if (!staette) return null;

    const entries = Object.entries(staette).filter(([_, value]) => value);
    if (entries.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-gray-700">Spielstätte</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {entries.map(([key, value]) => (
            <div key={key} className="text-sm">
              <span className="text-gray-600">{formatFieldName(key)}:</span>{' '}
              <span className="text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{getMatchTitle()}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{getMatchSubtitle()}</p>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Weniger' : 'Details'}
            </Button>
            <Button
              size="sm"
              onClick={() => onDownload(filename)}
              disabled={isDownloading}
            >
              {isDownloading ? 'Lädt...' : 'DOCX'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 pt-0">
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