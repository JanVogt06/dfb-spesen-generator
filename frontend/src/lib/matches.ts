import {api} from './api';

// Match Data Types - basierend auf tatsächlicher DFBnet-Struktur
export interface SpielInfo {
    anpfiff?: string;
    heim_team?: string;
    gast_team?: string;
    mannschaftsart?: string;
    spielklasse?: string;
    staffel?: string;
    spieltag?: string;

    [key: string]: any;
}

export interface Schiedsrichter {
    rolle?: string;
    name?: string;
    telefon?: string;
    email?: string;
    strasse?: string;
    plz_ort?: string;

    [key: string]: any;
}

export interface Spielstaette {
    name?: string;
    adresse?: string;
    platz_typ?: string;

    [key: string]: any;
}

export interface MatchExpenses {
    sr_km?: number | null;
    sr_oevm?: number | null;
    sra1_km?: number | null;
    sra1_oevm?: number | null;
    sra2_km?: number | null;
    sra2_oevm?: number | null;
}

export interface MatchData {
    spiel_info: SpielInfo;
    schiedsrichter: Schiedsrichter[];
    spielstaette: Spielstaette;
    // Metadata von Backend
    _session_id?: string;
    _datum?: string;
    _created_at?: string;
    _filename?: string;  // NEU: Echter Dateiname für Downloads
    _pdf_available?: boolean;
    _expenses?: MatchExpenses | null;
}

export interface SaveExpensesResult {
    success: boolean;
    filename: string;
    pdf_available: boolean;
}

/** Speichert Fahrtkosten/ÖVM für ein Spiel und stößt die Neu-Generierung an */
export async function saveMatchExpenses(
    sessionId: string,
    heimTeam: string,
    gastTeam: string,
    datum: string,
    expenses: MatchExpenses
): Promise<SaveExpensesResult> {
    const response = await api.post<SaveExpensesResult>('/api/matches/expenses', {
        session_id: sessionId,
        heim_team: heimTeam,
        gast_team: gastTeam,
        datum,
        ...expenses,
    });
    return response.data;
}

// API Funktionen
export async function getAllMatches(): Promise<MatchData[]> {
    const response = await api.get<MatchData[]>('/api/matches');
    return response.data;
}