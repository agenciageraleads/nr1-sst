/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { usePageTitle } from '../hooks/usePageTitle';
import { 
  Building2, 
  ClipboardList, 
  Users, 
  MessageSquareReply, 
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { collection, getCountFromServer, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Dashboard() {
  usePageTitle('VTC - Painel de Gestão');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([
    { label: 'Empresas Ativas', value: '-', icon: Building2, color: 'bg-brand-600', trend: 'Total cadastrado' },
    { label: 'Campanhas em Curso', value: '-', icon: ClipboardList, color: 'bg-emerald-500', trend: 'Status: Ativa' },
    { label: 'Total de Respostas', value: '-', icon: MessageSquareReply, color: 'bg-green-500', trend: 'Colaborador + Empresa' },
    { label: 'Alertas de Risco', value: '0', icon: AlertTriangle, color: 'bg-amber-500', trend: 'Nível Crítico' },
  ]);

  const [chartData, setChartData] = useState([
    { name: 'Sobrecarga', valor: 0 },
    { name: 'Liderança', valor: 0 },
    { name: 'Clima', valor: 0 },
    { name: 'Controle', valor: 0 },
    { name: 'Suporte', valor: 0 },
  ]);

  useEffect(() => {
    async function fetchStats() {
      try {
        // 1. Total Companies
        const companiesSnapshot = await getCountFromServer(collection(db, 'companies'));
        const totalCompanies = companiesSnapshot.data().count;

        // 2. Active Campaigns
        const activeCampaignsQuery = query(collection(db, 'campaigns'), where('status', '==', 'ativa'));
        const activeCampaignsSnapshot = await getCountFromServer(activeCampaignsQuery);
        const totalActiveCampaigns = activeCampaignsSnapshot.data().count;

        // 3. Total Responses (Employee + Company)
        const employeeResponsesSnapshot = await getCountFromServer(collection(db, 'employee_responses'));
        const companyResponsesSnapshot = await getCountFromServer(collection(db, 'company_responses'));
        const totalResponses = employeeResponsesSnapshot.data().count + companyResponsesSnapshot.data().count;

        setStats([
          { label: 'Empresas Ativas', value: totalCompanies.toString(), icon: Building2, color: 'bg-brand-600', trend: 'Total cadastrado' },
          { label: 'Campanhas em Curso', value: totalActiveCampaigns.toString(), icon: ClipboardList, color: 'bg-emerald-500', trend: 'Status: Ativa' },
          { label: 'Total de Respostas', value: totalResponses.toString(), icon: MessageSquareReply, color: 'bg-green-500', trend: 'Colaborador + Empresa' },
          { label: 'Alertas de Risco', value: '0', icon: AlertTriangle, color: 'bg-amber-500', trend: 'Nível Crítico' },
        ]);

        // 4. Basic aggregations for chart (Fetching last responses to show some movement)
        const lastResponsesQuery = query(
          collection(db, 'employee_responses'), 
          orderBy('submittedAt', 'desc'),
          limit(20)
        );
        const lastResponses = await getDocs(lastResponsesQuery);
        
        if (!lastResponses.empty) {
          // This is a simplified logic to show REAL data impact on chart
          let overloaddSum = 0;
          let leadershipSum = 0;
          let climateSum = 0;
          let controlSum = 0;
          let supportSum = 0;
          let count = 0;

          lastResponses.forEach(doc => {
            const data = doc.data();
            const answers = data.answers || {};
            // Simplified mapping of answers to categories based on NR-01 structure
            // Assuming answers are stored in a map-like structure
            overloaddSum += (answers.q1 || 50) + (answers.q2 || 50);
            leadershipSum += (answers.q3 || 50) + (answers.q4 || 50);
            climateSum += (answers.q5 || 50) + (answers.q6 || 50);
            controlSum += (answers.q7 || 50) + (answers.q8 || 50);
            supportSum += (answers.q9 || 50) + (answers.q10 || 50);
            count++;
          });

          if (count > 0) {
            setChartData([
              { name: 'Sobrecarga', valor: Math.round(overloaddSum / (count * 2)) },
              { name: 'Liderança', valor: Math.round(leadershipSum / (count * 2)) },
              { name: 'Clima', valor: Math.round(climateSum / (count * 2)) },
              { name: 'Controle', valor: Math.round(controlSum / (count * 2)) },
              { name: 'Suporte', valor: Math.round(supportSum / (count * 2)) },
            ]);
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600 mb-4" />
        <p className="text-slate-500 font-medium">Carregando indicadores reais...</p>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`${stat.color} p-3 rounded-xl shadow-lg shadow-brand-100`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.trend}</span>
            </div>
            <div>
              <h3 className="text-3xl font-extrabold text-slate-900 mb-1">{stat.value}</h3>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Risk Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Médias de Risco por Categoria</h3>
              <p className="text-sm text-slate-500">Visão consolidada última campanha</p>
            </div>
            <select className="bg-slate-50 border-none rounded-lg text-sm font-medium px-4 py-2 ring-1 ring-slate-100">
              <option>Todas as Empresas</option>
              <option>Últimos 30 dias</option>
            </select>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.valor > 60 ? '#ef4444' : entry.valor > 40 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-6 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Alertas Críticos
          </h3>
          <div className="space-y-4 flex-1">
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl relative group overflow-hidden">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-red-600 uppercase mb-1">Empresa ABC</p>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Alto índice de sobrecarga em Operação</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-red-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
               </div>
               <p className="text-xs text-red-700/70 mt-2">Médias acima de 85pts no setor logístico.</p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl relative group overflow-hidden">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-amber-600 uppercase mb-1">Tech Solutions</p>
                    <p className="text-sm font-bold text-slate-900 leading-tight">Clima organizacional em declínio</p>
                  </div>
                  <TrendingDown className="w-4 h-4 text-amber-400 group-hover:translate-y-1 transition-transform" />
               </div>
               <p className="text-xs text-amber-700/70 mt-2">Queda de 15pts na percepção de liderança.</p>
            </div>
          </div>
          <button className="mt-6 w-full py-3 bg-slate-50 text-slate-600 font-bold rounded-xl text-sm border border-slate-200 hover:bg-slate-100 transition-all">
            Ver Todos os Alertas
          </button>
        </div>
      </div>
    </div>
  );
}
