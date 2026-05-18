import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, FileText, Loader2, RefreshCw } from 'lucide-react';
import { api, publicReportUrl } from '../lib/api';
import { Logo } from '../components/ui/Logo';
import { usePageTitle } from '../hooks/usePageTitle';

export default function PublicPaymentPage() {
  usePageTitle('VTC - Status do Pagamento');
  const { token = '' } = useParams();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
  const checkoutStatus = searchParams.get('status');
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [payment, setPayment] = useState<any>(null);
  const [error, setError] = useState('');

  const checkStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.publicPaymentStatus(token, paymentId);
      setPaid(result.paid);
      setPayment(result.payment);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível consultar o pagamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const timer = window.setInterval(checkStatus, 5000);
    return () => window.clearInterval(timer);
  }, [token, paymentId]);

  const statusText = paid
    ? 'Pagamento aprovado'
    : checkoutStatus === 'failure'
      ? 'Pagamento não aprovado'
      : 'Aguardando confirmação';

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <Logo className="scale-90 origin-left" />
        <Link to={`/diagnostico/${token}`} className="text-sm font-black text-slate-600 hover:text-brand-600 uppercase tracking-wide">
          Voltar ao painel
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/70 p-8 md:p-10 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
            {loading ? (
              <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
            ) : paid ? (
              <CheckCircle2 className="w-10 h-10 text-brand-600" />
            ) : (
              <AlertCircle className="w-10 h-10 text-amber-500" />
            )}
          </div>

          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{statusText}</h1>
          <p className="text-slate-500 mt-4 font-medium leading-relaxed">
            {paid
              ? 'O PDF técnico do diagnóstico NR-01 já está liberado para download.'
              : 'Alguns meios de pagamento podem levar alguns instantes para confirmar. Esta tela atualiza automaticamente.'}
          </p>

          {payment?.status && (
            <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">
              Status Mercado Pago: {payment.status}
            </p>
          )}

          {error && <p className="mt-6 text-sm font-bold text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">{error}</p>}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {paid ? (
              <a href={publicReportUrl(token)} className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                <FileText className="w-5 h-5" />
                Baixar PDF
              </a>
            ) : (
              <button onClick={checkStatus} disabled={loading} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                Verificar pagamento
              </button>
            )}
            <Link to={`/diagnostico/${token}`} className="flex-1 border border-slate-200 text-slate-700 py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center">
              Painel do diagnóstico
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
