import React, { useEffect, useState } from 'react';

// C1: this page previously showed four KPI cards, a stock/demand forecast, a
// node-health grid and a ranked list of components at risk. All of it was
// invented — literals in this file, or literals in the risk endpoint.
//
// What remains is what can actually be observed. There is no risk model, so
// no score is shown. C3 fills this page with real order data from the parsed
// event stream. Until then it is mostly empty, and that is correct.

interface Headline {
  title: string;
  source: string | null;
  published_at: string | null;
  url: string | null;
}

interface NewsBlock {
  available: boolean;
  reason?: string;
  headlines: Headline[];
}

interface RiskReport {
  risk_scoring_available: boolean;
  risk_scoring_note?: string;
  news: NewsBlock;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const Dashboard: React.FC = () => {
  const [report, setReport] = useState<RiskReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/risk/report/demo`);
      if (!response.ok) {
        let detail = '';
        try {
          detail = (await response.json())?.detail ?? '';
        } catch {
          detail = await response.text();
        }
        throw new Error(`${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`);
      }
      setReport(await response.json());
    } catch (err) {
      // No fallback data. A failed fetch is shown as a failure.
      setReport(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Overview</h1>
        <p className="text-slate-400 text-sm font-medium">
          Only measured signals appear here.
        </p>
      </div>

      {loading && (
        <div className="bg-white p-8 rounded-3xl border border-indigo-50 shadow-sm">
          <p className="text-sm text-slate-400 text-center">Loading…</p>
        </div>
      )}

      {error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 max-w-2xl">
          <div className="text-sm font-black text-rose-700 mb-1">Could not reach the backend</div>
          <div className="text-xs font-mono text-rose-600 break-words">{error}</div>
          <button
            onClick={fetchReport}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && report && (
        <div className="space-y-6 max-w-2xl">
          {!report.risk_scoring_available && (
            <div className="bg-white p-6 rounded-3xl border border-indigo-50 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">
                Risk scoring
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {report.risk_scoring_note ??
                  'No risk model exists yet, so no score is shown.'}
              </p>
            </div>
          )}

          <div className="bg-white p-6 rounded-3xl border border-indigo-50 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">
              Supply chain news
            </h3>

            {!report.news?.available ? (
              <p className="text-sm text-slate-500">
                {report.news?.reason ?? 'News is unavailable.'}
              </p>
            ) : report.news.headlines.length === 0 ? (
              <p className="text-sm text-slate-500">No headlines returned.</p>
            ) : (
              <ul className="space-y-3">
                {report.news.headlines.map((h, i) => (
                  <li key={i} className="text-sm">
                    {h.url ? (
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-semibold text-indigo-600 hover:underline"
                      >
                        {h.title}
                      </a>
                    ) : (
                      <span className="font-semibold text-slate-700">{h.title}</span>
                    )}
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {[h.source, h.published_at].filter(Boolean).join(' · ')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
