/* ===================================
   DESAFIA BRASIL - AUTH MIDDLEWARE
   Middleware de autenticação JWT
   ================================== */

const jwt = require('jsonwebtoken');
const { database, collections } = require('../../config/database');

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token de acesso necessário',
                suggestion: 'Faça login para acessar este recurso'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'desafia_brasil_secret');
        
        // Buscar usuário no Firebase
        const user = await database.findById(collections.USERS, decoded.userId);
        if (!user || !user.ativo) {
            return res.status(403).json({
                success: false,
                message: 'Usuário não encontrado ou inativo',
                suggestion: 'Faça login novamente'
            });
        }

        // Adicionar dados do usuário na requisição
        req.userId = user.id;
        req.user = user;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                success: false,
                message: 'Token inválido',
                suggestion: 'Faça login novamente'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({
                success: false,
                message: 'Token expirado',
                suggestion: 'Faça login novamente'
            });
        }

        console.error('Erro na autenticação:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
};

// Middleware para verificar se é admin
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.tipo !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado - Apenas administradores',
            requiredRole: 'admin',
            userRole: req.user?.tipo || 'guest'
        });
    }
    next();
};

// Middleware para verificar se é professor ou admin
const requireTeacher = (req, res, next) => {
    if (!req.user || !['admin', 'professor'].includes(req.user.tipo)) {
        return res.status(403).json({
            success: false,
            message: 'Acesso negado - Apenas professores e administradores',
            requiredRole: ['admin', 'professor'],
            userRole: req.user?.tipo || 'guest'
        });
    }
    next();
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireTeacher
};
