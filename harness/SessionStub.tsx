// Dev harness only: a fixed session, so components render without auth.
import detail from './order3500.json';
export function useSession() {
  return {
    sessionId: (detail as any).session_id, session: null, sessions: [],
    loading: false, error: null, selectSession: () => {}, refresh: async () => {},
  };
}
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
