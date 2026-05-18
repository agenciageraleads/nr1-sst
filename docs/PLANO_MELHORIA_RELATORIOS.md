# Plano De Melhoria Dos Relatorios NR1-SST

## Objetivo

Transformar o relatorio atual, que hoje usa medias por categoria e textos 5W2H genericos, em um relatorio tecnico mais util, rastreavel e configuravel para clientes e usuarios.

O novo relatorio deve responder claramente:

- quais dados foram usados;
- quais fatores e evidencias principais puxaram cada risco;
- quais grupos foram considerados sem quebrar anonimato;
- por que cada acao foi recomendada;
- qual regra, evidencia ou analise sustenta cada recomendacao;
- quais limites existem na amostra e na metodologia.

## Principio De Produto

O score e a classificacao de risco devem continuar deterministicos e auditaveis. Uma LLM pode ser usada, mas apenas como camada de redacao, sintese e enriquecimento controlado, nunca como unica fonte de decisao.

Modelo recomendado:

1. Motor estatistico calcula riscos e evidencias.
2. Matriz tecnica escolhe acoes candidatas.
3. LLM, opcionalmente, escreve uma versao consultiva em linguagem clara.
4. Validador confirma que cada frase da LLM esta apoiada nos dados.
5. Responsavel tecnico revisa e aprova antes de entrega quando o relatorio tiver valor tecnico/legal.

## Contexto Normativo Considerado

Fontes oficiais consultadas em 2026:

- NR-01 atualizada: https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/nr-01-atualizada-2024-ii.pdf
- Comunicado MTE sobre fatores de risco psicossociais no GRO: https://www.gov.br/trabalho-e-emprego/pt-br/noticias-e-conteudo/2025/abril/inclusao-de-fatores-de-risco-psicossociais-no-gro-comeca-em-carater-educativo-a-partir-de-maio
- Manual MTE GRO/PGR 2026: https://www.gov.br/trabalho-e-emprego/pt-br/noticias-e-conteudo/2026/marco/mte-lanca-manual-para-orientar-gestao-de-riscos-ocupacionais-nas-empresas
- Perguntas e respostas MTE NR-1, publicado em maio de 2026: https://www.gov.br/trabalho-e-emprego/pt-br/noticias-e-conteudo/2026/maio/mte-publica-guia-de-perguntas-e-respostas-para-orientar-empresas-sobre-mudancas-da-nr-1
- OMS - Mental health at work: https://www.who.int/news-room/fact-sheets/detail/mental-health-at-work
- OMS - Guidelines on mental health at work: https://www.who.int/publications/i/item/9789240053052
- OIT - Psychosocial risks and Mental Health at Work: https://www.ilo.org/topics-and-sectors/safety-and-health-work/psychosocial-risks-and-mental-health-work

Pontos praticos para o produto:

- o relatorio deve apoiar identificacao de perigos, avaliacao de riscos, classificacao, medidas de prevencao e acompanhamento;
- deve considerar condicoes de trabalho e fatores psicossociais relacionados ao trabalho;
- deve registrar grupos expostos, fontes/circunstancias e medidas de prevencao;
- deve respeitar a participacao/percepcao dos trabalhadores sem expor respostas individuais;
- deve priorizar intervencoes organizacionais sobre condicoes, ambiente, desenho e gestao do trabalho;
- deve deixar claro que metodologia e responsaveis sao definidos pela organizacao e equipe tecnica competente.

## Diagnostico Do Estado Atual

Hoje o relatorio:

- calcula score por categoria no frontend do formulario de colaborador;
- salva `scores` agregados por resposta em `employee_responses`;
- calcula media por categoria;
- transforma score em risco com `risco = 100 - score`;
- considera critico quando risco e maior que 40%;
- gera plano 5W2H por categoria critica usando texto fixo;
- nao usa perguntas especificas, setores, respostas abertas ou formulario institucional para escolher a acao;
- nao usa IA/LLM.

## Novo Modelo De Geracao Do Plano De Acao

Cada acao recomendada deve nascer de um encadeamento explicito:

```text
categoria critica
-> fatores e perguntas de suporte consolidadas
-> evidencia estatistica agregada
-> grupo afetado, quando houver amostra minima
-> perigo/fator psicossocial relacionado
-> causa provavel
-> acao preventiva sugerida
-> indicador de acompanhamento
-> prazo e responsavel
```

Exemplo:

```text
Categoria: Sobrecarga e ritmo
Risco: 68%
Evidencias principais:
- pausas insuficientes: score baixo
- horas extras frequentes: score baixo
- metas pouco realistas: score baixo

Diagnostico:
Indicios de demanda acima da capacidade operacional e baixa recuperacao durante jornada.

Acoes:
- revisar dimensionamento da equipe;
- criar politica de pausas e micro-pausas;
- revisar metas e prazos com liderancas;
- monitorar horas extras, absenteismo e retrabalho por 90 dias.
```

## Camada De Interpretacao Tecnica Por Categoria/Risco

O relatorio nao deve abrir uma ficha para cada pergunta, porque isso tornaria o PDF longo demais em questionarios com 50 ou mais itens. Para ser util ao dono da empresa, RH e liderancas, a leitura principal deve ser por categoria de risco identificada, com as perguntas usadas apenas como evidencias resumidas e auditaveis.

Cada categoria calculavel deve poder gerar:

- por que essa categoria existe;
- quais fatores psicossociais ela tenta observar;
- quais perguntas ou indicadores mais influenciaram o resultado;
- como a faixa de risco foi determinada;
- o que significa risco baixo, medio, alto ou critico;
- que tipo de perigo/fonte/circunstancia pode estar associado;
- quais possiveis efeitos organizacionais e de saude devem ser observados sem fazer diagnostico clinico individual;
- quais acoes preventivas podem ser tomadas;
- quais indicadores devem ser acompanhados depois da acao;
- quais limites existem na interpretacao, especialmente amostra pequena, perguntas personalizadas e anonimato.

Formato recomendado para cada categoria no relatorio:

```text
Categoria: Sobrecarga e ritmo
Risco identificado: Alto

Por que avaliamos essa categoria:
Observa se a demanda de trabalho, ritmo, metas, pausas e recursos disponiveis estao compativeis com a jornada e com a capacidade operacional da equipe.

Evidencias principais:
- dificuldade para finalizar tarefas dentro da jornada;
- percepcao de ritmo intenso;
- pausas insuficientes ou pouco praticaveis.

Interpretacao tecnica:
Pode indicar subdimensionamento, metas/prioridades pouco realistas, gargalos de processo, falta de apoio em picos de demanda ou baixa autonomia para reorganizar tarefas.

Acoes possiveis:
- levantar horas extras reais por setor;
- revisar dimensionamento e distribuicao de tarefas;
- renegociar metas/prazos;
- criar rotina de priorizacao com liderancas;
- acompanhar horas extras, absenteismo, retrabalho e turnover por 90 dias.
```

Importante: a linguagem deve ser de "indicadores", "sinais", "evidencias coletivas" e "hipoteses organizacionais". O sistema nao deve declarar transtornos, adoecimentos individuais ou diagnosticos clinicos.

## Metadados Tecnicos Necessarios

Para categorias padrao, riscos personalizados e perguntas personalizadas, o motor de questionarios deve aceitar metadados editoriais alem dos metadados de calculo:

- `riskCategory`: categoria tecnica usada no relatorio;
- `categoryPurpose`: por que a categoria existe;
- `psychosocialFactors`: fatores psicossociais observados pela categoria;
- `riskInterpretationByRange`: leitura tecnica por faixa de risco;
- `possibleSources`: fontes/circunstancias provaveis;
- `possibleConsequences`: efeitos coletivos possiveis, sem diagnostico individual;
- `recommendedActions`: acoes candidatas por categoria e faixa;
- `followUpIndicators`: indicadores de acompanhamento;
- `legalOrTechnicalBasis`: referencia normativa/tecnica;
- `privacyNote`: como manter anonimato e limites de interpretacao;
- `requiresHumanReview`: quando a interpretacao deve ser revisada por responsavel tecnico;
- `technicalPurpose`: por que a pergunta existe;
- `psychosocialFactor`: fator psicossocial observado;
- `driverWeight`: peso da pergunta como evidencia dentro da categoria;
- `driverLabel`: texto curto para exibir quando a pergunta aparecer entre as principais evidencias.

Esses metadados podem ser preenchidos manualmente por uma biblioteca tecnica e enriquecidos por LLM, mas a LLM nao deve inventar significado sem base cadastrada. No PDF, a interpretacao fica consolidada por categoria; os metadados por pergunta servem para explicar internamente quais evidencias sustentaram o resultado.

## Dados Que Devem Entrar Na Analise

## Compatibilidade Com Dados Historicos Da VPS

O relatorio completo deve aproveitar as amostras ja coletadas no banco da VPS sem exigir recaptura dos trabalhadores. Para isso, o sistema trabalha em dois niveis:

- quando existem `answers`, `questionnaire_id` e metadados das perguntas, o relatorio usa evidencias por pergunta, fatores mais influentes, interpretacao tecnica e plano 5W2H;
- quando a campanha historica tem apenas `employee_responses.scores` por categoria, o relatorio usa as medias agregadas salvas para gerar risco, interpretacao tecnica e plano 5W2H, marcando as evidencias como agregadas legadas.

Esse modo legado preserva a amostra existente e evita inventar rastreabilidade por pergunta quando o banco antigo nao tem esses metadados. O texto exibido no relatorio deve deixar claro que a evidencia foi calculada a partir do score medio ja coletado na categoria. Na migracao da VPS, a regra e nao sobrescrever `answers`, `scores` ou questionarios antigos; qualquer enriquecimento deve ser aditivo.

Para empresas com menos de 5 colaboradores, nao existe anonimato estatistico suficiente para transformar respostas individuais em score coletivo anonimo. Nesses casos, o produto deve seguir um modo microempresa: relatorio metodologico, avaliacao institucional, observacao tecnica, entrevista qualificada ou checklist aplicado por responsavel tecnico, sem expor medias por categoria derivadas diretamente das respostas dos trabalhadores.

### Obrigatorios Para O MVP

- media geral por categoria;
- media por pergunta;
- perguntas de maior contribuicao para o risco;
- metadados de cada pergunta personalizada usada no calculo: chave, categoria, tipo, peso, pontuacao invertida, opcoes pontuadas e regra numerica;
- metadados interpretativos por categoria/risco: finalidade tecnica, fatores observados, significado do resultado e acoes candidatas;
- rotulos curtos das perguntas de suporte para evidencias resumidas;
- quantidade de respostas;
- amostra minima por campanha e por segmento;
- formulario institucional recebido ou pendente;
- dados basicos da empresa e campanha.

### Recomendados Para A Segunda Versao

- segmentacao anonima por setor, tempo de empresa, tipo de trabalho e jornada;
- dispersao das respostas, nao apenas media;
- comparacao entre percepcao dos colaboradores e formulario institucional;
- tendencias quando houver campanhas anteriores;
- respostas abertas com mascaramento de dados pessoais;
- evidencias de indicadores internos informados pela empresa, como absenteismo, afastamentos, turnover e horas extras, quando existirem.

## Matriz De Recomendacao

Criar uma biblioteca configuravel de acoes. Cada acao deve ter:

- categoria relacionada;
- perguntas gatilho;
- condicao de disparo;
- severidade minima;
- descricao tecnica;
- texto amigavel para cliente;
- 5W2H;
- indicador de acompanhamento;
- evidencia exigida;
- prazo sugerido;
- responsavel sugerido;
- nivel de prevencao.

Niveis de prevencao sugeridos:

- primaria: mexe na organizacao do trabalho e reduz a fonte do risco;
- secundaria: melhora processos, comunicacao, capacitacao e suporte;
- terciaria: acolhimento, encaminhamento e resposta a danos ja percebidos.

## Exemplos De Gatilhos Por Categoria

### Sobrecarga E Ritmo

- Q3 baixo: implementar rotina de pausas e revisao de jornada.
- Q4 baixo: analisar horas extras e dimensionamento da equipe.
- Q5 baixo: revisar distribuicao de tarefas.
- Q6 baixo: revisar metas, prazos e indicadores de produtividade.
- Q7 baixo: definir fluxo de apoio da lideranca em picos de demanda.

### Clareza E Autonomia

- Q8/Q9 baixo: revisar descricoes de funcao e responsabilidades.
- Q10 baixo: melhorar orientacoes, onboarding e instrucoes de trabalho.
- Q11 baixo: revisar autonomia decisoria por cargo.
- Q12 baixo: formalizar comunicacao de mudancas de prioridade.
- Q13 baixo: reduzir desvios de funcao e cobranças fora do escopo.

### Lideranca E Gestao

- Q14/Q16/Q17 baixo: capacitar liderancas em comunicacao respeitosa e feedback.
- Q15/Q19 baixo: criar rituais de escuta e acompanhamento.
- Q18 baixo: calibrar cobrancas por resultado.
- Q20 baixo: criar protocolo de mediacao de conflitos.

### Relacoes Interpessoais

- Q21/Q25 baixo: reforcar padroes de respeito e convivencia.
- Q22 baixo: trabalhar cooperacao entre equipes.
- Q23 baixo: instituir fluxo de tratamento justo de conflitos.
- Q24 baixo: intervir em brincadeiras ofensivas e humilhacoes.
- Q26 baixo: mapear atritos entre setores.

### Assedio E Violencia

- Q27/Q28/Q29 alto risco: ativar protocolo de investigacao, canal de denuncia e medidas imediatas de protecao.
- Q30 baixo: aumentar seguranca psicologica para relato.
- Q31 baixo: comunicar canais e fluxo de acolhimento.

### Reconhecimento E Justica

- Q32 baixo: implantar praticas de reconhecimento.
- Q33 baixo: melhorar comunicacao de decisoes.
- Q34 baixo: criar canais de participacao.
- Q35 baixo: revisar consistencia na aplicacao de regras.
- Q36 baixo: equilibrar cobranca e reconhecimento.
- Q37 baixo: mapear trilhas de desenvolvimento.

### Bem-Estar

- Q38 baixo: criar espacos seguros para falar de dificuldades do trabalho.
- Q39/Q41 baixo: revisar carga, jornada e fronteiras trabalho-vida.
- Q40 baixo: avaliar recuperacao pos-jornada.
- Q42 baixo: plano de melhoria do ambiente de trabalho.
- Q43/Q44 alto risco: investigar estressores ocupacionais recorrentes e risco de evasao/faltas.

### Recursos E Processos

- Q45 baixo: melhorar comunicacao interna.
- Q46 baixo: suprir ferramentas, recursos e informacoes.
- Q47 baixo: avaliar ambiente fisico em conjunto com ergonomia.
- Q48 baixo: revisar processos e sistemas que dificultam o trabalho.
- Q49 baixo: fortalecer prevencao de conflitos e sobrecarga.
- Q50 baixo: melhorar gestao de mudancas.

## Uso De LLM

### Quando Usar

- sintetizar conclusoes executivas;
- transformar evidencias em texto consultivo claro;
- comparar formulario institucional com percepcao dos colaboradores;
- agrupar respostas abertas anonimizadas por temas;
- sugerir redacao do 5W2H a partir de acoes ja escolhidas pela matriz.

### Quando Nao Usar

- calcular score;
- decidir sozinha se ha risco;
- inventar fatos ou indicadores;
- processar dados pessoais crus sem mascaramento;
- substituir avaliacao tecnica do responsavel.

### Guardrails Obrigatorios

- enviar apenas dados agregados e anonimizados;
- mascarar nomes, emails, telefones e CNPJ quando nao forem necessarios;
- exigir saida em JSON validado por schema;
- exigir citacao de evidencias internas, como categoria, pergunta, score e regra acionada;
- rejeitar recomendacao sem evidencia;
- manter log de modelo, prompt, resposta, custo, tempo e versao da metodologia;
- permitir desligar IA por configuracao.

## Mudancas De Produto

### Area De Configuracao

Criar uma area "Metodologia do Relatorio" para configurar:

- pesos por categoria;
- pesos por pergunta;
- limites de risco baixo, moderado, alto e critico;
- minimo anonimo por segmento;
- biblioteca de acoes;
- templates 5W2H;
- uso de LLM ligado/desligado;
- modelo LLM e temperatura;
- texto padrao de limitacoes metodologicas.

### Tela De Resultados

Adicionar:

- ranking de fatores/perguntas de suporte por categoria, como drill-down interno;
- explicacao do calculo;
- mapa de calor por categoria/pergunta;
- filtro por segmento anonimo;
- comparacao colaborador versus institucional;
- painel "por que esta acao foi sugerida?".

### Relatorio PDF

Adicionar secoes:

- sumario executivo;
- metodologia e limites;
- matriz de riscos por categoria;
- evidencias por categoria;
- principais fatores causadores, com ate 3 perguntas de suporte por categoria quando necessario;
- interpretacao tecnica por categoria/risco;
- explicacao "por que avaliamos essa categoria";
- explicacao "o que esse conjunto de respostas indica";
- acoes possiveis por categoria, agrupadas por prioridade;
- segmentacoes anonimas relevantes;
- comparativo institucional;
- plano de acao 5W2H rastreavel;
- indicadores de acompanhamento;
- apendice tecnico com pesos, thresholds e amostra.

## Mudancas Tecnicas

### Banco

Adicionar tabelas:

- `report_methodologies`: versao da metodologia, pesos, limites e configuracoes;
- `risk_interpretation_templates`: finalidade tecnica, fatores psicossociais, leitura por faixa e limites de cada categoria/risco;
- `question_risk_drivers`: mapeamento pergunta -> categoria/fator, usado para evidencias internas e ranking de contribuicao;
- `action_templates`: biblioteca de recomendacoes;
- `risk_action_templates`: acoes candidatas vinculadas a categoria, faixa de risco, fator e indicador;
- `report_runs`: snapshot de dados, metodologia usada e data de geracao;
- `report_risk_findings`: achados por categoria/risco, com evidencias principais, interpretacao e acoes sugeridas;
- `report_recommendations`: acoes geradas com evidencias;
- `technical_basis_sources`: referencias normativas/tecnicas usadas na metodologia;
- `llm_generation_logs`: logs de uso de IA com dados mascarados.

### Backend

Extrair logica de relatorio de `api/server.ts` para servicos:

- `reportScoringService`;
- `riskEvidenceService`;
- `riskInterpretationService`;
- `recommendationEngine`;
- `reportRenderingService`;
- `llmAnalysisService`, opcional.

### Frontend

Atualizar:

- `SettingsPage.tsx` para metodologia e biblioteca de acoes;
- `QuestionnairesPage.tsx` para editar categoria, pesos e rotulos tecnicos das perguntas personalizadas;
- `ResultsPage.tsx` para evidencias, filtros e ranking de perguntas;
- `ReportPage.tsx` para relatorio tecnico rastreavel;
- dashboard publico para explicar limites de amostra e destravar valor antes do PDF.

## Fases De Implementacao

### Fase 1 - Motor De Evidencias Sem LLM

Entregas:

- calcular media por pergunta;
- calcular contribuicao de cada pergunta para o risco;
- gerar top 3 causas por categoria;
- usar o motor de questionarios como fonte oficial das regras de calculo, incluindo perguntas personalizadas;
- criar thresholds baixo/moderado/alto/critico;
- incluir evidencias no endpoint de resultados;
- atualizar tela interna para mostrar "por que deu esse risco".

Done when:

- cada categoria critica mostra evidencias principais e scores, com perguntas disponiveis no drill-down interno;
- perguntas personalizadas entram na analise quando tiverem regra de pontuacao configurada;
- nenhuma acao e gerada sem evidencia;
- testes cobrem calculo por categoria, pergunta negativa e resposta 6 ignorada.

### Fase 2 - Base Tecnica Interpretativa Por Categoria/Risco

Entregas:

- criar metadados tecnicos por categoria/risco;
- cadastrar finalidade tecnica, fatores observados, hipotese organizacional e limites de interpretacao;
- definir significado por faixa de score/risco para cada categoria;
- criar biblioteca inicial para as categorias padrao;
- permitir que perguntas personalizadas sejam vinculadas a uma categoria e tenham rotulo curto de evidencia;
- mostrar no relatorio: "por que avaliamos esta categoria", "o que o conjunto de respostas indicou" e "como isso virou prioridade".

Done when:

- cada categoria critica exibida no relatorio possui interpretacao tecnica;
- pergunta personalizada sem categoria/regra aparece com aviso de configuracao incompleta e nao entra no calculo premium;
- perguntas de suporte aparecem apenas como evidencias resumidas, nao como fichas individuais;
- texto nao faz diagnostico clinico individual;
- responsavel tecnico consegue revisar/editar a interpretacao sem deploy.

### Fase 3 - Biblioteca De Acoes E 5W2H Configuravel

Entregas:

- criar migracao para `action_templates`;
- cadastrar acoes por categoria, faixa de risco e fator causador;
- substituir textos fixos por recomendacoes selecionadas pela matriz;
- mostrar 5W2H com evidencia vinculada;
- criar CRUD simples de templates para admin.

Done when:

- alterar um template muda o relatorio sem deploy;
- cada acao informa categoria, evidencias principais e regra acionada;
- PDF e tela interna usam a mesma fonte de recomendacao.

### Fase 4 - Segmentacao Anonima E Comparativo Institucional

Entregas:

- segmentar por setor, tempo de empresa, tipo de trabalho e jornada respeitando amostra minima;
- comparar respostas institucionais com percepcao dos colaboradores;
- sinalizar divergencias relevantes;
- incluir limitacoes quando amostra for baixa.

Done when:

- segmento abaixo do minimo nao aparece;
- segmento tambem nao aparece quando o complemento do grupo fica abaixo do minimo, para evitar identificacao por diferenca;
- divergencias institucionais aparecem como evidencia, nao como julgamento automatico;
- relatorio mostra limites metodologicos.

Implementacao inicial:

- recortes por setor, tipo de funcao, tempo de empresa, tipo de trabalho e jornada;
- cada recorte exige grupo `n >= 5` e complemento `total - n >= 5`;
- grupos ocultos sao contados apenas como "grupo(s) oculto(s)", sem nomear o segmento;
- comparativo institucional cruza apenas categorias com nomes equivalentes entre formulario institucional e medias dos colaboradores;
- diferenca igual ou superior a 15 pontos de risco vira sinal de divergencia relevante para investigacao tecnica.

### Fase 5 - LLM Opcional E Controlada

Entregas:

- criar configuracao para ligar/desligar LLM;
- criar prompt com dados agregados, metadados tecnicos, acoes candidatas e regras;
- exigir JSON schema;
- validar que toda recomendacao referencia evidencia;
- validar que toda interpretacao da LLM referencia categoria, fator, score, evidencias principais e template tecnico;
- salvar logs com mascaramento;
- adicionar revisao humana para relatorios finais, se habilitada.

Done when:

- LLM nao altera scores;
- saida invalida e rejeitada;
- recomendacao sem evidencia nao entra no PDF;
- custo, modelo e versao do prompt ficam auditaveis.

Implementacao inicial:

- variaveis `REPORT_LLM_ENABLED`, `REPORT_LLM_PROVIDER`, `REPORT_LLM_MODEL`, `REPORT_LLM_PROMPT_VERSION` e `REPORT_LLM_REQUIRE_REVIEW`;
- LLM desligada por padrao, sem chamada externa enquanto nao houver provider configurado;
- payload agregado e anonimizado com categorias, interpretacoes tecnicas, acoes candidatas, recortes anonimos e comparativo institucional;
- validador rejeita acao candidata sem categoria, regra e evidencia vinculada;
- validador exige que interpretacao tecnica tenha categoria, score, risco, significado e referencia de template;
- tela interna e PDF exibem status, modelo, versao do prompt, schema, revisao humana e resumo de auditoria;
- tabela `llm_generation_logs` preparada para registrar futuras chamadas com payload mascarado, status, validacao, custo e request id;
- respostas cruas, scores por pessoa e identificadores pessoais nao entram no payload da LLM.

### Fase 6 - Relatorio Executivo Premium

Entregas:

- sumario executivo com principais riscos e prioridades;
- ficha tecnica por categoria critica;
- plano de acao agrupado por prioridade e prazo;
- indicadores de acompanhamento por acao;
- apendice tecnico;
- pagina de metodologia transparente para cliente.

Done when:

- cliente consegue entender o que fazer primeiro, por que fazer e como acompanhar;
- responsavel tecnico consegue auditar a origem de cada recomendacao;
- PDF publico e relatorio interno contam a mesma historia.

## Backlog Priorizado

1. Criar motor de evidencias por pergunta.
2. Criar biblioteca de interpretacao tecnica por categoria/risco.
3. Criar biblioteca de acoes por categoria/fator.
4. Substituir 5W2H fixo por matriz configuravel.
5. Adicionar fichas tecnicas por categoria critica no relatorio.
6. Adicionar segmentacao anonima.
7. Adicionar comparativo institucional.
8. Adicionar LLM opcional com schema, auditoria e mascaramento.
9. Criar revisao/aprovacao tecnica.
10. Criar historico de versoes de metodologia.
11. Criar exportacao premium com apendice tecnico.

## Riscos E Controles

| Risco | Controle |
| --- | --- |
| Relatorio parecer diagnostico clinico | Linguagem focada em fatores relacionados ao trabalho e organizacao do trabalho |
| Leitor interpretar como laudo psicologico individual | Aviso metodologico, anonimato, foco coletivo e revisao tecnica |
| LLM inventar fatos | Saida em JSON, evidencias obrigatorias e validador |
| Exposicao de dados pessoais | Agregacao, amostra minima, mascaramento e logs sem PII crua |
| Acoes genericas demais | Biblioteca por categoria/risco, fator causador e indicadores especificos |
| Inconsistencia entre tela e PDF | Servico unico de recomendacao no backend |
| Mudanca normativa | Versionar metodologia e manter fontes oficiais documentadas |

## Criterios De Aceite Do Relatorio Melhorado

- toda categoria critica tem evidencias;
- toda categoria critica tem explicacao tecnica, leitura do resultado e acoes possiveis;
- toda acao tem regra, categoria, evidencia principal ou divergencia que a justifique;
- o cliente entende prioridade, responsavel, prazo e indicador;
- o usuario interno consegue editar metodologia sem mexer em codigo;
- dados individuais nao aparecem;
- uso de LLM e opcional, auditavel e desligavel;
- relatorio informa limites da amostra e metodologia usada.
