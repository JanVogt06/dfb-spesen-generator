import { api } from './api';

// Types
export interface SessionFile {
  name: string;
  path: string;
  size: number;
  created_at: string;
}

export interface SessionProgress {
  current: number;
  total: number;
  step: string;
}

export interface Session {
  session_id: string;
  status: string;
  files: SessionFile[];
  download_all_url: string;
  created_at: string;
  progress?: SessionProgress;
}

// API Functions
export async function startGeneration(): Promise<Session> {
  const response = await api.post<Session>('/api/generate', {});
  return response.data;
}

export async function getUserSessions(): Promise<Session[]> {
  const response = await api.get<Session[]>('/api/sessions');
  return response.data;
}

export async function getSession(sessionId: string): Promise<Session> {
  const response = await api.get<Session>(`/api/session/${sessionId}`);
  return response.data;
}

export function getDownloadAllUrl(sessionId: string): string {
  return `/api/download/${sessionId}/all`;
}

export function getDownloadFileUrl(sessionId: string, filename: string): string {
  return `/api/download/${sessionId}/${filename}`;
}