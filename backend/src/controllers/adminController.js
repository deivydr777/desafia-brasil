/* ===================================
   DESAFIA BRASIL - ADMIN CONTROLLER
   Sistema completo de administração
   Versão Firebase Firestore
   ================================== */

const { database, collections, FirestoreUtils } = require('../../config/database');
const User = require('../models/User');
const Question = require('../models/Question');

// 1. DASHBOARD ADMINISTRATIVO COMPLETO
const getAdminDashboard = async (req, res) => {
    try {
        // Verificar se é admin
        const adminUser = await User.findById(req.userId);
        if (!adminUser || adminUser.tipo !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado - Apenas administradores',
                requiredRole: 'admin',
                userRole: adminUser?.tipo || 'guest'
            });
        }

        // Estatísticas dos usuários
        const userStats = await User.getStats();
        
        // Estatísticas das questões
        const questionStats = await Question.getStats();

        // Top 10 estudantes
        const topStudents = await User.getRanking({}, 10);

        // Usuários recentes (últimos 7 dias)
        const recentUsers = await User.getActiveUsers(7);

        // Questões mais respondidas
        const allQuestions = await Question.find({ ativa: true }, {
            orderBy: { field: 'vezesRespondida', direction: 'desc' },
            limit: 5
        });

        // Questões pendentes de aprovação
        const pendingQuestions = await Question.count({ aprovada: false });

        res.json({
            success: true,
            message: '📊 Dashboard administrativo do Desafia Brasil',
            dashboard: {
                overview: {
                    totalUsers: userStats.overview.totalUsers,
                    activeUsers: userStats.overview.activeUsers,
                    verifiedUsers: userStats.overview.verifiedUsers,
                    totalQuestions: questionStats.overview.totalQuestions,
                    activeQuestions: questionStats.overview.activeQuestions,
                    pendingQuestions: pendingQuestions,
                    totalExams: userStats.overview.totalExams,
                    averageScore: userStats.overview.averageScore,
                    recentActivity: recentUsers.length,
                    overallAccuracy: questionStats.overview.overallAccuracy
                },
                distribution: {
                    usersByState: userStats.byState.slice(0, 10),
                    usersBySerie: userStats.bySerie,
                    questionsBySubject: questionStats.bySubject.map(item => ({
                        materia: item.materia,
                        total: item.total,
                        ativas: item.ativas,
                        accuracy: item.accuracy
                    })),
                    questionsByDifficulty: questionStats.byDifficulty
                },
                topPerformers: topStudents.slice(0, 10).map((user, index) => ({
                    posicao: index + 1,
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    escola: user.escola,
                    estado: user.estado,
                    pontuacao: user.pontuacaoTotal,
                    simulados: user.simuladosRealizados,
                    mediaGeral: user.mediaGeral
                })),
                popularContent: allQuestions.map(q => ({
                    id: q.id,
                    codigo: q.codigo,
                    titulo: q.titulo,
                    materia: q.materia,
                    vezesRespondida: q.vezesRespondida,
                    percentualAcerto: q.percentualAcerto,
                    dificuldade: q.dificuldade
                })),
                recentActivity: {
                    newUsers7days: recentUsers.length,
                    pendingApprovals: pendingQuestions,
                    totalAnswered: questionStats.overview.totalAnswered
                }
            },
            timestamp: new Date(),
            generatedBy: adminUser.nome
        });

    } catch (error) {
        console.error('Erro no dashboard admin:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// 2. GERENCIAR USUÁRIOS
const manageUsers = async (req, res) => {
    try {
        const { action, userId, userData } = req.body;
        const { page = 1, limit = 20, search, estado, serie, tipo } = req.query;

        // Verificar permissão de admin
        const adminUser = await User.findById(req.userId);
        if (!adminUser || adminUser.tipo !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado - Apenas administradores'
            });
        }

        // Ações específicas
        if (action && userId) {
            switch (action) {
                case 'block':
                    const blockedUser = await database.update(collections.USERS, userId, { ativo: false });
                    return res.json({
                        success: true,
                        message: '🚫 Usuário bloqueado com sucesso',
                        user: blockedUser
                    });

                case 'unblock':
                    const unblockedUser = await database.update(collections.USERS, userId, { ativo: true });
                    return res.json({
                        success: true,
                        message: '✅ Usuário desbloqueado com sucesso',
                        user: unblockedUser
                    });

                case 'promote':
                    const promotedUser = await User.promoteUser(userId, userData.novoTipo || 'professor');
                    return res.json({
                        success: true,
                        message: `⬆️ Usuário promovido para ${userData.novoTipo || 'professor'}`,
                        user: promotedUser.dadosPublicos()
                    });

                case 'update':
                    const updatedUser = await database.update(collections.USERS, userId, userData);
                    return res.json({
                        success: true,
                        message: '✏️ Usuário atualizado com sucesso',
                        user: updatedUser
                    });

                case 'delete':
                    const deleted = await User.delete(userId);
                    if (deleted) {
                        return res.json({
                            success: true,
                            message: '🗑️ Usuário removido com sucesso'
                        });
                    } else {
                        return res.status(400).json({
                            success: false,
                            message: 'Erro ao remover usuário'
                        });
                    }

                case 'verify':
                    const verifiedUser = await database.update(collections.USERS, userId, { emailVerificado: true });
                    return res.json({
                        success: true,
                        message: '✅ Email verificado com sucesso',
                        user: verifiedUser
                    });

                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Ação inválida',
                        availableActions: ['block', 'unblock', 'promote', 'update', 'delete', 'verify']
                    });
            }
        }

        // Construir filtros para busca
        const filters = {};
        if (estado) filters.estado = estado;
        if (serie) filters.serie = serie;
        if (tipo) filters.tipo = tipo;

        // Busca por texto (simulação - no Firebase seria necessário usar Algolia ou similar)
        let users = [];
        if (search) {
            // Buscar por nome, email ou escola (busca simples)
            const allUsers = await User.find(filters);
            users = allUsers.filter(user => 
                user.nome.toLowerCase().includes(search.toLowerCase()) ||
                user.email.toLowerCase().includes(search.toLowerCase()) ||
                (user.escola && user.escola.toLowerCase().includes(search.toLowerCase()))
            );
        } else {
            // Busca com paginação
            const paginationResult = await User.paginate(filters, {
                page: parseInt(page),
                limit: parseInt(limit),
                orderBy: { field: 'createdAt', direction: 'desc' }
            });
            users = paginationResult.data;
        }

        // Formatar dados para resposta
        const usersFormatted = users.map(user => ({
            id: user.id,
            nome: user.nome,
            email: user.email,
            escola: user.escola,
            serie: user.serie,
            localizacao: `${user.cidade || 'N/A'}, ${user.estado || 'N/A'}`,
            pontuacao: user.pontuacaoTotal,
            simulados: user.simuladosRealizados,
            medalhas: user.medalhas?.length || 0,
            status: user.ativo ? 'Ativo' : 'Bloqueado',
            emailVerificado: user.emailVerificado,
            tipo: user.tipo,
            ultimoLogin: user.ultimoLogin,
            membro_desde: user.criadoEm,
            mediaGeral: user.mediaAcertos
        }));

        const totalUsers = search ? users.length : await User.count(filters);

        res.json({
            success: true,
            message: `👥 ${usersFormatted.length} usuários encontrados`,
            users: usersFormatted,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalUsers / limit),
                totalUsers,
                hasNext: page * limit < totalUsers,
                hasPrevious: page > 1,
                resultsPerPage: parseInt(limit)
            },
            filters: {
                search: search || null,
                estado: estado || 'Todos',
                serie: serie || 'Todas',
                tipo: tipo || 'Todos'
            },
            statistics: {
                totalActive: usersFormatted.filter(u => u.status === 'Ativo').length,
                totalBlocked: usersFormatted.filter(u => u.status === 'Bloqueado').length,
                totalVerified: usersFormatted.filter(u => u.emailVerificado).length,
                averageScore: usersFormatted.length > 0 ? 
                    Math.round(usersFormatted.reduce((sum, u) => sum + u.pontuacao, 0) / usersFormatted.length) : 0
            }
        });

    } catch (error) {
        console.error('Erro no gerenciamento de usuários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// 3. GERENCIAR QUESTÕES
const manageQuestions = async (req, res) => {
    try {
        const { action, questionId, questionData } = req.body;
        const { page = 1, limit = 20, search, materia, dificuldade, aprovada, ativa } = req.query;

        // Verificar permissão de admin
        const adminUser = await User.findById(req.userId);
        if (!adminUser || adminUser.tipo !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado - Apenas administradores'
            });
        }

        // Ações específicas
        if (action && questionId) {
            switch (action) {
                case 'approve':
                    const approvedQuestion = await database.update(collections.QUESTIONS, questionId, { 
                        aprovada: true, 
                        ativa: true 
                    });
                    return res.json({
                        success: true,
                        message: '✅ Questão aprovada e ativada com sucesso',
                        question: approvedQuestion
                    });

                case 'reject':
                    const rejectedQuestion = await database.update(collections.QUESTIONS, questionId, { 
                        aprovada: false, 
                        ativa: false 
                    });
                    return res.json({
                        success: true,
                        message: '❌ Questão rejeitada',
                        question: rejectedQuestion
                    });

                case 'activate':
                    const activatedQuestion = await database.update(collections.QUESTIONS, questionId, { ativa: true });
                    return res.json({
                        success: true,
                        message: '🔄 Questão ativada',
                        question: activatedQuestion
                    });

                case 'deactivate':
                    const deactivatedQuestion = await database.update(collections.QUESTIONS, questionId, { ativa: false });
                    return res.json({
                        success: true,
                        message: '⏸️ Questão desativada',
                        question: deactivatedQuestion
                    });

                case 'update':
                    const updatedQuestion = await database.update(collections.QUESTIONS, questionId, questionData);
                    return res.json({
                        success: true,
                        message: '✏️ Questão atualizada com sucesso',
                        question: updatedQuestion
                    });

                case 'delete':
                    const deleted = await Question.delete(questionId);
                    if (deleted) {
                        return res.json({
                            success: true,
                            message: '🗑️ Questão removida com sucesso'
                        });
                    } else {
                        return res.status(400).json({
                            success: false,
                            message: 'Erro ao remover questão'
                        });
                    }

                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Ação inválida',
                        availableActions: ['approve', 'reject', 'activate', 'deactivate', 'update', 'delete']
                    });
            }
        }

        // Construir filtros
        const filters = {};
        if (materia) filters.materia = materia;
        if (dificuldade) filters.dificuldade = dificuldade;
        if (aprovada !== undefined) filters.aprovada = aprovada === 'true';
        if (ativa !== undefined) filters.ativa = ativa === 'true';

        // Buscar questões
        let questions = [];
        if (search) {
            // Busca simples por título, código ou enunciado
            const allQuestions = await Question.find(filters);
            questions = allQuestions.filter(q => 
                q.titulo.toLowerCase().includes(search.toLowerCase()) ||
                q.codigo.toLowerCase().includes(search.toLowerCase()) ||
                q.enunciado.toLowerCase().includes(search.toLowerCase())
            );
        } else {
            const paginationResult = await Question.paginate(filters, {
                page: parseInt(page),
                limit: parseInt(limit),
                orderBy: { field: 'createdAt', direction: 'desc' }
            });
            questions = paginationResult.data;
        }

        // Buscar informações dos criadores
        const questionsWithCreators = await Promise.all(
            questions.map(async (question) => {
                let criador = null;
                if (question.criadaPor) {
                    criador = await User.findById(question.criadaPor);
                }

                return {
                    id: question.id,
                    codigo: question.codigo,
                    titulo: question.titulo,
                    materia: question.materia,
                    assunto: question.assunto,
                    dificuldade: question.dificuldade,
                    fonte: question.fonte ? 
                        `${question.fonte.vestibular || 'N/A'} ${question.fonte.ano || ''}`.trim() : 'N/A',
                    status: question.ativa ? 
                        (question.aprovada ? 'Ativa' : 'Pendente') : 'Inativa',
                    aprovada: question.aprovada,
                    ativa: question.ativa,
                    estatisticas: {
                        vezesRespondida: question.vezesRespondida,
                        vezesAcertada: question.vezesAcertada,
                        percentualAcerto: question.percentualAcerto
                    },
                    autor: criador ? criador.nome : 'Sistema',
                    autorEmail: criador ? criador.email : null,
                    criadaEm: question.criadaEm || question.createdAt,
                    tags: question.tags || []
                };
            })
        );

        const totalQuestions = search ? questions.length : await Question.count(filters);

        res.json({
            success: true,
            message: `❓ ${questionsWithCreators.length} questões encontradas`,
            questions: questionsWithCreators,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalQuestions / limit),
                totalQuestions,
                hasNext: page * limit < totalQuestions,
                hasPrevious: page > 1,
                resultsPerPage: parseInt(limit)
            },
            filters: {
                search: search || null,
                materia: materia || 'Todas',
                dificuldade: dificuldade || 'Todas',
                aprovada: aprovada || 'Todas',
                ativa: ativa || 'Todas'
            },
            statistics: {
                totalActive: questionsWithCreators.filter(q => q.ativa).length,
                totalApproved: questionsWithCreators.filter(q => q.aprovada).length,
                totalPending: questionsWithCreators.filter(q => !q.aprovada).length,
                averageAccuracy: questionsWithCreators.length > 0 ? 
                    Math.round(questionsWithCreators.reduce((sum, q) => sum + (q.estatisticas.percentualAcerto || 0), 0) / questionsWithCreators.length) : 0
            }
        });

    } catch (error) {
        console.error('Erro no gerenciamento de questões:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// 4. CRIAR NOVA QUESTÃO
const createQuestion = async (req, res) => {
    try {
        const {
            titulo,
            enunciado,
            alternativas,
            respostaCorreta,
            materia,
            assunto,
            dificuldade,
            fonte,
            explicacao,
            tags
        } = req.body;

        // Verificar permissão
        const adminUser = await User.findById(req.userId);
        if (!adminUser || (adminUser.tipo !== 'admin' && adminUser.tipo !== 'professor')) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado - Apenas administradores e professores'
            });
        }

        // Validar dados obrigatórios
        const requiredFields = ['titulo', 'enunciado', 'alternativas', 'respostaCorreta', 'materia', 'assunto', 'dificuldade'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios ausentes',
                missingFields,
                example: {
                    titulo: "Questão de Matemática Básica",
                    enunciado: "Qual é o resultado de 2 + 2?",
                    alternativas: [
                        { letra: 'A', texto: '3' },
                        { letra: 'B', texto: '4' },
                        { letra: 'C', texto: '5' },
                        { letra: 'D', texto: '6' }
                    ],
                    respostaCorreta: 'B',
                    materia: 'Matemática',
                    assunto: 'Operações Básicas',
                    dificuldade: 'Fácil'
                }
            });
        }

        // Criar objeto Question
        const newQuestion = new Question({
            titulo,
            enunciado,
            alternativas,
            respostaCorreta,
            materia,
            assunto,
            dificuldade,
            fonte: fonte || {},
            explicacao: explicacao || '',
            tags: tags || [],
            criadaPor: req.userId,
            aprovada: adminUser.tipo === 'admin', // Admin aprova automaticamente
            ativa: adminUser.tipo === 'admin'
        });

        // Salvar no banco
        const savedQuestion = await newQuestion.save();

        res.status(201).json({
            success: true,
            message: '🎯 Questão criada com sucesso!',
            question: {
                id: savedQuestion.id,
                codigo: savedQuestion.codigo,
                titulo: savedQuestion.titulo,
                materia: savedQuestion.materia,
                assunto: savedQuestion.assunto,
                dificuldade: savedQuestion.dificuldade,
                status: savedQuestion.aprovada ? 'Aprovada e Ativa' : 'Pendente de Aprovação',
                criadaPor: adminUser.nome
            },
            nextSteps: adminUser.tipo === 'admin' ? 
                ['Questão já está ativa e disponível para simulados'] :
                ['Questão criada e enviada para aprovação do administrador']
        });

    } catch (error) {
        console.error('Erro ao criar questão:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};
// 5. RELATÓRIOS E ESTATÍSTICAS AVANÇADAS
const getAdvancedReports = async (req, res) => {
    try {
        const { type, startDate, endDate, format = 'json' } = req.query;

        // Verificar permissão de admin
        const adminUser = await User.findById(req.userId);
        if (!adminUser || adminUser.tipo !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado - Apenas administradores'
            });
        }

        let report = {};
        const now = new Date();
        switch (type) {
            case 'users':
                // Relatório de usuários
                const userStats = await User.getStats();
                const recentUsers = await User.getActiveUsers(30); // últimos 30 dias
                
                report = {
                    type: 'Relatório de Usuários',
                    period: { startDate, endDate },
                    overview: userStats.overview,
                    breakdown: {
                        byState: userStats.byState,
                        bySerie: userStats.bySerie,
                        recentActivity: {
                            last30Days: recentUsers.length,
                            growthRate: userStats.overview.totalUsers > 0 ? 
                                Math.round((recentUsers.length / userStats.overview.totalUsers) * 100) : 0
                        }
                    },
                    insights: [
                        `Total de ${userStats.overview.totalUsers} usuários cadastrados`,
                        `${userStats.overview.activeUsers} usuários ativos`,
                        `Pontuação média: ${userStats.overview.averageScore} pontos`,
                        `Estado com mais usuários: ${userStats.byState[0]?.estado || 'N/A'}`
                    ]
                };
                break;
            case 'questions':
                // Relatório de questões
                const questionStats = await Question.getStats();
                
                report = {
                    type: 'Relatório de Questões',
                    period: { startDate, endDate },
                    overview: questionStats.overview,
                    breakdown: {
                        bySubject: questionStats.bySubject,
                        byDifficulty: questionStats.byDifficulty,
                        performance: {
                            mostAnswered: questionStats.bySubject
                                .sort((a, b) => b.vezesRespondida - a.vezesRespondida)
                                .slice(0, 3),
                            highestAccuracy: questionStats.bySubject
                                .sort((a, b) => b.accuracy - a.accuracy)
                                .slice(0, 3)
                        }
                    },
                    insights: [
                        `Total de ${questionStats.overview.totalQuestions} questões`,
                        `${questionStats.overview.activeQuestions} questões ativas`,
                        `Taxa geral de acerto: ${questionStats.overview.overallAccuracy}%`,
                        `Matéria com mais questões: ${questionStats.bySubject[0]?.materia || 'N/A'}`
                    ]
                };
                break;
            case 'performance':
                // Relatório de performance da plataforma
                const platformStats = await User.getStats();
                const questionPerformance = await Question.getStats();
                
                report = {
                    type: 'Relatório de Performance da Plataforma',
                    period: { startDate, endDate },
                    metrics: {
                        engagement: {
                            totalExams: platformStats.overview.totalExams,
                            averageExamsPerUser: platformStats.overview.averageExams,
                            totalAnswers: questionPerformance.overview.totalAnswered,
                            overallAccuracy: questionPerformance.overview.overallAccuracy
                        },
                        growth: {
                            totalUsers: platformStats.overview.totalUsers,
                            activeUsers: platformStats.overview.activeUsers,
                            activityRate: platformStats.overview.totalUsers > 0 ? 
                                Math.round((platformStats.overview.activeUsers / platformStats.overview.totalUsers) * 100) : 0
                        },
                        content: {
                            totalQuestions: questionPerformance.overview.totalQuestions,
                            approvedQuestions: questionPerformance.overview.approvedQuestions,
                            approvalRate: questionPerformance.overview.totalQuestions > 0 ? 
                                Math.round((questionPerformance.overview.approvedQuestions / questionPerformance.overview.totalQuestions) * 100) : 0
                        }
                    },
                    recommendations: [
                        'Incentivar mais participação de usuários inativos',
                        'Criar mais questões para matérias com menor cobertura',
                        'Implementar sistema de gamificação para aumentar engajamento',
                        'Analisar questões com baixa taxa de acerto para melhorias'
                    ]
                };
                break;
            case 'engagement':
                // Relatório de engajamento
                const allUsers = await User.find({ ativo: true });
                const allQuestions = await Question.find({ ativa: true });
                
                // Calcular métricas de engajamento
                const activeThisWeek = await User.getActiveUsers(7);
                const totalSimulados = allUsers.reduce((sum, user) => sum + (user.simuladosRealizados || 0), 0);
                const usersWithSimulados = allUsers.filter(user => (user.simuladosRealizados || 0) > 0);
                
                report = {
                    type: 'Relatório de Engajamento',
                    period: { startDate, endDate },
                    engagement: {
                        weeklyActiveUsers: activeThisWeek.length,
                        totalSimulados,
                        usersWithActivity: usersWithSimulados.length,
                        activityRate: allUsers.length > 0 ? 
                            Math.round((usersWithSimulados.length / allUsers.length) * 100) : 0,
                        averageSimuladosPerActiveUser: usersWithSimulados.length > 0 ? 
                            Math.round(totalSimulados / usersWithSimulados.length) : 0
                    },
                    topPerformers: allUsers
                        .sort((a, b) => (b.pontuacaoTotal || 0) - (a.pontuacaoTotal || 0))
                        .slice(0, 10)
                        .map((user, index) => ({
                            posicao: index + 1,
                            nome: user.nome,
                            pontuacao: user.pontuacaoTotal || 0,
                            simulados: user.simuladosRealizados || 0
                        })),
                    insights: [
                        `${activeThisWeek.length} usuários ativos esta semana`,
                        `${usersWithSimulados.length} usuários já fizeram simulados`,
                        `Média de ${Math.round(totalSimulados / (usersWithSimulados.length || 1))} simulados por usuário ativo`,
                        `Taxa de engajamento: ${Math.round((usersWithSimulados.length / allUsers.length) * 100)}%`
                    ]
                };
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de relatório inválido',
                    availableTypes: ['users', 'questions', 'performance', 'engagement'],
                    examples: {
                        users: '/api/admin/reports?type=users',
                        questions: '/api/admin/reports?type=questions&startDate=2024-01-01',
                        performance: '/api/admin/reports?type=performance',
                        engagement: '/api/admin/reports?type=engagement'
                    }
                });
        }
        res.json({
            success: true,
            message: '📊 Relatório gerado com sucesso',
            report,
            metadata: {
                generatedAt: now,
                generatedBy: adminUser.nome,
                reportType: type,
                format,
                dataSource: 'Firebase Firestore',
                version: '2.0.0'
            }
        });

    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};
