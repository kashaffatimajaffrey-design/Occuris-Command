import React, { useEffect, useMemo, useState } from 'react';
import { getDisruptions, getKnowledgeEval, getLifecycle, ingestKnowledge, queryKnowledge, runDisruptionScan, runScenarioPlan, runSpecMatch } from '../services/api';
import { useTenant } from '../contexts/TenantContext';

const DEFAULT_MPNS = 'STM32F405RGT6, MAX3232ESE+, IRFB7430-PBF, TSMC-7N-ASIC';

const CommandDeck: React.FC = () => {
  const { selectedTenant } = useTenant();
  const [mpn, setMpn] = useState('STM32F405RGT6');
  const [mpnsText, setMpnsText] = useState(DEFAULT_MPNS);
  const [spec, setSpec] = useState<any>(null);
  const [life, setLife] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [scan, setScan] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [demandGrowth, setDemandGrowth] = useState(28);
  const [bufferDays, setBufferDays] = useState(60);
  const [shippingDelay, setShippingDelay] = useState(18);
  const [geoMultiplier, setGeoMultiplier] = useState(1.35);
  const [loading, setLoading] = useState(false);
  const [knowledgeQuery, setKnowledgeQuery] = useState('which parts have Taiwan export or EOL risk');
  const [knowledgeResult, setKnowledgeResult] = useState<any>(null);
  const [evalResult, setEvalResult] = useState<any>(null);

  const mpns = useMemo(() => mpnsText.split(',').map((item) => item.trim()).filter(Boolean), [mpnsText]);

  const runDeck = async () => {
    setLoading(true);
    try {
      const [specMatch, lifecycle, disruptionScan, scenario] = await Promise.all([
        runSpecMatch(mpn),
        getLifecycle(mpn),
        runDisruptionScan(mpns),
        runScenarioPlan({
          mpns,
          demand_growth_percent: demandGrowth,
          buffer_days: bufferDays,
          shipping_delay_days: shippingDelay,
          geo_risk_multiplier: geoMultiplier,
        }),
      ]);
      setSpec(specMatch);
      setLife(lifecycle);
      setScan(disruptionScan);
      setPlan(scenario);
    } finally {
      setLoading(false);
    }
  };

  const seedKnowledge = async () => {
    const samples = [
      'PCN notice: IRFB7430-PBF is entering EOL watch. Last time buy planning required before Q4. Supplier recommends alternate MOSFET validation.',
      'Logistics update: Taiwan Strait lane compression may delay TSMC-7N-ASIC wafer allocation shipments by 18 days.',
      'Procurement WhatsApp export: MAX3232ESE+ shipment late at Penang port, customs queue pending, production buffer below target.',
      'Compliance note: STM32F405RGT6 export review required for EAR destination screening and customer shipment approval.',
    ];
    await Promise.all(samples.map((raw_text, index) => ingestKnowledge({
      tenant_id: selectedTenant.id,
      source_type: index === 2 ? 'whatsapp_export' : 'supplier_notice',
      title: `Pilot intelligence source ${index + 1}`,
      raw_text,
    })));
    await runKnowledge();
  };

  const runKnowledge = async () => {
    const [query, metrics] = await Promise.all([
      queryKnowledge({ tenant_id: selectedTenant.id, query: knowledgeQuery, limit: 5 }),
      getKnowledgeEval(selectedTenant.id),
    ]);
    setKnowledgeResult(query);
    setEvalResult(metrics);
  };

  useEffect(() => {
    getDisruptions().then((data) => setSignals(data.signals)).catch(() => setSignals([]));
    runDeck();
    runKnowledge().catch(() => undefined);
  }, []);

  return (
    <div className="-m-4 md:-m-6 lg:-m-8 min-h-full p-4 md:p-6 lg:p-8 text-white">
      <div className="relative z-10 space-y-6">
        <section className="galaxy-panel p-6 md:p-8 overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-6 justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-300/40 bg-purple-400/10 text-purple-200 font-mono text-[10px] font-black uppercase tracking-widest">
                Live Command Layer / SpecMatch / Risk Radar
              </div>
              <h1 className="mt-4 text-3xl md:text-5xl font-black leading-tight tracking-tight">
                Occuris Command turns BOM chaos into sourcing decisions.
              </h1>
              <p className="mt-4 text-sm md:text-base text-slate-200 max-w-2xl leading-relaxed">
                Run alternate qualification, EOL/lifecycle watch, geopolitical disruption mapping, weather/shipping delay pressure, and demand scenario planning from one galaxy-grade control deck.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[280px]">
              <Signal label="Active Signals" value={signals.length} tone="purple" />
              <Signal label="Watched Parts" value={mpns.length} tone="cyan" />
              <Signal label="Geo Multiplier" value={`${geoMultiplier}x`} tone="amber" />
              <Signal label="Buffer Days" value={bufferDays} tone="green" />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-4 galaxy-panel p-5">
            <h2 className="font-black text-lg">Control Inputs</h2>
            <p className="text-xs text-slate-400 mt-1">These values drive live product modules, not static cards.</p>
            <div className="mt-5 space-y-4">
              <Field label="SpecMatch MPN" value={mpn} onChange={setMpn} />
              <Field label="Scenario MPNs" value={mpnsText} onChange={setMpnsText} />
              <Slider label="Demand Growth" value={demandGrowth} min={0} max={80} suffix="%" onChange={setDemandGrowth} />
              <Slider label="Buffer Window" value={bufferDays} min={0} max={180} suffix="d" onChange={setBufferDays} />
              <Slider label="Shipping Delay" value={shippingDelay} min={0} max={60} suffix="d" onChange={setShippingDelay} />
              <Slider label="Geo Risk Multiplier" value={geoMultiplier} min={1} max={2.5} step={0.05} suffix="x" onChange={setGeoMultiplier} />
              <button
                onClick={runDeck}
                disabled={loading}
                className="w-full rounded-xl bg-purple-300 text-slate-950 py-3 text-xs font-black uppercase tracking-widest hover:bg-white transition disabled:opacity-50"
              >
                {loading ? 'Scanning Command Layer...' : 'Run Decision Scan'}
              </button>
            </div>
          </div>

          <div className="xl:col-span-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Module title="SpecMatch Sourcing Engine" eyebrow="Pinout / package / lead-time">
              <div className="text-sm font-black text-purple-100">{spec?.target?.mpn}</div>
              <div className="text-xs text-slate-400 mt-1">{spec?.target?.category} / {spec?.target?.package}</div>
              <div className="mt-4 space-y-3">
                {spec?.alternates?.map((alt: any) => (
                  <div key={alt.mpn} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="font-mono text-sm font-black text-white">{alt.mpn}</div>
                        <div className="text-[10px] text-slate-400">{alt.supplier} / {alt.package}</div>
                      </div>
                      <Badge value={`${alt.confidence}%`} tone={alt.confidence >= 70 ? 'green' : 'amber'} />
                    </div>
                    <div className="mt-2 text-[11px] text-slate-300">{alt.decision.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            </Module>

            <Module title="Lifecycle Watch" eyebrow="EOL / PCN / PDN / NRND">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-3xl font-black text-white">{life?.eol_risk_score || 0}</div>
                  <div className="text-xs text-slate-400 uppercase font-black">EOL Risk Score</div>
                </div>
                <Badge value={life?.lifecycle_state || 'loading'} tone={(life?.eol_risk_score || 0) > 70 ? 'rose' : 'green'} />
              </div>
              <p className="mt-4 text-sm text-slate-300 leading-relaxed">{life?.recommended_action}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {life?.watch_items?.map((item: string) => <Badge key={item} value={item} tone="purple" />)}
              </div>
            </Module>

            <Module title="Risk Radar" eyebrow="Geopolitical / weather / shipping">
              <div className="space-y-3">
                {signals.map((signal) => (
                  <div key={signal.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex justify-between gap-3">
                      <div className="font-bold text-white">{signal.title}</div>
                      <Badge value={`${signal.risk_score}/100`} tone={signal.severity === 'critical' ? 'rose' : 'amber'} />
                    </div>
                    <p className="mt-2 text-xs text-slate-300 leading-relaxed">{signal.signal}</p>
                  </div>
                ))}
              </div>
            </Module>

            <Module title="Scenario Planner" eyebrow="Demand / buffer / disruption forecasting">
              <div className="space-y-3">
                {plan?.plan?.map((row: any) => (
                  <div key={row.mpn} className="grid grid-cols-4 gap-3 items-center rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="col-span-2">
                      <div className="font-mono text-sm font-black">{row.mpn}</div>
                      <div className="text-[10px] text-slate-400">LT {row.lead_time_days}d / Stock {row.current_stock}</div>
                    </div>
                    <Badge value={`${row.projected_risk}`} tone={row.projected_risk >= 75 ? 'rose' : row.projected_risk >= 55 ? 'amber' : 'green'} />
                    <div className="text-[10px] font-black uppercase text-purple-200">{row.decision.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            </Module>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            ['@Procurement', 'PO history, vendor scoring, price bands, allocation decisions'],
            ['@Inventory', 'Safety stock, ABC/XYZ, buffer windows, sell/hold logic'],
            ['@Risk', 'Taiwan lanes, weather, shipping, sanctions, supplier exposure'],
            ['@Compliance', 'ITAR/EAR, RoHS, REACH, conflict minerals, audit trail'],
          ].map(([name, desc]) => (
            <div key={name} className="galaxy-panel p-4">
              <div className="font-mono text-purple-200 font-black">{name}</div>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">{desc}</p>
              <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-3/4 bg-purple-300 rounded-full shadow-[0_0_18px_rgba(216,180,254,0.8)]" />
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-4 galaxy-panel p-5">
            <div className="text-[10px] font-mono font-black uppercase tracking-widest text-purple-300">Occuralog / RAG Visibility</div>
            <h2 className="text-lg font-black mt-1">Ingestion & Retrieval Layer</h2>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              This is where customer data enters the system: WhatsApp exports, supplier notices, logistics notes, PCNs, PDNs, ERP exports, and BOM documents.
            </p>
            <Field label="Ask the operational event log" value={knowledgeQuery} onChange={setKnowledgeQuery} />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={seedKnowledge} className="rounded-xl bg-purple-300 text-slate-950 py-3 text-xs font-black uppercase">Seed Sources</button>
              <button onClick={runKnowledge} className="rounded-xl border border-purple-300/40 bg-purple-400/10 text-purple-100 py-3 text-xs font-black uppercase">Query Store</button>
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-3xl font-black">{evalResult?.average_f1 ?? '0.000'}</div>
              <div className="text-[10px] font-mono font-black uppercase text-slate-400">Retrieval F1 v0</div>
            </div>
          </div>

          <div className="xl:col-span-8 galaxy-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono font-black uppercase tracking-widest text-purple-300">Retrieved Evidence</div>
                <h2 className="text-lg font-black mt-1">Where Answers Come From</h2>
              </div>
              <Badge value={knowledgeResult?.answer_basis || 'no query'} tone="purple" />
            </div>
            <div className="mt-4 space-y-3">
              {knowledgeResult?.retrieved_chunks?.length ? knowledgeResult.retrieved_chunks.map((chunk: any) => (
                <div key={chunk.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex justify-between gap-3">
                    <Badge value={`score ${chunk.score}`} tone={chunk.score > 0.5 ? 'green' : 'amber'} />
                    <div className="text-[10px] font-mono text-slate-400">terms: {chunk.matched_terms.join(', ')}</div>
                  </div>
                  <p className="mt-3 text-sm text-slate-200 leading-relaxed">{chunk.text}</p>
                </div>
              )) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-300">
                  No retrieved chunks yet. Click Seed Sources, then Query Store.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const Module: React.FC<{ title: string; eyebrow: string; children: React.ReactNode }> = ({ title, eyebrow, children }) => (
  <section className="galaxy-panel p-5 min-h-[320px]">
    <div className="mb-4">
      <div className="text-[10px] font-mono font-black uppercase tracking-widest text-purple-300">{eyebrow}</div>
      <h2 className="text-lg font-black text-white mt-1">{title}</h2>
    </div>
    {children}
  </section>
);

const Field: React.FC<{ label: string; value: string; onChange: (value: string) => void }> = ({ label, value, onChange }) => (
  <label className="block">
    <span className="block text-[10px] font-mono font-black uppercase tracking-widest text-slate-400 mb-2">{label}</span>
    <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-purple-300" />
  </label>
);

const Slider: React.FC<{ label: string; value: number; min: number; max: number; step?: number; suffix: string; onChange: (value: number) => void }> = ({ label, value, min, max, step = 1, suffix, onChange }) => (
  <label className="block">
    <span className="flex justify-between text-[10px] font-mono font-black uppercase tracking-widest text-slate-400 mb-2">
      <span>{label}</span><span className="text-purple-200">{value}{suffix}</span>
    </span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-purple-300" />
  </label>
);

const Signal: React.FC<{ label: string; value: string | number; tone: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
    <div className="text-2xl font-black text-white">{value}</div>
    <div className="text-[9px] font-mono font-black uppercase tracking-widest text-slate-400">{label}</div>
  </div>
);

const Badge: React.FC<{ value: string; tone: 'rose' | 'amber' | 'green' | 'purple' }> = ({ value, tone }) => {
  const colors = {
    rose: 'border-rose-300/40 bg-rose-400/15 text-rose-200',
    amber: 'border-amber-300/40 bg-amber-400/15 text-amber-200',
    green: 'border-emerald-300/40 bg-emerald-400/15 text-emerald-200',
    purple: 'border-purple-300/40 bg-purple-400/15 text-purple-200',
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${colors[tone]}`}>{value}</span>;
};

export default CommandDeck;
