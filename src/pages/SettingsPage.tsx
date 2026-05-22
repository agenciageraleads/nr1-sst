/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { setCachedUser, useAuth } from '../hooks/useAuth';
import { 
  Settings as SettingsIcon, 
  UserPlus, 
  Trash2, 
  Mail, 
  Shield, 
  User,
  LogOut,
  CheckCircle2,
  X,
  CreditCard,
  Save
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'motion/react';

const userSchema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['admin', 'editor']),
  password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
});

type UserFormValues = z.infer<typeof userSchema>;

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: any;
}

import { usePageTitle } from '../hooks/usePageTitle';

export default function SettingsPage() {
  usePageTitle('VTC - Configurações');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [reportSettings, setReportSettings] = useState({
    publicSalesEnabled: true,
    reportPriceCents: 49700,
    maxInstallments: 12,
    minEmployeeResponses: 5,
  });

  const { user: currentUser } = useAuth();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'editor'
    }
  });

  const selectedRole = watch('role');

  useEffect(() => {
    fetchUsers();
    fetchReportSettings();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { users } = await api.listUsers();
      setUsers(users as SystemUser[]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportSettings = async () => {
    setSettingsLoading(true);
    try {
      const { settings } = await api.reportSettings();
      setReportSettings({
        publicSalesEnabled: settings.publicSalesEnabled,
        reportPriceCents: settings.reportPriceCents,
        maxInstallments: settings.maxInstallments,
        minEmployeeResponses: settings.minEmployeeResponses,
      });
    } catch (error) {
      console.error('Error fetching report settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveReportSettings = async () => {
    setSettingsSaving(true);
    try {
      const { settings } = await api.updateReportSettings(reportSettings);
      setReportSettings({
        publicSalesEnabled: settings.publicSalesEnabled,
        reportPriceCents: settings.reportPriceCents,
        maxInstallments: settings.maxInstallments,
        minEmployeeResponses: settings.minEmployeeResponses,
      });
    } catch (error) {
      console.error('Error saving report settings:', error);
      alert('Erro ao salvar configurações do relatório. Verifique se seu acesso é de administrador.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const onSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await api.createUser({ ...data, email: data.email.toLowerCase() });
      setTemporaryPassword(result.temporaryPassword || null);
      setIsModalOpen(false);
      reset();
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Erro ao adicionar usuário. Verifique as permissões.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este acesso?')) return;
    try {
      await api.deleteUser(userId);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erro ao deletar usuário.');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Configurações</h1>
          <p className="text-slate-500 mt-1">Gerencie acessos e preferências da consultoria.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" /> Meu Perfil
            </h2>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {currentUser?.name?.[0] || currentUser?.email?.[0]?.toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-slate-900 truncate">{currentUser?.name || 'Admin Geral'}</p>
                <p className="text-sm text-slate-500 truncate">{currentUser?.email}</p>
              </div>
            </div>
            <button 
              onClick={async () => {
                await api.logout();
                setCachedUser(null);
                window.location.href = '/';
              }}
              className="w-full mt-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-100 text-red-600 font-bold hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sair do Sistema
            </button>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" /> Segurança
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              O acesso administrativo é restrito a domínios autorizados pela Ventura Tecnologia. Para alterações globais, contate o suporte.
            </p>
          </div>
        </div>

        {/* User Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-blue-500" /> Equipe da Consultoria
              </h2>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
              >
                Adicionar Membro
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-2xl"></div>
                ))}
              </div>
            ) : users.length > 0 ? (
              <div className="overflow-hidden border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Membro</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nível</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{user.name}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 bg-slate-50 rounded-3xl text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-500 mb-4">Nenhum outro membro cadastrado ainda.</p>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Cadastrar o primeiro membro
                </button>
              </div>
            )}
            {temporaryPassword && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                Senha temporária gerada: <code className="font-bold">{temporaryPassword}</code>
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-brand-600" /> Venda Pública do PDF
                </h2>
                <p className="text-sm text-slate-500 mt-1">Preço, parcelamento e trava de privacidade do relatório pago.</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border w-fit ${
                reportSettings.publicSalesEnabled ? 'bg-brand-50 text-brand-700 border-brand-100' : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                {reportSettings.publicSalesEnabled ? 'Ativo' : 'Pausado'}
              </span>
            </div>

            {settingsLoading ? (
              <div className="h-32 bg-slate-50 animate-pulse rounded-2xl" />
            ) : (
              <div className="space-y-6">
                <label className="flex items-center justify-between gap-4 p-4 border border-slate-100 rounded-2xl bg-slate-50/60">
                  <span>
                    <span className="block font-bold text-slate-900">Permitir checkout público</span>
                    <span className="block text-xs text-slate-500 mt-1">Quando pausado, o diagnóstico continua gratuito, mas o pagamento do PDF fica indisponível.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={reportSettings.publicSalesEnabled}
                    onChange={(event) => setReportSettings((current) => ({ ...current, publicSalesEnabled: event.target.checked }))}
                    className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </label>

                <div className="grid md:grid-cols-3 gap-4">
                  <label className="space-y-2">
                    <span className="text-sm font-bold text-slate-700">Preço do PDF (R$)</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={reportSettings.reportPriceCents / 100}
                      onChange={(event) =>
                        setReportSettings((current) => ({ ...current, reportPriceCents: Math.round(Number(event.target.value || 0) * 100) }))
                      }
                      className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-bold text-slate-700">Parcelas máximas</span>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={reportSettings.maxInstallments}
                      onChange={(event) =>
                        setReportSettings((current) => ({ ...current, maxInstallments: Math.min(12, Math.max(1, Number(event.target.value || 1))) }))
                      }
                      className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </label>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">
                    Valor padrão do lançamento: R$ 497,00 em até 12x, com acréscimos do comprador no Mercado Pago.
                  </p>
                  <button
                    onClick={saveReportSettings}
                    disabled={settingsSaving || currentUser?.role !== 'admin'}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {settingsSaving ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                    Salvar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <h2 className="text-xl font-bold text-slate-900">Novo Acesso Consultoria</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nome Completo</label>
                    <input 
                      {...register('name')} 
                      placeholder="Ex: Ana Souza"
                      className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    />
                    {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                      <Mail className="w-4 h-4" /> E-mail
                    </label>
                    <input 
                      {...register('email')} 
                      placeholder="email@consultoria.com.br"
                      className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    />
                    {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Cargo / Nível de Acesso</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`cursor-pointer flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        selectedRole === 'editor' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white'
                      }`}>
                        <input type="radio" {...register('role')} value="editor" className="hidden" />
                        <User className={`w-6 h-6 ${selectedRole === 'editor' ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className={`text-sm font-bold ${selectedRole === 'editor' ? 'text-blue-700' : 'text-slate-500'}`}>Editor</span>
                      </label>
                      <label className={`cursor-pointer flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        selectedRole === 'admin' ? 'border-purple-500 bg-purple-50' : 'border-slate-100 bg-white'
                      }`}>
                        <input type="radio" {...register('role')} value="admin" className="hidden" />
                        <Shield className={`w-6 h-6 ${selectedRole === 'admin' ? 'text-purple-600' : 'text-slate-400'}`} />
                        <span className={`text-sm font-bold ${selectedRole === 'admin' ? 'text-purple-700' : 'text-slate-500'}`}>Administrador</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Senha inicial</label>
                    <input
                      {...register('password')}
                      type="password"
                      placeholder="Deixe vazio para gerar automaticamente"
                      className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    {errors.password && <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all border border-slate-200"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <CheckCircle2 className="w-5 h-5 animate-pulse" /> : <UserPlus className="w-5 h-5" />}
                    Autorizar Acesso
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
