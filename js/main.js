// Arquivo principal do aplicativo Elias Empresas Launcher EE
class LauncherApp {
    constructor() {
        this.isInitialized = false;
        this.startTime = Date.now();
        
        this.init();
    }
    
    async init() {
        try {
            logger.info('Inicializando Launcher EE');
            
            // Aguardar carregamento completo do DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.initializeApp();
                });
            } else {
                this.initializeApp();
            }
            
        } catch (error) {
            logger.error('Erro na inicialização do aplicativo', error);
        }
    }
    
    async initializeApp() {
        try {
            // Mostrar splash screen
            this.showSplashScreen();
            
            // Aguardar tempo mínimo do splash
            await Utils.sleep(CONFIG.UI.SPLASH_SCREEN.duration);
            
            // Verificar autenticação
            if (window.authManager && window.authManager.isAuthenticated()) {
                this.showMainApp();
            } else {
                // O AuthManager já gerencia a exibição da tela de auth
                logger.info('Aguardando autenticação');
            }
            
            // Configurar event listeners globais
            this.setupGlobalEventListeners();
            
            // Inicializar módulos após autenticação
            this.setupPostAuthInitialization();
            
            this.isInitialized = true;
            logger.info('Launcher EE inicializado com sucesso');
            
        } catch (error) {
            logger.error('Erro na inicialização do aplicativo', error);
            this.showError('Erro na inicialização do aplicativo');
        }
    }
    
    showSplashScreen() {
        const splashScreen = document.getElementById('splash-screen');
        if (splashScreen) {
            splashScreen.classList.remove('hidden');
        }
        
        // Animar logo se habilitado
        if (CONFIG.UI.SPLASH_SCREEN.logoAnimation) {
            this.animateSplashLogo();
        }
    }
    
    animateSplashLogo() {
        const splashLogo = document.querySelector('.splash-logo');
        if (splashLogo) {
            splashLogo.style.animation = 'pulse 2s infinite';
        }
    }
    
    showMainApp() {
        const splashScreen = document.getElementById('splash-screen');
        const authScreen = document.getElementById('auth-screen');
        const mainApp = document.getElementById('main-app');
        
        if (splashScreen) splashScreen.classList.add('hidden');
        if (authScreen) authScreen.classList.add('hidden');
        if (mainApp) mainApp.classList.remove('hidden');
        
        // Inicializar módulos
        this.initializeModules();
        
        logger.info('Aplicativo principal exibido');
    }
    
    setupGlobalEventListeners() {
        // Event listeners para navegação por teclado (controle remoto)
        document.addEventListener('keydown', (e) => {
            this.handleRemoteControl(e);
        });
        
        // Event listeners para mudanças de visibilidade
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
        
        // Event listeners para erros globais
        window.addEventListener('error', (e) => {
            this.handleGlobalError(e);
        });
        
        // Event listeners para mudanças de rede
        window.addEventListener('online', () => {
            this.handleNetworkChange('online');
        });
        
        window.addEventListener('offline', () => {
            this.handleNetworkChange('offline');
        });
        
        // Event listeners para resize
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 250));
    }
    
    handleRemoteControl(event) {
        const key = event.key;
        
        switch (key) {
            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                this.handleNavigation(key);
                break;
            case 'Enter':
                this.handleEnter();
                break;
            case 'Backspace':
            case 'Escape':
                this.handleBack();
                break;
            case 'F1':
                this.handleQuickAccess('media');
                break;
            case 'F2':
                this.handleQuickAccess('chat');
                break;
            case 'F3':
                this.handleQuickAccess('iptv');
                break;
            case 'F4':
                this.handleQuickAccess('tv-manager');
                break;
        }
    }
    
    handleNavigation(direction) {
        const activeElement = document.activeElement;
        const focusableElements = this.getFocusableElements();
        const currentIndex = focusableElements.indexOf(activeElement);
        
        let nextIndex = currentIndex;
        
        switch (direction) {
            case 'ArrowUp':
                nextIndex = Math.max(0, currentIndex - 1);
                break;
            case 'ArrowDown':
                nextIndex = Math.min(focusableElements.length - 1, currentIndex + 1);
                break;
            case 'ArrowLeft':
                nextIndex = Math.max(0, currentIndex - 1);
                break;
            case 'ArrowRight':
                nextIndex = Math.min(focusableElements.length - 1, currentIndex + 1);
                break;
        }
        
        if (nextIndex !== currentIndex) {
            focusableElements[nextIndex].focus();
        }
    }
    
    getFocusableElements() {
        const selector = 'button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
        return Array.from(document.querySelectorAll(selector));
    }
    
    handleEnter() {
        const activeElement = document.activeElement;
        if (activeElement) {
            activeElement.click();
        }
    }
    
    handleBack() {
        // Implementar lógica de voltar
        if (window.modulesManager) {
            const currentModule = window.modulesManager.getCurrentModule();
            if (currentModule !== 'dashboard') {
                window.modulesManager.switchModule('dashboard');
            }
        }
    }
    
    handleQuickAccess(module) {
        if (window.modulesManager) {
            window.modulesManager.switchModule(module);
        }
    }
    
    handleVisibilityChange() {
        if (document.hidden) {
            this.pauseApp();
        } else {
            this.resumeApp();
        }
    }
    
    handleGlobalError(event) {
        logger.error('Erro global capturado', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
        });
        
        this.showError('Ocorreu um erro inesperado');
    }
    
    handleNetworkChange(status) {
        logger.info(`Status da rede alterado: ${status}`);
        
        if (status === 'online') {
            this.showNotification('Conexão restabelecida!', 'success');
        } else {
            this.showNotification('Conexão perdida!', 'error');
        }
    }
    
    handleResize() {
        // Ajustar layout para diferentes resoluções
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        logger.debug(`Redimensionamento: ${width}x${height}`);
        
        // Ajustar elementos responsivos
        this.adjustResponsiveElements();
    }
    
    adjustResponsiveElements() {
        // Ajustar elementos baseado na resolução
        const isLargeScreen = window.innerWidth >= 1600;
        const isSmallScreen = window.innerWidth < 1024;
        
        document.body.classList.toggle('large-screen', isLargeScreen);
        document.body.classList.toggle('small-screen', isSmallScreen);
    }
    
    setupPostAuthInitialization() {
        // Configurar inicialização após autenticação
        const originalShowMainApp = this.showMainApp.bind(this);
        
        // Interceptar quando o app principal é mostrado
        this.showMainApp = () => {
            originalShowMainApp();
            this.initializeModules();
        };
    }
    
    initializeModules() {
        try {
            // Inicializar módulos na ordem correta
            this.initializeCoreModules();
            this.initializeFeatureModules();
            
            logger.info('Todos os módulos inicializados');
            
        } catch (error) {
            logger.error('Erro ao inicializar módulos', error);
        }
    }
    
    initializeCoreModules() {
        // Módulos essenciais
        if (window.tvMonitor) {
            window.tvMonitor.startMonitoring();
        }
        
        if (window.modulesManager) {
            window.modulesManager.init();
        }
    }
    
    initializeFeatureModules() {
        // Módulos de funcionalidades
        const modules = [
            'mediaModule',
            'chatModule',
            'iptvModule',
            'internetModule'
        ];
        
        modules.forEach(moduleName => {
            if (window[moduleName]) {
                try {
                    window[moduleName].init();
                } catch (error) {
                    logger.error(`Erro ao inicializar ${moduleName}`, error);
                }
            }
        });
    }
    
    pauseApp() {
        logger.info('Aplicativo pausado');
        
        // Pausar módulos
        if (window.tvMonitor) {
            window.tvMonitor.pauseMonitoring();
        }
        
        if (window.mediaModule) {
            window.mediaModule.pause();
        }
        
        if (window.iptvModule) {
            window.iptvModule.stop();
        }
    }
    
    resumeApp() {
        logger.info('Aplicativo retomado');
        
        // Retomar módulos
        if (window.tvMonitor) {
            window.tvMonitor.resumeMonitoring();
        }
        
        if (window.mediaModule && window.mediaModule.isMediaPlaying()) {
            window.mediaModule.resume();
        }
    }
    
    showError(message) {
        const errorNotification = document.createElement('div');
        errorNotification.className = 'notification notification-error';
        errorNotification.innerHTML = `
            <h4>Erro</h4>
            <p>${message}</p>
            <button onclick="this.parentElement.remove()">Fechar</button>
        `;
        
        document.body.appendChild(errorNotification);
        
        setTimeout(() => {
            if (errorNotification.parentNode) {
                errorNotification.parentNode.removeChild(errorNotification);
            }
        }, 5000);
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    // Métodos públicos
    getAppInfo() {
        return {
            name: 'Launcher EE - Elias Empresas',
            version: '1.0.0',
            deviceId: CONFIG.DEVICE.deviceId,
            webOSVersion: CONFIG.DEVICE.webOSVersion,
            uptime: Date.now() - this.startTime,
            isInitialized: this.isInitialized
        };
    }
    
    getAppStats() {
        const stats = {
            uptime: Date.now() - this.startTime,
            modules: {},
            errors: logger.getLogs().filter(log => log.level === 'error').length,
            warnings: logger.getLogs().filter(log => log.level === 'warn').length
        };
        
        // Estatísticas dos módulos
        if (window.modulesManager) {
            const modules = window.modulesManager.getAllModules();
            Object.keys(modules).forEach(moduleName => {
                const module = modules[moduleName];
                stats.modules[moduleName] = {
                    initialized: module.initialized,
                    active: module.isActive
                };
            });
        }
        
        return stats;
    }
    
    // Métodos de debug
    enableDebugMode() {
        CONFIG.LOGGING.level = 'debug';
        logger.info('Modo debug ativado');
    }
    
    disableDebugMode() {
        CONFIG.LOGGING.level = 'info';
        logger.info('Modo debug desativado');
    }
    
    exportLogs() {
        const logs = logger.getLogs();
        const logData = JSON.stringify(logs, null, 2);
        
        // Criar blob e download
        const blob = new Blob([logData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `ee-launcher-logs-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    // Método de limpeza
    destroy() {
        logger.info('Destruindo aplicativo');
        
        // Destruir módulos
        if (window.modulesManager) {
            window.modulesManager.destroy();
        }
        
        if (window.tvMonitor) {
            window.tvMonitor.destroy();
        }
        
        if (window.mediaModule) {
            window.mediaModule.destroy();
        }
        
        if (window.chatModule) {
            window.chatModule.destroy();
        }
        
        if (window.iptvModule) {
            window.iptvModule.destroy();
        }
        
        if (window.internetModule) {
            window.internetModule.destroy();
        }
        
        this.isInitialized = false;
    }
}

// Inicializar aplicativo
window.launcherApp = new LauncherApp();

// Expor métodos globais para debug
window.debug = {
    app: window.launcherApp,
    config: CONFIG,
    logger: logger,
    modules: {
        tvMonitor: () => window.tvMonitor,
        modulesManager: () => window.modulesManager,
        mediaModule: () => window.mediaModule,
        chatModule: () => window.chatModule,
        iptvModule: () => window.iptvModule,
        internetModule: () => window.internetModule
    },
    utils: Utils
};

// Log de inicialização
logger.info('Launcher EE carregado', {
    deviceId: CONFIG.DEVICE.deviceId,
    webOSVersion: CONFIG.DEVICE.webOSVersion,
    modules: Object.keys(CONFIG.MODULES).filter(key => CONFIG.MODULES[key].enabled)
});