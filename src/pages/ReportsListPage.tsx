/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  FileText, 
  Search, 
  ChevronRight, 
  Building2, 
  Calendar,
  Users,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CampaignWithStats {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  status: string;
  createdAt: any;
  employeeResponsesCount: number;
  companyResponseSubmitted: boolean;
}

import { usePageTitle } from '../hooks/usePageTitle';

export default function ReportsListPage() {
  usePageTitle('VTC - Lista de Relatórios');
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all campaigns
      const campaignsSnap = await getDocs(query(collection(db, 'campaigns'), orderBy('createdAt', 'desc')));
      const campaignsData = campaignsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      // Fetch all companies to map names
      const companiesSnap = await getDocs(collection(db, 'companies'));
      const companiesMap = companiesSnap.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data().razaoSocial;
        return acc;
      }, {} as Record<string, string>);

      // For each campaign, get counts
      const enrichedCampaigns = await Promise.all(campaignsData.map(async (camp: any) => {
        // Employee responses count
        const empSnap = await getDocs(query(
          collection(db, 'employee_responses'),
          where('campaignId', '==', camp.id)
        ));
        
        // Company response check
        const compSnap = await getDocs(query(
          collection(db, 'company_responses'),
          where('campaignId', '==', camp.id)
        ));

        return {
          ...camp,
          companyName: companiesMap[camp.companyId] || 'Empresa não encontrada',
          employeeResponsesCount: empSnap.size,
          companyResponseSubmitted: !compSnap.empty
        };
      }));

      setCampaigns(enrichedCampaigns);
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Biblioteca de Relatórios</h1>
          <p className="text-slate-500 mt-1">Acompanhe o engajamento e acesse os diagnósticos NR-1.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-wrap gap-4 shadow-sm">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por campanha ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
          <div className="w-10 h-10 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium">Carregando relatórios...</p>
        </div>
      ) : filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredCampaigns.map((camp) => (
            <Link 
              key={camp.id}
              to={`/campanhas/${camp.id}/resultados`}
              className="group bg-white p-6 rounded-2xl border border-slate-100 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-500/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{camp.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" /> {camp.companyName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> 
                      {camp.createdAt?.seconds ? format(new Date(camp.createdAt.seconds * 1000), "dd 'de' MMM, yyyy", { locale: ptBR }) : 'Data não disponível'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Colaboradores</p>
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <Users className="w-4 h-4 text-brand-500" />
                      {camp.employeeResponsesCount}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Institucional</p>
                    <div className="flex items-center gap-1.5 font-bold">
                      {camp.companyResponseSubmitted ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Concluído
                        </span>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-1">
                          <Clock className="w-4 h-4" /> Pendente
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white p-20 rounded-3xl border border-slate-100 text-center">
          <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Nenhum relatório encontrado</h3>
          <p className="text-slate-500 mt-1">Experimente mudar o termo de busca ou inicie uma nova campanha.</p>
        </div>
      )}
    </div>
  );
}

