// ✅ CONFIGURAÇÃO ÚNICA DO DESAFIA BRASIL - ALTERE APENAS AQUI!
window.DESAFIA_CONFIG = {
    API_URL: 'https://desafia-brasil.onrender.com',
    
    // Todos os endpoints em um lugar só
    endpoints: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        profile: '/api/user/profile',
        exams: '/api/exams/available',
        startExam: '/api/exams/{id}/start',
        finishExam: '/api/exams/{id}/finish'
    },
    
    // Função helper para facilitar sua vida
    getUrl: function(endpoint, params = {}) {
        let url = this.API_URL + this.endpoints[endpoint];
        
        // Substituir parâmetros como {id}
        Object.keys(params).forEach(key => {
            url = url.replace(`{${key}}`, params[key]);
        });
        
        return url;
    }
};
