import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const CompleteOnboarding: React.FC = () => {
  const { session, refreshTenant } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!session) throw new Error('No active session');

      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${backendUrl}/api/onboarding/create-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ company_name: companyName || 'New Company' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Could not reach the server. Is the backend running?');
      }

      // Tenant created — refresh so ProtectedShell picks it up and
      // renders the real app instead of this screen.
      await refreshTenant();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl p-8 border border-slate-800">
        <h1 className="text-xl font-bold mb-1">Almost there</h1>
        <p className="text-slate-400 text-sm mb-6">
          Your account is signed in, but no company workspace is linked yet.
          Let's finish setting that up.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Company name"
            className="w-full bg-slate-800 rounded-lg px-4 py-2 text-sm outline-none"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />

          {error && <p className="text-rose-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Create workspace'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteOnboarding;
