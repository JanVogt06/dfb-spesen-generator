import type { Session } from './sessions';

/**
 * Prüft ob eine Session gerade läuft (nicht abgeschlossen oder fehlgeschlagen)
 */
export function isSessionRunning(session: Session): boolean {
  return (
    session.status === 'pending' ||
    session.status === 'in_progress' ||
    session.status === 'scraping' ||
    session.status === 'generating'
  );
}

/**
 * Prüft ob eine Session erfolgreich abgeschlossen wurde
 */
export function isSessionCompleted(session: Session): boolean {
  return session.status === 'completed';
}

/**
 * Prüft ob eine Session fehlgeschlagen ist
 */
export function isSessionFailed(session: Session): boolean {
  return session.status === 'failed';
}

/**
 * Alle möglichen Session-Status als Union-Type
 */
export type SessionStatus =
  | 'pending'
  | 'in_progress'
  | 'scraping'
  | 'generating'
  | 'completed'
  | 'failed';