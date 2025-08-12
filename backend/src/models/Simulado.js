/* ===================================
   DESAFIA BRASIL - SIMULADO MODEL
   Esquema dos simulados/provas
   ================================== */

const mongoose = require('mongoose');

const simuladoSchema = new mongoose.Schema({
    // Identificação
    titulo: {
        type: String,
        required: [true, 'Título é obrigatório'],
        trim: true,
        maxlength: [150, 'Título muito longo']
    },
    descricao: {
        type: String,
        trim: true,
        maxlength: [500, 'Descrição muito longa']
    },
    codigo: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    
    // Configurações do simulado
    questoes: [{
        questao: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question',
            required: true
        },
        ordem: {
            type: Number,
            required: true
        },
        peso: {
            type: Number,
            default: 1,
            min: 0.1,
            max: 3
        }
    }],
    
    // Configurações de tempo e dificuldade
    tempoLimite: {
        type: Number, // em minutos
        required: [true, 'Tempo limite é obrigatório'],
        min: [5, 'Tempo mínimo de 5 minutos'],
        max: [300, 'Tempo máximo de 5 horas']
    },
    dificuldade: {
        type: String,
        enum: ['Fácil', 'Médio', 'Difícil', 'Misto'],
        required: true
    },
    
    // Classificação
    tipo: {
        type: String,
        enum: ['ENEM', 'Vestibular', 'Concurso', 'Treino', 'Personalizado'],
        required: true
    },
    materias: [{
        materia: String,
        numeroQuestoes: Number
    }],
    
    // Configurações de acesso
    publico: {
        type: Boolean,
        default: true
    },
    dataInicio: {
        type: Date,
        default: Date.now
    },
    dataFim: {
        type: Date,
        validate: {
            validator: function(v) {
                return !v || v > this.dataInicio;
            },
            message: 'Data de fim deve ser posterior à data de início'
        }
    },
    
    // Estatísticas
    participantes: {
        type: Number,
        default: 0
    },
    mediaGeral: {
        type: Number,
        default: 0,
        min: 0,
        max: 1000
    },
    maiorNota: {
        type: Number,
        default: 0
    },
    menorNota: {
        type: Number,
        default: 0
    },
    
    // Configurações especiais
    permitirRevisao: {
        type: Boolean,
        default: true
    },
    mostrarGabarito: {
        type: Boolean,
        default: true
    },
    mostrarRanking: {
        type: Boolean,
        default: true
    },
    embaralharQuestoes: {
        type: Boolean,
        default: false
    },
    
    // Criação e controle
    criadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ativo: {
        type: Boolean,
        default: true
    },
    aprovado: {
        type: Boolean,
        default: false
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

// Virtual: total de questões
simuladoSchema.virtual('totalQuestoes').get(function() {
    return this.questoes.length;
});

// Virtual: pontuação máxima
simuladoSchema.virtual('pontuacaoMaxima').get(function() {
    return this.questoes.reduce((total, q) => total + (q.peso || 1), 0) * 20; // 20 pontos por questão
});

// Virtual: status do simulado
simuladoSchema.virtual('status').get(function() {
    const agora = new Date();
    if (this.dataFim && agora > this.dataFim) return 'Finalizado';
    if (agora < this.dataInicio) return 'Agendado'; 
    return 'Ativo';
});

// Método: adicionar questão
simuladoSchema.methods.adicionarQuestao = function(questaoId, peso = 1) {
    const ordem = this.questoes.length + 1;
    this.questoes.push({
        questao: questaoId,
        ordem: ordem,
        peso: peso
    });
    return this.save();
};

// Método: calcular nota
simuladoSchema.methods.calcularNota = function(respostas) {
    let pontuacao = 0;
    let acertos = 0;
    
    this.questoes.forEach((q, index) => {
        const resposta = respostas[index];
        if (resposta && resposta.correta) {
            pontuacao += (q.peso || 1) * 20;
            acertos++;
        }
    });
    
    return {
        pontuacao,
        acertos,
        total: this.questoes.length,
        percentual: Math.round((acertos / this.questoes.length) * 100)
    };
};

// Índices para performance
simuladoSchema.index({ tipo: 1, ativo: 1 });
simuladoSchema.index({ dataInicio: 1, dataFim: 1 });
simuladoSchema.index({ publico: 1, aprovado: 1 });
simuladoSchema.index({ codigo: 1 });

module.exports = mongoose.model('Simulado', simuladoSchema);
