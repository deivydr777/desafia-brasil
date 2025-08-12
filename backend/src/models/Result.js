/* ===================================
   DESAFIA BRASIL - RESULTADO MODEL
   Performance dos estudantes nos simulados
   ================================== */

const mongoose = require('mongoose');

const resultadoSchema = new mongoose.Schema({
    // Identificação
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Usuário é obrigatório']
    },
    simulado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Simulado',
        required: [true, 'Simulado é obrigatório']
    },
    
    // Respostas do estudante
    respostas: [{
        questao: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question',
            required: true
        },
        alternativaMarcada: {
            type: String,
            enum: ['A', 'B', 'C', 'D', 'E'],
            required: true
        },
        alternativaCorreta: {
            type: String,
            enum: ['A', 'B', 'C', 'D', 'E'],
            required: true
        },
        acertou: {
            type: Boolean,
            required: true
        },
        tempoResposta: {
            type: Number, // em segundos
            min: 0
        },
        ordem: {
            type: Number,
            required: true
        }
    }],
    
    // Performance geral
    pontuacao: {
        type: Number,
        required: true,
        min: 0
    },
    totalQuestoes: {
        type: Number,
        required: true,
        min: 1
    },
    acertos: {
        type: Number,
        required: true,
        min: 0
    },
    erros: {
        type: Number,
        required: true,
        min: 0
    },
    percentualAcerto: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    
    // Performance por matéria
    desempenhoPorMateria: [{
        materia: {
            type: String,
            required: true
        },
        totalQuestoes: {
            type: Number,
            required: true
        },
        acertos: {
            type: Number,
            required: true
        },
        percentualAcerto: {
            type: Number,
            required: true
        }
    }],
    
    // Tempo de execução
    tempoInicio: {
        type: Date,
        required: true
    },
    tempoFim: {
        type: Date,
        required: true
    },
    tempoTotal: {
        type: Number, // em minutos
        required: true,
        min: 0
    },
    tempoLimite: {
        type: Number, // em minutos
        required: true
    },
    
    // Status e classificação
    finalizado: {
        type: Boolean,
        default: false
    },
    posicaoRanking: {
        type: Number,
        min: 1
    },
    nota: {
        type: Number, // Nota ENEM (0-1000) se aplicável
        min: 0,
        max: 1000
    },
    
    // Análise de dificuldade
    questoesFaceis: {
        total: { type: Number, default: 0 },
        acertos: { type: Number, default: 0 },
        percentual: { type: Number, default: 0 }
    },
    questoesMedias: {
        total: { type: Number, default: 0 },
        acertos: { type: Number, default: 0 },
        percentual: { type: Number, default: 0 }
    },
    questoesDificeis: {
        total: { type: Number, default: 0 },
        acertos: { type: Number, default: 0 },
        percentual: { type: Number, default: 0 }
    },
    
    // Dados para análise
    dispositivoUsado: {
        type: String,
        enum: ['Desktop', 'Mobile', 'Tablet'],
        default: 'Desktop'
    },
    navegador: String,
    ip: String,
    
    criadoEm: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual: tempo médio por questão
resultadoSchema.virtual('tempoMedioPorQuestao').get(function() {
    if (this.totalQuestoes === 0) return 0;
    return Math.round((this.tempoTotal * 60) / this.totalQuestoes); // em segundos
});

// Virtual: classificação da performance
resultadoSchema.virtual('classificacao').get(function() {
    const percentual = this.percentualAcerto;
    if (percentual >= 90) return 'Excelente';
    if (percentual >= 80) return 'Muito Bom';
    if (percentual >= 70) return 'Bom'; 
    if (percentual >= 60) return 'Regular';
    if (percentual >= 50) return 'Insuficiente';
    return 'Precisa Melhorar';
});

// Virtual: status de tempo
resultadoSchema.virtual('statusTempo').get(function() {
    const percentualTempo = (this.tempoTotal / this.tempoLimite) * 100;
    if (percentualTempo <= 50) return 'Muito Rápido';
    if (percentualTempo <= 75) return 'Rápido';
    if (percentualTempo <= 90) return 'Normal';
    if (percentualTempo <= 100) return 'No Limite';
    return 'Excedeu Tempo';
});

// Método: calcular posição no ranking
resultadoSchema.methods.calcularPosicaoRanking = async function() {
    const Resultado = this.constructor;
    const melhoresResultados = await Resultado.countDocuments({
        simulado: this.simulado,
        pontuacao: { $gt: this.pontuacao }
    });
    this.posicaoRanking = melhoresResultados + 1;
    return this.posicaoRanking;
};

// Método: gerar relatório de performance
resultadoSchema.methods.relatorioPerformance = function() {
    return {
        geral: {
            pontuacao: this.pontuacao,
            percentualAcerto: this.percentualAcerto,
            classificacao: this.classificacao,
            posicaoRanking: this.posicaoRanking
        },
        tempo: {
            tempoTotal: this.tempoTotal,
            tempoMedioPorQuestao: this.tempoMedioPorQuestao,
            statusTempo: this.statusTempo
        },
        materias: this.desempenhoPorMateria,
        dificuldade: {
            faceis: this.questoesFaceis,
            medias: this.questoesMedias,
            dificeis: this.questoesDificeis
        }
    };
};

// Índices para performance
resultadoSchema.index({ usuario: 1, simulado: 1 }, { unique: true });
resultadoSchema.index({ simulado: 1, pontuacao: -1 });
resultadoSchema.index({ usuario: 1, criadoEm: -1 });
resultadoSchema.index({ finalizado: 1 });

module.exports = mongoose.model('Result', resultadoSchema);
