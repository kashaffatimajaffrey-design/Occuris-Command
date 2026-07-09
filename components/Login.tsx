import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        if (data.session) {
            const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
          const res = await fetch(`${backendUrl}/api/onboarding/create-tenant`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ company_name: companyName || 'New Company' }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.detail || 'Failed to set up your company workspace');
          }
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl p-8 border border-slate-800">
        <h1 className="text-xl font-bold mb-1">Occuris Command</h1>
        <p className="text-slate-400 text-sm mb-6">
          {isSignUp ? 'Create your company workspace' : 'Sign in to your workspace'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Company name"
              className="w-full bg-slate-800 rounded-lg px-4 py-2 text-sm outline-none"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full bg-slate-800 rounded-lg px-4 py-2 text-sm outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full bg-slate-800 rounded-lg px-4 py-2 text-sm outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {error && <p className="text-rose-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create workspace' : 'Sign in'}
          </button>
        </form>

        <button
          className="text-slate-400 text-xs mt-4 underline"
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
};

export default Login;