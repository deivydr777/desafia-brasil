/* ===================================
   DESAFIA BRASIL - SIMULADO JS
   Arquivo: simulado.js
   Sistema completo de simulados
   ================================== */

// Configurações do sistema de simulados
const SimuladoConfig = {
    // Tempos em segundos
    TEMPO_PADRAO: {
        'enem_completo': 5.5 * 60 * 60, // 5h30min
        'enem_area': 2 * 60 * 60,       // 2h
        'vestibular': 4 * 60 * 60,      // 4h
        'quiz_rapido': 20 * 60,         // 20min
        'por_questao': 3 * 60           // 3min por questão
    },
    
    // Avisos de tempo
    AVISOS_TEMPO: [30 * 60, 10 * 60, 5 * 60, 2 * 60, 60], // 30min, 10min, 5min, 2min, 1min
    
    // Auto-save
    AUTO_SAVE_INTERVAL: 30000, // 30 segundos
    
    // Pontuação
    PONTOS: {
        'facil': 10,
        'medio': 15,
        'dificil': 25
    },
    
    // Cores por matéria
    CORES_MATERIAS: {
        'matematica': '#007bff',
        'portugues': '#28a745', 
        'historia': '#ffc107',
        'geografia': '#17a2b8',
        'fisica': '#6f42c1',
        'quimica': '#fd7e14',
        'biologia': '#20c997',
        'filosofia': '#6c757d',
        'sociologia': '#e83e8c',
        'ingles': '#dc3545'
    }
};

// Estado global do simulado
const SimuladoState = {
    atual: null,
    questoes: [],
    respostas: {},
    tempoInicio: null,
    tempoRestante: 0,
    pausado: false,
    finalizado: false,
    questaoAtual: 0,
    timer: null,
    autoSaveTimer: null,
    estatisticas: {
        tempo_por_questao: {},
        mudancas_resposta: {},
        questoes_puladas: []
    }
};

// Classe principal do sistema de simulados
class SimuladoSystem {
    constructor() {
        this.initEventListeners();
        this.verificarSimuladoSalvo();
    }

    // Inicializar event listeners
    initEventListeners() {
        // Botões de navegação
        document.addEventListener('click', (e) => {
            if (e.target.matches('#prevBtn')) {
                this.questaoAnterior();
            } else if (e.target.matches('#nextBtn')) {
                this.proximaQuestao();
            } else if (e.target.matches('#finishBtn')) {
                this.finalizarSimulado();
            } else if (e.target.matches('.question-nav-btn')) {
                const questaoIndex = parseInt(e.target.dataset.questao);
                this.irParaQuestao(questaoIndex);
            }
        });

        // Seleção de resposta
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[name="questao_resposta"]')) {
                this.salvarResposta(SimuladoState.questaoAtual, e.target.value);
            }
        });

        // Prevenir saída acidental
        window.addEventListener('beforeunload', (e) => {
            if (SimuladoState.atual && !SimuladoState.finalizado) {
                e.preventDefault();
                e.returnValue = 'Você tem um simulado em andamento. Deseja realmente sair?';
            }
        });
    }

    // Verificar se há simulado salvo
    verificarSimuladoSalvo() {
        const simuladoSalvo = Storage.get('simulado_atual');
        if (simuladoSalvo && !simuladoSalvo.finalizado) {
            if (confirm('Você tem um simulado em andamento. Deseja continuar?')) {
                this.carregarSimuladoSalvo(simuladoSalvo);
            } else {
                Storage.remove('simulado_atual');
            }
        }
    }
}
    // Inicializar novo simulado
    async inicializarSimulado(config) {
        try {
            showLoading(true);

            // Buscar questões da API real
            const response = await API.post('/simulados/gerar', {
                materia: config.subject,
                dificuldade: config.difficulty,
                quantidade: config.questionsCount,
                fonte: config.source,
                usuario_id: User.getCurrentUser()?.id
            });

            if (!response.success) {
                throw new Error(response.error || 'Erro ao carregar questões');
            }

            const questoes = response.data.questoes;
            
            // Configurar simulado
            SimuladoState.atual = {
                id: Utils.generateId(),
                config: config,
                iniciado_em: new Date().toISOString(),
                finalizado: false
            };

            SimuladoState.questoes = questoes;
            SimuladoState.respostas = {};
            SimuladoState.questaoAtual = 0;
            SimuladoState.tempoInicio = Date.now();
            
            // Calcular tempo total
            this.calcularTempoSimulado(config);
            
            // Salvar estado
            this.salvarEstadoSimulado();
            
            // Iniciar interface
            this.mostrarTelaSimulado();
            this.carregarQuestao(0);
            this.iniciarTimer();
            this.iniciarAutoSave();
            
            // Gerar navegação
            this.gerarNavegacaoQuestoes();
            
            Notifications.success('Simulado iniciado! Boa sorte! 🍀');

        } catch (error) {
            console.error('Erro ao inicializar simulado:', error);
            Notifications.error('Erro ao carregar simulado. Tente novamente.');
        } finally {
            showLoading(false);
        }
    }

    // Calcular tempo do simulado
    calcularTempoSimulado(config) {
        let tempoTotal;
        
        if (config.subject === 'enem' && config.questionsCount >= 90) {
            tempoTotal = SimuladoConfig.TEMPO_PADRAO.enem_completo;
        } else if (config.subject === 'enem') {
            tempoTotal = SimuladoConfig.TEMPO_PADRAO.enem_area;
        } else if (config.questionsCount <= 20) {
            tempoTotal = SimuladoConfig.TEMPO_PADRAO.quiz_rapido;
        } else {
            tempoTotal = config.questionsCount * SimuladoConfig.TEMPO_PADRAO.por_questao;
        }
        
        SimuladoState.tempoRestante = tempoTotal;
    }

    // Mostrar tela do simulado
    mostrarTelaSimulado() {
        // Esconder tela de seleção
        const selectionScreen = document.getElementById('selectionScreen');
        if (selectionScreen) {
            selectionScreen.classList.add('d-none');
        }
        
        // Mostrar tela do quiz
        const quizScreen = document.getElementById('quizScreen');
        if (quizScreen) {
            quizScreen.classList.remove('d-none');
        }
        
        // Atualizar informações do header
        this.atualizarHeaderSimulado();
    }

    // Atualizar header do simulado
    atualizarHeaderSimulado() {
        const config = SimuladoState.atual.config;
        
        // Título
        const titulo = document.getElementById('quizTitle');
        if (titulo) {
            titulo.textContent = this.gerarTituloSimulado(config);
        }
        
        // Matéria
        const materia = document.getElementById('quizSubject');
        if (materia) {
            materia.textContent = config.subject.charAt(0).toUpperCase() + config.subject.slice(1);
            materia.className = 'badge bg-primary me-2';
            if (SimuladoConfig.CORES_MATERIAS[config.subject]) {
                materia.style.backgroundColor = SimuladoConfig.CORES_MATERIAS[config.subject];
            }
        }
        
        // Dificuldade
        const dificuldade = document.getElementById('quizDifficulty');
        if (dificuldade) {
            dificuldade.textContent = config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1);
            dificuldade.className = `badge me-2 ${this.getCorDificuldade(config.difficulty)}`;
        }
        
        // Fonte
        const fonte = document.getElementById('quizSource');
        if (fonte) {
            fonte.textContent = config.source.toUpperCase() || 'GERAL';
        }
        
        // Total de questões
        const totalQuestoes = document.getElementById('totalQuestions');
        if (totalQuestoes) {
            totalQuestoes.textContent = SimuladoState.questoes.length;
        }
    }

    // Gerar título do simulado
    gerarTituloSimulado(config) {
        if (config.subject === 'enem') {
            return config.questionsCount >= 90 ? 'ENEM Completo' : 'Simulado ENEM';
        } else if (config.subject === 'random') {
            return 'Simulado Misto';
        } else {
            return `Simulado de ${config.subject.charAt(0).toUpperCase() + config.subject.slice(1)}`;
        }
    }

    // Obter cor da dificuldade
    getCorDificuldade(dificuldade) {
        const cores = {
            'facil': 'bg-success',
            'medio': 'bg-warning',
            'dificil': 'bg-danger'
        };
        return cores[dificuldade] || 'bg-secondary';
    }
    // Iniciar timer do simulado
    iniciarTimer() {
        if (SimuladoState.timer) {
            clearInterval(SimuladoState.timer);
        }
        
        SimuladoState.timer = setInterval(() => {
            if (!SimuladoState.pausado && SimuladoState.tempoRestante > 0) {
                SimuladoState.tempoRestante--;
                this.atualizarDisplayTempo();
                this.verificarAvisosTempo();
                
                // Salvar progresso a cada minuto
                if (SimuladoState.tempoRestante % 60 === 0) {
                    this.salvarEstadoSimulado();
                }
                
                // Finalizar automaticamente quando tempo acabar
                if (SimuladoState.tempoRestante <= 0) {
                    this.finalizarSimuladoPorTempo();
                }
            }
        }, 1000);
    }

    // Atualizar display do tempo
    atualizarDisplayTempo() {
        const timeDisplay = document.getElementById('timeRemaining');
        if (timeDisplay) {
            timeDisplay.textContent = this.formatarTempo(SimuladoState.tempoRestante);
            
            // Mudar cor conforme tempo restante
            if (SimuladoState.tempoRestante <= 300) { // 5 minutos
                timeDisplay.className = 'fw-bold text-danger';
            } else if (SimuladoState.tempoRestante <= 600) { // 10 minutos
                timeDisplay.className = 'fw-bold text-warning';
            } else {
                timeDisplay.className = 'fw-bold text-success';
            }
        }
    }

    // Verificar avisos de tempo
    verificarAvisosTempo() {
        if (SimuladoConfig.AVISOS_TEMPO.includes(SimuladoState.tempoRestante)) {
            const minutos = Math.floor(SimuladoState.tempoRestante / 60);
            const segundos = SimuladoState.tempoRestante % 60;
            
            let mensagem;
            if (minutos > 0) {
                mensagem = `⏰ Restam ${minutos} minuto${minutos > 1 ? 's' : ''}!`;
            } else {
                mensagem = `⏰ Restam ${segundos} segundo${segundos > 1 ? 's' : ''}!`;
            }
            
            Notifications.warning(mensagem, 3000);
            
            // Efeito sonoro ou vibração (se suportado)
            this.alertaTempo();
        }
    }

    // Alerta de tempo
    alertaTempo() {
        // Vibração em dispositivos móveis
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
        
        // Efeito visual
        const timeDisplay = document.getElementById('timeRemaining');
        if (timeDisplay) {
            timeDisplay.style.animation = 'pulse 0.5s ease-in-out 3';
            setTimeout(() => {
                timeDisplay.style.animation = '';
            }, 1500);
        }
    }

    // Pausar simulado
    pausarSimulado() {
        SimuladoState.pausado = true;
        this.salvarEstadoSimulado();
        
        // Mostrar modal de pausa
        const pauseModal = document.getElementById('pauseModal');
        if (pauseModal) {
            const modal = new bootstrap.Modal(pauseModal);
            modal.show();
        }
        
        Notifications.info('Simulado pausado');
    }

    // Retomar simulado
    retomarSimulado() {
        SimuladoState.pausado = false;
        
        // Fechar modal de pausa
        const pauseModal = document.getElementById('pauseModal');
        if (pauseModal) {
            const modal = bootstrap.Modal.getInstance(pauseModal);
            if (modal) {
                modal.hide();
            }
        }
        
        Notifications.success('Simulado retomado!');
    }

    // Finalizar simulado por tempo esgotado
    finalizarSimuladoPorTempo() {
        clearInterval(SimuladoState.timer);
        
        Notifications.warning('⏰ Tempo esgotado! Simulado finalizado automaticamente.');
        
        setTimeout(() => {
            this.finalizarSimulado();
        }, 2000);
    }

    // Formatear tempo (HH:MM:SS ou MM:SS)
    formatarTempo(segundos) {
        const hours = Math.floor(segundos / 3600);
        const minutes = Math.floor((segundos % 3600) / 60);
        const secs = segundos % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    // Carregar questão específica
    carregarQuestao(index) {
        if (index < 0 || index >= SimuladoState.questoes.length) {
            return;
        }
        
        const questao = SimuladoState.questoes[index];
        SimuladoState.questaoAtual = index;
        
        // Registrar tempo gasto na questão anterior
        this.registrarTempoQuestao(index);
        
        // Atualizar display da questão atual
        this.atualizarDisplayQuestao(questao, index);
        
        // Atualizar navegação
        this.atualizarBotoesNavegacao();
        this.atualizarProgressoGeral();
        this.atualizarNavegacaoQuestoes();
        
        // Carregar resposta salva se existir
        this.carregarRespostaSalva(index);
        
        // Salvar estado
        this.salvarEstadoSimulado();
    }

    // Atualizar display da questão
    atualizarDisplayQuestao(questao, index) {
        // Número da questão atual
        const currentQuestion = document.getElementById('currentQuestion');
        if (currentQuestion) {
            currentQuestion.textContent = index + 1;
        }
        
        // Texto da questão
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.innerHTML = `
                <div class="question-header mb-3">
                    <span class="badge bg-secondary me-2">Questão ${index + 1}</span>
                    <span class="badge ${this.getCorDificuldade(questao.dificuldade)}">${questao.dificuldade}</span>
                    <span class="badge bg-info ms-2">${questao.materia}</span>
                </div>
                <div class="question-content">
                    ${questao.enunciado}
                    ${questao.imagem ? `<img src="${questao.imagem}" alt="Imagem da questão" class="img-fluid mt-3 rounded">` : ''}
                </div>
            `;
        }
        
        // Opções de resposta
        const questionOptions = document.getElementById('questionOptions');
        if (questionOptions) {
            questionOptions.innerHTML = this.gerarOpcoesResposta(questao, index);
        }
    }

    // Gerar opções de resposta
    gerarOpcoesResposta(questao, index) {
        const opcoes = ['a', 'b', 'c', 'd', 'e'];
        let html = '';
        
        opcoes.forEach(opcao => {
            if (questao.opcoes[opcao]) {
                html += `
                    <div class="form-check option-item" data-opcao="${opcao}">
                        <input class="form-check-input" type="radio" 
                               name="questao_resposta" 
                               id="opcao_${index}_${opcao}" 
                               value="${opcao}">
                        <label class="form-check-label w-100" for="opcao_${index}_${opcao}">
                            <strong>${opcao.toUpperCase()})</strong> ${questao.opcoes[opcao]}
                        </label>
                    </div>
                `;
            }
        });
        
        return html;
    }

    // Carregar resposta salva
    carregarRespostaSalva(index) {
        const respostaSalva = SimuladoState.respostas[index];
        if (respostaSalva) {
            const radio = document.querySelector(`input[name="questao_resposta"][value="${respostaSalva}"]`);
            if (radio) {
                radio.checked = true;
            }
        }
    }

    // Salvar resposta
    salvarResposta(questaoIndex, resposta) {
        // Registrar mudança de resposta para estatísticas
        if (SimuladoState.respostas[questaoIndex] && 
            SimuladoState.respostas[questaoIndex] !== resposta) {
            
            if (!SimuladoState.estatisticas.mudancas_resposta[questaoIndex]) {
                SimuladoState.estatisticas.mudancas_resposta[questaoIndex] = 0;
            }
            SimuladoState.estatisticas.mudancas_resposta[questaoIndex]++;
        }
        
        // Salvar resposta
        SimuladoState.respostas[questaoIndex] = resposta;
        
        // Atualizar visual da navegação
        this.atualizarNavegacaoQuestoes();
        
        // Auto-save
        this.salvarEstadoSimulado();
        
        // Feedback visual
        const opcaoElement = document.querySelector(`[data-opcao="${resposta}"]`);
        if (opcaoElement) {
            opcaoElement.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
            opcaoElement.style.borderColor = '#28a745';
            setTimeout(() => {
                opcaoElement.style.backgroundColor = '';
                opcaoElement.style.borderColor = '';
            }, 1000);
        }
    }

    // Ir para questão anterior
    questaoAnterior() {
        if (SimuladoState.questaoAtual > 0) {
            this.carregarQuestao(SimuladoState.questaoAtual - 1);
        }
    }

    // Ir para próxima questão
    proximaQuestao() {
        if (SimuladoState.questaoAtual < SimuladoState.questoes.length - 1) {
            this.carregarQuestao(SimuladoState.questaoAtual + 1);
        }
    }

    // Ir para questão específica
    irParaQuestao(index) {
        if (index >= 0 && index < SimuladoState.questoes.length) {
            this.carregarQuestao(index);
        }
    }

    // Pular questão
    pularQuestao() {
        // Registrar questão pulada
        if (!SimuladoState.estatisticas.questoes_puladas.includes(SimuladoState.questaoAtual)) {
            SimuladoState.estatisticas.questoes_puladas.push(SimuladoState.questaoAtual);
        }
        
        Notifications.info('Questão pulada');
        this.proximaQuestao();
    }
    // Gerar navegação das questões
    gerarNavegacaoQuestoes() {
        const questionsGrid = document.getElementById('questionsGrid');
        if (!questionsGrid) return;
        
        let html = '';
        for (let i = 0; i < SimuladoState.questoes.length; i++) {
            const status = this.getStatusQuestao(i);
            html += `
                <button class="question-nav-btn ${status}" 
                        data-questao="${i}" 
                        title="Questão ${i + 1}">
                    ${i + 1}
                </button>
            `;
        }
        
        questionsGrid.innerHTML = html;
    }

    // Obter status da questão para navegação
    getStatusQuestao(index) {
        if (index === SimuladoState.questaoAtual) {
            return 'current';
        } else if (SimuladoState.respostas[index]) {
            return 'answered';
        } else if (SimuladoState.estatisticas.questoes_puladas.includes(index)) {
            return 'skipped';
        } else {
            return '';
        }
    }

    // Atualizar navegação das questões
    atualizarNavegacaoQuestoes() {
        const buttons = document.querySelectorAll('.question-nav-btn');
        buttons.forEach((btn, index) => {
            btn.className = 