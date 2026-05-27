import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clipboard,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { api, publicReportUrl } from '../lib/api';
import { Logo } from '../components/ui/Logo';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/utils';

function formatMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((cents || 0) / 100);
}

export default function PublicDiagnosticDashboardPage() {
  usePageTitle('VTC - Painel do Diagnóstico');
  const { token = '' } = useParams();
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  const fetchDiagnostic = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.publicDiagnostic(token);
      setDiagnostic(result.diagnostic);
    } catch (err: any) {
      setError(err?.message || 'Diagnóstico não encontrado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostic();
  }, [token]);

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 1800);
  };

  const startCheckout = async () => {
    setCheckoutLoading(true);
    setError('');
    try {
      const result = await api.createPublicCheckout(token);
      if (result.paid || result.reportUrl) {
        window.location.href = result.reportUrl || publicReportUrl(token);
        return;
      }
      if (!result.checkoutUrl) throw new Error('Checkout indisponível no momento.');
      window.location.href = result.checkoutUrl;
    } catch (err: any) {
      setError(err?.message === 'mercado_pago_not_configured' ? 'Pagamento ainda não configurado. Tente novamente mais tarde.' : err?.message || 'Não foi possível abrir o checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!diagnostic) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-14 h-14 text-slate-300 mb-4" />
        <h1 className="text-2xl font-black text-slate-900">Diagnóstico não encontrado</h1>
        <p className="text-slate-500 mt-2">{error || 'Confira se o link está correto.'}</p>
        <Link to="/diagnostico/novo" className="mt-8 bg-brand-600 text-white px-5 py-3 rounded-xl font-bold">
          Iniciar novo diagnóstico
        </Link>
      </div>
    );
  }

  const price = formatMoney(diagnostic.settings.reportPriceCents);
  const stats = diagnostic.stats || {};
  const reportReady = diagnostic.reportUnlocked;
  const basicResultReady = Boolean(stats.companyResponseSubmitted && stats.minimumResponsesMet);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <Logo className="scale-90 origin-left" />
        <Link to="/login" className="text-sm font-black text-slate-600 hover:text-brand-600 uppercase tracking-wide">
          Entrar no Painel
        </Link>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="bg-slate-900 text-white rounded-2xl p-8 md:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest text-brand-100">
              <ShieldCheck className="w-4 h-4" />
              Painel público do diagnóstico
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase italic">{diagnostic.company.razaoSocial}</h1>
              <p className="text-slate-400 font-medium mt-2">{diagnostic.campaign.name}</p>
            </div>
          </div>
          <button onClick={fetchDiagnostic} className="bg-white/10 hover:bg-white/15 border border-white/10 px-5 py-3 rounded-xl font-bold flex items-center gap-2 w-fit">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </header>

        {error && <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-100 p-4 rounded-xl">{error}</p>}

        <section className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Progresso do Diagnóstico</h2>
              <p className="text-sm text-slate-500 font-medium">Acompanhe as etapas necessárias para liberar o laudo completo.</p>
            </div>
            <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 px-4 py-2 rounded-xl text-brand-700 font-black text-xs uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-600 animate-pulse" />
              {basicResultReady ? 'Coleta concluída' : 'Coleta em andamento'}
            </div>
          </div>

          <div className="relative">
            {/* Background Line */}
            <div className="absolute top-[36px] left-[12.5%] right-[12.5%] h-1 bg-slate-100 hidden md:block" />
            
            {/* Progress Fill Line */}
            <div 
              className="absolute top-[36px] left-[12.5%] h-1 bg-brand-500 transition-all duration-500 hidden md:block"
              style={{
                width: `${
                  (([
                    true,
                    Boolean(stats.companyResponseSubmitted),
                    Boolean(stats.employeeResponsesCount > 0),
                    Boolean(basicResultReady)
                  ].filter(Boolean).length - 1) / 3) * 75
                }%`
              }}
            />

            <div className="grid gap-6 md:grid-cols-4 relative z-10">
              {[
                {
                  step: 1,
                  title: 'Abertura',
                  desc: 'Empresa cadastrada',
                  status: 'completed',
                  meta: diagnostic.company.cnpj
                },
                {
                  step: 2,
                  title: 'Formulário da Gestão',
                  desc: stats.companyResponseSubmitted ? 'Respondido' : 'Pendente',
                  status: stats.companyResponseSubmitted ? 'completed' : 'active',
                  meta: stats.companyResponseSubmitted ? 'Recebido' : 'Ação necessária'
                },
                {
                  step: 3,
                  title: 'Opinião da Equipe',
                  desc: stats.employeeResponsesCount > 0 ? `${stats.employeeResponsesCount} colaboradores` : 'Aguardando respostas',
                  status: stats.employeeResponsesCount > 0 ? 'completed' : stats.companyResponseSubmitted ? 'active' : 'upcoming',
                  meta: stats.employeeResponsesCount > 0 ? 'Disponível' : 'Compartilhar link'
                },
                {
                  step: 4,
                  title: 'Resultado Final',
                  desc: basicResultReady ? 'Relatório Pronto' : 'Aguardando etapas anteriores',
                  status: basicResultReady ? 'completed' : 'upcoming',
                  meta: basicResultReady ? 'Liberado' : 'Bloqueado'
                }
              ].map((item) => {
                const isCompleted = item.status === 'completed';
                const isActive = item.status === 'active';
                
                return (
                  <div key={item.step} className="flex md:flex-col items-start md:items-center text-left md:text-center gap-4 md:gap-3 bg-slate-50 md:bg-transparent p-4 md:p-4 rounded-xl border border-slate-100 md:border-none shadow-sm md:shadow-none">
                    <div 
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-300 shadow-md",
                        isCompleted 
                          ? "bg-brand-600 text-white shadow-brand-100" 
                          : isActive 
                            ? "bg-slate-900 text-white animate-pulse" 
                            : "bg-white text-slate-400 border border-slate-200"
                      )}
                    >
                      {isCompleted ? '✓' : item.step}
                    </div>
                    <div>
                      <p className="font-black text-sm text-slate-900 uppercase tracking-tight">{item.title}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{item.desc}</p>
                      <span 
                        className={cn(
                          "inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-2 border",
                          isCompleted 
                            ? "bg-brand-50 text-brand-700 border-brand-100" 
                            : isActive 
                              ? "bg-amber-50 text-amber-700 border-amber-100" 
                              : "bg-slate-100 text-slate-400 border-slate-200"
                        )}
                      >
                        {item.meta}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>


        <section className={cn('grid gap-6', basicResultReady || reportReady ? 'lg:grid-cols-[1fr_0.9fr]' : 'lg:grid-cols-[1fr_0.65fr]')}>
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-xl font-black text-slate-900">Links de coleta</h2>
              <p className="text-sm text-slate-500 mt-1">Use os links abaixo para completar o diagnóstico gratuito.</p>
            </div>

            {[
              { id: 'empresa', title: 'Formulário institucional', url: diagnostic.links.companyForm, icon: FileText },
              { id: 'colaborador', title: 'Link dos colaboradores', url: diagnostic.links.employeeForm, icon: Users },
            ].map((item) => (
              <div key={item.id} className="border border-slate-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500 truncate max-w-xl">{item.url}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={item.url} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-black uppercase tracking-wide">
                    Abrir
                  </a>
                  <button onClick={() => copy(item.url, item.id)} className="px-4 py-2 rounded-lg bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-wide border border-slate-100 flex items-center gap-2">
                    {copied === item.id ? <CheckCircle2 className="w-4 h-4 text-brand-600" /> : <Clipboard className="w-4 h-4" />}
                    Copiar
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
            {basicResultReady || reportReady ? (
              <>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Relatório completo para o PGR</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Seu resultado básico já está disponível. O PDF completo inclui consolidação técnica, metodologia e cronograma de ação.
                  </p>
                </div>

                <div className={cn('p-5 rounded-xl border', reportReady ? 'bg-brand-50 border-brand-100' : 'bg-slate-50 border-slate-100')}>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">PDF completo</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{reportReady ? 'Disponível para download' : `${price}`}</p>
                  {!reportReady && (
                    <p className="text-sm text-slate-500 mt-2">
                      Emissão única via Mercado Pago, com opção de parcelamento em até {diagnostic.settings.maxInstallments}x conforme as condições do checkout.
                    </p>
                  )}
                </div>

                {reportReady ? (
                  <a href={publicReportUrl(token)} className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-100">
                    <FileText className="w-5 h-5" />
                    Baixar PDF completo
                  </a>
                ) : (
                  <button onClick={startCheckout} disabled={checkoutLoading} className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-100 disabled:opacity-60">
                    {checkoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                    Emitir PDF completo
                  </button>
                )}
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Próximos passos</h2>
                  <p className="text-sm text-slate-500 mt-1">Complete a coleta para visualizar o resultado básico do diagnóstico.</p>
                </div>

                <div className="space-y-3">
                  <div className={cn('p-4 rounded-xl border flex items-start gap-3', stats.companyResponseSubmitted ? 'bg-brand-50 border-brand-100' : 'bg-slate-50 border-slate-100')}>
                    <CheckCircle2 className={cn('w-5 h-5 mt-0.5', stats.companyResponseSubmitted ? 'text-brand-600' : 'text-slate-300')} />
                    <div>
                      <p className="font-black text-slate-900">Responder formulário institucional</p>
                      <p className="text-xs text-slate-500 mt-1">{stats.companyResponseSubmitted ? 'Recebido com sucesso.' : 'Abra o link da empresa e complete as informações da gestão.'}</p>
                    </div>
                  </div>
                  <div className={cn('p-4 rounded-xl border flex items-start gap-3', stats.minimumResponsesMet ? 'bg-brand-50 border-brand-100' : 'bg-slate-50 border-slate-100')}>
                    <Users className={cn('w-5 h-5 mt-0.5', stats.minimumResponsesMet ? 'text-brand-600' : 'text-slate-300')} />
                    <div>
                      <p className="font-black text-slate-900">Coletar respostas dos colaboradores</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {stats.minimumResponsesMet
                          ? 'Coleta disponível para cálculo.'
                          : 'Colete ao menos uma resposta de colaborador para liberar o cálculo.'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-5">{basicResultReady ? 'Resultado básico' : 'Aguardando coleta'}</h2>
          {!basicResultReady ? (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 text-amber-900">
              <p className="font-black">O resultado básico aparecerá aqui quando a coleta estiver completa.</p>
              <p className="text-sm font-medium mt-1">
                Para cruzar os dados institucionais, precisamos do formulário da empresa e de ao menos uma resposta de colaborador.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.categoryAverages.map((category: any) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-black text-slate-700 uppercase tracking-wide">{category.name}</p>
                    <p className={cn('text-sm font-black', category.risk > 60 ? 'text-red-600' : category.risk > 40 ? 'text-amber-600' : 'text-brand-600')}>
                      {category.risk}% de risco
                    </p>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn('h-full', category.risk > 60 ? 'bg-red-500' : category.risk > 40 ? 'bg-amber-500' : 'bg-brand-500')} style={{ width: `${category.risk}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
