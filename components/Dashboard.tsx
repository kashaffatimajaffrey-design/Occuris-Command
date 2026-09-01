import React, { useEffect, useState } from 'react';

// NOTE: C4 rebuilds this page around parsed events (open delays, orders at risk,
// recent timeline activity). Until the occuralog client layer exists, the only
// real data source here is /api/risk/report/demo. Nothing on this page is
// allowed to render a figure that was not measured.

interface ComponentAtRisk {
  name: string;
  score: number;
  type: string;
}

interface RiskReport {
  overall_risk_score?: number;
  components_at_risk?: ComponentAtRisk[];
  geopolitical_alerts?: string[];
  recommended_actions?: string[];
}

const Dashboard: React.FC = () => {
  const [riskReport, setRiskReport] = useState<RiskReport | null>(null);
  const [riskLoading, setRiskLoading] = useState(true);
  const [riskError, setRiskError] = useState<string | null>(null);

  const fetchRiskData = async () => {
    setRiskLoading(true);
    setRiskError(null);
    try {
      const response = await fetch('http://localhost:8000/api/risk/report/demo');
      if (!response.ok) {
        throw new Error(`Risk API returned ${response.status} ${response.statusText}`);
      }
      setRiskReport(await response.json());
    } catch (error) {
      // No fallback data. A failed fetch is shown as a failure.
      setRiskReport(null);
      setRiskError(error instanceof Error ? error.message : String(error));
    } finally {
      setRiskLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  const components = riskReport?.components_at_risk ?? [];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Supply Chain Overview</h1>
          <p className="text-slate-400 text-sm font-medium">Component risk, as reported by the risk API.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-indigo-50 shadow-sm max-w-2xl">
        <h3 className="text-lg font-black text-slate-800 mb-6">Components at Risk</h3>

        {riskLoading && (
          <p className="text-sm text-slate-400 py-8 text-center">Loading risk report…</p>
        )}

        {riskError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <div className="text-sm font-black text-rose-700 mb-1">Could not load risk report</div>
            <div className="text-xs font-mono text-rose-600 break-words">{riskError}</div>
            <button
              onClick={fetchRiskData}
              className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!riskLoading && !riskError && components.length === 0 && (
          <p className="text-sm text-slate-400 py-8 text-center">
            The risk API returned no components at risk.
          </p>
        )}

        {!riskLoading && !riskError && components.length > 0 && (
          <div className="space-y-5">
            {components.map((item, index) => (
              <div key={`${item.name}-${index}`}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-bold text-slate-600">{item.name}</span>
                  <span className={`text-[10px] font-black ${item.score > 70 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {item.score}%
                  </span>
                </div>
                <div className="w-full bg-slate-50 rounded-full h-2.5 overflow-hidden border border-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      item.score > 75 ? 'bg-rose-300' : item.score > 50 ? 'bg-orange-300' : 'bg-emerald-300'
                    }`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500 mt-1">{item.type} risk</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
