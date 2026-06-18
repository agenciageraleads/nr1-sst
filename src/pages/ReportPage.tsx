/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { API_URL } from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';

export default function ReportPage() {
  usePageTitle('VTC - Relatório de Diagnóstico');
  const { id } = useParams();
  const pdfUrl = id ? `${API_URL}/reports/${encodeURIComponent(id)}/pdf` : '';

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto mb-6 flex max-w-6xl items-center justify-between rounded-lg bg-slate-950 px-5 py-4 text-white shadow-lg">
        <Link to={`/campanhas/${id}/resultados`} className="flex items-center gap-2 text-sm font-bold text-slate-100 hover:text-emerald-300">
          <ArrowLeft className="h-4 w-4" />
          Voltar aos resultados
        </Link>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
        >
          <Printer className="h-4 w-4" />
          Abrir / salvar PDF
        </a>
      </div>

      <main className="mx-auto h-[calc(100vh-128px)] max-w-6xl overflow-hidden rounded-lg bg-white shadow-xl">
        {pdfUrl ? (
          <iframe title="Relatório de Diagnóstico dos Riscos Psicossociais" src={pdfUrl} className="h-full w-full border-0" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-600">
            Campanha não informada.
          </div>
        )}
      </main>
    </div>
  );
}
