/* ===================================
   DESAFIA BRASIL - MAIN JS
   Arquivo: main.js
   JavaScript principal do sistema
   ================================== */

// Configurações globais do sistema
const CONFIG = {
    API_BASE_URL: 'https://api.desafiabrasil.com', // Substitua pela sua URL da API
    LOCAL_STORAGE_PREFIX: 'desafia_brasil_',
    VERSION: '1.0.0',
    DEBUG: true, // Mude para false em produção
    
    // Configurações de simulado
    SIMULADO: {
        TIME_WARNING_MINUTES: 5, // Aviso quando restam 5 minutos
        AUTO_SAVE_INTERVAL: 30000, // Auto-save a cada 30 segundos
        MAX_QUESTIONS_PER_SIMULADO: 90
    },
    
    // Configurações de notificação
    NOTIFICATIONS: {
        DURATION: 5000, // 5 segundos
        POSITION: 'top-end'
    }
};

// Estado global da aplicação
const AppState = {
    currentUser: null,
    isAuthenticated: false,
    currentSimulado: null,
    theme: 'light'
};

// Utility Functions
const Utils = {
    // Formatação de data
    formatDate: (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR');
    },
    
    // Formatação de data e hora
    formatDateTime: (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleString('pt-BR');
    },
    
    // Formatação de tempo (duração)
    formatDuration: (seconds) => {
        if (!seconds || seconds < 0) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    },
    
    // Formatação de números
    formatNumber: (num) => {
        if (!num) return '0';
        return new Intl.NumberFormat('pt-BR').format(num);
    },
    
    // Truncar texto
    truncateText: (text, maxLength = 100) => {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },
    
    // Gerar ID único
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    },
    
    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Throttle function
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};
// LocalStorage Management
const Storage = {
    // Salvar dados
    set: (key, value) => {
        try {
            const prefixedKey = CONFIG.LOCAL_STORAGE_PREFIX + key;
            localStorage.setItem(prefixedKey, JSON.stringify({
                data: value,
                timestamp: Date.now()
            }));
            return true;
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
            return false;
        }
    },
    
    // Recuperar dados
    get: (key, defaultValue = null) => {
        try {
            const prefixedKey = CONFIG.LOCAL_STORAGE_PREFIX + key;
            const item = localStorage.getItem(prefixedKey);
            
            if (!item) return defaultValue;
            
            const parsed = JSON.parse(item);
            return parsed.data || defaultValue;
        } catch (error) {
            console.error('Erro ao recuperar do localStorage:', error);
            return defaultValue;
        }
    },
    
    // Remover dados
    remove: (key) => {
        try {
            const prefixedKey = CONFIG.LOCAL_STORAGE_PREFIX + key;
            localStorage.removeItem(prefixedKey);
            return true;
        } catch (error) {
            console.error('Erro ao remover do localStorage:', error);
            return false;
        }
    },
    
    // Limpar todos os dados da aplicação
    clear: () => {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(CONFIG.LOCAL_STORAGE_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Erro ao limpar localStorage:', error);
            return false;
        }
    },
    
    // Verificar se uma chave existe
    exists: (key) => {
        const prefixedKey = CONFIG.LOCAL_STORAGE_PREFIX + key;
        return localStorage.getItem(prefixedKey) !== null;
    },
    
    // Obter tamanho usado pelo storage
    getSize: () => {
        let total = 0;
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
            if (key.startsWith(CONFIG.LOCAL_STORAGE_PREFIX)) {
                total += localStorage.getItem(key).length;
            }
        });
        
        return total;
    }
};
// API Communication
const API = {
    // Headers padrão
    getHeaders: () => {
        const headers = {
            'Content-Type': 'application/json',
            'X-App-Version': CONFIG.VERSION
        };
        
        // Adicionar token de autenticação se disponível
        const token = Storage.get('auth_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    },
    
    // Requisição GET
    get: async (endpoint) => {
        try {
            showLoading(true);
            
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: API.getHeaders()
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Erro na requisição');
            }
            
            return { success: true, data };
        } catch (error) {
            console.error('Erro na requisição GET:', error);
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    },
    
    // Requisição POST
    post: async (endpoint, data) => {
        try {
            showLoading(true);
            
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: API.getHeaders(),
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Erro na requisição');
            }
            
            return { success: true, data: result };
        } catch (error) {
            console.error('Erro na requisição POST:', error);
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    },
    
    // Requisição PUT
    put: async (endpoint, data) => {
        try {
            showLoading(true);
            
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers: API.getHeaders(),
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Erro na requisição');
            }
            
            return { success: true, data: result };
        } catch (error) {
            console.error('Erro na requisição PUT:', error);
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    },
    
    // Requisição DELETE
    delete: async (endpoint) => {
        try {
            showLoading(true);
            
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers: API.getHeaders()
            });
            
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'Erro na requisição');
            }
            
            return { success: true };
        } catch (error) {
            console.error('Erro na requisição DELETE:', error);
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }
};
// UI Functions
const UI = {
    // Mostrar/esconder loading
    showLoading: (show = true) => {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            if (show) {
                overlay.classList.remove('d-none');
            } else {
                overlay.classList.add('d-none');
            }
        }
    },
    
    // Mostrar modal
    showModal: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
            return bsModal;
        }
        return null;
    },
    
    // Esconder modal
    hideModal: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    },
    
    // Atualizar badge de notificação
    updateBadge: (elementId, count) => {
        const element = document.getElementById(elementId);
        if (element) {
            if (count > 0) {
                element.textContent = count > 99 ? '99+' : count;
                element.classList.remove('d-none');
            } else {
                element.classList.add('d-none');
            }
        }
    },
    
    // Animar contador
    animateCounter: (elementId, targetValue, duration = 2000) => {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const startValue = 0;
        const increment = targetValue / (duration / 16);
        let currentValue = startValue;
        
        const updateCounter = () => {
            currentValue += increment;
            if (currentValue < targetValue) {
                element.textContent = Math.floor(currentValue).toLocaleString('pt-BR');
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = targetValue.toLocaleString('pt-BR');
            }
        };
        
        updateCounter();
    },
    
    // Scroll suave para elemento
    scrollToElement: (elementId, offset = 0) => {
        const element = document.getElementById(elementId);
        if (element) {
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }
};

// Sistema de Notificações
const Notifications = {
    // Mostrar notificação
    show: (message, type = 'info', duration = CONFIG.NOTIFICATIONS.DURATION) => {
        // Criar elemento de notificação
        const notificationId = Utils.generateId();
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 400px;
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
        `;
        
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${Notifications.getIcon(type)} me-2"></i>
                <div class="flex-grow-1">${message}</div>
                <button type="button" class="btn-close" onclick="Notifications.hide('${notificationId}')"></button>
            </div>
        `;
        
        // Adicionar ao DOM
        document.body.appendChild(notification);
        
        // Remover automaticamente
        if (duration > 0) {
            setTimeout(() => {
                Notifications.hide(notificationId);
            }, duration);
        }
        
        return notificationId;
    },
    
    // Esconder notificação
    hide: (notificationId) => {
        const notification = document.getElementById(notificationId);
        if (notification) {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 150);
        }
    },
    
    // Obter ícone por tipo
    getIcon: (type) => {
        const icons = {
            success: 'fa-check-circle',
            danger: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            primary: 'fa-bell'
        };
        return icons[type] || icons.info;
    },
    
    // Métodos de conveniência
    success: (message, duration) => Notifications.show(message, 'success', duration),
    error: (message, duration) => Notifications.show(message, 'danger', duration),
    warning: (message, duration) => Notifications.show(message, 'warning', duration),
    info: (message, duration) => Notifications.show(message, 'info', duration)
};

// Alias global para funções comuns
window.showAlert = Notifications.show;
window.showLoading = UI.showLoading;
window.hideLoading = () => UI.showLoading(false);
// User Management
const User = {
    // Obter dados do usuário atual
    getCurrentUser: () => {
        return Storage.get('current_user');
    },
    
    // Definir usuário atual
    setCurrentUser: (userData) => {
        Storage.set('current_user', userData);
        AppState.currentUser = userData;
        AppState.isAuthenticated = true;
        
        // Atualizar UI
        User.updateUserUI(userData);
    },
    
    // Limpar dados do usuário
    clearCurrentUser: () => {
        Storage.remove('current_user');
        Storage.remove('auth_token');
        AppState.currentUser = null;
        AppState.isAuthenticated = false;
    },
    
    // Atualizar interface do usuário
    updateUserUI: (userData) => {
        // Atualizar nome do usuário
        const userNameElements = document.querySelectorAll('[data-user="name"]');
        userNameElements.forEach(element => {
            element.textContent = userData.name || 'Usuário';
        });
        
        // Atualizar avatar
        const userAvatarElements = document.querySelectorAll('[data-user="avatar"]');
        userAvatarElements.forEach(element => {
            const initials = userData.name ? 
                userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 
                'U';
            element.textContent = initials;
        });
        
        // Atualizar dados específicos se existirem
        if (userData.totalPoints) {
            const pointsElements = document.querySelectorAll('[data-user="points"]');
            pointsElements.forEach(element => {
                element.textContent = Utils.formatNumber(userData.totalPoints);
            });
        }
        
        if (userData.rankingPosition) {
            const rankingElements = document.querySelectorAll('[data-user="ranking"]');
            rankingElements.forEach(element => {
                element.textContent = `#${userData.rankingPosition}`;
            });
        }
    },
    
    // Verificar se usuário está logado
    isAuthenticated: () => {
        const token = Storage.get('auth_token');
        const user = Storage.get('current_user');
        return !!(token && user);
    },
    
    // Obter estatísticas do usuário
    getStats: () => {
        const user = User.getCurrentUser();
        if (!user) return null;
        
        return {
            totalPoints: user.totalPoints || 0,
            simuladosCompletos: user.simuladosCompletos || 0,
            averageScore: user.averageScore || 0,
            rankingPosition: user.rankingPosition || 0,
            currentStreak: user.currentStreak || 0,
            studyTime: user.studyTime || 0
        };
    }
};

// Authentication Helpers
const Auth = {
    // Verificar autenticação na página
    checkPageAuth: () => {
        if (!User.isAuthenticated()) {
            // Páginas que requerem autenticação
            const protectedPages = [
                'dashboard.html',
                'simulado.html',
                'perfil.html',
                'ranking.html'
            ];
            
            const currentPage = window.location.pathname.split('/').pop();
            
            if (protectedPages.includes(currentPage)) {
                window.location.href = 'login.html';
                return false;
            }
        }
        return true;
    },
    
    // Redirecionar baseado no status de autenticação
    redirectBasedOnAuth: () => {
        const currentPage = window.location.pathname.split('/').pop();
        
        if (User.isAuthenticated()) {
            // Se está logado e na página de login/cadastro, redirecionar para dashboard
            if (['login.html', 'cadastro.html', 'index.html'].includes(currentPage)) {
                window.location.href = 'dashboard.html';
                return;
            }
        } else {
            // Se não está logado e não está em página pública, redirecionar para login
            const publicPages = ['index.html', 'login.html', 'cadastro.html', 'ranking.html'];
            if (!publicPages.includes(currentPage)) {
                window.location.href = 'login.html';
                return;
            }
        }
    },
    
    // Logout
    logout: () => {
        // Limpar dados do usuário
        User.clearCurrentUser();
        
        // Mostrar mensagem
        Notifications.info('Você foi desconectado com sucesso!');
        
        // Redirecionar para página inicial
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
};

// Alias global para funções de autenticação
window.checkAuth = User.isAuthenticated;
window.getUserData = User.getCurrentUser;
window.logout = Auth.logout;
// Form Validation
const Validation = {
    // Validar email
    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    // Validar senha
    validatePassword: (password) => {
        return {
            isValid: password.length >= 6,
            minLength: password.length >= 6,
            hasLetter: /[a-zA-Z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
            strength: Validation.getPasswordStrength(password)
        };
    },
    
    // Calcular força da senha
    getPasswordStrength: (password) => {
        let score = 0;
        
        if (password.length >= 6) score += 1;
        if (password.length >= 10) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        
        return score;
    },
    
    // Validar nome
    validateFullName: (name) => {
        return name && name.trim().split(' ').length >= 2 && name.length >= 3;
    },
    
    // Validar campos obrigatórios de um formulário
    validateForm: (formElement) => {
        const requiredFields = formElement.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            const value = field.value.trim();
            const fieldType = field.type;
            
            // Remover classe de erro anterior
            field.classList.remove('is-invalid');
            
            // Validar baseado no tipo
            let fieldValid = true;
            
            if (!value) {
                fieldValid = false;
            } else if (fieldType === 'email' && !Validation.validateEmail(value)) {
                fieldValid = false;
            } else if (field.id === 'password' && !Validation.validatePassword(value).isValid) {
                fieldValid = false;
            } else if (field.id === 'fullName' && !Validation.validateFullName(value)) {
                fieldValid = false;
            }
            
            if (!fieldValid) {
                field.classList.add('is-invalid');
                isValid = false;
            }
        });
        
        return isValid;
    }
};

// Initialization Functions
const App = {
    // Inicializar aplicação
    init: () => {
        console.log('🚀 Desafia Brasil iniciado!');
        
        // Verificar autenticação
        Auth.checkPageAuth();
        
        // Inicializar componentes básicos
        App.initEventListeners();
        App.initUI();
        App.loadUserData();
        
        // Log de debug
        if (CONFIG.DEBUG) {
            console.log('Debug mode ativo');
            console.log('Usuário logado:', User.isAuthenticated());
            console.log('Storage size:', Storage.getSize(), 'bytes');
        }
    },
    
    // Inicializar event listeners globais
    initEventListeners: () => {
        // Logout buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="logout"]') || 
                e.target.closest('[data-action="logout"]')) {
                e.preventDefault();
                Auth.logout();
            }
        });
        
        // Form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.matches('form[data-validate="true"]')) {
                if (!Validation.validateForm(form)) {
                    e.preventDefault();
                    Notifications.error('Por favor, corrija os campos destacados.');
                }
            }
        });
        
        // Smooth scroll para âncoras
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href^="#"]')) {
                e.preventDefault();
                const target = e.target.getAttribute('href').substring(1);
                UI.scrollToElement(target, 80);
            }
        });
    },
    
    // Inicializar elementos da UI
    initUI: () => {
        // Atualizar ano no footer
        const yearElements = document.querySelectorAll('[data-year]');
        yearElements.forEach(element => {
            element.textContent = new Date().getFullYear();
        });
        
        // Inicializar tooltips do Bootstrap
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
        
        // Inicializar popovers do Bootstrap
        const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
        popoverTriggerList.map(function (popoverTriggerEl) {
            return new bootstrap.Popover(popoverTriggerEl);
        });
    },
    
    // Carregar dados do usuário se logado
    loadUserData: () => {
        if (User.isAuthenticated()) {
            const userData = User.getCurrentUser();
            User.updateUserUI(userData);
        }
    }
};

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', App.init);

// Exportar para uso global
window.App = App;
window.Utils = Utils;
window.Storage = Storage;
window.API = API;
window.UI = UI;
window.Notifications = Notifications;
window.User = User;
window.Validation = Validation;
