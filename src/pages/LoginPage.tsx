/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { signInWithGoogle, auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Shield, LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

import { Logo } from '../components/ui/Logo';
import { usePageTitle } from '../hooks/usePageTitle';

export default function LoginPage() {
  usePageTitle('VTC - Acesso Restrito');
  const { user, isAuthorized, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in and authorized, redirect to dashboard
  useEffect(() => {
    if (user && isAuthorized && !loading) {
      navigate('/dashboard', { replace: true });
    } else if (user && !isAuthorized && !loading) {
      setError('Seu e-mail não está autorizado a acessar esta área. Entre em contato com o administrador.');
      auth.signOut();
    }
  }, [user, isAuthorized, loading, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
       <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full"
        />
    </div>
  );

  const handleLogin = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Auth state change will handle redirection or error via useEffect
    } catch (err: any) {
      console.error('Login error full:', err);
      let errorMessage = `Erro (${err.code || 'unknown'}): ${err.message || 'Por favor, tente novamente.'}`;
      
      const domain = window.location.hostname;

      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'A janela de login foi fechada antes de completar a autenticação.';
      } else if (err.code === 'auth/unauthorized-domain') {
        errorMessage = `Este domínio (${domain}) não está autorizado no Firebase Console. Vá em Autenticação > Configurações > Domínios Autorizados e adicione "${domain}".`;
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'O provedor de login do Google não está ativado no Firebase Console.';
      } else if (err.code === 'auth/invalid-continue-uri') {
        errorMessage = `Erro de URL de continuidade. O domínio "${domain}" pode não estar autorizado no console do Firebase ou no Google Cloud Platform. Verifique os domínios autorizados e as configurações do OAuth 2.0.`;
      } else if (err.code === 'auth/internal-error') {
        errorMessage = 'Erro interno do Firebase. Verifique se o projeto está configurado corretamente.';
      }
      
      console.log('Current Domain:', domain);
      console.log('Firebase Config authDomain:', auth.app.options.authDomain);
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-slate-200 p-10 border border-slate-100"
      >
        <div className="flex flex-col items-center mb-12">
          <Logo className="mb-8 scale-125" />
          <div className="w-12 h-1 bg-brand-500 rounded-full mb-8" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight text-center uppercase italic">Acesso Restrito</h1>
          <p className="text-slate-500 text-center mt-2 text-sm font-medium">Painel de Gestão e Consultoria de Saúde Ocupacional</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-100 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 py-3.5 rounded-xl font-bold text-slate-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
        >
          {isSubmitting ? (
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full"
            />
          ) : (
            <>
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Entrar com Google
            </>
          )}
        </button>

        <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed">
          Ao entrar, você concorda com nossos termos de uso e política de privacidade. 
          Acesso exclusivo para usuários autorizados.
        </p>
      </motion.div>

      <button 
        onClick={() => navigate('/')}
        className="mt-8 text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center gap-2"
      >
        Voltar para o início
      </button>
    </div>
  );
}
