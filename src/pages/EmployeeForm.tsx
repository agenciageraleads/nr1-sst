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
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { EMPLOYEE_QUESTIONS, SCALE_LABELS, FREQUENCY_LABELS } from '../constants/questions';
import { 
  Shield, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { Logo } from '../components/ui/Logo';
import { usePageTitle } from '../hooks/usePageTitle';

export default function EmployeeForm() {
  usePageTitle('VTC - Diagnóstico Colaborador');
  const { token } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0); // 0: Intro, 1: General Data, 2+: Questions, Final: Open Questions
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const q = query(
          collection(db, 'campaigns'), 
          where('employeeFormToken', '==', token),
          where('status', '==', 'ativa')
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          setCampaign(null);
        } else {
          const campData = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
          setCampaign(campData);

          // Fetch company data
          const companiesSnap = await getDocs(query(collection(db, 'companies'), where('status', '==', 'ativa')));
          const companyDoc = companiesSnap.docs.find(d => d.id === campData.companyId);
          if (companyDoc) {
            setCompany(companyDoc.data());
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [token]);

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
        <h2 className="text-2xl font-bold text-slate-800">Campanha Não Encontrada</h2>
        <p className="text-slate-500 mt-2">Este link pode estar expirado ou a campanha foi encerrada.</p>
        <button onClick={() => navigate('/')} className="mt-8 text-blue-600 font-bold underline">Voltar para o início</button>
      </div>
    );
  }

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const calculateScores = (ans: Record<string, any>) => {
    const categories = Array.from(new Set(EMPLOYEE_QUESTIONS.map(q => q.category)));
    const scores: Record<string, number> = {};

    categories.forEach(cat => {
      const catQuestions = EMPLOYEE_QUESTIONS.filter(q => q.category === cat);
      let total = 0;
      let count = 0;

      catQuestions.forEach(q => {
        const val = ans[q.id];
        if (val && val !== 6) { // 6 is "N/A" or "Prefer not to say"
          let score = val;
          if (q.isNegative) {
            // For negative questions, 1 (Never) is 5 (Best), 5 (Always) is 1 (Worst)
            score = 6 - val;
          }
          // Normalize to 0-100 scale where 100 is BEST (lowest risk)
          // Wait, user wants: 1 = high risk, 5 = low risk for positive. 1 = low risk, 5 = high risk for negative.
          // Let's stick to a score where 100 is best (zero risk).
          // 1 -> 0, 2 -> 25, 3 -> 50, 4 -> 75, 5 -> 100
          total += (score - 1) * 25;
          count++;
        }
      });

      if (count > 0) {
        scores[cat] = Math.round(total / count);
      }
    });

    return scores;
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    try {
      const scores = calculateScores(answers);
      await addDoc(collection(db, 'employee_responses'), {
        campaignId: campaign.id,
        companyId: campaign.companyId,
        sector: answers['sector'] || 'Não Informado',
        roleType: answers['roleType'] || 'Não Informado',
        tenure: answers['tenure'] || 'Não Informado',
        workType: answers['workType'] || 'Não Informado',
        workSchedule: answers['workSchedule'] || 'Não Informado',
        answers: answers,
        scores: scores,
        submittedAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'employee_responses');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Steps grouping
  const questionsPerStep = 5;
  const totalQuestionSteps = Math.ceil(EMPLOYEE_QUESTIONS.length / questionsPerStep);
  const totalSteps = 2 + totalQuestionSteps + 1; // Intro + General + Questions + Open

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-12">
           <Logo showText={false} className="scale-150" />
        </div>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-emerald-50 p-6 rounded-full mb-8">
          <CheckCircle2 className="w-16 h-16 text-emerald-500" />
        </motion.div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-4 uppercase tracking-tight">Pesquisa Concluída!</h2>
        <p className="text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
          Obrigado pela participação. Suas respostas foram enviadas com segurança e serão processadas anonimamente para a melhoria contínua da sua empresa.
        </p>
        <div className="mt-12 flex flex-col items-center gap-2">
           <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Diagnosticado por</p>
           <Logo className="opacity-50 grayscale" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden flex flex-col">
        {/* Progress Header */}
        <div className="bg-slate-900 px-8 py-10 text-white text-center relative overflow-hidden">
          <div className="absolute bottom-0 left-0 h-1.5 bg-brand-500 transition-all duration-500 z-10" style={{ width: `${(step / (totalSteps - 1)) * 100}%` }} />
          <div className="flex flex-col items-center relative z-20">
             <Logo variant="light" className="mb-4" />
             <div className="w-12 h-0.5 bg-brand-500/30 mb-4" />
             <h1 className="text-sm font-black tracking-widest uppercase">{company?.razaoSocial || 'Inventário de Riscos Psicossociais'}</h1>
             <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-[0.2em] font-black italic">Diagnóstico NR-01 • 100% Anônimo</p>
          </div>
        </div>

        <div className="flex-1 p-8 md:p-12">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div 
                key="intro"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-brand-50 p-6 rounded-2xl text-brand-900 border border-brand-100">
                  <p className="text-sm font-bold leading-relaxed">
                    Bem-vindo ao canal de diagnóstico da Ventura TC. Esta ferramenta é fundamental para o Gerenciamento de Riscos Ocupacionais (GRO).
                  </p>
                  <p className="mt-4 text-xs font-medium text-brand-700 leading-relaxed">
                    Analisaremos fatores que afetam o bem-estar e a segurança psicológica no seu trabalho. Suas respostas são tratadas estatisticamente e o anonimato é garantido por lei (LGPD).
                  </p>
                </div>
                <div className="flex items-center gap-4 text-slate-500 text-sm">
                   <div className="flex -space-x-2">
                     {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" />)}
                   </div>
                   <span className="font-bold text-xs uppercase tracking-tight">Colaboradores da sua empresa estão participando.</span>
                </div>
                <button 
                  onClick={() => setStep(1)}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-100 active:scale-95"
                >
                  Iniciar Diagnóstico <ArrowRight className="w-5 h-5" />
                </button>
                <p className="text-center text-xs text-slate-400">Tempo estimado: 5 a 8 minutos</p>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div 
                key="general"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Dados de Atividade</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Setor</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Logística, RH, Produção..." 
                      className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => handleAnswer('sector', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Tempo de Empresa</label>
                    <select 
                      className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => handleAnswer('tenure', e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      <option>Menos de 3 meses</option>
                      <option>3 a 12 meses</option>
                      <option>1 a 3 anos</option>
                      <option>3 a 5 anos</option>
                      <option>Mais de 5 anos</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button onClick={() => setStep(0)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Voltar</button>
                  <button onClick={() => setStep(2)} className="flex-1 bg-blue-600 text-white py-4 font-bold rounded-xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2">Próximo <ArrowRight className="w-5 h-5"/></button>
                </div>
              </motion.div>
            )}

            {step >= 2 && step < totalSteps - 1 && (
              <motion.div 
                key={`step-${step}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {EMPLOYEE_QUESTIONS.slice((step - 2) * questionsPerStep, (step - 2 + 1) * questionsPerStep).map((q) => (
                  <div key={q.id} className="space-y-4">
                    <p className="text-lg font-bold text-slate-800 leading-snug">{q.id}. {q.text}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(q.type === 'scale' ? SCALE_LABELS : FREQUENCY_LABELS).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => handleAnswer(q.id.toString(), parseInt(val))}
                          className={cn(
                            "flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all text-left",
                            answers[q.id.toString()] === parseInt(val)
                              ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100"
                              : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-blue-50/30"
                          )}
                        >
                          {label}
                          {answers[q.id.toString()] === parseInt(val) && <CheckCircle2 className="w-4 h-4 ml-2" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex gap-4 pt-6">
                  <button onClick={() => setStep(step - 1)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Voltar</button>
                  <button 
                    onClick={() => setStep(step + 1)} 
                    className="flex-1 bg-blue-600 text-white py-4 font-bold rounded-xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                  >
                    Próximo <ArrowRight className="w-5 h-5"/>
                  </button>
                </div>
              </motion.div>
            )}

            {step === totalSteps - 1 && (
              <motion.div 
                key="open"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-900">Percepção Final</h3>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">O que poderia melhorar no ambiente de trabalho?</label>
                    <textarea 
                      rows={4}
                      className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => handleAnswer('suggestions', e.target.value)}
                      placeholder="Sua opinião é importante..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Em uma escala de 0 a 10, o quanto o ambiente é saudável?</label>
                    <input 
                      type="range" min="0" max="10" step="1" 
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      onChange={(e) => handleAnswer('healthScore', parseInt(e.target.value))}
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Nada Saudável</span>
                      <span className="text-blue-600 text-base">{answers['healthScore'] || 0}</span>
                      <span>Muito Saudável</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button onClick={() => setStep(step - 1)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Voltar</button>
                  <button 
                    onClick={submitForm}
                    disabled={isSubmitting}
                    className="flex-1 bg-green-600 text-white py-4 font-bold rounded-xl shadow-lg shadow-green-100 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Finalizar Pesquisa
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-8 text-slate-400 text-xs font-medium text-center max-w-sm leading-relaxed">
        Suas respostas são protegidas por criptografia e tratadas de acordo com as normas de anonimato da NR-1.
      </p>
    </div>
  );
}
