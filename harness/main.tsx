import React from 'react';
import ReactDOM from 'react-dom/client';
import InventoryTable from '../components/InventoryTable';
import Dashboard from '../components/Dashboard';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      <h2 style={{ fontFamily: 'system-ui', fontSize: 13, letterSpacing: 1,
                   textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
        Harness — InventoryTable against the live backend
      </h2>
      <InventoryTable />
      <hr style={{ margin: '40px 0', border: 0, borderTop: '1px solid #e2e8f0' }} />
      <h2 style={{ fontFamily: 'system-ui', fontSize: 13, letterSpacing: 1,
                   textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
        Harness — Dashboard against the live backend
      </h2>
      <Dashboard />
    </div>
  </React.StrictMode>
);
