import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Session, getSession, listSessions } from '../services/occuralog';

/**
 * The ingestion session the app is currently looking at.
 *
 * There was no session concept in this frontend because there was no
 * ingestion. One session is one uploaded WhatsApp export; its id scopes every
 * order lookup.
 *
 * The selected id is kept in localStorage so a reload does not lose it. That
 * is a convenience only — the session itself lives in occuralog, and an id
 * that no longer resolves is reported rather than silently cleared.
 */

const STORAGE_KEY = 'occuris.sessionId';

interface SessionContextValue {
  sessionId: string | null;
  session: Session | null;
  sessions: Session[];
  loading: boolean;
  error: string | null;
  selectSession: (sessionId: string | null) => void;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

function readStoredId(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredId(sessionId: string | null) {
  try {
    if (sessionId) window.localStorage.setItem(STORAGE_KEY, sessionId);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private browsing, blocked storage — the app still works, just not sticky */
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(readStoredId);
  const [session, setSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listed = await listSessions();
      setSessions(listed.sessions);

      const stored = readStoredId();
      if (stored) {
        // Confirm the stored id still resolves rather than assuming it does.
        try {
          setSession(await getSession(stored));
          setSessionId(stored);
        } catch (err) {
          setSession(null);
          setSessionId(null);
          writeStoredId(null);
          setError(
            `The previously selected session is no longer available: ` +
              `${err instanceof Error ? err.message : String(err)}`
          );
        }
      } else {
        setSession(null);
      }
    } catch (err) {
      setSessions([]);
      setSession(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectSession = useCallback((next: string | null) => {
    writeStoredId(next);
    setSessionId(next);
    setError(null);
    if (!next) {
      setSession(null);
      return;
    }
    getSession(next)
      .then(setSession)
      .catch((err) => {
        setSession(null);
        setError(err instanceof Error ? err.message : String(err));
      });
  }, []);

  const value = useMemo(
    () => ({ sessionId, session, sessions, loading, error, selectSession, refresh }),
    [sessionId, session, sessions, loading, error, selectSession, refresh]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside a SessionProvider');
  return context;
}
