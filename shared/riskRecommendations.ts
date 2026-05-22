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
    category: 'Assédio de qualquer natureza',
    aliases: ['assedio de qualquer natureza', 'assedio moral', 'assedio sexual', 'assedio organizacional', 'humilhacao', 'constrangimento'],
    what: 'Reforçar prevenção, canal confidencial, protocolo de apuração e medidas contra retaliação.',
    where: 'Todos os setores com hierarquia, atendimento, trabalho em equipe ou sinais de conduta inadequada.',
    who: 'Direção, RH, compliance/jurídico quando aplicável, lideranças e responsável técnico de SST.',
    how: ['formalizar protocolo de apuração', 'divulgar canal confidencial', 'treinar lideranças e RH', 'acompanhar reincidências e proteção contra retaliação'],
    followUpIndicators: ['uso do canal de relato', 'tempo de apuração', 'reincidência por área', 'afastamentos relacionados'],
  },
  {
    category: 'Má gestão de mudanças organizacionais',
    aliases: ['ma gestao de mudancas organizacionais', 'mudancas organizacionais', 'gestao de mudancas', 'mudancas mal conduzidas'],
    what: 'Padronizar comunicação, participação e suporte durante mudanças organizacionais.',
    where: 'Áreas impactadas por mudanças de processo, estrutura, equipe, sistema ou prioridade.',
    who: 'Direção, lideranças das áreas, RH, gestão de processos e responsável técnico de SST.',
    how: ['comunicar motivo e impacto das mudanças', 'abrir canal de dúvidas', 'preparar lideranças', 'acompanhar adesão e retrabalho após implantação'],
    followUpIndicators: ['dúvidas sobre mudanças', 'retrabalho após implantação', 'adesão a novos processos', 'chamados de suporte'],
  },
  {
    category: 'Baixa clareza de papel ou função',
    aliases: ['baixa clareza de papel', 'baixa clareza de funcao', 'clareza de papel', 'clareza de funcao', 'desvio de funcao'],
    what: 'Formalizar papéis, responsabilidades, prioridades e limites de função.',
    where: 'Equipes com dúvidas recorrentes, retrabalho, cobranças fora do escopo ou conflitos de responsabilidade.',
    who: 'Lideranças imediatas, RH, gestão de processos e responsável técnico de SST.',
    how: ['revisar descrições de função', 'registrar prioridades por equipe', 'criar rito de alinhamento', 'monitorar desvios de função'],
    followUpIndicators: ['retrabalho', 'dúvidas recorrentes', 'conflitos de responsabilidade', 'queixas sobre desvio de função'],
  },
  {
    category: 'Baixas recompensas e reconhecimento',
    aliases: ['baixas recompensas', 'recompensas e reconhecimento', 'reconhecimento', 'valorizacao', 'feedback positivo'],
    what: 'Definir práticas de reconhecimento, feedback e transparência de oportunidades.',
    where: 'Áreas com percepção crítica de valorização, feedback, crescimento ou equilíbrio cobrança-reconhecimento.',
    who: 'Direção, RH, lideranças da área e responsáveis por desenvolvimento organizacional.',
    how: ['definir critérios de reconhecimento', 'implantar rotina de feedback', 'comunicar oportunidades', 'acompanhar percepção de valorização por área'],
    followUpIndicators: ['feedbacks registrados', 'percepção de reconhecimento', 'participação em desenvolvimento', 'turnover voluntário'],
  },
  {
    category: 'Falta de suporte ou apoio no trabalho',
    aliases: ['falta de suporte', 'falta de apoio', 'apoio no trabalho', 'suporte da lideranca', 'apoio de colegas'],
    what: 'Fortalecer suporte da liderança, cooperação, orientação e recursos para execução do trabalho.',
    where: 'Equipes com isolamento, dúvidas frequentes, falhas de recurso ou baixa cooperação.',
    who: 'Lideranças imediatas, RH, gestão de processos, tecnologia/manutenção quando aplicável e SST.',
    how: ['definir fluxo de apoio', 'mapear recursos críticos', 'treinar lideranças para orientação', 'acompanhar dúvidas e chamados recorrentes'],
    followUpIndicators: ['chamados de suporte', 'dúvidas recorrentes', 'tempo de resposta da liderança', 'retrabalho'],
  },
  {
    category: 'Baixo controle no trabalho ou falta de autonomia',
    aliases: ['baixo controle no trabalho', 'falta de autonomia', 'autonomia', 'controle no trabalho', 'tomada de decisao'],
    what: 'Revisar autonomia, critérios de decisão e participação em melhorias do próprio trabalho.',
    where: 'Funções com microgestão, excesso de aprovação, baixa participação ou pouca influência sobre a rotina.',
    who: 'Lideranças imediatas, RH, gestão de processos e responsável técnico de SST.',
    how: ['definir limites de autonomia por função', 'revisar fluxos decisórios', 'criar canal de sugestões', 'treinar lideranças em delegação'],
    followUpIndicators: ['sugestões recebidas', 'tempo de decisão', 'retrabalho por aprovação', 'percepção de autonomia'],
  },
  {
    category: 'Eventos violentos ou traumáticos',
    aliases: ['eventos violentos', 'eventos traumaticos', 'violencia', 'ameacas', 'agressoes', 'perigo grave'],
    what: 'Revisar prevenção de violência, resposta a incidentes e acolhimento após ocorrências graves.',
    where: 'Atendimentos, deslocamentos, áreas operacionais ou interfaces com risco de ameaça, agressão ou perigo grave.',
    who: 'Direção, liderança, segurança patrimonial, RH, responsável técnico de SST e apoio especializado quando aplicável.',
    how: ['mapear cenários de violência', 'revisar protocolos de segurança', 'definir fluxo de acolhimento', 'treinar resposta a incidentes'],
    followUpIndicators: ['incidentes registrados', 'quase acidentes', 'acionamentos de segurança', 'afastamentos relacionados'],
  },
  {
    category: 'Baixa justiça organizacional',
    aliases: ['baixa justica organizacional', 'justica organizacional', 'equidade', 'imparcialidade', 'criterios transparentes'],
    what: 'Dar transparência a regras, critérios, distribuição de tarefas e tratamento de conflitos.',
    where: 'Áreas com percepção crítica de equidade, favoritismo, punições, oportunidades ou distribuição de tarefas.',
    who: 'Direção, RH, lideranças da área e responsável técnico de SST.',
    how: ['comunicar critérios e regras', 'revisar distribuição de tarefas', 'padronizar tratamento de conflitos', 'monitorar percepção de justiça'],
    followUpIndicators: ['queixas sobre justiça', 'distribuição de tarefas', 'promoções e oportunidades', 'conflitos formais'],
  },
  {
    category: 'Conflito de valores no trabalho',
    aliases: ['conflito de valores', 'valores no trabalho', 'conflito etico', 'principios eticos', 'condutas inadequadas'],
    what: 'Reforçar conduta ética, coerência entre discurso e prática e proteção para questionamentos de boa-fé.',
    where: 'Áreas com pressão por metas, decisões sensíveis, dilemas éticos ou relatos de incoerência institucional.',
    who: 'Direção, RH, compliance/jurídico quando aplicável, lideranças e responsável técnico de SST.',
    how: ['revisar código de conduta', 'abrir canal seguro para dilemas éticos', 'revisar metas e incentivos', 'treinar lideranças'],
    followUpIndicators: ['relatos éticos', 'uso de canal de conduta', 'percepção de coerência', 'queixas sobre pressão indevida'],
  },
  {
    category: 'Conflitos interpessoais',
    aliases: ['conflitos interpessoais', 'relacoes interpessoais', 'tensoes recorrentes', 'conflitos com colegas', 'conflitos com clientes'],
    what: 'Reforçar acordos de convivência, cooperação entre áreas e mediação de conflitos recorrentes.',
    where: 'Times, interfaces entre setores e rotinas com maior exposição a conflitos, baixa cooperação ou desrespeito.',
    who: 'RH, lideranças envolvidas, mediação interna ou externa e responsável técnico de SST.',
    how: ['revisar acordos de convivência', 'mediar conflitos recorrentes', 'treinar comunicação respeitosa', 'acompanhar áreas com maior tensão'],
    followUpIndicators: ['relatos de conflito', 'cooperação entre áreas', 'queixas formais e informais', 'retrabalho entre setores'],
  },
  {
    category: 'Jornada de trabalho inadequada ou extensiva',
    aliases: ['jornada inadequada', 'jornada extensiva', 'horas extras', 'pausas', 'descanso', 'equilibrio trabalho vida'],
    what: 'Revisar jornada, pausas, horas extras, recuperação e equilíbrio trabalho-vida.',
    where: 'Áreas, turnos e funções com horas extras, pausas insuficientes ou baixa recuperação após a jornada.',
    who: 'Gestores de área, operação, RH e responsável técnico de SST.',
    how: ['revisar escalas e horas extras', 'organizar pausas', 'ajustar dimensionamento', 'monitorar fadiga e absenteísmo'],
    followUpIndicators: ['horas extras', 'pausas registradas', 'absenteísmo', 'relatos de fadiga'],
  },
  {
    category: 'Alta demanda de trabalho ou sobrecarga psicológica',
    aliases: ['alta demanda de trabalho', 'sobrecarga psicologica', 'sobrecarga', 'ritmo acelerado', 'metas inatingiveis'],
    what: 'Revisar dimensionamento, metas, ritmo, prioridades e apoio em picos de demanda.',
    where: 'Áreas, turnos e funções com maior concentração de volume, pressão de tempo, metas ou backlog.',
    who: 'Gestores de área, operação, RH e responsável técnico de SST.',
    how: ['mapear gargalos operacionais', 'ajustar prioridades', 'revisar metas e prazos', 'definir apoio para picos de demanda'],
    followUpIndicators: ['backlog', 'horas extras', 'retrabalho', 'absenteísmo'],
  },
  {
    category: 'Baixa demanda de trabalho ou subcarga',
    aliases: ['baixa demanda de trabalho', 'subcarga', 'tedio', 'ociosidade', 'subutilizacao'],
    what: 'Revisar desenho da função, alocação de tarefas e aproveitamento das capacidades disponíveis.',
    where: 'Funções ou equipes com tempo ocioso, baixo desafio, subutilização ou falta de tarefas suficientes.',
    who: 'Lideranças imediatas, RH, gestão de processos e responsável técnico de SST.',
    how: ['redesenhar atividades', 'redistribuir demandas', 'aproveitar competências disponíveis', 'definir metas compatíveis ou rotação de tarefas'],
    followUpIndicators: ['tempo ocioso', 'percepção de desafio', 'adesão a novas atividades', 'turnover voluntário'],
  },
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
      return normalized.includes(canonical) || canonical.includes(normalized);
    }) ||
    TEMPLATES.find((template) => template.aliases.some((alias) => normalized.includes(normalizeRiskKey(alias)))) ||
    DEFAULT_TEMPLATE
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
