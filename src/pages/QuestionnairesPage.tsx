/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { api, Questionnaire, QuestionnaireFormType, QuestionnaireQuestion } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  ClipboardList,
  Plus,
  Loader2,
  Building2,
  Users,
  FileText,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SCALE_OPTIONS, FREQUENCY_OPTIONS } from '../../shared/questionnaires';

type QuestionDraft = {
  id?: string;
  questionKey: string;
  text: string;
  description: string;
  category: string;
  type: QuestionnaireQuestion['type'];
  required: boolean;
  isNegative: boolean;
  weight: number;
  position: number;
  optionsText: string;
  min: string;
  max: string;
  displayRange: boolean;
  active: boolean;
};

const emptyDraft: QuestionDraft = {
  questionKey: '',
  text: '',
  description: '',
  category: 'Geral',
  type: 'scale',
  required: true,
  isNegative: false,
  weight: 1,
  position: 1,
  optionsText: '',
  min: '',
  max: '',
  displayRange: false,
  active: true,
};

function optionsToText(question?: QuestionnaireQuestion | null) {
  return (question?.options || [])
    .map((option) => [option.label, option.value, option.score ?? ''].join('|').replace(/\|$/g, ''))
    .join('\n');
}

function parseOptions(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, value, score] = line.split('|').map((item) => item?.trim());
      const numericScore = Number(score);
      return {
        label: label || value || line,
        value: value || label || line,
        ...(Number.isFinite(numericScore) ? { score: numericScore } : {}),
      };
    });
}

function questionToDraft(question: QuestionnaireQuestion): QuestionDraft {
  return {
    id: question.id,
    questionKey: question.questionKey,
    text: question.text,
    description: question.description || '',
    category: question.category,
    type: question.type,
    required: question.required,
    isNegative: question.isNegative,
    weight: question.weight,
    position: question.position,
    optionsText: optionsToText(question),
    min: question.scoring?.min !== undefined ? String(question.scoring.min) : '',
    max: question.scoring?.max !== undefined ? String(question.scoring.max) : '',
    displayRange: question.config?.display === 'range',
    active: question.active,
  };
}

function serializeDraft(draft: QuestionDraft) {
  let options: Array<{ value: string | number | boolean; label: string; score?: number }> = parseOptions(draft.optionsText);
  if (draft.type === 'scale') options = SCALE_OPTIONS;
  if (draft.type === 'frequency') options = FREQUENCY_OPTIONS;

  const min = Number(draft.min);
  const max = Number(draft.max);
  const hasNumberScoring = draft.type === 'number' && Number.isFinite(min) && Number.isFinite(max) && max !== min;

  return {
    questionKey: draft.questionKey,
    text: draft.text,
    description: draft.description,
    category: draft.category,
    type: draft.type,
    required: draft.required,
    isNegative: draft.isNegative,
    weight: draft.weight,
    position: draft.position,
    options,
    scoring: hasNumberScoring ? { min, max } : {},
    config: hasNumberScoring && draft.displayRange ? { display: 'range', min, max, step: 1 } : {},
    active: draft.active,
  };
}

export default function QuestionnairesPage() {
  usePageTitle('VTC - Motor de Questionários');
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [draft, setDraft] = useState<QuestionDraft>(emptyDraft);
  const [newForm, setNewForm] = useState({
    name: '',
    description: '',
    formType: 'employee' as QuestionnaireFormType,
    companyId: '',
    inheritFromId: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ questionnaires }, { companies }] = await Promise.all([api.listQuestionnaires(), api.listCompanies()]);
      setQuestionnaires(questionnaires);
      setCompanies(companies);
      setSelectedId((current) => current || questionnaires[0]?.id || null);
    } catch (error) {
      console.error('Erro ao carregar questionários:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const { questionnaire } = await api.questionnaire(id);
      setSelected(questionnaire);
    } catch (error) {
      console.error('Erro ao carregar questionário:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
  }, [selectedId]);

  const defaultQuestionnaires = useMemo(
    () => questionnaires.filter((questionnaire) => !questionnaire.companyId && questionnaire.formType === newForm.formType),
    [questionnaires, newForm.formType]
  );

  const openCreateQuestion = () => {
    const nextPosition = Math.max(0, ...(selected?.questions || []).map((question) => question.position)) + 1;
    setDraft({ ...emptyDraft, questionKey: `q${nextPosition}`, position: nextPosition });
    setQuestionModalOpen(true);
  };

  const openEditQuestion = (question: QuestionnaireQuestion) => {
    setDraft(questionToDraft(question));
    setQuestionModalOpen(true);
  };

  const saveQuestion = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload = serializeDraft(draft);
      const result = draft.id
        ? await api.updateQuestionnaireQuestion(selected.id, draft.id, payload)
        : await api.createQuestionnaireQuestion(selected.id, payload);
      setSelected(result.questionnaire);
      await fetchData();
      setQuestionModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar pergunta:', error);
      alert('Erro ao salvar pergunta. Verifique chave, texto e opções.');
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (question: QuestionnaireQuestion) => {
    if (!selected || !confirm('Remover esta pergunta do questionário?')) return;
    setSaving(true);
    try {
      const result = await api.deleteQuestionnaireQuestion(selected.id, question.id);
      setSelected(result.questionnaire);
      await fetchData();
    } catch (error) {
      console.error('Erro ao remover pergunta:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveQuestionnaireMeta = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { questionnaire } = await api.updateQuestionnaire(selected.id, {
        name: selected.name,
        description: selected.description,
        status: selected.status,
      });
      setSelected(questionnaire);
      await fetchData();
    } catch (error) {
      console.error('Erro ao salvar questionário:', error);
    } finally {
      setSaving(false);
    }
  };

  const createQuestionnaire = async () => {
    setSaving(true);
    try {
      const { questionnaire } = await api.createQuestionnaire({
        ...newForm,
        companyId: newForm.companyId || undefined,
        inheritFromId: newForm.inheritFromId || undefined,
      });
      setFormModalOpen(false);
      setNewForm({ name: '', description: '', formType: 'employee', companyId: '', inheritFromId: '' });
      await fetchData();
      setSelectedId(questionnaire.id);
    } catch (error) {
      console.error('Erro ao criar questionário:', error);
      alert('Erro ao criar questionário.');
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total: questionnaires.length,
    companySpecific: questionnaires.filter((questionnaire) => questionnaire.companyId).length,
    employee: questionnaires.filter((questionnaire) => questionnaire.formType === 'employee').length,
    company: questionnaires.filter((questionnaire) => questionnaire.formType === 'company').length,
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Motor de Questionários</h1>
          <p className="text-slate-500 mt-1">Controle perguntas, pesos e formulários específicos por empresa.</p>
        </div>
        <button
          onClick={() => setFormModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-brand-100"
        >
          <Plus className="w-5 h-5" /> Novo Formulário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Formulários', value: stats.total, icon: ClipboardList },
          { label: 'Por Empresa', value: stats.companySpecific, icon: Building2 },
          { label: 'Colaborador', value: stats.employee, icon: Users },
          { label: 'Institucional', value: stats.company, icon: FileText },
        ].map((item) => (
          <div key={item.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-brand-50 text-brand-600">
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
              <p className="text-2xl font-black text-slate-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-8">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-black text-slate-900">Biblioteca</h2>
          </div>
          {loading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[720px] overflow-y-auto">
              {questionnaires.map((questionnaire) => (
                <button
                  key={questionnaire.id}
                  onClick={() => setSelectedId(questionnaire.id)}
                  className={cn(
                    'w-full p-5 text-left hover:bg-slate-50 transition-all',
                    selectedId === questionnaire.id && 'bg-brand-50/70'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900 leading-tight">{questionnaire.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {questionnaire.formType === 'employee' ? 'Colaboradores' : 'Institucional'}
                        {questionnaire.companyName ? ` • ${questionnaire.companyName}` : ' • Padrão'}
                      </p>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 rounded-full px-2 py-1">
                      v{questionnaire.version}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                    <span className="text-brand-700 bg-brand-50 px-2 py-1 rounded-full">{questionnaire.questionCount} perguntas</span>
                    <span className={cn(
                      'px-2 py-1 rounded-full',
                      questionnaire.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                    )}>
                      {questionnaire.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm min-h-[720px]">
          {detailLoading || !selected ? (
            <div className="h-full min-h-[520px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
          ) : (
            <div className="p-8 space-y-8">
              <div className="flex flex-col gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-brand-700 bg-brand-50 px-3 py-1 rounded-full">
                      {selected.formType === 'employee' ? 'Colaboradores' : 'Institucional'}
                    </span>
                    {selected.companyName && (
                      <span className="text-xs font-black uppercase tracking-widest text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                        {selected.companyName}
                      </span>
                    )}
                    {selected.parentName && (
                      <span className="text-xs font-bold text-slate-400">Herdado de {selected.parentName}</span>
                    )}
                  </div>
                  <input
                    value={selected.name}
                    onChange={(event) => setSelected((current) => current ? { ...current, name: event.target.value } : current)}
                    className="w-full text-2xl font-black text-slate-900 tracking-tight border-none outline-none bg-transparent"
                  />
                  <textarea
                    value={selected.description || ''}
                    onChange={(event) => setSelected((current) => current ? { ...current, description: event.target.value } : current)}
                    className="w-full text-sm text-slate-500 border border-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-brand-500"
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-3 self-end">
                  <select
                    value={selected.status}
                    onChange={(event) => setSelected((current) => current ? { ...current, status: event.target.value as Questionnaire['status'] } : current)}
                    className="p-2.5 rounded-xl border border-slate-200 text-sm font-bold"
                  >
                    <option value="active">Ativo</option>
                    <option value="draft">Rascunho</option>
                    <option value="archived">Arquivado</option>
                  </select>
                  <button
                    onClick={saveQuestionnaireMeta}
                    disabled={saving}
                    className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Perguntas</h3>
                  <p className="text-sm text-slate-500">A pontuação é recalculada no backend a partir destes pesos e opções.</p>
                </div>
                <button
                  onClick={openCreateQuestion}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-100"
                >
                  <Plus className="w-4 h-4" /> Pergunta
                </button>
              </div>

              <div className="space-y-3">
                {(selected.questions || []).map((question) => (
                  <div
                    key={question.id}
                    className={cn(
                      'p-5 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4',
                      question.active ? 'border-slate-100 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 rounded-full px-2 py-1">{question.position}</span>
                        <span className="text-[10px] font-black bg-blue-50 text-blue-700 rounded-full px-2 py-1">{question.category}</span>
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 rounded-full px-2 py-1">{question.type}</span>
                        {question.isNegative && <span className="text-[10px] font-black bg-red-50 text-red-600 rounded-full px-2 py-1">invertida</span>}
                      </div>
                      <p className="font-bold text-slate-900">{question.text}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        chave: {question.questionKey} • peso: {question.weight}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditQuestion(question)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteQuestion(question)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">Novo Formulário</h2>
              <button onClick={() => setFormModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-5">
              <label className="space-y-2 block">
                <span className="text-sm font-bold text-slate-700">Tipo</span>
                <select
                  value={newForm.formType}
                  onChange={(event) => setNewForm((current) => ({ ...current, formType: event.target.value as QuestionnaireFormType, inheritFromId: '' }))}
                  className="w-full p-3 rounded-xl border border-slate-200"
                >
                  <option value="employee">Colaboradores</option>
                  <option value="company">Institucional</option>
                </select>
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-bold text-slate-700">Empresa específica</span>
                <select
                  value={newForm.companyId}
                  onChange={(event) => setNewForm((current) => ({ ...current, companyId: event.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-200"
                >
                  <option value="">Nenhuma, criar formulário global</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.razaoSocial}</option>)}
                </select>
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-bold text-slate-700">Herdar perguntas de</span>
                <select
                  value={newForm.inheritFromId}
                  onChange={(event) => setNewForm((current) => ({ ...current, inheritFromId: event.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-200"
                >
                  <option value="">Padrão ativo do tipo</option>
                  {defaultQuestionnaires.map((questionnaire) => <option key={questionnaire.id} value={questionnaire.id}>{questionnaire.name}</option>)}
                </select>
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-bold text-slate-700">Nome</span>
                <input value={newForm.name} onChange={(event) => setNewForm((current) => ({ ...current, name: event.target.value }))} className="w-full p-3 rounded-xl border border-slate-200" />
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-bold text-slate-700">Descrição</span>
                <textarea value={newForm.description} onChange={(event) => setNewForm((current) => ({ ...current, description: event.target.value }))} className="w-full p-3 rounded-xl border border-slate-200" rows={3} />
              </label>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setFormModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
                <button onClick={createQuestionnaire} disabled={saving} className="bg-brand-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {questionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">{draft.id ? 'Editar Pergunta' : 'Nova Pergunta'}</h2>
              <button onClick={() => setQuestionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-5 overflow-y-auto">
              <div className="grid md:grid-cols-3 gap-4">
                <label className="space-y-2 block">
                  <span className="text-sm font-bold text-slate-700">Chave</span>
                  <input value={draft.questionKey} onChange={(event) => setDraft((current) => ({ ...current, questionKey: event.target.value }))} className="w-full p-3 rounded-xl border border-slate-200" />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-bold text-slate-700">Categoria</span>
                  <input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} className="w-full p-3 rounded-xl border border-slate-200" />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-bold text-slate-700">Tipo</span>
                  <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as QuestionDraft['type'] }))} className="w-full p-3 rounded-xl border border-slate-200">
                    <option value="scale">Escala</option>
                    <option value="frequency">Frequência</option>
                    <option value="single_choice">Escolha única</option>
                    <option value="select">Lista</option>
                    <option value="text">Texto curto</option>
                    <option value="textarea">Texto longo</option>
                    <option value="number">Número</option>
                    <option value="email">E-mail</option>
                    <option value="checkbox">Confirmação</option>
                  </select>
                </label>
              </div>

              <label className="space-y-2 block">
                <span className="text-sm font-bold text-slate-700">Pergunta</span>
                <textarea value={draft.text} onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))} className="w-full p-3 rounded-xl border border-slate-200" rows={3} />
              </label>
              <label className="space-y-2 block">
                <span className="text-sm font-bold text-slate-700">Descrição auxiliar</span>
                <input value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="w-full p-3 rounded-xl border border-slate-200" />
              </label>

              <div className="grid md:grid-cols-4 gap-4">
                <label className="space-y-2 block">
                  <span className="text-sm font-bold text-slate-700">Posição</span>
                  <input type="number" value={draft.position} onChange={(event) => setDraft((current) => ({ ...current, position: Number(event.target.value || 0) }))} className="w-full p-3 rounded-xl border border-slate-200" />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-bold text-slate-700">Peso</span>
                  <input type="number" step="0.1" value={draft.weight} onChange={(event) => setDraft((current) => ({ ...current, weight: Number(event.target.value || 1) }))} className="w-full p-3 rounded-xl border border-slate-200" />
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 mt-7">
                  <input type="checkbox" checked={draft.required} onChange={(event) => setDraft((current) => ({ ...current, required: event.target.checked }))} />
                  <span className="text-sm font-bold text-slate-700">Obrigatória</span>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 mt-7">
                  <input type="checkbox" checked={draft.isNegative} onChange={(event) => setDraft((current) => ({ ...current, isNegative: event.target.checked }))} />
                  <span className="text-sm font-bold text-slate-700">Pontuação invertida</span>
                </label>
              </div>

              {(draft.type === 'single_choice' || draft.type === 'select') && (
                <label className="space-y-2 block">
                  <span className="text-sm font-bold text-slate-700">Opções</span>
                  <textarea
                    value={draft.optionsText}
                    onChange={(event) => setDraft((current) => ({ ...current, optionsText: event.target.value }))}
                    className="w-full p-3 rounded-xl border border-slate-200 font-mono text-xs"
                    rows={5}
                    placeholder="Sim|Sim|100&#10;Parcialmente|Parcialmente|50&#10;Não|Não|0"
                  />
                  <p className="text-xs text-slate-400">Formato por linha: rótulo|valor|pontuação. A pontuação é opcional.</p>
                </label>
              )}

              {draft.type === 'number' && (
                <div className="grid md:grid-cols-3 gap-4">
                  <label className="space-y-2 block">
                    <span className="text-sm font-bold text-slate-700">Mínimo</span>
                    <input value={draft.min} onChange={(event) => setDraft((current) => ({ ...current, min: event.target.value }))} className="w-full p-3 rounded-xl border border-slate-200" />
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-sm font-bold text-slate-700">Máximo</span>
                    <input value={draft.max} onChange={(event) => setDraft((current) => ({ ...current, max: event.target.value }))} className="w-full p-3 rounded-xl border border-slate-200" />
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 mt-7">
                    <input type="checkbox" checked={draft.displayRange} onChange={(event) => setDraft((current) => ({ ...current, displayRange: event.target.checked }))} />
                    <span className="text-sm font-bold text-slate-700">Exibir como régua</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setQuestionModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
                <button onClick={saveQuestion} disabled={saving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Pergunta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
