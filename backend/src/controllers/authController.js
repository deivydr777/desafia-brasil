/* ===================================
   DESAFIA BRASIL - AUTH CONTROLLER
   Sistema completo de autenticação e usuários
   ================================== */

const User = require('../models/User');
const Question = require('../models/Question');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Gerar JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'desafia_brasil_secret', {
        expiresIn: '7d'
    });
};

// 1. REGISTRO DE NOVO USUÁRIO
const registerUser = async (req, res) => {
    try {
        const { nome, email, senha, escola, serie, cidade, estado } = req.body;

        // Verificar se usuário já existe
        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'Email já está cadastrado',
                suggestion: 'Tente fazer login ou use outro email'
            });
        }

        // Criar novo usuário
        const newUser = new User({
            nome,
            email: email.toLowerCase(),
            senha,
            escola,
            serie,
            cidade,
            estado
        });

        await newUser.save();

        // Gerar token
        const token = generateToken(newUser._id);

        res.status(201).json({
            success: true,
            message: '🎓 Bem-vindo ao Desafia Brasil!',
            user: newUser.dadosPublicos(),
            token,
            onboarding: {
                nextStep: 'Faça seu primeiro simulado',
                suggestedExam: 'ENEM Básico - 20 questões'
            }
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// 2. LOGIN DO USUÁRIO
const loginUser = async (req, res) => {
    try {
        const { email, senha } = req.body;

        // Buscar usuário
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email não encontrado',
                suggestion: 'Verifique o email ou faça seu cadastro'
            });
        }

        // Verificar senha
        const isPasswordValid = await user.verificarSenha(senha);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Senha incorreta',
                suggestion: 'Verifique sua senha ou use "Esqueci minha senha"'
            });
        }

        // Atualizar último login
        user.ultimoLogin = new Date();
        await user.save();

        // Gerar token
        const token = generateToken(user._id);

        // Buscar estatísticas rápidas
        const totalQuestions = await Question.countDocuments({ ativa: true });

        res.json({
            success: true,
            message: `🎉 Bem-vindo de volta, ${user.nome}!`,
            user: user.dadosPublicos(),
            token,
            stats: {
                simuladosRealizados: user.simuladosRealizados,
                pontuacaoTotal: user.pontuacaoTotal,
                questoesDisponiveis: totalQuestions,
                proximoObjetivo: user.simuladosRealizados < 5 ? 'Complete 5 simulados' : 'Manter boa performance'
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// 3. PERFIL DO USUÁRIO
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Calcular posição no ranking
        const usuariosComMaiorPontuacao = await User.countDocuments({
            pontuacaoTotal: { $gt: user.pontuacaoTotal }
        });
        const posicaoRanking = usuariosComMaiorPontuacao + 1;

        // Estatísticas completas
        const totalUsers = await User.countDocuments();
        const totalQuestions = await Question.countDocuments({ ativa: true });

        res.json({
            success: true,
            user: {
                ...user.dadosPublicos(),
                posicaoRanking,
                percentilRanking: Math.round(((totalUsers - posicaoRanking) / totalUsers) * 100)
            },
            statistics: {
                ranking: {
                    posicao: posicaoRanking,
                    total: totalUsers,
                    percentil: Math.round(((totalUsers - posicaoRanking) / totalUsers) * 100)
                },
                performance: {
                    simuladosRealizados: user.simuladosRealizados,
                    pontuacaoTotal: user.pontuacaoTotal,
                    mediaGeral: user.mediaAcertos,
                    medalhas: user.medalhas
                },
                plataforma: {
                    questoesDisponiveis: totalQuestions,
                    estudantesAtivos: totalUsers
                }
            },
            achievements: user.medalhas.length > 0 ? user.medalhas : [
                { nome: 'Primeira questão', descricao: 'Complete seu primeiro simulado para conquistar!' }
            ]
        });

    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// 4. ATUALIZAR PERFIL
const updateProfile = async (req, res) => {
    try {
        const { nome, escola, serie, cidade, estado, materiasFavoritas, nivelDificuldade } = req.body;
        
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Atualizar campos
        if (nome) user.nome = nome;
        if (escola) user.escola = escola;
        if (serie) user.serie = serie;
        if (cidade) user.cidade = cidade;
        if (estado) user.estado = estado;
        if (materiasFavoritas) user.materiasFavoritas = materiasFavoritas;
        if (nivelDificuldade) user.nivelDificuldade = nivelDificuldade;

        await user.save();

        res.json({
            success: true,
            message: '✅ Perfil atualizado com sucesso!',
            user: user.dadosPublicos()
        });

    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// 5. RANKING GERAL
const getRanking = async (req, res) => {
    try {
        const { page = 1, limit = 50, estado, serie } = req.query;
        
        // Construir filtros
        const filters = { ativo: true };
        if (estado) filters.estado = estado;
        if (serie) filters.serie = serie;

        // Buscar usuários ordenados por pontuação
        const usuarios = await User.find(filters)
            .sort({ pontuacaoTotal: -1, simuladosRealizados: -1, criadoEm: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('nome escola serie cidade estado pontuacaoTotal simuladosRealizados medalhas criadoEm');

        // Adicionar posições
        const rankingComPosicoes = usuarios.map((user, index) => ({
            posicao: ((page - 1) * limit) + index + 1,
            ...user.toObject(),
            mediaGeral: user.simuladosRealizados > 0 ? 
                Math.round((user.pontuacaoTotal / user.simuladosRealizados) * 100) / 100 : 0
        }));

        // Estatísticas do ranking
        const totalUsers = await User.countDocuments(filters);
        const stats = await User.aggregate([
            { $match: filters },
            {
                $group: {
                    _id: null,
                    mediaPontuacao: { $avg: '$pontuacaoTotal' },
                    maiorPontuacao: { $max: '$pontuacaoTotal' },
                    totalSimulados: { $sum: '$simuladosRealizados' }
                }
            }
        ]);

        res.json({
            success: true,
            ranking: rankingComPosicoes,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalUsers / limit),
                totalUsers,
                hasNext: page * limit < totalUsers,
                hasPrevious: page > 1
            },
            statistics: stats[0] || {
                mediaPontuacao: 0,
                maiorPontuacao: 0,
                totalSimulados: 0
            },
            filters: {
                estado: estado || 'Todos',
                serie: serie || 'Todas'
            }
        });

    } catch (error) {
        console.error('Erro ao buscar ranking:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

// 6. DASHBOARD - ESTATÍSTICAS GERAIS
const getDashboard = async (req, res) => {
    try {
        // Estatísticas da plataforma
        const totalUsers = await User.countDocuments();
        const totalQuestions = await Question.countDocuments({ ativa: true });
        const activeUsers = await User.countDocuments({ 
            ultimoLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
        });

        // Top 10 no ranking
        const top10 = await User.find({ ativo: true })
            .sort({ pontuacaoTotal: -1 })
            .limit(10)
            .select('nome escola estado pontuacaoTotal simuladosRealizados');

        // Distribuição por estados (top 5)
        const estadosStats = await User.aggregate([
            { $match: { ativo: true, estado: { $exists: true, $ne: null } } },
            { $group: { _id: '$estado', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // Questões por matéria
        const questoesPorMateria = await Question.aggregate([
            { $match: { ativa: true } },
            { $group: { _id: '$materia', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            dashboard: {
                platform: {
                    totalUsers,
                    activeUsers,
                    totalQuestions,
                    growthRate: '15% este mês' // Pode ser calculado dinamicamente
                },
                ranking: {
                    top10: top10.map((user, index) => ({
                        posicao: index + 1,
                        nome: user.nome,
                        escola: user.escola,
                        estado: user.estado,
                        pontuacao: user.pontuacaoTotal,
                        simulados: user.simuladosRealizados
                    }))
                },
                distribution: {
                    estados: estadosStats,
                    materias: questoesPorMateria
                },
                activity: {
                    usuariosAtivos7dias: activeUsers,
                    percentualAtividade: Math.round((activeUsers / totalUsers) * 100)
                }
            }
        });

    } catch (error) {
        console.error('Erro ao buscar dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateProfile,
    getRanking,
    getDashboard
};
