/* ===================================
   DESAFIA BRASIL - AUTH JS (Versão Simplificada e Funcional)
   Foco: Login, Salvar Token e Redirecionamento
   ================================== */

// Adiciona os "escutadores" de evento quando o conteúdo da página carregar
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

/**
 * Função para lidar com o envio do formulário de LOGIN
 */
async function handleLogin(event) {
    event.preventDefault(); // Impede que a página recarregue

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');

    // Mostra um estado de "carregando" no botão
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';

    try {
        const response = await fetch(DESAFIA_CONFIG.getUrl('login'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email, senha: password }),
        });

        const data = await response.json();

        if (data.success && data.token) {
            // DEU CERTO! SALVA O TOKEN E OS DADOS DO USUÁRIO
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.user));

            alert('Login realizado com sucesso! Redirecionando...'); // Alerta simples
            
            // Redireciona para o dashboard
            window.location.href = 'dashboard.html';
        } else {
            // Se falhou, mostra a mensagem de erro do backend
            alert(data.message || 'E-mail ou senha incorretos.');
        }

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        alert('Ocorreu um erro de conexão. Tente novamente.');
    } finally {
        // Habilita o botão novamente, independentemente do resultado
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Entrar';
    }
}


/**
 * Função para lidar com o envio do formulário de CADASTRO
 * (Você pode adaptar com a lógica dos "steps" se precisar depois)
 */
async function handleRegister(event) {
    event.preventDefault();

    // Pegando os valores dos campos (adapte se os IDs forem diferentes)
    const nome = document.getElementById('fullName')?.value;
    const email = document.getElementById('email')?.value;
    const senha = document.getElementById('password')?.value;
    
    // Validação simples
    if (!nome || !email || !senha) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    const registerBtn = document.getElementById('registerBtn');
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Criando conta...';

    try {
        const response = await fetch(DESAFIA_CONFIG.getUrl('register'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha }),
        });

        const data = await response.json();

        if (data.success) {
            alert('Conta criada com sucesso! Agora você pode fazer o login.');
            window.location.href = 'login.html'; // Redireciona para o login
        } else {
            alert(data.message || 'Não foi possível criar a conta.');
        }

    } catch (error) {
        console.error('Erro ao registrar:', error);
        alert('Ocorreu um erro de conexão ao tentar registrar.');
    } finally {
        registerBtn.disabled = false;
        registerBtn.innerHTML = 'Criar Conta';
    }
}

/**
 * Função de LOGOUT
 */
function logout() {
    // Limpa os dados salvos
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    
    // Redireciona para a página inicial
    alert('Você foi desconectado.');
    window.location.href = 'index.html';
}