/* ===================================
   DESAFIA BRASIL - QUESTÃO MODEL
   Esquema das questões/exercícios
   ================================== */

const mongoose = require('mongoose');

const questaoSchema = new mongoose.Schema({
    // Identificação
    codigo: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    titulo: {
        type: String,
        required: [true, 'Título é obrigatório'],
        trim: true,
        maxlength: [200, 'Título muito longo']
    },
    
    // Conteúdo da questão
    enunciado: {
        type: String,
        required: [true, 'Enunciado é obrigatório'],
        trim: true
    },
    imagem: {
        url: String,
        alt: String,
        largura: Number,
        altura: Number
    },
    
    // Alternativas (múltipla escolha)
    alternativas: [{
        letra: {
            type: String,
            required: true,
            enum: ['A', 'B', 'C', 'D', 'E']
        },
        texto: {
            type: String,
            required: true,
            trim: true
        },
        imagem: {
            url: String,
            alt: String
        }
    }],
    
    // Resposta correta
    respostaCorreta: {
        type: String,
        required: [true, 'Resposta correta é obrigatória'],
        enum: ['A', 'B', 'C', 'D', 'E']
    },
    
    // Classificação
    materia: {
        type: String,
        required: [true, 'Matéria é obrigatória'],
        enum: [
            'Matemática',
            'Português', 
            'História',
            'Geografia',
            'Biologia',
            'Química', 
            'Física',
            'Inglês',
            'Sociologia',
            'Filosofia',
            'Arte',
            'Educação Física'
        ]
    },
    assunto: {
        type: String,
        required: [true, 'Assunto é obrigatório'],
        trim: true
    },
    
    // Dificuldade e fonte
    dificuldade: {
        type: String,
        enum: ['Fácil', 'Médio', 'Difícil'],
        required: true
    },
    fonte: {
        vestibular: {
            type: String,
            enum: ['ENEM', 'UERJ', 'UFRJ', 'UFF', 'FUVEST', 'UNICAMP', 'PUC-RJ', 'Outro']
        },
        ano: {
            type: Number,
            min: 1990,
            max: new Date().getFullYear()
        },
        aplicacao: String // '1ª aplicação', '2ª aplicação', etc.
    },
    
    // Explicação da resposta
    explicacao: {
        type: String,
        trim: true
    },
    dicas: [String],
    
    // Estatísticas de uso
    vezesRespondida: {
        type: Number,
        default: 0
    },
    vezesAcertada: {
        type: Number,
        default: 0
    },
    percentualAcerto: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    
    // Controle
    ativa: {
        type: Boolean,
        default: true
    },
    aprovada: {
        type: Boolean,
        default: false // Para moderação
    },
    criadaPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Tags para busca
    tags: [String],
    
    criadaEm: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual: percentual de acerto atualizado
questaoSchema.virtual('percentualAcertoAtual').get(function() {
    if (this.vezesRespondida === 0) return 0;
    return Math.round((this.vezesAcertada / this.vezesRespondida) * 100);
});

// Método: registrar resposta
questaoSchema.methods.registrarResposta = function(acertou) {
    this.vezesRespondida += 1;
    if (acertou) {
        this.vezesAcertada += 1;
    }
    this.percentualAcerto = Math.round((this.vezesAcertada / this.vezesRespondida) * 100);
    return this.save();
};

// Índices para busca e performance
questaoSchema.index({ materia: 1, dificuldade: 1 });
questaoSchema.index({ 'fonte.vestibular': 1, 'fonte.ano': -1 });
questaoSchema.index({ ativa: 1, aprovada: 1 });
questaoSchema.index({ tags: 1 });
questaoSchema.index({ codigo: 1 });

module.exports = mongoose.model('Question', questaoSchema);
