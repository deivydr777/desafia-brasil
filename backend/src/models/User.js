/* ===================================
   DESAFIA BRASIL - USER MODEL
   Esquema do usuário/estudante
   ================================== */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Dados pessoais
    nome: {
        type: String,
        required: [true, 'Nome é obrigatório'],
        trim: true,
        maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
    },
    email: {
        type: String,
        required: [true, 'Email é obrigatório'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },
    senha: {
        type: String,
        required: [true, 'Senha é obrigatória'],
        minlength: [6, 'Senha deve ter pelo menos 6 caracteres']
    },
    
    // Dados educacionais
    escola: {
        type: String,
        trim: true,
        maxlength: [150, 'Nome da escola muito longo']
    },
    serie: {
        type: String,
        enum: ['1º EM', '2º EM', '3º EM', 'Pré-vestibular', 'Superior', 'Outro'],
        default: '3º EM'
    },
    cidade: {
        type: String,
        trim: true
    },
    estado: {
        type: String,
        trim: true,
        maxlength: [2, 'Use sigla do estado (ex: RJ)']
    },
    
    // Dados de performance
    pontuacaoTotal: {
        type: Number,
        default: 0,
        min: 0
    },
    simuladosRealizados: {
        type: Number,
        default: 0
    },
    medalhas: [{
        nome: String,
        descricao: String,
        conquistadaEm: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Preferências
    materiasFavoritas: [{
        type: String,
        enum: ['Matemática', 'Português', 'História', 'Geografia', 'Biologia', 'Química', 'Física', 'Inglês', 'Sociologia', 'Filosofia']
    }],
    nivelDificuldade: {
        type: String,
        enum: ['Fácil', 'Médio', 'Difícil', 'Misto'],
        default: 'Médio'
    },
    
    // Configurações da conta
    avatar: {
        type: String,
        default: null
    },
    ativo: {
        type: Boolean,
        default: true
    },
    emailVerificado: {
        type: Boolean,
        default: false
    },
    tipo: {
        type: String,
        enum: ['estudante', 'professor', 'admin'],
        default: 'estudante'
    },
    
    // Controle
    ultimoLogin: {
        type: Date,
        default: Date.now
    },
    criadoEm: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual: posição no ranking
userSchema.virtual('posicaoRanking').get(function() {
    // Calculado dinamicamente no controller
    return this._posicaoRanking || null;
});

// Virtual: média de acertos
userSchema.virtual('mediaAcertos').get(function() {
    if (this.simuladosRealizados === 0) return 0;
    return Math.round((this.pontuacaoTotal / this.simuladosRealizados) * 100) / 100;
});

// Middleware: hash da senha antes de salvar
userSchema.pre('save', async function(next) {
    // Só fazer hash se a senha foi modificada
    if (!this.isModified('senha')) return next();
    
    // Hash da senha
    this.senha = await bcrypt.hash(this.senha, 12);
    next();
});

// Método: verificar senha
userSchema.methods.verificarSenha = async function(senhaCandidata) {
    return await bcrypt.compare(senhaCandidata, this.senha);
};

// Método: dados públicos (sem senha)
userSchema.methods.dadosPublicos = function() {
    return {
        id: this._id,
        nome: this.nome,
        escola: this.escola,
        serie: this.serie,
        cidade: this.cidade,
        estado: this.estado,
        pontuacaoTotal: this.pontuacaoTotal,
        simuladosRealizados: this.simuladosRealizados,
        medalhas: this.medalhas,
        avatar: this.avatar,
        criadoEm: this.criadoEm
    };
};

// Índices para performance
userSchema.index({ email: 1 });
userSchema.index({ pontuacaoTotal: -1 }); // Para ranking
userSchema.index({ cidade: 1, estado: 1 }); // Para rankings regionais

module.exports = mongoose.model('User', userSchema);
