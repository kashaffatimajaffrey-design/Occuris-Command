import React, { useState, useEffect } from 'react';
import { getMaterials, Material } from '../services/api';
import { useTenant } from '../contexts/TenantContext';

const InventoryTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedTenant } = useTenant(); // Get current tenant from context

  useEffect(() => {
    async function loadMaterials() {
      setLoading(true);
      setError(null);
      try {
        const data = await getMaterials(selectedTenant.id);
        setMaterials(data);
      } catch (err) {
        // A failed load must not render as "0 materials".
        setMaterials([]);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    loadMaterials();
  }, [selectedTenant]); // Reload when tenant changes

  const filteredData = materials.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.matnr.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">S/4HANA Master Data</h1>
          <p className="text-slate-400 text-sm font-medium">
            {selectedTenant.name}
            {!loading && !error && ` • ${materials.length} materials`}
          </p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Quick search materials..."
            className="pl-10 pr-4 py-2 bg-white border border-indigo-50 rounded-xl text-sm w-full md:w-72 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="w-5 h-5 absolute left-3 top-2.5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-indigo-50 shadow-sm overflow-hidden">
        {error ? (
          <div className="p-12 text-center">
            <div className="text-sm font-black text-rose-700 mb-2">Could not load materials</div>
            <div className="text-xs font-mono text-rose-600 break-words max-w-lg mx-auto">{error}</div>
          </div>
        ) : loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-slate-400">Loading materials...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-indigo-50/30 border-b border-indigo-50">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Material</th>
                  <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Stock</th>
                  <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-widest text-right">ABC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50/50">
                {filteredData.map((item) => {
                  const isCritical = item.stock_level <= item.safety_stock;
                  return (
                    <tr key={item.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-bold text-indigo-500">{item.matnr}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-800">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{item.supplier}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-slate-50 text-slate-500 font-bold px-2 py-1 rounded-lg border border-slate-100">{item.category}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                        {item.stock_level.toLocaleString()} <span className="text-slate-300">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${isCritical ? 'bg-rose-300 animate-pulse' : 'bg-emerald-300'}`}></div>
                          <span className={`text-[10px] font-black uppercase tracking-tight ${isCritical ? 'text-rose-400' : 'text-emerald-500'}`}>
                            {isCritical ? 'Alert' : 'Nominal'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-block w-8 py-1 rounded-lg text-center text-xs font-black ${
                          item.abc_class === 'A' ? 'bg-rose-100 text-rose-600' :
                          item.abc_class === 'B' ? 'bg-orange-100 text-orange-600' :
                          'bg-sky-100 text-sky-600'
                        }`}>
                          {item.abc_class}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryTable;