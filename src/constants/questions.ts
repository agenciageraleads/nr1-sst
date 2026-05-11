/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: number;
  text: string;
  category: string;
  type: 'scale' | 'frequency' | 'open' | 'selection';
  isNegative?: boolean;
}

export const EMPLOYEE_QUESTIONS: Question[] = [
  // Bloco 1 — Carga de trabalho e ritmo (Changed from Bloco 2 to accommodate user request or just keeping it organized)
  { id: 1, text: 'Minha carga de trabalho é adequada para minha jornada.', category: 'Sobrecarga e ritmo', type: 'scale' },
  { id: 2, text: 'Consigo realizar minhas atividades sem pressão excessiva de tempo.', category: 'Sobrecarga e ritmo', type: 'scale' },
  { id: 3, text: 'Tenho pausas suficientes durante o trabalho.', category: 'Sobrecarga e ritmo', type: 'scale' },
  { id: 4, text: 'Consigo finalizar minhas tarefas sem precisar fazer horas extras com frequência.', category: 'Sobrecarga e ritmo', type: 'scale' },
  { id: 5, text: 'O volume de trabalho é bem distribuído entre as pessoas da equipe.', category: 'Sobrecarga e ritmo', type: 'scale' },
  { id: 6, text: 'As metas ou cobranças do meu trabalho são realistas.', category: 'Sobrecarga e ritmo', type: 'scale' },
  { id: 7, text: 'Quando há aumento de demanda, recebo apoio suficiente da liderança ou da equipe.', category: 'Sobrecarga e ritmo', type: 'scale' },
  
  // Bloco 2 — Clareza de função e autonomia
  { id: 8, text: 'Sei exatamente o que é esperado de mim no trabalho.', category: 'Clareza e autonomia', type: 'scale' },
  { id: 9, text: 'Minhas responsabilidades são claras.', category: 'Clareza e autonomia', type: 'scale' },
  { id: 10, text: 'Recebo orientações suficientes para executar minhas atividades.', category: 'Clareza e autonomia', type: 'scale' },
  { id: 11, text: 'Tenho autonomia adequada para realizar meu trabalho.', category: 'Clareza e autonomia', type: 'scale' },
  { id: 12, text: 'As mudanças de prioridade são comunicadas com clareza.', category: 'Clareza e autonomia', type: 'scale' },
  { id: 13, text: 'Raramente sou cobrado por tarefas que não fazem parte da minha função.', category: 'Clareza e autonomia', type: 'scale' },

  // Bloco 3 — Liderança e gestão
  { id: 14, text: 'Meu líder trata as pessoas com respeito.', category: 'Liderança e gestão', type: 'scale' },
  { id: 15, text: 'Meu líder escuta dúvidas, dificuldades ou sugestões.', category: 'Liderança e gestão', type: 'scale' },
  { id: 16, text: 'Recebo feedback de forma respeitosa.', category: 'Liderança e gestão', type: 'scale' },
  { id: 17, text: 'Quando erro, sou orientado de forma adequada, sem humilhação ou exposição.', category: 'Liderança e gestão', type: 'scale' },
  { id: 18, text: 'A cobrança por resultado é feita de forma equilibrada.', category: 'Liderança e gestão', type: 'scale' },
  { id: 19, text: 'Sinto que posso conversar com meu líder sobre dificuldades no trabalho.', category: 'Liderança e gestão', type: 'scale' },
  { id: 20, text: 'A liderança age para resolver conflitos na equipe.', category: 'Liderança e gestão', type: 'scale' },

  // Bloco 4 — Relações interpessoais e clima
  { id: 21, text: 'O ambiente entre colegas é respeitoso.', category: 'Relações interpessoais', type: 'scale' },
  { id: 22, text: 'Existe cooperação entre as pessoas da equipe.', category: 'Relações interpessoais', type: 'scale' },
  { id: 23, text: 'Os conflitos são tratados de forma justa.', category: 'Relações interpessoais', type: 'scale' },
  { id: 24, text: 'Não presencio brincadeiras ofensivas, humilhações ou comentários desrespeitosos.', category: 'Relações interpessoais', type: 'scale' },
  { id: 25, text: 'Sinto que sou tratado com dignidade no trabalho.', category: 'Relações interpessoais', type: 'scale' },
  { id: 26, text: 'Existe respeito entre setores diferentes.', category: 'Relações interpessoais', type: 'scale' },

  // Bloco 5 — Assédio, discriminação e violência psicológica
  { id: 27, text: 'Já presenciei situações de humilhação, gritos, constrangimento ou exposição no ambiente de trabalho.', category: 'Assédio e violência', type: 'frequency', isNegative: true },
  { id: 28, text: 'Já sofri tratamento desrespeitoso, ofensivo ou humilhante no trabalho.', category: 'Assédio e violência', type: 'frequency', isNegative: true },
  { id: 29, text: 'Já presenciei ou sofri discriminação por gênero, idade, raça/cor, religião, deficiência, orientação sexual, aparência, origem ou outra condição pessoal.', category: 'Assédio e violência', type: 'frequency', isNegative: true },
  { id: 30, text: 'Sinto segurança para relatar situações de assédio, discriminação ou desrespeito.', category: 'Assédio e violência', type: 'scale' },
  { id: 31, text: 'Sei qual canal procurar caso sofra ou presencie uma situação grave no trabalho.', category: 'Assédio e violência', type: 'scale' },

  // Bloco 6 — Reconhecimento, justiça e participação
  { id: 32, text: 'Sinto que meu trabalho é reconhecido.', category: 'Reconhecimento e justiça', type: 'scale' },
  { id: 33, text: 'As decisões que afetam meu trabalho são comunicadas de forma clara.', category: 'Reconhecimento e justiça', type: 'scale' },
  { id: 34, text: 'Tenho oportunidade de dar sugestões de melhoria.', category: 'Reconhecimento e justiça', type: 'scale' },
  { id: 35, text: 'As regras da empresa são aplicadas de forma justa.', category: 'Reconhecimento e justiça', type: 'scale' },
  { id: 36, text: 'Existe equilíbrio entre cobrança e reconhecimento.', category: 'Reconhecimento e justiça', type: 'scale' },
  { id: 37, text: 'Sinto que tenho oportunidade de crescimento ou desenvolvimento.', category: 'Reconhecimento e justiça', type: 'scale' },

  // Bloco 7 — Segurança psicológica e bem-estar
  { id: 38, text: 'Sinto-me seguro para falar sobre dificuldades relacionadas ao trabalho.', category: 'Bem-estar', type: 'scale' },
  { id: 39, text: 'O trabalho não tem prejudicado meu sono, descanso ou vida pessoal.', category: 'Bem-estar', type: 'scale' },
  { id: 40, text: 'Ao final da jornada, normalmente me sinto em condições adequadas para descansar.', category: 'Bem-estar', type: 'scale' },
  { id: 41, text: 'Tenho conseguido manter equilíbrio entre trabalho e vida pessoal.', category: 'Bem-estar', type: 'scale' },
  { id: 42, text: 'Sinto que o ambiente de trabalho favorece minha saúde e bem-estar.', category: 'Bem-estar', type: 'scale' },
  { id: 43, text: 'Nos últimos meses, senti aumento de estresse relacionado ao trabalho.', category: 'Bem-estar', type: 'frequency', isNegative: true },
  { id: 44, text: 'Nos últimos meses, pensei em faltar ou sair da empresa por causa do ambiente de trabalho.', category: 'Bem-estar', type: 'frequency', isNegative: true },

  // Bloco 8 — Condições organizacionais
  { id: 45, text: 'A comunicação interna da empresa é clara.', category: 'Recursos e Processos', type: 'scale' },
  { id: 46, text: 'Tenho recursos, ferramentas e informações suficientes para fazer meu trabalho.', category: 'Recursos e Processos', type: 'scale' },
  { id: 47, text: 'O ambiente físico contribui para trabalhar bem.', category: 'Recursos e Processos', type: 'scale' },
  { id: 48, text: 'O sistema, processo ou forma de trabalho facilita a execução das atividades.', category: 'Recursos e Processos', type: 'scale' },
  { id: 49, text: 'A empresa se preocupa em prevenir conflitos, sobrecarga e problemas de relacionamento.', category: 'Recursos e Processos', type: 'scale' },
  { id: 50, text: 'Sinto que as mudanças na empresa são conduzidas de forma organizada.', category: 'Recursos e Processos', type: 'scale' },
];

export const SCALE_LABELS = {
  1: 'Discordo totalmente',
  2: 'Discordo parcialmente',
  3: 'Nem concordo, nem discordo',
  4: 'Concordo parcialmente',
  5: 'Concordo totalmente',
  6: 'Não se aplica'
};

export const FREQUENCY_LABELS = {
  1: 'Nunca',
  2: 'Raramente',
  3: 'Às vezes',
  4: 'Frequentemente',
  5: 'Sempre',
  6: 'Prefiro não responder'
};
