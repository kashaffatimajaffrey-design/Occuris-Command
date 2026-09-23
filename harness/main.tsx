import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import '../index.css';

// Diagnostic harness: the real App, with only the Supabase client stubbed so a
// signed-in shell renders. Any crash here is a crash in the real app.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
