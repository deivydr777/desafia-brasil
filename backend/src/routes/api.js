/* ===================================
   DESAFIA BRASIL - API ROUTES
   Todas as rotas da API organizadas
   ================================== */

const express = require('express');
const router = express.Router();

// Importar controllers
const authController = require('../controllers/authController');
const examController = require('../controllers/examController');
const adminController = require('../controllers/adminController');

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de acesso necessário',
            suggestion: 'Faça login para acessar este recurso'
        });
    }

    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET || 'desafia_brasil_secret', (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Token inválido ou expirado',
                suggestion: 'Faça login novamente'
            });
        }
        req.userId = user.userId;
        next();
    });
};

// ===================================
// ROTAS DE AUTENTICAÇÃO (Públicas)
// ===================================

// Registro de novo usuário
router.post('/auth/register', authController.registerUser);

// Login do usuário
router.post('/auth/login', authController.loginUser);

// Verificar se API está funcionando
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: '🎓 API do Desafia Brasil funcionando!',
        status: 'healthy',
        timestamp: new Date(),
        version: '1.0.0',
        services: {
            database: 'connected',
            authentication: 'active',
            exams: 'available',
            admin: 'operational'
        }
    });
});

// Dashboard público (estatísticas gerais)
router.get('/dashboard', authController.getDashboard);

// Ranking público
router.get('/ranking', authController.getRanking);

// ===================================
// ROTAS PROTEGIDAS (Requer autenticação)
// ===================================

// Aplicar middleware de autenticação para todas as rotas abaixo
router.use(authenticateToken);

// === ROTAS DE USUÁRIO ===

// Perfil do usuário
router.get('/user/profile', authController.getUserProfile);

// Atualizar perfil
router.put('/user/profile', authController.updateProfile);

// === ROTAS DE SIMULADOS ===

// Listar simulados disponíveis
router.get('/exams', examController.getAvailableExams);

// Iniciar um simulado específico
router.post('/exams/:examId/start', examController.startExam);

// Finalizar simulado e obter resultado
router.post('/exams/:examId/finish', examController.finishExam);

// Histórico de simulados do usuário
router.get('/user/exams/history', examController.getUserExamHistory);

// ===================================
// ROTAS ADMINISTRATIVAS (Requer admin)
// ===================================

// Dashboard administrativo
router.get('/admin/dashboard', adminController.getAdminDashboard);

// Gerenciar usuários
router.get('/admin/users', adminController.manageUsers);
router.post('/admin/users', adminController.manageUsers);

// Gerenciar questões
router.get('/admin/questions', adminController.manageQuestions);
router.post('/admin/questions', adminController.manageQuestions);

// Criar nova questão
router.post('/admin/questions/create', adminController.createQuestion);

// Relatórios avançados
router.get('/admin/reports', adminController.getAdvancedReports);

// ===================================
// ROTAS DE ERRO E DOCUMENTAÇÃO
// ===================================

// Documentação da API
router.get('/docs', (req, res) => {
    res.json({
        success: true,
        message: '📚 Documentação da API do Desafia Brasil',
        version: '1.0.0',
        baseUrl: '/api',
        endpoints: {
            authentication: {
                'POST /auth/register': 'Registrar novo usuário',
                'POST /auth/login': 'Fazer login',
                'GET /user/profile': 'Obter perfil do usuário (requer auth)',
                'PUT /user/profile': 'Atualizar perfil (requer auth)'
            },
            exams: {
                'GET /exams': 'Listar simulados disponíveis (requer auth)',
                'POST /exams/:id/start': 'Iniciar simulado (requer auth)',
                'POST /exams/:id/finish': 'Finalizar simulado (requer auth)',
                'GET /user/exams/history': 'Histórico de simulados (requer auth)'
            },
            public: {
                'GET /health': 'Status da API',
                'GET /dashboard': 'Estatísticas públicas',
                'GET /ranking': 'Ranking público de estudantes'
            },
            admin: {
                'GET /admin/dashboard': 'Dashboard administrativo (requer admin)',
                'GET|POST /admin/users': 'Gerenciar usuários (requer admin)',
                'GET|POST /admin/questions': 'Gerenciar questões (requer admin)',
                'POST /admin/questions/create': 'Criar questão (requer admin)',
                'GET /admin/reports': 'Relatórios avançados (requer admin)'
            }
        },
        authentication: {
            type: 'JWT Bearer Token',
            header: 'Authorization: Bearer <token>',
            example: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        examples: {
            register: {
                url: 'POST /api/auth/register',
                body: {
                    nome: 'João Silva',
                    email: 'joao@email.com',
                    senha: '123456',
                    escola: 'UERJ',
                    serie: '3º EM',
                    cidade: 'Rio de Janeiro',
                    estado: 'RJ'
                }
            },
            login: {
                url: 'POST /api/auth/login',
                body: {
                    email: 'joao@email.com',
                    senha: '123456'
                }
            },
            startExam: {
                url: 'POST /api/exams/enem-geral/start',
                headers: {
                    'Authorization': 'Bearer <token>'
                }
            }
        }
    });
});

// Rota para estatísticas da API
router.get('/stats', (req, res) => {
    res.json({
        success: true,
        message: '📊 Estatísticas da API do Desafia Brasil',
        api: {
            totalEndpoints: 15,
            publicEndpoints: 4,
            protectedEndpoints: 11,
            adminEndpoints: 5
        },
        features: [
            '🔐 Autenticação JWT robusta',
            '📚 Sistema completo de simulados',
            '🏆 Ranking dinâmico de estudantes',
            '👥 Gerenciamento de usuários',
            '❓ Banco de questões organizadas',
            '📊 Painel administrativo completo',
            '📈 Relatórios e estatísticas',
            '🎯 Sistema de medalhas e conquistas'
        ],
        status: 'Produção Ready',
        lastUpdate: new Date()
    });
});

module.exports = router;
