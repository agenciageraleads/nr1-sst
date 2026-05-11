/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  where,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { usePageTitle } from '../hooks/usePageTitle';
import { 
  ClipboardList, 
  Plus, 
  Copy, 
  Link as LinkIcon, 
  ExternalLink,
  Loader2,
  X,
  CheckCircle2,
  Trash2,
  Calendar,
  Building2,
  Eye,
  Users
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link, useSearchParams } from 'react-router-dom';

const campaignSchema = z.object({
  companyId: z.string().min(1, 'Empresa obrigatória'),
  name: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  employeeFormMode: z.enum(['completo', 'enxuto']),
  status: z.enum(['rascunho', 'ativa', 'encerrada']),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

export default function CampaignsPage() {
  usePageTitle('VTC - Gestão de Campanhas');
  const [searchParams, setSearchParams] = useSearchParams();
  const filterCompanyId = searchParams.get('companyId');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { status: 'ativa', employeeFormMode: 'completo' }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const qCamps = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
      const snapCamps = await getDocs(qCamps);
      
      const qComps = query(collection(db, 'companies'), where('status', '==', 'ativa'));
      const snapComps = await getDocs(qComps);
      
      const companiesData = snapComps.docs.reduce((acc: any, doc) => {
        acc[doc.id] = doc.data().razaoSocial;
        return acc;
      }, {});

      setCompanies(snapComps.docs.map(d => ({ id: d.id, ...d.data() })));
      
      setCampaigns(snapCamps.docs.map(doc => ({ 
        id: doc.id, 
        companyName: companiesData[doc.data().companyId] || 'Empresa Excluída',
        ...doc.data() 
      })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generateToken = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const onSubmit = async (data: CampaignFormValues) => {
    setIsSubmitting(true);
    try {
      const campaignToken = generateToken();
      const employeeToken = generateToken();
      
      await addDoc(collection(db, 'campaigns'), {
        ...data,
        companyFormToken: campaignToken,
        employeeFormToken: employeeToken,
        createdAt: serverTimestamp(),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      });
      setIsModalOpen(false);
      reset();
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'campaigns');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    const url = `${window.location.origin}${text}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;
    try {
      await deleteDoc(doc(db, 'campaigns', id));
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'campaigns/' + id);
    }
  };

  const filteredCampaigns = campaigns.filter(c => 
    !filterCompanyId || c.companyId === filterCompanyId
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Campanhas de Pesquisa</h1>
          <p className="text-slate-500 mt-1">Gerencie os diagnósticos psicossociais ativos.</p>
        </div>
        <div className="flex items-center gap-3">
          {filterCompanyId && (
            <button
              onClick={() => setSearchParams({})}
              className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100"
            >
              Limpar Filtro
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-brand-100"
          >
            <Plus className="w-5 h-5" /> Nova Campanha
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
           <Loader2 className="w-10 h-10 animate-spin mb-4 text-brand-600" />
           Carregando campanhas...
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
          <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
             <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Nenhuma campanha encontrada</h3>
          <p className="text-slate-500 mt-1">
            {filterCompanyId ? 'Não existem campanhas cadastradas para esta empresa.' : 'Crie uma nova campanha para começar a coletar dados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-blue-200 transition-all"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={cn(
                   "p-4 rounded-xl",
                   campaign.status === 'ativa' ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"
                )}>
                  <ClipboardList className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-slate-900">{campaign.name}</h3>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      campaign.status === 'ativa' ? "bg-green-50 text-green-600 border-green-100" : "bg-slate-50 text-slate-500 border-slate-200"
                    )}>
                      {campaign.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium"><Building2 className="w-4 h-4 text-slate-400" /> {campaign.companyName}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> {format(campaign.startDate.toDate(), "dd 'de' MMM", { locale: ptBR })} - {format(campaign.endDate.toDate(), "dd 'de' MMM", { locale: ptBR })}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                   <button 
                    onClick={() => copyToClipboard(`/formulario/empresa/${campaign.companyFormToken}`, `inst-${campaign.id}`)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg text-xs font-bold text-slate-700 hover:text-blue-600 transition-all shadow-sm border border-slate-100"
                   >
                     {copiedId === `inst-${campaign.id}` ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <LinkIcon className="w-3.5 h-3.5" />}
                     Link Empresa
                   </button>
                   <button 
                    onClick={() => copyToClipboard(`/formulario/colaborador/${campaign.employeeFormToken}`, `colab-${campaign.id}`)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg text-xs font-bold text-slate-700 hover:text-blue-600 transition-all shadow-sm border border-slate-100"
                   >
                     {copiedId === `colab-${campaign.id}` ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Users className="w-3.5 h-3.5" />}
                     Link Colab.
                   </button>
                </div>

                <div className="flex items-center gap-2">
                   <Link 
                    to={`/campanhas/${campaign.id}/resultados`}
                    className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                    title="Ver Resultados"
                   >
                     <Eye className="w-5 h-5" />
                   </Link>
                   <button 
                    onClick={() => handleDelete(campaign.id)}
                    className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                    title="Excluir"
                   >
                     <Trash2 className="w-5 h-5" />
                   </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Nova Campanha */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">Abrir Nova Campanha</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Empresa Cliente</label>
                    <select {...register('companyId')} className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500">
                      <option value="">Selecione uma empresa...</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.razaoSocial}</option>)}
                    </select>
                    {errors.companyId && <p className="text-xs text-red-500 font-medium">{errors.companyId.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nome da Campanha</label>
                    <input {...register('name')} placeholder="Ex: Diagnóstico 2024 - Matriz" className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500" />
                    {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Início</label>
                      <input type="date" {...register('startDate')} className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Encerramento</label>
                      <input type="date" {...register('endDate')} className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Modo do Formulário</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 p-3 border rounded-xl flex-1 cursor-pointer hover:bg-slate-50 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 transition-all">
                        <input type="radio" {...register('employeeFormMode')} value="completo" className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold">Completo</span>
                      </label>
                      <label className="flex items-center gap-2 p-3 border rounded-xl flex-1 cursor-pointer hover:bg-slate-50 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 transition-all">
                        <input type="radio" {...register('employeeFormMode')} value="enxuto" className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold">Enxuto</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Ativar Campanha
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
