
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Orders', path: '/', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
    )},
    { name: 'Command Deck', path: '/command', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z"/></svg>
    )},
    { name: 'Overview', path: '/overview', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
    )},
    { name: 'BOM Intake', path: '/bom-intake', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6M7 4h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"/></svg>
    )},
    { name: 'AI Agents', path: '/agents', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
    )},
    { name: 'Reports', path: '/analytics', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
    )},
  ];

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="occuris-sidebar flex flex-col w-64 border-r">
        <div className="flex items-center h-16 px-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#C084FC] rounded-xl flex items-center justify-center shadow-[0_0_24px_rgba(192,132,252,0.45)] animate-pulse">
              <span className="text-slate-950 font-black">O</span>
            </div>
            <span className="text-lg font-black text-white tracking-tight">Occuris <span className="text-[#C084FC]">Command</span></span>
          </div>
        </div>
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all ${
                  location.pathname === item.path
                    ? 'bg-[#C084FC]/15 text-white shadow-[0_0_22px_rgba(192,132,252,0.16)] border border-[#C084FC]/30'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-white border border-transparent hover:border-white/10'
                }`}
              >
                <span className={`${location.pathname === item.path ? 'text-[#C084FC]' : 'text-slate-500 group-hover:text-[#C084FC]'} mr-3`}>
                  {item.icon}
                </span>
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex-shrink-0 p-4 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 overflow-hidden ring-2 ring-white shadow-sm">
              <img src="https://picsum.photos/40/40?seed=admin-pastel" alt="User" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">Admin Ops</span>
              <span className="text-[10px] text-[#C084FC] font-bold uppercase">Authorized</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
