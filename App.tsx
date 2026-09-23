import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SessionProvider } from './contexts/SessionContext';
import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AgentChat from './components/AgentChat';
import BomIntake from './components/BomIntake';
import CommandDeck from './components/CommandDeck';
import Analytics from './components/Analytics';
import Orders from './components/Orders';
import Login from './components/Login';
import CompleteOnboarding from './components/CompleteOnboarding';

/**
 * The /login route.
 *
 * Without this, a successful sign-in left the user sitting on the login page:
 * the session was set, but the URL was still /login, so that route kept
 * matching and kept rendering the form. The button went back to "Sign in" and
 * nothing moved, which looks exactly like a failed login even though it
 * worked. An authenticated visitor is sent to the app instead.
 */
const LoginRoute: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white text-sm">
        Loading...
      </div>
    );
  }

  return session ? <Navigate to="/" replace /> : <Login />;
};

const ProtectedShell: React.FC = () => {
  const { session, loading, tenantName, needsOnboarding, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white text-sm">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (needsOnboarding) {
    // Instead of a dead-end message, let the user actually finish
    // creating their tenant right here.
    return <CompleteOnboarding />;
  }

  return (
    <div className="occuris-app-shell flex h-screen overflow-hidden text-white">
      <div className="occuris-live-bg" />
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header tenantName={tenantName} onSignOut={signOut} />

        <main className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <ErrorBoundary label="This page">
          <Routes>
            {/* Orders is the product: parsed events, timelines, citations.
                CommandDeck is the older BOM/SpecMatch surface and is out of
                scope, so it no longer greets anyone arriving at the root. */}
            <Route path="/" element={<Orders />} />
            <Route path="/overview" element={<Dashboard />} />
            <Route path="/command" element={<CommandDeck />} />
            <Route path="/bom-intake" element={<BomIntake />} />
            <Route path="/agents" element={<AgentChat />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/analytics" element={<Analytics />} />
            {/* Removed routes (/vector-labs, /monitoring) and any other unknown
                path land on the Command Deck rather than an empty shell. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary label="The application">
    <AuthProvider>
      <SessionProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/*" element={<ProtectedShell />} />
        </Routes>
      </Router>
      </SessionProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;