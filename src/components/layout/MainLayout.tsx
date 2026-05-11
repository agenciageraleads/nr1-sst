/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  LayoutDashboard, 
  Building2, 
  ClipboardList, 
  BarChart3, 
  FileText, 
  Settings, 
  LogOut, 
  Shield 
} from 'lucide-react';
import { cn } from '../../lib/utils';

import { Logo } from '../ui/Logo';

interface MainLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Building2, label: 'Empresas', path: '/empresas' },
  { icon: ClipboardList, label: 'Campanhas', path: '/campanhas' },
  { icon: FileText, label: 'Relatórios', path: '/relatorios' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export default function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col fixed h-full z-40 shadow-2xl">
        <div className="p-8 pb-10 border-b border-white/5">
          <Logo variant="light" className="scale-110 origin-left" />
        </div>

        <nav className="flex-1 p-6 space-y-2 mt-6">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group font-bold",
                isActive 
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20" 
                  : "hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                "group-hover:scale-110 transition-transform"
              )} />
              {item.label}
              {location.pathname === item.path && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 w-full transition-all text-slate-500 font-bold group"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-10">
        <header className="mb-12 flex justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Olá, Consultoria 👋
            </h2>
            <p className="text-slate-500 font-medium mt-1">Bem-vindo de volta ao seu painel de gestão.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-slate-900">Admin Geral</p>
               <p className="text-xs text-slate-500">{auth.currentUser?.email}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-brand-600 font-bold border-2 border-white shadow-sm ring-1 ring-slate-100">
               {auth.currentUser?.email?.[0].toUpperCase()}
             </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
