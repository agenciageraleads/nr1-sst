/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  API_URL,
  api,
  formatDateValue,
  type ResultsAnalysisPayload,
  type ResultsCategoryAverage,
  type ResultsEvidenceQuestion,
  type ResultsSummary,
} from '../lib/api';
import { 
  BarChart3, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  FileText, 
  Loader2,
  Calendar
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion } from 'motion/react';
import { format } from 'date-fns';

import { usePageTitle } from '../hooks/usePageTitle';

type EvidenceDriver = {
  label: string;
  metric?: number;
  responseCount?: number;
};

type EvidenceCategory = {
  name: string;
  risk?: number;
  critical: boolean;
  drivers: EvidenceDriver[];
};

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asNumber(value: unknown): number | undefined {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function questionLabel(question: ResultsEvidenceQuestion) {
  return question.questionText || question.text || question.label || question.questionKey || question.questionId || '';
}

function questionMetric(question: ResultsEvidenceQuestion) {
  return (
    asNumber(question.impact) ??
    asNumber(question.driverScore) ??
    asNumber(question.risk) ??
    asNumber(question.negativeShare) ??
    asNumber(question.averageScore) ??
    asNumber(question.score)
  );
}

function questionSortMetric(question: ResultsEvidenceQuestion) {
  return asNumber(question.impact) ?? asNumber(question.driverScore) ?? asNumber(question.risk) ?? asNumber(question.negativeShare);
}

function categoryDrivers(category: Record<string, any>) {
  const drivers = category.topDrivers ?? category.drivers ?? category.questions ?? category.evidence;
  return Array.isArray(drivers) ? drivers : [];
}

function normalizeEvidencePayload(payload?: ResultsAnalysisPayload): EvidenceCategory[] {
  if (!payload) return [];

  const source = payload as any;
  let rawCategories: Array<Record<string, any> & { critical?: boolean }> = [];

  if (Array.isArray(source)) {
    rawCategories = source;
  } else if (isRecord(source)) {
    const nested = source.criticalCategories ?? source.categories ?? source.evidence ?? source.drivers ?? source.topDrivers;
    const fromCriticalCategories = Array.isArray(source.criticalCategories);

    if (Array.isArray(nested)) {
      rawCategories = nested.map((category) => ({ ...category, critical: fromCriticalCategories }));
    } else if (isRecord(nested)) {
      rawCategories = Object.entries(nested).map(([name, drivers]) => ({
        name,
        topDrivers: Array.isArray(drivers) ? drivers : [],
        critical: fromCriticalCategories,
      }));
    } else {
      rawCategories = Object.entries(source)
        .filter(([, drivers]) => Array.isArray(drivers))
        .map(([name, drivers]) => ({ name, topDrivers: drivers }));
    }
  }

  return rawCategories
    .map((rawCategory) => {
      const category = isRecord(rawCategory) ? rawCategory : {};
      const name = String(category.category || category.name || '').trim();
      const drivers = categoryDrivers(category)
        .map((question: ResultsEvidenceQuestion, index: number) => ({
          label: questionLabel(question).trim(),
          metric: questionMetric(question),
          sortMetric: questionSortMetric(question),
          responseCount: asNumber(question.validResponseCount ?? question.responseCount ?? question.count),
          originalIndex: index,
        }))
        .filter((question) => question.label)
        .sort((a, b) => {
          if (a.sortMetric == null && b.sortMetric == null) return a.originalIndex - b.originalIndex;
          if (a.sortMetric == null) return 1;
          if (b.sortMetric == null) return -1;
          return b.sortMetric - a.sortMetric;
        })
        .slice(0, 3);

      return {
        name,
        risk: asNumber(category.risk),
        critical: Boolean(category.critical),
        drivers,
      };
    })
    .filter((category) => category.name && category.drivers.length);
}

export default function ResultsPage() {
  usePageTitle('VTC - Resultados em Tempo Real');
  const { id } = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [summary, setSummary] = useState<ResultsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { campaign, responses, summary, analysis, evidence } = await api.results(id);
        setCampaign(campaign);
        setResponses(responses);
        setSummary({ ...(summary || {}), analysis: summary?.analysis ?? analysis, evidence: summary?.evidence ?? evidence });
      } catch (error) {
        console.error('Erro ao carregar resultados:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const getCategoryAverages = () => {
    const categories: Record<string, { total: number; count: number }> = {};
    responses.forEach(resp => {
      Object.entries(resp.scores || {}).forEach(([cat, score]: [string, any]) => {
        if (!categories[cat]) categories[cat] = { total: 0, count: 0 };
        categories[cat].total += score;
        categories[cat].count += 1;
      });
    });

    return Object.entries(categories).map(([name, data]) => ({
      name,
      score: Math.round(data.total / data.count),
      risk: 100 - Math.round(data.total / data.count) // Assuming 100 is best, risk is inverse
    }));
  };

  const catAverages: ResultsCategoryAverage[] = summary?.categoryAverages || getCategoryAverages();
  const mostCritical = [...catAverages].sort((a, b) => b.risk - a.risk)[0];
  const totalResponses = summary?.employeeResponsesCount ?? responses.length;
  const reportPdfUrl = id ? `${API_URL}/reports/${encodeURIComponent(id)}/pdf` : '#';
  const riskByCategory = new Map(catAverages.map((category) => [category.name.toLocaleLowerCase('pt-BR'), category.risk]));
  const evidenceCategories = [
    ...normalizeEvidencePayload(summary?.analysis),
    ...normalizeEvidencePayload(summary?.evidence),
  ]
    .filter((category, index, categories) => {
      const risk = riskByCategory.get(category.name.toLocaleLowerCase('pt-BR')) ?? category.risk;
      const isCritical = category.critical || (risk ?? 0) > 40;
      const firstIndex = categories.findIndex((candidate) => candidate.name.toLocaleLowerCase('pt-BR') === category.name.toLocaleLowerCase('pt-BR'));
      return isCritical && firstIndex === index;
    })
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/campanhas" 
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{campaign?.name}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
               <span className="flex items-center gap-1.5 font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md"><BarChart3 className="w-4 h-4" /> Resultados</span>
               <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {formatDateValue(campaign?.startDate) ? format(formatDateValue(campaign.startDate)!, "dd/MM/yyyy") : ''}</span>
            </div>
          </div>
        </div>
        <a
          href={reportPdfUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand-500/20 transition-all transform hover:scale-105"
        >
          <FileText className="w-5 h-5" /> Gerar Relatório PDF
        </a>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-4 mb-4">
              <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Respostas</p>
                <h3 className="text-2xl font-black text-slate-900">{totalResponses}</h3>
              </div>
           </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-4 mb-4">
              <div className="bg-red-500 p-3 rounded-2xl shadow-lg shadow-red-500/20 text-white">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Maior Risco</p>
                <h3 className="text-lg font-bold text-slate-900 leading-none truncate">{mostCritical?.name || 'N/A'}</h3>
              </div>
           </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-4 mb-4">
              <div className="bg-green-500 p-3 rounded-2xl shadow-lg shadow-green-500/20 text-white">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fator Protetivo</p>
                <h3 className="text-lg font-bold text-slate-900 leading-none truncate">Relações Interpessoais</h3>
              </div>
           </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-4 mb-4">
              <div className={cn(
                "p-3 rounded-2xl shadow-lg text-white",
                mostCritical?.risk > 50 ? "bg-red-500 shadow-red-500/20" : "bg-blue-500 shadow-blue-500/20"
              )}>
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Índice Geral</p>
                <h3 className="text-2xl font-black text-slate-900">{Math.round(catAverages.reduce((acc, c) => acc + c.risk, 0) / (catAverages.length || 1))}%</h3>
              </div>
           </div>
        </motion.div>
      </div>

      {evidenceCategories.length > 0 && (
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-start gap-4 mb-5">
            <div className="bg-amber-100 text-amber-700 p-3 rounded-2xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Por que deu esse risco?</h3>
              <p className="text-sm text-slate-500 mt-1">Principais perguntas que puxaram as categorias críticas para cima.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {evidenceCategories.map((category) => {
              const risk = riskByCategory.get(category.name.toLocaleLowerCase('pt-BR')) ?? category.risk;

              return (
                <div key={category.name} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/60">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide leading-tight">{category.name}</h4>
                    {risk != null && (
                      <span className={cn(
                        "shrink-0 rounded-full px-2 py-1 text-[11px] font-black",
                        risk > 60 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {Math.round(risk)}%
                      </span>
                    )}
                  </div>
                  <ol className="space-y-2">
                    {category.drivers.map((driver, index) => (
                      <li key={`${category.name}-${driver.label}`} className="flex gap-3 text-sm text-slate-700 leading-snug">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 text-[11px] font-black text-slate-500">
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="font-bold text-slate-800">{driver.label}</span>
                          {(driver.metric != null || driver.responseCount != null) && (
                            <span className="block text-xs text-slate-500 mt-1">
                              {driver.metric != null ? `Indicador ${Math.round(driver.metric)}%` : ''}
                              {driver.metric != null && driver.responseCount != null ? ' - ' : ''}
                              {driver.responseCount != null ? `${driver.responseCount} respostas` : ''}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Risk by Category Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-8">
             <h3 className="text-xl font-bold text-slate-900 tracking-tight">Risco por Categoria</h3>
             <p className="text-sm text-slate-500 mt-1">Quanto maior o percentual, maior a necessidade de intervenção.</p>
          </div>
          
          <div className="h-[400px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catAverages} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl text-xs font-bold shadow-2xl">
                          {payload[0].value}% de Risco
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="risk" radius={[0, 10, 10, 0]} barSize={24}>
                   {catAverages.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.risk > 60 ? '#ef4444' : entry.risk > 40 ? '#f59e0b' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Plan */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
           <h3 className="text-xl font-bold text-slate-900 mb-8 tracking-tight">Recomendações Prioritárias</h3>
           <div className="space-y-6">
              {mostCritical && (
                <div className="p-6 bg-red-50 border border-red-100 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                    <AlertTriangle className="w-20 h-20 text-red-600" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-2">Urgente</p>
                    <h4 className="text-lg font-bold text-slate-900 mb-4">{mostCritical.name}</h4>
                    <p className="text-sm text-slate-700 leading-relaxed mb-6">
                      Os índices de risco nesta categoria estão acima de 60%. Recomenda-se ações imediatas de diagnóstico qualitativo ou treinamentos específicos focados em redução de estresse e suporte à liderança.
                    </p>
                    <div className="flex flex-col gap-2">
                       <span className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white/60 p-2 rounded-lg border border-red-200">
                        <CheckCircle2 className="w-4 h-4 text-green-500" /> Implantar pausas programadas
                       </span>
                       <span className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white/60 p-2 rounded-lg border border-red-200">
                        <CheckCircle2 className="w-4 h-4 text-green-500" /> Revisar dimensionamento de equipe
                       </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                 <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">Preventivo</p>
                 <h4 className="text-lg font-bold text-slate-900 mb-4">Comunicação e Feedback</h4>
                 <p className="text-sm text-slate-700 leading-relaxed">
                   Consolidar canais de escuta ativa e melhorar o repasse de informações estratégicas para reduzir a ansiedade sobre mudanças organizacionais.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
