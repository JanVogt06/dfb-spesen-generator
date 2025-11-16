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

export interface MatchData {
  spiel_info: SpielInfo;
  schiedsrichter: Schiedsrichter[];
  spielstaette: Spielstaette;
}