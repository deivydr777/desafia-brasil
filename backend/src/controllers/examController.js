/* ===================================
   DESAFIA BRASIL - EXAM CONTROLLER
   Sistema completo de simulados e questões
   ================================== */

const Question = require('../models/Question');
const User = require('../models/User');

// 1. LISTAR TODOS OS SIMULADOS DISPONÍVEIS
const getAvailableExams = async (req, res) => {
    try {
        const { dificuldade, materia, tipo } = req.query;

        // Simulados pré-configurados do Desafia Brasil
        const simuladosDisponiveis = [
            {
                id: 'enem-geral',
                titulo: 'ENEM 2024 - Simulado Completo',
                descricao: 'Simulado completo com 45 questões das principais matérias do ENEM',
                questoes: 45,
                tempoLimite: 180, // 3 horas
                dificuldade: 'Médio',
                tipo: 'ENEM',
                materias: ['Matemática', 'Português', 'História', 'Geografia', 'Ciências'],
                icon: '📚',
                recomendado: true
            },
            {
                id: 'matematica-basica',
                titulo: 'Matemática Básica - 20 questões',
                descricao: 'Fundamentos de matemática para vestibular',
                questoes: 20,
                tempoLimite: 90,
                dificuldade: 'Fácil',
                tipo: 'Treino',
                materias: ['Matemática'],
                icon: '🧮',
                popular: true
            },
            {
                id: 'portugues-interpretacao',
                titulo: 'Português - Interpretação de Texto',
                descricao: 'Questões focadas em interpretação e gramática',
                questoes: 25,
                tempoLimite: 120,
                dificuldade: 'Médio',
                tipo: 'Treino',
                materias: ['Português'],
                icon: '📖'
            },
            {
                id: 'ciencias-natureza',
                titulo: 'Ciências da Natureza - ENEM',
                descricao: 'Biologia, Química e Física nivel ENEM',
                questoes: 30,
                tempoLimite: 135,
                dificuldade: 'Difícil',
                tipo: 'ENEM',
                materias: ['Biologia', 'Química', 'Física'],
                icon: '🔬'
            },
            {
                id: 'humanas-completo',
                titulo: 'Ciências Humanas Completo',
                descricao: 'História, Geografia, Sociologia e Filosofia',
                questoes: 35,
                tempoLimite: 150,
                dificuldade: 'Médio',
                tipo: 'Vestibular',
                materias: ['História', 'Geografia', 'Sociologia', 'Filosofia'],
                icon: '🏛️'
            },
            {
                id: 'revisao-rapida',
                titulo: 'Revisão Rápida - 10 questões',
                descricao: 'Simulado rápido para revisão diária',
                questoes: 10,
                tempoLimite: 30,
                dificuldade: 'Misto',
                tipo: 'Treino',
                materias: ['Misto'],
                icon: '⚡',
                rapido: true
            }
        ];

        // Aplicar filtros se fornecidos
        let simuladosFiltrados = simuladosDisponiveis;
        
        if (dificuldade) {
            simuladosFiltrados = simuladosFiltrados.filter(s => 
                s.dificuldade.toLowerCase() === dificuldade.toLowerCase()
            );
        }
        
        if (materia) {
            simuladosFiltrados = simuladosFiltrados.filter(s => 
                s.materias.some(m => m.toLowerCase().includes(materia.toLowerCase()))
            );
        }
        
        if (tipo) {
            simuladosFiltrados = simuladosFiltrados.filter(s => 
                s.tipo.toLowerCase() === tipo.toLowerCase()
            );
        }

        // Estatísticas das questões disponíveis
        const totalQuestions = await Question.countDocuments({ ativa: true });
        const questionsBySubject = await Question.aggregate([
            { $match: { ativa: true } },
            { $group: { _id: '$materia', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            message: '📚 Simulados disponíveis no Desafia Brasil',
            simulados: simuladosFiltrados,
            statistics: {
                totalSimulados: simuladosFiltrados.length,
                totalQuestoes: totalQuestions,
                questoesPorMateria: questionsBySubject
            },
            filters: {
                dificuldades: ['Fácil', 'Médio', 'Difícil', 'Misto'],
                tipos: ['ENEM', 'Vestibular', 'Treino', 'Concurso'],
                materias: ['Matemática', 'Português', 'História', 'Geografia', 'Biologia', 'Química', 'Física']
            },
            recommendations: simuladosDisponiveis.filter(s => s.recomendado || s.popular || s.rapido)
        });

    } catch (error) {
        console.error('Erro ao buscar simulados:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// 2. INICIAR UM SIMULADO ESPECÍFICO
const startExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const userId = req.userId;

        // Configurações dos simulados
        const examConfigs = {
            'enem-geral': {
                materias: ['Matemática', 'Português', 'História', 'Geografia', 'Biologia'],
                questoesPorMateria: { 'Matemática': 9, 'Português': 9, 'História': 9, 'Geografia': 9, 'Biologia': 9 },
                dificuldade: ['Fácil', 'Médio', 'Difícil'],
                tempoLimite: 180
            },
            'matematica-basica': {
                materias: ['Matemática'],
                questoesPorMateria: { 'Matemática': 20 },
                dificuldade: ['Fácil', 'Médio'],
                tempoLimite: 90
            },
            'portugues-interpretacao': {
                materias: ['Português'],
                questoesPorMateria: { 'Português': 25 },
                dificuldade: ['Médio'],
                tempoLimite: 120
            },
            'ciencias-natureza': {
                materias: ['Biologia', 'Química', 'Física'],
                questoesPorMateria: { 'Biologia': 10, 'Química': 10, 'Física': 10 },
                dificuldade: ['Médio', 'Difícil'],
                tempoLimite: 135
            },
            'humanas-completo': {
                materias: ['História', 'Geografia', 'Sociologia', 'Filosofia'],
                questoesPorMateria: { 'História': 10, 'Geografia': 10, 'Sociologia': 8, 'Filosofia': 7 },
                dificuldade: ['Médio'],
                tempoLimite: 150
            },
            'revisao-rapida': {
                materias: ['Matemática', 'Português', 'História', 'Geografia', 'Biologia'],
                questoesPorMateria: { 'Matemática': 2, 'Português': 2, 'História': 2, 'Geografia': 2, 'Biologia': 2 },
                dificuldade: ['Fácil', 'Médio', 'Difícil'],
                tempoLimite: 30
            }
        };

        const config = examConfigs[examId];
        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Simulado não encontrado',
                suggestion: 'Verifique os simulados disponíveis em /api/exams'
            });
        }

        // Buscar questões aleatórias baseadas na configuração
        let questoesDoSimulado = [];

        for (const materia of config.materias) {
            const quantidade = config.questoesPorMateria[materia] || 5;
            
            const questoes = await Question.aggregate([
                {
                    $match: {
                        materia: materia,
                        ativa: true,
                        dificuldade: { $in: config.dificuldade }
                    }
                },
                { $sample: { size: quantidade } }
            ]);

            questoesDoSimulado = questoesDoSimulado.concat(questoes);
        }

        // Se não houver questões suficientes, buscar questões gerais
        if (questoesDoSimulado.length === 0) {
            questoesDoSimulado = await Question.aggregate([
                { $match: { ativa: true } },
                { $sample: { size: 10 } }
            ]);
        }

        // Embaralhar questões
        questoesDoSimulado = questoesDoSimulado.sort(() => Math.random() - 0.5);

        // Preparar questões para o frontend (sem resposta correta)
        const questoesParaExame = questoesDoSimulado.map((questao, index) => ({
            id: questao._id,
            ordem: index + 1,
            codigo: questao.codigo,
            titulo: questao.titulo,
            enunciado: questao.enunciado,
            imagem: questao.imagem,
            alternativas: questao.alternativas,
            materia: questao.materia,
            dificuldade: questao.dificuldade,
            fonte: questao.fonte
            // NÃO enviar respostaCorreta!
        }));

        // Registrar início do simulado
        const user = await User.findById(userId);
        
        res.json({
            success: true,
            message: `🚀 Simulado "${examId}" iniciado com sucesso!`,
            exam: {
                id: examId,
                questoes: questoesParaExame,
                totalQuestoes: questoesParaExame.length,
                tempoLimite: config.tempoLimite,
                iniciadoEm: new Date(),
                instrucoes: [
                    'Leia atentamente cada questão',
                    'Marque apenas uma alternativa por questão', 
                    'Gerencie seu tempo adequadamente',
                    'Você pode revisar suas respostas antes de finalizar'
                ]
            },
            user: {
                nome: user.nome,
                simuladosRealizados: user.simuladosRealizados
            }
        });

    } catch (error) {
        console.error('Erro ao iniciar simulado:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// 3. FINALIZAR SIMULADO E CALCULAR RESULTADO
const finishExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const { respostas, tempoInicio, tempoFim } = req.body;
        const userId = req.userId;

        // Validar dados recebidos
        if (!respostas || !Array.isArray(respostas)) {
            return res.status(400).json({
                success: false,
                message: 'Respostas inválidas',
                suggestion: 'Envie um array de respostas'
            });
        }

        // Buscar questões originais para correção
        const questoesIds = respostas.map(r => r.questaoId);
        const questoesOriginais = await Question.find({ _id: { $in: questoesIds } });

        // Corrigir simulado
        let acertos = 0;
        let pontuacao = 0;
        const resultadoDetalhado = [];
        const desempenhoPorMateria = {};

        respostas.forEach((resposta, index) => {
            const questaoOriginal = questoesOriginais.find(q => 
                q._id.toString() === resposta.questaoId
            );

            if (questaoOriginal) {
                const acertou = questaoOriginal.respostaCorreta === resposta.alternativaMarcada;
                if (acertou) {
                    acertos++;
                    pontuacao += 20; // 20 pontos por questão
                }

                // Atualizar estatísticas da questão
                questaoOriginal.vezesRespondida += 1;
                if (acertou) questaoOriginal.vezesAcertada += 1;
                questaoOriginal.percentualAcerto = Math.round(
                    (questaoOriginal.vezesAcertada / questaoOriginal.vezesRespondida) * 100
                );
                questaoOriginal.save();

                // Agrupar por matéria
                const materia = questaoOriginal.materia;
                if (!desempenhoPorMateria[materia]) {
                    desempenhoPorMateria[materia] = { total: 0, acertos: 0 };
                }
                desempenhoPorMateria[materia].total++;
                if (acertou) desempenhoPorMateria[materia].acertos++;

                resultadoDetalhado.push({
                    questao: questaoOriginal._id,
                    titulo: questaoOriginal.titulo,
                    materia: questaoOriginal.materia,
                    dificuldade: questaoOriginal.dificuldade,
                    alternativaMarcada: resposta.alternativaMarcada,
                    alternativaCorreta: questaoOriginal.respostaCorreta,
                    acertou,
                    explicacao: questaoOriginal.explicacao
                });
            }
        });

        // Calcular percentuais por matéria
        const desempenhoFinal = Object.keys(desempenhoPorMateria).map(materia => ({
            materia,
            totalQuestoes: desempenhoPorMateria[materia].total,
            acertos: desempenhoPorMateria[materia].acertos,
            percentualAcerto: Math.round((desempenhoPorMateria[materia].acertos / desempenhoPorMateria[materia].total) * 100)
        }));

        // Calcular tempo total
        const tempoTotal = tempoFim ? Math.round((new Date(tempoFim) - new Date(tempoInicio)) / 60000) : 0;
        const percentualAcerto = Math.round((acertos / respostas.length) * 100);

        // Atualizar estatísticas do usuário
        const user = await User.findById(userId);
        user.simuladosRealizados += 1;
        user.pontuacaoTotal += pontuacao;

        // Adicionar medalhas se necessário
        if (percentualAcerto >= 90 && !user.medalhas.some(m => m.nome === 'Expert')) {
            user.medalhas.push({
                nome: 'Expert',
                descricao: 'Acertou mais de 90% em um simulado',
                conquistadaEm: new Date()
            });
        }
        if (user.simuladosRealizados === 1) {
            user.medalhas.push({
                nome: 'Primeira Tentativa',
                descricao: 'Completou seu primeiro simulado',
                conquistadaEm: new Date()
            });
        }

        await user.save();

        // Classificação da performance
        let classificacao = '';
        if (percentualAcerto >= 90) classificacao = 'Excelente! 🏆';
        else if (percentualAcerto >= 80) classificacao = 'Muito Bom! 🥇';
        else if (percentualAcerto >= 70) classificacao = 'Bom! 🥈';
        else if (percentualAcerto >= 60) classificacao = 'Regular 🥉';
        else if (percentualAcerto >= 50) classificacao = 'Precisa Melhorar 📚';
        else classificacao = 'Continue Estudando 💪';

        res.json({
            success: true,
            message: '✅ Simulado finalizado e corrigido!',
            resultado: {
                geral: {
                    pontuacao,
                    totalQuestoes: respostas.length,
                    acertos,
                    erros: respostas.length - acertos,
                    percentualAcerto,
                    classificacao,
                    tempoTotal
                },
                desempenhoPorMateria: desempenhoFinal,
                detalhamento: resultadoDetalhado,
                user: {
                    nome: user.nome,
                    simuladosRealizados: user.simuladosRealizados,
                    pontuacaoTotal: user.pontuacaoTotal,
                    novasMedalhas: user.medalhas.filter(m => 
                        new Date(m.conquistadaEm).toDateString() === new Date().toDateString()
                    )
                },
                recomendacoes: {
                    proximoSimulado: percentualAcerto >= 70 ? 'Tente um simulado mais difícil' : 'Revise as matérias com menor performance',
                    materiasFoco: desempenhoFinal
                        .filter(d => d.percentualAcerto < 60)
                        .map(d => d.materia)
                        .slice(0, 2)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao finalizar simulado:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// 4. HISTÓRICO DE SIMULADOS DO USUÁRIO
const getUserExamHistory = async (req, res) => {
    try {
        const userId = req.userId;
        const { page = 1, limit = 10 } = req.query;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Simulação de histórico (em produção seria buscado do banco)
        const historico = [];
        for (let i = 0; i < user.simuladosRealizados && i < limit; i++) {
            historico.push({
                id: `simulado-${i + 1}`,
                titulo: `Simulado ${i + 1}`,
                tipo: ['ENEM', 'Vestibular', 'Treino'][Math.floor(Math.random() * 3)],
                dataRealizacao: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                pontuacao: Math.floor(Math.random() * 200) + 600,
                percentualAcerto: Math.floor(Math.random() * 40) + 60,
                totalQuestoes: [10, 20, 30, 45][Math.floor(Math.random() * 4)],
                tempoGasto: Math.floor(Math.random() * 120) + 30
            });
        }

        res.json({
            success: true,
            historico: historico.sort((a, b) => b.dataRealizacao - a.dataRealizacao),
            statistics: {
                totalSimulados: user.simuladosRealizados,
                pontuacaoTotal: user.pontuacaoTotal,
                mediaGeral: user.simuladosRealizados > 0 ? 
                    Math.round(user.pontuacaoTotal / user.simuladosRealizados) : 0,
                melhorPerformance: Math.max(...historico.map(h => h.percentualAcerto), 0)
            },
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(user.simuladosRealizados / limit),
                hasNext: page * limit < user.simuladosRealizados
            }
        });

    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

module.exports = {
    getAvailableExams,
    startExam,
    finishExam,
    getUserExamHistory
};
