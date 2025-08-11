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
            btn.className = `question-nav-btn ${this.getStatusQuestao(index)}`;
        });
    }

    // Atualizar botões de navegação
    atualizarBotoesNavegacao() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const finishBtn = document.getElementById('finishBtn');
        
        // Botão anterior
        if (prevBtn) {
            prevBtn.disabled = SimuladoState.questaoAtual === 0;
        }
        
        // Botão próximo/finalizar
        if (SimuladoState.questaoAtual === SimuladoState.questoes.length - 1) {
            // Última questão - mostrar botão finalizar
            if (nextBtn) nextBtn.classList.add('d-none');
            if (finishBtn) finishBtn.classList.remove('d-none');
        } else {
            // Questões intermediárias - mostrar botão próximo
            if (nextBtn) nextBtn.classList.remove('d-none');
            if (finishBtn) finishBtn.classList.add('d-none');
        }
    }

    // Atualizar progresso geral
    atualizarProgressoGeral() {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            const questoesRespondidas = Object.keys(SimuladoState.respostas).length;
            const totalQuestoes = SimuladoState.questoes.length;
            const progresso = (questoesRespondidas / totalQuestoes) * 100;
            
            progressBar.style.width = `${progresso}%`;
            progressBar.setAttribute('aria-valuenow', progresso);
        }
        
        // Atualizar contador de questões respondidas
        const contador = document.getElementById('questionsAnswered');
        if (contador) {
            contador.textContent = Object.keys(SimuladoState.respostas).length;
        }
    }

    // Registrar tempo gasto na questão
    registrarTempoQuestao(questaoIndex) {
        if (SimuladoState.tempoInicioQuestao) {
            const tempoGasto = Date.now() - SimuladoState.tempoInicioQuestao;
            SimuladoState.estatisticas.tempo_por_questao[questaoIndex] = tempoGasto;
        }
        SimuladoState.tempoInicioQuestao = Date.now();
    }
    // Iniciar auto-save
    iniciarAutoSave() {
        if (SimuladoState.autoSaveTimer) {
            clearInterval(SimuladoState.autoSaveTimer);
        }
        
        SimuladoState.autoSaveTimer = setInterval(() => {
            this.salvarEstadoSimulado();
        }, SimuladoConfig.AUTO_SAVE_INTERVAL);
    }

    // Salvar estado do simulado
    salvarEstadoSimulado() {
        const estadoCompleto = {
            simulado: SimuladoState.atual,
            questoes: SimuladoState.questoes,
            respostas: SimuladoState.respostas,
            questaoAtual: SimuladoState.questaoAtual,
            tempoRestante: SimuladoState.tempoRestante,
            pausado: SimuladoState.pausado,
            finalizado: SimuladoState.finalizado,
            estatisticas: SimuladoState.estatisticas,
            salvoEm: new Date().toISOString()
        };
        
        Storage.set('simulado_atual', estadoCompleto);
        
        // Log de debug
        if (CONFIG.DEBUG) {
            console.log('Estado do simulado salvo automaticamente');
        }
    }

    // Carregar simulado salvo
    carregarSimuladoSalvo(estadoSalvo) {
        try {
            // Restaurar estado
            SimuladoState.atual = estadoSalvo.simulado;
            SimuladoState.questoes = estadoSalvo.questoes;
            SimuladoState.respostas = estadoSalvo.respostas;
            SimuladoState.questaoAtual = estadoSalvo.questaoAtual;
            SimuladoState.tempoRestante = estadoSalvo.tempoRestante;
            SimuladoState.pausado = estadoSalvo.pausado;
            SimuladoState.finalizado = estadoSalvo.finalizado;
            SimuladoState.estatisticas = estadoSalvo.estatisticas;
            
            // Mostrar interface
            this.mostrarTelaSimulado();
            this.carregarQuestao(SimuladoState.questaoAtual);
            this.gerarNavegacaoQuestoes();
            
            // Iniciar timer se não estiver pausado
            if (!SimuladoState.pausado) {
                this.iniciarTimer();
            }
            
            this.iniciarAutoSave();
            
            Notifications.success('Simulado carregado com sucesso!');
            
        } catch (error) {
            console.error('Erro ao carregar simulado salvo:', error);
            Storage.remove('simulado_atual');
            Notifications.error('Erro ao carregar simulado salvo. Iniciando novo simulado.');
        }
    }

    // Limpar dados salvos
    limparSimuladoSalvo() {
        Storage.remove('simulado_atual');
        
        // Limpar timers
        if (SimuladoState.timer) {
            clearInterval(SimuladoState.timer);
        }
        
        if (SimuladoState.autoSaveTimer) {
            clearInterval(SimuladoState.autoSaveTimer);
        }
        
        // Reset do estado
        SimuladoState.atual = null;
        SimuladoState.questoes = [];
        SimuladoState.respostas = {};
        SimuladoState.tempoRestante = 0;
        SimuladoState.pausado = false;
        SimuladoState.finalizado = false;
        SimuladoState.questaoAtual = 0;
        SimuladoState.estatisticas = {
            tempo_por_questao: {},
            mudancas_resposta: {},
            questoes_puladas: []
        };
    }
    // Finalizar simulado
    async finalizarSimulado() {
        // Confirmação se nem todas as questões foram respondidas
        const questoesRespondidas = Object.keys(SimuladoState.respostas).length;
        const totalQuestoes = SimuladoState.questoes.length;
        
        if (questoesRespondidas < totalQuestoes) {
            const naoRespondidas = totalQuestoes - questoesRespondidas;
            const confirmar = confirm(
                `Você ainda tem ${naoRespondidas} questão${naoRespondidas > 1 ? 'ões' : ''} sem resposta. ` +
                `Deseja realmente finalizar o simulado?`
            );
            
            if (!confirmar) {
                return;
            }
        }

        try {
            showLoading(true);
            
            // Parar timers
            if (SimuladoState.timer) {
                clearInterval(SimuladoState.timer);
            }
            if (SimuladoState.autoSaveTimer) {
                clearInterval(SimuladoState.autoSaveTimer);
            }

            // Marcar como finalizado
            SimuladoState.finalizado = true;
            SimuladoState.atual.finalizado_em = new Date().toISOString();
            
            // Calcular tempo total gasto
            const tempoTotalGasto = SimuladoState.atual.tempo_configurado - SimuladoState.tempoRestante;
            
            // Preparar dados para envio
            const dadosFinalizacao = {
                simulado_id: SimuladoState.atual.id,
                usuario_id: User.getCurrentUser()?.id,
                respostas: SimuladoState.respostas,
                tempo_gasto: tempoTotalGasto,
                finalizado_em: SimuladoState.atual.finalizado_em,
                estatisticas: SimuladoState.estatisticas,
                config: SimuladoState.atual.config
            };

            // Enviar para API
            const response = await API.post('/simulados/finalizar', dadosFinalizacao);
            
            if (!response.success) {
                throw new Error(response.error || 'Erro ao processar resultados');
            }

            // Processar resultados
            const resultados = response.data;
            this.exibirResultados(resultados);
            
            // Limpar simulado salvo
            this.limparSimuladoSalvo();
            
        } catch (error) {
            console.error('Erro ao finalizar simulado:', error);
            
            // Em caso de erro, processar localmente
            const resultadosLocal = this.processarResultadosLocal();
            this.exibirResultados(resultadosLocal);
            
            Notifications.warning('Simulado finalizado localmente. Conecte-se à internet para sincronizar.');
        } finally {
            showLoading(false);
        }
    }

    // Processar resultados localmente (fallback)
    processarResultadosLocal() {
        const questoesRespondidas = Object.keys(SimuladoState.respostas).length;
        const totalQuestoes = SimuladoState.questoes.length;
        let acertos = 0;
        let pontuacaoTotal = 0;
        const detalhes = [];

        // Calcular acertos e pontuação
        SimuladoState.questoes.forEach((questao, index) => {
            const respostaUsuario = SimuladoState.respostas[index];
            const acertou = respostaUsuario === questao.resposta_correta;
            
            if (acertou) {
                acertos++;
                pontuacaoTotal += SimuladoConfig.PONTOS[questao.dificuldade] || 10;
            }
            
            detalhes.push({
                questao_numero: index + 1,
                questao_id: questao.id,
                materia: questao.materia,
                dificuldade: questao.dificuldade,
                resposta_usuario: respostaUsuario || null,
                resposta_correta: questao.resposta_correta,
                acertou: acertou,
                pontos: acertou ? (SimuladoConfig.PONTOS[questao.dificuldade] || 10) : 0,
                tempo_gasto: SimuladoState.estatisticas.tempo_por_questao[index] || 0
            });
        });

        const percentualAcerto = totalQuestoes > 0 ? Math.round((acertos / totalQuestoes) * 100) : 0;

        return {
            acertos: acertos,
            erros: totalQuestoes - acertos,
            nao_respondidas: totalQuestoes - questoesRespondidas,
            total_questoes: totalQuestoes,
            percentual: percentualAcerto,
            pontuacao: pontuacaoTotal,
            tempo_gasto: SimuladoState.atual.tempo_configurado - SimuladoState.tempoRestante,
            detalhes: detalhes,
            desempenho_por_materia: this.calcularDesempenhoPorMateria(detalhes),
            nivel_desempenho: this.determinarNivelDesempenho(percentualAcerto)
        };
    }

    // Calcular desempenho por matéria
    calcularDesempenhoPorMateria(detalhes) {
        const materias = {};
        
        detalhes.forEach(item => {
            if (!materias[item.materia]) {
                materias[item.materia] = {
                    total: 0,
                    acertos: 0,
                    percentual: 0
                };
            }
            
            materias[item.materia].total++;
            if (item.acertou) {
                materias[item.materia].acertos++;
            }
        });
        
        // Calcular percentuais
        Object.keys(materias).forEach(materia => {
            const dados = materias[materia];
            dados.percentual = dados.total > 0 ? Math.round((dados.acertos / dados.total) * 100) : 0;
        });
        
        return materias;
    }

    // Determinar nível de desempenho
    determinarNivelDesempenho(percentual) {
        if (percentual >= 90) return { nivel: 'Excelente', cor: 'success', emoji: '🏆' };
        if (percentual >= 80) return { nivel: 'Muito Bom', cor: 'primary', emoji: '🌟' };
        if (percentual >= 70) return { nivel: 'Bom', cor: 'info', emoji: '👍' };
        if (percentual >= 60) return { nivel: 'Regular', cor: 'warning', emoji: '⚠️' };
        return { nivel: 'Precisa Melhorar', cor: 'danger', emoji: '📚' };
    }
    // Exibir resultados
    exibirResultados(resultados) {
        // Esconder tela do quiz
        const quizScreen = document.getElementById('quizScreen');
        if (quizScreen) {
            quizScreen.classList.add('d-none');
        }
        
        // Mostrar tela de resultados
        const resultsScreen = document.getElementById('resultsScreen');
        if (resultsScreen) {
            resultsScreen.classList.remove('d-none');
        }
        
        // Atualizar dados principais
        this.atualizarResultadosPrincipais(resultados);
        
        // Atualizar detalhes
        this.atualizarDetalhesResultados(resultados);
        
        // Efeito de animação
        this.animarResultados();
        
        // Salvar no histórico
        this.salvarNoHistorico(resultados);
        
        // Atualizar estatísticas do usuário
        this.atualizarEstatisticasUsuario(resultados);
    }

    // Atualizar resultados principais
    atualizarResultadosPrincipais(resultados) {
        // Score final
        const finalScore = document.getElementById('finalScore');
        if (finalScore) {
            finalScore.textContent = `${resultados.percentual}%`;
            finalScore.className = `display-2 fw-bold ${this.getCorPorcentual(resultados.percentual)}`;
        }
        
        // Detalhes do score
        const scoreDetails = document.getElementById('scoreDetails');
        if (scoreDetails) {
            scoreDetails.textContent = `${resultados.acertos} de ${resultados.total_questoes} questões corretas`;
        }
        
        // Estatísticas
        const correctAnswers = document.getElementById('correctAnswers');
        if (correctAnswers) {
            correctAnswers.textContent = resultados.acertos;
        }
        
        const wrongAnswers = document.getElementById('wrongAnswers');
        if (wrongAnswers) {
            wrongAnswers.textContent = resultados.erros;
        }
        
        const pointsEarned = document.getElementById('pointsEarned');
        if (pointsEarned) {
            pointsEarned.textContent = resultados.pontuacao;
        }
        
        // Ícone e mensagem de desempenho
        const resultsIcon = document.querySelector('.results-icon i');
        const nivelDesempenho = resultados.nivel_desempenho || this.determinarNivelDesempenho(resultados.percentual);
        
        if (resultsIcon) {
            resultsIcon.className = `fas fa-trophy fa-4x text-${nivelDesempenho.cor}`;
        }
        
        // Mensagem personalizada
        this.exibirMensagemPersonalizada(resultados.percentual, nivelDesempenho);
    }

    // Exibir mensagem personalizada
    exibirMensagemPersonalizada(percentual, nivel) {
        const mensagens = {
            'Excelente': ['Parabéns! Performance excepcional! 🏆', 'Você está no caminho certo para a aprovação!'],
            'Muito Bom': ['Ótimo trabalho! Continue assim! 🌟', 'Você tem um bom domínio das matérias!'],
            'Bom': ['Bom desempenho! Com mais estudo chegará lá! 👍', 'Continue praticando para melhorar ainda mais!'],
            'Regular': ['Desempenho regular. Foque nas suas dificuldades! ⚠️', 'Identifique os pontos fracos e estude mais!'],
            'Precisa Melhorar': ['Não desanime! Todo mundo tem seu ritmo! 📚', 'Use este resultado como motivação para estudar mais!']
        };
        
        const mensagem = mensagens[nivel.nivel];
        if (mensagem) {
            setTimeout(() => {
                Notifications.show(
                    `<strong>${mensagem[0]}</strong><br><small>${mensagem[1]}</small>`,
                    nivel.cor,
                    6000
                );
            }, 1000);
        }
    }

    // Atualizar detalhes dos resultados
    atualizarDetalhesResultados(resultados) {
        const detailedResults = document.getElementById('detailedResults');
        if (!detailedResults) return;
        
        let html = '<div class="row">';
        
        // Desempenho por matéria
        html += '<div class="col-md-6 mb-4">';
        html += '<h6 class="fw-bold mb-3">Desempenho por Matéria</h6>';
        
        Object.keys(resultados.desempenho_por_materia).forEach(materia => {
            const dados = resultados.desempenho_por_materia[materia];
            const cor = this.getCorPorcentual(dados.percentual);
            
            html += `
                <div class="mb-3">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="fw-bold">${materia.charAt(0).toUpperCase() + materia.slice(1)}</span>
                        <span class="text-${cor}">${dados.percentual}% (${dados.acertos}/${dados.total})</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-${cor}" style="width: ${dados.percentual}%"></div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Estatísticas adicionais
        html += '<div class="col-md-6 mb-4">';
        html += '<h6 class="fw-bold mb-3">Estatísticas</h6>';
        html += `
            <div class="stats-list">
                <div class="stat-item d-flex justify-content-between mb-2">
                    <span>Tempo Total:</span>
                    <strong>${this.formatarTempo(Math.floor(resultados.tempo_gasto / 1000))}</strong>
                </div>
                <div class="stat-item d-flex justify-content-between mb-2">
                    <span>Tempo por Questão:</span>
                    <strong>${this.formatarTempo(Math.floor(resultados.tempo_gasto / (resultados.total_questoes * 1000)))}</strong>
                </div>
                <div class="stat-item d-flex justify-content-between mb-2">
                    <span>Questões Puladas:</span>
                    <strong>${SimuladoState.estatisticas.questoes_puladas.length}</strong>
                </div>
                <div class="stat-item d-flex justify-content-between mb-2">
                    <span>Mudanças de Resposta:</span>
                    <strong>${Object.values(SimuladoState.estatisticas.mudancas_resposta).reduce((a, b) => a + b, 0)}</strong>
                </div>
            </div>
        `;
        html += '</div>';
        
        html += '</div>';
        
        detailedResults.innerHTML = html;
    }

    // Obter cor baseada no percentual
    getCorPorcentual(percentual) {
        if (percentual >= 90) return 'success';
        if (percentual >= 80) return 'primary';
        if (percentual >= 70) return 'info';
        if (percentual >= 60) return 'warning';
        return 'danger';
    }

    // Animar resultados
    animarResultados() {
        // Animar contador de pontuação
        const scoreElement = document.getElementById('finalScore');
        if (scoreElement) {
            const targetScore = parseInt(scoreElement.textContent);
            let currentScore = 0;
            const increment = targetScore / 50;
            
            const countAnimation = setInterval(() => {
                currentScore += increment;
                if (currentScore >= targetScore) {
                    scoreElement.textContent = `${targetScore}%`;
                    clearInterval(countAnimation);
                } else {
                    scoreElement.textContent = `${Math.floor(currentScore)}%`;
                }
            }, 30);
        }
        
        // Efeito de confete para bons resultados
        const percentual = parseInt(document.getElementById('finalScore')?.textContent || '0');
        if (percentual >= 80) {
            this.mostrarConfete();
        }
    }

    // Mostrar efeito de confete
    mostrarConfete() {
        // Criar elementos de confete
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confete = document.createElement('div');
                confete.style.cssText = `
                    position: fixed;
                    top: -10px;
                    left: ${Math.random() * 100}vw;
                    width: 10px;
                    height: 10px;
                    background: ${['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'][Math.floor(Math.random() * 5)]};
                    z-index: 9999;
                    animation: confete-fall 3s linear forwards;
                `;
                
                document.body.appendChild(confete);
                
                setTimeout(() => {
                    confete.remove();
                }, 3000);
            }, i * 50);
        }
    }
    // Salvar no histórico
    salvarNoHistorico(resultados) {
        let historico = Storage.get('simulados_historico', []);
        
        const novoRegistro = {
            id: SimuladoState.atual.id,
            data: new Date().toISOString(),
            config: SimuladoState.atual.config,
            resultados: resultados,
            tempo_gasto: resultados.tempo_gasto
        };
        
        historico.unshift(novoRegistro);
        
        // Manter apenas os últimos 50 simulados
        historico = historico.slice(0, 50);
        
        Storage.set('simulados_historico', historico);
    }

    // Atualizar estatísticas do usuário
    atualizarEstatisticasUsuario(resultados) {
        const userData = User.getCurrentUser();
        if (!userData) return;
        
        // Incrementar simulados completos
        userData.simuladosCompletos = (userData.simuladosCompletos || 0) + 1;
        
        // Atualizar pontos
        userData.totalPoints = (userData.totalPoints || 0) + resultados.pontuacao;
        
        // Recalcular média
        const simuladosAnteriores = userData.simuladosCompletos - 1;
        const mediaAnterior = userData.averageScore || 0;
        const novaMedia = ((mediaAnterior * simuladosAnteriores) + resultados.percentual) / userData.simuladosCompletos;
        userData.averageScore = Math.round(novaMedia * 10) / 10;
        
        // Atualizar tempo de estudo (em horas)
        const horasGastas = resultados.tempo_gasto / (1000 * 60 * 60);
        userData.studyTime = (userData.studyTime || 0) + Math.round(horasGastas * 10) / 10;
        
        // Atualizar streak (verificar se estudou hoje)
        const hoje = new Date().toDateString();
        const ultimoEstudo = userData.lastStudyDate;
        
        if (!ultimoEstudo || ultimoEstudo !== hoje) {
            const ontem = new Date();
            ontem.setDate(ontem.getDate() - 1);
            
            if (ultimoEstudo === ontem.toDateString()) {
                // Estudou ontem, manter streak
                userData.currentStreak = (userData.currentStreak || 0) + 1;
            } else {
                // Quebrou streak
                userData.currentStreak = 1;
            }
            
            userData.lastStudyDate = hoje;
        }
        
        // Salvar dados atualizados
        User.setCurrentUser(userData);
        
        // Enviar para API
        this.sincronizarEstatisticas(userData);
    }

    // Sincronizar estatísticas com API
    async sincronizarEstatisticas(userData) {
        try {
            await API.put('/users/statistics', {
                simulados_completos: userData.simuladosCompletos,
                total_points: userData.totalPoints,
                average_score: userData.averageScore,
                study_time: userData.studyTime,
                current_streak: userData.currentStreak,
                last_study_date: userData.lastStudyDate
            });
        } catch (error) {
            console.error('Erro ao sincronizar estatísticas:', error);
            // Não mostrar erro para não atrapalhar a experiência
        }
    }

    // Iniciar novo simulado
    novoSimulado() {
        // Limpar estado atual
        this.limparSimuladoSalvo();
        
        // Voltar para tela de seleção
        const resultsScreen = document.getElementById('resultsScreen');
        const selectionScreen = document.getElementById('selectionScreen');
        
        if (resultsScreen) {
            resultsScreen.classList.add('d-none');
        }
        
        if (selectionScreen) {
            selectionScreen.classList.remove('d-none');
        }
    }

    // Revisar respostas
    revisarRespostas() {
        // Implementar modal de revisão
        const modalHtml = `
            <div class="modal fade" id="reviewModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Revisão de Respostas</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="reviewContent">
                            ${this.gerarHtmlRevisao()}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remover modal anterior se existir
        const existingModal = document.getElementById('reviewModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Adicionar novo modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('reviewModal'));
        modal.show();
    }

    // Gerar HTML para revisão
    gerarHtmlRevisao() {
        let html = '';
        
        SimuladoState.questoes.forEach((questao, index) => {
            const respostaUsuario = SimuladoState.respostas[index];
            const acertou = respostaUsuario === questao.resposta_correta;
            
            html += `
                <div class="question-review mb-4 p-3 border rounded ${acertou ? 'border-success' : respostaUsuario ? 'border-danger' : 'border-warning'}">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6>Questão ${index + 1} - ${questao.materia}</h6>
                        <span class="badge ${acertou ? 'bg-success' : respostaUsuario ? 'bg-danger' : 'bg-warning'}">
                            ${acertou ? 'Acertou' : respostaUsuario ? 'Errou' : 'Não respondeu'}
                        </span>
                    </div>
                    
                    <p>${questao.enunciado}</p>
                    
                    <div class="options-review">
                        ${Object.keys(questao.opcoes).map(opcao => `
                            <div class="option-review p-2 mb-1 rounded ${
                                opcao === questao.resposta_correta ? 'bg-success bg-opacity-10 border border-success' :
                                opcao === respostaUsuario && opcao !== questao.resposta_correta ? 'bg-danger bg-opacity-10 border border-danger' :
                                'bg-light'
                            }">
                                <strong>${opcao.toUpperCase()})</strong> ${questao.opcoes[opcao]}
                                ${opcao === questao.resposta_correta ? '<i class="fas fa-check text-success ms-2"></i>' : ''}
                                ${opcao === respostaUsuario && opcao !== questao.resposta_correta ? '<i class="fas fa-times text-danger ms-2"></i>' : ''}
                            </div>
                        `).join('')}
                    </div>
                    
                    ${questao.explicacao ? `
                        <div class="explanation mt-3 p-3 bg-info bg-opacity-10 rounded">
                            <strong>Explicação:</strong><br>
                            ${questao.explicacao}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        return html;
    }
}

// Inicializar sistema de simulados
const simuladoSystem = new SimuladoSystem();

// Funções globais para compatibilidade
window.initializeSimulado = (config) => simuladoSystem.inicializarSimulado(config);
window.pauseSimulado = () => simuladoSystem.pausarSimulado();
window.resumeSimulado = () => simuladoSystem.retomarSimulado();
window.finishSimulado = () => simuladoSystem.finalizarSimulado();
window.startNewSimulado = () => simuladoSystem.novoSimulado();
window.reviewAnswers = () => simuladoSystem.revisarRespostas();
window.skipQuestion = () => simuladoSystem.pularQuestao();
window.nextQuestion = () => simuladoSystem.proximaQuestao();
window.previousQuestion = () => simuladoSystem.questaoAnterior();
window.quitSimulado = () => {
    if (confirm('Tem certeza que deseja sair do simulado? Todo o progresso será perdido.')) {
        simuladoSystem.limparSimuladoSalvo();
        window.location.href = 'dashboard.html';
    }
};

// CSS para animação de confete
const style = document.createElement('style');
style.textContent = `
    @keyframes confete-fall {
        0% { transform: translateY(-100vh) rotate(0deg); }
        100% { transform: translateY(100vh) rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Exportar para uso global
window.SimuladoSystem = SimuladoSystem;
window.simuladoSystem = simuladoSystem;
