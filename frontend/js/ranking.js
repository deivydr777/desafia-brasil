/* ===================================
   DESAFIA BRASIL - RANKING JS
   Arquivo: ranking.js
   Sistema completo de ranking e leaderboards
   ================================== */

// Configurações do sistema de ranking
const RankingConfig = {
    // Paginação
    ITEMS_PER_PAGE: 50,
    LOAD_MORE_INCREMENT: 25,
    
    // Atualizações
    UPDATE_INTERVAL: 300000, // 5 minutos
    CACHE_DURATION: 600000,  // 10 minutos
    
    // Filtros disponíveis
    FILTROS_DISPONIBLES: {
        nacional: { nome: 'Nacional', endpoint: '/ranking/nacional' },
        estado: { nome: 'Por Estado', endpoint: '/ranking/estado' },
        cidade: { nome: 'Por Cidade', endpoint: '/ranking/cidade' },
        materia: { nome: 'Por Matéria', endpoint: '/ranking/materia' }
    },
    
    // Cores por posição
    CORES_POSICOES: {
        1: { bg: 'bg-warning', text: 'text-dark', icon: 'fa-crown' },
        2: { bg: 'bg-secondary', text: 'text-white', icon: 'fa-medal' },
        3: { bg: 'bg-warning', text: 'text-dark', icon: 'fa-award' }
    },
    
    // Materias para filtro
    MATERIAS: [
        { id: 'geral', nome: 'Ranking Geral' },
        { id: 'matematica', nome: 'Matemática' },
        { id: 'portugues', nome: 'Português' },
        { id: 'historia', nome: 'História' },
        { id: 'geografia', nome: 'Geografia' },
        { id: 'fisica', nome: 'Física' },
        { id: 'quimica', nome: 'Química' },
        { id: 'biologia', nome: 'Biologia' },
        { id: 'filosofia', nome: 'Filosofia' },
        { id: 'sociologia', nome: 'Sociologia' },
        { id: 'ingles', nome: 'Inglês' }
    ]
};

// Estado global do ranking
const RankingState = {
    tipoAtual: 'nacional',
    materiaAtual: 'geral',
    dadosCache: {},
    paginaAtual: 1,
    carregando: false,
    ultimaAtualizacao: null,
    posicaoUsuario: null,
    filtroAtivo: null
};

// Classe principal do sistema de ranking
class RankingSystem {
    constructor() {
        this.initEventListeners();
        this.verificarCacheExpirado();
    }

    // Inicializar event listeners
    initEventListeners() {
        // Tabs de filtro
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-bs-toggle="pill"]')) {
                const filtro = e.target.dataset.bsTarget?.replace('#', '');
                if (filtro) {
                    this.carregarRanking(filtro);
                }
            }
        });

        // Botão carregar mais
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.carregarMaisRanking());
        }

        // Filtro de matéria
        const subjectSelect = document.getElementById('subjectSelect');
        if (subjectSelect) {
            subjectSelect.addEventListener('change', (e) => {
                this.carregarRankingMateria(e.target.value);
            });
        }

        // Ordenação
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-sort]')) {
                const criterio = e.target.dataset.sort;
                this.ordenarRanking(criterio);
            }
        });

        // Refresh automático
        this.iniciarRefreshAutomatico();
    }

    // Verificar se cache expirou
    verificarCacheExpirado() {
        const ultimaAtualizacao = RankingState.ultimaAtualizacao;
        if (ultimaAtualizacao) {
            const tempoDecorrido = Date.now() - ultimaAtualizacao;
            if (tempoDecorrido > RankingConfig.CACHE_DURATION) {
                // Cache expirado, limpar
                RankingState.dadosCache = {};
            }
        }
    }

    // Iniciar refresh automático
    iniciarRefreshAutomatico() {
        setInterval(() => {
            if (document.visibilityState === 'visible' && !RankingState.carregando) {
                this.atualizarRankingSilencioso();
            }
        }, RankingConfig.UPDATE_INTERVAL);
    }
}
    // Carregar ranking por tipo
    async carregarRanking(tipo) {
        if (RankingState.carregando) return;

        try {
            RankingState.carregando = true;
            RankingState.tipoAtual = tipo;
            
            // Mostrar loading se não for atualização silenciosa
            this.mostrarLoading(true);

            // Verificar cache primeiro
            const chaveCache = `${tipo}_${RankingState.materiaAtual}`;
            const dadosCache = RankingState.dadosCache[chaveCache];
            
            if (dadosCache && this.isCacheValido(dadosCache.timestamp)) {
                this.exibirRanking(dadosCache.dados);
                return;
            }

            // Buscar dados da API
            const config = RankingConfig.FILTROS_DISPONIBLES[tipo];
            if (!config) {
                throw new Error(`Tipo de ranking inválido: ${tipo}`);
            }

            const endpoint = config.endpoint;
            const params = this.construirParametrosAPI(tipo);
            
            const response = await API.post(endpoint, params);

            if (!response.success) {
                throw new Error(response.error || 'Erro ao carregar ranking');
            }

            const dados = this.processarDadosRanking(response.data);
            
            // Salvar no cache
            RankingState.dadosCache[chaveCache] = {
                dados: dados,
                timestamp: Date.now()
            };
            
            // Exibir dados
            this.exibirRanking(dados);
            
            // Atualizar estatísticas gerais
            this.atualizarEstatisticasGerais(dados.estatisticas);
            
        } catch (error) {
            console.error('Erro ao carregar ranking:', error);
            this.exibirErroRanking(error.message);
        } finally {
            RankingState.carregando = false;
            this.mostrarLoading(false);
            RankingState.ultimaAtualizacao = Date.now();
        }
    }

    // Construir parâmetros para API
    construirParametrosAPI(tipo) {
        const usuario = User.getCurrentUser();
        const params = {
            usuario_id: usuario?.id,
            pagina: RankingState.paginaAtual,
            limite: RankingConfig.ITEMS_PER_PAGE
        };

        // Parâmetros específicos por tipo
        switch (tipo) {
            case 'estado':
                params.estado = usuario?.state;
                break;
            case 'cidade':
                params.estado = usuario?.state;
                params.cidade = usuario?.city;
                break;
            case 'materia':
                params.materia = RankingState.materiaAtual;
                break;
        }

        return params;
    }

    // Processar dados do ranking
    processarDadosRanking(dadosAPI) {
        return {
            ranking: dadosAPI.ranking || [],
            posicaoUsuario: dadosAPI.posicao_usuario || null,
            totalUsuarios: dadosAPI.total_usuarios || 0,
            estatisticas: dadosAPI.estatisticas || {},
            topTres: dadosAPI.ranking?.slice(0, 3) || [],
            proximosPagina: dadosAPI.proxima_pagina || false
        };
    }

    // Verificar se cache é válido
    isCacheValido(timestamp) {
        return (Date.now() - timestamp) < RankingConfig.CACHE_DURATION;
    }

    // Carregar ranking de matéria específica
    async carregarRankingMateria(materia) {
        RankingState.materiaAtual = materia;
        await this.carregarRanking('materia');
        
        // Mostrar/esconder filtro de matéria
        const subjectFilterRow = document.getElementById('subjectFilterRow');
        if (subjectFilterRow) {
            if (RankingState.tipoAtual === 'materia') {
                subjectFilterRow.classList.remove('d-none');
            } else {
                subjectFilterRow.classList.add('d-none');
            }
        }
    }

    // Carregar mais itens do ranking
    async carregarMaisRanking() {
        if (RankingState.carregando) return;

        try {
            RankingState.carregando = true;
            RankingState.paginaAtual++;

            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.disabled = true;
                loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Carregando...';
            }

            const chaveCache = `${RankingState.tipoAtual}_${RankingState.materiaAtual}`;
            const params = this.construirParametrosAPI(RankingState.tipoAtual);
            
            const config = RankingConfig.FILTROS_DISPONIBLES[RankingState.tipoAtual];
            const response = await API.post(config.endpoint, params);

            if (response.success && response.data.ranking) {
                const novosItens = response.data.ranking;
                
                // Adicionar aos dados existentes
                const dadosExistentes = RankingState.dadosCache[chaveCache];
                if (dadosExistentes) {
                    dadosExistentes.dados.ranking.push(...novosItens);
                    dadosExistentes.dados.proximosPagina = response.data.proxima_pagina;
                }

                // Adicionar à tabela
                this.adicionarItensTabela(novosItens);
                
                // Atualizar botão
                if (!response.data.proxima_pagina) {
                    loadMoreBtn.style.display = 'none';
                }
            }

        } catch (error) {
            console.error('Erro ao carregar mais ranking:', error);
            Notifications.error('Erro ao carregar mais dados');
        } finally {
            RankingState.carregando = false;
            
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.disabled = false;
                loadMoreBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Carregar Mais';
            }
        }
    }

    // Atualização silenciosa (sem loading visual)
    async atualizarRankingSilencioso() {
        try {
            const config = RankingConfig.FILTROS_DISPONIBLES[RankingState.tipoAtual];
            const params = { ...this.construirParametrosAPI(RankingState.tipoAtual), pagina: 1 };
            
            const response = await API.post(config.endpoint, params);
            
            if (response.success) {
                const dados = this.processarDadosRanking(response.data);
                const chaveCache = `${RankingState.tipoAtual}_${RankingState.materiaAtual}`;
                
                // Atualizar cache
                RankingState.dadosCache[chaveCache] = {
                    dados: dados,
                    timestamp: Date.now()
                };
                
                // Atualizar posição do usuário se mudou
                if (dados.posicaoUsuario !== RankingState.posicaoUsuario) {
                    this.notificarMudancaPosicao(dados.posicaoUsuario);
                    RankingState.posicaoUsuario = dados.posicaoUsuario;
                }
                
                RankingState.ultimaAtualizacao = Date.now();
            }
        } catch (error) {
            // Falha silenciosa, não mostrar erro
            console.log('Atualização silenciosa falhou:', error);
        }
    }
    // Exibir ranking na interface
    exibirRanking(dados) {
        // Atualizar posição do usuário
        this.atualizarPosicaoUsuario(dados.posicaoUsuario);
        
        // Atualizar pódium (top 3)
        this.atualizarPodium(dados.topTres);
        
        // Atualizar tabela principal
        this.atualizarTabelaRanking(dados.ranking);
        
        // Configurar botão "Carregar mais"
        this.configurarBotaoCarregarMais(dados.proximosPagina);
        
        // Reset página atual se for novo tipo
        RankingState.paginaAtual = 1;
    }

    // Atualizar posição do usuário
    atualizarPosicaoUsuario(posicaoUsuario) {
        if (!posicaoUsuario) return;

        // Atualizar card de posição do usuário
        const userPosition = document.getElementById('userPosition');
        if (userPosition) {
            userPosition.textContent = `#${posicaoUsuario.posicao}`;
        }

        const userNameRanking = document.getElementById('userNameRanking');
        if (userNameRanking) {
            userNameRanking.textContent = posicaoUsuario.nome;
        }

        const userTotalPoints = document.getElementById('userTotalPoints');
        if (userTotalPoints) {
            userTotalPoints.textContent = Utils.formatNumber(posicaoUsuario.pontos);
        }

        const userSimulados = document.getElementById('userSimulados');
        if (userSimulados) {
            userSimulados.textContent = posicaoUsuario.simulados_completos;
        }

        const userAverage = document.getElementById('userAverage');
        if (userAverage) {
            userAverage.textContent = `${posicaoUsuario.media}%`;
        }

        // Salvar posição atual
        RankingState.posicaoUsuario = posicaoUsuario.posicao;
    }

    // Atualizar pódium (top 3)
    atualizarPodium(topTres) {
        const posicoes = ['first', 'second', 'third'];
        
        topTres.forEach((usuario, index) => {
            const posicao = posicoes[index];
            
            // Nome
            const nameElement = document.getElementById(`${posicao}PlaceName`);
            if (nameElement) {
                nameElement.textContent = usuario.nome;
            }

            // Localização
            const locationElement = document.getElementById(`${posicao}PlaceLocation`);
            if (locationElement) {
                locationElement.textContent = `${usuario.cidade}, ${usuario.estado}`;
            }

            // Pontos
            const pointsElement = document.getElementById(`${posicao}PlacePoints`);
            if (pointsElement) {
                pointsElement.textContent = Utils.formatNumber(usuario.pontos);
            }

            // Simulados
            const simuladosElement = document.getElementById(`${posicao}PlaceSimulados`);
            if (simuladosElement) {
                simuladosElement.textContent = usuario.simulados_completos;
            }

            // Média
            const averageElement = document.getElementById(`${posicao}PlaceAverage`);
            if (averageElement) {
                averageElement.textContent = `${usuario.media}%`;
            }

            // Avatar
            const avatarElement = document.getElementById(`${posicao}PlaceAvatar`);
            if (avatarElement) {
                const iniciais = usuario.nome.split(' ')
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();
                avatarElement.textContent = iniciais;
            }
        });
    }

    // Atualizar tabela principal do ranking
    atualizarTabelaRanking(ranking) {
        const tbody = document.getElementById('rankingTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        ranking.forEach((usuario, index) => {
            const row = this.criarLinhaRanking(usuario, index);
            tbody.appendChild(row);
        });

        // Animar entrada das linhas
        this.animarEntradadaLinhas();
    }

    // Criar linha individual do ranking
    criarLinhaRanking(usuario, index) {
        const row = document.createElement('tr');
        
        // Destacar top 10
        if (usuario.posicao <= 10) {
            row.className = 'table-warning';
        }

        // Destacar usuário atual
        if (usuario.id === User.getCurrentUser()?.id) {
            row.className = 'table-primary';
        }

        // Determinar cor da posição
        const corPosicao = this.getCorPosicao(usuario.posicao);
        
        // Tendência (subiu/desceu)
        const tendencia = this.calcularTendencia(usuario);
        
        row.innerHTML = `
            <td class="ps-4 fw-bold">
                <div class="d-flex align-items-center">
                    <span class="position-number ${corPosicao.text}">#${usuario.posicao}</span>
                    ${usuario.posicao <= 3 ? `<i class="fas ${corPosicao.icon} ms-2 ${corPosicao.text}"></i>` : ''}
                </div>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="user-avatar-sm bg-primary text-white rounded-circle me-2">
                        ${this.gerarIniciais(usuario.nome)}
                    </div>
                    <div>
                        <span class="fw-bold">${usuario.nome}</span>
                        ${usuario.escola ? `<div class="small text-muted">${usuario.escola}</div>` : ''}
                    </div>
                </div>
            </td>
            <td class="text-muted">${usuario.cidade}, ${usuario.estado}</td>
            <td class="text-center fw-bold">${Utils.formatNumber(usuario.pontos)}</td>
            <td class="text-center">${usuario.media}%</td>
            <td class="text-center">${usuario.simulados_completos}</td>
            <td class="text-center">
                <i class="fas fa-arrow-${tendencia.direcao} text-${tendencia.cor}"></i>
            </td>
        `;
        
        return row;
    }

    // Adicionar itens à tabela (para carregar mais)
    adicionarItensTabela(novosItens) {
        const tbody = document.getElementById('rankingTableBody');
        if (!tbody) return;

        novosItens.forEach((usuario, index) => {
            const row = this.criarLinhaRanking(usuario, index);
            tbody.appendChild(row);
        });
    }

    // Gerar iniciais do nome
    gerarIniciais(nome) {
        return nome.split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }

    // Obter cor da posição
    getCorPosicao(posicao) {
        if (RankingConfig.CORES_POSICOES[posicao]) {
            return RankingConfig.CORES_POSICOES[posicao];
        }
        return { bg: '', text: 'text-dark', icon: '' };
    }

    // Calcular tendência (subiu/desceu)
    calcularTendencia(usuario) {
        // Simular tendência baseada na posição (em produção viria da API)
        const random = Math.random();
        
        if (random > 0.6) {
            return { direcao: 'up', cor: 'success' };
        } else if (random > 0.3) {
            return { direcao: 'down', cor: 'danger' };
        } else {
            return { direcao: 'right', cor: 'secondary' };
        }
    }

    // Animar entrada das linhas
    animarEntradadaLinhas() {
        const rows = document.querySelectorAll('#rankingTableBody tr');
        rows.forEach((row, index) => {
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                row.style.transition = 'all 0.3s ease-out';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    // Configurar botão carregar mais
    configurarBotaoCarregarMais(temProximaPagina) {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            if (temProximaPagina) {
                loadMoreBtn.style.display = 'block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
    }
    // Atualizar estatísticas gerais
    atualizarEstatisticasGerais(estatisticas) {
        if (!estatisticas) return;

        // Total de usuários
        const totalUsers = document.getElementById('totalUsers');
        if (totalUsers) {
            UI.animateCounter('totalUsers', estatisticas.total_usuarios || 50234);
        }

        // Total de simulados
        const totalSimulados = document.getElementById('totalSimulados');
        if (totalSimulados) {
            UI.animateCounter('totalSimulados', estatisticas.total_simulados || 120567);
        }

        // Total de questões
        const totalQuestions = document.getElementById('totalQuestions');
        if (totalQuestions) {
            UI.animateCounter('totalQuestions', estatisticas.total_questoes || 12456);
        }

        // Média de performance
        const avgPerformance = document.getElementById('avgPerformance');
        if (avgPerformance) {
            const media = estatisticas.media_nacional || 76.8;
            setTimeout(() => {
                avgPerformance.textContent = `${media}%`;
            }, 1000);
        }
    }

    // Notificar mudança de posição
    notificarMudancaPosicao(novaPosicao) {
        const posicaoAnterior = RankingState.posicaoUsuario;
        
        if (!posicaoAnterior || !novaPosicao) return;

        if (novaPosicao.posicao < posicaoAnterior) {
            // Subiu no ranking
            const posicoesMelhoradas = posicaoAnterior - novaPosicao.posicao;
            Notifications.success(
                `🎉 Parabéns! Você subiu ${posicoesMelhoradas} posição${posicoesMelhoradas > 1 ? 'ões' : ''} no ranking!`,
                8000
            );
        } else if (novaPosicao.posicao > posicaoAnterior) {
            // Desceu no ranking
            const posicoesPercidas = novaPosicao.posicao - posicaoAnterior;
            Notifications.warning(
                `Você desceu ${posicoesPercidas} posição${posicoesPercidas > 1 ? 'ões' : ''} no ranking. Continue estudando!`,
                6000
            );
        }
    }

    // Ordenar ranking por critério
    async ordenarRanking(criterio) {
        if (RankingState.carregando) return;

        try {
            this.mostrarLoading(true);
            
            const config = RankingConfig.FILTROS_DISPONIBLES[RankingState.tipoAtual];
            const params = {
                ...this.construirParametrosAPI(RankingState.tipoAtual),
                ordenar_por: criterio
            };
            
            const response = await API.post(config.endpoint, params);

            if (response.success) {
                const dados = this.processarDadosRanking(response.data);
                this.atualizarTabelaRanking(dados.ranking);
            }

        } catch (error) {
            console.error('Erro ao ordenar ranking:', error);
            Notifications.error('Erro ao ordenar ranking');
        } finally {
            this.mostrarLoading(false);
        }
    }

    // Mostrar loading
    mostrarLoading(mostrar) {
        const loadingElements = document.querySelectorAll('.ranking-loading');
        loadingElements.forEach(element => {
            if (mostrar) {
                element.classList.remove('d-none');
            } else {
                element.classList.add('d-none');
            }
        });

        // Loading na tabela
        const tbody = document.getElementById('rankingTableBody');
        if (tbody && mostrar) {
            tbody.innerHTML = this.gerarSkeletonLoading();
        }
    }

    // Gerar skeleton loading
    gerarSkeletonLoading() {
        let html = '';
        for (let i = 0; i < 10; i++) {
            html += `
                <tr>
                    <td class="ps-4"><div class="skeleton-text" style="width: 60px;"></div></td>
                    <td><div class="skeleton-text" style="width: 150px;"></div></td>
                    <td><div class="skeleton-text" style="width: 120px;"></div></td>
                    <td class="text-center"><div class="skeleton-text" style="width: 80px; margin: 0 auto;"></div></td>
                    <td class="text-center"><div class="skeleton-text" style="width: 60px; margin: 0 auto;"></div></td>
                    <td class="text-center"><div class="skeleton-text" style="width: 40px; margin: 0 auto;"></div></td>
                    <td class="text-center"><div class="skeleton-text" style="width: 30px; margin: 0 auto;"></div></td>
                </tr>
            `;
        }
        return html;
    }

    // Exibir erro no ranking
    exibirErroRanking(mensagem) {
        const tbody = document.getElementById('rankingTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="text-muted">
                            <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                            <div class="h5">Erro ao carregar ranking</div>
                            <div>${mensagem}</div>
                            <button class="btn btn-primary mt-3" onclick="rankingSystem.carregarRanking('${RankingState.tipoAtual}')">
                                <i class="fas fa-retry me-2"></i>Tentar Novamente
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }

        Notifications.error(`Erro no ranking: ${mensagem}`);
    }

    // Buscar usuário específico no ranking
    async buscarUsuario(termo) {
        if (!termo || termo.length < 3) {
            Notifications.warning('Digite pelo menos 3 caracteres para buscar');
            return;
        }

        try {
            this.mostrarLoading(true);
            
            const response = await API.post('/ranking/buscar', {
                termo: termo,
                tipo: RankingState.tipoAtual,
                materia: RankingState.materiaAtual
            });

            if (response.success) {
                if (response.data.usuarios.length === 0) {
                    Notifications.info('Nenhum usuário encontrado');
                } else {
                    this.exibirResultadosBusca(response.data.usuarios);
                }
            }

        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            Notifications.error('Erro ao buscar usuário');
        } finally {
            this.mostrarLoading(false);
        }
    }

    // Exibir resultados da busca
    exibirResultadosBusca(usuarios) {
        // Implementar modal ou overlay com resultados
        console.log('Resultados da busca:', usuarios);
        // Esta função pode ser expandida conforme necessário
    }

    // Compartilhar posição no ranking
    compartilharPosicao() {
        const usuario = User.getCurrentUser();
        const posicao = RankingState.posicaoUsuario;
        
        if (!usuario || !posicao) {
            Notifications.warning('Dados não disponíveis para compartilhamento');
            return;
        }

        const texto = `🏆 Estou na posição #${posicao} no ranking do Desafia Brasil! 📚 Venha estudar comigo!`;
        const url = window.location.href;

        if (navigator.share) {
            // API de compartilhamento nativa (mobile)
            navigator.share({
                title: 'Minha posição no Desafia Brasil',
                text: texto,
                url: url
            });
        } else {
            // Fallback para desktop
            this.mostrarOpcoesCompartilhamento(texto, url);
        }
    }

    // Mostrar opções de compartilhamento
    mostrarOpcoesCompartilhamento(texto, url) {
        const modal = `
            <div class="modal fade" id="shareModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Compartilhar Posição</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <p class="mb-4">${texto}</p>
                            <div class="d-grid gap-2">
                                <button class="btn btn-primary" onclick="rankingSystem.compartilharEm('whatsapp', '${encodeURIComponent(texto + ' ' + url)}')">
                                    <i class="fab fa-whatsapp me-2"></i>WhatsApp
                                </button>
                                <button class="btn btn-info" onclick="rankingSystem.compartilharEm('twitter', '${encodeURIComponent(texto + ' ' + url)}')">
                                    <i class="fab fa-twitter me-2"></i>Twitter
                                </button>
                                <button class="btn btn-dark" onclick="rankingSystem.copiarLink('${texto + ' ' + url}')">
                                    <i class="fas fa-copy me-2"></i>Copiar Link
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior
        const existingModal = document.getElementById('shareModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modal);
        const bootstrapModal = new bootstrap.Modal(document.getElementById('shareModal'));
        bootstrapModal.show();
    }

    // Compartilhar em rede social
    compartilharEm(rede, conteudo) {
        const urls = {
            whatsapp: `https://wa.me/?text=${conteudo}`,
            twitter: `https://twitter.com/intent/tweet?text=${conteudo}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`
        };

        if (urls[rede]) {
            window.open(urls[rede], '_blank', 'width=600,height=400');
        }
    }

    // Copiar link
    copiarLink(conteudo) {
        navigator.clipboard.writeText(conteudo).then(() => {
            Notifications.success('Link copiado para a área de transferência!');
            bootstrap.Modal.getInstance(document.getElementById('shareModal')).hide();
        }).catch(() => {
            Notifications.error('Erro ao copiar link');
        });
    }
}

// Inicializar sistema de ranking
const rankingSystem = new RankingSystem();

// Funções globais para compatibilidade
window.loadRanking = (tipo) => rankingSystem.carregarRanking(tipo);
window.loadMoreRanking = () => rankingSystem.carregarMaisRanking();
window.loadSubjectRanking = () => {
    const select = document.getElementById('subjectSelect');
    if (select) {
        rankingSystem.carregarRankingMateria(select.value);
    }
};
window.sortRanking = (criterio) => rankingSystem.ordenarRanking(criterio);
window.searchUser = (termo) => rankingSystem.buscarUsuario(termo);
window.sharePosition = () => rankingSystem.compartilharPosicao();

// CSS para skeleton loading
const skeletonStyle = document.createElement('style');
skeletonStyle.textContent = `
    .skeleton-text {
        height: 20px;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 4px;
    }
    
    @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
`;
document.head.appendChild(skeletonStyle);

// Exportar para uso global
window.RankingSystem = RankingSystem;
window.rankingSystem = rankingSystem;
