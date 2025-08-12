/* ===================================
   DESAFIA BRASIL - AUTH CONTROLLER
   Versão adaptada para Firebase Firestore
   ================================== */

const { database, collections, FirestoreUtils } = require('../config/database');
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
        const existingUsers = await database.find(collections.USERS, { email: email.toLowerCase() });
        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email já está cadastrado',
                suggestion: 'Tente fazer login ou use outro email'
            });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(senha, 12);

        // Criar novo usuário
        const userData = {
            nome,
            email: email.toLowerCase(),
            senha: hashedPassword,
            escola: escola || '',
            serie: serie || '3º EM',
            cidade: cidade || '',
            estado: estado || '',
            pontuacaoTotal: 0,
            simuladosRealizados: 0,
            medalhas: [],
            materiasFavoritas: [],
            nivelDificuldade: 'Médio',
            ativo: true,
            emailVerificado: false,
            tipo: 'estudante',
            ultimoLogin: FirestoreUtils.dateToTimestamp(new Date())
        };

        const newUser = await database.create(collections.USERS, userData);

        if (!newUser) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao criar usuário'
            });
        }

        // Gerar token
        const token = generateToken(newUser.id);

        res.status(201).json({
            success: true,
            message: '🎓 Bem-vindo ao Desafia Brasil!',
            user: {
                id: newUser.id,
                nome: newUser.nome,
                email: newUser.email,
                escola: newUser.escola,
                serie: newUser.serie,
                cidade: newUser.cidade,
                estado: newUser.estado,
                pontuacaoTotal: newUser.pontuacaoTotal,
                simuladosRealizados: newUser.simuladosRealizados
            },
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
        const users = await database.find(collections.USERS, { email: email.toLowerCase() });
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email não encontrado',
                suggestion: 'Verifique o email ou faça seu cadastro'
            });
        }

        const user = users[0];

        // Verificar senha
        const isPasswordValid = await bcrypt.compare(senha, user.senha);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Senha incorreta',
                suggestion: 'Verifique sua senha ou use "Esqueci minha senha"'
            });
        }

        // Atualizar último login
        await database.update(collections.USERS, user.id, {
            ultimoLogin: FirestoreUtils.dateToTimestamp(new Date())
        });

        // Gerar token
        const token = generateToken(user.id);

        // Buscar estatísticas rápidas
        const totalQuestions = await database.count(collections.QUESTIONS, { ativa: true });

        res.json({
            success: true,
            message: `🎉 Bem-vindo de volta, ${user.nome}!`,
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                escola: user.escola,
                serie: user.serie,
                cidade: user.cidade,
                estado: user.estado,
                pontuacaoTotal: user.pontuacaoTotal,
                simuladosRealizados: user.simuladosRealizados
            },
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

// 3. OBTER PERFIL DO USUÁRIO
const getUserProfile = async (req, res) => {
    try {
        const user = await database.findById(collections.USERS, req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        // Calcular posição no ranking
        const allUsers = await database.find(collections.USERS, { ativo: true }, {
            orderBy: { field: 'pontuacaoTotal', direction: 'desc' }
        });
        
        const posicaoRanking = allUsers.findIndex(u => u.id === user.id) + 1;
        const totalUsers = allUsers.length;

        // Estatísticas completas
        const totalQuestions = await database.count(collections.QUESTIONS, { ativa: true });

        res.json({
            success: true,
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                escola: user.escola,
                serie: user.serie,
                cidade: user.cidade,
                estado: user.estado,
                pontuacaoTotal: user.pontuacaoTotal,
                simuladosRealizados: user.simuladosRealizados,
                medalhas: user.medalhas || [],
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
                    mediaGeral: user.simuladosRealizados > 0 ? 
                        Math.round(user.pontuacaoTotal / user.simuladosRealizados) : 0,
                    medalhas: user.medalhas || []
                },
                plataforma: {
                    questoesDisponiveis: totalQuestions,
                    estudantesAtivos: totalUsers
                }
            }
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

module.exports = {
    registerUser,
    loginUser,
    getUserProfile
};
