import React from 'react';

// C1: every figure previously on this page was a hardcoded literal — spend
// distribution, supplier scorecard, and two "strategic" narrative cards were
// invented, not measured. They have been removed.
//
// This component has no data source. It never had one. C4 repoints it at the
// parsed event stream; until then the shell renders and says plainly that
// there is nothing to report.

const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Intelligence Reports</h1>
          <p className="text-slate-400 text-sm font-medium">Strategic ecosystem metrics.</p>
        </div>
      </div>

      <div className="bg-white p-12 rounded-2xl border border-indigo-50 shadow-sm text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">No data source connected</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          This page is not wired to a data source yet. Reporting becomes available once the
          event ingestion pipeline is connected.
        </p>
      </div>
    </div>
  );
};

export default Analytics;
