/* ===================================
   DESAFIA BRASIL - RANKING SERVICE
   Serviço para cálculo de rankings
   ================================== */

const { database, collections, FirestoreUtils } = require('../config/database');

class RankingService {
    // Calcular ranking geral
    static async calculateGlobalRanking(filters = {}) {
        try {
            // Buscar usuários ativos ordenados por pontuação
            const users = await database.find(
                collections.USERS, 
                { ativo: true, ...filters },
                { 
                    orderBy: { field: 'pontuacaoTotal', direction: 'desc' },
                    limit: 100 
                }
            );

            // Adicionar posições
            const ranking = users.map((user, index) => ({
                posicao: index + 1,
                id: user.id,
                nome: user.nome,
                escola: user.escola,
                serie: user.serie,
                cidade: user.cidade,
                estado: user.estado,
                pontuacaoTotal: user.pontuacaoTotal || 0,
                simuladosRealizados: user.simuladosRealizados || 0,
                medalhas: user.medalhas || [],
                mediaGeral: user.simuladosRealizados > 0 ? 
                    Math.round((user.pontuacaoTotal / user.simuladosRealizados) * 100) / 100 : 0
            }));

            return {
                success: true,
                ranking,
                total: users.length,
                filters,
                updatedAt: new Date()
            };

        } catch (error) {
            console.error('Erro ao calcular ranking:', error);
            return {
                success: false,
                error: error.message,
                ranking: []
            };
        }
    }

    // Encontrar posição de um usuário específico
    static async findUserPosition(userId) {
        try {
            const globalRanking = await this.calculateGlobalRanking();
            const userPosition = globalRanking.ranking.find(user => user.id === userId);
            
            return userPosition || {
                posicao: null,
                message: 'Usuário não encontrado no ranking'
            };

        } catch (error) {
            console.error('Erro ao encontrar posição do usuário:', error);
            return {
                posicao: null,
                error: error.message
            };
        }
    }

    // Ranking por estado
    static async getRankingByState(estado, limit = 50) {
        try {
            return await this.calculateGlobalRanking({ estado }, { limit });
        } catch (error) {
            console.error('Erro no ranking por estado:', error);
            return { success: false, error: error.message, ranking: [] };
        }
    }

    // Estatísticas do ranking
    static async getRankingStats() {
        try {
            const allUsers = await database.find(collections.USERS, { ativo: true });
            
            if (allUsers.length === 0) {
                return {
                    totalUsuarios: 0,
                    mediaPontuacao: 0,
                    maiorPontuacao: 0,
                    totalSimulados: 0
                };
            }

            const pontuacoes = allUsers.map(u => u.pontuacaoTotal || 0);
            const simulados = allUsers.map(u => u.simuladosRealizados || 0);

            return {
                totalUsuarios: allUsers.length,
                mediaPontuacao: Math.round(pontuacoes.reduce((a, b) => a + b, 0) / allUsers.length),
                maiorPontuacao: Math.max(...pontuacoes),
                totalSimulados: simulados.reduce((a, b) => a + b, 0),
                usuariosAtivos7dias: allUsers.filter(u => {
                    const ultimoLogin = FirestoreUtils.timestampToDate(u.ultimoLogin);
                    const agora = new Date();
                    const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return ultimoLogin && ultimoLogin > seteDiasAtras;
                }).length
            };

        } catch (error) {
            console.error('Erro nas estatísticas do ranking:', error);
            return {
                totalUsuarios: 0,
                mediaPontuacao: 0,
                maiorPontuacao: 0,
                totalSimulados: 0,
                error: error.message
            };
        }
    }
}

module.exports = RankingService;
