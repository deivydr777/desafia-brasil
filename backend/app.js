/* ===================================
   DESAFIA BRASIL - APP.JS
   Configuração central do Express
   ================================== */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Middlewares de segurança
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// Rate limiting para APIs
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: {
        error: 'Muitas tentativas. Tente novamente em 15 minutos.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// CORS configurado para frontend
const corsOptions = {
    origin: [
        'http://localhost:3000', 
        'http://127.0.0.1:3000', 
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:8080'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Middlewares básicos
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos das uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d', // Cache por 1 dia
    etag: true
}));

// Middleware para logs de requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Rota principal
app.get('/', (req, res) => {
    res.json({
        message: "🎓 Desafia Brasil - API Educacional",
        status: "✅ Backend funcionando perfeitamente!",
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        documentation: "/api/docs",
        health: "/api/health",
        features: [
            "🔥 Firebase Firestore integrado",
            "🔐 Sistema de autenticação JWT",
            "📚 Sistema de simulados ENEM/Vestibular",
            "🏆 Ranking nacional em tempo real", 
            "❓ Base de questões organizadas por matéria",
            "👑 Painel administrativo completo",
            "📊 Relatórios e estatísticas avançadas",
            "🎯 Sistema de medalhas e conquistas",
            "📱 Upload de imagens para questões",
            "🚀 API RESTful profissional"
        ],
        endpoints: {
            public: {
                health: "GET /api/health",
                docs: "GET /api/docs",
                register: "POST /api/auth/register",
                login: "POST /api/auth/login",
                dashboard: "GET /api/dashboard",
                ranking: "GET /api/ranking"
            },
            authenticated: {
                profile: "GET /api/user/profile",
                exams: "GET /api/exams/available",
                startExam: "POST /api/exams/:id/start",
                finishExam: "POST /api/exams/:id/finish"
            },
            admin: {
                dashboard: "GET /api/admin/dashboard",
                users: "GET /api/admin/users",
                questions: "GET /api/admin/questions"
            }
        }
    });
});

// Usar as rotas da API
try {
    const apiRoutes = require('./src/routes/api');
    app.use('/api', apiRoutes);
    console.log('✅ Rotas da API carregadas com sucesso!');
} catch (error) {
    console.log('⚠️ Erro ao carregar rotas da API:', error.message);
    
    // Rota de fallback para health check
    app.get('/api/health', (req, res) => {
        res.json({
            success: true,
            message: '🎓 API do Desafia Brasil funcionando!',
            status: 'healthy - modo básico',
            timestamp: new Date(),
            error: 'Rotas completas não carregadas'
        });
    });
}

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error('❌ Erro no servidor:', err.stack);
    
    // Erro de validação
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Dados inválidos',
            details: err.message
        });
    }
    
    // Erro de token JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Token inválido',
            message: 'Faça login novamente'
        });
    }

    // Erro de token expirado
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expirado',
            message: 'Faça login novamente'
        });
    }
    
    // Erro de upload de arquivo
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: 'Arquivo muito grande',
            message: 'Tamanho máximo: 5MB'
        });
    }
    
    // Erro genérico
    res.status(err.status || 500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado',
        timestamp: new Date().toISOString()
    });
});

// Middleware 404 - deve ser o último
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint não encontrado',
        message: `Rota ${req.originalUrl} não existe na API do Desafia Brasil`,
        suggestion: 'Consulte a documentação em /api/docs',
        availableEndpoints: [
            'GET /',
            'GET /api/health',
            'GET /api/docs', 
            'POST /api/auth/login',
            'GET /api/ranking'
        ]
    });
});

module.exports = app;
