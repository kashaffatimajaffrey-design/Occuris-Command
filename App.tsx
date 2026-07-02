import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { TenantProvider } from './contexts/TenantContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AgentChat from './components/AgentChat';
import BomIntake from './components/BomIntake';
import CommandDeck from './components/CommandDeck';
import InventoryTable from './components/InventoryTable';
import Analytics from './components/Analytics';
import VectorLabs from './components/VectorLabs';
import Monitoring from './components/Monitoring';
import { TENANTS } from './constants';
import { Tenant } from './types';

const App: React.FC = () => {
  const [selectedTenant, setSelectedTenant] = useState<Tenant>(TENANTS[0]);

  return (
    <TenantProvider>
      <Router>
        <div className="occuris-app-shell flex h-screen overflow-hidden text-white">
          <div className="occuris-live-bg" />
          <Sidebar />
          
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <Header 
              selectedTenant={selectedTenant} 
              onTenantChange={setSelectedTenant} 
            />
            
            <main className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <Routes>
                <Route path="/" element={<CommandDeck />} />
                <Route path="/overview" element={<Dashboard />} />
                <Route path="/command" element={<CommandDeck />} />
                <Route path="/bom-intake" element={<BomIntake />} />
                <Route path="/agents" element={<AgentChat />} />
                <Route path="/inventory" element={<InventoryTable />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/vector-labs" element={<VectorLabs />} />
                <Route path="/monitoring" element={<Monitoring />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </TenantProvider>
  );
};

export default App;
