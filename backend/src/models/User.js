/* ===================================
   DESAFIA BRASIL - USER MODEL
   Modelo para Firebase Firestore
   ================================== */

const { database, collections, FirestoreUtils } = require('../../config/database');
const bcrypt = require('bcryptjs');

class User {
    constructor(data) {
        this.nome = data.nome;
        this.email = data.email;
        this.senha = data.senha;
        this.escola = data.escola || '';
        this.serie = data.serie || '3º EM';
        this.cidade = data.cidade || '';
        this.estado = data.estado || '';
        this.pontuacaoTotal = data.pontuacaoTotal || 0;
        this.simuladosRealizados = data.simuladosRealizados || 0;
        this.medalhas = data.medalhas || [];
        this.materiasFavoritas = data.materiasFavoritas || [];
        this.nivelDificuldade = data.nivelDificuldade || 'Médio';
        this.avatar = data.avatar || null;
        this.ativo = data.ativo !== undefined ? data.ativo : true;
        this.emailVerificado = data.emailVerificado !== undefined ? data.emailVerificado : false;
        this.tipo = data.tipo || 'estudante';
        this.ultimoLogin = data.ultimoLogin || FirestoreUtils.dateToTimestamp(new Date());
    }

    // Validar dados do usuário
    validate() {
        const errors = [];

        // Nome obrigatório
        if (!this.nome || this.nome.trim().length === 0) {
            errors.push('Nome é obrigatório');
        }
        if (this.nome && this.nome.length > 100) {
            errors.push('Nome deve ter no máximo 100 caracteres');
        }

        // Email obrigatório e válido
        if (!this.email || this.email.trim().length === 0) {
            errors.push('Email é obrigatório');
        }
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (this.email && !emailRegex.test(this.email)) {
            errors.push('Email inválido');
        }

        // Senha obrigatória
        if (!this.senha || this.senha.length < 6) {
            errors.push('Senha deve ter pelo menos 6 caracteres');
        }

        // Série válida
        const seriesValidas = ['1º EM', '2º EM', '3º EM', 'Pré-vestibular', 'Superior', 'Outro'];
        if (this.serie && !seriesValidas.includes(this.serie)) {
            errors.push('Série inválida');
        }

        // Estado com máximo 2 caracteres
        if (this.estado && this.estado.length > 2) {
            errors.push('Use sigla do estado (ex: RJ)');
        }

        // Tipo de usuário válido
        const tiposValidos = ['estudante', 'professor', 'admin'];
        if (this.tipo && !tiposValidos.includes(this.tipo)) {
            errors.push('Tipo de usuário inválido');
        }

        // Nível de dificuldade válido
        const niveisValidos = ['Fácil', 'Médio', 'Difícil', 'Misto'];
        if (this.nivelDificuldade && !niveisValidos.includes(this.nivelDificuldade)) {
            errors.push('Nível de dificuldade inválido');
        }

        // Validar matérias favoritas
        const materiasValidas = [
            'Matemática', 'Português', 'História', 'Geografia', 
            'Biologia', 'Química', 'Física', 'Inglês', 
            'Sociologia', 'Filosofia'
        ];
        if (this.materiasFavoritas && Array.isArray(this.materiasFavoritas)) {
            const materiasInvalidas = this.materiasFavoritas.filter(m => !materiasValidas.includes(m));
            if (materiasInvalidas.length > 0) {
                errors.push(`Matérias inválidas: ${materiasInvalidas.join(', ')}`);
            }
        }

        return errors;
    }

    // Salvar usuário no Firebase
    async save() {
        const errors = this.validate();
        if (errors.length > 0) {
            throw new Error(`Dados inválidos: ${errors.join(', ')}`);
        }

        try {
            // Hash da senha se foi modificada
            if (this.senha && !this.senha.startsWith('$2a$')) {
                this.senha = await bcrypt.hash(this.senha, 12);
            }

            const userData = {
                nome: this.nome,
                email: this.email.toLowerCase(),
                senha: this.senha,
                escola: this.escola,
                serie: this.serie,
                cidade: this.cidade,
                estado: this.estado,
                pontuacaoTotal: this.pontuacaoTotal,
                simuladosRealizados: this.simuladosRealizados,
                medalhas: this.medalhas,
                materiasFavoritas: this.materiasFavoritas,
                nivelDificuldade: this.nivelDificuldade,
                avatar: this.avatar,
                ativo: this.ativo,
                emailVerificado: this.emailVerificado,
                tipo: this.tipo,
                ultimoLogin: this.ultimoLogin
            };

            if (this.id) {
                // Atualizar usuário existente
                const updated = await database.update(collections.USERS, this.id, userData);
                return updated;
            } else {
                // Criar novo usuário
                const created = await database.create(collections.USERS, userData);
                this.id = created.id;
                return created;
            }
        } catch (error) {
            throw new Error(`Erro ao salvar usuário: ${error.message}`);
        }
    }

    // Verificar senha
    async verificarSenha(senhaCandidata) {
        try {
            return await bcrypt.compare(senhaCandidata, this.senha);
        } catch (error) {
            throw new Error(`Erro ao verificar senha: ${error.message}`);
        }
    }

    // Dados públicos (sem senha)
    dadosPublicos() {
        return {
            id: this.id,
            nome: this.nome,
            email: this.email,
            escola: this.escola,
            serie: this.serie,
            cidade: this.cidade,
            estado: this.estado,
            pontuacaoTotal: this.pontuacaoTotal,
            simuladosRealizados: this.simuladosRealizados,
            medalhas: this.medalhas,
            materiasFavoritas: this.materiasFavoritas,
            nivelDificuldade: this.nivelDificuldade,
            avatar: this.avatar,
            tipo: this.tipo,
            emailVerificado: this.emailVerificado,
            criadoEm: this.criadoEm,
            ultimoLogin: this.ultimoLogin
        };
    }

    // Dados completos (para admin)
    dadosCompletos() {
        return {
            id: this.id,
            nome: this.nome,
            email: this.email,
            escola: this.escola,
            serie: this.serie,
            cidade: this.cidade,
            estado: this.estado,
            pontuacaoTotal: this.pontuacaoTotal,
            simuladosRealizados: this.simuladosRealizados,
            medalhas: this.medalhas,
            materiasFavoritas: this.materiasFavoritas,
            nivelDificuldade: this.nivelDificuldade,
            avatar: this.avatar,
            ativo: this.ativo,
            emailVerificado: this.emailVerificado,
            tipo: this.tipo,
            ultimoLogin: this.ultimoLogin,
            criadoEm: this.criadoEm,
            updatedAt: this.updatedAt
        };
    }

    // Calcular média de acertos
    get mediaAcertos() {
        if (this.simuladosRealizados === 0) return 0;
        return Math.round((this.pontuacaoTotal / this.simuladosRealizados) * 100) / 100;
    }

    // Adicionar medalha
    async adicionarMedalha(medalha) {
        try {
            const novaMedalha = {
                nome: medalha.nome,
                descricao: medalha.descricao,
                conquistadaEm: FirestoreUtils.dateToTimestamp(new Date())
            };

            // Verificar se já possui esta medalha
            const jaPossui = this.medalhas.some(m => m.nome === medalha.nome);
            if (jaPossui) {
                return false; // Já possui a medalha
            }

            await database.update(collections.USERS, this.id, {
                medalhas: FirestoreUtils.arrayUnion(novaMedalha)
            });

            this.medalhas.push(novaMedalha);
            return true;
        } catch (error) {
            throw new Error(`Erro ao adicionar medalha: ${error.message}`);
        }
    }

    // Atualizar pontuação
    async atualizarPontuacao(pontos) {
        try {
            const updates = {
                pontuacaoTotal: FirestoreUtils.increment(pontos),
                simuladosRealizados: FirestoreUtils.increment(1)
            };

            await database.update(collections.USERS, this.id, updates);
            
            this.pontuacaoTotal += pontos;
            this.simuladosRealizados += 1;

            return this;
        } catch (error) {
            throw new Error(`Erro ao atualizar pontuação: ${error.message}`);
        }
    }

    // Atualizar último login
    async atualizarUltimoLogin() {
        try {
            const agora = FirestoreUtils.dateToTimestamp(new Date());
            await database.update(collections.USERS, this.id, {
                ultimoLogin: agora
            });
            this.ultimoLogin = agora;
            return this;
        } catch (error) {
            throw new Error(`Erro ao atualizar último login: ${error.message}`);
        }
    }

    // MÉTODOS ESTÁTICOS

    // Buscar usuário por ID
    static async findById(id) {
        try {
            const data = await database.findById(collections.USERS, id);
            if (!data) return null;
            
            const user = new User(data);
            user.id = data.id;
            user.criadoEm = data.createdAt;
            user.updatedAt = data.updatedAt;
            return user;
        } catch (error) {
            throw new Error(`Erro ao buscar usuário: ${error.message}`);
        }
    }

    // Buscar usuário por email
    static async findByEmail(email) {
        try {
            const users = await database.find(collections.USERS, { 
                email: email.toLowerCase() 
            });
            
            if (users.length === 0) return null;
            
            const userData = users[0];
            const user = new User(userData);
            user.id = userData.id;
            user.criadoEm = userData.createdAt;
            user.updatedAt = userData.updatedAt;
            return user;
        } catch (error) {
            throw new Error(`Erro ao buscar usuário por email: ${error.message}`);
        }
    }

    // Buscar usuários com filtros
    static async find(filters = {}, options = {}) {
        try {
            const results = await database.find(collections.USERS, filters, options);
            return results.map(data => {
                const user = new User(data);
                user.id = data.id;
                user.criadoEm = data.createdAt;
                user.updatedAt = data.updatedAt;
                return user;
            });
        } catch (error) {
            throw new Error(`Erro ao buscar usuários: ${error.message}`);
        }
    }

    // Contar usuários
    static async count(filters = {}) {
        try {
            return await database.count(collections.USERS, filters);
        } catch (error) {
            throw new Error(`Erro ao contar usuários: ${error.message}`);
        }
    }

    // Busca com paginação
    static async paginate(filters = {}, options = {}) {
        try {
            const result = await database.paginate(collections.USERS, filters, options);
            
            result.data = result.data.map(data => {
                const user = new User(data);
                user.id = data.id;
                user.criadoEm = data.createdAt;
                user.updatedAt = data.updatedAt;
                return user;
            });

            return result;
        } catch (error) {
            throw new Error(`Erro na paginação de usuários: ${error.message}`);
        }
    }

    // Ranking de usuários
    static async getRanking(filters = {}, limit = 50) {
        try {
            const options = {
                orderBy: { 
                    field: 'pontuacaoTotal', 
                    direction: 'desc' 
                },
                limit: limit
            };

            const users = await User.find(
                { ativo: true, ...filters }, 
                options
            );

            return users.map((user, index) => ({
                posicao: index + 1,
                ...user.dadosPublicos(),
                mediaGeral: user.mediaAcertos
            }));
        } catch (error) {
            throw new Error(`Erro ao obter ranking: ${error.message}`);
        }
    }

    // Estatísticas de usuários
    static async getStats() {
        try {
            const totalUsers = await User.count();
            const activeUsers = await User.count({ ativo: true });
            const verifiedUsers = await User.count({ emailVerificado: true });

            // Buscar todos os usuários para estatísticas detalhadas
            const allUsers = await User.find({ ativo: true });
            
            if (allUsers.length === 0) {
                return {
                    overview: {
                        totalUsers: 0,
                        activeUsers: 0,
                        verifiedUsers: 0,
                        totalScore: 0,
                        totalExams: 0,
                        averageScore: 0
                    },
                    bySerie: [],
                    byState: [],
                    recentActivity: 0
                };
            }

            // Estatísticas por série
            const statsBySerie = {};
            const statsByState = {};
            let totalScore = 0;
            let totalExams = 0;
            let recentActivity = 0;

            const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            allUsers.forEach(user => {
                // Por série
                if (!statsBySerie[user.serie]) {
                    statsBySerie[user.serie] = {
                        count: 0,
                        totalScore: 0,
                        totalExams: 0
                    };
                }
                statsBySerie[user.serie].count++;
                statsBySerie[user.serie].totalScore += user.pontuacaoTotal;
                statsBySerie[user.serie].totalExams += user.simuladosRealizados;

                // Por estado
                if (user.estado) {
                    if (!statsByState[user.estado]) {
                        statsByState[user.estado] = { count: 0 };
                    }
                    statsByState[user.estado].count++;
                }

                // Totais gerais
                totalScore += user.pontuacaoTotal;
                totalExams += user.simuladosRealizados;

                // Atividade recente
                const ultimoLogin = FirestoreUtils.timestampToDate(user.ultimoLogin);
                if (ultimoLogin && ultimoLogin > seteDiasAtras) {
                    recentActivity++;
                }
            });

            return {
                overview: {
                    totalUsers,
                    activeUsers,
                    verifiedUsers,
                    totalScore,
                    totalExams,
                    averageScore: activeUsers > 0 ? Math.round(totalScore / activeUsers) : 0,
                    averageExams: activeUsers > 0 ? Math.round(totalExams / activeUsers) : 0,
                    recentActivity
                },
                bySerie: Object.keys(statsBySerie).map(serie => ({
                    serie,
                    count: statsBySerie[serie].count,
                    averageScore: statsBySerie[serie].count > 0 ? 
                        Math.round(statsBySerie[serie].totalScore / statsBySerie[serie].count) : 0,
                    averageExams: statsBySerie[serie].count > 0 ? 
                        Math.round(statsBySerie[serie].totalExams / statsBySerie[serie].count) : 0
                })),
                byState: Object.keys(statsByState)
                    .map(estado => ({
                        estado,
                        count: statsByState[estado].count
                    }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10) // Top 10 estados
            };
        } catch (error) {
            throw new Error(`Erro ao obter estatísticas: ${error.message}`);
        }
    }

    // Deletar usuário
    static async delete(id) {
        try {
            return await database.delete(collections.USERS, id);
        } catch (error) {
            throw new Error(`Erro ao deletar usuário: ${error.message}`);
        }
    }

    // Verificar se email já existe
    static async emailExists(email) {
        try {
            const user = await User.findByEmail(email);
            return user !== null;
        } catch (error) {
            throw new Error(`Erro ao verificar email: ${error.message}`);
        }
    }

    // Buscar usuários ativos na última semana
    static async getActiveUsers(days = 7) {
        try {
            const dataLimite = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const timestampLimite = FirestoreUtils.dateToTimestamp(dataLimite);
            
            // Como Firestore não suporta comparação direta de timestamps em filtros simples,
            // buscamos todos os usuários ativos e filtramos no código
            const allUsers = await User.find({ ativo: true });
            
            return allUsers.filter(user => {
                const ultimoLogin = FirestoreUtils.timestampToDate(user.ultimoLogin);
                return ultimoLogin && ultimoLogin > dataLimite;
            });
        } catch (error) {
            throw new Error(`Erro ao buscar usuários ativos: ${error.message}`);
        }
    }

    // Promover usuário para professor/admin
    static async promoteUser(userId, novoTipo) {
        try {
            const tiposValidos = ['estudante', 'professor', 'admin'];
            if (!tiposValidos.includes(novoTipo)) {
                throw new Error('Tipo de usuário inválido');
            }

            const user = await User.findById(userId);
            if (!user) {
                throw new Error('Usuário não encontrado');
            }

            await database.update(collections.USERS, userId, { tipo: novoTipo });
            user.tipo = novoTipo;
            
            return user;
        } catch (error) {
            throw new Error(`Erro ao promover usuário: ${error.message}`);
        }
    }
}

module.exports = User;
