/* ===================================
   DESAFIA BRASIL - ADMIN JS
   Arquivo: admin.js
   Sistema completo do painel administrativo
   ================================== */

// Configurações do painel admin
const AdminConfig = {
    // Paginação
    ITEMS_PER_PAGE: 20,
    
    // Refresh automático
    AUTO_REFRESH_INTERVAL: 60000, // 1 minuto
    
    // Tipos de conteúdo
    CONTENT_TYPES: {
        questions: { nome: 'Questões', endpoint: '/admin/questions' },
        users: { nome: 'Usuários', endpoint: '/admin/users' },
        simulados: { nome: 'Simulados', endpoint: '/admin/simulados' },
        reports: { nome: 'Relatórios', endpoint: '/admin/reports' }
    },
    
    // Status disponíveis
    STATUS_OPTIONS: {
        active: { nome: 'Ativo', cor: 'success' },
        inactive: { nome: 'Inativo', cor: 'secondary' },
        pending: { nome: 'Pendente', cor: 'warning' },
        banned: { nome: 'Banido', cor: 'danger' }
    },
    
    // Níveis de dificuldade
    DIFFICULTY_LEVELS: {
        facil: { nome: 'Fácil', cor: 'success', pontos: 10 },
        medio: { nome: 'Médio', cor: 'warning', pontos: 15 },
        dificil: { nome: 'Difícil', cor: 'danger', pontos: 25 }
    },
    
    // Tipos de ação para logs
    ACTION_TYPES: {
        CREATE: 'create',
        UPDATE: 'update',
        DELETE: 'delete',
        LOGIN: 'login',
        LOGOUT: 'logout',
        BAN: 'ban',
        UNBAN: 'unban'
    }
};

// Estado global do admin
const AdminState = {
    currentSection: 'dashboard',
    currentPage: 1,
    currentFilters: {},
    selectedItems: [],
    isLoading: false,
    lastUpdate: null,
    statistics: {}
};

// Classe principal do sistema administrativo
class AdminSystem {
    constructor() {
        this.initEventListeners();
        this.checkAdminAuth();
        this.initializeCharts();
    }

    // Verificar autenticação de admin
    checkAdminAuth() {
        const userData = User.getCurrentUser();
        if (!userData || !userData.isAdmin) {
            Notifications.error('Acesso negado. Você não possui permissões de administrador.');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            return false;
        }
        return true;
    }

    // Inicializar event listeners
    initEventListeners() {
        // Navegação entre seções
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-section]')) {
                e.preventDefault();
                const section = e.target.dataset.section;
                this.showSection(section);
            }
        });

        // Formulário de nova questão
        const addQuestionForm = document.getElementById('addQuestionForm');
        if (addQuestionForm) {
            addQuestionForm.addEventListener('submit', (e) => this.handleAddQuestion(e));
        }

        // Seleção em massa
        document.addEventListener('change', (e) => {
            if (e.target.matches('.item-checkbox')) {
                this.handleItemSelection(e.target);
            } else if (e.target.matches('.select-all-checkbox')) {
                this.handleSelectAll(e.target);
            }
        });

        // Filtros
        document.addEventListener('change', (e) => {
            if (e.target.matches('.admin-filter')) {
                this.applyFilters();
            }
        });

        // Ações em massa
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-bulk-action]')) {
                const action = e.target.dataset.bulkAction;
                this.handleBulkAction(action);
            }
        });
    }

    // Mostrar seção específica
    showSection(sectionName) {
        // Esconder todas as seções
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.add('d-none');
        });
        
        // Mostrar seção selecionada
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.remove('d-none');
        }
        
        // Atualizar navegação ativa
        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Carregar dados da seção
        AdminState.currentSection = sectionName;
        this.loadSectionData(sectionName);
    }

    // Carregar dados de uma seção
    async loadSectionData(section) {
        switch (section) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'questions':
                await this.loadQuestionsData();
                break;
            case 'users':
                await this.loadUsersData();
                break;
            case 'simulados':
                await this.loadSimuladosData();
                break;
            case 'reports':
                await this.loadReportsData();
                break;
        }
    }
}
    // Carregar dados do dashboard
    async loadDashboardData() {
        try {
            AdminState.isLoading = true;
            this.showSectionLoading('dashboard', true);

            const response = await API.get('/admin/dashboard/stats');
            
            if (response.success) {
                const stats = response.data;
                AdminState.statistics = stats;
                
                this.updateDashboardStats(stats);
                this.updateDashboardCharts(stats);
                this.loadRecentActivity();
            }

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            this.showError('Erro ao carregar dados do dashboard');
        } finally {
            AdminState.isLoading = false;
            this.showSectionLoading('dashboard', false);
        }
    }

    // Atualizar estatísticas do dashboard
    updateDashboardStats(stats) {
        // Total de usuários
        const totalUsersElement = document.getElementById('totalUsersCount');
        if (totalUsersElement) {
            UI.animateCounter('totalUsersCount', stats.total_usuarios || 0);
        }

        // Total de questões
        const totalQuestionsElement = document.getElementById('totalQuestionsCount');
        if (totalQuestionsElement) {
            UI.animateCounter('totalQuestionsCount', stats.total_questoes || 0);
        }

        // Total de simulados
        const totalSimuladosElement = document.getElementById('totalSimuladosCount');
        if (totalSimuladosElement) {
            UI.animateCounter('totalSimuladosCount', stats.total_simulados || 0);
        }

        // Média nacional
        const avgPerformanceElement = document.getElementById('avgPerformanceCount');
        if (avgPerformanceElement) {
            setTimeout(() => {
                avgPerformanceElement.textContent = `${stats.media_nacional || 0}%`;
            }, 1000);
        }
    }

    // Inicializar gráficos
    initializeCharts() {
        // Gráfico de usuários ativos
        this.initUsersChart();
        
        // Gráfico de matérias
        this.initSubjectsChart();
        
        // Gráfico de performance por estado
        this.initStatesChart();
        
        // Gráfico de crescimento
        this.initGrowthChart();
    }

    // Inicializar gráfico de usuários
    initUsersChart() {
        const ctx = document.getElementById('usersChart');
        if (!ctx) return;

        this.usersChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Usuários Ativos',
                    data: [],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    // Inicializar gráfico de matérias
    initSubjectsChart() {
        const ctx = document.getElementById('subjectsChart');
        if (!ctx) return;

        this.subjectsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    // Atualizar gráficos do dashboard
    updateDashboardCharts(stats) {
        // Atualizar gráfico de usuários
        if (this.usersChart && stats.usuarios_por_dia) {
            this.usersChart.data.labels = stats.usuarios_por_dia.labels;
            this.usersChart.data.datasets[0].data = stats.usuarios_por_dia.data;
            this.usersChart.update();
        }

        // Atualizar gráfico de matérias
        if (this.subjectsChart && stats.materias_populares) {
            this.subjectsChart.data.labels = stats.materias_populares.labels;
            this.subjectsChart.data.datasets[0].data = stats.materias_populares.data;
            this.subjectsChart.update();
        }
    }

    // Carregar atividade recente
    async loadRecentActivity() {
        try {
            const response = await API.get('/admin/activity/recent');
            
            if (response.success) {
                this.displayRecentActivity(response.data.activities);
            }

        } catch (error) {
            console.error('Erro ao carregar atividade recente:', error);
        }
    }

    // Exibir atividade recente
    displayRecentActivity(activities) {
        const container = document.getElementById('recentAdminActivity');
        if (!container) return;

        const html = activities.map(activity => `
            <div class="activity-item d-flex align-items-center py-2 border-bottom">
                <div class="activity-icon me-3">
                    <i class="fas ${this.getActivityIcon(activity.type)} text-${this.getActivityColor(activity.type)}"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="fw-bold">${activity.description}</div>
                    <small class="text-muted">${Utils.formatDateTime(activity.created_at)}</small>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    // Obter ícone da atividade
    getActivityIcon(type) {
        const icons = {
            create: 'fa-plus',
            update: 'fa-edit',
            delete: 'fa-trash',
            login: 'fa-sign-in-alt',
            logout: 'fa-sign-out-alt',
            ban: 'fa-ban',
            unban: 'fa-check'
        };
        return icons[type] || 'fa-info';
    }

    // Obter cor da atividade
    getActivityColor(type) {
        const colors = {
            create: 'success',
            update: 'primary',
            delete: 'danger',
            login: 'info',
            logout: 'secondary',
            ban: 'danger',
            unban: 'success'
        };
        return colors[type] || 'primary';
    }
    // Carregar dados das questões
    async loadQuestionsData() {
        try {
            AdminState.isLoading = true;
            this.showSectionLoading('questions', true);

            const params = {
                page: AdminState.currentPage,
                limit: AdminConfig.ITEMS_PER_PAGE,
                ...AdminState.currentFilters
            };

            const response = await API.post('/admin/questions/list', params);
            
            if (response.success) {
                this.displayQuestions(response.data.questions);
                this.updatePagination(response.data.pagination);
            }

        } catch (error) {
            console.error('Erro ao carregar questões:', error);
            this.showError('Erro ao carregar questões');
        } finally {
            AdminState.isLoading = false;
            this.showSectionLoading('questions', false);
        }
    }

    // Exibir questões na tabela
    displayQuestions(questions) {
        const tbody = document.getElementById('questionsTableBody');
        if (!tbody) return;

        const html = questions.map(question => `
            <tr>
                <td class="ps-4">
                    <input type="checkbox" class="form-check-input item-checkbox" value="${question.id}">
                    #${question.id}
                </td>
                <td>
                    <div class="question-preview">
                        ${Utils.truncateText(question.enunciado, 100)}
                    </div>
                </td>
                <td>
                    <span class="badge bg-primary">${question.materia}</span>
                </td>
                <td>
                    <span class="badge ${this.getDifficultyColor(question.dificuldade)}">
                        ${question.dificuldade}
                    </span>
                </td>
                <td>${question.fonte || 'GERAL'}</td>
                <td>
                    <span class="badge ${this.getStatusColor(question.status)}">
                        ${AdminConfig.STATUS_OPTIONS[question.status]?.nome || question.status}
                    </span>
                </td>
                <td class="text-center">
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="adminSystem.editQuestion(${question.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn view" onclick="adminSystem.viewQuestion(${question.id})" title="Visualizar">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn delete" onclick="adminSystem.deleteQuestion(${question.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    // Manipular adição de nova questão
    async handleAddQuestion(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const questionData = {
            materia: formData.get('newQuestionSubject'),
            dificuldade: formData.get('newQuestionDifficulty'),
            enunciado: formData.get('newQuestionText'),
            opcoes: {
                a: formData.get('optionA'),
                b: formData.get('optionB'),
                c: formData.get('optionC'),
                d: formData.get('optionD'),
                e: formData.get('optionE')
            },
            resposta_correta: formData.get('correctAnswer'),
            fonte: formData.get('questionSource'),
            explicacao: formData.get('questionExplanation')
        };

        // Validação básica
        if (!this.validateQuestionData(questionData)) {
            return;
        }

        try {
            this.showFormLoading(true);

            const response = await API.post('/admin/questions/create', questionData);
            
            if (response.success) {
                Notifications.success('Questão adicionada com sucesso!');
                
                // Fechar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addQuestionModal'));
                if (modal) {
                    modal.hide();
                }
                
                // Limpar formulário
                form.reset();
                
                // Recarregar lista
                this.loadQuestionsData();
                
                // Log da ação
                this.logAction(AdminConfig.ACTION_TYPES.CREATE, 'question', response.data.id);
            }

        } catch (error) {
            console.error('Erro ao adicionar questão:', error);
            Notifications.error('Erro ao adicionar questão. Tente novamente.');
        } finally {
            this.showFormLoading(false);
        }
    }

    // Validar dados da questão
    validateQuestionData(data) {
        if (!data.materia || !data.dificuldade || !data.enunciado) {
            Notifications.error('Por favor, preencha todos os campos obrigatórios.');
            return false;
        }

        if (!data.resposta_correta || !['a', 'b', 'c', 'd', 'e'].includes(data.resposta_correta)) {
            Notifications.error('Por favor, selecione uma resposta correta válida.');
            return false;
        }

        // Verificar se todas as opções foram preenchidas
        const opcoes = Object.values(data.opcoes);
        if (opcoes.some(opcao => !opcao || opcao.trim() === '')) {
            Notifications.error('Por favor, preencha todas as alternativas.');
            return false;
        }

        return true;
    }

    // Editar questão
    async editQuestion(questionId) {
        try {
            const response = await API.get(`/admin/questions/${questionId}`);
            
            if (response.success) {
                this.showEditQuestionModal(response.data);
            }

        } catch (error) {
            console.error('Erro ao carregar questão:', error);
            Notifications.error('Erro ao carregar dados da questão');
        }
    }

    // Visualizar questão
    async viewQuestion(questionId) {
        try {
            const response = await API.get(`/admin/questions/${questionId}`);
            
            if (response.success) {
                this.showViewQuestionModal(response.data);
            }

        } catch (error) {
            console.error('Erro ao carregar questão:', error);
            Notifications.error('Erro ao carregar questão');
        }
    }

    // Excluir questão
    async deleteQuestion(questionId) {
        if (!confirm('Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            const response = await API.delete(`/admin/questions/${questionId}`);
            
            if (response.success) {
                Notifications.success('Questão excluída com sucesso!');
                this.loadQuestionsData();
                
                // Log da ação
                this.logAction(AdminConfig.ACTION_TYPES.DELETE, 'question', questionId);
            }

        } catch (error) {
            console.error('Erro ao excluir questão:', error);
            Notifications.error('Erro ao excluir questão');
        }
    }

    // Obter cor da dificuldade
    getDifficultyColor(difficulty) {
        const colors = {
            facil: 'bg-success',
            medio: 'bg-warning',
            dificil: 'bg-danger'
        };
        return colors[difficulty] || 'bg-secondary';
    }

    // Obter cor do status
    getStatusColor(status) {
        const statusConfig = AdminConfig.STATUS_OPTIONS[status];
        return statusConfig ? `bg-${statusConfig.cor}` : 'bg-secondary';
    }
    // Carregar dados dos usuários
    async loadUsersData() {
        try {
            AdminState.isLoading = true;
            this.showSectionLoading('users', true);

            const params = {
                page: AdminState.currentPage,
                limit: AdminConfig.ITEMS_PER_PAGE,
                ...AdminState.currentFilters
            };

            const response = await API.post('/admin/users/list', params);
            
            if (response.success) {
                this.displayUsers(response.data.users);
                this.updatePagination(response.data.pagination);
            }

        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            this.showError('Erro ao carregar usuários');
        } finally {
            AdminState.isLoading = false;
            this.showSectionLoading('users', false);
        }
    }

    // Exibir usuários na tabela
    displayUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        const html = users.map(user => `
            <tr ${user.status === 'banned' ? 'class="table-danger"' : ''}>
                <td class="ps-4">
                    <input type="checkbox" class="form-check-input item-checkbox" value="${user.id}">
                    #${user.id}
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="user-avatar-sm bg-primary text-white rounded-circle me-2">
                            ${this.getUserInitials(user.name)}
                        </div>
                        <div>
                            <div class="fw-bold">${user.name}</div>
                            ${user.school ? `<small class="text-muted">${user.school}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${user.city}, ${user.state}</td>
                <td class="text-center">${user.simulados_completos || 0}</td>
                <td class="text-center">${Utils.formatNumber(user.total_points || 0)}</td>
                <td>${Utils.formatDate(user.created_at)}</td>
                <td class="text-center">
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="adminSystem.viewUser(${user.id})" title="Visualizar">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="adminSystem.editUser(${user.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${user.status !== 'banned' ? 
                            `<button class="action-btn ban" onclick="adminSystem.banUser(${user.id})" title="Banir">
                                <i class="fas fa-ban"></i>
                            </button>` :
                            `<button class="action-btn view" onclick="adminSystem.unbanUser(${user.id})" title="Desbanir">
                                <i class="fas fa-check"></i>
                            </button>`
                        }
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    // Obter iniciais do usuário
    getUserInitials(name) {
        return name.split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }

    // Visualizar usuário
    async viewUser(userId) {
        try {
            const response = await API.get(`/admin/users/${userId}`);
            
            if (response.success) {
                this.showUserDetailsModal(response.data);
            }

        } catch (error) {
            console.error('Erro ao carregar usuário:', error);
            Notifications.error('Erro ao carregar dados do usuário');
        }
    }

    // Mostrar modal de detalhes do usuário
    showUserDetailsModal(user) {
        const modalHtml = `
            <div class="modal fade" id="userDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Detalhes do Usuário</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="fw-bold">Informações Pessoais</h6>
                                    <p><strong>Nome:</strong> ${user.name}</p>
                                    <p><strong>E-mail:</strong> ${user.email}</p>
                                    <p><strong>Localização:</strong> ${user.city}, ${user.state}</p>
                                    <p><strong>Escola:</strong> ${user.school || 'Não informado'}</p>
                                    <p><strong>Cadastro:</strong> ${Utils.formatDateTime(user.created_at)}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="fw-bold">Estatísticas</h6>
                                    <p><strong>Simulados:</strong> ${user.simulados_completos || 0}</p>
                                    <p><strong>Pontos:</strong> ${Utils.formatNumber(user.total_points || 0)}</p>
                                    <p><strong>Média:</strong> ${user.average_score || 0}%</p>
                                    <p><strong>Ranking:</strong> #${user.ranking_position || 'N/A'}</p>
                                    <p><strong>Último Login:</strong> ${Utils.formatDateTime(user.last_login)}</p>
                                </div>
                            </div>
                            
                            <div class="mt-4">
                                <h6 class="fw-bold">Histórico de Simulados</h6>
                                <div id="userSimuladosHistory">
                                    <!-- Será carregado via AJAX -->
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior se existir
        const existingModal = document.getElementById('userDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
        modal.show();

        // Carregar histórico de simulados
        this.loadUserSimuladosHistory(user.id);
    }

    // Carregar histórico de simulados do usuário
    async loadUserSimuladosHistory(userId) {
        try {
            const response = await API.get(`/admin/users/${userId}/simulados`);
            
            if (response.success) {
                const container = document.getElementById('userSimuladosHistory');
                if (container) {
                    const html = response.data.simulados.map(simulado => `
                        <div class="border rounded p-2 mb-2">
                            <div class="d-flex justify-content-between">
                                <span><strong>${simulado.materia}</strong> - ${simulado.questoes} questões</span>
                                <span class="badge bg-${simulado.score >= 70 ? 'success' : 'warning'}">${simulado.score}%</span>
                            </div>
                            <small class="text-muted">${Utils.formatDateTime(simulado.completed_at)}</small>
                        </div>
                    `).join('');
                    
                    container.innerHTML = html || '<p class="text-muted">Nenhum simulado encontrado.</p>';
                }
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    }

    // Banir usuário
    async banUser(userId) {
        const reason = prompt('Motivo do banimento (opcional):');
        if (reason === null) return; // Cancelou

        try {
            const response = await API.post(`/admin/users/${userId}/ban`, {
                reason: reason
            });
            
            if (response.success) {
                Notifications.success('Usuário banido com sucesso!');
                this.loadUsersData();
                
                // Log da ação
                this.logAction(AdminConfig.ACTION_TYPES.BAN, 'user', userId);
            }

        } catch (error) {
            console.error('Erro ao banir usuário:', error);
            Notifications.error('Erro ao banir usuário');
        }
    }

    // Desbanir usuário
    async unbanUser(userId) {
        if (!confirm('Tem certeza que deseja desbanir este usuário?')) {
            return;
        }

        try {
            const response = await API.post(`/admin/users/${userId}/unban`);
            
            if (response.success) {
                Notifications.success('Usuário desbanido com sucesso!');
                this.loadUsersData();
                
                // Log da ação
                this.logAction(AdminConfig.ACTION_TYPES.UNBAN, 'user', userId);
            }

        } catch (error) {
            console.error('Erro ao desbanir usuário:', error);
            Notifications.error('Erro ao desbanir usuário');
        }
    }
    // Manipular seleção de item
    handleItemSelection(checkbox) {
        const itemId = checkbox.value;
        
        if (checkbox.checked) {
            if (!AdminState.selectedItems.includes(itemId)) {
                AdminState.selectedItems.push(itemId);
            }
        } else {
            AdminState.selectedItems = AdminState.selectedItems.filter(id => id !== itemId);
        }
        
        this.updateBulkActions();
    }

    // Manipular seleção de todos
    handleSelectAll(checkbox) {
        const itemCheckboxes = document.querySelectorAll('.item-checkbox');
        
        itemCheckboxes.forEach(item => {
            item.checked = checkbox.checked;
        });
        
        if (checkbox.checked) {
            AdminState.selectedItems = Array.from(itemCheckboxes).map(cb => cb.value);
        } else {
            AdminState.selectedItems = [];
        }
        
        this.updateBulkActions();
    }

    // Atualizar ações em massa
    updateBulkActions() {
        const bulkActionsContainer = document.querySelector('.bulk-actions');
        const selectedCount = AdminState.selectedItems.length;
        
        if (bulkActionsContainer) {
            const countElement = bulkActionsContainer.querySelector('.selected-count');
            if (countElement) {
                countElement.textContent = `${selectedCount} item${selectedCount !== 1 ? 'ns' : ''} selecionado${selectedCount !== 1 ? 's' : ''}`;
            }
            
            if (selectedCount > 0) {
                bulkActionsContainer.classList.remove('d-none');
            } else {
                bulkActionsContainer.classList.add('d-none');
            }
        }
    }

    // Manipular ação em massa
    async handleBulkAction(action) {
        if (AdminState.selectedItems.length === 0) {
            Notifications.warning('Selecione pelo menos um item.');
            return;
        }

        const itemsCount = AdminState.selectedItems.length;
        let confirmMessage = '';
        
        switch (action) {
            case 'delete':
                confirmMessage = `Tem certeza que deseja excluir ${itemsCount} item${itemsCount > 1 ? 'ns' : ''}?`;
                break;
            case 'activate':
                confirmMessage = `Tem certeza que deseja ativar ${itemsCount} item${itemsCount > 1 ? 'ns' : ''}?`;
                break;
            case 'deactivate':
                confirmMessage = `Tem certeza que deseja desativar ${itemsCount} item${itemsCount > 1 ? 'ns' : ''}?`;
                break;
            default:
                confirmMessage = `Executar ação '${action}' em ${itemsCount} item${itemsCount > 1 ? 'ns' : ''}?`;
        }

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            showLoading(true);
            
            const endpoint = this.getBulkActionEndpoint(action);
            const response = await API.post(endpoint, {
                items: AdminState.selectedItems,
                action: action
            });
            
            if (response.success) {
                Notifications.success(`Ação executada em ${itemsCount} item${itemsCount > 1 ? 'ns' : ''} com sucesso!`);
                
                // Limpar seleção
                AdminState.selectedItems = [];
                this.updateBulkActions();
                
                // Recarregar dados
                this.loadSectionData(AdminState.currentSection);
            }

        } catch (error) {
            console.error('Erro na ação em massa:', error);
            Notifications.error('Erro ao executar ação em massa');
        } finally {
            showLoading(false);
        }
    }

    // Obter endpoint para ação em massa
    getBulkActionEndpoint(action) {
        const section = AdminState.currentSection;
        return `/admin/${section}/bulk-${action}`;
    }

    // Aplicar filtros
    applyFilters() {
        const filterElements = document.querySelectorAll('.admin-filter');
        const filters = {};
        
        filterElements.forEach(element => {
            if (element.value && element.value !== '') {
                filters[element.name] = element.value;
            }
        });
        
        AdminState.currentFilters = filters;
        AdminState.currentPage = 1;
        
        this.loadSectionData(AdminState.currentSection);
    }

    // Atualizar paginação
    updatePagination(pagination) {
        const paginationContainer = document.querySelector('.pagination-container');
        if (!paginationContainer || !pagination) return;

        let html = '<nav><ul class="pagination justify-content-center">';
        
        // Botão anterior
        html += `
            <li class="page-item ${pagination.current_page <= 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="adminSystem.goToPage(${pagination.current_page - 1})" ${pagination.current_page <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
            </li>
        `;
        
        // Páginas
        for (let i = 1; i <= pagination.total_pages; i++) {
            if (i === pagination.current_page || 
                i === 1 || 
                i === pagination.total_pages || 
                (i >= pagination.current_page - 2 && i <= pagination.current_page + 2)) {
                
                html += `
                    <li class="page-item ${i === pagination.current_page ? 'active' : ''}">
                        <button class="page-link" onclick="adminSystem.goToPage(${i})">${i}</button>
                    </li>
                `;
            } else if (i === pagination.current_page - 3 || i === pagination.current_page + 3) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }
        
        // Botão próximo
        html += `
            <li class="page-item ${pagination.current_page >= pagination.total_pages ? 'disabled' : ''}">
                <button class="page-link" onclick="adminSystem.goToPage(${pagination.current_page + 1})" ${pagination.current_page >= pagination.total_pages ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </li>
        `;
        
        html += '</ul></nav>';
        paginationContainer.innerHTML = html;
    }

    // Ir para página específica
    goToPage(page) {
        AdminState.currentPage = page;
        this.loadSectionData(AdminState.currentSection);
    }

    // Mostrar loading da seção
    showSectionLoading(section, show) {
        const loadingElement = document.querySelector(`#${section}-section .section-loading`);
        if (loadingElement) {
            if (show) {
                loadingElement.classList.remove('d-none');
            } else {
                loadingElement.classList.add('d-none');
            }
        }
    }

    // Mostrar loading do formulário
    showFormLoading(show) {
        const submitButtons = document.querySelectorAll('.modal form button[type="submit"]');
        
        submitButtons.forEach(button => {
            if (show) {
                button.disabled = true;
                button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';
            } else {
                button.disabled = false;
                button.innerHTML = button.dataset.originalText || 'Salvar';
            }
        });
    }

    // Mostrar erro
    showError(message) {
        Notifications.error(message);
    }

    // Log de ação administrativa
    async logAction(action, type, itemId, details = {}) {
        try {
            await API.post('/admin/logs/action', {
                action: action,
                type: type,
                item_id: itemId,
                details: details,
                admin_id: User.getCurrentUser()?.id,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Erro ao registrar log:', error);
            // Não mostrar erro para não atrapalhar a experiência
        }
    }

    // Exportar dados
    async exportData(type, format = 'excel') {
        try {
            showLoading(true);
            
            const response = await API.post('/admin/export', {
                type: type,
                format: format,
                filters: AdminState.currentFilters
            });
            
            if (response.success) {
                // Criar link de download
                const link = document.createElement('a');
                link.href = response.data.download_url;
                link.download = response.data.filename;
                link.click();
                
                Notifications.success('Dados exportados com sucesso!');
            }

        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            Notifications.error('Erro ao exportar dados');
        } finally {
            showLoading(false);
        }
    }
}

// Inicializar sistema administrativo
const adminSystem = new AdminSystem();

// Funções globais para compatibilidade
window.showAdminSection = (section) => adminSystem.showSection(section);
window.showAddQuestionModal = () => UI.showModal('addQuestionModal');
window.exportUsers = () => adminSystem.exportData('users');
window.exportQuestions = () => adminSystem.exportData('questions');
window.loadMoreData = () => adminSystem.goToPage(AdminState.currentPage + 1);

// Exportar para uso global
window.AdminSystem = AdminSystem;
window.adminSystem = adminSystem;
