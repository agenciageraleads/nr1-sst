import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { Logo } from '../components/ui/Logo';
import { usePageTitle } from '../hooks/usePageTitle';

const initialForm = {
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
};

export default function PublicDiagnosticStartPage() {
  usePageTitle('VTC - Diagnóstico Gratuito NR-01');
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return digits.slice(0, 11).replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  };

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { diagnostic } = await api.createPublicDiagnostic(form);
      navigate(`/diagnostico/${diagnostic.token}`);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível iniciar o diagnóstico.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <Logo className="scale-90 origin-left" />
        <Link to="/login" className="text-sm font-black text-slate-600 hover:text-brand-600 uppercase tracking-wide">
          Entrar no Painel
        </Link>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 border border-brand-100 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            Diagnóstico gratuito
          </div>
          <div className="space-y-5">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight uppercase italic leading-tight">
              Comece o diagnóstico NR-01 da sua empresa
            </h1>
            <p className="text-lg text-slate-600 font-medium leading-relaxed">
              Cadastre a empresa, responda o formulário institucional e compartilhe o link com os colaboradores. O resumo e o direcionamento para anexar ao PGR são liberados após a consolidação das respostas.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {['Coleta anônima', 'Resumo completo', 'Anexo para o PGR'].map((item) => (
              <div key={item} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                <p className="text-xs font-black text-slate-900 uppercase tracking-wide">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={submit} className="bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/70 overflow-hidden">
          <div className="bg-slate-900 text-white p-6 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Dados para abertura</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Empresa e responsável</p>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-bold text-slate-700">Razão social *</span>
                <input required value={form.razaoSocial} onChange={(e) => updateField('razaoSocial', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Nome fantasia</span>
                <input value={form.nomeFantasia} onChange={(e) => updateField('nomeFantasia', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">CNPJ *</span>
                <input required value={form.cnpj} onChange={(e) => updateField('cnpj', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Cidade *</span>
                <input required value={form.cidade} onChange={(e) => updateField('cidade', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">UF *</span>
                <input required maxLength={2} value={form.uf} onChange={(e) => updateField('uf', e.target.value.toUpperCase())} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none uppercase" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Ramo de atividade *</span>
                <input required value={form.ramoAtividade} onChange={(e) => updateField('ramoAtividade', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Número de colaboradores *</span>
                <input required value={form.numeroColaboradores} onChange={(e) => updateField('numeroColaboradores', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" />
              </label>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="grid md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Responsável *</span>
                <input required value={form.responsavelNome} onChange={(e) => updateField('responsavelNome', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">E-mail *</span>
                <input required type="email" value={form.responsavelEmail} onChange={(e) => updateField('responsavelEmail', e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-bold text-slate-700">Telefone</span>
                <input placeholder="(00) 00000-0000" value={form.responsavelTelefone} onChange={(e) => updateField('responsavelTelefone', formatPhone(e.target.value))} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" />
              </label>
            </div>

            {error && <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">{error}</p>}

            <button disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-100 disabled:opacity-60">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              Iniciar diagnóstico
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
