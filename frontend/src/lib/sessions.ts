import {api} from './api';
import type {MatchData} from './matches';
import type {SessionStatus} from './sessionUtils';

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
    status: SessionStatus;
    files: SessionFile[];
    download_all_url: string;
    created_at: string;
    progress?: SessionProgress;
}

// Re-export MatchData for convenience
export type {MatchData} from './matches';

// Re-export session utils
export {isSessionRunning, isSessionCompleted, isSessionFailed} from './sessionUtils';

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

export async function getSessionMatches(sessionId: string): Promise<MatchData[]> {
    const response = await api.get<MatchData[]>(`/api/session/${sessionId}/matches`);
    return response.data;
}

export function getDownloadAllUrl(sessionId: string): string {
    return `/api/download/${sessionId}/all`;
}

export function getDownloadFileUrl(sessionId: string, filename: string): string {
    return `/api/download/${sessionId}/${filename}`;
}