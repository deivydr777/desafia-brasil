/* ===================================
   DESAFIA BRASIL - ADMIN CONTROLLER
   Sistema completo de administração
   ================================== */

const Question = require('../models/Question');
const User = require('../models/User');

// 1. DASHBOARD ADMINISTRATIVO COMPLETO
const getAdminDashboard = async (req, res) => {
    try {
        // Verificar se é admin
        const adminUser = await User.findById(req.userId);
        if (!adminUser || adminUser.tipo !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado - Apenas administradores'
            });
        }

        // Estatísticas gerais da plataforma
        const totalUsers = await User.countDocuments();
        const totalQuestions = await Question.countDocuments();
        const activeUsers = await User.countDocuments({ 
            ultimoLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        });
        const pendingQuestions = await Question.countDocuments({ aprovada: false });

        // Usuários por estado (top 10)
        const usersByState = await User.aggregate([
            { $match: { ativo: true, estado: { $exists: true, $ne: null } } },
            { $group: { _id: '$estado', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Questões por matéria
        const questionsBySubject = await Question.aggregate([
            { $match: { ativa: true } },
            { $group: { _id: '$materia', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Questões por dificuldade
        const questionsByDifficulty = await Question.aggregate([
            { $match: { ativa: true } },
            { $group: { _id: '$dificuldade', count: { $sum: 1 } } }
        ]);

        // Top 10 estudantes
        const topStudents = await User.find({ ativo: true })
            .sort({ pontuacaoTotal: -1 })
            .limit(10)
            .select('nome email escola pontuacaoTotal simuladosRealizados criadoEm');

        // Usuários recentes (últimos 7 dias)
        const recentUsers = await User.find({
            criadoEm: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }).countDocuments();

        // Questões mais respondidas
        const popularQuestions = await Question.find({ ativa: true })
            .sort({ vezesRespondida: -1 })
            .limit(5)
            .select('codigo titulo materia vezesRespondida percentualAcerto');

        res.json({
            success: true,
            message: '📊 Dashboard administrativo do Desafia Brasil',
            dashboard: {
                overview: {
                    totalUsers,
                    totalQuestions,
                    activeUsers,
                    pendingQuestions,
                    recentUsers,
                    growthRate: totalUsers > 0 ? Math.round((recentUsers / totalUsers) * 100) : 0
                },
                distribution: {
                    usersByState: usersByState.map(item => ({
                        estado: item._id,
                        usuarios: item.count
                    })),
                    questionsBySubject: questionsBySubject.map(item => ({
                        materia: item._id,
                        questoes: item.count
                    })),
                    questionsByDifficulty: questionsByDifficulty.map(item => ({
                        dificuldade: item._id,
                        questoes: item.count
                    }))
                },
                topPerformers: topStudents.map((user, index) => ({
                    posicao: index + 1,
                    nome: user.nome,
                    email: user.email,
                    escola: user.escola,
                    pontuacao: user.pontuacaoTotal,
                    simulados: user.simuladosRealizados,
                    membro_desde: user.criadoEm
                })),
                popularContent: popularQuestions.map(q => ({
                    codigo: q.codigo,
                    titulo: q.titulo,
                    materia: q.materia,
                    vezesRespondida: q.vezesRespondida,
                    percentualAcerto: q.percentualAcerto
                }))
            }
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
        const { page = 1, limit = 20, search, estado, serie } = req.query;

        // Verificar permissão de admin
        const adminUser = await User.findById(req.userId);
        if (!adminUser || adminUser.tipo !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado - Apenas administradores'
            });
        }

        // Construir filtros
        const filters = {};
        if (search) {
            filters.$or = [
                { nome: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { escola: { $regex: search, $options: 'i' } }
            ];
        }
        if (estado) filters.estado = estado;
        if (serie) filters.serie = serie;

        // Ações específicas
        if (action) {
            switch (action) {
                case 'block':
                    await User.findByIdAndUpdate(userId, { ativo: false });
                    return res.json({
                        success: true,
                        message: '🚫 Usuário bloqueado com sucesso'
                    });

                case 'unblock':
                    await User.findByIdAndUpdate(userId, { ativo: true });
                    return res.json({
                        success: true,
                        message: '✅ Usuário desbloqueado com sucesso'
                    });

                case 'promote':
                    await User.findByIdAndUpdate(userId, { tipo: 'professor' });
                    return res.json({
                        success: true,
                        message: '⬆️ Usuário promovido a professor'
                    });

                case 'update':
                    await User.findByIdAndUpdate(userId, userData);
                    return res.json({
                        success: true,
                        message: '✏️ Usuário atualizado com sucesso'
                    });

                case 'delete':
                    await User.findByIdAndDelete(userId);
                    return res.json({
                        success: true,
                        message: '🗑️ Usuário removido com sucesso'
                    });
            }
        }

        // Listar usuários com paginação
        const users = await User.find(filters)
            .sort({ criadoEm: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('nome email escola serie cidade estado pontuacaoTotal simuladosRealizados ativo tipo ultimoLogin criadoEm');

        const totalUsers = await User.countDocuments(filters);

        res.json({
            success: true,
            users: users.map(user => ({
                id: user._id,
                nome: user.nome,
                email: user.email,
                escola: user.escola,
                serie: user.serie,
                localizacao: `${user.cidade || 'N/A'}, ${user.estado || 'N/A'}`,
                pontuacao: user.pontuacaoTotal,
                simulados: user.simuladosRealizados,
                status: user.ativo ? 'Ativo' : 'Bloqueado',
                tipo: user.tipo,
                ultimoLogin: user.ultimoLogin,
                membro_desde: user.criadoEm
            })),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalUsers / limit),
                totalUsers,
                hasNext: page * limit < totalUsers,
                hasPrevious: page > 1
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
        const { page = 1, limit = 20, search, materia, dificuldade, aprovada } = req.query;

        // Verificar permissão de admin
        const adminUser = await User.findById(req.userId);
        if (!adminUser || adminUser.tipo !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado - Apenas administradores'
            });
        }

        // Construir filtros
        const filters = {};
        if (search) {
            filters.$or = [
                { titulo: { $regex: search, $options: 'i' } },
                { codigo: { $regex: search, $options: 'i' } },
                { enunciado: { $regex: search, $options: 'i' } }
            ];
        }
        if (materia) filters.materia = materia;
        if (dificuldade) filters.dificuldade = dificuldade;
        if (aprovada !== undefined) filters.aprovada = aprovada === 'true';

        // Ações específicas
        if (action) {
            switch (action) {
                case 'approve':
                    await Question.findByIdAndUpdate(questionId, { aprovada: true });
                    return res.json({
                        success: true,
                        message: '✅ Questão aprovada com sucesso'
                    });

                case 'reject':
                    await Question.findByIdAndUpdate(questionId, { aprovada: false, ativa: false });
                    return res.json({
                        success: true,
                        message: '❌ Questão rejeitada'
                    });

                case 'activate':
                    await Question.findByIdAndUpdate(questionId, { ativa: true });
                    return res.json({
                        success: true,
                        message: '🔄 Questão ativada'
                    });

                case 'deactivate':
                    await Question.findByIdAndUpdate(questionId, { ativa: false });
                    return res.json({
                        success: true,
                        message: '⏸️ Questão desativada'
                    });

                case 'update':
                    await Question.findByIdAndUpdate(questionId, questionData);
                    return res.json({
                        success: true,
                        message: '✏️ Questão atualizada com sucesso'
                    });

                case 'delete':
                    await Question.findByIdAndDelete(questionId);
                    return res.json({
                        success: true,
                        message: '🗑️ Questão removida com sucesso'
                    });
            }
        }

        // Listar questões com paginação
        const questions = await Question.find(filters)
            .sort({ criadoEm: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('criadaPor', 'nome email')
            .select('codigo titulo materia dificuldade fonte aprovada ativa vezesRespondida percentualAcerto criadoEm criadaPor');

        const totalQuestions = await Question.countDocuments(filters);

        res.json({
            success: true,
            questions: questions.map(q => ({
                id: q._id,
                codigo: q.codigo,
                titulo: q.titulo,
                materia: q.materia,
                dificuldade: q.dificuldade,
                fonte: q.fonte ? `${q.fonte.vestibular} ${q.fonte.ano}` : 'N/A',
                status: q.ativa ? (q.aprovada ? 'Ativa' : 'Pendente') : 'Inativa',
                aprovada: q.aprovada,
                estatisticas: {
                    vezesRespondida: q.vezesRespondida,
                    percentualAcerto: q.percentualAcerto
                },
                autor: q.criadaPor ? q.criadaPor.nome : 'Sistema',
                criadaEm: q.criadoEm
            })),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalQuestions / limit),
                totalQuestions,
                hasNext: page * limit < totalQuestions,
                hasPrevious: page > 1
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

        // Gerar código único
        const codigoBase = materia.substring(0, 3).toUpperCase();
        const ultimoCodigo = await Question.findOne({
            codigo: { $regex: `^${codigoBase}` }
        }).sort({ codigo: -1 });

        let numeroCodigo = 1;
        if (ultimoCodigo) {
            const numero = parseInt(ultimoCodigo.codigo.replace(codigoBase, ''));
            numeroCodigo = numero + 1;
        }

        const codigo = `${codigoBase}${numeroCodigo.toString().padStart(4, '0')}`;

        // Criar questão
        const novaQuestao = new Question({
            codigo,
            titulo,
            enunciado,
            alternativas,
            respostaCorreta,
            materia,
            assunto,
            dificuldade,
            fonte,
            explicacao,
            tags: tags || [],
            criadaPor: req.userId,
            aprovada: adminUser.tipo === 'admin', // Admin aprova automaticamente
            ativa: adminUser.tipo === 'admin'
        });

        await novaQuestao.save();

        res.status(201).json({
            success: true,
            message: '🎯 Questão criada com sucesso!',
            question: {
                id: novaQuestao._id,
                codigo: novaQuestao.codigo,
                titulo: novaQuestao.titulo,
                materia: novaQuestao.materia,
                dificuldade: novaQuestao.dificuldade,
                status: novaQuestao.aprovada ? 'Aprovada' : 'Pendente aprovação'
            }
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
        const { type, startDate, endDate } = req.query;

        // Verificar permissão de admin
        const adminUser = await User.findById(req.userId);
        if (!adminUser || adminUser.tipo !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado - Apenas administradores'
            });
        }

        // Filtros de data
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        let report = {};

        switch (type) {
            case 'users':
                // Relatório de usuários
                const userStats = await User.aggregate([
                    { $match: dateFilter.criadoEm ? { criadoEm: dateFilter } : {} },
                    {
                        $group: {
                            _id: null,
                            totalUsers: { $sum: 1 },
                            activeUsers: { $sum: { $cond: ['$ativo', 1, 0] } },
                            avgScore: { $avg: '$pontuacaoTotal' },
                            totalExams: { $sum: '$simuladosRealizados' }
                        }
                    }
                ]);

                const usersByState = await User.aggregate([
                    { $match: { ativo: true } },
                    { $group: { _id: '$estado', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]);

                report = {
                    type: 'Relatório de Usuários',
                    period: { startDate, endDate },
                    stats: userStats[0] || {},
                    distribution: usersByState
                };
                break;

            case 'questions':
                // Relatório de questões
                const questionStats = await Question.aggregate([
                    { $match: dateFilter.criadoEm ? { criadoEm: dateFilter } : {} },
                    {
                        $group: {
                            _id: null,
                            totalQuestions: { $sum: 1 },
                            activeQuestions: { $sum: { $cond: ['$ativa', 1, 0] } },
                            approvedQuestions: { $sum: { $cond: ['$aprovada', 1, 0] } },
                            avgAccuracy: { $avg: '$percentualAcerto' },
                            totalAnswered: { $sum: '$vezesRespondida' }
                        }
                    }
                ]);

                const questionsBySubject = await Question.aggregate([
                    { $match: { ativa: true } },
                    { $group: { _id: '$materia', count: { $sum: 1 }, avgAccuracy: { $avg: '$percentualAcerto' } } },
                    { $sort: { count: -1 } }
                ]);

                report = {
                    type: 'Relatório de Questões',
                    period: { startDate, endDate },
                    stats: questionStats[0] || {},
                    distribution: questionsBySubject
                };
                break;

            case 'performance':
                // Relatório de performance da plataforma
                const performanceData = await User.aggregate([
                    {
                        $group: {
                            _id: '$serie',
                            count: { $sum: 1 },
                            avgScore: { $avg: '$pontuacaoTotal' },
                            avgExams: { $avg: '$simuladosRealizados' }
                        }
                    },
                    { $sort: { avgScore: -1 } }
                ]);

                report = {
                    type: 'Relatório de Performance',
                    period: { startDate, endDate },
                    performanceByGrade: performanceData,
                    summary: {
                        message: 'Análise de performance por série escolar',
                        insights: [
                            'Identifica as séries com melhor desempenho',
                            'Mostra engajamento por nível educacional',
                            'Ajuda a personalizar conteúdo por série'
                        ]
                    }
                };
                br