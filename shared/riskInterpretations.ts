export type RiskLevel = 'trivial' | 'toleravel' | 'moderado' | 'substancial' | 'intoleravel';

export type RiskInterpretationTemplate = {
  canonicalCategory: string;
  aliases: string[];
  purpose: string;
  observedFactors: string[];
  likelySources: string[];
  possibleConsequences: string[];
  recommendedActions: string[];
  followUpIndicators: string[];
};

export type RiskTechnicalFinding = RiskInterpretationTemplate & {
  category: string;
  score: number;
  risk: number;
  riskLevel: RiskLevel;
  riskLevelLabel: string;
  configured: boolean;
  riskMeaning: string;
  evidenceLabels: string[];
  limitations: string[];
};

export type CategoryScoreInput = {
  name: string;
  score: number;
  risk: number;
};

export type EvidenceCategoryInput = {
  name?: string;
  category?: string;
  drivers?: Array<{ label?: string; questionText?: string; text?: string; questionKey?: string }>;
  topDrivers?: Array<{ label?: string; questionText?: string; text?: string; questionKey?: string }>;
  questions?: Array<{ label?: string; questionText?: string; text?: string; questionKey?: string }>;
};

const DEFAULT_LIMITATIONS = [
  'A leitura é coletiva e não deve ser interpretada como diagnóstico clínico individual.',
  'Resultados com amostra pequena ou baixa adesão exigem confirmação por responsável técnico.',
  'Perguntas personalizadas precisam manter categoria, peso e regra de pontuação para sustentar a rastreabilidade.',
];

export function normalizeRiskKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getRiskLevel(risk: number): { level: RiskLevel; label: string } {
  if (risk >= 76) return { level: 'intoleravel', label: 'Intolerável' };
  if (risk >= 61) return { level: 'substancial', label: 'Substancial' };
  if (risk >= 41) return { level: 'moderado', label: 'Moderado' };
  if (risk >= 21) return { level: 'toleravel', label: 'Tolerável' };
  return { level: 'trivial', label: 'Trivial' };
}

function readingByLevel(category: string, risk: number, levelLabel: string) {
  if (risk >= 76) {
    return `O resultado indica exposição psicossocial ${levelLabel.toLowerCase()} em ${category}. Recomenda-se ação prioritária, confirmação técnica dos fatores envolvidos e acompanhamento de curto prazo.`;
  }
  if (risk >= 61) {
    return `O resultado indica risco ${levelLabel.toLowerCase()} em ${category}, com sinais relevantes de fragilidade organizacional. A categoria deve entrar no plano de ação com responsáveis, prazo e indicadores.`;
  }
  if (risk >= 41) {
    return `O resultado indica risco ${levelLabel.toLowerCase()} em ${category}. Há evidências suficientes para ação preventiva e monitoramento, especialmente nos fatores que mais puxaram o risco.`;
  }
  if (risk >= 21) {
    return `O resultado indica risco ${levelLabel.toLowerCase()} em ${category}. Recomenda-se manter práticas existentes e observar tendência nas próximas medições.`;
  }
  return `O resultado indica risco ${levelLabel.toLowerCase()} em ${category}. Não há sinal coletivo relevante no momento, mas a categoria deve continuar em monitoramento periódico.`;
}

const TEMPLATES: RiskInterpretationTemplate[] = [
  {
    canonicalCategory: 'Sobrecarga e ritmo',
    aliases: ['sobrecarga', 'ritmo', 'carga', 'demanda', 'pressao', 'horas extras', 'metas'],
    purpose: 'Avaliar se a demanda, o ritmo, as metas, as pausas e os recursos disponíveis estão compatíveis com a jornada e com a capacidade operacional da equipe.',
    observedFactors: ['volume de trabalho', 'pressão de tempo', 'pausas', 'horas extras', 'distribuição de demandas', 'apoio em picos de trabalho'],
    likelySources: ['subdimensionamento de equipe', 'metas pouco realistas', 'picos de demanda sem reforço', 'gargalos de processo', 'prioridades conflitantes'],
    possibleConsequences: ['fadiga', 'queda de atenção', 'retrabalho', 'absenteísmo', 'conflitos por pressão operacional', 'dificuldade de recuperação após a jornada'],
    recommendedActions: ['revisar dimensionamento e escalas', 'reavaliar metas e prazos', 'organizar pausas e micro-pausas', 'mapear gargalos do processo', 'monitorar horas extras por 90 dias'],
    followUpIndicators: ['horas extras', 'absenteísmo', 'retrabalho', 'fila/backlog operacional', 'turnover por setor'],
  },
  {
    canonicalCategory: 'Clareza e autonomia',
    aliases: ['clareza', 'autonomia', 'papel', 'responsabilidade', 'orientacao', 'prioridade'],
    purpose: 'Avaliar se as pessoas compreendem responsabilidades, prioridades, limites de atuação e grau de autonomia para executar o trabalho.',
    observedFactors: ['clareza de papéis', 'orientação para execução', 'autonomia', 'mudanças de prioridade', 'cobranças fora da função'],
    likelySources: ['papéis mal definidos', 'comunicação insuficiente', 'mudanças sem alinhamento', 'microgestão', 'processos decisórios pouco claros'],
    possibleConsequences: ['insegurança operacional', 'retrabalho', 'conflitos de responsabilidade', 'baixa eficiência', 'aumento de tensão com lideranças'],
    recommendedActions: ['revisar descrições de função', 'formalizar prioridades por equipe', 'criar rituais de alinhamento', 'treinar lideranças para delegação clara', 'definir critérios de autonomia'],
    followUpIndicators: ['retrabalho', 'mudanças emergenciais de prioridade', 'dúvidas recorrentes', 'tempo de resposta da liderança', 'conflitos de responsabilidade'],
  },
  {
    canonicalCategory: 'Liderança e gestão',
    aliases: ['lideranca', 'gestao', 'lider', 'feedback', 'cobranca'],
    purpose: 'Avaliar a qualidade da condução da liderança, incluindo respeito, escuta, feedback, orientação, resolução de conflitos e equilíbrio na cobrança por resultados.',
    observedFactors: ['respeito da liderança', 'escuta', 'feedback', 'orientação após erros', 'cobrança equilibrada', 'tratamento de conflitos'],
    likelySources: ['baixa preparação de lideranças', 'cobrança sem apoio', 'feedback inadequado', 'ausência de rotina de escuta', 'conflitos não mediados'],
    possibleConsequences: ['perda de confiança', 'conflitos interpessoais', 'medo de relatar dificuldades', 'baixa cooperação', 'rotatividade'],
    recommendedActions: ['capacitar lideranças em gestão psicossocial', 'implantar rotina de feedback respeitoso', 'criar canal de escuta com devolutiva', 'acompanhar conflitos críticos', 'definir padrão de conduta de liderança'],
    followUpIndicators: ['turnover por liderança', 'queixas ao RH', 'clima por equipe', 'adesão a feedbacks', 'resolução de conflitos'],
  },
  {
    canonicalCategory: 'Relações interpessoais',
    aliases: ['relacoes', 'interpessoais', 'colegas', 'conflitos', 'cooperacao', 'dignidade'],
    purpose: 'Avaliar a qualidade das relações entre colegas e setores, incluindo cooperação, respeito, dignidade e tratamento justo de conflitos.',
    observedFactors: ['respeito entre colegas', 'cooperação', 'conflitos', 'brincadeiras ofensivas', 'dignidade', 'respeito entre setores'],
    likelySources: ['normas de convivência frágeis', 'conflitos acumulados', 'competição interna excessiva', 'falhas de comunicação entre áreas', 'tolerância a comportamentos inadequados'],
    possibleConsequences: ['isolamento', 'queda de cooperação', 'aumento de conflitos', 'comunicação defensiva', 'redução da segurança psicológica'],
    recommendedActions: ['reforçar acordos de convivência', 'mediar conflitos recorrentes', 'treinar equipes em comunicação respeitosa', 'acompanhar áreas com maior tensão', 'definir fluxo para tratar comportamentos inadequados'],
    followUpIndicators: ['relatos de conflito', 'cooperação entre áreas', 'queixas formais e informais', 'retrabalho entre setores', 'adesão a mediações'],
  },
  {
    canonicalCategory: 'Assédio e violência',
    aliases: ['assedio', 'violencia', 'humilhacao', 'discriminacao', 'desrespeito', 'canal de relato'],
    purpose: 'Avaliar sinais coletivos de exposição a humilhação, discriminação, desrespeito, violência psicológica e segurança para relatar situações graves.',
    observedFactors: ['humilhação', 'gritos', 'constrangimento', 'discriminação', 'segurança para relatar', 'conhecimento de canais'],
    likelySources: ['canal de relato pouco confiável', 'ausência de protocolo de apuração', 'tolerância a condutas inadequadas', 'lideranças despreparadas', 'medo de retaliação'],
    possibleConsequences: ['silenciamento de relatos', 'agravamento de conflitos', 'afastamentos', 'rotatividade', 'perda de confiança institucional'],
    recommendedActions: ['formalizar canal confidencial', 'divulgar protocolo de apuração', 'treinar lideranças e RH', 'proteger contra retaliação', 'acompanhar reincidências'],
    followUpIndicators: ['uso do canal de relato', 'tempo de apuração', 'reincidência por área', 'afastamentos relacionados', 'percepção de segurança para relatar'],
  },
  {
    canonicalCategory: 'Reconhecimento e justiça',
    aliases: ['reconhecimento', 'justica', 'equidade', 'regras', 'crescimento', 'desenvolvimento'],
    purpose: 'Avaliar percepção de reconhecimento, justiça, comunicação de decisões, oportunidade de participação e equilíbrio entre cobrança e valorização.',
    observedFactors: ['reconhecimento', 'justiça nas regras', 'comunicação de decisões', 'participação', 'crescimento', 'equilíbrio cobrança-reconhecimento'],
    likelySources: ['critérios pouco transparentes', 'feedback raro', 'decisões sem comunicação', 'baixa participação em melhorias', 'percepção de favoritismo'],
    possibleConsequences: ['desmotivação', 'cinismo organizacional', 'queda de engajamento', 'conflitos sobre equidade', 'maior intenção de saída'],
    recommendedActions: ['definir critérios de reconhecimento', 'dar transparência a regras e decisões', 'criar canais de sugestão', 'acompanhar percepção de justiça por área', 'integrar desenvolvimento ao plano de gestão'],
    followUpIndicators: ['participação em sugestões', 'percepção de justiça', 'promoções e oportunidades', 'feedbacks registrados', 'turnover voluntário'],
  },
  {
    canonicalCategory: 'Bem-estar',
    aliases: ['bem estar', 'saude', 'estresse', 'sono', 'descanso', 'vida pessoal', 'equilibrio'],
    purpose: 'Avaliar sinais coletivos de desgaste relacionado ao trabalho e presença de fatores protetivos para recuperação, equilíbrio e bem-estar.',
    observedFactors: ['estresse relacionado ao trabalho', 'sono e descanso', 'equilíbrio vida-trabalho', 'condição ao final da jornada', 'segurança para falar sobre dificuldades'],
    likelySources: ['exigências emocionais elevadas', 'dificuldade de recuperação', 'sobrecarga sustentada', 'baixo apoio', 'ambiente com tensão recorrente'],
    possibleConsequences: ['fadiga', 'queda de concentração', 'absenteísmo', 'presenteísmo', 'maior procura por apoio', 'intenção de saída'],
    recommendedActions: ['implantar rotina de escuta coletiva', 'monitorar sinais de fadiga', 'revisar fatores de estresse por setor', 'orientar lideranças para acolhimento', 'encaminhar casos individuais pelos fluxos adequados sem exposição'],
    followUpIndicators: ['absenteísmo', 'presenteísmo', 'relatos de fadiga', 'adesão a ações de apoio', 'reavaliação do score em 90 dias'],
  },
  {
    canonicalCategory: 'Recursos e Processos',
    aliases: ['recursos', 'processos', 'ferramentas', 'informacoes', 'comunicacao', 'mudancas'],
    purpose: 'Avaliar se comunicação, recursos, ferramentas, ambiente físico e processos sustentam a execução segura e organizada do trabalho.',
    observedFactors: ['comunicação interna', 'recursos e ferramentas', 'ambiente físico', 'processos de trabalho', 'prevenção de conflitos', 'gestão de mudanças'],
    likelySources: ['ferramentas insuficientes', 'processos instáveis', 'comunicação fragmentada', 'mudanças sem planejamento', 'falta de informação para executar tarefas'],
    possibleConsequences: ['retrabalho', 'frustração operacional', 'queda de produtividade', 'conflitos entre áreas', 'aumento de pressão sobre lideranças'],
    recommendedActions: ['mapear recursos críticos', 'revisar fluxos de trabalho', 'melhorar comunicação de mudanças', 'corrigir gargalos de ferramentas', 'acompanhar incidentes de processo'],
    followUpIndicators: ['chamados de suporte', 'retrabalho', 'tempo de ciclo', 'falhas de comunicação', 'adesão a novos processos'],
  },
];

const FALLBACK_TEMPLATE: RiskInterpretationTemplate = {
  canonicalCategory: 'Categoria personalizada',
  aliases: [],
  purpose: 'Avaliar fator psicossocial configurado no questionário personalizado da campanha.',
  observedFactors: ['fator configurado no questionário', 'respostas agregadas', 'peso e regra de pontuação definidos pela metodologia'],
  likelySources: ['fonte organizacional a confirmar pelo responsável técnico', 'processos ou práticas de gestão relacionados à categoria', 'condições de trabalho associadas ao fator avaliado'],
  possibleConsequences: ['efeitos coletivos a confirmar tecnicamente', 'queda de engajamento', 'tensão organizacional', 'necessidade de investigação complementar'],
  recommendedActions: ['validar a categoria com responsável técnico', 'revisar perguntas e pesos configurados', 'cruzar o achado com indicadores internos', 'definir ação preventiva compatível com o fator avaliado'],
  followUpIndicators: ['novo score da categoria', 'adesão à ação preventiva', 'indicadores internos definidos pela empresa', 'comentários agregados sem identificação individual'],
};

function templateForCategory(categoryName: string) {
  const normalized = normalizeRiskKey(categoryName);
  const template = TEMPLATES.find((item) => {
    const canonical = normalizeRiskKey(item.canonicalCategory);
    return normalized.includes(canonical) || canonical.includes(normalized) || item.aliases.some((alias) => normalized.includes(normalizeRiskKey(alias)));
  });

  if (template) return { template, configured: true };

  return {
    template: {
      ...FALLBACK_TEMPLATE,
      canonicalCategory: categoryName,
    },
    configured: false,
  };
}

function evidenceName(driver: any) {
  return String(driver?.label || driver?.questionText || driver?.text || driver?.questionKey || '').trim();
}

function evidenceForCategory(categoryName: string, evidenceCategories: EvidenceCategoryInput[] = []) {
  const key = normalizeRiskKey(categoryName);
  const evidence = evidenceCategories.find((item) => normalizeRiskKey(String(item.name || item.category || '')) === key);
  const drivers = evidence?.drivers || evidence?.topDrivers || evidence?.questions || [];
  return drivers.map(evidenceName).filter(Boolean).slice(0, 3);
}

export function buildRiskTechnicalFindings(
  categories: CategoryScoreInput[] = [],
  evidenceCategories: EvidenceCategoryInput[] = []
): RiskTechnicalFinding[] {
  return categories.map((category) => {
    const { template, configured } = templateForCategory(category.name);
    const { level, label } = getRiskLevel(category.risk);

    return {
      ...template,
      category: category.name,
      score: category.score,
      risk: category.risk,
      riskLevel: level,
      riskLevelLabel: label,
      configured,
      riskMeaning: readingByLevel(category.name, category.risk, label),
      evidenceLabels: evidenceForCategory(category.name, evidenceCategories),
      limitations: configured
        ? DEFAULT_LIMITATIONS
        : [
            'Categoria personalizada sem biblioteca técnica específica. A leitura abaixo é genérica e exige validação do responsável técnico.',
            ...DEFAULT_LIMITATIONS,
          ],
    };
  });
}

