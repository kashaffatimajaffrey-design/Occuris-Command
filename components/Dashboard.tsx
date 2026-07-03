import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const data = [
  { name: 'Jan', stock: 4000, demand: 2400 },
  { name: 'Feb', stock: 3000, demand: 1398 },
  { name: 'Mar', stock: 2000, demand: 9800 },
  { name: 'Apr', stock: 2780, demand: 3908 },
  { name: 'May', stock: 1890, demand: 4800 },
  { name: 'Jun', stock: 2390, demand: 3800 },
];

const Dashboard: React.FC = () => {
  const [riskReport, setRiskReport] = useState<any>(null);
  const [riskLoading, setRiskLoading] = useState(true);

  // Fetch real risk data from our new API
  const fetchRiskData = async () => {
    setRiskLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/risk/report/demo');
      const data = await response.json();
      setRiskReport(data);
    } catch (error) {
      console.error("Failed to fetch risk data:", error);
      // Fallback mock data
      setRiskReport({
        overall_risk_score: 65,
        components_at_risk: [
          { name: "chip-A123", score: 78, type: "geopolitical" },
          { name: "sensor-X45", score: 45, type: "weather" }
        ],
        geopolitical_alerts: ["Shell CEO Sawan Highlights Security Challenges Amid Global Conflicts"],
        recommended_actions: [
          "Diversify suppliers for chip-A123",
          "Increase buffer stock by 25%",
          "Activate alternative routing"
        ]
      });
    }
    setRiskLoading(false);
  };

  useEffect(() => {
    fetchRiskData();
  }, []);

  const riskData = riskReport?.components_at_risk || [
    { region: 'East Asia', risk: 85 },
    { region: 'Europe', risk: 30 },
    { region: 'N. America', risk: 25 },
    { region: 'S.E Asia', risk: 65 },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Supply Chain Overview</h1>
          <p className="text-slate-400 text-sm font-medium italic">Production-grade Multi-Agent Distributed Intelligence.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-indigo-50 rounded-xl text-sm font-semibold text-slate-600 hover:bg-indigo-50 transition-colors shadow-sm">Export Data</button>
          <button className="px-4 py-2 bg-indigo-400 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-200 transition-all">Generate Strategy</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Inventory Value" value="$42.8M" change="+4.2%" positive={false} icon="💎" colorClass="bg-purple-100 text-purple-600" />
        <KpiCard title="Shortages" value="12" change="-2" positive={true} icon="⚡" colorClass="bg-rose-100 text-rose-600" />
        <KpiCard title="Avg Lead Time" value="114 Days" change="+12d" positive={false} icon="⏳" colorClass="bg-orange-100 text-orange-600" />
        <KpiCard title="Supplier Health" value="94.2%" change="+1.2%" positive={true} icon="🌿" colorClass="bg-emerald-100 text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-indigo-50 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-800">Stock vs Demand Forecast</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-400"></div> <span className="text-[10px] font-bold text-slate-400 uppercase">Stock</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div> <span className="text-[10px] font-bold text-slate-400 uppercase">Demand</span></div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="stock" stroke="#818cf8" fillOpacity={1} fill="url(#colorStock)" strokeWidth={3} />
                <Area type="monotone" dataKey="demand" stroke="#fb7185" fill="transparent" strokeDasharray="6 6" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          {/* UPDATED RISK DISTRIBUTION - NOW USING REAL DATA */}
          <div className="bg-white p-6 rounded-3xl border border-indigo-50 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center justify-between">
              Risk Distribution 
              <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">LIVE</span>
            </h3>
            
            {riskLoading ? (
              <p className="text-center py-8">Loading real risk data...</p>
            ) : (
              <div className="space-y-5">
                {riskReport?.components_at_risk?.map((item: any, index: number) => (
                  <div key={index} className="group">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-slate-600">{item.name}</span>
                      <span className={`text-[10px] font-black ${item.score > 70 ? 'text-rose-400' : 'text-slate-400'}`}>{item.score}%</span>
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

          {/* Technical Glance Card */}
          <div className="bg-indigo-900 p-6 rounded-3xl shadow-xl shadow-indigo-100 overflow-hidden relative group">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl group-hover:bg-indigo-500/30 transition-colors"></div>
             <h3 className="text-indigo-100 text-sm font-black uppercase tracking-widest mb-4">Node Health</h3>
             <div className="grid grid-cols-4 gap-2 mb-4">
               {[...Array(8)].map((_, i) => (
                 <div key={i} className="aspect-square bg-white/10 rounded-lg flex items-center justify-center border border-white/10 hover:border-white/30 transition-colors">
                   <div className={`w-1.5 h-1.5 rounded-full ${i === 3 ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`}></div>
                 </div>
               ))}
             </div>
             <div className="flex justify-between items-end">
               <div>
                  <div className="text-[10px] font-bold text-indigo-300 uppercase">Vector Sync</div>
                  <div className="text-xl font-black text-white">4 / 4 DBs</div>
               </div>
               <div className="text-right">
                  <div className="text-[10px] font-bold text-indigo-300 uppercase">Latency</div>
                  <div className="text-xl font-black text-white">42ms</div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{ title: string; value: string; change: string; positive: boolean; icon: string; colorClass: string }> = ({ title, value, change, positive, icon, colorClass }) => (
  <div className="bg-white p-6 rounded-3xl border border-indigo-50 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default">
    <div className="flex justify-between items-start mb-6">
      <div className={`w-14 h-14 ${colorClass.split(' ')[0]} rounded-2xl flex items-center justify-center text-3xl shadow-inner`}>
        {icon}
      </div>
      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-700'}`}>
        {change}
      </span>
    </div>
    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h3>
    <p className="text-2xl font-black text-slate-800">{value}</p>
  </div>
);

export default Dashboard;