/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Shield, BarChart3, Users, FileText, ArrowRight } from 'lucide-react';

import { Logo } from '../components/ui/Logo';
import { usePageTitle } from '../hooks/usePageTitle';

export default function LandingPage() {
  usePageTitle('VTC - Diagnóstico NR-01');
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
        <Logo className="scale-90 origin-left" />
        <Link 
          to="/login" 
          className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-brand-100 active:scale-95"
        >
          Entrar no Painel
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="bg-brand-50 text-brand-700 px-4 py-1.5 rounded-full text-xs font-black mb-6 inline-block uppercase tracking-widest border border-brand-100">
            Inteligência em Segurança do Trabalho
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tighter uppercase italic">
            Diagnóstico Estratégico de <br className="hidden md:block" />
            <span className="text-brand-600">Riscos Psicossociais (NR-01)</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
            Atenda aos requisitos legais da NR-01 com a metodologia exclusiva da Ventura TC para identificar, 
            avaliar e mitigar riscos organizacionais e psicossociais no seu PGR.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/login"
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-xl"
            >
              Iniciar Diagnóstico <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white px-6 md:px-12 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="bg-brand-50 w-12 h-12 flex items-center justify-center rounded-xl text-brand-600">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Coleta Anônima</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                Metodologia que garante 100% de sigilo (LGPD), incentivando a honestidade nas respostas dos colaboradores.
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-brand-50 w-12 h-12 flex items-center justify-center rounded-xl text-brand-600">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Análise de Dados</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                Resultados quantitativos em tempo real por setor, categoria de risco e severidade para tomada de decisão.
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-brand-50 w-12 h-12 flex items-center justify-center rounded-xl text-brand-600">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Conformidade Legal</h3>
              <p className="text-slate-600 font-medium leading-relaxed">
                Emissão de relatórios técnicos completos para subsidiar o Inventário de Riscos do PGR conforme a NR-01.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 md:px-12 bg-slate-900 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-600/10 rounded-full blur-3xl -ml-32 -mb-32" />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <Logo variant="light" className="justify-center mb-10 scale-125" />
          <h2 className="text-3xl md:text-5xl font-black mb-8 uppercase tracking-tighter italic">Engenharia de Segurança <br/> com Foco Pessoas</h2>
          <p className="text-slate-400 text-lg mb-12 font-medium">
            Melhore o clima organizacional, reduza o absenteísmo e cumpra a legislação com a Ventura TC.
          </p>
          <Link 
            to="/login"
            className="bg-brand-600 text-white hover:bg-brand-700 px-10 py-5 rounded-xl font-black uppercase tracking-widest text-sm inline-block transition-all transform hover:scale-105 shadow-2xl shadow-brand-500/20"
          >
            Acessar Plataforma
          </Link>
        </div>
      </section>

      <footer className="py-12 border-t border-slate-200 bg-white px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <Logo className="opacity-50 grayscale scale-75" />
          <div>© 2026 Ventura TC • Consultoria e Treinamentos</div>
        </div>
      </footer>
    </div>
  );
}
