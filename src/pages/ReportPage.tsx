/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import {
  api,
  type ResultsAnalysisPayload,
  type ResultsCategoryAverage,
  type ResultsEvidenceQuestion,
  type ResultsInstitutionalComparison,
  type ResultsRiskRecommendation,
  type ResultsSegmentation,
  type ResultsSummary,
  type ResultsRiskTechnicalFinding,
} from '../lib/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { buildRiskTechnicalFindings, normalizeRiskKey } from '../../shared/riskInterpretations.ts';
import { buildRiskRecommendationsByCategory } from '../../shared/riskRecommendations.ts';
type EvidenceDriver = {
  label: string;
  metric?: number;
  responseCount?: number;
  skippedCount?: number;
};

type EvidenceCategory = {
  name: string;
  risk?: number;
  critical: boolean;
  drivers: EvidenceDriver[];
};

type RiskBand = {
  label: string;
  color: string;
  textColor: string;
  probability: string;
  severity: string;
  control: string;
};

const REPORT_STYLES = `
  @page {
    size: A4;
    margin: 0;
  }

  .eso-document {
    color: #343434;
    font-family: "Times New Roman", Times, serif;
  }

  .eso-sheet {
    background: #fff;
    box-shadow: 0 18px 50px rgba(15, 23, 42, 0.18);
    min-height: 297mm;
    overflow: hidden;
    padding: 22mm 14mm 16mm;
    position: relative;
    width: 210mm;
  }

  .eso-topline {
    color: #000;
    display: grid;
    font-size: 11pt;
    grid-template-columns: 1fr 1fr 1fr;
    left: 12mm;
    line-height: 1;
    position: absolute;
    right: 12mm;
    top: 9mm;
    z-index: 5;
  }

  .eso-topline-center {
    text-align: center;
  }

  .eso-topline-right {
    text-align: right;
  }

  .eso-footer {
    bottom: 8mm;
    color: #000;
    display: grid;
    font-size: 10.5pt;
    grid-template-columns: 1fr;
    left: 12mm;
    line-height: 1;
    position: absolute;
    right: 12mm;
  }

  .eso-doc-title {
    font-size: 14pt;
    font-weight: 700;
    margin: 3mm 0 12mm;
    text-align: center;
  }

  .eso-section-title {
    background: #ebebeb;
    color: #343434;
    font-size: 13.5pt;
    font-weight: 700;
    line-height: 1.05;
    margin: 9mm 0 5mm;
    padding: 1mm 1.5mm;
    text-transform: uppercase;
  }

  .eso-heading {
    font-size: 13pt;
    font-weight: 700;
    margin: 7mm 0 4mm;
    text-transform: uppercase;
  }

  .eso-paragraph {
    font-size: 12.3pt;
    line-height: 1.22;
    margin: 0 0 4.5mm;
    text-align: justify;
  }

  .eso-table {
    border-collapse: collapse;
    break-inside: avoid;
    page-break-inside: avoid;
    font-size: 12pt;
    line-height: 1.1;
    margin: 0 0 5mm;
    width: 100%;
  }

  .eso-table th,
  .eso-table td {
    border: 1px solid #8f8f8f;
    padding: 2.2mm 2.6mm;
    vertical-align: top;
  }

  .eso-compact-table {
    font-size: 9.3pt;
    margin-bottom: 2.5mm;
  }

  .eso-compact-table th,
  .eso-compact-table td {
    padding: 1.5mm 1.8mm;
  }

  .eso-table th {
    background: #d9d9d9;
    font-weight: 700;
    text-align: center;
  }

  .eso-table .eso-label {
    background: #f2f2f2;
    font-weight: 700;
    width: 30mm;
  }

  .eso-table .eso-center {
    text-align: center;
  }

  .eso-small {
    font-size: 10.2pt;
  }

  .eso-risk-title {
    background: #ededed;
    font-weight: 700;
  }

  .eso-risk-dot {
    border-radius: 2px;
    display: inline-block;
    height: 7px;
    margin: 0 8mm 1px 3mm;
    width: 7px;
  }

  .eso-action-table {
    font-size: 9.4pt;
  }

  .eso-action-table th,
  .eso-action-table td {
    padding: 1.8mm 1.2mm;
  }

  .eso-action-problem {
    width: 42mm;
  }

  .eso-action-name {
    width: 48mm;
  }

  .eso-month-cell {
    text-align: center;
    width: 7.9mm;
  }

  .eso-dashed-line {
    border-top: 1px dashed #9a9a9a;
    margin: 9mm 0;
  }

  .eso-signature-line {
    border-top: 1px solid #8f8f8f;
    font-size: 10.5pt;
    padding-top: 2mm;
    text-align: center;
  }

  .eso-matrix td {
    padding: 1.5mm 2mm;
  }

  @media print {
    html,
    body,
    #root {
      background: #fff !important;
    }

    .eso-print-shell {
      background: #fff !important;
      padding: 0 !important;
    }

    .eso-sheet {
      box-shadow: none !important;
      break-after: page;
      margin: 0 !important;
    }

    .eso-sheet:last-child {
      break-after: auto;
    }

    .eso-screen-controls {
      display: none !important;
    }
  }

  @media screen and (max-width: 860px) {
    .eso-document,
    .eso-screen-controls {
      zoom: 0.78;
    }
  }
`;

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function normalizeKey(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR');
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

const MONTH_LABELS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function buildActionMonths(baseDate: Date) {
  return Array.from({ length: 12 }, (_, index) => {
    const date = addMonths(baseDate, index);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: MONTH_LABELS[date.getMonth()],
      year: date.getFullYear(),
    };
  });
}

function summarizeAction(action: string, maxLength = 78) {
  const normalized = action.replace(/\s+/g, ' ').replace(/\.$/, '').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function sentenceCase(value: string) {
  return value ? `${value.charAt(0).toLocaleUpperCase('pt-BR')}${value.slice(1)}` : value;
}

function summarizeProblem(category: ResultsCategoryAverage, drivers: EvidenceDriver[]) {
  const driver = drivers[0]?.label;
  const problem = driver ? `${category.name}: ${driver}` : `${category.name}: risco ${category.risk}%`;
  return summarizeAction(problem, 60);
}

function questionLabel(question: ResultsEvidenceQuestion) {
  return question.questionText || question.text || question.label || question.questionKey || question.questionId || '';
}

function questionMetric(question: ResultsEvidenceQuestion) {
  return (
    asNumber(question.impact) ??
    asNumber(question.driverScore) ??
    asNumber(question.risk) ??
    asNumber(question.negativeShare) ??
    asNumber(question.averageScore) ??
    asNumber(question.score)
  );
}

function questionSortMetric(question: ResultsEvidenceQuestion) {
  return asNumber(question.impact) ?? asNumber(question.driverScore) ?? asNumber(question.risk) ?? asNumber(question.negativeShare);
}

function categoryDrivers(category: Record<string, any>) {
  const drivers = category.topDrivers ?? category.drivers ?? category.questions ?? category.evidence;
  return Array.isArray(drivers) ? drivers : [];
}

function normalizeEvidencePayload(payload?: ResultsAnalysisPayload): EvidenceCategory[] {
  if (!payload) return [];

  const source = payload as any;
  let rawCategories: Array<Record<string, any> & { critical?: boolean }> = [];

  if (Array.isArray(source)) {
    rawCategories = source;
  } else if (isRecord(source)) {
    const nested = source.criticalCategories ?? source.categories ?? source.evidence ?? source.drivers ?? source.topDrivers;
    const fromCriticalCategories = Array.isArray(source.criticalCategories);

    if (Array.isArray(nested)) {
      rawCategories = nested.map((category) => ({ ...category, critical: fromCriticalCategories }));
    } else if (isRecord(nested)) {
      rawCategories = Object.entries(nested).map(([name, drivers]) => ({
        name,
        topDrivers: Array.isArray(drivers) ? drivers : [],
        critical: fromCriticalCategories,
      }));
    } else {
      rawCategories = Object.entries(source)
        .filter(([, drivers]) => Array.isArray(drivers))
        .map(([name, drivers]) => ({ name, topDrivers: drivers }));
    }
  }

  return rawCategories
    .map((rawCategory) => {
      const category = isRecord(rawCategory) ? rawCategory : {};
      const name = String(category.category || category.name || '').trim();
      const drivers = categoryDrivers(category)
        .map((question: ResultsEvidenceQuestion, index: number) => ({
          label: questionLabel(question).trim(),
          metric: questionMetric(question),
          sortMetric: questionSortMetric(question),
          responseCount: asNumber(question.validResponseCount ?? question.responseCount ?? question.count),
          skippedCount: asNumber(question.skippedCount ?? question.invalidAnswerCount),
          originalIndex: index,
        }))
        .filter((question) => question.label)
        .sort((a, b) => {
          if (a.sortMetric == null && b.sortMetric == null) return a.originalIndex - b.originalIndex;
          if (a.sortMetric == null) return 1;
          if (b.sortMetric == null) return -1;
          return b.sortMetric - a.sortMetric;
        })
        .slice(0, 4);

      return {
        name,
        risk: asNumber(category.risk),
        critical: Boolean(category.critical),
        drivers,
      };
    })
    .filter((category) => category.name && category.drivers.length > 0);
}

function getFallbackCategoryAverages(responses: any[]): ResultsCategoryAverage[] {
  const categories: Record<string, { total: number; count: number }> = {};

  responses.forEach((response) => {
    Object.entries(response.scores || {}).forEach(([category, score]) => {
      const numericScore = asNumber(score);
      if (numericScore == null) return;
      if (!categories[category]) categories[category] = { total: 0, count: 0 };
      categories[category].total += numericScore;
      categories[category].count += 1;
    });
  });

  return Object.entries(categories)
    .map(([name, data]) => {
      const score = Math.round(data.total / data.count);
      return { name, score, risk: 100 - score };
    })
    .sort((a, b) => b.risk - a.risk);
}

function riskBand(risk: number): RiskBand {
  if (risk >= 76) {
    return {
      label: 'Intolerável',
      color: '#d94343',
      textColor: '#7f1d1d',
      probability: 'Muito Provável (5)',
      severity: 'Alta (4)',
      control: 'Controle necessário e prioritário',
    };
  }

  if (risk >= 61) {
    return {
      label: 'Substancial',
      color: '#ffc000',
      textColor: '#92400e',
      probability: 'Provável (4)',
      severity: 'Moderada (3)',
      control: 'Controle necessário',
    };
  }

  if (risk >= 41) {
    return {
      label: 'Moderado',
      color: '#ffe082',
      textColor: '#854d0e',
      probability: 'Possível (3)',
      severity: 'Moderada (3)',
      control: 'Controle adicional se possível e viável',
    };
  }

  if (risk >= 21) {
    return {
      label: 'Tolerável',
      color: '#92d050',
      textColor: '#166534',
      probability: 'Pouco Provável (2)',
      severity: 'Baixa (2)',
      control: 'Monitorar e manter controles existentes',
    };
  }

  return {
    label: 'Trivial',
    color: '#38bdf8',
    textColor: '#075985',
    probability: 'Rara (1)',
    severity: 'Leve (1)',
    control: 'Nenhum controle adicional é necessário',
  };
}

function getEvidenceByCategory(summary: any, categories: ResultsCategoryAverage[]) {
  const riskByCategory = new Map(categories.map((category) => [normalizeKey(category.name), category.risk]));
  const merged = [
    ...normalizeEvidencePayload(summary?.analysis),
    ...normalizeEvidencePayload(summary?.evidence),
  ];

  const evidenceByName = new Map<string, EvidenceCategory>();

  merged.forEach((category) => {
    const key = normalizeKey(category.name);
    if (evidenceByName.has(key)) return;
    evidenceByName.set(key, {
      ...category,
      risk: riskByCategory.get(key) ?? category.risk,
      critical: category.critical || (riskByCategory.get(key) ?? category.risk ?? 0) > 40,
    });
  });

  return evidenceByName;
}

function getTechnicalFindings(
  summary: any,
  categories: ResultsCategoryAverage[],
  evidenceByName: Map<string, EvidenceCategory>
) {
  const source = Array.isArray(summary?.technicalFindings)
    ? summary.technicalFindings as ResultsRiskTechnicalFinding[]
    : buildRiskTechnicalFindings(categories, Array.from(evidenceByName.values()));

  return new Map(source.map((finding) => [normalizeRiskKey(finding.category), finding]));
}

function getReportRecommendations(
  summary: any,
  categories: ResultsCategoryAverage[],
  evidenceByName: Map<string, EvidenceCategory>,
  technicalByName: Map<string, ResultsRiskTechnicalFinding>
) {
  if (Array.isArray(summary?.reportRecommendations)) {
    return new Map(
      (summary.reportRecommendations as ResultsRiskRecommendation[]).map((recommendation) => [
        normalizeRiskKey(recommendation.category),
        recommendation,
      ])
    );
  }

  return buildRiskRecommendationsByCategory({
    categories,
    evidence: Array.from(evidenceByName.values()),
    technicalFindings: Array.from(technicalByName.values()),
  }) as Map<string, ResultsRiskRecommendation>;
}

function categoryEvidenceText(categoryName: string, drivers: EvidenceDriver[]) {
  if (!drivers.length) {
    return `A categoria ${categoryName} foi calculada pelas perguntas respondidas no questionário configurado para esta campanha.`;
  }

  const labels = drivers.slice(0, 3).map((driver) => driver.label);
  return `Evidências principais consideradas: ${labels.join('; ')}.`;
}

function joinTechnicalItems(items: string[] = [], limit = 4) {
  return items.slice(0, limit).join('; ') || 'A confirmar em revisão técnica.';
}

function getActionPlan(category: ResultsCategoryAverage, drivers: EvidenceDriver[], finding?: ResultsRiskTechnicalFinding) {
  const name = category.name.toLocaleLowerCase('pt-BR');
  const driverContext = drivers.length
    ? `Priorizar os fatores com maior impacto: ${drivers.slice(0, 2).map((driver) => driver.label).join('; ')}.`
    : 'Priorizar os fatores com maior pontuação de risco na categoria.';
  const primaryAction = finding?.recommendedActions?.[0];
  const secondaryActions = finding?.recommendedActions?.slice(1, 4).join('; ');
  const indicators = finding?.followUpIndicators?.slice(0, 3).join(', ');

  if (finding && primaryAction) {
    return {
      what: primaryAction,
      why: `${finding.riskMeaning} ${driverContext}`,
      where: 'Categorias, setores ou grupos expostos identificados com as respostas disponíveis na campanha.',
      who: 'Direção, RH, liderança da área e responsável técnico de SST.',
      how: `${secondaryActions || 'Definir controles preventivos compatíveis com o fator observado.'}${indicators ? ` Acompanhar: ${indicators}.` : ''}`,
    };
  }

  if (name.includes('assédio') || name.includes('assedio') || name.includes('violência') || name.includes('violencia')) {
    return {
      what: 'Reforçar canal de relato, fluxo de apuração e medidas contra condutas inadequadas.',
      why: `Reduzir exposição psicossocial relacionada a ${category.name}. ${driverContext}`,
      where: 'Todos os setores com interação hierárquica, atendimento ou trabalho em equipe.',
      who: 'Direção, RH, liderança imediata e responsável de SST.',
      how: 'Formalizar protocolo, divulgar canal confidencial, treinar lideranças e acompanhar reincidências.',
    };
  }

  if (name.includes('sobrecarga') || name.includes('carga') || name.includes('demanda')) {
    return {
      what: 'Revisar dimensionamento de equipe, metas, pausas e distribuição de demandas.',
      why: `Reduzir pressão operacional e prevenir fadiga associada a ${category.name}. ${driverContext}`,
      where: 'Áreas e turnos com maior concentração de respostas críticas.',
      who: 'Gestores de área, RH, operação e responsável de SST.',
      how: 'Mapear gargalos, ajustar escalas, revisar metas e implantar rotina de acompanhamento mensal.',
    };
  }

  if (name.includes('bem-estar') || name.includes('estresse') || name.includes('saúde') || name.includes('saude')) {
    return {
      what: 'Implantar rotina de escuta, orientação psicossocial e revisão de fatores de estresse.',
      why: `Melhorar fatores protetivos e reduzir sinais de alerta em ${category.name}. ${driverContext}`,
      where: 'Unidades/setores com maior exposição declarada pelos colaboradores.',
      who: 'RH, liderança, consultoria psicossocial e responsável de SST.',
      how: 'Realizar grupos de escuta, treinar lideranças, monitorar absenteísmo e reavaliar em até 90 dias.',
    };
  }

  return {
    what: `Executar ação de controle específica para ${category.name}.`,
    why: `Mitigar risco psicossocial identificado acima do limite técnico. ${driverContext}`,
    where: 'Setores, funções ou grupos expostos identificados na análise da campanha.',
    who: 'Responsável de SST, RH, gestores de área e direção.',
    how: 'Definir controles organizacionais, comunicar responsáveis, acompanhar indicadores e reavaliar o questionário.',
  };
}

function DocumentTopline() {
  return (
    <div className="eso-topline">
      <span />
      <span className="eso-topline-center">Relatório Técnico NR-01</span>
      <span className="eso-topline-right" />
    </div>
  );
}

function DocumentFooter() {
  return (
    <div className="eso-footer">
      <span>Documento técnico complementar ao PGR</span>
    </div>
  );
}

function Sheet({
  page,
  totalPages,
  issuedAt,
  children,
}: {
  page: number;
  totalPages: number;
  issuedAt: Date;
  children: ReactNode;
}) {
  return (
    <section className="eso-sheet">
      <DocumentTopline />
      {children}
      <DocumentFooter />
    </section>
  );
}

function DocumentTitle() {
  return <h1 className="eso-doc-title">Anexo Técnico - Inventário de Riscos Psicossociais</h1>;
}

function MetadataPage({
  page,
  totalPages,
  issuedAt,
  campaign,
  company,
  totalResponses,
}: {
  page: number;
  totalPages: number;
  issuedAt: Date;
  campaign: any;
  company: any;
  totalResponses: number;
}) {
  const address = [company?.cidade, company?.uf].filter(Boolean).join('/');

  return (
    <Sheet page={page} totalPages={totalPages} issuedAt={issuedAt}>
      <DocumentTitle />

      <table className="eso-table">
        <tbody>
          <tr>
            <td className="eso-label">Empregador:</td>
            <td colSpan={3}>{company?.razaoSocial || 'Não informado'}</td>
          </tr>
          <tr>
            <td className="eso-label">Endereço:</td>
            <td colSpan={3}>{address || 'Não informado'}</td>
          </tr>
          <tr>
            <td className="eso-label">CNPJ:</td>
            <td>{company?.cnpj || 'Não informado'}</td>
            <td className="eso-label">Telefone:</td>
            <td>{company?.responsavelTelefone || 'Não informado'}</td>
          </tr>
          <tr>
            <td className="eso-label">CNAE/Ramo:</td>
            <td colSpan={3}>{company?.ramoAtividade || 'Não informado'}</td>
          </tr>
        </tbody>
      </table>

      <table className="eso-table">
        <tbody>
          <tr>
            <td className="eso-label">Campanha:</td>
            <td>{campaign?.name || 'Não informado'}</td>
            <td className="eso-label">Respostas:</td>
            <td>{totalResponses} colaboradores</td>
          </tr>
          <tr>
            <td className="eso-label">Autor:</td>
            <td>Ventura Treinamentos e Consultoria</td>
            <td className="eso-label">Documento:</td>
            <td>Anexo técnico ao PGR</td>
          </tr>
          <tr>
            <td className="eso-label">Coordenador:</td>
            <td>{company?.responsavelNome || 'Responsável técnico a definir'}</td>
            <td className="eso-label">Contato:</td>
            <td>{company?.responsavelEmail || 'Não informado'}</td>
          </tr>
        </tbody>
      </table>
    </Sheet>
  );
}

function MethodologyPage({
  page,
  totalPages,
  issuedAt,
  privacy,
}: {
  page: number;
  totalPages: number;
  issuedAt: Date;
  privacy?: ResultsSummary['privacy'];
}) {
  return (
    <Sheet page={page} totalPages={totalPages} issuedAt={issuedAt}>
      <DocumentTitle />

      <h2 className="eso-section-title">1. Introdução</h2>
      <p className="eso-paragraph">
        Este relatório consolida o inventário de riscos psicossociais da campanha, com objetivo de apoiar o Programa de Gerenciamento de Riscos previsto na NR-01. A análise considera respostas coletivas, preserva o anonimato individual e organiza os achados por categorias de risco.
      </p>
      <p className="eso-paragraph">
        O cálculo é executado pelo sistema a partir das perguntas configuradas no questionário da campanha. Cada pergunta calculável informa categoria, tipo de resposta, peso, orientação do risco, regra de pontuação e, quando aplicável, pontuação por opção. Perguntas personalizadas podem participar do resultado desde que tenham estes metadados preenchidos.
      </p>
      <p className="eso-paragraph">
        Perguntas de escala, frequência, seleção e número são convertidas para uma escala técnica de 0 a 100. Perguntas protetivas e negativas são tratadas em sentidos opostos: uma resposta alta pode reduzir ou elevar o risco conforme a configuração definida para aquela pergunta.
      </p>
      {privacy && !privacy.analysisAllowed && (
        <p className="eso-paragraph">
          <strong>Disponibilidade dos dados:</strong> {privacy.message} O relatório calcula riscos, evidências e recomendações assim que houver ao menos uma resposta de colaborador.
        </p>
      )}

      <h2 className="eso-section-title">Critérios considerados no cálculo</h2>
      <table className="eso-table">
        <thead>
          <tr>
            <th>Critério</th>
            <th>Como entra no resultado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="eso-label">Categoria</td>
            <td>Agrupa perguntas em fatores psicossociais, como sobrecarga, assédio, autonomia, clareza de papéis ou bem-estar.</td>
          </tr>
          <tr>
            <td className="eso-label">Peso</td>
            <td>Define a influência relativa de cada pergunta na média da categoria.</td>
          </tr>
          <tr>
            <td className="eso-label">Tipo de pergunta</td>
            <td>Escalas e frequências usam a régua configurada; escolhas usam o score da opção; números usam mínimo e máximo.</td>
          </tr>
          <tr>
            <td className="eso-label">Não aplicável</td>
            <td>Respostas marcadas como não aplicáveis são removidas do denominador do cálculo daquela pergunta.</td>
          </tr>
          <tr>
            <td className="eso-label">Evidência</td>
            <td>Os fatores com maior impacto são resumidos por categoria para explicar por que determinado risco ficou crítico.</td>
          </tr>
        </tbody>
      </table>

      <h2 className="eso-section-title">Matriz de risco utilizada</h2>
      <p className="eso-paragraph">
        A régua abaixo traduz o percentual de risco psicossocial para linguagem operacional de priorização. Categorias acima de 40% entram no plano de ação preventivo, pois indicam necessidade de controle ou investigação complementar.
      </p>
      <table className="eso-table eso-matrix">
        <thead>
          <tr>
            <th>Faixa</th>
            <th>Cor</th>
            <th>Nível do risco</th>
            <th>Conduta sugerida</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['0 - 20', '#38bdf8', 'Trivial', 'Manter monitoramento periódico.'],
            ['21 - 40', '#92d050', 'Tolerável', 'Manter controles existentes e observar tendência.'],
            ['41 - 60', '#ffe082', 'Moderado', 'Definir ação preventiva e responsável.'],
            ['61 - 75', '#ffc000', 'Substancial', 'Priorizar ação corretiva e acompanhamento.'],
            ['76 - 100', '#d94343', 'Intolerável', 'Ação imediata e avaliação técnica complementar.'],
          ].map(([range, color, label, conduct]) => (
            <tr key={range}>
              <td className="eso-center">{range}</td>
              <td style={{ background: color }} />
              <td className="eso-center font-bold">{label}</td>
              <td>{conduct}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Sheet>
  );
}

function ResultsPage({
  page,
  totalPages,
  issuedAt,
  categories,
  evidenceByName,
}: {
  page: number;
  totalPages: number;
  issuedAt: Date;
  categories: ResultsCategoryAverage[];
  evidenceByName: Map<string, EvidenceCategory>;
}) {
  return (
    <Sheet page={page} totalPages={totalPages} issuedAt={issuedAt}>
      <DocumentTitle />

      <h2 className="eso-section-title">2. Resultados do inventário de riscos psicossociais</h2>
      <p className="eso-paragraph">
        Abaixo estão listadas as categorias avaliadas, o percentual de risco e o nível técnico sugerido pela matriz de classificação. A coluna de evidências resume os fatores que mais contribuíram para o resultado da categoria.
      </p>

      <table className="eso-table">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Risco</th>
            <th>Nível</th>
            <th>Evidências consideradas</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const band = riskBand(category.risk);
            const evidence = evidenceByName.get(normalizeKey(category.name));
            return (
              <tr key={category.name}>
                <td className="font-bold">{category.name}</td>
                <td className="eso-center font-bold" style={{ color: band.textColor }}>{category.risk}%</td>
                <td className="eso-center font-bold">
                  <span className="eso-risk-dot" style={{ background: band.color, marginRight: '2mm' }} />
                  {band.label}
                </td>
                <td>
                  {evidence?.drivers?.length
                    ? `${Math.min(evidence.drivers.length, 3)} evidências-chave consolidadas nas páginas seguintes.`
                    : 'Sem evidência consolidada disponível.'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Sheet>
  );
}

function InsufficientSamplePage({
  page,
  totalPages,
  issuedAt,
  totalResponses,
  privacy,
}: {
  page: number;
  totalPages: number;
  issuedAt: Date;
  totalResponses: number;
  privacy?: ResultsSummary['privacy'];
}) {
  return (
    <Sheet page={page} totalPages={totalPages} issuedAt={issuedAt}>
      <DocumentTitle />

      <h2 className="eso-section-title">2. Sem respostas de colaboradores</h2>
      <p className="eso-paragraph">
        Foram registradas {totalResponses} respostas de colaboradores. {privacy?.message || 'Ainda não há respostas para calcular riscos por categoria.'}
      </p>
      <p className="eso-paragraph">
        Assim que a campanha tiver ao menos uma resposta, o sistema gera resultados por categoria, evidências principais, inventário técnico, recortes e plano de ação com os dados disponíveis.
      </p>

      <table className="eso-table">
        <tbody>
          <tr>
            <td className="eso-label">Tipo de entrega</td>
            <td>Aguardando resposta de colaborador</td>
          </tr>
          <tr>
            <td className="eso-label">Respostas atuais</td>
            <td>{totalResponses}</td>
          </tr>
          <tr>
            <td className="eso-label">Critério de cálculo</td>
            <td>O cálculo usa as respostas disponíveis; uma resposta já libera a análise da campanha.</td>
          </tr>
          <tr>
            <td className="eso-label">Próxima ação</td>
            <td>{privacy?.nextAction || 'Coletar ao menos uma resposta de colaborador e gerar novamente o relatório.'}</td>
          </tr>
        </tbody>
      </table>
    </Sheet>
  );
}

function EvidencePage({
  page,
  totalPages,
  issuedAt,
  categories,
  evidenceByName,
  totalResponses,
}: {
  page: number;
  totalPages: number;
  issuedAt: Date;
  categories: ResultsCategoryAverage[];
  evidenceByName: Map<string, EvidenceCategory>;
  totalResponses: number;
}) {
  return (
    <Sheet page={page} totalPages={totalPages} issuedAt={issuedAt}>
      <DocumentTitle />
      <h2 className="eso-section-title">Por que deu esse risco?</h2>
      <p className="eso-paragraph">
        Esta página consolida, por categoria, os fatores que mais elevaram o risco. As perguntas ficam agrupadas como evidência técnica, evitando um relatório excessivamente longo e preservando a leitura executiva.
      </p>
      <table className="eso-table eso-small eso-compact-table">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Evidências principais</th>
            <th>Maior impacto</th>
            <th>Respostas válidas</th>
            <th>Ignoradas</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const evidence = evidenceByName.get(normalizeKey(category.name));
            const drivers = evidence?.drivers || [];
            if (!drivers.length) {
              return (
                <tr key={`${category.name}-empty`}>
                  <td className="font-bold">{category.name}</td>
                  <td colSpan={4}>Sem evidência consolidada disponível para esta categoria.</td>
                </tr>
              );
            }

            const mainDrivers = drivers.slice(0, 3);
            const highestImpact = mainDrivers.reduce<number | undefined>((highest, driver) => {
              if (driver.metric == null) return highest;
              return highest == null ? driver.metric : Math.max(highest, driver.metric);
            }, undefined);
            const validResponses = mainDrivers
              .map((driver) => driver.responseCount)
              .filter((count): count is number => count != null);
            const skippedTotal = mainDrivers.reduce((total, driver) => total + (driver.skippedCount ?? 0), 0);

            return (
              <tr key={category.name}>
                <td className="font-bold">{category.name}</td>
                <td>{mainDrivers.map((driver) => driver.label).join('; ')}</td>
                <td className="eso-center">{highestImpact != null ? `${Math.round(highestImpact)}%` : 'N/I'}</td>
                <td className="eso-center">{validResponses.length ? Math.max(...validResponses) : totalResponses}</td>
                <td className="eso-center">{skippedTotal}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Sheet>
  );
}

function SegmentationPage({
  page,
  totalPages,
  issuedAt,
  segmentations,
  institutionalComparison,
}: {
  page: number;
  totalPages: number;
  issuedAt: Date;
  segmentations: ResultsSegmentation[];
  institutionalComparison: ResultsInstitutionalComparison[];
}) {
  const visibleSegmentations = segmentations.filter((item) => item.visibleGroups > 0 || item.hiddenGroups > 0);
  const sectorSegmentation = segmentations.find((item) => item.key === 'sector' && item.segments.length > 0);
  const relevantComparisons = institutionalComparison.filter((item) => item.relevant).slice(0, 5);

  return (
    <Sheet page={page} totalPages={totalPages} issuedAt={issuedAt}>
      <DocumentTitle />
      <h2 className="eso-section-title">3. Segmentação anônima e comparativo institucional</h2>
      <p className="eso-paragraph">
        Esta seção resume a amostragem dos recortes com as respostas disponíveis, contemplando empresas e setores com poucos colaboradores.
      </p>

      <table className="eso-table eso-small eso-compact-table">
        <thead>
          <tr>
            <th>Recorte</th>
            <th>Grupos identificados</th>
            <th>Grupos exibidos</th>
            <th>Critério aplicado</th>
          </tr>
        </thead>
        <tbody>
          {visibleSegmentations.map((segmentation) => (
            <tr key={segmentation.key}>
              <td className="font-bold">{segmentation.label}</td>
              <td className="eso-center">{segmentation.totalGroups}</td>
              <td className="eso-center">{segmentation.visibleGroups}</td>
              <td>{segmentation.rule}</td>
            </tr>
          ))}
          {!visibleSegmentations.length && (
            <tr>
              <td colSpan={4}>Nenhum recorte disponível nas respostas da campanha.</td>
            </tr>
          )}
        </tbody>
      </table>

      {sectorSegmentation && (
        <>
          <h2 className="eso-section-title">Amostragem por setor</h2>
          <table className="eso-table eso-small">
            <thead>
              <tr>
                <th>Setor</th>
                <th>Respostas</th>
                <th>Maior risco identificado</th>
              </tr>
            </thead>
            <tbody>
              {sectorSegmentation.segments.map((segment) => (
                <tr key={segment.value}>
                  <td className="font-bold">{segment.value}</td>
                  <td className="eso-center">{segment.count}</td>
                  <td>{segment.topRiskCategory ? `${segment.topRiskCategory.name}: ${segment.topRiskCategory.risk}%` : 'Sem risco calculado'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2 className="eso-section-title">Comparativo institucional</h2>
      <p className="eso-paragraph">
        Quando o formulário institucional possui scores nas mesmas categorias dos colaboradores, o sistema sinaliza divergências relevantes como evidência de investigação, não como julgamento automático.
      </p>
      <table className="eso-table eso-small">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Risco colaboradores</th>
            <th>Risco institucional</th>
            <th>Leitura</th>
          </tr>
        </thead>
        <tbody>
          {relevantComparisons.length ? relevantComparisons.map((item) => (
            <tr key={item.category}>
              <td className="font-bold">{item.category}</td>
              <td className="eso-center">{item.employeeRisk}%</td>
              <td className="eso-center">{item.companyRisk}%</td>
              <td>{item.message}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={4}>Sem divergência institucional relevante com as categorias calculadas.</td>
            </tr>
          )}
        </tbody>
      </table>
    </Sheet>
  );
}

function InventoryPage({
  page,
  totalPages,
  issuedAt,
  categories,
  evidenceByName,
  technicalByName,
  showIntro,
  showObservation,
}: {
  page: number;
  totalPages: number;
  issuedAt: Date;
  categories: ResultsCategoryAverage[];
  evidenceByName: Map<string, EvidenceCategory>;
  technicalByName: Map<string, ResultsRiskTechnicalFinding>;
  showIntro: boolean;
  showObservation: boolean;
}) {
  return (
    <Sheet page={page} totalPages={totalPages} issuedAt={issuedAt}>
      <DocumentTitle />

      {showIntro && (
        <>
          <h2 className="eso-section-title">4. Ambientes, categorias e inventário de riscos ocupacionais</h2>
          <p className="eso-paragraph">
            Abaixo estão os riscos psicossociais priorizados nesta etapa do relatório. A estrutura segue o formato técnico de inventário, com descrição do perigo, metodologia, possíveis danos, probabilidade, severidade e nível de risco.
          </p>
        </>
      )}

      {categories.map((category) => {
        const band = riskBand(category.risk);
        const evidence = evidenceByName.get(normalizeKey(category.name));
        const drivers = evidence?.drivers || [];
        const finding = technicalByName.get(normalizeRiskKey(category.name));

        return (
          <table className="eso-table eso-small eso-compact-table" key={category.name}>
            <tbody>
              <tr>
                <td colSpan={3} className="eso-risk-title">
                  <span className="eso-risk-dot" style={{ background: band.color }} />
                  {category.name}
                </td>
              </tr>
              <tr>
                <td colSpan={3}><strong>Exposição:</strong> Coletiva, conforme respostas válidas do questionário da campanha.</td>
              </tr>
              <tr>
                <td colSpan={3}><strong>Por que avaliamos esta categoria:</strong> {finding?.purpose || 'Categoria configurada no questionário da campanha para apoiar a avaliação de fatores psicossociais.'}</td>
              </tr>
              <tr>
                <td colSpan={3}><strong>Fatores observados:</strong> {joinTechnicalItems(finding?.observedFactors, 5)}</td>
              </tr>
              <tr>
                <td colSpan={3}><strong>Interpretação técnica:</strong> {finding?.riskMeaning || `${band.label} em ${category.name}, com necessidade de validação pelo responsável técnico.`}</td>
              </tr>
              <tr>
                <td colSpan={3}><strong>Perigos, fontes e circunstâncias:</strong> {joinTechnicalItems(finding?.likelySources, 4)}. {categoryEvidenceText(category.name, drivers)}</td>
              </tr>
              <tr>
                <td colSpan={3}><strong>Metodologia:</strong> Critério quantitativo por questionário customizável NR-01, com pesos e regras de pontuação por pergunta.</td>
              </tr>
              <tr>
                <td colSpan={3}><strong>Possíveis efeitos coletivos:</strong> {joinTechnicalItems(finding?.possibleConsequences, 4)}.</td>
              </tr>
              {!finding?.configured && (
                <tr>
                  <td colSpan={3}><strong>Atenção:</strong> Categoria personalizada sem biblioteca técnica específica. A leitura deve ser validada pelo responsável técnico antes da emissão oficial.</td>
                </tr>
              )}
              <tr>
                <td><strong>Probabilidade:</strong> {band.probability}</td>
                <td><strong>Severidade:</strong> {band.severity}</td>
                <td><strong>Nível do Risco:</strong> {band.label}</td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <strong>Estimativa:</strong> {category.risk}%<br />
                  {band.control}
                </td>
                <td>
                  <div className="grid grid-cols-5 border border-[#8f8f8f]">
                    {[0, 1, 2, 3, 4].map((cell) => (
                      <span
                        key={cell}
                        className="h-[5mm] border-r border-[#8f8f8f] last:border-r-0"
                        style={{ background: cell === Math.min(4, Math.floor(category.risk / 20)) ? band.color : '#fff' }}
                      />
                    ))}
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan={3}><strong>Indicadores de acompanhamento:</strong> {joinTechnicalItems(finding?.followUpIndicators, 4)}.</td>
              </tr>
            </tbody>
          </table>
        );
      })}

      {showObservation && (
        <>
          <div className="eso-dashed-line" />
          <p className="eso-paragraph">
            Observação: este modelo já utiliza perguntas personalizadas quando elas possuem metadados de cálculo, mantendo o vínculo entre evidências, regras de pontuação e categorias registradas no questionário.
          </p>
        </>
      )}
    </Sheet>
  );
}

function ActionPlanPage({
  page,
  totalPages,
  issuedAt,
  categories,
  evidenceByName,
  technicalByName,
  recommendationsByName,
  showIntro,
  showFinal,
}: {
  page: number;
  totalPages: number;
  issuedAt: Date;
  categories: ResultsCategoryAverage[];
  evidenceByName: Map<string, EvidenceCategory>;
  technicalByName: Map<string, ResultsRiskTechnicalFinding>;
  recommendationsByName: Map<string, ResultsRiskRecommendation>;
  showIntro: boolean;
  showFinal: boolean;
}) {
  return (
    <Sheet page={page} totalPages={totalPages} issuedAt={issuedAt}>
      <DocumentTitle />

      {showIntro && (
        <>
          <h2 className="eso-section-title">5. Cronograma de ação</h2>
          <p className="eso-paragraph">
            As ações abaixo estão resumidas para acompanhamento operacional. As datas de execução devem ser definidas em conjunto com a empresa após a apresentação dos resultados.
          </p>
        </>
      )}

      <table className="eso-table eso-action-table">
        <thead>
          <tr>
            <th className="eso-action-problem">Problema encontrado</th>
            <th className="eso-action-name">Ação sugerida</th>
            {buildActionMonths(issuedAt).map((month) => (
              <th key={month.key} className="eso-month-cell">
                {month.label}<br />{month.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const drivers = evidenceByName.get(normalizeKey(category.name))?.drivers || [];
            const finding = technicalByName.get(normalizeRiskKey(category.name));
            const recommendation = recommendationsByName.get(normalizeRiskKey(category.name));
            const fallbackPlan = getActionPlan(category, drivers, finding);
            const plan = recommendation || fallbackPlan;
            return (
              <tr key={category.name}>
                <td className="font-bold">
                  {summarizeProblem(category, drivers)}
                </td>
                <td className="font-bold">
                  {sentenceCase(summarizeAction(plan.what, 68))}
                </td>
                {buildActionMonths(issuedAt).map((month) => (
                  <td key={month.key} className="eso-month-cell" />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {showFinal && (
        <>
          <h2 className="eso-section-title">6. Considerações finais</h2>
          <p className="eso-paragraph">
            Este relatório consolida os dados agregados da campanha e organiza os fatores psicossociais identificados para apoiar o planejamento de medidas preventivas no PGR. As medidas de controle devem ser revisadas e assinadas pelo responsável técnico antes da emissão oficial.
          </p>

          <div className="mt-[27mm] grid grid-cols-2 gap-[22mm]">
            <div className="eso-signature-line">
              Consultoria Técnica - Ventura<br />
              Responsável técnico
            </div>
            <div className="eso-signature-line">
              Representante da Empresa<br />
              Ciência do diagnóstico
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}

export default function ReportPage() {
  usePageTitle('VTC - Relatório Técnico');
  const { id } = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [issuedAt] = useState(() => new Date());

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { campaign, company, responses, summary } = await api.report(id);
        setCampaign(campaign);
        setCompany(company);
        setResponses(responses);
        setSummary(summary);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
      </div>
    );
  }

  const analysisAllowed = summary?.privacy ? Boolean(summary.privacy.analysisAllowed) : true;
  const categories = (analysisAllowed ? ((summary?.categoryAverages as ResultsCategoryAverage[] | undefined) || getFallbackCategoryAverages(responses)) : [])
    .slice()
    .sort((a, b) => b.risk - a.risk);
  const evidenceByName = getEvidenceByCategory(summary, categories);
  const technicalByName = getTechnicalFindings(summary, categories, evidenceByName);
  const recommendationsByName = getReportRecommendations(summary, categories, evidenceByName, technicalByName);
  const segmentations = Array.isArray(summary?.segmentations) ? summary.segmentations as ResultsSegmentation[] : [];
  const institutionalComparison = Array.isArray(summary?.institutionalComparison) ? summary.institutionalComparison as ResultsInstitutionalComparison[] : [];
  const totalResponses = summary?.employeeResponsesCount ?? responses.length;
  const evidenceChunks = analysisAllowed ? chunkArray(categories, 5) : [];
  const inventoryChunks = analysisAllowed ? chunkArray(categories, 2) : [];
  const criticalItems = categories.filter((category) => category.risk > 40);
  const actionItems = analysisAllowed ? (criticalItems.length ? criticalItems : categories.slice(0, 1)) : [];
  const actionChunks = chunkArray(actionItems, 9);
  const hasPhase4Page = analysisAllowed;
  const segmentPageNumber = 4;
  const evidenceStartPage = hasPhase4Page ? 5 : 4;
  const inventoryStartPage = evidenceStartPage + evidenceChunks.length;
  const actionStartPage = inventoryStartPage + inventoryChunks.length;
  const totalPages = analysisAllowed ? 3 + (hasPhase4Page ? 1 : 0) + evidenceChunks.length + inventoryChunks.length + actionChunks.length : 3;

  return (
    <div className="eso-print-shell min-h-screen overflow-x-auto bg-slate-100 px-6 py-8">
      <style>{REPORT_STYLES}</style>

      <div className="eso-screen-controls mx-auto mb-6 flex w-[210mm] items-center justify-between rounded-lg bg-slate-950 px-5 py-4 text-white shadow-lg">
        <Link to={`/campanhas/${id}/resultados`} className="flex items-center gap-2 text-sm font-bold text-slate-100 hover:text-emerald-300">
          <ArrowLeft className="h-4 w-4" />
          Voltar aos resultados
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex min-h-11 items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
        >
          <Printer className="h-4 w-4" />
          Imprimir / salvar PDF
        </button>
      </div>

      <main className="eso-document mx-auto flex w-[210mm] flex-col gap-8 print:gap-0">
        <MetadataPage
          page={1}
          totalPages={totalPages}
          issuedAt={issuedAt}
          campaign={campaign}
          company={company}
          totalResponses={totalResponses}
        />
        <MethodologyPage page={2} totalPages={totalPages} issuedAt={issuedAt} privacy={summary?.privacy} />
        {analysisAllowed ? (
          <>
            <ResultsPage
              page={3}
              totalPages={totalPages}
              issuedAt={issuedAt}
              categories={categories}
              evidenceByName={evidenceByName}
            />
            {hasPhase4Page && (
              <SegmentationPage
                page={segmentPageNumber}
                totalPages={totalPages}
                issuedAt={issuedAt}
                segmentations={segmentations}
                institutionalComparison={institutionalComparison}
              />
            )}
            {evidenceChunks.map((chunk, index) => (
              <EvidencePage
                page={evidenceStartPage + index}
                totalPages={totalPages}
                issuedAt={issuedAt}
                categories={chunk}
                evidenceByName={evidenceByName}
                totalResponses={totalResponses}
              />
            ))}
            {inventoryChunks.map((chunk, index) => (
              <InventoryPage
                page={inventoryStartPage + index}
                totalPages={totalPages}
                issuedAt={issuedAt}
                categories={chunk}
                evidenceByName={evidenceByName}
                technicalByName={technicalByName}
                showIntro={index === 0}
                showObservation={index === inventoryChunks.length - 1}
              />
            ))}
            {actionChunks.map((chunk, index) => (
              <ActionPlanPage
                page={actionStartPage + index}
                totalPages={totalPages}
                issuedAt={issuedAt}
                categories={chunk}
                evidenceByName={evidenceByName}
                technicalByName={technicalByName}
                recommendationsByName={recommendationsByName}
                showIntro={index === 0}
                showFinal={index === actionChunks.length - 1}
              />
            ))}
          </>
        ) : (
          <InsufficientSamplePage
            page={3}
            totalPages={totalPages}
            issuedAt={issuedAt}
            totalResponses={totalResponses}
            privacy={summary?.privacy}
          />
        )}
      </main>
    </div>
  );
}
