/* ===================================
   DESAFIA BRASIL - EXAM CONTROLLER
   Sistema de simulados completo
   ================================== */

const { database } = require('../../config/database');

// Configurações dos tipos de simulados
const examConfigs = {
    'enem-completo': {
        titulo: 'ENEM 2024 - Simulado Completo',
        subtitulo: 'Simulado completo nos moldes do ENEM',
        materias: ['Matemática', 'Português', 'História', 'Geografia', 'Biologia', 'Química', 'Física'],
        questoesPorMateria: { 
            'Matemática': 15, 'Português': 15, 'História': 10, 
            'Geografia': 10, 'Biologia': 10, 'Química': 10, 'Física': 10 
        },
        dificuldade: ['Médio', 'Difícil'],
        tempoLimite: 300, // 5 horas
        pontosPorQuestao: 20,
        tipo: 'ENEM',
        descricao: 'Simulado completo seguindo o padrão oficial do ENEM'
    },
    'matematica-intensivo': {
        titulo: 'Matemática Intensivo - 30 questões',
        subtitulo: 'Treino focado em matemática',
        materias: ['Matemática'],
        questoesPorMateria: { 'Matemática': 30 },
        dificuldade: ['Fácil', 'Médio', 'Difícil'],
        tempoLimite: 120, // 2 horas
        pontosPorQuestao: 15,
        tipo: 'Treino',
        descricao: 'Simulado intensivo para fortalecer conhecimentos em matemática'
    },
    'portugues-redacao': {
        titulo: 'Português - Interpretação e Gramática',
        subtitulo: 'Foco em língua portuguesa',
        materias: ['Português'],
        questoesPorMateria: { 'Português': 25 },
        dificuldade: ['Médio'],
        tempoLimite: 90,
        pontosPorQuestao: 18,
        tipo: 'Treino',
        descricao: 'Simulado focado em interpretação de texto e gramática'
    },
    'ciencias-natureza': {
        titulo: 'Ciências da Natureza - ENEM',
        subtitulo: 'Biologia, Química e Física',
        materias: ['Biologia', 'Química', 'Física'],
        questoesPorMateria: { 'Biologia': 15, 'Química': 15, 'Física': 15 },
        dificuldade: ['Médio', 'Difícil'],
        tempoLimite: 180,
        pontosPorQuestao: 20,
        tipo: 'ENEM',
        descricao: 'Simulado das ciências da natureza no padrão ENEM'
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
        descricao: 'Simulado das ciências humanas no padrão ENEM'
    },
    'revisao-express': {
        titulo: 'Revisão Express - 15 questões',
        subtitulo: 'Revisão rápida e eficiente',
        materias: ['Matemática', 'Português', 'História', 'Geografia', 'Biologia'],
        questoesPorMateria: { 'Matemática': 3, 'Português': 3, 'História': 3, 'Geografia': 3, 'Biologia': 3 },
        dificuldade: ['Fácil', 'Médio'],
        tempoLimite: 45,
        pontosPorQuestao: 25,
        tipo: 'Revisão',
        descricao: 'Simulado rápido para revisão de conteúdos principais'
    }
};

// Função para embaralhar array
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
  // 1. OBTER SIMULADOS DISPONÍVEIS
const getAvailableExams = async (req, res) => {
    try {
        // Buscar estatísticas de questões por matéria
        const allQuestions = await database.find('questions', { ativa: true, aprovada: true });
        const questionsBySubject = {};
        
        allQuestions.forEach(q => {
            if (!questionsBySubject[q.materia]) {
                questionsBySubject[q.materia] = 0;
            }
            questionsBySubject[q.materia]++;
        });

        // Preparar lista de simulados
        const availableExams = Object.keys(examConfigs).map(examId => {
            const config = examConfigs[examId];
            const totalQuestoes = Object.values(config.questoesPorMateria).reduce((a, b) => a + b, 0);
            
            // Verificar disponibilidade de questões
            let questoesDisponiveis = true;
            let materiasInsuficientes = [];
            
            config.materias.forEach(materia => {
                const necessarias = config.questoesPorMateria[materia] || 0;
                const disponiveis = questionsBySubject[materia] || 0;
                
                if (disponiveis < necessarias) {
                    questoesDisponiveis = false;
                    materiasInsuficientes.push({
                        materia,
                        necessarias,
                        disponiveis
                    });
                }
            });

            return {
                id: examId,
                titulo: config.titulo,
                subtitulo: config.subtitulo,
                tipo: config.tipo,
                descricao: config.descricao,
                materias: config.materias,
                totalQuestoes,
                tempoLimite: config.tempoLimite,
                tempoLimiteFormatado: `${Math.floor(config.tempoLimite / 60)}h ${config.tempoLimite % 60}min`,
                pontuacaoMaxima: totalQuestoes * config.pontosPorQuestao,
                dificuldade: config.dificuldade.join(', '),
                disponivel: questoesDisponiveis,
                materiasInsuficientes: questoesDisponiveis ? [] : materiasInsuficientes,
                recomendadoPara: config.tipo === 'ENEM' ? 
                    ['3º EM', 'Pré-vestibular'] : 
                    ['Todos os níveis'],
                popularidade: Math.floor(Math.random() * 1000) + 500 // Simulado
            };
        });

        // Ordenar por tipo e popularidade
        const examsSorted = availableExams.sort((a, b) => {
            if (a.tipo !== b.tipo) {
                const order = { 'ENEM': 1, 'Treino': 2, 'Revisão': 3 };
                return order[a.tipo] - order[b.tipo];
            }
            return b.popularidade - a.popularidade;
        });

        res.json({
            success: true,
            message: '📚 Simulados disponíveis no Desafia Brasil',
            exams: examsSorted,
            statistics: {
                totalExams: examsSorted.length,
                disponíveis: examsSorted.filter(e => e.disponivel).length,
                indisponíveis: examsSorted.filter(e => !e.disponivel).length,
                totalQuestoesBanco: allQuestions.length
            },
            categories: {
                enem: examsSorted.filter(e => e.tipo === 'ENEM').length,
                treino: examsSorted.filter(e => e.tipo === 'Treino').length,
                revisao: examsSorted.filter(e => e.tipo === 'Revisão').length
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
      // 2. INICIAR SIMULADO
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

        // Buscar questões para o simulado
        let questoesDoSimulado = [];
        
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

            // Embaralhar e pegar a quantidade necessária
            const questoesEmbaralhadas = shuffleArray(questoesFiltradas);
            const questoesSelecionadas = questoesEmbaralhadas.slice(0, quantidade);
            
            questoesDoSimulado = questoesDoSimulado.concat(questoesSelecionadas);
        }

        // Verificar se temos questões suficientes
        const totalNecessario = Object.values(config.questoesPorMateria).reduce((a, b) => a + b, 0);
        if (questoesDoSimulado.length < totalNecessario / 2) {
            return res.status(400).json({
                success: false,
                message: 'Questões insuficientes para gerar o simulado',
                required: totalNecessario,
                available: questoesDoSimulado.length,
                suggestion: 'Tente um simulado com menos questões'
            });
        }

        // Embaralhar questões finais
        questoesDoSimulado = shuffleArray(questoesDoSimulado);
                    // Preparar questões para envio (sem resposta correta)
        const questoesParaExame = questoesDoSimulado.map((questao, index) => ({
            id: questao.id,
            ordem: index + 1,
            codigo: questao.codigo,
            titulo: questao.titulo,
            enunciado: questao.enunciado,
            imagem: questao.imagem || null,
            alternativas: questao.alternativas || [],
            materia: questao.materia,
            assunto: questao.assunto,
            dificuldade: questao.dificuldade,
            fonte: questao.fonte || {},
            tags: questao.tags || [],
            pontos: config.pontosPorQuestao
        }));

        // Registrar início do simulado (opcional - para estatísticas)
        const examSession = {
            userId: req.userId,
            examId: examId,
            questions: questoesDoSimulado.map(q => q.id),
            startedAt: new Date(),
            status: 'em_andamento'
        };

        res.json({
            success: true,
            message: `🚀 Simulado "${config.titulo}" iniciado com sucesso!`,
            exam: {
                id: examId,
                titulo: config.titulo,
                subtitulo: config.subtitulo,
                tipo: config.tipo,
                descricao: config.descricao,
                questoes: questoesParaExame,
                configuracao: {
                    totalQuestoes: questoesParaExame.length,
                    tempoLimite: config.tempoLimite,
                    tempoLimiteMs: config.tempoLimite * 60 * 1000,
                    pontosPorQuestao: config.pontosPorQuestao,
                    pontuacaoMaxima: questoesParaExame.length * config.pontosPorQuestao,
                    materiasIncluidas: config.materias,
                    dificuldade: config.dificuldade
                },
                instrucoes: [
                    '📖 Leia atentamente cada questão e todas as alternativas',
                    '⏰ Gerencie seu tempo - você tem ' + `${Math.floor(config.tempoLimite / 60)}h ${config.tempoLimite % 60}min`,
                    '✅ Marque apenas uma alternativa por questão',
                    '🔄 Você pode revisar e alterar suas respostas antes de finalizar',
                    '🎯 Mantenha o foco e boa sorte!'
                ]
            },
            user: {
                nome: user.nome,
                simuladosRealizados: user.simuladosRealizados || 0,
                pontuacaoTotal: user.pontuacaoTotal || 0,
                nivel: (user.simuladosRealizados || 0) < 5 ? 'Iniciante' :
                       (user.simuladosRealizados || 0) < 20 ? 'Intermediário' : 'Avançado'
            },
            session: {
                iniciadoEm: new Date(),
                tempoRestante: config.tempoLimite * 60,
                progresso: {
                    questoesRespondidas: 0,
                    questoesTotais: questoesParaExame.length,
                    percentualCompleto: 0
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
// 3. FINALIZAR SIMULADO E CALCULAR RESULTADO
const finishExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const { respostas, tempoInicio, tempoFim } = req.body;

        // Validações básicas
        if (!respostas || !Array.isArray(respostas) || respostas.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Respostas são obrigatórias',
                expected: 'Array de objetos com questaoId e alternativaMarcada',
                received: typeof respostas
            });
        }

        // Verificar configuração do simulado
        const config = examConfigs[examId];
        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Configuração do simulado não encontrada'
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

        // Inicializar variáveis de correção
        let acertos = 0;
        let pontuacao = 0;
        const resultadoDetalhado = [];
        const desempenhoPorMateria = {};
        const questoesComErro = [];
        const questoesComAcerto = [];

        // Processar cada resposta
        for (let i = 0; i < respostas.length; i++) {
            const resposta = respostas[i];
            
            if (!resposta.questaoId || !resposta.alternativaMarcada) {
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
                    questoesComAcerto.push(questao.id);
                } else {
                    questoesComErro.push({
                        id: questao.id,
                        materia: questao.materia,
                        alternativaMarcada: resposta.alternativaMarcada,
                        alternativaCorreta: questao.respostaCorreta
                    });
                }

                // Atualizar estatísticas da questão
                await database.update('questions', questao.id, {
                    vezesRespondida: (questao.vezesRespondida || 0) + 1,
                    vezesAcertada: (questao.vezesAcertada || 0) + (acertou ? 1 : 0),
                    percentualAcerto: Math.round(((questao.vezesAcertada || 0) + (acertou ? 1 : 0)) / ((questao.vezesRespondida || 0) + 1) * 100)
                });

                // Agrupar desempenho por matéria
                const materia = questao.materia;
                if (!desempenhoPorMateria[materia]) {
                    desempenhoPorMateria[materia] = { 
                        total: 0, 
                        acertos: 0, 
                        questoes: [] 
                    };
                }
                desempenhoPorMateria[materia].total++;
                if (acertou) desempenhoPorMateria[materia].acertos++;
                desempenhoPorMateria[materia].questoes.push({
                    id: questao.id,
                    titulo: questao.titulo,
                    acertou,
                    alternativaMarcada: resposta.alternativaMarcada,
                    alternativaCorreta: questao.respostaCorreta
                });

                // Adicionar ao resultado detalhado
                resultadoDetalhado.push({
                    questao: questao.id,
                    codigo: questao.codigo,
                    titulo: questao.titulo,
                    materia: questao.materia,
                    assunto: questao.assunto,
                    dificuldade: questao.dificuldade,
                    alternativaMarcada: resposta.alternativaMarcada,
                    alternativaCorreta: questao.respostaCorreta,
                    acertou,
                    pontos: acertou ? pontosQuestao : 0,
                    explicacao: questao.explicacao || '',
                    dicas: questao.dicas || []
                });
            }
                  }
              // Calcular estatísticas finais
        const totalQuestoes = respostas.length;
        const percentualAcerto = Math.round((acertos / totalQuestoes) * 100);
        
        // Calcular tempo gasto
        let tempoGasto = 0;
        if (tempoInicio && tempoFim) {
            tempoGasto = Math.round((new Date(tempoFim) - new Date(tempoInicio)) / 60000); // em minutos
        }

        // Preparar desempenho por matéria
        const desempenhoFinal = Object.keys(desempenhoPorMateria).map(materia => ({
            materia,
            totalQuestoes: desempenhoPorMateria[materia].total,
            acertos: desempenhoPorMateria[materia].acertos,
            percentualAcerto: Math.round((desempenhoPorMateria[materia].acertos / desempenhoPorMateria[materia].total) * 100),
            performance: desempenhoPorMateria[materia].acertos / desempenhoPorMateria[materia].total >= 0.8 ? 'Excelente' :
                        desempenhoPorMateria[materia].acertos / desempenhoPorMateria[materia].total >= 0.6 ? 'Bom' :
                        desempenhoPorMateria[materia].acertos / desempenhoPorMateria[materia].total >= 0.4 ? 'Regular' : 'Precisa melhorar'
        }));

        // Sistema de medalhas e conquistas
        const novasMedalhas = [];
        
        if (percentualAcerto >= 95) {
            novasMedalhas.push({
                nome: '🏆 Perfeição',
                descricao: 'Acertou 95% ou mais em um simulado',
                conquistadaEm: new Date()
            });
        } else if (percentualAcerto >= 90) {
            novasMedalhas.push({
                nome: '🥇 Expert',
                descricao: 'Acertou 90% ou mais em um simulado',
                conquistadaEm: new Date()
            });
        } else if (percentualAcerto >= 80) {
            novasMedalhas.push({
                nome: '🥈 Muito Bom',
                descricao: 'Acertou 80% ou mais em um simulado',
                conquistadaEm: new Date()
            });
        } else if (percentualAcerto >= 70) {
            novasMedalhas.push({
                nome: '🥉 Bom Desempenho',
                descricao: 'Acertou 70% ou mais em um simulado',
                conquistadaEm: new Date()
            });
        }

        // Primeira tentativa
        if ((user.simuladosRealizados || 0) === 0) {
            novasMedalhas.push({
                nome: '🌟 Primeira Tentativa',
                descricao: 'Completou seu primeiro simulado',
                conquistadaEm: new Date()
            });
        }

        // Simulado específico do ENEM
        if (config.tipo === 'ENEM' && percentualAcerto >= 80) {
            novasMedalhas.push({
                nome: '📚 Preparado para o ENEM',
                descricao: 'Excelente performance em simulado ENEM',
                conquistadaEm: new Date()
            });
        }

        // Atualizar estatísticas do usuário
        const updatedUserData = {
            simuladosRealizados: (user.simuladosRealizados || 0) + 1,
            pontuacaoTotal: (user.pontuacaoTotal || 0) + pontuacao,
            ultimoSimulado: {
                examId,
                data: new Date(),
                pontuacao,
                percentualAcerto,
                tempoGasto
            }
        };

        // Adicionar medalhas se houver
        if (novasMedalhas.length > 0) {
            const medalhasAtuais = user.medalhas || [];
            updatedUserData.medalhas = [...medalhasAtuais, ...novasMedalhas];
        }

        await database.update('users', req.userId, updatedUserData);
                    // Determinar classificação
        let classificacao = '';
        let emoji = '';
        if (percentualAcerto >= 95) {
            classificacao = 'Extraordinário';
            emoji = '🏆';
        } else if (percentualAcerto >= 90) {
            classificacao = 'Excelente';
            emoji = '🥇';
        } else if (percentualAcerto >= 80) {
            classificacao = 'Muito Bom';
            emoji = '🥈';
        } else if (percentualAcerto >= 70) {
            classificacao = 'Bom';
            emoji = '🥉';
        } else if (percentualAcerto >= 60) {
            classificacao = 'Regular';
            emoji = '📚';
        } else if (percentualAcerto >= 50) {
            classificacao = 'Precisa Melhorar';
            emoji = '💪';
        } else {
            classificacao = 'Continue Estudando';
            emoji = '📖';
        }

        // Gerar recomendações personalizadas
        const recomendacoes = [];
        
        // Recomendações por matéria
        const materiasComDificuldade = desempenhoFinal
            .filter(d => d.percentualAcerto < 60)
            .sort((a, b) => a.percentualAcerto - b.percentualAcerto)
            .slice(0, 3);

        if (materiasComDificuldade.length > 0) {
            recomendacoes.push(`Foque em estudar: ${materiasComDificuldade.map(m => m.materia).join(', ')}`);
        }

        // Recomendação de próximo simulado
        if (percentualAcerto >= 80) {
            recomendacoes.push('Tente um simulado mais desafiador ou completo');
        } else if (percentualAcerto >= 60) {
            recomendacoes.push('Continue praticando com simulados do mesmo nível');
        } else {
            recomendacoes.push('Revise os conteúdos básicos antes do próximo simulado');
        }

        // Recomendação de tempo
        if (tempoGasto > 0) {
            const tempoMedio = config.tempoLimite / totalQuestoes;
            const seuTempo = tempoGasto / totalQuestoes;
            
            if (seuTempo > tempoMedio * 1.5) {
                recomendacoes.push('Trabalhe na velocidade de resolução das questões');
            } else if (seuTempo < tempoMedio * 0.5) {
                recomendacoes.push('Você foi rápido! Revise suas respostas com mais cuidado');
            }
        }

        res.json({
            success: true,
            message: `${emoji} Simulado finalizado! ${classificacao}`,
            resultado: {
                geral: {
                    pontuacao,
                    pontuacaoMaxima: totalQuestoes * config.pontosPorQuestao,
                    totalQuestoes,
                    acertos,
                    erros: totalQuestoes - acertos,
                    percentualAcerto,
                    classificacao: `${emoji} ${classificacao}`,
                    tempoGasto: tempoGasto,
                    tempoLimite: config.tempoLimite,
                    eficiencia: tempoGasto > 0 ? Math.round((config.tempoLimite / tempoGasto) * 100) : 100
                },
                desempenhoPorMateria: desempenhoFinal,
                medalhas: novasMedalhas,
                recomendacoes
            },
            user: {
                nome: user.nome,
                simuladosRealizados: updatedUserData.simuladosRealizados,
                pontuacaoTotal: updatedUserData.pontuacaoTotal,
                novasMedalhas: novasMedalhas.length,
                proximoNivel: updatedUserData.simuladosRealizados < 10 ? 
                    `${10 - updatedUserData.simuladosRealizados} simulados para o próximo nível` :
                    'Nível máximo atingido!'
            },
            analise: {
                pontosFortes: desempenhoFinal
                    .filter(d => d.percentualAcerto >= 80)
                    .map(d => d.materia),
                pontosAMelhorar: materiasComDificuldade.map(d => d.materia),
                proximoObjetivo: percentualAcerto >= 80 ? 
                    'Manter consistência' : 
                    'Melhorar performance geral'
            }
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
      // 4. OBTER HISTÓRICO DE SIMULADOS DO USUÁRIO
const getUserExamHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10, examType, startDate, endDate } = req.query;

        // Buscar usuário
        const user = await database.findById('users', req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Por enquanto, simular histórico baseado nos dados do usuário
        // Em uma implementação real, você salvaria cada sessão de simulado
        const totalSimulados = user.simuladosRealizados || 0;
        const pontuacaoMedia = totalSimulados > 0 ? 
            Math.round((user.pontuacaoTotal || 0) / totalSimulados) : 0;

        // Gerar histórico simulado (substitua por dados reais do banco)
        const historico = Array.from({ length: Math.min(totalSimulados, limit) }, (_, i) => {
            const tiposDisponiveis = ['ENEM', 'Treino', 'Revisão'];
            const materiasDisponiveis = ['Matemática', 'Português', 'História', 'Geografia', 'Biologia'];
            
            return {
                id: `simulado-${Date.now()}-${i}`,
                examId: Object.keys(examConfigs)[Math.floor(Math.random() * Object.keys(examConfigs).length)],
                titulo: `Simulado ${i + 1}`,
                tipo: tiposDisponiveis[Math.floor(Math.random() * tiposDisponiveis.length)],
                dataRealizacao: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                pontuacao: Math.floor(Math.random() * 200) + pontuacaoMedia - 100,
                pontuacaoMaxima: Math.floor(Math.random() * 100) + 500,
                percentualAcerto: Math.floor(Math.random() * 40) + 60,
                totalQuestoes: [10, 15, 20, 30, 45][Math.floor(Math.random() * 5)],
                tempoGasto: Math.floor(Math.random() * 120) + 30,
                classificacao: ['Excelente', 'Muito Bom', 'Bom', 'Regular'][Math.floor(Math.random() * 4)],
                materiasIncluidas: materiasDisponiveis.slice(0, Math.floor(Math.random() * 3) + 2)
            };
        });

        // Ordenar por data (mais recente primeiro)
        const historicoOrdenado = historico.sort((a, b) => 
            new Date(b.dataRealizacao) - new Date(a.dataRealizacao)
        );

        // Calcular estatísticas do histórico
        const estatisticas = {
            totalSimulados: totalSimulados,
            pontuacaoTotal: user.pontuacaoTotal || 0,
            pontuacaoMedia: pontuacaoMedia,
            melhorPerformance: historico.length > 0 ? 
                Math.max(...historico.map(h => h.percentualAcerto)) : 0,
            piorPerformance: historico.length > 0 ? 
                Math.min(...historico.map(h => h.percentualAcerto)) : 0,
            tempoMedioGasto: historico.length > 0 ? 
                Math.round(historico.reduce((sum, h) => sum + h.tempoGasto, 0) / historico.length) : 0,
            simuladosUltimos30Dias: historico.filter(h => {
                const dataSimulado = new Date(h.dataRealizacao);
                const treintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                return dataSimulado > treintaDiasAtras;
            }).length
        };

        res.json({
            success: true,
            message: `📊 Histórico de ${historicoOrdenado.length} simulados encontrados`,
            historico: historicoOrdenado,
            user: {
                nome: user.nome,
                nivel: totalSimulados < 5 ? 'Iniciante' :
                       totalSimulados < 20 ? 'Intermediário' : 'Avançado',
                medalhas: (user.medalhas || []).length
            },
            estatisticas,
            insights: [
                `Você realizou ${totalSimulados} simulados até agora`,
                `Sua pontuação média é ${pontuacaoMedia} pontos`,
                estatisticas.melhorPerformance > 0 ? 
                    `Sua melhor performance foi ${estatisticas.melhorPerformance}%` : 
                    'Faça seu primeiro simulado para ver estatísticas',
                `Tempo médio por simulado: ${estatisticas.tempoMedioGasto} minutos`
            ],
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalSimulados / limit),
                totalItems: totalSimulados,
                hasNext: page * limit < totalSimulados,
                hasPrevious: page > 1
            }
        });

    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
        });
    }
};
          module.exports = {
    getAvailableExams,
    startExam,
    finishExam,
    getUserExamHistory
};
