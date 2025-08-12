/* ===================================
   DESAFIA BRASIL - EXAM CONTROLLER
   Sistema de simulados COMPLETO
   Todas as funcionalidades preservadas
   ================================== */

const { database } = require('../../config/database');

// Configurações COMPLETAS dos tipos de simulados
const examConfigs = {
    'enem-completo': {
        titulo: 'ENEM 2024 - Simulado Completo',
        subtitulo: 'Simulado completo nos moldes do ENEM oficial',
        materias: ['Matemática', 'Português', 'História', 'Geografia', 'Biologia', 'Química', 'Física'],
        questoesPorMateria: { 
            'Matemática': 15, 'Português': 15, 'História': 10, 
            'Geografia': 10, 'Biologia': 10, 'Química': 10, 'Física': 10 
        },
        dificuldade: ['Médio', 'Difícil'],
        tempoLimite: 300, // 5 horas
        pontosPorQuestao: 20,
        tipo: 'ENEM',
        descricao: 'Simulado completo seguindo rigorosamente o padrão oficial do ENEM, com questões de todas as áreas do conhecimento',
        icone: '🎓',
        categoria: 'Oficial'
    },
    'matematica-intensivo': {
        titulo: 'Matemática Intensivo - 30 questões',
        subtitulo: 'Treino focado e aprofundado em matemática',
        materias: ['Matemática'],
        questoesPorMateria: { 'Matemática': 30 },
        dificuldade: ['Fácil', 'Médio', 'Difícil'],
        tempoLimite: 120, // 2 horas
        pontosPorQuestao: 15,
        tipo: 'Treino',
        descricao: 'Simulado intensivo para fortalecer conhecimentos em matemática com questões de todos os níveis',
        icone: '🔢',
        categoria: 'Matéria Específica'
    },
    'portugues-redacao': {
        titulo: 'Português - Interpretação e Gramática',
        subtitulo: 'Foco total em língua portuguesa',
        materias: ['Português'],
        questoesPorMateria: { 'Português': 25 },
        dificuldade: ['Médio'],
        tempoLimite: 90,
        pontosPorQuestao: 18,
        tipo: 'Treino',
        descricao: 'Simulado especializado em interpretação de texto, gramática e literatura brasileira',
        icone: '📖',
        categoria: 'Matéria Específica'
    },
    'ciencias-natureza': {
        titulo: 'Ciências da Natureza - ENEM',
        subtitulo: 'Biologia, Química e Física integradas',
        materias: ['Biologia', 'Química', 'Física'],
        questoesPorMateria: { 'Biologia': 15, 'Química': 15, 'Física': 15 },
        dificuldade: ['Médio', 'Difícil'],
        tempoLimite: 180,
        pontosPorQuestao: 20,
        tipo: 'ENEM',
        descricao: 'Simulado das ciências da natureza seguindo exatamente o padrão ENEM',
        icone: '🧪',
        categoria: 'Área do Conhecimento'
    },
    'humanas-sociais': {
        titulo: 'Ciências Humanas e Sociais',
        subtitulo: 'História, Geografia, Sociologia e Filosofia',
        materias: ['História', 'Geografia', 'Sociologia', 'Filosofia'],
        questoesPorMateria: { 'História': 12, 'Geografia': 12, 'Sociologia': 8, 'Filosofia': 8 },
        dificuldade: ['Médio'],
        tempoLimite: 150,
        pontosPorQuestao: 18,
        tipo: 'ENEM',
        descricao: 'Simulado completo das ciências humanas e sociais aplicadas',
        icone: '🏛️',
        categoria: 'Área do Conhecimento'
    },
    'revisao-express': {
        titulo: 'Revisão Express - 15 questões',
        subtitulo: 'Revisão rápida e eficiente de conteúdos principais',
        materias: ['Matemática', 'Português', 'História', 'Geografia', 'Biologia'],
        questoesPorMateria: { 'Matemática': 3, 'Português': 3, 'História': 3, 'Geografia': 3, 'Biologia': 3 },
        dificuldade: ['Fácil', 'Médio'],
        tempoLimite: 45,
        pontosPorQuestao: 25,
        tipo: 'Revisão',
        descricao: 'Simulado rápido para revisão dos conteúdos mais importantes e frequentes',
        icone: '⚡',
        categoria: 'Revisão'
    }
};

// Sistema completo de classificações
const classificacoes = {
    95: { nome: 'Extraordinário', emoji: '🏆', cor: '#FFD700', nivel: 'Lendário' },
    90: { nome: 'Excelente', emoji: '🥇', cor: '#C0C0C0', nivel: 'Expert' },
    80: { nome: 'Muito Bom', emoji: '🥈', cor: '#CD7F32', nivel: 'Avançado' },
    70: { nome: 'Bom', emoji: '🥉', cor: '#4CAF50', nivel: 'Intermediário' },
    60: { nome: 'Regular', emoji: '📚', cor: '#FF9800', nivel: 'Básico' },
    50: { nome: 'Precisa Melhorar', emoji: '💪', cor: '#F44336', nivel: 'Iniciante' },
    0: { nome: 'Continue Estudando', emoji: '📖', cor: '#9E9E9E', nivel: 'Começando' }
};

// Sistema avançado de medalhas
const medalhas = {
    perfeicao: { nome: '🏆 Perfeição Absoluta', descricao: 'Acertou 100% das questões', requisito: 100 },
    quasePerfecto: { nome: '🌟 Quase Perfeito', descricao: 'Acertou 95% ou mais', requisito: 95 },
    expert: { nome: '🎯 Expert', descricao: 'Acertou 90% ou mais', requisito: 90 },
    muitoBom: { nome: '🔥 Muito Bom', descricao: 'Acertou 80% ou mais', requisito: 80 },
    consistente: { nome: '⚡ Consistente', descricao: 'Acertou 70% ou mais', requisito: 70 },
    primeiraTentativa: { nome: '🌟 Primeira Tentativa', descricao: 'Completou primeiro simulado', requisito: 'first' },
    matematico: { nome: '🔢 Gênio da Matemática', descricao: 'Acertou 90%+ em Matemática', requisito: 'math90' },
    poliglota: { nome: '📖 Mestre das Palavras', descricao: 'Acertou 90%+ em Português', requisito: 'port90' },
    historiador: { nome: '🏛️ Conhecedor da História', descricao: 'Acertou 90%+ em História', requisito: 'hist90' },
    cientista: { nome: '🧪 Cientista nato', descricao: 'Acertou 90%+ em Ciências', requisito: 'sci90' },
    velocista: { nome: '⚡ Velocista', descricao: 'Completou simulado em tempo recorde', requisito: 'speed' },
    persistente: { nome: '💪 Persistente', descricao: 'Completou 10 simulados', requisito: '10exams' },
    dedicado: { nome: '🎓 Dedicado', descricao: 'Completou 25 simulados', requisito: '25exams' },
    incansavel: { nome: '🚀 Incansável', descricao: 'Completou 50 simulados', requisito: '50exams' }
};

// Função para embaralhar array (Fisher-Yates)
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

// Função para determinar classificação baseada na performance
const getClassificacao = (percentual) => {
    const niveis = Object.keys(classificacoes).map(Number).sort((a, b) => b - a);
    for (const nivel of niveis) {
        if (percentual >= nivel) {
            return classificacoes[nivel];
        }
    }
    return classificacoes[0];
};
// 1. OBTER SIMULADOS DISPONÍVEIS - VERSÃO COMPLETA
const getAvailableExams = async (req, res) => {
    try {
        // Buscar estatísticas de questões por matéria
        const allQuestions = await database.find('questions', { ativa: true, aprovada: true });
        const questionsBySubject = {};
        const questionsByDifficulty = {};
        
        allQuestions.forEach(q => {
            // Por matéria
            if (!questionsBySubject[q.materia]) {
                questionsBySubject[q.materia] = 0;
            }
            questionsBySubject[q.materia]++;
            
            // Por dificuldade
            if (!questionsByDifficulty[q.dificuldade]) {
                questionsByDifficulty[q.dificuldade] = 0;
            }
            questionsByDifficulty[q.dificuldade]++;
        });

        // Preparar lista COMPLETA de simulados
        const availableExams = Object.keys(examConfigs).map(examId => {
            const config = examConfigs[examId];
            const totalQuestoes = Object.values(config.questoesPorMateria).reduce((a, b) => a + b, 0);
            
            // Verificar disponibilidade DETALHADA de questões
            let questoesDisponiveis = true;
            let materiasInsuficientes = [];
            let cobertura = {};
            
            config.materias.forEach(materia => {
                const necessarias = config.questoesPorMateria[materia] || 0;
                const disponiveis = questionsBySubject[materia] || 0;
                
                cobertura[materia] = {
                    necessarias,
                    disponiveis,
                    percentual: disponiveis > 0 ? Math.min(100, Math.round((disponiveis / necessarias) * 100)) : 0
                };
                
                if (disponiveis < necessarias) {
                    questoesDisponiveis = false;
                    materiasInsuficientes.push({
                        materia,
                        necessarias,
                        disponiveis,
                        faltam: necessarias - disponiveis
                    });
                }
            });

            // Calcular nível de dificuldade médio
            const nivelDificuldade = config.dificuldade.includes('Difícil') ? 'Alto' :
                                   config.dificuldade.includes('Médio') ? 'Médio' : 'Básico';

            // Estimar tempo por questão
            const tempoPorQuestao = Math.round(config.tempoLimite / totalQuestoes);

            // Calcular popularidade simulada (em produção seria baseada em dados reais)
            const popularidade = Math.floor(Math.random() * 2000) + 500;
            const avaliacoes = Math.floor(Math.random() * 500) + 100;
            const notaMedia = (Math.random() * 2 + 3).toFixed(1); // 3.0 a 5.0

            return {
                id: examId,
                titulo: config.titulo,
                subtitulo: config.subtitulo,
                tipo: config.tipo,
                categoria: config.categoria,
                descricao: config.descricao,
                icone: config.icone,
                
                // Informações das questões
                materias: config.materias,
                totalQuestoes,
                questoesPorMateria: config.questoesPorMateria,
                coberturaMaterias: cobertura,
                
                // Tempo e dificuldade
                tempoLimite: config.tempoLimite,
                tempoLimiteFormatado: `${Math.floor(config.tempoLimite / 60)}h ${config.tempoLimite % 60}min`,
                tempoPorQuestao: `${tempoPorQuestao}min`,
                nivelDificuldade,
                dificuldades: config.dificuldade,
                
                // Pontuação
                pontosPorQuestao: config.pontosPorQuestao,
                pontuacaoMaxima: totalQuestoes * config.pontosPorQuestao,
                
                // Disponibilidade
                disponivel: questoesDisponiveis,
                materiasInsuficientes: questoesDisponiveis ? [] : materiasInsuficientes,
                percentualDisponibilidade: Math.round((config.materias.length - materiasInsuficientes.length) / config.materias.length * 100),
                
                // Recomendações
                recomendadoPara: config.tipo === 'ENEM' ? 
                    ['3º Ensino Médio', 'Pré-vestibular', 'Estudantes universitários'] : 
                    config.tipo === 'Treino' ?
                    ['Todos os níveis', 'Reforço de matérias específicas'] :
                    ['Revisão rápida', 'Aquecimento', 'Todos os níveis'],
                
                // Estatísticas simuladas (em produção seriam reais)
                estatisticas: {
                    popularidade,
                    avaliacoes,
                    notaMedia: parseFloat(notaMedia),
                    concluidos: Math.floor(popularidade * 0.7),
                    mediaAcertos: Math.floor(Math.random() * 30) + 65, // 65-95%
                    tempoMedio: Math.floor(config.tempoLimite * (0.7 + Math.random() * 0.3))
                },
                
                // Tags para busca
                tags: [
                    config.tipo,
                    config.categoria,
                    nivelDificuldade,
                    ...config.materias,
                    `${totalQuestoes} questões`,
                    `${Math.floor(config.tempoLimite / 60)}h`
                ]
            };
        });

        // Ordenar por categoria, tipo e popularidade
        const examsSorted = availableExams.sort((a, b) => {
            // Primeiro por categoria
            const categoryOrder = { 'Oficial': 1, 'Área do Conhecimento': 2, 'Matéria Específica': 3, 'Revisão': 4 };
            if (categoryOrder[a.categoria] !== categoryOrder[b.categoria]) {
                return categoryOrder[a.categoria] - categoryOrder[b.categoria];
            }
            
            // Depois por popularidade
            return b.estatisticas.popularidade - a.estatisticas.popularidade;
        });

        // Agrupar por categoria
        const examsByCategory = {
            oficial: examsSorted.filter(e => e.categoria === 'Oficial'),
            areas: examsSorted.filter(e => e.categoria === 'Área do Conhecimento'),
            materias: examsSorted.filter(e => e.categoria === 'Matéria Específica'),
            revisao: examsSorted.filter(e => e.categoria === 'Revisão')
        };

        // Estatísticas gerais
        const statistics = {
            totalExams: examsSorted.length,
            disponiveis: examsSorted.filter(e => e.disponivel).length,
            indisponiveis: examsSorted.filter(e => !e.disponivel).length,
            porCategoria: {
                oficial: examsByCategory.oficial.length,
                areas: examsByCategory.areas.length,
                materias: examsByCategory.materias.length,
                revisao: examsByCategory.revisao.length
            },
            porTipo: {
                enem: examsSorted.filter(e => e.tipo === 'ENEM').length,
                treino: examsSorted.filter(e => e.tipo === 'Treino').length,
                revisao: examsSorted.filter(e => e.tipo === 'Revisão').length
            },
            questoesTotais: examsSorted.reduce((sum, e) => sum + e.totalQuestoes, 0),
            tempoTotalHoras: Math.round(examsSorted.reduce((sum, e) => sum + e.tempoLimite, 0) / 60),
            pontuacaoMaximaTotal: examsSorted.reduce((sum, e) => sum + e.pontuacaoMaxima, 0)
        };

        // Recomendações personalizadas (baseadas em user agent, hora, etc.)
        const agora = new Date();
        const recomendacoes = {
            rapida: examsSorted.filter(e => e.tempoLimite <= 60),
            iniciante: examsSorted.filter(e => e.nivelDificuldade === 'Básico'),
            avancado: examsSorted.filter(e => e.nivelDificuldade === 'Alto'),
            popular: examsSorted.slice(0, 3),
            // Recomendação baseada no horário
            horario: agora.getHours() < 12 ? 
                examsSorted.filter(e => e.categoria === 'Revisão') :
                examsSorted.filter(e => e.categoria === 'Oficial')
        };

        res.json({
            success: true,
            message: '📚 Simulados completos disponíveis no Desafia Brasil',
            exams: examsSorted,
            examsByCategory,
            statistics,
            recomendacoes,
            metadata: {
                totalQuestoesBanco: allQuestions.length,
                questoesPorMateria: questionsBySubject,
                questoesPorDificuldade: questionsByDifficulty,
                ultimaAtualizacao: new Date(),
                versao: '2.0.0-completa'
            }
        });

    } catch (error) {
        console.error('Erro ao buscar simulados:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
        });
    }
};
// 2. INICIAR SIMULADO - VERSÃO COMPLETA
const startExam = async (req, res) => {
    try {
        const { examId } = req.params;
        
        // Verificar se simulado existe
        const config = examConfigs[examId];
        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Simulado não encontrado',
                availableExams: Object.keys(examConfigs),
                suggestion: 'Consulte a lista de simulados disponíveis'
            });
        }

        // Buscar usuário
        const user = await database.findById('users', req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Determinar nível do usuário
        const simuladosRealizados = user.simuladosRealizados || 0;
        const pontuacaoTotal = user.pontuacaoTotal || 0;
        const mediaUsuario = simuladosRealizados > 0 ? pontuacaoTotal / simuladosRealizados : 0;
        
        const nivelUsuario = simuladosRealizados < 5 ? 'Iniciante' :
                            simuladosRealizados < 20 ? 'Intermediário' :
                            simuladosRealizados < 50 ? 'Avançado' : 'Expert';

        // Buscar questões para o simulado
        let questoesDoSimulado = [];
        let estatisticasBusca = {};
        
        for (const materia of config.materias) {
            const quantidade = config.questoesPorMateria[materia] || 0;
            
            // Buscar questões da matéria específica
            const questoesDaMateria = await database.find('questions', {
                materia: materia,
                ativa: true,
                aprovada: true
            });

            // Filtrar por dificuldade se especificado
            let questoesFiltradas = questoesDaMateria;
            if (config.dificuldade && config.dificuldade.length > 0) {
                questoesFiltradas = questoesDaMateria.filter(q => 
                    config.dificuldade.includes(q.dificuldade)
                );
            }

            // Ordenar por estatísticas para melhor experiência
            questoesFiltradas.sort((a, b) => {
                // Priorizar questões com estatísticas equilibradas
                const scoreA = (a.vezesRespondida || 0) * 0.3 + (a.percentualAcerto || 50) * 0.7;
                const scoreB = (b.vezesRespondida || 0) * 0.3 + (b.percentualAcerto || 50) * 0.7;
                return Math.abs(scoreB - 70) - Math.abs(scoreA - 70); // Priorizar ~70% de acerto
            });

            // Embaralhar e pegar a quantidade necessária
            const questoesEmbaralhadas = shuffleArray(questoesFiltradas);
            const questoesSelecionadas = questoesEmbaralhadas.slice(0, quantidade);
            
            questoesDoSimulado = questoesDoSimulado.concat(questoesSelecionadas);
            
            // Registrar estatísticas da busca
            estatisticasBusca[materia] = {
                solicitadas: quantidade,
                encontradas: questoesSelecionadas.length,
                disponiveis: questoesDaMateria.length,
                filtradas: questoesFiltradas.length,
                cobertura: questoesSelecionadas.length >= quantidade ? 100 : 
                          Math.round((questoesSelecionadas.length / quantidade) * 100)
            };
        }

        // Verificar se temos questões suficientes
        const totalNecessario = Object.values(config.questoesPorMateria).reduce((a, b) => a + b, 0);
        const totalEncontrado = questoesDoSimulado.length;
        
        if (totalEncontrado < totalNecessario / 2) {
            return res.status(400).json({
                success: false,
                message: 'Questões insuficientes para gerar o simulado',
                detalhes: {
                    necessarias: totalNecessario,
                    encontradas: totalEncontrado,
                    cobertura: Math.round((totalEncontrado / totalNecessario) * 100),
                    estatisticasPorMateria: estatisticasBusca
                },
                suggestion: 'Tente um simulado com menos questões ou aguarde adição de novas questões'
            });
        }

        // Embaralhar questões finais para experiência única
        questoesDoSimulado = shuffleArray(questoesDoSimulado);

        // Preparar questões para envio (sem resposta correta)
        const questoesParaExame = questoesDoSimulado.map((questao, index) => ({
            id: questao.id,
            ordem: index + 1,
            codigo: questao.codigo || `Q${String(index + 1).padStart(3, '0')}`,
            titulo: questao.titulo,
            enunciado: questao.enunciado,
            imagem: questao.imagem || null,
            alternativas: questao.alternativas || [],
            materia: questao.materia,
            assunto: questao.assunto,
            dificuldade: questao.dificuldade,
            fonte: questao.fonte || {},
            tags: questao.tags || [],
            pontos: config.pontosPorQuestao,
            tempoSugerido: Math.round(config.tempoLimite / totalEncontrado), // tempo em minutos por questão
            // Estatísticas anônimas para o estudante
            estatisticas: {
                vezesRespondida: questao.vezesRespondida || 0,
                dificuldadeReal: questao.percentualAcerto ? 
                    (questao.percentualAcerto > 80 ? 'Fácil' :
                     questao.percentualAcerto > 50 ? 'Médio' : 'Difícil') : 'N/A'
            }
        }));

        // Gerar sessão do simulado para tracking
        const sessaoSimulado = {
            id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: req.userId,
            examId: examId,
            questionsIds: questoesDoSimulado.map(q => q.id),
            startedAt: new Date(),
            timeLimit: config.tempoLimite,
            status: 'em_andamento',
            configuracao: config,
            estatisticasBusca
        };

        // Instruções personalizadas baseadas no perfil do usuário
        const instrucoesPersonalizadas = [
            '📖 Leia atentamente cada questão e todas as alternativas',
            `⏰ Gerencie seu tempo - você tem ${Math.floor(config.tempoLimite / 60)}h ${config.tempoLimite % 60}min total`,
            '✅ Marque apenas uma alternativa por questão',
            '🔄 Você pode revisar e alterar suas respostas antes de finalizar',
            nivelUsuario === 'Iniciante' ? '💡 Não se preocupe com erros, foque no aprendizado!' :
            nivelUsuario === 'Expert' ? '🎯 Mantenha sua consistência e atenção aos detalhes!' :
            '💪 Confie no seu preparo e mantenha o foco!',
            config.tipo === 'ENEM' ? '📋 Questões no padrão oficial do ENEM' :
            config.tipo === 'Treino' ? '🏋️ Foque nas matérias específicas' :
            '⚡ Simulado rápido para revisão',
            '🌟 Boa sorte e bons estudos!'
        ];

        // Dicas estratégicas baseadas no tipo de simulado
        const dicasEstrategicas = config.tipo === 'ENEM' ? [
            'Comece pelas questões que você tem mais certeza',
            'Elimine alternativas claramente erradas',
            'Leia os gráficos e tabelas com atenção',
            'Gerencie bem o tempo entre as matérias'
        ] : config.categoria === 'Matéria Específica' ? [
            `Foque nos conceitos fundamentais de ${config.materias[0]}`,
            'Pratique aplicação de fórmulas e conceitos',
            'Leia enunciados duas vezes se necessário',
            'Anote cálculos em rascunho'
        ] : [
            'Revisão rápida dos conceitos principais',
            'Foque na interpretação dos enunciados',
            'Não perca tempo em questões muito difíceis',
            'Mantenha ritmo constante'
        ];

        res.json({
            success: true,
            message: `🚀 Simulado "${config.titulo}" iniciado com sucesso!`,
            exam: {
                // Informações básicas
                id: examId,
                sessaoId: sessaoSimulado.id,
                titulo: config.titulo,
                subtitulo: config.subtitulo,
                tipo: config.tipo,
                categoria: config.categoria,
                descricao: config.descricao,
                icone: config.icone,
                
                // Questões preparadas
                questoes: questoesParaExame,
                
                // Configurações detalhadas
                configuracao: {
                    totalQuestoes: questoesParaExame.length,
                    totalNecessario: totalNecessario,
                    cobertura: Math.round((questoesParaExame.length / totalNecessario) * 100),
                    tempoLimite: config.tempoLimite,
                    tempoLimiteMs: config.tempoLimite * 60 * 1000,
                    tempoPorQuestao: Math.round(config.tempoLimite / questoesParaExame.length),
                    pontosPorQuestao: config.pontosPorQuestao,
                    pontuacaoMaxima: questoesParaExame.length * config.pontosPorQuestao,
                    materiasIncluidas: config.materias,
                    questoesPorMateria: config.questoesPorMateria,
                    dificuldadesIncluidas: config.dificuldade
                },
                
                // Instruções e dicas
                instrucoes: instrucoesPersonalizadas,
                dicasEstrategicas: dicasEstrategicas,
                
                // Distribuição das questões
                distribuicao: Object.keys(estatisticasBusca).map(materia => ({
                    materia,
                    ...estatisticasBusca[materia]
                }))
            },
            user: {
                nome: user.nome,
                nivel: nivelUsuario,
                simuladosRealizados: simuladosRealizados,
                pontuacaoTotal: pontuacaoTotal,
                mediaGeral: Math.round(mediaUsuario),
                experiencia: {
                    nivel: nivelUsuario,
                    proximoNivel: simuladosRealizados < 5 ? `${5 - simuladosRealizados} simulados para Intermediário` :
                                  simuladosRealizados < 20 ? `${20 - simuladosRealizados} simulados para Avançado` :
                                  simuladosRealizados < 50 ? `${50 - simuladosRealizados} simulados para Expert` :
                                  'Nível máximo atingido!',
                    medallhasConquistadas: (user.medalhas || []).length
                }
            },
            session: {
                iniciadoEm: new Date(),
                tempoRestante: config.tempoLimite * 60,
                progresso: {
                    questoesRespondidas: 0,
                    questoesTotais: questoesParaExame.length,
                    percentualCompleto: 0,
                    tempoDecorrido: 0
                },
                recomendacoes: {
                    estrategia: nivelUsuario === 'Iniciante' ? 'Foque no aprendizado, não na velocidade' :
                               nivelUsuario === 'Expert' ? 'Mantenha sua excelência e atenção aos detalhes' :
                               'Equilibre velocidade e precisão',
                    tempoIdeal: `${Math.round(config.tempoLimite * 0.8)} minutos para ter tempo de revisar`
                }
            },
            metadata: {
                versao: '2.0.0-completa',
                geradoEm: new Date(),
                algoritmo: 'adaptive-selection-v2',
                qualidade: {
                    coberturaMaterias: Math.round((Object.keys(estatisticasBusca).length / config.materias.length) * 100),
                    balanceamentoDificuldade: 'otimizado',
                    diversidadeFontes: 'alta'
                }
            }
        });

    } catch (error) {
        console.error('Erro ao iniciar simulado:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
        });
    }
};
// 3. FINALIZAR SIMULADO E CALCULAR RESULTADO - VERSÃO COMPLETA
const finishExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const { respostas, tempoInicio, tempoFim, sessaoId } = req.body;

        // Validações básicas robustas
        if (!respostas || !Array.isArray(respostas) || respostas.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Respostas são obrigatórias',
                expected: 'Array de objetos com questaoId e alternativaMarcada',
                received: typeof respostas,
                exemplo: [
                    { questaoId: '12345', alternativaMarcada: 'A' },
                    { questaoId: '67890', alternativaMarcada: 'C' }
                ]
            });
        }

        // Verificar configuração do simulado
        const config = examConfigs[examId];
        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Configuração do simulado não encontrada',
                availableExams: Object.keys(examConfigs)
            });
        }

        // Buscar usuário
        const user = await database.findById('users', req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Inicializar variáveis de correção COMPLETAS
        let acertos = 0;
        let erros = 0;
        let questoesNaoRespondidas = 0;
        let pontuacao = 0;
        const resultadoDetalhado = [];
        const desempenhoPorMateria = {};
        const desempenhoPorDificuldade = {};
        const desempenhoPorAssunto = {};
        const questoesComErro = [];
        const questoesComAcerto = [];
        const analiseTempoResposta = [];

        // Processar cada resposta COM ANÁLISE DETALHADA
        for (let i = 0; i < respostas.length; i++) {
            const resposta = respostas[i];
            
            if (!resposta.questaoId || !resposta.alternativaMarcada) {
                questoesNaoRespondidas++;
                continue; // Pular respostas inválidas
            }

            // Buscar questão no banco
            const questao = await database.findById('questions', resposta.questaoId);
            
            if (questao) {
                const acertou = questao.respostaCorreta === resposta.alternativaMarcada;
                const pontosQuestao = config.pontosPorQuestao;
                
                if (acertou) {
                    acertos++;
                    pontuacao += pontosQuestao;
                    questoesComAcerto.push({
                        id: questao.id,
                        materia: questao.materia,
                        dificuldade: questao.dificuldade,
                        pontos: pontosQuestao
                    });
                } else {
                    erros++;
                    questoesComErro.push({
                        id: questao.id,
                        materia: questao.materia,
                        dificuldade: questao.dificuldade,
                        assunto: questao.assunto,
                        alternativaMarcada: resposta.alternativaMarcada,
                        alternativaCorreta: questao.respostaCorreta,
                        explicacao: questao.explicacao || 'Sem explicação disponível'
                    });
                }

                // Atualizar estatísticas da questão no Firebase
                const novasEstatisticas = {
                    vezesRespondida: (questao.vezesRespondida || 0) + 1,
                    vezesAcertada: (questao.vezesAcertada || 0) + (acertou ? 1 : 0)
                };
                novasEstatisticas.percentualAcerto = Math.round((novasEstatisticas.vezesAcertada / novasEstatisticas.vezesRespondida) * 100);

                await database.update('questions', questao.id, novasEstatisticas);

                // Agrupar desempenho por matéria
                const materia = questao.materia;
                if (!desempenhoPorMateria[materia]) {
                    desempenhoPorMateria[materia] = { 
                        total: 0, 
                        acertos: 0, 
                        pontos: 0,
                        questoes: [],
                        tempoMedio: 0
                    };
                }
                desempenhoPorMateria[materia].total++;
                if (acertou) {
                    desempenhoPorMateria[materia].acertos++;
                    desempenhoPorMateria[materia].pontos += pontosQuestao;
                }
                desempenhoPorMateria[materia].questoes.push({
                    id: questao.id,
                    titulo: questao.titulo,
                    acertou,
                    alternativaMarcada: resposta.alternativaMarcada,
                    alternativaCorreta: questao.respostaCorreta
                });

                // Agrupar por dificuldade
                const dificuldade = questao.dificuldade;
                if (!desempenhoPorDificuldade[dificuldade]) {
                    desempenhoPorDificuldade[dificuldade] = { total: 0, acertos: 0 };
                }
                desempenhoPorDificuldade[dificuldade].total++;
                if (acertou) desempenhoPorDificuldade[dificuldade].acertos++;

                // Agrupar por assunto
                const assunto = questao.assunto || 'Não especificado';
                if (!desempenhoPorAssunto[assunto]) {
                    desempenhoPorAssunto[assunto] = { total: 0, acertos: 0, materia: questao.materia };
                }
                desempenhoPorAssunto[assunto].total++;
                if (acertou) desempenhoPorAssunto[assunto].acertos++;

                // Análise de tempo (se disponível)
                if (resposta.tempoResposta) {
                    analiseTempoResposta.push({
                        questaoId: questao.id,
                        materia: questao.materia,
                        dificuldade: questao.dificuldade,
                        tempoResposta: resposta.tempoResposta,
                        acertou,
                        eficiencia: acertou ? (60 / resposta.tempoResposta) : 0 // pontos por minuto
                    });
                }

                // Adicionar ao resultado detalhado
                resultadoDetalhado.push({
                    questao: questao.id,
                    ordem: i + 1,
                    codigo: questao.codigo,
                    titulo: questao.titulo,
                    materia: questao.materia,
                    assunto: questao.assunto,
                    dificuldade: questao.dificuldade,
                    fonte: questao.fonte,
                    alternativaMarcada: resposta.alternativaMarcada,
                    alternativaCorreta: questao.respostaCorreta,
                    acertou,
                    pontos: acertou ? pontosQuestao : 0,
                    explicacao: questao.explicacao || '',
                    dicas: questao.dicas || [],
                    tempoResposta: resposta.tempoResposta || null,
                    percentualAcertoGeral: novasEstatisticas.percentualAcerto
                });
            }
        }

        // Calcular estatísticas finais COMPLETAS
        const totalQuestoes = respostas.length;
        const questoesRespondidas = totalQuestoes - questoesNaoRespondidas;
        const percentualAcerto = questoesRespondidas > 0 ? Math.round((acertos / questoesRespondidas) * 100) : 0;
        const percentualCompleto = Math.round((questoesRespondidas / totalQuestoes) * 100);
        
        // Calcular tempo gasto
        let tempoGasto = 0;
        let eficienciaTempo = 0;
        if (tempoInicio && tempoFim) {
            tempoGasto = Math.round((new Date(tempoFim) - new Date(tempoInicio)) / 60000); // em minutos
            eficienciaTempo = config.tempoLimite > 0 ? Math.round((tempoGasto / config.tempoLimite) * 100) : 0;
        }

        // Preparar desempenho por matéria DETALHADO
        const desempenhoFinalMaterias = Object.keys(desempenhoPorMateria).map(materia => {
            const dados = desempenhoPorMateria[materia];
            const percentualAcerto = Math.round((dados.acertos / dados.total) * 100);
            
            return {
                materia,
                totalQuestoes: dados.total,
                acertos: dados.acertos,
                erros: dados.total - dados.acertos,
                percentualAcerto,
                pontos: dados.pontos,
                performance: percentualAcerto >= 90 ? '🏆 Excelente' :
                           percentualAcerto >= 80 ? '🥇 Muito Bom' :
                           percentualAcerto >= 70 ? '🥈 Bom' :
                           percentualAcerto >= 60 ? '🥉 Regular' :
                           percentualAcerto >= 50 ? '📚 Precisa Melhorar' : '💪 Requer Estudo',
                recomendacao: percentualAcerto < 70 ? `Revisar conceitos de ${materia}` :
                             percentualAcerto < 85 ? `Aprofundar estudos em ${materia}` :
                             `Excelente domínio de ${materia}`,
                questoesMaisErradas: dados.questoes
                    .filter(q => !q.acertou)
                    .slice(0, 3)
                    .map(q => ({ id: q.id, titulo: q.titulo }))
            };
        }).sort((a, b) => b.percentualAcerto - a.percentualAcerto);

        // Desempenho por dificuldade
        const desempenhoFinalDificuldade = Object.keys(desempenhoPorDificuldade).map(dificuldade => ({
            dificuldade,
            totalQuestoes: desempenhoPorDificuldade[dificuldade].total,
            acertos: desempenhoPorDificuldade[dificuldade].acertos,
            percentualAcerto: Math.round((desempenhoPorDificuldade[dificuldade].acertos / desempenhoPorDificuldade[dificuldade].total) * 100)
        }));

        // Sistema COMPLETO de medalhas e conquistas
        const novasMedalhas = [];
        const conquistas = [];
        
        // Medalhas por percentual de acerto
        if (percentualAcerto === 100) {
            novasMedalhas.push({
                ...medalhas.perfeicao,
                conquistadaEm: new Date(),
                detalhes: `Perfeição absoluta com ${acertos}/${totalQuestoes} questões corretas`
            });
        } else if (percentualAcerto >= 95) {
            novasMedalhas.push({
                ...medalhas.quasePerfecto,
                conquistadaEm: new Date(),
                detalhes: `Quase perfeito com ${percentualAcerto}% de acerto`
            });
        } else if (percentualAcerto >= 90) {
            novasMedalhas.push({
                ...medalhas.expert,
                conquistadaEm: new Date(),
                detalhes: `Performance expert com ${percentualAcerto}% de acerto`
            });
        } else if (percentualAcerto >= 80) {
            novasMedalhas.push({
                ...medalhas.muitoBom,
                conquistadaEm: new Date(),
                detalhes: `Muito bom desempenho com ${percentualAcerto}% de acerto`
            });
        } else if (percentualAcerto >= 70) {
            novasMedalhas.push({
                ...medalhas.consistente,
                conquistadaEm: new Date(),
                detalhes: `Performance consistente com ${percentualAcerto}% de acerto`
            });
        }

        // Medalhas especiais por matéria
        desempenhoFinalMaterias.forEach(desempenho => {
            if (desempenho.percentualAcerto >= 90) {
                if (desempenho.materia === 'Matemática') {
                    novasMedalhas.push({
                        ...medalhas.matematico,
                        conquistadaEm: new Date(),
                        detalhes: `${desempenho.percentualAcerto}% de acerto em Matemática`
                    });
                } else if (desempenho.materia === 'Português') {
                    novasMedalhas.push({
                        ...medalhas.poliglota,
                        conquistadaEm: new Date(),
                        detalhes: `${desempenho.percentualAcerto}% de acerto em Português`
                    });
                } else if (desempenho.materia === 'História') {
                    novasMedalhas.push({
                        ...medalhas.historiador,
                        conquistadaEm: new Date(),
                        detalhes: `${desempenho.percentualAcerto}% de acerto em História`
                    });
                } else if (['Biologia', 'Química', 'Física'].includes(desempenho.materia)) {
                    novasMedalhas.push({
                        ...medalhas.cientista,
                        conquistadaEm: new Date(),
                        detalhes: `${desempenho.percentualAcerto}% de acerto em ${desempenho.materia}`
                    });
                }
            }
        });

        // Primeira tentativa
        if ((user.simuladosRealizados || 0) === 0) {
            novasMedalhas.push({
                ...medalhas.primeiraTentativa,
                conquistadaEm: new Date(),
                detalhes: 'Primeiro simulado completado com sucesso'
            });
        }

        // Medalha de velocidade
        if (tempoGasto > 0 && tempoGasto < config.tempoLimite * 0.5 && percentualAcerto >= 80) {
            novasMedalhas.push({
                ...medalhas.velocista,
                conquistadaEm: new Date(),
                detalhes: `Completou em ${tempoGasto} minutos com ${percentualAcerto}% de acerto`
            });
        }

        // Medalhas por quantidade de simulados
        const simuladosAtualizados = (user.simuladosRealizados || 0) + 1;
        if (simuladosAtualizados === 10) {
            novasMedalhas.push({
                ...medalhas.persistente,
                conquistadaEm: new Date(),
                detalhes: '10 simulados completados'
            });
        } else if (simuladosAtualizados === 25) {
            novasMedalhas.push({
                ...medalhas.dedicado,
                conquistadaEm: new Date(),
                detalhes: '25 simulados completados'
            });
        } else if (simuladosAtualizados === 50) {
            novasMedalhas.push({
                ...medalhas.incansavel,
                conquistadaEm: new Date(),
                detalhes: '50 simulados completados - Incansável!'
            });
        }

        // Atualizar estatísticas do usuário
        const updatedUserData = {
            simuladosRealizados: simuladosAtualizados,
            pontuacaoTotal: (user.pontuacaoTotal || 0) + pontuacao,
            ultimoSimulado: {
                examId,
                data: new Date(),
                pontuacao,
                percentualAcerto,
                tempoGasto,
                classificacao: getClassificacao(percentualAcerto).nome
            }
        };

        // Adicionar medalhas se houver
        if (novasMedalhas.length > 0) {
            const medalhasAtuais = user.medalhas || [];
            updatedUserData.medalhas = [...medalhasAtuais, ...novasMedalhas];
        }

        await database.update('users', req.userId, updatedUserData);

        // Determinar classificação COMPLETA
        const classificacaoCompleta = getClassificacao(percentualAcerto);

        // Continua no próximo bloco...
                // Gerar recomendações PERSONALIZADAS E INTELIGENTES
        const recomendacoes = {
            imediatas: [],
            estudo: [],
            proximosSimulados: [],
            materiasParaRevisar: []
        };

        // Recomendações por matéria
        const materiasComDificuldade = desempenhoFinalMaterias
            .filter(d => d.percentualAcerto < 60)
            .sort((a, b) => a.percentualAcerto - b.percentualAcerto)
            .slice(0, 3);

        if (materiasComDificuldade.length > 0) {
            recomendacoes.materiasParaRevisar = materiasComDificuldade.map(m => m.materia);
            recomendacoes.estudo.push(`Priorize o estudo de: ${materiasComDificuldade.map(m => m.materia).join(', ')}`);
        }

        // Recomendação de próximo simulado
        if (percentualAcerto >= 85) {
            recomendacoes.proximosSimulados.push('Tente um simulado mais desafiador ou completo');
            recomendacoes.imediatas.push('Excelente performance! Continue assim!');
        } else if (percentualAcerto >= 70) {
            recomendacoes.proximosSimulados.push('Continue praticando com simulados do mesmo nível');
            recomendacoes.imediatas.push('Bom desempenho! Pequenos ajustes podem levar à excelência');
        } else if (percentualAcerto >= 50) {
            recomendacoes.proximosSimulados.push('Revise os conteúdos e tente simulados mais básicos');
            recomendacoes.imediatas.push('Foque na revisão de conceitos fundamentais');
        } else {
            recomendacoes.proximosSimulados.push('Dedique tempo ao estudo antes do próximo simulado');
            recomendacoes.imediatas.push('Não desanime! Todo expert já foi iniciante');
        }

        // Recomendação de tempo
        if (tempoGasto > 0) {
            const tempoMedio = config.tempoLimite / totalQuestoes;
            const seuTempo = tempoGasto / questoesRespondidas;
            
            if (seuTempo > tempoMedio * 1.5) {
                recomendacoes.estudo.push('Pratique resolução mais rápida de questões');
                recomendacoes.imediatas.push('Trabalhe na velocidade de resolução');
            } else if (seuTempo < tempoMedio * 0.5 && percentualAcerto < 80) {
                recomendacoes.estudo.push('Leia as questões com mais atenção');
                recomendacoes.imediatas.push('Você foi rápido, mas pode melhorar a precisão');
            } else if (seuTempo < tempoMedio * 0.7 && percentualAcerto >= 80) {
                recomendacoes.imediatas.push('Excelente! Rápido e preciso!');
            }
        }

        // Análise de questões por dificuldade
        const dificilDesempenho = desempenhoFinalDificuldade.find(d => d.dificuldade === 'Difícil');
        if (dificilDesempenho && dificilDesempenho.percentualAcerto < 50) {
            recomendacoes.estudo.push('Foque em questões de nível básico e médio primeiro');
        }

        // Resposta COMPLETA E DETALHADA
        res.json({
            success: true,
            message: `${classificacaoCompleta.emoji} Simulado finalizado! ${classificacaoCompleta.nome}`,
            resultado: {
                geral: {
                    pontuacao,
                    pontuacaoMaxima: totalQuestoes * config.pontosPorQuestao,
                    totalQuestoes,
                    questoesRespondidas,
                    questoesNaoRespondidas,
                    acertos,
                    erros,
                    percentualAcerto,
                    percentualCompleto,
                    classificacao: `${classificacaoCompleta.emoji} ${classificacaoCompleta.nome}`,
                    nivel: classificacaoCompleta.nivel,
                    cor: classificacaoCompleta.cor,
                    tempoGasto,
                    tempoLimite: config.tempoLimite,
                    eficienciaTempo: eficienciaTempo,
                    tempoPorQuestao: questoesRespondidas > 0 ? Math.round(tempoGasto / questoesRespondidas) : 0
                },
                desempenhoPorMateria: desempenhoFinalMaterias,
                desempenhoPorDificuldade: desempenhoFinalDificuldade,
                medalhas: novasMedalhas,
                conquistas: conquistas,
                recomendacoes,
                estatisticasAvancadas: {
                    questoesMaisDificeis: questoesComErro
                        .filter(q => q.dificuldade === 'Difícil')
                        .slice(0, 5),
                    materiasFortes: desempenhoFinalMaterias
                        .filter(d => d.percentualAcerto >= 80)
                        .map(d => d.materia),
                    materiasParaMelhorar: materiasComDificuldade.map(d => d.materia),
                    eficienciaPorMateria: desempenhoFinalMaterias.map(d => ({
                        materia: d.materia,
                        eficiencia: Math.round((d.percentualAcerto * d.pontos) / 100)
                    }))
                }
            },
            user: {
                nome: user.nome,
                simuladosRealizados: updatedUserData.simuladosRealizados,
                pontuacaoTotal: updatedUserData.pontuacaoTotal,
                novasMedalhas: novasMedalhas.length,
                totalMedalhas: (user.medalhas || []).length + novasMedalhas.length,
                proximoNivel: updatedUserData.simuladosRealizados < 10 ? 
                    `${10 - updatedUserData.simuladosRealizados} simulados para próximo nível` :
                    updatedUserData.simuladosRealizados < 25 ?
                    `${25 - updatedUserData.simuladosRealizados} simulados para nível Dedicado` :
                    'Nível máximo atingido!',
                evolucao: {
                    pontuacaoMedia: Math.round(updatedUserData.pontuacaoTotal / updatedUserData.simuladosRealizados),
                    melhoriaRecomendada: materiasComDificuldade.length > 0 ? 
                        `Foque em ${materiasComDificuldade[0].materia}` : 
                        'Continue mantendo a excelência!'
                }
            },
            analise: {
                pontosFortes: desempenhoFinalMaterias
                    .filter(d => d.percentualAcerto >= 80)
                    .map(d => d.materia),
                pontosAMelhorar: materiasComDificuldade.map(d => d.materia),
                estrategiaRecomendada: percentualAcerto >= 80 ? 
                    'Manter consistência e aumentar velocidade' :
                    percentualAcerto >= 60 ?
                    'Focar nas matérias com menor performance' :
                    'Revisar conceitos fundamentais antes de novos simulados',
                proximoObjetivo: percentualAcerto >= 90 ? 
                    'Manter excelência e tentar simulados mais desafiadores' :
                    percentualAcerto >= 70 ?
                    'Alcançar 85%+ de acertos' :
                    'Atingir 70%+ de acertos consistentemente',
                tempoParaProximoSimulado: percentualAcerto < 60 ? 
                    'Recomendado estudar por 3-5 dias antes do próximo' :
                    percentualAcerto < 80 ?
                    'Pode fazer novo simulado em 1-2 dias' :
                    'Pronto para novo simulado quando desejar'
            },
            detalhamento: resultadoDetalhado.slice(0, 20), // Limitar para não sobrecarregar
            insights: [
                `Você acertou ${acertos} de ${questoesRespondidas} questões respondidas`,
                `Sua melhor matéria foi ${desempenhoFinalMaterias[0]?.materia || 'N/A'} com ${desempenhoFinalMaterias[0]?.percentualAcerto || 0}%`,
                materiasComDificuldade.length > 0 ? 
                    `Matéria que precisa de atenção: ${materiasComDificuldade[0].materia}` :
                    'Parabéns! Bom desempenho em todas as matérias',
                tempoGasto > 0 ? 
                    `Você utilizou ${Math.round((tempoGasto / config.tempoLimite) * 100)}% do tempo disponível` :
                    'Tempo não foi registrado',
                novasMedalhas.length > 0 ?
                    `🏆 Você conquistou ${novasMedalhas.length} nova(s) medalha(s)!` :
                    '📈 Continue praticando para conquistar novas medalhas'
            ]
        });

    } catch (error) {
        console.error('Erro ao finalizar simulado:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
        });
    }
};
// 4. OBTER HISTÓRICO COMPLETO DE SIMULADOS DO USUÁRIO
const getUserExamHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10, examType, startDate, endDate, materia } = req.query;

        // Buscar usuário
        const user = await database.findById('users', req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Simulação de histórico DETALHADO baseado nos dados do usuário
        const totalSimulados = user.simuladosRealizados || 0;
        const pontuacaoMedia = totalSimulados > 0 ? 
            Math.round((user.pontuacaoTotal || 0) / totalSimulados) : 0;

        // Gerar histórico simulado REALISTA (substitua por dados reais do banco)
        const historico = Array.from({ length: Math.min(totalSimulados, parseInt(limit)) }, (_, i) => {
            const examIds = Object.keys(examConfigs);
            const examId = examIds[Math.floor(Math.random() * examIds.length)];
            const config = examConfigs[examId];
            const diasAtras = Math.floor(Math.random() * 60); // até 60 dias atrás
            const dataRealizacao = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000);
            
            const basePerformance = Math.min(95, Math.max(30, pontuacaoMedia + (Math.random() - 0.5) * 30));
            const percentualAcerto = Math.round(basePerformance + (Math.random() - 0.5) * 20);
            const totalQuestoes = Object.values(config.questoesPorMateria).reduce((a, b) => a + b, 0);
            const acertos = Math.round((percentualAcerto / 100) * totalQuestoes);
            const pontuacao = acertos * config.pontosPorQuestao;
            const tempoGasto = Math.round(config.tempoLimite * (0.6 + Math.random() * 0.4));
            
            return {
                id: `simulado-${Date.now()}-${i}`,
                examId,
                titulo: config.titulo,
                tipo: config.tipo,
                categoria: config.categoria,
                icone: config.icone,
                dataRealizacao,
                pontuacao,
                pontuacaoMaxima: totalQuestoes * config.pontosPorQuestao,
                percentualAcerto,
                totalQuestoes,
                acertos,
                erros: totalQuestoes - acertos,
                tempoGasto,
                tempoLimite: config.tempoLimite,
                eficienciaTempo: Math.round((tempoGasto / config.tempoLimite) * 100),
                classificacao: getClassificacao(percentualAcerto),
                materiasIncluidas: config.materias,
                desempenhoMaterias: config.materias.map(mat => ({
                    materia: mat,
                    percentualAcerto: Math.max(0, Math.min(100, 
                        percentualAcerto + (Math.random() - 0.5) * 30
                    ))
                })),
                medalhasConquistadas: Math.floor(Math.random() * 3),
                melhoriaAnterior: i > 0 ? (Math.random() > 0.5 ? 
                    Math.floor(Math.random() * 15) : -Math.floor(Math.random() * 10)) : 0
            };
        });

        // Aplicar filtros se especificados
        let historicoFiltrado = historico;
        if (examType) {
            historicoFiltrado = historicoFiltrado.filter(h => h.tipo === examType);
        }
        if (startDate) {
            const start = new Date(startDate);
            historicoFiltrado = historicoFiltrado.filter(h => h.dataRealizacao >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            historicoFiltrado = historicoFiltrado.filter(h => h.dataRealizacao <= end);
        }

        // Ordenar por data (mais recente primeiro)
        const historicoOrdenado = historicoFiltrado.sort((a, b) => 
            new Date(b.dataRealizacao) - new Date(a.dataRealizacao)
        );

        // Calcular estatísticas AVANÇADAS do histórico
        if (historico.length > 0) {
            const estatisticas = {
                // Estatísticas básicas
                totalSimulados: totalSimulados,
                pontuacaoTotal: user.pontuacaoTotal || 0,
                pontuacaoMedia: pontuacaoMedia,
                
                // Performance
                melhorPerformance: Math.max(...historico.map(h => h.percentualAcerto)),
                piorPerformance: Math.min(...historico.map(h => h.percentualAcerto)),
                performanceMedia: Math.round(historico.reduce((sum, h) => sum + h.percentualAcerto, 0) / historico.length),
                
                // Tempo
                tempoMedioGasto: Math.round(historico.reduce((sum, h) => sum + h.tempoGasto, 0) / historico.length),
                eficienciaMediaTempo: Math.round(historico.reduce((sum, h) => sum + h.eficienciaTempo, 0) / historico.length),
                
                // Atividade
                simuladosUltimos7Dias: historico.filter(h => {
                    const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    return h.dataRealizacao > seteDiasAtras;
                }).length,
                simuladosUltimos30Dias: historico.filter(h => {
                    const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    return h.dataRealizacao > trintaDiasAtras;
                }).length,
                
                // Por tipo de simulado
                porTipo: {
                    ENEM: historico.filter(h => h.tipo === 'ENEM').length,
                    Treino: historico.filter(h => h.tipo === 'Treino').length,
                    Revisão: historico.filter(h => h.tipo === 'Revisão').length
                },
                
                // Evolução
                tendencia: historico.length >= 3 ? (
                    historico.slice(0, 3).reduce((sum, h) => sum + h.percentualAcerto, 0) / 3 >
                    historico.slice(-3).reduce((sum, h) => sum + h.percentualAcerto, 0) / 3 ? 
                    'Melhorando' : 'Estável'
                ) : 'Dados insuficientes',
                
                // Matérias
                materiasMaisTestadas: config.materias, // Simplificado
                materiasComMelhorDesempenho: config.materias.slice(0, 2), // Simplificado
                
                // Conquistas
                totalMedalhas: (user.medalhas || []).length,
                medalhasRecentes: historico.reduce((sum, h) => sum + h.medalhasConquistadas, 0)
            };

            // Análise de tendências
            const analises = {
                evolucao: estatisticas.tendencia,
                consistencia: estatisticas.melhorPerformance - estatisticas.piorPerformance < 30 ? 'Alta' : 'Média',
                frequencia: estatisticas.simuladosUltimos30Dias >= 5 ? 'Alta' : 
                           estatisticas.simuladosUltimos30Dias >= 2 ? 'Média' : 'Baixa',
                recomendacao: estatisticas.performanceMedia >= 80 ? 
                    'Continue com simulados mais desafiadores' :
                    estatisticas.performanceMedia >= 60 ?
                    'Foque nas matérias com menor desempenho' :
                    'Revise conceitos básicos antes de novos simulados'
            };

            res.json({
                success: true,
                message: `📊 Histórico detalhado de ${historicoOrdenado.length} simulados encontrados`,
                historico: historicoOrdenado,
                user: {
                    nome: user.nome,
                    nivel: totalSimulados < 5 ? 'Iniciante' :
                           totalSimulados < 20 ? 'Intermediário' :
                           totalSimulados < 50 ? 'Avançado' : 'Expert',
                    medalhas: (user.medalhas || []).length,
                    pontuacaoAtual: user.pontuacaoTotal || 0,
                    rankingEstimado: Math.floor(Math.random() * 1000) + 1 // Simulado
                },
                estatisticas,
                analises,
                insights: [
                    `Você realizou ${totalSimulados} simulados até agora`,
                    `Sua performance média é ${estatisticas.performanceMedia}%`,
                    estatisticas.melhorPerformance > 0 ? 
                        `Sua melhor performance foi ${estatisticas.melhorPerformance}%` : 
                        'Faça seu primeiro simulado para ver estatísticas',
                    `Tempo médio por simulado: ${estatisticas.tempoMedioGasto} minutos`,
                    `Você está ${analises.evolucao.toLowerCase()} em performance`,
                    `Frequência de estudos: ${analises.frequencia.toLowerCase()}`,
                    estatisticas.simuladosUltimos7Dias > 0 ?
                        `${estatisticas.simuladosUltimos7Dias} simulados nos últimos 7 dias - Parabéns!` :
                        'Que tal fazer um simulado hoje?'
                ],
                recomendacoes: {
                    proximoSimulado: analises.recomendacao,
                    frequenciaIdeal: 'Recomendamos 2-3 simulados por semana',
                    metaSemanal: estatisticas.simuladosUltimos7Dias < 2 ? 
                        'Tente fazer pelo menos 2 simulados esta semana' :
                        'Você está no ritmo ideal! Continue assim',
                    focoEstudo: estatisticas.performanceMedia < 70 ?
                        'Priorize revisão de conceitos básicos' :
                        'Mantenha regularidade e diversifique os tipos de simulado'
                },
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalSimulados / parseInt(limit)),
                    totalItems: totalSimulados,
                    hasNext: parseInt(page) * parseInt(limit) < totalSimulados,
                    hasPrevious: parseInt(page) > 1,
                    itemsPerPage: parseInt(limit)
                }
            });
        } else {
            // Usuário sem histórico
            res.json({
                success: true,
                message: '🎯 Pronto para começar sua jornada no Desafia Brasil!',
                historico: [],
                user: {
                    nome: user.nome,
                    nivel: 'Novo',
                    medalhas: 0,
                    pontuacaoAtual: 0
                },
                onboarding: {
                    proximoPasso: 'Fazer primeiro simulado',
                    simuladoRecomendado: 'revisao-express',
                    motivacao: 'Todo expert já foi iniciante. Comece hoje sua preparação!',
                    dicas: [
                        'Comece com simulados de revisão',
                        'Não se preocupe com erros no início',
                        'Foque no aprendizado, não na pontuação',
                        'Seja consistente - poucos minutos diários fazem diferença'
                    ]
                }
            });
        }

    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
        });
    }
};

// EXPORTS COMPLETOS
module.exports = {
    getAvailableExams,
    startExam,
    finishExam,
    getUserExamHistory
};
                                            
