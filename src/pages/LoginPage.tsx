/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { setCachedUser, useAuth } from '../hooks/useAuth';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import { motion } from 'motion/react';

import { Logo } from '../components/ui/Logo';
import { usePageTitle } from '../hooks/usePageTitle';

export default function LoginPage() {
  usePageTitle('VTC - Acesso Restrito');
  const { user, isAuthorized, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && isAuthorized && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isAuthorized, loading, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full"
      />
    </div>
  );

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const { user } = await api.login(email, password);
      setCachedUser(user);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('E-mail ou senha inválidos. Confirme o acesso cadastrado para esta plataforma.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.form
        onSubmit={handleLogin}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full bg-white rounded-3xl shadow-2xl shadow-slate-200 p-8 sm:p-10 border border-slate-100"
      >
        <div className="flex flex-col items-center mb-12">
          <Logo className="mb-8 scale-125" />
          <div className="w-12 h-1 bg-brand-500 rounded-full mb-8" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight text-center uppercase italic">Acesso Restrito</h1>
          <p className="text-slate-500 text-center mt-2 text-sm font-medium">Painel de Gestão e Consultoria de Saúde Ocupacional</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm flex gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">E-mail</span>
            <div className="mt-2 relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all font-medium"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Senha</span>
            <div className="mt-2 relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all font-medium"
                required
              />
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-8 w-full flex items-center justify-center gap-3 bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
        >
          {isSubmitting ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full"
            />
          ) : (
            'Entrar'
          )}
        </button>

        <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed">
          Acesso exclusivo para usuarios autorizados.
        </p>
      </motion.form>

      <button
        onClick={() => navigate('/')}
        className="mt-8 text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-2"
      >
        Voltar para o início
      </button>
    </div>
  );
}
