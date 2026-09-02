import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SessionProvider } from './contexts/SessionContext';
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
          <Routes>
            <Route path="/" element={<CommandDeck />} />
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
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SessionProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedShell />} />
        </Routes>
      </Router>
      </SessionProvider>
    </AuthProvider>
  );
};

export default App;