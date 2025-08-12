/* ===================================
   DESAFIA BRASIL - EXAM SERVICE
   Serviço para lógica de simulados
   ================================== */

const Question = require('../models/Question');
const { database, collections, FirestoreUtils } = require('../config/database');

class ExamService {
    // Configurações dos tipos de simulados
    static getExamConfigs() {
        return {
            'enem-geral': {
                titulo: 'ENEM 2024 - Simulado Completo',
                materias: ['Matemática', 'Português', 'História', 'Geografia', 'Biologia'],
                questoesPorMateria: { 'Matemática': 9, 'Português': 9, 'História': 9, 'Geografia': 9, 'Biologia': 9 },
                dificuldade: ['Fácil', 'Médio', 'Difícil'],
                tempoLimite: 180,
                tipo: 'ENEM'
            },
            'matematica-basica': {
                titulo: 'Matemática Básica - 20 questões',
                materias: ['Matemática'],
                questoesPorMateria: { 'Matemática': 20 },
                dificuldade: ['Fácil', 'Médio'],
                tempoLimite: 90,
                tipo: 'Treino'
            },
            'portugues-interpretacao': {
                titulo: 'Português - Interpretação de Texto',
                materias: ['Português'],
                questoesPorMateria: { 'Português': 25 },
                dificuldade: ['Médio'],
                tempoLimite: 120,
                tipo: 'Treino'
            },
            'ciencias-natureza': {
                titulo: 'Ciências da Natureza - ENEM',
                materias: ['Biologia', 'Química', 'Física'],
                questoesPorMateria: { 'Biologia': 10, 'Química': 10, 'Física': 10 },
                dificuldade: ['Médio', 'Difícil'],
                tempoLimite: 135,
                tipo: 'ENEM'
            },
            'revisao-rapida': {
                titulo: 'Revisão Rápida - 10 questões',
                materias: ['Matemática', 'Português', 'História', 'Geografia', 'Biologia'],
                questoesPorMateria: { 'Matemática': 2, 'Português': 2, 'História': 2, 'Geografia': 2, 'Biologia': 2 },
                dificuldade: ['Fácil', 'Médio', 'Difícil'],
                tempoLimite: 30,
                tipo: 'Treino'
            }
        };
    }

    // Gerar questões para um simulado
    static async generateExamQuestions(examId) {
        try {
            const config = this.getExamConfigs()[examId];
            if (!config) {
                throw new Error('Configuração de simulado não encontrada');
            }

            let questoesDoSimulado = [];

            // Buscar questões por matéria
            for (const materia of config.materias) {
                const quantidade = config.questoesPorMateria[materia] || 5;
                
                const questoes = await Question.findForExam(materia, null, quantidade);
                questoesDoSimulado = questoesDoSimulado.concat(questoes.slice(0, quantidade));
            }

            // Se não houver questões suficientes, buscar questões gerais
            if (questoesDoSimulado.length < 5) {
                const questoesGerais = await Question.findForExam(null, null, 10);
                questoesDoSimulado = questoesGerais;
            }

            // Embaralhar questões
            questoesDoSimulado = this.shuffleArray(questoesDoSimulado);

            // Preparar questões para o frontend (sem resposta correta)
            const questoesParaExame = questoesDoSimulado.map((questao, index) => ({
                ...questao.dadosParaSimulado(),
                ordem: index + 1
            }));

            return {
                success: true,
                exam: {
                    id: examId,
                    titulo: config.titulo,
                    tipo: config.tipo,
                    questoes: questoesParaExame,
                    totalQuestoes: questoesParaExame.length,
                    tempoLimite: config.tempoLimite,
                    materias: config.materias
                }
            };

        } catch (error) {
            console.error('Erro ao gerar questões do simulado:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Corrigir simulado
    static async correctExam(examId, respostas, userId) {
        try {
            const questoesIds = respostas.map(r => r.questaoId);
            let acertos = 0;
            let pontuacao = 0;
            const resultadoDetalhado = [];
            const desempenhoPorMateria = {};

            // Processar cada resposta
            for (let i = 0; i < respostas.length; i++) {
                const resposta = respostas[i];
                const questao = await Question.findById(resposta.questaoId);

                if (questao) {
                    const acertou = questao.respostaCorreta === resposta.alternativaMarcada;
                    if (acertou) {
                        acertos++;
                        pontuacao += 20; // 20 pontos por questão
                    }

                    // Registrar estatística da questão
                    await questao.registrarResposta(acertou);

                    // Agrupar por matéria
                    const materia = questao.materia;
                    if (!desempenhoPorMateria[materia]) {
                        desempenhoPorMateria[materia] = { total: 0, acertos: 0 };
                    }
                    desempenhoPorMateria[materia].total++;
                    if (acertou) desempenhoPorMateria[materia].acertos++;

                    resultadoDetalhado.push({
                        questao: questao.id,
                        titulo: questao.titulo,
                        materia: questao.materia,
                        dificuldade: questao.dificuldade,
                        alternativaMarcada: resposta.alternativaMarcada,
                        alternativaCorreta: questao.respostaCorreta,
                        acertou,
                        explicacao: questao.explicacao
                    });
                }
            }

            // Calcular percentuais por matéria
            const desempenhoFinal = Object.keys(desempenhoPorMateria).map(materia => ({
                materia,
                totalQuestoes: desempenhoPorMateria[materia].total,
                acertos: desempenhoPorMateria[materia].acertos,
                percentualAcerto: Math.round((desempenhoPorMateria[materia].acertos / desempenhoPorMateria[materia].total) * 100)
            }));

            const percentualAcerto = Math.round((acertos / respostas.length) * 100);

            // Atualizar estatísticas do usuário
            const user = await database.findById(collections.USERS, userId);
            if (user) {
                const updates = {
                    simuladosRealizados: FirestoreUtils.increment(1),
                    pontuacaoTotal: FirestoreUtils.increment(pontuacao)
                };

                // Adicionar medalhas
                const novasMedalhas = [];
                if (percentualAcerto >= 90) {
                    novasMedalhas.push({
                        nome: 'Expert',
                        descricao: 'Acertou mais de 90% em um simulado',
                        conquistadaEm: FirestoreUtils.dateToTimestamp(new Date())
                    });
                }

                if ((user.simuladosRealizados || 0) === 0) {
                    novasMedalhas.push({
                        nome: 'Primeira Tentativa',
                        descricao: 'Completou seu primeiro simulado',
                        conquistadaEm: FirestoreUtils.dateToTimestamp(new Date())
                    });
                }

                if (novasMedalhas.length > 0) {
                    updates.medalhas = FirestoreUtils.arrayUnion(...novasMedalhas);
                }

                await database.update(collections.USERS, userId, updates);
            }

            return {
                success: true,
                resultado: {
                    pontuacao,
                    totalQuestoes: respostas.length,
                    acertos,
                    percentualAcerto,
                    desempenhoPorMateria: desempenhoFinal,
                    detalhamento: resultadoDetalhado
                }
            };

        } catch (error) {
            console.error('Erro ao corrigir simulado:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Embaralhar array (Fisher-Yates)
    static shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

module.exports = ExamService;
