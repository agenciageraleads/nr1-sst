import {
  buildRiskTechnicalFindings,
  getRiskLevel,
  normalizeRiskKey,
  type EvidenceCategoryInput,
  type RiskTechnicalFinding,
} from './riskInterpretations.ts';

export type RiskRecommendationCategoryInput = {
  name?: string;
  category?: string;
  score?: number;
  risk?: number;
  riskLevelLabel?: string;
};

export type RiskRecommendationEvidenceInput =
  | EvidenceCategoryInput[]
  | {
      categories?: EvidenceCategoryInput[];
      criticalCategories?: EvidenceCategoryInput[];
      drivers?: EvidenceCategoryInput[];
      topDrivers?: EvidenceCategoryInput[];
      evidence?: EvidenceCategoryInput[];
    };

export type RiskRecommendationInput = {
  categories?: RiskRecommendationCategoryInput[];
  technicalFindings?: RiskTechnicalFinding[];
  evidence?: RiskRecommendationEvidenceInput;
};

export type RiskRecommendation = {
  id: string;
  category: string;
  risk: number;
  riskLevelLabel: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
  evidenceLabels: string[];
  rule: string;
  what: string;
  why: string;
  where: string;
  who: string;
  when: string;
  how: string;
  followUpIndicators: string[];
};

type RecommendationTemplate = {
  aliases: string[];
  what: string;
  where: string;
  who: string;
  how: string[];
  followUpIndicators: string[];
};

const DEFAULT_TEMPLATE: RecommendationTemplate = {
  aliases: [],
  what: 'Definir e executar ação preventiva específica para a categoria avaliada.',
  where: 'Setores, funções ou grupos expostos identificados na campanha, preservando anonimato e amostra mínima.',
  who: 'Responsável técnico de SST, RH, liderança da área e direção.',
  how: [
    'Validar o achado com responsável técnico',
    'cruzar com indicadores internos disponíveis',
    'definir controles organizacionais proporcionais ao risco',
    'registrar responsáveis, prazo e evidências de execução',
  ],
  followUpIndicators: ['novo score da categoria', 'adesão às ações definidas', 'indicadores internos definidos pela empresa'],
};

const TEMPLATES: Array<RecommendationTemplate & { category: string }> = [
  {
    category: 'Sobrecarga e ritmo',
    aliases: ['sobrecarga', 'ritmo', 'carga', 'demanda', 'pressao', 'horas extras', 'metas'],
    what: 'Revisar dimensionamento, metas, pausas e distribuição de demandas.',
    where: 'Áreas, turnos e funções com maior concentração de risco em carga, ritmo, metas ou pausas.',
    who: 'Gestores de área, operação, RH e responsável técnico de SST.',
    how: ['mapear gargalos operacionais', 'ajustar escalas e prioridades', 'revisar metas e prazos', 'acompanhar horas extras e backlog mensalmente'],
    followUpIndicators: ['horas extras', 'absenteísmo', 'retrabalho', 'fila/backlog operacional', 'turnover por setor'],
  },
  {
    category: 'Clareza e autonomia',
    aliases: ['clareza', 'autonomia', 'papel', 'responsabilidade', 'orientacao', 'prioridade'],
    what: 'Formalizar papéis, prioridades, critérios de autonomia e rotina de alinhamento.',
    where: 'Equipes com dúvidas recorrentes sobre responsabilidade, prioridade, orientação ou tomada de decisão.',
    who: 'Lideranças imediatas, RH, gestão de processos e responsável técnico de SST.',
    how: ['revisar descrições de função', 'registrar prioridades por equipe', 'criar rito de alinhamento', 'definir limites de autonomia e escalonamento'],
    followUpIndicators: ['retrabalho', 'mudanças emergenciais de prioridade', 'dúvidas recorrentes', 'tempo de resposta da liderança'],
  },
  {
    category: 'Liderança e gestão',
    aliases: ['lideranca', 'gestao', 'lider', 'feedback', 'cobranca'],
    what: 'Capacitar lideranças e padronizar práticas de escuta, feedback e resolução de conflitos.',
    where: 'Equipes com sinais de risco ligados a respeito, orientação, feedback, cobrança ou conflitos.',
    who: 'Direção, RH, lideranças da área e responsável técnico de SST.',
    how: ['treinar lideranças em gestão psicossocial', 'implantar rotina de feedback respeitoso', 'acompanhar conflitos críticos', 'definir padrão de conduta esperado'],
    followUpIndicators: ['turnover por liderança', 'queixas ao RH', 'clima por equipe', 'adesão a feedbacks', 'resolução de conflitos'],
  },
  {
    category: 'Relações interpessoais',
    aliases: ['relacoes', 'interpessoais', 'colegas', 'conflitos', 'cooperacao', 'dignidade'],
    what: 'Reforçar acordos de convivência, cooperação entre áreas e mediação de conflitos recorrentes.',
    where: 'Times, interfaces entre setores e rotinas com maior exposição a conflitos, baixa cooperação ou desrespeito.',
    who: 'RH, lideranças envolvidas, mediação interna ou externa e responsável técnico de SST.',
    how: ['revisar acordos de convivência', 'mediar conflitos recorrentes', 'treinar comunicação respeitosa', 'acompanhar áreas com maior tensão'],
    followUpIndicators: ['relatos de conflito', 'cooperação entre áreas', 'queixas formais e informais', 'retrabalho entre setores'],
  },
  {
    category: 'Assédio e violência',
    aliases: ['assedio', 'violencia', 'humilhacao', 'discriminacao', 'desrespeito', 'canal de relato'],
    what: 'Reforçar canal confidencial, protocolo de apuração e medidas contra retaliação.',
    where: 'Todos os setores com interação hierárquica, atendimento, trabalho em equipe ou relatos de conduta inadequada.',
    who: 'Direção, RH, compliance/jurídico quando aplicável, lideranças e responsável técnico de SST.',
    how: ['formalizar protocolo de apuração', 'divulgar canal confidencial', 'treinar lideranças e RH', 'acompanhar reincidências e proteção contra retaliação'],
    followUpIndicators: ['uso do canal de relato', 'tempo de apuração', 'reincidência por área', 'afastamentos relacionados'],
  },
  {
    category: 'Reconhecimento e justiça',
    aliases: ['reconhecimento', 'justica', 'equidade', 'regras', 'crescimento', 'desenvolvimento'],
    what: 'Dar transparência a critérios de reconhecimento, regras, decisões e oportunidades de desenvolvimento.',
    where: 'Áreas com percepção crítica de valorização, justiça, participação, comunicação de decisões ou crescimento.',
    who: 'Direção, RH, lideranças da área e responsáveis por desenvolvimento organizacional.',
    how: ['definir critérios de reconhecimento', 'comunicar regras e decisões', 'abrir canal de sugestões', 'acompanhar oportunidades e feedbacks por área'],
    followUpIndicators: ['participação em sugestões', 'percepção de justiça', 'promoções e oportunidades', 'feedbacks registrados'],
  },
  {
    category: 'Bem-estar',
    aliases: ['bem estar', 'saude', 'estresse', 'sono', 'descanso', 'vida pessoal', 'equilibrio'],
    what: 'Implantar escuta coletiva, orientação psicossocial e revisão dos fatores de estresse relacionados ao trabalho.',
    where: 'Unidades, setores ou grupos com sinais de desgaste, estresse, dificuldade de descanso ou baixa segurança para falar sobre dificuldades.',
    who: 'RH, liderança, responsável técnico de SST e apoio psicossocial qualificado quando aplicável.',
    how: ['realizar escuta coletiva sem identificação individual', 'orientar lideranças para acolhimento', 'monitorar fadiga e absenteísmo', 'reavaliar a categoria em até 90 dias'],
    followUpIndicators: ['absenteísmo', 'presenteísmo', 'relatos de fadiga', 'adesão a ações de apoio', 'reavaliação do score em 90 dias'],
  },
  {
    category: 'Recursos e Processos',
    aliases: ['recursos', 'processos', 'ferramentas', 'informacoes', 'comunicacao', 'mudancas'],
    what: 'Mapear recursos críticos, corrigir gargalos de ferramentas/processos e melhorar comunicação de mudanças.',
    where: 'Fluxos, setores e interfaces com falhas de comunicação, recursos insuficientes, retrabalho ou mudanças pouco organizadas.',
    who: 'Gestores de processo, operação, tecnologia/manutenção quando aplicável, RH e responsável técnico de SST.',
    how: ['mapear recursos críticos', 'priorizar gargalos de ferramenta e processo', 'padronizar comunicação de mudanças', 'acompanhar incidentes e chamados'],
    followUpIndicators: ['chamados de suporte', 'retrabalho', 'tempo de ciclo', 'falhas de comunicação', 'adesão a novos processos'],
  },
];

function categoryName(category: RiskRecommendationCategoryInput) {
  return String(category.name || category.category || '').trim();
}

function numericRisk(value: unknown) {
  const risk = Number(value);
  if (!Number.isFinite(risk)) return 0;
  return Math.max(0, Math.min(100, Math.round(risk)));
}

function templateForCategory(name: string): RecommendationTemplate {
  const normalized = normalizeRiskKey(name);
  return (
    TEMPLATES.find((template) => {
      const canonical = normalizeRiskKey(template.category);
      return normalized.includes(canonical) || canonical.includes(normalized) || template.aliases.some((alias) => normalized.includes(normalizeRiskKey(alias)));
    }) || DEFAULT_TEMPLATE
  );
}

function recommendationPriority(risk: number): RiskRecommendation['priority'] {
  if (risk >= 76) return 'P1';
  if (risk >= 61) return 'P2';
  if (risk >= 41) return 'P3';
  if (risk >= 21) return 'P4';
  return 'P5';
}

function deadlineByPriority(priority: RiskRecommendation['priority']) {
  const deadlines: Record<RiskRecommendation['priority'], string> = {
    P1: 'Iniciar imediatamente e revisar evidências em até 30 dias.',
    P2: 'Iniciar em até 30 dias e revisar evolução em até 60 dias.',
    P3: 'Planejar em até 60 dias e revisar evolução em até 90 dias.',
    P4: 'Manter em monitoramento e revisar na próxima medição periódica.',
    P5: 'Registrar manutenção dos controles existentes e acompanhar tendência nas próximas medições.',
  };
  return deadlines[priority];
}

function normalizeEvidenceInput(evidence?: RiskRecommendationEvidenceInput): EvidenceCategoryInput[] {
  if (Array.isArray(evidence)) return evidence;
  if (!evidence) return [];
  return evidence.categories || evidence.criticalCategories || evidence.evidence || evidence.drivers || evidence.topDrivers || [];
}

function evidenceDriverLabel(driver: unknown) {
  if (!driver || typeof driver !== 'object') return '';
  const item = driver as Record<string, unknown>;
  return String(item.label || item.questionText || item.text || item.questionKey || '').replace(/\s+/g, ' ').trim();
}

function summarizeEvidenceLabel(label: string) {
  const clean = label.replace(/\s+/g, ' ').trim();
  return clean.length > 140 ? `${clean.slice(0, 137).trim()}...` : clean;
}

function evidenceLabelsForCategory(name: string, evidence: EvidenceCategoryInput[]) {
  const key = normalizeRiskKey(name);
  const categoryEvidence = evidence.find((item) => normalizeRiskKey(String(item.name || item.category || '')) === key);
  const drivers = categoryEvidence?.drivers || categoryEvidence?.topDrivers || categoryEvidence?.questions || [];
  return drivers.map(evidenceDriverLabel).filter(Boolean).map(summarizeEvidenceLabel).slice(0, 3);
}

function findingMap(technicalFindings: RiskTechnicalFinding[] = []) {
  return new Map(technicalFindings.map((finding) => [normalizeRiskKey(finding.category), finding]));
}

function buildFindingsWhenMissing(categories: RiskRecommendationCategoryInput[], evidence: EvidenceCategoryInput[], technicalFindings?: RiskTechnicalFinding[]) {
  if (technicalFindings?.length) return technicalFindings;

  return buildRiskTechnicalFindings(
    categories.map((category) => ({
      name: categoryName(category),
      score: Number(category.score ?? 0),
      risk: numericRisk(category.risk),
    })),
    evidence
  );
}

function stableRecommendationId(category: string, risk: number, index: number) {
  const slug = normalizeRiskKey(category).replace(/\s+/g, '-');
  return `rec-${String(index + 1).padStart(2, '0')}-${slug || 'categoria'}-${risk}`;
}

function riskReason(category: string, risk: number, riskLevelLabel: string, finding?: RiskTechnicalFinding, evidenceLabels: string[] = []) {
  const evidenceText = evidenceLabels.length
    ? ` Evidências resumidas: ${evidenceLabels.join('; ')}.`
    : ' Evidências resumidas não disponíveis; usar perguntas e indicadores agregados da campanha.';

  if (finding?.riskMeaning) return `${finding.riskMeaning}${evidenceText}`;

  return `Risco ${riskLevelLabel.toLowerCase()} (${risk}%) identificado em ${category}.${evidenceText}`;
}

function mergeUnique(primary: string[] = [], fallback: string[] = [], limit = 5) {
  const seen = new Set<string>();
  return [...primary, ...fallback]
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter((item) => {
      const key = normalizeRiskKey(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function buildRiskRecommendations(input: RiskRecommendationInput = {}): RiskRecommendation[] {
  const explicitCategories = (input.categories || []).filter((category) => categoryName(category));
  const categories = explicitCategories.length
    ? explicitCategories
    : (input.technicalFindings || []).map((finding) => ({
        name: finding.category,
        score: finding.score,
        risk: finding.risk,
        riskLevelLabel: finding.riskLevelLabel,
      }));
  const evidence = normalizeEvidenceInput(input.evidence);
  const findings = buildFindingsWhenMissing(categories, evidence, input.technicalFindings);
  const findingsByCategory = findingMap(findings);

  return categories.map((category, index) => {
    const name = categoryName(category);
    const finding = findingsByCategory.get(normalizeRiskKey(name));
    const risk = numericRisk(category.risk ?? finding?.risk);
    const level = getRiskLevel(risk);
    const riskLevelLabel = category.riskLevelLabel || finding?.riskLevelLabel || level.label;
    const priority = recommendationPriority(risk);
    const template = templateForCategory(name);
    const findingEvidenceLabels = finding?.evidenceLabels?.map(summarizeEvidenceLabel);
    const evidenceLabels = mergeUnique(findingEvidenceLabels, evidenceLabelsForCategory(name, evidence), 3);
    const followUpIndicators = mergeUnique(finding?.followUpIndicators, template.followUpIndicators, 5);
    const configured = finding?.configured === false ? 'categoria personalizada' : 'categoria configurada';
    const actionSteps = mergeUnique(finding?.recommendedActions?.slice(1), template.how, 4);

    return {
      id: stableRecommendationId(name, risk, index),
      category: name,
      risk,
      riskLevelLabel,
      priority,
      evidenceLabels,
      rule: `Regra determinística: ${configured}; prioridade ${priority} pelo risco ${risk}% (${riskLevelLabel}); usa até 3 evidências resumidas e achados técnicos da mesma categoria quando disponíveis.`,
      what: finding?.recommendedActions?.[0] || template.what,
      why: riskReason(name, risk, riskLevelLabel, finding, evidenceLabels),
      where: template.where,
      who: template.who,
      when: deadlineByPriority(priority),
      how: actionSteps.join('; ') || DEFAULT_TEMPLATE.how.join('; '),
      followUpIndicators,
    };
  });
}

export function buildRiskRecommendationsByCategory(input: RiskRecommendationInput = {}) {
  return new Map(buildRiskRecommendations(input).map((recommendation) => [normalizeRiskKey(recommendation.category), recommendation]));
}
