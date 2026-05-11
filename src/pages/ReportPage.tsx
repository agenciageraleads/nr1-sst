/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { usePageTitle } from '../hooks/usePageTitle';
import { 
  ArrowLeft, 
  Printer, 
  Shield, 
  FileText, 
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

import { Logo } from '../components/ui/Logo';

export default function ReportPage() {
  usePageTitle('VTC - Relatório Técnico');
  const { id } = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const campDoc = await getDoc(doc(db, 'campaigns', id));
        if (campDoc.exists()) {
          const campData = { id: campDoc.id, ...campDoc.data() } as any;
          setCampaign(campData);
          
          const compDoc = await getDoc(doc(db, 'companies', campData.companyId));
          if (compDoc.exists()) {
            setCompany(compDoc.data());
          }
        }

        const q = query(collection(db, 'employee_responses'), where('campaignId', '==', id));
        const snap = await getDocs(q);
        setResponses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
    </div>
  );

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
      risk: 100 - Math.round(data.total / data.count)
    })).sort((a, b) => b.risk - a.risk);
  };

  const catAverages = getCategoryAverages();
  const criticalItems = catAverages.filter(c => c.risk > 40);
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 print:p-0 print:bg-white font-sans">
      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-[2.5rem] overflow-hidden print:shadow-none print:rounded-none border border-slate-100 print:border-none">
        {/* Print Controls */}
        <div className="p-6 bg-slate-900 flex justify-between items-center text-white print:hidden">
          <Link to={`/campanhas/${id}/resultados`} className="flex items-center gap-2 hover:text-brand-400 transition-all font-bold">
            <ArrowLeft className="w-5 h-5" /> Voltar aos resultados
          </Link>
          <button 
            onClick={handlePrint}
            className="bg-brand-600 hover:bg-brand-700 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand-500/20 transition-all active:scale-95"
          >
            <Printer className="w-5 h-5" /> Imprimir Relatório
          </button>
        </div>

        {/* Report Content */}
        <div className="p-12 md:p-20 space-y-16">
          {/* Header */}
          <header className="flex justify-between items-start border-b-4 border-brand-600 pb-10">
            <div className="space-y-4">
              <Logo className="scale-125 origin-left" />
              <div className="space-y-1 pt-4">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none uppercase">Diagnóstico Proativo</h1>
                <p className="text-brand-600 font-black tracking-widest uppercase text-xs">Inventário de Riscos Psicossociais — NR-01</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CÓDIGO DO DOCUMENTO</p>
               <p className="font-mono text-sm font-bold text-slate-900">VTC-NR1-{id?.substring(0, 8).toUpperCase()}</p>
            </div>
          </header>

          <section className="grid grid-cols-2 gap-12 bg-slate-50/50 p-10 rounded-[2rem] border border-slate-100">
             <div className="space-y-6">
                <h2 className="text-xs font-black text-brand-600 uppercase tracking-widest mb-2 border-b border-brand-200 pb-2">1. Identificação do Estabelecimento</h2>
                <div className="space-y-4">
                   <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase mb-1">Razão Social</p>
                      <p className="font-bold text-slate-900 leading-tight">{company?.razaoSocial}</p>
                   </div>
                   <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase mb-1">CNPJ</p>
                      <p className="font-bold text-slate-900">{company?.cnpj}</p>
                   </div>
                   <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase mb-1">Ramo de Atividade</p>
                      <p className="font-bold text-slate-900">{company?.ramoAtividade || 'Não informado'}</p>
                   </div>
                </div>
             </div>
             <div className="space-y-6">
                <h2 className="text-xs font-black text-brand-600 uppercase tracking-widest mb-2 border-b border-brand-200 pb-2">2. Dados do Inventário</h2>
                <div className="space-y-4">
                   <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase mb-1">Título da Campanha</p>
                      <p className="font-bold text-slate-900 leading-tight">{campaign?.name}</p>
                   </div>
                   <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase mb-1">Período de Coleta</p>
                      <p className="font-bold text-slate-900">
                        {campaign?.startDate ? format(campaign.startDate.toDate(), "dd/MM/yy") : ''} até {campaign?.endDate ? format(campaign.endDate.toDate(), "dd/MM/yy") : ''}
                      </p>
                   </div>
                   <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase mb-1">Total de Participantes</p>
                      <p className="font-bold text-slate-900">{responses.length} colaboradores</p>
                   </div>
                </div>
             </div>
          </section>

          <section className="space-y-8">
            <h2 className="text-2xl font-black text-slate-900 italic border-l-4 border-brand-600 pl-4">3. Metodologia e Abrangência</h2>
            <div className="space-y-4 text-slate-600 leading-relaxed text-sm text-justify">
               <p>
                 O presente diagnóstico atende aos requisitos do **item 1.5 da NR-01 (Gerenciamento de Riscos Ocupacionais)**, focado na identificação de perigos e avaliação de riscos relacionados à organização do trabalho e fatores psicossociais.
               </p>
               <p>
                 Utilizou-se a metodologia de **Avaliação Psicossocial Organizacional (APO)**, ferramenta proprietária da Ventura TC, que analisa a exposição coletiva a estressores ocupacionais preservando o anonimato individual (LGPD). Os riscos são classificados em uma escala de 0 a 100%, onde valores acima de 40% indicam necessidade de controle.
               </p>
            </div>
          </section>

          <section className="page-break-before space-y-8">
             <h2 className="text-2xl font-black text-slate-900 italic border-l-4 border-brand-600 pl-4">4. Resultados do Inventário de Riscos</h2>
             <div className="grid grid-cols-1 gap-4">
               {catAverages.map((cat, i) => (
                 <div key={i} className="flex items-center gap-6 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm print:shadow-none">
                    <div className="flex-1">
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{cat.name}</span>
                          <span className={cn(
                            "text-xs font-black tracking-tighter",
                            cat.risk > 60 ? "text-red-600" : cat.risk > 40 ? "text-amber-600" : "text-brand-600"
                          )}>{cat.risk}% de Risco</span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-1000",
                              cat.risk > 60 ? "bg-red-500" : cat.risk > 40 ? "bg-amber-500" : "bg-brand-500"
                            )} 
                            style={{ width: `${cat.risk}%` }} 
                          />
                       </div>
                    </div>
                 </div>
               ))}
             </div>
          </section>

          <section className="page-break-before space-y-8">
             <h2 className="text-2xl font-black text-slate-900 italic border-l-4 border-brand-600 pl-4">5. Medidas de Prevenção e Plano de Ação (5W2H)</h2>
             <div className="space-y-10">
                {criticalItems.length > 0 ? (
                  <div className="space-y-12">
                    <p className="text-sm text-slate-600 italic border-b border-slate-100 pb-4">
                      Com base na matriz de riscos e na severidade identificada, estabelecemos o seguinte Plano de Ação Estratégico (5W2H) para mitigação e controle dos perigos psicossociais:
                    </p>
                    
                    <div className="space-y-16">
                       {criticalItems.map((item, i) => (
                         <div key={i} className="space-y-6">
                            <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-xl text-white">
                               <AlertCircle className={cn("w-6 h-6", item.risk > 60 ? "text-red-400" : "text-amber-400")} />
                               <div>
                                  <h4 className="text-sm font-black uppercase tracking-tight leading-none">{item.name}</h4>
                                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Plano de Mitigação de Risco — Nível de Exposição: {item.risk}%</p>
                               </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                               <div className="bg-white p-5 space-y-2">
                                  <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">WHAT (O QUÊ?)</p>
                                  <p className="text-xs text-slate-700 font-bold leading-relaxed">
                                     Implementação de programa de monitoramento de carga mental e revisão de processos de trabalho.
                                  </p>
                               </div>
                               <div className="bg-white p-5 space-y-2">
                                  <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">WHY (POR QUÊ?)</p>
                                  <p className="text-xs text-slate-700 font-bold leading-relaxed">
                                     Reduzir o impacto do fator "{item.name}" na saúde dos colaboradores e prevenir doenças ocupacionais.
                                  </p>
                               </div>
                               <div className="bg-white p-5 space-y-2">
                                  <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">WHERE (ONDE?)</p>
                                  <p className="text-xs text-slate-700 font-bold leading-relaxed">
                                     Em todos os setores críticos identificados com exposição superior a 40%.
                                  </p>
                               </div>
                               <div className="bg-white p-5 space-y-2">
                                  <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">WHEN (QUANDO?)</p>
                                  <p className="text-xs text-slate-700 font-bold leading-relaxed">
                                     Início imediato (T0 + 15 dias). Conclusão sugerida em 90 dias.
                                  </p>
                               </div>
                               <div className="bg-white p-5 space-y-2">
                                  <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">WHO (QUEM?)</p>
                                  <p className="text-xs text-slate-700 font-bold leading-relaxed">
                                     SESMT, Gestores de Área e Consultoria de Psicologia Organizacional.
                                  </p>
                               </div>
                               <div className="bg-white p-5 space-y-2">
                                  <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">HOW (COMO?)</p>
                                  <p className="text-xs text-slate-700 font-bold leading-relaxed">
                                     Realização de workshops de gestão de tempo, revisão de KPIs e canais de escuta ativa.
                                  </p>
                               </div>
                               <div className="bg-white p-5 space-y-2 lg:col-span-2">
                                  <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">HOW MUCH (QUANTO?)</p>
                                  <p className="text-xs text-slate-700 font-bold leading-relaxed">
                                     Investimento em treinamento e horas-técnicas (Recursos Internos + Verba SST).
                                  </p>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-10 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex flex-col items-center text-center gap-4">
                     <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                     <div className="space-y-1">
                        <h4 className="text-xl font-black text-emerald-900 uppercase">Nível de Risco Controlado</h4>
                        <p className="text-sm text-emerald-700 font-medium leading-relaxed max-w-lg">
                           Os índices de exposição aos riscos psicossociais estão dentro dos limites de tolerância técnica (Fatores Protetivos). 
                           Recomenda-se a manutenção das boas práticas e novo monitoramento periódico.
                        </p>
                     </div>
                  </div>
                )}
             </div>
          </section>

          <footer className="pt-24 flex flex-col items-center gap-12 text-center border-t-2 border-slate-100 print:pt-40">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-20 w-full max-w-2xl">
                <div className="space-y-2">
                   <div className="w-full h-px bg-slate-300 mx-auto" />
                   <p className="text-sm font-bold text-slate-900 uppercase">Consultoria Técnica - Ventura TC</p>
                   <p className="text-[10px] text-slate-400 font-black">CREA-GO / Responsável Técnico</p>
                </div>
                <div className="space-y-2">
                   <div className="w-full h-px bg-slate-300 mx-auto" />
                   <p className="text-sm font-bold text-slate-900 uppercase">Representante da Empresa</p>
                   <p className="text-[10px] text-slate-400 font-black">CIÊNCIA DO DIAGNÓSTICO</p>
                </div>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest italic">
                  Documento Estratégico para subsídio do PGR (NR-01). Registro Gerado em {new Date().toLocaleString('pt-BR')}.
                </p>
                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold">
                   <FileText className="w-3 h-3" />
                   venturatc.com.br
                </div>
             </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
