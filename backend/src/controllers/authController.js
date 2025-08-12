/* ===================================
   DESAFIA BRASIL - AUTH CONTROLLER
   Sistema de autenticação completo
   ================================== */

const { database } = require('../../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Configurações JWT
const JWT_SECRET = process.env.JWT_SECRET || 'desafia_brasil_secret_2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Gerar JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
};

// Validar email
const isValidEmail = (email) => {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
};
// 1. REGISTRO DE NOVO USUÁRIO
const registerUser = async (req, res) => {
    try {
        const { nome, email, senha, escola, serie, cidade, estado } = req.body;

        // Validações básicas
        if (!nome || !email || !senha) {
            return res.status(400).json({
                success: false,
                message: 'Nome, email e senha são obrigatórios',
                missingFields: {
                    nome: !nome ? 'obrigatório' : 'ok',
                    email: !email ? 'obrigatório' : 'ok',
                    senha: !senha ? 'obrigatório' : 'ok'
                }
            });
        }

        // Validar formato do email
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email inválido',
                suggestion: 'Use um formato válido como: usuario@email.com'
            });
        }

        // Validar tamanho da senha
        if (senha.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Senha deve ter pelo menos 6 caracteres',
                currentLength: senha.length,
                requiredLength: 6
            });
        }

        // Verificar se email já existe
        const existingUsers = await database.find('users', { 
            email: email.toLowerCase() 
        });

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email já está cadastrado no Desafia Brasil',
                suggestion: 'Tente fazer login ou use outro email',
                actions: {
                    login: 'POST /api/auth/login',
                    forgotPassword: 'POST /api/auth/forgot-password'
                }
            });
        }

        // Hash da senha
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(senha, saltRounds);

        // Dados do novo usuário
        const userData = {
            nome: nome.trim(),
            email: email.toLowerCase().trim(),
            senha: hashedPassword,
            escola: escola?.trim() || '',
            serie: serie || '3º EM',
            cidade: cidade?.trim() || '',
            estado: estado?.toUpperCase() || '',
            pontuacaoTotal: 0,
            simuladosRealizados: 0,
            medalhas: [],
            materiasFavoritas: [],
            nivelDificuldade: 'Médio',
            ativo: true,
            emailVerificado: false,
            tipo: 'estudante',
            avatar: null,
            ultimoLogin: new Date()
        };

        // Criar usuário no Firebase
        const newUser = await database.create('users', userData);

        if (!newUser) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao criar usuário',
                suggestion: 'Tente novamente em alguns instantes'
            });
        }

        // Gerar token JWT
        const token = generateToken(newUser.id);

        // Resposta de sucesso
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
                tipo: newUser.tipo,
                pontuacaoTotal: newUser.pontuacaoTotal,
                simuladosRealizados: newUser.simuladosRealizados,
                medalhas: newUser.medalhas
            },
            token,
            tokenInfo: {
                type: 'Bearer',
                expiresIn: JWT_EXPIRES_IN,
                usage: 'Authorization: Bearer <token>'
            }
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
        });
    }
};
// 2. LOGIN DO USUÁRIO
const loginUser = async (req, res) => {
    try {
        const { email, senha } = req.body;

        // Validações básicas
        if (!email || !senha) {
            return res.status(400).json({
                success: false,
                message: 'Email e senha são obrigatórios',
                missingFields: {
                    email: !email ? 'obrigatório' : 'ok',
                    senha: !senha ? 'obrigatório' : 'ok'
                }
            });
        }

        // Buscar usuário por email
        const users = await database.find('users', { 
            email: email.toLowerCase().trim() 
        });

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email não encontrado',
                suggestion: 'Verifique o email ou faça seu cadastro',
                actions: {
                    register: 'POST /api/auth/register'
                }
            });
        }

        const user = users[0];

        // Verificar se usuário está ativo
        if (!user.ativo) {
            return res.status(403).json({
                success: false,
                message: 'Conta bloqueada ou desativada',
                suggestion: 'Entre em contato com o suporte'
            });
        }

        // Verificar senha
        const senhaValida = await bcrypt.compare(senha, user.senha);
        if (!senhaValida) {
            return res.status(401).json({
                success: false,
                message: 'Senha incorreta',
                suggestion: 'Verifique sua senha ou use "Esqueci minha senha"'
            });
        }

        // Atualizar último login
        await database.update('users', user.id, {
            ultimoLogin: new Date()
        });

        // Gerar token
        const token = generateToken(user.id);

        // Resposta de sucesso
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
                tipo: user.tipo,
                pontuacaoTotal: user.pontuacaoTotal || 0,
                simuladosRealizados: user.simuladosRealizados || 0,
                medalhas: user.medalhas || []
            },
            token
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
        });
    }
};
 // 3. OBTER PERFIL DO USUÁRIO
const getUserProfile = async (req, res) => {
    try {
        // Buscar usuário por ID
        const user = await database.findById('users', req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado',
                suggestion: 'Faça login novamente'
            });
        }

        // Calcular estatísticas
        const allUsers = await database.find('users', { ativo: true });
        const usersRanked = allUsers.sort((a, b) => (b.pontuacaoTotal || 0) - (a.pontuacaoTotal || 0));
        const posicaoRanking = usersRanked.findIndex(u => u.id === user.id) + 1;

        res.json({
            success: true,
            message: '👤 Perfil carregado com sucesso',
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                escola: user.escola,
                serie: user.serie,
                cidade: user.cidade,
                estado: user.estado,
                pontuacaoTotal: user.pontuacaoTotal || 0,
                simuladosRealizados: user.simuladosRealizados || 0,
                medalhas: user.medalhas || [],
                posicaoRanking
            }
        });

    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
        });
    }
};
module.exports = {
    registerUser,
    loginUser,
    getUserProfile
};
