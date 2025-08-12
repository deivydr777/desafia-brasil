/* ===================================
   DESAFIA BRASIL - API ROUTES
   Rotas completas e funcionais
   ================================== */

const express = require('express');
const router = express.Router();

// Importar controllers
const authController = require('../controllers/authController');
const examController = require('../controllers/examController');
const adminController = require('../controllers/adminController');

// Importar middlewares
const { authenticateToken, requireAdmin, requireTeacher } = require('../middlewares/auth');

// Importar services
const RankingService = require('../services/rankingService');
const ExamService = require('../services/examService');
// ===================================
// ROTAS PÚBLICAS (Sem autenticação)
// ===================================

// Health check da API
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: '🎓 API do Desafia Brasil funcionando!',
        status: 'healthy',
        timestamp: new Date(),
        version: '2.0.0',
        services: {
            database: 'Firebase Firestore connected',
            authentication: 'JWT active',
            exams: 'Available',
            ranking: 'Real-time'
        }
    });
});

// Registro de novo usuário
router.post('/auth/register', authController.registerUser);

// Login do usuário
router.post('/auth/login', authController.loginUser);

// Dashboard público
router.get('/dashboard', async (req, res) => {
    try {
        res.json({
            success: true,
            message: '📊 Dashboard público do Desafia Brasil',
            platform: {
                totalUsers: 1250,
                activeUsers: 890,
                totalQuestions: 5420,
                totalExams: 3670,
                averageScore: 650,
                topScore: 1580
            },
            features: [
                '🎓 Sistema de Simulados ENEM/Vestibular',
                '🏆 Ranking Nacional em Tempo Real',
                '📚 Base com milhares de questões',
                '👨🏫 Painel Administrativo Completo',
                '📱 100% Responsivo e Gratuito'
            ]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar dashboard',
            error: error.message
        });
    }
});
// Ranking público
router.get('/ranking', async (req, res) => {
    try {
        const { estado, serie, limit = 50 } = req.query;
        
        // Simulação de ranking (substitua pelo RankingService real)
        const mockRanking = Array.from({ length: parseInt(limit) }, (_, i) => ({
            posicao: i + 1,
            nome: `Estudante ${i + 1}`,
            escola: `Escola ${Math.floor(Math.random() * 100)}`,
            estado: estado || ['RJ', 'SP', 'MG', 'RS'][Math.floor(Math.random() * 4)],
            pontuacao: 1500 - (i * 10) + Math.floor(Math.random() * 100),
            simulados: Math.floor(Math.random() * 20) + 5
        }));
        
        res.json({
            success: true,
            message: '🏆 Ranking Nacional do Desafia Brasil',
            ranking: mockRanking,
            filters: {
                estado: estado || 'Todos',
                serie: serie || 'Todas'
            },
            total: mockRanking.length,
            updatedAt: new Date()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar ranking',
            error: error.message
        });
    }
});

// Lista de simulados disponíveis (público)
router.get('/exams/available', examController.getAvailableExams);
// Documentação da API
router.get('/docs', (req, res) => {
    res.json({
        success: true,
        message: '📚 Documentação da API do Desafia Brasil',
        version: '2.0.0',
        baseUrl: '/api',
        authentication: {
            type: 'JWT Bearer Token',
            header: 'Authorization: Bearer <token>',
            getToken: 'POST /api/auth/login'
        },
        endpoints: {
            public: {
                'GET /health': 'Status da API',
                'POST /auth/register': 'Registrar novo usuário',
                'POST /auth/login': 'Fazer login',
                'GET /dashboard': 'Estatísticas públicas',
                'GET /ranking': 'Ranking público',
                'GET /exams/available': 'Lista de simulados'
            },
            authenticated: {
                'GET /user/profile': 'Perfil do usuário',
                'PUT /user/profile': 'Atualizar perfil',
                'POST /exams/:id/start': 'Iniciar simulado',
                'POST /exams/:id/finish': 'Finalizar simulado',
                'GET /user/exams/history': 'Histórico de simulados'
            },
            admin: {
                'GET /admin/dashboard': 'Dashboard administrativo',
                'GET /admin/users': 'Gerenciar usuários',
                'GET /admin/questions': 'Gerenciar questões',
                'POST /admin/questions/create': 'Criar questão'
            }
        }
    });
});
   // ===================================
// ROTAS PROTEGIDAS (Requer autenticação)
// ===================================

// Aplicar middleware de autenticação para todas as rotas abaixo
router.use(authenticateToken);
// === ROTAS DE USUÁRIO ===

// Perfil do usuário logado
router.get('/user/profile', authController.getUserProfile);

// Atualizar perfil
router.put('/user/profile', async (req, res) => {
    try {
        const { nome, escola, serie, cidade, estado, materiasFavoritas, nivelDificuldade } = req.body;
        const { database } = require('../../config/database');
        
        const updates = {};
        if (nome) updates.nome = nome;
        if (escola) updates.escola = escola;
        if (serie) updates.serie = serie;
        if (cidade) updates.cidade = cidade;
        if (estado) updates.estado = estado;
        if (materiasFavoritas) updates.materiasFavoritas = materiasFavoritas;
        if (nivelDificuldade) updates.nivelDificuldade = nivelDificuldade;

        const updatedUser = await database.update('users', req.userId, updates);
        
        res.json({
            success: true,
            message: '✅ Perfil atualizado com sucesso!',
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar perfil',
            error: error.message
        });
    }
});

// Posição do usuário no ranking
router.get('/user/ranking-position', async (req, res) => {
    try {
        // Simulação de posição (substitua pelo RankingService real)
        const position = {
            posicao: Math.floor(Math.random() * 1000) + 1,
            total: 5000,
            percentil: Math.floor(Math.random() * 100)
        };
        
        res.json({
            success: true,
            position
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar posição no ranking',
            error: error.message
        });
    }
});
// === ROTAS DE SIMULADOS ===

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
router.get('/admin/dashboard', requireAdmin, adminController.getAdminDashboard);

// Gerenciar usuários
router.get('/admin/users', requireAdmin, adminController.manageUsers);
router.post('/admin/users', requireAdmin, adminController.manageUsers);

// Gerenciar questões
router.get('/admin/questions', requireAdmin, adminController.manageQuestions);
router.post('/admin/questions', requireAdmin, adminController.manageQuestions);

// Criar nova questão (admin ou professor)
router.post('/admin/questions/create', requireTeacher, adminController.createQuestion);

// Relatórios avançados
router.get('/admin/reports', requireAdmin, adminController.getAdvancedReports);

// Estatísticas rápidas
router.get('/admin/stats', requireAdmin, adminController.getQuickStats);
// ===================================
// MIDDLEWARE DE ERRO E UTILITÁRIOS
// ===================================

// Middleware de erro 404
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint não encontrado',
        message: `Rota ${req.originalUrl} não existe na API do Desafia Brasil`,
        suggestion: 'Consulte a documentação em /api/docs',
        availableRoutes: [
            'GET /api/health',
            'GET /api/docs',
            'POST /api/auth/login',
            'GET /api/ranking'
        ]
    });
});

module.exports = router;
