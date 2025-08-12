/* ===================================
   DESAFIA BRASIL - QUESTION MODEL
   Modelo para Firebase Firestore
   ================================== */

const { database, collections, FirestoreUtils } = require('../config/database');

class Question {
    constructor(data) {
        this.codigo = data.codigo;
        this.titulo = data.titulo;
        this.enunciado = data.enunciado;
        this.imagem = data.imagem || null;
        this.alternativas = data.alternativas || [];
        this.respostaCorreta = data.respostaCorreta;
        this.materia = data.materia;
        this.assunto = data.assunto;
        this.dificuldade = data.dificuldade;
        this.fonte = data.fonte || {};
        this.explicacao = data.explicacao || '';
        this.dicas = data.dicas || [];
        this.vezesRespondida = data.vezesRespondida || 0;
        this.vezesAcertada = data.vezesAcertada || 0;
        this.percentualAcerto = data.percentualAcerto || 0;
        this.ativa = data.ativa !== undefined ? data.ativa : true;
        this.aprovada = data.aprovada !== undefined ? data.aprovada : false;
        this.criadaPor = data.criadaPor;
        this.tags = data.tags || [];
    }

    // Validar dados da questão
    validate() {
        const errors = [];

        if (!this.titulo || this.titulo.trim().length === 0) {
            errors.push('Título é obrigatório');
        }

        if (!this.enunciado || this.enunciado.trim().length === 0) {
            errors.push('Enunciado é obrigatório');
        }

        if (!this.alternativas || this.alternativas.length < 2) {
            errors.push('Pelo menos 2 alternativas são obrigatórias');
        }

        if (!['A', 'B', 'C', 'D', 'E'].includes(this.respostaCorreta)) {
            errors.push('Resposta correta deve ser A, B, C, D ou E');
        }

        const materiasValidas = [
            'Matemática', 'Português', 'História', 'Geografia', 
            'Biologia', 'Química', 'Física', 'Inglês', 
            'Sociologia', 'Filosofia', 'Arte', 'Educação Física'
        ];

        if (!materiasValidas.includes(this.materia)) {
            errors.push('Matéria inválida');
        }

        if (!['Fácil', 'Médio', 'Difícil'].includes(this.dificuldade)) {
            errors.push('Dificuldade deve ser Fácil, Médio ou Difícil');
        }

        return errors;
    }

    // Salvar questão no Firebase
    async save() {
        const errors = this.validate();
        if (errors.length > 0) {
            throw new Error(`Dados inválidos: ${errors.join(', ')}`);
        }

        try {
            // Gerar código único se não existir
            if (!this.codigo) {
                this.codigo = await Question.generateUniqueCode(this.materia);
            }

            const questionData = {
                codigo: this.codigo,
                titulo: this.titulo,
                enunciado: this.enunciado,
                imagem: this.imagem,
                alternativas: this.alternativas,
                respostaCorreta: this.respostaCorreta,
                materia: this.materia,
                assunto: this.assunto,
                dificuldade: this.dificuldade,
                fonte: this.fonte,
                explicacao: this.explicacao,
                dicas: this.dicas,
                vezesRespondida: this.vezesRespondida,
                vezesAcertada: this.vezesAcertada,
                percentualAcerto: this.percentualAcerto,
                ativa: this.ativa,
                aprovada: this.aprovada,
                criadaPor: this.criadaPor,
                tags: this.tags
            };

            if (this.id) {
                // Atualizar questão existente
                const updated = await database.update(collections.QUESTIONS, this.id, questionData);
                return updated;
            } else {
                // Criar nova questão
                const created = await database.create(collections.QUESTIONS, questionData);
                this.id = created.id;
                return created;
            }
        } catch (error) {
            throw new Error(`Erro ao salvar questão: ${error.message}`);
        }
    }

    // Registrar resposta e atualizar estatísticas
    async registrarResposta(acertou) {
        try {
            const updates = {
                vezesRespondida: FirestoreUtils.increment(1)
            };

            if (acertou) {
                updates.vezesAcertada = FirestoreUtils.increment(1);
            }

            await database.update(collections.QUESTIONS, this.id, updates);

            // Atualizar objeto local
            this.vezesRespondida += 1;
            if (acertou) this.vezesAcertada += 1;
            this.percentualAcerto = this.vezesRespondida > 0 ? 
                Math.round((this.vezesAcertada / this.vezesRespondida) * 100) : 0;

            return this;
        } catch (error) {
            throw new Error(`Erro ao registrar resposta: ${error.message}`);
        }
    }

    // Dados para simulado (sem resposta correta)
    dadosParaSimulado() {
        return {
            id: this.id,
            codigo: this.codigo,
            titulo: this.titulo,
            enunciado: this.enunciado,
            imagem: this.imagem,
            alternativas: this.alternativas,
            materia: this.materia,
            assunto: this.assunto,
            dificuldade: this.dificuldade,
            fonte: this.fonte,
            tags: this.tags
        };
    }

    // Dados completos (para correção e admin)
    dadosCompletos() {
        return {
            id: this.id,
            codigo: this.codigo,
            titulo: this.titulo,
            enunciado: this.enunciado,
            imagem: this.imagem,
            alternativas: this.alternativas,
            respostaCorreta: this.respostaCorreta,
            explicacao: this.explicacao,
            dicas: this.dicas,
            materia: this.materia,
            assunto: this.assunto,
            dificuldade: this.dificuldade,
            fonte: this.fonte,
            tags: this.tags,
            estatisticas: {
                vezesRespondida: this.vezesRespondida,
                vezesAcertada: this.vezesAcertada,
                percentualAcerto: this.percentualAcerto
            },
            status: {
                ativa: this.ativa,
                aprovada: this.aprovada
            },
            criadaPor: this.criadaPor
        };
    }

    // MÉTODOS ESTÁTICOS

    // Buscar questão por ID
    static async findById(id) {
        try {
            const data = await database.findById(collections.QUESTIONS, id);
            if (!data) return null;
            
            const question = new Question(data);
            question.id = data.id;
            return question;
        } catch (error) {
            throw new Error(`Erro ao buscar questão: ${error.message}`);
        }
    }

    // Buscar questões com filtros
    static async find(filters = {}, options = {}) {
        try {
            const results = await database.find(collections.QUESTIONS, filters, options);
            return results.map(data => {
                const question = new Question(data);
                question.id = data.id;
                return question;
            });
        } catch (error) {
            throw new Error(`Erro ao buscar questões: ${error.message}`);
        }
    }

    // Buscar questões para simulado
    static async findForExam(materia, dificuldade, limit = 10) {
        try {
            const filters = {
                ativa: true,
                aprovada: true
            };

            if (materia && materia !== 'Misto') {
                filters.materia = materia;
            }

            if (dificuldade && dificuldade !== 'Misto') {
                filters.dificuldade = dificuldade;
            }

            const options = {
                limit: limit,
                orderBy: { field: 'createdAt', direction: 'desc' }
            };

            const questions = await Question.find(filters, options);

            // Se não encontrar questões suficientes, buscar de qualquer matéria/dificuldade
            if (questions.length < limit / 2) {
                const fallbackQuestions = await Question.find(
                    { ativa: true, aprovada: true },
                    { limit: limit }
                );
                return fallbackQuestions;
            }

            return questions;
        } catch (error) {
            throw new Error(`Erro ao buscar questões para simulado: ${error.message}`);
        }
    }

    // Contar questões
    static async count(filters = {}) {
        try {
            return await database.count(collections.QUESTIONS, filters);
        } catch (error) {
            throw new Error(`Erro ao contar questões: ${error.message}`);
        }
    }

    // Busca com paginação
    static async paginate(filters = {}, options = {}) {
        try {
            const result = await database.paginate(collections.QUESTIONS, filters, options);
            
            result.data = result.data.map(data => {
                const question = new Question(data);
                question.id = data.id;
                return question;
            });

            return result;
        } catch (error) {
            throw new Error(`Erro na paginação de questões: ${error.message}`);
        }
    }

    // Gerar código único para questão
    static async generateUniqueCode(materia) {
        try {
            const codigoBase = materia.substring(0, 3).toUpperCase();
            const existingQuestions = await Question.find({}, {
                orderBy: { field: 'codigo', direction: 'desc' }
            });

            let numeroCodigo = 1;
            for (const question of existingQuestions) {
                if (question.codigo && question.codigo.startsWith(codigoBase)) {
                    const numero = parseInt(question.codigo.replace(codigoBase, ''));
                    if (!isNaN(numero) && numero >= numeroCodigo) {
                        numeroCodigo = numero + 1;
                    }
                }
            }

            return `${codigoBase}${numeroCodigo.toString().padStart(4, '0')}`;
        } catch (error) {
            // Fallback para código baseado em timestamp
            return `${materia.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-4)}`;
        }
    }

    // Deletar questão
    static async delete(id) {
        try {
            return await database.delete(collections.QUESTIONS, id);
        } catch (error) {
            throw new Error(`Erro ao deletar questão: ${error.message}`);
        }
    }

    // Estatísticas gerais das questões
    static async getStats() {
        try {
            const totalQuestions = await Question.count();
            const activeQuestions = await Question.count({ ativa: true });
            const approvedQuestions = await Question.count({ aprovada: true });

            // Buscar todas as questões para estatísticas detalhadas
            const allQuestions = await Question.find();
            
            const statsBySubject = {};
            const statsByDifficulty = { 'Fácil': 0, 'Médio': 0, 'Difícil': 0 };
            let totalAnswered = 0;
            let totalCorrect = 0;

            allQuestions.forEach(question => {
                // Por matéria
                if (!statsBySubject[question.materia]) {
                    statsBySubject[question.materia] = {
                        total: 0,
                        ativas: 0,
                        aprovadas: 0,
                        vezesRespondida: 0,
                        vezesAcertada: 0
                    };
                }

                statsBySubject[question.materia].total++;
                if (question.ativa) statsBySubject[question.materia].ativas++;
                if (question.aprovada) statsBySubject[question.materia].aprovadas++;
                statsBySubject[question.materia].vezesRespondida += question.vezesRespondida || 0;
                statsBySubject[question.materia].vezesAcertada += question.vezesAcertada || 0;

                // Por dificuldade
                if (statsByDifficulty[question.dificuldade] !== undefined) {
                    statsByDifficulty[question.dificuldade]++;
                }

                // Totais gerais
                totalAnswered += question.vezesRespondida || 0;
                totalCorrect += question.vezesAcertada || 0;
            });

            return {
                overview: {
                    totalQuestions,
                    activeQuestions,
                    approvedQuestions,
                    pendingApproval: totalQuestions - approvedQuestions,
                    totalAnswered,
                    totalCorrect,
                    overallAccuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
                },
                bySubject: Object.keys(statsBySubject).map(subject => ({
                    materia: subject,
                    ...statsBySubject[subject],
                    accuracy: statsBySubject[subject].vezesRespondida > 0 ? 
                        Math.round((statsBySubject[subject].vezesAcertada / statsBySubject[subject].vezesRespondida) * 100) : 0
                })),
                byDifficulty: Object.keys(statsByDifficulty).map(difficulty => ({
                    dificuldade: difficulty,
                    count: statsByDifficulty[difficulty]
                }))
            };
        } catch (error) {
            throw new Error(`Erro ao obter estatísticas: ${error.message}`);
        }
    }
}

module.exports = Question;
