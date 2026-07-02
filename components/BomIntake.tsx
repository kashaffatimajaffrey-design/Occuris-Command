import React, { useEffect, useMemo, useState } from 'react';
import { BomDetail, BomSummary, createBom, getBoms } from '../services/api';
import { useTenant } from '../contexts/TenantContext';

const SAMPLE_BOM = `STM32F405RGT6, 50, STMicroelectronics
MAX3232ESE+, 150, Analog Devices
TPS51200DRCR, 100, Texas Instruments
IRFB7430-PBF, 40, Infineon
TSMC-7N-ASIC, 12, TSMC Taiwan`;

const riskClass = {
  critical: 'bg-rose-100 text-rose-700 border-rose-200',
  watch: 'bg-amber-100 text-amber-700 border-amber-200',
  stable: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const BomIntake: React.FC = () => {
  const { selectedTenant } = useTenant();
  const [bomName, setBomName] = useState('Pilot Assembly BOM');
  const [rawText, setRawText] = useState(SAMPLE_BOM);
  const [boms, setBoms] = useState<BomSummary[]>([]);
  const [activeBom, setActiveBom] = useState<BomDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadBoms = async () => {
    const data = await getBoms(selectedTenant.id);
    setBoms(data);
  };

  useEffect(() => {
    loadBoms().catch((err) => setError(err.message));
  }, [selectedTenant.id]);

  const criticalCount = useMemo(() => {
    return activeBom?.items.filter((item) => item.risk_level === 'critical').length || 0;
  }, [activeBom]);

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const created = await createBom({
        tenant_id: selectedTenant.id,
        name: bomName,
        raw_text: rawText,
        actor: 'founder-pilot',
      });
      setActiveBom(created);
      await loadBoms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create BOM');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Occuris Command / Pilot Spine</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-1">BOM Intake & Risk Audit</h1>
          <p className="text-slate-400 text-sm font-medium max-w-2xl mt-2">
            Paste a bill of materials, persist it through the backend, and generate the first actionable sourcing risk layer.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 min-w-[320px]">
          <Metric label="Saved BOMs" value={boms.length.toString()} />
          <Metric label="Critical" value={criticalCount.toString()} tone="rose" />
          <Metric label="Tenant" value={selectedTenant.region} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white rounded-2xl border border-indigo-50 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-black text-slate-800">Configure Assembly</h2>
              <p className="text-xs text-slate-400 font-medium">Format: Part Number, Quantity, Supplier</p>
            </div>
            <button
              onClick={() => setRawText(SAMPLE_BOM)}
              className="px-3 py-2 rounded-xl border border-indigo-100 text-[10px] font-black text-indigo-500 uppercase hover:bg-indigo-50"
            >
              Load Sample
            </button>
          </div>

          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">BOM Name</label>
          <input
            value={bomName}
            onChange={(event) => setBomName(event.target.value)}
            className="w-full bg-slate-50 border border-indigo-50 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 mb-4"
          />

          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Component Rows</label>
          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            className="w-full h-72 resize-none bg-slate-950 text-indigo-50 border border-indigo-900 rounded-2xl px-4 py-4 text-xs font-mono leading-6 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />

          {error && (
            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || !rawText.trim() || !bomName.trim()}
            className="mt-5 w-full bg-indigo-500 text-white rounded-xl py-3.5 text-xs font-black uppercase tracking-widest hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 shadow-lg shadow-indigo-100 transition-all"
          >
            {loading ? 'Resolving BOM...' : 'Parse & Resolve Bill of Materials'}
          </button>
        </section>

        <section className="lg:col-span-7 bg-white rounded-2xl border border-indigo-50 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-indigo-50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-800">Risk Resolution Output</h2>
              <p className="text-xs text-slate-400 font-medium">
                {activeBom ? `${activeBom.items.length} components scored from ${activeBom.name}` : 'Create a BOM to see persisted risk records.'}
              </p>
            </div>
            {activeBom && (
              <span className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-500 uppercase">
                Saved
              </span>
            )}
          </div>

          {activeBom ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-indigo-50/30 border-b border-indigo-50">
                  <tr>
                    <th className="px-5 py-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest">MPN</th>
                    <th className="px-5 py-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Supplier</th>
                    <th className="px-5 py-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Qty</th>
                    <th className="px-5 py-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Risk</th>
                    <th className="px-5 py-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-50/70">
                  {activeBom.items.map((item) => (
                    <tr key={item.id} className="hover:bg-indigo-50/20">
                      <td className="px-5 py-4 text-sm font-mono font-black text-indigo-500">{item.mpn}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-700">{item.supplier}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-500">{item.quantity}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase ${riskClass[item.risk_level]}`}>
                          {item.risk_score} / {item.risk_level}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-500 max-w-xs">{item.recommended_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-400 mx-auto flex items-center justify-center text-2xl font-black mb-4">OC</div>
              <h3 className="font-black text-slate-800">Waiting for first real BOM</h3>
              <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                This is the first product spine: intake, persistence, scoring, and a saved audit event.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-indigo-50 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-indigo-50">
          <h2 className="text-lg font-black text-slate-800">Saved Pilot BOMs</h2>
          <p className="text-xs text-slate-400 font-medium">Loaded from the backend store for {selectedTenant.name}.</p>
        </div>
        <div className="divide-y divide-indigo-50">
          {boms.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-400 font-medium">No BOMs saved for this tenant yet.</div>
          ) : (
            boms.map((bom) => (
              <div key={bom.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-800">{bom.name}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    {bom.item_count} items / created {new Date(bom.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Max Risk</span>
                  <span className="w-12 py-1 text-center rounded-lg bg-indigo-50 text-indigo-500 text-xs font-black">{bom.max_risk_score}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; tone?: 'indigo' | 'rose' }> = ({ label, value, tone = 'indigo' }) => (
  <div className={`rounded-2xl border p-3 ${tone === 'rose' ? 'bg-rose-50 border-rose-100' : 'bg-white border-indigo-50'}`}>
    <div className={`text-lg font-black ${tone === 'rose' ? 'text-rose-500' : 'text-indigo-500'}`}>{value}</div>
    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
  </div>
);

export default BomIntake;
