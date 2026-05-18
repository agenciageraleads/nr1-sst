/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Questionnaire, QuestionnaireQuestion } from '../lib/api';
import { Logo } from '../components/ui/Logo';
import { PublicQuestionField } from '../components/questionnaires/PublicQuestionField';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function groupQuestions(questions: QuestionnaireQuestion[]) {
  const groups: Array<{ category: string; questions: QuestionnaireQuestion[] }> = [];
  questions.forEach((question) => {
    const existing = groups.find((group) => group.category === question.category);
    if (existing) {
      existing.questions.push(question);
    } else {
      groups.push({ category: question.category, questions: [question] });
    }
  });
  return groups;
}

export default function CompanyForm() {
  usePageTitle('VTC - Diagnóstico Empresa');
  const { token } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  useEffect(() => {
    const fetchCampaignAndCompany = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const { campaign, company, questionnaire } = await api.publicCompanyForm(token);
        setCampaign(campaign);
        setCompany(company);
        setQuestionnaire(questionnaire);
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
      await api.submitCompanyResponse({
        campaignId: campaign.id,
        companyId: campaign.companyId,
        questionnaireId: questionnaire?.id,
        answers,
        submittedByEmail: answers['email'] || '',
        submittedByName: answers['name'] || ''
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Erro ao enviar formulario institucional:', error);
      alert('Não foi possível enviar. Confira se todas as perguntas obrigatórias foram respondidas.');
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
          A consultoria Ventura entrará em contato para os próximos passos.
        </p>
        <button onClick={() => navigate('/')} className="mt-10 px-8 py-3 bg-brand-600 text-white rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-brand-100">Voltar ao Início</button>
      </div>
    );
  }

  const groups = groupQuestions((questionnaire?.questions || []).filter((question) => question.active));
  const currentGroup = groups[step] || groups[0];
  const progress = groups.length > 1 ? (step / Math.max(1, groups.length - 1)) * 100 : 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 font-sans">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden flex flex-col">
        <div className="bg-slate-900 px-8 py-10 text-white relative flex flex-col items-center">
          <div className="absolute top-0 left-0 h-1.5 bg-brand-500 transition-all duration-500 z-10" style={{ width: `${progress}%` }} />
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
            <motion.div key={currentGroup?.category || 'empty'} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              {step === Math.max(0, groups.length - 1) && (
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 leading-relaxed font-medium">
                    Não informe nomes ou dados pessoais de saúde. Esta informação deve ser tratada apenas de forma coletiva e preventiva.
                  </p>
                </div>
              )}

              <div className="border-l-4 border-blue-600 pl-6 space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">{currentGroup?.category || 'Formulário'}</h2>
                <p className="text-slate-500 text-sm">{questionnaire?.name || 'Questionário institucional'}</p>
              </div>

              <div className="space-y-6">
                {(currentGroup?.questions || []).map((question, index) => (
                  <div key={question.id} className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700">
                      {index + 1}. {question.text}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {question.description && <p className="text-xs text-slate-500">{question.description}</p>}
                    <PublicQuestionField question={question} value={answers[question.questionKey]} onChange={(value) => handleAnswer(question.questionKey, value)} />
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(Math.max(0, step - 1))}
                  disabled={step === 0}
                  className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <ArrowLeft className="w-5 h-5" /> Voltar
                </button>
                <button
                  onClick={step >= groups.length - 1 ? submitForm : () => setStep(step + 1)}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  {step >= groups.length - 1 ? (
                    <>
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                      Finalizar Envio
                    </>
                  ) : (
                    <>
                      Próximo <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-8 text-slate-400 text-[10px] uppercase font-bold tracking-widest text-center">
        Powered by NR-1 Psicossocial • Gestão Inteligente de Riscos
      </p>
    </div>
  );
}
