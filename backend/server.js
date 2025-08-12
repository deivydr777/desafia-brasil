/* ===================================
   DESAFIA BRASIL - SERVER
   Servidor principal atualizado
   ================================== */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Middlewares básicos
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rota principal
app.get('/', (req, res) => {
    res.json({
        message: "🎓 Desafia Brasil - API Educacional",
        status: "✅ Backend funcionando!",
        version: "1.0.0",
        documentation: "/api/docs",
        health: "/api/health",
        features: [
            "Sistema de Simulados ENEM/Vestibular",
            "Ranking Nacional de Estudantes", 
            "Base de Questões Organizadas",
            "Painel Administrativo Completo",
            "Sistema de Autenticação JWT",
            "Relatórios e Estatísticas Avançadas"
        ]
    });
});

// Usar as rotas da API
app.use('/api', require('./src/routes/api'));

// Middleware de erro 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint não encontrado',
        message: `Rota ${req.originalUrl} não existe`,
        suggestion: 'Consulte a documentação em /api/docs'
    });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error('❌ Erro:', err.stack);
    res.status(err.status || 500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
    });
});

// Iniciar servidor
 const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 DESAFIA BRASIL - BACKEND 🚀`);
    console.log(`📚 API FUNCIONANDO na porta ${PORT}! 📚`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
});
