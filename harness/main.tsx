import React from 'react';
import ReactDOM from 'react-dom/client';
import AgentChat from '../components/AgentChat';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div style={{ padding: 24, background: '#f8fafc', height: '100vh' }}>
      <h2 style={{ fontFamily: 'system-ui', fontSize: 13, letterSpacing: 1,
                   textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
        Harness — AgentChat citation contract (real order 3500 data)
      </h2>
      <div style={{ height: 'calc(100vh - 90px)' }}><AgentChat /></div>
    </div>
  </React.StrictMode>
);
