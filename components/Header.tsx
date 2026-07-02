
import React from 'react';
import { useTenant } from '../contexts/TenantContext';
import { TENANTS } from '../constants';

const Header: React.FC = () => {
  const { selectedTenant, setSelectedTenant } = useTenant();

  return (
    <header className="relative z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
      <div className="px-4 h-16 flex items-center justify-between">
        <div className="flex items-center md:hidden">
          <button className="p-2 text-slate-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"/>
            </svg>
          </button>
          <span className="ml-2 font-bold text-white">Occuris Command</span>
        </div>

        <div className="hidden md:flex items-center space-x-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Tenant</label>
          <div className="relative">
            <select
              value={selectedTenant.id}
              onChange={(e) => {
                const tenant = TENANTS.find(t => t.id === e.target.value);
                if (tenant) setSelectedTenant(tenant);
              }}
              className="appearance-none bg-slate-950/90 border border-[#C084FC]/25 rounded-lg px-4 py-1.5 pr-8 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#C084FC]/30"
            >
              {TENANTS.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.region})</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="px-2 py-1 bg-emerald-400/15 border border-emerald-400/25 text-emerald-200 text-[10px] font-bold rounded uppercase">System Active</div>
          <button className="p-2 text-slate-400 hover:text-[#C084FC] transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
          </button>
          <div className="h-8 w-px bg-white/10"></div>
          <button className="flex items-center gap-2 hover:bg-white/[0.04] p-1 rounded-lg transition-colors">
            <div className="w-8 h-8 rounded bg-[#C084FC]/20 border border-[#C084FC]/30 flex items-center justify-center text-[#C084FC] font-black">OC</div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
