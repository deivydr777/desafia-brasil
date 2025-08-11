/* ===================================
   DESAFIA BRASIL - AUTH JS
   Arquivo: auth.js
   Sistema de autenticação completo
   ================================== */

// Configurações de autenticação
const AuthConfig = {
    TOKEN_EXPIRY_HOURS: 24,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    PASSWORD_MIN_LENGTH: 6,
    DEMO_CREDENTIALS: {
        email: 'demo@demo.com',
        password: '123456'
    }
};

// Estado de autenticação
const AuthState = {
    isLogging: false,
    loginAttempts: 0,
    lastAttempt: null,
    isLocked: false
};

// Classe principal de autenticação
class AuthSystem {
    constructor() {
        this.initEventListeners();
        this.checkLockoutStatus();
    }

    // Inicializar event listeners
    initEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Password strength checker
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => this.checkPasswordStrength(e));
        }

        // Password confirmation
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', (e) => this.validatePasswordMatch(e));
        }

        // Forgot password
        const sendResetBtn = document.getElementById('sendResetBtn');
        if (sendResetBtn) {
            sendResetBtn.addEventListener('click', () => this.handleForgotPassword());
        }
    }

    // Verificar status de bloqueio
    checkLockoutStatus() {
        const lockoutData = Storage.get('auth_lockout');
        if (lockoutData) {
            const timeDiff = Date.now() - lockoutData.timestamp;
            const lockoutDuration = AuthConfig.LOCKOUT_DURATION_MINUTES * 60 * 1000;
            
            if (timeDiff < lockoutDuration) {
                AuthState.isLocked = true;
                AuthState.loginAttempts = lockoutData.attempts;
                this.showLockoutMessage(lockoutDuration - timeDiff);
            } else {
                // Lockout expirado, limpar dados
                Storage.remove('auth_lockout');
                AuthState.isLocked = false;
                AuthState.loginAttempts = 0;
            }
        }
    }
}
    // Manipular login
    async handleLogin(event) {
        event.preventDefault();
        
        if (AuthState.isLocked) {
            Notifications.error('Conta temporariamente bloqueada. Tente novamente mais tarde.');
            return;
        }

        if (AuthState.isLogging) {
            return; // Evitar duplo envio
        }

        const form = event.target;
        const formData = new FormData(form);
        const email = formData.get('email')?.trim();
        const password = formData.get('password');
        const rememberMe = formData.get('rememberMe') === 'on';

        // Validação básica
        if (!this.validateLoginForm(email, password)) {
            return;
        }

        AuthState.isLogging = true;
        this.showLoginLoading(true);

        try {
            // Verificar credenciais demo primeiro
            if (this.isDemoLogin(email, password)) {
                await this.handleDemoLogin(rememberMe);
                return;
            }

            // Tentar login real via API
            const response = await this.performLogin(email, password, rememberMe);
            
            if (response.success) {
                await this.handleSuccessfulLogin(response.data, rememberMe);
            } else {
                this.handleFailedLogin(response.error);
            }

        } catch (error) {
            console.error('Erro no login:', error);
            Notifications.error('Erro interno. Tente novamente mais tarde.');
            this.handleFailedLogin('Erro interno do servidor');
        } finally {
            AuthState.isLogging = false;
            this.showLoginLoading(false);
        }
    }

    // Validar formulário de login
    validateLoginForm(email, password) {
        let isValid = true;
        
        // Validar email
        if (!email || !Validation.validateEmail(email)) {
            this.showFieldError('email', 'Por favor, insira um e-mail válido.');
            isValid = false;
        } else {
            this.hideFieldError('email');
        }

        // Validar senha
        if (!password || password.length < AuthConfig.PASSWORD_MIN_LENGTH) {
            this.showFieldError('password', 'Senha deve ter pelo menos 6 caracteres.');
            isValid = false;
        } else {
            this.hideFieldError('password');
        }

        return isValid;
    }

    // Verificar se é login demo
    isDemoLogin(email, password) {
        return email === AuthConfig.DEMO_CREDENTIALS.email && 
               password === AuthConfig.DEMO_CREDENTIALS.password;
    }

    // Manipular login demo
    async handleDemoLogin(rememberMe) {
        const demoUser = {
            id: 'demo-user-001',
            name: 'João Silva',
            email: 'demo@demo.com',
            city: 'São Paulo',
            state: 'SP',
            school: 'Escola Estadual Demo',
            isAdmin: false,
            totalPoints: 1245,
            simuladosCompletos: 23,
            averageScore: 78.5,
            rankingPosition: 142,
            currentStreak: 15,
            studyTime: 47,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        await this.handleSuccessfulLogin({ 
            user: demoUser, 
            token: 'demo-token-' + Date.now() 
        }, rememberMe);

        Notifications.success('Login demo realizado com sucesso! 🎉');
    }

    // Realizar login via API
    async performLogin(email, password, rememberMe) {
        // Simulação de API - substitua pela sua implementação real
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simular falha para demonstração
                if (email === 'erro@teste.com') {
                    resolve({
                        success: false,
                        error: 'Credenciais inválidas'
                    });
                } else {
                    // Simular sucesso
                    resolve({
                        success: true,
                        data: {
                            user: {
                                id: 'user-' + Date.now(),
                                name: email.split('@')[0],
                                email: email,
                                city: 'São Paulo',
                                state: 'SP',
                                totalPoints: 890,
                                simuladosCompletos: 15,
                                averageScore: 72.3,
                                rankingPosition: 284,
                                currentStreak: 7,
                                studyTime: 28
                            },
                            token: 'jwt-token-' + Date.now()
                        }
                    });
                }
            }, 1500);
        });
    }

    // Manipular login bem-sucedido
    async handleSuccessfulLogin(data, rememberMe) {
        const { user, token } = data;

        // Salvar dados do usuário e token
        Storage.set('current_user', user);
        Storage.set('auth_token', token);
        
        if (rememberMe) {
            Storage.set('remember_user', true);
        }

        // Atualizar estado da aplicação
        User.setCurrentUser(user);

        // Reset tentativas de login
        AuthState.loginAttempts = 0;
        Storage.remove('auth_lockout');

        // Mostrar sucesso
        Notifications.success(`Bem-vindo(a), ${user.name}! 🎉`);

        // Redirecionar após pequeno delay
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    }

    // Manipular login falhado
    handleFailedLogin(errorMessage) {
        AuthState.loginAttempts++;
        AuthState.lastAttempt = Date.now();

        const remainingAttempts = AuthConfig.MAX_LOGIN_ATTEMPTS - AuthState.loginAttempts;

        if (remainingAttempts <= 0) {
            // Bloquear conta
            AuthState.isLocked = true;
            Storage.set('auth_lockout', {
                attempts: AuthState.loginAttempts,
                timestamp: Date.now()
            });
            
            const lockoutDuration = AuthConfig.LOCKOUT_DURATION_MINUTES * 60 * 1000;
            this.showLockoutMessage(lockoutDuration);
        } else {
            // Mostrar erro com tentativas restantes
            Notifications.error(
                `${errorMessage}. ${remainingAttempts} tentativa${remainingAttempts > 1 ? 's' : ''} restante${remainingAttempts > 1 ? 's' : ''}.`
            );
        }

        // Limpar campos de senha
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.value = '';
            passwordField.focus();
        }
    }
    // Manipular cadastro
    async handleRegister(event) {
        event.preventDefault();
        
        const form = event.target;
        const currentStep = this.getCurrentStep(form);
        
        if (currentStep < 3) {
            // Validar step atual e avançar
            if (this.validateCurrentStep(currentStep)) {
                this.nextStep(currentStep);
            }
        } else {
            // Step final - processar cadastro
            await this.processRegistration(form);
        }
    }

    // Obter step atual do formulário
    getCurrentStep(form) {
        const visibleStep = form.querySelector('.form-step:not(.d-none)');
        if (visibleStep.id === 'step1') return 1;
        if (visibleStep.id === 'step2') return 2;
        if (visibleStep.id === 'step3') return 3;
        return 1;
    }

    // Validar step atual
    validateCurrentStep(step) {
        const stepElement = document.getElementById(`step${step}`);
        const requiredFields = stepElement.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Validações específicas por step
        if (step === 1) {
            // Validar confirmação de senha
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                this.showFieldError('confirmPassword', 'As senhas não coincidem.');
                isValid = false;
            }
        }

        return isValid;
    }

    // Avançar para próximo step
    nextStep(currentStep) {
        const currentStepElement = document.getElementById(`step${currentStep}`);
        const nextStepElement = document.getElementById(`step${currentStep + 1}`);
        
        if (currentStepElement && nextStepElement) {
            currentStepElement.classList.add('d-none');
            nextStepElement.classList.remove('d-none');
            
            // Atualizar barra de progresso
            this.updateProgressBar(currentStep + 1);
        }
    }

    // Voltar para step anterior
    previousStep(currentStep) {
        const currentStepElement = document.getElementById(`step${currentStep}`);
        const previousStepElement = document.getElementById(`step${currentStep - 1}`);
        
        if (currentStepElement && previousStepElement) {
            currentStepElement.classList.add('d-none');
            previousStepElement.classList.remove('d-none');
            
            // Atualizar barra de progresso
            this.updateProgressBar(currentStep - 1);
        }
    }

    // Atualizar barra de progresso
    updateProgressBar(step) {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            const progress = (step / 3) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }

    // Processar cadastro final
    async processRegistration(form) {
        const formData = new FormData(form);
        const userData = {
            name: formData.get('fullName').trim(),
            email: formData.get('email').trim().toLowerCase(),
            password: formData.get('password'),
            schoolYear: formData.get('schoolYear'),
            school: formData.get('school')?.trim() || '',
            targetExam: formData.get('targetExam'),
            state: formData.get('state'),
            city: formData.get('city').trim(),
            agreeTerms: formData.get('agreeTerms') === 'on',
            agreeEmails: formData.get('agreeEmails') === 'on'
        };

        // Validação final
        if (!this.validateRegistrationData(userData)) {
            return;
        }

        this.showRegisterLoading(true);

        try {
            // Realizar cadastro via API
            const response = await this.performRegistration(userData);
            
            if (response.success) {
                await this.handleSuccessfulRegistration(response.data);
            } else {
                Notifications.error(response.error || 'Erro ao criar conta. Tente novamente.');
            }

        } catch (error) {
            console.error('Erro no cadastro:', error);
            Notifications.error('Erro interno. Tente novamente mais tarde.');
        } finally {
            this.showRegisterLoading(false);
        }
    }

    // Validar dados de cadastro
    validateRegistrationData(userData) {
        if (!userData.agreeTerms) {
            Notifications.error('Você deve aceitar os termos de uso para continuar.');
            return false;
        }

        if (!Validation.validateFullName(userData.name)) {
            Notifications.error('Por favor, insira seu nome completo.');
            return false;
        }

        if (!Validation.validateEmail(userData.email)) {
            Notifications.error('Por favor, insira um e-mail válido.');
            return false;
        }

        if (!Validation.validatePassword(userData.password).isValid) {
            Notifications.error('A senha deve ter pelo menos 6 caracteres.');
            return false;
        }

        return true;
    }

    // Realizar cadastro via API
    async performRegistration(userData) {
        // Simulação de API - substitua pela sua implementação real
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simular verificação de email existente
                if (userData.email === 'existente@teste.com') {
                    resolve({
                        success: false,
                        error: 'Este e-mail já está cadastrado.'
                    });
                } else {
                    // Simular sucesso
                    const newUser = {
                        id: 'user-' + Date.now(),
                        name: userData.name,
                        email: userData.email,
                        city: userData.city,
                        state: userData.state,
                        school: userData.school,
                        schoolYear: userData.schoolYear,
                        targetExam: userData.targetExam,
                        isAdmin: false,
                        totalPoints: 0,
                        simuladosCompletos: 0,
                        averageScore: 0,
                        rankingPosition: 0,
                        currentStreak: 0,
                        studyTime: 0,
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString()
                    };

                    resolve({
                        success: true,
                        data: {
                            user: newUser,
                            token: 'jwt-token-' + Date.now()
                        }
                    });
                }
            }, 2000);
        });
    }

    // Manipular cadastro bem-sucedido
    async handleSuccessfulRegistration(data) {
        const { user, token } = data;

        // Salvar dados
        Storage.set('current_user', user);
        Storage.set('auth_token', token);
        User.setCurrentUser(user);

        // Mostrar sucesso
        Notifications.success(`Conta criada com sucesso! Bem-vindo(a), ${user.name}! 🎉`);

        // Redirecionar
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
    }
    // Validar campo individual
    validateField(field) {
        const value = field.value.trim();
        const fieldType = field.type;
        const fieldId = field.id;
        let isValid = true;
        let errorMessage = '';

        // Verificar se campo é obrigatório e está vazio
        if (field.required && !value) {
            errorMessage = 'Este campo é obrigatório.';
            isValid = false;
        } else if (value) {
            // Validações específicas por tipo/ID
            switch (fieldType) {
                case 'email':
                    if (!Validation.validateEmail(value)) {
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

            // Validações específicas por ID
            if (fieldId === 'fullName' && !Validation.validateFullName(value)) {
                errorMessage = 'Por favor, insira seu nome completo.';
                isValid = false;
            }
        }

        // Mostrar/esconder erro
        if (isValid) {
            this.hideFieldError(fieldId);
        } else {
            this.showFieldError(fieldId, errorMessage);
        }

        return isValid;
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

    // Verificar força da senha
    checkPasswordStrength(event) {
        const password = event.target.value;
        const strengthBar = document.getElementById('passwordStrength');
        const strengthText = document.getElementById('strengthText');
        
        if (!strengthBar || !strengthText) return;

        const validation = Validation.validatePassword(password);
        const strength = validation.strength;
        
        // Atualizar barra de força
        const strengthLabels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Muito forte'];
        const strengthColors = ['bg-danger', 'bg-warning', 'bg-info', 'bg-primary', 'bg-success', 'bg-success'];
        
        const strengthLevel = Math.min(strength, 5);
        const percentage = (strengthLevel / 5) * 100;
        
        strengthBar.className = `progress-bar ${strengthColors[strengthLevel]}`;
        strengthBar.style.width = `${percentage}%`;
        strengthText.textContent = strengthLabels[strengthLevel] || 'Digite uma senha';
        strengthText.className = `text-muted small ${strengthColors[strengthLevel].replace('bg-', 'text-')}`;
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

    // Mostrar loading no login
    showLoginLoading(show) {
        const btn = document.getElementById('loginBtn');
        const spinner = document.getElementById('loginSpinner');
        
        if (btn && spinner) {
            if (show) {
                btn.disabled = true;
                spinner.classList.remove('d-none');
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Entrando...';
            } else {
                btn.disabled = false;
                spinner.classList.add('d-none');
                btn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Entrar';
            }
        }
    }

    // Mostrar loading no cadastro
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
        
        Notifications.warning(message, 0); // Não remove automaticamente
        
        // Desabilitar formulário de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            const inputs = loginForm.querySelectorAll('input, button');
            inputs.forEach(input => {
                input.disabled = true;
            });
        }
    }
    // Manipular recuperação de senha
    async handleForgotPassword() {
        const emailField = document.getElementById('forgotEmail');
        const email = emailField?.value.trim();
        
        if (!email || !Validation.validateEmail(email)) {
            Notifications.error('Por favor, insira um e-mail válido.');
            return;
        }

        const btn = document.getElementById('sendResetBtn');
        const spinner = document.getElementById('resetSpinner');
        
        // Mostrar loading
        if (btn && spinner) {
            btn.disabled = true;
            spinner.classList.remove('d-none');
        }

        try {
            // Simular envio de email de recuperação
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            Notifications.success(`Instruções de recuperação enviadas para ${email}`);
            
            // Fechar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
            if (modal) {
                modal.hide();
            }
            
            // Limpar campo
            emailField.value = '';
            
        } catch (error) {
            console.error('Erro ao enviar email de recuperação:', error);
            Notifications.error('Erro ao enviar email. Tente novamente mais tarde.');
        } finally {
            // Esconder loading
            if (btn && spinner) {
                btn.disabled = false;
                spinner.classList.add('d-none');
            }
        }
    }

    // Logout do usuário
    logout() {
        // Mostrar confirmação se necessário
        if (Storage.get('current_simulado')) {
            if (!confirm('Você tem um simulado em andamento. Deseja realmente sair?')) {
                return;
            }
        }

        // Limpar dados
        User.clearCurrentUser();
        Storage.remove('remember_user');
        
        // Reset estado de auth
        AuthState.loginAttempts = 0;
        AuthState.isLocked = false;
        AuthState.lastAttempt = null;

        // Mostrar mensagem
        Notifications.info('Logout realizado com sucesso!');

        // Redirecionar
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    // Verificar se token ainda é válido
    async validateToken() {
        const token = Storage.get('auth_token');
        const user = Storage.get('current_user');
        
        if (!token || !user) {
            return false;
        }

        try {
            // Aqui você faria uma requisição para validar o token no backend
            // Por enquanto, vamos simular
            
            // Verificar se token não expirou (simulação básica)
            const tokenData = JSON.parse(atob(token.split('.')[1] || '{}'));
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (tokenData.exp && tokenData.exp < currentTime) {
                // Token expirado
                User.clearCurrentUser();
                return false;
            }

            return true;
        } catch (error) {
            console.error('Erro ao validar token:', error);
            User.clearCurrentUser();
            return false;
        }
    }

    // Renovar token automaticamente
    async refreshToken() {
        const refreshToken = Storage.get('refresh_token');
        
        if (!refreshToken) {
            return false;
        }

        try {
            const response = await API.post('/auth/refresh', {
                refreshToken: refreshToken
            });

            if (response.success) {
                Storage.set('auth_token', response.data.token);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Erro ao renovar token:', error);
            return false;
        }
    }
}

// Inicializar sistema de autenticação
const authSystem = new AuthSystem();

// Funções globais para compatibilidade
window.login = (email, password, rememberMe = false) => {
    // Simular evento de submit
    const event = new Event('submit');
    const form = document.getElementById('loginForm');
    
    if (form) {
        // Preencher campos
        document.getElementById('email').value = email;
        document.getElementById('password').value = password;
        document.getElementById('rememberMe').checked = rememberMe;
        
        authSystem.handleLogin(event);
    }
};

window.register = (userData) => {
    // Implementar se necessário
    console.log('Registrando usuário:', userData);
};

window.forgotPassword = (email) => {
    document.getElementById('forgotEmail').value = email;
    authSystem.handleForgotPassword();
};

// Verificar autenticação ao carregar página
document.addEventListener('DOMContentLoaded', () => {
    // Auto-login se "lembrar de mim" estiver ativo
    const rememberUser = Storage.get('remember_user');
    const currentUser = Storage.get('current_user');
    
    if (rememberUser && currentUser) {
        User.setCurrentUser(currentUser);
        
        // Se estiver em página de login/cadastro, redirecionar
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
