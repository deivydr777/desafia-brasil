/* ===================================
   DESAFIA BRASIL - SERVER
   Arquivo: server.js
   Servidor principal da aplicação
   ================================== */

require('dotenv').config();
const app = require('./app');

// Configurações do servidor
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Inicializar servidor
const server = app.listen(PORT, () => {
    console.log('🚀 ================================');
    console.log('   DESAFIA BRASIL - BACKEND');
    console.log('🚀 ================================');
    console.log(`📚 Servidor educacional rodando!`);
    console.log(`🌐 Ambiente: ${NODE_ENV}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`📱 Termux: http://127.0.0.1:${PORT}`);
    console.log('🚀 ================================');
    console.log('✅ Pronto para receber requisições!');
    console.log('✅ Sistema de simulados ativo!');
    console.log('✅ API de ranking funcionando!');
    console.log('🚀 ================================');
});

// Tratamento de erros do servidor
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Porta ${PORT} já está em uso!`);
        console.log(`💡 Tente: PORT=3001 npm run dev`);
    } else {
        console.error('❌ Erro no servidor:', error.message);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM. Fechando servidor...');
    server.close(() => {
        console.log('✅ Servidor fechado com sucesso!');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 Recebido SIGINT (Ctrl+C). Fechando servidor...');
    server.close(() => {
        console.log('✅ Desafia Brasil finalizado com sucesso!');
        process.exit(0);
    });
});

// Tratamento de exceções não capturadas
process.on('uncaughtException', (error) => {
    console.error('❌ Exceção não capturada:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada em:', promise, 'Razão:', reason);
    process.exit(1);
})
