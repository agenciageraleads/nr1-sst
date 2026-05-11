/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Logo } from '../components/ui/Logo';
import { usePageTitle } from '../hooks/usePageTitle';
import { 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function CompanyForm() {
  usePageTitle('VTC - Diagnóstico Empresa');
  const { token } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0); 
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    const fetchCampaignAndCompany = async () => {
      if (!token) return;
      setLoading(true);
      try {
        // Step 1: Find campaign by company token
        const campaignsRef = collection(db, 'campaigns');
        const qCamp = query(
          campaignsRef, 
          where('companyFormToken', '==', token),
          where('status', '==', 'ativa')
        );
        const campSnap = await getDocs(qCamp);
        
        if (campSnap.empty) {
          setCampaign(null);
          setLoading(false);
          return;
        }

        const campData = { id: campSnap.docs[0].id, ...campSnap.docs[0].data() } as any;
        setCampaign(campData);

        // Step 2: Fetch company data using companyId from campaign
        const compRef = doc(db, 'companies', campData.companyId);
        const compSnap = await getDoc(compRef);
        
        if (compSnap.exists()) {
          setCompany(compSnap.data());
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignAndCompany();
  }, [token]);

  const handleAnswer = (field: string, value: any) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'company_responses'), {
        campaignId: campaign.id,
        companyId: campaign.companyId,
        answers: answers,
        submittedAt: serverTimestamp(),
        submittedByEmail: answers['email'] || '',
        submittedByName: answers['name'] || ''
      });
      setSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'company_responses');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Formulário Não Encontrado</h2>
        <p className="text-slate-500 mt-2">O link pode ter expirado.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-12">
           <Logo showText={false} className="scale-150" />
        </div>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-brand-50 p-6 rounded-full mb-8">
          <ShieldCheck className="w-16 h-16 text-brand-600" />
        </motion.div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-4 uppercase tracking-tight">Formulário Recebido</h2>
        <p className="text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
          As informações institucionais da <strong>{company?.razaoSocial}</strong> foram salvas com sucesso. 
          A consultoria Ventura TC entrará em contato para os próximos passos.
        </p>
        <button onClick={() => navigate('/')} className="mt-10 px-8 py-3 bg-brand-600 text-white rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-brand-100">Voltar ao Início</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-8 py-10 text-white relative flex flex-col items-center">
          <div className="absolute top-0 left-0 h-1.5 bg-brand-500 transition-all duration-500 z-10" style={{ width: `${(step / 3) * 100}%` }} />
          <Logo variant="light" className="mb-6" />
          <div className="w-full h-px bg-white/5 mb-6" />
          <div className="flex items-center gap-4">
             <div className="bg-brand-600 p-3 rounded-2xl shadow-lg shadow-brand-500/20">
               <Building2 className="w-6 h-6 text-white" />
             </div>
             <div>
               <h1 className="text-xl font-black tracking-tighter uppercase leading-none">{company?.razaoSocial}</h1>
               <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black mt-1">Diagnóstico Institucional GRO/PGR</p>
             </div>
          </div>
        </div>

        <div className="p-8 md:p-12">
          <AnimatePresence mode="wait">
             {step === 0 && (
               <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div className="border-l-4 border-blue-600 pl-6 space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">Bloco 1 — Identificação</h2>
                    <p className="text-slate-500 text-sm">Informações básicas da unidade avaliada.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">1. Unidade ou filial avaliada</label>
                      <input type="text" className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" onChange={(e) => handleAnswer('unidade', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">2. Número total de colaboradores</label>
                      <select className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" onChange={(e) => handleAnswer('num_colab', e.target.value)}>
                        <option>Até 10</option>
                        <option>11 a 50</option>
                        <option>51 a 100</option>
                        <option>101 a 300</option>
                        <option>Acima de 300</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">3. Trabalhadores terceirizados?</label>
                      <select className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" onChange={(e) => handleAnswer('terceirizados', e.target.value)}>
                        <option>Não</option>
                        <option>Sim</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">4. Home office ou híbrido?</label>
                      <select className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" onChange={(e) => handleAnswer('remote', e.target.value)}>
                        <option>Não</option>
                        <option>Sim</option>
                        <option>Parcialmente</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={() => setStep(1)} 
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                  >
                    Próximo Bloco <ArrowRight className="w-5 h-5" />
                  </button>
               </motion.div>
             )}

             {step === 1 && (
               <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div className="border-l-4 border-blue-600 pl-6 space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">Bloco 2 — Organização</h2>
                    <p className="text-slate-500 text-sm">Metas, prazos e produtividade.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">5. Principais setores da empresa</label>
                      <textarea className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" onChange={(e) => handleAnswer('setores', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">6. Setores com maior pressão por prazos?</label>
                      <input type="text" className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" onChange={(e) => handleAnswer('setores_pressao', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">7. As metas são realistas pela gestão?</label>
                      <div className="flex gap-4">
                         {['Sim', 'Não', 'Parcialmente'].map(opt => (
                           <button 
                            key={opt}
                            onClick={() => handleAnswer('metas_realistas', opt)}
                            className={cn(
                              "flex-1 p-3 rounded-xl border font-bold text-sm transition-all",
                              answers['metas_realistas'] === opt ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600"
                            )}
                           >
                             {opt}
                           </button>
                         ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setStep(0)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-center gap-2">
                      <ArrowLeft className="w-5 h-5" /> Voltar
                    </button>
                    <button 
                      onClick={() => setStep(2)} 
                      className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                    >
                      Próximo <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
               </motion.div>
             )}

             {step === 2 && (
               <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div className="border-l-4 border-blue-600 pl-6 space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">Bloco 3 — Gestão e Clima</h2>
                    <p className="text-slate-500 text-sm">Liderança, conflitos e indicadores.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">8. Existe canal formal para denúncias/sugestões?</label>
                      <div className="grid grid-cols-2 gap-3">
                         {['Sim', 'Não', 'Em implantação'].map(opt => (
                           <button 
                            key={opt}
                            onClick={() => handleAnswer('canal_denuncia', opt)}
                            className={cn(
                              "p-3 rounded-xl border font-bold text-sm transition-all",
                              answers['canal_denuncia'] === opt ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600"
                            )}
                           >
                             {opt}
                           </button>
                         ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">9. A empresa acompanha absenteísmo?</label>
                      <div className="flex gap-4">
                        {['Sim', 'Não'].map(opt => (
                           <button 
                            key={opt}
                            onClick={() => handleAnswer('absenteismo', opt)}
                            className={cn(
                              "flex-1 p-3 rounded-xl border font-bold text-sm transition-all",
                              answers['absenteismo'] === opt ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600"
                            )}
                           >
                             {opt}
                           </button>
                         ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">10. Principais fatores de estresse identificados pela gestão</label>
                      <textarea rows={3} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" onChange={(e) => handleAnswer('fatores_estresse', e.target.value)} />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setStep(1)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-center gap-2">
                      <ArrowLeft className="w-5 h-5" /> Voltar
                    </button>
                    <button 
                      onClick={() => setStep(3)} 
                      className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                    >
                      Fim <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
               </motion.div>
             )}

             {step === 3 && (
               <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex items-start gap-4">
                     <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                     <p className="text-sm text-amber-800 leading-relaxed font-medium">
                       Não informe nomes ou dados pessoais de saúde. Esta informação deve ser tratada apenas de forma coletiva e preventiva.
                     </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Nome do Respondente</label>
                      <input type="text" className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" onChange={(e) => handleAnswer('name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">E-mail Corporativo</label>
                      <input type="email" className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500" onChange={(e) => handleAnswer('email', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                       <label className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" required className="w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500" />
                          <span className="text-xs text-slate-500 font-medium group-hover:text-slate-700 transition-all">Declaro que as informações prestadas são fidedignas à realidade organizacional.</span>
                       </label>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setStep(2)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-center gap-2">
                      <ArrowLeft className="w-5 h-5" /> Voltar
                    </button>
                    <button 
                      onClick={submitForm} 
                      disabled={isSubmitting}
                      className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                      Finalizar Envio
                    </button>
                  </div>
               </motion.div>
             )}
          </AnimatePresence>
        </div>
      </div>
      
      <p className="mt-8 text-slate-400 text-[10px] uppercase font-bold tracking-widest text-center">
        Powered by NR-1 Psicossocial • Gestão Inteligente de Riscos
      </p>
    </div>
  );
}
