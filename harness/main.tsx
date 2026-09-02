import React from 'react';
import ReactDOM from 'react-dom/client';
import { SessionProvider } from '../contexts/SessionContext';
import Orders from '../components/Orders';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      <h2 style={{ fontFamily: 'system-ui', fontSize: 13, letterSpacing: 1,
                   textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
        Harness — Orders against the live occuralog API
      </h2>
      <SessionProvider>
        <Orders />
      </SessionProvider>
    </div>
  </React.StrictMode>
);
