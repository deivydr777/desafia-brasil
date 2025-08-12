/* ===================================
   DESAFIA BRASIL - SISTEMA DE AUTENTICAÇÃO
   Plataforma Educacional Nacional
   Desenvolvido para impactar estudantes brasileiros
   ================================== */

// Configurações de autenticação
const AuthConfig = {
    API_BASE_URL: 'https://desafia-brasil.onrender.com',
    TOKEN_EXPIRY_HOURS: 24,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    PASSWORD_MIN_LENGTH: 6
};

// Estado de autenticação
const AuthState = {
    isLogging: false,
    loginAttempts: 0,
    lastAttempt: null,
    isLocked: false
};

// Sistema principal de autenticação
class AuthSystem {
    constructor() {
        this.initEventListeners();
        this.checkLockoutStatus();
    }

    // Métodos de armazenamento seguros
    setStorageItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Erro ao salvar dados:', e);
        }
    }

    getStorageItem(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Erro ao recuperar dados:', e);
            return null;
        }
    }

    removeStorageItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Erro ao remover dados:', e);
        }
    }
    // Salvar dados de autenticação do usuário
    saveAuthData(userData, token, rememberMe = false) {
        console.log('Salvando dados de autenticação do usuário...');
        
        // Compatibilidade com diferentes sistemas de verificação
        this.setStorageItem('authToken', token);
        this.setStorageItem('userToken', token);
        this.setStorageItem('user', userData);
        
        if (rememberMe) {
            this.setStorageItem('remember_user', true);
        }

        console.log('Dados de usuário salvos com sucesso:', {
            authToken: token ? 'Configurado' : 'Não configurado',
            userToken: token ? 'Configurado' : 'Não configurado',
            user: userData ? userData.nome || userData.name : 'Não encontrado'
        });
    }

    // Limpar dados de autenticação
    clearAuthData() {
        this.removeStorageItem('authToken');
        this.removeStorageItem('userToken');
        this.removeStorageItem('user');
        this.removeStorageItem('remember_user');
        this.removeStorageItem('auth_lockout');
        console.log('Dados de autenticação limpos');
    }

    // Verificar se usuário está autenticado
    isAuthenticated() {
        const authToken = this.getStorageItem('authToken');
        const userToken = this.getStorageItem('userToken');
        const user = this.getStorageItem('user');
        
        return (authToken || userToken) && user;
    }

    // Configurar event listeners
    initEventListeners() {
        // Formulário de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Formulário de registro
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Verificador de força da senha
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => this.checkPasswordStrength(e));
        }

        // Confirmação de senha
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', (e) => this.validatePasswordMatch(e));
        }

        // Recuperação de senha
        const sendResetBtn = document.getElementById('sendResetBtn');
        if (sendResetBtn) {
            sendResetBtn.addEventListener('click', () => this.handleForgotPassword());
        }
    }
    // Processar login do usuário
    async handleLogin(event) {
        event.preventDefault();
        
        if (AuthState.isLocked) {
            this.showAlert('error', 'Conta temporariamente bloqueada. Tente novamente mais tarde.');
            return;
        }

        if (AuthState.isLogging) {
            return;
        }

        const form = event.target;
        const formData = new FormData(form);
        const email = formData.get('email')?.trim();
        const password = formData.get('password');
        const rememberMe = formData.get('rememberMe') === 'on';

        if (!this.validateLoginForm(email, password)) {
            return;
        }

        AuthState.isLogging = true;
        this.showLoginLoading(true);

        try {
            // Autenticar via API do Desafia Brasil
            const response = await this.performLogin(email, password, rememberMe);
            
            if (response.success) {
                await this.handleSuccessfulLogin(response.data, rememberMe);
            } else {
                this.handleFailedLogin(response.error);
            }

        } catch (error) {
            console.error('Erro no processo de autenticação:', error);
            this.showAlert('error', 'Erro interno. Tente novamente mais tarde.');
            this.handleFailedLogin('Erro interno do servidor');
        } finally {
            AuthState.isLogging = false;
            this.showLoginLoading(false);
        }
    }

    // Autenticar usuário via API
    async performLogin(email, password, rememberMe) {
        try {
            console.log('Autenticando usuário:', email);
            
            const response = await fetch(`${AuthConfig.API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    senha: password,
                    lembrarMe: rememberMe
                })
            });

            const result = await response.json();
            console.log('Resposta da API:', result);

            if (response.ok && result.success) {
                return {
                    success: true,
                    data: {
                        user: result.user,
                        token: result.authentication.accessToken
                    }
                };
            } else {
                return {
                    success: false,
                    error: result.message || 'Credenciais inválidas'
                };
            }

        } catch (error) {
            console.error('Erro na comunicação com servidor:', error);
            return {
                success: false,
                error: 'Erro de conexão. Verifique sua internet.'
            };
        }
    }

    // Validar dados do formulário de login
    validateLoginForm(email, password) {
        let isValid = true;
        
        if (!email || !this.validateEmail(email)) {
            this.showFieldError('email', 'Por favor, insira um e-mail válido.');
            isValid = false;
        } else {
            this.hideFieldError('email');
        }

        if (!password || password.length < AuthConfig.PASSWORD_MIN_LENGTH) {
            this.showFieldError('password', 'Senha deve ter pelo menos 6 caracteres.');
            isValid = false;
        } else {
            this.hideFieldError('password');
        }

        return isValid;
    }
    // Processar login bem-sucedido
    async handleSuccessfulLogin(data, rememberMe) {
        const { user, token } = data;

        console.log('Login bem-sucedido para:', user.nome || user.name);

        // Salvar dados do usuário autenticado
        this.saveAuthData(user, token, rememberMe);

        // Resetar tentativas de login
        AuthState.loginAttempts = 0;
        this.removeStorageItem('auth_lockout');

        // Notificar sucesso
        this.showAlert('success', `Bem-vindo(a), ${user.nome || user.name}! 🎉`);

        // Redirecionar para dashboard
        setTimeout(() => {
            console.log('Redirecionando para dashboard...');
            
            if (this.isAuthenticated()) {
                console.log('Dados confirmados, redirecionando...');
                try {
                    window.location.href = 'dashboard.html';
                } catch (error) {
                    console.error('Erro no redirecionamento:', error);
                    window.location.href = 'index.html';
                }
            } else {
                console.error('Erro: dados não foram salvos corretamente');
                this.showAlert('error', 'Erro ao salvar dados de login. Tente novamente.');
            }
        }, 1500);
    }

    // Processar falha no login
    handleFailedLogin(errorMessage) {
        AuthState.loginAttempts++;
        AuthState.lastAttempt = Date.now();

        const remainingAttempts = AuthConfig.MAX_LOGIN_ATTEMPTS - AuthState.loginAttempts;

        if (remainingAttempts <= 0) {
            // Bloquear conta temporariamente
            AuthState.isLocked = true;
            this.setStorageItem('auth_lockout', {
                attempts: AuthState.loginAttempts,
                timestamp: Date.now()
            });
            
            const lockoutDuration = AuthConfig.LOCKOUT_DURATION_MINUTES * 60 * 1000;
            this.showLockoutMessage(lockoutDuration);
        } else {
            // Mostrar erro com tentativas restantes
            this.showAlert('error', 
                `${errorMessage}. ${remainingAttempts} tentativa${remainingAttempts > 1 ? 's' : ''} restante${remainingAttempts > 1 ? 's' : ''}.`
            );
        }

        // Limpar campo de senha
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.value = '';
            passwordField.focus();
        }
    }

    // Verificar status de bloqueio
    checkLockoutStatus() {
        const lockoutData = this.getStorageItem('auth_lockout');
        if (lockoutData) {
            const timeDiff = Date.now() - lockoutData.timestamp;
            const lockoutDuration = AuthConfig.LOCKOUT_DURATION_MINUTES * 60 * 1000;
            
            if (timeDiff < lockoutDuration) {
                AuthState.isLocked = true;
                AuthState.loginAttempts = lockoutData.attempts;
                this.showLockoutMessage(lockoutDuration - timeDiff);
            } else {
                // Remover bloqueio expirado
                this.removeStorageItem('auth_lockout');
                AuthState.isLocked = false;
                AuthState.loginAttempts = 0;
            }
        }
    }
    // Processar cadastro de novo usuário
    async performRegistration(userData) {
        try {
            console.log('Cadastrando novo usuário:', userData.email);
            
            const response = await fetch(`${AuthConfig.API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nome: userData.name,
                    email: userData.email,
                    senha: userData.password,
                    confirmarSenha: userData.password,
                    escola: userData.school,
                    serie: userData.schoolYear,
                    cidade: userData.city,
                    estado: userData.state,
                    telefone: userData.phone || '',
                    materiasFavoritas: userData.favoriteSubjects || [],
                    objetivos: userData.targetExam || ''
                })
            });

            const result = await response.json();
            console.log('Resposta do cadastro:', result);

            if (response.ok && result.success) {
                return {
                    success: true,
                    data: {
                        user: result.user,
                        token: result.authentication.accessToken
                    }
                };
            } else {
                return {
                    success: false,
                    error: result.message || 'Erro ao criar conta'
                };
            }

        } catch (error) {
            console.error('Erro no processo de cadastro:', error);
            return {
                success: false,
                error: 'Erro de conexão. Verifique sua internet.'
            };
        }
    }

    // Gerenciar processo de cadastro
    async handleRegister(event) {
        event.preventDefault();
        
        const form = event.target;
        const currentStep = this.getCurrentStep(form);
        
        if (currentStep < 3) {
            if (this.validateCurrentStep(currentStep)) {
                this.nextStep(currentStep);
            }
        } else {
            await this.processRegistration(form);
        }
    }

    // Finalizar processo de cadastro
    async processRegistration(form) {
        const formData = new FormData(form);
        const userData = {
            name: formData.get('fullName')?.trim(),
            email: formData.get('email')?.trim().toLowerCase(),
            password: formData.get('password'),
            schoolYear: formData.get('schoolYear'),
            school: formData.get('school')?.trim() || '',
            targetExam: formData.get('targetExam'),
            state: formData.get('state'),
            city: formData.get('city')?.trim(),
            agreeTerms: formData.get('agreeTerms') === 'on',
            agreeEmails: formData.get('agreeEmails') === 'on'
        };

        if (!this.validateRegistrationData(userData)) {
            return;
        }

        this.showRegisterLoading(true);

        try {
            // Criar conta via API do Desafia Brasil
            const response = await this.performRegistration(userData);
            
            if (response.success) {
                await this.handleSuccessfulRegistration(response.data);
            } else {
                this.showAlert('error', response.error || 'Erro ao criar conta. Tente novamente.');
            }

        } catch (error) {
            console.error('Erro no cadastro:', error);
            this.showAlert('error', 'Erro interno. Tente novamente mais tarde.');
        } finally {
            this.showRegisterLoading(false);
        }
    }

    // Processar cadastro bem-sucedido
    async handleSuccessfulRegistration(data) {
        const { user, token } = data;

        console.log('Cadastro realizado com sucesso para:', user.nome || user.name);

        // Salvar dados do novo usuário
        this.saveAuthData(user, token, false);

        // Notificar sucesso
        this.showAlert('success', `Conta criada com sucesso! Bem-vindo(a), ${user.nome || user.name}! 🎉`);

        // Redirecionar para dashboard
        setTimeout(() => {
            console.log('Redirecionando após cadastro...');
            if (this.isAuthenticated()) {
                try {
                    window.location.href = 'dashboard.html';
                } catch (error) {
                    console.error('Erro no redirecionamento:', error);
                    window.location.href = 'index.html';
                }
            }
        }, 2000);
    }
    // Validar dados de cadastro
    validateRegistrationData(userData) {
        if (!userData.agreeTerms) {
            this.showAlert('error', 'Você deve aceitar os termos de uso para continuar.');
            return false;
        }

        if (!this.validateFullName(userData.name)) {
            this.showAlert('error', 'Por favor, insira seu nome completo.');
            return false;
        }

        if (!this.validateEmail(userData.email)) {
            this.showAlert('error', 'Por favor, insira um e-mail válido.');
            return false;
        }

        if (!this.validatePassword(userData.password).isValid) {
            this.showAlert('error', 'A senha deve ter pelo menos 6 caracteres.');
            return false;
        }

        return true;
    }

    // Obter etapa atual do formulário
    getCurrentStep(form) {
        const visibleStep = form.querySelector('.form-step:not(.d-none)');
        if (visibleStep.id === 'step1') return 1;
        if (visibleStep.id === 'step2') return 2;
        if (visibleStep.id === 'step3') return 3;
        return 1;
    }

    // Validar etapa atual
    validateCurrentStep(step) {
        const stepElement = document.getElementById(`step${step}`);
        const requiredFields = stepElement.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        if (step === 1) {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                this.showFieldError('confirmPassword', 'As senhas não coincidem.');
                isValid = false;
            }
        }

        return isValid;
    }

    // Validar campo individual
    validateField(field) {
        const value = field.value.trim();
        const fieldType = field.type;
        const fieldId = field.id;
        let isValid = true;
        let errorMessage = '';

        if (field.required && !value) {
            errorMessage = 'Este campo é obrigatório.';
            isValid = false;
        } else if (value) {
            switch (fieldType) {
                case 'email':
                    if (!this.validateEmail(value)) {
                        errorMessage = 'Por favor, insira um e-mail válido.';
                        isValid = false;
                    }
                    break;
                    
                case 'password':
                    if (fieldId === 'password' && value.length < AuthConfig.PASSWORD_MIN_LENGTH) {
                        errorMessage = `A senha deve ter pelo menos ${AuthConfig.PASSWORD_MIN_LENGTH} caracteres.`;
                        isValid = false;
                    }
                    break;
            }

            if (fieldId === 'fullName' && !this.validateFullName(value)) {
                errorMessage = 'Por favor, insira seu nome completo.';
                isValid = false;
            }
        }

        if (isValid) {
            this.hideFieldError(fieldId);
        } else {
            this.showFieldError(fieldId, errorMessage);
        }

        return isValid;
    }

    // Funções de validação
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validateFullName(name) {
        return name && name.trim().length >= 2 && name.trim().length <= 100;
    }

    validatePassword(password) {
        return {
            isValid: password && password.length >= AuthConfig.PASSWORD_MIN_LENGTH,
            strength: this.calculatePasswordStrength(password)
        };
    }

    calculatePasswordStrength(password) {
        let strength = 0;
        if (password.length >= 6) strength += 1;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
        if (/\d/.test(password)) strength += 1;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
        return strength;
    }
    // Mostrar erro em campo
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('is-invalid');
            
            const feedback = field.parentElement.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.textContent = message;
            }
        }
    }

    // Esconder erro em campo
    hideFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.remove('is-invalid');
        }
    }

    // Sistema de notificações
    showAlert(type, message, duration = 5000) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) {
            console.log(`Notificação [${type}]: ${message}`);
            return;
        }

        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 
                          type === 'warning' ? 'alert-warning' : 'alert-info';

        const alertId = 'alert-' + Date.now();
        
        const alertHTML = `
            <div id="${alertId}" class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        alertContainer.innerHTML = alertHTML;

        if (duration > 0) {
            setTimeout(() => {
                const alert = document.getElementById(alertId);
                if (alert) {
                    alert.remove();
                }
            }, duration);
        }
    }

    // Verificar força da senha
    checkPasswordStrength(event) {
        const password = event.target.value;
        const strengthBar = document.getElementById('passwordStrength');
        const strengthText = document.getElementById('strengthText');
        
        if (!strengthBar || !strengthText) return;

        const validation = this.validatePassword(password);
        const strength = validation.strength;
        
        const strengthLabels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
        const strengthColors = ['bg-danger', 'bg-warning', 'bg-info', 'bg-primary', 'bg-success'];
        
        const percentage = (strength / 4) * 100;
        
        strengthBar.className = `progress-bar ${strengthColors[strength] || 'bg-secondary'}`;
        strengthBar.style.width = `${percentage}%`;
        strengthText.textContent = strengthLabels[strength] || 'Digite uma senha';
    }

    // Validar confirmação de senha
    validatePasswordMatch(event) {
        const confirmPassword = event.target.value;
        const password = document.getElementById('password')?.value;
        
        if (confirmPassword && password) {
            if (confirmPassword === password) {
                this.hideFieldError('confirmPassword');
            } else {
                this.showFieldError('confirmPassword', 'As senhas não coincidem.');
            }
        }
    }

    // Mostrar carregamento no login
    showLoginLoading(show) {
        const btn = document.getElementById('loginBtn');
        const spinner = document.getElementById('loginSpinner');
        
        if (btn) {
            if (show) {
                btn.disabled = true;
                if (spinner) spinner.classList.remove('d-none');
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Entrando...';
            } else {
                btn.disabled = false;
                if (spinner) spinner.classList.add('d-none');
                btn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Entrar';
            }
        }
    }

    // Mostrar carregamento no cadastro
    showRegisterLoading(show) {
        const btn = document.getElementById('registerBtn');
        const spinner = document.getElementById('registerSpinner');
        
        if (btn && spinner) {
            if (show) {
                btn.disabled = true;
                spinner.classList.remove('d-none');
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Criando conta...';
            } else {
                btn.disabled = false;
                spinner.classList.add('d-none');
                btn.innerHTML = '<i class="fas fa-check me-2"></i>Criar Conta';
            }
        }
    }

    // Mostrar mensagem de bloqueio
    showLockoutMessage(remainingTime) {
        const minutes = Math.ceil(remainingTime / (1000 * 60));
        const message = `Muitas tentativas de login incorretas. Tente novamente em ${minutes} minuto${minutes > 1 ? 's' : ''}.`;
        
        this.showAlert('warning', message, 0);
        
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            const inputs = loginForm.querySelectorAll('input, button');
            inputs.forEach(input => {
                input.disabled = true;
            });
        }
    }
    // Fazer logout do usuário
    logout() {
        console.log('Processando logout...');
        
        const currentSimulado = this.getStorageItem('current_simulado');
        if (currentSimulado) {
            if (!confirm('Você tem um simulado em andamento. Deseja realmente sair?')) {
                return;
            }
        }

        this.clearAuthData();
        
        AuthState.loginAttempts = 0;
        AuthState.isLocked = false;
        AuthState.lastAttempt = null;

        this.showAlert('info', 'Logout realizado com sucesso!');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }

    // Processar recuperação de senha
    async handleForgotPassword() {
        const emailField = document.getElementById('forgotEmail');
        const email = emailField?.value.trim();
        
        if (!email || !this.validateEmail(email)) {
            this.showAlert('error', 'Por favor, insira um e-mail válido.');
            return;
        }

        const btn = document.getElementById('sendResetBtn');
        const spinner = document.getElementById('resetSpinner');
        
        if (btn && spinner) {
            btn.disabled = true;
            spinner.classList.remove('d-none');
        }

        try {
            // Processamento de recuperação de senha
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.showAlert('success', `Instruções de recuperação enviadas para ${email}`);
            
            const modal = document.getElementById('forgotPasswordModal');
            if (modal && window.bootstrap) {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
            
            if (emailField) emailField.value = '';
            
        } catch (error) {
            console.error('Erro no processo de recuperação:', error);
            this.showAlert('error', 'Erro ao enviar email. Tente novamente mais tarde.');
        } finally {
            if (btn && spinner) {
                btn.disabled = false;
                spinner.classList.add('d-none');
            }
        }
    }
}

// Inicializar sistema de autenticação
const authSystem = new AuthSystem();

// Funções globais
window.logout = () => {
    authSystem.logout();
};

// Verificação de autenticação
document.addEventListener('DOMContentLoaded', () => {
    const rememberUser = authSystem.getStorageItem('remember_user');
    const isAuthenticated = authSystem.isAuthenticated();
    
    if (rememberUser && isAuthenticated) {
        const userData = authSystem.getStorageItem('user');
        console.log('Usuário autenticado:', userData?.nome || userData?.name);
        
        const currentPage = window.location.pathname.split('/').pop();
        if (['login.html', 'cadastro.html'].includes(currentPage)) {
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        }
    }
});

// Exportar para uso global
window.AuthSystem = AuthSystem;
window.authSystem = authSystem;
