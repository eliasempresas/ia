// Sistema de Autenticação Elias Empresas
class AuthManager {
    constructor() {
        this.currentCode = null;
        this.checkInterval = null;
        this.attempts = 0;
        this.maxAttempts = CONFIG.AUTH.MAX_ATTEMPTS;
        this.isAuthorized = false;
        
        this.init();
    }
    
    init() {
        logger.info('Inicializando sistema de autenticação');
        
        // Verificar se já está autorizado
        const token = localStorage.getItem(CONFIG.STORAGE.AUTH_TOKEN);
        if (token && this.validateToken(token)) {
            this.isAuthorized = true;
            this.showMainApp();
            return;
        }
        
        // Mostrar tela de autenticação
        this.showAuthScreen();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const authCodeInput = document.getElementById('auth-code');
        const authSubmitBtn = document.getElementById('auth-submit');
        
        if (authCodeInput) {
            authCodeInput.addEventListener('input', (e) => {
                this.handleCodeInput(e);
            });
            
            authCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.submitCode();
                }
            });
        }
        
        if (authSubmitBtn) {
            authSubmitBtn.addEventListener('click', () => {
                this.submitCode();
            });
        }
    }
    
    handleCodeInput(event) {
        const input = event.target;
        const value = input.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        
        if (value.length > CONFIG.AUTH.CODE_LENGTH) {
            input.value = value.substring(0, CONFIG.AUTH.CODE_LENGTH);
        } else {
            input.value = value;
        }
        
        // Limpar estados de erro
        this.clearStatus();
        input.classList.remove('error', 'success');
    }
    
    async submitCode() {
        const authCodeInput = document.getElementById('auth-code');
        const code = authCodeInput.value.trim();
        
        if (!code) {
            this.showError('Digite um código de autorização');
            return;
        }
        
        if (code.length < CONFIG.AUTH.CODE_LENGTH) {
            this.showError('Código deve ter pelo menos ' + CONFIG.AUTH.CODE_LENGTH + ' caracteres');
            return;
        }
        
        this.attempts++;
        
        if (this.attempts > this.maxAttempts) {
            this.showError('Muitas tentativas. Aguarde antes de tentar novamente.');
            return;
        }
        
        try {
            await this.authorizeCode(code);
        } catch (error) {
            logger.error('Erro na autorização', error);
            this.showError('Erro na comunicação com o servidor');
        }
    }
    
    async authorizeCode(code) {
        this.showPending();
        
        try {
            const response = await this.makeApiCall('authorize', { code });
            
            if (response.success) {
                if (response.status === 'authorized') {
                    this.handleSuccess(code);
                } else if (response.status === 'pending') {
                    this.handlePending(code);
                } else {
                    this.showError('Código inválido ou expirado');
                }
            } else {
                this.showError(response.message || 'Erro na autorização');
            }
        } catch (error) {
            logger.error('Erro na API de autorização', error);
            this.showError('Erro na comunicação com o servidor');
        }
    }
    
    async handlePending(code) {
        this.currentCode = code;
        this.showPending();
        
        // Iniciar verificação periódica
        this.startCodeCheck();
    }
    
    startCodeCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        this.checkInterval = setInterval(async () => {
            try {
                const response = await this.makeApiCall('authorize', { code: this.currentCode });
                
                if (response.success && response.status === 'authorized') {
                    this.handleSuccess(this.currentCode);
                } else if (response.success && response.status === 'expired') {
                    this.showError('Código expirado');
                    this.stopCodeCheck();
                }
            } catch (error) {
                logger.error('Erro na verificação do código', error);
            }
        }, CONFIG.AUTH.CHECK_INTERVAL);
        
        // Timeout após 5 minutos
        setTimeout(() => {
            if (this.checkInterval) {
                this.showError('Código expirado');
                this.stopCodeCheck();
            }
        }, CONFIG.AUTH.CODE_EXPIRY);
    }
    
    stopCodeCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.currentCode = null;
    }
    
    handleSuccess(code) {
        this.stopCodeCheck();
        
        // Gerar token de autorização
        const token = this.generateAuthToken(code);
        localStorage.setItem(CONFIG.STORAGE.AUTH_TOKEN, token);
        
        this.isAuthorized = true;
        this.showSuccess();
        
        // Aguardar um pouco antes de mostrar o app principal
        setTimeout(() => {
            this.showMainApp();
        }, 1500);
        
        logger.info('Autorização bem-sucedida', { code: code.substring(0, 3) + '***' });
    }
    
    generateAuthToken(code) {
        const tokenData = {
            code: code,
            deviceId: CONFIG.DEVICE.deviceId,
            timestamp: Date.now(),
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
        };
        
        return btoa(JSON.stringify(tokenData));
    }
    
    validateToken(token) {
        try {
            const tokenData = JSON.parse(atob(token));
            const now = Date.now();
            
            if (now > tokenData.expires) {
                localStorage.removeItem(CONFIG.STORAGE.AUTH_TOKEN);
                return false;
            }
            
            return true;
        } catch (error) {
            logger.error('Token inválido', error);
            localStorage.removeItem(CONFIG.STORAGE.AUTH_TOKEN);
            return false;
        }
    }
    
    async makeApiCall(action, data = {}) {
        const requestData = {
            action: action,
            deviceId: CONFIG.DEVICE.deviceId,
            ...data
        };
        
        const response = await fetch(CONFIG.API.BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': 'ee-tv-auth',
                'User-Agent': 'EliasEmpresas-TV-Launcher/1.0'
            },
            body: JSON.stringify(requestData),
            timeout: CONFIG.API.TIMEOUT
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    showAuthScreen() {
        const splashScreen = document.getElementById('splash-screen');
        const authScreen = document.getElementById('auth-screen');
        const mainApp = document.getElementById('main-app');
        
        if (splashScreen) splashScreen.classList.add('hidden');
        if (authScreen) authScreen.classList.remove('hidden');
        if (mainApp) mainApp.classList.add('hidden');
        
        // Focus no input
        setTimeout(() => {
            const authCodeInput = document.getElementById('auth-code');
            if (authCodeInput) authCodeInput.focus();
        }, 100);
    }
    
    showMainApp() {
        const splashScreen = document.getElementById('splash-screen');
        const authScreen = document.getElementById('auth-screen');
        const mainApp = document.getElementById('main-app');
        
        if (splashScreen) splashScreen.classList.add('hidden');
        if (authScreen) authScreen.classList.add('hidden');
        if (mainApp) mainApp.classList.remove('hidden');
        
        // Inicializar módulos
        if (window.modulesManager) {
            window.modulesManager.init();
        }
        
        logger.info('Aplicativo principal carregado');
    }
    
    showPending() {
        this.clearStatus();
        const statusPending = document.querySelector('.status-pending');
        if (statusPending) {
            statusPending.classList.remove('hidden');
        }
        
        const authCodeInput = document.getElementById('auth-code');
        if (authCodeInput) {
            authCodeInput.disabled = true;
            authCodeInput.classList.add('loading');
        }
        
        const authSubmitBtn = document.getElementById('auth-submit');
        if (authSubmitBtn) {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Verificando...';
        }
    }
    
    showError(message) {
        this.clearStatus();
        
        const statusError = document.querySelector('.status-error');
        if (statusError) {
            statusError.classList.remove('hidden');
            const errorText = statusError.querySelector('span:last-child');
            if (errorText) {
                errorText.textContent = message;
            }
        }
        
        const authCodeInput = document.getElementById('auth-code');
        if (authCodeInput) {
            authCodeInput.disabled = false;
            authCodeInput.classList.remove('loading');
            authCodeInput.classList.add('error');
        }
        
        const authSubmitBtn = document.getElementById('auth-submit');
        if (authSubmitBtn) {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = 'Autorizar';
        }
        
        // Adicionar animação de erro
        const authContainer = document.querySelector('.auth-container');
        if (authContainer) {
            authContainer.classList.add('auth-error');
            setTimeout(() => {
                authContainer.classList.remove('auth-error');
            }, 500);
        }
        
        logger.warn('Erro na autenticação', { message, attempts: this.attempts });
    }
    
    showSuccess() {
        this.clearStatus();
        
        const statusSuccess = document.querySelector('.status-success');
        if (statusSuccess) {
            statusSuccess.classList.remove('hidden');
        }
        
        const authCodeInput = document.getElementById('auth-code');
        if (authCodeInput) {
            authCodeInput.disabled = true;
            authCodeInput.classList.remove('loading', 'error');
            authCodeInput.classList.add('success');
        }
        
        const authSubmitBtn = document.getElementById('auth-submit');
        if (authSubmitBtn) {
            authSubmitBtn.disabled = true;
            authSubmitBtn.textContent = 'Autorizado!';
        }
        
        // Adicionar animação de sucesso
        const authContainer = document.querySelector('.auth-container');
        if (authContainer) {
            authContainer.classList.add('auth-success');
        }
    }
    
    clearStatus() {
        const statusElements = document.querySelectorAll('.status-pending, .status-error, .status-success');
        statusElements.forEach(element => {
            element.classList.add('hidden');
        });
    }
    
    logout() {
        // Limpar dados de autenticação
        localStorage.removeItem(CONFIG.STORAGE.AUTH_TOKEN);
        this.isAuthorized = false;
        this.attempts = 0;
        
        // Parar verificações
        this.stopCodeCheck();
        
        // Mostrar tela de autenticação
        this.showAuthScreen();
        
        // Limpar input
        const authCodeInput = document.getElementById('auth-code');
        if (authCodeInput) {
            authCodeInput.value = '';
            authCodeInput.disabled = false;
            authCodeInput.classList.remove('loading', 'error', 'success');
        }
        
        const authSubmitBtn = document.getElementById('auth-submit');
        if (authSubmitBtn) {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = 'Autorizar';
        }
        
        this.clearStatus();
        
        logger.info('Logout realizado');
    }
    
    isAuthenticated() {
        return this.isAuthorized;
    }
    
    getDeviceId() {
        return CONFIG.DEVICE.deviceId;
    }
}

// Instância global do AuthManager
window.authManager = new AuthManager();

// Event listener para logout
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.authManager.logout();
        });
    }
});