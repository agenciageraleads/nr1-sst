/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import Papa from 'papaparse';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { usePageTitle } from '../hooks/usePageTitle';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreVertical, 
  Mail, 
  Phone, 
  MapPin, 
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { cn, validateCNPJ, formatCNPJ } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';

const companySchema = z.object({
  razaoSocial: z.string().min(3, 'Mínimo 3 caracteres'),
  nomeFantasia: z.string().optional(),
  cnpj: z.string().refine((val) => validateCNPJ(val), {
    message: 'CNPJ inválido (Formato: 00.000.000/0001-00)',
  }),
  cidade: z.string().min(2, 'Cidade obrigatória'),
  uf: z.string().length(2, 'UF deve ter 2 caracteres'),
  ramoAtividade: z.string().min(3, 'Obrigatório'),
  numeroColaboradores: z.string(),
  responsavelNome: z.string().min(3, 'Obrigatório'),
  responsavelEmail: z.string().email('E-mail inválido'),
  responsavelTelefone: z.string().optional(),
  status: z.enum(['ativa', 'inativa']),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export default function CompaniesPage() {
  usePageTitle('VTC - Gestão de Empresas');
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: { status: 'ativa' }
  });

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCompanies(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const onSubmit = async (data: CompanyFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingCompany) {
        // When updating, we must include all required fields by firestore.rules
        await updateDoc(doc(db, 'companies', editingCompany.id), {
          ...data,
          createdAt: editingCompany.createdAt, // Stay with original createdAt as required by rules
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'companies'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
      setEditingCompany(null);
      reset();
      fetchCompanies();
    } catch (error) {
       handleFirestoreError(
         error, 
         editingCompany ? OperationType.UPDATE : OperationType.CREATE, 
         'companies'
       );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setEditingCompany(null);
    reset({
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      cidade: '',
      uf: '',
      ramoAtividade: '',
      numeroColaboradores: '',
      responsavelNome: '',
      responsavelEmail: '',
      responsavelTelefone: '',
      status: 'ativa'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (company: any) => {
    setEditingCompany(company);
    reset({
      razaoSocial: company.razaoSocial,
      nomeFantasia: company.nomeFantasia || '',
      cnpj: company.cnpj,
      cidade: company.cidade,
      uf: company.uf,
      ramoAtividade: company.ramoAtividade,
      numeroColaboradores: company.numeroColaboradores,
      responsavelNome: company.responsavelNome,
      responsavelEmail: company.responsavelEmail,
      responsavelTelefone: company.responsavelTelefone || '',
      status: company.status
    });
    setIsModalOpen(true);
  };

  const handleImportCSV = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        let successCount = 0;
        let errorCount = 0;

        for (const row of rows) {
          try {
            // Basic mapping and validation
            const companyData = {
              razaoSocial: row.razaoSocial || row['Razão Social'] || '',
              nomeFantasia: row.nomeFantasia || row['Nome Fantasia'] || '',
              cnpj: row.cnpj || row['CNPJ'] || '',
              cidade: row.cidade || row['Cidade'] || '',
              uf: (row.uf || row['UF'] || '').substring(0, 2).toUpperCase(),
              ramoAtividade: row.ramoAtividade || row['Ramo de Atividade'] || '',
              numeroColaboradores: String(row.numeroColaboradores || row['Nº Colaboradores'] || '0'),
              responsavelNome: row.responsavelNome || row['Responsável'] || '',
              responsavelEmail: row.responsavelEmail || row['E-mail'] || '',
              responsavelTelefone: row.responsavelTelefone || row['Telefone'] || '',
              status: 'ativa',
              createdAt: serverTimestamp()
            };

            if (companyData.razaoSocial && companyData.cnpj) {
              await addDoc(collection(db, 'companies'), companyData);
              successCount++;
            } else {
              errorCount++;
            }
          } catch (err) {
            console.error('Erro ao importar linha:', err);
            errorCount++;
          }
        }

        alert(`Importação concluída!\nSucesso: ${successCount}\nErros: ${errorCount}`);
        setIsImporting(false);
        fetchCompanies();
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: (err) => {
        console.error('Erro ao ler CSV:', err);
        alert('Erro ao ler o arquivo CSV.');
        setIsImporting(false);
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = "razaoSocial,nomeFantasia,cnpj,ramoAtividade,numeroColaboradores,cidade,uf,responsavelNome,responsavelEmail,responsavelTelefone\n" +
      "Empresa Exemplo LTDA,Exemplo,00.000.000/0001-00,Indústria,100,São Paulo,SP,João Silva,joao@exemplo.com,11999999999";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_empresas.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCompanies = companies.filter(c => 
    c.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.cnpj.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Empresas Clientes</h1>
          <p className="text-slate-500 mt-1">Gerencie as organizações que utilizam a plataforma.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadTemplate}
            className="text-slate-500 hover:text-blue-600 text-sm font-bold flex items-center gap-1.5 transition-colors"
          >
            Baixar Modelo
          </button>
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleImportCSV}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-bold border border-slate-200 flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Importar Planilha
          </button>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
          >
            <CheckCircle2 className="w-5 h-5" /> Nova Empresa
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
          />
        </div>
      </div>

      {/* Companies List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 italic text-slate-400">
           <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
           Buscando empresas cadastradas...
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
          <div className="bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
             <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Nenhuma empresa encontrada</h3>
          <p className="text-slate-500 mt-1">Experimente mudar o filtro ou cadastrar uma nova.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <motion.div
              key={company.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="bg-slate-50 p-3 rounded-xl group-hover:bg-blue-50 transition-colors">
                  <Building2 className="w-6 h-6 text-slate-600 group-hover:text-blue-600" />
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  company.status === 'ativa' ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-500"
                )}>
                  {company.status}
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1 leading-tight line-clamp-1">{company.razaoSocial}</h3>
              <p className="text-sm text-slate-500 mb-4">{company.cnpj}</p>
              
              <div className="space-y-2 mb-6 border-t border-slate-50 pt-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" /> {company.cidade}/{company.uf}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                   <Mail className="w-4 h-4 text-slate-400" /> {company.responsavelEmail}
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => openEditModal(company)}
                  className="flex-1 py-2 text-sm font-bold text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all border border-slate-100"
                >
                  Editar
                </button>
                <button 
                  onClick={() => navigate(`/campanhas?companyId=${company.id}`)}
                  className="flex-1 py-2 text-sm font-bold text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-all"
                >
                  Ver Campanhas
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Cadastro */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingCompany ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Razão Social</label>
                    <input {...register('razaoSocial')} className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500" />
                    {errors.razaoSocial && <p className="text-xs text-red-500 font-medium">{errors.razaoSocial.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nome Fantasia (Opcional)</label>
                    <input {...register('nomeFantasia')} className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">CNPJ</label>
                    <input 
                      {...register('cnpj')} 
                      placeholder="00.000.000/0001-00" 
                      onChange={(e) => {
                        const formatted = formatCNPJ(e.target.value);
                        e.target.value = formatted;
                        register('cnpj').onChange(e);
                      }}
                      className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500" 
                    />
                    {errors.cnpj && <p className="text-xs text-red-500 font-medium">{errors.cnpj.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Ramo de Atividade</label>
                    <input {...register('ramoAtividade')} placeholder="Ex: Indústria Metalúrgica" className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500" />
                    {errors.ramoAtividade && <p className="text-xs text-red-500 font-medium">{errors.ramoAtividade.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nº de Colaboradores</label>
                    <input type="number" {...register('numeroColaboradores')} placeholder="Ex: 50" className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500" />
                    {errors.numeroColaboradores && <p className="text-xs text-red-500 font-medium">{errors.numeroColaboradores.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Cidade</label>
                    <input {...register('cidade')} className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500" />
                    {errors.cidade && <p className="text-xs text-red-500 font-medium">{errors.cidade.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">UF</label>
                    <input {...register('uf')} maxLength={2} placeholder="Ex: SP" className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 uppercase" />
                    {errors.uf && <p className="text-xs text-red-500 font-medium">{errors.uf.message}</p>}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Responsável Interno</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Nome do Responsável</label>
                      <input {...register('responsavelNome')} className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500" />
                      {errors.responsavelNome && <p className="text-xs text-red-500 font-medium">{errors.responsavelNome.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">E-mail</label>
                      <input {...register('responsavelEmail')} className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500" />
                      {errors.responsavelEmail && <p className="text-xs text-red-500 font-medium">{errors.responsavelEmail.message}</p>}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingCompany(null);
                    }}
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
                    {editingCompany ? 'Atualizar Empresa' : 'Salvar Empresa'}
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
