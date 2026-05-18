/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Questionnaire } from '../lib/api';
import {
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { Logo } from '../components/ui/Logo';
import { PublicQuestionField } from '../components/questionnaires/PublicQuestionField';
import { usePageTitle } from '../hooks/usePageTitle';

export default function EmployeeForm() {
  usePageTitle('VTC - Diagnóstico Colaborador');
  const { token } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const { campaign, company, questionnaire } = await api.publicEmployeeForm(token || '');
        setCampaign(campaign);
        setCompany(company);
        setQuestionnaire(questionnaire);
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

  const submitForm = async () => {
    setIsSubmitting(true);
    try {
      await api.submitEmployeeResponse({
        campaignId: campaign.id,
        companyId: campaign.companyId,
        questionnaireId: questionnaire?.id,
        sector: answers['sector'] || 'Não Informado',
        roleType: answers['roleType'] || 'Não Informado',
        tenure: answers['tenure'] || 'Não Informado',
        workType: answers['workType'] || 'Não Informado',
        workSchedule: answers['workSchedule'] || 'Não Informado',
        answers,
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Erro ao enviar resposta do colaborador:', error);
      alert('Não foi possível enviar. Confira se todas as perguntas obrigatórias foram respondidas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const questions = (questionnaire?.questions || []).filter((question) => question.active);
  const questionsPerStep = 5;
  const totalQuestionSteps = Math.max(1, Math.ceil(questions.length / questionsPerStep));
  const totalSteps = 2 + totalQuestionSteps;

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
                    Bem-vindo ao canal de diagnóstico da Ventura. Esta ferramenta é fundamental para o Gerenciamento de Riscos Ocupacionais (GRO).
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

            {step >= 2 && step < totalSteps && (
              <motion.div
                key={`step-${step}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {questions.slice((step - 2) * questionsPerStep, (step - 1) * questionsPerStep).map((q, index) => (
                  <div key={q.id} className="space-y-4">
                    <p className="text-lg font-bold text-slate-800 leading-snug">
                      {(step - 2) * questionsPerStep + index + 1}. {q.text}
                      {q.required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    {q.description && <p className="text-sm text-slate-500">{q.description}</p>}
                    <PublicQuestionField question={q} value={answers[q.questionKey]} onChange={(value) => handleAnswer(q.questionKey, value)} />
                  </div>
                ))}

                <div className="flex gap-4 pt-6">
                  <button onClick={() => setStep(step - 1)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Voltar</button>
                  <button
                    onClick={step === totalSteps - 1 ? submitForm : () => setStep(step + 1)}
                    disabled={isSubmitting}
                    className={cn(
                      'flex-1 text-white py-4 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50',
                      step === totalSteps - 1 ? 'bg-green-600 shadow-green-100' : 'bg-blue-600 shadow-blue-100'
                    )}
                  >
                    {step === totalSteps - 1 ? (
                      <>
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        Finalizar Pesquisa
                      </>
                    ) : (
                      <>
                        Próximo <ArrowRight className="w-5 h-5"/>
                      </>
                    )}
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
